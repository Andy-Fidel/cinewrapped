import type { DiscoveryInterpretation, DiscoveryMood } from '@cinewrapped/shared-types';

const moodGenres: Record<DiscoveryMood, string[]> = {
  FUNNY: ['Comedy'],
  COZY: ['Comedy', 'Family'],
  ROMANTIC: ['Romance'],
  TENSE: ['Thriller'],
  THOUGHTFUL: ['Drama'],
  UPLIFTING: ['Comedy', 'Family'],
  SCARY: ['Horror'],
  ADVENTUROUS: ['Adventure', 'Action'],
};

const moodPatterns: Array<[DiscoveryMood, RegExp]> = [
  ['FUNNY', /\b(funny|comedy|hilarious|laugh)\b/iu],
  ['COZY', /\b(cozy|comfort|gentle|relaxing)\b/iu],
  ['ROMANTIC', /\b(romantic|romance|date night)\b/iu],
  ['TENSE', /\b(tense|thrilling|thriller|suspense)\b/iu],
  ['THOUGHTFUL', /\b(thoughtful|cerebral|philosophical|moving)\b/iu],
  ['UPLIFTING', /\b(uplifting|feel[ -]?good|hopeful)\b/iu],
  ['SCARY', /\b(scary|horror|terrifying|creepy)\b/iu],
  ['ADVENTUROUS', /\b(adventure|adventurous|epic|action)\b/iu],
];

const explicitGenres: Array<[string, RegExp]> = [
  ['Science Fiction', /\b(sci[ -]?fi|science fiction)\b/iu],
  ['Documentary', /\b(documentar(?:y|ies))\b/iu],
  ['Animation', /\b(animated|animation|anime)\b/iu],
  ['Crime', /\bcrime\b/iu],
  ['Mystery', /\bmystery\b/iu],
  ['Fantasy', /\bfantasy\b/iu],
  ['History', /\bhistor(?:y|ical)\b/iu],
  ['Music', /\bmusical\b/iu],
  ['War', /\bwar\b/iu],
  ['Western', /\bwestern\b/iu],
];

const languagePatterns: Array<[string, RegExp]> = [
  ['ko', /\b(korean|korea)\b/iu],
  ['ja', /\b(japanese|japan)\b/iu],
  ['fr', /\b(french|france)\b/iu],
  ['es', /\b(spanish|spain)\b/iu],
  ['hi', /\b(hindi|bollywood|india)\b/iu],
  ['de', /\b(german|germany)\b/iu],
  ['it', /\b(italian|italy)\b/iu],
  ['zh', /\b(chinese|mandarin|china)\b/iu],
  ['en', /\b(english[- ]language|british|american)\b/iu],
];

const streamingPatterns: Array<[string, RegExp]> = [
  ['Netflix', /\bnetflix\b/iu],
  ['Prime Video', /\b(amazon prime|prime video)\b/iu],
  ['Disney Plus', /\b(disney\+|disney plus)\b/iu],
  ['Apple TV Plus', /\b(apple tv\+|apple tv plus)\b/iu],
  ['Max', /\b(hbo max|max)\b/iu],
  ['Hulu', /\bhulu\b/iu],
];

export const TMDB_GENRE_IDS: Record<string, string> = {
  Action: '28',
  Adventure: '12',
  Animation: '16',
  Comedy: '35',
  Crime: '80',
  Documentary: '99',
  Drama: '18',
  Family: '10751',
  Fantasy: '14',
  History: '36',
  Horror: '27',
  Music: '10402',
  Mystery: '9648',
  Romance: '10749',
  'Science Fiction': '878',
  Thriller: '53',
  War: '10752',
  Western: '37',
};

function firstNumber(match: RegExpMatchArray | null): number | null {
  const value = match?.[1];
  return value === undefined ? null : Number(value);
}

export function interpretDiscoveryQuery(originalQuery: string): DiscoveryInterpretation {
  const query = originalQuery.trim();
  const moods = moodPatterns.filter(([, pattern]) => pattern.test(query)).map(([mood]) => mood);
  const genres = new Set(
    explicitGenres.filter(([, pattern]) => pattern.test(query)).map(([name]) => name),
  );
  for (const mood of moods) for (const genre of moodGenres[mood]) genres.add(genre);
  if (/\bfamil(?:y|ies)|\bkids?|children\b/iu.test(query)) genres.add('Family');

  const runtimeMaximum = firstNumber(
    query.match(/(?:under|less than|shorter than|within)\s+(\d{2,3})\s*(?:minutes?|mins?)/iu),
  );
  const afterYear = firstNumber(query.match(/\b(?:after|since|from)\s+((?:19|20)\d{2})\b/iu));
  const beforeYear = firstNumber(query.match(/\b(?:before|until)\s+((?:19|20)\d{2})\b/iu));
  const decade = firstNumber(query.match(/\b((?:19|20)\d0)s\b/iu));
  const originalLanguage = languagePatterns.find(([, pattern]) => pattern.test(query))?.[0] ?? null;
  const streamingServices = streamingPatterns
    .filter(([, pattern]) => pattern.test(query))
    .map(([service]) => service);
  const companions = /\bwith (?:my )?(?:kids?|children)|\bfamily (?:movie|film|night)\b/iu.test(
    query,
  )
    ? 'CHILDREN'
    : /\bwith (?:my )?family\b/iu.test(query)
      ? 'FAMILY'
      : /\bdate night|with (?:my )?(?:partner|wife|husband|girlfriend|boyfriend)\b/iu.test(query)
        ? 'PARTNER'
        : /\bwith (?:my )?friends\b/iu.test(query)
          ? 'FRIENDS'
          : /\b(?:alone|solo)\b/iu.test(query)
            ? 'SOLO'
            : null;
  const endingPreference =
    /\b(not sad|no sad|without (?:a )?sad endings?|do(?:es)? not (?:have|end with) (?:a )?sad endings?)\b/iu.test(
      query,
    )
      ? 'NOT_SAD'
      : /\bhappy ending\b/iu.test(query)
        ? 'HAPPY'
        : null;
  const unsupportedConstraints: string[] = [];
  if (endingPreference !== null)
    unsupportedConstraints.push('Ending preference is not provider-verified');
  if (/\b(no|without|avoid) (?:violence|gore|sex|nudity|jump scares?)\b/iu.test(query)) {
    unsupportedConstraints.push('Detailed content sensitivity is not provider-verified');
  }
  const mediaType = /\b(tv|series|show|shows)\b/iu.test(query) ? 'TV' : 'MOVIE';
  const hiddenGemsOnly = /\b(hidden gems?|underrated|niche|lesser[- ]known)\b/iu.test(query);
  const parts = [
    moods.length > 0 ? moods.map((mood) => mood.toLowerCase()).join(', ') : null,
    genres.size > 0 ? [...genres].join(', ') : null,
    runtimeMaximum === null ? null : `under ${runtimeMaximum} minutes`,
    originalLanguage === null ? null : `${originalLanguage} language`,
    afterYear === null ? null : `after ${afterYear}`,
    streamingServices.length === 0 ? null : `on ${streamingServices.join(' or ')}`,
  ].filter((part): part is string => part !== null);

  return {
    originalQuery: query,
    mediaType,
    moods,
    genres: [...genres],
    originalLanguage,
    releaseYearMinimum: afterYear === null ? decade : afterYear + 1,
    releaseYearMaximum:
      beforeYear === null ? (decade === null ? null : decade + 9) : beforeYear - 1,
    runtimeMaximum,
    minimumRating: /\b(highly rated|great reviews?|best)\b/iu.test(query) ? 7 : null,
    hiddenGemsOnly,
    streamingServices,
    companions,
    endingPreference,
    explanation:
      parts.length === 0
        ? `Showing well-rated ${mediaType === 'MOVIE' ? 'movies' : 'shows'}.`
        : `Looking for ${parts.join(' · ')}.`,
    unsupportedConstraints,
  };
}
