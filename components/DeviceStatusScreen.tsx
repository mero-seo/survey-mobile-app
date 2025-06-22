import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Colors } from "../constants/Colors";
import {
  DeviceStatus,
  loadDeviceStatus,
} from "../services/deviceConfigService";

interface DeviceStatusScreenProps {
  onRetry: () => void;
}

export const DeviceStatusScreen: React.FC<DeviceStatusScreenProps> = ({
  onRetry,
}) => {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const deviceStatus = await loadDeviceStatus();
      setStatus(deviceStatus);
    } catch (error) {
      console.error("Failed to load device status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Checking device status...</Text>
      </View>
    );
  }

  const getStatusInfo = () => {
    switch (status?.status) {
      case "INACTIVE":
        return {
          title: "Device Inactive",
          message:
            "This device has been deactivated by the administrator. Please contact support for assistance.",
          icon: "⏸️",
          color: Colors.error,
        };
      case "MAINTENANCE":
        return {
          title: "Device Under Maintenance",
          message:
            "This device is currently undergoing maintenance. Please try again later.",
          icon: "🔧",
          color: Colors.warning,
        };
      default:
        return {
          title: "Device Status Unknown",
          message:
            "Unable to determine device status. Please check your connection and try again.",
          icon: "❓",
          color: Colors.textSecondary,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{statusInfo.icon}</Text>
        <Text style={[styles.title, { color: statusInfo.color }]}>
          {statusInfo.title}
        </Text>
        <Text style={styles.message}>{statusInfo.message}</Text>

        {status && (
          <View style={styles.statusDetails}>
            <Text style={styles.detailText}>Device ID: {status.deviceId}</Text>
            <Text style={styles.detailText}>Location: {status.location}</Text>
            <Text style={styles.detailText}>
              Last Seen:{" "}
              {status.lastSeen
                ? new Date(status.lastSeen).toLocaleString()
                : "Never"}
            </Text>
            <Text style={styles.detailText}>
              Surveys Today: {status.surveysToday}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  statusDetails: {
    backgroundColor: Colors.lightGray,
    padding: 16,
    borderRadius: 8,
    width: "100%",
    marginBottom: 32,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
