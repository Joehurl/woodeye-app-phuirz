export interface OnboardingOption {
  id: string;
  emoji: string;
  label: string;
}

export interface OnboardingQuestion {
  id: string;
  title: string;
  subtitle: string;
  options: OnboardingOption[];
}

export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: "purpose",
    title: "Why do you identify wood?",
    subtitle: "Help us tailor your experience",
    options: [
      { id: "woodworking", emoji: "🪵", label: "Woodworking" },
      { id: "renovation", emoji: "🏠", label: "Home renovation" },
      { id: "nature", emoji: "🌲", label: "Nature & outdoors" },
      { id: "professional", emoji: "💼", label: "Professional use" },
      { id: "curious", emoji: "🔍", label: "Just curious" },
    ],
  },
  {
    id: "experience",
    title: "How experienced are you with wood?",
    subtitle: "We'll match the detail level to your knowledge",
    options: [
      { id: "beginner", emoji: "🌱", label: "Complete beginner" },
      { id: "some", emoji: "🪚", label: "Some experience" },
      { id: "intermediate", emoji: "🔨", label: "Intermediate" },
      { id: "expert", emoji: "⭐", label: "Expert" },
    ],
  },
];
