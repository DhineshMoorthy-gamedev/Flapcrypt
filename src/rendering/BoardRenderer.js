import { FlapAnimator } from './FlapAnimator.js';
import { ANIMATION_CONFIG } from '../config/constants.js';

const letterTemplate = document.createElement('template');
letterTemplate.innerHTML = '<div class="cell" tabindex="0"><div class="flap-container"><div class="half top"><span> </span></div><div class="half bot"><span> </span></div><div class="split-seam"></div></div><div class="tag"></div></div>';

const punctTemplate = document.createElement('template');
punctTemplate.innerHTML = '<div class="cell punct"><div class="flap-container"><div class="half top fixed"><span></span></div><div class="half bot fixed"><span></span></div><div class="split-seam"></div></div><div class="tag">&nbsp;</div></div>';

export class BoardRenderer {
  constructor(boardEl, quoteAreaEl, authorRowEl) {
    this.boardEl = boardEl;
    this.quoteAreaEl = quoteAreaEl;
    this.authorRowEl = authorRowEl;
    this.cellsByCipherChar = {};
    this.letterCells = [];
    this.activeCellIndex = 0;
    this.introTimer = null;
    this.onCellClick = null;

    // Single delegated event listener for entire board
    this.boardEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (cell && cell.dataset.c && typeof this.onCellClick === 'function') {
        const idx = parseInt(cell.dataset.idx, 10);
        this.onCellClick(cell.dataset.c, Number.isNaN(idx) ? -1 : idx);
      }
    });
  }

  clearIntroAnimation() {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
      this.introTimer = null;
    }
    if (this.boardEl) {
      this.boardEl.classList.remove('board-intro');
      const cells = this.boardEl.querySelectorAll('.cell');
      cells.forEach(cell => {
        cell.style.removeProperty('--intro-delay');
      });
    }
  }

  clear() {
    this.clearIntroAnimation();
    this.quoteAreaEl.innerHTML = '';
    this.authorRowEl.innerHTML = '';
    this.authorRowEl.style.display = '';
    this.boardEl.classList.remove('won');
    this.cellsByCipherChar = {};
    this.letterCells = [];
    this.activeCellIndex = 0;
  }

  buildBoard(level, cipherMap, onCellClick, onRegisterLetter) {
    this.clear();
    this.onCellClick = onCellClick;

    // 1. Render Quote Words into DocumentFragment (Atomic single-pass DOM mount)
    const quoteFrag = document.createDocumentFragment();
    const quoteWords = level.quote.split(" ");
    quoteWords.forEach(w => {
      this.renderWordBlock(w, quoteFrag, cipherMap, onRegisterLetter);
    });
    this.quoteAreaEl.appendChild(quoteFrag);

    // 2. Render Author Section into DocumentFragment (if author is present)
    const authorText = (level.author || "").trim();
    if (authorText) {
      this.authorRowEl.style.display = '';
      const authorFrag = document.createDocumentFragment();
      const dashEl = document.createElement("div");
      dashEl.className = "author-label";
      dashEl.textContent = "—";
      authorFrag.appendChild(dashEl);

      const authorWords = authorText.split(" ");
      authorWords.forEach(w => {
        this.renderWordBlock(w, authorFrag, cipherMap, onRegisterLetter);
      });
      this.authorRowEl.appendChild(authorFrag);
    } else {
      this.authorRowEl.style.display = 'none';
    }
  }

  renderWordBlock(wordText, container, cipherMap, onRegisterLetter) {
    const wordEl = document.createElement("div");
    wordEl.className = "word";

    for (let i = 0; i < wordText.length; i++) {
      const rawChar = wordText[i];
      const isLetter = /[a-zA-Z]/.test(rawChar);

      if (isLetter) {
        const char = rawChar.toUpperCase();
        const cipherChar = cipherMap[char];

        onRegisterLetter(cipherChar, char);

        if (!this.cellsByCipherChar[cipherChar]) {
          this.cellsByCipherChar[cipherChar] = [];
        }

        const cellIndex = this.letterCells.length;
        const cellEl = letterTemplate.content.firstElementChild.cloneNode(true);
        cellEl.dataset.c = cipherChar;
        cellEl.dataset.idx = String(cellIndex);
        cellEl.lastElementChild.textContent = cipherChar;

        this.cellsByCipherChar[cipherChar].push(cellEl);
        this.letterCells.push(cellEl);
        wordEl.appendChild(cellEl);
      } else {
        // Punctuation Mark (Fixed)
        const punctCell = punctTemplate.content.firstElementChild.cloneNode(true);
        punctCell.querySelector('.top span').textContent = rawChar;
        punctCell.querySelector('.bot span').textContent = rawChar;
        wordEl.appendChild(punctCell);
      }
    }

    container.appendChild(wordEl);
  }

  setActiveCell(cellIndex) {
    if (typeof cellIndex === 'number' && cellIndex >= 0 && cellIndex < this.letterCells.length) {
      this.activeCellIndex = cellIndex;
    }
  }

  fixHalfVisual(cipherChar, whichHalf, solutionChar) {
    const cells = this.cellsByCipherChar[cipherChar];
    if (!cells) return;

    cells.forEach(cell => {
      cell.classList.add("has-fixed");
      const halfEl = cell.querySelector(whichHalf === "t" ? ".top" : ".bot");
      halfEl.classList.add("fixed");
      halfEl.querySelector("span").textContent = solutionChar;
    });
  }

  setHalfVisual(cipherChar, whichHalf, char) {
    const cells = this.cellsByCipherChar[cipherChar];
    if (!cells) return;

    cells.forEach(cell => {
      const halfEl = cell.querySelector(whichHalf === "t" ? ".top" : ".bot");
      if (halfEl) {
        const span = halfEl.querySelector("span");
        if (span) span.textContent = char || " ";
      }
    });
  }

  animateDrumHalf(cipherChar, whichHalf, char, baseDelay = 0, onFlop = null) {
    const cells = this.cellsByCipherChar[cipherChar];
    if (!cells) return;

    cells.forEach((cell, idx) => {
      const halfEl = cell.querySelector(whichHalf === "t" ? ".top" : ".bot");
      const delay = (baseDelay || 0) + idx * ANIMATION_CONFIG.FLAP_STAGGER_MS;
      FlapAnimator.animateFlap(halfEl, char, delay, onFlop);
    });
  }

  updateBoardState(groups, gameState) {
    const letterUsage = gameState.getLetterUsage();
    const selectedGroup = gameState.selectedGroup;

    groups.forEach(c => {
      const agreed = gameState.isAgreed(c);
      const isCorrect = gameState.isLetterCorrect(c);
      const letter = gameState.drums[c] ? gameState.drums[c].t : null;
      const clash = agreed && letter && letterUsage[letter] && letterUsage[letter].length > 1;

      const cells = this.cellsByCipherChar[c] || [];
      cells.forEach(cell => {
        const isSel = c === selectedGroup;
        const cellIdx = parseInt(cell.dataset.idx, 10);
        const isActive = isSel && cellIdx === this.activeCellIndex;

        cell.classList.toggle("lock", agreed && !clash);
        cell.classList.toggle("clash", clash);
        cell.classList.toggle("sel", isSel);
        cell.classList.toggle("active-cell", isActive);
        cell.classList.toggle("solved", isCorrect);
      });
    });

    // Word-level lock detection and pop animation
    const wordEls = this.boardEl.querySelectorAll('.word');
    wordEls.forEach(wordEl => {
      const cells = wordEl.querySelectorAll('.cell[data-c]');
      if (!cells.length) return;
      const allSolved = Array.from(cells).every(c => c.classList.contains('solved'));
      const wasLocked = wordEl.classList.contains('word-locked');
      wordEl.classList.toggle('word-locked', allSolved);
      if (allSolved && !wasLocked) {
        wordEl.classList.remove('word-lock-pop');
        void wordEl.offsetWidth; // Force reflow to re-trigger one-shot animation
        wordEl.classList.add('word-lock-pop');
      }
    });
  }

  setVictory(isWon) {
    this.boardEl.classList.toggle('won', isWon);
  }

  /**
   * Sweeps a pure CSS GPU-accelerated mechanical split-flap cascade wave across the board.
   * Runs 100% on the browser compositor with zero main-thread timer loops or DOM text thrashing.
   */
  animateLevelIntro(onCascadeRoll) {
    this.clearIntroAnimation();
    const words = Array.from(this.boardEl.querySelectorAll('.word'));
    if (!words.length) return;

    const staggerMs = 36;
    const totalDurationMs = words.length * staggerMs + 220;

    // Apply clean mechanical word-sweep delay across board
    words.forEach((wordEl, wordIdx) => {
      const delay = wordIdx * staggerMs;
      const cells = wordEl.querySelectorAll('.cell');
      cells.forEach(cell => {
        cell.style.setProperty('--intro-delay', `${delay}ms`);
      });
    });

    // Trigger hardware-accelerated cascade wave
    this.boardEl.classList.add('board-intro');

    // Trigger scheduled audio clack roll if provided
    if (typeof onCascadeRoll === 'function') {
      onCascadeRoll();
    }

    // Clean up classes and CSS properties once animation concludes
    this.introTimer = setTimeout(() => {
      this.clearIntroAnimation();
    }, totalDurationMs);
  }

  scrollToCellIndex(index, behavior = 'smooth') {
    if (typeof index === 'number' && index >= 0 && index < this.letterCells.length) {
      const targetCell = this.letterCells[index];
      if (targetCell) {
        targetCell.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' });
      }
    }
  }

  scrollToCell(cipherChar) {
    if (this.activeCellIndex >= 0 && this.activeCellIndex < this.letterCells.length) {
      const activeCell = this.letterCells[this.activeCellIndex];
      if (activeCell && activeCell.dataset.c === cipherChar) {
        activeCell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        return;
      }
    }
    const cells = this.cellsByCipherChar[cipherChar];
    if (cells && cells[0]) {
      cells[0].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }
}
