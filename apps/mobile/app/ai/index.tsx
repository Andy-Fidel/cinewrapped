import type {
  ConversationTurn,
  ConversationalRecommendationResult,
} from '@cinewrapped/shared-types';
import { useMutation } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaCard } from '../../src/components/media-card';
import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

const starters = [
  'Funny movies under 100 minutes',
  'Korean thrillers after 2015',
  'A cozy family movie on Netflix',
];

export default function AiDiscoveryScreen() {
  const colors = useColors();
  const { session, user } = useAuth();
  const [query, setQuery] = useState('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const assistant = useMutation({
    mutationFn: (message: string) =>
      api.request<ConversationalRecommendationResult>('ai/recommendations/conversation', {
        method: 'POST',
        body: {
          query: message,
          turns,
          language: user?.preferredLanguage ?? 'en-US',
          countryCode: user?.countryCode ?? 'US',
        },
      }),
    onSuccess: (result, message) => {
      setTurns((current) => [
        ...current,
        { role: 'USER', content: message },
        { role: 'ASSISTANT', content: result.reply },
      ]);
      setQuery('');
    },
  });
  if (session === null) return <Redirect href="/(auth)/login" />;
  const submit = (message = query) => {
    const normalized = message.trim();
    if (normalized.length >= 3 && !assistant.isPending) assistant.mutate(normalized);
  };
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Discovery assistant',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.brand }]}>ASK CINEWRAPPED</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
            Tell me the vibe
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
            Describe mood, runtime, era, language, company, or streaming service. Results stay
            grounded in catalog facts.
          </Text>
        </View>
        {turns.length === 0 ? (
          <View style={styles.starters}>
            {starters.map((starter) => (
              <Pressable
                key={starter}
                onPress={() => submit(starter)}
                style={[styles.starter, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textPrimary }}>{starter}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.turns}>
            {turns.map((turn, index) => (
              <View
                key={`${turn.role}-${index}`}
                style={[
                  styles.turn,
                  {
                    alignSelf: turn.role === 'USER' ? 'flex-end' : 'flex-start',
                    backgroundColor: turn.role === 'USER' ? colors.brand : colors.surfaceRaised,
                  },
                ]}
              >
                <Text style={{ color: turn.role === 'USER' ? colors.onBrand : colors.textPrimary }}>
                  {turn.content}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Recommendation request"
            multiline
            onChangeText={setQuery}
            placeholder="Something adventurous but not too long…"
            placeholderTextColor={colors.textDisabled}
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            value={query}
          />
          <Button
            label="Find matches"
            loading={assistant.isPending}
            disabled={query.trim().length < 3}
            onPress={() => submit()}
          />
        </View>
        {assistant.isError ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {errorMessage(assistant.error)}
          </Text>
        ) : null}
        {assistant.data === undefined ? null : (
          <View style={styles.results}>
            <View style={[styles.notice, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {assistant.data.interpretation.explanation}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>
                {assistant.data.notice}
              </Text>
            </View>
            {assistant.data.results.map((media) => (
              <MediaCard key={media.id} media={media} />
            ))}
            {assistant.data.results.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>
                No verified matches yet. Try one fewer constraint.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignSelf: 'center', gap: 18, maxWidth: 720, padding: 20, width: '100%' },
  header: { gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 31, fontWeight: '800' },
  starters: { gap: 9 },
  starter: { borderRadius: 12, borderWidth: 1, padding: 14 },
  turns: { gap: 9 },
  turn: { borderRadius: 14, maxWidth: '88%', padding: 12 },
  composer: { gap: 10 },
  input: { borderRadius: 12, borderWidth: 1, minHeight: 86, padding: 13, textAlignVertical: 'top' },
  notice: { borderRadius: 12, gap: 5, padding: 12 },
  results: { gap: 14 },
});
