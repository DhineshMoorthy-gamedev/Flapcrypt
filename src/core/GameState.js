import { ORDER } from '../config/constants.js';

export class GameState {
  constructor() {
    this.levelIndex = 0;
    this.currentLevel = null;
    this.cipherMap = {};
    this.drums = {};
    this.groups = [];
    this.selectedGroup = null;
    this.hintsRemaining = 5;
    this.isWon = false;
    this.bothFlapsLinked = true;
    this.lockedPreviously = {};
  }

  initLevel(index, levelData, cipherMap) {
    this.levelIndex = index;
    this.currentLevel = levelData;
    this.cipherMap = cipherMap;
    this.drums = {};
    this.groups = [];
    this.selectedGroup = null;
    this.hintsRemaining = 5;
    this.isWon = false;
    this.bothFlapsLinked = true;
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

  getWordsProgress() {
    if (!this.currentLevel) {
      return { solvedWords: 0, totalWords: 0 };
    }

    const textToScan = [
      this.currentLevel.quote || '',
      this.currentLevel.author || ''
    ].filter(Boolean).join(' ');

    const rawWords = textToScan.trim().split(/\s+/);
    let totalWords = 0;
    let solvedWords = 0;

    for (const rawWord of rawWords) {
      const letters = rawWord.toUpperCase().replace(/[^A-Z]/g, '');
      if (!letters.length) continue;
      totalWords++;

      const isWordSolved = Array.from(letters).every(char => {
        const cipher = this.cipherMap ? this.cipherMap[char] : null;
        if (!cipher) return true;
        return this.isLetterCorrect(cipher);
      });

      if (isWordSolved) {
        solvedWords++;
      }
    }

    return { solvedWords, totalWords };
  }

  isLevelSolved() {
    return this.groups.length > 0 && this.groups.every(c => this.isLetterCorrect(c));
  }

  selectGroup(cipherChar) {
    this.selectedGroup = cipherChar;
  }

  hasEmptyFlap(cipherChar) {
    const d = this.drums[cipherChar];
    if (!d) return false;
    if (this.isLetterCorrect(cipherChar)) return false;
    const topEmpty = !d.fx?.t && (!d.t || d.t === " ");
    const botEmpty = !d.fx?.b && (!d.b || d.b === " ");
    return topEmpty || botEmpty;
  }

  getNextEmptyGroup(currentGroup, dir = 1) {
    if (!this.groups.length) return null;
    const total = this.groups.length;
    let startIdx = this.groups.indexOf(currentGroup);
    if (startIdx === -1) startIdx = 0;

    // 1. Search for any other unsolved letter group
    for (let step = 1; step < total; step++) {
      const idx = (startIdx + dir * step + total * 100) % total;
      const candidate = this.groups[idx];
      if (!this.isLetterCorrect(candidate)) {
        return candidate;
      }
    }

    // 2. Fallback: If only current is unsolved or all solved, cycle sequentially
    return this.groups[(startIdx + dir + total * 100) % total];
  }

  getNextUnsolvedGroup(currentGroup, dir = 1) {
    return this.getNextEmptyGroup(currentGroup, dir);
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
      if (f.t && f.b) {
        return { isFixed: true };
      }

      let currChar = " ";
      if (f.t) {
        currChar = d.b || " ";
      } else if (f.b) {
        currChar = d.t || " ";
      } else {
        currChar = (d.t && d.t !== " ") ? d.t : ((d.b && d.b !== " ") ? d.b : " ");
      }

      let idx = ORDER.indexOf(currChar);
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
    if (idx === -1) idx = 0;
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

  canHintGroup(cipherChar = this.selectedGroup) {
    if (!cipherChar) return false;
    const d = this.drums[cipherChar];
    if (!d) return false;
    const f = d.fx || {};
    return !(f.t && f.b && d.t === d.sol && d.b === d.sol);
  }

  getHintPayload() {
    if (!this.selectedGroup) return null;
    const d = this.drums[this.selectedGroup];
    if (!d) return null;

    const f = d.fx || {};
    if (f.t && f.b && d.t === d.sol && d.b === d.sol) {
      return { alreadyFixed: true };
    }

    this.fixHalf(this.selectedGroup, "t");
    this.fixHalf(this.selectedGroup, "b");

    return {
      cipherChar: this.selectedGroup,
      hintsRemaining: this.hintsRemaining
    };
  }
}
