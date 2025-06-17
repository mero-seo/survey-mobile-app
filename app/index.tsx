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
    color: "#FF4444",
    description:
      "Outstanding experience that exceeded your expectations in every way",
  },
  {
    value: "average",
    label: "Average Service",
    labelHindi: "राम्रो सेवा",
    color: "#00CC88",
    description: "Good service that met your basic needs and requirements",
  },
  {
    value: "satisfactory",
    label: "Satisfactory",
    labelHindi: "औसत सेवा",
    color: "#FFCC00",
    description: "Service was acceptable but has room for improvement",
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
        source={require("@/assets/images/bg-graphics.svg")}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      <View style={styles.content}>
        {/* Form Label */}
        <View style={styles.formLabelContainer}>
          <Text style={styles.formLabel}>FORM</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Satisfaction Form</Text>
            <Text style={styles.subtitle}>
              We value your feedback – help us improve!
            </Text>
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
                          { backgroundColor: option.color },
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
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              <Text style={styles.noteBold}>Note :</Text> Please choose one of
              the three options: Excellent, Good, or Average. Your response
              helps us analyze and improve the quality of service.
            </Text>
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
  const smileyRotateAnim = new Animated.Value(0);
  const smileyScaleAnim = new Animated.Value(0.5);

  useEffect(() => {
    // Start animations
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

    // Smiley animation sequence
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(smileyScaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(smileyRotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(smileyScaleAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(smileyScaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Auto reset after 3 seconds
    const timer = setTimeout(() => {
      onReset();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const smileyRotate = smileyRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* Background Graphics */}
      <Image
        source={require("@/assets/images/bg-graphics.svg")}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      <Animated.View
        style={[
          styles.thankYouContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.formLabelContainer}>
          <Text style={styles.formLabel}>FORM</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.thankYouInner}>
            <Animated.View
              style={[
                styles.smileyContainer,
                {
                  transform: [
                    { scale: smileyScaleAnim },
                    { rotate: smileyRotate },
                  ],
                },
              ]}
            >
              <Image
                source={require("@/assets/images/Smily-graphics.svg")}
                style={styles.smileyImage}
                contentFit="contain"
              />
            </Animated.View>
            <Text style={styles.thankYouTitle}>Thank You!</Text>
            <Text style={styles.thankYouSubtitle}>
              Your feedback has been submitted successfully.
            </Text>
            <Text style={styles.thankYouDescription}>
              We appreciate your time and valuable input to help us improve our
              services.
            </Text>
          </View>
        </View>
      </Animated.View>
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
    width: width,
    height: height,
    resizeMode: "cover",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  formLabelContainer: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 30,
  },
  formLabel: {
    color: "white",
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 40,
    width: "90%",
    maxWidth: 480,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingVertical: 8,
  },
  radioContainer: {
    marginRight: 16,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  hindiText: {
    fontFamily: "Outfit_400Regular",
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: "#666666",
    lineHeight: 20,
  },
  noteContainer: {
    backgroundColor: "#E8F4FD",
    padding: 20,
    borderRadius: 12,
  },
  noteText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: "#4A4A4A",
    lineHeight: 20,
  },
  noteBold: {
    fontFamily: "Outfit_600SemiBold",
  },
  thankYouContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  thankYouInner: {
    alignItems: "center",
    paddingVertical: 20,
  },
  smileyContainer: {
    marginBottom: 30,
  },
  smileyImage: {
    width: 80,
    height: 80,
  },
  thankYouTitle: {
    fontSize: 32,
    fontFamily: "Outfit_700Bold",
    color: "#1A1A1A",
    marginBottom: 16,
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
});
