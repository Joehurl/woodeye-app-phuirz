import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { IconSymbol } from '@/components/IconSymbol';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

export default function TabLayout() {
  useSubscriptionGuard();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)" label="Scan">
        <IconSymbol name="camera.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history" label="History">
        <IconSymbol name="clock.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" label="Settings">
        <IconSymbol name="gearshape.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
