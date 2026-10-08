import { Icons } from './Icons.js';
import { LEVEL_DATA } from '../data/levels.js';

export class ModalManager {
  constructor({ storageService, audioService, onProgressReset }) {
    this.storage = storageService;
    this.audio = audioService;
    this.onProgressReset = onProgressReset;

    this.overlay = document.getElementById('modalOverlay');
    this.containerEl = this.overlay ? this.overlay.querySelector('.modal-container') : null;
    this.titleEl = document.getElementById('modalTitle');
    this.bodyEl = document.getElementById('modalBody');
    this.closeBtn = document.getElementById('modalCloseBtn');

    this.initEvents();
  }

  initEvents() {
    if (!this.overlay) return;

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        if (!this.isVictory()) {
          this.close();
        }
      });
    }

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        // In victory panel, require selecting an action button
        if (!this.isVictory()) {
          this.close();
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        if (!this.isVictory()) {
          this.close();
        }
      }
    });
  }

  isVictory() {
    return this.containerEl && this.containerEl.classList.contains('modal-victory');
  }

  isOpen() {
    return this.overlay && this.overlay.classList.contains('active');
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
    if (this.containerEl) {
      this.containerEl.classList.remove('modal-victory');
    }
  }

  open(type, options = {}) {
    if (!this.overlay || !this.bodyEl || !this.titleEl) return;

    switch (type) {
      case 'howToPlay':
        this.renderHowToPlay();
        break;
      case 'achievements':
        this.renderAchievements();
        break;
      case 'shop':
        this.renderShop();
        break;
      case 'stats':
        this.renderStats();
        break;
      case 'returnHome':
        this.renderReturnHome(options.onConfirm);
        break;
      case 'resetLevel':
        this.renderResetLevel(options.onConfirm);
        break;
      case 'levelComplete':
        this.renderLevelComplete(options);
        break;
      default:
        return;
    }

    this.overlay.classList.add('active');
  }

  renderHowToPlay() {
    this.titleEl.innerHTML = `${Icons.help(20)} <span>HOW TO PLAY</span>`;
    this.bodyEl.innerHTML = `
      <div class="guide-step">
        <div class="guide-step-title">1. THE SPLIT-FLAP CIPHER</div>
        <div class="guide-step-text">
          Each letter is formed by two half-flaps (top and bottom). Every unique cipher letter across the quote shares the exact same drum rotation!
        </div>
      </div>

      <div class="guide-step">
        <div class="guide-step-title">2. ERGONOMIC ROTATION</div>
        <div class="guide-step-text">
          Select any letter cell on the board. Use ${Icons.chevronUp(14)} to step forward (A to Z) or ${Icons.chevronDown(14)} to reverse (Z to A) until both halves snap into place.
        </div>
      </div>

      <div class="guide-step">
        <div class="guide-step-title">3. GIVEN CLUES</div>
        <div class="guide-step-text">
          Each level starts with locked green halves as starter clues. When you find the matching half, the tile locks and emits a melodic chime.
        </div>
      </div>

      <div class="guide-step">
        <div class="guide-step-title">4. DECODE THE QUOTE</div>
        <div class="guide-step-text">
          Decode all words and the author name to complete the level and advance to the next mechanical challenge!
        </div>
      </div>
    `;
  }

  renderAchievements() {
    this.titleEl.innerHTML = `${Icons.trophy(20)} <span>ACHIEVEMENTS</span>`;
    const stats = this.storage.getStats();
    const completedCount = this.storage ? this.storage.getCompletedLevelsCount() : 0;

    const list = [
      { name: 'First Decrypt', desc: 'Solve your first mechanical cryptogram', done: completedCount >= 1 },
      { name: 'Flap Apprentice', desc: 'Solve 5 campaign levels', done: completedCount >= 5 },
      { name: 'Aviation Chief', desc: 'Solve 25 campaign levels', done: completedCount >= 25 },
      { name: 'Master Cryptographer', desc: 'Solve 75 campaign levels', done: completedCount >= 75 },
      { name: 'Centurion of Flaps', desc: 'Complete 100 campaign levels', done: completedCount >= 100 },
      { name: 'Flap Grandmaster', desc: `Complete all ${LEVEL_DATA.length} campaign levels`, done: completedCount >= LEVEL_DATA.length },
      { name: 'Mechanical Veteran', desc: 'Rotate flaps over 500 times', done: (stats.flapsRotated || 0) >= 500 }
    ];

    this.bodyEl.innerHTML = list.map(item => `
      <div class="achievement-item">
        <div class="achievement-icon" style="${item.done ? 'color: #F59E0B;' : 'color: #5C7569;'}">
          ${item.done ? Icons.medal(22) : Icons.lock(18)}
        </div>
        <div class="achievement-info">
          <span class="achievement-name" style="${item.done ? 'color: #F59E0B;' : 'color: #7B9487;'}">${item.name}</span>
          <span class="achievement-desc">${item.desc}</span>
        </div>
      </div>
    `).join('');
  }

  renderShop() {
    this.titleEl.innerHTML = `${Icons.shop(20)} <span>SHOP & CUSTOMIZATION</span>`;
    this.bodyEl.innerHTML = `
      <div class="shop-item">
        <div class="setting-info">
          <span class="setting-title">Dark Pine Terminal</span>
          <span class="setting-desc">Classic airport split-flap styling</span>
        </div>
        <span class="shop-badge">EQUIPPED</span>
      </div>

      <div class="shop-item">
        <div class="setting-info">
          <span class="setting-title">Vintage Brass Solenoid</span>
          <span class="setting-desc">Warm amber brass flaps with click sounds</span>
        </div>
        <span class="campaign-tier-badge">COMING SOON</span>
      </div>

      <div class="shop-item">
        <div class="setting-info">
          <span class="setting-title">Cyber Neon Matrix</span>
          <span class="setting-desc">Vibrant cyan & magenta mechanical flaps</span>
        </div>
        <span class="campaign-tier-badge">COMING SOON</span>
      </div>
    `;
  }

  renderStats() {
    this.titleEl.innerHTML = `${Icons.stats(20)} <span>STATISTICS</span>`;
    const stats = this.storage.getStats();
    const daily = this.storage.getDailyState();
    const solvedCount = this.storage ? this.storage.getCompletedLevelsCount() : 0;
    const current = this.storage.getCurrentLevel() + 1;
    const totalLevels = LEVEL_DATA.length || 200;
    const pct = Math.min(100, Math.round((solvedCount / totalLevels) * 100));

    this.bodyEl.innerHTML = `
      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-value">${solvedCount}</span>
          <span class="stat-label">Campaign Solved</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">${current}</span>
          <span class="stat-label">Current Level</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">${pct}%</span>
          <span class="stat-label">Campaign Progress</span>
        </div>
        <div class="stat-box">
          <span class="stat-value" style="color: #F59E0B;">${daily.currentStreak || 0}</span>
          <span class="stat-label">Daily Streak</span>
        </div>
        <div class="stat-box">
          <span class="stat-value" style="color: #F59E0B;">${daily.maxStreak || 0}</span>
          <span class="stat-label">Best Streak</span>
        </div>
        <div class="stat-box">
          <span class="stat-value" style="color: #10B981;">${daily.totalCompleted || 0}</span>
          <span class="stat-label">Dailies Solved</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">${stats.flapsRotated || 0}</span>
          <span class="stat-label">Flap Rotations</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">${stats.hintsUsed || 0}</span>
          <span class="stat-label">Hints Used</span>
        </div>
      </div>
    `;
  }

  renderReturnHome(onConfirm) {
    this.titleEl.innerHTML = `${Icons.home(20)} <span>RETURN TO HOME</span>`;
    this.bodyEl.innerHTML = `
      <div style="text-align: center; padding: 8px 0;">
        <p style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: #F3EDE2; margin-bottom: 8px; letter-spacing: 0.02em;">
          Leave current puzzle?
        </p>
        <p style="font-family: var(--font-ui); font-size: 0.9rem; color: #7B9487; margin-bottom: 22px;">
          Your flap positions and progress are saved automatically.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="btnResumeGame" class="btn-primary-campaign" style="height: 48px;">
            <span class="btn-icon">${Icons.play(16)}</span>
            <span class="btn-main-label" style="font-size: 1.05rem;">RESUME PUZZLE</span>
          </button>
          <button id="btnConfirmHome" class="btn-secondary-home" style="height: 48px; background: #182620; border-color: #2D4438;">
            <span class="btn-icon">${Icons.home(18)}</span>
            <span class="btn-label" style="font-size: 0.95rem;">RETURN TO MAIN MENU</span>
          </button>
        </div>
      </div>
    `;

    const resumeBtn = document.getElementById('btnResumeGame');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    const homeBtn = document.getElementById('btnConfirmHome');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        this.close();
        if (onConfirm) {
          onConfirm();
        }
      });
    }
  }

  renderResetLevel(onConfirm) {
    this.titleEl.innerHTML = `${Icons.restart(20)} <span>RESET PUZZLE</span>`;
    this.bodyEl.innerHTML = `
      <div style="text-align: center; padding: 8px 0;">
        <p style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: #F3EDE2; margin-bottom: 8px; letter-spacing: 0.02em;">
          Reset this puzzle?
        </p>
        <p style="font-family: var(--font-ui); font-size: 0.9rem; color: #7B9487; margin-bottom: 22px;">
          All rotated flaps will be cleared back to starting clue state.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="btnConfirmResetLevel" class="btn-primary-campaign" style="height: 48px; background: linear-gradient(135deg, #d97706 0%, #b45309 100%);">
            <span class="btn-icon">${Icons.restart(18)}</span>
            <span class="btn-main-label" style="font-size: 1.05rem;">RESET ALL FLAPS</span>
          </button>
          <button id="btnCancelResetLevel" class="btn-secondary-home" style="height: 48px; background: #182620; border-color: #2D4438;">
            <span class="btn-label" style="font-size: 0.95rem;">CANCEL</span>
          </button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btnConfirmResetLevel');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.close();
        if (onConfirm) {
          onConfirm();
        }
      });
    }

    const cancelBtn = document.getElementById('btnCancelResetLevel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.close();
      });
    }
  }

  renderLevelComplete(options = {}) {
    const {
      level,
      levelIndex,
      nextLevelIndex,
      hasNextLevel,
      mode = 'campaign',
      hintsUsed = 0,
      elapsedSeconds = 0,
      totalLetters = 0,
      dailyStreak = 1,
      dailyDisplayDate = '',
      onNextLevel,
      onLevelSelect,
      onHome
    } = options;

    if (!level) return;

    if (this.containerEl) {
      this.containerEl.classList.add('modal-victory');
    }

    const isDaily = mode === 'daily';
    const category = level.category || 'Quotes';
    const catUpper = category.toUpperCase();
    const catTotal = LEVEL_DATA.filter(l => (l.category || 'Quotes') === category).length;
    const tierClean = (level.tier || 'Beginner').replace(/Tier \d+:\s*/i, '').toUpperCase();

    // Time formatting MM:SS
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    // Category progress count & percentage
    const catLevels = LEVEL_DATA.filter(l => (l.category || 'Quotes') === category);
    const catSolvedCount = catLevels.filter(l => this.storage && this.storage.isLevelCompleted(l.id - 1)).length;
    const catPct = Math.min(100, Math.round((catSolvedCount / catTotal) * 100));

    // Category badge text
    const badgeCategoryText = isDaily
      ? `${dailyDisplayDate || 'TODAY'} • ${catUpper}`
      : `${catUpper} ${level.num} OF ${catTotal}`;

    // Difficulty score for the circular arc
    const rawDiff = parseFloat(level.diff) || 1.0;
    const diffDisplay = rawDiff.toFixed(1);

    // Dynamic segment ticks generation (up to 30 visible ticks representing the category progress)
    const tickCount = 28;
    const activeTicks = Math.round((catSolvedCount / catTotal) * tickCount);
    const tickElements = Array.from({ length: tickCount }, (_, i) => {
      const isActive = i < activeTicks;
      return `<div class="mockup-progress-tick ${isActive ? 'active' : ''}"></div>`;
    }).join('');

    const authorText = (level.author || '').trim();
    const authorHtml = authorText ? `<div class="mockup-quote-author">— ${authorText}</div>` : '';

    // Hints display
    const hintsValHtml = hintsUsed === 0
      ? `<span class="mockup-stat-val text-gold">0 <span class="flawless-tag">★ FLAWLESS</span></span>`
      : `<span class="mockup-stat-val">${hintsUsed}</span>`;

    // Clear standard title container (trophy badge sits elevated on top of modal container)
    this.titleEl.innerHTML = '';

    this.bodyEl.innerHTML = `
      <div class="mockup-victory-panel">
        <!-- 1. Floating Golden Laurel Trophy Emblem -->
        <div class="mockup-trophy-anchor">
          <div class="mockup-trophy-disc">
            ${Icons.laurelTrophy(64)}
          </div>
        </div>

        <!-- 2. Header & Title -->
        <div class="mockup-victory-header">
          <h2 class="mockup-victory-title">LEVEL COMPLETED</h2>
          <div class="mockup-pills-row">
            <span class="mockup-pill mockup-pill-cat">${badgeCategoryText}</span>
            <span class="mockup-pill mockup-pill-tier">${tierClean}</span>
          </div>
        </div>

        <!-- 3. Decoded Quote Showcase Box -->
        <div class="mockup-quote-box">
          <div class="mockup-quote-mark" aria-hidden="true">“</div>
          <blockquote class="mockup-quote-text">${level.quote}</blockquote>
          ${authorHtml}
        </div>

        <!-- 4. Middle Dashboard: Performance Metrics -->
        <div class="mockup-middle-dashboard">
          <div class="mockup-stats-column">
            <!-- Row 1: Time -->
            <div class="mockup-stat-row">
              <div class="mockup-stat-left">
                <span class="mockup-stat-icon text-muted">${Icons.clock(17)}</span>
                <span class="mockup-stat-label">TIME</span>
              </div>
              <span class="mockup-stat-val">${timeStr}</span>
            </div>

            <!-- Row 2: Hints -->
            <div class="mockup-stat-row">
              <div class="mockup-stat-left">
                <span class="mockup-stat-icon text-amber">${Icons.bulbRays(18)}</span>
                <span class="mockup-stat-label">HINTS</span>
              </div>
              ${hintsValHtml}
            </div>

            <!-- Row 3: Letters Solved -->
            <div class="mockup-stat-row">
              <div class="mockup-stat-left">
                <span class="mockup-stat-icon text-emerald">${Icons.checkCircle(17)}</span>
                <span class="mockup-stat-label">LETTERS SOLVED</span>
              </div>
              <span class="mockup-stat-val">${totalLetters}</span>
            </div>
          </div>
        </div>

        <!-- 5. Category Progress & Segmented Bar -->
        <div class="mockup-progress-section">
          <div class="mockup-progress-header">
            <span class="mockup-prog-name">${catUpper} PROGRESS</span>
            <span class="mockup-prog-stats">${catSolvedCount} / ${catTotal} • ${catPct}%</span>
          </div>
          <div class="mockup-progress-ticks-track">
            ${tickElements}
          </div>
        </div>

        <!-- 6. Ergonomic 3-Button Action Dock -->
        <div class="mockup-action-dock">
          <!-- Left: Circular Level Select Button -->
          <button id="btnVictorySelect" class="mockup-btn-circle" title="Level Select" aria-label="Level Select">
            ${Icons.gridFourDots(20)}
          </button>

          <!-- Center: Primary Glowing Next Level Pill Button -->
          ${!isDaily ? `
            <button id="btnVictoryNext" class="mockup-btn-pill-primary">
              <span>${hasNextLevel ? 'NEXT LEVEL' : 'CAMPAIGN FINISHED'}</span>
              ${Icons.arrowRight(18)}
            </button>
          ` : `
            <button id="btnVictoryHome" class="mockup-btn-pill-primary">
              <span>RETURN TO MENU</span>
              ${Icons.arrowRight(18)}
            </button>
          `}

          <!-- Right: Circular Main Menu Button -->
          <button id="btnVictoryHomeAlt" class="mockup-btn-circle" title="Main Menu" aria-label="Main Menu">
            ${Icons.home(20)}
          </button>
        </div>
      </div>
    `;

    // Event Wireup
    const btnNext = document.getElementById('btnVictoryNext');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.close();
        if (this.audio) this.audio.playClick();
        if (hasNextLevel && onNextLevel) {
          onNextLevel(nextLevelIndex);
        } else if (!hasNextLevel && onLevelSelect) {
          onLevelSelect();
        }
      });
    }

    const btnSelect = document.getElementById('btnVictorySelect');
    if (btnSelect) {
      btnSelect.addEventListener('click', () => {
        this.close();
        if (this.audio) this.audio.playClick();
        if (onLevelSelect) onLevelSelect();
      });
    }

    const btnHome = document.getElementById('btnVictoryHome');
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        this.close();
        if (this.audio) this.audio.playClick();
        if (onHome) onHome();
      });
    }

    const btnHomeAlt = document.getElementById('btnVictoryHomeAlt');
    if (btnHomeAlt) {
      btnHomeAlt.addEventListener('click', () => {
        this.close();
        if (this.audio) this.audio.playClick();
        if (onHome) onHome();
      });
    }
  }
}

