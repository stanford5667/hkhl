// Non-Pro viewers never get a lesson in full. Every lesson is watchable as a
// capped preview: the first 30% of the video up to 10 minutes. For shorter videos
// (30 minutes or less), the preview window is 15% of the total play time.
export const SHORT_VIDEO_THRESHOLD_SECONDS = 30 * 60; // 30 minutes
export const SHORT_PREVIEW_RATIO = 0.15;
export const LONG_PREVIEW_RATIO = 0.3;
export const PREVIEW_MIN_SECONDS = 30;
export const PREVIEW_MAX_SECONDS = 600; // 10 minutes

/** Seconds of a lesson a non-Pro viewer may watch. */
export function getPreviewLimitSeconds(videoDuration?: number | null): number {
  if (!videoDuration || videoDuration <= 0) return PREVIEW_MAX_SECONDS;

  // Short videos (≤30 min) get a tighter 15% preview window.
  const ratio = videoDuration <= SHORT_VIDEO_THRESHOLD_SECONDS
    ? SHORT_PREVIEW_RATIO
    : LONG_PREVIEW_RATIO;

  return Math.max(
    PREVIEW_MIN_SECONDS,
    Math.min(Math.floor(videoDuration * ratio), PREVIEW_MAX_SECONDS)
  );
}

/**
 * Human label for the preview window, e.g. "3 min".
 * Returns null when the video length is unknown, so callers can fall back to a
 * generic "Free preview" label instead of implying a 10-minute window.
 */
export function getPreviewLabel(videoDuration?: number | null): string | null {
  if (!videoDuration || videoDuration <= 0) return null;
  const seconds = getPreviewLimitSeconds(videoDuration);
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
