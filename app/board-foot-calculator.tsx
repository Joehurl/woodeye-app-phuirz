import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  useColorScheme,
  Modal,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Info, X, Calculator, Minus, Plus } from 'lucide-react-native';
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

const THICKNESS_PRESETS = [
  { label: '4/4', value: 1.0 },
  { label: '5/4', value: 1.25 },
  { label: '6/4', value: 1.5 },
  { label: '8/4', value: 2.0 },
  { label: '10/4', value: 2.5 },
  { label: '12/4', value: 3.0 },
];

const DEFAULT_WEIGHT_FACTOR = 3.0; // lbs per board foot

export default function BoardFootCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<{ price_per_bf?: string }>();

  const [numBoards, setNumBoards] = useState(1);
  const [selectedThickness, setSelectedThickness] = useState<number | null>(1.0);
  const [customThickness, setCustomThickness] = useState('');
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [pricePerBf, setPricePerBf] = useState(params.price_per_bf || '');
  const [infoVisible, setInfoVisible] = useState(false);

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const surfaceSecondary = isDark ? COLORS.surfaceSecondaryDark : COLORS.surfaceSecondary;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const thicknessValue = selectedThickness !== null
    ? selectedThickness
    : parseFloat(customThickness) || 0;

  const widthVal = parseFloat(width) || 0;
  const lengthVal = parseFloat(length) || 0;
  const priceVal = parseFloat(pricePerBf) || 0;

  const totalBoardFeet = (thicknessValue * widthVal * lengthVal * numBoards) / 12;
  const totalCost = totalBoardFeet * priceVal;
  const totalWeight = totalBoardFeet * DEFAULT_WEIGHT_FACTOR;

  const totalBfDisplay = totalBoardFeet.toFixed(2);
  const totalCostDisplay = totalCost.toFixed(2);
  const totalWeightDisplay = totalWeight.toFixed(1);

  const handleBack = useCallback(() => {
    console.log('[WoodEye] Board Foot Calculator: back pressed');
    router.back();
  }, [router]);

  const handleDecrement = useCallback(() => {
    console.log('[WoodEye] Board Foot Calculator: decrement boards, current:', numBoards);
    setNumBoards((n) => Math.max(1, n - 1));
  }, [numBoards]);

  const handleIncrement = useCallback(() => {
    console.log('[WoodEye] Board Foot Calculator: increment boards, current:', numBoards);
    setNumBoards((n) => n + 1);
  }, [numBoards]);

  const handleThicknessPreset = useCallback((val: number, label: string) => {
    console.log('[WoodEye] Board Foot Calculator: thickness preset selected:', label, val);
    setSelectedThickness(val);
    setCustomThickness('');
  }, []);

  const handleCustomThickness = useCallback((text: string) => {
    console.log('[WoodEye] Board Foot Calculator: custom thickness input:', text);
    setCustomThickness(text);
    setSelectedThickness(null);
  }, []);

  const handleWidthChange = useCallback((text: string) => {
    console.log('[WoodEye] Board Foot Calculator: width changed:', text);
    setWidth(text);
  }, []);

  const handleLengthChange = useCallback((text: string) => {
    console.log('[WoodEye] Board Foot Calculator: length changed:', text);
    setLength(text);
  }, []);

  const handlePriceChange = useCallback((text: string) => {
    console.log('[WoodEye] Board Foot Calculator: price per bf changed:', text);
    setPricePerBf(text);
  }, []);

  const handleInfoPress = useCallback(() => {
    console.log('[WoodEye] Board Foot Calculator: info tooltip pressed');
    setInfoVisible(true);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.backButton} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={22} color={COLORS.primary} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: textColor }]}>Board Foot Calculator</Text>
          <Pressable style={styles.backButton} onPress={handleInfoPress} accessibilityRole="button" accessibilityLabel="What is a board foot?">
            <Info size={20} color={COLORS.primary} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Results cards */}
          <View style={styles.resultsRow}>
            <View style={[styles.resultCard, { backgroundColor: surfaceColor, borderColor }]}>
              <Text style={[styles.resultLabel, { color: textSecondary }]}>Board Feet</Text>
              <Text style={[styles.resultValue, { color: COLORS.primary }]}>{totalBfDisplay}</Text>
              <Text style={[styles.resultUnit, { color: textSecondary }]}>BF</Text>
            </View>
            <View style={[styles.resultCard, { backgroundColor: surfaceColor, borderColor }]}>
              <Text style={[styles.resultLabel, { color: textSecondary }]}>Total Cost</Text>
              <Text style={[styles.resultValue, { color: COLORS.success }]}>${totalCostDisplay}</Text>
              <Text style={[styles.resultUnit, { color: textSecondary }]}>USD</Text>
            </View>
            <View style={[styles.resultCard, { backgroundColor: surfaceColor, borderColor }]}>
              <Text style={[styles.resultLabel, { color: textSecondary }]}>Est. Weight</Text>
              <Text style={[styles.resultValue, { color: COLORS.accent }]}>{totalWeightDisplay}</Text>
              <Text style={[styles.resultUnit, { color: textSecondary }]}>lbs</Text>
            </View>
          </View>

          {/* Number of boards */}
          <View style={[styles.inputCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Number of Boards</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={[styles.stepperButton, { backgroundColor: surfaceSecondary, borderColor }]}
                onPress={handleDecrement}
                accessibilityRole="button"
                accessibilityLabel="Decrease boards"
              >
                <Minus size={18} color={COLORS.primary} strokeWidth={2.5} />
              </Pressable>
              <View style={[styles.stepperValue, { backgroundColor: surfaceSecondary }]}>
                <Text style={[styles.stepperValueText, { color: textColor }]}>{numBoards}</Text>
              </View>
              <Pressable
                style={[styles.stepperButton, { backgroundColor: surfaceSecondary, borderColor }]}
                onPress={handleIncrement}
                accessibilityRole="button"
                accessibilityLabel="Increase boards"
              >
                <Plus size={18} color={COLORS.primary} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          {/* Thickness */}
          <View style={[styles.inputCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Thickness (inches)</Text>
            <View style={styles.presetsRow}>
              {THICKNESS_PRESETS.map((preset) => {
                const isActive = selectedThickness === preset.value;
                return (
                  <Pressable
                    key={preset.label}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isActive
                          ? COLORS.primary
                          : (isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)'),
                        borderColor: isActive ? COLORS.primary : borderColor,
                      },
                    ]}
                    onPress={() => handleThicknessPreset(preset.value, preset.label)}
                    accessibilityRole="button"
                    accessibilityLabel={`Thickness ${preset.label}`}
                  >
                    <Text style={[styles.presetChipText, { color: isActive ? '#FFFFFF' : COLORS.primary }]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={[styles.textInput, { backgroundColor: surfaceSecondary, color: textColor, borderColor }]}
              placeholder="Custom (e.g. 1.75)"
              placeholderTextColor={textSecondary}
              keyboardType="decimal-pad"
              value={customThickness}
              onChangeText={handleCustomThickness}
              returnKeyType="done"
            />
          </View>

          {/* Width */}
          <View style={[styles.inputCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Width (inches)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: surfaceSecondary, color: textColor, borderColor }]}
              placeholder="e.g. 6"
              placeholderTextColor={textSecondary}
              keyboardType="decimal-pad"
              value={width}
              onChangeText={handleWidthChange}
              returnKeyType="done"
            />
          </View>

          {/* Length */}
          <View style={[styles.inputCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Length (feet)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: surfaceSecondary, color: textColor, borderColor }]}
              placeholder="e.g. 8"
              placeholderTextColor={textSecondary}
              keyboardType="decimal-pad"
              value={length}
              onChangeText={handleLengthChange}
              returnKeyType="done"
            />
          </View>

          {/* Price per BF */}
          <View style={[styles.inputCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Price per Board Foot ($)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: surfaceSecondary, color: textColor, borderColor }]}
              placeholder="e.g. 4.50"
              placeholderTextColor={textSecondary}
              keyboardType="decimal-pad"
              value={pricePerBf}
              onChangeText={handlePriceChange}
              returnKeyType="done"
            />
          </View>

          {/* Formula note */}
          <View style={[styles.formulaCard, { backgroundColor: isDark ? 'rgba(139,69,19,0.15)' : 'rgba(139,69,19,0.06)', borderColor }]}>
            <View style={styles.formulaRow}>
              <Calculator size={14} color={COLORS.primary} strokeWidth={2} />
              <Text style={[styles.formulaText, { color: textSecondary }]}>
                (Thickness × Width × Length × Boards) ÷ 12
              </Text>
            </View>
            <Text style={[styles.formulaNote, { color: textSecondary }]}>
              Weight estimate uses 3.0 lbs/BF average. Actual weight varies by species.
            </Text>
          </View>
        </ScrollView>

        {/* Info Modal */}
        <Modal
          visible={infoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            console.log('[WoodEye] Board Foot Calculator: info modal closed');
            setInfoVisible(false);
          }}
        >
          <View style={styles.infoOverlay}>
            <View style={[styles.infoSheet, { backgroundColor: surfaceColor }]}>
              <View style={styles.infoHeader}>
                <Text style={[styles.infoTitle, { color: textColor }]}>What is a Board Foot?</Text>
                <Pressable
                  onPress={() => {
                    console.log('[WoodEye] Board Foot Calculator: info modal close button pressed');
                    setInfoVisible(false);
                  }}
                  style={styles.infoClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={20} color={textSecondary} strokeWidth={2} />
                </Pressable>
              </View>
              <Text style={[styles.infoBody, { color: textColor }]}>
                A board foot (BF) is the standard unit of measurement for lumber volume in North America.
              </Text>
              <View style={[styles.infoHighlight, { backgroundColor: surfaceSecondary }]}>
                <Text style={[styles.infoHighlightText, { color: COLORS.primary }]}>
                  1 Board Foot = 1" thick × 12" wide × 12" long
                </Text>
              </View>
              <Text style={[styles.infoBody, { color: textSecondary }]}>
                For example, a board that is 2" thick, 6" wide, and 8 feet long contains:
              </Text>
              <Text style={[styles.infoFormula, { color: textColor }]}>
                (2 × 6 × 8) ÷ 12 = 8 board feet
              </Text>
              <Text style={[styles.infoBody, { color: textSecondary }]}>
                Lumber is typically priced and sold by the board foot, making this calculation essential for project planning and budgeting.
              </Text>
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 14 },
  resultsRow: { flexDirection: 'row', gap: 10 },
  resultCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  resultLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  resultValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  resultUnit: { fontSize: 11, fontWeight: '500' },
  inputCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  inputLabel: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  stepperValue: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  stepperValueText: { fontSize: 20, fontWeight: '700' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  presetChipText: { fontSize: 13, fontWeight: '700' },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    borderCurve: 'continuous',
  },
  formulaCard: {
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  formulaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formulaText: { fontSize: 13, fontWeight: '600', flex: 1 },
  formulaNote: { fontSize: 12, lineHeight: 17 },
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoSheet: {
    borderRadius: 20,
    padding: 24,
    gap: 14,
    width: '100%',
    maxWidth: 400,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  infoClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  infoBody: { fontSize: 14, lineHeight: 21 },
  infoHighlight: { borderRadius: 12, padding: 14, borderCurve: 'continuous' },
  infoHighlightText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  infoFormula: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
