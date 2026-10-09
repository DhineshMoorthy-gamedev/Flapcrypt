import { Icons } from './Icons.js';
import { LEVEL_DATA } from '../data/levels.js';
import { DailyChallengeService } from '../core/DailyChallengeService.js';
import { IAPService, IAP_PRODUCTS } from '../core/IAPService.js';

export class ModalManager {
  constructor({ storageService, audioService, onProgressReset, onHintInventoryChanged }) {
    this.storage = storageService;
    this.audio = audioService;
    this.onProgressReset = onProgressReset;
    this.onHintInventoryChanged = onHintInventoryChanged;
    this.shopTickerInterval = null;

    this.overlay = document.getElementById('modalOverlay');
    this.containerEl = this.overlay ? this.overlay.querySelector('.modal-container') : null;
    this.dragHandleEl = document.getElementById('modalDragHandle');
    this.titleEl = document.getElementById('modalTitle');
    this.bodyEl = document.getElementById('modalBody');
    this.closeBtn = document.getElementById('modalCloseBtn');

    this.initEvents();
  }

  initEvents() {
    if (!this.overlay) return;

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        if (!this.isVictory()) {
          this.close();
        }
      });
    }

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        // In victory panel, require selecting an action button
        if (!this.isVictory()) {
          this.close();
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        if (!this.isVictory()) {
          this.close();
        }
      }
    });

    this.initDrawerGestures();
  }

  isVictory() {
    return this.containerEl && this.containerEl.classList.contains('modal-victory');
  }

  isDrawer() {
    return this.containerEl && this.containerEl.classList.contains('modal-drawer');
  }

  initDrawerGestures() {
    if (!this.containerEl) return;

    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let isDragging = false;
    let activePointerId = null;

    const dragElements = [this.dragHandleEl, this.containerEl.querySelector('.modal-header')].filter(Boolean);

    const onPointerDown = (e) => {
      if (!this.isOpen() || !this.isDrawer()) return;
      if (e.target.closest('button, input, a, .switch-label, .btn-modal-close')) return;
      if (e.button !== undefined && e.button !== 0) return; // Only primary button/touch

      startY = e.clientY;
      currentY = e.clientY;
      startTime = Date.now();
      isDragging = true;
      activePointerId = e.pointerId;

      this.containerEl.classList.add('is-dragging');
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const onPointerMove = (e) => {
      if (!isDragging || e.pointerId !== activePointerId) return;

      currentY = e.clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        this.containerEl.style.transition = 'none';
        this.containerEl.style.transform = `translateY(${deltaY}px)`;

        const maxDrag = this.containerEl.offsetHeight || 500;
        const dragRatio = Math.min(1, Math.max(0, deltaY / maxDrag));
        if (this.overlay) {
          this.overlay.style.backgroundColor = `rgba(5, 8, 7, ${0.82 * (1 - dragRatio * 0.75)})`;
        }
      } else {
        // Subtle resistance when pulling upwards
        this.containerEl.style.transition = 'none';
        this.containerEl.style.transform = `translateY(${deltaY * 0.15}px)`;
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging || e.pointerId !== activePointerId) return;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}

      isDragging = false;
      activePointerId = null;
      this.containerEl.classList.remove('is-dragging');

      const deltaY = currentY - startY;
      const elapsed = Date.now() - startTime;
      const velocity = deltaY / Math.max(elapsed, 1);

      // Dismiss if pulled down > 70px OR swiped down with velocity > 0.25 px/ms
      if (deltaY > 70 || (velocity > 0.25 && deltaY > 20)) {
        this.dismissWithSlideDown();
      } else {
        this.snapBackUp();
      }
    };

    dragElements.forEach((el) => {
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerUp);
    });

    // Support pulling down from modal body when scrolled to top
    if (this.bodyEl) {
      let bodyStartY = 0;
      let bodyCurrentY = 0;
      let bodyStartTime = 0;
      let isBodyDragging = false;
      let canBodyDrag = false;

      this.bodyEl.addEventListener('touchstart', (e) => {
        if (!this.isOpen() || !this.isDrawer()) return;
        if (e.target.closest('button, input, a, .btn-shop-pill')) return;

        if (this.bodyEl.scrollTop <= 0) {
          canBodyDrag = true;
          bodyStartY = e.touches[0].clientY;
          bodyCurrentY = bodyStartY;
          bodyStartTime = Date.now();
          isBodyDragging = false;
        } else {
          canBodyDrag = false;
        }
      }, { passive: true });

      this.bodyEl.addEventListener('touchmove', (e) => {
        if (!canBodyDrag || !this.isOpen() || !this.isDrawer()) return;
        if (this.bodyEl.scrollTop > 0) {
          canBodyDrag = false;
          return;
        }

        bodyCurrentY = e.touches[0].clientY;
        const deltaY = bodyCurrentY - bodyStartY;

        if (deltaY > 8) {
          if (!isBodyDragging) {
            isBodyDragging = true;
            this.containerEl.classList.add('is-dragging');
          }
          if (e.cancelable) {
            e.preventDefault();
          }
          this.containerEl.style.transition = 'none';
          this.containerEl.style.transform = `translateY(${deltaY - 8}px)`;

          const maxDrag = this.containerEl.offsetHeight || 500;
          const dragRatio = Math.min(1, Math.max(0, (deltaY - 8) / maxDrag));
          if (this.overlay) {
            this.overlay.style.backgroundColor = `rgba(5, 8, 7, ${0.82 * (1 - dragRatio * 0.75)})`;
          }
        }
      }, { passive: false });

      const onBodyTouchEnd = () => {
        if (!isBodyDragging) {
          canBodyDrag = false;
          return;
        }
        isBodyDragging = false;
        canBodyDrag = false;
        this.containerEl.classList.remove('is-dragging');

        const deltaY = bodyCurrentY - bodyStartY;
        const elapsed = Date.now() - bodyStartTime;
        const velocity = deltaY / Math.max(elapsed, 1);

        if (deltaY > 70 || (velocity > 0.25 && deltaY > 20)) {
          this.dismissWithSlideDown();
        } else {
          this.snapBackUp();
        }
      };

      this.bodyEl.addEventListener('touchend', onBodyTouchEnd, { passive: true });
      this.bodyEl.addEventListener('touchcancel', onBodyTouchEnd, { passive: true });
    }
  }

  dismissWithSlideDown() {
    if (this.containerEl) {
      this.containerEl.style.transition = 'transform 0.26s cubic-bezier(0.32, 0.72, 0, 1)';
      this.containerEl.style.transform = 'translateY(100%)';
    }
    if (this.overlay) {
      this.overlay.style.transition = 'opacity 0.26s ease, background-color 0.26s ease';
      this.overlay.style.backgroundColor = '';
    }
    setTimeout(() => {
      this.close();
    }, 260);
  }

  snapBackUp() {
    if (this.containerEl) {
      this.containerEl.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
      this.containerEl.style.transform = 'translateY(0)';
    }
    if (this.overlay) {
      this.overlay.style.transition = 'background-color 0.22s ease';
      this.overlay.style.backgroundColor = '';
    }
    setTimeout(() => {
      if (this.containerEl && this.isOpen()) {
        this.containerEl.style.transform = '';
        this.containerEl.style.transition = '';
      }
    }, 230);
  }

  isOpen() {
    return this.overlay && this.overlay.classList.contains('active');
  }

  close() {
    if (this.shopTickerInterval) {
      clearInterval(this.shopTickerInterval);
      this.shopTickerInterval = null;
    }
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    if (!this.overlay) return;

    const isDrawer = this.isDrawer();

    // Reset backdrop inline styling
    if (this.overlay) {
      this.overlay.style.backgroundColor = '';
      this.overlay.style.transition = '';
    }

    // Remove active state so overlay fades out and drawer slides down (translateY(100%))
    this.overlay.classList.remove('active');

    if (this.containerEl) {
      const confirmOverlay = this.containerEl.querySelector('.drawer-confirm-overlay');
      if (confirmOverlay) {
        confirmOverlay.remove();
      }
      this.containerEl.classList.remove('is-dragging');
    }

    if (isDrawer) {
      // Retain .drawer-mode and .modal-drawer for the duration of the slide-down transition (320ms)
      this.closeTimeout = setTimeout(() => {
        if (!this.isOpen()) {
          if (this.overlay) {
            this.overlay.classList.remove('drawer-mode');
          }
          if (this.containerEl) {
            this.containerEl.classList.remove('modal-drawer', 'modal-drawer-tall', 'modal-victory', 'modal-center-level-select', 'modal-center-calendar', 'modal-center-achievements');
            this.containerEl.style.transform = '';
            this.containerEl.style.transition = '';
          }
        }
        this.closeTimeout = null;
      }, 340);
    } else {
      if (this.overlay) {
        this.overlay.classList.remove('drawer-mode');
      }
      if (this.containerEl) {
        this.containerEl.classList.remove('modal-victory', 'modal-drawer', 'modal-drawer-tall', 'modal-center-level-select', 'modal-center-calendar', 'modal-center-achievements');
        this.containerEl.style.transform = '';
        this.containerEl.style.transition = '';
      }
    }
  }

  open(type, options = {}) {
    if (!this.overlay || !this.bodyEl || !this.titleEl) return;

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    if (this.shopTickerInterval) {
      clearInterval(this.shopTickerInterval);
      this.shopTickerInterval = null;
    }

    const isDrawer = ['shop', 'stats'].includes(type);

    if (this.containerEl) {
      this.containerEl.style.transform = '';
      this.containerEl.style.transition = '';
      this.containerEl.classList.remove('modal-victory', 'modal-center-level-select', 'modal-center-calendar', 'modal-center-achievements', 'modal-center-how-to-play');
      if (isDrawer) {
        this.containerEl.classList.add('modal-drawer');
        this.containerEl.classList.remove('modal-drawer-tall');
      } else {
        this.containerEl.classList.remove('modal-drawer', 'modal-drawer-tall');
      }

      if (type === 'levelSelect') {
        this.containerEl.classList.add('modal-center-level-select');
      } else if (type === 'dailyCalendar') {
        this.containerEl.classList.add('modal-center-calendar');
      } else if (type === 'achievements') {
        this.containerEl.classList.add('modal-center-achievements');
      } else if (type === 'howToPlay') {
        this.containerEl.classList.add('modal-center-how-to-play');
      }

      const confirmOverlay = this.containerEl.querySelector('.drawer-confirm-overlay');
      if (confirmOverlay) {
        confirmOverlay.remove();
      }
    }
    if (this.overlay) {
      this.overlay.style.backgroundColor = '';
      this.overlay.style.transition = '';
      if (isDrawer) {
        this.overlay.classList.add('drawer-mode');
      } else {
        this.overlay.classList.remove('drawer-mode');
      }
    }

    switch (type) {
      case 'howToPlay':
        this.renderHowToPlay();
        break;
      case 'achievements':
        this.renderAchievements();
        break;
      case 'shop':
        this.renderShop();
        break;
      case 'stats':
        this.renderStats();
        break;
      case 'levelSelect':
        this.renderLevelSelect(options);
        break;
      case 'dailyCalendar':
        this.renderDailyCalendar(options);
        break;
      case 'returnHome':
        this.renderReturnHome(options.onConfirm);
        break;
      case 'resetLevel':
        this.renderResetLevel(options.onConfirm);
        break;
      case 'levelComplete':
        this.renderLevelComplete(options);
        break;
      default:
        return;
    }

    this.overlay.classList.add('active');
  }

  renderHowToPlay() {
    this.titleEl.innerHTML = `${Icons.help(20)} <span>HOW TO PLAY</span>`;
    this.bodyEl.innerHTML = `
      <div class="htp-container">
        <!-- Top Segmented Step Tabs -->
        <nav class="htp-tabs" role="tablist" aria-label="Cryptogram solving tutorial steps">
          <button class="htp-tab active" data-index="0" role="tab" aria-selected="true">
            <span class="htp-tab-num">1</span>
            <span class="htp-tab-label">1-LETTER WORDS</span>
          </button>
          <button class="htp-tab" data-index="1" role="tab" aria-selected="false">
            <span class="htp-tab-num">2</span>
            <span class="htp-tab-label">PATTERNS</span>
          </button>
          <button class="htp-tab" data-index="2" role="tab" aria-selected="false">
            <span class="htp-tab-num">3</span>
            <span class="htp-tab-label">COMPLETE QUOTE</span>
          </button>
        </nav>

        <!-- Horizontal Snap-Scroll Carousel -->
        <div class="htp-carousel" id="htpcCarousel" tabindex="0" role="region" aria-label="Cryptogram Tutorial Slides">
          
          <!-- STEP 1: Single Letter Words -->
          <div class="htp-card" data-index="0">
            <div class="htp-visual-stage">
              <div class="htp-puzzle-step-box">
                <div class="htp-puzzle-snippet">
                  <!-- Word 1: 'I' (Single Letter Focus) -->
                  <div class="htp-puzzle-word focus-word">
                    <div class="htp-cell-flap active-focus" id="demoSingleLetter">
                      <div class="htp-flap top locked"><span class="flap-letter">I</span></div>
                      <div class="htp-seam locked"></div>
                      <div class="htp-flap bottom locked"><span class="flap-letter">I</span></div>
                    </div>
                    <span class="htp-word-caption">"I" or "A"</span>
                  </div>

                  <!-- Rest of encrypted snippet -->
                  <div class="htp-puzzle-word encrypted-muted">
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">S</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">S</span></div></div>
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">E</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">E</span></div></div>
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">E</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">E</span></div></div>
                  </div>

                  <div class="htp-puzzle-word encrypted-muted">
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">T</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">T</span></div></div>
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">H</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">H</span></div></div>
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">E</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">E</span></div></div>
                  </div>
                </div>

                <div class="htp-rule-tag">
                  <span class="htp-rule-icon">💡</span>
                  <span>TIP: 1-Letter words in English are almost always <strong>I</strong> or <strong>A</strong>.</span>
                </div>
              </div>
            </div>

            <div class="htp-info-box">
              <h3 class="htp-info-title">1. Start With 1-Letter Words</h3>
              <p class="htp-info-text">
                Always scan the puzzle for single-letter words first. Since only <strong>"I"</strong> and <strong>"A"</strong> exist in English, solving them gives you an instant head start!
              </p>
            </div>
          </div>

          <!-- STEP 2: Repeating Letters & Common Words -->
          <div class="htp-card" data-index="1">
            <div class="htp-visual-stage">
              <div class="htp-puzzle-step-box">
                <!-- Word 1: 'SEE' and Word 2: 'THE' -->
                <div class="htp-puzzle-snippet">
                  <!-- Word: SEE -->
                  <div class="htp-puzzle-word">
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">S</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">S</span></div></div>
                    <div class="htp-cell-flap mini active-link"><div class="htp-flap top locked"><span class="flap-letter">E</span></div><div class="htp-seam locked"></div><div class="htp-flap bottom locked"><span class="flap-letter">E</span></div></div>
                    <div class="htp-cell-flap mini active-link"><div class="htp-flap top locked"><span class="flap-letter">E</span></div><div class="htp-seam locked"></div><div class="htp-flap bottom locked"><span class="flap-letter">E</span></div></div>
                  </div>

                  <span class="htp-word-divider">➔</span>

                  <!-- Word: THE -->
                  <div class="htp-puzzle-word">
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">T</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">T</span></div></div>
                    <div class="htp-cell-flap mini neutral"><div class="htp-flap top"><span class="flap-letter">H</span></div><div class="htp-seam"></div><div class="htp-flap bottom"><span class="flap-letter">H</span></div></div>
                    <div class="htp-cell-flap mini active-link"><div class="htp-flap top locked"><span class="flap-letter">E</span></div><div class="htp-seam locked"></div><div class="htp-flap bottom locked"><span class="flap-letter">E</span></div></div>
                  </div>
                </div>

                <div class="htp-rule-tag sync-tag">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <span>Solving 'E' in 'THE' reveals all 'E's in 'SEE'</span>
                </div>
              </div>
            </div>

            <div class="htp-info-box">
              <h3 class="htp-info-title">2. Spot Common Words & Patterns</h3>
              <p class="htp-info-text">
                Look for frequent words like <strong>THE</strong>, <strong>AND</strong>, or double letters like <strong>EE</strong>. In cryptograms, solving a letter in one word automatically fills it everywhere!
              </p>
            </div>
          </div>

          <!-- STEP 3: Complete Quote & Win -->
          <div class="htp-card" data-index="2">
            <div class="htp-visual-stage">
              <div class="htp-puzzle-step-box">
                <!-- Fully Decoded Quote Banner -->
                <div class="htp-completed-banner">
                  <div class="htp-solved-row">
                    <span class="htp-solved-word">I</span>
                    <span class="htp-solved-word">SEE</span>
                    <span class="htp-solved-word">THE</span>
                    <span class="htp-solved-word">SUN</span>
                  </div>
                  <span class="htp-solved-author">— PROVERB</span>
                </div>

                <div class="htp-rule-tag win-tag">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>QUOTE DECODED • PUZZLE SOLVED!</span>
                </div>
              </div>
            </div>

            <div class="htp-info-box">
              <h3 class="htp-info-title">3. Fill Blanks & Win</h3>
              <p class="htp-info-text">
                Use surrounding words to deduce the missing letters. Tap any tile and press <strong>▲ / ▼</strong> to cycle letters. Reveal the full quote and author to win!
              </p>
            </div>
          </div>

        </div>

        <!-- Footer Navigation Controls -->
        <footer class="htp-footer">
          <div class="htp-dots" id="htpcDots">
            <button class="htp-dot active" data-index="0" aria-label="Step 1"></button>
            <button class="htp-dot" data-index="1" aria-label="Step 2"></button>
            <button class="htp-dot" data-index="2" aria-label="Step 3"></button>
          </div>

          <div class="htp-actions">
            <button id="btnHtpPrev" class="btn-htp-nav" disabled aria-label="Previous step">PREV</button>
            <button id="btnHtpNext" class="btn-htp-action" aria-label="Next step">
              <span id="labelHtpAction">NEXT</span>
              <svg id="iconHtpNext" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </footer>
      </div>
    `;

    // Interactive Controller
    const carousel = document.getElementById('htpcCarousel');
    const tabs = document.querySelectorAll('.htp-tab');
    const dots = document.querySelectorAll('.htp-dot');
    const btnPrev = document.getElementById('btnHtpPrev');
    const btnNext = document.getElementById('btnHtpNext');
    const labelNext = document.getElementById('labelHtpAction');
    const iconNext = document.getElementById('iconHtpNext');
    let currentIndex = 0;

    const updateControls = (index) => {
      currentIndex = Math.max(0, Math.min(2, index));
      
      tabs.forEach((tab, idx) => {
        const isActive = idx === currentIndex;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentIndex);
      });

      if (btnPrev) {
        btnPrev.disabled = currentIndex === 0;
      }

      if (labelNext) {
        if (currentIndex === 2) {
          labelNext.textContent = 'START PLAYING';
          if (iconNext) iconNext.style.display = 'none';
        } else {
          labelNext.textContent = 'NEXT';
          if (iconNext) iconNext.style.display = 'inline-block';
        }
      }
    };

    const scrollToIndex = (index) => {
      if (!carousel) return;
      const cardWidth = carousel.clientWidth;
      carousel.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
      updateControls(index);
    };

    if (carousel) {
      let scrollTimeout;
      carousel.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const cardWidth = carousel.clientWidth || 1;
          const calculatedIndex = Math.round(carousel.scrollLeft / cardWidth);
          updateControls(calculatedIndex);
        }, 50);
      }, { passive: true });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetIdx = parseInt(tab.getAttribute('data-index'), 10) || 0;
        scrollToIndex(targetIdx);
        if (this.audio && this.storage?.isSoundEnabled?.()) this.audio.playClick?.();
      });
    });

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const targetIdx = parseInt(dot.getAttribute('data-index'), 10) || 0;
        scrollToIndex(targetIdx);
        if (this.audio && this.storage?.isSoundEnabled?.()) this.audio.playClick?.();
      });
    });

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (currentIndex > 0) {
          scrollToIndex(currentIndex - 1);
          if (this.audio && this.storage?.isSoundEnabled?.()) this.audio.playClick?.();
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (currentIndex < 2) {
          scrollToIndex(currentIndex + 1);
          if (this.audio && this.storage?.isSoundEnabled?.()) this.audio.playClick?.();
        } else {
          // Final slide: close modal
          if (this.audio && this.storage?.isSoundEnabled?.()) this.audio.playClick?.();
          this.close();
        }
      });
    }
  }

  renderAchievements() {
    this.titleEl.innerHTML = '';
    const data = this.storage ? this.storage.getAchievementsData() : { items: [], unlockedCount: 0, totalCount: 30, percentCompleted: 0 };
    const { items, unlockedCount, totalCount, percentCompleted } = data;

    // SVG Circular Progress Ring calculations:
    // radius = 32, circumference = 2 * PI * 32 ≈ 201.06
    const circumference = 201.06;
    const strokeDashoffset = circumference - (percentCompleted / 100) * circumference;

    const categories = [
      { id: 'all', label: 'ALL' },
      { id: 'campaign', label: 'CAMPAIGN' },
      { id: 'mastery', label: 'MASTERY' },
      { id: 'daily', label: 'DAILY' },
      { id: 'strategy', label: 'STRATEGY' },
      { id: 'time', label: 'TIME' },
      { id: 'mechanics', label: 'MECHANICS' }
    ];

    let currentFilter = 'all';

    const renderRows = (filter) => {
      const filtered = filter === 'all'
        ? items
        : items.filter(i => i.category === filter);

      if (filtered.length === 0) {
        return `
          <div class="achieve-empty-state">
            <span class="achieve-empty-icon">${Icons.trophy(32)}</span>
            <p>No achievements found</p>
          </div>
        `;
      }

      return filtered.map(item => {
        const renderIcon = (iconName, size = 18) => {
          if (Icons[iconName] && typeof Icons[iconName] === 'function') {
            return Icons[iconName](size);
          }
          return Icons.trophy(size);
        };

        const emblemIcon = item.isUnlocked
          ? renderIcon(item.icon, 18)
          : Icons.lock(16);

        const statusHtml = item.isUnlocked
          ? `<span class="achieve-status-badge unlocked" title="Completed">${Icons.check(14)}</span>`
          : `<span class="achieve-status-pill">${item.progressText}</span>`;

        const dateHtml = item.isUnlocked && item.dateText
          ? `<span class="achieve-card-date">• ${item.dateText}</span>`
          : '';

        return `
          <div class="achieve-card ${item.isUnlocked ? 'unlocked' : 'locked'}">
            <!-- Col 1: 38x38 Emblem Disc -->
            <div class="achieve-emblem-disc ${item.isUnlocked ? 'unlocked' : 'locked'}">
              ${emblemIcon}
            </div>

            <!-- Col 2: Title, Date, Description -->
            <div class="achieve-card-content">
              <div class="achieve-card-title-row">
                <span class="achieve-card-title">${item.name}</span>
                ${dateHtml}
              </div>
              <div class="achieve-card-desc">${item.desc}</div>
            </div>

            <!-- Col 3: Status / Progress -->
            <div class="achieve-card-action">
              ${statusHtml}
            </div>
          </div>
        `;
      }).join('');
    };

    this.bodyEl.innerHTML = `
      <div class="modal-achievements-container">
        <!-- 1. Hero Showcase Header (Top Center + Top Right Close) -->
        <div class="achieve-hero-header">
          <button id="achieveCloseBtn" class="achieve-close-btn" aria-label="Close Achievements" title="Close">
            ${Icons.close(20)}
          </button>

          <!-- Circular SVG Progress Ring with Trophy -->
          <div class="achieve-ring-wrapper">
            <svg class="achieve-ring-svg" viewBox="0 0 76 76" width="76" height="76">
              <circle class="achieve-ring-bg" cx="38" cy="38" r="32" />
              <circle
                class="achieve-ring-progress"
                cx="38"
                cy="38"
                r="32"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${strokeDashoffset}"
              />
            </svg>
            <div class="achieve-trophy-center">
              ${Icons.trophy(24)}
            </div>
          </div>

          <h2 class="achieve-hero-title">ACHIEVEMENTS</h2>
          <div class="achieve-summary-counter">
            <span class="achieve-summary-unlocked">${unlockedCount} / ${totalCount} Unlocked</span>
            <span class="achieve-summary-dot">•</span>
            <span class="achieve-summary-pct">${percentCompleted}% Completed</span>
          </div>
        </div>

        <!-- 2. Horizontal Filter Tabs Bar -->
        <div class="achieve-tabs-bar" id="achieveTabsBar">
          ${categories.map(cat => {
            const count = cat.id === 'all'
              ? unlockedCount
              : items.filter(i => i.category === cat.id && i.isUnlocked).length;
            const total = cat.id === 'all'
              ? totalCount
              : items.filter(i => i.category === cat.id).length;

            return `
              <button class="achieve-tab-pill ${cat.id === currentFilter ? 'active' : ''}" data-cat="${cat.id}">
                <span class="achieve-tab-label">${cat.label}</span>
                <span class="achieve-tab-count">${count}/${total}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- 3. Scrollable List of Achievement Rows -->
        <div class="achieve-rows-list" id="achieveRowsList">
          ${renderRows(currentFilter)}
        </div>
      </div>
    `;

    // Bind Close Button
    const closeBtn = this.bodyEl.querySelector('#achieveCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.close();
      });
    }

    // Bind Filter Tabs
    const tabsBar = this.bodyEl.querySelector('#achieveTabsBar');
    const rowsList = this.bodyEl.querySelector('#achieveRowsList');

    if (tabsBar && rowsList) {
      const tabBtns = tabsBar.querySelectorAll('.achieve-tab-pill');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const selectedCat = btn.getAttribute('data-cat');
          if (selectedCat === currentFilter) return;

          currentFilter = selectedCat;
          if (this.audio) this.audio.playClick();

          tabBtns.forEach(b => {
            const isMatch = b.getAttribute('data-cat') === selectedCat;
            b.classList.toggle('active', isMatch);
          });

          // Smoothly center the active tab in the horizontal strip
          const targetLeft = btn.offsetLeft - (tabsBar.clientWidth - btn.clientWidth) / 2;
          tabsBar.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });

          // Update achievement rows feed and reset vertical scroll to top
          rowsList.innerHTML = renderRows(currentFilter);
          rowsList.scrollTop = 0;
        });
      });
    }
  }

  showShopConfirmDialog({ title, message, confirmLabel = 'CONFIRM', onConfirm }) {
    let confirmOverlay = this.containerEl.querySelector('.drawer-confirm-overlay');
    if (!confirmOverlay) {
      confirmOverlay = document.createElement('div');
      confirmOverlay.className = 'drawer-confirm-overlay';
      this.containerEl.appendChild(confirmOverlay);
    }
    confirmOverlay.innerHTML = `
      <div class="drawer-confirm-box">
        <h4 class="drawer-confirm-title">${title}</h4>
        <p class="drawer-confirm-msg">${message.replace(/\n/g, '<br>')}</p>
        <div class="drawer-confirm-actions">
          <button class="btn-confirm-ok">${confirmLabel}</button>
          <button class="btn-confirm-cancel">CANCEL</button>
        </div>
      </div>
    `;
    confirmOverlay.classList.add('visible');

    const okBtn = confirmOverlay.querySelector('.btn-confirm-ok');
    const cancelBtn = confirmOverlay.querySelector('.btn-confirm-cancel');

    const removeDialog = () => {
      confirmOverlay.classList.remove('visible');
      setTimeout(() => confirmOverlay.remove(), 200);
    };

    okBtn.onclick = () => {
      removeDialog();
      if (onConfirm) onConfirm();
    };
    cancelBtn.onclick = () => {
      removeDialog();
    };
  }

  showShopPopup({ title, message, buttonText = 'OK' }) {
    let confirmOverlay = this.containerEl.querySelector('.drawer-confirm-overlay');
    if (!confirmOverlay) {
      confirmOverlay = document.createElement('div');
      confirmOverlay.className = 'drawer-confirm-overlay';
      this.containerEl.appendChild(confirmOverlay);
    }
    confirmOverlay.innerHTML = `
      <div class="drawer-confirm-box">
        <h4 class="drawer-confirm-title">${title}</h4>
        <p class="drawer-confirm-msg">${message.replace(/\n/g, '<br>')}</p>
        <div class="drawer-confirm-actions single">
          <button class="btn-confirm-ok">${buttonText}</button>
        </div>
      </div>
    `;
    confirmOverlay.classList.add('visible');

    const okBtn = confirmOverlay.querySelector('.btn-confirm-ok');
    okBtn.onclick = () => {
      confirmOverlay.classList.remove('visible');
      setTimeout(() => confirmOverlay.remove(), 200);
    };
  }

  renderShop() {
    this.titleEl.innerHTML = `${Icons.shop(20)} <span>SHOP</span>`;

    if (this.shopTickerInterval) {
      clearInterval(this.shopTickerInterval);
      this.shopTickerInterval = null;
    }

    const updateShopView = () => {
      const cooldown = this.storage ? this.storage.getFreeHintCooldown() : { canClaim: true, remainingSeconds: 0 };
      const hasNoAds = this.storage ? this.storage.hasRemovedAds() : false;
      const priceRemoveAds = IAPService.getPrice(IAP_PRODUCTS.REMOVE_ADS.id) || '$4.90';
      const priceHints25 = IAPService.getPrice(IAP_PRODUCTS.HINTS_25.id) || '$2.45';
      const priceHints50 = IAPService.getPrice(IAP_PRODUCTS.HINTS_50.id) || '$4.90';

      const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      this.bodyEl.innerHTML = `
        <div class="shop-list">
          <!-- 1. Free Daily Hint -->
          <div class="shop-row">
            <div class="shop-row-left">
              <div class="shop-row-icon">
                ${Icons.gift(20)}
              </div>
              <div class="shop-row-info">
                <span class="shop-row-title">1 Free Hint</span>
                <span class="shop-row-desc">
                  ${cooldown.canClaim 
                    ? 'Available every 24 hours'
                    : `Next in <span class="shop-countdown-pill" id="freeHintCountdown">${formatTime(cooldown.remainingSeconds)}</span>`
                  }
                </span>
              </div>
            </div>
            <div class="shop-row-right">
              <button id="btnClaimFreeHint" class="btn-shop-pill ${cooldown.canClaim ? 'ready' : 'disabled'}" ${cooldown.canClaim ? '' : 'disabled'}>
                ${cooldown.canClaim ? 'FREE' : '24H'}
              </button>
            </div>
          </div>

          <!-- 2. Remove Ads -->
          <div class="shop-row">
            <div class="shop-row-left">
              <div class="shop-row-icon">
                ${Icons.ban(20)}
              </div>
              <div class="shop-row-info">
                <span class="shop-row-title">Remove Ads</span>
                <span class="shop-row-desc">Permanently disable banner ads & intermissions</span>
              </div>
            </div>
            <div class="shop-row-right">
              <button id="btnRemoveAds" class="btn-shop-pill ${hasNoAds ? 'purchased' : ''}" ${hasNoAds ? 'disabled' : ''}>
                ${hasNoAds ? 'ACTIVE' : priceRemoveAds}
              </button>
            </div>
          </div>

          <!-- 3. 25 Hints Pack -->
          <div class="shop-row">
            <div class="shop-row-left">
              <div class="shop-row-icon">
                ${Icons.bolt(20)}
              </div>
              <div class="shop-row-info">
                <span class="shop-row-title">25 Hints Pack</span>
                <span class="shop-row-desc">Letter decryption assists</span>
              </div>
            </div>
            <div class="shop-row-right">
              <button id="btnBuyHints25" class="btn-shop-pill">${priceHints25}</button>
            </div>
          </div>

          <!-- 4. 50 Hints Pack -->
          <div class="shop-row">
            <div class="shop-row-left">
              <div class="shop-row-icon">
                ${Icons.sparkles(20)}
              </div>
              <div class="shop-row-info">
                <span class="shop-row-title">50 Hints Pack</span>
                <span class="shop-row-desc">Generous boost for marathon solves</span>
              </div>
            </div>
            <div class="shop-row-right">
              <button id="btnBuyHints50" class="btn-shop-pill highlight">${priceHints50}</button>
            </div>
          </div>
        </div>
      `;

      // Event handlers
      const btnClaim = document.getElementById('btnClaimFreeHint');
      if (btnClaim && cooldown.canClaim) {
        btnClaim.onclick = () => {
          const res = this.storage.claimFreeHint();
          if (res.success) {
            if (this.audio) this.audio.playVictoryFanfare();
            this.showShopPopup({
              title: "Free Daily Hint Claimed!",
              message: "1 Hint has been added to your inventory. Check back in 24 hours for another free supply!",
              buttonText: "NICE!"
            });
            updateShopView();
            if (this.onHintInventoryChanged) {
              this.onHintInventoryChanged(res.balance);
            }
          }
        };
      }

      const btnRemoveAds = document.getElementById('btnRemoveAds');
      if (btnRemoveAds && !hasNoAds) {
        btnRemoveAds.onclick = async () => {
          try {
            const res = await IAPService.purchase(IAP_PRODUCTS.REMOVE_ADS.id);
            if (res && res.success) {
              this.showShopPopup({
                title: "Ads Removed!",
                message: "All advertisements disabled permanently. Enjoy pure mechanical split-flap decryption!",
                buttonText: "CONTINUE"
              });
              updateShopView();
            }
          } catch (err) {
            console.error('[Shop] Remove Ads purchase error:', err);
          }
        };
      }

      const btnBuy25 = document.getElementById('btnBuyHints25');
      if (btnBuy25) {
        btnBuy25.onclick = async () => {
          try {
            const res = await IAPService.purchase(IAP_PRODUCTS.HINTS_25.id);
            if (res && res.success) {
              const currentBal = this.storage ? this.storage.getHintBalance() : 25;
              this.showShopPopup({
                title: "25 Hints Added!",
                message: `Your balance is now ${currentBal} hints. Use them anytime to decrypt tough cipher letters!`,
                buttonText: "EXCELLENT"
              });
              updateShopView();
              if (this.onHintInventoryChanged) {
                this.onHintInventoryChanged(currentBal);
              }
            }
          } catch (err) {
            console.error('[Shop] 25 Hints purchase error:', err);
          }
        };
      }

      const btnBuy50 = document.getElementById('btnBuyHints50');
      if (btnBuy50) {
        btnBuy50.onclick = async () => {
          try {
            const res = await IAPService.purchase(IAP_PRODUCTS.HINTS_50.id);
            if (res && res.success) {
              const currentBal = this.storage ? this.storage.getHintBalance() : 50;
              this.showShopPopup({
                title: "50 Hints Added!",
                message: `Your balance is now ${currentBal} hints. Ready for extended cryptographic decoding!`,
                buttonText: "LET'S PLAY"
              });
              updateShopView();
              if (this.onHintInventoryChanged) {
                this.onHintInventoryChanged(currentBal);
              }
            }
          } catch (err) {
            console.error('[Shop] 50 Hints purchase error:', err);
          }
        };
      }
    };

    updateShopView();

    // Start live countdown ticker
    this.shopTickerInterval = setInterval(() => {
      const countdownEl = document.getElementById('freeHintCountdown');
      const cooldown = this.storage ? this.storage.getFreeHintCooldown() : { canClaim: true, remainingSeconds: 0 };
      if (countdownEl) {
        if (cooldown.canClaim) {
          updateShopView();
        } else {
          const h = Math.floor(cooldown.remainingSeconds / 3600);
          const m = Math.floor((cooldown.remainingSeconds % 3600) / 60);
          const s = cooldown.remainingSeconds % 60;
          countdownEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
      }
    }, 1000);
  }

  renderStats() {
    this.titleEl.innerHTML = `${Icons.stats(20)} <span>STATISTICS</span>`;
    const stats = this.storage ? this.storage.getStats() : {};
    const daily = this.storage ? this.storage.getDailyState() : {};
    const solvedCount = this.storage ? this.storage.getCompletedLevelsCount() : 0;

    const wordsSolved = stats.wordsSolved || 0;
    const lettersSolved = stats.lettersSolved || 0;
    const dailyCompleted = daily.totalCompleted || 0;
    const longestStreak = daily.maxStreak || 0;
    const currentStreak = daily.currentStreak || 0;
    const flapRotations = stats.flapsRotated || 0;
    const hintsUsed = stats.hintsUsed || 0;
    const flawlessSolves = stats.flawlessLevels || 0;

    const formatMMSS = (sec) => {
      if (sec === null || sec === undefined || sec <= 0) return '--:--';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const formatPlayDuration = (totalSec) => {
      if (!totalSec || totalSec <= 0) return '0 min';
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m ${totalSec % 60}s`;
    };

    const bestTimeDisplay = formatMMSS(stats.bestLevelTimeSeconds);
    const avgTimeDisplay = formatMMSS(this.storage ? this.storage.getAverageLevelTimeSeconds() : 0);
    const totalTimeDisplay = formatPlayDuration(stats.totalSecondsPlayed || 0);

      this.bodyEl.innerHTML = `
      <div class="stats-list">
        <!-- 1. Levels Solved -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.trophy(20)}</span>
            <span class="stat-row-label">Levels Solved</span>
          </div>
          <span class="stat-row-val">${solvedCount}</span>
        </div>

        <!-- 2. Words Solved -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.word(20)}</span>
            <span class="stat-row-label">Words Solved</span>
          </div>
          <span class="stat-row-val">${wordsSolved}</span>
        </div>

        <!-- 3. Letters Solved -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.letter(20)}</span>
            <span class="stat-row-label">Letters Solved</span>
          </div>
          <span class="stat-row-val">${lettersSolved}</span>
        </div>

        <!-- 4. Daily Challenges Completed -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.checkCircle(20)}</span>
            <span class="stat-row-label">Dailies Solved</span>
          </div>
          <span class="stat-row-val">${dailyCompleted}</span>
        </div>

        <!-- 5. Best Level Time -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.timerFast(20)}</span>
            <span class="stat-row-label">Best Solve Time</span>
          </div>
          <span class="stat-row-val font-mono">${bestTimeDisplay}</span>
        </div>

        <!-- 6. Average Time -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.clock(20)}</span>
            <span class="stat-row-label">Average Time</span>
          </div>
          <span class="stat-row-val font-mono">${avgTimeDisplay}</span>
        </div>

        <!-- 7. Longest Win Streak -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.flame(20)}</span>
            <span class="stat-row-label">Longest Streak</span>
          </div>
          <span class="stat-row-val">${longestStreak} <span class="stat-row-unit">DAYS</span></span>
        </div>

        <!-- 8. Flap Rotations -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.rotate(20)}</span>
            <span class="stat-row-label">Flap Rotations</span>
          </div>
          <span class="stat-row-val">${flapRotations}</span>
        </div>

        <!-- 9. Flawless Solves -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.flawlessShield(20)}</span>
            <span class="stat-row-label">Flawless (0 Hints)</span>
          </div>
          <span class="stat-row-val">${flawlessSolves}</span>
        </div>

        <!-- 10. Lifetime Hints Used -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.bulbRays(20)}</span>
            <span class="stat-row-label">Hints Used</span>
          </div>
          <span class="stat-row-val">${hintsUsed}</span>
        </div>

        <!-- 11. Total Play Time -->
        <div class="stat-row">
          <div class="stat-row-left">
            <span class="stat-row-icon">${Icons.clock(20)}</span>
            <span class="stat-row-label">Total Time Played</span>
          </div>
          <span class="stat-row-val font-mono">${totalTimeDisplay}</span>
        </div>
      </div>
    `;
  }

  renderReturnHome(onConfirm) {
    this.titleEl.innerHTML = `${Icons.home(20)} <span>RETURN TO HOME</span>`;
    this.bodyEl.innerHTML = `
      <div style="text-align: center; padding: 8px 0;">
        <p style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: #F3EDE2; margin-bottom: 8px; letter-spacing: 0.02em;">
          Leave current puzzle?
        </p>
        <p style="font-family: var(--font-ui); font-size: 0.9rem; color: #7B9487; margin-bottom: 22px;">
          Your flap positions and progress are saved automatically.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="btnResumeGame" class="btn-primary-campaign" style="height: 48px;">
            <span class="btn-icon">${Icons.play(16)}</span>
            <span class="btn-main-label" style="font-size: 1.05rem;">RESUME PUZZLE</span>
          </button>
          <button id="btnConfirmHome" class="btn-secondary-home" style="height: 48px; background: #182620; border-color: #2D4438;">
            <span class="btn-icon">${Icons.home(18)}</span>
            <span class="btn-label" style="font-size: 0.95rem;">RETURN TO MAIN MENU</span>
          </button>
        </div>
      </div>
    `;

    const resumeBtn = document.getElementById('btnResumeGame');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    const homeBtn = document.getElementById('btnConfirmHome');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        this.close();
        if (onConfirm) {
          onConfirm();
        }
      });
    }
  }

  renderResetLevel(onConfirm) {
    this.titleEl.innerHTML = `${Icons.restart(20)} <span>RESET PUZZLE</span>`;
    this.bodyEl.innerHTML = `
      <div style="text-align: center; padding: 8px 0;">
        <p style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: #F3EDE2; margin-bottom: 8px; letter-spacing: 0.02em;">
          Reset this puzzle?
        </p>
        <p style="font-family: var(--font-ui); font-size: 0.9rem; color: #7B9487; margin-bottom: 22px;">
          All rotated flaps will be cleared back to starting clue state.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="btnConfirmResetLevel" class="btn-primary-campaign" style="height: 48px; background: linear-gradient(135deg, #d97706 0%, #b45309 100%);">
            <span class="btn-icon">${Icons.restart(18)}</span>
            <span class="btn-main-label" style="font-size: 1.05rem;">RESET ALL FLAPS</span>
          </button>
          <button id="btnCancelResetLevel" class="btn-secondary-home" style="height: 48px; background: #182620; border-color: #2D4438;">
            <span class="btn-label" style="font-size: 0.95rem;">CANCEL</span>
          </button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btnConfirmResetLevel');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.close();
        if (onConfirm) {
          onConfirm();
        }
      });
    }

    const cancelBtn = document.getElementById('btnCancelResetLevel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.close();
      });
    }
  }

  renderLevelComplete(options = {}) {
    const {
      level,
      levelIndex,
      nextLevelIndex,
      hasNextLevel,
      mode = 'campaign',
      hintsUsed = 0,
      elapsedSeconds = 0,
      totalLetters = 0,
      dailyStreak = 1,
      dailyDisplayDate = '',
      onNextLevel,
      onLevelSelect,
      onHome
    } = options;

    if (!level) return;

    if (this.containerEl) {
      this.containerEl.classList.add('modal-victory');
    }

    const isDaily = mode === 'daily';
    const category = level.category || 'Quotes';
    const catUpper = category.toUpperCase();
    const catTotal = LEVEL_DATA.filter(l => (l.category || 'Quotes') === category).length;
    const tierClean = (level.tier || 'Beginner').replace(/Tier \d+:\s*/i, '').toUpperCase();

    // Time formatting MM:SS
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    // Category progress count & percentage
    const catLevels = LEVEL_DATA.filter(l => (l.category || 'Quotes') === category);
    const catSolvedCount = catLevels.filter(l => this.storage && this.storage.isLevelCompleted(l.id - 1)).length;
    const catPct = Math.min(100, Math.round((catSolvedCount / catTotal) * 100));

    // Category badge text
    const badgeCategoryText = isDaily
      ? `${dailyDisplayDate || 'TODAY'} • ${catUpper}`
      : `${catUpper} ${level.num} OF ${catTotal}`;

    // Difficulty score for the circular arc
    const rawDiff = parseFloat(level.diff) || 1.0;
    const diffDisplay = rawDiff.toFixed(1);

    // Dynamic segment ticks generation (up to 30 visible ticks representing the category progress)
    const tickCount = 28;
    const activeTicks = Math.round((catSolvedCount / catTotal) * tickCount);
    const tickElements = Array.from({ length: tickCount }, (_, i) => {
      const isActive = i < activeTicks;
      return `<div class="mockup-progress-tick ${isActive ? 'active' : ''}"></div>`;
    }).join('');

    const authorText = (level.author || '').trim();
    const authorHtml = authorText ? `<div class="mockup-quote-author">— ${authorText}</div>` : '';

    // Hints display
    const hintsValHtml = hintsUsed === 0
      ? `<span class="mockup-stat-val text-gold">0 <span class="flawless-tag">★ FLAWLESS</span></span>`
      : `<span class="mockup-stat-val">${hintsUsed}</span>`;

    // Clear standard title container (trophy badge sits elevated on top of modal container)
    this.titleEl.innerHTML = '';

    this.bodyEl.innerHTML = `
      <div class="mockup-victory-panel">
        <!-- 1. Floating Golden Laurel Trophy Emblem -->
        <div class="mockup-trophy-anchor">
          <div class="mockup-trophy-disc">
            ${Icons.laurelTrophy(64)}
          </div>
        </div>

        <!-- 2. Header & Title -->
        <div class="mockup-victory-header">
          <h2 class="mockup-victory-title">LEVEL COMPLETED</h2>
          <div class="mockup-pills-row">
            <span class="mockup-pill mockup-pill-cat">${badgeCategoryText}</span>
            <span class="mockup-pill mockup-pill-tier">${tierClean}</span>
          </div>
        </div>

        <!-- 3. Decoded Quote Showcase Box -->
        <div class="mockup-quote-box">
          <div class="mockup-quote-mark" aria-hidden="true">“</div>
          <blockquote class="mockup-quote-text">${level.quote}</blockquote>
          ${authorHtml}
        </div>

        <!-- 4. Middle Dashboard: Performance Metrics -->
        <div class="mockup-middle-dashboard">
          <div class="mockup-stats-column">
            <!-- Row 1: Time -->
            <div class="mockup-stat-row">
              <div class="mockup-stat-left">
                <span class="mockup-stat-icon text-muted">${Icons.clock(17)}</span>
                <span class="mockup-stat-label">TIME</span>
              </div>
              <span class="mockup-stat-val">${timeStr}</span>
            </div>

            <!-- Row 2: Hints -->
            <div class="mockup-stat-row">
              <div class="mockup-stat-left">
                <span class="mockup-stat-icon text-amber">${Icons.bulbRays(18)}</span>
                <span class="mockup-stat-label">HINTS</span>
              </div>
              ${hintsValHtml}
            </div>

            <!-- Row 3: Letters Solved -->
            <div class="mockup-stat-row">
              <div class="mockup-stat-left">
                <span class="mockup-stat-icon text-emerald">${Icons.checkCircle(17)}</span>
                <span class="mockup-stat-label">LETTERS SOLVED</span>
              </div>
              <span class="mockup-stat-val">${totalLetters}</span>
            </div>
          </div>
        </div>

        <!-- 5. Category Progress & Segmented Bar -->
        <div class="mockup-progress-section">
          <div class="mockup-progress-header">
            <span class="mockup-prog-name">${catUpper} PROGRESS</span>
            <span class="mockup-prog-stats">${catSolvedCount} / ${catTotal} • ${catPct}%</span>
          </div>
          <div class="mockup-progress-ticks-track">
            ${tickElements}
          </div>
        </div>

        <!-- 6. Ergonomic 3-Button Action Dock -->
        <div class="mockup-action-dock">
          <!-- Left: Circular Button (Level Select for campaign, Daily Calendar for daily) -->
          <button id="btnVictorySelect" class="mockup-btn-circle" title="${isDaily ? 'Daily Calendar Archive' : 'Level Select'}" aria-label="${isDaily ? 'Daily Calendar Archive' : 'Level Select'}">
            ${isDaily ? Icons.calendar(20) : Icons.gridFourDots(20)}
          </button>

          <!-- Center: Primary Glowing Next Level Pill Button -->
          ${!isDaily ? `
            <button id="btnVictoryNext" class="mockup-btn-pill-primary">
              <span>${hasNextLevel ? 'NEXT LEVEL' : 'CAMPAIGN FINISHED'}</span>
              ${Icons.arrowRight(18)}
            </button>
          ` : `
            <button id="btnVictoryHome" class="mockup-btn-pill-primary">
              <span>RETURN TO MENU</span>
              ${Icons.arrowRight(18)}
            </button>
          `}

          <!-- Right: Circular Main Menu Button -->
          <button id="btnVictoryHomeAlt" class="mockup-btn-circle" title="Main Menu" aria-label="Main Menu">
            ${Icons.home(20)}
          </button>
        </div>
      </div>
    `;

    // Event Wireup
    const btnNext = document.getElementById('btnVictoryNext');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.close();
        if (this.audio) this.audio.playClick();
        if (hasNextLevel && onNextLevel) {
          onNextLevel(nextLevelIndex);
        } else if (!hasNextLevel && onLevelSelect) {
          onLevelSelect();
        }
      });
    }

    const btnSelect = document.getElementById('btnVictorySelect');
    if (btnSelect) {
      btnSelect.addEventListener('click', () => {
        this.close();
        if (this.audio) this.audio.playClick();
        if (isDaily) {
          if (options.onDailyCalendar) {
            options.onDailyCalendar();
          } else {
            this.open('dailyCalendar', {
              onStartDailyGame: options.onStartDailyGame
            });
          }
        } else if (onLevelSelect) {
          onLevelSelect();
        }
      });
    }

    const btnHome = document.getElementById('btnVictoryHome');
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        this.close();
        if (this.audio) this.audio.playClick();
        if (onHome) onHome();
      });
    }

    const btnHomeAlt = document.getElementById('btnVictoryHomeAlt');
    if (btnHomeAlt) {
      btnHomeAlt.addEventListener('click', () => {
        this.close();
        if (this.audio) this.audio.playClick();
        if (onHome) onHome();
      });
    }
  }

  renderLevelSelect(options = {}) {
    const completedCount = this.storage ? this.storage.getCompletedLevelsCount() : 0;
    const currentIdx = this.storage ? this.storage.getCurrentLevel() : 0;
    const totalLevels = LEVEL_DATA.length;

    this.titleEl.innerHTML = `${Icons.grid(20)} <span>LEVEL SELECT</span>`;

    const categoryTabs = [
      { id: 'Quotes', label: 'QUOTES', count: LEVEL_DATA.filter(l => (l.category || 'Quotes') === 'Quotes').length },
      { id: 'Proverbs', label: 'PROVERBS', count: LEVEL_DATA.filter(l => l.category === 'Proverbs').length },
      { id: 'Riddles', label: 'RIDDLES', count: LEVEL_DATA.filter(l => l.category === 'Riddles').length },
      { id: 'Movie Lines', label: 'MOVIE LINES', count: LEVEL_DATA.filter(l => l.category === 'Movie Lines').length },
      { id: 'Trivia', label: 'TRIVIA', count: LEVEL_DATA.filter(l => l.category === 'Trivia').length },
      { id: 'Wordplay', label: 'WORDPLAY', count: LEVEL_DATA.filter(l => l.category === 'Wordplay').length }
    ];

    const sectionsMeta = [
      { id: 'Quotes-Beginner', category: 'Quotes', label: 'QUOTES — BEGINNER', filter: l => (l.category || 'Quotes') === 'Quotes' && l.tier === 'Tier 1: Beginner' },
      { id: 'Quotes-Intermediate', category: 'Quotes', label: 'QUOTES — INTERMEDIATE', filter: l => (l.category || 'Quotes') === 'Quotes' && l.tier === 'Tier 2: Intermediate' },
      { id: 'Quotes-Advanced', category: 'Quotes', label: 'QUOTES — ADVANCED', filter: l => (l.category || 'Quotes') === 'Quotes' && l.tier === 'Tier 3: Advanced' },
      { id: 'Quotes-Master', category: 'Quotes', label: 'QUOTES — MASTER', filter: l => (l.category || 'Quotes') === 'Quotes' && l.tier === 'Tier 4: Master' },
      { id: 'Proverbs-Beginner', category: 'Proverbs', label: 'PROVERBS — BEGINNER', filter: l => l.category === 'Proverbs' && l.tier === 'Tier 1: Beginner' },
      { id: 'Proverbs-Intermediate', category: 'Proverbs', label: 'PROVERBS — INTERMEDIATE', filter: l => l.category === 'Proverbs' && l.tier === 'Tier 2: Intermediate' },
      { id: 'Proverbs-Advanced', category: 'Proverbs', label: 'PROVERBS — ADVANCED', filter: l => l.category === 'Proverbs' && l.tier === 'Tier 3: Advanced' },
      { id: 'Proverbs-Master', category: 'Proverbs', label: 'PROVERBS — MASTER', filter: l => l.category === 'Proverbs' && l.tier === 'Tier 4: Master' },
      { id: 'Riddles-Beginner', category: 'Riddles', label: 'RIDDLES — BEGINNER', filter: l => l.category === 'Riddles' && l.tier === 'Tier 1: Beginner' },
      { id: 'Riddles-Intermediate', category: 'Riddles', label: 'RIDDLES — INTERMEDIATE', filter: l => l.category === 'Riddles' && l.tier === 'Tier 2: Intermediate' },
      { id: 'Riddles-Advanced', category: 'Riddles', label: 'RIDDLES — ADVANCED', filter: l => l.category === 'Riddles' && l.tier === 'Tier 3: Advanced' },
      { id: 'Riddles-Master', category: 'Riddles', label: 'RIDDLES — MASTER', filter: l => l.category === 'Riddles' && l.tier === 'Tier 4: Master' },
      { id: 'Movie Lines-Beginner', category: 'Movie Lines', label: 'MOVIE LINES — BEGINNER', filter: l => l.category === 'Movie Lines' && l.tier === 'Tier 1: Beginner' },
      { id: 'Movie Lines-Intermediate', category: 'Movie Lines', label: 'MOVIE LINES — INTERMEDIATE', filter: l => l.category === 'Movie Lines' && l.tier === 'Tier 2: Intermediate' },
      { id: 'Movie Lines-Advanced', category: 'Movie Lines', label: 'MOVIE LINES — ADVANCED', filter: l => l.category === 'Movie Lines' && l.tier === 'Tier 3: Advanced' },
      { id: 'Movie Lines-Master', category: 'Movie Lines', label: 'MOVIE LINES — MASTER', filter: l => l.category === 'Movie Lines' && l.tier === 'Tier 4: Master' },
      { id: 'Trivia-Beginner', category: 'Trivia', label: 'TRIVIA — BEGINNER', filter: l => l.category === 'Trivia' && l.tier === 'Tier 1: Beginner' },
      { id: 'Trivia-Intermediate', category: 'Trivia', label: 'TRIVIA — INTERMEDIATE', filter: l => l.category === 'Trivia' && l.tier === 'Tier 2: Intermediate' },
      { id: 'Trivia-Advanced', category: 'Trivia', label: 'TRIVIA — ADVANCED', filter: l => l.category === 'Trivia' && l.tier === 'Tier 3: Advanced' },
      { id: 'Trivia-Master', category: 'Trivia', label: 'TRIVIA — MASTER', filter: l => l.category === 'Trivia' && l.tier === 'Tier 4: Master' },
      { id: 'Wordplay-Beginner', category: 'Wordplay', label: 'WORDPLAY — BEGINNER', filter: l => l.category === 'Wordplay' && l.tier === 'Tier 1: Beginner' },
      { id: 'Wordplay-Intermediate', category: 'Wordplay', label: 'WORDPLAY — INTERMEDIATE', filter: l => l.category === 'Wordplay' && l.tier === 'Tier 2: Intermediate' },
      { id: 'Wordplay-Advanced', category: 'Wordplay', label: 'WORDPLAY — ADVANCED', filter: l => l.category === 'Wordplay' && l.tier === 'Tier 3: Advanced' },
      { id: 'Wordplay-Master', category: 'Wordplay', label: 'WORDPLAY — MASTER', filter: l => l.category === 'Wordplay' && l.tier === 'Tier 4: Master' }
    ];

    const currentLevelObj = LEVEL_DATA[currentIdx] || LEVEL_DATA[0];
    const activeLevelCategory = currentLevelObj.category || 'Quotes';

    let currentFilter = this.activeLevelFilter && this.activeLevelFilter !== 'ALL'
      ? this.activeLevelFilter
      : activeLevelCategory;

    if (!categoryTabs.some(t => t.id === currentFilter)) {
      currentFilter = 'Quotes';
    }

    const renderGrid = () => {
      const sectionsToRender = sectionsMeta.filter(s => s.category === currentFilter);

      const gridHtml = sectionsToRender.map(sec => {
        const levels = LEVEL_DATA.filter(sec.filter);
        if (!levels.length) return '';
        const solvedInTier = levels.filter(l => this.storage && this.storage.isLevelCompleted(l.id - 1)).length;

        return `
          <div class="tier-section">
            <div class="tier-section-header">
              <span class="tier-section-title">${sec.label}</span>
              <span class="tier-section-meta">${solvedInTier}/${levels.length} SOLVED</span>
            </div>
            <div class="level-grid">
              ${levels.map(l => {
                const idx = l.id - 1;
                const isSolved = this.storage ? this.storage.isLevelCompleted(idx) : false;
                const isInProgress = this.storage ? this.storage.hasLevelInProgress(idx) : false;
                const isCurrent = idx === currentIdx;

                let cardClasses = 'level-card';
                if (isSolved) cardClasses += ' solved';
                else if (isCurrent) cardClasses += ' current';
                else if (isInProgress) cardClasses += ' in-progress';

                return `
                  <div class="${cardClasses}" data-index="${idx}" role="button" tabindex="0" aria-label="${l.category || 'Quotes'} ${l.num}">
                    ${isSolved ? `<div class="level-card-badge-solved">${Icons.check(14)}</div>` : ''}
                    ${!isSolved && isInProgress ? `<div class="level-card-badge-progress" title="Saved Midway Progress">●</div>` : ''}
                    <span class="level-card-num">${l.num}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');

      return gridHtml;
    };

    // Render the container and tabs ONCE so horizontal scroll state is never destroyed
    this.bodyEl.innerHTML = `
      <div class="modal-level-select-container">
        <div class="modal-level-select-tabs" id="modalLevelTabs">
          ${categoryTabs.map(t => `
            <button class="tier-tab-btn ${currentFilter === t.id ? 'active' : ''}" data-cat="${t.id}">
              <span>${t.label}</span>
              <span class="tier-tab-count">(${t.count})</span>
            </button>
          `).join('')}
        </div>
        <div class="modal-level-select-grid" id="modalLevelGrid">
          ${renderGrid()}
        </div>
      </div>
    `;

    const tabsEl = this.bodyEl.querySelector('#modalLevelTabs');
    const gridEl = this.bodyEl.querySelector('#modalLevelGrid');

    const bindCardClicks = () => {
      if (!gridEl) return;
      gridEl.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.getAttribute('data-index'), 10);
          if (this.audio) this.audio.playClick();
          this.close();
          if (options.onSelectLevel) {
            options.onSelectLevel(idx);
          }
        });
      });
    };

    bindCardClicks();

    if (tabsEl) {
      tabsEl.querySelectorAll('.tier-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-cat');
          if (currentFilter !== cat) {
            currentFilter = cat;
            this.activeLevelFilter = cat;
            if (this.audio) this.audio.playClick();

            // Toggle active classes in place without destroying tabsEl or resetting scroll position
            tabsEl.querySelectorAll('.tier-tab-btn').forEach(b => {
              b.classList.toggle('active', b.getAttribute('data-cat') === currentFilter);
            });

            // Smoothly keep the selected tab visible if at edge
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

            // Update only grid contents and reset grid scroll to top
            if (gridEl) {
              gridEl.innerHTML = renderGrid();
              gridEl.scrollTop = 0;
              bindCardClicks();
            }
          }
        });
      });
    }

    // On initial mount, scroll to current active level and scroll active tab into view
    setTimeout(() => {
      if (tabsEl) {
        const activeTabBtn = tabsEl.querySelector(`.tier-tab-btn[data-cat="${currentFilter}"]`);
        if (activeTabBtn) {
          const targetLeft = activeTabBtn.offsetLeft - (tabsEl.clientWidth - activeTabBtn.clientWidth) / 2;
          tabsEl.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
        }
      }
      const currentEl = gridEl ? gridEl.querySelector('.level-card.current') : null;
      if (currentEl) {
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  }

  renderDailyCalendar(options = {}) {
    this.titleEl.innerHTML = `${Icons.calendar(20)} <span>DAILY CHALLENGE</span>`;

    const calData = DailyChallengeService.getMonthCalendarData(2026, 9); // October 2026
    const completedDates = this.storage ? this.storage.getDailyCompletedDates() : {};
    const todayStr = DailyChallengeService.getDateStr();

    const playableCells = calData.cells.filter(c => c.isPlayable);
    const solvedCount = playableCells.filter(c => completedDates[c.dateStr]).length;

    let selectedDateStr = options.dateStr || todayStr;

    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const render = () => {
      const selectedCell = calData.cells.find(c => c.dateStr === selectedDateStr) || playableCells[0];
      const isSelectedSolved = Boolean(completedDates[selectedDateStr]);
      const level = selectedCell ? selectedCell.levelInfo.level : null;
      const isPlayable = selectedCell ? selectedCell.isPlayable : false;

      const dateObj = selectedCell ? selectedCell.dayDate : new Date();
      const fullDateLabel = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase();

      this.bodyEl.innerHTML = `
        <div class="calendar-archive-container">
          <div class="calendar-month-bar">
            <span class="calendar-month-title">${calData.monthName} ${calData.yearLabel}</span>
            <span class="calendar-month-subtitle">${solvedCount} / ${playableCells.length} SOLVED</span>
          </div>

          <div class="calendar-weekdays-row">
            ${weekdays.map(w => `<span>${w}</span>`).join('')}
          </div>

          <div class="calendar-grid">
            ${calData.cells.map(cell => {
              if (cell.isPadding) {
                return `<div class="calendar-cell is-padding"></div>`;
              }

              const isSolved = Boolean(completedDates[cell.dateStr]);
              const isSelected = (cell.dateStr === selectedDateStr);

              let classes = 'calendar-cell';
              if (cell.isPlayable) classes += ' is-playable';
              if (cell.isToday) classes += ' is-today';
              if (isSolved) classes += ' is-solved';
              if (cell.isFuture) classes += ' is-locked';
              if (isSelected) classes += ' is-selected';

              return `
                <div class="${classes}" data-date="${cell.dateStr}" role="button" tabindex="0" aria-label="Day ${cell.dayNum}">
                  ${cell.isToday ? `<span class="calendar-today-micro">TODAY</span>` : ''}
                  <span class="calendar-day-num">${cell.dayNum}</span>
                  ${isSolved ? `<span class="calendar-cell-check">${Icons.check(11)}</span>` : ''}
                  ${cell.isFuture ? `<span class="calendar-cell-lock">${Icons.lock(11)}</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>

          ${selectedCell && level ? `
            <div class="calendar-inspector-card">
              <div class="calendar-inspector-header">
                <span class="calendar-inspector-date">${fullDateLabel}</span>
                <span class="calendar-inspector-badge ${isSelectedSolved ? 'solved' : 'unsolved'}">
                  ${isSelectedSolved ? 'COMPLETED' : 'UNSOLVED'}
                </span>
              </div>
              <div class="calendar-inspector-meta">
                <span class="calendar-inspector-cat">${level.category || 'Quotes'}</span>
                <span>•</span>
                <span>${(level.tier || 'Beginner').replace(/Tier \d+:\s*/i, '').toUpperCase()}</span>
              </div>
              ${isPlayable ? `
                <button id="btnLaunchDailyPuzzle" class="btn-calendar-launch ${isSelectedSolved ? 'replay' : ''}">
                  ${isSelectedSolved ? Icons.replay(16) : Icons.play(16)}
                  <span>${isSelectedSolved ? 'REPLAY PUZZLE' : 'PLAY PUZZLE'}</span>
                </button>
              ` : `
                <button class="btn-calendar-launch" disabled style="opacity: 0.45; cursor: not-allowed;">
                  LOCKED
                </button>
              `}
            </div>
          ` : ''}
        </div>
      `;

      this.bodyEl.querySelectorAll('.calendar-cell.is-playable').forEach(cellEl => {
        cellEl.addEventListener('click', () => {
          const clickedDate = cellEl.getAttribute('data-date');
          if (selectedDateStr !== clickedDate) {
            selectedDateStr = clickedDate;
            if (this.audio) this.audio.playClick();
            render();
          }
        });
      });

      const launchBtn = this.bodyEl.querySelector('#btnLaunchDailyPuzzle');
      if (launchBtn) {
        launchBtn.addEventListener('click', () => {
          if (this.audio) this.audio.playClick();
          this.close();
          if (options.onStartDailyGame && selectedCell) {
            options.onStartDailyGame(selectedCell.levelInfo.levelIndex, {
              mode: 'daily',
              dateStr: selectedCell.dateStr,
              displayDate: selectedCell.levelInfo.shortDate,
              level: selectedCell.levelInfo.level
            });
          }
        });
      }
    };

    render();
  }
}

