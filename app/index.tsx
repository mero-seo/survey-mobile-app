import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import React from "react";
import { SharedLayout, SurveyCard, ThankYouCard } from "../components";
import { StatusBar } from "../components/StatusBar";
import { useSurvey } from "../hooks/useSurvey";

export default function SurveyApp() {
  const { isSubmitted, isLoading, submitSurvey, resetSurvey } = useSurvey();

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null; // Consider adding a proper loading screen component
  }

  return (
    <SharedLayout>
      <StatusBar location="Default Location" />

      {isSubmitted ? (
        <ThankYouCard onReset={resetSurvey} />
      ) : (
        <SurveyCard onSubmit={submitSurvey} isLoading={isLoading} />
      )}
    </SharedLayout>
  );
}
