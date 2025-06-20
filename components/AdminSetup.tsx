import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useSurvey } from "../context/SurveyContext";
import { setDeviceConfig } from "../services/configStorage";
import { registerDevice } from "../services/syncService";

// Predefined locations (you can modify this list)
const LOCATIONS = [
  "Reception",
  "Waiting Area",
  "Service Desk",
  "Checkout",
  "Information Desk",
  "Help Desk",
  "Customer Service",
  "Main Entrance",
  "Exit",
  "Other",
];

interface AdminSetupProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AdminSetup: React.FC<AdminSetupProps> = ({
  isVisible,
  onClose,
}) => {
  const { state, dispatch } = useSurvey();
  const [selectedLocation, setSelectedLocation] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (state.deviceConfig) {
      setSelectedLocation(state.deviceConfig.location);
      setDeviceName(state.deviceConfig.name);
    }
  }, [state.deviceConfig]);

  const handleSave = async () => {
    if (!selectedLocation && !customLocation) {
      Alert.alert("Error", "Please select or enter a location");
      return;
    }

    if (!deviceName.trim()) {
      Alert.alert("Error", "Please enter a device name");
      return;
    }

    setIsLoading(true);

    try {
      const location =
        selectedLocation === "Other" ? customLocation : selectedLocation;

      // Generate device ID if not exists
      const deviceId = state.deviceConfig?.deviceId || `device_${Date.now()}`;

      const config = {
        deviceId,
        location,
        name: deviceName.trim(),
        status: "active" as const,
        configuration: {
          surveyInterval: 5, // 5 minutes
          theme: "default",
          language: "en",
        },
        createdAt: state.deviceConfig?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to local storage
      await setDeviceConfig(config);

      // Update context
      dispatch({ type: "SET_DEVICE_CONFIG", payload: config });

      // Register with backend
      try {
        await registerDevice(config);
        console.log("Device registered successfully");
      } catch (error) {
        console.warn("Failed to register device with backend:", error);
        // Continue anyway as we have local config
      }

      Alert.alert("Success", "Device configuration saved successfully", [
        { text: "OK", onPress: onClose },
      ]);
    } catch (error) {
      console.error("Failed to save device config:", error);
      Alert.alert("Error", "Failed to save device configuration");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Setup</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.label}>Device Name</Text>
          <TextInput
            style={styles.input}
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Enter device name"
            placeholderTextColor={Colors.light.text}
          />

          <Text style={styles.label}>Location</Text>
          <View style={styles.locationContainer}>
            {LOCATIONS.map((location) => (
              <TouchableOpacity
                key={location}
                style={[
                  styles.locationButton,
                  selectedLocation === location &&
                    styles.locationButtonSelected,
                ]}
                onPress={() => setSelectedLocation(location)}
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    selectedLocation === location &&
                      styles.locationButtonTextSelected,
                  ]}
                >
                  {location}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedLocation === "Other" && (
            <>
              <Text style={styles.label}>Custom Location</Text>
              <TextInput
                style={styles.input}
                value={customLocation}
                onChangeText={setCustomLocation}
                placeholder="Enter custom location"
                placeholderTextColor={Colors.light.text}
              />
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.light.text,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  locationContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  locationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  locationButtonSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  locationButtonText: {
    color: Colors.light.text,
    fontSize: 14,
  },
  locationButtonTextSelected: {
    color: Colors.light.background,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: "600",
  },
});
