import type { SearchListDetails } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaCard } from '../../src/components/media-card';
import { Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';

export default function SearchListScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const list = useQuery({
    queryKey: ['search-list', listId],
    queryFn: () => api.request<SearchListDetails>(`search/lists/${listId}`),
    enabled: session !== null && typeof listId === 'string',
  });

  if (session === null) return <Redirect href="/(auth)/login" />;
  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: list.data?.name ?? 'List',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      {list.isPending ? <ActivityIndicator color={colors.brand} /> : null}
      {list.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void list.refetch()}
          style={[styles.message, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons color={colors.danger} name="cloud-offline-outline" size={22} />
          <Text accessibilityRole="alert" style={{ color: colors.textPrimary, flex: 1 }}>
            Couldn’t load this list. Tap to retry.
          </Text>
        </Pressable>
      ) : null}
      {list.data ? (
        <>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              {list.data.name}
            </Text>
            <Text style={[styles.owner, { color: colors.brand }]}>
              by @{list.data.owner.username}
            </Text>
            {list.data.description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {list.data.description}
              </Text>
            ) : null}
            <Text style={{ color: colors.textDisabled, fontSize: 12 }}>
              {list.data.itemCount} titles · {list.data.visibility.toLocaleLowerCase()}
            </Text>
          </View>
          <View style={styles.grid}>
            {list.data.items.map((item) => (
              <View key={item.id} style={styles.cell}>
                <MediaCard media={item.media} />
                {item.note ? (
                  <Text numberOfLines={2} style={[styles.note, { color: colors.textSecondary }]}>
                    {item.note}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          {list.data.items.length === 0 ? (
            <View
              style={[
                styles.empty,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons color={colors.brand} name="list-outline" size={34} />
              <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
                This list is empty
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 7 },
  title: { fontSize: 28, fontWeight: '900' },
  owner: { fontSize: 14, fontWeight: '800' },
  description: { fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%' },
  note: { fontSize: 11, lineHeight: 16, marginHorizontal: 7, marginTop: -12 },
  message: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  empty: { alignItems: 'center', borderRadius: 16, borderWidth: 1, gap: 9, padding: 28 },
});
