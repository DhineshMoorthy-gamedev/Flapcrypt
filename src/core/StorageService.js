import { LEVEL_DATA } from '../data/levels.js';

const STORAGE_KEY = 'flapcrypt_save_data';

const DEFAULT_STATE = {
  currentLevelIndex: 0,
  highestLevelUnlocked: 0,
  completedLevels: {},
  levelSaves: {},
  soundEnabled: true,
  hapticsEnabled: true,
  remindersEnabled: false,
  removeAds: false,
  hints: {
    balance: 3,
    lastFreeHintClaimTimestamp: 0
  },
  stats: {
    levelsCompleted: 0,
    wordsSolved: 0,
    lettersSolved: 0,
    flapsRotated: 0,
    hintsUsed: 0,
    flawlessLevels: 0,
    totalSecondsPlayed: 0,
    bestLevelTimeSeconds: null
  },
  daily: {
    lastCompletedDate: null,
    completedDates: {},
    currentStreak: 0,
    maxStreak: 0,
    totalCompleted: 0
  },
  dailySaves: {},
  unlockedAchievements: {}
};

export class StorageService {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {
        ...DEFAULT_STATE,
        hints: { ...DEFAULT_STATE.hints },
        stats: { ...DEFAULT_STATE.stats },
        daily: { ...DEFAULT_STATE.daily, completedDates: {} },
        dailySaves: {},
        completedLevels: {},
        levelSaves: {},
        unlockedAchievements: {}
      };
      const parsed = JSON.parse(raw);
      if (!parsed.daily) {
        parsed.daily = { ...DEFAULT_STATE.daily, completedDates: {} };
      }
      if (!parsed.daily.completedDates) {
        parsed.daily.completedDates = {};
      }
      if (parsed.daily.lastCompletedDate) {
        parsed.daily.completedDates[parsed.daily.lastCompletedDate] = true;
      }
      if (!parsed.dailySaves) {
        parsed.dailySaves = {};
      }
      return {
        ...DEFAULT_STATE,
        ...parsed,
        hints: { ...DEFAULT_STATE.hints, ...(parsed.hints || {}) },
        stats: { ...DEFAULT_STATE.stats, ...(parsed.stats || {}) },
        daily: { ...DEFAULT_STATE.daily, ...(parsed.daily || {}) },
        dailySaves: { ...(parsed.dailySaves || {}) },
        completedLevels: parsed.completedLevels || {},
        levelSaves: parsed.levelSaves || {},
        unlockedAchievements: parsed.unlockedAchievements || {}
      };
    } catch (e) {
      console.warn('StorageService: failed to read localStorage', e);
      return {
        ...DEFAULT_STATE,
        hints: { ...DEFAULT_STATE.hints },
        stats: { ...DEFAULT_STATE.stats },
        daily: { ...DEFAULT_STATE.daily },
        completedLevels: {},
        levelSaves: {},
        unlockedAchievements: {}
      };
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

  getHintBalance() {
    return Infinity;
  }

  addHints(qty) {
    if (!this.data.hints) {
      this.data.hints = { ...DEFAULT_STATE.hints };
    }
    const current = this.data.hints.balance ?? 3;
    this.data.hints.balance = Math.max(0, current + qty);
    this.save();
    return Infinity;
  }

  consumeHint() {
    if (!this.data.stats) {
      this.data.stats = { ...DEFAULT_STATE.stats };
    }
    this.data.stats.hintsUsed = (this.data.stats.hintsUsed || 0) + 1;
    this.save();
    return true;
  }

  getFreeHintCooldown() {
    if (!this.data.hints) {
      this.data.hints = { ...DEFAULT_STATE.hints };
    }
    const lastClaim = this.data.hints.lastFreeHintClaimTimestamp || 0;
    const now = Date.now();
    const COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const elapsed = now - lastClaim;
    const remainingMs = Math.max(0, COOLDOWN_MS - elapsed);
    return {
      canClaim: remainingMs <= 0,
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000)
    };
  }

  claimFreeHint() {
    const cooldown = this.getFreeHintCooldown();
    if (!cooldown.canClaim) {
      return { success: false, remainingMs: cooldown.remainingMs };
    }
    if (!this.data.hints) {
      this.data.hints = { ...DEFAULT_STATE.hints };
    }
    this.data.hints.balance = (this.data.hints.balance ?? 3) + 1;
    this.data.hints.lastFreeHintClaimTimestamp = Date.now();
    this.save();
    return { success: true, balance: this.data.hints.balance };
  }

  hasRemovedAds() {
    return Boolean(this.data.removeAds);
  }

  setRemoveAds(val = true) {
    this.data.removeAds = Boolean(val);
    this.save();
    return this.data.removeAds;
  }

  recordLevelVictory({ quote = '', elapsedSeconds = 0, hintsUsedThisLevel = 0 } = {}) {
    if (!this.data.stats) {
      this.data.stats = { ...DEFAULT_STATE.stats };
    }

    // Word count from the solved quote
    const words = (quote || '').trim().split(/\s+/).filter(Boolean).length;
    // Letter count from the solved quote
    const letters = ((quote || '').match(/[a-zA-Z]/g) || []).length;
    const cleanSeconds = Math.max(1, Math.floor(elapsedSeconds));

    this.data.stats.wordsSolved = (this.data.stats.wordsSolved || 0) + words;
    this.data.stats.lettersSolved = (this.data.stats.lettersSolved || 0) + letters;
    this.data.stats.totalSecondsPlayed = (this.data.stats.totalSecondsPlayed || 0) + cleanSeconds;

    if (hintsUsedThisLevel === 0) {
      this.data.stats.flawlessLevels = (this.data.stats.flawlessLevels || 0) + 1;
    }

    if (cleanSeconds > 0) {
      if (this.data.stats.bestLevelTimeSeconds === null || cleanSeconds < this.data.stats.bestLevelTimeSeconds) {
        this.data.stats.bestLevelTimeSeconds = cleanSeconds;
      }
    }

    this.save();
  }

  getAverageLevelTimeSeconds() {
    const completed = this.getCompletedLevelsCount();
    const totalSecs = this.data.stats?.totalSecondsPlayed || 0;
    if (completed <= 0 || totalSecs <= 0) return 0;
    return Math.round(totalSecs / completed);
  }

  getDailyState() {
    if (!this.data.daily) {
      this.data.daily = { ...DEFAULT_STATE.daily, completedDates: {} };
    }
    return { ...this.data.daily };
  }

  getDailyCompletedDates() {
    if (!this.data.daily) {
      this.data.daily = { ...DEFAULT_STATE.daily, completedDates: {} };
    }
    if (!this.data.daily.completedDates) {
      this.data.daily.completedDates = {};
    }
    return { ...this.data.daily.completedDates };
  }

  isDailyDateCompleted(dateStr) {
    if (!this.data.daily || !dateStr) return false;
    const dates = this.getDailyCompletedDates();
    return Boolean(dates[dateStr]);
  }

  isDailyCompletedToday(dateStr) {
    return this.isDailyDateCompleted(dateStr);
  }

  saveDailyProgress(dateStr, data) {
    if (!dateStr) return;
    if (!this.data.dailySaves) {
      this.data.dailySaves = {};
    }
    this.data.dailySaves[dateStr] = data;
    this.save();
  }

  getDailyProgress(dateStr) {
    if (!dateStr || !this.data.dailySaves) return null;
    return this.data.dailySaves[dateStr] || null;
  }

  clearDailyProgress(dateStr) {
    if (this.data.dailySaves && this.data.dailySaves[dateStr]) {
      delete this.data.dailySaves[dateStr];
      this.save();
    }
  }

  completeDailyChallenge(dateStr, yesterdayDateStr) {
    if (!this.data.daily) {
      this.data.daily = { ...DEFAULT_STATE.daily, completedDates: {} };
    }
    if (!this.data.daily.completedDates) {
      this.data.daily.completedDates = {};
    }

    const wasAlreadyCompleted = Boolean(this.data.daily.completedDates[dateStr]);
    this.data.daily.completedDates[dateStr] = true;

    // Determine if this challenge was for today
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = (dateStr === todayStr);

    if (isToday) {
      const prevDate = this.data.daily.lastCompletedDate;
      if (prevDate && prevDate === yesterdayDateStr) {
        this.data.daily.currentStreak = (this.data.daily.currentStreak || 0) + 1;
      } else if (prevDate !== todayStr) {
        this.data.daily.currentStreak = 1;
      }

      this.data.daily.maxStreak = Math.max(
        this.data.daily.maxStreak || 0,
        this.data.daily.currentStreak
      );
      this.data.daily.lastCompletedDate = dateStr;
    }

    if (!wasAlreadyCompleted) {
      this.data.daily.totalCompleted = (this.data.daily.totalCompleted || 0) + 1;
      if (!this.data.stats) {
        this.data.stats = { ...DEFAULT_STATE.stats };
      }
      this.data.stats.dailyChallengesCompleted = (this.data.stats.dailyChallengesCompleted || 0) + 1;
    }

    this.clearDailyProgress(dateStr);
    this.save();
    return this.getDailyState();
  }

  getCategorySolvedCount(category) {
    if (!this.data.completedLevels) return 0;
    const catLower = (category || '').toLowerCase();
    const catLevels = LEVEL_DATA.filter(l => (l.category || 'Quotes').toLowerCase() === catLower);
    return catLevels.filter(l => Boolean(this.data.completedLevels[l.id - 1])).length;
  }

  getAchievementsData() {
    if (!this.data.unlockedAchievements) {
      this.data.unlockedAchievements = {};
    }

    const stats = this.getStats();
    const daily = this.getDailyState();
    const completedCount = this.getCompletedLevelsCount();
    const proverbsSolved = this.getCategorySolvedCount('Proverbs');
    const riddlesSolved = this.getCategorySolvedCount('Riddles');
    const moviesSolved = this.getCategorySolvedCount('Movie Lines');
    const triviaSolved = this.getCategorySolvedCount('Trivia');
    const wordplaySolved = this.getCategorySolvedCount('Wordplay');

    const ctx = {
      completedCount,
      flawlessSolves: stats.flawlessLevels || 0,
      lettersSolved: stats.lettersSolved || 0,
      wordsSolved: stats.wordsSolved || 0,
      dailyCompleted: daily.totalCompleted || 0,
      streak: Math.max(daily.currentStreak || 0, daily.maxStreak || 0),
      proverbsSolved,
      riddlesSolved,
      moviesSolved,
      triviaSolved,
      wordplaySolved,
      totalSecondsPlayed: stats.totalSecondsPlayed || 0,
      flapsRotated: stats.flapsRotated || 0
    };

    let hasNewUnlock = false;
    const now = Date.now();

    const items = ACHIEVEMENT_DEFINITIONS.map(def => {
      const rawCurrent = def.getValue(ctx);
      const isUnlocked = rawCurrent >= def.target;
      let unlockInfo = this.data.unlockedAchievements[def.id];

      if (isUnlocked && !unlockInfo) {
        unlockInfo = { unlockedAt: now };
        this.data.unlockedAchievements[def.id] = unlockInfo;
        hasNewUnlock = true;
      }

      let dateText = '';
      if (isUnlocked && unlockInfo && unlockInfo.unlockedAt) {
        const d = new Date(unlockInfo.unlockedAt);
        dateText = `Unlocked ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
      }

      let progressText = '';
      if (def.unit === 'm') {
        const curMins = Math.floor(rawCurrent / 60);
        const targetMins = Math.floor(def.target / 60);
        progressText = `${Math.min(targetMins, curMins)} / ${targetMins}m`;
      } else {
        progressText = `${Math.min(def.target, rawCurrent)} / ${def.target}`;
      }

      return {
        ...def,
        current: rawCurrent,
        isUnlocked,
        dateText,
        progressText
      };
    });

    if (hasNewUnlock) {
      this.save();
    }

    const unlockedCount = items.filter(i => i.isUnlocked).length;
    const totalCount = items.length;
    const percentCompleted = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    return {
      items,
      unlockedCount,
      totalCount,
      percentCompleted
    };
  }

  resetProgress() {
    this.data = {
      ...DEFAULT_STATE,
      hints: { ...DEFAULT_STATE.hints },
      stats: { ...DEFAULT_STATE.stats },
      daily: { ...DEFAULT_STATE.daily, completedDates: {} },
      dailySaves: {},
      completedLevels: {},
      levelSaves: {},
      unlockedAchievements: {}
    };
    this.save();
  }
}

export const ACHIEVEMENT_DEFINITIONS = [
  // 1. CAMPAIGN
  {
    id: 'campaign_1',
    category: 'campaign',
    name: 'First Decrypt',
    desc: 'Complete your first quote puzzle',
    target: 1,
    icon: 'bolt',
    getValue: (ctx) => ctx.completedCount
  },
  {
    id: 'campaign_10',
    category: 'campaign',
    name: 'Junior Decoder',
    desc: 'Complete 10 campaign levels',
    target: 10,
    icon: 'scroll',
    getValue: (ctx) => ctx.completedCount
  },
  {
    id: 'campaign_25',
    category: 'campaign',
    name: 'Enigma Specialist',
    desc: 'Complete 25 campaign levels',
    target: 25,
    icon: 'key',
    getValue: (ctx) => ctx.completedCount
  },
  {
    id: 'campaign_50',
    category: 'campaign',
    name: 'Century Flapper',
    desc: 'Complete 50 campaign levels',
    target: 50,
    icon: 'medal',
    getValue: (ctx) => ctx.completedCount
  },
  {
    id: 'campaign_100',
    category: 'campaign',
    name: 'Grand Cryptographer',
    desc: 'Complete 100 campaign levels',
    target: 100,
    icon: 'trophy',
    getValue: (ctx) => ctx.completedCount
  },

  // 2. MASTERY
  {
    id: 'mastery_flawless_1',
    category: 'mastery',
    name: 'Flawless Mind',
    desc: 'Solve any level with 0 hints used',
    target: 1,
    icon: 'shield',
    getValue: (ctx) => ctx.flawlessSolves
  },
  {
    id: 'mastery_flawless_5',
    category: 'mastery',
    name: 'Pure Deduction',
    desc: 'Solve 5 levels with 0 hints used',
    target: 5,
    icon: 'star',
    getValue: (ctx) => ctx.flawlessSolves
  },
  {
    id: 'mastery_flawless_15',
    category: 'mastery',
    name: 'Silent Cipher',
    desc: 'Solve 15 levels with 0 hints used',
    target: 15,
    icon: 'brain',
    getValue: (ctx) => ctx.flawlessSolves
  },
  {
    id: 'mastery_letters_250',
    category: 'mastery',
    name: 'Letter Collector',
    desc: 'Correctly decode 250 letters',
    target: 250,
    icon: 'letter',
    getValue: (ctx) => ctx.lettersSolved
  },
  {
    id: 'mastery_letters_1000',
    category: 'mastery',
    name: 'Lexicon Titan',
    desc: 'Correctly decode 1,000 letters',
    target: 1000,
    icon: 'word',
    getValue: (ctx) => ctx.lettersSolved
  },

  // 3. DAILY
  {
    id: 'daily_1',
    category: 'daily',
    name: 'Daily Habit',
    desc: 'Solve your first Daily Challenge',
    target: 1,
    icon: 'calendar',
    getValue: (ctx) => ctx.dailyCompleted
  },
  {
    id: 'daily_streak_3',
    category: 'daily',
    name: 'Three-Day Cadence',
    desc: 'Reach a 3-day Daily win streak',
    target: 3,
    icon: 'flame',
    getValue: (ctx) => ctx.streak
  },
  {
    id: 'daily_streak_7',
    category: 'daily',
    name: 'Weekly Discipline',
    desc: 'Reach a 7-day Daily win streak',
    target: 7,
    icon: 'sparkles',
    getValue: (ctx) => ctx.streak
  },
  {
    id: 'daily_archive_5',
    category: 'daily',
    name: 'Archive Explorer',
    desc: 'Solve 5 challenges from Daily Archive',
    target: 5,
    icon: 'compass',
    getValue: (ctx) => ctx.dailyCompleted
  },
  {
    id: 'daily_14',
    category: 'daily',
    name: 'Fortnight Devotion',
    desc: 'Solve 14 Daily Challenges in total',
    target: 14,
    icon: 'crown',
    getValue: (ctx) => ctx.dailyCompleted
  },

  // 4. STRATEGY
  {
    id: 'strategy_proverbs_3',
    category: 'strategy',
    name: 'Wisdom of Ages',
    desc: 'Solve 3 Proverbs category puzzles',
    target: 3,
    icon: 'owl',
    getValue: (ctx) => ctx.proverbsSolved
  },
  {
    id: 'strategy_riddles_3',
    category: 'strategy',
    name: 'Enigmatic Sphinx',
    desc: 'Solve 3 Riddles category puzzles',
    target: 3,
    icon: 'help',
    getValue: (ctx) => ctx.riddlesSolved
  },
  {
    id: 'strategy_movies_3',
    category: 'strategy',
    name: 'Silver Screen',
    desc: 'Solve 3 Movie Lines category puzzles',
    target: 3,
    icon: 'film',
    getValue: (ctx) => ctx.moviesSolved
  },
  {
    id: 'strategy_trivia_3',
    category: 'strategy',
    name: 'Fact Hunter',
    desc: 'Solve 3 Trivia category puzzles',
    target: 3,
    icon: 'bulbRays',
    getValue: (ctx) => ctx.triviaSolved
  },
  {
    id: 'strategy_wordplay_3',
    category: 'strategy',
    name: 'Pun Intended',
    desc: 'Solve 3 Wordplay category puzzles',
    target: 3,
    icon: 'masks',
    getValue: (ctx) => ctx.wordplaySolved
  },

  // 5. TIME (Play Time Accumulation)
  {
    id: 'time_5m',
    category: 'time',
    name: 'First Session',
    desc: 'Accumulate 5 minutes of active solve time',
    target: 300,
    unit: 'm',
    icon: 'timerFast',
    getValue: (ctx) => ctx.totalSecondsPlayed
  },
  {
    id: 'time_15m',
    category: 'time',
    name: 'Deep Focus',
    desc: 'Accumulate 15 minutes of active solve time',
    target: 900,
    unit: 'm',
    icon: 'hourglass',
    getValue: (ctx) => ctx.totalSecondsPlayed
  },
  {
    id: 'time_30m',
    category: 'time',
    name: 'Half-Hour Scholar',
    desc: 'Accumulate 30 minutes of active solve time',
    target: 1800,
    unit: 'm',
    icon: 'clock',
    getValue: (ctx) => ctx.totalSecondsPlayed
  },
  {
    id: 'time_60m',
    category: 'time',
    name: 'Hour of Decryption',
    desc: 'Accumulate 60 minutes of active solve time',
    target: 3600,
    unit: 'm',
    icon: 'clock',
    getValue: (ctx) => ctx.totalSecondsPlayed
  },
  {
    id: 'time_120m',
    category: 'time',
    name: 'Master of Hours',
    desc: 'Accumulate 120 minutes of active solve time',
    target: 7200,
    unit: 'm',
    icon: 'trophy',
    getValue: (ctx) => ctx.totalSecondsPlayed
  },

  // 6. MECHANICS
  {
    id: 'mechanics_1',
    category: 'mechanics',
    name: 'First Clack',
    desc: 'Rotate a split-flap drum for the first time',
    target: 1,
    icon: 'rotate',
    getValue: (ctx) => ctx.flapsRotated
  },
  {
    id: 'mechanics_100',
    category: 'mechanics',
    name: 'Mechanical Rhythm',
    desc: 'Rotate split-flap drums 100 times',
    target: 100,
    icon: 'gear',
    getValue: (ctx) => ctx.flapsRotated
  },
  {
    id: 'mechanics_500',
    category: 'mechanics',
    name: 'Drum Enthusiast',
    desc: 'Rotate split-flap drums 500 times',
    target: 500,
    icon: 'rotate',
    getValue: (ctx) => ctx.flapsRotated
  },
  {
    id: 'mechanics_1500',
    category: 'mechanics',
    name: 'Clockwork Touch',
    desc: 'Rotate split-flap drums 1,500 times',
    target: 1500,
    icon: 'gear',
    getValue: (ctx) => ctx.flapsRotated
  },
  {
    id: 'mechanics_3000',
    category: 'mechanics',
    name: 'Virtuoso of Flaps',
    desc: 'Rotate split-flap drums 3,000 times',
    target: 3000,
    icon: 'trophy',
    getValue: (ctx) => ctx.flapsRotated
  }
];


