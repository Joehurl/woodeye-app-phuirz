import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, Leaf, Zap } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { LinearGradient } from 'expo-linear-gradient';

const SCAN_COUNT_KEY = 'woodeye_scan_count';
const FREE_SCAN_LIMIT = 4;

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
  border: 'rgba(139,69,19,0.12)',
  borderDark: 'rgba(212,120,60,0.2)',
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isSubscribed } = useSubscription();

  const [scanCount, setScanCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;

  useEffect(() => {
    loadScanCount();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    startPulse();
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  };

  const loadScanCount = async () => {
    try {
      const stored = await AsyncStorage.getItem(SCAN_COUNT_KEY);
      const count = stored ? parseInt(stored, 10) : 0;
      setScanCount(count);
      console.log('[WoodEye] Loaded scan count:', count);
    } catch (e) {
      console.error('[WoodEye] Failed to load scan count:', e);
    }
  };

  const handleScanPress = useCallback(async () => {
    console.log('[WoodEye] Scan button pressed. isSubscribed:', isSubscribed, 'scanCount:', scanCount);

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }),
    ]).start();

    if (!isSubscribed && scanCount >= FREE_SCAN_LIMIT) {
      console.log('[WoodEye] Scan limit reached, redirecting to paywall');
      router.push('/paywall');
      return;
    }

    setLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[WoodEye] Camera permission status:', status);
      if (status !== 'granted') {
        Alert.alert(
          'Camera access needed',
          'WoodEye needs camera access to identify wood species. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
        allowsEditing: false,
      });

      console.log('[WoodEye] Camera result cancelled:', result.canceled);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('[WoodEye] Photo taken, navigating to results. Image size:', asset.base64?.length ?? 0, 'chars');
        router.push({
          pathname: '/results',
          params: {
            imageUri: asset.uri,
            imageBase64: asset.base64 ?? '',
          },
        });
      }
    } catch (e) {
      console.error('[WoodEye] Camera error:', e);
      Alert.alert('Camera error', 'Could not open the camera. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isSubscribed, scanCount, router, scaleAnim]);

  const scansRemaining = Math.max(0, FREE_SCAN_LIMIT - scanCount);
  const scansUsedText = isSubscribed ? null : `${scanCount} of ${FREE_SCAN_LIMIT} free scans used`;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <Animated.View style={[styles.header, { paddingTop: insets.top + 16, opacity: fadeAnim }]}>
          <LinearGradient
            colors={isDark ? ['#3D1A0A', '#1A0F0A'] : ['#8B4513', '#D2691E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.logoRow}>
                <View style={styles.logoIcon}>
                  <Leaf size={22} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.logoText}>WoodEye</Text>
              </View>
              <Text style={styles.headerSubtitle}>AI Wood Species Identifier</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main scan area */}
        <Animated.View style={[styles.scanArea, { opacity: fadeAnim }]}>
          <View style={[styles.scanCard, { backgroundColor: surfaceColor, borderColor: isDark ? COLORS.borderDark : COLORS.border }]}>
            {/* Decorative grain lines */}
            <View style={styles.grainLines} pointerEvents="none">
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.grainLine,
                    {
                      top: 20 + i * 28,
                      opacity: 0.04 + i * 0.01,
                      backgroundColor: COLORS.primary,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.scanTitle, { color: textColor }]}>Identify Wood Species</Text>
            <Text style={[styles.scanSubtitle, { color: textSecondary }]}>
              Point your camera at any wood surface — grain, plank, or cross-section
            </Text>

            {/* Scan button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Pressable
                  style={[styles.scanButton, loading && styles.scanButtonLoading]}
                  onPress={handleScanPress}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Take photo to identify wood"
                >
                  <LinearGradient
                    colors={['#D2691E', '#8B4513']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.scanButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="large" />
                    ) : (
                      <>
                        <Camera size={40} color="#FFFFFF" strokeWidth={1.5} />
                        <Text style={styles.scanButtonText}>Tap to Scan</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </Animated.View>

            {/* Scan counter */}
            {scansUsedText && (
              <View style={[styles.scanCounterBadge, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
                <Zap size={13} color={COLORS.primary} strokeWidth={2} />
                <Text style={[styles.scanCounterText, { color: COLORS.primary }]}>
                  {scansUsedText}
                </Text>
                {scansRemaining <= 1 && scansRemaining > 0 && (
                  <Text style={[styles.scanCounterWarning, { color: COLORS.accent }]}>
                    {' '}· {scansRemaining} left
                  </Text>
                )}
              </View>
            )}

            {isSubscribed && (
              <View style={[styles.scanCounterBadge, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                <Zap size={13} color="#16A34A" strokeWidth={2} />
                <Text style={[styles.scanCounterText, { color: '#16A34A' }]}>
                  Unlimited scans · Pro
                </Text>
              </View>
            )}
          </View>

          {/* Tips */}
          <View style={styles.tipsRow}>
            {['Good lighting', 'Close-up grain', 'Flat surface'].map((tip) => (
              <View key={tip} style={[styles.tipChip, { backgroundColor: isDark ? 'rgba(139,69,19,0.15)' : 'rgba(139,69,19,0.07)', borderColor: isDark ? COLORS.borderDark : COLORS.border }]}>
                <Text style={[styles.tipText, { color: textSecondary }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    gap: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    letterSpacing: 0.2,
    marginLeft: 46,
  },
  scanArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  scanCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(139,69,19,0.08), 0 1px 3px rgba(0,0,0,0.04)',
    borderCurve: 'continuous',
  },
  grainLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  grainLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  scanSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  scanButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(139,69,19,0.35), 0 2px 8px rgba(0,0,0,0.1)',
  },
  scanButtonLoading: {
    opacity: 0.8,
  },
  scanButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scanCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scanCounterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scanCounterWarning: {
    fontSize: 13,
    fontWeight: '600',
  },
  tipsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  tipChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
