import * as Device from "expo-device";
import { apiPost } from "./apiService";
import {
  deleteSyncedSurveys,
  getPendingSurveys,
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

// Register device with backend
export const registerDevice = async (
  deviceInfo: DeviceInfo
): Promise<boolean> => {
  try {
    const response = await apiPost("/devices/register", {
      deviceId: deviceInfo.deviceId,
      location: deviceInfo.location,
      name: deviceInfo.name,
      configuration: {
        model: deviceInfo.model,
        os: deviceInfo.os,
        version: deviceInfo.version,
        appVersion: deviceInfo.appVersion,
      },
    });

    console.log("Device registered successfully:", response);
    return true;
  } catch (error) {
    console.error("Failed to register device:", error);
    return false;
  }
};

// Submit a single survey to backend
export const submitSurveyToBackend = async (survey: any): Promise<boolean> => {
  try {
    const response = await apiPost("/surveys/submit", {
      deviceId: survey.deviceId,
      location: survey.location,
      answer: survey.answer,
      timestamp: survey.timestamp,
      deviceInfo: {
        model: Device.modelName || "unknown",
        os: Device.osName || "unknown",
        version: Device.osVersion || "unknown",
        appVersion: "1.0.0",
      },
    });

    console.log("Survey submitted to backend:", response);
    return true;
  } catch (error) {
    console.error("Failed to submit survey to backend:", error);
    return false;
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

    console.log(`Syncing ${pendingSurveys.length} pending surveys...`);

    // Process each survey with retry logic
    for (const survey of pendingSurveys) {
      let success = false;
      let retryCount = survey.retryCount || 0;

      while (!success && retryCount < MAX_RETRIES) {
        try {
          success = await submitSurveyToBackend(survey);

          if (success) {
            // Update sync status to synced
            await updateSurveySyncStatus(survey.id, "synced", 0);
            result.syncedCount++;
            console.log(`Survey ${survey.id} synced successfully`);
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

// Ping device to update last seen timestamp
export const pingDevice = async (deviceId: string): Promise<boolean> => {
  try {
    await apiPost(`/devices/${deviceId}/ping`, {
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Failed to ping device:", error);
    return false;
  }
};

// Get device configuration from backend
export const getDeviceConfig = async (deviceId: string): Promise<any> => {
  try {
    const response = await apiPost(`/devices/${deviceId}/config`, {});
    return response;
  } catch (error) {
    console.error("Failed to get device config:", error);
    return null;
  }
};
