import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Clock, Settings } from 'lucide-react-native';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

const COLORS = {
  primary: '#8B4513',
  background: '#FFF8F0',
  surface: '#FFFFFF',
  text: '#2C1810',
  textSecondary: '#8B6355',
  border: 'rgba(139,69,19,0.12)',
  tabActive: '#8B4513',
  tabInactive: '#B8957A',
};

const TABS = [
  { name: '(home)', label: 'Scan', icon: Camera },
  { name: 'history', label: 'History', icon: Clock },
  { name: 'settings', label: 'Settings', icon: Settings },
];

function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname.startsWith('/history')) return 'history';
    if (pathname.startsWith('/settings')) return 'settings';
    return '(home)';
  };

  const activeTab = getActiveTab();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.name;
          const IconComponent = tab.icon;
          return (
            <Pressable
              key={tab.name}
              style={styles.tabItem}
              onPress={() => {
                console.log(`[Nav] Tab pressed: ${tab.label}`);
                if (tab.name === '(home)') {
                  router.push('/(tabs)/(home)');
                } else {
                  router.push(`/(tabs)/${tab.name}` as any);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <IconComponent
                size={22}
                color={isActive ? COLORS.tabActive : COLORS.tabInactive}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text style={[styles.tabLabel, { color: isActive ? COLORS.tabActive : COLORS.tabInactive, fontWeight: isActive ? '600' : '400' }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  useSubscriptionGuard();

  return (
    <Tabs
      tabBar={() => <FloatingTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 8,
    boxShadow: '0 4px 24px rgba(139,69,19,0.15), 0 1px 4px rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139,69,19,0.08)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    minHeight: 44,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
