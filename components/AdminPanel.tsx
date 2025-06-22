import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { apiGetPublic } from "../services/apiService";
import { manualSync } from "../services/backgroundSync";
import type { VersionInfo } from "../services/deviceConfigService";
import {
  getDeviceInfo,
  loadVersionInfo,
  resetDeviceConfig,
  updateLocalDeviceInfo,
} from "../services/deviceConfigService";
import { getNetworkService, NetworkStatus } from "../services/networkService";
import { StatusBar } from "./StatusBar";

interface AdminPanelProps {
  onClose: () => void;
  onManualSync?: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onClose,
  onManualSync,
}) => {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: false,
    type: "unknown",
    isWifi: false,
    isCellular: false,
  });
  const isInitializedRef = useRef(false);

  const loadAdminData = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous loads

    setIsLoading(true);
    try {
      // Load version information
      const versionData = await loadVersionInfo();
      setVersionInfo(versionData);
      console.log("Version info loaded:", versionData);

      // First, load local device information (works offline)
      let localDeviceInfo = null;
      try {
        localDeviceInfo = await getDeviceInfo();
        console.log("Loaded local device info:", localDeviceInfo);
      } catch (error) {
        console.error("Failed to load local device info:", error);
      }

      // Set local device info immediately (offline fallback)
      if (localDeviceInfo) {
        console.log("Setting local device info in AdminPanel:", {
          deviceId: localDeviceInfo.deviceId,
          name: localDeviceInfo.name,
          location: localDeviceInfo.location,
          appVersion: localDeviceInfo.appVersion,
        });
        setDeviceInfo({
          deviceId: localDeviceInfo.deviceId,
          name: localDeviceInfo.name || localDeviceInfo.deviceId,
          location: localDeviceInfo.location,
          appVersion: localDeviceInfo.appVersion,
          buildNumber: localDeviceInfo.buildNumber,
          source: "local" as const,
        });
      }

      // Try to fetch latest device status from backend (only if online)
      const isOnline =
        networkStatus.isConnected && networkStatus.isInternetReachable;
      if (isOnline) {
        try {
          const deviceId =
            localDeviceInfo?.deviceId ||
            (await AsyncStorage.getItem("device_id"));
          if (deviceId) {
            console.log(
              "Fetching device info from backend for deviceId:",
              deviceId
            );
            const response = await apiGetPublic(
              `/devices/status-by-device-id/${deviceId}`
            );
            const statusData = response.data;
            console.log("Backend device info received:", statusData);

            // Persist the latest info to local storage
            if (statusData.name && statusData.location) {
              await updateLocalDeviceInfo(
                statusData.deviceId,
                statusData.name,
                statusData.location
              );
              console.log("Local device info updated with backend data.");
            }

            // Update with backend data if available
            setDeviceInfo({
              deviceId: statusData.deviceId,
              name: statusData.name || statusData.deviceId,
              location: statusData.location,
              appVersion: localDeviceInfo?.appVersion,
              buildNumber: localDeviceInfo?.buildNumber,
              source: "backend" as const,
            });
            console.log("Updated AdminPanel with backend device info:", {
              deviceId: statusData.deviceId,
              name: statusData.name || statusData.deviceId,
              location: statusData.location,
              appVersion: localDeviceInfo?.appVersion,
            });
          }
        } catch (backendError) {
          console.log(
            "Backend fetch failed (user might be offline):",
            backendError
          );
          // Keep using local device info if backend is unavailable
          if (!localDeviceInfo) {
            throw new Error(
              "No device information available (offline and no local data)"
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
      // Show error state but don't clear existing data
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, networkStatus.isConnected, networkStatus.isInternetReachable]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      loadAdminData();

      // Set up network monitoring
      const networkService = getNetworkService();
      const unsubscribeNetwork = networkService.addListener((status) => {
        setNetworkStatus(status);
        console.log("Network status changed:", status);
      });

      // Get initial network status
      networkService.checkConnectivity().then(setNetworkStatus);

      return () => {
        unsubscribeNetwork();
      };
    }
  }, [loadAdminData]);

  // Effect to reload data when coming online
  useEffect(() => {
    const isOnline =
      networkStatus.isConnected && networkStatus.isInternetReachable;
    if (isOnline) {
      console.log(
        "App is online, reloading admin data to ensure it's up to date."
      );
      loadAdminData();
    }
  }, [networkStatus.isConnected, networkStatus.isInternetReachable]);

  const handleManualSync = useCallback(async () => {
    try {
      const isOnline =
        networkStatus.isConnected && networkStatus.isInternetReachable;

      Alert.alert(
        "Manual Sync",
        isOnline
          ? "Syncing will now run in the background. You can check the status bar for progress."
          : "You're currently offline. Sync will be queued and run when connection is restored.",
        [{ text: "OK" }]
      );

      if (onManualSync) {
        await onManualSync();
      } else {
        // Fallback to internal sync if no prop provided
        await manualSync();
      }

      // The StatusBar will update automatically via its own timer.
      // We can trigger a refresh of the admin panel data to show immediate changes.
      await loadAdminData();
    } catch (error) {
      console.error("Manual sync failed to trigger:", error);
      Alert.alert("Error", "Failed to start manual sync.");
    }
  }, [
    onManualSync,
    loadAdminData,
    networkStatus.isConnected,
    networkStatus.isInternetReachable,
  ]);

  const handleResetConfig = useCallback(() => {
    Alert.alert(
      "Reset Configuration",
      "Are you sure you want to reset all device settings to defaults?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await resetDeviceConfig();
              await loadAdminData();
              Alert.alert("Success", "Configuration reset to defaults");
            } catch (error) {
              console.error("Failed to reset config:", error);
              Alert.alert("Error", "Failed to reset configuration");
            }
          },
        },
      ]
    );
  }, [loadAdminData]);

  const handleResetSetup = useCallback(() => {
    Alert.alert(
      "Reset Setup",
      "This will reset the device setup and show the setup screen again. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("setup_completed");
              await AsyncStorage.removeItem("device_id");
              await resetDeviceConfig();
              Alert.alert("Success", "Setup reset. Please restart the app.");
            } catch (error) {
              console.error("Failed to reset setup:", error);
              Alert.alert("Error", "Failed to reset setup");
            }
          },
        },
      ]
    );
  }, []);

  const handleRefreshData = useCallback(() => {
    loadAdminData();
  }, [loadAdminData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <View style={styles.networkIndicator}>
          <Text
            style={[
              styles.networkStatus,
              {
                color:
                  networkStatus.isConnected && networkStatus.isInternetReachable
                    ? Colors.success
                    : Colors.error,
              },
            ]}
          >
            {networkStatus.isConnected && networkStatus.isInternetReachable
              ? "🌐"
              : "📡"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <>
          {/* Device Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Device Information
              {/* {deviceInfo?.source && (
                <Text style={styles.sourceIndicator}>
                  {" "}
                  ({deviceInfo.source === "local" ? "Offline" : "Online"})
                </Text>
              )} */}
            </Text>
            {!networkStatus.isConnected ||
            !networkStatus.isInternetReachable ? (
              <View style={styles.offlineNote}>
                <Text style={styles.offlineText}>
                  📡 Offline Mode - Showing local device information
                </Text>
              </View>
            ) : null}
            {deviceInfo ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Device ID</Text>
                  <Text style={styles.value}>{deviceInfo.deviceId}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Name</Text>
                  <Text style={styles.value}>{deviceInfo.name}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Location</Text>
                  <Text style={styles.value}>{deviceInfo.location}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>App Version</Text>
                  <Text style={styles.value}>
                    {deviceInfo.appVersion}
                    {deviceInfo.buildNumber &&
                      ` (Build ${deviceInfo.buildNumber})`}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.row}>
                <Text style={styles.noDataText}>
                  {isLoading
                    ? "Loading device information..."
                    : "No device information available"}
                </Text>
              </View>
            )}
          </View>

          {/* Version Information */}
          {versionInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Version Information</Text>
              <View style={styles.row}>
                <Text style={styles.label}>App Version</Text>
                <Text style={styles.value}>{versionInfo.appVersion}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Build Number</Text>
                <Text style={styles.value}>{versionInfo.buildNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Version Code</Text>
                <Text style={styles.value}>{versionInfo.versionCode}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>First Install</Text>
                <Text style={styles.value}>
                  {new Date(versionInfo.firstInstallDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Last Update</Text>
                <Text style={styles.value}>
                  {new Date(versionInfo.lastUpdateDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {/* Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <TouchableOpacity style={styles.button} onPress={handleManualSync}>
              <Text style={styles.buttonText}>Manual Sync</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleRefreshData}>
              <Text style={styles.buttonText}>Refresh Data</Text>
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          {/**
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>
              Danger Zone
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleResetConfig}
            >
              <Text style={styles.buttonText}>Reset Configuration</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleResetSetup}
            >
              <Text style={styles.buttonText}>Reset Device Setup</Text>
            </TouchableOpacity>
          </View>
          */}
        </>
      </ScrollView>

      {/* Status Bar */}
      <StatusBar location={deviceInfo?.location} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.black,
  },
  networkIndicator: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  networkStatus: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.black,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: Colors.black,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  label: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.black,
    textAlign: "right",
    flex: 1,
    marginLeft: 10,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  dangerTitle: {
    color: Colors.error,
    borderBottomColor: Colors.error,
  },
  dangerButton: {
    backgroundColor: Colors.error,
  },
  sourceIndicator: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  noDataText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  offlineNote: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  offlineText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
