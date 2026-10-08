import { Icons } from './Icons.js';

export class SettingsScreen {
  constructor({ container, storageService, audioService, onBack }) {
    this.container = container || document.getElementById('settingsScreen');
    this.storage = storageService;
    this.audio = audioService;
    this.onBack = onBack;

    this.subview = document.getElementById('settingsSubview');
    this.subviewTitle = document.getElementById('settingsSubviewTitle');
    this.subviewBody = document.getElementById('settingsSubviewBody');
    this.subviewBackBtn = document.getElementById('btnSettingsSubviewBack');

    this.initEvents();
  }

  initEvents() {
    // Top Screen Back Button
    const btnBack = document.getElementById('btnSettingsBack');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (this.onBack) this.onBack();
      });
    }

    // Subview Back Button
    if (this.subviewBackBtn) {
      this.subviewBackBtn.addEventListener('click', () => {
        this.closeSubview();
      });
    }

    // Sound Toggle
    const soundToggle = document.getElementById('settingsSoundToggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        this.storage.setSoundEnabled(val);
        if (this.audio) {
          this.audio.setSoundEnabled(val);
          if (val) {
            this.audio.playClick();
          }
        }
      });
    }

    // Haptics Toggle
    const hapticsToggle = document.getElementById('settingsHapticsToggle');
    if (hapticsToggle) {
      hapticsToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        this.storage.setHapticsEnabled(val);
        if (val && navigator.vibrate) {
          try {
            navigator.vibrate(20);
          } catch (err) {}
        }
      });
    }

    // Daily Reminders Toggle
    const remindersToggle = document.getElementById('settingsRemindersToggle');
    if (remindersToggle) {
      remindersToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        this.storage.setRemindersEnabled(val);
        if (val && this.audio && this.storage.isSoundEnabled()) {
          this.audio.playClick();
        }
      });
    }

    // Remove Ads Dummy Button (IAP)
    const btnRemoveAds = document.getElementById('btnRemoveAds');
    if (btnRemoveAds) {
      btnRemoveAds.addEventListener('click', () => {
        this.showFeedbackNotice(
          'REMOVE ADS (IN-APP PURCHASE)',
          'Simulated Google Play Billing checkout for $1.99. In this version, all advertisements are permanently disabled!'
        );
      });
    }

    // Rate Us Dummy Button
    const btnRateUs = document.getElementById('btnRateUs');
    if (btnRateUs) {
      btnRateUs.addEventListener('click', () => {
        this.showFeedbackNotice(
          'RATE FLAPCRYPT',
          'Simulating external link to Google Play Store:\nhttps://play.google.com/store/apps/details?id=com.splitflap.flapcrypt\n\nThank you for supporting Flapcrypt!'
        );
      });
    }

    // Contact Support Dummy Button
    const btnContactSupport = document.getElementById('btnContactSupport');
    if (btnContactSupport) {
      btnContactSupport.addEventListener('click', () => {
        this.showFeedbackNotice(
          'CONTACT SUPPORT',
          'Simulating mail client launch:\nmailto:support@flapcrypt.game?subject=Flapcrypt%20Feedback\n\nWe respond within 24 hours.'
        );
      });
    }

    // Privacy Policy Navigation
    const rowPrivacy = document.getElementById('rowPrivacyPolicy');
    if (rowPrivacy) {
      rowPrivacy.addEventListener('click', () => {
        this.openSubview('privacy');
      });
    }

    // About Flapcrypt Navigation
    const rowAbout = document.getElementById('rowAbout');
    if (rowAbout) {
      rowAbout.addEventListener('click', () => {
        this.openSubview('about');
      });
    }
  }

  syncState() {
    const soundToggle = document.getElementById('settingsSoundToggle');
    if (soundToggle) {
      soundToggle.checked = this.storage.isSoundEnabled();
    }

    const hapticsToggle = document.getElementById('settingsHapticsToggle');
    if (hapticsToggle) {
      hapticsToggle.checked = this.storage.isHapticsEnabled();
    }

    const remindersToggle = document.getElementById('settingsRemindersToggle');
    if (remindersToggle) {
      remindersToggle.checked = this.storage.isRemindersEnabled();
    }
  }

  hasActiveSubview() {
    return Boolean(this.subview && this.subview.classList.contains('active'));
  }

  openSubview(type) {
    if (!this.subview || !this.subviewTitle || !this.subviewBody) return;

    if (type === 'privacy') {
      this.subviewBody.className = 'subview-article';
      this.subviewTitle.innerHTML = `${Icons.shield(20)} <span>PRIVACY POLICY</span>`;
      this.subviewBody.innerHTML = `
        <div class="subview-section">
            <h4 class="subview-section-title">1. ZERO DATA COLLECTION</h4>
            <p class="subview-text">
              Flapcrypt is committed to complete user privacy. We do not harvest, track, sell, or transmit any personal data, identifiable metrics, or puzzle solving habits.
            </p>
          </div>

          <div class="subview-section">
            <h4 class="subview-section-title">2. OFFLINE & LOCAL STORAGE</h4>
            <p class="subview-text">
              All campaign level progression, statistics, daily challenge streaks, and preferences (such as audio and haptics) are stored exclusively in your device's local storage sandbox. Your data remains on your device at all times.
            </p>
          </div>

          <div class="subview-section">
            <h4 class="subview-section-title">3. PERMISSIONS</h4>
            <p class="subview-text">
              Flapcrypt requires no sensitive Android runtime permissions (no camera, microphone, contacts, location, or file system access). Haptic vibration is utilized solely for tactile mechanical feedback during flap rotations.
            </p>
          </div>

          <div class="subview-section">
            <h4 class="subview-section-title">4. THIRD-PARTY SERVICES</h4>
            <p class="subview-text">
              External links to the Google Play Store or support email do not transfer device identifiers. No third-party behavioral analytics SDKs are embedded.
            </p>
          </div>

          <div class="subview-section">
            <h4 class="subview-section-title">5. CONTACT</h4>
            <p class="subview-text">
              Questions regarding privacy may be directed to our development team at <strong class="highlight-text">privacy@flapcrypt.game</strong>.
            </p>
          </div>
        </div>
      `;
    } else if (type === 'about') {
      this.subviewBody.className = 'subview-article about-mode';
      this.subviewTitle.innerHTML = `<span>ABOUT</span>`;
      this.subviewBody.innerHTML = `
        <div class="about-screen-layout">
          <!-- App Icon (Center) -->
          <div class="about-icon-wrapper">
            <div class="about-squircle-icon">
              <div class="about-icon-flap">
                <div class="about-icon-flap-top"><span>F</span></div>
                <div class="about-icon-flap-bot"><span>F</span></div>
                <div class="about-icon-flap-seam"></div>
              </div>
            </div>
          </div>

          <!-- Game Title -->
          <h1 class="about-title">FLAPCRYPT</h1>

          <!-- Version Pill -->
          <div class="about-version-badge">v0.0.1</div>

          <!-- Credits Section -->
          <div class="about-credits-section">
            <div class="about-meta-group">
              <span class="about-meta-label">DEVELOPED BY</span>
              <span class="about-meta-value main-title">OLAI Digital Studios</span>
            </div>

            <div class="about-meta-group">
              <span class="about-meta-label">LEAD DEVELOPER</span>
              <span class="about-meta-value lead-dev">Dhinesh</span>
            </div>

            <div class="about-meta-group">
              <span class="about-location">Chennai, Tamil Nadu, India</span>
            </div>
          </div>

          <!-- Stacked Action Buttons -->
          <div class="about-buttons-stack">
            <button id="btnCheckUpdates" class="btn-about-pill" aria-label="Check for Updates">
              <span>Check for Updates</span>
            </button>
            <button id="btnMoreGames" class="btn-about-pill" aria-label="More Games by OLAI">
              <span>More Games by OLAI</span>
              <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
          </div>

          <!-- Copyright Footer -->
          <footer class="about-legal-footer">
            <div class="about-copyright">&copy; 2026 Olai Digital Studios</div>
            <div class="about-rights">All rights reserved.</div>
          </footer>
        </div>
      `;

      // Wire action buttons
      const btnCheckUpdates = document.getElementById('btnCheckUpdates');
      if (btnCheckUpdates) {
        btnCheckUpdates.addEventListener('click', () => {
          this.showFeedbackNotice(
            'CHECK FOR UPDATES',
            'You are running the latest version of Flapcrypt (v0.0.1).\n\nNo updates are currently available.'
          );
        });
      }

      const btnMoreGames = document.getElementById('btnMoreGames');
      if (btnMoreGames) {
        btnMoreGames.addEventListener('click', () => {
          this.showFeedbackNotice(
            'MORE GAMES BY OLAI',
            'Simulating store link to OLAI Digital Studios catalog on Google Play:\nhttps://play.google.com/store/apps/dev?id=OlaiDigitalStudios'
          );
        });
      }
    }

    this.subview.scrollTop = 0;
    this.subview.classList.add('active');
  }

  closeSubview() {
    if (this.subview) {
      this.subview.classList.remove('active');
    }
  }

  showFeedbackNotice(title, message) {
    // Show a clean mechanical dialog notice for dummy interactions
    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    if (overlay && modalTitle && modalBody) {
      modalTitle.textContent = title;
      modalBody.innerHTML = `
        <div class="notice-dialog-content">
          <p class="notice-text">${message.replace(/\n/g, '<br>')}</p>
          <button id="btnNoticeDismiss" class="btn-notice-dismiss">
            ACKNOWLEDGE
          </button>
        </div>
      `;
      overlay.classList.add('active');

      const btnDismiss = document.getElementById('btnNoticeDismiss');
      if (btnDismiss) {
        btnDismiss.addEventListener('click', () => {
          overlay.classList.remove('active');
        }, { once: true });
      }
    } else {
      alert(`${title}\n\n${message}`);
    }
  }
}
