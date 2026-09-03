import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Image,
  useColorScheme,
  ActivityIndicator,
  ImageSourcePropType,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  ArrowLeft,
  Camera,
  Leaf,
  Zap,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SCAN_COUNT_KEY = 'woodeye_scan_count';
const DEVICE_ID_KEY = 'woodeye_device_id';
const SUPABASE_URL = 'https://owcjjbrmmjgwfrhysavz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93Y2pqYnJtbWpnd2ZyaHlzYXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTU4NDcsImV4cCI6MjEwNDAzMTg0N30.eLkFGUDF17ax1upsCOaScq85ljdzW-_tG74JAO7iJrY';

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
  warning: '#D97706',
};

interface ScanResult {
  id?: string;
  species: string;
  common_name: string;
  confidence: number;
  grain: string;
  hardness: string;
  color_description: string;
  common_uses: string[];
  fun_fact: string;
  scanned_at?: string;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const deviceId =
      (Constants.deviceId as string | undefined) ||
      `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch {
    return `device_${Date.now()}`;
  }
}

function ConfidenceBar({ confidence, isDark }: { confidence: number; isDark: boolean }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: confidence,
      duration: 800,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [confidence]);

  const confidenceColor =
    confidence >= 80 ? COLORS.success : confidence >= 60 ? COLORS.warning : COLORS.accent;

  return (
    <View style={styles.confidenceContainer}>
      <View style={[styles.confidenceTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <Animated.View
          style={[
            styles.confidenceFill,
            {
              backgroundColor: confidenceColor,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.confidenceLabel, { color: confidenceColor }]}>
        {Math.round(confidence)}%
      </Text>
    </View>
  );
}

function SkeletonLine({ widthPct, height = 14 }: { widthPct: string; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: widthPct as `${number}%`, height, borderRadius: height / 2, backgroundColor: '#C4957A', overflow: 'hidden' }}>
      <Animated.View style={{ flex: 1, opacity, backgroundColor: '#C4957A' }} />
    </View>
  );
}

export default function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { imageUri, imageBase64 } = useLocalSearchParams<{ imageUri: string; imageBase64: string }>();

  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const surfaceSecondary = isDark ? COLORS.surfaceSecondaryDark : COLORS.surfaceSecondary;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  useEffect(() => {
    identifyWood();
  }, []);

  const identifyWood = async () => {
    setLoading(true);
    setError(null);
    console.log('[WoodEye] Starting wood identification...');

    try {
      const deviceId = await getOrCreateDeviceId();
      console.log('[WoodEye] Device ID:', deviceId);
      console.log('[WoodEye] Sending identify-wood request to Supabase edge function');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/identify-wood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          device_id: deviceId,
        }),
      });

      console.log('[WoodEye] identify-wood response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WoodEye] identify-wood error response:', errorText);
        throw new Error(`Server error ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data: ScanResult = await response.json();
      console.log('[WoodEye] Identification result:', data.species, '- confidence:', data.confidence);

      setResult(data);

      // Increment scan count
      const stored = await AsyncStorage.getItem(SCAN_COUNT_KEY);
      const count = stored ? parseInt(stored, 10) : 0;
      const newCount = count + 1;
      await AsyncStorage.setItem(SCAN_COUNT_KEY, String(newCount));
      console.log('[WoodEye] Scan count incremented to:', newCount);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (e: any) {
      console.error('[WoodEye] Wood identification failed:', e);
      setError(e.message || 'Could not identify the wood. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanAgain = useCallback(() => {
    console.log('[WoodEye] Scan Again pressed');
    router.back();
  }, [router]);

  const handleBack = useCallback(() => {
    console.log('[WoodEye] Back pressed from results');
    router.back();
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Custom header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={COLORS.primary} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: textColor }]}>Wood Analysis</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo */}
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image
                source={resolveImageSource(imageUri)}
                style={styles.woodImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={styles.imageOverlay}
              />
            </View>
          ) : null}

          {/* Loading state */}
          {loading && (
            <View style={[styles.loadingCard, { backgroundColor: surfaceColor, borderColor }]}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={[styles.loadingTitle, { color: textColor }]}>Analyzing wood grain...</Text>
              <Text style={[styles.loadingSubtitle, { color: textSecondary }]}>
                Our AI is examining the texture, grain pattern, and color
              </Text>
              <View style={styles.skeletonGroup}>
                <SkeletonLine widthPct="70%" height={20} />
                <SkeletonLine widthPct="50%" height={14} />
                <SkeletonLine widthPct="90%" height={12} />
                <SkeletonLine widthPct="80%" height={12} />
              </View>
            </View>
          )}

          {/* Error state */}
          {error && !loading && (
            <View style={[styles.errorCard, { backgroundColor: surfaceColor, borderColor }]}>
              <View style={styles.errorIcon}>
                <Info size={28} color={COLORS.accent} strokeWidth={1.5} />
              </View>
              <Text style={[styles.errorTitle, { color: textColor }]}>Identification failed</Text>
              <Text style={[styles.errorMessage, { color: textSecondary }]}>{error}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  console.log('[WoodEye] Retry identification pressed');
                  identifyWood();
                }}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {/* Results */}
          {result && !loading && (
            <Animated.View style={{ opacity: fadeAnim, gap: 16 }}>
              {/* Species header */}
              <View style={[styles.speciesCard, { backgroundColor: surfaceColor, borderColor }]}>
                <LinearGradient
                  colors={isDark ? ['rgba(139,69,19,0.3)', 'transparent'] : ['rgba(139,69,19,0.06)', 'transparent']}
                  style={styles.speciesCardGradient}
                >
                  <View style={styles.speciesHeader}>
                    <View style={styles.speciesLeafIcon}>
                      <Leaf size={18} color={COLORS.primary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.speciesLabel, { color: textSecondary }]}>Identified Species</Text>
                  </View>
                  <Text style={[styles.speciesName, { color: textColor }]}>{result.species}</Text>
                  <Text style={[styles.commonName, { color: textSecondary }]}>{result.common_name}</Text>

                  <View style={styles.confidenceRow}>
                    <Text style={[styles.confidenceTitle, { color: textSecondary }]}>Confidence</Text>
                    <ConfidenceBar confidence={Number(result.confidence)} isDark={isDark} />
                  </View>
                </LinearGradient>
              </View>

              {/* Properties */}
              <View style={[styles.propertiesCard, { backgroundColor: surfaceColor, borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Wood Properties</Text>
                <View style={styles.propertiesGrid}>
                  <View style={[styles.propertyItem, { backgroundColor: surfaceSecondary }]}>
                    <Text style={[styles.propertyLabel, { color: textSecondary }]}>Grain</Text>
                    <Text style={[styles.propertyValue, { color: textColor }]}>{result.grain}</Text>
                  </View>
                  <View style={[styles.propertyItem, { backgroundColor: surfaceSecondary }]}>
                    <Text style={[styles.propertyLabel, { color: textSecondary }]}>Hardness</Text>
                    <Text style={[styles.propertyValue, { color: textColor }]}>{result.hardness}</Text>
                  </View>
                </View>
                <View style={[styles.colorRow, { backgroundColor: surfaceSecondary }]}>
                  <Text style={[styles.propertyLabel, { color: textSecondary }]}>Color</Text>
                  <Text style={[styles.propertyValue, { color: textColor }]}>{result.color_description}</Text>
                </View>
              </View>

              {/* Common uses */}
              {result.common_uses && result.common_uses.length > 0 && (
                <View style={[styles.usesCard, { backgroundColor: surfaceColor, borderColor }]}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Common Uses</Text>
                  <View style={styles.usesChips}>
                    {result.common_uses.map((use, i) => (
                      <View key={i} style={[styles.useChip, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
                        <Text style={[styles.useChipText, { color: COLORS.primary }]}>{use}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Fun fact */}
              {result.fun_fact ? (
                <View style={[styles.funFactCard, { borderColor: COLORS.accent }]}>
                  <LinearGradient
                    colors={isDark ? ['rgba(210,105,30,0.2)', 'rgba(139,69,19,0.1)'] : ['rgba(210,105,30,0.08)', 'rgba(139,69,19,0.04)']}
                    style={styles.funFactGradient}
                  >
                    <View style={styles.funFactHeader}>
                      <Zap size={16} color={COLORS.accent} strokeWidth={2} />
                      <Text style={[styles.funFactLabel, { color: COLORS.accent }]}>Did you know?</Text>
                    </View>
                    <Text style={[styles.funFactText, { color: textColor }]}>{result.fun_fact}</Text>
                  </LinearGradient>
                </View>
              ) : null}
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom action */}
        {!loading && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: bg }]}>
            <Pressable
              style={styles.scanAgainButton}
              onPress={handleScanAgain}
              accessibilityRole="button"
              accessibilityLabel="Scan another wood sample"
            >
              <LinearGradient
                colors={['#D2691E', '#8B4513']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanAgainGradient}
              >
                <Camera size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.scanAgainText}>Scan another wood</Text>
                <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  imageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    borderCurve: 'continuous',
  },
  woodImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  loadingCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  loadingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  skeletonGroup: {
    width: '100%',
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  errorCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(210,105,30,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
    borderCurve: 'continuous',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  speciesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  speciesCardGradient: {
    padding: 20,
    gap: 6,
  },
  speciesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  speciesLeafIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(139,69,19,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  speciesLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  speciesName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  commonName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  confidenceRow: {
    gap: 6,
    marginTop: 4,
  },
  confidenceTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confidenceTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  propertiesCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  propertiesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  propertyItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderCurve: 'continuous',
  },
  propertyLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  propertyValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorRow: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderCurve: 'continuous',
  },
  usesCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  usesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  useChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  useChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  funFactCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderCurve: 'continuous',
  },
  funFactGradient: {
    padding: 16,
    gap: 8,
  },
  funFactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  funFactLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  funFactText: {
    fontSize: 14,
    lineHeight: 21,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,69,19,0.08)',
  },
  scanAgainButton: {
    borderRadius: 14,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  scanAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  scanAgainText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
});
