import {
  advancedFeatureKeys,
  type AdvancedFeatureKey,
  type FeatureFlagEvaluation,
  type FeatureFlagsResponse,
} from '@cinewrapped/shared-types';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';

import { api } from '../lib/api';
import { useAuth } from './auth-provider';

interface FeatureFlagsContextValue {
  flags: FeatureFlagsResponse['flags'];
  isEnabled: (key: AdvancedFeatureKey) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const disabled: FeatureFlagEvaluation = { enabled: false, source: 'DEFAULT' };
const disabledFlags = Object.fromEntries(
  advancedFeatureKeys.map((key) => [key, disabled]),
) as FeatureFlagsResponse['flags'];
const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['feature-flags', user?.id ?? 'anonymous'],
    queryFn: () => api.request<FeatureFlagsResponse>('feature-flags'),
    enabled: user !== null,
    staleTime: 60_000,
  });
  const flags = query.data?.flags ?? disabledFlags;
  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      flags,
      isEnabled: (key) => flags[key].enabled,
      loading: user !== null && query.isLoading,
      refresh: async () => {
        await query.refetch();
      },
    }),
    [flags, query, user],
  );
  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const value = useContext(FeatureFlagsContext);
  if (value === null) throw new Error('useFeatureFlags must be used inside FeatureFlagsProvider.');
  return value;
}
