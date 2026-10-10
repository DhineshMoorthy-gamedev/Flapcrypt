import { Icons } from './Icons.js';

export class UIController {
  constructor(elements) {
    this.levelTitleText = elements.levelTitleText;
    this.chipWords = elements.chipWords;
    this.chipWordsText = elements.chipWordsText;
    this.chipLetters = elements.chipLetters;
    this.chipLettersText = elements.chipLettersText;
    this.levelBadge = elements.levelBadge;
    this.headerProgressFill = elements.headerProgressFill;
    this.letterBadge = elements.letterBadge;
    this.statusBar = elements.statusBar;
    this.hintBtn = elements.hintBtn;
    this.soundBtn = elements.soundBtn;
    this.prevBtn = elements.prevBtn;
    this.nextBtn = elements.nextBtn;
    this.stepUpBtn = elements.tu;
    this.stepDownBtn = elements.td;
  }

  updateProgressChips({ solvedWords, totalWords, solvedLetters, totalLetters }) {
    if (this.chipWordsText) {
      const prevSolved = parseInt(this.chipWordsText.getAttribute('data-prev-solved') || '-1', 10);
      this.chipWordsText.textContent = `${solvedWords} / ${totalWords} WORDS`;
      this.chipWordsText.setAttribute('data-prev-solved', solvedWords);

      if (this.chipWords) {
        const isWordsComplete = totalWords > 0 && solvedWords === totalWords;
        this.chipWords.classList.toggle('completed', isWordsComplete);

        // Pulse with celebratory animation if a new word was solved during gameplay
        if (prevSolved >= 0 && solvedWords > prevSolved) {
          this.chipWords.classList.remove('pulse');
          void this.chipWords.offsetWidth;
          this.chipWords.classList.add('pulse');
        }
      }
    }

    if (this.chipLettersText) {
      this.chipLettersText.textContent = `${solvedLetters} / ${totalLetters} LETTERS`;
      if (this.chipLetters) {
        const isLettersComplete = totalLetters > 0 && solvedLetters === totalLetters;
        this.chipLetters.classList.toggle('completed', isLettersComplete);
      }
    }
  }

  updateLevelInfo(levelIndex, totalLevels, diff, tier = "", mode = 'campaign', customTitle = "", category = "") {
    if (this.levelTitleText) {
      this.levelTitleText.textContent = customTitle || `LEVEL ${levelIndex + 1}`;
    }
    if (this.levelBadge) {
      if (mode === 'daily') {
        const shortTier = tier ? tier.replace(/Tier \d+:\s*/i, '').toUpperCase() : '';
        this.levelBadge.textContent = shortTier ? `${shortTier} • ${diff}` : `DIFF ${diff}`;
        this.levelBadge.title = `Daily Challenge • Diff ${diff}`;
      } else {
        const isSpecial = category && category !== 'Quotes';
        if (isSpecial) {
          this.levelBadge.textContent = `${category.toUpperCase()} • ${diff}`;
          this.levelBadge.title = `Level ${levelIndex + 1} of ${totalLevels} (${category} • Diff ${diff})`;
        } else {
          const shortTier = tier ? tier.replace(/Tier \d+:\s*/i, '').toUpperCase() : '';
          this.levelBadge.textContent = shortTier ? `${shortTier} • ${diff}` : `DIFF ${diff}`;
          this.levelBadge.title = `Level ${levelIndex + 1} of ${totalLevels} (${tier || diff})`;
        }
      }
    }
  }

  updateLetterProgress(solvedCount, totalCount) {
    const pct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;
    if (this.headerProgressFill) {
      this.headerProgressFill.style.width = `${pct}%`;
      this.headerProgressFill.classList.toggle('completed', solvedCount === totalCount && totalCount > 0);
    }
    if (this.letterBadge) {
      this.letterBadge.innerHTML = `${Icons.flapTile(12)} <span>${solvedCount} / ${totalCount} SOLVED</span>`;
      this.letterBadge.classList.toggle('all-solved', solvedCount === totalCount && totalCount > 0);
    }
  }

  updateHintButton(hintsRemaining) {
    if (this.hintBtn) {
      const display = (hintsRemaining === undefined || hintsRemaining === null || hintsRemaining === Infinity) ? 5 : hintsRemaining;
      this.hintBtn.innerHTML = `${Icons.hint(16)} <span>HINT (${display})</span>`;
      this.hintBtn.disabled = false;
    }
  }

  updateLinkedMode() {
    // Both flaps always step in unison; no-op
  }

  updateSoundButton(soundEnabled) {
    if (this.soundBtn) {
      this.soundBtn.innerHTML = Icons.sound(soundEnabled, 18);
    }
  }

  setStatus(html) {
    if (this.statusBar) {
      this.statusBar.innerHTML = html;
    }
  }

  setControlsLocked(locked = true) {
    const btns = [this.stepUpBtn, this.stepDownBtn, this.hintBtn, this.prevBtn, this.nextBtn];
    btns.forEach(btn => {
      if (btn) {
        btn.disabled = Boolean(locked);
      }
    });
    const dock = typeof document !== 'undefined' ? document.querySelector('.action-dock') : null;
    if (dock) {
      dock.style.pointerEvents = locked ? 'none' : '';
    }
  }
}
