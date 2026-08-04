// Preview model for non-Pro viewers:
// 1. Only the first 30% of the course's lessons are previewable at all. The
//    remaining lessons are fully locked behind Pro.
// 2. Previewable lessons play as a capped window:
//    - Videos 30 minutes or shorter: 15% of runtime, hard-capped at 2 minutes.
//    - Longer videos: 30% of runtime, hard-capped at 10 minutes.
export const SHORT_VIDEO_THRESHOLD_SECONDS = 30 * 60; // 30 minutes
export const SHORT_PREVIEW_RATIO = 0.15;
export const LONG_PREVIEW_RATIO = 0.3;
export const SHORT_PREVIEW_MAX_SECONDS = 120; // 2 minutes
export const PREVIEW_MIN_SECONDS = 30;
export const PREVIEW_MAX_SECONDS = 600; // 10 minutes

/** Share of a course's lessons that non-Pro viewers may preview. */
export const PREVIEWABLE_LIBRARY_RATIO = 0.3;

/** How many lessons of a course are previewable for non-Pro viewers. */
export function getPreviewableLessonCount(totalLessons: number): number {
  if (!totalLessons || totalLessons <= 0) return 0;
  return Math.max(1, Math.floor(totalLessons * PREVIEWABLE_LIBRARY_RATIO));
}

/** Whether a lesson (0-based position in the course) is previewable. */
export function isLessonPreviewable(lessonIndex: number, totalLessons: number): boolean {
  if (lessonIndex < 0) return false;
  return lessonIndex < getPreviewableLessonCount(totalLessons);
}

/** Seconds of a lesson a non-Pro viewer may watch. */
export function getPreviewLimitSeconds(videoDuration?: number | null): number {
  // Unknown length: assume a short video and use the tighter 2-minute cap.
  if (!videoDuration || videoDuration <= 0) return SHORT_PREVIEW_MAX_SECONDS;

  const isShort = videoDuration <= SHORT_VIDEO_THRESHOLD_SECONDS;
  const ratio = isShort ? SHORT_PREVIEW_RATIO : LONG_PREVIEW_RATIO;
  const maxSeconds = isShort ? SHORT_PREVIEW_MAX_SECONDS : PREVIEW_MAX_SECONDS;

  return Math.max(
    Math.min(PREVIEW_MIN_SECONDS, maxSeconds),
    Math.min(Math.floor(videoDuration * ratio), maxSeconds)
  );
}

/**
 * Human label for the preview window, e.g. "3 min".
 * Returns null when the video length is unknown, so callers can fall back to a
 * generic "Free preview" label.
 */
export function getPreviewLabel(videoDuration?: number | null): string | null {
  if (!videoDuration || videoDuration <= 0) return null;
  const seconds = getPreviewLimitSeconds(videoDuration);
  if (seconds < 60) return `${seconds} sec`;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
