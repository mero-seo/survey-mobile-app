import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BackgroundSyncState,
  getBackgroundSyncStatus,
} from "../services/backgroundSync";
import {
  getDeviceInfo,
  getDeviceStatusFromBackend,
  refreshDeviceInfo,
} from "../services/deviceConfigService";
import { getNetworkService, NetworkStatus } from "../services/networkService";
import { getPendingSurveys } from "../services/surveyStorage";

interface StatusBarProps {
  location?: string;
}

const StatusBarComponent: React.FC<StatusBarProps> = ({
  location = "Default Location",
}) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: false,
    type: "unknown",
    isWifi: false,
    isCellular: false,
  });
  const [syncState, setSyncState] = useState<BackgroundSyncState>({
    status: "idle",
    lastSync: null,
    activeSyncs: 0,
  });
  const [deviceStatus, setDeviceStatus] = useState<string>("UNKNOWN");
  const [currentLocation, setCurrentLocation] = useState<string>(location);

  // Use refs to prevent unnecessary re-renders
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const networkListenerRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  const loadPendingCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const pending = await getPendingSurveys();
      if (isMountedRef.current) {
        setPendingCount(pending.length);
      }
    } catch (error) {
      console.error("Error loading pending count:", error);
    }
  }, []);

  const loadNetworkStatus = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const networkService = getNetworkService();
      const status = await networkService.checkConnectivity();
      if (isMountedRef.current) {
        setNetworkStatus(status);
      }
    } catch (error) {
      console.error("Error loading network status:", error);
    }
  }, []);

  const loadSyncStatus = useCallback(() => {
    if (!isMountedRef.current) return;
    try {
      const status = getBackgroundSyncStatus();
      if (isMountedRef.current) {
        setSyncState(status);
      }
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  }, []);

  const loadDeviceStatus = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const deviceInfo = await getDeviceInfo();
      const status = await getDeviceStatusFromBackend(deviceInfo.deviceId);
      if (status && isMountedRef.current) {
        setDeviceStatus(status.status);
      }
    } catch (error) {
      console.error("Error loading device status:", error);
    }
  }, []);

  const loadDeviceLocation = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const deviceInfo = await refreshDeviceInfo();
      if (isMountedRef.current) {
        setCurrentLocation(deviceInfo.location);
      }
    } catch (error) {
      console.error("Error loading device location:", error);
    }
  }, []);

  // Batch update function to reduce state updates
  const updateAllStatus = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      await Promise.all([
        loadPendingCount(),
        loadSyncStatus(),
        loadDeviceStatus(),
        loadDeviceLocation(),
      ]);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }, [loadPendingCount, loadSyncStatus, loadDeviceStatus, loadDeviceLocation]);

  useEffect(() => {
    isMountedRef.current = true;

    // Load initial data
    loadPendingCount();
    loadNetworkStatus();
    loadSyncStatus();
    loadDeviceStatus();
    loadDeviceLocation();

    // Set up listeners
    const networkService = getNetworkService();

    // Remove any existing listener
    if (networkListenerRef.current) {
      networkListenerRef.current();
    }

    const unsubscribeNetwork = networkService.addListener((status) => {
      if (isMountedRef.current) {
        setNetworkStatus(status);
      }
    });
    networkListenerRef.current = unsubscribeNetwork;

    // Set up interval for periodic updates (reduced frequency to prevent warnings)
    const updateInterval = __DEV__ ? 15000 : 10000; // 15 seconds in dev, 10 seconds in production
    intervalRef.current = setInterval(() => {
      updateAllStatus();
    }, updateInterval);

    return () => {
      isMountedRef.current = false;
      if (networkListenerRef.current) {
        networkListenerRef.current();
        networkListenerRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    loadPendingCount,
    loadNetworkStatus,
    loadSyncStatus,
    loadDeviceStatus,
    loadDeviceLocation,
    updateAllStatus,
  ]);

  const getNetworkIcon = useCallback(() => {
    if (!networkStatus.isConnected) return "📡";
    if (networkStatus.isWifi) return "📶";
    if (networkStatus.isCellular) return "📱";
    return "🌐";
  }, [
    networkStatus.isConnected,
    networkStatus.isWifi,
    networkStatus.isCellular,
  ]);

  const getSyncIcon = useCallback(() => {
    switch (syncState.status) {
      case "syncing":
        return "🔄";
      case "success":
        return "✅";
      case "error":
        return "❌";
      default:
        return "💤";
    }
  }, [syncState.status]);

  const getDeviceStatusIcon = useCallback(() => {
    switch (deviceStatus) {
      case "ACTIVE":
        return "🟢";
      case "INACTIVE":
        return "🔴";
      case "MAINTENANCE":
        return "🟡";
      default:
        return "⚪";
    }
  }, [deviceStatus]);

  const getStatusColor = useCallback(() => {
    if (!networkStatus.isConnected) return "#FF6B6B";
    if (deviceStatus === "INACTIVE" || deviceStatus === "MAINTENANCE")
      return "#FFA726";
    if (pendingCount > 0) return "#FFA726";
    return "#4CAF50";
  }, [networkStatus.isConnected, deviceStatus, pendingCount]);

  return (
    <View style={[styles.container, { borderColor: getStatusColor() }]}>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{currentLocation}</Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>
            {getDeviceStatusIcon()} {deviceStatus}
          </Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.label}>Network:</Text>
          <Text style={styles.value}>
            {getNetworkIcon()} {networkStatus.type}
          </Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.label}>Sync:</Text>
          <Text style={styles.value}>
            {getSyncIcon()} {syncState.status}
          </Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.label}>Pending:</Text>
          <Text style={[styles.value, pendingCount > 0 && styles.pendingText]}>
            {pendingCount}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Use React.memo to prevent unnecessary re-renders
export const StatusBar = memo(StatusBarComponent);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderRadius: 8,
    padding: 8,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  item: {
    alignItems: "center",
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
  },
  pendingText: {
    color: "#FF6B6B",
  },
});
