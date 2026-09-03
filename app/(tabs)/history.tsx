import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Pressable,
  RefreshControl,
  useColorScheme,
  ImageSourcePropType,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Clock, Leaf, ChevronRight, TreePine } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  image_url?: string;
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

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Unknown date';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 2) return 'Yesterday';
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Unknown date';
  }
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function SkeletonCard({ isDark }: { isDark: boolean }) {
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
    <Animated.View style={[styles.skeletonCard, { backgroundColor: isDark ? '#2A1810' : '#FFFFFF', opacity }]}>
      <View style={[styles.skeletonThumb, { backgroundColor: bg }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '60%', height: 16, backgroundColor: bg }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 12, backgroundColor: bg }]} />
        <View style={[styles.skeletonLine, { width: '30%', height: 11, backgroundColor: bg }]} />
      </View>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const surfaceSecondary = isDark ? COLORS.surfaceSecondaryDark : COLORS.surfaceSecondary;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    console.log('[WoodEye] Fetching scan history...');

    try {
      const deviceId = await getOrCreateDeviceId();
      console.log('[WoodEye] Fetching history for device:', deviceId);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-scan-history?device_id=${encodeURIComponent(deviceId)}`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );

      console.log('[WoodEye] get-scan-history response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WoodEye] get-scan-history error:', errorText);
        throw new Error(`Server error ${response.status}`);
      }

      const data = await response.json();
      const scanList: ScanResult[] = data.scans || [];
      console.log('[WoodEye] Loaded', scanList.length, 'scans from history');
      setScans(scanList);
    } catch (e: any) {
      console.error('[WoodEye] Failed to fetch history:', e);
      setError(e.message || 'Could not load scan history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    console.log('[WoodEye] Pull-to-refresh triggered on history');
    fetchHistory(true);
  }, []);

  const handleItemPress = useCallback((scan: ScanResult) => {
    const id = scan.id || scan.scanned_at || '';
    console.log('[WoodEye] History item pressed:', scan.species, 'id:', id);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const confidenceColor = (c: number) =>
    c >= 80 ? '#16A34A' : c >= 60 ? '#D97706' : COLORS.accent;

  const renderItem = ({ item, index }: { item: ScanResult; index: number }) => {
    const itemId = item.id || item.scanned_at || String(index);
    const isExpanded = expandedId === itemId;
    const dateText = formatDate(item.scanned_at);
    const confidenceNum = Number(item.confidence);
    const confColor = confidenceColor(confidenceNum);
    const confidenceText = `${Math.round(confidenceNum)}%`;

    return (
      <AnimatedListItem index={index}>
        <Pressable
          style={[styles.scanItem, { backgroundColor: surfaceColor, borderColor }]}
          onPress={() => handleItemPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${item.species}`}
        >
          {/* Thumbnail */}
          <View style={[styles.thumbContainer, { backgroundColor: surfaceSecondary }]}>
            {item.image_url ? (
              <Image
                source={resolveImageSource(item.image_url)}
                style={styles.thumbImage}
                resizeMode="cover"
              />
            ) : (
              <TreePine size={24} color={COLORS.primary} strokeWidth={1.5} />
            )}
          </View>

          {/* Content */}
          <View style={styles.scanItemContent}>
            <Text style={[styles.scanSpecies, { color: textColor }]} numberOfLines={1}>
              {item.species}
            </Text>
            <Text style={[styles.scanCommonName, { color: textSecondary }]} numberOfLines={1}>
              {item.common_name}
            </Text>
            <View style={styles.scanMeta}>
              <View style={[styles.confidenceBadge, { backgroundColor: `${confColor}18` }]}>
                <Text style={[styles.confidenceBadgeText, { color: confColor }]}>
                  {confidenceText}
                </Text>
              </View>
              <Text style={[styles.scanDate, { color: textSecondary }]}>{dateText}</Text>
            </View>
          </View>

          <ChevronRight
            size={16}
            color={textSecondary}
            strokeWidth={2}
            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
          />
        </Pressable>

        {/* Expanded detail */}
        {isExpanded && (
          <View style={[styles.expandedDetail, { backgroundColor: surfaceSecondary, borderColor }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Grain</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{item.grain}</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: borderColor }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Hardness</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{item.hardness}</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: borderColor }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Color</Text>
              <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={2}>{item.color_description}</Text>
            </View>
            {item.common_uses && item.common_uses.length > 0 && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: borderColor }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>Uses</Text>
                  <Text style={[styles.detailValue, { color: textColor }]} numberOfLines={2}>
                    {item.common_uses.join(', ')}
                  </Text>
                </View>
              </>
            )}
            {item.fun_fact ? (
              <>
                <View style={[styles.detailDivider, { backgroundColor: borderColor }]} />
                <View style={[styles.funFactMini, { backgroundColor: isDark ? 'rgba(210,105,30,0.15)' : 'rgba(210,105,30,0.07)' }]}>
                  <Text style={[styles.funFactMiniText, { color: textColor }]}>{item.fun_fact}</Text>
                </View>
              </>
            ) : null}
          </View>
        )}
      </AnimatedListItem>
    );
  };

  const ListHeader = () => (
    <View style={[styles.listHeader, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? ['#3D1A0A', '#1A0F0A'] : ['#8B4513', '#D2691E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Clock size={20} color="#FFFFFF" strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Scan History</Text>
            <Text style={styles.headerSubtitle}>
              {scans.length > 0 ? `${scans.length} wood${scans.length === 1 ? '' : 's'} identified` : 'Your past identifications'}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
        <Leaf size={32} color={COLORS.primary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: textColor }]}>No scans yet</Text>
      <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
        Your wood identifications will appear here after your first scan
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {loading && !refreshing ? (
        <>
          <ListHeader />
          <View style={styles.skeletonList}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} isDark={isDark} />
            ))}
          </View>
        </>
      ) : error ? (
        <>
          <ListHeader />
          <View style={styles.errorState}>
            <Text style={[styles.errorTitle, { color: textColor }]}>Couldn't load history</Text>
            <Text style={[styles.errorMessage, { color: textSecondary }]}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                console.log('[WoodEye] Retry fetch history pressed');
                fetchHistory();
              }}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item, index) => item.id || item.scanned_at || String(index)}
          renderItem={renderItem}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listHeader: {
    marginBottom: 16,
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
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  thumbContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  scanItemContent: {
    flex: 1,
    gap: 3,
  },
  scanSpecies: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scanCommonName: {
    fontSize: 13,
    fontWeight: '500',
  },
  scanMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confidenceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  scanDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  expandedDetail: {
    borderRadius: 12,
    marginTop: 4,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    borderCurve: 'continuous',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    minWidth: 70,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    opacity: 0.5,
  },
  funFactMini: {
    borderRadius: 8,
    padding: 10,
    borderCurve: 'continuous',
  },
  funFactMiniText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  errorState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
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
  skeletonList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  skeletonCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  skeletonThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    borderRadius: 6,
  },
});
