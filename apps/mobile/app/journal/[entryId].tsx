import type { JournalAttachmentType, JournalEntrySummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeatureGate } from '../../src/components/feature-gate';
import { JournalForm, type JournalFormValue } from '../../src/components/journal-form';
import { Button, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import type { LocalUploadAsset } from '../../src/lib/media-upload';
import { createPrivateObjectUrl, deletePrivateObject } from '../../src/lib/private-storage';
import { removeJournalAttachment, uploadJournalImage } from '../../src/lib/journal-attachments';
import { haptics } from '../../src/lib/haptics';
import { useAuth } from '../../src/providers/auth-provider';
import { useDialog } from '../../src/providers/dialog-provider';

export default function JournalEntryScreen() {
  const colors = useColors();
  const { session, user } = useAuth();
  const { confirm, showError, showInfo } = useDialog();
  const queryClient = useQueryClient();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const entry = useQuery({
    queryKey: ['journal-entry', entryId],
    queryFn: () => api.request<JournalEntrySummary>(`journal/${entryId}`),
    enabled: session !== null && typeof entryId === 'string',
  });
  const update = useMutation({
    mutationFn: (value: JournalFormValue) => {
      haptics.clapperSnap();
      return api.request<JournalEntrySummary>(`journal/${entryId}`, {
        method: 'PATCH',
        body: {
          expectedVersion: entry.data?.version,
          status: value.status,
          title: value.title || null,
          notes: value.notes || null,
          viewingLocation: value.viewingLocation || null,
          companionNames: value.companionNames,
          memorableQuotes: value.memorableQuotes,
          moodBefore: value.moodBefore,
          moodAfter: value.moodAfter,
        },
      });
    },
    onSuccess: async (next) => {
      haptics.celebration();
      queryClient.setQueryData(['journal-entry', entryId], next);
      await queryClient.invalidateQueries({ queryKey: ['journal'] });
      showInfo(
        'Journal saved',
        next.status === 'DRAFT' ? 'Your draft is safe.' : 'Your entry is complete.',
      );
    },
    onError: (error) => {
      haptics.error();
      showError('Could not save journal entry', errorMessage(error));
    },
  });
  const remove = useMutation({
    mutationFn: async () => {
      haptics.warning();
      const result = await api.request<{ deleted: boolean; attachmentPaths: string[] }>(
        `journal/${entryId}`,
        { method: 'DELETE' },
      );
      await Promise.all(
        result.attachmentPaths.map((path) =>
          deletePrivateObject('journal-attachments', path).catch(() => undefined),
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['journal'] });
      router.replace('/journal');
    },
    onError: (error) => showError('Could not delete journal entry', errorMessage(error)),
  });

  if (session === null) return <Redirect href="/(auth)/login" />;

  const registerAttachment = async (
    asset: LocalUploadAsset,
    attachmentType: JournalAttachmentType,
  ) => {
    if (entry.data === undefined) return;
    try {
      const next = await uploadJournalImage({
        entryId: entry.data.id,
        ownerId: session.user.id,
        asset,
        attachmentType,
        onPhase: (phase) => {
          if (phase === 'READING') setUploadStatus('Preparing attachment…');
          if (phase === 'UPLOADING') setUploadStatus('Uploading attachment…');
          if (phase === 'COMPLETE') setUploadStatus('Saving attachment…');
        },
      });
      queryClient.setQueryData(['journal-entry', entryId], next);
      await queryClient.invalidateQueries({ queryKey: ['journal'] });
    } catch (error) {
      showError('Could not add attachment', errorMessage(error));
    } finally {
      setUploadStatus(null);
    }
  };

  const pickAttachment = async (attachmentType: JournalAttachmentType) => {
    if (user === null || entry.data === undefined) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const openSettings = await confirm({
        title: 'Photo access is off',
        message: 'Allow photo access in Settings to attach journal photos.',
        confirmLabel: 'Open Settings',
        cancelLabel: 'Not now',
      });
      if (openSettings) await Linking.openSettings();
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (asset === undefined) return;
    await registerAttachment(asset, attachmentType);
  };

  const pickTicketPdf = async () => {
    if (user === null || entry.data === undefined) return;
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (asset === undefined) return;
    await registerAttachment(asset, 'TICKET');
  };

  const openAttachment = async (path: string) => {
    try {
      await Linking.openURL(await createPrivateObjectUrl('journal-attachments', path, 300));
    } catch (error) {
      showError('Could not open attachment', errorMessage(error));
    }
  };

  const deleteAttachment = async (attachment: JournalEntrySummary['attachments'][number]) => {
    if (entry.data === undefined) return;
    const accepted = await confirm({
      title: 'Remove attachment?',
      message: `${attachment.fileName} will be permanently removed from this journal entry.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!accepted) return;
    try {
      await removeJournalAttachment(entry.data.id, attachment);
      await entry.refetch();
    } catch (error) {
      showError('Could not remove attachment', errorMessage(error));
    }
  };

  const deleteEntry = async () => {
    const accepted = await confirm({
      title: 'Delete journal entry?',
      message: 'This permanently removes the entry and all of its private attachments.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (accepted) remove.mutate();
  };

  return (
    <Screen>
      <Stack.Screen
        options={{ headerShown: true, title: entry.data?.media.title ?? 'Journal Entry' }}
      />
      <FeatureGate feature="MOVIE_JOURNAL">
        {entry.isPending ? (
          <Text style={{ color: colors.textSecondary }}>Loading entry…</Text>
        ) : null}
        {entry.isError ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            This journal entry could not be loaded.
          </Text>
        ) : null}
        {entry.data === undefined ? null : (
          <>
            <View style={styles.header}>
              {entry.data.media.posterUrl ? (
                <Image source={{ uri: entry.data.media.posterUrl }} style={styles.poster} />
              ) : null}
              <View style={styles.headerCopy}>
                <Text style={[styles.eyebrow, { color: colors.brand }]}>{entry.data.status}</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {entry.data.media.title}
                </Text>
                <Text style={[styles.privateNote, { color: colors.textSecondary }]}>
                  Private to you · updated {new Date(entry.data.updatedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <JournalForm
              initialValue={{
                title: entry.data.title ?? '',
                notes: entry.data.notes ?? '',
                viewingLocation: entry.data.viewingLocation ?? '',
                companionNames: entry.data.companionNames,
                memorableQuotes: entry.data.memorableQuotes,
                moodBefore: entry.data.moodBefore,
                moodAfter: entry.data.moodAfter,
                status: entry.data.status,
              }}
              saving={update.isPending}
              onSubmit={(value) => update.mutate(value)}
            />
            <View style={styles.attachmentsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Photos & tickets
              </Text>
              <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
                Private files use short-lived links and remain visible only to you.
              </Text>
            </View>
            <View style={styles.attachmentActions}>
              <Button
                label="Add ticket photo"
                disabled={uploadStatus !== null}
                onPress={() => void pickAttachment('TICKET')}
                variant="secondary"
              />
              <Button
                label="Add personal photo"
                disabled={uploadStatus !== null}
                onPress={() => void pickAttachment('PERSONAL_PHOTO')}
                variant="secondary"
              />
              <Button
                label="Add ticket PDF"
                disabled={uploadStatus !== null}
                onPress={() => void pickTicketPdf()}
                variant="secondary"
              />
              {uploadStatus === null ? null : (
                <Text accessibilityRole="alert" style={{ color: colors.textSecondary }}>
                  {uploadStatus}
                </Text>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentList}
            >
              {entry.data.attachments.map((attachment) => (
                <View
                  key={attachment.id}
                  style={[
                    styles.attachmentCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void openAttachment(attachment.storagePath)}
                    style={styles.attachmentOpen}
                  >
                    <Ionicons
                      color={colors.brand}
                      name={
                        attachment.attachmentType === 'TICKET' ? 'ticket-outline' : 'image-outline'
                      }
                      size={26}
                    />
                    <Text
                      numberOfLines={2}
                      style={[styles.attachmentName, { color: colors.textPrimary }]}
                    >
                      {attachment.fileName}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Remove ${attachment.fileName}`}
                    accessibilityRole="button"
                    onPress={() => void deleteAttachment(attachment)}
                  >
                    <Ionicons color={colors.danger} name="trash-outline" size={18} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Button
              label="Delete journal entry"
              variant="danger"
              loading={remove.isPending}
              onPress={() => void deleteEntry()}
            />
          </>
        )}
      </FeatureGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  attachmentActions: { gap: 10 },
  attachmentCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    width: 190,
  },
  attachmentList: { gap: 10 },
  attachmentName: { fontSize: 12, fontWeight: '700' },
  attachmentOpen: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8 },
  attachmentsHeader: { gap: 5 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  headerCopy: { flex: 1, gap: 5 },
  poster: { borderRadius: 10, height: 108, width: 72 },
  privateNote: { fontSize: 12 },
  sectionBody: { fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 19, fontWeight: '800' },
  title: { fontSize: 23, fontWeight: '800' },
});
