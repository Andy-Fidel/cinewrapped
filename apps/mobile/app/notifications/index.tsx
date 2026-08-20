import type {
  NotificationInboxResponse,
  NotificationSummary,
  NotificationType,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, router, Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { haptics } from '../../src/lib/haptics';
import { useAuth } from '../../src/providers/auth-provider';

type FilterType = 'ALL' | 'UNREAD' | 'SOCIAL' | 'RELEASES';

function getNotificationIcon(type: NotificationType): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
} {
  switch (type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_REQUEST_ACCEPTED':
    case 'NEW_FOLLOWER':
      return { icon: 'person-add', color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.15)' };
    case 'COMMENT':
      return { icon: 'chatbubble', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' };
    case 'REACTION':
      return { icon: 'heart', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
    case 'WRAP_READY':
      return { icon: 'sparkles', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' };
    case 'ACHIEVEMENT_UNLOCKED':
      return { icon: 'trophy', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
    case 'SHARED_TITLE':
    default:
      return { icon: 'film', color: '#DE3641', bgColor: 'rgba(222, 54, 65, 0.15)' };
  }
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => api.request<NotificationInboxResponse>('notifications'),
    enabled: user !== null,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      api.request<{ success: boolean }>(`notifications/${id}/read`, {
        method: 'PATCH',
      }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<NotificationInboxResponse>(['notifications', user?.id], (old) => {
        if (!old) return old;
        return {
          ...old,
          unreadCount: Math.max(0, old.unreadCount - 1),
          items: old.items.map((it) =>
            it.id === id ? { ...it, readAt: new Date().toISOString() } : it,
          ),
        };
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      api.request<{ success: boolean }>('notifications/read-all', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.setQueryData<NotificationInboxResponse>(['notifications', user?.id], (old) => {
        if (!old) return old;
        return {
          ...old,
          unreadCount: 0,
          items: old.items.map((it) => ({
            ...it,
            readAt: it.readAt ?? new Date().toISOString(),
          })),
        };
      });
    },
  });

  const handleNotificationPress = (item: NotificationSummary) => {
    haptics.selection();
    if (!item.readAt) {
      markReadMutation.mutate(item.id);
    }
    if (item.deepLink) {
      router.push(item.deepLink as Href);
    }
  };

  const handleMarkAllAsRead = () => {
    haptics.clapperSnap();
    markAllReadMutation.mutate();
  };

  const filteredItems = useMemo(() => {
    const items = notificationsQuery.data?.items ?? [];
    if (activeFilter === 'UNREAD') {
      return items.filter((it) => it.readAt === null);
    }
    if (activeFilter === 'SOCIAL') {
      return items.filter((it) =>
        [
          'FRIEND_REQUEST',
          'FRIEND_REQUEST_ACCEPTED',
          'NEW_FOLLOWER',
          'COMMENT',
          'REACTION',
        ].includes(it.type),
      );
    }
    if (activeFilter === 'RELEASES') {
      return items.filter((it) =>
        ['WRAP_READY', 'SHARED_TITLE', 'ACHIEVEMENT_UNLOCKED'].includes(it.type),
      );
    }
    return items;
  }, [notificationsQuery.data?.items, activeFilter]);

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerRight: () =>
            unreadCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
                onPress={handleMarkAllAsRead}
                style={({ pressed }) => [
                  styles.markAllBtn,
                  { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="checkmark-done" size={15} color={colors.brand} />
                <Text style={[styles.markAllText, { color: colors.brand }]}>Read All</Text>
              </Pressable>
            ) : null,
        }}
      />

      <View style={styles.screenContent}>
        {/* Filter Tabs Row */}
        <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'UNREAD', label: `Unread (${unreadCount})` },
              { key: 'SOCIAL', label: 'Social' },
              { key: 'RELEASES', label: 'Premieres & Wraps' },
            ] as { key: FilterType; label: string }[]
          ).map((tab) => {
            const selected = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  haptics.selection();
                  setActiveFilter(tab.key);
                }}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: selected ? colors.brand : colors.surface,
                    borderColor: selected ? colors.brand : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: selected ? colors.onBrand : colors.textPrimary },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Main List / Loading / Empty */}
        {notificationsQuery.isPending ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={notificationsQuery.isRefetching}
                onRefresh={() => void notificationsQuery.refetch()}
                tintColor={colors.brand}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconBox, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="notifications-outline" size={38} color={colors.textDisabled} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {activeFilter === 'UNREAD' ? 'You are all caught up!' : 'No notifications yet'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {activeFilter === 'UNREAD'
                    ? 'There are no unread alerts at the moment.'
                    : 'Social interactions, weekly wraps, and release countdowns will appear here.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isUnread = item.readAt === null;
              const iconConfig = getNotificationIcon(item.type);

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${isUnread ? 'Unread: ' : ''}${item.title}`}
                  onPress={() => handleNotificationPress(item)}
                  style={({ pressed }) => [
                    styles.notifCard,
                    {
                      backgroundColor: isUnread ? colors.surfaceRaised : colors.surface,
                      borderColor: isUnread ? colors.brand : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  {/* Left Icon or User Avatar */}
                  <View style={styles.leftCol}>
                    {item.actor?.avatarUrl ? (
                      <View style={styles.avatarWrap}>
                        <Image source={{ uri: item.actor.avatarUrl }} style={styles.actorAvatar} />
                        <View style={[styles.miniBadge, { backgroundColor: iconConfig.color }]}>
                          <Ionicons name={iconConfig.icon} size={10} color="#FFFFFF" />
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.iconBox, { backgroundColor: iconConfig.bgColor }]}>
                        <Ionicons name={iconConfig.icon} size={20} color={iconConfig.color} />
                      </View>
                    )}
                  </View>

                  {/* Center Content */}
                  <View style={styles.centerCol}>
                    <View style={styles.notifHeaderRow}>
                      <Text
                        numberOfLines={1}
                        style={[styles.notifTitle, { color: colors.textPrimary }]}
                      >
                        {item.title}
                      </Text>
                      <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={3}
                      style={[styles.notifBody, { color: colors.textSecondary }]}
                    >
                      {item.body}
                    </Text>
                  </View>

                  {/* Right Unread Glowing Dot */}
                  {isUnread ? (
                    <View style={[styles.unreadDot, { backgroundColor: colors.brand }]} />
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screenContent: { alignSelf: 'center', flex: 1, maxWidth: 640, width: '100%' },
  list: { flex: 1 },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  leftCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: 42,
    height: 42,
  },
  actorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  miniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  centerCol: {
    flex: 1,
    gap: 4,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  notifTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
