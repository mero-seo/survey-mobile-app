import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { AdminPanel } from "../components/AdminPanel";
import { GestureDetector } from "../components/GestureDetector";
import { SetupScreen } from "../components/SetupScreen";
import { SharedLayout } from "../components/SharedLayout";
import { SurveyCard } from "../components/SurveyCard";
import { ThankYouCard } from "../components/ThankYouCard";
import { useSurvey } from "../hooks/useSurvey";

function MainSurveyScreen() {
  const { isSubmitted, isLoading, submitSurvey, resetSurvey } = useSurvey();
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const handleGestureDetected = () => {
    setShowAdminPanel(true);
  };

  if (showAdminPanel) {
    return <AdminPanel onClose={() => setShowAdminPanel(false)} />;
  }

  return (
    <GestureDetector
      onGestureDetected={handleGestureDetected}
      tapCount={5}
      timeWindow={3000}
    >
      <SharedLayout>
        {isSubmitted ? (
          <ThankYouCard onReset={resetSurvey} />
        ) : (
          <SurveyCard onSubmit={submitSurvey} isLoading={isLoading} />
        )}
      </SharedLayout>
    </GestureDetector>
  );
}

export default function HomeScreen() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // Check if setup is complete on app start
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const setupCompleted = await AsyncStorage.getItem("setup_completed");
        setIsSetupComplete(setupCompleted === "true");
      } catch (error) {
        console.error("Failed to check setup status:", error);
        setIsSetupComplete(false);
      }
    };

    checkSetupStatus();
  }, []);

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  if (!fontsLoaded || isSetupComplete === null) {
    return null; // Loading state
  }

  // Show setup screen if not completed
  if (!isSetupComplete) {
    return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }

  // If admin panel is visible, show it as a separate screen
  return <MainSurveyScreen />;
}
