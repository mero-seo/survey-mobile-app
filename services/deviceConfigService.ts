import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { apiPost } from "./apiService";

export interface DeviceConfig {
  surveyInterval: number; // minutes between surveys
  theme: "default" | "light" | "dark";
  language: "en" | "ne"; // English, Nepali
  deviceName: string;
  autoSync: boolean;
  syncInterval: number; // minutes
  maxRetries: number;
  enableNotifications: boolean;
  enableAnalytics: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  location: string;
  name: string;
  model: string;
  os: string;
  version: string;
  appVersion: string;
  configuration: DeviceConfig;
}

const CONFIG_STORAGE_KEY = "device_config";
const DEVICE_INFO_STORAGE_KEY = "device_info";

// Default configuration
const DEFAULT_CONFIG: DeviceConfig = {
  surveyInterval: 30,
  theme: "default",
  language: "en",
  deviceName: Device.deviceName || Device.modelName || "Unknown Device",
  autoSync: true,
  syncInterval: 5,
  maxRetries: 3,
  enableNotifications: true,
  enableAnalytics: true,
};

// Load device configuration from local storage
export const loadDeviceConfig = async (): Promise<DeviceConfig> => {
  try {
    const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error("Failed to load device config:", error);
  }
  return DEFAULT_CONFIG;
};

// Save device configuration to local storage
export const saveDeviceConfig = async (
  config: Partial<DeviceConfig>
): Promise<void> => {
  try {
    const currentConfig = await loadDeviceConfig();
    const updatedConfig = { ...currentConfig, ...config };
    await AsyncStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify(updatedConfig)
    );
    console.log("Device config saved:", updatedConfig);
  } catch (error) {
    console.error("Failed to save device config:", error);
  }
};

// Get device configuration from backend
export const fetchDeviceConfig = async (
  deviceId: string
): Promise<DeviceConfig | null> => {
  try {
    // Use the correct endpoint structure - config uses device auth in body
    const response = await apiPost(`/devices/config`, {
      deviceId: deviceId,
    });
    if (response && response.configuration) {
      await saveDeviceConfig(response.configuration);
      return response.configuration;
    }
  } catch (error) {
    console.error("Failed to fetch device config from backend:", error);
  }
  return null;
};

// Update device configuration on backend
export const updateDeviceConfig = async (
  deviceId: string,
  config: Partial<DeviceConfig>
): Promise<boolean> => {
  try {
    // Use the correct endpoint structure - config uses device auth in body
    await apiPost(`/devices/config`, {
      deviceId: deviceId,
      configuration: config,
    });
    await saveDeviceConfig(config);
    console.log("Device config updated on backend:", config);
    return true;
  } catch (error) {
    console.error("Failed to update device config on backend:", error);
    return false;
  }
};

// Get complete device information
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const config = await loadDeviceConfig();

  // Try to get stored device ID first
  let deviceId: string;
  let location: string;

  try {
    const storedDeviceId = await AsyncStorage.getItem("device_id");
    if (storedDeviceId) {
      deviceId = storedDeviceId;
    } else {
      // Fallback to generated device ID (alphanumeric only)
      const fallbackName = Device.deviceName || Device.modelName || "unknown";
      deviceId = fallbackName.replace(/[^a-zA-Z0-9]/g, "");
    }

    // Get location from storage (separate from config)
    const storedLocation = await AsyncStorage.getItem("device_location");
    location = storedLocation || "default";
  } catch (error) {
    console.error("Failed to get stored device info:", error);
    const fallbackName = Device.deviceName || Device.modelName || "unknown";
    deviceId = fallbackName.replace(/[^a-zA-Z0-9]/g, "");
    location = "default";
  }

  return {
    deviceId,
    location,
    name: config.deviceName,
    model: Device.modelName || "unknown",
    os: Device.osName || "unknown",
    version: Device.osVersion || "unknown",
    appVersion: "1.0.0",
    configuration: config,
  };
};

// Save device information to local storage
export const saveDeviceInfo = async (deviceInfo: DeviceInfo): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      DEVICE_INFO_STORAGE_KEY,
      JSON.stringify(deviceInfo)
    );
  } catch (error) {
    console.error("Failed to save device info:", error);
  }
};

// Load device information from local storage
export const loadDeviceInfo = async (): Promise<DeviceInfo | null> => {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_INFO_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to load device info:", error);
    return null;
  }
};

// Reset device configuration to defaults
export const resetDeviceConfig = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CONFIG_STORAGE_KEY);
    await AsyncStorage.removeItem(DEVICE_INFO_STORAGE_KEY);
    console.log("Device config reset to defaults");
  } catch (error) {
    console.error("Failed to reset device config:", error);
  }
};
