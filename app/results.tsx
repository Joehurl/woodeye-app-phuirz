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
  Linking,
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
  Heart,
  ExternalLink,
  Trees,
  Hammer,
  WifiOff,
} from 'lucide-react-native';
import { isOnline, findCachedMatch } from '@/utils/woodCache';
import { LinearGradient } from 'expo-linear-gradient';

const SCAN_COUNT_KEY = 'woodeye_scan_count';
const DEVICE_ID_KEY = 'woodeye_device_id';
const USER_CACHE_KEY_PREFIX = 'woodeye_cache_';
const USER_CACHE_INDEX_KEY = 'woodeye_cache_index';
const USER_CACHE_MAX = 20;
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
  origin?: string;
  rot_resistant?: boolean;
  scanned_at?: string;
}

interface SimilarWood {
  species: string;
  common_name: string;
  similarity_reason: string;
  hardness: string;
  origin: string;
}

interface ProjectRecommendation {
  project: string;
  suitability: 'excellent' | 'good' | 'fair';
  reason: string;
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

function SectionSkeleton({ isDark }: { isDark: boolean }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const bg = isDark ? '#3A2010' : '#F5EDE4';
  return (
    <Animated.View style={{ opacity, gap: 10 }}>
      <View style={{ width: '40%', height: 14, borderRadius: 7, backgroundColor: bg }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, height: 80, borderRadius: 12, backgroundColor: bg }} />
        ))}
      </View>
    </Animated.View>
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
  const [isOffline, setIsOffline] = useState(false);
  const [isCachedResult, setIsCachedResult] = useState(false);

  const [similarWoods, setSimilarWoods] = useState<SimilarWood[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const [recommendations, setRecommendations] = useState<ProjectRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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

  const fetchSimilarWoods = async (species: string, common_name: string) => {
    setSimilarLoading(true);
    console.log('[WoodEye] Fetching similar woods for:', species);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-similar-woods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ species, common_name }),
      });
      console.log('[WoodEye] get-similar-woods response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] get-similar-woods error:', errText);
        return;
      }
      const data = await response.json();
      console.log('[WoodEye] Similar woods loaded:', data.similar?.length ?? 0);
      setSimilarWoods(data.similar || []);
    } catch (e: any) {
      console.error('[WoodEye] Failed to fetch similar woods:', e);
    } finally {
      setSimilarLoading(false);
    }
  };

  const fetchRecommendations = async (scan: ScanResult) => {
    setRecsLoading(true);
    console.log('[WoodEye] Fetching project recommendations for:', scan.species);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-project-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          species: scan.species,
          common_name: scan.common_name,
          hardness: scan.hardness,
          rot_resistant: scan.rot_resistant,
          grain: scan.grain,
        }),
      });
      console.log('[WoodEye] get-project-recommendations response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] get-project-recommendations error:', errText);
        return;
      }
      const data = await response.json();
      console.log('[WoodEye] Project recommendations loaded:', data.recommendations?.length ?? 0);
      setRecommendations(data.recommendations || []);
    } catch (e: any) {
      console.error('[WoodEye] Failed to fetch project recommendations:', e);
    } finally {
      setRecsLoading(false);
    }
  };

  const checkFavoriteStatus = async (species: string) => {
    try {
      const deviceId = await getOrCreateDeviceId();
      console.log('[WoodEye] Checking favorite status for:', species);
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-favorites?device_id=${encodeURIComponent(deviceId)}`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );
      console.log('[WoodEye] get-favorites response status:', response.status);
      if (!response.ok) return;
      const data = await response.json();
      const favs: { species: string }[] = data.favorites || [];
      const isFav = favs.some((f) => f.species === species);
      console.log('[WoodEye] Is favorited:', isFav);
      setFavorited(isFav);
    } catch (e: any) {
      console.error('[WoodEye] Failed to check favorite status:', e);
    }
  };

  const cacheUserResult = async (data: ScanResult) => {
    try {
      const key = `${USER_CACHE_KEY_PREFIX}${data.species.replace(/\s+/g, '_').toLowerCase()}`;
      await AsyncStorage.setItem(key, JSON.stringify(data));
      // Maintain a rolling index of cached species keys
      const indexRaw = await AsyncStorage.getItem(USER_CACHE_INDEX_KEY);
      const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
      const updated = [key, ...index.filter((k) => k !== key)].slice(0, USER_CACHE_MAX);
      await AsyncStorage.setItem(USER_CACHE_INDEX_KEY, JSON.stringify(updated));
      console.log('[WoodEye] Cached scan result for:', data.species, '- total cached:', updated.length);
    } catch (e) {
      console.warn('[WoodEye] Failed to cache scan result:', e);
    }
  };

  const identifyWood = async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);
    setIsCachedResult(false);
    console.log('[WoodEye] Starting wood identification...');

    try {
      // ── Offline check ────────────────────────────────────────────────────────
      const online = await isOnline();
      if (!online) {
        console.log('[WoodEye] Device is offline — attempting cached match');
        setIsOffline(true);
        const cached = findCachedMatch();
        if (cached) {
          console.log('[WoodEye] Serving cached result:', cached.common_name);
          setResult({
            species: cached.species,
            common_name: cached.common_name,
            confidence: cached.confidence,
            grain: cached.grain,
            hardness: cached.hardness,
            color_description: cached.color_description,
            common_uses: cached.common_uses,
            fun_fact: cached.fun_fact,
            origin: cached.origin,
            rot_resistant: cached.rot_resistant,
          });
          setIsCachedResult(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        } else {
          console.log('[WoodEye] No cached match available — showing offline no-match UI');
          // Leave result null; offline + no result → offline card rendered below
        }
        return;
      }

      // ── Online path ──────────────────────────────────────────────────────────
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

      // Cache the successful result for future offline use
      cacheUserResult(data);

      // Kick off secondary fetches in parallel
      fetchSimilarWoods(data.species, data.common_name);
      fetchRecommendations(data);
      checkFavoriteStatus(data.species);

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

  const handleToggleFavorite = useCallback(async () => {
    if (!result || favoriteLoading) return;
    console.log('[WoodEye] Toggle favorite pressed for:', result.species, '- currently favorited:', favorited);
    setFavoriteLoading(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/toggle-favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          device_id: deviceId,
          species: result.species,
          common_name: result.common_name,
          hardness: result.hardness,
          origin: result.origin,
          rot_resistant: result.rot_resistant,
        }),
      });
      console.log('[WoodEye] toggle-favorite response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] toggle-favorite error:', errText);
        return;
      }
      const data = await response.json();
      console.log('[WoodEye] Favorite toggled, new state:', data.favorited);
      setFavorited(data.favorited);
    } catch (e: any) {
      console.error('[WoodEye] Failed to toggle favorite:', e);
    } finally {
      setFavoriteLoading(false);
    }
  }, [result, favorited, favoriteLoading]);

  const handleBrowseLibrary = useCallback(() => {
    console.log('[WoodEye] Browse Species Library pressed from offline screen');
    router.push('/species-library');
  }, [router]);

  const handleTryAgain = useCallback(() => {
    console.log('[WoodEye] Try Again pressed from offline screen');
    identifyWood();
  }, []);

  const handleScanAgain = useCallback(() => {
    console.log('[WoodEye] Scan Again pressed');
    router.back();
  }, [router]);

  const handleBack = useCallback(() => {
    console.log('[WoodEye] Back pressed from results');
    router.back();
  }, [router]);

  const handleBuyLink = useCallback((storeName: string, url: string) => {
    console.log('[WoodEye] Buy link pressed:', storeName, '->', url);
    Linking.openURL(url);
  }, []);

  const suitabilityColor = (s: ProjectRecommendation['suitability']) => {
    if (s === 'excellent') return COLORS.success;
    if (s === 'good') return COLORS.warning;
    return textSecondary;
  };

  const suitabilityBg = (s: ProjectRecommendation['suitability']) => {
    if (s === 'excellent') return isDark ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.1)';
    if (s === 'good') return isDark ? 'rgba(217,119,6,0.2)' : 'rgba(217,119,6,0.1)';
    return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  };

  const commonNameEncoded = result ? encodeURIComponent(result.common_name) : '';
  const commonNameLumberEncoded = result ? encodeURIComponent(result.common_name + ' wood lumber') : '';

  const buyLinks = [
    {
      name: 'Woodcraft',
      url: `https://www.woodcraft.com/search?q=${commonNameEncoded}`,
    },
    {
      name: 'Rockler',
      url: `https://www.rockler.com/search#w=${commonNameEncoded}`,
    },
    {
      name: 'Amazon',
      url: `https://www.amazon.com/s?k=${commonNameLumberEncoded}`,
    },
  ];

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
          <Pressable
            style={styles.backButton}
            onPress={handleToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
            disabled={!result || favoriteLoading}
          >
            {result ? (
              <Heart
                size={22}
                color={favorited ? '#E53E3E' : COLORS.primary}
                strokeWidth={2}
                fill={favorited ? '#E53E3E' : 'none'}
              />
            ) : (
              <View style={{ width: 22, height: 22 }} />
            )}
          </Pressable>
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

          {/* Offline + no match state */}
          {isOffline && !result && !loading && (
            <View style={[styles.offlineCard, { backgroundColor: surfaceColor, borderColor }]}>
              <View style={styles.offlineIconWrap}>
                <WifiOff size={32} color={COLORS.warning} strokeWidth={1.5} />
              </View>
              <Text style={[styles.offlineTitle, { color: textColor }]}>You're offline</Text>
              <Text style={[styles.offlineMessage, { color: textSecondary }]}>
                WoodEye needs an internet connection to identify wood with AI. Connect to Wi-Fi or cellular to scan.
              </Text>
              <Pressable
                style={styles.browseLibraryButton}
                onPress={handleBrowseLibrary}
                accessibilityRole="button"
                accessibilityLabel="Browse Species Library"
              >
                <LinearGradient
                  colors={['#D2691E', '#8B4513']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.browseLibraryGradient}
                >
                  <Leaf size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.browseLibraryText}>Browse Species Library</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={[styles.tryAgainButton, { borderColor }]}
                onPress={handleTryAgain}
                accessibilityRole="button"
                accessibilityLabel="Try Again"
              >
                <Text style={[styles.tryAgainText, { color: textSecondary }]}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Results */}
          {result && !loading && (
            <Animated.View style={{ opacity: fadeAnim, gap: 16 }}>
              {/* Offline cached result badge */}
              {isCachedResult && (
                <View style={styles.cachedBadgeRow}>
                  <View style={styles.cachedBadge}>
                    <WifiOff size={12} color={COLORS.warning} strokeWidth={2} />
                    <Text style={[styles.cachedBadgeText, { color: COLORS.warning }]}>
                      Offline · Cached Result
                    </Text>
                  </View>
                  <Text style={[styles.cachedBadgeNote, { color: textSecondary }]}>
                    Connect to internet for AI-powered identification
                  </Text>
                </View>
              )}

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
                {result.origin && result.origin !== 'unknown' ? (
                  <View style={[styles.colorRow, { backgroundColor: surfaceSecondary }]}>
                    <Text style={[styles.propertyLabel, { color: textSecondary }]}>Origin</Text>
                    <Text style={[styles.propertyValue, { color: textColor }]}>{result.origin}</Text>
                  </View>
                ) : null}
                <View style={[styles.colorRow, { backgroundColor: surfaceSecondary }]}>
                  <Text style={[styles.propertyLabel, { color: textSecondary }]}>Color</Text>
                  <Text style={[styles.propertyValue, { color: textColor }]}>{result.color_description}</Text>
                </View>
                {result.rot_resistant !== undefined ? (
                  <View style={[
                    styles.rotBadge,
                    { backgroundColor: result.rot_resistant
                        ? (isDark ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.1)')
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') }
                  ]}>
                    <Text style={[
                      styles.rotBadgeText,
                      { color: result.rot_resistant ? COLORS.success : textSecondary }
                    ]}>
                      {result.rot_resistant ? 'Rot Resistant ✓' : 'Not Rot Resistant'}
                    </Text>
                  </View>
                ) : null}
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

              {/* Similar Woods */}
              <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.sectionTitleRow}>
                  <Trees size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Similar Woods</Text>
                </View>
                {similarLoading ? (
                  <SectionSkeleton isDark={isDark} />
                ) : similarWoods.length > 0 ? (
                  <View style={styles.similarGrid}>
                    {similarWoods.slice(0, 3).map((wood, i) => (
                      <View
                        key={i}
                        style={[styles.similarCard, { backgroundColor: surfaceSecondary, borderColor }]}
                      >
                        <Text style={[styles.similarSpecies, { color: textColor }]} numberOfLines={2}>
                          {wood.species}
                        </Text>
                        <Text style={[styles.similarCommon, { color: textSecondary }]} numberOfLines={1}>
                          {wood.common_name}
                        </Text>
                        <View style={[styles.similarDivider, { backgroundColor: borderColor }]} />
                        <Text style={[styles.similarReason, { color: textSecondary }]} numberOfLines={3}>
                          {wood.similarity_reason}
                        </Text>
                        <View style={styles.similarMeta}>
                          <Text style={[styles.similarMetaText, { color: COLORS.primary }]}>
                            {wood.hardness}
                          </Text>
                          <Text style={[styles.similarMetaDot, { color: textSecondary }]}>·</Text>
                          <Text style={[styles.similarMetaText, { color: textSecondary }]} numberOfLines={1}>
                            {wood.origin}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.emptyHint, { color: textSecondary }]}>No similar woods found</Text>
                )}
              </View>

              {/* Project Recommendations */}
              <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.sectionTitleRow}>
                  <Hammer size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Best For</Text>
                </View>
                {recsLoading ? (
                  <SectionSkeleton isDark={isDark} />
                ) : recommendations.length > 0 ? (
                  <View style={styles.recsGrid}>
                    {recommendations.map((rec, i) => {
                      const sColor = suitabilityColor(rec.suitability);
                      const sBg = suitabilityBg(rec.suitability);
                      const sLabel = rec.suitability.charAt(0).toUpperCase() + rec.suitability.slice(1);
                      return (
                        <View
                          key={i}
                          style={[styles.recCard, { backgroundColor: surfaceSecondary, borderColor }]}
                        >
                          <View style={styles.recHeader}>
                            <Text style={[styles.recProject, { color: textColor }]} numberOfLines={1}>
                              {rec.project}
                            </Text>
                            <View style={[styles.suitabilityBadge, { backgroundColor: sBg }]}>
                              <Text style={[styles.suitabilityText, { color: sColor }]}>
                                {sLabel}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.recReason, { color: textSecondary }]} numberOfLines={2}>
                            {rec.reason}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.emptyHint, { color: textSecondary }]}>No recommendations found</Text>
                )}
              </View>

              {/* Where to Buy */}
              <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.sectionTitleRow}>
                  <ExternalLink size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Where to Buy</Text>
                </View>
                <View style={styles.buyRow}>
                  {buyLinks.map((link) => (
                    <Pressable
                      key={link.name}
                      style={[styles.buyChip, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)', borderColor }]}
                      onPress={() => handleBuyLink(link.name, link.url)}
                      accessibilityRole="link"
                      accessibilityLabel={`Search ${link.name} for ${result.common_name}`}
                    >
                      <Text style={[styles.buyChipText, { color: COLORS.primary }]}>{link.name}</Text>
                      <ExternalLink size={12} color={COLORS.primary} strokeWidth={2} />
                    </Pressable>
                  ))}
                </View>
              </View>
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
  rotBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  rotBadgeText: {
    fontSize: 13,
    fontWeight: '600',
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
  // Shared section card
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyHint: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  // Similar woods
  similarGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  similarCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  similarSpecies: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 17,
  },
  similarCommon: {
    fontSize: 11,
    fontWeight: '500',
  },
  similarDivider: {
    height: 1,
    opacity: 0.4,
  },
  similarReason: {
    fontSize: 11,
    lineHeight: 16,
  },
  similarMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  similarMetaText: {
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1,
  },
  similarMetaDot: {
    fontSize: 10,
  },
  // Project recommendations
  recsGrid: {
    gap: 8,
  },
  recCard: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recProject: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.1,
  },
  suitabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  suitabilityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  recReason: {
    fontSize: 12,
    lineHeight: 17,
  },
  // Where to buy
  buyRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  buyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  buyChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Offline no-match card
  offlineCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  offlineIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(217,119,6,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  offlineMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  browseLibraryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
    borderCurve: 'continuous',
  },
  browseLibraryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  browseLibraryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tryAgainButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  tryAgainText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Cached result badge
  cachedBadgeRow: {
    gap: 4,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217,119,6,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  cachedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  cachedBadgeNote: {
    fontSize: 12,
    fontWeight: '400',
    paddingHorizontal: 2,
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
