import type { JournalEntryStatus } from '@cinewrapped/shared-types';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SelectChip, settingsControlStyles } from './settings-controls';
import { Button, Field, useColors } from './ui';

export interface JournalFormValue {
  title: string;
  notes: string;
  viewingLocation: string;
  companionNames: string[];
  memorableQuotes: string[];
  moodBefore: string | null;
  moodAfter: string | null;
  status: JournalEntryStatus;
}

const moods = ['Excited', 'Happy', 'Calm', 'Reflective', 'Tense', 'Sad', 'Surprised'];

export function JournalForm({
  initialValue,
  saving,
  onSubmit,
}: {
  initialValue?: Partial<JournalFormValue>;
  saving: boolean;
  onSubmit: (value: JournalFormValue) => void;
}) {
  const colors = useColors();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [viewingLocation, setViewingLocation] = useState(initialValue?.viewingLocation ?? '');
  const [companions, setCompanions] = useState((initialValue?.companionNames ?? []).join(', '));
  const [quotes, setQuotes] = useState((initialValue?.memorableQuotes ?? []).join('\n'));
  const [moodBefore, setMoodBefore] = useState<string | null>(initialValue?.moodBefore ?? null);
  const [moodAfter, setMoodAfter] = useState<string | null>(initialValue?.moodAfter ?? null);

  const submit = (status: JournalEntryStatus) => {
    onSubmit({
      title: title.trim(),
      notes: notes.trim(),
      viewingLocation: viewingLocation.trim(),
      companionNames: companions
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
      memorableQuotes: quotes
        .split('\n')
        .map((quote) => quote.trim())
        .filter(Boolean),
      moodBefore,
      moodAfter,
      status,
    });
  };

  return (
    <View style={styles.form}>
      <Field label="Entry title" maxLength={160} onChangeText={setTitle} value={title} />
      <Field
        label="Personal notes"
        maxLength={20_000}
        multiline
        numberOfLines={7}
        onChangeText={setNotes}
        style={styles.multiline}
        textAlignVertical="top"
        value={notes}
      />
      <Field
        label="Viewing location"
        maxLength={200}
        onChangeText={setViewingLocation}
        placeholder="Cinema, home, city…"
        value={viewingLocation}
      />
      <Field
        label="Watched with"
        maxLength={2_000}
        onChangeText={setCompanions}
        placeholder="Separate names with commas"
        value={companions}
      />
      <Field
        label="Memorable quotes"
        maxLength={6_000}
        multiline
        numberOfLines={4}
        onChangeText={setQuotes}
        placeholder="Enter one quote per line"
        style={styles.shortMultiline}
        textAlignVertical="top"
        value={quotes}
      />

      <View style={styles.moodGroup}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Mood before</Text>
        <View style={settingsControlStyles.chips}>
          {moods.map((mood) => (
            <SelectChip
              key={`before-${mood}`}
              label={mood}
              onPress={() => setMoodBefore((current) => (current === mood ? null : mood))}
              selected={moodBefore === mood}
            />
          ))}
        </View>
      </View>

      <View style={styles.moodGroup}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Mood after</Text>
        <View style={settingsControlStyles.chips}>
          {moods.map((mood) => (
            <SelectChip
              key={`after-${mood}`}
              label={mood}
              onPress={() => setMoodAfter((current) => (current === mood ? null : mood))}
              selected={moodAfter === mood}
            />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          disabled={saving}
          label="Save draft"
          loading={saving}
          onPress={() => submit('DRAFT')}
          variant="secondary"
        />
        <Button
          disabled={saving}
          label="Complete entry"
          loading={saving}
          onPress={() => submit('COMPLETED')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  form: { gap: 18 },
  moodGroup: { gap: 10 },
  multiline: { minHeight: 150 },
  sectionLabel: { fontSize: 14, fontWeight: '700' },
  shortMultiline: { minHeight: 96 },
});
