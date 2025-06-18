import { useCallback, useState } from "react";

interface UseSurveyReturn {
  isSubmitted: boolean;
  submitSurvey: (answer: string) => void;
  resetSurvey: () => void;
}

export const useSurvey = (): UseSurveyReturn => {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const submitSurvey = useCallback((answer: string) => {
    console.log("Survey submitted with answer:", answer);
    setIsSubmitted(true);
  }, []);

  const resetSurvey = useCallback(() => {
    setIsSubmitted(false);
  }, []);

  return {
    isSubmitted,
    submitSurvey,
    resetSurvey,
  };
};
