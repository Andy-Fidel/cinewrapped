import { describe, expect, it } from 'vitest';
import { parseLetterboxdCsv } from './letterboxd-importer';

describe('Letterboxd CSV Importer', () => {
  it('parses standard diary.csv export with ratings, rewatches, and reviews', () => {
    const sampleCsv = `Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date,Review
2024-03-15,"Dune: Part Two",2024,https://boxd.it/test1,4.5,No,"cinema, imax",2024-03-14,"An absolute cinematic masterpiece."
2024-01-20,"Oppenheimer",2023,https://boxd.it/test2,5.0,Yes,"70mm",2024-01-19,"Even better on rewatch."
2024-02-10,"Past Lives",2023,https://boxd.it/test3,4.0,No,"drama",2024-02-09,`;

    const result = parseLetterboxdCsv(sampleCsv);

    expect(result.totalParsed).toBe(3);
    expect(result.withRatings).toBe(3);
    expect(result.withReviews).toBe(2);
    expect(result.withWatchedDates).toBe(3);

    expect(result.entries[0]).toBeDefined();
    expect(result.entries[0]?.title).toBe('Dune: Part Two');
    expect(result.entries[0]?.releaseYear).toBe(2024);
    expect(result.entries[0]?.rating).toBe(4.5);
    expect(result.entries[0]?.watchedDate).toBe('2024-03-14');
    expect(result.entries[0]?.loggedDate).toBe('2024-03-15');
    expect(result.entries[0]?.isRewatch).toBe(false);
    expect(result.entries[0]?.review).toBe('An absolute cinematic masterpiece.');
    expect(result.entries[0]?.tags).toEqual(['cinema', 'imax']);

    expect(result.entries[1]?.isRewatch).toBe(true);
    expect(result.entries[1]?.rating).toBe(5.0);
  });

  it('handles empty or malformed inputs gracefully', () => {
    expect(parseLetterboxdCsv('').totalParsed).toBe(0);
    expect(parseLetterboxdCsv('HeaderOnly,Column2\n').totalParsed).toBe(0);
  });
});
