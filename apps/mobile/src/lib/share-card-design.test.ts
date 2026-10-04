import { expect, it } from 'vitest';
import {
  CARD_FORMATS,
  CARD_TEMPLATES,
  cardDimensions,
  renderGraphicCard,
  safeCardImage,
  type GraphicCard,
} from './share-card-model';
const card: GraphicCard = {
  title: 'A very long film title '.repeat(8),
  body: 'A thoughtful review '.repeat(100),
  author: 'Viewer',
  theme: 'MIDNIGHT',
  ratingValue: 8,
  ratingScale: 10,
  containsSpoilers: true,
};
it.each(Object.keys(CARD_FORMATS) as Array<keyof typeof CARD_FORMATS>)(
  'exports every template at the correct %s dimensions with rating and spoiler warning',
  (format) => {
    for (const template of Object.keys(CARD_TEMPLATES) as Array<keyof typeof CARD_TEMPLATES>) {
      const svg = renderGraphicCard({ ...card, format, template });
      const { width, height } = cardDimensions({ ...card, format });
      expect(svg).toContain(`width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`);
      expect(svg).toContain('8 / 10');
      expect(svg).toContain('SPOILERS');
      expect(svg).toContain('…');
    }
  },
);
it('renders four ordered collage tiles, escapes branding, and excludes remote or SVG image sources', () => {
  const svg = renderGraphicCard({
    ...card,
    template: 'TICKET',
    initials: '<X',
    signature: '<script>&',
    collage: [
      { title: 'First & film', dataUrl: 'data:image/png;base64,AAAA' },
      { title: 'Second', dataUrl: 'https://secret.example/photo' },
      { title: 'Third', dataUrl: 'data:image/svg+xml;base64,AAAA' },
      { title: 'Fourth', dataUrl: null },
      { title: 'Excluded fifth', dataUrl: null },
    ],
  });
  expect(svg.match(/<clipPath id="tile/gu)).toHaveLength(4);
  expect(svg).toContain('First &amp; film');
  expect(svg).toContain('&lt;script&gt;&amp;');
  expect(svg).not.toContain('https://secret');
  expect(svg).not.toContain('image/svg+xml');
  expect(svg).not.toContain('Excluded fifth');
  expect(safeCardImage('data:image/png;base64,AAAA" onload="oops')).toBeNull();
});
it('applies safe custom colors, hides watermark, and does not invent ratings', () => {
  const narrative = {
    title: 'My picks',
    body: 'Four favorites',
    author: 'Viewer',
    theme: 'MIDNIGHT' as const,
    format: 'SQUARE' as const,
    hideWatermark: true,
    signature: 'Movie night',
    palette: { background: '#010203', accent: '#abcdef' },
  };
  const svg = renderGraphicCard(narrative);
  expect(svg).toContain('fill="#010203"');
  expect(svg).toContain('stroke="#abcdef"');
  expect(svg).not.toContain('CINEWRAPPED');
  expect(svg).not.toContain('Unrated');
  expect(
    renderGraphicCard({ ...narrative, palette: { background: '<script>', accent: '#abcdef' } }),
  ).not.toContain('<script>');
});
