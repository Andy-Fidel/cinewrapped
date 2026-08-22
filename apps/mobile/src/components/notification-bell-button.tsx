import type { NotificationInboxResponse } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from './ui';
import { api } from '../lib/api';
import { haptics } from '../lib/haptics';
import { useAuth } from '../providers/auth-provider';

export function NotificationBellButton() {
  const colors = useColors();
  const { user } = useAuth();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => api.request<NotificationInboxResponse>('notifications'),
    enabled: user !== null,
    staleTime: 30000,
  });

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const handlePress = () => {
    haptics.selection();
    router.push('/notifications');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      <Ionicons name="notifications-outline" size={18} color={colors.textPrimary} />
      {unreadCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.brand }]}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
});
