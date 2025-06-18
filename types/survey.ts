export interface RadioOption {
  value: string;
  label: string;
  labelHindi: string;
  color: string;
  description: string;
}

export interface SurveyCardProps {
  onSubmit: (answer: string) => void;
}

export interface ThankYouCardProps {
  onReset: () => void;
}

export interface SharedLayoutProps {
  children: React.ReactNode;
}
