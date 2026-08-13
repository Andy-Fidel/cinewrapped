import type { AdvancedFeatureKey } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useFeatureFlags } from '../providers/feature-flags-provider';
import { useTheme } from '../providers/theme-provider';

export function FeatureGate({
  feature,
  children,
  fallback,
}: PropsWithChildren<{ feature: AdvancedFeatureKey; fallback?: ReactNode }>) {
  const { isEnabled, loading } = useFeatureFlags();
  const { colors } = useTheme();
  if (loading) return <ActivityIndicator color={colors.brand} />;
  if (!isEnabled(feature)) return fallback ?? <FeatureUnavailable />;
  return children;
}

export function FeatureUnavailable({
  title = 'Coming soon',
  body = 'This feature is being prepared for a safe, gradual release.',
}: {
  title?: string;
  body?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Ionicons color={colors.brand} name="sparkles-outline" size={24} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20 },
  card: {
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '700' },
});
