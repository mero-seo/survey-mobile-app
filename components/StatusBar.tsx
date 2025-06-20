import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getBackgroundSync } from "../services/backgroundSync";
import {
  addNetworkListener,
  getNetworkService,
  NetworkStatus,
} from "../services/networkService";
import { getPendingSurveys } from "../services/surveyStorage";

interface StatusBarProps {
  location?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
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
  const [syncStatus, setSyncStatus] = useState<string>("idle");

  useEffect(() => {
    // Load initial data
    loadPendingCount();
    loadNetworkStatus();
    loadSyncStatus();

    // Set up listeners
    const unsubscribeNetwork = addNetworkListener((status) => {
      setNetworkStatus(status);
    });

    // Set up interval for periodic updates
    const interval = setInterval(() => {
      loadPendingCount();
      loadSyncStatus();
    }, 5000); // Update every 5 seconds

    return () => {
      unsubscribeNetwork();
      clearInterval(interval);
    };
  }, []);

  const loadPendingCount = async () => {
    try {
      const pending = await getPendingSurveys();
      setPendingCount(pending.length);
    } catch (error) {
      console.error("Error loading pending count:", error);
    }
  };

  const loadNetworkStatus = async () => {
    try {
      const networkService = getNetworkService();
      const status = await networkService.checkConnectivity();
      setNetworkStatus(status);
    } catch (error) {
      console.error("Error loading network status:", error);
    }
  };

  const loadSyncStatus = () => {
    try {
      const backgroundSync = getBackgroundSync();
      if (backgroundSync) {
        const status = backgroundSync.getStatus();
        setSyncStatus(status.isActive ? "active" : "idle");
      }
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  };

  const getNetworkIcon = () => {
    if (!networkStatus.isConnected) return "📡";
    if (networkStatus.isWifi) return "📶";
    if (networkStatus.isCellular) return "📱";
    return "🌐";
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case "active":
        return "🔄";
      case "syncing":
        return "⏳";
      default:
        return "💤";
    }
  };

  const getStatusColor = () => {
    if (!networkStatus.isConnected) return "#FF6B6B";
    if (pendingCount > 0) return "#FFA726";
    return "#4CAF50";
  };

  return (
    <View style={[styles.container, { borderColor: getStatusColor() }]}>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{location}</Text>
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
            {getSyncIcon()} {syncStatus}
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
