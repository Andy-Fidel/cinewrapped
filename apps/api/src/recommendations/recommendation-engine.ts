export const RECOMMENDATION_MODEL_VERSION = 'deterministic-v1';

export interface RankingTaste {
  genreWeights: Record<string, number>;
  genreNames: Record<string, string>;
  dislikedGenreIds: string[];
  preferredLanguages: string[];
  preferredDecades: number[];
  runtimeMinimum: number | null;
  runtimeMaximum: number | null;
  mainstreamPreferencePercent: number;
  savedGenreIds: string[];
  dismissedGenreIds: string[];
}

export interface RankingCandidate {
  id: string;
  genreIds: string[];
  originalLanguage: string | null;
  releaseYear: number | null;
  runtimeMinutes: number | null;
  averageProviderRating: number | null;
  providerPopularity: number | null;
}

export interface RankedCandidate {
  mediaId: string;
  score: number;
  recommendationType: 'PERSONALIZED' | 'HIDDEN_GEM';
  explanation: string;
  reasonCodes: string[];
  context: Record<string, unknown>;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function decade(year: number): number {
  return Math.floor(year / 10) * 10;
}

export function rankRecommendations(
  taste: RankingTaste,
  candidates: RankingCandidate[],
): RankedCandidate[] {
  const disliked = new Set(taste.dislikedGenreIds);
  const saved = new Set(taste.savedGenreIds);
  const dismissed = new Set(taste.dismissedGenreIds);
  const preferredLanguages = new Set(taste.preferredLanguages);
  const preferredDecades = new Set(taste.preferredDecades);

  return candidates
    .map((candidate): RankedCandidate | null => {
      if (candidate.genreIds.some((genreId) => disliked.has(genreId))) return null;
      const reasons: string[] = [];
      const matchingGenres = candidate.genreIds
        .map((genreId) => ({ genreId, weight: taste.genreWeights[genreId] ?? 0 }))
        .filter(({ weight }) => weight > 0)
        .sort((left, right) => right.weight - left.weight);
      const genreScore =
        matchingGenres.length === 0
          ? 0
          : matchingGenres.reduce((sum, item) => sum + item.weight, 0) / matchingGenres.length;
      if (matchingGenres.length > 0) reasons.push('GENRE_AFFINITY');

      const ratingScore = clamp((candidate.averageProviderRating ?? 0) / 10);
      if (ratingScore >= 0.75) reasons.push('HIGHLY_RATED');
      const popularityScore = clamp(
        Math.log1p(candidate.providerPopularity ?? 0) / Math.log1p(1000),
      );
      const mainstreamWeight = 0.06 + (taste.mainstreamPreferencePercent / 100) * 0.12;
      if (popularityScore >= 0.65 && taste.mainstreamPreferencePercent >= 50) {
        reasons.push('POPULAR_MATCH');
      }
      const languageMatch =
        candidate.originalLanguage !== null && preferredLanguages.has(candidate.originalLanguage);
      if (languageMatch) reasons.push('LANGUAGE_MATCH');
      const decadeMatch =
        candidate.releaseYear !== null && preferredDecades.has(decade(candidate.releaseYear));
      if (decadeMatch) reasons.push('DECADE_MATCH');
      const runtimeMatch =
        candidate.runtimeMinutes !== null &&
        (taste.runtimeMinimum === null || candidate.runtimeMinutes >= taste.runtimeMinimum) &&
        (taste.runtimeMaximum === null || candidate.runtimeMinutes <= taste.runtimeMaximum);
      if (runtimeMatch) reasons.push('RUNTIME_MATCH');
      const savedMatch = candidate.genreIds.some((genreId) => saved.has(genreId));
      if (savedMatch) reasons.push('POSITIVE_FEEDBACK');
      const dismissedMatch = candidate.genreIds.some((genreId) => dismissed.has(genreId));

      const hiddenGem = (candidate.providerPopularity ?? 0) < 25 && ratingScore >= 0.7;
      if (hiddenGem) reasons.push('HIDDEN_GEM');
      const rawScore =
        0.08 +
        genreScore * 0.34 +
        ratingScore * 0.18 +
        popularityScore * mainstreamWeight +
        (languageMatch ? 0.08 : 0) +
        (decadeMatch ? 0.07 : 0) +
        (runtimeMatch ? 0.06 : 0) +
        (savedMatch ? 0.11 : 0) -
        (dismissedMatch ? 0.2 : 0) +
        (hiddenGem ? (1 - taste.mainstreamPreferencePercent / 100) * 0.08 : 0);
      const score = clamp(rawScore);
      if (score < 0.2) return null;

      const leadingGenre = matchingGenres[0]?.genreId;
      const genreName =
        leadingGenre === undefined ? null : (taste.genreNames[leadingGenre] ?? null);
      const explanation = hiddenGem
        ? genreName === null
          ? 'A highly rated hidden gem selected from your viewing preferences.'
          : `A highly rated hidden gem that matches your interest in ${genreName}.`
        : genreName !== null
          ? `Recommended because your activity shows a strong interest in ${genreName}.`
          : languageMatch
            ? 'Recommended because it matches your preferred viewing language.'
            : 'Recommended from your ratings, viewing preferences, and title quality.';
      return {
        mediaId: candidate.id,
        score: Number(score.toFixed(6)),
        recommendationType: hiddenGem ? 'HIDDEN_GEM' : 'PERSONALIZED',
        explanation,
        reasonCodes: reasons.slice(0, 8),
        context: {
          genreScore: Number(genreScore.toFixed(4)),
          ratingScore: Number(ratingScore.toFixed(4)),
          popularityScore: Number(popularityScore.toFixed(4)),
        },
      };
    })
    .filter((candidate): candidate is RankedCandidate => candidate !== null)
    .sort((left, right) => right.score - left.score || left.mediaId.localeCompare(right.mediaId));
}
