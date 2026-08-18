import type {
  ClubDetails,
  ClubMembershipType,
  ClubSummary,
  ClubVisibility,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';

const CATEGORY_OPTIONS = [
  'All Societies',
  'Film Classics & Noir',
  'Sci-Fi & Speculative',
  'Indie & Art House',
  'Horror & Thrillers',
  'Award Contenders',
  'World Cinema',
  'Friday Blockbusters',
];

function ClubPassportCard({ club }: { club: ClubSummary }) {
  const colors = useColors();
  const isMember = club.membership !== null;
  const role = club.membership?.role;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/clubs/${club.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isMember ? colors.brand : colors.border,
          borderWidth: isMember ? 1.5 : 1,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {/* Top Credentials Row */}
      <View style={styles.cardTopRow}>
        <View style={styles.badgeRow}>
          {/* Category Tag */}
          <View style={[styles.categoryTag, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="film-outline" size={11} color={colors.brand} />
            <Text style={[styles.categoryTagText, { color: colors.textPrimary }]}>
              {club.category || 'Film Society'}
            </Text>
          </View>

          {/* Visibility / Access Pill */}
          <View style={[styles.accessTag, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons
              name={club.visibility === 'PUBLIC' ? 'globe-outline' : 'lock-closed-outline'}
              size={10}
              color={colors.textSecondary}
            />
            <Text style={[styles.accessTagText, { color: colors.textSecondary }]}>
              {club.membershipType === 'OPEN' ? 'Open Admission' : 'By Request'}
            </Text>
          </View>
        </View>

        {/* Your Membership Role Badge */}
        {isMember && (
          <View
            style={[
              styles.memberRoleBadge,
              {
                backgroundColor:
                  role === 'OWNER' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              },
            ]}
          >
            <Ionicons
              name={role === 'OWNER' ? 'ribbon' : 'checkmark-circle'}
              size={12}
              color={role === 'OWNER' ? '#F59E0B' : '#10B981'}
            />
            <Text
              style={[styles.memberRoleText, { color: role === 'OWNER' ? '#F59E0B' : '#10B981' }]}
            >
              {role === 'OWNER' ? 'OWNER' : role === 'ADMIN' ? 'MODERATOR' : 'MEMBER'}
            </Text>
          </View>
        )}
      </View>

      {/* Main Club Identity */}
      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {club.name}
        </Text>
        <Text numberOfLines={2} style={[styles.cardDescription, { color: colors.textSecondary }]}>
          {club.description ||
            'A cinema collective discussing films, curating watchlists, and hosting screenings.'}
        </Text>
      </View>

      {/* Bottom Social Proof & Enter Action */}
      <View style={styles.cardFooter}>
        <View style={styles.memberCountPill}>
          <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.memberCountText, { color: colors.textSecondary }]}>
            {club.memberCount} {club.memberCount === 1 ? 'Cinephile' : 'Cinephiles'}
          </Text>
        </View>

        <View style={styles.enterAction}>
          <Text style={[styles.enterActionText, { color: colors.brand }]}>Enter Guild</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand} />
        </View>
      </View>
    </Pressable>
  );
}

export default function ClubsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'DISCOVER' | 'MINE'>('DISCOVER');
  const [selectedCategory, setSelectedCategory] = useState('All Societies');
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim());

  // Creation Drawer States
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Indie & Art House');
  const [membershipType, setMembershipType] = useState<ClubMembershipType>('OPEN');

  const clubs = useQuery({
    queryKey: ['clubs', scope, query],
    queryFn: () =>
      api.request<ClubSummary[]>(`clubs?scope=${scope}&q=${encodeURIComponent(query)}&limit=50`),
  });

  const create = useMutation({
    mutationFn: () =>
      api.request<ClubDetails>('clubs', {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim(),
          visibility: 'PUBLIC' as ClubVisibility,
          membershipType,
          category,
        },
      }),
    onSuccess: async (club) => {
      setName('');
      setDescription('');
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      router.push(`/clubs/${club.id}`);
    },
  });

  // Calculate society metrics
  const metrics = useMemo(() => {
    const list = clubs.data ?? [];
    const totalMembers = list.reduce((acc, curr) => acc + (curr.memberCount ?? 0), 0);
    const joinedCount = list.filter((c) => c.membership !== null).length;
    return {
      totalClubs: list.length,
      totalMembers,
      joinedCount,
    };
  }, [clubs.data]);

  // Client-side category filtering
  const filteredClubs = useMemo(() => {
    const list = clubs.data ?? [];
    if (selectedCategory === 'All Societies') return list;
    return list.filter((c) => c.category?.toLowerCase() === selectedCategory.toLowerCase());
  }, [clubs.data, selectedCategory]);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Cinema Clubs' }} />

      {/* Hero Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.brand }]}>
              COMMUNITY SCREENINGS & GUILDS
            </Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              Cinema Clubs
            </Text>
          </View>

          <Pressable
            accessibilityLabel={creating ? 'Close club creation form' : 'Form a new film club'}
            accessibilityRole="button"
            onPress={() => setCreating((prev) => !prev)}
            style={({ pressed }) => [
              styles.createFab,
              {
                backgroundColor: creating ? colors.surfaceRaised : colors.brand,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name={creating ? 'close' : 'add'}
              size={18}
              color={creating ? colors.textPrimary : colors.onBrand}
            />
            <Text
              style={[
                styles.createFabText,
                { color: creating ? colors.textPrimary : colors.onBrand },
              ]}
            >
              {creating ? 'Cancel' : 'Form Club'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Discover film collectives, vote on group watchlists, host movie nights, and discuss cinema
          with fellow cinephiles.
        </Text>

        {/* Quick Metrics Bar */}
        <View style={styles.metricsBar}>
          <View
            style={[
              styles.metricPill,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="film-outline" size={13} color={colors.brand} />
            <Text style={[styles.metricText, { color: colors.textPrimary }]}>
              {metrics.totalClubs} {metrics.totalClubs === 1 ? 'Club' : 'Clubs'}
            </Text>
          </View>

          <View
            style={[
              styles.metricPill,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="people-outline" size={13} color="#F59E0B" />
            <Text style={[styles.metricText, { color: colors.textPrimary }]}>
              {metrics.totalMembers} Cinephiles
            </Text>
          </View>

          {scope === 'MINE' && (
            <View
              style={[
                styles.metricPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={13} color="#10B981" />
              <Text style={[styles.metricText, { color: '#10B981' }]}>
                {metrics.joinedCount} Joined
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Segmented Mode Switcher */}
      <View style={styles.segmentedRow}>
        <Pressable
          onPress={() => {
            setScope('DISCOVER');
            setSelectedCategory('All Societies');
          }}
          style={[
            styles.segmentBtn,
            {
              backgroundColor: scope === 'DISCOVER' ? colors.brand : colors.surfaceRaised,
              borderColor: scope === 'DISCOVER' ? colors.brand : colors.border,
            },
          ]}
        >
          <Ionicons
            name="compass-outline"
            size={16}
            color={scope === 'DISCOVER' ? colors.onBrand : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              { color: scope === 'DISCOVER' ? colors.onBrand : colors.textSecondary },
            ]}
          >
            Explore Clubs
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setScope('MINE');
            setSelectedCategory('All Societies');
          }}
          style={[
            styles.segmentBtn,
            {
              backgroundColor: scope === 'MINE' ? colors.brand : colors.surfaceRaised,
              borderColor: scope === 'MINE' ? colors.brand : colors.border,
            },
          ]}
        >
          <Ionicons
            name="star-outline"
            size={16}
            color={scope === 'MINE' ? colors.onBrand : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              { color: scope === 'MINE' ? colors.onBrand : colors.textSecondary },
            ]}
          >
            My Societies{' '}
            {scope === 'MINE' && metrics.totalClubs > 0 ? `(${metrics.totalClubs})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Category Horizon Chips */}
      {scope === 'DISCOVER' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? colors.surfaceRaised : 'transparent',
                    borderColor: isSelected ? colors.brand : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: isSelected ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Search Input */}
      <View
        style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons color={colors.textSecondary} name="search-outline" size={18} />
        <TextInput
          accessibilityLabel="Search clubs"
          onChangeText={setSearch}
          placeholder="Search by club name, genre, or description…"
          placeholderTextColor={colors.textDisabled}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={search}
        />
        {search.length > 0 && (
          <Pressable hitSlop={8} onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Collapsible Form a Film Club Sheet */}
      {creating && (
        <View
          style={[
            styles.createCard,
            { backgroundColor: colors.surface, borderColor: colors.brand },
          ]}
        >
          <View style={styles.createHeader}>
            <Ionicons name="sparkles" size={18} color={colors.brand} />
            <Text style={[styles.createTitle, { color: colors.textPrimary }]}>
              Form a Film Society
            </Text>
          </View>

          <TextInput
            accessibilityLabel="Club name"
            maxLength={120}
            onChangeText={setName}
            placeholder="Club name (e.g. Neo-Noir Cinephiles)"
            placeholderTextColor={colors.textDisabled}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
            value={name}
          />

          <TextInput
            accessibilityLabel="Description"
            maxLength={2000}
            multiline
            numberOfLines={3}
            onChangeText={setDescription}
            placeholder="What films does your society watch and discuss?"
            placeholderTextColor={colors.textDisabled}
            style={[
              styles.input,
              styles.inputMultiline,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
            value={description}
          />

          {/* Category Selector */}
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            PRIMARY GENRE / THEME
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formCategoryRow}
          >
            {CATEGORY_OPTIONS.filter((c) => c !== 'All Societies').map((cat) => {
              const isSelected = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.formCategoryChip,
                    {
                      backgroundColor: isSelected ? colors.brand : colors.surfaceRaised,
                      borderColor: isSelected ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.formCategoryChipText,
                      { color: isSelected ? colors.onBrand : colors.textPrimary },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Membership Type Policy */}
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            ADMISSION POLICY
          </Text>
          <View style={styles.membershipTypeRow}>
            <Pressable
              onPress={() => setMembershipType('OPEN')}
              style={[
                styles.membershipTypeBtn,
                membershipType === 'OPEN' && {
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderColor: '#10B981',
                },
                membershipType !== 'OPEN' && { borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={16}
                color={membershipType === 'OPEN' ? '#10B981' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.membershipTypeText,
                  { color: membershipType === 'OPEN' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                Open Admission
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMembershipType('APPROVAL')}
              style={[
                styles.membershipTypeBtn,
                membershipType === 'APPROVAL' && {
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderColor: '#F59E0B',
                },
                membershipType !== 'APPROVAL' && { borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="shield-outline"
                size={16}
                color={membershipType === 'APPROVAL' ? '#F59E0B' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.membershipTypeText,
                  {
                    color:
                      membershipType === 'APPROVAL' ? colors.textPrimary : colors.textSecondary,
                  },
                ]}
              >
                By Approval
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={name.trim().length < 3 || description.trim().length === 0 || create.isPending}
            onPress={() => create.mutate()}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: colors.brand,
                opacity:
                  name.trim().length < 3 ||
                  description.trim().length === 0 ||
                  create.isPending ||
                  pressed
                    ? 0.65
                    : 1,
              },
            ]}
          >
            {create.isPending ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <View style={styles.submitBtnContent}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.onBrand} />
                <Text style={[styles.submitBtnText, { color: colors.onBrand }]}>
                  Launch Public Club
                </Text>
              </View>
            )}
          </Pressable>

          {create.isError && (
            <Text style={{ color: colors.danger, fontSize: 13 }}>{errorMessage(create.error)}</Text>
          )}
        </View>
      )}

      {/* Clubs List */}
      <View style={styles.list}>
        {filteredClubs.map((club) => (
          <ClubPassportCard club={club} key={club.id} />
        ))}

        {clubs.isPending && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.brand} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              Gathering cinema clubs…
            </Text>
          </View>
        )}

        {clubs.isError && (
          <Text style={{ color: colors.danger, textAlign: 'center' }}>
            {errorMessage(clubs.error)}
          </Text>
        )}

        {/* Empty States */}
        {!clubs.isPending && !clubs.isError && filteredClubs.length === 0 && (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Ionicons
                color={colors.brand}
                name={scope === 'MINE' ? 'people-outline' : 'film-outline'}
                size={32}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {scope === 'MINE'
                ? "You haven't joined any clubs yet"
                : search.trim() !== ''
                  ? 'No matching clubs found'
                  : 'No societies in this category'}
            </Text>

            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {scope === 'MINE'
                ? 'Join a film society to vote on watchlists, attend group screenings, and discuss movies.'
                : 'Try adjusting your search keywords or switch to another category.'}
            </Text>

            <Pressable
              onPress={() => {
                if (scope === 'MINE') {
                  setScope('DISCOVER');
                } else {
                  setSearch('');
                  setSelectedCategory('All Societies');
                }
              }}
              style={({ pressed }) => [
                styles.emptyActionBtn,
                { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons
                name={scope === 'MINE' ? 'compass-outline' : 'refresh-outline'}
                size={16}
                color={colors.onBrand}
              />
              <Text style={[styles.emptyActionBtnText, { color: colors.onBrand }]}>
                {scope === 'MINE' ? 'Explore Film Societies' : 'View All Clubs'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10, marginTop: 12 },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 18 },

  createFab: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createFabText: { fontSize: 12, fontWeight: '700' },

  // Metrics
  metricsBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  metricPill: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metricText: { fontSize: 11, fontWeight: '700' },

  // Segmented Bar
  segmentedRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentBtnText: { fontSize: 13, fontWeight: '700' },

  // Category Scroll
  categoryScroll: { gap: 8, paddingVertical: 4 },
  categoryChip: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipText: { fontSize: 12, fontWeight: '700' },

  // Search
  searchBox: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, minHeight: 44, paddingVertical: 8 },

  // Form a Film Club Sheet
  createCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 12,
    marginTop: 8,
    padding: 16,
  },
  createHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  createTitle: { fontSize: 16, fontWeight: '800' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  formSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  formCategoryRow: { gap: 8, paddingVertical: 2 },
  formCategoryChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formCategoryChipText: { fontSize: 12, fontWeight: '600' },
  membershipTypeRow: { flexDirection: 'row', gap: 10 },
  membershipTypeBtn: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  membershipTypeText: { fontSize: 12, fontWeight: '700' },
  submitBtn: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 46,
    paddingHorizontal: 16,
  },
  submitBtnContent: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  submitBtnText: { fontSize: 14, fontWeight: '800' },

  // List & Cards
  list: { gap: 12, marginTop: 8 },
  card: {
    borderRadius: 16,
    gap: 10,
    padding: 16,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryTag: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryTagText: { fontSize: 10, fontWeight: '700' },
  accessTag: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  accessTagText: { fontSize: 10, fontWeight: '600' },
  memberRoleBadge: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  memberRoleText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  cardBody: { gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '800', lineHeight: 21 },
  cardDescription: { fontSize: 13, lineHeight: 18 },

  cardFooter: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  memberCountPill: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  memberCountText: { fontSize: 12, fontWeight: '600' },
  enterAction: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  enterActionText: { fontSize: 12, fontWeight: '700' },

  loadingContainer: { alignItems: 'center', paddingVertical: 32 },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 24,
    textAlign: 'center',
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, lineHeight: 18, maxWidth: 280, textAlign: 'center' },
  emptyActionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionBtnText: { fontSize: 13, fontWeight: '800' },
});
