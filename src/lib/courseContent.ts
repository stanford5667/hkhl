/**
 * Parses the free-form `courses.description` field into structured, presentable
 * content so the course page can render real typography instead of one long
 * run-on paragraph.
 */

export interface CourseSection {
  /** Leading emoji (if the source line had one) */
  icon?: string;
  title: string;
  paragraphs: string[];
  items: string[];
}

export interface ParsedCourseContent {
  /** Short marketing headline — the first line of the description */
  headline: string;
  /** Paragraphs before the "WHAT YOU LEARN" block */
  intro: string[];
  /** The "-" bullet list under "WHAT YOU LEARN" */
  learn: string[];
  /** Remaining emoji/ALL-CAPS titled sections */
  sections: CourseSection[];
  /** Everything as plain text (fallback / meta description) */
  plain: string;
}

const LEARN_HEADING = /^(what you( ?'?ll)? learn|you will learn)\s*:?\s*$/i;
const EMOJI_HEADING =
  /^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\s*(.+)$/u;

function isBullet(line: string) {
  return /^[-–•*]\s?/.test(line);
}

function stripBullet(line: string) {
  return line.replace(/^[-–•*]\s?/, '').trim();
}

/** A short titled line like "📈 Past Calls" or "WHAT YOU LEARN:" */
function asHeading(line: string): { icon?: string; title: string } | null {
  const emoji = line.match(EMOJI_HEADING);
  if (emoji) return { icon: emoji[1], title: emoji[2].trim() };
  if (line.length < 60 && /:$/.test(line)) return { title: line.replace(/:$/, '').trim() };
  return null;
}

export function parseCourseDescription(raw?: string | null): ParsedCourseContent {
  const text = (raw || '').trim();
  const empty: ParsedCourseContent = {
    headline: '',
    intro: [],
    learn: [],
    sections: [],
    plain: text,
  };
  if (!text) return empty;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return empty;

  const headline = lines[0];
  const intro: string[] = [];
  const learn: string[] = [];
  const sections: CourseSection[] = [];

  let mode: 'intro' | 'learn' | 'section' = 'intro';
  let current: CourseSection | null = null;

  for (const line of lines.slice(1)) {
    if (LEARN_HEADING.test(line)) {
      mode = 'learn';
      current = null;
      continue;
    }

    const heading = asHeading(line);
    if (heading && !isBullet(line)) {
      current = { icon: heading.icon, title: heading.title, paragraphs: [], items: [] };
      sections.push(current);
      mode = 'section';
      continue;
    }

    if (mode === 'learn') {
      if (isBullet(line)) {
        learn.push(stripBullet(line));
        continue;
      }
      // Non-bullet line ends the learn block
      mode = 'intro';
    }

    if (mode === 'section' && current) {
      if (isBullet(line)) current.items.push(stripBullet(line));
      else if (line.length < 90 && !/[.!?]$/.test(line)) current.items.push(line);
      else current.paragraphs.push(line);
      continue;
    }

    if (isBullet(line)) learn.push(stripBullet(line));
    else intro.push(line);
  }

  return { headline, intro, learn, sections, plain: text };
}

/** "portfolio-management" → "Portfolio Management" */
export function prettyLabel(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Total course length in hours, derived from lesson durations when unset. */
export function resolveCourseHours(
  durationHours: number | null | undefined,
  totalSeconds: number,
): number | null {
  if (durationHours && durationHours > 0) return durationHours;
  if (totalSeconds > 0) return Math.max(0.5, Math.round((totalSeconds / 3600) * 2) / 2);
  return null;
}

export function formatHours(hours: number | null): string | null {
  if (hours == null) return null;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}
