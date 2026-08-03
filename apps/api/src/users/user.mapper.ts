import type { User } from '@cinewrapped/database';
import type { CurrentUser } from '@cinewrapped/shared-types';

export function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    countryCode: user.countryCode,
    preferredLanguage: user.preferredLanguage,
    timezone: user.timezone,
    profileVisibility: user.profileVisibility,
    onboardingCompleted: user.onboardingCompleted,
    recommendationOptIn: user.recommendationOptIn,
    analyticsOptIn: user.analyticsOptIn,
    version: user.version,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
