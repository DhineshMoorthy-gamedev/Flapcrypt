/**
 * StudioIntro.js
 * Controls the lifecycle, timing, and transition of the Studio Intro Screen.
 * Based on STUDIO_SCREEN_VISUAL_SPEC.txt
 */
export class StudioIntro {
  /**
   * Runs the Studio Intro sequence.
   * Auto-advances after 2.5s or on user pointerdown gesture.
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

    function finishIntro() {
      if (isDone) return;
      isDone = true;

      // Remove listener to prevent multiple triggers
      overlay.removeEventListener('pointerdown', finishIntro);

      // Step 1: Fade out slide content (0.8s ease)
      studioScreen.classList.remove('active');

      // Step 2: Fade out overlay container after 600ms
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';

        // Step 3: Remove overlay from DOM after 1.0s transition completes
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.remove();
          }
          if (typeof onComplete === 'function') {
            onComplete();
          }
        }, 1000);
      }, 600);
    }

    // Tap / Click anywhere to skip immediately
    overlay.addEventListener('pointerdown', finishIntro, { passive: true });

    // Auto-advance after 2.5 seconds
    setTimeout(finishIntro, 2500);
  }
}
