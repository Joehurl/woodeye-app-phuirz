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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Heart, Leaf } from 'lucide-react-native';
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
  success: '#16A34A',
};

interface FavoriteItem {
  species: string;
  common_name: string;
  hardness: string;
  origin?: string;
  rot_resistant?: boolean;
  favorited_at?: string;
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
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '55%', height: 16, backgroundColor: bg }]} />
        <View style={[styles.skeletonLine, { width: '38%', height: 12, backgroundColor: bg }]} />
        <View style={[styles.skeletonLine, { width: '45%', height: 11, backgroundColor: bg }]} />
      </View>
      <View style={[styles.skeletonHeart, { backgroundColor: bg }]} />
    </Animated.View>
  );
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

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingSpecies, setRemovingSpecies] = useState<string | null>(null);

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const surfaceSecondary = isDark ? COLORS.surfaceSecondaryDark : COLORS.surfaceSecondary;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    console.log('[WoodEye] Fetching favorites...');

    try {
      const deviceId = await getOrCreateDeviceId();
      console.log('[WoodEye] Fetching favorites for device:', deviceId);

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WoodEye] get-favorites error:', errorText);
        throw new Error(`Server error ${response.status}`);
      }

      const data = await response.json();
      const favList: FavoriteItem[] = data.favorites || [];
      console.log('[WoodEye] Loaded', favList.length, 'favorites');
      setFavorites(favList);
    } catch (e: any) {
      console.error('[WoodEye] Failed to fetch favorites:', e);
      setError(e.message || 'Could not load favorites.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUnfavorite = useCallback(async (item: FavoriteItem) => {
    console.log('[WoodEye] Unfavorite pressed for:', item.species);
    setRemovingSpecies(item.species);
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
          species: item.species,
          common_name: item.common_name,
          hardness: item.hardness,
          origin: item.origin,
          rot_resistant: item.rot_resistant,
        }),
      });
      console.log('[WoodEye] toggle-favorite (unfavorite) response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[WoodEye] toggle-favorite error:', errText);
        return;
      }
      const data = await response.json();
      console.log('[WoodEye] Unfavorited, new state:', data.favorited);
      if (!data.favorited) {
        setFavorites((prev) => prev.filter((f) => f.species !== item.species));
      }
    } catch (e: any) {
      console.error('[WoodEye] Failed to unfavorite:', e);
    } finally {
      setRemovingSpecies(null);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('[WoodEye] Pull-to-refresh triggered on favorites');
    fetchFavorites(true);
  }, []);

  const renderItem = ({ item, index }: { item: FavoriteItem; index: number }) => {
    const isRemoving = removingSpecies === item.species;
    const rotResistantText = item.rot_resistant === true
      ? 'Rot Resistant'
      : item.rot_resistant === false
      ? 'Not Rot Resistant'
      : null;
    const rotColor = item.rot_resistant ? COLORS.success : textSecondary;
    const rotBg = item.rot_resistant
      ? (isDark ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.1)')
      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)');

    return (
      <AnimatedListItem index={index}>
        <View style={[styles.favCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.favCardContent}>
            <Text style={[styles.favSpecies, { color: textColor }]} numberOfLines={1}>
              {item.species}
            </Text>
            <Text style={[styles.favCommon, { color: textSecondary }]} numberOfLines={1}>
              {item.common_name}
            </Text>
            <View style={styles.favMeta}>
              <View style={[styles.hardnessBadge, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
                <Text style={[styles.hardnessBadgeText, { color: COLORS.primary }]}>
                  {item.hardness}
                </Text>
              </View>
              {item.origin ? (
                <Text style={[styles.favOrigin, { color: textSecondary }]} numberOfLines={1}>
                  {item.origin}
                </Text>
              ) : null}
            </View>
            {rotResistantText ? (
              <View style={[styles.rotBadge, { backgroundColor: rotBg, alignSelf: 'flex-start' }]}>
                <Text style={[styles.rotBadgeText, { color: rotColor }]}>
                  {rotResistantText}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            style={styles.heartButton}
            onPress={() => handleUnfavorite(item)}
            disabled={isRemoving}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.species} from favorites`}
          >
            <Heart
              size={22}
              color={isRemoving ? textSecondary : '#E53E3E'}
              strokeWidth={2}
              fill={isRemoving ? 'none' : '#E53E3E'}
            />
          </Pressable>
        </View>
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
            <Heart size={20} color="#FFFFFF" strokeWidth={2} fill="rgba(255,255,255,0.3)" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Favorites</Text>
            <Text style={styles.headerSubtitle}>
              {favorites.length > 0
                ? `${favorites.length} saved wood${favorites.length === 1 ? '' : 's'}`
                : 'Your saved species'}
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
      <Text style={[styles.emptyTitle, { color: textColor }]}>No favorites yet</Text>
      <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
        Tap the heart on any scan result to save it
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
            <Text style={[styles.errorTitle, { color: textColor }]}>Couldn't load favorites</Text>
            <Text style={[styles.errorMessage, { color: textSecondary }]}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                console.log('[WoodEye] Retry fetch favorites pressed');
                fetchFavorites();
              }}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.species}
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
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  favCardContent: {
    flex: 1,
    gap: 5,
  },
  favSpecies: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  favCommon: {
    fontSize: 13,
    fontWeight: '500',
  },
  favMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  hardnessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  hardnessBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  favOrigin: {
    fontSize: 12,
    fontWeight: '400',
    flexShrink: 1,
  },
  rotBadge: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rotBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heartButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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
    padding: 14,
    gap: 12,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    borderRadius: 6,
  },
  skeletonHeart: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
