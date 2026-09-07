import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Animated,
  useColorScheme,
  ImageSourcePropType,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Leaf,
  BookOpen,
  WifiOff,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPECIES_CACHE, CachedSpecies } from '@/utils/woodCache';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

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
  amber: '#B45309',
  amberBg: 'rgba(180,83,9,0.1)',
};

interface SpeciesCardProps {
  item: CachedSpecies;
  isDark: boolean;
  textColor: string;
  textSecondary: string;
  surfaceColor: string;
  surfaceSecondary: string;
  borderColor: string;
}

function SpeciesCard({
  item,
  isDark,
  textColor,
  textSecondary,
  surfaceColor,
  surfaceSecondary,
  borderColor,
}: SpeciesCardProps) {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handleToggle = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    console.log('[WoodEye] Species card toggled:', item.common_name, '- expanding:', !expanded);
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue,
        useNativeDriver: false,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setExpanded(!expanded);
  }, [expanded, item.common_name]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const rotResistantColor = item.rot_resistant ? COLORS.success : textSecondary;
  const rotResistantBg = item.rot_resistant
    ? isDark
      ? 'rgba(22,163,74,0.2)'
      : 'rgba(22,163,74,0.1)'
    : isDark
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0.04)';
  const rotResistantText = item.rot_resistant ? 'Rot Resistant ✓' : 'Not Rot Resistant';

  return (
    <Pressable
      style={[styles.speciesCard, { backgroundColor: surfaceColor, borderColor }]}
      onPress={handleToggle}
      accessibilityRole="button"
      accessibilityLabel={`${item.common_name}, ${item.species}. Tap to ${expanded ? 'collapse' : 'expand'}`}
    >
      {/* Card header — always visible */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.leafIcon, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
            <Leaf size={14} color={COLORS.primary} strokeWidth={2} />
          </View>
          <View style={styles.cardTitles}>
            <Text style={[styles.commonNameText, { color: textColor }]} numberOfLines={1}>
              {item.common_name}
            </Text>
            <Text style={[styles.speciesNameText, { color: textSecondary }]} numberOfLines={1}>
              {item.species}
            </Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={[styles.rotBadge, { backgroundColor: rotResistantBg }]}>
            <Text style={[styles.rotBadgeText, { color: rotResistantColor }]} numberOfLines={1}>
              {rotResistantText}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <ChevronDown size={16} color={textSecondary} strokeWidth={2} />
          </Animated.View>
        </View>
      </View>

      {/* Meta row — always visible */}
      <View style={styles.metaRow}>
        <View style={[styles.metaChip, { backgroundColor: isDark ? 'rgba(139,69,19,0.15)' : 'rgba(139,69,19,0.07)' }]}>
          <Text style={[styles.metaChipText, { color: COLORS.primary }]} numberOfLines={1}>
            {item.origin}
          </Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.metaChipText, { color: textSecondary }]} numberOfLines={1}>
            {item.hardness}
          </Text>
        </View>
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={[styles.expandedContent, { borderTopColor: borderColor }]}>
          {/* Grain & Color */}
          <View style={styles.detailGrid}>
            <View style={[styles.detailItem, { backgroundColor: surfaceSecondary }]}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Grain</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{item.grain}</Text>
            </View>
          </View>
          <View style={[styles.colorRow, { backgroundColor: surfaceSecondary }]}>
            <Text style={[styles.detailLabel, { color: textSecondary }]}>Color</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{item.color_description}</Text>
          </View>

          {/* Common uses */}
          <View style={styles.usesSection}>
            <Text style={[styles.detailLabel, { color: textSecondary }]}>Common Uses</Text>
            <View style={styles.usesChips}>
              {item.common_uses.map((use, i) => (
                <View
                  key={i}
                  style={[styles.useChip, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}
                >
                  <Text style={[styles.useChipText, { color: COLORS.primary }]}>{use}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Fun fact */}
          <View style={[styles.funFactBox, { borderColor: COLORS.accent }]}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(210,105,30,0.2)', 'rgba(139,69,19,0.1)']
                  : ['rgba(210,105,30,0.08)', 'rgba(139,69,19,0.04)']
              }
              style={styles.funFactGradient}
            >
              <Text style={[styles.funFactLabel, { color: COLORS.accent }]}>Did you know?</Text>
              <Text style={[styles.funFactText, { color: textColor }]}>{item.fun_fact}</Text>
            </LinearGradient>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function SpeciesLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const surfaceSecondary = isDark ? COLORS.surfaceSecondaryDark : COLORS.surfaceSecondary;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const queryLower = query.toLowerCase();
  const filtered = queryLower
    ? SPECIES_CACHE.filter(
        (s) =>
          s.common_name.toLowerCase().includes(queryLower) ||
          s.species.toLowerCase().includes(queryLower) ||
          s.origin.toLowerCase().includes(queryLower) ||
          s.keywords.some((k) => k.toLowerCase().includes(queryLower))
      )
    : SPECIES_CACHE;

  const handleBack = useCallback(() => {
    console.log('[WoodEye] Back pressed from Species Library');
    router.back();
  }, [router]);

  const handleSearchChange = useCallback((text: string) => {
    console.log('[WoodEye] Species Library search query changed:', text);
    setQuery(text);
  }, []);

  const speciesCount = SPECIES_CACHE.length;
  const filteredCount = filtered.length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#3D1A0A', '#1A0F0A'] : ['#8B4513', '#D2691E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.headerIconWrap}>
                <BookOpen size={18} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Species Library</Text>
                <Text style={styles.headerSubtitle}>
                  {speciesCount}+ species · Works offline
                </Text>
              </View>
            </View>
            <View style={styles.offlineBadge}>
              <WifiOff size={12} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }]}>
            <Search size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, origin, color..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={query}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        </LinearGradient>

        {/* Results count */}
        <View style={[styles.resultsBar, { backgroundColor: surfaceSecondary, borderBottomColor: borderColor }]}>
          <Text style={[styles.resultsText, { color: textSecondary }]}>
            {query
              ? `${filteredCount} result${filteredCount !== 1 ? 's' : ''} for "${query}"`
              : `${speciesCount} species · Tap any card to expand`}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
                <Search size={28} color={COLORS.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>No species found</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                Try searching by common name, scientific name, or origin
              </Text>
            </View>
          ) : (
            filtered.map((item, index) => (
              <SpeciesCard
                key={`${item.species}-${index}`}
                item={item}
                isDark={isDark}
                textColor={textColor}
                textSecondary={textSecondary}
                surfaceColor={surfaceColor}
                surfaceSecondary={surfaceSecondary}
                borderColor={borderColor}
              />
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offlineBadgeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  speciesCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  leafIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  commonNameText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  speciesNameText: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  rotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 120,
  },
  rotBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '60%',
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  detailGrid: {
    gap: 8,
  },
  detailItem: {
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  colorRow: {
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  usesSection: {
    gap: 8,
  },
  usesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  useChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  useChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  funFactBox: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  funFactGradient: {
    padding: 12,
    gap: 6,
  },
  funFactLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  funFactText: {
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
