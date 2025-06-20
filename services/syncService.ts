import { API_BASE_URL } from "@env";
import axios from "axios";
import { DeviceConfig } from "./configStorage";
import { SurveyRow } from "./surveyStorage";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Exponential backoff configuration
const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second

// Calculate delay with exponential backoff
const calculateDelay = (retryCount: number): number => {
  return Math.min(BASE_DELAY * Math.pow(2, retryCount), 16000); // Max 16 seconds
};

export const submitSurvey = async (survey: SurveyRow): Promise<boolean> => {
  try {
    const response = await api.post("/surveys/submit", survey);
    return response.status === 200 || response.status === 201;
  } catch (error) {
    console.error("Failed to submit survey:", error);
    throw error;
  }
};

export const registerDevice = async (
  deviceConfig: DeviceConfig
): Promise<boolean> => {
  try {
    const response = await api.post("/devices/register", deviceConfig);
    return response.status === 200 || response.status === 201;
  } catch (error) {
    console.error("Failed to register device:", error);
    throw error;
  }
};

export const updateDeviceConfig = async (
  deviceId: string,
  config: Partial<DeviceConfig>
): Promise<boolean> => {
  try {
    const response = await api.put(`/devices/${deviceId}`, config);
    return response.status === 200 || response.status === 201;
  } catch (error) {
    console.error("Failed to update device config:", error);
    throw error;
  }
};

// Sync service with retry logic
export const syncPendingSurveys = async (
  surveys: SurveyRow[],
  onSuccess: (id: string) => void,
  onError: (id: string, error: Error) => void
): Promise<void> => {
  const pendingSurveys = surveys.filter((s) => s.syncStatus === "pending");

  if (pendingSurveys.length === 0) {
    console.log("No pending surveys to sync");
    return;
  }

  console.log(`Syncing ${pendingSurveys.length} pending surveys`);

  for (const survey of pendingSurveys) {
    let retryCount = survey.retryCount;

    while (retryCount < MAX_RETRIES) {
      try {
        await submitSurvey(survey);
        onSuccess(survey.id);
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;

        if (retryCount >= MAX_RETRIES) {
          console.error(
            `Failed to sync survey ${survey.id} after ${MAX_RETRIES} retries`
          );
          onError(survey.id, error as Error);
        } else {
          const delay = calculateDelay(retryCount);
          console.log(
            `Retrying survey ${survey.id} in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }
};

// Check if device is online
export const checkOnlineStatus = async (): Promise<boolean> => {
  try {
    // Try to reach the backend API health endpoint
    await api.get("/health");
    return true;
  } catch {
    return false;
  }
};
