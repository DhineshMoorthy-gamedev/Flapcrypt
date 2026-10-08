import { LEVEL_DATA } from '../data/levels.js';

/**
 * Daily Challenge Service
 * Deterministically maps each calendar date to a puzzle from LEVEL_DATA.
 * Uses dynamic LEVEL_DATA.length so adding more campaign levels in the future
 * automatically expands the daily challenge puzzle pool without code changes.
 */
export class DailyChallengeService {
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
   * Formats a Date object to yesterday's YYYY-MM-DD in local time.
   */
  static getYesterdayDateStr(date = new Date()) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    return this.getDateStr(prev);
  }

  /**
   * Returns short date string e.g. "OCT 7"
   */
  static getShortDate(date = new Date()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }

  /**
   * Computes deterministic daily level info for a given date.
   */
  static getDailyLevelInfo(date = new Date()) {
    const { year, month, day } = this.getLocalDateComponents(date);
    const dateStr = this.getDateStr(date);
    const shortDate = this.getShortDate(date);

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
}
