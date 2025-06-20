import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SurveyProvider } from "../context/SurveyContext";
import { startBackgroundSync } from "../services/backgroundSync";
import { initSurveyTable } from "../services/surveyStorage";

export default function RootLayout() {
  useEffect(() => {
    // Initialize SQLite database
    initSurveyTable();

    // Lock orientation to landscape
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    // Start background sync
    startBackgroundSync({
      onSyncStart: () => console.log("Background sync started"),
      onSyncComplete: (synced, failed) =>
        console.log(`Sync completed: ${synced} synced, ${failed} failed`),
      onSyncError: (error) => console.error("Background sync error:", error),
    });

    // Cleanup on unmount
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  return (
    <SurveyProvider>
      <StatusBar style="dark" hidden={true} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </SurveyProvider>
  );
}
