import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen, useColors } from '../../src/components/ui';

export default function TermsOfServiceScreen() {
  const colors = useColors();

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Terms of Service & EULA',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          CineWrapped End User License Agreement & Terms of Service
        </Text>
        <Text style={[styles.updatedDate, { color: colors.textSecondary }]}>
          Last Updated: August 2026
        </Text>

        <View
          style={[
            styles.highlightBox,
            { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' },
          ]}
        >
          <Text style={[styles.highlightTitle, { color: '#EF4444' }]}>
            Zero-Tolerance Policy for Objectionable Content
          </Text>
          <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
            CineWrapped enforces a strict, zero-tolerance policy against abusive, harassing,
            defamatory, sexually explicit, hateful, or harmful user-generated content. Any user who
            posts abusive reviews, comments, or inappropriate club materials will be permanently
            banned immediately.
          </Text>
        </View>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>
          1. Acceptance of Terms
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          By downloading, installing, or using the CineWrapped mobile application, you agree to be
          bound by these Terms of Service. If you do not agree to these terms, do not use the
          application.
        </Text>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>
          2. User Conduct & Community Guidelines
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Users are responsible for all reviews, comments, lists, and club messages published under
          their account. You agree not to:
          {'\n'}• Post spoilers without marking them appropriately.
          {'\n'}• Engage in personal harassment, bullying, or hate speech.
          {'\n'}• Post commercial spam, unsolicited advertising, or bot automated requests.
          {'\n'}• Impersonate any individual, creator, or film studio.
        </Text>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>
          3. Content Moderation & Enforcement
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          CineWrapped provides in-app reporting and user blocking tools. Reported violations are
          investigated by our content moderation team within 24 hours. Content violating these terms
          will be removed promptly without prior notice.
        </Text>

        <Text style={[styles.subheading, { color: colors.textPrimary }]}>
          4. Intellectual Property
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Movie posters, backdrops, metadata, and cast details are provided via metadata partners
          (including TMDB). CineWrapped claims no ownership over studio promotional assets. All
          CineWrapped branding and algorithms are proprietary.
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
  highlightBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginVertical: 4,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '800',
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
