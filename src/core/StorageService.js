const STORAGE_KEY = 'flapcrypt_save_data';

const DEFAULT_STATE = {
  currentLevelIndex: 0,
  highestLevelUnlocked: 0,
  completedLevels: {},
  levelSaves: {},
  soundEnabled: true,
  hapticsEnabled: true,
  remindersEnabled: false,
  stats: {
    levelsCompleted: 0,
    hintsUsed: 0,
    flapsRotated: 0
  },
  daily: {
    lastCompletedDate: null,
    currentStreak: 0,
    maxStreak: 0,
    totalCompleted: 0
  }
};

export class StorageService {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE, stats: { ...DEFAULT_STATE.stats }, daily: { ...DEFAULT_STATE.daily }, completedLevels: {}, levelSaves: {} };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        completedLevels: parsed.completedLevels || {},
        levelSaves: parsed.levelSaves || {},
        stats: {
          ...DEFAULT_STATE.stats,
          ...(parsed.stats || {})
        },
        daily: {
          ...DEFAULT_STATE.daily,
          ...(parsed.daily || {})
        }
      };
    } catch (e) {
      console.warn('StorageService: failed to read localStorage', e);
      return { ...DEFAULT_STATE, stats: { ...DEFAULT_STATE.stats }, daily: { ...DEFAULT_STATE.daily }, completedLevels: {}, levelSaves: {} };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('StorageService: failed to write localStorage', e);
    }
  }

  getCurrentLevel() {
    return this.data.currentLevelIndex || 0;
  }

  setCurrentLevel(index) {
    this.data.currentLevelIndex = index;
    this.save();
  }

  saveLevelProgress(levelIndex, data) {
    if (!this.data.levelSaves) {
      this.data.levelSaves = {};
    }
    this.data.levelSaves[levelIndex] = data;
    this.save();
  }

  getLevelProgress(levelIndex) {
    if (!this.data.levelSaves) return null;
    return this.data.levelSaves[levelIndex] || null;
  }

  hasLevelInProgress(levelIndex) {
    const save = this.getLevelProgress(levelIndex);
    return Boolean(save && !save.isWon);
  }

  clearLevelProgress(levelIndex) {
    if (this.data.levelSaves && this.data.levelSaves[levelIndex]) {
      delete this.data.levelSaves[levelIndex];
      this.save();
    }
  }

  isLevelCompleted(index) {
    return Boolean(this.data.completedLevels && this.data.completedLevels[index]);
  }

  getCompletedLevelsCount() {
    if (!this.data.completedLevels) return 0;
    return Object.values(this.data.completedLevels).filter(Boolean).length;
  }

  completeLevel(index) {
    if (!this.data.completedLevels) {
      this.data.completedLevels = {};
    }
    this.data.completedLevels[index] = true;

    const count = Object.values(this.data.completedLevels).filter(Boolean).length;
    this.data.stats.levelsCompleted = count;
    this.save();
  }

  recordFlapRotation() {
    this.data.stats.flapsRotated += 1;
    this.save();
  }

  recordHintUsed() {
    this.data.stats.hintsUsed += 1;
    this.save();
  }

  isSoundEnabled() {
    return this.data.soundEnabled;
  }

  setSoundEnabled(enabled) {
    this.data.soundEnabled = enabled;
    this.save();
  }

  isHapticsEnabled() {
    return this.data.hapticsEnabled;
  }

  setHapticsEnabled(enabled) {
    this.data.hapticsEnabled = enabled;
    this.save();
  }

  isRemindersEnabled() {
    return Boolean(this.data.remindersEnabled);
  }

  setRemindersEnabled(enabled) {
    this.data.remindersEnabled = Boolean(enabled);
    this.save();
  }

  getStats() {
    return { ...this.data.stats };
  }

  getDailyState() {
    if (!this.data.daily) {
      this.data.daily = { ...DEFAULT_STATE.daily };
    }
    return { ...this.data.daily };
  }

  isDailyCompletedToday(dateStr) {
    if (!this.data.daily || !dateStr) return false;
    return this.data.daily.lastCompletedDate === dateStr;
  }

  completeDailyChallenge(dateStr, yesterdayDateStr) {
    if (!this.data.daily) {
      this.data.daily = { ...DEFAULT_STATE.daily };
    }

    // Already completed today: no-op
    if (this.data.daily.lastCompletedDate === dateStr) {
      return this.getDailyState();
    }

    const prevDate = this.data.daily.lastCompletedDate;
    if (prevDate && prevDate === yesterdayDateStr) {
      this.data.daily.currentStreak += 1;
    } else {
      this.data.daily.currentStreak = 1;
    }

    this.data.daily.maxStreak = Math.max(
      this.data.daily.maxStreak || 0,
      this.data.daily.currentStreak
    );
    this.data.daily.lastCompletedDate = dateStr;
    this.data.daily.totalCompleted = (this.data.daily.totalCompleted || 0) + 1;

    this.save();
    return this.getDailyState();
  }

  resetProgress() {
    this.data = {
      ...DEFAULT_STATE,
      stats: { ...DEFAULT_STATE.stats },
      daily: { ...DEFAULT_STATE.daily }
    };
    this.save();
  }
}

