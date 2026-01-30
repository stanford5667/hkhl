/**
 * US Market Holidays
 * Used to filter out non-trading days from backtests
 */

// Fixed US holidays (month, day) - 0-indexed months
const FIXED_HOLIDAYS = [
  { month: 0, day: 1 },   // New Year's Day
  { month: 6, day: 4 },   // Independence Day
  { month: 11, day: 25 }, // Christmas Day
];

// Calculate floating holidays for a given year
function getFloatingHolidays(year: number): Date[] {
  const holidays: Date[] = [];
  
  // MLK Day - 3rd Monday of January
  holidays.push(getNthDayOfMonth(year, 0, 1, 3));
  
  // Presidents Day - 3rd Monday of February
  holidays.push(getNthDayOfMonth(year, 1, 1, 3));
  
  // Good Friday - Friday before Easter Sunday
  const easter = getEasterSunday(year);
  holidays.push(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000));
  
  // Memorial Day - Last Monday of May
  holidays.push(getLastDayOfMonth(year, 4, 1));
  
  // Juneteenth - June 19 (observed on nearest weekday if weekend)
  const juneteenth = new Date(year, 5, 19);
  holidays.push(getObservedHoliday(juneteenth));
  
  // Labor Day - 1st Monday of September
  holidays.push(getNthDayOfMonth(year, 8, 1, 1));
  
  // Thanksgiving - 4th Thursday of November
  holidays.push(getNthDayOfMonth(year, 10, 4, 4));
  
  return holidays;
}

// Get nth occurrence of a day in a month (e.g., 3rd Monday)
function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  let dayOffset = dayOfWeek - firstDay.getDay();
  if (dayOffset < 0) dayOffset += 7;
  const date = new Date(year, month, 1 + dayOffset + (n - 1) * 7);
  return date;
}

// Get last occurrence of a day in a month (e.g., last Monday)
function getLastDayOfMonth(year: number, month: number, dayOfWeek: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  let dayOffset = lastDay.getDay() - dayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month + 1, -dayOffset);
}

// Get observed holiday (Friday if Saturday, Monday if Sunday)
function getObservedHoliday(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return new Date(date.getTime() - 24 * 60 * 60 * 1000); // Saturday -> Friday
  if (day === 0) return new Date(date.getTime() + 24 * 60 * 60 * 1000); // Sunday -> Monday
  return date;
}

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/**
 * Get all US market holidays for a given year
 */
export function getMarketHolidays(year: number): Date[] {
  const holidays: Date[] = [];
  
  // Add fixed holidays with observed adjustments
  for (const { month, day } of FIXED_HOLIDAYS) {
    const holiday = new Date(year, month, day);
    holidays.push(getObservedHoliday(holiday));
  }
  
  // Add floating holidays
  holidays.push(...getFloatingHolidays(year));
  
  return holidays.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Check if a date is a US market holiday
 */
export function isMarketHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const holidays = getMarketHolidays(year);
  
  const dateString = date.toISOString().split('T')[0];
  return holidays.some(h => h.toISOString().split('T')[0] === dateString);
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if a date is a valid trading day
 */
export function isTradingDay(date: Date): boolean {
  return !isWeekend(date) && !isMarketHoliday(date);
}

/**
 * Get the next valid trading day
 */
export function getNextTradingDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  
  while (!isTradingDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

/**
 * Get the previous valid trading day
 */
export function getPreviousTradingDay(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  
  while (!isTradingDay(prev)) {
    prev.setDate(prev.getDate() - 1);
  }
  
  return prev;
}

/**
 * Format holiday name for display
 */
export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const dateString = date.toISOString().split('T')[0];
  
  // Check fixed holidays
  const month = date.getMonth();
  const day = date.getDate();
  
  if (month === 0 && day === 1) return 'New Year\'s Day';
  if (month === 6 && day === 4) return 'Independence Day';
  if (month === 11 && day === 25) return 'Christmas Day';
  if (month === 5 && day === 19) return 'Juneteenth';
  
  // Check floating holidays
  const mlk = getNthDayOfMonth(year, 0, 1, 3);
  if (mlk.toISOString().split('T')[0] === dateString) return 'MLK Day';
  
  const presidents = getNthDayOfMonth(year, 1, 1, 3);
  if (presidents.toISOString().split('T')[0] === dateString) return 'Presidents\' Day';
  
  const easter = getEasterSunday(year);
  const goodFriday = new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000);
  if (goodFriday.toISOString().split('T')[0] === dateString) return 'Good Friday';
  
  const memorial = getLastDayOfMonth(year, 4, 1);
  if (memorial.toISOString().split('T')[0] === dateString) return 'Memorial Day';
  
  const labor = getNthDayOfMonth(year, 8, 1, 1);
  if (labor.toISOString().split('T')[0] === dateString) return 'Labor Day';
  
  const thanksgiving = getNthDayOfMonth(year, 10, 4, 4);
  if (thanksgiving.toISOString().split('T')[0] === dateString) return 'Thanksgiving';
  
  return null;
}
