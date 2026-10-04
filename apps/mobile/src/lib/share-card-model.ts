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

export const CARD_FORMATS = {
  STORY: { name: 'Story', width: 1080, height: 1920 },
  SQUARE: { name: 'Square', width: 1080, height: 1080 },
  PORTRAIT: { name: 'Feed portrait', width: 1080, height: 1350 },
  LANDSCAPE: { name: 'Landscape', width: 1920, height: 1080 },
} as const;
export type CardFormat = keyof typeof CARD_FORMATS;
export const CARD_TEMPLATES = {
  CLASSIC: 'Classic',
  TICKET: 'Cinema ticket',
  FESTIVAL: 'Festival poster',
  MINIMAL: 'Minimal cover',
} as const;
export type CardTemplate = keyof typeof CARD_TEMPLATES;
export function cardDimensions(card: GraphicCard) {
  return CARD_FORMATS[card.format ?? 'STORY'];
}
export function safeCardImage(value: string | null | undefined): string | null {
  return value && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/u.test(value)
    ? value
    : null;
}
export interface GraphicCard {
  format?: CardFormat;
  template?: CardTemplate;
  signature?: string;
  initials?: string;
  hideWatermark?: boolean;
  collage?: Array<{ title: string; dataUrl: string | null }>;
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
  if (
    (card.template && card.template !== 'CLASSIC') ||
    (card.format && card.format !== 'STORY') ||
    card.collage?.length ||
    card.signature ||
    card.initials ||
    card.hideWatermark
  )
    return renderDesignedCard(card, theme);
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

function renderDesignedCard(
  card: GraphicCard,
  theme: { background: string; accent: string },
): string {
  const { width: w, height: h } = cardDimensions(card);
  const landscape = w > h;
  const compact = h <= 1350;
  const template = card.template ?? 'CLASSIC';
  const px = landscape ? 90 : compact ? 70 : 180;
  const py = 190;
  const pw = landscape ? 660 : compact ? 360 : 720;
  const ph = landscape ? 660 : compact ? 540 : 650;
  const tx = landscape ? 850 : compact ? 490 : 90;
  const tw = w - tx - 90;
  const ty = landscape || compact ? 250 : 950;
  const lines = (
    value: string,
    y: number,
    size: number,
    count: number,
    color = '#FFFFFF',
    bold = false,
  ) =>
    wrapCardText(value, Math.floor(tw / (size * 0.62)), count)
      .map(
        (line, i) =>
          `<text x="${tx}" y="${y + i * size * 1.35}" fill="${color}" font-size="${size}" font-weight="${bold ? 700 : 400}">${xmlEscape(line)}</text>`,
      )
      .join('');
  const items = card.collage?.length
    ? card.collage.slice(0, 4)
    : [{ title: card.title, dataUrl: card.posterDataUrl ?? null }];
  const images = items
    .map((item, i) => {
      const cols = items.length > 1 ? 2 : 1;
      const rows = Math.ceil(items.length / cols);
      const iw = items.length === 1 ? Math.min(pw, (ph * 2) / 3) : (pw - 16 * (cols - 1)) / cols;
      const ih = (ph - 16 * (rows - 1)) / rows;
      const x = px + (items.length === 1 ? (pw - iw) / 2 : (i % cols) * (iw + 16)),
        y = py + Math.floor(i / cols) * (ih + 16);
      const data = safeCardImage(item.dataUrl);
      return `<clipPath id="tile${i}"><rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="12"/></clipPath><rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="12" fill="#283044"/>${data ? `<image x="${x}" y="${y}" width="${iw}" height="${ih}" href="${data}" preserveAspectRatio="xMidYMid slice" clip-path="url(#tile${i})"/>` : `<text x="${x + iw / 2}" y="${y + ih / 2}" text-anchor="middle" fill="#FFFFFF" font-size="18">POSTER</text><text x="${x + iw / 2}" y="${y + ih / 2 + 26}" text-anchor="middle" fill="#FFFFFF" font-size="18">UNAVAILABLE</text>`}${items.length > 1 ? `<rect x="${x}" y="${y + ih - 62}" width="${iw}" height="62" fill="#121722"/><text x="${x + 12}" y="${y + ih - 24}" fill="#FFFFFF" font-size="22">${xmlEscape(wrapCardText(item.title, Math.floor(iw / 15) - 2, 1)[0] ?? '')}</text>` : ''}`;
    })
    .join('');
  const decoration =
    template === 'TICKET'
      ? `<path d="M50 ${h - 210} H${w - 50}" stroke="${theme.accent}" stroke-width="4" stroke-dasharray="12 12"/><circle cx="30" cy="${h - 210}" r="30" fill="${theme.background}"/><circle cx="${w - 30}" cy="${h - 210}" r="30" fill="${theme.background}"/>`
      : template === 'FESTIVAL'
        ? `<rect x="30" y="30" width="${w - 60}" height="100" fill="${theme.accent}"/><text x="65" y="95" font-size="38" fill="#121722" font-weight="700">THE CINEPHILE SELECTION</text>`
        : '';
  const bodyY = ty + (compact ? 230 : 255);
  const maxBody = Math.max(1, Math.floor((h - 260 - bodyY) / 43));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${theme.background}"/><g font-family="${template === 'MINIMAL' ? 'serif' : 'sans-serif'}"><rect x="30" y="30" width="${w - 60}" height="${h - 60}" rx="${template === 'TICKET' ? 12 : 30}" fill="none" stroke="${theme.accent}" stroke-width="${template === 'MINIMAL' ? 1 : 4}"/>${decoration}${template !== 'FESTIVAL' && !card.hideWatermark ? `<text x="70" y="110" fill="${theme.accent}" font-size="34" font-weight="700">CINEWRAPPED</text>` : ''}${card.containsSpoilers ? `<text x="${w - 70}" y="160" fill="#FFFFFF" font-size="28" text-anchor="end">SPOILERS</text>` : ''}${images}${lines(card.title, ty, compact ? 40 : 52, 2, '#FFFFFF', true)}${lines(card.subtitle ?? '', ty + 130, 24, 1, '#BDC7D9')}${lines(card.metric ? card.metric.value + ' · ' + card.metric.label : 'ratingValue' in card || 'ratingScale' in card ? ratingLabel(card.ratingValue, card.ratingScale) : '', ty + 190, 32, 1, theme.accent, true)}${lines(card.quote ? '“' + card.quote + '” ' + card.body : card.body, bodyY, 32, maxBody)}<path d="M70 ${h - 180} H${w - 70}" stroke="${theme.accent}"/>${card.initials ? `<circle cx="105" cy="${h - 112}" r="34" fill="${theme.accent}"/><text x="105" y="${h - 101}" text-anchor="middle" font-size="26" fill="#121722" font-weight="700">${xmlEscape(Array.from(card.initials).slice(0, 3).join(''))}</text>` : ''}<text x="${card.initials ? 160 : 70}" y="${h - 115}" fill="#FFFFFF" font-size="30" font-weight="700">${xmlEscape(wrapCardText(card.author, Math.floor((w - 260) / 22), 1)[0] ?? '')}</text><text x="70" y="${h - 65}" fill="#BDC7D9" font-size="24">${xmlEscape(wrapCardText(card.signature || (card.handle ? '@' + card.handle : 'CineWrapped'), Math.floor((w - 140) / 18), 1)[0] ?? '')}</text></g></svg>`;
}
