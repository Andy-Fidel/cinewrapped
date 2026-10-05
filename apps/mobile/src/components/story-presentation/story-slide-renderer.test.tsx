import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Image: () => null,
  StyleSheet: { create: (value: unknown) => value, absoluteFill: {} },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('../brand-logo', () => ({ BrandLogo: () => null }));
import { StorySlideRenderer } from './story-slide-renderer';
it('does not fabricate metrics for an intro', () => {
  const output = renderToStaticMarkup(
    <StorySlideRenderer
      slide={{
        id: 'intro', eyebrow: 'INTRO',
        layout: 'HERO_STATS',
        theme: 'MIDNIGHT_GOLD',
        headline: 'Your month',
        description: 'Logged activity',
      }}
    />,
  );
  expect(output).toContain('Your month');
  expect(output).not.toContain('142');
  expect(output).not.toContain('FILMS LOGGED');
});
it('omits unknown release years and directors', () => {
  const output = renderToStaticMarkup(
    <StorySlideRenderer
      slide={{
        id: 'title', eyebrow: 'MOST WATCHED',
        layout: 'CINEMATIC_POSTER',
        theme: 'MIDNIGHT_GOLD',
        headline: 'A classic',
        media: { title: 'A classic', posterUrl: null },
      }}
    />,
  );
  expect(output).toContain('A classic');
  expect(output).not.toContain('2026');
  expect(output).not.toContain('Directed by');
});
