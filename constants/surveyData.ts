import { RadioOption } from "../types/survey";

export const radioOptions: RadioOption[] = [
  {
    value: "excellent",
    label: "Excellent",
    labelHindi: "उत्कृष्ट सेवा",
    color: "#00CC66",
    description: "",
  },
  {
    value: "satisfactory",
    label: "Satisfactory",
    labelHindi: "सन्तोषजनक सेवा",
    color: "#FFD700",
    description: "",
  },
  {
    value: "average",
    label: "Average",
    labelHindi: "औसत सेवा",
    color: "#FF4444",
    description: "",
  },
];

export const SURVEY_CONFIG = {
  AUTO_RESET_DELAY: 3000,
  OPTION_SELECT_DELAY: 0,
} as const;
