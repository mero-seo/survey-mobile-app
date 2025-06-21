import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { radioOptions } from "../constants/surveyData";
import { surveyStyles } from "../styles/surveyStyles";
import { SurveyCardProps } from "../types/survey";

export const SurveyCard: React.FC<SurveyCardProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");

  const handleOptionSelect = async (value: string) => {
    if (isLoading) return; // Prevent multiple submissions

    setSelectedAnswer(value);

    // Immediately submit the survey upon selection.
    await onSubmit(value);
  };

  return (
    <View style={surveyStyles.card}>
      {/* Header */}
      <View style={surveyStyles.header}>
        <View style={surveyStyles.titleRow}>
          <Text style={surveyStyles.title}>Survey Form</Text>
          <Text style={surveyStyles.title}>/</Text>
          <Text style={surveyStyles.titleNepali}>सर्वेक्षण फारम</Text>
        </View>
        <Text style={surveyStyles.subtitle}>
          We value your feedback – help us improve!
        </Text>
        <TouchableOpacity style={surveyStyles.nepaliSubtitleButton}>
          <Text style={surveyStyles.nepaliSubtitleText}>
            हामी तपाईंको प्रतिक्रियाको कदर गर्छौं —हामीलाई सहयोग गर्नुहोस्!
          </Text>
        </TouchableOpacity>
      </View>

      {/* Options */}
      <View style={surveyStyles.optionsContainer}>
        {radioOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              surveyStyles.optionRow,
              selectedAnswer === option.value && {
                borderColor: option.color,
                borderWidth: 4,
                backgroundColor: `${option.color}08`,
              },
              isLoading && { opacity: 0.6 }, // Dim when loading
            ]}
            onPress={() => handleOptionSelect(option.value)}
            activeOpacity={0.8}
            disabled={isLoading} // Disable when loading
          >
            <View style={surveyStyles.circleContainer}>
              <View
                style={[
                  surveyStyles.coloredCircle,
                  { backgroundColor: option.color },
                ]}
              />
            </View>
            <View style={surveyStyles.optionContent}>
              <Text style={surveyStyles.optionLabel}>{option.label}</Text>
              <Text style={surveyStyles.hindiText}>{option.labelHindi}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
