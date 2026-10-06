export class UIController {
  constructor(elements) {
    this.levelBadge = elements.levelBadge;
    this.letterBadge = elements.letterBadge;
    this.statusBar = elements.statusBar;
    this.hintBtn = elements.hintBtn;
    this.linkToggleBtn = elements.linkToggleBtn;
    this.soundBtn = elements.soundBtn;
    this.prevBtn = elements.prevBtn;
    this.nextBtn = elements.nextBtn;
    this.topDrumGrp = elements.topDrumGrp;
    this.botDrumGrp = elements.botDrumGrp;
  }

  updateLevelInfo(levelIndex, totalLevels, diff) {
    this.levelBadge.textContent = `LEVEL ${levelIndex + 1} / ${totalLevels} • DIFF ${diff}`;
    this.prevBtn.disabled = levelIndex === 0;
  }

  updateLetterProgress(solvedCount, totalCount) {
    this.letterBadge.textContent = `🔤 LETTERS: ${solvedCount} / ${totalCount}`;
    this.letterBadge.classList.toggle('all-solved', solvedCount === totalCount && totalCount > 0);
  }

  updateHintButton(hintsRemaining) {
    this.hintBtn.textContent = `💡 Reveal Half (${hintsRemaining})`;
    this.hintBtn.disabled = hintsRemaining === 0;
  }

  updateLinkedMode(isLinked) {
    if (isLinked) {
      this.linkToggleBtn.classList.add('active');
      this.linkToggleBtn.innerHTML = '🔗 Both Flaps: <b>ON</b>';
      this.topDrumGrp.classList.add('linked-highlight');
      this.botDrumGrp.classList.add('linked-highlight');
    } else {
      this.linkToggleBtn.classList.remove('active');
      this.linkToggleBtn.innerHTML = '🔗 Both Flaps: OFF';
      this.topDrumGrp.classList.remove('linked-highlight');
      this.botDrumGrp.classList.remove('linked-highlight');
    }
  }

  updateSoundButton(soundEnabled) {
    this.soundBtn.textContent = soundEnabled ? '🔊 ON' : '🔇 OFF';
  }

  setStatus(html) {
    this.statusBar.innerHTML = html;
  }
}
