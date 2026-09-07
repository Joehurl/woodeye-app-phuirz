import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Image,
  Share,
  useColorScheme,
  ImageSourcePropType,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Leaf,
  Zap,
  Share2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  image_url?: string;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
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

export default function HistoryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { scan: scanParam } = useLocalSearchParams<{ scan: string }>();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const result: ScanResult | null = React.useMemo(() => {
    if (!scanParam) return null;
    try {
      return JSON.parse(scanParam) as ScanResult;
    } catch {
      return null;
    }
  }, [scanParam]);

  useEffect(() => {
    if (result) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [result]);

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const surfaceSecondary = isDark ? COLORS.surfaceSecondaryDark : COLORS.surfaceSecondary;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const handleBack = useCallback(() => {
    console.log('[WoodEye] Back pressed from history-detail');
    router.back();
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    console.log('[WoodEye] Share pressed from history-detail for:', result.species);
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

  if (!result) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={[styles.errorText, { color: textSecondary }]}>Could not load scan details.</Text>
        </View>
      </>
    );
  }

  const confidenceNum = Number(result.confidence);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            style={styles.headerButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back to scan history"
          >
            <ArrowLeft size={22} color={COLORS.primary} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: textColor }]}>Scan History</Text>
          <Pressable
            style={styles.headerButton}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share this scan"
          >
            <Share2 size={20} color={COLORS.primary} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, gap: 16 }}>
            {/* Photo */}
            {result.image_url ? (
              <View style={styles.imageContainer}>
                <Image
                  source={resolveImageSource(result.image_url)}
                  style={styles.woodImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)']}
                  style={styles.imageOverlay}
                />
              </View>
            ) : null}

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
                  <ConfidenceBar confidence={confidenceNum} isDark={isDark} />
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
          </Animated.View>
        </ScrollView>
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
  headerButton: {
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
  scroll: { flex: 1 },
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
  woodImage: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  speciesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  speciesCardGradient: { padding: 20, gap: 6 },
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
  confidenceRow: { gap: 6, marginTop: 4 },
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
  confidenceFill: { height: '100%', borderRadius: 4 },
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
  propertiesGrid: { flexDirection: 'row', gap: 10 },
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
  propertyValue: { fontSize: 14, fontWeight: '600' },
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
  funFactCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderCurve: 'continuous',
  },
  funFactGradient: { padding: 16, gap: 8 },
  funFactHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  funFactLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  funFactText: { fontSize: 14, lineHeight: 21 },
  errorText: { fontSize: 15, fontWeight: '500' },
});
