import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { apiGetPublic } from "./apiService";

export interface DeviceConfig {
  deviceName: string;
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
  buildNumber?: string;
  versionCode?: number;
  configuration: DeviceConfig;
}

export interface DeviceStatus {
  deviceId: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  isOnline: boolean;
  lastSeen: string | null;
  location: string;
  surveysToday: number;
}

// Version tracking constants
const VERSION_STORAGE_KEY = "app_version_info";
const APP_VERSION = "1.0.1";
const BUILD_NUMBER = "2";
const VERSION_CODE = 2;

// Version tracking interface
export interface VersionInfo {
  appVersion: string;
  buildNumber: string;
  versionCode: number;
  firstInstallDate: string;
  lastUpdateDate: string;
}

const CONFIG_STORAGE_KEY = "device_config";
const DEVICE_INFO_STORAGE_KEY = "device_info";
const DEVICE_STATUS_STORAGE_KEY = "device_status";

// Default configuration
const DEFAULT_CONFIG: DeviceConfig = {
  deviceName: Device.deviceName || Device.modelName || "Unknown Device",
  maxRetries: 3,
  enableNotifications: true,
  enableAnalytics: true,
};

// Clear old configuration data (for migration)
export const clearOldConfigData = async (): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);

      // Check if this is old config format
      if (
        config.autoSync !== undefined ||
        config.surveyInterval !== undefined ||
        config.syncInterval !== undefined ||
        config.theme !== undefined ||
        config.language !== undefined
      ) {
        console.log("Clearing old configuration data...");
        await AsyncStorage.removeItem(CONFIG_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Failed to clear old config data:", error);
  }
};

// Load device configuration from local storage
export const loadDeviceConfig = async (): Promise<DeviceConfig> => {
  try {
    const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);

      // Check if this is old config format and migrate
      if (
        config.autoSync !== undefined ||
        config.surveyInterval !== undefined ||
        config.syncInterval !== undefined ||
        config.theme !== undefined ||
        config.language !== undefined
      ) {
        console.log("Detected old config format, migrating to new format...");
        // Clear old config and return defaults
        await AsyncStorage.removeItem(CONFIG_STORAGE_KEY);
        return DEFAULT_CONFIG;
      }

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

// Get complete device information
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const config = await loadDeviceConfig();
  const versionInfo = await loadVersionInfo();

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
    appVersion: versionInfo.appVersion,
    buildNumber: versionInfo.buildNumber,
    versionCode: versionInfo.versionCode,
    configuration: config,
  };
};

// Refresh device info after syncing
export const refreshDeviceInfo = async (): Promise<DeviceInfo> => {
  // Force reload config to get latest data
  const config = await loadDeviceConfig();
  const versionInfo = await loadVersionInfo();

  // Get latest location from storage
  const location = (await AsyncStorage.getItem("device_location")) || "default";

  // Get device ID
  const deviceId =
    (await AsyncStorage.getItem("device_id")) ||
    (Device.deviceName || Device.modelName || "unknown").replace(
      /[^a-zA-Z0-9]/g,
      ""
    );

  return {
    deviceId,
    location,
    name: config.deviceName,
    model: Device.modelName || "unknown",
    os: Device.osName || "unknown",
    version: Device.osVersion || "unknown",
    appVersion: versionInfo.appVersion,
    buildNumber: versionInfo.buildNumber,
    versionCode: versionInfo.versionCode,
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

// Get device status from backend
export const getDeviceStatusFromBackend = async (
  deviceId: string
): Promise<DeviceStatus | null> => {
  try {
    const response = await apiGetPublic(
      `/devices/status-by-device-id/${deviceId}`
    );
    return response.data;
  } catch (error) {
    console.error("Failed to get device status from backend:", error);
    return null;
  }
};

// Save device status to local storage
export const saveDeviceStatus = async (status: DeviceStatus): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      DEVICE_STATUS_STORAGE_KEY,
      JSON.stringify(status)
    );
  } catch (error) {
    console.error("Failed to save device status:", error);
  }
};

// Load device status from local storage
export const loadDeviceStatus = async (): Promise<DeviceStatus | null> => {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_STATUS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to load device status:", error);
    return null;
  }
};

// Check if device is active (can perform surveys)
export const isDeviceActive = async (): Promise<boolean> => {
  try {
    const status = await loadDeviceStatus();
    return status?.status === "ACTIVE";
  } catch (error) {
    console.error("Failed to check device status:", error);
    return false;
  }
};

// Update local device information from survey data or backend
export const updateLocalDeviceInfo = async (
  deviceId?: string,
  name?: string,
  location?: string
): Promise<void> => {
  try {
    // Update device ID if provided
    if (deviceId) {
      await AsyncStorage.setItem("device_id", deviceId);
      console.log("Updated local device ID:", deviceId);
    }

    // Update device name if provided
    if (name) {
      const config = await loadDeviceConfig();
      const updatedConfig = { ...config, deviceName: name };
      await saveDeviceConfig(updatedConfig);
      console.log("Updated local device name:", name);
    }

    // Update location if provided
    if (location) {
      await AsyncStorage.setItem("device_location", location);
      console.log("Updated local device location:", location);
    }
  } catch (error) {
    console.error("Failed to update local device info:", error);
  }
};

// Sync device configuration from backend
export const syncDeviceConfigFromBackend = async (
  deviceId: string
): Promise<boolean> => {
  try {
    // Since we removed configuration from backend, only sync device status and location
    // Get device status from backend using public endpoint
    const statusResponse = await apiGetPublic(
      `/devices/status-by-device-id/${deviceId}`
    );

    if (statusResponse.data) {
      await saveDeviceStatus(statusResponse.data);
      console.log(
        "Device status synced from backend:",
        statusResponse.data.status
      );

      // Update local device information from backend response
      await updateLocalDeviceInfo(
        statusResponse.data.deviceId,
        statusResponse.data.name,
        statusResponse.data.location
      );

      console.log("Device info synced from backend");
      return true;
    }
    return false;
  } catch (error: any) {
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      console.log("Device info sync rate limited, will retry later");
      return false;
    }
    console.error("Failed to sync device info from backend:", error);
    return false;
  }
};

// Get app version information
export const getAppVersionInfo = (): VersionInfo => {
  const now = new Date().toISOString();

  return {
    appVersion: APP_VERSION,
    buildNumber: BUILD_NUMBER,
    versionCode: VERSION_CODE,
    firstInstallDate: now,
    lastUpdateDate: now,
  };
};

// Load version information from storage
export const loadVersionInfo = async (): Promise<VersionInfo> => {
  try {
    const stored = await AsyncStorage.getItem(VERSION_STORAGE_KEY);
    if (stored) {
      const versionInfo = JSON.parse(stored);

      // Check if this is a new version
      if (versionInfo.appVersion !== APP_VERSION) {
        // Update version info for new version
        const updatedInfo: VersionInfo = {
          ...versionInfo,
          appVersion: APP_VERSION,
          buildNumber: BUILD_NUMBER,
          versionCode: VERSION_CODE,
          lastUpdateDate: new Date().toISOString(),
        };

        await AsyncStorage.setItem(
          VERSION_STORAGE_KEY,
          JSON.stringify(updatedInfo)
        );
        console.log("App version updated:", updatedInfo);
        return updatedInfo;
      }

      return versionInfo;
    }
  } catch (error) {
    console.error("Failed to load version info:", error);
  }

  // Return default version info for first install
  const defaultInfo = getAppVersionInfo();
  await AsyncStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(defaultInfo));
  console.log("First app install, version info:", defaultInfo);
  return defaultInfo;
};

// Check if app needs update
export const checkForAppUpdate = async (): Promise<{
  needsUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  updateAvailable?: boolean;
}> => {
  try {
    const versionInfo = await loadVersionInfo();

    // For now, we'll just return the current version
    // In the future, you can implement a check against a backend API
    return {
      needsUpdate: false,
      currentVersion: versionInfo.appVersion,
      updateAvailable: false,
    };
  } catch (error) {
    console.error("Failed to check for app update:", error);
    return {
      needsUpdate: false,
      currentVersion: APP_VERSION,
      updateAvailable: false,
    };
  }
};

// Get version history
export const getVersionHistory = async (): Promise<VersionInfo[]> => {
  try {
    const stored = await AsyncStorage.getItem(VERSION_STORAGE_KEY);
    if (stored) {
      const versionInfo = JSON.parse(stored);
      return [versionInfo]; // For now, just return current version
    }
  } catch (error) {
    console.error("Failed to get version history:", error);
  }

  return [];
};
