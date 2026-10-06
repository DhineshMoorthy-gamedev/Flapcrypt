import { FlapAnimator } from './FlapAnimator.js';
import { ANIMATION_CONFIG } from '../config/constants.js';

export class BoardRenderer {
  constructor(boardEl, quoteAreaEl, authorRowEl) {
    this.boardEl = boardEl;
    this.quoteAreaEl = quoteAreaEl;
    this.authorRowEl = authorRowEl;
    this.cellsByCipherChar = {};
  }

  clear() {
    this.quoteAreaEl.innerHTML = '';
    this.authorRowEl.innerHTML = '';
    this.boardEl.classList.remove('won');
    this.cellsByCipherChar = {};
  }

  buildBoard(level, cipherMap, onCellClick, onRegisterLetter) {
    this.clear();

    // 1. Render Quote Words
    const quoteWords = level.quote.split(" ");
    quoteWords.forEach(w => {
      this.renderWordBlock(w, this.quoteAreaEl, cipherMap, onCellClick, onRegisterLetter);
    });

    // 2. Render Author Section
    const dashEl = document.createElement("div");
    dashEl.className = "author-label";
    dashEl.textContent = "—";
    this.authorRowEl.appendChild(dashEl);

    const authorWords = level.author.split(" ");
    authorWords.forEach(w => {
      this.renderWordBlock(w, this.authorRowEl, cipherMap, onCellClick, onRegisterLetter);
    });
  }

  renderWordBlock(wordText, container, cipherMap, onCellClick, onRegisterLetter) {
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

        const cellEl = document.createElement("div");
        cellEl.className = "cell";
        cellEl.tabIndex = 0;
        cellEl.dataset.c = cipherChar;
        cellEl.innerHTML = `
          <div class="flap-container">
            <div class="half top"><span> </span></div>
            <div class="half bot"><span> </span></div>
            <div class="split-seam"></div>
          </div>
          <div class="tag">${cipherChar}</div>
        `;

        cellEl.addEventListener('click', () => onCellClick(cipherChar));
        cellEl.addEventListener('focus', () => onCellClick(cipherChar));

        this.cellsByCipherChar[cipherChar].push(cellEl);
        wordEl.appendChild(cellEl);
      } else {
        // Punctuation Mark (Fixed)
        const punctCell = document.createElement("div");
        punctCell.className = "cell punct";
        punctCell.innerHTML = `
          <div class="flap-container">
            <div class="half top fixed"><span>${rawChar}</span></div>
            <div class="half bot fixed"><span>${rawChar}</span></div>
            <div class="split-seam"></div>
          </div>
          <div class="tag">&nbsp;</div>
        `;
        wordEl.appendChild(punctCell);
      }
    }

    container.appendChild(wordEl);
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
      const letter = gameState.drums[c] ? gameState.drums[c].t : null;
      const clash = agreed && letter && letterUsage[letter] && letterUsage[letter].length > 1;

      const cells = this.cellsByCipherChar[c] || [];
      cells.forEach(cell => {
        cell.classList.toggle("lock", agreed && !clash);
        cell.classList.toggle("clash", clash);
        cell.classList.toggle("sel", c === selectedGroup);
      });
    });
  }

  setVictory(isWon) {
    this.boardEl.classList.toggle('won', isWon);
  }

  scrollToCell(cipherChar) {
    const cells = this.cellsByCipherChar[cipherChar];
    if (cells && cells[0]) {
      cells[0].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }
}
