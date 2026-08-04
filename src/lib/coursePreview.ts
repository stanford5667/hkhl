// Non-Pro viewers never get a lesson for free in full. Instead every lesson is
// watchable as a capped preview: the first 30% of the video, up to 10 minutes.
export const PREVIEW_RATIO = 0.3;
export const PREVIEW_MAX_SECONDS = 600;

/** Seconds of a lesson a non-Pro viewer may watch. */
export function getPreviewLimitSeconds(videoDuration?: number | null): number {
  if (!videoDuration || videoDuration <= 0) return PREVIEW_MAX_SECONDS;
  return Math.max(30, Math.min(Math.floor(videoDuration * PREVIEW_RATIO), PREVIEW_MAX_SECONDS));
}

/** Human label for the preview window, e.g. "3 min". */
export function getPreviewLabel(videoDuration?: number | null): string {
  const seconds = getPreviewLimitSeconds(videoDuration);
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
