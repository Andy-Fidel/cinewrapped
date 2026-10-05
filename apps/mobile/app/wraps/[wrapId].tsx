import type { WrapDetail } from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoryViewer } from '../../src/components/story-presentation';
import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { wrapPresentation } from '../../src/lib/wrap-presentation';
import { useAuth } from '../../src/providers/auth-provider';

export default function WrapStoryScreen() {
  const colors = useColors();
  const { session, user } = useAuth();
  const { wrapId } = useLocalSearchParams<{ wrapId: string }>();
  const queryClient = useQueryClient();
  const pollingDeadline = useRef(Date.now() + 120_000);
  const wrap = useQuery({
    queryKey: ['wrap', wrapId],
    queryFn: () => api.request<WrapDetail>(`wraps/${encodeURIComponent(wrapId)}`),
    enabled: session !== null && typeof wrapId === 'string',
    refetchInterval: (query) =>
      ['PENDING', 'GENERATING'].includes(query.state.data?.status ?? '') &&
      Date.now() < pollingDeadline.current
        ? 3_000
        : false,
  });
  const regenerate = useMutation({
    mutationFn: (action: 'refresh' | 'retry') =>
      api.request<WrapDetail>(`wraps/${encodeURIComponent(wrapId)}/${action}`, { method: 'POST' }),
    onSuccess: async (result) => {
      pollingDeadline.current = Date.now() + 120_000;
      queryClient.setQueryData(['wrap', result.id], result);
      await queryClient.invalidateQueries({ queryKey: ['wrap-archive'] });
      if (result.id !== wrapId) router.replace(`/wraps/${result.id}`);
      else await wrap.refetch();
    },
  });
  const presentation =
    wrap.data && user
      ? wrapPresentation(wrap.data, {
          userId: user.id,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
        })
      : null;

  if (session === null) return <Redirect href="/(auth)/login" />;
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A0912' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {wrap.isPending ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Loading your saved wrap…</Text>
        </View>
      ) : wrap.isError ? (
        <View style={styles.center}>
          <Text style={{ color: colors.danger }}>{errorMessage(wrap.error)}</Text>
          <Button label="Try again" onPress={() => void wrap.refetch()} />
        </View>
      ) : presentation && presentation.slides.length > 0 ? (
        <>
          {wrap.data.wrapType !== 'CUSTOM' ? (
            <Button
              label={regenerate.isPending ? 'Updating…' : 'Save updated revision'}
              disabled={regenerate.isPending}
              onPress={() => regenerate.mutate('refresh')}
            />
          ) : null}
          {regenerate.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {errorMessage(regenerate.error)}
            </Text>
          ) : null}
          <StoryViewer presentation={presentation} onClose={() => router.replace('/insights')} />
        </>
      ) : (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>
            {wrap.data.status === 'FAILED'
              ? 'Wrap generation failed. Your activity is still saved.'
              : 'Your wrap is being prepared. Check its status or retry an interrupted attempt.'}
          </Text>
          {wrap.data.canRetry && wrap.data.wrapType !== 'CUSTOM' ? (
            <Button
              label={regenerate.isPending ? 'Retrying…' : 'Retry generation'}
              disabled={regenerate.isPending}
              onPress={() => regenerate.mutate('retry')}
            />
          ) : null}
          <Button
            label="Check status"
            onPress={() => {
              pollingDeadline.current = Date.now() + 120_000;
              void wrap.refetch();
            }}
          />
          <Button label="Back to archive" onPress={() => router.replace('/insights')} />
          {regenerate.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {errorMessage(regenerate.error)}
            </Text>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
});
