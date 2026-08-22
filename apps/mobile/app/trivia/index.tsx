import type { GamificationDashboard } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { haptics } from '../../src/lib/haptics';
import { useAuth } from '../../src/providers/auth-provider';

interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  filmTitle: string;
  filmYear: number;
}

const TRIVIA_SET: {
  seasonTitle: string;
  seasonSubtitle: string;
  themeBadge: string;
  questions: TriviaQuestion[];
} = {
  seasonTitle: 'Christopher Nolan Retrospective',
  seasonSubtitle: 'Week 33 Cinema Challenge · Precision, 70mm IMAX, and Practical Effects',
  themeBadge: 'DIRECTOR SPOTLIGHT',
  questions: [
    {
      id: 'q1',
      question:
        'In "Interstellar" (2014), each tick heard on Miller’s water planet represents how much time passing back on Earth?',
      options: ['1 Earth Day', '1 Earth Week', '1 Earth Month', '1 Earth Year'],
      correctIndex: 0,
      explanation:
        'Hans Zimmer built the score around a 1.25-second acoustic pulse—each tick represents exactly one full Earth day passing, totaling 7 Earth years for every hour spent on the surface.',
      filmTitle: 'Interstellar',
      filmYear: 2014,
    },
    {
      id: 'q2',
      question:
        'Which heavyweight camera was custom-waterproofed and strapped to a vintage Spitfire in "Dunkirk"?',
      options: [
        'IMAX 15-Perf 65mm Camera',
        'ARRI Alexa 65 Large Format',
        'Panavision Millennium DXL2',
        'RED Monstro 8K VV',
      ],
      correctIndex: 0,
      explanation:
        'Cinematographer Hoyte van Hoytema mounted a 54-pound IMAX 15/70mm camera onto a functioning Spitfire cockpit wing, even recovering it intact after a planned water crash.',
      filmTitle: 'Dunkirk',
      filmYear: 2017,
    },
    {
      id: 'q3',
      question:
        'What real-world mixture was ignited to recreate the blinding Trinity Test fireball in "Oppenheimer" without CGI?',
      options: [
        'Gasoline, Propane & Magnesium Powder',
        'Pure Kerosene & Diesel Fuel',
        'Black Powder & Sulfur Slurry',
        'TNT & Aviation Jelly',
      ],
      correctIndex: 0,
      explanation:
        'Scott Fisher’s practical effects crew formulated an ultra-bright slurry of gasoline, propane, aluminum powder, and magnesium to generate the authentic atomic silhouette.',
      filmTitle: 'Oppenheimer',
      filmYear: 2023,
    },
  ],
};

export default function CinemaTriviaScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Gamification dashboard
  const gamification = useQuery({
    queryKey: ['gamification'],
    queryFn: () => api.request<GamificationDashboard>('gamification'),
    enabled: session !== null,
  });

  const joinChallenge = useMutation({
    mutationFn: (challengeId: string) => {
      haptics.clapperSnap();
      return api.request(`challenges/${challengeId}/join`, {
        method: 'POST',
        idempotencyKey: `join-challenge-${challengeId}`,
      });
    },
    onSuccess: async () => {
      haptics.celebration();
      await queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  if (session === null) return <Redirect href="/(auth)/login" />;

  const questions = TRIVIA_SET.questions;
  const currentQ: TriviaQuestion = questions[currentIndex] ?? questions[0]!;

  const handleSelectOption = (idx: number) => {
    if (hasAnswered) return;

    setSelectedOption(idx);
    setHasAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      haptics.celebration();
      setScore((prev) => prev + 1);
    } else {
      haptics.error();
    }
  };

  const handleNext = () => {
    haptics.selection();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
    } else {
      setIsCompleted(true);
      haptics.celebration();
    }
  };

  const handleShareScore = async () => {
    haptics.selection();
    await Share.share({
      message: `🎬 I scored ${score}/${questions.length} on this week's CineWrapped Cinema Trivia (${TRIVIA_SET.seasonTitle})! Can you beat my score?`,
    });
  };

  const handleRestart = () => {
    haptics.selection();
    setCurrentIndex(0);
    setSelectedOption(null);
    setHasAnswered(false);
    setScore(0);
    setIsCompleted(false);
  };

  const challenges = gamification.data?.challenges ?? [];

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Cinema Trivia & Challenges',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.themePill,
            { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' },
          ]}
        >
          <Ionicons name="film" size={12} color="#F59E0B" />
          <Text style={styles.themePillText}>{TRIVIA_SET.themeBadge}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          {TRIVIA_SET.seasonTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {TRIVIA_SET.seasonSubtitle}
        </Text>
      </View>

      {/* Quiz Card */}
      {!isCompleted ? (
        <View
          style={[styles.quizCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Progress Header */}
          <View style={styles.quizProgressRow}>
            <Text style={[styles.stepText, { color: colors.brand }]}>
              QUESTION {currentIndex + 1} OF {questions.length}
            </Text>
            <View style={[styles.filmBadge, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.filmBadgeText, { color: colors.textSecondary }]}>
                🎥 {currentQ.filmTitle} ({currentQ.filmYear})
              </Text>
            </View>
          </View>

          {/* Question Text */}
          <Text style={[styles.questionText, { color: colors.textPrimary }]}>
            {currentQ.question}
          </Text>

          {/* Options */}
          <View style={styles.optionsList}>
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;

              let optionBg: string = colors.surfaceRaised;
              let optionBorder: string = colors.border;
              let textColor: string = colors.textPrimary;

              if (hasAnswered) {
                if (isCorrect) {
                  optionBg = 'rgba(16, 185, 129, 0.2)';
                  optionBorder = '#10B981';
                  textColor = '#10B981';
                } else if (isSelected) {
                  optionBg = 'rgba(239, 68, 68, 0.2)';
                  optionBorder = '#EF4444';
                  textColor = '#EF4444';
                }
              }

              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={hasAnswered}
                  key={option}
                  onPress={() => handleSelectOption(idx)}
                  style={({ pressed }) => [
                    styles.optionButton,
                    {
                      backgroundColor: optionBg,
                      borderColor: optionBorder,
                      opacity: pressed && !hasAnswered ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionLetterBox,
                      {
                        backgroundColor:
                          isCorrect && hasAnswered
                            ? '#10B981'
                            : isSelected && hasAnswered
                              ? '#EF4444'
                              : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLetter,
                        {
                          color:
                            (isCorrect || isSelected) && hasAnswered
                              ? '#FFFFFF'
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {String.fromCharCode(65 + idx)}
                    </Text>
                  </View>

                  <Text style={[styles.optionLabel, { color: textColor }]}>{option}</Text>

                  {hasAnswered && isCorrect ? (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  ) : hasAnswered && isSelected ? (
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Lore & Behind the Scenes Explanation Reveal */}
          {hasAnswered ? (
            <View
              style={[
                styles.loreCard,
                {
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                },
              ]}
            >
              <View style={styles.loreHeader}>
                <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                <Text style={styles.loreTitle}>DIRECTOR'S LORE</Text>
              </View>
              <Text style={[styles.loreText, { color: colors.textPrimary }]}>
                {currentQ.explanation}
              </Text>
            </View>
          ) : null}

          {/* Next / Submit Button */}
          {hasAnswered ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleNext}
              style={({ pressed }) => [
                styles.nextButton,
                { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.nextButtonText, { color: colors.onBrand }]}>
                {currentIndex + 1 < questions.length ? 'Next Question' : 'View Results & Trophy'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onBrand} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        /* Victory & Trophy Card */
        <View
          style={[
            styles.victoryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.trophyIconBox}>
            <Ionicons name="trophy" size={48} color="#FFD700" />
          </View>

          <Text style={[styles.victoryTitle, { color: colors.textPrimary }]}>
            {score === questions.length ? 'Flawless Cinephile!' : 'Challenge Complete!'}
          </Text>

          <Text style={[styles.victoryScore, { color: colors.brand }]}>
            {score} of {questions.length} Correct · +{score * 50} Points
          </Text>

          <Text style={[styles.victoryDesc, { color: colors.textSecondary }]}>
            You have unlocked the limited-edition{' '}
            <Text style={{ fontWeight: '800', color: colors.textPrimary }}>
              Golden Projector 3D Trophy
            </Text>{' '}
            for your CineWrapped Trophy Cabinet and earned bonus badges for your Year in Review!
          </Text>

          <View style={styles.victoryActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleShareScore()}
              style={({ pressed }) => [
                styles.shareBtn,
                { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="share-social" size={18} color={colors.onBrand} />
              <Text style={[styles.shareBtnText, { color: colors.onBrand }]}>Share Score</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleRestart}
              style={({ pressed }) => [
                styles.retryBtn,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="refresh" size={18} color={colors.textPrimary} />
              <Text style={[styles.retryBtnText, { color: colors.textPrimary }]}>Play Again</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Community Challenges Section */}
      <View style={styles.challengesSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Active Community Challenges
          </Text>
          <Pressable onPress={() => router.push('/gamification')}>
            <Text style={{ color: colors.brand, fontSize: 13, fontWeight: '700' }}>
              Trophy Cabinet →
            </Text>
          </Pressable>
        </View>

        <View style={styles.challengesList}>
          {challenges.map((challenge) => {
            const isJoining = joinChallenge.isPending && joinChallenge.variables === challenge.id;
            return (
              <View
                key={challenge.id}
                style={[
                  styles.challengeCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeTitleWrap}>
                    <Ionicons name="flag-outline" size={18} color={colors.brand} />
                    <Text style={[styles.challengeName, { color: colors.textPrimary }]}>
                      {challenge.name}
                    </Text>
                  </View>
                  <View style={[styles.pointsBadge, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 11 }}>
                      +{challenge.points} pts
                    </Text>
                  </View>
                </View>

                <Text style={[styles.challengeDesc, { color: colors.textSecondary }]}>
                  {challenge.description}
                </Text>

                <View style={styles.challengeFooter}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                    Ends {new Date(challenge.endsAt).toLocaleDateString()}
                  </Text>

                  {challenge.joined ? (
                    <View
                      style={[styles.joinedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                    >
                      <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 11 }}>
                        {challenge.completedAt === null ? '✓ Active' : '🏆 Completed'}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      disabled={joinChallenge.isPending}
                      onPress={() => joinChallenge.mutate(challenge.id)}
                      style={({ pressed }) => [
                        styles.joinBtn,
                        {
                          backgroundColor: colors.brand,
                          opacity: pressed || joinChallenge.isPending ? 0.8 : 1,
                        },
                      ]}
                    >
                      {isJoining ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <Text style={[styles.joinBtnText, { color: colors.onBrand }]}>
                          Join Challenge
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6, marginTop: 10 },
  themePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  themePillText: { color: '#F59E0B', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 18 },

  // Quiz Card
  quizCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 16,
    marginTop: 14,
    padding: 18,
  },
  quizProgressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  filmBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  filmBadgeText: { fontSize: 11, fontWeight: '600' },
  questionText: { fontSize: 17, fontWeight: '800', lineHeight: 24 },

  optionsList: { gap: 10 },
  optionButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.2,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  optionLetterBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  optionLetter: { fontSize: 13, fontWeight: '800' },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 19 },

  // Lore Card
  loreCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  loreHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  loreTitle: { color: '#F59E0B', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  loreText: { fontSize: 13, lineHeight: 19 },

  nextButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  nextButtonText: { fontSize: 14, fontWeight: '800' },

  // Victory Card
  victoryCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 12,
    marginTop: 14,
    padding: 24,
    textAlign: 'center',
  },
  trophyIconBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  victoryTitle: { fontSize: 22, fontWeight: '800' },
  victoryScore: { fontSize: 16, fontWeight: '800' },
  victoryDesc: { fontSize: 13, lineHeight: 20, textAlign: 'center' },

  victoryActions: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
  shareBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 46,
  },
  shareBtnText: { fontSize: 14, fontWeight: '800' },
  retryBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 46,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700' },

  // Community Challenges
  challengesSection: { gap: 12, marginTop: 24 },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  challengesList: { gap: 10 },
  challengeCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  challengeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  challengeTitleWrap: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  challengeName: { fontSize: 15, fontWeight: '800' },
  pointsBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  challengeDesc: { fontSize: 13, lineHeight: 18 },
  challengeFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  joinedBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  joinBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  joinBtnText: { fontSize: 12, fontWeight: '700' },
});
