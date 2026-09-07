import type { CurrentUser } from '@cinewrapped/shared-types';
import { create } from 'zustand';

interface OnboardingDraft {
  step: number;
  welcomeTourSeen: boolean;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  genreIds: string[];
  favoriteMediaIds: string[];
  streamingProviderIds: string[];
  mainstreamPreferencePercent: number;
  notificationsEnabled: boolean;
  profileVersion: number;
  hydratedUserId: string | null;
  hydrateProfile: (
    user: Pick<CurrentUser, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'version'>,
  ) => void;
  patch: (values: Partial<OnboardingDraft>) => void;
  reset: () => void;
}

const initial = {
  step: 0,
  welcomeTourSeen: false,
  username: '',
  displayName: '',
  avatarUrl: null,
  genreIds: [] as string[],
  favoriteMediaIds: [] as string[],
  streamingProviderIds: [] as string[],
  mainstreamPreferencePercent: 50,
  notificationsEnabled: true,
  profileVersion: 1,
  hydratedUserId: null,
};

export const useOnboardingStore = create<OnboardingDraft>((set) => ({
  ...initial,
  hydrateProfile: (user) =>
    set((state) =>
      state.hydratedUserId === user.id
        ? state
        : {
            ...initial,
            hydratedUserId: user.id,
            username: user.username.startsWith('user_') ? '' : user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            profileVersion: user.version,
          },
    ),
  patch: (values) => set(values),
  reset: () => set(initial),
}));
