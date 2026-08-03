import { create } from 'zustand';

interface OnboardingDraft {
  step: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  genreIds: string[];
  favoriteMediaIds: string[];
  streamingProviderIds: string[];
  mainstreamPreferencePercent: number;
  notificationsEnabled: boolean;
  profileVersion: number;
  patch: (values: Partial<OnboardingDraft>) => void;
  reset: () => void;
}

const initial = {
  step: 0,
  username: '',
  displayName: '',
  avatarUrl: null,
  genreIds: [] as string[],
  favoriteMediaIds: [] as string[],
  streamingProviderIds: [] as string[],
  mainstreamPreferencePercent: 50,
  notificationsEnabled: true,
  profileVersion: 1,
};

export const useOnboardingStore = create<OnboardingDraft>((set) => ({
  ...initial,
  patch: (values) => set(values),
  reset: () => set(initial),
}));
