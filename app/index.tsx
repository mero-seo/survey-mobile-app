import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface RadioOption {
  value: string;
  label: string;
  labelHindi: string;
  color: string;
  description: string;
}

const radioOptions: RadioOption[] = [
  {
    value: "excellent",
    label: "Excellent Service",
    labelHindi: "उत्कृष्ट सेवा",
    color: "#00CC66",
    description: "",
  },
  {
    value: "satisfactory",
    label: "Satisfactory Service",
    labelHindi: "सन्तोषजनक सेवा",
    color: "#FFD700",
    description: "",
  },
  {
    value: "average",
    label: "Average Service",
    labelHindi: "औसत सेवा",
    color: "#FF4444",
    description: "",
  },
];

const SurveyForm: React.FC<{
  onSubmit: (answer: string) => void;
}> = ({ onSubmit }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");

  const handleOptionSelect = (value: string) => {
    setSelectedAnswer(value);
    // Navigate immediately when option is selected
    setTimeout(() => {
      onSubmit(value);
    }, 300); // Small delay for visual feedback
  };

  return (
    <View style={styles.container}>
      {/* Background Graphics */}
      <Image
        source={require("@/assets/images/Background.svg")}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      <View style={styles.content}>
        {/* Logos positioned outside card */}
        <Image
          source={require("@/assets/images/Emblem_of_Nepal.svg")}
          style={styles.logoTopLeft}
          contentFit="contain"
        />
        <Image
          source={require("@/assets/images/Civil_Aviation_Authority_of_Nepal.png")}
          style={styles.logoTopRight}
          contentFit="contain"
        />

        {/* Government Department Information */}
        <View style={styles.governmentInfoContainer}>
          <Text style={styles.governmentMainText}>Government of Nepal</Text>
          <Text style={styles.governmentDeptText}>
            Ministry of Culture, Tourism, and Civil Aviation
          </Text>
          <Text style={styles.governmentCellText}>
            Aerodrome Safety and Standard Department
          </Text>
          <Text style={styles.governmentLocationText}>
            Babar Mahal, Kathmandu
          </Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              <Text style={styles.customBold}>Survey Form</Text>
            </Text>
            <Text style={styles.titleNepali}>सर्वेक्षण फारम</Text>
            <Text style={styles.subtitle}>
              We value your feedback – help us improve!
            </Text>
            <TouchableOpacity style={styles.nepaliSubtitleButton}>
              <Text style={styles.nepaliSubtitleText}>
                हामी तपाईंको प्रतिक्रियाको कदर गर्छौं —हामीलाई सहयोग गर्नुहोस्!
              </Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {radioOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={styles.optionRow}
                onPress={() => handleOptionSelect(option.value)}
                activeOpacity={0.8}
              >
                <View style={styles.radioContainer}>
                  <View
                    style={[styles.radioOuter, { borderColor: option.color }]}
                  >
                    {selectedAnswer === option.value && (
                      <View
                        style={[
                          styles.radioInner,
                          {
                            backgroundColor: "transparent",
                            borderColor: option.color,
                            borderWidth: 4,
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>
                    {option.label}/{" "}
                    <Text style={styles.hindiText}>{option.labelHindi}</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const ThankYouScreen: React.FC<{
  onReset: () => void;
}> = ({ onReset }) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Card fade/scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto reset after 3 seconds
    const timer = setTimeout(() => {
      onReset();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Background Graphics */}
      <Image
        source={require("@/assets/images/Background.svg")}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      <View style={styles.content}>
        {/* Logos positioned outside card */}
        <Image
          source={require("@/assets/images/Emblem_of_Nepal.svg")}
          style={styles.logoTopLeft}
          contentFit="contain"
        />
        <Image
          source={require("@/assets/images/Civil_Aviation_Authority_of_Nepal.png")}
          style={styles.logoTopRight}
          contentFit="contain"
        />

        {/* Government Department Information */}
        <View style={styles.governmentInfoContainer}>
          <Text style={styles.governmentMainText}>Government of Nepal</Text>
          <Text style={styles.governmentDeptText}>
            Ministry of Culture, Tourism, and Civil Aviation
          </Text>
          <Text style={styles.governmentCellText}>
            Aerodrome Safety and Standard Department
          </Text>
          <Text style={styles.governmentLocationText}>
            Babar Mahal, Kathmandu
          </Text>
        </View>

        {/* Centered Thank You Card Container */}
        <View style={styles.thankYouCardContainer}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.thankYouInner}>
              <View style={styles.smileyTextRow}>
                <Image
                  source={require("@/assets/images/Smily-graphics.svg")}
                  style={styles.smileyImage}
                  contentFit="contain"
                />
                <Text style={styles.thankYouTitle}>Thank You!</Text>
              </View>
              <Text style={styles.thankYouSubtitle}>
                Your feedback has been submitted successfully.
              </Text>
              <Text style={styles.thankYouDescription}>
                We appreciate your time and valuable input to help us improve
                our services.
              </Text>
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

export default function SurveyApp() {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const handleSubmit = (answer: string) => {
    console.log("Survey submitted with answer:", answer);
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
  };

  if (!fontsLoaded) {
    return null; // or a loading screen
  }

  return isSubmitted ? (
    <ThankYouScreen onReset={handleReset} />
  ) : (
    <SurveyForm onSubmit={handleSubmit} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  backgroundImage: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -300,
    width: width,
    height: height,
    resizeMode: "cover",
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 28,
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 50,
    paddingRight: 50,
    width: "98%",
    maxWidth: 700,
    borderWidth: 1,
    borderColor: "#efefef",
  },
  header: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 38,
    color: "#1A1A1A",
    marginBottom: 2,
    textAlign: "center",
  },
  customBold: {
    fontWeight: "500", // You can adjust this value for custom boldness
    letterSpacing: 0.2,
  },
  titleNepali: {
    fontSize: 24,
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#888",
    marginBottom: 2,
    textAlign: "center",
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
    borderRadius: 18,
    borderWidth: 4,
    borderColor: "#efefef",
  },
  radioContainer: {
    marginRight: 14,
    marginTop: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 22,
    fontFamily: "Outfit_400Regular",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  hindiText: {
    fontFamily: "Outfit_400Regular",
  },
  thankYouContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  thankYouCardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  thankYouInner: {
    alignItems: "center",
    paddingVertical: 20,
  },
  smileyTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  smileyImage: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  thankYouTitle: {
    fontSize: 32,
    fontFamily: "Outfit_700Bold",
    color: "#1A1A1A",
    textAlign: "center",
  },
  thankYouSubtitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: "#4CAF50",
    marginBottom: 20,
    textAlign: "center",
  },
  thankYouDescription: {
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  governmentInfoContainer: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 30,
    width: "100%",
  },
  governmentMainText: {
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
    color: "#C00",
    marginBottom: 2,
  },
  governmentDeptText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: "#C00",
    marginBottom: 1,
    textAlign: "center",
  },
  governmentCellText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: "#C00",
    marginBottom: 1,
    textAlign: "center",
  },
  governmentLocationText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: "#C00",
    textAlign: "center",
  },
  logoTopLeft: {
    position: "absolute",
    top: 14,
    left: 36,
    width: 80,
    height: 80,
  },
  logoTopRight: {
    position: "absolute",
    top: 14,
    right: 36,
    width: 80,
    height: 80,
  },
  nepaliSubtitleButton: {
    padding: 10,
    borderRadius: 5,
  },
  nepaliSubtitleText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 10,
    textAlign: "center",
  },
});
