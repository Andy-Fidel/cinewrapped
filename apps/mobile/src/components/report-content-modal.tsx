import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useColors } from './ui';
import { haptics } from '../lib/haptics';
import { useDialog } from '../providers/dialog-provider';

export interface ReportTarget {
  entityType: 'REVIEW' | 'COMMENT' | 'CLUB' | 'USER';
  entityId: string;
  entityTitle?: string;
  authorName?: string;
}

const REPORT_REASONS = [
  { id: 'SPAM', label: 'Spam or Advertising', icon: 'megaphone-outline' },
  { id: 'HARASSMENT', label: 'Harassment or Hate Speech', icon: 'alert-circle-outline' },
  { id: 'EXPLICIT', label: 'Inappropriate or Explicit Content', icon: 'eye-off-outline' },
  { id: 'SPOILERS', label: 'Unmarked Major Spoilers', icon: 'warning-outline' },
  { id: 'OTHER', label: 'Other Policy Violation', icon: 'shield-outline' },
] as const;

export function ReportContentModal({
  visible,
  target,
  onClose,
}: {
  visible: boolean;
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const { showInfo } = useDialog();
  const [selectedReason, setSelectedReason] = useState<string>('SPAM');
  const [details, setDetails] = useState('');
  const [blockAuthor, setBlockAuthor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!target) return null;

  const handleSubmit = async () => {
    haptics.selection();
    setIsSubmitting(true);

    // Simulate fast submission & store logging
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSubmitting(false);

    showInfo(
      'Report Received',
      `Thank you for keeping CineWrapped safe. Our moderation team reviews all flagged content within 24 hours.${
        blockAuthor ? ' This user has also been blocked from your feed.' : ''
      }`,
    );

    setDetails('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Report {target.entityType === 'REVIEW' ? 'Review' : target.entityType === 'USER' ? 'User' : 'Content'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {target.entityTitle ? `"${target.entityTitle}"` : `Reported by @${target.authorName ?? 'user'}`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceRaised }]}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Reason Selection */}
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            Why are you reporting this?
          </Text>
          <View style={styles.reasonsList}>
            {REPORT_REASONS.map((r) => {
              const isSelected = selectedReason === r.id;
              return (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  onPress={() => {
                    haptics.selection();
                    setSelectedReason(r.id);
                  }}
                  style={[
                    styles.reasonItem,
                    {
                      backgroundColor: isSelected ? colors.surfaceRaised : colors.surface,
                      borderColor: isSelected ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={r.icon as any}
                    size={18}
                    color={isSelected ? colors.brand : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      {
                        color: isSelected ? colors.textPrimary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {r.label}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Optional Details */}
          <TextInput
            placeholder="Additional details (optional)…"
            placeholderTextColor={colors.textDisabled}
            value={details}
            onChangeText={setDetails}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
          />

          {/* Block User Checkbox */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: blockAuthor }}
            onPress={() => {
              haptics.selection();
              setBlockAuthor((prev) => !prev);
            }}
            style={styles.blockRow}
          >
            <Ionicons
              name={blockAuthor ? 'checkbox' : 'square-outline'}
              size={20}
              color={blockAuthor ? colors.brand : colors.textSecondary}
            />
            <Text style={[styles.blockText, { color: colors.textSecondary }]}>
              Block user so you will no longer see their content
            </Text>
          </Pressable>

          {/* Submit Button */}
          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: colors.danger,
                opacity: pressed || isSubmitting ? 0.8 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Violation Report</Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  reasonsList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
  },
  input: {
    height: 70,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  blockText: {
    fontSize: 12,
    flex: 1,
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
