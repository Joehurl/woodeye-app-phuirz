import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Leaf, Camera, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { completeOnboarding } from '@/utils/onboardingStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#8B4513',
  accent: '#D2691E',
  background: '#FFF8F0',
  backgroundDark: '#1A0F0A',
  surface: '#FFFFFF',
  surfaceDark: '#2A1810',
  text: '#2C1810',
  textDark: '#F5E6D8',
  textSecondary: '#8B6355',
  textSecondaryDark: '#C4957A',
};

interface Step {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  chips?: string[];
  gradientColors: [string, string];
}

const STEPS: Step[] = [
  {
    icon: <Leaf size={48} color="#FFFFFF" strokeWidth={1.5} />,
    iconBg: 'rgba(255,255,255,0.25)',
    title: 'Welcome to WoodEye',
    subtitle: 'Identify any wood species instantly with AI. Point, shoot, and discover.',
    gradientColors: ['#8B4513', '#D2691E'],
  },
  {
    icon: <Camera size={48} color="#FFFFFF" strokeWidth={1.5} />,
    iconBg: 'rgba(255,255,255,0.25)',
    title: 'Get the perfect scan',
    subtitle: 'Hold your phone 6–12 inches from the wood surface. Focus on the grain pattern for best results.',
    chips: ['Good lighting', 'Show the grain', 'Steady hand'],
    gradientColors: ['#A0522D', '#CD853F'],
  },
  {
    icon: <Leaf size={48} color="#FFFFFF" strokeWidth={1.5} />,
    iconBg: 'rgba(255,255,255,0.25)',
    title: 'Discover every species',
    subtitle: 'From common Oak and Maple to exotic Purpleheart and Wenge — WoodEye identifies 1000+ species worldwide.',
    chips: ['Species name', 'Wood properties', 'Project ideas'],
    gradientColors: ['#6B3410', '#B8621A'],
  },
  {
    icon: <Zap size={48} color="#FFFFFF" strokeWidth={1.5} />,
    iconBg: 'rgba(255,255,255,0.25)',
    title: "You're all set!",
    subtitle: 'Start with 4 free scans. Upgrade anytime for unlimited identification.',
    gradientColors: ['#D2691E', '#E8892E'],
  },
];

const TOTAL_STEPS = STEPS.length;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [currentStep, setCurrentStep] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === TOTAL_STEPS - 1;

  const animateToStep = useCallback((nextStep: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const direction = nextStep > currentStep ? -1 : 1;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(nextStep);
      translateX.setValue(direction * 40);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  }, [currentStep, fadeAnim, translateX]);

  const handleNext = useCallback(async () => {
    console.log(`[Onboarding] Next pressed on step ${currentStep}/${TOTAL_STEPS - 1}`);
    if (isLastStep) {
      console.log('[Onboarding] Last step — completing onboarding and navigating to paywall');
      await completeOnboarding();
      router.replace('/paywall');
    } else {
      animateToStep(currentStep + 1);
    }
  }, [currentStep, isLastStep, animateToStep]);

  const handleSkip = useCallback(async () => {
    console.log('[Onboarding] Skip pressed on step', currentStep);
    await completeOnboarding();
    router.replace('/paywall');
  }, [currentStep]);

  const buttonLabel = isLastStep ? 'Start Scanning' : 'Next';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Skip button */}
      {!isLastStep && (
        <Pressable
          style={[styles.skipButton, { top: insets.top + 12 }]}
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={[styles.skipText, { color: textSecondary }]}>Skip</Text>
        </Pressable>
      )}

      {/* Animated content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateX }] },
        ]}
      >
        {/* Gradient hero area */}
        <LinearGradient
          colors={step.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroGradient, { paddingTop: insets.top + 60 }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: step.iconBg }]}>
            {step.icon}
          </View>
        </LinearGradient>

        {/* Text content */}
        <View style={styles.textSection}>
          <Text style={[styles.title, { color: textColor }]}>{step.title}</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>{step.subtitle}</Text>

          {step.chips && step.chips.length > 0 && (
            <View style={styles.chipsRow}>
              {step.chips.map((chip) => (
                <View
                  key={chip}
                  style={[styles.chip, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}
                >
                  <Text style={[styles.chipText, { color: COLORS.primary }]}>{chip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Bottom area: dots + button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentStep ? COLORS.primary : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(139,69,19,0.2)'),
                  width: i === currentStep ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Next / Start Scanning button */}
        <Pressable
          style={styles.nextButton}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <LinearGradient
            colors={['#D2691E', '#8B4513']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            <Text style={styles.nextText}>{buttonLabel}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  heroGradient: {
    alignItems: 'center',
    paddingBottom: 48,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  textSection: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
    gap: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  nextGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
