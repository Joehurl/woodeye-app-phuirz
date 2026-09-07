import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIF_PERMISSION_KEY = 'woodeye_notif_permission';
const PUSH_TOKEN_KEY = 'woodeye_push_token';
const SUPABASE_URL = 'https://owcjjbrmmjgwfrhysavz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93Y2pqYnJtbWpnd2ZyaHlzYXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTU4NDcsImV4cCI6MjEwNDAzMTg0N30.eLkFGUDF17ax1upsCOaScq85ljdzW-_tG74JAO7iJrY';

const FALLBACK_FACTS = [
  'Oak trees can live for over 1,000 years and produce around 20,000 acorns per year.',
  'Balsa wood is so light it was used to build Thor Heyerdahl\'s Kon-Tiki raft in 1947.',
  'Teak contains natural oils that make it resistant to water, rot, and insects.',
  'The rings in a tree trunk tell its age — one ring per year of growth.',
  'Bamboo is technically a grass, not a wood, but it\'s stronger than many hardwoods.',
  'Black Walnut produces juglone, a chemical toxic to many nearby plants.',
  'Lignum Vitae is so dense it sinks in water — one of only a few woods that do.',
  'Purpleheart wood turns vivid purple when freshly cut, then darkens to brown-purple over time.',
];

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and register the Expo push token with the backend.
 * Returns true if permission was granted.
 */
export async function registerForPushNotifications(deviceId: string): Promise<boolean> {
  console.log('[WoodEye] Requesting push notification permissions for device:', deviceId);

  if (Platform.OS === 'web') {
    console.log('[WoodEye] Push notifications not supported on web');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[WoodEye] Requesting notification permission (current status:', existingStatus, ')');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    console.log('[WoodEye] Notification permission status:', finalStatus);
    await AsyncStorage.setItem(NOTIF_PERMISSION_KEY, finalStatus);

    if (finalStatus !== 'granted') {
      console.log('[WoodEye] Notification permission denied');
      return false;
    }

    // Get Expo push token
    let pushToken: string | undefined;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      pushToken = tokenData.data;
      console.log('[WoodEye] Got Expo push token:', pushToken);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
    } catch (tokenErr) {
      console.warn('[WoodEye] Could not get push token (simulator or no project ID):', tokenErr);
      // Still return true — local notifications work without a push token
      return true;
    }

    // Register token with backend
    if (pushToken) {
      try {
        console.log('[WoodEye] Registering push token with backend...');
        const response = await fetch(`${SUPABASE_URL}/functions/v1/register-push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            device_id: deviceId,
            push_token: pushToken,
            platform: Platform.OS,
          }),
        });
        console.log('[WoodEye] register-push-token response status:', response.status);
        if (!response.ok) {
          const errText = await response.text();
          console.warn('[WoodEye] register-push-token non-OK response:', errText.slice(0, 200));
        }
      } catch (regErr) {
        console.warn('[WoodEye] Failed to register push token with backend:', regErr);
      }
    }

    return true;
  } catch (e: any) {
    console.error('[WoodEye] registerForPushNotifications error:', e);
    return false;
  }
}

/**
 * Schedule a daily local notification at 9:00 AM with a wood fact.
 */
export async function scheduleDailyWoodFact(): Promise<void> {
  console.log('[WoodEye] Scheduling daily wood fact notification...');

  // Cancel existing scheduled notifications first
  await cancelDailyNotifications();

  let factText = '';

  // Try to fetch a fact from the backend
  try {
    console.log('[WoodEye] Fetching daily fact from backend...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-daily-fact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}),
    });
    console.log('[WoodEye] get-daily-fact response status:', response.status);
    if (response.ok) {
      const data = await response.json();
      factText = data.fact || data.text || '';
      console.log('[WoodEye] Got daily fact from backend:', factText.slice(0, 60));
    } else {
      const errText = await response.text();
      console.warn('[WoodEye] get-daily-fact non-OK:', errText.slice(0, 200));
    }
  } catch (e) {
    console.warn('[WoodEye] Failed to fetch daily fact, using fallback:', e);
  }

  // Use fallback if no fact from backend
  if (!factText) {
    const idx = Math.floor(Math.random() * FALLBACK_FACTS.length);
    factText = FALLBACK_FACTS[idx];
    console.log('[WoodEye] Using fallback fact:', factText.slice(0, 60));
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌳 Wood Fact of the Day',
        body: factText,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });
    console.log('[WoodEye] Daily wood fact notification scheduled for 9:00 AM');
  } catch (e: any) {
    console.error('[WoodEye] Failed to schedule daily notification:', e);
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelDailyNotifications(): Promise<void> {
  console.log('[WoodEye] Cancelling all scheduled notifications...');
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[WoodEye] All scheduled notifications cancelled');
  } catch (e: any) {
    console.error('[WoodEye] Failed to cancel notifications:', e);
  }
}

/**
 * Check if notifications are currently enabled (permission granted).
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const enabled = status === 'granted';
    console.log('[WoodEye] areNotificationsEnabled:', enabled, '(status:', status, ')');
    return enabled;
  } catch (e) {
    console.error('[WoodEye] areNotificationsEnabled error:', e);
    return false;
  }
}
