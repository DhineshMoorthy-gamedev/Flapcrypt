/**
 * StudioIntro.js
 * Controls the lifecycle, timing, and transition of the Studio Intro Screen.
 * Configured to run for exactly 1.5 seconds from start to finish across all target platforms.
 */
export class StudioIntro {
  /**
   * Total intro duration from start to finish (1.5 seconds)
   */
  static TOTAL_DURATION_MS = 1500;
  static FADE_DURATION_MS = 450;
  static HOLD_DURATION_MS = 1050; // 1500 - 450 = 1050ms

  /**
   * Runs the Studio Intro sequence.
   * Auto-advances in 1.5s total or on user pointerdown gesture.
   * @param {Function} [onComplete] Callback when overlay has fully vanished and is removed from DOM.
   */
  static run(onComplete) {
    const overlay = document.getElementById('startupOverlay');
    const studioScreen = document.getElementById('studioScreen');

    if (!overlay || !studioScreen) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    let isDone = false;
    let autoTimer = null;

    function finishIntro(immediate = false) {
      if (isDone) return;
      isDone = true;

      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }

      overlay.removeEventListener('pointerdown', handleSkip);

      const fadeDuration = immediate ? 150 : StudioIntro.FADE_DURATION_MS;

      // Begin smooth fade out
      studioScreen.classList.remove('active');
      overlay.style.transition = `opacity ${fadeDuration}ms ease, visibility ${fadeDuration}ms ease`;
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';

      // Remove from DOM once transition completes
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }, fadeDuration);
    }

    function handleSkip() {
      finishIntro(true);
    }

    // Tap / Click anywhere to skip early
    overlay.addEventListener('pointerdown', handleSkip, { passive: true });

    // Auto-advance to complete at exactly 1.5 seconds total
    autoTimer = setTimeout(() => {
      finishIntro(false);
    }, StudioIntro.HOLD_DURATION_MS);
  }
}
