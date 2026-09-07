import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { ArrowLeft, Camera, Leaf } from 'lucide-react-native';
import { SPECIES_CACHE } from '@/utils/woodCache';

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

const WOOD_OVERLAY_COLORS: Record<string, string> = {
  Oak: 'rgba(180, 140, 80, 0.35)',
  Maple: 'rgba(220, 190, 140, 0.35)',
  Walnut: 'rgba(80, 50, 25, 0.40)',
  Cherry: 'rgba(160, 80, 50, 0.35)',
  Pine: 'rgba(210, 175, 110, 0.30)',
  Teak: 'rgba(150, 110, 60, 0.35)',
  Mahogany: 'rgba(140, 60, 40, 0.38)',
  Ebony: 'rgba(30, 20, 15, 0.45)',
  Purpleheart: 'rgba(100, 60, 120, 0.35)',
  Padauk: 'rgba(180, 60, 30, 0.38)',
  default: 'rgba(139, 69, 19, 0.30)',
};

function getOverlayColor(commonName: string): string {
  for (const key of Object.keys(WOOD_OVERLAY_COLORS)) {
    if (key === 'default') continue;
    if (commonName.toLowerCase().includes(key.toLowerCase())) {
      return WOOD_OVERLAY_COLORS[key];
    }
  }
  return WOOD_OVERLAY_COLORS.default;
}

export default function ARVisualizerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const bg = isDark ? COLORS.backgroundDark : COLORS.background;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;
  const surfaceColor = isDark ? COLORS.surfaceDark : COLORS.surface;
  const borderColor = isDark ? COLORS.borderDark : COLORS.border;

  const selectedSpecies = SPECIES_CACHE[selectedIndex];
  const overlayColor = getOverlayColor(selectedSpecies.common_name);

  const handleBack = useCallback(() => {
    console.log('[WoodEye] AR Visualizer: back pressed');
    router.back();
  }, [router]);

  const handleRequestCamera = useCallback(async () => {
    console.log('[WoodEye] AR Visualizer: requesting camera permission');
    const result = await requestCameraPermission();
    console.log('[WoodEye] AR Visualizer: camera permission result:', result.status);
  }, [requestCameraPermission]);

  const handleSelectSpecies = useCallback((index: number) => {
    console.log('[WoodEye] AR Visualizer: species selected:', SPECIES_CACHE[index].common_name);
    setSelectedIndex(index);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    console.log('[WoodEye] AR Visualizer: capture pressed, species:', selectedSpecies.common_name);
    setCapturing(true);
    try {
      // Request media library permission if needed
      if (!mediaPermission?.granted) {
        console.log('[WoodEye] AR Visualizer: requesting media library permission');
        const result = await requestMediaPermission();
        console.log('[WoodEye] AR Visualizer: media permission result:', result.status);
        if (!result.granted) {
          Alert.alert('Permission Required', 'Please allow access to your photo library to save captures.');
          setCapturing(false);
          return;
        }
      }
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
        console.log('[WoodEye] AR Visualizer: photo saved to library');
        Alert.alert('Saved!', 'AR preview saved to your photo library.');
      }
    } catch (e: any) {
      console.error('[WoodEye] AR Visualizer: capture failed:', e);
      Alert.alert('Capture Failed', 'Could not save the photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, selectedSpecies, mediaPermission, requestMediaPermission]);

  // Permission not yet determined
  if (!cameraPermission) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: bg }]}>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={22} color={COLORS.primary} strokeWidth={2} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: textColor }]}>AR Wood Preview</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        </View>
      </>
    );
  }

  // Permission denied
  if (!cameraPermission.granted) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: bg }]}>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={22} color={COLORS.primary} strokeWidth={2} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: textColor }]}>AR Wood Preview</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.permissionContent}>
            <View style={[styles.permissionIcon, { backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)' }]}>
              <Camera size={36} color={COLORS.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.permissionTitle, { color: textColor }]}>Camera Access Required</Text>
            <Text style={[styles.permissionSubtitle, { color: textSecondary }]}>
              AR Wood Preview uses your camera to show how different wood species would look on any surface.
            </Text>
            <Pressable
              style={styles.permissionButton}
              onPress={handleRequestCamera}
              accessibilityRole="button"
              accessibilityLabel="Allow camera access"
            >
              <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Camera feed */}
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Wood tone overlay */}
          <View style={[styles.woodOverlay, { backgroundColor: overlayColor }]} />

          {/* Header overlay */}
          <View style={[styles.cameraHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable style={styles.cameraBackButton} onPress={handleBack}>
              <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={styles.cameraHeaderCenter}>
              <Text style={styles.cameraHeaderTitle}>AR Wood Preview</Text>
              <Text style={styles.cameraHeaderNote}>Preview wood tones on any surface</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Species name overlay */}
          <View style={styles.speciesOverlay}>
            <View style={styles.speciesOverlayBadge}>
              <Leaf size={14} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.speciesOverlayName}>{selectedSpecies.common_name}</Text>
            </View>
            <Text style={styles.speciesOverlayScientific}>{selectedSpecies.species}</Text>
          </View>

          {/* Capture button */}
          <View style={[styles.captureArea, { paddingBottom: 16 }]}>
            <Pressable
              style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={capturing}
              accessibilityRole="button"
              accessibilityLabel="Capture AR preview"
            >
              {capturing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Camera size={28} color="#FFFFFF" strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </CameraView>

        {/* Species selector */}
        <View style={[styles.selectorContainer, { backgroundColor: surfaceColor, paddingBottom: insets.bottom + 8 }]}>
          <Text style={[styles.selectorLabel, { color: textSecondary }]}>Select Wood Species</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorScroll}
          >
            {SPECIES_CACHE.map((species, index) => {
              const isSelected = index === selectedIndex;
              const chipOverlay = getOverlayColor(species.common_name);
              return (
                <Pressable
                  key={`${species.species}-${index}`}
                  style={[
                    styles.speciesChip,
                    {
                      backgroundColor: isSelected ? COLORS.primary : (isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.08)'),
                      borderColor: isSelected ? COLORS.primary : borderColor,
                    },
                  ]}
                  onPress={() => handleSelectSpecies(index)}
                  accessibilityRole="button"
                  accessibilityLabel={species.common_name}
                >
                  <View style={[styles.chipColorDot, { backgroundColor: chipOverlay.replace(/[\d.]+\)$/, '1)') }]} />
                  <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : COLORS.primary }]} numberOfLines={1}>
                    {species.common_name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
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
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  permissionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  permissionSubtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    borderCurve: 'continuous',
  },
  permissionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  camera: { flex: 1 },
  woodOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cameraBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cameraHeaderCenter: { alignItems: 'center', flex: 1 },
  cameraHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
  cameraHeaderNote: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '400' },
  speciesOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    gap: 4,
  },
  speciesOverlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  speciesOverlayName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  speciesOverlayScientific: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  captureArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureButtonDisabled: { opacity: 0.6 },
  selectorContainer: {
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,69,19,0.08)',
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
  },
  selectorScroll: { paddingHorizontal: 16, gap: 8 },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  chipColorDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontSize: 13, fontWeight: '600', maxWidth: 100 },
});
