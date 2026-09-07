import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, GitCompare, Plus, X, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPECIES_CACHE, CachedSpecies } from '@/utils/woodCache';

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

const USER_CACHE_INDEX_KEY = 'woodeye_cache_index';
const USER_CACHE_KEY_PREFIX = 'woodeye_cache_';

interface WoodItem {
  species: string;
  common_name: string;
  hardness: string;
  origin: string;
  rot_resistant: boolean;
  grain: string;
  color_description: string;
  common_uses: string[];
}

type SlotKey = 'a' | 'b';

function parseJankaValue(hardness: string): number {
  const match = hardness.match(/(\d[\d,]*)\s*lbf/i);
  if (match) return parseInt(match[1].replace(/,/g, ''), 10);
  const lower = hardness.toLowerCase();
  if (lower.includes('extremely hard')) return 3500;
  if (lower.includes('very hard')) return 2000;
  if (lower.includes('hard')) return 1200;
  if (lower.includes('medium')) return 800;
  if (lower.includes('soft')) return 400;
  return 0;
}

function CompareRow({
  label,
  valueA,
  valueB,
  highlightA,
  highlightB,
  isDark,
  textColor,
  textSecondary,
  surfaceSecondary,
  borderColor,
}: {
  label: string;
  valueA: string;
  valueB: string;
  highlightA: boolean;
  highlightB: boolean;
  isDark: boolean;
  textColor: string;
  textSecondary: string;
  surfaceSecondary: string;
  borderColor: string;
}) {
  const highlightBg = isDark ? 'rgba(22,163,74,0.18)' : 'rgba(22,163,74,0.1)';
  const highlightColor = COLORS.success;

  return (
    <View style={[styles.compareRow, { borderColor }]}>
      <Text style={[styles.compareRowLabel, { color: textSecondary }]}>{label}</Text>
      <View style={styles.compareRowValues}>
        <View style={[styles.compareCell, { backgroundColor: highlightA ? highlightBg : surfaceSecondary }]}>
          <Text
            style={[styles.compareCellText, { color: highlightA ? highlightColor : textColor }]}
            numberOfLines={2}
          >
            {valueA}
          </Text>
          {highlightA ? <Check size={12} color={highlightColor} strokeWidth={2.5} /> : null}
        </View>
        <View style={[styles.compareCell, { backgroundColor: highlightB ? highlightBg : surfaceSecondary }]}>
          <Text
            style={[styles.compareCellText, { color: highlightB ? highlightColor : textColor }]}
            numberOfLines={2}
          >
            {valueB}
          </Text>
          {highlightB ? <Check size={12} color={highlightColor} strokeWidth={2.5} /> : null}
        </View>
      </View>
    </View>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [woodA, setWoodA] = useState<WoodItem | null>(null);
  const [woodB, setWoodB] = useState<WoodItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<SlotKey>('a');
  const [modalTab, setModalTab] = useState<'library' | 'history'>('library');
  const [historyItems, setHistoryItems] = useState<WoodItem[]>([]);

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const surfaceSecondary = isDark ? COLORS.surfaceSecondaryDark : COLORS.surfaceSecondary;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const loadHistory = useCallback(async () => {
    console.log('[WoodEye] Compare: loading history items from cache');
    try {
      const indexRaw = await AsyncStorage.getItem(USER_CACHE_INDEX_KEY);
      if (!indexRaw) return;
      const keys: string[] = JSON.parse(indexRaw);
      const items: WoodItem[] = [];
      for (const key of keys) {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            items.push({
              species: parsed.species,
              common_name: parsed.common_name,
              hardness: parsed.hardness || '',
              origin: parsed.origin || '',
              rot_resistant: !!parsed.rot_resistant,
              grain: parsed.grain || '',
              color_description: parsed.color_description || '',
              common_uses: parsed.common_uses || [],
            });
          } catch {}
        }
      }
      console.log('[WoodEye] Compare: loaded', items.length, 'history items');
      setHistoryItems(items);
    } catch (e) {
      console.error('[WoodEye] Compare: failed to load history:', e);
    }
  }, []);

  const openModal = useCallback((slot: SlotKey) => {
    console.log('[WoodEye] Compare: opening picker for slot', slot);
    setActiveSlot(slot);
    setModalTab('library');
    loadHistory();
    setModalVisible(true);
  }, [loadHistory]);

  const selectWood = useCallback((item: WoodItem) => {
    console.log('[WoodEye] Compare: selected wood', item.species, 'for slot', activeSlot);
    if (activeSlot === 'a') setWoodA(item);
    else setWoodB(item);
    setModalVisible(false);
  }, [activeSlot]);

  const handleBack = useCallback(() => {
    console.log('[WoodEye] Compare: back pressed');
    router.back();
  }, [router]);

  const libraryItems: WoodItem[] = SPECIES_CACHE.map((s) => ({
    species: s.species,
    common_name: s.common_name,
    hardness: s.hardness,
    origin: s.origin,
    rot_resistant: s.rot_resistant,
    grain: s.grain,
    color_description: s.color_description,
    common_uses: s.common_uses,
  }));

  const jankaA = woodA ? parseJankaValue(woodA.hardness) : 0;
  const jankaB = woodB ? parseJankaValue(woodB.hardness) : 0;
  const hardnessHighlightA = jankaA > jankaB;
  const hardnessHighlightB = jankaB > jankaA;

  const rotHighlightA = woodA ? woodA.rot_resistant && !(woodB?.rot_resistant) : false;
  const rotHighlightB = woodB ? woodB.rot_resistant && !(woodA?.rot_resistant) : false;
  const rotBothResistant = woodA?.rot_resistant && woodB?.rot_resistant;

  const rotValueA = woodA ? (woodA.rot_resistant ? '✓ Yes' : '✗ No') : '—';
  const rotValueB = woodB ? (woodB.rot_resistant ? '✓ Yes' : '✗ No') : '—';

  const usesA = woodA ? woodA.common_uses.slice(0, 2).join(', ') : '—';
  const usesB = woodB ? woodB.common_uses.slice(0, 2).join(', ') : '—';

  const listData = modalTab === 'library' ? libraryItems : historyItems;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.headerButton} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={22} color={COLORS.primary} strokeWidth={2} />
          </Pressable>
          <View style={styles.headerCenter}>
            <GitCompare size={18} color={COLORS.primary} strokeWidth={2} />
            <Text style={[styles.headerTitle, { color: textColor }]}>Compare Woods</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Slot pickers */}
          <View style={styles.slotsRow}>
            {(['a', 'b'] as SlotKey[]).map((slot) => {
              const wood = slot === 'a' ? woodA : woodB;
              const label = slot === 'a' ? 'Wood A' : 'Wood B';
              return (
                <Pressable
                  key={slot}
                  style={[styles.slot, { backgroundColor: surfaceColor, borderColor }]}
                  onPress={() => openModal(slot)}
                  accessibilityRole="button"
                  accessibilityLabel={wood ? `Change ${label}: ${wood.common_name}` : `Choose ${label}`}
                >
                  {wood ? (
                    <View style={styles.slotFilled}>
                      <Text style={[styles.slotSpecies, { color: textColor }]} numberOfLines={2}>{wood.species}</Text>
                      <Text style={[styles.slotCommon, { color: textSecondary }]} numberOfLines={1}>{wood.common_name}</Text>
                      <View style={[styles.slotChangeBadge, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
                        <Text style={[styles.slotChangeText, { color: COLORS.primary }]}>Tap to change</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.slotEmpty}>
                      <View style={[styles.slotPlusCircle, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
                        <Plus size={22} color={COLORS.primary} strokeWidth={2} />
                      </View>
                      <Text style={[styles.slotLabel, { color: textSecondary }]}>{label}</Text>
                      <Text style={[styles.slotHint, { color: textSecondary }]}>Choose a species</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Comparison table */}
          {woodA && woodB ? (
            <View style={[styles.tableCard, { backgroundColor: surfaceColor, borderColor }]}>
              {/* Column headers */}
              <View style={[styles.tableHeader, { borderColor }]}>
                <View style={styles.tableHeaderLabel} />
                <View style={styles.tableHeaderValues}>
                  <Text style={[styles.tableHeaderText, { color: COLORS.primary }]} numberOfLines={1}>{woodA.common_name}</Text>
                  <Text style={[styles.tableHeaderText, { color: COLORS.primary }]} numberOfLines={1}>{woodB.common_name}</Text>
                </View>
              </View>

              <CompareRow
                label="Hardness"
                valueA={woodA.hardness}
                valueB={woodB.hardness}
                highlightA={hardnessHighlightA}
                highlightB={hardnessHighlightB}
                isDark={isDark}
                textColor={textColor}
                textSecondary={textSecondary}
                surfaceSecondary={surfaceSecondary}
                borderColor={borderColor}
              />
              <CompareRow
                label="Origin"
                valueA={woodA.origin || '—'}
                valueB={woodB.origin || '—'}
                highlightA={false}
                highlightB={false}
                isDark={isDark}
                textColor={textColor}
                textSecondary={textSecondary}
                surfaceSecondary={surfaceSecondary}
                borderColor={borderColor}
              />
              <CompareRow
                label="Rot Resistant"
                valueA={rotValueA}
                valueB={rotValueB}
                highlightA={rotBothResistant ? true : rotHighlightA}
                highlightB={rotBothResistant ? true : rotHighlightB}
                isDark={isDark}
                textColor={textColor}
                textSecondary={textSecondary}
                surfaceSecondary={surfaceSecondary}
                borderColor={borderColor}
              />
              <CompareRow
                label="Grain"
                valueA={woodA.grain}
                valueB={woodB.grain}
                highlightA={false}
                highlightB={false}
                isDark={isDark}
                textColor={textColor}
                textSecondary={textSecondary}
                surfaceSecondary={surfaceSecondary}
                borderColor={borderColor}
              />
              <CompareRow
                label="Color"
                valueA={woodA.color_description}
                valueB={woodB.color_description}
                highlightA={false}
                highlightB={false}
                isDark={isDark}
                textColor={textColor}
                textSecondary={textSecondary}
                surfaceSecondary={surfaceSecondary}
                borderColor={borderColor}
              />
              <CompareRow
                label="Common Uses"
                valueA={usesA}
                valueB={usesB}
                highlightA={false}
                highlightB={false}
                isDark={isDark}
                textColor={textColor}
                textSecondary={textSecondary}
                surfaceSecondary={surfaceSecondary}
                borderColor={borderColor}
              />
            </View>
          ) : (
            <View style={[styles.emptyHint, { backgroundColor: surfaceColor, borderColor }]}>
              <GitCompare size={32} color={COLORS.primary} strokeWidth={1.5} />
              <Text style={[styles.emptyHintTitle, { color: textColor }]}>Select two woods to compare</Text>
              <Text style={[styles.emptyHintSub, { color: textSecondary }]}>
                Tap the slots above to choose species from the library or your scan history
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Picker Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            console.log('[WoodEye] Compare: picker modal dismissed');
            setModalVisible(false);
          }}
        >
          <View style={[styles.modalContainer, { backgroundColor: bg }]}>
            <View style={[styles.modalHeader, { borderColor }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Choose {activeSlot === 'a' ? 'Wood A' : 'Wood B'}
              </Text>
              <Pressable
                style={styles.modalClose}
                onPress={() => {
                  console.log('[WoodEye] Compare: picker modal closed');
                  setModalVisible(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close picker"
              >
                <X size={20} color={textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={[styles.tabRow, { borderColor }]}>
              <Pressable
                style={[styles.tab, modalTab === 'library' && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
                onPress={() => {
                  console.log('[WoodEye] Compare: switched to library tab');
                  setModalTab('library');
                }}
              >
                <Text style={[styles.tabText, { color: modalTab === 'library' ? COLORS.primary : textSecondary }]}>
                  Species Library
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, modalTab === 'history' && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
                onPress={() => {
                  console.log('[WoodEye] Compare: switched to history tab');
                  setModalTab('history');
                }}
              >
                <Text style={[styles.tabText, { color: modalTab === 'history' ? COLORS.primary : textSecondary }]}>
                  My Scans
                </Text>
              </Pressable>
            </View>

            {listData.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={[styles.modalEmptyText, { color: textSecondary }]}>
                  {modalTab === 'history' ? 'No scans cached yet. Scan some wood first!' : 'No species found.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={listData}
                keyExtractor={(item, i) => `${item.species}-${i}`}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.modalItem, { backgroundColor: surfaceColor, borderColor }]}
                    onPress={() => selectWood(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item.common_name}`}
                  >
                    <View style={styles.modalItemContent}>
                      <Text style={[styles.modalItemSpecies, { color: textColor }]} numberOfLines={1}>{item.species}</Text>
                      <Text style={[styles.modalItemCommon, { color: textSecondary }]} numberOfLines={1}>{item.common_name}</Text>
                    </View>
                    <Text style={[styles.modalItemHardness, { color: COLORS.primary }]} numberOfLines={1}>{item.hardness}</Text>
                  </Pressable>
                )}
              />
            )}
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
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  slot: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderCurve: 'continuous',
    minHeight: 130,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  slotEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  slotPlusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  slotHint: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  slotFilled: {
    flex: 1,
    padding: 14,
    gap: 4,
    justifyContent: 'center',
  },
  slotSpecies: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 17,
  },
  slotCommon: {
    fontSize: 12,
    fontWeight: '500',
  },
  slotChangeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  slotChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableHeaderLabel: { width: 90 },
  tableHeaderValues: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  compareRowLabel: {
    width: 90,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  compareRowValues: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  compareCell: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    gap: 3,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  compareCellText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyHint: {
    borderRadius: 16,
    borderWidth: 1,
    borderCurve: 'continuous',
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyHintTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyHintSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    paddingBottom: 40,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderCurve: 'continuous',
    gap: 12,
  },
  modalItemContent: { flex: 1, gap: 2 },
  modalItemSpecies: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  modalItemCommon: { fontSize: 12, fontWeight: '500' },
  modalItemHardness: { fontSize: 12, fontWeight: '600', maxWidth: 100, textAlign: 'right' },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
