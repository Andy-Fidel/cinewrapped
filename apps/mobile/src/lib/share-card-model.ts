export type CardTheme = 'MIDNIGHT' | 'CRIMSON' | 'CYAN' | 'GOLD';
export const CARD_THEMES = {
  MIDNIGHT: {
    name: 'Midnight Noir',
    background: '#121722',
    accent: '#A5B4FC',
    onAccent: '#101426',
  },
  CRIMSON: { name: 'Criterion Red', background: '#1E1014', accent: '#FCA5A5', onAccent: '#301015' },
  CYAN: { name: '70mm Cyan', background: '#0E1B22', accent: '#67E8F9', onAccent: '#08232C' },
  GOLD: { name: '35mm Amber', background: '#20170A', accent: '#FCD34D', onAccent: '#2B2107' },
} as const;

export interface GraphicCard {
  title: string;
  subtitle?: string;
  body: string;
  quote?: string | null;
  author: string;
  handle?: string;
  ratingValue?: number | null;
  ratingScale?: number | null;
  metric?: { value: string; label: string };
  theme: CardTheme;
  palette?: { background: string; accent: string };
  containsSpoilers?: boolean;
  posterDataUrl?: string | null;
}

export function ratingLabel(
  value: number | null | undefined,
  scale: number | null | undefined,
): string {
  if (
    value == null ||
    (scale !== 5 && scale !== 10) ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > scale
  )
    return 'Unrated';
  return `${Number(value.toFixed(2))} / ${scale}`;
}

export function xmlEscape(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, '')
    .replace(
      /[&<>"']/gu,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!,
    );
}

export function wrapCardText(text: string, columns: number, limit: number): string[] {
  const remaining = Array.from(text.replace(/\s+/gu, ' ').trim());
  const lines: string[] = [];
  while (remaining.length && lines.length < limit) {
    let length = 0;
    let width = 0;
    // Budget wide glyphs conservatively so multilingual text stays within the card.
    for (const char of remaining) {
      const units = /[MW\u2E80-\uFFFF]/u.test(char) || char.codePointAt(0)! > 0xffff ? 2 : 1;
      if (width + units > columns) break;
      width += units;
      length++;
    }
    length = Math.max(1, length);
    if (remaining.length > length) {
      const space = remaining.slice(0, length + 1).lastIndexOf(' ');
      if (space > length / 2) length = space;
    }
    lines.push(remaining.splice(0, length).join('').trim());
    while (remaining[0] === ' ') remaining.shift();
  }
  if (remaining.length && lines.length)
    lines[lines.length - 1] = Array.from(lines.at(-1)!).slice(0, -1).join('').trimEnd() + '…';
  return lines;
}

function textLines(
  text: string,
  y: number,
  size: number,
  columns: number,
  maxLines: number,
  color: string,
  weight = '400',
): string {
  return wrapCardText(text, columns, maxLines)
    .map(
      (line, index) =>
        `<text x="540" y="${y + index * size * 1.4}" fill="${color}" font-size="${size}" font-weight="${weight}" text-anchor="middle">${xmlEscape(line)}</text>`,
    )
    .join('');
}

export function renderGraphicCard(card: GraphicCard): string {
  const baseTheme = CARD_THEMES[card.theme];
  const theme =
    card.palette &&
    /^#[0-9a-f]{6}$/iu.test(card.palette.background) &&
    /^#[0-9a-f]{6}$/iu.test(card.palette.accent)
      ? { ...baseTheme, ...card.palette }
      : baseTheme;
  const poster =
    card.posterDataUrl &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/u.test(card.posterDataUrl)
      ? `<image x="345" y="230" width="390" height="585" href="${card.posterDataUrl}" preserveAspectRatio="xMidYMid slice" clip-path="url(#poster)"/>`
      : '<rect x="345" y="230" width="390" height="585" rx="24" fill="#283044"/><text x="540" y="550" fill="#FFFFFF" text-anchor="middle" font-size="42">CINEWRAPPED</text>';
  const validRating = ratingLabel(card.ratingValue, card.ratingScale) !== 'Unrated';
  const normalized = validRating ? (card.ratingValue! / card.ratingScale!) * 5 : 0;
  const stars = validRating
    ? Array.from({ length: 5 }, (_, index) => {
        const x = 350 + index * 80;
        const fraction = Math.max(0, Math.min(1, normalized - index));
        const points = '30,0 39,20 60,23 44,39 49,60 30,50 11,60 16,39 0,23 21,20';
        return `<g transform="translate(${x},1040)"><defs><clipPath id="star${index}"><rect width="${fraction * 60}" height="60"/></clipPath></defs><polygon points="${points}" fill="#475066"/><polygon points="${points}" fill="${theme.accent}" clip-path="url(#star${index})"/></g>`;
      }).join('')
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
<defs><clipPath id="poster"><rect x="345" y="230" width="390" height="585" rx="24"/></clipPath></defs>
<rect width="1080" height="1920" fill="${theme.background}"/>
<rect x="32" y="32" width="1016" height="1856" rx="44" fill="none" stroke="${theme.accent}" stroke-width="3"/>
<g font-family="sans-serif">
<text x="80" y="135" fill="${theme.accent}" font-size="40" font-weight="700">CINEWRAPPED</text>
${card.containsSpoilers ? '<text x="1000" y="135" fill="#FFFFFF" font-size="28" text-anchor="end">SPOILERS</text>' : ''}
${poster}
${textLines(card.title, 895, 52, 28, 2, '#FFFFFF', '700')}
${textLines(card.subtitle ?? '', 1000, 28, 50, 1, '#BDC7D9')}
${stars}
${textLines(card.metric ? `${card.metric.value} · ${card.metric.label}` : 'ratingValue' in card || 'ratingScale' in card ? ratingLabel(card.ratingValue, card.ratingScale) : '', 1155, 38, 35, 1, theme.accent, '700')}
${textLines(card.quote ? `“${card.quote}”` : '', 1230, 30, 44, 2, theme.accent)}
${textLines(card.body, card.quote ? 1340 : 1260, 34, 42, card.quote ? 7 : 9, '#FFFFFF')}
<path d="M80 1690 H1000" stroke="#596174"/>
${textLines(card.author, 1770, 36, 38, 1, '#FFFFFF', '700')}
${textLines(card.handle ? `@${card.handle}` : 'CineWrapped', 1825, 28, 48, 1, '#BDC7D9')}
</g></svg>`;
}
