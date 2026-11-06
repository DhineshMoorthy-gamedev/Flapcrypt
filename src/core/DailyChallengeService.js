import { LEVEL_DATA } from '../data/levels.js';

/**
 * Daily Challenge Service
 * Deterministically maps each calendar date to a puzzle from LEVEL_DATA.
 * Uses dynamic LEVEL_DATA.length so adding more campaign levels in the future
 * automatically expands the daily challenge puzzle pool without code changes.
 */
export class DailyChallengeService {
  static ARCHIVE_START_DATE = '2026-10-01';

  /**
   * Returns calendar date components in player's local timezone.
   */
  static getLocalDateComponents(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const day = date.getDate();
    return { year, month, day };
  }

  /**
   * Formats a Date object to YYYY-MM-DD in local time.
   */
  static getDateStr(date = new Date()) {
    const { year, month, day } = this.getLocalDateComponents(date);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  /**
   * Formats a Date object or YYYY-MM-DD string to yesterday's YYYY-MM-DD in local time.
   */
  static getYesterdayDateStr(date = new Date()) {
    let d = date;
    if (typeof date === 'string') {
      const [y, m, day] = date.split('-').map(Number);
      d = new Date(y, m - 1, day);
    }
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    return this.getDateStr(prev);
  }

  /**
   * Returns short date string e.g. "OCT 7"
   */
  static getShortDate(date = new Date()) {
    let d = date;
    if (typeof date === 'string') {
      const [y, m, day] = date.split('-').map(Number);
      d = new Date(y, m - 1, day);
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }

  /**
   * Computes deterministic daily level info for a given date.
   */
  static getDailyLevelInfo(date = new Date()) {
    let d = date;
    if (typeof date === 'string') {
      const [y, m, day] = date.split('-').map(Number);
      d = new Date(y, m - 1, day);
    }
    const { year, month, day } = this.getLocalDateComponents(d);
    const dateStr = this.getDateStr(d);
    const shortDate = this.getShortDate(d);

    // Days since UTC epoch for local midnight
    const epochDays = Math.floor(Date.UTC(year, month, day) / 86400000);

    // Full 32-bit SplitMix32 hash for uniform distribution across all levels and categories
    let h = (epochDays + 0x9e3779b9) | 0;
    h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
    h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
    h = h ^ (h >>> 15);

    const totalLevels = LEVEL_DATA.length > 0 ? LEVEL_DATA.length : 1;
    const levelIndex = Math.abs(h) % totalLevels;
    const level = LEVEL_DATA[levelIndex];

    return {
      dateStr,
      shortDate,
      epochDays,
      levelIndex,
      level
    };
  }

  /**
   * Generates calendar grid cells for a given month.
   * Defaults to player's current local year and month if omitted.
   */
  static getMonthCalendarData(year, month) {
    const now = new Date();
    const targetYear = (typeof year === 'number') ? year : now.getFullYear();
    const targetMonth = (typeof month === 'number') ? month : now.getMonth();

    const todayStr = this.getDateStr();
    const firstDay = new Date(targetYear, targetMonth, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const totalDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    const yearLabel = String(targetYear);

    // Archive boundaries: start at October 2026, bounded up to current local month
    const archiveStartDate = new Date(2026, 9, 1); // October 1, 2026
    const currentMonthFirst = new Date(now.getFullYear(), now.getMonth(), 1);

    const hasPrevMonth = firstDay > archiveStartDate;
    const hasNextMonth = firstDay < currentMonthFirst;

    const cells = [];

    // Empty lead-in padding cells
    for (let p = 0; p < startingDayOfWeek; p++) {
      cells.push({ isPadding: true, dayNum: null });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayDate = new Date(targetYear, targetMonth, d);
      const dateStr = this.getDateStr(dayDate);
      const isBeforeArchive = dateStr < this.ARCHIVE_START_DATE;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const isPlayable = !isBeforeArchive && !isFuture;
      const levelInfo = this.getDailyLevelInfo(dayDate);

      cells.push({
        isPadding: false,
        dayNum: d,
        dateStr,
        dayDate,
        isBeforeArchive,
        isToday,
        isFuture,
        isPlayable,
        levelInfo
      });
    }

    return {
      year: targetYear,
      month: targetMonth,
      monthName,
      yearLabel,
      startingDayOfWeek,
      totalDaysInMonth,
      hasPrevMonth,
      hasNextMonth,
      cells
    };
  }
}
