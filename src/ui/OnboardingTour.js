import { driver } from 'driver.js';

let activeDriver = null;

function punchMatchingHoles() {
  const overlaySvg = document.querySelector('.driver-overlay');
  if (!overlaySvg) return;
  const path = overlaySvg.querySelector('path');
  if (!path) return;

  const matchingCells = Array.from(document.querySelectorAll('.cell.sel'));
  if (!matchingCells.length) return;

  const n = window.innerWidth;
  const r = window.innerHeight;
  let d = `M${n},0L0,0L0,${r}L${n},${r}L${n},0Z`;

  const pad = 6;
  const rad = 8;

  matchingCells.forEach(cell => {
    const rect = cell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return;

    const o = rect.width + pad * 2;
    const s = rect.height + pad * 2;
    const c = Math.min(rad, o / 2, s / 2);
    const l = Math.floor(Math.max(c, 0));
    const u = rect.x - pad + l;
    const topY = rect.y - pad;
    const f = o - l * 2;
    const p = s - l * 2;

    d += ` M${u},${topY} h${f} a${l},${l} 0 0 1 ${l},${l} v${p} a${l},${l} 0 0 1 -${l},${l} h-${f} a${l},${l} 0 0 1 -${l},-${l} v-${p} a${l},${l} 0 0 1 ${l},-${l} z`;
  });

  path.setAttribute('d', d);
}

/**
 * OnboardingTour module for Flapcrypt Level 1.
 * Provides a 7-step guided spotlight walkthrough for first-level players.
 */
export const OnboardingTour = {
  /**
   * Check if a tour is currently driving.
   */
  isActive() {
    return !!(activeDriver && typeof activeDriver.isActive === 'function' && activeDriver.isActive());
  },

  /**
   * Dismiss and clean up the active tour if running.
   */
  dismiss() {
    document.body.classList.remove('tour-active');
    document.body.classList.remove('tour-matching-active');
    if (activeDriver) {
      try {
        if (activeDriver.isActive()) {
          activeDriver.destroy();
        }
      } catch (err) {
        console.warn('[OnboardingTour] Error dismissing tour:', err);
      }
      activeDriver = null;
    }
  },

  /**
   * Start the Level 1 interactive tour.
   * @param {Object} options
   * @param {Object} [options.audioService] - AudioService for click feedback
   * @param {Function} [options.onComplete] - Callback on tour finish or skip
   */
  start({ audioService = null, onComplete = null } = {}) {
    this.dismiss();
    document.body.classList.add('tour-active');

    // Ensure the play stage is cleanly at the top at start
    const playStage = document.getElementById('playStage');
    if (playStage) {
      playStage.scrollTop = 0;
    }

    const playClick = () => {
      if (audioService && typeof audioService.playClick === 'function') {
        audioService.playClick();
      }
    };

    const steps = [
      {
        element: '#quoteArea',
        popover: {
          title: 'The Cryptogram',
          description: 'Rotate the split-flaps to decode the hidden quote.',
          popoverClass: 'flapcrypt-tour-popover step-cryptogram-quote'
        }
      },
      {
        element: '#authorRow',
        popover: {
          title: 'Who Said It?',
          description: 'Famous quote author. Solving their name gives free clues!',
          side: 'top',
          align: 'center'
        }
      },
      {
        element: () => {
          const letterCells = document.querySelectorAll('.quote-area .cell:not(.punct)');
          const secondCell = letterCells.length > 1 ? letterCells[1] : null;
          const activeCell = document.querySelector('.cell.active-cell');
          return activeCell || secondCell || document.querySelector('.cell.sel') || letterCells[0] || '#board';
        },
        popover: {
          title: 'Active Flap',
          description: 'Tap any letter to select it. Matching letters update together.',
          popoverClass: 'flapcrypt-tour-popover step-active-flap'
        },
        onHighlighted: () => {
          document.body.classList.add('tour-matching-active');
          punchMatchingHoles();
        },
        onDeselected: () => {
          document.body.classList.remove('tour-matching-active');
        }
      },
      {
        element: '#controls .primary-steppers',
        popover: {
          title: 'Rotate Flaps (▲ / ▼)',
          description: 'Step letters forward or backward through the alphabet.',
          side: 'top',
          align: 'center'
        }
      },
      {
        element: '#prevBtn',
        popover: {
          title: 'Quick Navigation',
          description: 'Jump instantly to the next unsolved letter.',
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '#headerProgressChips',
        popover: {
          title: 'Progress',
          description: 'Tracks your solved words and letters in real time.',
          side: 'bottom',
          align: 'center'
        }
      },
      {
        element: '#hint',
        popover: {
          title: 'Hints',
          description: 'Need help? Tap to reveal half or full letters.',
          side: 'top',
          align: 'center'
        }
      }
    ];

    try {
      activeDriver = driver({
        steps,
        animate: true,
        smoothScroll: false,
        allowScroll: false,
        overlayColor: 'rgba(6, 11, 10, 0.85)',
        stagePadding: 6,
        stageRadius: 8,
        popoverOffset: 14,
        allowClose: false,
        disableActiveInteraction: true, // Prevents clicks on active element during tour
        overlayClickBehavior: 'none', // Prevents backdrop click dismissal
        allowKeyboardControl: true,
        showButtons: ['next', 'previous'], // Close X button explicitly removed
        showProgress: true,
        progressText: '{{current}} of {{total}}',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Got It!',
        popoverClass: 'flapcrypt-tour-popover',
        onPopoverRender: (popover, { driver: dInstance }) => {
          // 1. Remove close button if present in DOM
          if (popover.closeButton) {
            popover.closeButton.remove();
          }

          // 2. Add sound and guarantee Next / Got It destroys cleanly on last step
          if (popover.nextButton) {
            popover.nextButton.onclick = (e) => {
              playClick();
              if (dInstance.isLastStep()) {
                e.preventDefault();
                e.stopPropagation();
                dInstance.destroy();
              }
            };
          }

          if (popover.previousButton) {
            popover.previousButton.onclick = () => {
              playClick();
            };
          }

          // 3. Neatly structure left footer container with Progress and Skip Tour
          if (popover.footer) {
            let leftGroup = popover.footer.querySelector('.driver-popover-footer-left');
            if (!leftGroup && popover.progress) {
              leftGroup = document.createElement('div');
              leftGroup.className = 'driver-popover-footer-left';
              popover.footer.insertBefore(leftGroup, popover.progress);
              leftGroup.appendChild(popover.progress);
            }

            const existingSkip = popover.footer.querySelector('.flapcrypt-tour-skip-btn');
            if (existingSkip) {
              existingSkip.remove();
            }

            if (!dInstance.isLastStep()) {
              const skipBtn = document.createElement('button');
              skipBtn.className = 'flapcrypt-tour-skip-btn';
              skipBtn.type = 'button';
              skipBtn.innerText = 'Skip Tour';
              skipBtn.setAttribute('aria-label', 'Skip the onboarding tour');
              skipBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                playClick();
                dInstance.destroy();
              };

              if (leftGroup) {
                leftGroup.appendChild(skipBtn);
              } else {
                popover.footer.prepend(skipBtn);
              }
            }
          }

          // 4. Guarantee popover is never displaced horizontally outside .app-shell on widescreen desktop
          const appShell = document.querySelector('.app-shell');
          if (appShell && popover.wrapper) {
            const shellRect = appShell.getBoundingClientRect();
            const popoverRect = popover.wrapper.getBoundingClientRect();
            if (popoverRect.left < shellRect.left - 4 || popoverRect.right > shellRect.right + 4) {
              const targetLeft = shellRect.left + (shellRect.width - popoverRect.width) / 2;
              popover.wrapper.style.left = `${Math.round(targetLeft)}px`;
              popover.wrapper.style.right = 'auto';
            }
          }
        },
        onDestroyed: () => {
          document.body.classList.remove('tour-active');
          document.body.classList.remove('tour-matching-active');
          activeDriver = null;
          if (typeof onComplete === 'function') {
            onComplete();
          }
        }
      });

      activeDriver.drive();
    } catch (err) {
      console.warn('[OnboardingTour] Failed to start driver tour:', err);
      document.body.classList.remove('tour-active');
      document.body.classList.remove('tour-matching-active');
      activeDriver = null;
    }
  }
};
