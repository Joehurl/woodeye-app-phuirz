import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BodyScrollView } from '@/components/BodyScrollView';

const LAST_UPDATED = 'July 14, 2025';

const COLORS = {
  primary: '#8B6914',
  primaryLight: '#C49A2A',
  background: '#1a1008',
  backgroundGradientTop: '#2d1a0e',
  surface: '#2A1A0A',
  surfaceLight: '#F5EDE4',
  border: 'rgba(196,154,42,0.18)',
  borderLight: 'rgba(139,105,20,0.14)',
  text: '#F5E6D0',
  textLight: '#2C1810',
  textSecondary: '#C4A882',
  textSecondaryLight: '#7A5C3A',
  accent: '#D4A853',
  accentBg: 'rgba(212,168,83,0.12)',
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
  isDark: boolean;
}

function Section({ title, children, isDark }: SectionProps) {
  const textColor = isDark ? COLORS.text : COLORS.textLight;
  const borderColor = isDark ? COLORS.border : COLORS.borderLight;
  const surfaceColor = isDark ? COLORS.surface : '#FFFFFF';

  return (
    <View style={[styles.section, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccentBar, { backgroundColor: COLORS.primary }]} />
        <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

interface BulletProps {
  text: string;
  isDark: boolean;
  bold?: string;
}

function Bullet({ text, isDark, bold }: BulletProps) {
  const textColor = isDark ? COLORS.textSecondary : COLORS.textSecondaryLight;
  const boldColor = isDark ? COLORS.text : COLORS.textLight;

  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: COLORS.primaryLight }]} />
      <View style={styles.bulletTextWrap}>
        {bold ? (
          <Text style={[styles.bodyText, { color: textColor }]}>
            <Text style={[styles.boldText, { color: boldColor }]}>{bold}</Text>
            {text}
          </Text>
        ) : (
          <Text style={[styles.bodyText, { color: textColor }]}>{text}</Text>
        )}
      </View>
    </View>
  );
}

interface BodyTextProps {
  text: string;
  isDark: boolean;
}

function BodyParagraph({ text, isDark }: BodyTextProps) {
  const textColor = isDark ? COLORS.textSecondary : COLORS.textSecondaryLight;
  return <Text style={[styles.bodyText, styles.paragraph, { color: textColor }]}>{text}</Text>;
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleBack = () => {
    console.log('[PrivacyPolicy] Back button pressed');
    router.back();
  };

  const headerTextColor = COLORS.text;
  const subtitleColor = COLORS.textSecondary;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.backgroundGradientTop, COLORS.background]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={COLORS.accent} strokeWidth={2} />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerIconWrap}>
            <Shield size={22} color={COLORS.accent} strokeWidth={1.8} />
          </View>
          <Text style={[styles.headerTitle, { color: headerTextColor }]}>Privacy Policy</Text>
        </View>

        <View style={styles.headerSpacer} />
      </LinearGradient>

      <BodyScrollView
        style={{ flex: 1, backgroundColor: isDark ? COLORS.background : '#FFF8F0' }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Intro card */}
        <View style={[styles.introCard, { backgroundColor: isDark ? COLORS.accentBg : 'rgba(139,105,20,0.07)', borderColor: isDark ? COLORS.border : COLORS.borderLight }]}>
          <Text style={[styles.introTitle, { color: isDark ? COLORS.accent : COLORS.primary }]}>
            WoodEye — Wood Species Identifier
          </Text>
          <Text style={[styles.introBody, { color: isDark ? COLORS.textSecondary : COLORS.textSecondaryLight }]}>
            We take your privacy seriously. This policy explains exactly what data WoodEye collects, why, and how it is used. No account is required to use the app.
          </Text>
          <Text style={[styles.lastUpdated, { color: isDark ? COLORS.textSecondary : COLORS.textSecondaryLight }]}>
            Last updated: {LAST_UPDATED}
          </Text>
        </View>

        {/* 1. What WoodEye Does */}
        <Section title="1. What WoodEye Does" isDark={isDark}>
          <BodyParagraph
            isDark={isDark}
            text="WoodEye is a wood species identification app that uses AI-powered photo analysis to identify wood grain, species characteristics, and provide detailed information about hardness, workability, sustainability, and more. The app also includes an AR visualizer, a community feed, a species library, and a board-foot calculator."
          />
        </Section>

        {/* 2. Data We Collect */}
        <Section title="2. Data We Collect" isDark={isDark}>
          <BodyParagraph isDark={isDark} text="WoodEye collects only what is necessary to deliver its features:" />

          <Bullet isDark={isDark} bold="Camera Access — " text="Used when you scan wood for AI identification and when using the AR visualizer. Photos are captured in-app and sent to our AI service for analysis. We do not store your photos on our servers." />
          <Bullet isDark={isDark} bold="Photo Library — " text="AR captures may be saved to your device's photo library with your permission. Scan photos you submit are uploaded for AI analysis only and are not retained by us after processing." />
          <Bullet isDark={isDark} bold="Push Notification Token — " text="If you enable notifications, your device push token is stored in our Supabase database solely to deliver daily wood facts and app updates. You can disable notifications at any time in your device Settings." />
          <Bullet isDark={isDark} bold="Location Data (optional) — " text="If you choose to attach your location to a community feed post, that location is stored in Supabase alongside the post. Location access is never requested automatically — only when you explicitly opt in while posting." />
          <Bullet isDark={isDark} bold="Scan History — " text="Your scan history is stored locally on your device using AsyncStorage. It never leaves your device unless you explicitly share a result. You can clear it at any time from within the app." />
          <Bullet isDark={isDark} bold="Community Posts — " text="When you post to the community feed, the species name, photo, optional location, and likes count are stored in Supabase. You can delete your posts at any time." />
          <Bullet isDark={isDark} bold="Device ID — " text="A randomly generated device identifier is stored locally and used for push token registration and to associate your saved favorites. It is not linked to your name, email, or any personal identity." />
          <Bullet isDark={isDark} bold="Subscription Status — " text="If you subscribe to WoodEye Pro ($1.99/month), your subscription status is managed by RevenueCat. We receive only an anonymized subscriber ID — no payment card details are ever accessible to us." />
        </Section>

        {/* 3. Data We Do NOT Collect */}
        <Section title="3. Data We Do NOT Collect" isDark={isDark}>
          <Bullet isDark={isDark} text="No account, email address, or password is required." />
          <Bullet isDark={isDark} text="We do not collect your name, phone number, or any government-issued ID." />
          <Bullet isDark={isDark} text="CITES endangered species alerts are evaluated entirely on-device — no species data is sent to any server for this feature." />
          <Bullet isDark={isDark} text="We do not sell, rent, or trade your data to third parties for advertising." />
          <Bullet isDark={isDark} text="We do not use tracking pixels, ad SDKs, or behavioral profiling." />
        </Section>

        {/* 4. Third-Party Services */}
        <Section title="4. Third-Party Services" isDark={isDark}>
          <BodyParagraph isDark={isDark} text="WoodEye uses the following third-party services to operate:" />

          <Bullet isDark={isDark} bold="Supabase — " text="Our database and edge function provider. Community posts, push tokens, and optional location data are stored here. Supabase is SOC 2 Type II certified. See supabase.com/privacy." />
          <Bullet isDark={isDark} bold="RevenueCat — " text="Manages in-app subscription purchases. RevenueCat receives an anonymized subscriber ID and your subscription state. No payment details are shared with us. See revenuecat.com/privacy." />
          <Bullet isDark={isDark} bold="OpenRouter / Google Gemini — " text="Your scan photos are sent to OpenRouter (which routes to Google Gemini) for AI-powered wood identification. Photos are used only for the analysis request and are not stored by us or retained by the AI provider beyond the request lifecycle." />
          <Bullet isDark={isDark} bold="Expo / Apple / Google — " text="Push notification delivery is handled by Expo's notification infrastructure, which in turn uses Apple Push Notification Service (APNs) on iOS and Firebase Cloud Messaging (FCM) on Android. These services receive your device push token to route notifications." />
        </Section>

        {/* 5. How We Use Your Data */}
        <Section title="5. How We Use Your Data" isDark={isDark}>
          <Bullet isDark={isDark} text="To identify wood species from photos you submit." />
          <Bullet isDark={isDark} text="To display your scan history locally on your device." />
          <Bullet isDark={isDark} text="To deliver daily wood facts and app notifications (if enabled)." />
          <Bullet isDark={isDark} text="To show community posts and allow other users to like them." />
          <Bullet isDark={isDark} text="To manage your Pro subscription and unlock premium features." />
          <Bullet isDark={isDark} text="To associate your saved favorites with your device." />
        </Section>

        {/* 6. Data Retention */}
        <Section title="6. Data Retention" isDark={isDark}>
          <Bullet isDark={isDark} bold="Scan history — " text="Stored only on your device. Cleared when you uninstall the app or clear app data." />
          <Bullet isDark={isDark} bold="Community posts — " text="Retained in Supabase until you delete them. You can delete any post you created at any time from the community feed." />
          <Bullet isDark={isDark} bold="Push tokens — " text="Retained until you disable notifications or uninstall the app. You can also contact us to request removal." />
          <Bullet isDark={isDark} bold="Scan photos — " text="Not retained by us after AI analysis is complete." />
        </Section>

        {/* 7. Your Rights & Controls */}
        <Section title="7. Your Rights & Controls" isDark={isDark}>
          <BodyParagraph isDark={isDark} text="You have full control over your data:" />
          <Bullet isDark={isDark} text="Delete any community post you created at any time from the feed." />
          <Bullet isDark={isDark} text="Disable push notifications at any time in your device Settings app." />
          <Bullet isDark={isDark} text="Clear your local scan history from within the app." />
          <Bullet isDark={isDark} text="Revoke camera or photo library permissions at any time in Settings." />
          <Bullet isDark={isDark} text="Cancel your Pro subscription at any time through the App Store." />
          <Bullet isDark={isDark} text="No account deletion is needed — the app works anonymously and no personal account exists." />
        </Section>

        {/* 8. Children's Privacy */}
        <Section title="8. Children's Privacy" isDark={isDark}>
          <BodyParagraph
            isDark={isDark}
            text="WoodEye is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has submitted data through the app, please contact us and we will remove it promptly."
          />
        </Section>

        {/* 9. Security */}
        <Section title="9. Security" isDark={isDark}>
          <BodyParagraph
            isDark={isDark}
            text="Data stored in Supabase is encrypted at rest and in transit using TLS. We use row-level security policies to ensure users can only access their own data. Subscription data is handled entirely by RevenueCat's PCI-compliant infrastructure."
          />
        </Section>

        {/* 10. Changes to This Policy */}
        <Section title="10. Changes to This Policy" isDark={isDark}>
          <BodyParagraph
            isDark={isDark}
            text="We may update this Privacy Policy from time to time. When we do, we will update the 'Last updated' date at the top of this screen. Continued use of WoodEye after changes constitutes acceptance of the updated policy."
          />
        </Section>

        {/* 11. Contact */}
        <Section title="11. Contact Us" isDark={isDark}>
          <BodyParagraph
            isDark={isDark}
            text="If you have questions about this Privacy Policy or want to request deletion of your data, please contact us through the App Store listing or via the support link in the app settings."
          />
        </Section>
      </BodyScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1008',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212,168,83,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212,168,83,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  introCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 4,
    gap: 8,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  introBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 10,
  },
  sectionAccentBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    flex: 1,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  paragraph: {
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletTextWrap: {
    flex: 1,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
  },
  boldText: {
    fontWeight: '600',
  },
});
