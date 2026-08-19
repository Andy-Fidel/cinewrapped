import type { CalendarEventSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  type CalendarEventPayload,
  openAppleCalendar,
  openGoogleCalendar,
} from '../lib/calendar-integration';
import { errorMessage } from '../lib/error-message';
import { haptics } from '../lib/haptics';
import { useColors } from './ui';

interface CalendarSyncModalProps {
  visible: boolean;
  onClose: () => void;
  event: CalendarEventPayload | CalendarEventSummary | null;
}

export function CalendarSyncModal({ visible, onClose, event }: CalendarSyncModalProps) {
  const colors = useColors();
  const [loadingType, setLoadingType] = useState<'google' | 'apple' | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  if (!event) return null;

  const handleSyncGoogle = async () => {
    try {
      haptics.selection();
      setLoadingType('google');
      setSyncError(null);
      await openGoogleCalendar({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        durationMinutes: event.durationMinutes,
        notes: event.notes,
        mediaTitle: 'media' in event && event.media ? event.media.title : undefined,
      });
      onClose();
    } catch (err) {
      setSyncError(errorMessage(err));
    } finally {
      setLoadingType(null);
    }
  };

  const handleSyncApple = async () => {
    try {
      haptics.selection();
      setLoadingType('apple');
      setSyncError(null);
      await openAppleCalendar({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        durationMinutes: event.durationMinutes,
        notes: event.notes,
        mediaTitle: 'media' in event && event.media ? event.media.title : undefined,
        reminderMinutes: event.reminderMinutes,
      });
      onClose();
    } catch (err) {
      setSyncError(errorMessage(err));
    } finally {
      setLoadingType(null);
    }
  };

  const eventDate = new Date(event.startsAt);
  const formattedTime = eventDate.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(222, 54, 65, 0.15)' }]}>
                <Ionicons name="calendar" size={22} color={colors.brand} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Add to Calendar
                </Text>
                <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {event.title}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Time Chip */}
          <View style={[styles.timeBox, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={16} color={colors.brand} />
            <Text style={[styles.timeText, { color: colors.textPrimary }]}>
              {formattedTime} · {event.durationMinutes ?? 120} min
            </Text>
          </View>

          {syncError ? (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{syncError}</Text>
            </View>
          ) : null}

          {/* Sync Buttons */}
          <View style={styles.optionsList}>
            {/* Apple / iOS Calendar */}
            <Pressable
              accessibilityRole="button"
              disabled={loadingType !== null}
              onPress={() => void handleSyncApple()}
              style={({ pressed }) => [
                styles.optionButton,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: '#000000' }]}>
                <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Apple Calendar / iOS
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Sync to iOS Calendar with reminder alerts
                </Text>
              </View>
              {loadingType === 'apple' ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              )}
            </Pressable>

            {/* Google Calendar */}
            <Pressable
              accessibilityRole="button"
              disabled={loadingType !== null}
              onPress={() => void handleSyncGoogle()}
              style={({ pressed }) => [
                styles.optionButton,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: '#4285F4' }]}>
                <Ionicons name="logo-google" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Google Calendar
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Open in Google Calendar web or mobile app
                </Text>
              </View>
              {loadingType === 'google' ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    maxWidth: 420,
    padding: 20,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  timeBox: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  optionsList: {
    gap: 10,
  },
  optionButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  optionIconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
});
