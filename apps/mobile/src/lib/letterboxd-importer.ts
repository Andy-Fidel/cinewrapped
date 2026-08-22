export interface LetterboxdParsedEntry {
  title: string;
  releaseYear?: number | null;
  rating?: number | null; // 1 to 5 scale (can have halves like 4.5)
  watchedDate?: string | null;
  loggedDate?: string | null;
  isRewatch: boolean;
  review?: string | null;
  tags?: string[];
  letterboxdUri?: string | null;
}

export interface LetterboxdImportSummary {
  totalParsed: number;
  withRatings: number;
  withReviews: number;
  withWatchedDates: number;
  entries: LetterboxdParsedEntry[];
}

/**
 * Robust RFC 4180 compliant CSV line tokenizer that handles multi-line strings, quotes, and commas
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentToken = '';
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = i + 1 < csvText.length ? csvText[i + 1] : '';

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        // Escaped quote
        currentToken += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentToken.trim());
      currentToken = '';
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || currentRow.length > 0) {
    currentRow.push(currentToken.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseLetterboxdCsv(csvText: string): LetterboxdImportSummary {
  const rawRows = parseCsvRows(csvText.trim());
  if (rawRows.length < 2) {
    return {
      totalParsed: 0,
      withRatings: 0,
      withReviews: 0,
      withWatchedDates: 0,
      entries: [],
    };
  }

  const firstRow = rawRows[0];
  if (!firstRow) {
    return {
      totalParsed: 0,
      withRatings: 0,
      withReviews: 0,
      withWatchedDates: 0,
      entries: [],
    };
  }

  const headerRow = firstRow.map((h) => h.toLowerCase().trim());

  const colDate = headerRow.findIndex((h) => h === 'date');
  const colName = headerRow.findIndex((h) => h === 'name' || h === 'title');
  const colYear = headerRow.findIndex((h) => h === 'year' || h === 'release year');
  const colUri = headerRow.findIndex((h) => h.includes('uri') || h.includes('link'));
  const colRating = headerRow.findIndex((h) => h === 'rating');
  const colRewatch = headerRow.findIndex((h) => h === 'rewatch');
  const colTags = headerRow.findIndex((h) => h === 'tags');
  const colWatchedDate = headerRow.findIndex((h) => h === 'watched date' || h === 'watched_date');
  const colReview = headerRow.findIndex((h) => h === 'review' || h === 'review text');

  const entries: LetterboxdParsedEntry[] = [];
  let withRatings = 0;
  let withReviews = 0;
  let withWatchedDates = 0;

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;

    const titleVal = colName !== -1 && row[colName] ? row[colName] : '';
    const title = titleVal ? titleVal.trim() : '';
    if (!title) continue;

    const rawYear = colYear !== -1 && row[colYear] ? row[colYear] : undefined;
    const yearVal = rawYear ? parseInt(rawYear, 10) : null;
    const releaseYear = yearVal && !isNaN(yearVal) ? yearVal : null;

    let rating: number | null = null;
    const rawRating = colRating !== -1 && row[colRating] ? row[colRating] : undefined;
    if (rawRating) {
      const parsedRating = parseFloat(rawRating);
      if (!isNaN(parsedRating) && parsedRating > 0) {
        rating = parsedRating;
        withRatings++;
      }
    }

    const rawReview = colReview !== -1 && row[colReview] ? row[colReview] : undefined;
    const review = rawReview?.trim() ? rawReview.trim() : null;
    if (review) withReviews++;

    const rawWatchedDate =
      colWatchedDate !== -1 && row[colWatchedDate] ? row[colWatchedDate] : undefined;
    const rawDate = colDate !== -1 && row[colDate] ? row[colDate] : undefined;
    const watchedDate = rawWatchedDate?.trim()
      ? rawWatchedDate.trim()
      : rawDate?.trim()
        ? rawDate.trim()
        : null;
    if (watchedDate) withWatchedDates++;

    const rawRewatch = colRewatch !== -1 && row[colRewatch] ? row[colRewatch] : undefined;
    const isRewatch = rawRewatch
      ? rawRewatch.toLowerCase() === 'yes' ||
        rawRewatch === '1' ||
        rawRewatch.toLowerCase() === 'true'
      : false;

    const rawTags = colTags !== -1 && row[colTags] ? row[colTags] : undefined;
    const tags = rawTags
      ? rawTags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];

    const rawUri = colUri !== -1 && row[colUri] ? row[colUri] : undefined;
    const letterboxdUri = rawUri ? rawUri.trim() : null;
    const loggedDate = rawDate ? rawDate.trim() : null;

    entries.push({
      title,
      releaseYear,
      rating,
      watchedDate,
      loggedDate,
      isRewatch,
      review,
      tags,
      letterboxdUri,
    });
  }

  return {
    totalParsed: entries.length,
    withRatings,
    withReviews,
    withWatchedDates,
    entries,
  };
}
