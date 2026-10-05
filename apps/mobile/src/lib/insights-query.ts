import type { QueryClient } from '@tanstack/react-query';

/** Saved wrap snapshots remain immutable; only live statistics and archive metadata refresh. */
export function invalidateInsights(queryClient: QueryClient): Promise<unknown[]> {
  return Promise.all(
    ['statistics', 'movie-dna', 'taste-profile', 'wrap-archive'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
