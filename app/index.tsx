import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SharedLayout, SurveyCard, ThankYouCard } from "../components";
import { AdminSetup } from "../components/AdminSetup";
import { Colors } from "../constants/Colors";
import { useSurvey } from "../context/SurveyContext";
import { useTripleTap } from "../hooks/useTripleTap";
import { triggerManualSync } from "../services/backgroundSync";
import { getDeviceConfig } from "../services/configStorage";
import { getPendingSurveys, insertSurvey } from "../services/surveyStorage";

export default function SurveyApp() {
  const { state, dispatch } = useSurvey();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAdminSetup, setShowAdminSetup] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // Triple-tap gesture for admin setup
  const { handleTap } = useTripleTap({
    onTripleTap: () => {
      console.log("Triple tap detected - opening admin setup");
      setShowAdminSetup(true);
    },
  });

  // Initialize device config on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load device config
        const config = await getDeviceConfig();
        if (config) {
          dispatch({ type: "SET_DEVICE_CONFIG", payload: config });
        }

        // Load pending surveys count
        const pendingSurveys = await getPendingSurveys();
        dispatch({ type: "SET_PENDING_COUNT", payload: pendingSurveys.length });
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    initializeApp();
  }, [dispatch]);

  const handleSubmitSurvey = async (answer: string) => {
    if (!state.deviceConfig) {
      Alert.alert(
        "Device Not Configured",
        "Please configure the device first. Triple-tap anywhere to open admin setup.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const surveyId = `survey_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const survey = {
        id: surveyId,
        deviceId: state.deviceConfig.deviceId,
        location: state.deviceConfig.location,
        answer,
        timestamp: new Date().toISOString(),
        syncStatus: "pending" as const,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      // Save to storage
      await insertSurvey(survey);

      // Update context
      dispatch({ type: "ADD_SURVEY", payload: survey });

      setIsSubmitted(true);

      // Trigger immediate sync if online
      if (state.isOnline) {
        setTimeout(() => {
          triggerManualSync();
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to submit survey:", error);
      Alert.alert("Error", "Failed to submit survey. Please try again.");
    }
  };

  const handleResetSurvey = () => {
    setIsSubmitted(false);
  };

  const handleManualSync = async () => {
    try {
      dispatch({ type: "SET_SYNC_STATUS", payload: "syncing" });
      await triggerManualSync();
      dispatch({ type: "SET_SYNC_STATUS", payload: "idle" });
    } catch (error) {
      dispatch({ type: "SET_SYNC_STATUS", payload: "error" });
      console.error("Manual sync failed:", error);
    }
  };

  if (!fontsLoaded) {
    return null; // Consider adding a proper loading screen component
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleTap} activeOpacity={1}>
        <SharedLayout>
          {/* Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Location:</Text>
              <Text style={styles.statusValue}>
                {state.deviceConfig?.location || "Not configured"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text
                style={[
                  styles.statusValue,
                  styles[`status_${state.syncStatus}`],
                ]}
              >
                {state.syncStatus.toUpperCase()}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Pending:</Text>
              <Text style={styles.statusValue}>{state.pendingCount}</Text>
            </View>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleManualSync}
              disabled={state.syncStatus === "syncing"}
            >
              <Text style={styles.syncButtonText}>
                {state.syncStatus === "syncing" ? "Syncing..." : "Sync"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          {isSubmitted ? (
            <ThankYouCard onReset={handleResetSurvey} />
          ) : (
            <SurveyCard onSubmit={handleSubmitSurvey} />
          )}

          {/* Admin Setup Modal */}
          <AdminSetup
            isVisible={showAdminSetup}
            onClose={() => setShowAdminSetup(false)}
          />
        </SharedLayout>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: "600",
  },
  status_idle: {
    color: Colors.light.icon,
  },
  status_syncing: {
    color: Colors.light.tint,
  },
  status_error: {
    color: "#FF6B6B",
  },
  syncButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: "600",
  },
});
