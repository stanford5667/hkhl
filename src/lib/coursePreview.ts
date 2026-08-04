// Free (non-Pro) viewers can watch the first 30% of a course's lessons in full.
export const PREVIEW_LESSON_RATIO = 0.3;

export function getFreeLessonCount(totalLessons: number): number {
  if (!totalLessons || totalLessons <= 0) return 0;
  return Math.max(1, Math.ceil(totalLessons * PREVIEW_LESSON_RATIO));
}

export function isFreeLessonIndex(index: number, totalLessons: number): boolean {
  if (index < 0) return false;
  return index < getFreeLessonCount(totalLessons);
}
