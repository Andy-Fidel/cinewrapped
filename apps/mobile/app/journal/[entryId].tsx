import type { JournalAttachmentType, JournalEntrySummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeatureGate } from '../../src/components/feature-gate';
import { JournalForm, type JournalFormValue } from '../../src/components/journal-form';
import { Button, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { createPrivateObjectUrl, deletePrivateObject } from '../../src/lib/private-storage';
import { removeJournalAttachment, uploadJournalImage } from '../../src/lib/journal-attachments';
import { useAuth } from '../../src/providers/auth-provider';

export default function JournalEntryScreen() {
  const colors = useColors();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const entry = useQuery({
    queryKey: ['journal-entry', entryId],
    queryFn: () => api.request<JournalEntrySummary>(`journal/${entryId}`),
    enabled: session !== null && typeof entryId === 'string',
  });
  const update = useMutation({
    mutationFn: (value: JournalFormValue) =>
      api.request<JournalEntrySummary>(`journal/${entryId}`, {
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
      }),
    onSuccess: async (next) => {
      queryClient.setQueryData(['journal-entry', entryId], next);
      await queryClient.invalidateQueries({ queryKey: ['journal'] });
      Alert.alert(
        'Journal saved',
        next.status === 'DRAFT' ? 'Your draft is safe.' : 'Your entry is complete.',
      );
    },
    onError: (error) => Alert.alert('Could not save journal entry', errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: async () => {
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
    onError: (error) => Alert.alert('Could not delete journal entry', errorMessage(error)),
  });

  if (session === null) return <Redirect href="/(auth)/login" />;

  const pickAttachment = async (attachmentType: JournalAttachmentType) => {
    if (user === null || entry.data === undefined) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photo access is off',
        'Allow photo access in Settings to attach journal photos.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (asset === undefined) return;
    try {
      const next = await uploadJournalImage({
        entryId: entry.data.id,
        ownerId: session.user.id,
        asset,
        attachmentType,
      });
      queryClient.setQueryData(['journal-entry', entryId], next);
      await queryClient.invalidateQueries({ queryKey: ['journal'] });
    } catch (error) {
      Alert.alert('Could not add photo', errorMessage(error));
    }
  };

  const openAttachment = async (path: string) => {
    try {
      await Linking.openURL(await createPrivateObjectUrl('journal-attachments', path, 300));
    } catch (error) {
      Alert.alert('Could not open attachment', errorMessage(error));
    }
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
                onPress={() => void pickAttachment('TICKET')}
                variant="secondary"
              />
              <Button
                label="Add personal photo"
                onPress={() => void pickAttachment('PERSONAL_PHOTO')}
                variant="secondary"
              />
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
                    onPress={() =>
                      void removeJournalAttachment(entry.data.id, attachment)
                        .then(() => entry.refetch())
                        .catch((error) =>
                          Alert.alert('Could not remove attachment', errorMessage(error)),
                        )
                    }
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
              onPress={() =>
                Alert.alert(
                  'Delete journal entry?',
                  'This removes the entry and all of its private attachments.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
                  ],
                )
              }
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
