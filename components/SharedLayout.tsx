import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";
import { surveyStyles } from "../styles/surveyStyles";
import { SharedLayoutProps } from "../types/survey";

export const SharedLayout: React.FC<SharedLayoutProps> = ({ children }) => {
  return (
    <View style={surveyStyles.container}>
      {/* Background Graphics */}
      <Image
        source={require("@/assets/images/Background.svg")}
        style={surveyStyles.backgroundImage}
        contentFit="cover"
      />

      <View style={surveyStyles.content}>
        {/* Logos positioned outside card */}
        <Image
          source={require("@/assets/images/Emblem_of_Nepal.svg")}
          style={surveyStyles.logoTopLeft}
          contentFit="contain"
        />
        <Image
          source={require("@/assets/images/Civil_Aviation_Authority_of_Nepal.png")}
          style={surveyStyles.logoTopRight}
          contentFit="contain"
        />

        {/* Government Department Information */}
        <View style={surveyStyles.governmentInfoContainer}>
          <Text style={surveyStyles.governmentMainText}>
            Government of Nepal
          </Text>
          <Text style={surveyStyles.governmentDeptText}>
            Ministry of Home Affair
          </Text>
          <Text style={surveyStyles.governmentCellText}>
            Department of Immigration
          </Text>
          <Text style={surveyStyles.governmentLocationText}>
            Immigration Office, Tribhuvan International Airport
          </Text>
        </View>

        {/* Card Content */}
        {children}
      </View>
    </View>
  );
};
