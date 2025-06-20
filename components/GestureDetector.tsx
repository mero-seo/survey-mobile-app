import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";

interface GestureDetectorProps {
  children: React.ReactNode;
  onGestureDetected: () => void;
  tapCount: number;
  timeWindow: number; // milliseconds
  targetArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const GestureDetector: React.FC<GestureDetectorProps> = ({
  children,
  onGestureDetected,
  tapCount = 5,
  timeWindow = 3000, // 3 seconds
  targetArea,
}) => {
  const [taps, setTaps] = useState<number[]>([]);
  const [showIndicator, setShowIndicator] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Use an effect to run the animation when showIndicator becomes true
  useEffect(() => {
    if (showIndicator) {
      const animation = Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          delay: 500,
          useNativeDriver: true,
        }),
      ]);

      animation.start(() => {
        // Ensure state update is not directly in the animation callback
        // if it causes issues, but here it should be fine.
        setShowIndicator(false);
      });

      return () => {
        animation.stop();
      };
    }
  }, [showIndicator, fadeAnim]);

  const handleTap = (event: any) => {
    const currentTime = Date.now();

    // Check if tap is within target area (if specified)
    if (targetArea) {
      const { locationX, locationY } = event.nativeEvent;
      if (
        locationX < targetArea.x ||
        locationX > targetArea.x + targetArea.width ||
        locationY < targetArea.y ||
        locationY > targetArea.y + targetArea.height
      ) {
        return; // Tap outside target area, ignore
      }
    }

    // Trigger the animation effect
    setShowIndicator(true);

    // Add current tap time
    const newTaps = [...taps, currentTime];

    // Filter taps within time window
    const validTaps = newTaps.filter((tap) => currentTime - tap <= timeWindow);

    setTaps(validTaps);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if we have enough taps
    if (validTaps.length >= tapCount) {
      onGestureDetected();
      setTaps([]); // Reset taps
      return;
    }

    // Set timeout to clear taps if no more taps within time window
    timeoutRef.current = setTimeout(() => {
      setTaps([]);
    }, timeWindow);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={handleTap}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>

      {/* Gesture indicator */}
      {showIndicator && (
        <Animated.View style={[styles.indicator, { opacity: fadeAnim }]}>
          <Text style={styles.indicatorText}>
            {taps.length}/{tapCount}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  touchable: {
    flex: 1,
  },
  indicator: {
    position: "absolute",
    top: 100,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 1000,
  },
  indicatorText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
});
