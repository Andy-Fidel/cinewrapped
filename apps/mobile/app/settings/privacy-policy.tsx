import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen, useColors } from '../../src/components/ui';

export default function PrivacyPolicyScreen() {
  const colors = useColors();

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Privacy Policy',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          CineWrapped Privacy Policy
        </Text>
        <Text style={[styles.updatedDate, { color: colors.textSecondary }]}>
          Effective Date: August 2026
        </Text>

        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          CineWrapped ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains what information we collect, how we use it, and your rights under GDPR, CCPA, and Apple App Store / Google Play Store policies.
        </Text>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>1. Information We Collect</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          • **Account Information**: Email address, username, display name, and optional avatar image.
          {'\n'}• **Viewing & Rating Logs**: Movies and series marked as watched, ratings (1–10 stars), private journal entries, and custom lists.
          {'\n'}• **Device & Technical Information**: Device model, operating system version, and anonymous crash telemetry to ensure app stability.
          {'\n'}• **Permissions**: Camera access (only when using AI scene identification) and photo library access (only when selecting an avatar).
        </Text>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>2. How We Use Your Data</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          • To generate your personalized CineWrapped Annual and Monthly stories.
          {'\n'}• To compute cinema taste profiles and provide bespoke recommendations.
          {'\n'}• To deliver push notifications for upcoming movie releases when opted-in.
          {'\n'}• **We never sell your personal data to third parties or data brokers.**
        </Text>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>3. Data Security & Storage</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          All communications between the CineWrapped mobile application and our servers are encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS). Sensitive authentication tokens are stored exclusively in secure hardware enclaves (iOS Keychain and Android Keystore).
        </Text>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>4. Your Rights & In-App Account Deletion</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You have the right to access, export, or permanently delete your data at any time. You can initiate instant and permanent account erasure directly in **Settings → Security → Delete Account**.
        </Text>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>5. Contact & Support</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          For privacy inquiries or data protection requests, contact our privacy officer at:
          {'\n'}Email: privacy@cinewrapped.app
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  updatedDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
  },
});
