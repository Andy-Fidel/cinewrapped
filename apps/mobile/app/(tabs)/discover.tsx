import type {
  GenreSummary,
  MediaSummary,
  SearchHistoryItem,
  SearchResults,
  SearchSuggestion,
  StreamingProviderSummary,
  TrendingSearch,
  UserPreferences,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carousel3D } from '../../src/components/carousel-3d';
import { MediaCard } from '../../src/components/media-card';
import {
  TrendingBentoGrid,
  TrendingBentoGridSkeleton,
} from '../../src/components/trending-bento-grid';
import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';
import { useFeatureFlags } from '../../src/providers/feature-flags-provider';

type SearchCategory = 'ALL' | 'MEDIA' | 'USER' | 'PERSON' | 'LIST' | 'CLUB';
type RuntimePreset = 'ANY' | 'SHORT' | 'STANDARD' | 'LONG';

interface SearchFilters {
  mediaType: 'ALL' | 'MOVIE' | 'TV';
  genreIds: string[];
  releaseYear: string;
  decade: number | null;
  runtime: RuntimePreset;
  originalLanguage: string;
  productionCountry: string;
  streamingProviderIds: string[];
  minimumRating: number | null;
  minimumPopularity: number | null;
  friendsWatched: boolean;
  friendsRatedHighly: boolean;
  unwatchedOnly: boolean;
}

const emptyFilters: SearchFilters = {
  mediaType: 'ALL',
  genreIds: [],
  releaseYear: '',
  decade: null,
  runtime: 'ANY',
  originalLanguage: '',
  productionCountry: '',
  streamingProviderIds: [],
  minimumRating: null,
  minimumPopularity: null,
  friendsWatched: false,
  friendsRatedHighly: false,
  unwatchedOnly: false,
};

const categories: Array<{ value: SearchCategory; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'MEDIA', label: 'Titles' },
  { value: 'PERSON', label: 'People' },
  { value: 'USER', label: 'Members' },
  { value: 'LIST', label: 'Lists' },
  { value: 'CLUB', label: 'Clubs' },
];

const decades = [2020, 2010, 2000, 1990, 1980, 1970, 1960];

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value.trim()), delay);
    return () => clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function filterCount(filters: SearchFilters): number {
  return [
    filters.mediaType !== 'ALL',
    filters.genreIds.length > 0,
    filters.releaseYear !== '',
    filters.decade !== null,
    filters.runtime !== 'ANY',
    filters.originalLanguage !== '',
    filters.productionCountry !== '',
    filters.streamingProviderIds.length > 0,
    filters.minimumRating !== null,
    filters.minimumPopularity !== null,
    filters.friendsWatched,
    filters.friendsRatedHighly,
    filters.unwatchedOnly,
  ].filter(Boolean).length;
}

function searchPath(input: {
  query: string;
  category: SearchCategory;
  filters: SearchFilters;
  language: string;
  countryCode: string;
}): string {
  const parameters: Array<[string, string]> = [
    ['q', input.query],
    ['language', input.language],
    ['countryCode', input.countryCode],
    ['limit', '10'],
  ];
  if (input.category !== 'ALL') parameters.push(['categories', input.category]);
  if (input.filters.mediaType !== 'ALL') parameters.push(['mediaType', input.filters.mediaType]);
  if (input.filters.genreIds.length > 0)
    parameters.push(['genreIds', input.filters.genreIds.join(',')]);
  const releaseYear = Number(input.filters.releaseYear);
  const hasValidReleaseYear =
    /^\d{4}$/u.test(input.filters.releaseYear) && releaseYear >= 1870 && releaseYear <= 2200;
  if (hasValidReleaseYear) parameters.push(['releaseYear', input.filters.releaseYear]);
  if (!hasValidReleaseYear && input.filters.decade !== null)
    parameters.push(['decade', String(input.filters.decade)]);
  if (input.filters.runtime === 'SHORT') parameters.push(['runtimeMaximum', '90']);
  if (input.filters.runtime === 'STANDARD') {
    parameters.push(['runtimeMinimum', '91'], ['runtimeMaximum', '120']);
  }
  if (input.filters.runtime === 'LONG') parameters.push(['runtimeMinimum', '121']);
  if (input.filters.originalLanguage.trim().length >= 2)
    parameters.push(['originalLanguage', input.filters.originalLanguage.toLocaleLowerCase()]);
  if (/^[a-z]{2}$/iu.test(input.filters.productionCountry.trim()))
    parameters.push(['productionCountry', input.filters.productionCountry.toLocaleUpperCase()]);
  if (input.filters.streamingProviderIds.length > 0)
    parameters.push(['streamingProviderIds', input.filters.streamingProviderIds.join(',')]);
  if (input.filters.minimumRating !== null)
    parameters.push(['minimumRating', String(input.filters.minimumRating)]);
  if (input.filters.minimumPopularity !== null)
    parameters.push(['minimumPopularity', String(input.filters.minimumPopularity)]);
  if (input.filters.friendsWatched) parameters.push(['friendsWatched', 'true']);
  if (input.filters.friendsRatedHighly) parameters.push(['friendsRatedHighly', 'true']);
  if (input.filters.unwatchedOnly) parameters.push(['unwatchedOnly', 'true']);
  return `search?${parameters
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.surfaceRaised,
          borderColor: selected ? colors.brand : colors.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.onBrand : colors.textPrimary, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterSheet({
  visible,
  filters,
  genres,
  providers,
  onChange,
  onClose,
}: {
  visible: boolean;
  filters: SearchFilters;
  genres: GenreSummary[];
  providers: StreamingProviderSummary[];
  onChange: (filters: SearchFilters) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const patch = (value: Partial<SearchFilters>) => onChange({ ...filters, ...value });
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.iconButton}>
            <Ionicons color={colors.textPrimary} name="close" size={24} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={[styles.modalTitle, { color: colors.textPrimary }]}
          >
            Filters
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange(emptyFilters)}
            style={styles.resetButton}
          >
            <Text style={{ color: colors.brand, fontWeight: '800' }}>Reset</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <FilterSection title="Media type">
            {(['ALL', 'MOVIE', 'TV'] as const).map((value) => (
              <Chip
                key={value}
                label={value === 'ALL' ? 'All' : value === 'MOVIE' ? 'Movies' : 'TV'}
                selected={filters.mediaType === value}
                onPress={() => patch({ mediaType: value })}
              />
            ))}
          </FilterSection>
          <FilterSection title="Genres">
            {genres.map((genre) => (
              <Chip
                key={genre.id}
                label={genre.name}
                selected={filters.genreIds.includes(genre.id)}
                onPress={() => patch({ genreIds: toggle(filters.genreIds, genre.id) })}
              />
            ))}
          </FilterSection>
          <FilterSection title="Release year">
            <TextInput
              accessibilityLabel="Exact release year"
              keyboardType="number-pad"
              maxLength={4}
              onChangeText={(releaseYear) => patch({ releaseYear })}
              placeholder="Exact year, e.g. 2024"
              placeholderTextColor={colors.textDisabled}
              style={[
                styles.filterInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={filters.releaseYear}
            />
          </FilterSection>
          <FilterSection title="Decade">
            <Chip
              label="Any"
              selected={filters.decade === null}
              onPress={() => patch({ decade: null })}
            />
            {decades.map((decade) => (
              <Chip
                key={decade}
                label={`${decade}s`}
                selected={filters.decade === decade}
                onPress={() => patch({ decade, releaseYear: '' })}
              />
            ))}
          </FilterSection>
          <FilterSection title="Runtime">
            {(
              [
                ['ANY', 'Any'],
                ['SHORT', 'Under 90m'],
                ['STANDARD', '91–120m'],
                ['LONG', 'Over 120m'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={filters.runtime === value}
                onPress={() => patch({ runtime: value })}
              />
            ))}
          </FilterSection>
          <View style={styles.twoColumns}>
            <View style={styles.fieldColumn}>
              <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>
                Original language
              </Text>
              <TextInput
                accessibilityLabel="Original language code"
                autoCapitalize="none"
                maxLength={16}
                onChangeText={(originalLanguage) => patch({ originalLanguage })}
                placeholder="en, fr, ja"
                placeholderTextColor={colors.textDisabled}
                style={[
                  styles.filterInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={filters.originalLanguage}
              />
            </View>
            <View style={styles.fieldColumn}>
              <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Country</Text>
              <TextInput
                accessibilityLabel="Production country code"
                autoCapitalize="characters"
                maxLength={2}
                onChangeText={(productionCountry) => patch({ productionCountry })}
                placeholder="GH, US, GB"
                placeholderTextColor={colors.textDisabled}
                style={[
                  styles.filterInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={filters.productionCountry}
              />
            </View>
          </View>
          <FilterSection title="Streaming provider">
            {providers.map((provider) => (
              <Chip
                key={provider.id}
                label={provider.name}
                selected={filters.streamingProviderIds.includes(provider.id)}
                onPress={() =>
                  patch({ streamingProviderIds: toggle(filters.streamingProviderIds, provider.id) })
                }
              />
            ))}
          </FilterSection>
          <FilterSection title="Minimum rating">
            {[null, 6, 7, 8].map((rating) => (
              <Chip
                key={rating ?? 'any'}
                label={rating === null ? 'Any' : `${rating}+`}
                selected={filters.minimumRating === rating}
                onPress={() => patch({ minimumRating: rating })}
              />
            ))}
          </FilterSection>
          <FilterSection title="Popularity">
            {(
              [
                [null, 'Any'],
                [10, 'Emerging'],
                [30, 'Popular'],
                [80, 'Blockbuster'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={label}
                label={label}
                selected={filters.minimumPopularity === value}
                onPress={() => patch({ minimumPopularity: value })}
              />
            ))}
          </FilterSection>
          <View style={styles.switchList}>
            <BooleanFilter
              label="Friends watched"
              value={filters.friendsWatched}
              onPress={() => patch({ friendsWatched: !filters.friendsWatched })}
            />
            <BooleanFilter
              label="Friends rated highly"
              value={filters.friendsRatedHighly}
              onPress={() => patch({ friendsRatedHighly: !filters.friendsRatedHighly })}
            />
            <BooleanFilter
              label="Unwatched only"
              value={filters.unwatchedOnly}
              onPress={() => patch({ unwatchedOnly: !filters.unwatchedOnly })}
            />
          </View>
          <Button
            label={`Show results${filterCount(filters) === 0 ? '' : ` · ${filterCount(filters)} filters`}`}
            onPress={onClose}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function FilterSection({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const colors = useColors();
  return (
    <View style={styles.filterSection}>
      <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>{title}</Text>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

function BooleanFilter({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={onPress}
      style={[styles.booleanRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={{ color: colors.textPrimary, flex: 1, fontWeight: '700' }}>{label}</Text>
      <Ionicons
        color={value ? colors.brand : colors.textDisabled}
        name={value ? 'checkbox' : 'square-outline'}
        size={24}
      />
    </Pressable>
  );
}

function EntityCard({
  icon,
  title,
  body,
  imageUrl,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  imageUrl?: string | null;
  onPress?: (() => void) | undefined;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={onPress === undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.entityCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.entityImage} />
      ) : (
        <View
          style={[
            styles.entityImage,
            styles.entityFallback,
            { backgroundColor: colors.surfaceRaised },
          ]}
        >
          <Ionicons color={colors.brand} name={icon} size={24} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[styles.entityTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={[styles.entityBody, { color: colors.textSecondary }]}>
          {body}
        </Text>
      </View>
      {onPress ? <Ionicons color={colors.textDisabled} name="chevron-forward" size={18} /> : null}
    </Pressable>
  );
}

function SectionTitle({ children }: React.PropsWithChildren) {
  const colors = useColors();
  return (
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textPrimary }]}>
      {children}
    </Text>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const client = useQueryClient();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('ALL');
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);
  const suggestionQuery = useDebouncedValue(query, 160);
  const appliedFilters = filterCount(filters);
  const searching = debouncedQuery.length >= 2 || appliedFilters > 0;

  const genres = useQuery<GenreSummary[]>({
    queryKey: ['genres'],
    queryFn: () => api.request<GenreSummary[]>('genres'),
    staleTime: 24 * 60 * 60 * 1_000,
  });
  const providers = useQuery<StreamingProviderSummary[]>({
    queryKey: ['streaming-providers'],
    queryFn: () => api.request<StreamingProviderSummary[]>('streaming-providers'),
    staleTime: 24 * 60 * 60 * 1_000,
  });
  const history = useQuery<SearchHistoryItem[]>({
    queryKey: ['search-history'],
    queryFn: () => api.request<SearchHistoryItem[]>('search/history?limit=30'),
  });
  const trendingSearches = useQuery<TrendingSearch[]>({
    queryKey: ['trending-searches'],
    queryFn: () => api.request<TrendingSearch[]>('search/trending'),
    staleTime: 10 * 60 * 1_000,
  });
  const suggestions = useQuery<SearchSuggestion[]>({
    queryKey: ['search-suggestions', suggestionQuery],
    queryFn: () =>
      api.request<SearchSuggestion[]>(
        `search/suggestions?q=${encodeURIComponent(suggestionQuery)}&limit=8`,
      ),
    enabled: suggestionsOpen && suggestionQuery.length >= 1,
    staleTime: 60 * 1_000,
  });
  const search = useQuery<SearchResults>({
    queryKey: [
      'unified-search',
      debouncedQuery,
      category,
      filters,
      user?.preferredLanguage,
      user?.countryCode,
    ],
    queryFn: () =>
      api.request<SearchResults>(
        searchPath({
          query: debouncedQuery,
          category,
          filters,
          language: user?.preferredLanguage ?? 'en-US',
          countryCode: user?.countryCode ?? 'US',
        }),
      ),
    enabled: searching,
    staleTime: 2 * 60 * 1_000,
  });
  const featured = useQuery<MediaSummary[]>({
    queryKey: ['media-featured', user?.preferredLanguage],
    queryFn: () =>
      api.request<MediaSummary[]>(
        `media/trending?window=DAY&language=${encodeURIComponent(user?.preferredLanguage ?? 'en-US')}`,
      ),
    staleTime: 10 * 60 * 1_000,
  });
  const trending = useQuery<MediaSummary[]>({
    queryKey: ['media-trending', user?.preferredLanguage],
    queryFn: () =>
      api.request<MediaSummary[]>(
        `media/trending?window=WEEK&language=${encodeURIComponent(user?.preferredLanguage ?? 'en-US')}`,
      ),
    staleTime: 10 * 60 * 1_000,
  });
  const preferences = useQuery<UserPreferences>({
    queryKey: ['preferences', user?.id ?? 'anonymous'],
    queryFn: () => api.request<UserPreferences>('users/me/preferences'),
    enabled: user !== null,
    staleTime: 5 * 60 * 1_000,
  });
  const historyMutation = useMutation({
    mutationFn: (id: string | null) =>
      api.request(id === null ? 'search/history' : `search/history/${id}`, { method: 'DELETE' }),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['search-history'] }),
  });

  const recent = history.data?.slice(0, 6) ?? [];
  const result = search.data;
  const mediaResults = searching ? (result?.media ?? []) : (trending.data ?? []);
  const chooseQuery = (value: string) => {
    setQuery(value);
    setSuggestionsOpen(false);
  };
  const emptyResult = result !== undefined && result.totalCount === 0;
  const historyDate = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }),
    [],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.eyebrow, { color: colors.brand }]}>DISCOVER</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          Search CineWrapped
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Movies, shows, people, members, lists, and clubs—all in one place.
        </Text>

        <View style={styles.toolsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/roulette')}
            style={({ pressed }) => [
              styles.toolCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.brand,
                borderWidth: 1.2,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons color="#F59E0B" name="sparkles" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '800' }}>
                Film Roulette & Match
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Spin for tonight's pick
              </Text>
            </View>
            <Ionicons color={colors.textDisabled} name="chevron-forward" size={16} />
          </Pressable>

          {isEnabled('SCENE_IDENTIFICATION') ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/scene-identification')}
              style={({ pressed }) => [
                styles.toolCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[styles.toolIcon, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons color={colors.brand} name="scan-outline" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '800' }}>
                  Identify a Scene
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Scan film screenshots
                </Text>
              </View>
              <Ionicons color={colors.textDisabled} name="chevron-forward" size={16} />
            </Pressable>
          ) : null}
        </View>

        <View
          style={[
            styles.searchWrapper,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons color={colors.textDisabled} name="search-outline" size={20} />
          <TextInput
            accessibilityLabel="Search CineWrapped"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setQuery(value);
              setSuggestionsOpen(value.length > 0);
            }}
            onFocus={() => setSuggestionsOpen(query.length > 0)}
            onSubmitEditing={() => setSuggestionsOpen(false)}
            placeholder="Search titles, people, lists, or clubs"
            placeholderTextColor={colors.textDisabled}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={query}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setQuery('');
                setSuggestionsOpen(false);
              }}
            >
              <Ionicons color={colors.textDisabled} name="close-circle" size={19} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={`Filters${appliedFilters > 0 ? `, ${appliedFilters} active` : ''}`}
            accessibilityRole="button"
            onPress={() => setFiltersOpen(true)}
            style={[
              styles.filterButton,
              { backgroundColor: appliedFilters > 0 ? colors.brand : colors.surfaceRaised },
            ]}
          >
            <Ionicons
              color={appliedFilters > 0 ? colors.onBrand : colors.textPrimary}
              name="options-outline"
              size={19}
            />
            {appliedFilters > 0 ? (
              <Text style={{ color: colors.onBrand, fontSize: 11, fontWeight: '900' }}>
                {appliedFilters}
              </Text>
            ) : null}
          </Pressable>
        </View>

        {suggestionsOpen && suggestionQuery.length > 0 ? (
          <View
            style={[
              styles.suggestions,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {suggestions.isPending ? (
              <ActivityIndicator color={colors.brand} style={styles.suggestionLoading} />
            ) : null}
            {suggestions.data?.map((suggestion) => (
              <Pressable
                key={`${suggestion.category}-${suggestion.text}`}
                onPress={() => chooseQuery(suggestion.text)}
                style={styles.suggestionRow}
              >
                <Ionicons
                  color={colors.textDisabled}
                  name={suggestion.category === 'RECENT' ? 'time-outline' : 'search-outline'}
                  size={17}
                />
                <Text numberOfLines={1} style={{ color: colors.textPrimary, flex: 1 }}>
                  {suggestion.text}
                </Text>
                <Text style={{ color: colors.textDisabled, fontSize: 10, fontWeight: '800' }}>
                  {suggestion.category}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <ScrollView
          horizontal
          contentContainerStyle={styles.categoryRow}
          showsHorizontalScrollIndicator={false}
        >
          {categories.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={category === item.value}
              onPress={() => setCategory(item.value)}
            />
          ))}
        </ScrollView>

        {!searching ? (
          <>
            {recent.length > 0 ? (
              <View style={styles.section}>
                <SectionTitle>Recent searches</SectionTitle>
                <View style={styles.chipRow}>
                  {recent.map((item) => (
                    <Chip
                      key={item.id}
                      label={item.query}
                      selected={false}
                      onPress={() => chooseQuery(item.query)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.section}>
              <SectionTitle>Trending searches</SectionTitle>
              <View style={styles.trendingTerms}>
                {trendingSearches.data?.map((item, index) => (
                  <Pressable
                    key={item.query}
                    onPress={() => chooseQuery(item.query)}
                    style={[styles.trendingTerm, { borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.trendingRank, { color: colors.brand }]}>{index + 1}</Text>
                    <Text style={{ color: colors.textPrimary, flex: 1, fontWeight: '700' }}>
                      {item.query}
                    </Text>
                    <Ionicons color={colors.textDisabled} name="trending-up" size={18} />
                  </Pressable>
                ))}
              </View>
            </View>
            {(featured.data?.length ?? 0) > 0 ? (
              <Carousel3D
                items={featured.data ?? []}
                reduceMotionPreference={
                  preferences.isPending || preferences.data?.reduceMotion === true
                }
              />
            ) : null}
          </>
        ) : null}

        {searching ? (
          <View style={styles.resultsHeader}>
            <View>
              <SectionTitle>Search results</SectionTitle>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {search.isPending ? 'Searching…' : `${result?.totalCount ?? 0} matches`}
              </Text>
            </View>
            {appliedFilters > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => setFilters(emptyFilters)}>
                <Text style={{ color: colors.brand, fontWeight: '800' }}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <SectionTitle>Trending this week</SectionTitle>
        )}

        {searching && search.isPending ? (
          <ActivityIndicator color={colors.brand} style={styles.loading} />
        ) : null}
        {!searching && trending.isPending ? <TrendingBentoGridSkeleton /> : null}
        {(searching ? search : trending).isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void (searching ? search.refetch() : trending.refetch())}
            style={[
              styles.message,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons color={colors.danger} name="cloud-offline-outline" size={22} />
            <Text accessibilityRole="alert" style={{ color: colors.textPrimary, flex: 1 }}>
              Search is unavailable. Tap to retry.
            </Text>
          </Pressable>
        ) : null}
        {emptyResult ? (
          <View
            style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons color={colors.brand} name="search-outline" size={34} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matches found</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Try fewer filters, a shorter phrase, or a different spelling.
            </Text>
          </View>
        ) : null}

        {mediaResults.length > 0 ? (
          <View style={styles.resultSection}>
            {searching ? (
              <>
                {result && result.media.length > 0 ? <SectionTitle>Titles</SectionTitle> : null}
                <View style={styles.mediaGrid}>
                  {mediaResults.map((media) => (
                    <View key={media.id} style={styles.mediaCell}>
                      <MediaCard media={media} />
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <TrendingBentoGrid mediaList={mediaResults} />
            )}
          </View>
        ) : null}
        {result?.users.length ? (
          <View style={styles.resultSection}>
            <SectionTitle>Members</SectionTitle>
            {result.users.map((member) => (
              <EntityCard
                key={member.id}
                icon="person-outline"
                imageUrl={member.avatarUrl}
                title={member.displayName}
                body={`@${member.username}${member.bio ? ` · ${member.bio}` : ''}`}
                onPress={() => router.push(`/users/${member.username}`)}
              />
            ))}
          </View>
        ) : null}
        {result?.people.length ? (
          <View style={styles.resultSection}>
            <SectionTitle>People</SectionTitle>
            {result.people.map((person) => (
              <EntityCard
                key={person.id}
                icon="people-outline"
                imageUrl={person.profileUrl}
                title={person.name}
                body={
                  person.knownFor.length > 0
                    ? `Known for ${person.knownFor.map(({ title }) => title).join(', ')}`
                    : 'Cast or crew'
                }
                onPress={
                  person.knownFor[0]
                    ? () => router.push(`/media/${person.knownFor[0]?.id}`)
                    : undefined
                }
              />
            ))}
          </View>
        ) : null}
        {result?.lists.length ? (
          <View style={styles.resultSection}>
            <SectionTitle>Lists</SectionTitle>
            {result.lists.map((list) => (
              <EntityCard
                key={list.id}
                icon="list-outline"
                title={list.name}
                body={`${list.itemCount} titles · by @${list.owner.username}`}
                onPress={() => router.push(`/lists/${list.id}`)}
              />
            ))}
          </View>
        ) : null}
        {result?.clubs.length ? (
          <View style={styles.resultSection}>
            <SectionTitle>Clubs</SectionTitle>
            {result.clubs.map((club) => (
              <EntityCard
                key={club.id}
                icon="people-circle-outline"
                imageUrl={club.coverImageUrl}
                title={club.name}
                body={`${club.memberCount} members${club.category ? ` · ${club.category}` : ''}`}
                onPress={() => router.push(`/clubs/${club.id}`)}
              />
            ))}
          </View>
        ) : null}

        {!searching && (history.data?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <SectionTitle>Search history</SectionTitle>
              <Pressable
                accessibilityRole="button"
                disabled={historyMutation.isPending}
                onPress={() => historyMutation.mutate(null)}
              >
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Clear all</Text>
              </Pressable>
            </View>
            {history.data?.slice(0, 12).map((item) => (
              <View key={item.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => chooseQuery(item.query)} style={styles.historyQuery}>
                  <Ionicons color={colors.textDisabled} name="time-outline" size={17} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                      {item.query}
                    </Text>
                    <Text style={{ color: colors.textDisabled, fontSize: 11 }}>
                      {historyDate.format(new Date(item.lastSearchedAt))} · {item.resultCount}{' '}
                      results
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${item.query} from search history`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => historyMutation.mutate(item.id)}
                >
                  <Ionicons color={colors.textDisabled} name="close" size={18} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <FilterSheet
        visible={filtersOpen}
        filters={filters}
        genres={genres.data ?? []}
        providers={providers.data ?? []}
        onChange={setFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: 16, padding: 18, paddingBottom: 80 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: -8 },
  searchWrapper: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 54,
    paddingHorizontal: 13,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  filterButton: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 38,
    paddingHorizontal: 9,
  },
  suggestions: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: -10,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  suggestionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    minHeight: 43,
    paddingHorizontal: 13,
  },
  suggestionLoading: { margin: 12 },
  categoryRow: { gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toolsRow: { gap: 8 },
  toolCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    padding: 10,
  },
  toolIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sceneAction: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    padding: 12,
  },
  sceneIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  section: { gap: 11 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendingTerms: { gap: 0 },
  trendingTerm: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 46,
  },
  trendingRank: { fontSize: 16, fontWeight: '900', textAlign: 'center', width: 24 },
  resultsHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  resultSection: { gap: 10 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  mediaCell: { width: '50%' },
  entityCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 11,
  },
  entityImage: { borderRadius: 12, height: 52, width: 52 },
  entityFallback: { alignItems: 'center', justifyContent: 'center' },
  entityTitle: { fontSize: 15, fontWeight: '800' },
  entityBody: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  historyRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 54,
  },
  historyQuery: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  loading: { margin: 28 },
  message: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  empty: { alignItems: 'center', borderRadius: 16, borderWidth: 1, gap: 8, padding: 26 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  modalSafe: { flex: 1 },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  iconButton: { padding: 8 },
  resetButton: { padding: 8 },
  modalContent: { gap: 24, padding: 18, paddingBottom: 48 },
  filterSection: { gap: 10 },
  filterLabel: { fontSize: 14, fontWeight: '800' },
  filterInput: {
    borderRadius: 11,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  twoColumns: { flexDirection: 'row', gap: 12 },
  fieldColumn: { flex: 1, gap: 8 },
  switchList: { gap: 9 },
  booleanRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
});
