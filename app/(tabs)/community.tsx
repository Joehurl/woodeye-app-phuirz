import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Users, Heart, MapPin, Leaf } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SUPABASE_URL = 'https://owcjjbrmmjgwfrhysavz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93Y2pqYnJtbWpnd2ZyaHlzYXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTU4NDcsImV4cCI6MjEwNDAzMTg0N30.eLkFGUDF17ax1upsCOaScq85ljdzW-_tG74JAO7iJrY';
const DEVICE_ID_KEY = 'woodeye_device_id';
const PAGE_SIZE = 20;

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

interface CommunityScan {
  id: string;
  species: string;
  common_name: string;
  confidence: number;
  origin?: string;
  location_label?: string;
  created_at: string;
  likes_count: number;
  liked_by_me?: boolean;
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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function confidenceColor(c: number): string {
  if (c >= 80) return COLORS.success;
  if (c >= 60) return COLORS.warning;
  return COLORS.accent;
}

function ScanCard({
  item,
  isDark,
  textColor,
  textSecondary,
  surfaceColor,
  borderColor,
  onLike,
}: {
  item: CommunityScan;
  isDark: boolean;
  textColor: string;
  textSecondary: string;
  surfaceColor: string;
  borderColor: string;
  onLike: (id: string) => void;
}) {
  const confColor = confidenceColor(Number(item.confidence));
  const confBg = isDark ? `${confColor}33` : `${confColor}18`;
  const confPct = Math.round(Number(item.confidence));
  const timeStr = timeAgo(item.created_at);
  const likeColor = item.liked_by_me ? '#E53E3E' : textSecondary;
  const likeFill = item.liked_by_me ? '#E53E3E' : 'none';

  return (
    <View style={[styles.scanCard, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardSpeciesWrap}>
          <View style={[styles.cardLeafIcon, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
            <Leaf size={14} color={COLORS.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardSpecies, { color: textColor }]} numberOfLines={1}>{item.species}</Text>
            <Text style={[styles.cardCommon, { color: textSecondary }]} numberOfLines={1}>{item.common_name}</Text>
          </View>
        </View>
        <View style={[styles.confBadge, { backgroundColor: confBg }]}>
          <Text style={[styles.confBadgeText, { color: confColor }]}>{confPct}%</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        {item.location_label ? (
          <View style={styles.metaItem}>
            <MapPin size={12} color={textSecondary} strokeWidth={2} />
            <Text style={[styles.metaText, { color: textSecondary }]}>{item.location_label}</Text>
          </View>
        ) : null}
        {item.origin ? (
          <View style={styles.metaItem}>
            <Text style={[styles.metaText, { color: textSecondary }]}>{item.origin}</Text>
          </View>
        ) : null}
        <Text style={[styles.metaTime, { color: textSecondary }]}>{timeStr}</Text>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: borderColor }]} />

      <Pressable
        style={styles.likeRow}
        onPress={() => {
          console.log('[WoodEye] Community: like pressed for scan:', item.id, 'currently liked:', item.liked_by_me);
          onLike(item.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={item.liked_by_me ? 'Unlike' : 'Like'}
      >
        <Heart size={16} color={likeColor} strokeWidth={2} fill={likeFill} />
        <Text style={[styles.likeCount, { color: likeColor }]}>{item.likes_count}</Text>
      </Pressable>
    </View>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [scans, setScans] = useState<CommunityScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const deviceIdRef = useRef('');

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const fetchFeed = useCallback(async (offset: number, replace: boolean) => {
    console.log('[WoodEye] Community: fetching feed, offset:', offset, 'replace:', replace);
    try {
      const deviceId = await getOrCreateDeviceId();
      deviceIdRef.current = deviceId;
      const url = `${SUPABASE_URL}/functions/v1/get-community-feed?limit=${PAGE_SIZE}&offset=${offset}&device_id=${encodeURIComponent(deviceId)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
      console.log('[WoodEye] Community: get-community-feed response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] Community: feed error:', errText);
        return;
      }
      const data = await response.json();
      const items: CommunityScan[] = data.scans || [];
      console.log('[WoodEye] Community: loaded', items.length, 'scans');
      if (replace) {
        setScans(items);
      } else {
        setScans((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === PAGE_SIZE);
      offsetRef.current = offset + items.length;
    } catch (e: any) {
      console.error('[WoodEye] Community: failed to fetch feed:', e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      offsetRef.current = 0;
      await fetchFeed(0, true);
      setLoading(false);
    };
    init();
  }, []);

  const handleRefresh = useCallback(async () => {
    console.log('[WoodEye] Community: pull-to-refresh triggered');
    setRefreshing(true);
    offsetRef.current = 0;
    await fetchFeed(0, true);
    setRefreshing(false);
  }, [fetchFeed]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    console.log('[WoodEye] Community: load more triggered, offset:', offsetRef.current);
    setLoadingMore(true);
    await fetchFeed(offsetRef.current, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchFeed]);

  const handleLike = useCallback(async (scanId: string) => {
    const deviceId = deviceIdRef.current || (await getOrCreateDeviceId());
    console.log('[WoodEye] Community: toggling like for scan:', scanId, 'device:', deviceId);
    // Optimistic update
    setScans((prev) =>
      prev.map((s) =>
        s.id === scanId
          ? {
              ...s,
              liked_by_me: !s.liked_by_me,
              likes_count: s.liked_by_me ? s.likes_count - 1 : s.likes_count + 1,
            }
          : s
      )
    );
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/toggle-community-like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ scan_id: scanId, device_id: deviceId }),
      });
      console.log('[WoodEye] Community: toggle-community-like response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] Community: toggle like error:', errText);
        // Revert optimistic update
        setScans((prev) =>
          prev.map((s) =>
            s.id === scanId
              ? {
                  ...s,
                  liked_by_me: !s.liked_by_me,
                  likes_count: s.liked_by_me ? s.likes_count - 1 : s.likes_count + 1,
                }
              : s
          )
        );
      }
    } catch (e: any) {
      console.error('[WoodEye] Community: failed to toggle like:', e);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CommunityScan }) => (
      <ScanCard
        item={item}
        isDark={isDark}
        textColor={textColor}
        textSecondary={textSecondary}
        surfaceColor={surfaceColor}
        borderColor={borderColor}
        onLike={handleLike}
      />
    ),
    [isDark, textColor, textSecondary, surfaceColor, borderColor, handleLike]
  );

  const keyExtractor = useCallback((item: CommunityScan) => item.id, []);

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
        <Users size={32} color={COLORS.primary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: textColor }]}>No community scans yet</Text>
      <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
        Be the first to share! Scan a wood species and tap "Share to Community".
      </Text>
    </View>
  );

  const ListFooter = () =>
    loadingMore ? (
      <View style={styles.loadMoreIndicator}>
        <ActivityIndicator color={COLORS.primary} size="small" />
      </View>
    ) : null;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
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
              <Users size={20} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Community</Text>
              <Text style={styles.headerSubtitle}>Wood scans from around the world</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={[styles.loadingText, { color: textSecondary }]}>Loading community scans...</Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
            scans.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
  listContentEmpty: { flex: 1 },
  scanCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardSpeciesWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLeafIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  cardSpecies: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  cardCommon: { fontSize: 12, fontWeight: '500' },
  confBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  confBadgeText: { fontSize: 12, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  metaTime: { fontSize: 12, fontWeight: '400', marginLeft: 'auto' },
  cardDivider: { height: 1, opacity: 0.4 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  likeCount: { fontSize: 13, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32, paddingTop: 60 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  loadMoreIndicator: { paddingVertical: 20, alignItems: 'center' },
});
