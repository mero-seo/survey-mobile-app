import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";
import {
  getAnalyticsData,
  resetAnalytics,
  trackEvent,
} from "../services/analyticsService";
import { manualSync } from "../services/backgroundSync";
import {
  DeviceConfig,
  getDeviceInfo,
  loadDeviceConfig,
  resetDeviceConfig,
  saveDeviceConfig,
} from "../services/deviceConfigService";
import { getNetworkService } from "../services/networkService";
import { getSurveyStats } from "../services/surveyStorage";
import { registerDevice } from "../services/syncService";
import { StatusBar } from "./StatusBar";

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
    // Track admin panel opened event
    trackEvent("admin_panel_opened");
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Load device configuration
      const deviceConfig = await loadDeviceConfig();
      setConfig(deviceConfig);

      // Load device information
      const info = await getDeviceInfo();
      setDeviceInfo(info);

      // Load survey statistics
      const surveyStats = await getSurveyStats();
      setStats(surveyStats);

      // Load analytics data
      const analyticsData = await getAnalyticsData();
      setAnalytics(analyticsData);

      // Get network status
      const networkService = getNetworkService();
      const networkStatus = networkService.getStatus();

      setStats((prev: any) => ({
        ...prev,
        network: networkStatus,
      }));
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = async (key: keyof DeviceConfig, value: any) => {
    if (!config) return;

    const updatedConfig = { ...config, [key]: value };
    setConfig(updatedConfig);

    try {
      await saveDeviceConfig({ [key]: value });
    } catch (error) {
      console.error("Failed to save config:", error);
      Alert.alert("Error", "Failed to save configuration");
    }
  };

  const handleManualSync = async () => {
    try {
      Alert.alert(
        "Manual Sync",
        "Syncing will now run in the background. You can check the status bar for progress.",
        [{ text: "OK" }]
      );
      // manualSync now runs in the background and doesn't return a result
      await manualSync();
      // The StatusBar will update automatically via its own timer.
      // We can trigger a refresh of the admin panel data to show immediate changes.
      await loadAdminData();
    } catch (error) {
      console.error("Manual sync failed to trigger:", error);
      Alert.alert("Error", "Failed to start manual sync.");
    }
  };

  const handleResetConfig = () => {
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
  };

  const handleResetAnalytics = () => {
    Alert.alert(
      "Reset Analytics",
      "Are you sure you want to reset all analytics data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await resetAnalytics();
              await loadAdminData();
              Alert.alert("Success", "Analytics data reset");
            } catch (error) {
              console.error("Failed to reset analytics:", error);
              Alert.alert("Error", "Failed to reset analytics");
            }
          },
        },
      ]
    );
  };

  const handleResetSetup = () => {
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
              await resetAnalytics();
              Alert.alert("Success", "Setup reset. Please restart the app.");
            } catch (error) {
              console.error("Failed to reset setup:", error);
              Alert.alert("Error", "Failed to reset setup");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <Text>Loading admin data...</Text>
        ) : (
          <>
            {/* Device Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Device Information</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Device ID</Text>
                <Text style={styles.value} selectable>
                  {deviceInfo?.deviceId}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Location</Text>
                <Text style={styles.value}>{deviceInfo?.location}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Device Name</Text>
                <Text style={styles.value}>{deviceInfo?.name}</Text>
              </View>
            </View>

            {/* Survey Stats Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Survey Statistics</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Pending Sync</Text>
                <Text style={styles.value}>{stats?.pendingCount}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Synced</Text>
                <Text style={styles.value}>{stats?.syncedCount}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Failed</Text>
                <Text style={styles.value}>{stats?.failedCount}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Total Surveys</Text>
                <Text style={styles.value}>{stats?.totalCount}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Network Status</Text>
                <Text style={styles.value}>
                  {stats?.network?.isConnected ? "Online" : "Offline"}
                </Text>
              </View>
            </View>

            {/* Actions Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <TouchableOpacity
                style={styles.button}
                onPress={handleManualSync}
              >
                <Text style={styles.buttonText}>Manual Sync</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => loadAdminData()}
              >
                <Text style={styles.buttonText}>Refresh Data</Text>
              </TouchableOpacity>
            </View>

            {/* Configuration Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Configuration</Text>
              {config && (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>Auto Sync</Text>
                    <Switch
                      value={config.autoSync}
                      onValueChange={(v) => handleConfigChange("autoSync", v)}
                    />
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Sync Interval (minutes)</Text>
                    <TextInput
                      style={styles.input}
                      value={String(config.syncInterval)}
                      keyboardType="numeric"
                      onChangeText={(t) =>
                        handleConfigChange("syncInterval", Number(t) || 0)
                      }
                    />
                  </View>
                </>
              )}
            </View>

            {/* Danger Zone */}
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
                onPress={handleResetAnalytics}
              >
                <Text style={styles.buttonText}>Reset Analytics Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={handleResetSetup}
              >
                <Text style={styles.buttonText}>Reset Device Setup</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
    padding: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    width: 50,
  },
  scrollContent: {
    padding: 15,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingBottom: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 5,
    padding: 8,
    width: 60,
    textAlign: "center",
  },
  dangerTitle: {
    color: Colors.error,
    borderBottomColor: Colors.error,
  },
  dangerButton: {
    backgroundColor: Colors.error,
  },
});
