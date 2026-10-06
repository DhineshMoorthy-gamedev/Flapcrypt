export class UIController {
  constructor(elements) {
    this.levelBadge = elements.levelBadge;
    this.prevLevelBtn = elements.prevLevelBtn;
    this.nextLevelBtn = elements.nextLevelBtn;
    this.letterBadge = elements.letterBadge;
    this.statusBar = elements.statusBar;
    this.hintBtn = elements.hintBtn;
    this.soundBtn = elements.soundBtn;
    this.prevBtn = elements.prevBtn;
    this.nextBtn = elements.nextBtn;
    this.stepUpBtn = elements.tu;
    this.stepDownBtn = elements.td;
  }

  updateLevelInfo(levelIndex, totalLevels, diff, tier = "") {
    this.levelBadge.textContent = `LVL ${levelIndex + 1}/${totalLevels} • DIFF ${diff}`;
    if (tier) this.levelBadge.title = tier;
    if (this.prevLevelBtn) this.prevLevelBtn.disabled = levelIndex === 0;
    if (this.nextLevelBtn) this.nextLevelBtn.disabled = levelIndex === totalLevels - 1;
  }

  updateLetterProgress(solvedCount, totalCount) {
    this.letterBadge.textContent = `🔤 ${solvedCount} / ${totalCount}`;
    this.letterBadge.classList.toggle('all-solved', solvedCount === totalCount && totalCount > 0);
  }

  updateHintButton(hintsRemaining) {
    this.hintBtn.textContent = `💡 HINT (${hintsRemaining})`;
    this.hintBtn.disabled = hintsRemaining === 0;
  }

  updateLinkedMode() {
    // Both flaps always step in unison; no-op
  }

  updateSoundButton(soundEnabled) {
    this.soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
  }

  setStatus(html) {
    this.statusBar.innerHTML = html;
  }
}
