import type { CurrentUser, OnboardingState, UserPreferences } from '@cinewrapped/shared-types';
import { OnboardingStep, Prisma } from '@cinewrapped/database';
import {
  completeOnboardingSchema,
  updateOnboardingSchema,
  updatePreferencesSchema,
  updatePrivacySchema,
  updateProfileSchema,
} from '@cinewrapped/validation';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { toCurrentUser } from './user.mapper.js';

export type UpdateProfileInput = z.output<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.output<typeof updatePreferencesSchema>;
export type UpdatePrivacyInput = z.output<typeof updatePrivacySchema>;
export type UpdateOnboardingInput = z.output<typeof updateOnboardingSchema>;
export type CompleteOnboardingInput = z.output<typeof completeOnboardingSchema>;

type PreferencesWithRelations = Prisma.UserPreferencesGetPayload<{
  include: {
    user: { include: { genrePreferences: true; streamingPreferences: true; favoriteMedia: true } };
  };
}>;

function notificationRecord(value: Prisma.JsonValue): Record<string, boolean> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
    ),
  );
}

function withoutUndefined(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function toPreferences(preferences: PreferencesWithRelations): UserPreferences {
  return {
    preferredGenreIds: preferences.user.genrePreferences
      .filter((entry) => entry.preferenceType === 'PREFERRED')
      .map((entry) => entry.genreId),
    dislikedGenreIds: preferences.user.genrePreferences
      .filter((entry) => entry.preferenceType === 'DISLIKED')
      .map((entry) => entry.genreId),
    preferredLanguages: preferences.preferredLanguages,
    preferredCountries: preferences.preferredCountries,
    preferredDecades: preferences.preferredDecades,
    preferredRuntimeMin: preferences.preferredRuntimeMin,
    preferredRuntimeMax: preferences.preferredRuntimeMax,
    preferredRatingSystem: preferences.preferredRatingSystem,
    contentTypes: preferences.contentTypes,
    spoilerPreference: preferences.spoilerPreference,
    adultContentEnabled: preferences.adultContentEnabled,
    notificationPreferences: notificationRecord(preferences.notificationPreferences),
    theme: preferences.theme,
    defaultCountryForStreaming: preferences.defaultCountryForStreaming,
    autoplayTrailers: preferences.autoplayTrailers,
    reduceMotion: preferences.reduceMotion,
    mainstreamPreferencePercent: preferences.mainstreamPreferencePercent,
    streamingProviderIds: preferences.user.streamingPreferences.map(
      (entry) => entry.streamingProviderId,
    ),
    favoriteMediaIds: preferences.user.favoriteMedia
      .slice()
      .sort((left, right) => (left.position ?? 999) - (right.position ?? 999))
      .map((entry) => entry.mediaId),
  };
}

@Injectable()
export class UsersService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getCurrentUser(principal: AuthPrincipal): Promise<CurrentUser> {
    return toCurrentUser(await this.requireUser(principal.subject));
  }

  public async updateCurrentUser(
    principal: AuthPrincipal,
    input: UpdateProfileInput,
  ): Promise<CurrentUser> {
    const user = await this.requireUser(principal.subject);
    const { expectedVersion, username, ...fields } = input;
    const data: Prisma.UserUpdateManyMutationInput = {
      ...(withoutUndefined(fields) as Prisma.UserUpdateManyMutationInput),
      ...(username === undefined
        ? {}
        : { username, usernameNormalized: username.trim().toLowerCase() }),
      version: { increment: 1 },
    };
    const result = await this.prisma.user.updateMany({
      where: { id: user.id, version: expectedVersion, deletedAt: null },
      data,
    });
    if (result.count === 0) {
      throw new AppException(
        409,
        'PROFILE_VERSION_CONFLICT',
        'The profile changed on another device. Refresh and try again.',
      );
    }
    return toCurrentUser(await this.requireUser(principal.subject));
  }

  public async getPreferences(principal: AuthPrincipal): Promise<UserPreferences> {
    const user = await this.requireUser(principal.subject);
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          include: {
            genrePreferences: true,
            streamingPreferences: true,
            favoriteMedia: true,
          },
        },
      },
    });
    if (preferences === null) {
      throw new AppException(500, 'PREFERENCES_MISSING', 'The preference record is unavailable.');
    }
    return toPreferences(preferences);
  }

  public async updatePreferences(
    principal: AuthPrincipal,
    input: UpdatePreferencesInput,
  ): Promise<UserPreferences> {
    const user = await this.requireUser(principal.subject);
    const {
      preferredGenreIds,
      dislikedGenreIds,
      streamingProviderIds,
      favoriteMediaIds,
      notificationPreferences,
      ...scalarFields
    } = input;
    await this.prisma.$transaction(async (transaction) => {
      await this.validateReferences(transaction, preferredGenreIds, 'genre');
      await this.validateReferences(transaction, dislikedGenreIds, 'genre');
      await this.validateReferences(transaction, streamingProviderIds, 'streamingProvider');
      await this.validateReferences(transaction, favoriteMediaIds, 'media');
      await transaction.userPreferences.update({
        where: { userId: user.id },
        data: {
          ...(withoutUndefined(scalarFields) as Prisma.UserPreferencesUpdateInput),
          ...(notificationPreferences === undefined ? {} : { notificationPreferences }),
        },
      });
      if (preferredGenreIds !== undefined) {
        await transaction.userGenrePreference.deleteMany({
          where: { userId: user.id, preferenceType: 'PREFERRED' },
        });
        await transaction.userGenrePreference.createMany({
          data: preferredGenreIds.map((genreId) => ({
            userId: user.id,
            genreId,
            preferenceType: 'PREFERRED',
          })),
        });
      }
      if (dislikedGenreIds !== undefined) {
        await transaction.userGenrePreference.deleteMany({
          where: { userId: user.id, preferenceType: 'DISLIKED' },
        });
        await transaction.userGenrePreference.createMany({
          data: dislikedGenreIds.map((genreId) => ({
            userId: user.id,
            genreId,
            preferenceType: 'DISLIKED',
          })),
        });
      }
      if (streamingProviderIds !== undefined) {
        await transaction.userStreamingPreference.deleteMany({ where: { userId: user.id } });
        await transaction.userStreamingPreference.createMany({
          data: streamingProviderIds.map((streamingProviderId) => ({
            userId: user.id,
            streamingProviderId,
          })),
        });
      }
      if (favoriteMediaIds !== undefined) {
        await transaction.userFavoriteMedia.deleteMany({ where: { userId: user.id } });
        await transaction.userFavoriteMedia.createMany({
          data: favoriteMediaIds.map((mediaId, position) => ({
            userId: user.id,
            mediaId,
            position,
          })),
        });
      }
    });
    return this.getPreferences(principal);
  }

  public async getPrivacy(principal: AuthPrincipal) {
    const user = await this.requireUser(principal.subject);
    const settings = await this.prisma.privacySettings.findUnique({ where: { userId: user.id } });
    if (settings === null) {
      throw new AppException(500, 'PRIVACY_SETTINGS_MISSING', 'Privacy settings are unavailable.');
    }
    return settings;
  }

  public async updatePrivacy(principal: AuthPrincipal, input: UpdatePrivacyInput) {
    const user = await this.requireUser(principal.subject);
    return this.prisma.privacySettings.update({
      where: { userId: user.id },
      data: withoutUndefined(input),
    });
  }

  public async getOnboarding(principal: AuthPrincipal): Promise<OnboardingState> {
    const user = await this.requireUser(principal.subject);
    const [progress, preferences, preferredGenres, favoriteCount] = await Promise.all([
      this.prisma.onboardingProgress.findUnique({ where: { userId: user.id } }),
      this.prisma.userPreferences.findUnique({ where: { userId: user.id } }),
      this.prisma.userGenrePreference.count({
        where: { userId: user.id, preferenceType: 'PREFERRED' },
      }),
      this.prisma.userFavoriteMedia.count({ where: { userId: user.id } }),
    ]);
    if (progress === null || preferences === null) {
      throw new AppException(500, 'ONBOARDING_STATE_MISSING', 'Onboarding state is unavailable.');
    }
    const validationGaps: string[] = [];
    if (
      !progress.completedSteps.includes(OnboardingStep.PROFILE) ||
      user.username.startsWith('user_')
    ) {
      validationGaps.push('profile');
    }
    if (preferredGenres < 5) validationGaps.push('preferredGenres');
    if (favoriteCount < 5) validationGaps.push('favoriteMedia');
    if (!progress.completedSteps.includes(OnboardingStep.STREAMING)) {
      validationGaps.push('streamingPreferences');
    }
    if (
      preferences.preferredLanguages.length === 0 ||
      preferences.preferredDecades.length === 0 ||
      preferences.preferredRuntimeMin === null ||
      preferences.preferredRuntimeMax === null
    ) {
      validationGaps.push('recommendationPreferences');
    }
    if (!progress.completedSteps.includes(OnboardingStep.NOTIFICATIONS)) {
      validationGaps.push('notificationPreferences');
    }
    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      validationGaps,
      completed: user.onboardingCompleted,
    };
  }

  public async markOnboardingStep(
    principal: AuthPrincipal,
    input: UpdateOnboardingInput,
  ): Promise<OnboardingState> {
    const user = await this.requireUser(principal.subject);
    const existing = await this.prisma.onboardingProgress.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const completedSteps = Array.from(new Set([...existing.completedSteps, input.step]));
    const order = Object.values(OnboardingStep);
    const nextStep =
      order.find((step) => !completedSteps.includes(step)) ?? OnboardingStep.NOTIFICATIONS;
    await this.prisma.onboardingProgress.update({
      where: { userId: user.id },
      data: { completedSteps, currentStep: nextStep },
    });
    return this.getOnboarding(principal);
  }

  public async completeOnboarding(
    principal: AuthPrincipal,
    input: CompleteOnboardingInput,
  ): Promise<CurrentUser> {
    const user = await this.requireUser(principal.subject);
    if (user.onboardingCompleted) return toCurrentUser(user);
    await this.prisma.$transaction(
      async (transaction) => {
        const [progress, preferences, preferredGenres, favoriteCount] = await Promise.all([
          transaction.onboardingProgress.findUniqueOrThrow({ where: { userId: user.id } }),
          transaction.userPreferences.findUniqueOrThrow({ where: { userId: user.id } }),
          transaction.userGenrePreference.count({
            where: { userId: user.id, preferenceType: 'PREFERRED' },
          }),
          transaction.userFavoriteMedia.count({ where: { userId: user.id } }),
        ]);
        const validationGaps: string[] = [];
        if (!progress.completedSteps.includes(OnboardingStep.PROFILE))
          validationGaps.push('profile');
        if (preferredGenres < 5) validationGaps.push('preferredGenres');
        if (favoriteCount < 5) validationGaps.push('favoriteMedia');
        if (!progress.completedSteps.includes(OnboardingStep.STREAMING)) {
          validationGaps.push('streamingPreferences');
        }
        if (
          preferences.preferredLanguages.length === 0 ||
          preferences.preferredDecades.length === 0 ||
          preferences.preferredRuntimeMin === null ||
          preferences.preferredRuntimeMax === null
        ) {
          validationGaps.push('recommendationPreferences');
        }
        if (!progress.completedSteps.includes(OnboardingStep.NOTIFICATIONS)) {
          validationGaps.push('notificationPreferences');
        }
        if (validationGaps.length > 0) {
          throw new AppException(
            422,
            'ONBOARDING_INCOMPLETE',
            'Required onboarding choices are missing.',
            { validationGaps },
          );
        }
        const updated = await transaction.user.updateMany({
          where: {
            id: user.id,
            version: input.expectedProfileVersion,
            onboardingCompleted: false,
          },
          data: { onboardingCompleted: true, version: { increment: 1 } },
        });
        if (updated.count === 0) {
          throw new AppException(
            409,
            'PROFILE_VERSION_CONFLICT',
            'Refresh the profile before completing onboarding.',
          );
        }
        await transaction.onboardingProgress.update({
          where: { userId: user.id },
          data: {
            acceptedPrivacyVersion: input.acceptedPrivacyVersion,
            acceptedTermsVersion: input.acceptedTermsVersion,
            completedAt: new Date(),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.getCurrentUser(principal);
  }

  private async requireUser(subject: string) {
    const user = await this.prisma.user.findUnique({ where: { authSubject: subject } });
    if (user === null || user.deletedAt !== null) {
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    }
    return user;
  }

  private async validateReferences(
    transaction: Prisma.TransactionClient,
    ids: string[] | undefined,
    entity: 'genre' | 'streamingProvider' | 'media',
  ): Promise<void> {
    if (ids === undefined) return;
    const uniqueIds = [...new Set(ids)];
    const where = { id: { in: uniqueIds } };
    const count =
      entity === 'genre'
        ? await transaction.genre.count({ where })
        : entity === 'streamingProvider'
          ? await transaction.streamingProvider.count({ where })
          : await transaction.media.count({ where });
    if (count !== uniqueIds.length) {
      throw new AppException(
        422,
        'REFERENCE_INVALID',
        `One or more ${entity} identifiers are invalid.`,
      );
    }
  }
}
