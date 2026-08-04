export interface ProviderMediaSummary {
  externalId: string;
  mediaType: 'MOVIE' | 'TV';
  title: string;
  originalTitle: string;
  overview: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  originalLanguage: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genreExternalIds: string[];
  providerPopularity: number | null;
  averageProviderRating: number | null;
}

export interface ProviderCreditSummary {
  externalId: string;
  name: string;
  profileUrl: string | null;
  creditType: 'CAST' | 'CREW';
  department: string | null;
  job: string | null;
  character: string | null;
  position: number | null;
}

export interface ProviderSeasonSummary {
  externalId: string;
  seasonNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  episodeCount: number | null;
  posterUrl: string | null;
}

export interface ProviderEpisodeSummary {
  externalId: string;
  episodeNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  runtimeMinutes: number | null;
  stillUrl: string | null;
}

export interface ProviderMediaDetails extends ProviderMediaSummary {
  runtimeMinutes: number | null;
  countryCodes: string[];
  trailerUrl: string | null;
  status: string;
  ageRating: string | null;
  credits: ProviderCreditSummary[];
  seasons: ProviderSeasonSummary[];
  metadata: Record<string, unknown>;
}

export interface ProviderStreamingAvailability {
  countryCode: string;
  providerUrl: string | null;
  items: Array<{
    externalProviderId: string;
    name: string;
    logoUrl: string | null;
    monetizationType: 'FLATRATE' | 'FREE' | 'ADS' | 'RENT' | 'BUY';
    displayPriority: number | null;
  }>;
}

export interface ProviderDiscoveryFilters {
  mediaType: 'MOVIE' | 'TV';
  genreExternalIds: string[];
  originalLanguage?: string;
  releaseYearMinimum?: number;
  releaseYearMaximum?: number;
  runtimeMaximum?: number;
  minimumRating?: number;
  maximumPopularity?: number;
  watchRegion?: string;
  watchProviderExternalIds?: string[];
}

export interface MediaProvider {
  searchMedia(query: string, language: string, page: number): Promise<ProviderMediaSummary[]>;
  getTrending(
    window: 'DAY' | 'WEEK',
    mediaType: 'MOVIE' | 'TV' | undefined,
    language: string,
    page: number,
  ): Promise<ProviderMediaSummary[]>;
  discoverMedia(
    filters: ProviderDiscoveryFilters,
    language: string,
    page: number,
  ): Promise<ProviderMediaSummary[]>;
  getMediaDetails(
    externalId: string,
    mediaType: 'MOVIE' | 'TV',
    language: string,
    countryCode: string,
  ): Promise<ProviderMediaDetails>;
  getStreamingAvailability(
    externalId: string,
    mediaType: 'MOVIE' | 'TV',
    countryCode: string,
  ): Promise<ProviderStreamingAvailability>;
  getSeasonEpisodes(
    externalId: string,
    seasonNumber: number,
    language: string,
  ): Promise<ProviderEpisodeSummary[]>;
}

export const MEDIA_PROVIDER = Symbol('MEDIA_PROVIDER');
