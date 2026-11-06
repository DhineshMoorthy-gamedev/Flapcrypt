import { LEVEL_DATA } from '../data/levels.js';
import { PlatformBridge } from '../platform/lifecycle.js';
import { DailyChallengeService } from '../core/DailyChallengeService.js';
import { Icons } from './Icons.js';

export class HomeScreen {
  constructor({ storageService, audioService, modalManager, onStartGame, onOpenSettings, onOpenLevelSelect }) {
    this.storage = storageService;
    this.audio = audioService;
    this.modals = modalManager;
    this.onStartGame = onStartGame;
    this.onOpenSettings = onOpenSettings;
    this.onOpenLevelSelect = onOpenLevelSelect;
    this.isAnimatingTitle = false;
    this.animTimers = [];

    this.container = document.getElementById('homeScreen');
    this.heroBoard = document.getElementById('heroFlapBoard');
    this.levelTextEl = document.getElementById('campaignLevelText');
    this.campaignProgressBadge = document.getElementById('campaignProgressBadge');
    this.progressFillEl = document.getElementById('campaignProgressFill');

    // Daily Challenge elements
    this.dailyCard = document.getElementById('dailyCard');
    this.dailyStreakText = document.getElementById('dailyStreakText');
    this.dailyDateHeading = document.getElementById('dailyDateHeading');
    this.dailyStatusSubtext = document.getElementById('dailyStatusSubtext');
    this.btnPlayDaily = document.getElementById('btnPlayDaily');
    this.dailyPlayIcon = document.getElementById('dailyPlayIcon');
    this.dailyBtnMainLabel = document.getElementById('dailyBtnMainLabel');

    this.initHeroFlaps();
    this.initButtons();
    this.updateProgress();
  }

  initHeroFlaps() {
    if (!this.heroBoard) return;
    const title = 'FLAPCRYPT';
    this.heroBoard.innerHTML = title.split('').map((char, idx) => `
      <div class="hero-flap-cell" data-index="${idx}" aria-label="${char}">
        <div class="hero-flap-half hero-flap-top">
          <span class="hero-flap-char">${char}</span>
        </div>
        <div class="hero-flap-half hero-flap-bottom">
          <span class="hero-flap-char">${char}</span>
        </div>
        <div class="hero-flap-seam"></div>
      </div>
    `).join('');

    // Clicking anywhere on the signboard triggers the mechanical flip animation!
    this.heroBoard.addEventListener('click', () => {
      this.animateTitle();
    });

    this.heroBoard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.animateTitle();
      }
    });
  }

  clearAnimation() {
    if (this.animTimers && this.animTimers.length) {
      this.animTimers.forEach(t => clearTimeout(t));
      this.animTimers = [];
    }
    this.isAnimatingTitle = false;
    if (this.heroBoard) {
      this.heroBoard.classList.remove('flipping');
      const halves = this.heroBoard.querySelectorAll('.hero-flap-half');
      halves.forEach(h => {
        h.classList.remove('hero-flip-top', 'hero-flip-bot');
        h.style.transform = '';
      });
    }
  }

  /**
   * Resets all 9 signboard cells firmly to "FLAPCRYPT".
   * Guaranteed idempotent so letters can never vanish or get stuck in 3D rotation.
   */
  resetTitle() {
    this.clearAnimation();
    if (!this.heroBoard) return;
    const title = 'FLAPCRYPT';
    let cells = Array.from(this.heroBoard.querySelectorAll('.hero-flap-cell'));
    if (cells.length !== title.length) {
      this.initHeroFlaps();
      cells = Array.from(this.heroBoard.querySelectorAll('.hero-flap-cell'));
    }

    cells.forEach((cell, i) => {
      const char = title[i];
      const topHalf = cell.querySelector('.hero-flap-top');
      const botHalf = cell.querySelector('.hero-flap-bottom');
      const topSpan = topHalf ? topHalf.querySelector('.hero-flap-char') : null;
      const botSpan = botHalf ? botHalf.querySelector('.hero-flap-char') : null;

      if (topHalf) {
        topHalf.classList.remove('hero-flip-top');
        topHalf.style.transform = '';
      }
      if (botHalf) {
        botHalf.classList.remove('hero-flip-bot');
        botHalf.style.transform = '';
      }
      if (topSpan) topSpan.textContent = char;
      if (botSpan) botSpan.textContent = char;
    });
  }

  /**
   * Cascades mechanical split-flap rotations across the "FLAPCRYPT" signboard.
   * Uses CSS keyframe classes and strict timer tracking so letters never vanish.
   */
  animateTitle({ silent = false } = {}) {
    if (!this.heroBoard) return;
    // Cancel any active animation and ensure clean baseline
    this.resetTitle();
    this.isAnimatingTitle = true;
    this.heroBoard.classList.add('flipping');

    const title = 'FLAPCRYPT';
    const cells = Array.from(this.heroBoard.querySelectorAll('.hero-flap-cell'));
    if (!cells.length) {
      this.isAnimatingTitle = false;
      return;
    }

    const charsPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Crisp mechanical solenoid clack on trigger
    if (!silent) {
      try {
        if (this.audio && (!this.storage || this.storage.isSoundEnabled())) {
          this.audio.playClick();
        }
        PlatformBridge.vibrateLight();
      } catch (_) {}
    }

    cells.forEach((cellEl, idx) => {
      const topHalf = cellEl.querySelector('.hero-flap-top');
      const botHalf = cellEl.querySelector('.hero-flap-bottom');
      const topSpan = topHalf ? topHalf.querySelector('.hero-flap-char') : null;
      const botSpan = botHalf ? botHalf.querySelector('.hero-flap-char') : null;
      const targetChar = title[idx];

      const staggerDelay = idx * 45; // 45ms stagger per letter

      const timer1 = setTimeout(() => {
        // Step 1: Start 3D flap rotation and swap to transient character
        const randChar = charsPool[Math.floor(Math.random() * charsPool.length)];
        if (topSpan) topSpan.textContent = randChar;
        if (botSpan) botSpan.textContent = randChar;

        if (topHalf) topHalf.classList.add('hero-flip-top');
        if (botHalf) botHalf.classList.add('hero-flip-bot');

        // Step 2: Mid-rotation / finish flip, lock firmly on correct letter
        const timer2 = setTimeout(() => {
          if (topHalf) {
            topHalf.classList.remove('hero-flip-top');
            topHalf.style.transform = '';
          }
          if (botHalf) {
            botHalf.classList.remove('hero-flip-bot');
            botHalf.style.transform = '';
          }
          if (topSpan) topSpan.textContent = targetChar;
          if (botSpan) botSpan.textContent = targetChar;

          if (!silent) {
            try {
              if (this.audio && (!this.storage || this.storage.isSoundEnabled())) {
                this.audio.playClick();
              }
            } catch (_) {}
          }

          // When final letter finishes, clean up completely
          if (idx === cells.length - 1) {
            const timer3 = setTimeout(() => {
              this.resetTitle();
            }, 60);
            this.animTimers.push(timer3);
          }
        }, 140);
        this.animTimers.push(timer2);
      }, staggerDelay);

      this.animTimers.push(timer1);
    });
  }

  initButtons() {
    const btnContinue = document.getElementById('btnContinueCampaign');
    if (btnContinue) {
      btnContinue.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        const levelIndex = this.storage.getCurrentLevel();
        if (this.onStartGame) {
          this.onStartGame(levelIndex, { mode: 'campaign' });
        }
      });
    }

    const btnLevelSelect = document.getElementById('btnLevelSelect');
    if (btnLevelSelect) {
      btnLevelSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.audio) this.audio.playClick();
        if (this.onOpenLevelSelect) {
          this.onOpenLevelSelect();
        } else {
          this.modals.open('levelSelect', {
            onSelectLevel: (idx) => this.onStartGame(idx, { mode: 'campaign' })
          });
        }
      });
    }

    const campaignCard = document.getElementById('campaignCard');
    if (campaignCard) {
      campaignCard.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        if (this.onOpenLevelSelect) {
          this.onOpenLevelSelect();
        } else {
          this.modals.open('levelSelect', {
            onSelectLevel: (idx) => this.onStartGame(idx, { mode: 'campaign' })
          });
        }
      });
    }

    const openDailyCalendar = (e) => {
      if (e) e.stopPropagation();
      if (this.audio) this.audio.playClick();
      this.modals.open('dailyCalendar', {
        onStartDailyGame: (levelIndex, dailyOptions) => {
          if (this.onStartGame) {
            this.onStartGame(levelIndex, dailyOptions);
          }
        }
      });
    };

    if (this.btnPlayDaily) {
      this.btnPlayDaily.addEventListener('click', openDailyCalendar);
    }

    if (this.dailyCard) {
      this.dailyCard.addEventListener('click', openDailyCalendar);
    }

    const btnAchievements = document.getElementById('btnAchievements');
    if (btnAchievements) {
      btnAchievements.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.modals.open('achievements');
      });
    }

    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        if (this.onOpenSettings) {
          this.onOpenSettings();
        } else {
          this.modals.open('settings');
        }
      });
    }

    const btnShop = document.getElementById('btnShop');
    if (btnShop) {
      btnShop.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.modals.open('shop');
      });
    }

    const btnStats = document.getElementById('btnStats');
    if (btnStats) {
      btnStats.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.modals.open('stats');
      });
    }
  }

  updateDailyChallenge() {
    const dailyInfo = DailyChallengeService.getDailyLevelInfo();
    const isCompleted = this.storage ? this.storage.isDailyCompletedToday(dailyInfo.dateStr) : false;
    const dailyState = this.storage ? this.storage.getDailyState() : { currentStreak: 0 };
    const streak = dailyState.currentStreak || 0;

    if (this.dailyStreakText) {
      this.dailyStreakText.textContent = `${streak} ${streak === 1 ? 'DAY' : 'DAYS'}`;
    }

    if (this.dailyDateHeading) {
      const now = new Date();
      this.dailyDateHeading.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    }

    if (this.dailyCard) {
      this.dailyCard.classList.toggle('completed', isCompleted);
    }

    if (this.dailyBtnMainLabel) {
      this.dailyBtnMainLabel.textContent = isCompleted ? 'REPLAY TODAY' : 'PLAY DAILY';
    }
    if (this.dailyPlayIcon) {
      this.dailyPlayIcon.innerHTML = isCompleted ? Icons.replay(16) : Icons.calendar(16);
    }

    if (isCompleted) {
      if (this.dailyStatusSubtext) {
        this.dailyStatusSubtext.textContent = 'DECODED ✔';
        this.dailyStatusSubtext.classList.add('completed');
      }
    } else {
      if (this.dailyStatusSubtext) {
        this.dailyStatusSubtext.textContent = "TODAY'S PUZZLE";
        this.dailyStatusSubtext.classList.remove('completed');
      }
    }
  }

  updateProgress() {
    this.updateDailyChallenge();

    const currentIdx = this.storage.getCurrentLevel();
    const solvedCount = this.storage.getCompletedLevelsCount();
    const totalLevels = LEVEL_DATA.length;
    const currentLevel = LEVEL_DATA[currentIdx] || LEVEL_DATA[0];

    const category = currentLevel.category || 'Quotes';
    const catUpper = category.toUpperCase();
    const pct = Math.min(100, Math.round((solvedCount / totalLevels) * 100));

    if (this.levelTextEl) {
      this.levelTextEl.textContent = `${catUpper} ${currentLevel.num}`;
    }

    if (this.campaignProgressBadge) {
      this.campaignProgressBadge.textContent = `${solvedCount} / ${totalLevels}`;
    }

    if (this.progressFillEl) {
      this.progressFillEl.style.width = `${Math.max(3, pct)}%`;
    }
  }
}
