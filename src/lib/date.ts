/**
 * Date utilities
 *
 * IMPORTANT: `new Date('YYYY-MM-DD')` is parsed as UTC by JS.
 * In negative timezones, formatting that Date will show the prior calendar day,
 * which can incorrectly appear as a weekend/holiday in the UI.
 *
 * This helper forces date-only strings to be interpreted as a *local* date.
 */
export function parseDateOnly(dateLike: string): Date {
  if (!dateLike) return new Date(NaN);

  // If it's already an ISO timestamp (has a time component), trust native parsing.
  if (dateLike.includes('T')) return new Date(dateLike);

  // Interpret YYYY-MM-DD as local midnight, avoiding UTC shift.
  return new Date(`${dateLike}T00:00:00`);
}
