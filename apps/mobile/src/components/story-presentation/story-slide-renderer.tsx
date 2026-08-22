import type { StorySlideData, StorySlideRankingItem } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { getStoryTheme } from './story-theme';
import { BrandLogo } from '../brand-logo';

export function StorySlideRenderer({
  slide,
  userHandle,
}: {
  slide: StorySlideData;
  userHandle?: string;
}) {
  const theme = getStoryTheme(slide.theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgGradient[0] }]}>
      {/* Background Ambience Layer */}
      <View
        style={[
          styles.glowCircleTop,
          { backgroundColor: theme.accentGlow, borderColor: theme.accent },
        ]}
      />
      <View
        style={[
          styles.glowCircleBottom,
          { backgroundColor: theme.accentGlow, borderColor: theme.accent },
        ]}
      />

      {/* Optional Full-Bleed Backdrop */}
      {slide.media?.backdropUrl ? (
        <>
          <Image
            source={{ uri: slide.media.backdropUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(7, 6, 14, 0.78)' }]}
          />
        </>
      ) : null}

      {/* Top Header Row */}
      <View style={styles.topHeader}>
        <View style={styles.brandingRow}>
          <BrandLogo size="sm" variant="mark" />
          <Text style={[styles.brandText, { color: theme.textPrimary }]}>CINEWRAPPED</Text>
        </View>

        <View
          style={[
            styles.eyebrowBadge,
            { backgroundColor: theme.pillBg, borderColor: theme.badgeBorder },
          ]}
        >
          <Ionicons name="sparkles" size={11} color={theme.accent} />
          <Text style={[styles.eyebrowText, { color: theme.accent }]}>{slide.eyebrow}</Text>
        </View>
      </View>

      {/* Main Slide Content Based on Layout */}
      <View style={styles.contentArea}>{renderLayoutContent(slide, theme)}</View>

      {/* Bottom Footer Attribution */}
      <View style={[styles.footer, { borderTopColor: 'rgba(255, 255, 255, 0.1)' }]}>
        <View style={styles.footerLeft}>
          <Text style={[styles.footerHandle, { color: theme.textSecondary }]}>
            {slide.footer?.handle ?? (userHandle ? `@${userHandle}` : 'cinewrapped.app')}
          </Text>
          <Text style={[styles.footerSpec, { color: theme.textSecondary }]}>
            {slide.footer?.branding ?? '2026 Cinema Intelligence'}
          </Text>
        </View>

        {slide.footer?.badgeText ? (
          <View style={[styles.footerPill, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.footerPillText, { color: theme.accent }]}>
              {slide.footer.badgeText}
            </Text>
          </View>
        ) : (
          <View style={[styles.footerPill, { backgroundColor: theme.cardBg }]}>
            <Ionicons name="film-outline" size={12} color={theme.accent} />
            <Text style={[styles.footerPillText, { color: theme.accent }]}>Verified Wrap</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function renderLayoutContent(slide: StorySlideData, theme: ReturnType<typeof getStoryTheme>) {
  switch (slide.layout) {
    case 'HERO_STATS':
      return renderHeroStats(slide, theme);
    case 'TOP_FIVE_GRID':
      return renderTopFiveGrid(slide, theme);
    case 'CINEMATIC_POSTER':
      return renderCinematicPoster(slide, theme);
    case 'RADAR_RADIAL':
      return renderRadarRadial(slide, theme);
    case 'QUOTE_SPOTLIGHT':
      return renderQuoteSpotlight(slide, theme);
    case 'BADGE_CEREMONY':
      return renderBadgeCeremony(slide, theme);
    case 'SUMMARY_CARD':
    default:
      return renderSummaryCard(slide, theme);
  }
}

// 1. HERO STATS LAYOUT
function renderHeroStats(slide: StorySlideData, theme: ReturnType<typeof getStoryTheme>) {
  return (
    <View style={styles.heroStatsContainer}>
      <Text style={[styles.headline, { color: theme.textPrimary }]}>{slide.headline}</Text>

      {/* Giant Metric Core */}
      <View
        style={[
          styles.giantMetricCard,
          { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
        ]}
      >
        {slide.metric?.badge ? (
          <View style={[styles.metricBadgePill, { backgroundColor: theme.pillBg }]}>
            <Text style={[styles.metricBadgeText, { color: theme.accent }]}>
              {slide.metric.badge}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.giantNumber, { color: theme.accent }]}>
          {slide.metric?.value ?? '142'}
        </Text>
        <Text style={[styles.giantLabel, { color: theme.textSecondary }]}>
          {slide.metric?.label ?? 'FILMS LOGGED'}
        </Text>
      </View>

      {slide.description ? (
        <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
          {slide.description}
        </Text>
      ) : null}

      {/* Secondary Metrics Shelf */}
      {slide.secondaryMetrics && slide.secondaryMetrics.length > 0 ? (
        <View style={styles.secondaryGrid}>
          {slide.secondaryMetrics.map((sec, idx) => (
            <View
              key={`sec-${idx}`}
              style={[
                styles.secondaryBox,
                { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
              ]}
            >
              <Text style={[styles.secondaryValue, { color: theme.textPrimary }]}>{sec.value}</Text>
              <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>
                {sec.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// 2. TOP FIVE GRID LAYOUT
function renderTopFiveGrid(slide: StorySlideData, theme: ReturnType<typeof getStoryTheme>) {
  const items = slide.rankingItems ?? [];
  return (
    <View style={styles.rankingContainer}>
      <Text style={[styles.headline, { color: theme.textPrimary }]}>{slide.headline}</Text>
      {slide.description ? (
        <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
          {slide.description}
        </Text>
      ) : null}

      <View style={styles.rankingList}>
        {items.map((item: StorySlideRankingItem) => {
          const isFirst = item.rank === 1;
          return (
            <View
              key={`rank-${item.rank}`}
              style={[
                styles.rankingRow,
                {
                  backgroundColor: isFirst ? theme.pillBg : theme.cardBg,
                  borderColor: isFirst ? theme.accent : theme.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.rankMedal,
                  { backgroundColor: isFirst ? theme.accent : 'rgba(255, 255, 255, 0.1)' },
                ]}
              >
                <Text
                  style={[styles.rankNumber, { color: isFirst ? '#000000' : theme.textPrimary }]}
                >
                  #{item.rank}
                </Text>
              </View>

              {item.posterUrl ? (
                <Image
                  source={{ uri: item.posterUrl }}
                  style={styles.rankingPoster}
                  resizeMode="cover"
                />
              ) : null}

              <View style={styles.rankingTextCol}>
                <Text numberOfLines={1} style={[styles.rankingTitle, { color: theme.textPrimary }]}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text
                    numberOfLines={1}
                    style={[styles.rankingSub, { color: theme.textSecondary }]}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>

              {item.score ? (
                <View style={[styles.scorePill, { backgroundColor: theme.cardBg }]}>
                  <Text style={[styles.scoreText, { color: theme.accent }]}>★ {item.score}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// 3. CINEMATIC POSTER LAYOUT
function renderCinematicPoster(slide: StorySlideData, theme: ReturnType<typeof getStoryTheme>) {
  return (
    <View style={styles.cinematicContainer}>
      <Text style={[styles.headline, { color: theme.textPrimary }]}>{slide.headline}</Text>

      {slide.media?.posterUrl ? (
        <View style={[styles.posterShadowWrap, { borderColor: theme.accent }]}>
          <Image
            source={{ uri: slide.media.posterUrl }}
            style={styles.heroPosterImage}
            resizeMode="cover"
          />
        </View>
      ) : null}

      <View style={styles.cinematicMetaBlock}>
        <Text style={[styles.cinematicTitle, { color: theme.textPrimary }]}>
          {slide.media?.title ?? 'Masterpiece'}
        </Text>
        <Text style={[styles.cinematicSub, { color: theme.textSecondary }]}>
          {slide.media?.director ? `Directed by ${slide.media.director} · ` : ''}
          {slide.media?.releaseYear ?? '2026'}
        </Text>
      </View>

      {slide.description ? (
        <Text style={[styles.descriptionText, { color: theme.textSecondary, textAlign: 'center' }]}>
          {slide.description}
        </Text>
      ) : null}
    </View>
  );
}

// 4. RADAR RADIAL LAYOUT
function renderRadarRadial(slide: StorySlideData, theme: ReturnType<typeof getStoryTheme>) {
  const tags = slide.vibeTags ?? [
    'Auteur Cinema',
    '70mm IMAX',
    'Neo-Noir',
    'Mind-Bending',
    'Slow Cinema',
  ];
  return (
    <View style={styles.radarContainer}>
      <Text style={[styles.headline, { color: theme.textPrimary }]}>{slide.headline}</Text>
      {slide.description ? (
        <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
          {slide.description}
        </Text>
      ) : null}

      {/* Radar Graphic Emulation */}
      <View
        style={[
          styles.radarCircleBox,
          { borderColor: theme.cardBorder, backgroundColor: theme.cardBg },
        ]}
      >
        <View style={[styles.innerRing, { borderColor: theme.cardBorder }]} />
        <View
          style={[
            styles.innermostRing,
            { borderColor: theme.accent, backgroundColor: theme.pillBg },
          ]}
        >
          <Ionicons name="finger-print" size={32} color={theme.accent} />
          <Text style={[styles.radarCenterLabel, { color: theme.accent }]}>TASTE RADAR</Text>
        </View>
      </View>

      {/* Vibe Tags Shelf */}
      <View style={styles.vibeTagsWrap}>
        {tags.map((tag, idx) => (
          <View
            key={`vibe-${idx}`}
            style={[
              styles.vibePill,
              {
                backgroundColor: idx === 0 ? theme.pillBg : theme.cardBg,
                borderColor: idx === 0 ? theme.accent : theme.cardBorder,
              },
            ]}
          >
            <Text
              style={[styles.vibeText, { color: idx === 0 ? theme.accent : theme.textPrimary }]}
            >
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 5. QUOTE SPOTLIGHT LAYOUT
function renderQuoteSpotlight(slide: StorySlideData, theme: ReturnType<typeof getStoryTheme>) {
  return (
    <View style={styles.quoteContainer}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={36}
        color={theme.accent}
        style={{ opacity: 0.8 }}
      />
      <Text style={[styles.quoteText, { color: theme.textPrimary }]}>
        "{slide.media?.quote ?? slide.headline}"
      </Text>

      <View style={styles.quoteAuthorBlock}>
        <Text style={[styles.quoteMovieTitle, { color: theme.accent }]}>
          {slide.media?.title ?? 'Cinema Line of the Year'}
        </Text>
        <Text style={[styles.quoteSpeaker, { color: theme.textSecondary }]}>
          {slide.media?.director ?? 'Iconic Scene'} · {slide.media?.releaseYear ?? '2026'}
        </Text>
      </View>

      {slide.description ? (
        <Text style={[styles.descriptionText, { color: theme.textSecondary, textAlign: 'center' }]}>
          {slide.description}
        </Text>
      ) : null}
    </View>
  );
}

// 6. BADGE CEREMONY LAYOUT
function renderBadgeCeremony(slide: StorySlideData, theme: ReturnType<typeof getStoryTheme>) {
  return (
    <View style={styles.ceremonyContainer}>
      <View
        style={[styles.trophyAura, { backgroundColor: theme.pillBg, borderColor: theme.accent }]}
      >
        <Ionicons name="trophy" size={54} color={theme.accent} />
      </View>

      <Text style={[styles.ceremonyEyebrow, { color: theme.accent }]}>ACHIEVEMENT UNLOCKED</Text>
      <Text style={[styles.headline, { color: theme.textPrimary, textAlign: 'center' }]}>
        {slide.headline}
      </Text>

      {slide.metric?.badge ? (
        <View style={[styles.tierPill, { backgroundColor: theme.accent }]}>
          <Text style={styles.tierPillText}>{slide.metric.badge}</Text>
        </View>
      ) : null}

      {slide.description ? (
        <Text style={[styles.descriptionText, { color: theme.textSecondary, textAlign: 'center' }]}>
          {slide.description}
        </Text>
      ) : null}
    </View>
  );
}

// 7. SUMMARY CARD LAYOUT
function renderSummaryCard(slide: StorySlideData, theme: ReturnType<typeof getStoryTheme>) {
  return (
    <View style={styles.summaryContainer}>
      <Text style={[styles.headline, { color: theme.textPrimary, textAlign: 'center' }]}>
        {slide.headline}
      </Text>

      <View
        style={[
          styles.summaryBox,
          { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
        ]}
      >
        {slide.secondaryMetrics?.map((m, idx) => (
          <View key={`sum-m-${idx}`} style={styles.summaryMetricRow}>
            <Text style={[styles.summaryMetricLabel, { color: theme.textSecondary }]}>
              {m.label}
            </Text>
            <Text style={[styles.summaryMetricValue, { color: theme.accent }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      {slide.vibeTags && slide.vibeTags.length > 0 ? (
        <View style={styles.vibeTagsWrap}>
          {slide.vibeTags.slice(0, 4).map((tag, idx) => (
            <View
              key={`sum-tag-${idx}`}
              style={[
                styles.vibePill,
                { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
              ]}
            >
              <Text style={[styles.vibeText, { color: theme.textPrimary }]}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    paddingHorizontal: 22,
    paddingVertical: 20,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  glowCircleTop: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.5,
  },
  glowCircleBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.4,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    zIndex: 5,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
    zIndex: 5,
  },
  headline: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginVertical: 6,
  },

  /* Hero Stats */
  heroStatsContainer: {
    gap: 16,
  },
  giantMetricCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metricBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  metricBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  giantNumber: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 68,
  },
  giantLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  secondaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  secondaryValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  secondaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* Top 5 Ranking */
  rankingContainer: {
    gap: 12,
  },
  rankingList: {
    gap: 8,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  rankMedal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '900',
  },
  rankingPoster: {
    width: 32,
    height: 48,
    borderRadius: 6,
  },
  rankingTextCol: {
    flex: 1,
    gap: 2,
  },
  rankingTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  rankingSub: {
    fontSize: 11,
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Cinematic Poster */
  cinematicContainer: {
    alignItems: 'center',
    gap: 14,
  },
  posterShadowWrap: {
    width: 170,
    height: 250,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  heroPosterImage: {
    width: '100%',
    height: '100%',
  },
  cinematicMetaBlock: {
    alignItems: 'center',
    gap: 4,
  },
  cinematicTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  cinematicSub: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Radar Radial */
  radarContainer: {
    alignItems: 'center',
    gap: 16,
  },
  radarCircleBox: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  innerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderStyle: 'dashed',
    position: 'absolute',
  },
  innermostRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  radarCenterLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  vibeTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  vibePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  vibeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  /* Quote Spotlight */
  quoteContainer: {
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 10,
  },
  quoteText: {
    fontSize: 22,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 30,
  },
  quoteAuthorBlock: {
    alignItems: 'center',
    gap: 4,
  },
  quoteMovieTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  quoteSpeaker: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Badge Ceremony */
  ceremonyContainer: {
    alignItems: 'center',
    gap: 12,
  },
  trophyAura: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ceremonyEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  tierPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tierPillText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /* Summary Card */
  summaryContainer: {
    gap: 16,
  },
  summaryBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryMetricLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryMetricValue: {
    fontSize: 15,
    fontWeight: '900',
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    zIndex: 5,
  },
  footerLeft: {
    gap: 2,
  },
  footerHandle: {
    fontSize: 12,
    fontWeight: '800',
  },
  footerSpec: {
    fontSize: 10,
    fontWeight: '600',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  footerPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
