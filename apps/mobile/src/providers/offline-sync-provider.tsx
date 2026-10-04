import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { offlineViewings, setOfflineOwner } from '../lib/offline-viewings';
import type { QueueStatus } from '../lib/offline-queue';
import { useAuth } from './auth-provider';
import { Button, useColors } from '../components/ui';
export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<QueueStatus>(offlineViewings.snapshot());
  useEffect(() => offlineViewings.subscribe(setStatus), []);
  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        if ((await offlineViewings.flush()) && active)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['tracking-state'] }),
            queryClient.invalidateQueries({ queryKey: ['library'] }),
            queryClient.invalidateQueries({ queryKey: ['insights'] }),
            queryClient.invalidateQueries({ queryKey: ['journal'] }),
          ]);
      } catch {
        if (active)
          setStatus((previous) => ({
            ...previous,
            error: 'Could not read or save pending viewings on this device.',
          }));
      }
    };
    void setOfflineOwner(user?.id ?? null, session?.user.id ?? null)
      .then(sync)
      .catch(() => {
        if (active)
          setStatus((previous) => ({ ...previous, error: 'Could not restore pending viewings.' }));
      });
    const timer = setInterval(() => void sync(), 10_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    const onOnline = () => {
      void sync();
    };
    if (Platform.OS === 'web') globalThis.addEventListener('online', onOnline);
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
      if (Platform.OS === 'web') globalThis.removeEventListener('online', onOnline);
      // The next owner is set by the following effect; logout is cleared immediately by AuthProvider.
    };
  }, [user?.id, session?.user.id, queryClient]);
  return (
    <View style={{ flex: 1 }}>
      {children}
      {user && (status.pending > 0 || status.error) ? (
        <View style={{ backgroundColor: colors.surfaceRaised, padding: 12 }}>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.textPrimary }}>
            {status.pending} viewing{status.pending === 1 ? '' : 's'} waiting to sync
            {status.blocked ? ` · ${status.blocked} need attention` : ''}
          </Text>
          {status.error ? (
            <Text style={{ color: colors.textSecondary }}>{status.error}</Text>
          ) : null}
          {status.failures.map((item) => (
            <View key={item.id}>
              <Text style={{ color: colors.textSecondary }}>
                {item.title}:{' '}
                {item.error === 'OPERATION_ID_CONFLICT'
                  ? 'This viewing conflicts with an existing record.'
                  : 'The server could not accept this viewing.'}
              </Text>
              <Button
                label={`Discard ${item.title}`}
                variant="secondary"
                onPress={() =>
                  void offlineViewings.discardFailed(item.id).catch(() =>
                    setStatus((previous) => ({
                      ...previous,
                      error: 'Could not discard the saved viewing.',
                    })),
                  )
                }
              />
            </View>
          ))}
          {status.blocked ? (
            <Button
              label="Retry sync"
              variant="secondary"
              onPress={() =>
                void offlineViewings
                  .retry()
                  .then(() => offlineViewings.flush())
                  .catch(() =>
                    setStatus((previous) => ({ ...previous, error: 'Could not retry sync.' })),
                  )
              }
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
