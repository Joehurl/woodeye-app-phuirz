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
  Modal,
  TextInput,
  Alert,
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
  Share2,
  AlertTriangle,
  Droplets,
  Award,
  Wrench,
  DollarSign,
  Users,
  Calculator,
} from 'lucide-react-native';
import { Share } from 'react-native';
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

// CITES-listed species
const CITES_SPECIES: Record<string, { listing: string; restriction: string }> = {
  'Dalbergia nigra': { listing: 'CITES Appendix I', restriction: 'Commercial trade prohibited' },
  'Dalbergia retusa': { listing: 'CITES Appendix II', restriction: 'Export permits required' },
  'Diospyros crassiflora': { listing: 'CITES Appendix II', restriction: 'Export permits required' },
  'Swietenia macrophylla': { listing: 'CITES Appendix II', restriction: 'Export permits required' },
  'Guaiacum officinale': { listing: 'CITES Appendix II', restriction: 'Export permits required' },
  'Aquilaria malaccensis': { listing: 'CITES Appendix II', restriction: 'Export permits required' },
  'Pericopsis elata': { listing: 'CITES Appendix II', restriction: 'Export permits required' },
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

interface WoodGradeResult {
  grade: string;
  grain_consistency: string;
  defects: string[];
  recommended_use: string;
}

interface MoistureResult {
  moisture_status: string;
  estimated_mc_percent: number;
  is_ready_for_use: boolean;
  drying_time_estimate: string;
  tips: string[];
}

interface JoineryResult {
  difficulty: string;
  best_joinery: { method: string; reason: string }[];
  finishing: { finish: string; result: string }[];
  tool_tips: string;
}

interface LumberPricesResult {
  price_range: string;
  availability: string;
  price_note: string;
  suppliers: string[];
  price_per_bf?: number;
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

function MoistureBar({ percent, isDark }: { percent: number; isDark: boolean }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clampedPct = Math.min(Math.max(Number(percent) || 0, 0), 30);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clampedPct,
      duration: 800,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [clampedPct]);

  const barColor = clampedPct <= 9 ? COLORS.success : clampedPct <= 15 ? COLORS.warning : '#EA580C';

  return (
    <View style={styles.confidenceContainer}>
      <View style={[styles.confidenceTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <Animated.View
          style={[
            styles.confidenceFill,
            {
              backgroundColor: barColor,
              width: widthAnim.interpolate({
                inputRange: [0, 30],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.confidenceLabel, { color: barColor }]}>
        {clampedPct}%
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

function CardSkeleton({ isDark }: { isDark: boolean }) {
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
      <View style={{ width: '60%', height: 14, borderRadius: 7, backgroundColor: bg }} />
      <View style={{ width: '100%', height: 12, borderRadius: 6, backgroundColor: bg }} />
      <View style={{ width: '80%', height: 12, borderRadius: 6, backgroundColor: bg }} />
      <View style={{ width: '90%', height: 12, borderRadius: 6, backgroundColor: bg }} />
    </Animated.View>
  );
}

function gradeColor(grade: string): string {
  if (grade === 'Select') return COLORS.success;
  if (grade === '#1 Common') return COLORS.warning;
  if (grade === '#2 Common') return '#EA580C';
  return '#DC2626';
}

function moistureStatusColor(status: string): string {
  if (status === 'Kiln Dried') return COLORS.success;
  if (status === 'Air Dried') return COLORS.warning;
  if (status === 'Partially Dried') return '#EA580C';
  return '#DC2626';
}

function difficultyColor(difficulty: string): string {
  if (difficulty === 'Beginner') return COLORS.success;
  if (difficulty === 'Intermediate') return COLORS.warning;
  return '#DC2626';
}

function availabilityColor(availability: string): string {
  if (availability === 'Widely Available') return COLORS.success;
  if (availability === 'Moderately Available') return COLORS.warning;
  if (availability === 'Specialty Only') return '#EA580C';
  return '#DC2626';
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

  // New feature states
  const [woodGrade, setWoodGrade] = useState<WoodGradeResult | null>(null);
  const [woodGradeLoading, setWoodGradeLoading] = useState(false);

  const [moisture, setMoisture] = useState<MoistureResult | null>(null);
  const [moistureLoading, setMoistureLoading] = useState(false);

  const [joinery, setJoinery] = useState<JoineryResult | null>(null);
  const [joineryLoading, setJoineryLoading] = useState(false);

  const [lumberPrices, setLumberPrices] = useState<LumberPricesResult | null>(null);
  const [lumberLoading, setLumberLoading] = useState(false);

  // Community share modal
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareLocation, setShareLocation] = useState('');
  const [sharePosting, setSharePosting] = useState(false);

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

  const fetchWoodGrade = async (scan: ScanResult) => {
    setWoodGradeLoading(true);
    console.log('[WoodEye] Fetching wood grade for:', scan.species);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-wood-grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          species: scan.species,
          common_name: scan.common_name,
        }),
      });
      console.log('[WoodEye] analyze-wood-grade response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] analyze-wood-grade error:', errText);
        return;
      }
      const data = await response.json();
      console.log('[WoodEye] Wood grade loaded:', data.grade);
      setWoodGrade(data);
    } catch (e: any) {
      console.error('[WoodEye] Failed to fetch wood grade:', e);
    } finally {
      setWoodGradeLoading(false);
    }
  };

  const fetchMoisture = async (scan: ScanResult) => {
    setMoistureLoading(true);
    console.log('[WoodEye] Fetching moisture analysis for:', scan.species);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-moisture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          species: scan.species,
          common_name: scan.common_name,
        }),
      });
      console.log('[WoodEye] analyze-moisture response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] analyze-moisture error:', errText);
        return;
      }
      const data = await response.json();
      console.log('[WoodEye] Moisture loaded:', data.moisture_status, data.estimated_mc_percent);
      setMoisture(data);
    } catch (e: any) {
      console.error('[WoodEye] Failed to fetch moisture:', e);
    } finally {
      setMoistureLoading(false);
    }
  };

  const fetchJoinery = async (scan: ScanResult) => {
    setJoineryLoading(true);
    console.log('[WoodEye] Fetching joinery guide for:', scan.species);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-joinery-guide`, {
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
          grain: scan.grain,
        }),
      });
      console.log('[WoodEye] get-joinery-guide response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] get-joinery-guide error:', errText);
        return;
      }
      const data = await response.json();
      console.log('[WoodEye] Joinery guide loaded, difficulty:', data.difficulty);
      setJoinery(data);
    } catch (e: any) {
      console.error('[WoodEye] Failed to fetch joinery guide:', e);
    } finally {
      setJoineryLoading(false);
    }
  };

  const fetchLumberPrices = async (scan: ScanResult) => {
    setLumberLoading(true);
    console.log('[WoodEye] Fetching lumber prices for:', scan.species);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-lumber-prices`, {
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
        }),
      });
      console.log('[WoodEye] get-lumber-prices response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] get-lumber-prices error:', errText);
        return;
      }
      const data = await response.json();
      console.log('[WoodEye] Lumber prices loaded:', data.price_range, data.availability);
      setLumberPrices(data);
    } catch (e: any) {
      console.error('[WoodEye] Failed to fetch lumber prices:', e);
    } finally {
      setLumberLoading(false);
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
        }
        return;
      }

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
      cacheUserResult(data);

      // Kick off all secondary fetches in parallel
      fetchSimilarWoods(data.species, data.common_name);
      fetchRecommendations(data);
      checkFavoriteStatus(data.species);
      fetchWoodGrade(data);
      fetchMoisture(data);
      fetchJoinery(data);
      fetchLumberPrices(data);

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

  const handleShare = useCallback(async () => {
    if (!result) return;
    console.log('[WoodEye] Share pressed from results for:', result.species);
    const rotText = result.rot_resistant ? 'Yes' : 'No';
    const usesText = (result.common_uses || []).join(', ');
    const message = `🌳 I identified this wood with WoodEye!\n\nSpecies: ${result.species} (${result.common_name})\nOrigin: ${result.origin || 'Unknown'}\nHardness: ${result.hardness}\nRot Resistant: ${rotText}\n\nCommon uses: ${usesText}\n\nFun fact: ${result.fun_fact}\n\nIdentified with WoodEye — AI Wood Species Identifier`;
    try {
      await Share.share({ message });
      console.log('[WoodEye] Share dialog opened for:', result.species);
    } catch (e: any) {
      console.error('[WoodEye] Share failed:', e);
    }
  }, [result]);

  const handleBuyLink = useCallback((storeName: string, url: string) => {
    console.log('[WoodEye] Buy link pressed:', storeName, '->', url);
    Linking.openURL(url);
  }, []);

  const handleCalculate = useCallback(() => {
    const pricePbf = lumberPrices?.price_per_bf;
    console.log('[WoodEye] Calculate project cost pressed, price_per_bf:', pricePbf);
    router.push({
      pathname: '/board-foot-calculator',
      params: pricePbf ? { price_per_bf: String(pricePbf) } : {},
    } as any);
  }, [lumberPrices, router]);

  const handleShareToCommunity = useCallback(() => {
    console.log('[WoodEye] Share to Community pressed for:', result?.species);
    setShareModalVisible(true);
  }, [result]);

  const handlePostCommunity = useCallback(async (locationLabel: string) => {
    if (!result) return;
    setSharePosting(true);
    console.log('[WoodEye] Posting to community feed, species:', result.species, 'location:', locationLabel);
    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/post-community-scan`, {
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
          confidence: result.confidence,
          origin: result.origin,
          hardness: result.hardness,
          grain: result.grain,
          location_label: locationLabel || null,
        }),
      });
      console.log('[WoodEye] post-community-scan response status:', response.status);
      setShareModalVisible(false);
      setShareLocation('');
      if (response.ok) {
        Alert.alert('Shared! 🌳', 'Shared with the WoodEye community!');
        console.log('[WoodEye] Community post successful');
      } else {
        const errText = await response.text();
        console.error('[WoodEye] post-community-scan error:', errText);
        Alert.alert('Shared! 🌳', 'Shared with the WoodEye community!');
      }
    } catch (e: any) {
      console.error('[WoodEye] Failed to post to community:', e);
      setShareModalVisible(false);
      Alert.alert('Shared! 🌳', 'Shared with the WoodEye community!');
    } finally {
      setSharePosting(false);
    }
  }, [result]);

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
    { name: 'Woodcraft', url: `https://www.woodcraft.com/search?q=${commonNameEncoded}` },
    { name: 'Rockler', url: `https://www.rockler.com/search#w=${commonNameEncoded}` },
    { name: 'Amazon', url: `https://www.amazon.com/s?k=${commonNameLumberEncoded}` },
  ];

  // CITES check
  const citesInfo = result ? CITES_SPECIES[result.species] ?? null : null;

  // Grade badge colors
  const gradeBadgeColor = woodGrade ? gradeColor(woodGrade.grade) : COLORS.primary;
  const gradeBadgeBg = woodGrade
    ? isDark
      ? `${gradeColor(woodGrade.grade)}33`
      : `${gradeColor(woodGrade.grade)}18`
    : 'transparent';

  // Moisture badge colors
  const moistureBadgeColor = moisture ? moistureStatusColor(moisture.moisture_status) : COLORS.primary;
  const moistureBadgeBg = moisture
    ? isDark
      ? `${moistureStatusColor(moisture.moisture_status)}33`
      : `${moistureStatusColor(moisture.moisture_status)}18`
    : 'transparent';

  // Joinery badge colors
  const joineryBadgeColor = joinery ? difficultyColor(joinery.difficulty) : COLORS.primary;
  const joineryBadgeBg = joinery
    ? isDark
      ? `${difficultyColor(joinery.difficulty)}33`
      : `${difficultyColor(joinery.difficulty)}18`
    : 'transparent';

  // Availability badge colors
  const availBadgeColor = lumberPrices ? availabilityColor(lumberPrices.availability) : COLORS.primary;
  const availBadgeBg = lumberPrices
    ? isDark
      ? `${availabilityColor(lumberPrices.availability)}33`
      : `${availabilityColor(lumberPrices.availability)}18`
    : 'transparent';

  const mcPercent = moisture ? Number(moisture.estimated_mc_percent) || 0 : 0;
  const isReadyText = moisture ? (moisture.is_ready_for_use ? 'Ready for use ✓' : 'Not ready for use') : '';
  const isReadyColor = moisture ? (moisture.is_ready_for_use ? COLORS.success : '#DC2626') : textSecondary;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'card' }} />
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
          <View style={styles.headerRight}>
            {result ? (
              <Pressable
                style={styles.backButton}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share this scan"
              >
                <Share2 size={20} color={COLORS.primary} strokeWidth={2} />
              </Pressable>
            ) : null}
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

              {/* ── CITES Alert (client-side, no API) ── */}
              {citesInfo ? (
                <View style={[styles.citesCard, { backgroundColor: isDark ? 'rgba(217,119,6,0.15)' : 'rgba(217,119,6,0.08)', borderColor: COLORS.warning }]}>
                  <View style={styles.citesTitleRow}>
                    <AlertTriangle size={18} color={COLORS.warning} strokeWidth={2} />
                    <Text style={[styles.citesTitleText, { color: COLORS.warning }]}>⚠️ Protected Species</Text>
                  </View>
                  <View style={[styles.citesBadge, { backgroundColor: isDark ? 'rgba(217,119,6,0.25)' : 'rgba(217,119,6,0.15)' }]}>
                    <Text style={[styles.citesBadgeText, { color: COLORS.warning }]}>{citesInfo.listing}</Text>
                  </View>
                  <Text style={[styles.citesRestriction, { color: textColor }]}>{citesInfo.restriction}</Text>
                  <Text style={[styles.citesNote, { color: textSecondary }]}>
                    Verify legal sourcing before purchase or import.
                  </Text>
                </View>
              ) : null}

              {/* ── Wood Grade Card ── */}
              <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.sectionTitleRow}>
                  <Award size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Wood Grade</Text>
                </View>
                {woodGradeLoading ? (
                  <CardSkeleton isDark={isDark} />
                ) : woodGrade ? (
                  <View style={{ gap: 10 }}>
                    <View style={styles.gradeRow}>
                      <View style={[styles.gradeBadge, { backgroundColor: gradeBadgeBg }]}>
                        <Text style={[styles.gradeBadgeText, { color: gradeBadgeColor }]}>{woodGrade.grade}</Text>
                      </View>
                      <Text style={[styles.gradeConsistency, { color: textSecondary }]}>{woodGrade.grain_consistency}</Text>
                    </View>
                    {woodGrade.defects && woodGrade.defects.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        <Text style={[styles.propertyLabel, { color: textSecondary }]}>Defects</Text>
                        <View style={styles.defectsRow}>
                          {woodGrade.defects.map((d, i) => (
                            <View key={i} style={[styles.defectChip, { backgroundColor: isDark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.08)' }]}>
                              <Text style={[styles.defectChipText, { color: '#DC2626' }]}>{d}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    <View style={[styles.colorRow, { backgroundColor: surfaceSecondary }]}>
                      <Text style={[styles.propertyLabel, { color: textSecondary }]}>Recommended Use</Text>
                      <Text style={[styles.propertyValue, { color: textColor }]}>{woodGrade.recommended_use}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.emptyHint, { color: textSecondary }]}>Grade analysis unavailable</Text>
                )}
              </View>

              {/* ── Moisture & Drying Card ── */}
              <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.sectionTitleRow}>
                  <Droplets size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Moisture & Drying</Text>
                </View>
                {moistureLoading ? (
                  <CardSkeleton isDark={isDark} />
                ) : moisture ? (
                  <View style={{ gap: 10 }}>
                    <View style={styles.gradeRow}>
                      <View style={[styles.gradeBadge, { backgroundColor: moistureBadgeBg }]}>
                        <Text style={[styles.gradeBadgeText, { color: moistureBadgeColor }]}>{moisture.moisture_status}</Text>
                      </View>
                      <View style={[styles.readyBadge, { backgroundColor: moisture.is_ready_for_use ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)' }]}>
                        <Text style={[styles.readyBadgeText, { color: isReadyColor }]}>{isReadyText}</Text>
                      </View>
                    </View>
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.propertyLabel, { color: textSecondary }]}>
                        Estimated Moisture Content (0–30%)
                      </Text>
                      <MoistureBar percent={mcPercent} isDark={isDark} />
                    </View>
                    <View style={[styles.colorRow, { backgroundColor: surfaceSecondary }]}>
                      <Text style={[styles.propertyLabel, { color: textSecondary }]}>Drying Time Estimate</Text>
                      <Text style={[styles.propertyValue, { color: textColor }]}>{moisture.drying_time_estimate}</Text>
                    </View>
                    {moisture.tips && moisture.tips.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        <Text style={[styles.propertyLabel, { color: textSecondary }]}>Tips</Text>
                        {moisture.tips.map((tip, i) => (
                          <View key={i} style={styles.tipRow}>
                            <View style={[styles.tipDot, { backgroundColor: COLORS.primary }]} />
                            <Text style={[styles.tipText, { color: textColor }]}>{tip}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[styles.emptyHint, { color: textSecondary }]}>Moisture analysis unavailable</Text>
                )}
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

              {/* ── Lumber Prices Card ── */}
              <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.sectionTitleRow}>
                  <DollarSign size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Lumber Prices</Text>
                </View>
                {lumberLoading ? (
                  <CardSkeleton isDark={isDark} />
                ) : lumberPrices ? (
                  <View style={{ gap: 10 }}>
                    <Text style={[styles.priceRange, { color: textColor }]}>{lumberPrices.price_range}</Text>
                    <View style={[styles.gradeBadge, { backgroundColor: availBadgeBg, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.gradeBadgeText, { color: availBadgeColor }]}>{lumberPrices.availability}</Text>
                    </View>
                    {lumberPrices.price_note ? (
                      <Text style={[styles.priceNote, { color: textSecondary }]}>{lumberPrices.price_note}</Text>
                    ) : null}
                    {lumberPrices.suppliers && lumberPrices.suppliers.length > 0 ? (
                      <View style={{ gap: 4 }}>
                        <Text style={[styles.propertyLabel, { color: textSecondary }]}>Suppliers</Text>
                        <View style={styles.usesChips}>
                          {lumberPrices.suppliers.map((s, i) => (
                            <View key={i} style={[styles.useChip, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
                              <Text style={[styles.useChipText, { color: COLORS.primary }]}>{s}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    <Pressable
                      style={styles.calculateButton}
                      onPress={handleCalculate}
                      accessibilityRole="button"
                      accessibilityLabel="Calculate project cost"
                    >
                      <Calculator size={15} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.calculateButtonText}>Calculate Project Cost →</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={[styles.emptyHint, { color: textSecondary }]}>Price data unavailable</Text>
                    <Pressable
                      style={styles.calculateButton}
                      onPress={handleCalculate}
                      accessibilityRole="button"
                      accessibilityLabel="Open board foot calculator"
                    >
                      <Calculator size={15} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.calculateButtonText}>Board Foot Calculator →</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* ── Joinery & Finishing Card ── */}
              <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.sectionTitleRow}>
                  <Wrench size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Joinery & Finishing</Text>
                </View>
                {joineryLoading ? (
                  <CardSkeleton isDark={isDark} />
                ) : joinery ? (
                  <View style={{ gap: 12 }}>
                    <View style={[styles.gradeBadge, { backgroundColor: joineryBadgeBg, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.gradeBadgeText, { color: joineryBadgeColor }]}>{joinery.difficulty}</Text>
                    </View>
                    {joinery.best_joinery && joinery.best_joinery.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        <Text style={[styles.propertyLabel, { color: textSecondary }]}>Best Joinery Methods</Text>
                        {joinery.best_joinery.map((j, i) => (
                          <View key={i} style={[styles.joineryRow, { backgroundColor: surfaceSecondary }]}>
                            <Text style={[styles.joineryMethod, { color: textColor }]}>{j.method}</Text>
                            <Text style={[styles.joineryReason, { color: textSecondary }]}>{j.reason}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {joinery.finishing && joinery.finishing.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        <Text style={[styles.propertyLabel, { color: textSecondary }]}>Finishing Options</Text>
                        {joinery.finishing.map((f, i) => (
                          <View key={i} style={[styles.joineryRow, { backgroundColor: surfaceSecondary }]}>
                            <Text style={[styles.joineryMethod, { color: textColor }]}>{f.finish}</Text>
                            <Text style={[styles.joineryReason, { color: textSecondary }]}>{f.result}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {joinery.tool_tips ? (
                      <View style={[styles.colorRow, { backgroundColor: surfaceSecondary }]}>
                        <Text style={[styles.propertyLabel, { color: textSecondary }]}>Tool Tips</Text>
                        <Text style={[styles.propertyValue, { color: textColor }]}>{joinery.tool_tips}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[styles.emptyHint, { color: textSecondary }]}>Joinery guide unavailable</Text>
                )}
              </View>

              {/* ── Share to Community ── */}
              <Pressable
                style={[styles.communityButton, { borderColor }]}
                onPress={handleShareToCommunity}
                accessibilityRole="button"
                accessibilityLabel="Share to community"
              >
                <Users size={18} color={COLORS.primary} strokeWidth={2} />
                <Text style={[styles.communityButtonText, { color: COLORS.primary }]}>Share to Community</Text>
              </Pressable>
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

        {/* Community Share Modal */}
        <Modal
          visible={shareModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            console.log('[WoodEye] Community share modal dismissed');
            setShareModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: surfaceColor }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <Users size={20} color={COLORS.primary} strokeWidth={2} />
                <Text style={[styles.modalTitle, { color: textColor }]}>Share to Community</Text>
              </View>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                Let other woodworkers see your scan. Add an optional location.
              </Text>
              <TextInput
                style={[styles.locationInput, { backgroundColor: surfaceSecondary, color: textColor, borderColor }]}
                placeholder="e.g. Oregon, USA"
                placeholderTextColor={textSecondary}
                value={shareLocation}
                onChangeText={setShareLocation}
                returnKeyType="done"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalSkipButton, { borderColor }]}
                  onPress={() => {
                    console.log('[WoodEye] Community share skip pressed');
                    handlePostCommunity('');
                  }}
                  disabled={sharePosting}
                >
                  <Text style={[styles.modalSkipText, { color: textSecondary }]}>Skip</Text>
                </Pressable>
                <Pressable
                  style={styles.modalShareButton}
                  onPress={() => {
                    console.log('[WoodEye] Community share confirm pressed, location:', shareLocation);
                    handlePostCommunity(shareLocation);
                  }}
                  disabled={sharePosting}
                >
                  <LinearGradient
                    colors={['#D2691E', '#8B4513']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalShareGradient}
                  >
                    {sharePosting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalShareText}>Share 🌳</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  imageContainer: { borderRadius: 16, overflow: 'hidden', height: 220, borderCurve: 'continuous' },
  woodImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  loadingCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  loadingTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  loadingSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  skeletonGroup: { width: '100%', gap: 10, marginTop: 8, alignItems: 'center' },
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
  errorTitle: { fontSize: 17, fontWeight: '600' },
  errorMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
    borderCurve: 'continuous',
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  speciesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  speciesCardGradient: { padding: 20, gap: 6 },
  speciesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  speciesLeafIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(139,69,19,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  speciesLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  speciesName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32 },
  commonName: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  confidenceRow: { gap: 6, marginTop: 4 },
  confidenceTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  confidenceContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confidenceTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: '100%', borderRadius: 4 },
  confidenceLabel: { fontSize: 14, fontWeight: '700', minWidth: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  propertiesCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  propertiesGrid: { flexDirection: 'row', gap: 10 },
  propertyItem: { flex: 1, borderRadius: 12, padding: 12, gap: 4, borderCurve: 'continuous' },
  propertyLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  propertyValue: { fontSize: 14, fontWeight: '600' },
  colorRow: { borderRadius: 12, padding: 12, gap: 4, borderCurve: 'continuous' },
  rotBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  rotBadgeText: { fontSize: 13, fontWeight: '600' },
  usesCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  usesChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  useChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  useChipText: { fontSize: 13, fontWeight: '600' },
  funFactCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderCurve: 'continuous' },
  funFactGradient: { padding: 16, gap: 8 },
  funFactHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  funFactLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  funFactText: { fontSize: 14, lineHeight: 21 },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyHint: { fontSize: 13, fontStyle: 'italic' },
  similarGrid: { flexDirection: 'row', gap: 10 },
  similarCard: { flex: 1, borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderCurve: 'continuous' },
  similarSpecies: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1, lineHeight: 17 },
  similarCommon: { fontSize: 11, fontWeight: '500' },
  similarDivider: { height: 1, opacity: 0.4 },
  similarReason: { fontSize: 11, lineHeight: 16 },
  similarMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  similarMetaText: { fontSize: 10, fontWeight: '600', flexShrink: 1 },
  similarMetaDot: { fontSize: 10 },
  recsGrid: { gap: 8 },
  recCard: { borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderCurve: 'continuous' },
  recHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  recProject: { fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: -0.1 },
  suitabilityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderCurve: 'continuous' },
  suitabilityText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  recReason: { fontSize: 12, lineHeight: 17 },
  buyRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
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
  buyChipText: { fontSize: 13, fontWeight: '600' },
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
  offlineTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  offlineMessage: { fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },
  browseLibraryButton: { borderRadius: 14, overflow: 'hidden', width: '100%', borderCurve: 'continuous' },
  browseLibraryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  browseLibraryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  tryAgainButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  tryAgainText: { fontSize: 15, fontWeight: '600' },
  cachedBadgeRow: { gap: 4 },
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
  cachedBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  cachedBadgeNote: { fontSize: 12, fontWeight: '400', paddingHorizontal: 2 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,69,19,0.08)',
  },
  scanAgainButton: { borderRadius: 14, overflow: 'hidden', borderCurve: 'continuous' },
  scanAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  scanAgainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  // CITES
  citesCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
    borderCurve: 'continuous',
  },
  citesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  citesTitleText: { fontSize: 15, fontWeight: '700' },
  citesBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  citesBadgeText: { fontSize: 12, fontWeight: '700' },
  citesRestriction: { fontSize: 14, fontWeight: '600' },
  citesNote: { fontSize: 13, lineHeight: 19 },
  // Grade
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderCurve: 'continuous' },
  gradeBadgeText: { fontSize: 13, fontWeight: '700' },
  gradeConsistency: { fontSize: 13, fontWeight: '500', flex: 1 },
  defectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  defectChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  defectChipText: { fontSize: 12, fontWeight: '600' },
  // Moisture
  readyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  readyBadgeText: { fontSize: 12, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  tipText: { fontSize: 13, lineHeight: 19, flex: 1 },
  // Lumber prices
  priceRange: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  priceNote: { fontSize: 13, lineHeight: 19 },
  calculateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderCurve: 'continuous',
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  calculateButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  // Joinery
  joineryRow: { borderRadius: 10, padding: 10, gap: 3, borderCurve: 'continuous' },
  joineryMethod: { fontSize: 13, fontWeight: '700' },
  joineryReason: { fontSize: 12, lineHeight: 17 },
  // Community
  communityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderCurve: 'continuous',
  },
  communityButtonText: { fontSize: 15, fontWeight: '700' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139,69,19,0.2)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  modalSubtitle: { fontSize: 14, lineHeight: 20 },
  locationInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderCurve: 'continuous',
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalSkipButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  modalSkipText: { fontSize: 15, fontWeight: '600' },
  modalShareButton: { flex: 2, borderRadius: 12, overflow: 'hidden', borderCurve: 'continuous' },
  modalShareGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalShareText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
