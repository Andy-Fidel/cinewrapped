import type { ActivityHeatmapSummary, UserPreferences } from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../lib/api';
import { errorMessage } from '../lib/error-message';
import { parseViewingGoal, viewingGoalProgress } from '../lib/viewing-goals';
import { useAuth } from '../providers/auth-provider';
import { Button, Field, useColors } from './ui';

export function ViewingGoalsCard({
  heatmap,
  timezone,
}: {
  heatmap: ActivityHeatmapSummary;
  timezone: string;
}) {
  const colors = useColors();
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ['preferences', user?.id ?? 'anonymous'];
  const preferences = useQuery({
    queryKey: key,
    queryFn: () => api.request<UserPreferences>('users/me/preferences'),
    enabled: user !== null,
  });
  const [editing, setEditing] = useState(false);
  const [annual, setAnnual] = useState('');
  const [monthly, setMonthly] = useState('');
  const [notice, setNotice] = useState('');
  const save = useMutation({
    mutationFn: () =>
      api.request<UserPreferences>('users/me/preferences', {
        method: 'PATCH',
        body: {
          annualViewingGoal: parseViewingGoal(annual),
          monthlyViewingGoal: parseViewingGoal(monthly),
        },
      }),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      setEditing(false);
      setNotice('Viewing goals saved.');
    },
  });
  return (
    <View
      style={{
        padding: 16,
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}
      >
        Your viewing goals
      </Text>
      <Text style={{ color: colors.textSecondary }}>
        Annual and monthly targets repeat each period. Progress counts logged viewings, including
        rewatches and TV episodes, in {timezone}.
      </Text>
      {preferences.isPending ? (
        <Text style={{ color: colors.textSecondary }}>Loading goals…</Text>
      ) : preferences.isError ? (
        <>
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            Your saved goals could not be loaded.
          </Text>
          <Button label="Retry goals" onPress={() => void preferences.refetch()} />
        </>
      ) : (
        <>
          {(['annual', 'monthly'] as const).map((period) => {
            const target =
              (period === 'annual'
                ? preferences.data.annualViewingGoal
                : preferences.data.monthlyViewingGoal) ?? null;
            const progress = viewingGoalProgress(heatmap.days, timezone, period, target);
            return (
              <View key={period} style={{ gap: 6 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {period === 'annual' ? 'This year' : 'This month'}: {progress.count} viewings
                  {target === null ? ' · No goal set' : ` / ${target}`}
                </Text>
                {target !== null ? (
                  <>
                    <View
                      accessibilityRole="progressbar"
                      accessibilityLabel={`${period} viewing goal`}
                      accessibilityValue={{
                        min: 0,
                        max: target,
                        now: Math.min(progress.count, target),
                      }}
                      style={{
                        height: 8,
                        backgroundColor: colors.surfaceRaised,
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: 8,
                          width: `${progress.percent}%`,
                          backgroundColor: colors.brand,
                        }}
                      />
                    </View>
                    <Text style={{ color: colors.textSecondary }}>
                      {progress.remaining === 0
                        ? 'Goal reached!'
                        : `${progress.remaining} to go · ${Math.abs(progress.paceDelta!)} ${progress.paceDelta! >= 0 ? 'ahead of' : 'behind'} pace`}
                    </Text>
                  </>
                ) : null}
              </View>
            );
          })}
          {!editing ? (
            <Button
              label="Edit viewing goals"
              variant="secondary"
              onPress={() => {
                setAnnual(preferences.data.annualViewingGoal?.toString() ?? '');
                setMonthly(preferences.data.monthlyViewingGoal?.toString() ?? '');
                setNotice('');
                save.reset();
                setEditing(true);
              }}
            />
          ) : (
            <>
              <Field
                label="Annual viewing goal"
                accessibilityLabel="Annual viewing goal"
                value={annual}
                onChangeText={setAnnual}
                keyboardType="number-pad"
                maxLength={5}
                editable={!save.isPending}
                placeholder="Leave blank to disable"
              />
              <Field
                label="Monthly viewing goal"
                accessibilityLabel="Monthly viewing goal"
                value={monthly}
                onChangeText={setMonthly}
                keyboardType="number-pad"
                maxLength={5}
                editable={!save.isPending}
                placeholder="Leave blank to disable"
              />
              {save.isError ? (
                <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                  {errorMessage(save.error)}
                </Text>
              ) : null}
              <Button
                label="Save viewing goals"
                loading={save.isPending}
                onPress={() => save.mutate()}
              />
              <Button
                label="Cancel goal changes"
                variant="secondary"
                disabled={save.isPending}
                onPress={() => setEditing(false)}
              />
            </>
          )}
        </>
      )}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>
          {notice}
        </Text>
      ) : null}
    </View>
  );
}
