import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { trackEvent } from "../services/analyticsService";
import { manualSync } from "../services/backgroundSync";
import {
  clearOldConfigData,
  getDeviceInfo,
  loadDeviceConfig,
  saveDeviceConfig,
} from "../services/deviceConfigService";
import { getNetworkService } from "../services/networkService";
import {
  addSurvey,
  initSurveyTable,
  validateDeviceInfo,
  validateSurveyData,
} from "../services/surveyStorage";
import { registerDevice } from "../services/syncService";

interface UseSurveyReturn {
  isSubmitted: boolean;
  isLoading: boolean;
  error: string | null;
  submitSurvey: (answer: string) => Promise<void>;
  resetSurvey: () => void;
}

export const useSurvey = (): UseSurveyReturn => {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const networkListenerRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Initialize all services on mount
  useEffect(() => {
    const initializeServices = async () => {
      // Prevent multiple initializations during hot reload
      if (isInitializedRef.current) {
        console.log("Services already initialized, skipping...");
        return;
      }

      try {
        isInitializedRef.current = true;

        // Clear old configuration data first
        await clearOldConfigData();

        // Track app opened event
        await trackEvent("app_opened");

        // Initialize database
        await initSurveyTable();
        console.log("Survey database initialized successfully");

        // Load device configuration
        const deviceConfig = await loadDeviceConfig();
        console.log("Device configuration loaded:", deviceConfig);

        // Get complete device information
        const deviceInfo = await getDeviceInfo();
        await saveDeviceConfig(deviceInfo.configuration);
        console.log("Device information saved:", deviceInfo);

        // Register device with backend using complete device info
        const registered = await registerDevice(deviceInfo);
        if (registered) {
          console.log("Device registered with backend successfully");
          await trackEvent("device_registered", { deviceInfo });
        } else {
          console.log("Device registration failed (will retry later)");
        }

        // Set up network monitoring (only once)
        const networkService = getNetworkService();

        // Remove any existing listener
        if (networkListenerRef.current) {
          networkListenerRef.current();
          networkListenerRef.current = null;
        }

        const unsubscribe = networkService.addListener((status) => {
          if (status.isConnected && status.isInternetReachable) {
            console.log("Network available - triggering debounced sync");
            manualSync(); // This now uses debounced sync
          }
        });

        networkListenerRef.current = unsubscribe;
      } catch (error) {
        console.error("Failed to initialize services:", error);
        isInitializedRef.current = false; // Reset on error
      }
    };

    initializeServices();

    // Cleanup function
    return () => {
      if (networkListenerRef.current) {
        networkListenerRef.current();
        networkListenerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  const submitSurvey = useCallback(async (answer: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current device info
      const deviceInfo = await getDeviceInfo();

      // Validate device info
      const deviceValidation = validateDeviceInfo(deviceInfo);
      if (!deviceValidation.isValid) {
        throw new Error(
          `Device configuration error: ${deviceValidation.errors.join(", ")}`
        );
      }

      // Generate survey ID
      const surveyId = `survey_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create survey data with device info
      const survey = {
        id: surveyId,
        deviceId: deviceInfo.deviceId,
        location: deviceInfo.location,
        answer: answer.toUpperCase(), // Ensure uppercase for backend
        timestamp: new Date().toISOString(), // Keep for local storage, but server will use its own time
        syncStatus: "pending" as const,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        deviceModel: deviceInfo.model,
        deviceOs: deviceInfo.os,
        deviceVersion: deviceInfo.version,
        appVersion: deviceInfo.appVersion,
      };

      // Validate survey data
      const surveyValidation = validateSurveyData(survey);
      if (!surveyValidation.isValid) {
        throw new Error(
          `Survey data error: ${surveyValidation.errors.join(", ")}`
        );
      }

      // Save survey to local storage
      await addSurvey(survey);
      console.log("Survey saved locally:", survey);

      // Trigger immediate sync if network is available (force sync for new surveys)
      const networkService = getNetworkService();

      if (networkService.isOnline()) {
        console.log(
          "Network available - triggering immediate sync for new survey"
        );
        manualSync(true); // Force sync for new surveys
      }

      // Show success state
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit survey:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      Alert.alert(
        "Submission Error",
        `Failed to submit survey: ${errorMessage}\n\nPlease check your connection and try again. Your survey has been saved and will sync automatically.`
      );
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
    error,
    submitSurvey,
    resetSurvey,
  };
};
