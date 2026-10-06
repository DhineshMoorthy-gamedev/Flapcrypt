import { ORDER } from '../config/constants.js';

export class GameState {
  constructor() {
    this.levelIndex = 0;
    this.currentLevel = null;
    this.cipherMap = {};
    this.drums = {};
    this.groups = [];
    this.selectedGroup = null;
    this.hintsRemaining = 3;
    this.isWon = false;
    this.bothFlapsLinked = false;
    this.lockedPreviously = {};
  }

  initLevel(index, levelData, cipherMap) {
    this.levelIndex = index;
    this.currentLevel = levelData;
    this.cipherMap = cipherMap;
    this.drums = {};
    this.groups = [];
    this.selectedGroup = null;
    this.hintsRemaining = 3;
    this.isWon = false;
    this.lockedPreviously = {};
  }

  registerCipherChar(cipherChar, solutionChar) {
    if (!this.drums[cipherChar]) {
      this.drums[cipherChar] = {
        t: " ",
        b: " ",
        sol: solutionChar,
        fx: {}
      };
      this.groups.push(cipherChar);
    }
  }

  fixHalf(cipherChar, whichHalf) {
    const d = this.drums[cipherChar];
    if (!d) return;
    d[whichHalf] = d.sol;
    d.fx[whichHalf] = true;
  }

  setDrum(cipherChar, whichHalf, char) {
    const d = this.drums[cipherChar];
    if (!d || d[whichHalf] === char) return false;
    d[whichHalf] = char;
    return true;
  }

  isAgreed(cipherChar) {
    const d = this.drums[cipherChar];
    return !!(d && d.t !== " " && d.t === d.b);
  }

  isLetterCorrect(cipherChar) {
    const d = this.drums[cipherChar];
    return !!(d && this.isAgreed(cipherChar) && d.t === d.sol);
  }

  getLetterUsage() {
    const usage = {};
    this.groups.forEach(c => {
      if (this.isAgreed(c)) {
        const letter = this.drums[c].t;
        (usage[letter] = usage[letter] || []).push(c);
      }
    });
    return usage;
  }

  getSolvedLettersCount() {
    return this.groups.filter(c => this.isLetterCorrect(c)).length;
  }

  getTotalLettersCount() {
    return this.groups.length;
  }

  isLevelSolved() {
    return this.groups.length > 0 && this.groups.every(c => this.isLetterCorrect(c));
  }

  selectGroup(cipherChar) {
    this.selectedGroup = cipherChar;
  }

  toggleLinkedMode() {
    this.bothFlapsLinked = !this.bothFlapsLinked;
    return this.bothFlapsLinked;
  }

  getStepPayload(whichHalf, dir) {
    if (!this.selectedGroup) return null;
    const d = this.drums[this.selectedGroup];
    if (!d) return null;

    if (this.bothFlapsLinked) {
      const f = d.fx || {};
      const baseChar = (!f.t && d.t !== " ") ? d.t : (!f.b && d.b !== " " ? d.b : (d.t !== " " ? d.t : (dir > 0 ? " " : "A")));
      let idx = ORDER.indexOf(baseChar);
      if (idx === -1) idx = 0;
      idx = (idx + dir + ORDER.length) % ORDER.length;
      const nextChar = ORDER[idx];

      return {
        cipherChar: this.selectedGroup,
        isLinked: true,
        updateTop: !f.t,
        updateBot: !f.b,
        targetChar: nextChar
      };
    }

    if (d.fx && d.fx[whichHalf]) {
      return { isFixed: true };
    }

    let idx = ORDER.indexOf(d[whichHalf]);
    idx = (idx + dir + ORDER.length) % ORDER.length;
    const nextChar = ORDER[idx];

    return {
      cipherChar: this.selectedGroup,
      isLinked: false,
      whichHalf,
      targetChar: nextChar
    };
  }

  getSetBothPayload(char) {
    if (!this.selectedGroup) return null;
    const d = this.drums[this.selectedGroup];
    if (!d) return null;

    const f = d.fx || {};
    return {
      cipherChar: this.selectedGroup,
      updateTop: !f.t,
      updateBot: !f.b,
      targetChar: char
    };
  }

  getHintPayload() {
    if (this.hintsRemaining < 1 || !this.selectedGroup) return null;
    const d = this.drums[this.selectedGroup];
    if (!d) return null;

    const f = d.fx || {};
    const targetHalf = !f.t ? "t" : (!f.b ? "b" : null);
    if (!targetHalf) return { alreadyFixed: true };

    this.hintsRemaining--;
    this.fixHalf(this.selectedGroup, targetHalf);

    return {
      cipherChar: this.selectedGroup,
      targetHalf,
      hintsRemaining: this.hintsRemaining
    };
  }
}
