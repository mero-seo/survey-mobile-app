import {
  apiPost,
  apiPostPublic,
  apiGet,
  apiPut,
  apiDelete,
} from "./apiService";
import { getDeviceInfo } from "./deviceConfigService";
import {
  deleteSyncedSurveys,
  getPendingSurveys,
  Survey,
  updateSurveySyncStatus,
} from "./surveyStorage";

export interface DeviceInfo {
  deviceId: string;
  location: string;
  name: string;
  model: string;
  os: string;
  version: string;
  appVersion: string;
  configuration?: {
    surveyInterval: number;
    theme: string;
    language: string;
  };
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

// Exponential backoff configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

const calculateBackoffDelay = (retryCount: number): number => {
  return Math.min(BASE_DELAY * Math.pow(2, retryCount), 16000); // Max 16 seconds
};

// Enhanced error handling with retry strategies
export interface SyncError {
  type: "network" | "authentication" | "validation" | "server" | "unknown";
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
}

const classifyError = (error: any): SyncError => {
  if (error.request && !error.response) {
    return {
      type: "network",
      message:
        "Network connection failed. Please check your internet connection.",
      retryable: true,
      retryAfter: 30,
    };
  }

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401:
        return {
          type: "authentication",
          message:
            "Device authentication failed. Please check device configuration.",
          retryable: false,
        };
      case 400:
        return {
          type: "validation",
          message: `Data validation failed: ${
            data?.message || "Invalid request format"
          }`,
          retryable: false,
        };
      case 404:
        return {
          type: "server",
          message: "Service not found. Please check API configuration.",
          retryable: false,
        };
      case 500:
        return {
          type: "server",
          message: "Server error. Please try again later.",
          retryable: true,
          retryAfter: 60,
        };
      case 503:
        return {
          type: "server",
          message: "Service temporarily unavailable. Please try again later.",
          retryable: true,
          retryAfter: 120,
        };
      default:
        return {
          type: "server",
          message: `Server error (${status}): ${
            data?.message || "Unknown error"
          }`,
          retryable: status >= 500,
          retryAfter: status >= 500 ? 60 : undefined,
        };
    }
  }

  return {
    type: "unknown",
    message: error.message || "An unexpected error occurred",
    retryable: true,
    retryAfter: 30,
  };
};

// Check if device is already registered
export const isDeviceRegistered = async (
  deviceId: string
): Promise<boolean> => {
  try {
    // Try to ping the device - if it succeeds, device is registered
    const response = await apiPost("/devices/ping", {
      deviceId: deviceId,
    });

    console.log("Device ping successful - device is registered");
    return true;
  } catch (error: any) {
    // If ping fails with 404 or authentication error, device is not registered
    if (
      error.response?.status === 404 ||
      error.response?.status === 401 ||
      error.response?.data?.message?.includes("not found")
    ) {
      console.log("Device not registered - needs registration");
      return false;
    }

    // For other errors (network, etc.), assume not registered to be safe
    console.log(
      "Device registration status unknown - will attempt registration"
    );
    return false;
  }
};

let isRegisteredThisSession = false;

// Register device with backend
export const registerDevice = async (
  deviceInfo: DeviceInfo
): Promise<boolean> => {
  try {
    if (isRegisteredThisSession) {
      console.log("Device already registered this session, skipping.");
      return true;
    }

    console.log("Attempting to register device with backend:", {
      deviceId: deviceInfo.deviceId,
      location: deviceInfo.location,
      name: deviceInfo.name,
    });

    const response = await apiPost("/devices/register", {
      deviceId: deviceInfo.deviceId,
      location: deviceInfo.location,
      name: deviceInfo.name,
      configuration: {
        surveyInterval: deviceInfo.configuration?.surveyInterval || 30,
        theme: deviceInfo.configuration?.theme || "default",
        language: deviceInfo.configuration?.language || "en",
      },
    });

    console.log("Device registered successfully with backend:", response);
    isRegisteredThisSession = true;
    return true;
  } catch (error: any) {
    // If conflict, it means device is already registered. Treat as success.
    if (error.response && error.response.status === 409) {
      console.log(
        "Device already registered - continuing with existing registration"
      );
      isRegisteredThisSession = true;
      return true;
    }

    console.error("Failed to register device with backend:", error);

    // Log specific error details for debugging
    if (error.response) {
      console.error("Backend response error:", {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error("Network error - no response received");
    } else {
      console.error("Request setup error:", error.message);
    }

    return false;
  }
};

// Submit survey to backend
export const submitSurvey = async (
  survey: Survey,
  deviceInfo: DeviceInfo
): Promise<{ success: boolean; status?: string }> => {
  try {
    console.log("Submitting survey to backend:", {
      clientSurveyId: survey.id,
      deviceId: deviceInfo.deviceId,
      location: deviceInfo.location,
      answer: survey.answer,
    });

    const response = await apiPost("/surveys/submit", {
      clientSurveyId: survey.id,
      deviceId: deviceInfo.deviceId,
      location: deviceInfo.location,
      answer: survey.answer,
      timestamp: survey.timestamp,
      deviceInfo: {
        model: deviceInfo.model,
        os: deviceInfo.os,
        version: deviceInfo.version,
        appVersion: deviceInfo.appVersion,
      },
    });

    console.log("Survey submitted successfully to backend:", response);
    return { success: true, status: response.status };
  } catch (error: any) {
    console.error("Failed to submit survey to backend:", error);

    // Log specific error details for debugging
    if (error.response) {
      console.error("Backend response error:", {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error("Network error - no response received");
    } else {
      console.error("Request setup error:", error.message);
    }

    return { success: false };
  }
};

// Sync all pending surveys with exponential backoff
export const syncPendingSurveys = async (): Promise<SyncResult> => {
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  try {
    // Get all pending surveys
    const pendingSurveys = await getPendingSurveys();

    if (pendingSurveys.length === 0) {
      console.log("No pending surveys to sync");
      return result;
    }

    // Get current device info
    const deviceInfo = await getDeviceInfo();

    console.log(`Syncing ${pendingSurveys.length} pending surveys...`);

    // Process each survey sequentially
    for (const survey of pendingSurveys) {
      let success = false;
      let retryCount = survey.retryCount || 0;

      while (!success && retryCount < MAX_RETRIES) {
        try {
          // Use the submitSurvey function which now includes clientSurveyId
          const submissionResult = await submitSurvey(survey, deviceInfo);
          success = submissionResult.success;

          if (success) {
            // Update sync status to synced, even if it was a duplicate
            await updateSurveySyncStatus(survey.id, "synced", 0);
            result.syncedCount++;
            console.log(
              `Survey ${survey.id} synced successfully (Status: ${
                submissionResult.status || "OK"
              })`
            );
          } else {
            throw new Error("Survey submission failed");
          }
        } catch (error) {
          retryCount++;
          console.error(
            `Survey ${survey.id} sync attempt ${retryCount} failed:`,
            error
          );

          if (retryCount >= MAX_RETRIES) {
            // Mark as failed after max retries
            await updateSurveySyncStatus(survey.id, "failed", retryCount);
            result.failedCount++;
            result.errors.push(`Survey ${survey.id}: ${error}`);
          } else {
            // Update retry count and wait before next attempt
            await updateSurveySyncStatus(survey.id, "pending", retryCount);
            const delay = calculateBackoffDelay(retryCount);
            console.log(
              `Waiting ${delay}ms before retry ${retryCount + 1} for survey ${
                survey.id
              }`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }

    // Clean up synced surveys (optional - you might want to keep them for audit)
    if (result.syncedCount > 0) {
      await deleteSyncedSurveys();
      console.log(`Cleaned up ${result.syncedCount} synced surveys`);
    }

    console.log(
      `Sync completed: ${result.syncedCount} synced, ${result.failedCount} failed`
    );
    return result;
  } catch (error) {
    console.error("Sync process failed:", error);
    result.success = false;
    result.errors.push(`Sync process error: ${error}`);
    return result;
  }
};

// Ping device to update last seen
export const pingDevice = async (deviceId: string): Promise<boolean> => {
  try {
    console.log(`Pinging device: ${deviceId}`);
    await apiPostPublic(`/devices/ping/${deviceId}`);
    return true;
  } catch (error: any) {
    console.error("Failed to ping device:", error);
    return false;
  }
};

// Get device configuration from backend
export const getDeviceConfig = async (deviceId: string): Promise<any> => {
  try {
    // Use the correct endpoint structure - config uses device auth in body
    const response = await apiPost(`/devices/config`, {
      deviceId: deviceId,
    });
    return response;
  } catch (error) {
    console.error("Failed to get device config:", error);
    return null;
  }
};
