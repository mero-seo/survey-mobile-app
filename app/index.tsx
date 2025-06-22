import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { AdminPanel } from "../components/AdminPanel";
import { DeviceStatusScreen } from "../components/DeviceStatusScreen";
import { EnhancedSetupScreen } from "../components/EnhancedSetupScreen";
import { GestureDetector } from "../components/GestureDetector";
import { SharedLayout } from "../components/SharedLayout";
import { SurveyCard } from "../components/SurveyCard";
import { ThankYouCard } from "../components/ThankYouCard";
import { useSurvey } from "../hooks/useSurvey";
import {
  checkDeviceStatus as checkDeviceStatusFromBackend,
  cleanupBackgroundSync,
  manualSync,
  startBackgroundSync,
} from "../services/backgroundSync";
import {
  getDeviceInfo,
  getDeviceStatusFromBackend,
  isDeviceActive,
  refreshDeviceInfo,
  saveDeviceStatus,
} from "../services/deviceConfigService";

function MainSurveyScreen() {
  const { isSubmitted, isLoading, submitSurvey, resetSurvey } = useSurvey();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<
    "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "UNKNOWN"
  >("UNKNOWN");
  const [previousStatus, setPreviousStatus] = useState<
    "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "UNKNOWN"
  >("UNKNOWN");
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [previousDeviceInfo, setPreviousDeviceInfo] = useState<any>(null);

  useEffect(() => {
    checkDeviceStatus();
    loadDeviceInfo();

    // Listen for app state changes to trigger sync when app becomes active
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("App became active, triggering sync...");
        checkDeviceStatus();
        loadDeviceInfo();
      }
    });

    // Set up periodic status checks (every 30 seconds)
    const statusInterval = setInterval(async () => {
      try {
        const status = await checkDeviceStatusFromBackend();
        if (status) {
          const newStatus = status.status;
          showStatusNotification(newStatus, deviceStatus);
          setPreviousStatus(deviceStatus);
          setDeviceStatus(newStatus);
        }

        // Also check for device info changes
        await loadDeviceInfo();
      } catch (error) {
        console.error("Periodic status check failed:", error);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      subscription?.remove();
      clearInterval(statusInterval);
    };
  }, [deviceStatus]); // Add deviceStatus as dependency to avoid stale closure

  const loadDeviceInfo = async () => {
    try {
      const info = await refreshDeviceInfo();

      // Check if device info changed
      if (
        previousDeviceInfo &&
        (info.name !== previousDeviceInfo.name ||
          info.location !== previousDeviceInfo.location)
      ) {
        let message = "";
        if (info.name !== previousDeviceInfo.name) {
          message += `Device name updated to: ${info.name}`;
        }
        if (info.location !== previousDeviceInfo.location) {
          if (message) message += "\n";
          message += `Location updated to: ${info.location}`;
        }

        if (message) {
          setNotificationMessage(message);
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 4000);
        }
      }

      setPreviousDeviceInfo(deviceInfo);
      setDeviceInfo(info);
    } catch (error) {
      console.error("Failed to load device info:", error);
    }
  };

  const showStatusNotification = (newStatus: string, oldStatus: string) => {
    if (newStatus !== oldStatus) {
      let message = "";
      if (newStatus === "INACTIVE") {
        message = "Device has been deactivated by admin";
      } else if (newStatus === "MAINTENANCE") {
        message = "Device is in maintenance mode";
      } else if (newStatus === "ACTIVE") {
        message = "Device is now active";
      }

      if (message) {
        setNotificationMessage(message);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      }
    }
  };

  const handleGestureDetected = () => {
    setShowAdminPanel(true);
  };

  const handleManualSync = async () => {
    try {
      console.log("Manual sync triggered...");
      await manualSync();
      await checkDeviceStatus(); // Refresh device status after sync

      // Also refresh device info to get updated name and location
      const updatedDeviceInfo = await refreshDeviceInfo();
      console.log("Device info refreshed after sync:", {
        name: updatedDeviceInfo.name,
        location: updatedDeviceInfo.location,
      });
    } catch (error) {
      console.error("Manual sync failed:", error);
    }
  };

  const checkDeviceStatus = async () => {
    try {
      setIsCheckingStatus(true);

      // Get device info to check status
      const deviceInfo = await getDeviceInfo();

      // Try to get status from backend
      const status = await getDeviceStatusFromBackend(deviceInfo.deviceId);

      if (status) {
        await saveDeviceStatus(status);
        const newStatus = status.status;

        // Show notification if status changed
        showStatusNotification(newStatus, deviceStatus);

        setPreviousStatus(deviceStatus);
        setDeviceStatus(newStatus);
      } else {
        // Fallback to local status check
        const isActive = await isDeviceActive();
        const newStatus = isActive ? "ACTIVE" : "UNKNOWN";

        // Show notification if status changed
        showStatusNotification(newStatus, deviceStatus);

        setPreviousStatus(deviceStatus);
        setDeviceStatus(newStatus);
      }
    } catch (error) {
      console.error("Failed to check device status:", error);
      setDeviceStatus("UNKNOWN");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Show loading while checking status
  if (isCheckingStatus) {
    return null; // This will show the loading state from the parent component
  }

  // Show device status screen if device is not active
  if (deviceStatus !== "ACTIVE") {
    return <DeviceStatusScreen onRetry={checkDeviceStatus} />;
  }

  // Show admin panel if requested
  if (showAdminPanel) {
    return (
      <AdminPanel
        onClose={() => setShowAdminPanel(false)}
        onManualSync={handleManualSync}
      />
    );
  }

  // Show main survey screen
  return (
    <>
      {showNotification && (
        <View
          style={{
            position: "absolute",
            top: 50,
            left: 20,
            right: 20,
            backgroundColor: "#FF6B6B",
            padding: 15,
            borderRadius: 8,
            zIndex: 1000,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 14,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {notificationMessage}
          </Text>
        </View>
      )}
      <GestureDetector
        onGestureDetected={handleGestureDetected}
        tapCount={5}
        timeWindow={3000}
      >
        <SharedLayout>
          {isSubmitted ? (
            <ThankYouCard onReset={resetSurvey} />
          ) : (
            <SurveyCard onSubmit={submitSurvey} isLoading={isLoading} />
          )}
        </SharedLayout>
      </GestureDetector>
    </>
  );
}

export default function HomeScreen() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const backgroundSyncStartedRef = useRef<boolean>(false);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // Check if setup is complete on app start
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const setupCompleted = await AsyncStorage.getItem("setup_completed");
        setIsSetupComplete(setupCompleted === "true");
      } catch (error) {
        console.error("Failed to check setup status:", error);
        setIsSetupComplete(false);
      }
    };

    checkSetupStatus();
  }, []);

  // Start background sync when setup is complete
  useEffect(() => {
    if (isSetupComplete === true && !backgroundSyncStartedRef.current) {
      console.log("Starting background sync...");
      backgroundSyncStartedRef.current = true;

      // Use longer intervals in development to prevent rate limiting
      const syncInterval = __DEV__ ? 5 : 2; // 5 minutes in dev, 2 minutes in production
      startBackgroundSync(syncInterval);
    }

    // Cleanup on unmount or hot reload
    return () => {
      if (backgroundSyncStartedRef.current) {
        console.log("Cleaning up background sync...");
        cleanupBackgroundSync();
        backgroundSyncStartedRef.current = false;
      }
    };
  }, [isSetupComplete]);

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  if (!fontsLoaded || isSetupComplete === null) {
    return null; // Loading state
  }

  // Show setup screen if not completed
  if (!isSetupComplete) {
    return <EnhancedSetupScreen onSetupComplete={handleSetupComplete} />;
  }

  // If admin panel is visible, show it as a separate screen
  return <MainSurveyScreen />;
}
