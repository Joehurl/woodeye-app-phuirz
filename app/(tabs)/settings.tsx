import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  Settings,
  Crown,
  Shield,
  ChevronRight,
  Leaf,
  Star,
  RefreshCw,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '@/contexts/SubscriptionContext';

const PRIVACY_POLICY_URL =
  'https://www.freeprivacypolicy.com/live/abf6b3a7-f310-4a49-811f-d9fefdef1750';

const COLORS = {
  primary: '#8B4513',
  accent: '#D2691E',
  background: '#FFF8F0',
  backgroundDark: '#1A0F0A',
  surface: '#FFFFFF',
  surfaceDark: '#2A1810',
  surfaceSecondary: '#F5EDE4',
  surfaceSecondaryDark: '#3A2010',
  text: '#2C1810',
  textDark: '#F5E6D8',
  textSecondary: '#8B6355',
  textSecondaryDark: '#C4957A',
  border: 'rgba(139,69,19,0.12)',
  borderDark: 'rgba(212,120,60,0.2)',
  success: '#16A34A',
};

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isDark: boolean;
  textColor: string;
  textSecondary: string;
  surfaceColor: string;
  borderColor: string;
  isLast?: boolean;
}

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  rightElement,
  isDark,
  textColor,
  textSecondary,
  surfaceColor,
  borderColor,
  isLast,
}: SettingsRowProps) {
  return (
    <Pressable
      style={[
        styles.settingsRow,
        { backgroundColor: surfaceColor, borderColor },
        isLast && styles.settingsRowLast,
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
    >
      <View style={[styles.rowIcon, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
        {icon}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.rowSublabel, { color: textSecondary }]}>{sublabel}</Text>
        ) : null}
      </View>
      {rightElement || (onPress ? <ChevronRight size={16} color={textSecondary} strokeWidth={2} /> : null)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { isSubscribed, restorePurchases, loading } = useSubscription();

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const handleUpgrade = useCallback(() => {
    console.log('[WoodEye] Upgrade to Premium pressed from settings');
    router.push('/paywall');
  }, [router]);

  const handleManageSubscription = useCallback(() => {
    console.log('[WoodEye] Manage Subscription pressed');
    Linking.openURL('https://apps.apple.com/account/subscriptions');
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    console.log('[WoodEye] Privacy Policy pressed');
    Linking.openURL(PRIVACY_POLICY_URL);
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    console.log('[WoodEye] Restore Purchases pressed');
    try {
      const restored = await restorePurchases();
      console.log('[WoodEye] Restore purchases result:', restored);
    } catch (e) {
      console.error('[WoodEye] Restore purchases failed:', e);
    }
  }, [restorePurchases]);

  const statusText = isSubscribed ? 'Pro · Unlimited scans' : 'Free · 4 scans included';
  const statusColor = isSubscribed ? COLORS.success : COLORS.accent;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top }}>
          <LinearGradient
            colors={isDark ? ['#3D1A0A', '#1A0F0A'] : ['#8B4513', '#D2691E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <Settings size={20} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Settings</Text>
                <Text style={styles.headerSubtitle}>WoodEye v{appVersion}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Subscription status card */}
        <View style={styles.section}>
          <View style={[styles.subscriptionCard, { backgroundColor: surfaceColor, borderColor }]}>
            <LinearGradient
              colors={isSubscribed
                ? (isDark ? ['rgba(22,163,74,0.2)', 'transparent'] : ['rgba(22,163,74,0.06)', 'transparent'])
                : (isDark ? ['rgba(139,69,19,0.2)', 'transparent'] : ['rgba(139,69,19,0.06)', 'transparent'])
              }
              style={styles.subscriptionGradient}
            >
              <View style={styles.subscriptionHeader}>
                <View style={[styles.subscriptionIcon, { backgroundColor: isSubscribed ? 'rgba(22,163,74,0.12)' : 'rgba(139,69,19,0.1)' }]}>
                  {isSubscribed ? (
                    <Crown size={22} color={COLORS.success} strokeWidth={1.5} />
                  ) : (
                    <Leaf size={22} color={COLORS.primary} strokeWidth={1.5} />
                  )}
                </View>
                <View style={styles.subscriptionInfo}>
                  <Text style={[styles.subscriptionTitle, { color: textColor }]}>
                    {isSubscribed ? 'WoodEye Pro' : 'Free Plan'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
                  </View>
                </View>
              </View>

              {!isSubscribed && (
                <Pressable
                  style={styles.upgradeButton}
                  onPress={handleUpgrade}
                  accessibilityRole="button"
                  accessibilityLabel="Upgrade to Premium"
                >
                  <LinearGradient
                    colors={['#D2691E', '#8B4513']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.upgradeGradient}
                  >
                    <Star size={15} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {isSubscribed && (
                <Pressable
                  style={[styles.manageButton, { borderColor: COLORS.success }]}
                  onPress={handleManageSubscription}
                  accessibilityRole="button"
                  accessibilityLabel="Manage subscription"
                >
                  <Text style={[styles.manageButtonText, { color: COLORS.success }]}>
                    Manage subscription
                  </Text>
                  <ChevronRight size={14} color={COLORS.success} strokeWidth={2} />
                </Pressable>
              )}
            </LinearGradient>
          </View>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Account</Text>
          <View style={[styles.settingsGroup, { borderColor }]}>
            <SettingsRow
              icon={<RefreshCw size={18} color={COLORS.primary} strokeWidth={2} />}
              label="Restore purchases"
              sublabel="Recover a previous subscription"
              onPress={handleRestorePurchases}
              isDark={isDark}
              textColor={textColor}
              textSecondary={textSecondary}
              surfaceColor={surfaceColor}
              borderColor={borderColor}
              isLast
            />
          </View>
        </View>

        {/* Legal section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Legal</Text>
          <View style={[styles.settingsGroup, { borderColor }]}>
            <SettingsRow
              icon={<Shield size={18} color={COLORS.primary} strokeWidth={2} />}
              label="Privacy Policy"
              onPress={handlePrivacyPolicy}
              isDark={isDark}
              textColor={textColor}
              textSecondary={textSecondary}
              surfaceColor={surfaceColor}
              borderColor={borderColor}
              isLast
            />
          </View>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <View style={styles.appInfoLogo}>
            <Leaf size={20} color={COLORS.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.appInfoName, { color: textColor }]}>WoodEye</Text>
          <Text style={[styles.appInfoVersion, { color: textSecondary }]}>Version {appVersion}</Text>
          <Text style={[styles.appInfoTagline, { color: textSecondary }]}>
            AI-powered wood species identification
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 0,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  subscriptionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  subscriptionGradient: {
    padding: 16,
    gap: 14,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  subscriptionInfo: {
    flex: 1,
    gap: 6,
  },
  subscriptionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 7,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
    borderCurve: 'continuous',
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSublabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    gap: 6,
  },
  appInfoLogo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(139,69,19,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderCurve: 'continuous',
  },
  appInfoName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  appInfoVersion: {
    fontSize: 13,
    fontWeight: '400',
  },
  appInfoTagline: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
});
