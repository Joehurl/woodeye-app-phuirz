import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Linking } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

const PRIVACY_POLICY_URL = "https://www.freeprivacypolicy.com/live/abf6b3a7-f310-4a49-811f-d9fefdef1750";

export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    console.log("[PrivacyPolicy] Opening privacy policy URL:", PRIVACY_POLICY_URL);
    Linking.openURL(PRIVACY_POLICY_URL).catch((err) => {
      console.error("[PrivacyPolicy] Failed to open URL:", err);
    });
    router.back();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.text, { color: theme.colors.text }]}>
        Opening Privacy Policy...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  text: {
    fontSize: 16,
  },
});
