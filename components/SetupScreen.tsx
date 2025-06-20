import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { trackEvent } from "../services/analyticsService";
import {
  DeviceConfig,
  saveDeviceConfig,
} from "../services/deviceConfigService";
import { isDeviceRegistered, registerDevice } from "../services/syncService";

interface SetupScreenProps {
  onSetupComplete: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  onSetupComplete,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<
    "location" | "registration" | "validation" | "complete"
  >("location");
  const [progress, setProgress] = useState(0);
  const [location, setLocation] = useState("");

  const generateDeviceId = (): string => {
    // Use consistent device ID generation - alphanumeric only
    const deviceModel =
      Device.modelName?.replace(/[^a-zA-Z0-9]/g, "") || "device";
    const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
    const random = Math.random().toString(36).substr(2, 6); // 6 character random string

    // Combine and ensure alphanumeric only, max 20 characters
    const deviceId = `${deviceModel}${timestamp}${random}`
      .replace(/[^a-zA-Z0-9]/g, "")
      .substr(0, 20);

    return deviceId;
  };

  const handleEnterAdminMode = () => {
    setShowLocationSelector(true);
  };

  const handleCompleteSetup = async (location: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSetupStep("registration");
      setProgress(25);

      // Generate device ID
      const deviceId = generateDeviceId();
      console.log("Generated device ID:", deviceId);

      // Save device ID locally
      await AsyncStorage.setItem("device_id", deviceId);
      setProgress(50);

      // Create device configuration (without location)
      const deviceConfig: DeviceConfig = {
        deviceName: Device.deviceName || Device.modelName || "Survey Device",
        surveyInterval: 30,
        theme: "default",
        language: "en",
        autoSync: true,
        syncInterval: 5,
        maxRetries: 3,
        enableNotifications: true,
        enableAnalytics: true,
      };

      // Save device configuration locally
      await saveDeviceConfig(deviceConfig);
      setProgress(75);

      // Save location separately
      await AsyncStorage.setItem("device_location", location.trim());

      // Create complete device info
      const deviceInfo = {
        deviceId,
        location: location.trim(),
        name: deviceConfig.deviceName,
        model: Device.modelName || "unknown",
        os: Device.osName || "unknown",
        version: Device.osVersion || "unknown",
        appVersion: "1.0.0",
        configuration: deviceConfig,
      };

      setSetupStep("validation");
      setProgress(85);

      // Check if device is already registered
      const isRegistered = await isDeviceRegistered(deviceId);

      let registrationSuccess = true;
      if (!isRegistered) {
        // Register device with backend
        registrationSuccess = await registerDevice(deviceInfo);
        if (!registrationSuccess) {
          setError(
            "Failed to register device with backend. Please check your network connection and try again."
          );
          setSetupStep("location");
          setProgress(0);
          setIsLoading(false);
          return;
        }
      } else {
        console.log("Device already registered - skipping registration");
      }

      setProgress(100);
      setSetupStep("complete");

      // Only mark setup as complete after successful backend registration
      if (registrationSuccess) {
        // Mark setup as complete
        await AsyncStorage.setItem("setup_completed", "true");

        // Track setup completion
        await trackEvent("app_opened", {
          setupCompleted: true,
          deviceId,
          location: location.trim(),
        });

        // Show success message with details
        Alert.alert(
          "Setup Complete! 🎉",
          `Device configured successfully!\n\n📱 Device ID: ${deviceId}\n📍 Location: ${location.trim()}\n✅ Registration: ${
            isRegistered ? "Already registered" : "Successfully registered"
          }\n\nYour device is now ready to collect surveys.`,
          [
            {
              text: "Continue",
              onPress: () => {
                setIsLoading(false);
                onSetupComplete();
              },
            },
          ]
        );
      } else {
        setError("Setup failed. Please try again.");
        setSetupStep("location");
        setProgress(0);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Setup failed:", error);

      // Classify error and provide specific feedback
      let errorMessage = "Failed to complete setup. Please try again.";
      let canRetry = true;

      if (
        error.message?.includes("network") ||
        error.message?.includes("connection")
      ) {
        errorMessage =
          "Network connection failed. Please check your internet connection and try again.";
        canRetry = true;
      } else if (error.message?.includes("validation")) {
        errorMessage =
          "Invalid device configuration. Please check your settings and try again.";
        canRetry = false;
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
        canRetry = true;
      }

      setError(errorMessage);
      setSetupStep("location");
      setProgress(0);
      setIsLoading(false);

      // Show retry option if applicable
      if (canRetry) {
        Alert.alert("Setup Error", errorMessage, [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: () => handleCompleteSetup(location) },
        ]);
      } else {
        Alert.alert("Setup Error", errorMessage);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Setup Required</Text>
        <Text style={styles.headerSubtitle}>Configure your survey device</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!showLocationSelector ? (
          <View style={styles.setupContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📱</Text>
            </View>

            <Text style={styles.title}>Welcome to Survey App</Text>
            <Text style={styles.description}>
              This device needs to be configured before it can collect surveys.
              Please enter admin mode to set up the device location.
            </Text>

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Device Information:</Text>
              <Text style={styles.infoText}>
                Model: {Device.modelName || "Unknown"}
              </Text>
              <Text style={styles.infoText}>
                OS: {Device.osName} {Device.osVersion}
              </Text>
              <Text style={styles.infoText}>Status: Not configured</Text>
            </View>

            <TouchableOpacity
              style={styles.adminButton}
              onPress={handleEnterAdminMode}
            >
              <Text style={styles.adminButtonText}>Enter Admin Mode</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              💡 Admin mode allows you to configure device settings and
              location.
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {setupStep === "registration" && "Setting up device..."}
              {setupStep === "validation" && "Validating configuration..."}
              {setupStep === "complete" && "Finalizing setup..."}
            </Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          </View>
        ) : (
          <View style={styles.locationContainer}>
            <Text style={styles.locationTitle}>Enter Device Location</Text>
            <Text style={styles.locationDescription}>
              Please enter the location where this device will be used for
              collecting surveys.
            </Text>

            <TextInput
              style={styles.locationInput}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Terminal 1 - Check-in Counter A"
              placeholderTextColor={Colors.textSecondary}
              autoFocus={true}
            />

            <TouchableOpacity
              style={[
                styles.continueButton,
                !location.trim() && styles.continueButtonDisabled,
              ]}
              onPress={() => handleCompleteSetup(location)}
              disabled={!location.trim() || isLoading}
            >
              <Text style={styles.continueButtonText}>Continue Setup</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 60,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  setupContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.black,
    marginBottom: 15,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  infoContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
    width: "100%",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.black,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  adminButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  adminButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  locationContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.black,
    marginBottom: 10,
    textAlign: "center",
  },
  locationDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  locationInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    width: "100%",
  },
  continueButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: Colors.lightGray,
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: Colors.error,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  errorText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.black,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    width: "100%",
  },
  progressBar: {
    backgroundColor: Colors.lightGray,
    borderRadius: 5,
    height: 10,
    flex: 1,
    marginRight: 10,
  },
  progressFill: {
    backgroundColor: Colors.primary,
    borderRadius: 5,
    height: 10,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
