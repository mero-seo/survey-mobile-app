import * as Device from "expo-device";
import { useCallback, useEffect, useState } from "react";
import {
  initializeBackgroundSync,
  manualSync,
} from "../services/backgroundSync";
import {
  addNetworkListener,
  getNetworkService,
} from "../services/networkService";
import { addSurvey, initSurveyTable } from "../services/surveyStorage";
import { registerDevice } from "../services/syncService";

interface UseSurveyReturn {
  isSubmitted: boolean;
  isLoading: boolean;
  submitSurvey: (answer: string) => Promise<void>;
  resetSurvey: () => void;
}

export const useSurvey = (): UseSurveyReturn => {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize all services on mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize database
        await initSurveyTable();
        console.log("Survey database initialized successfully");

        // Initialize background sync
        const deviceId =
          Device.deviceName || Device.modelName || "unknown_device";
        initializeBackgroundSync({
          deviceId: deviceId,
          syncInterval: 5 * 60 * 1000, // 5 minutes
          enableAutoSync: true,
        });
        console.log("Background sync initialized");

        // Register device with backend
        const deviceInfo = {
          deviceId: deviceId,
          location: "default", // This will be configurable later
          name: deviceId,
          model: Device.modelName || "unknown",
          os: Device.osName || "unknown",
          version: Device.osVersion || "unknown",
          appVersion: "1.0.0",
        };

        const registered = await registerDevice(deviceInfo);
        if (registered) {
          console.log("Device registered with backend");
        } else {
          console.log("Device registration failed (will retry later)");
        }

        // Set up network monitoring
        const networkService = getNetworkService();
        const unsubscribe = addNetworkListener((status) => {
          if (status.isConnected && status.isInternetReachable) {
            console.log("Network available - triggering sync");
            manualSync(); // Trigger sync when network becomes available
          }
        });

        // Cleanup function
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error("Failed to initialize services:", error);
      }
    };

    initializeServices();
  }, []);

  const submitSurvey = useCallback(async (answer: string) => {
    setIsLoading(true);
    try {
      // Generate unique ID for the survey
      const surveyId = `survey_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Get device information
      const deviceId =
        Device.deviceName || Device.modelName || "unknown_device";
      const deviceInfo = {
        model: Device.modelName || "unknown",
        os: Device.osName || "unknown",
        version: Device.osVersion || "unknown",
        appVersion: "1.0.0", // You can get this from app.json or Constants
      };

      // Create survey object
      const survey = {
        id: surveyId,
        deviceId: deviceId,
        location: "default", // This will be configurable later
        answer: answer,
        timestamp: new Date().toISOString(),
        syncStatus: "pending" as const,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      // Save to local SQLite database
      await addSurvey(survey);

      console.log("Survey saved locally:", survey);
      setIsSubmitted(true);

      // Trigger immediate sync if network is available
      const networkService = getNetworkService();
      if (networkService.isOnline()) {
        console.log("Network available - triggering immediate sync");
        manualSync();
      }
    } catch (error) {
      console.error("Failed to submit survey:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetSurvey = useCallback(() => {
    setIsSubmitted(false);
  }, []);

  return {
    isSubmitted,
    isLoading,
    submitSurvey,
    resetSurvey,
  };
};
