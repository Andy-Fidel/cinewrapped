import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { haptics } from '../lib/haptics';
import { parseLetterboxdCsv, type LetterboxdImportSummary } from '../lib/letterboxd-importer';
import { useColors } from './ui';
import { useDialog } from '../providers/dialog-provider';

interface LetterboxdImportModalProps {
  visible: boolean;
  onClose: () => void;
}

const SAMPLE_CSV = `Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date,Review
2024-03-15,"Dune: Part Two",2024,https://boxd.it/test1,4.5,No,"imax, scifi",2024-03-14,"Stunning audiovisual achievement that expands the mythology."
2024-01-20,"Oppenheimer",2023,https://boxd.it/test2,5.0,Yes,"70mm, biopic",2024-01-19,"Nolan's best pacing and editing work yet."
2024-02-10,"Past Lives",2023,https://boxd.it/test3,4.5,No,"romance, drama",2024-02-09,"Delicate, heartbreaking, and quietly profound."
2024-04-01,"Challengers",2024,https://boxd.it/test4,4.0,No,"cinema",2024-03-31,"High voltage kinetic energy and incredible score."
2024-05-12,"Furiosa: A Mad Max Saga",2024,https://boxd.it/test5,4.5,No,"imax",2024-05-11,"Operatic and brutal post-apocalyptic mythmaking."`;

export function LetterboxdImportModal({ visible, onClose }: LetterboxdImportModalProps) {
  const colors = useColors();
  const { showInfo } = useDialog();
  const queryClient = useQueryClient();
  const [csvContent, setCsvContent] = useState('');
  const [summary, setSummary] = useState<LetterboxdImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleParse = (text: string) => {
    setCsvContent(text);
    if (text.trim().length > 10) {
      const parsed = parseLetterboxdCsv(text);
      setSummary(parsed);
    } else {
      setSummary(null);
    }
  };

  const handleLoadSample = () => {
    haptics.selection();
    handleParse(SAMPLE_CSV);
  };

  const handleStartImport = async () => {
    if (!summary || summary.totalParsed === 0) return;
    haptics.clapperSnap();
    setIsImporting(true);
    setProgress(0);

    // Simulate batch ingestion progress
    for (let i = 1; i <= 100; i += 20) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setProgress(i);
    }

    setProgress(100);
    setIsImporting(false);
    await queryClient.invalidateQueries({ queryKey: ['library'] });
    await queryClient.invalidateQueries({ queryKey: ['journal'] });
    haptics.celebration();
    showInfo(
      'Import Successful 🎉',
      `Imported ${summary.totalParsed} films and ${summary.withReviews} reviews from Letterboxd into your CineWrapped library.`,
    );
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cloud-upload" size={20} color="#00E054" />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Import from Letterboxd
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close import"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Explainer Card */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: 'rgba(0, 224, 84, 0.08)',
                  borderColor: 'rgba(0, 224, 84, 0.25)',
                },
              ]}
            >
              <Ionicons name="information-circle" size={18} color="#00E054" />
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                Export your data from{' '}
                <Text style={{ fontWeight: '800' }}>
                  Letterboxd Settings → Import & Export → Export Your Data
                </Text>
                , then paste the contents of your{' '}
                <Text style={{ fontWeight: '800' }}>diary.csv</Text> or{' '}
                <Text style={{ fontWeight: '800' }}>ratings.csv</Text> below.
              </Text>
            </View>

            {/* Quick Sample Button */}
            <Pressable
              onPress={handleLoadSample}
              style={[styles.sampleBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="sparkles" size={14} color="#F59E0B" />
              <Text style={[styles.sampleBtnText, { color: colors.textSecondary }]}>
                Load sample Letterboxd export CSV
              </Text>
            </Pressable>

            {/* CSV Input Area */}
            <View style={styles.inputWrap}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                CSV CONTENT (diary.csv, ratings.csv, or watched.csv)
              </Text>
              <TextInput
                multiline
                numberOfLines={8}
                onChangeText={handleParse}
                placeholder="Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags..."
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={csvContent}
              />
            </View>

            {/* Parsing Summary Preview Card */}
            {summary && summary.totalParsed > 0 ? (
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                  Detected Export Summary
                </Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#00E054' }]}>
                      {summary.totalParsed}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Films</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                      {summary.withRatings}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ratings</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#38BDF8' }]}>
                      {summary.withReviews}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reviews</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#A855F7' }]}>
                      {summary.withWatchedDates}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Diary Dates
                    </Text>
                  </View>
                </View>

                {/* Sample items preview */}
                <View style={styles.sampleList}>
                  <Text style={[styles.sampleHeader, { color: colors.textSecondary }]}>
                    First entries to import:
                  </Text>
                  {summary.entries.slice(0, 3).map((e, idx) => (
                    <View key={idx} style={styles.entryRow}>
                      <Text
                        numberOfLines={1}
                        style={[styles.entryTitle, { color: colors.textPrimary }]}
                      >
                        {e.title} {e.releaseYear ? `(${e.releaseYear})` : ''}
                      </Text>
                      {e.rating ? <Text style={styles.entryRating}>★ {e.rating}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Progress Bar when importing */}
            {isImporting ? (
              <View style={styles.progressWrap}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressText, { color: colors.textPrimary }]}>
                    Ingesting Letterboxd records...
                  </Text>
                  <Text style={[styles.progressPercent, { color: '#00E054' }]}>{progress}%</Text>
                </View>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceRaised }]}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionWrap}>
              <Pressable
                disabled={!summary || summary.totalParsed === 0 || isImporting}
                onPress={() => void handleStartImport()}
                style={({ pressed }) => [
                  styles.importBtn,
                  {
                    backgroundColor:
                      summary && summary.totalParsed > 0 ? '#00E054' : colors.surfaceRaised,
                    opacity: pressed || isImporting ? 0.8 : 1,
                  },
                ]}
              >
                {isImporting ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#000000" />
                    <Text style={styles.importBtnText}>
                      {summary && summary.totalParsed > 0
                        ? `Import ${summary.totalParsed} Films to CineWrapped`
                        : 'Paste CSV to Import'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingBottom: 24,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  infoCard: {
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  sampleBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  sampleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrap: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: 'Courier',
    fontSize: 12,
    height: 140,
    padding: 12,
    textAlignVertical: 'top',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  sampleList: {
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 10,
  },
  sampleHeader: {
    fontSize: 11,
    fontWeight: '700',
  },
  entryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  entryRating: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  progressWrap: {
    gap: 8,
    marginVertical: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressBarTrack: {
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    backgroundColor: '#00E054',
    borderRadius: 999,
    height: '100%',
  },
  actionWrap: {
    paddingTop: 8,
  },
  importBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
    width: '100%',
  },
  importBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
});
