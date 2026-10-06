import { ANIMATION_CONFIG } from '../config/constants.js';

export class FlapAnimator {
  /**
   * Animates a split flap half rotating to reveal a new character
   * @param {HTMLElement} halfEl 
   * @param {string} char 
   * @param {number} delayMs 
   * @param {() => void} [onFlop] Callback triggered midway through flip (e.g. sound effect)
   */
  static animateFlap(halfEl, char, delayMs = 0, onFlop = null) {
    setTimeout(() => {
      const isTop = halfEl.classList.contains("top");
      const span = halfEl.querySelector("span");

      const animOut = halfEl.animate(
        [
          { transform: "rotateX(0deg)" },
          { transform: `rotateX(${isTop ? -90 : 90}deg)` }
        ],
        { duration: ANIMATION_CONFIG.FLAP_OUT_MS, easing: "ease-in" }
      );

      animOut.onfinish = () => {
        span.textContent = char.trim();
        if (typeof onFlop === 'function') {
          onFlop();
        }

        halfEl.animate(
          [
            { transform: `rotateX(${isTop ? 90 : -90}deg)` },
            { transform: "rotateX(0deg)" }
          ],
          { duration: ANIMATION_CONFIG.FLAP_IN_MS, easing: "ease-out" }
        );
      };
    }, delayMs);
  }
}
