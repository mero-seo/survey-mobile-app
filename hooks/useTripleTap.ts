import { useCallback, useRef, useState } from "react";

interface UseTripleTapOptions {
  delay?: number; // Time window for taps in milliseconds
  onTripleTap?: () => void;
}

export const useTripleTap = (options: UseTripleTapOptions = {}) => {
  const { delay = 1000, onTripleTap } = options;
  const [tapCount, setTapCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(() => {
    setTapCount((prev) => {
      const newCount = prev + 1;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // If we've reached 3 taps, trigger the action
      if (newCount >= 3) {
        onTripleTap?.();
        return 0; // Reset count
      }

      // Set timeout to reset count if no more taps within delay
      timeoutRef.current = setTimeout(() => {
        setTapCount(0);
      }, delay);

      return newCount;
    });
  }, [delay, onTripleTap]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    tapCount,
    handleTap,
    cleanup,
  };
};
