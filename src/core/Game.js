import { LEVEL_DATA } from '../data/levels.js';
import { buildCipherMap } from './Cipher.js';
import { createRng } from '../utils/prng.js';
import { ANIMATION_CONFIG, AUDIO_CONFIG } from '../config/constants.js';
import { PlatformBridge } from '../platform/lifecycle.js';

export class Game {
  constructor({ gameState, audioService, renderer, uiController }) {
    this.state = gameState;
    this.audio = audioService;
    this.renderer = renderer;
    this.ui = uiController;
  }

  start() {
    this.loadLevel(0);
  }

  loadLevel(index) {
    const level = LEVEL_DATA[index];
    if (!level) return;

    const cipherMap = buildCipherMap(index + 1);
    this.state.initLevel(index, level, cipherMap);

    this.renderer.buildBoard(
      level,
      cipherMap,
      (cipherChar) => this.handleCellSelect(cipherChar),
      (cipherChar, solChar) => this.state.registerCipherChar(cipherChar, solChar)
    );

    // Distribute Given Fixed Clue Halves
    const rng = createRng(index * 31 + 7);
    const shuffledGroups = this.state.groups.slice();
    for (let i = shuffledGroups.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledGroups[i], shuffledGroups[j]] = [shuffledGroups[j], shuffledGroups[i]];
    }

    shuffledGroups.slice(0, Math.min(level.given, shuffledGroups.length)).forEach((c, idx) => {
      const whichHalf = idx % 2 === 0 ? "t" : "b";
      this.state.fixHalf(c, whichHalf);
      this.renderer.fixHalfVisual(c, whichHalf, this.state.drums[c].sol);
    });

    this.state.selectedGroup = this.state.groups[0];

    this.ui.updateLevelInfo(index, LEVEL_DATA.length, level.diff, level.tier);
    this.ui.updateHintButton(this.state.hintsRemaining);
    this.ui.updateSoundButton(this.audio.isSoundEnabled());

    this.refreshBoardAndUI();
    this.ui.setStatus("Tap a letter cell to rotate flaps.");
  }

  handleCellSelect(cipherChar, shouldScroll = true) {
    this.state.selectGroup(cipherChar);
    this.renderer.updateBoardState(this.state.groups, this.state);
    if (shouldScroll) {
      this.renderer.scrollToCell(cipherChar);
    }
  }

  handleStep(whichHalf, dir) {
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
        PlatformBridge.vibrateLight();
        setTimeout(() => this.refreshBoardAndUI(), 180);
      }
      return;
    }

    const { cipherChar, targetChar } = payload;
    if (this.state.setDrum(cipherChar, whichHalf, targetChar)) {
      PlatformBridge.vibrateLight();
      this.renderer.animateDrumHalf(cipherChar, whichHalf, targetChar, 0, () => this.audio.playClick());
      setTimeout(() => this.refreshBoardAndUI(), 180);
    }
  }

  handleTypeLetter(char) {
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
      PlatformBridge.vibrateLight();
      setTimeout(() => this.refreshBoardAndUI(), 180);
    }
  }

  handleClear() {
    this.handleTypeLetter(" ");
  }

  handleHint() {
    const hint = this.state.getHintPayload();
    if (!hint) return;

    if (hint.alreadyFixed) {
      this.ui.setStatus("🔒 Letter already solved.");
      return;
    }

    const { cipherChar, hintsRemaining } = hint;
    const sol = this.state.drums[cipherChar].sol;
    this.renderer.fixHalfVisual(cipherChar, 't', sol);
    this.renderer.fixHalfVisual(cipherChar, 'b', sol);
    this.ui.updateHintButton(hintsRemaining);
    this.refreshBoardAndUI();
    this.ui.setStatus(`💡 Letter '${sol}' fully revealed.`);
    PlatformBridge.vibrateLight();
  }

  handleToggleLinked() {
    // Both flaps always rotate together
  }

  handleToggleSound() {
    const enabled = this.audio.toggleSound();
    this.ui.updateSoundButton(enabled);
  }

  handlePrevLevel() {
    if (this.state.levelIndex > 0) {
      this.loadLevel(this.state.levelIndex - 1);
    }
  }

  handleNextLevel() {
    if (this.state.levelIndex < LEVEL_DATA.length - 1) {
      this.loadLevel(this.state.levelIndex + 1);
    }
  }

  handleMoveSelection(delta) {
    const groups = this.state.groups;
    if (!groups.length) return;
    const currIdx = groups.indexOf(this.state.selectedGroup);
    const nextIdx = (currIdx + delta + groups.length) % groups.length;
    this.handleCellSelect(groups[nextIdx]);
  }

  handleNavigateUnsolved(delta) {
    if (!this.state.groups.length) return;
    const nextGroup = this.state.getNextEmptyGroup(this.state.selectedGroup, delta);
    if (nextGroup) {
      this.handleCellSelect(nextGroup, true);
      PlatformBridge.vibrateLight();
      this.audio.playClick();
    }
  }

  handleNavigateEmpty(delta) {
    this.handleNavigateUnsolved(delta);
  }

  refreshBoardAndUI() {
    const groups = this.state.groups;
    const letterUsage = this.state.getLetterUsage();

    // Trigger lock sound for newly agreed letters
    groups.forEach(c => {
      const agreed = this.state.isAgreed(c);
      const letter = this.state.drums[c] ? this.state.drums[c].t : null;
      const clash = agreed && letter && letterUsage[letter] && letterUsage[letter].length > 1;

      if (agreed && !this.state.lockedPreviously[c] && !clash) {
        const toneFreq = AUDIO_CONFIG.TONE_BASE_FREQ + groups.indexOf(c) * AUDIO_CONFIG.TONE_STEP_FREQ;
        this.audio.playTone(toneFreq, 0);
      }
      this.state.lockedPreviously[c] = agreed && !clash;
    });

    this.renderer.updateBoardState(groups, this.state);

    const solvedCount = this.state.getSolvedLettersCount();
    const totalCount = this.state.getTotalLettersCount();
    this.ui.updateLetterProgress(solvedCount, totalCount);

    const isSolved = this.state.isLevelSolved();

    if (isSolved && !this.state.isWon) {
      this.state.isWon = true;
      this.renderer.setVictory(true);
      const author = this.state.currentLevel.author;
      this.ui.setStatus(`🎉 Message & Author decoded! <span class="status-author">— ${author}</span>`);
      PlatformBridge.vibrateSuccess();
      this.audio.playVictoryFanfare();
    } else if (!isSolved && this.state.isWon) {
      this.state.isWon = false;
      this.renderer.setVictory(false);
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
