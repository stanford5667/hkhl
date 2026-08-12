/**
 * Cover-image focal point helpers.
 *
 * The focal point is encoded in the image URL fragment (e.g. `...jpg#fp=50,20`)
 * so no schema change is required. Browsers ignore the fragment when loading
 * the image, and we translate it to a CSS `object-position` value.
 */

export interface ThumbnailFocal {
  /** URL to use as the <img> src (fragment kept — harmless — for cache parity) */
  src: string;
  /** Horizontal focal percentage (0-100) */
  x: number;
  /** Vertical focal percentage (0-100) */
  y: number;
  /** Ready-to-use CSS object-position value */
  objectPosition: string;
}

const DEFAULT_X = 50;
const DEFAULT_Y = 50;

export function parseThumbnail(url?: string | null): ThumbnailFocal | null {
  if (!url) return null;
  const [base, fragment] = url.split('#');
  let x = DEFAULT_X;
  let y = DEFAULT_Y;
  if (fragment) {
    const match = /fp=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(fragment);
    if (match) {
      x = clamp(parseFloat(match[1]));
      y = clamp(parseFloat(match[2]));
    }
  }
  return { src: base, x, y, objectPosition: `${x}% ${y}%` };
}

export function buildThumbnailUrl(url: string, x: number, y: number): string {
  const base = url.split('#')[0];
  const cx = Math.round(clamp(x));
  const cy = Math.round(clamp(y));
  if (cx === DEFAULT_X && cy === DEFAULT_Y) return base;
  return `${base}#fp=${cx},${cy}`;
}

function clamp(value: number) {
  if (Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, value));
}
