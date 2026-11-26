import { LEVEL_DATA } from '../data/levels.js';
import { buildCipherMap } from './Cipher.js';
import { createRng } from '../utils/prng.js';
import { ANIMATION_CONFIG, AUDIO_CONFIG } from '../config/constants.js';
import { PlatformBridge } from '../platform/lifecycle.js';
import { DailyChallengeService } from './DailyChallengeService.js';
import { AdService } from './AdService.js';
import { OnboardingTour } from '../ui/OnboardingTour.js';
import { Toast } from '../ui/Toast.js';

export class Game {
  constructor({ gameState, audioService, renderer, uiController, storageService, modalManager, onReturnToHome, onRequestResetLevel, onRequestShop, onLevelCompleted }) {
    this.state = gameState;
    this.audio = audioService;
    this.renderer = renderer;
    this.ui = uiController;
    this.storage = storageService;
    this.modalManager = modalManager;
    this.onReturnToHome = onReturnToHome;
    this.onRequestResetLevel = onRequestResetLevel;
    this.onRequestShop = onRequestShop;
    this.onLevelCompleted = onLevelCompleted;
    this.gameMode = 'campaign';
    this.gameOptions = {};
    this.levelStartTime = Date.now();
    this.hintsUsedInLevel = 0;
    this.victoryTimer = null;
    this.tourTimer = null;
  }

  start(levelIndex = null, options = {}) {
    // 1. Auto-save active level under its EXISTING mode and options before switching
    if (this.state && this.state.currentLevel && this.state.groups && this.state.groups.length) {
      this.saveCurrentLevelState();
    }

    // 2. Set new mode and options
    this.gameMode = options.mode || 'campaign';
    this.gameOptions = options;
    const idx = levelIndex !== null 
      ? levelIndex 
      : (this.storage ? this.storage.getCurrentLevel() : 0);
    this.loadLevel(idx, { skipAutoSave: true });
  }

  saveCurrentLevelState() {
    if (!this.storage) return;
    const idx = this.state.levelIndex;
    if (idx === null || idx === undefined || !this.state.groups || !this.state.groups.length) return;

    const drumsToSave = {};
    for (const c of this.state.groups) {
      const d = this.state.drums[c];
      if (d) {
        drumsToSave[c] = {
          t: d.t,
          b: d.b,
          fx: { ...(d.fx || {}) }
        };
      }
    }

    const saveData = {
      levelIndex: idx,
      drums: drumsToSave,
      hintsRemaining: this.state.hintsRemaining,
      isWon: this.state.isWon,
      selectedGroup: this.state.selectedGroup,
      selectedCellIndex: this.renderer ? this.renderer.activeCellIndex : 0,
      updatedAt: Date.now()
    };

    if (this.gameMode === 'daily') {
      const dateStr = this.gameOptions?.dateStr || DailyChallengeService.getDateStr();
      if (dateStr) {
        this.storage.saveDailyProgress(dateStr, saveData);
      }
    } else if (this.gameMode === 'campaign') {
      this.storage.saveLevelProgress(idx, saveData);
    }
  }

  loadLevel(index, { skipAutoSave = false } = {}) {
    const level = LEVEL_DATA[index];
    if (this.tourTimer) {
      clearTimeout(this.tourTimer);
      this.tourTimer = null;
    }
    OnboardingTour.dismiss();
    if (this.victoryTimer) {
      clearTimeout(this.victoryTimer);
      this.victoryTimer = null;
    }
    if (this.ui) {
      this.ui.setControlsLocked(false);
    }
    this.levelStartTime = Date.now();
    this.hintsUsedInLevel = 0;

    // Save previous level progress if switching
    if (!skipAutoSave && this.state && this.state.currentLevel && this.state.groups && this.state.groups.length) {
      this.saveCurrentLevelState();
    }

    if (this.storage && this.gameMode === 'campaign') {
      this.storage.setCurrentLevel(index);
    }

    const cipherMap = buildCipherMap(index + 1);
    this.state.initLevel(index, level, cipherMap);

    this.renderer.buildBoard(
      level,
      cipherMap,
      (cipherChar, cellIndex) => this.handleCellSelect(cipherChar, cellIndex, false),
      (cipherChar, solChar) => this.state.registerCipherChar(cipherChar, solChar)
    );

    // Check for saved midway progress strictly matching the active mode
    let saved = null;
    if (this.storage) {
      if (this.gameMode === 'daily') {
        const dateStr = this.gameOptions?.dateStr || DailyChallengeService.getDateStr();
        saved = this.storage.getDailyProgress(dateStr);
        // Guard against mismatched level index or corrupt cross-mode saves
        if (saved && saved.levelIndex !== undefined && saved.levelIndex !== index) {
          saved = null;
        }
      } else {
        saved = this.storage.getLevelProgress(index);
        if (saved && saved.levelIndex !== undefined && saved.levelIndex !== index) {
          saved = null;
        }
      }
    }

    // Integrity check: verify saved drums match this puzzle's groups
    if (saved && saved.drums) {
      const hasMismatch = this.state.groups.some(c => !saved.drums[c]);
      if (hasMismatch) {
        saved = null;
      }
    }

    if (saved && saved.drums && Object.keys(saved.drums).length > 0) {
      // Restore saved drum positions and fixed halves
      this.state.groups.forEach(c => {
        const sd = saved.drums[c];
        if (sd) {
          this.state.drums[c].t = sd.t || " ";
          this.state.drums[c].b = sd.b || " ";
          this.state.drums[c].fx = { ...(sd.fx || {}) };

          if (sd.fx?.t) {
            this.renderer.fixHalfVisual(c, 't', this.state.drums[c].sol);
          } else if (sd.t && sd.t !== " ") {
            this.renderer.setHalfVisual(c, 't', sd.t);
          }

          if (sd.fx?.b) {
            this.renderer.fixHalfVisual(c, 'b', this.state.drums[c].sol);
          } else if (sd.b && sd.b !== " ") {
            this.renderer.setHalfVisual(c, 'b', sd.b);
          }
        }
      });

      this.state.hintsRemaining = this.storage ? this.storage.getHintBalance() : 5;
      if (saved.isWon !== undefined) {
        this.state.isWon = saved.isWon;
        if (this.state.isWon) {
          this.renderer.setVictory(true);
        }
      }
    } else {
      // Fresh level: Distribute Given Fixed Clue Halves
      // 1. Guarantee up to 3 unique clues in Author's Name (if author present)
      const authorText = (level.author || "").trim();
      const authorUniqueChars = authorText ? Array.from(
        new Set(authorText.toUpperCase().replace(/[^A-Z]/g, ''))
      ).map(c => cipherMap[c]) : [];

      const quoteUniqueChars = Array.from(
        new Set(level.quote.toUpperCase().replace(/[^A-Z]/g, ''))
      ).map(c => cipherMap[c]);

      const rng = createRng(index * 31 + 7);
      const shuffledAuthor = authorUniqueChars.slice();
      for (let i = shuffledAuthor.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffledAuthor[i], shuffledAuthor[j]] = [shuffledAuthor[j], shuffledAuthor[i]];
      }

      const authorClues = shuffledAuthor.slice(0, Math.min(3, shuffledAuthor.length));

      // 2. Fill remaining clues from quote characters not already given
      const effectiveGiven = Math.max(3, level.given || 3);
      const remainingNeeded = Math.max(0, effectiveGiven - authorClues.length);

      const remainingQuoteChars = quoteUniqueChars.filter(c => !authorClues.includes(c));
      for (let i = remainingQuoteChars.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [remainingQuoteChars[i], remainingQuoteChars[j]] = [remainingQuoteChars[j], remainingQuoteChars[i]];
      }
      const additionalQuoteClues = remainingQuoteChars.slice(0, remainingNeeded);

      const finalClues = [...authorClues, ...additionalQuoteClues];

      finalClues.forEach((c, idx) => {
        const whichHalf = idx % 2 === 0 ? "t" : "b";
        this.state.fixHalf(c, whichHalf);
        this.renderer.fixHalfVisual(c, whichHalf, this.state.drums[c].sol);
      });
    }

    // Always ensure an appropriate flap cell is selected when loading any level
    if (this.state.groups.length > 0) {
      const initialGroup = (saved && saved.selectedGroup && this.state.groups.includes(saved.selectedGroup))
        ? saved.selectedGroup
        : this.state.groups[0];
      const initialCellIdx = (saved && typeof saved.selectedCellIndex === 'number' && saved.selectedCellIndex >= 0)
        ? saved.selectedCellIndex
        : 0;
      this.handleCellSelect(initialGroup, initialCellIdx, false);
    }

    const isSpecial = level.category && level.category !== 'Quotes';
    const catLabel = isSpecial ? `${level.category.toUpperCase()} ${level.num}` : `LEVEL ${level.num}`;
    const customTitle = this.gameMode === 'daily'
      ? `DAILY • ${this.gameOptions.displayDate || 'TODAY'}`
      : catLabel;
    this.ui.updateLevelInfo(index, LEVEL_DATA.length, level.diff, level.tier, this.gameMode, customTitle, level.category);
    this.ui.updateHintButton(this.storage ? this.storage.getHintBalance() : 5);
    this.ui.updateSoundButton(this.audio.isSoundEnabled());

    this.refreshBoardAndUI({ suppressLockTones: true });

    const statusLabel = this.gameMode === 'daily' ? 'Daily Challenge' : catLabel;
    if (this.state.isWon) {
      const authorText = (level.author || "").trim();
      const authorSpan = authorText ? ` <span class="status-author">— ${authorText}</span>` : '';
      this.ui.setStatus(`🎉 ${statusLabel} Decoded!${authorSpan}`);
    } else if (saved) {
      this.ui.setStatus(`Resumed ${statusLabel} progress.`);
    } else {
      this.ui.setStatus("Tap a letter cell to rotate flaps.");
    }

    if (this.gameMode === 'campaign' && index === 0) {
      this.tourTimer = setTimeout(() => {
        if (this.gameMode === 'campaign' && this.state.levelIndex === 0) {
          const playStage = document.getElementById('playStage');
          if (playStage) {
            playStage.scrollTop = 0;
          }

          const letterCells = document.querySelectorAll('.quote-area .cell:not(.punct)');
          const secondCell = letterCells.length > 1 ? letterCells[1] : letterCells[0];
          if (secondCell && secondCell.dataset.c) {
            const cipherChar = secondCell.dataset.c;
            const cellIdx = parseInt(secondCell.dataset.idx, 10);
            const wasWon = this.state.isWon;
            if (wasWon) this.state.isWon = false;
            this.handleCellSelect(cipherChar, Number.isNaN(cellIdx) ? 1 : cellIdx, false);
            if (wasWon) this.state.isWon = true;
          } else if (this.state.groups && this.state.groups.length > 1) {
            const secondGroup = this.state.groups[1];
            const wasWon = this.state.isWon;
            if (wasWon) this.state.isWon = false;
            this.handleCellSelect(secondGroup, 1, false);
            if (wasWon) this.state.isWon = true;
          }

          OnboardingTour.start({ audioService: this.audio });
        }
      }, 350);
    }
  }

  handleCellSelect(cipherChar, cellIndex = -1, shouldScroll = true) {
    if (this.state.isWon) return;
    // Safety auto-repair: if drum was marked fixed in memory but cell was never visually fixed by hint, unfix flags
    const d = this.state.drums[cipherChar];
    if (d && d.fx?.t && d.fx?.b) {
      const renderedCells = this.renderer.cellsByCipherChar ? this.renderer.cellsByCipherChar[cipherChar] : null;
      if (renderedCells && renderedCells.length > 0 && !renderedCells[0].classList.contains("has-fixed")) {
        delete d.fx.t;
        delete d.fx.b;
      }
    }

    this.state.selectGroup(cipherChar);

    if (typeof cellIndex === 'number' && cellIndex >= 0) {
      this.renderer.setActiveCell(cellIndex);
    } else {
      const cells = this.renderer.letterCells;
      const currentActive = cells[this.renderer.activeCellIndex];
      if (!currentActive || currentActive.dataset.c !== cipherChar) {
        const matchingIdx = cells.findIndex(cell => cell.dataset.c === cipherChar);
        if (matchingIdx !== -1) {
          this.renderer.setActiveCell(matchingIdx);
        }
      }
    }

    this.renderer.updateBoardState(this.state.groups, this.state);
    if (shouldScroll) {
      this.renderer.scrollToCellIndex(this.renderer.activeCellIndex);
    }
  }

  handleStep(whichHalf, dir) {
    if (this.state.isWon) return;
    const activeChar = this.state.selectedGroup;
    if (activeChar) {
      const d = this.state.drums[activeChar];
      if (d && d.fx?.t && d.fx?.b) {
        const renderedCells = this.renderer.cellsByCipherChar ? this.renderer.cellsByCipherChar[activeChar] : null;
        if (renderedCells && renderedCells.length > 0 && !renderedCells[0].classList.contains("has-fixed")) {
          delete d.fx.t;
          delete d.fx.b;
        }
      }
    }

    const payload = this.state.getStepPayload(whichHalf, dir);
    if (!payload) return;

    if (payload.isFixed) {
      this.ui.setStatus("🔒 Fixed clue.");
      return;
    }

    if (payload.isLinked) {
      const { cipherChar, updateTop, updateBot, targetChar } = payload;
      let animated = false;

      if (updateTop) {
        this.state.setDrum(cipherChar, 't', targetChar);
        this.renderer.animateDrumHalf(cipherChar, 't', targetChar, 0, () => this.audio.playClick());
        animated = true;
      }
      if (updateBot) {
        this.state.setDrum(cipherChar, 'b', targetChar);
        const delay = updateTop ? ANIMATION_CONFIG.SET_BOTH_DELAY_MS : 0;
        this.renderer.animateDrumHalf(cipherChar, 'b', targetChar, delay, () => this.audio.playClick());
        animated = true;
      }

      if (animated) {
        if (this.storage) this.storage.recordFlapRotation();
        PlatformBridge.vibrateLight();
        setTimeout(() => {
          this.refreshBoardAndUI({ changedCipherChar: cipherChar });
          this.saveCurrentLevelState();
        }, 180);
      }
      return;
    }

    const { cipherChar, targetChar } = payload;
    if (this.state.setDrum(cipherChar, whichHalf, targetChar)) {
      if (this.storage) this.storage.recordFlapRotation();
      PlatformBridge.vibrateLight();
      this.renderer.animateDrumHalf(cipherChar, whichHalf, targetChar, 0, () => this.audio.playClick());
      setTimeout(() => {
        this.refreshBoardAndUI({ changedCipherChar: cipherChar });
        this.saveCurrentLevelState();
      }, 180);
    }
  }

  handleTypeLetter(char) {
    if (this.state.isWon) return;
    const payload = this.state.getSetBothPayload(char);
    if (!payload) return;

    const { cipherChar, updateTop, updateBot, targetChar } = payload;
    let animated = false;

    if (updateTop) {
      this.state.setDrum(cipherChar, 't', targetChar);
      this.renderer.animateDrumHalf(cipherChar, 't', targetChar, 0, () => this.audio.playClick());
      animated = true;
    }

    if (updateBot) {
      this.state.setDrum(cipherChar, 'b', targetChar);
      const delay = updateTop ? ANIMATION_CONFIG.SET_BOTH_DELAY_MS : 0;
      this.renderer.animateDrumHalf(cipherChar, 'b', targetChar, delay, () => this.audio.playClick());
      animated = true;
    }

    if (animated) {
      if (this.storage) this.storage.recordFlapRotation();
      PlatformBridge.vibrateLight();
      setTimeout(() => {
        this.refreshBoardAndUI({ changedCipherChar: cipherChar });
        this.saveCurrentLevelState();
      }, 180);
    }
  }

  handleClear() {
    if (this.state.isWon) return;
    this.handleTypeLetter(" ");
  }

  handleHint() {
    if (this.state.isWon) return;
    if (this.audio) this.audio.playClick();
    // If no group is selected or currently selected letter is already solved, auto-select next unsolved letter cell
    if (!this.state.selectedGroup || this.state.isLetterCorrect(this.state.selectedGroup)) {
      const cells = this.renderer.letterCells;
      if (cells && cells.length > 0) {
        let foundCell = null;
        for (let step = 0; step < cells.length; step++) {
          const idx = (this.renderer.activeCellIndex + step) % cells.length;
          const c = cells[idx].dataset.c;
          if (!this.state.isLetterCorrect(c)) {
            foundCell = cells[idx];
            break;
          }
        }
        if (foundCell) {
          this.handleCellSelect(foundCell.dataset.c, parseInt(foundCell.dataset.idx, 10), true);
        } else {
          this.ui.setStatus("🎉 All letters already solved!");
          return;
        }
      }
    }

    if (!this.state.selectedGroup) return;

    // Safety auto-repair: if drum was marked fixed in memory but cell was never visually fixed, unfix flags
    const activeChar = this.state.selectedGroup;
    const activeDrum = this.state.drums[activeChar];
    if (activeDrum && activeDrum.fx?.t && activeDrum.fx?.b) {
      const renderedCells = this.renderer.cellsByCipherChar ? this.renderer.cellsByCipherChar[activeChar] : null;
      if (renderedCells && renderedCells.length > 0 && !renderedCells[0].classList.contains("has-fixed")) {
        delete activeDrum.fx.t;
        delete activeDrum.fx.b;
      }
    }

    if (!this.state.canHintGroup(this.state.selectedGroup)) {
      this.ui.setStatus("🔒 Letter already solved.");
      return;
    }

    if (this.storage) {
      const balance = this.storage.getHintBalance();
      if (balance <= 0) {
        PlatformBridge.vibrateLight();
        if (this.modalManager) {
          this.modalManager.open('hintPrompt', {
            onWatchAd: () => {
              AdService.showRewarded();
            },
            onTacticalRefill: () => {
              if (!this.storage?.claimTacticalRefill) return;
              const res = this.storage.claimTacticalRefill();
              if (res.success) {
                this.ui.updateHintButton(res.balance);
                if (this.audio) this.audio.playVictoryFanfare();
                this.ui.setStatus('⚡ Tactical Refill claimed! (+1 Hint)');
              }
            },
            onOpenShop: () => {
              if (this.onRequestShop) {
                this.onRequestShop();
              }
            }
          });
        } else {
          this.ui.setStatus("💡 No hints left! Open Shop to claim 1 free daily hint or get more.");
          if (this.onRequestShop) {
            this.onRequestShop();
          }
        }
        return;
      }
      this.storage.consumeHint();
    }

    const hint = this.state.getHintPayload();
    if (!hint || hint.alreadyFixed) return;

    this.hintsUsedInLevel = (this.hintsUsedInLevel || 0) + 1;

    const { cipherChar } = hint;
    const sol = this.state.drums[cipherChar].sol;
    this.renderer.fixHalfVisual(cipherChar, 't', sol);
    this.renderer.fixHalfVisual(cipherChar, 'b', sol);
    const remainingBalance = this.storage ? this.storage.getHintBalance() : 0;
    this.ui.updateHintButton(remainingBalance);
    this.refreshBoardAndUI({ changedCipherChar: cipherChar });
    this.saveCurrentLevelState();
    this.ui.setStatus(`💡 Letter '${sol}' fully revealed.`);
    PlatformBridge.vibrateLight();
  }

  refreshHintButton() {
    if (this.ui && this.storage) {
      this.ui.updateHintButton(this.storage.getHintBalance());
    }
  }

  handleToggleLinked() {
    // Both flaps always rotate together
  }

  handleToggleSound() {
    const enabled = this.audio.toggleSound();
    if (this.storage) {
      this.storage.setSoundEnabled(enabled);
    }
    this.ui.updateSoundButton(enabled);
  }

  handleReturnToHome() {
    if (this.audio) this.audio.playClick();
    this.saveCurrentLevelState();
    if (this.onReturnToHome) {
      this.onReturnToHome();
    }
  }

  handleRequestResetLevel() {
    if (this.state.isWon) return;
    if (this.audio) this.audio.playClick();
    if (this.onRequestResetLevel) {
      this.onRequestResetLevel();
    } else {
      this.handleResetLevel();
    }
  }

  handleResetLevel() {
    const idx = this.state.levelIndex;
    if (idx === null || idx === undefined) return;

    if (this.storage) {
      if (this.gameMode === 'daily') {
        const dateStr = this.gameOptions?.dateStr;
        if (dateStr) {
          this.storage.clearDailyProgress(dateStr);
        }
      } else {
        this.storage.clearLevelProgress(idx);
      }
    }

    this.loadLevel(idx, { skipAutoSave: true });
    this.saveCurrentLevelState();

    if (this.audio) this.audio.playClick();
    PlatformBridge.vibrateLight();
    this.ui.setStatus("Puzzle reset to initial state.");
  }

  handlePrevLevel() {
    this.saveCurrentLevelState();
    if (this.state.levelIndex > 0) {
      this.loadLevel(this.state.levelIndex - 1);
    }
  }

  handleNextLevel() {
    this.saveCurrentLevelState();
    if (this.state.levelIndex < LEVEL_DATA.length - 1) {
      this.loadLevel(this.state.levelIndex + 1);
    }
  }

  handleMoveSelection(delta) {
    if (this.state.isWon) return;
    const cells = this.renderer.letterCells;
    if (!cells || cells.length === 0) return;
    const totalCells = cells.length;
    let currIdx = this.renderer.activeCellIndex;
    if (currIdx < 0 || currIdx >= totalCells) currIdx = 0;
    const nextIdx = (currIdx + delta + totalCells) % totalCells;
    const nextCipher = cells[nextIdx].dataset.c;
    this.handleCellSelect(nextCipher, nextIdx, true);
  }

  handleNavigateUnsolved(delta) {
    if (this.state.isWon) return;
    if (this.audio) this.audio.playClick();
    const cells = this.renderer.letterCells;
    if (!cells || cells.length === 0) return;

    const totalCells = cells.length;
    let currIdx = this.renderer.activeCellIndex;
    if (currIdx < 0 || currIdx >= totalCells) {
      currIdx = 0;
    }

    // 1. Search for next/prev unsolved cell in linear reading order across the board
    let targetIndex = -1;
    for (let step = 1; step < totalCells; step++) {
      const candidateIdx = (currIdx + delta * step + totalCells * 100) % totalCells;
      const candidateCipher = cells[candidateIdx].dataset.c;
      if (!this.state.isLetterCorrect(candidateCipher)) {
        targetIndex = candidateIdx;
        break;
      }
    }

    // 2. Fallback: If all cells are solved, advance sequentially
    if (targetIndex === -1) {
      targetIndex = (currIdx + delta + totalCells * 100) % totalCells;
    }

    const targetCipher = cells[targetIndex].dataset.c;
    this.handleCellSelect(targetCipher, targetIndex, true);
    PlatformBridge.vibrateLight();
  }

  handleNavigateEmpty(delta) {
    this.handleNavigateUnsolved(delta);
  }

  refreshBoardAndUI({ suppressLockTones = false, changedCipherChar = null } = {}) {
    const groups = this.state.groups;
    const letterUsage = this.state.getLetterUsage();

    // Trigger audio notes for correct / incorrect letter landing
    if (!suppressLockTones && this.audio) {
      const targetChar = changedCipherChar || (groups ? groups.find(c => {
        const prev = this.previousDrumLetters ? this.previousDrumLetters[c] : null;
        const curr = this.state.drums[c] ? this.state.drums[c].t : null;
        return prev !== null && prev !== undefined && prev !== curr;
      }) : null);

      if (targetChar) {
        const agreed = this.state.isAgreed(targetChar);
        const drum = this.state.drums[targetChar];
        const letter = drum ? drum.t : null;
        if (agreed && letter && letter !== " ") {
          const isCorrect = this.state.isLetterCorrect(targetChar);
          if (isCorrect) {
            this.audio.playCorrectNote();
          } else {
            this.audio.playIncorrectNote();
          }
        }
      }
    }

    // Maintain snapshot of drum letters for delta detection
    if (!this.previousDrumLetters) this.previousDrumLetters = {};
    if (groups) {
      groups.forEach(c => {
        this.previousDrumLetters[c] = this.state.drums[c] ? this.state.drums[c].t : " ";
      });
    }

    this.renderer.updateBoardState(groups, this.state);

    const solvedCount = this.state.getSolvedLettersCount();
    const totalCount = this.state.getTotalLettersCount();
    this.ui.updateLetterProgress(solvedCount, totalCount);

    const wordsProg = this.state.getWordsProgress();
    this.ui.updateProgressChips({
      solvedWords: wordsProg.solvedWords,
      totalWords: wordsProg.totalWords,
      solvedLetters: solvedCount,
      totalLetters: totalCount
    });

    const isSolved = this.state.isLevelSolved();

    if (isSolved && !this.state.isWon) {
      this.state.isWon = true;
      this.renderer.setVictory(true);
      if (this.ui) this.ui.setControlsLocked(true);
      const author = this.state.currentLevel.author;

      const authorText = (author || "").trim();
      const authorSpan = authorText ? ` <span class="status-author">— ${authorText}</span>` : '';

      let dailyStreak = 0;
      const nextLevelIndex = this.state.levelIndex + 1;
      const hasNextLevel = this.gameMode !== 'daily' && nextLevelIndex < LEVEL_DATA.length;

      if (this.gameMode === 'daily') {
        const todayRealDateStr = DailyChallengeService.getDateStr();
        const puzzleDateStr = this.gameOptions.dateStr || todayRealDateStr;
        const isTodayPuzzle = (puzzleDateStr === todayRealDateStr);
        const yesterdayDateStr = DailyChallengeService.getYesterdayDateStr();

        const dailyState = this.storage ? this.storage.completeDailyChallenge(puzzleDateStr, yesterdayDateStr) : { currentStreak: 1 };
        dailyStreak = dailyState ? dailyState.currentStreak : 1;

        if (dailyState && dailyState.shieldAwarded) {
          setTimeout(() => {
            Toast.show(`🛡️ ${dailyState.milestoneReached}-Day Streak! Streak Shield earned.`, {
              type: 'success',
              duration: 4000
            });
          }, 1200);
        } else if (dailyState && dailyState.shieldUsed) {
          setTimeout(() => {
            Toast.show(`🛡️ Streak Shield saved your streak!`, {
              type: 'info',
              duration: 3500
            });
          }, 1200);
        }

        if (isTodayPuzzle) {
          this.ui.setStatus(`🎉 Daily Dispatch Decoded! Streak: ${dailyStreak} ${dailyStreak === 1 ? 'day' : 'days'}${authorSpan}`);
        } else {
          this.ui.setStatus(`🎉 Archive Puzzle Decoded!${authorSpan}`);
        }
        this.saveCurrentLevelState();
      } else {
        if (this.storage) {
          this.storage.completeLevel(this.state.levelIndex);
          if (this.storage.getCurrentLevel() === this.state.levelIndex && hasNextLevel) {
            this.storage.setCurrentLevel(nextLevelIndex);
          }
          this.saveCurrentLevelState();
        }
        const winTitle = authorText ? '🎉 Message & Author decoded!' : '🎉 Message decoded!';
        const nextBtnHtml = hasNextLevel ? ` <button id="statusNextBtn" class="status-next-btn">NEXT LEVEL →</button>` : '';
        this.ui.setStatus(`${winTitle}${authorSpan}${nextBtnHtml}`);
        const statusNextBtn = document.getElementById('statusNextBtn');
        if (statusNextBtn) {
          statusNextBtn.onclick = () => {
            if (this.audio) this.audio.playClick();
            const proceed = () => {
              this.start(nextLevelIndex, { mode: 'campaign' });
            };
            if (AdService.shouldShowInterstitial()) {
              AdService.showInterstitial({ onComplete: proceed });
            } else {
              proceed();
            }
          };
        }
      }

      PlatformBridge.vibrateSuccess();
      this.audio.playVictoryFanfare();

      const elapsedSeconds = Math.max(1, Math.floor((Date.now() - (this.levelStartTime || Date.now())) / 1000));
      if (this.storage && this.state.currentLevel) {
        this.storage.recordLevelVictory({
          quote: this.state.currentLevel.quote || '',
          elapsedSeconds,
          hintsUsedThisLevel: this.hintsUsedInLevel || 0
        });
      }

      if (this.onLevelCompleted) {
        const completionData = {
          level: this.state.currentLevel,
          levelIndex: this.state.levelIndex,
          nextLevelIndex,
          hasNextLevel,
          mode: this.gameMode,
          hintsUsed: this.hintsUsedInLevel || 0,
          elapsedSeconds,
          totalLetters: totalCount,
          solvedLetters: solvedCount,
          dailyStreak,
          dailyDisplayDate: this.gameOptions.displayDate || '',
          dailyDateStr: this.gameOptions.dateStr || DailyChallengeService.getDateStr()
        };

        if (this.victoryTimer) clearTimeout(this.victoryTimer);

        const openVictoryModal = () => {
          if (this.victoryTimer) {
            clearTimeout(this.victoryTimer);
            this.victoryTimer = null;
          }
          window.removeEventListener('pointerdown', openVictoryModal, true);
          window.removeEventListener('keydown', openVictoryModal, true);
          if (this.state.isWon && this.onLevelCompleted) {
            this.onLevelCompleted(completionData);
          }
        };

        // If the player taps the screen or presses a key during celebration, immediately show victory modal
        window.addEventListener('pointerdown', openVictoryModal, true);
        window.addEventListener('keydown', openVictoryModal, true);

        this.victoryTimer = setTimeout(() => {
          openVictoryModal();
        }, 300);
      }
    } else if (!isSolved && this.state.isWon) {
      this.state.isWon = false;
      this.renderer.setVictory(false);
      if (this.ui) this.ui.setControlsLocked(false);
      if (this.victoryTimer) {
        clearTimeout(this.victoryTimer);
        this.victoryTimer = null;
      }
    }

    if (!this.state.isWon) {
      const numAgreed = groups.filter(c => this.state.isAgreed(c)).length;
      const hasClash = Object.values(letterUsage).some(list => list.length > 1);
      if (hasClash) {
        this.ui.setStatus("⚠️ Conflict: duplicate decoded letter");
      } else {
        this.ui.setStatus(`${solvedCount} of ${totalCount} decoded (${numAgreed} matching)`);
      }
    }
  }
}
