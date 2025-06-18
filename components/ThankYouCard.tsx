import { Image } from "expo-image";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { SURVEY_CONFIG } from "../constants/surveyData";
import { surveyStyles } from "../styles/surveyStyles";
import { ThankYouCardProps } from "../types/survey";

export const ThankYouCard: React.FC<ThankYouCardProps> = ({ onReset }) => {
  useEffect(() => {
    // Auto reset after configured delay
    const timer = setTimeout(() => {
      onReset();
    }, SURVEY_CONFIG.AUTO_RESET_DELAY);

    return () => clearTimeout(timer);
  }, [onReset]);

  return (
    <View style={surveyStyles.thankYouCardContainer}>
      <View style={surveyStyles.card}>
        <View style={surveyStyles.thankYouInner}>
          <View style={surveyStyles.smileyTextRow}>
            <Image
              source={require("../assets/images/Smily-graphics.svg")}
              style={surveyStyles.smileyImage}
              contentFit="contain"
            />
            <View style={surveyStyles.thankYouTitleContainer}>
              <Text style={surveyStyles.thankYouTitle}>Thank You!</Text>
              <Text style={surveyStyles.thankYouTitleNepali}>धन्यवाद!</Text>
            </View>
          </View>
          <Text style={surveyStyles.thankYouSubtitle}>
            Your feedback has been submitted successfully.
          </Text>
          <Text style={surveyStyles.thankYouSubtitleNepali}>
            तपाईंको प्रतिक्रिया सफलतापूर्वक पेश गरिएको छ।
          </Text>
          <Text style={surveyStyles.thankYouDescription}>
            We appreciate your time and valuable input to help us improve our
            services.
          </Text>
          <Text style={surveyStyles.thankYouDescriptionNepali}>
            हामी तपाईंको समय र मूल्यवान सुझावको कदर गर्छौं जसले हाम्रो सेवा
            सुधार गर्न मद्दत गर्छ।
          </Text>
        </View>
      </View>
    </View>
  );
};
