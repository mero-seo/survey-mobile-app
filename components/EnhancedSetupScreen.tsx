import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import React, { useState, useEffect } from "react";
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
import { apiGetPublic } from "../services/apiService";

interface EnhancedSetupScreenProps {
  onSetupComplete: () => void;
}

interface ExistingDevice {
  deviceId: string;
  name: string;
  location: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
}

export const EnhancedSetupScreen: React.FC<EnhancedSetupScreenProps> = ({
  onSetupComplete,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<
    "location" | "registration" | "validation" | "complete"
  >("location");
  const [progress, setProgress] = useState(0);
  const [location, setLocation] = useState("");
  const [existingDevices, setExistingDevices] = useState<ExistingDevice[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<ExistingDevice | null>(
    null
  );
  const [isCustomLocation, setIsCustomLocation] = useState(false);

  useEffect(() => {
    loadExistingLocations();
  }, []);

  const loadExistingLocations = async () => {
    try {
      setIsLoadingLocations(true);
      // Get existing devices from backend using public endpoint
      const response = await apiGetPublic("/devices/locations");
      if (response && response.data) {
        setExistingDevices(response.data);
      }
    } catch (error) {
      console.error("Failed to load existing locations:", error);
      // Continue with empty list
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const generateDeviceId = (): string => {
    const deviceModel =
      Device.modelName?.replace(/[^a-zA-Z0-9]/g, "") || "device";
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);

    const deviceId = `${deviceModel}${timestamp}${random}`
      .replace(/[^a-zA-Z0-9]/g, "")
      .substr(0, 20);

    return deviceId;
  };

  const handleLocationSelect = (device: ExistingDevice) => {
    setSelectedDevice(device);
    setLocation(device.location);
    setIsCustomLocation(false);
  };

  const handleCustomLocation = () => {
    setSelectedDevice(null);
    setLocation("");
    setIsCustomLocation(true);
  };

  const handleCompleteSetup = async (location: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSetupStep("registration");
      setProgress(25);

      // If an existing device was selected, use its deviceId
      let deviceId: string;
      if (selectedDevice) {
        deviceId = selectedDevice.deviceId;
        console.log("Using existing device ID:", deviceId);
      } else {
        // Generate new device ID for custom location
        deviceId = generateDeviceId();
        console.log("Generated new device ID:", deviceId);
      }

      // Save device ID locally
      await AsyncStorage.setItem("device_id", deviceId);
      setProgress(50);

      // Create device configuration
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

      // Check if device is already registered (only for new devices)
      if (!selectedDevice) {
        const isRegistered = await isDeviceRegistered(deviceId);
        let registrationSuccess = true;

        if (!isRegistered) {
          registrationSuccess = await registerDevice(deviceInfo);
        }

        if (!registrationSuccess) {
          throw new Error("Failed to register device with backend");
        }
      }

      setSetupStep("complete");
      setProgress(100);

      // Track setup completion
      await trackEvent("device_registered", {
        deviceId,
        location: location.trim(),
        isExistingDevice: !!selectedDevice,
      });

      // Mark setup as complete
      await AsyncStorage.setItem("setup_completed", "true");

      // Complete setup
      onSetupComplete();
    } catch (error: any) {
      console.error("Setup failed:", error);
      setError(error.message || "Setup failed. Please try again.");
      setSetupStep("location");
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (setupStep) {
      case "location":
        return "Select Device Location";
      case "registration":
        return "Registering Device";
      case "validation":
        return "Validating Setup";
      case "complete":
        return "Setup Complete";
      default:
        return "Device Setup";
    }
  };

  if (isLoadingLocations) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading existing devices...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{getStepTitle()}</Text>
        <Text style={styles.subtitle}>
          Configure your survey device for the airport immigration system
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}% Complete</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {setupStep === "location" && (
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Choose Device Location</Text>

          {/* Existing Locations */}
          {existingDevices.length > 0 && (
            <View style={styles.existingLocations}>
              <Text style={styles.sectionSubtitle}>
                Select an existing device location:
              </Text>
              {existingDevices.map((device) => (
                <TouchableOpacity
                  key={device.deviceId}
                  style={[
                    styles.locationCard,
                    selectedDevice?.deviceId === device.deviceId &&
                      styles.selectedCard,
                  ]}
                  onPress={() => handleLocationSelect(device)}
                >
                  <Text style={styles.locationName}>{device.name}</Text>
                  <Text style={styles.locationText}>{device.location}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      {
                        color:
                          device.status === "ACTIVE"
                            ? Colors.success
                            : Colors.error,
                      },
                    ]}
                  >
                    {device.status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Custom Location Option */}
          <View style={styles.customLocation}>
            <Text style={styles.sectionSubtitle}>
              Or enter a custom location:
            </Text>
            <TouchableOpacity
              style={[
                styles.locationCard,
                isCustomLocation && styles.selectedCard,
              ]}
              onPress={handleCustomLocation}
            >
              <Text style={styles.locationName}>Custom Location</Text>
              <Text style={styles.locationText}>
                Enter new location details
              </Text>
            </TouchableOpacity>
          </View>

          {/* Custom Location Input */}
          {isCustomLocation && (
            <View style={styles.customInput}>
              <Text style={styles.inputLabel}>Location Name:</Text>
              <TextInput
                style={styles.textInput}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Terminal 1 - Immigration Counter 3"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!location.trim() || isLoading) && styles.disabledButton,
            ]}
            onPress={() => handleCompleteSetup(location)}
            disabled={!location.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {setupStep === "registration" && (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Registering device...</Text>
        </View>
      )}

      {setupStep === "validation" && (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Validating setup...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: Colors.error,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: Colors.white,
    textAlign: "center",
  },
  locationSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.black,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  existingLocations: {
    marginBottom: 24,
  },
  locationCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.lightGray,
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  locationName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: "600",
    alignSelf: "flex-start",
  },
  customLocation: {
    marginBottom: 24,
  },
  customInput: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.black,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
