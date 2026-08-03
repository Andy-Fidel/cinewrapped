export interface AnalyticsEventMap {
  onboarding_completed: { contentTypeCount: number; genreCount: number };
  media_searched: { resultCount: number; mediaType?: 'MOVIE' | 'TV' };
  media_viewed: { mediaId: string; mediaType: 'MOVIE' | 'TV' };
  watchlist_item_added: { mediaId: string; source: string };
  media_marked_watched: { mediaId: string; isRewatch: boolean };
  rating_created: { mediaId: string; ratingMode: string };
  review_published: { mediaId: string; containsSpoilers: boolean; visibility: string };
  recommendation_opened: { recommendationId: string; reasonCodeCount: number };
  recommendation_dismissed: { recommendationId: string };
  friend_followed: { source: string };
  wrap_viewed: { wrapType: string; slideCount: number };
  wrap_shared: { wrapType: string; destination: string };
  achievement_unlocked: { achievementCode: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export interface AnalyticsSink {
  track<TName extends AnalyticsEventName>(
    name: TName,
    properties: AnalyticsEventMap[TName],
  ): Promise<void>;
}
