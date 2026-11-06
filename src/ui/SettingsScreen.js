import { Icons } from './Icons.js';
import { PlatformBridge } from '../platform/lifecycle.js';
import { TargetConfig } from '../platform/target-config.js';
import { IAPService, IAP_PRODUCTS } from '../core/IAPService.js';
import { Toast } from './Toast.js';
import { AppUpdateService } from '../core/AppUpdateService.js';
import { NotificationService } from '../core/NotificationService.js';
import { AdService } from '../core/AdService.js';

export class SettingsScreen {
  constructor({ container, storageService, audioService, modalManager, onBack }) {
    this.container = container || document.getElementById('settingsScreen');
    this.storage = storageService;
    this.audio = audioService;
    this.modals = modalManager;
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
        if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
        PlatformBridge.vibrateLight();
        if (this.onBack) this.onBack();
      });
    }

    // Subview Back Button
    if (this.subviewBackBtn) {
      this.subviewBackBtn.addEventListener('click', () => {
        if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
        PlatformBridge.vibrateLight();
        this.closeSubview();
      });
    }

    // Helper to allow clicking anywhere on setting row to toggle switch
    const bindRowClickToToggle = (toggleId) => {
      const toggle = document.getElementById(toggleId);
      if (!toggle) return;
      const row = toggle.closest('.settings-row');
      if (row) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
          if (e.target === toggle || e.target.closest('.switch-label') || e.target.closest('input')) {
            return;
          }
          toggle.checked = !toggle.checked;
          toggle.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
    };

    // Sound Toggle
    const soundToggle = document.getElementById('settingsSoundToggle');
    if (soundToggle) {
      bindRowClickToToggle('settingsSoundToggle');
      soundToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        this.storage.setSoundEnabled(val);
        if (this.audio) {
          this.audio.setSoundEnabled(val);
          if (val) {
            this.audio.playClick();
          }
        }
        PlatformBridge.vibrateLight();
        Toast.show(val ? 'Sound Effects Enabled' : 'Sound Effects Muted', {
          type: val ? 'success' : 'info'
        });
      });
    }

    // Haptics Toggle
    const hapticsToggle = document.getElementById('settingsHapticsToggle');
    if (hapticsToggle) {
      bindRowClickToToggle('settingsHapticsToggle');
      hapticsToggle.addEventListener('change', (e) => {
        const val = e.target.checked;
        this.storage.setHapticsEnabled(val);
        PlatformBridge.setHapticsEnabled(val);
        if (val) {
          PlatformBridge.vibrateLight();
        }
        if (this.audio && this.storage.isSoundEnabled()) {
          this.audio.playClick();
        }
        Toast.show(val ? 'Haptic Feedback Enabled' : 'Haptic Feedback Disabled', {
          type: val ? 'success' : 'info'
        });
      });
    }

    // Daily Reminders Toggle
    const remindersToggle = document.getElementById('settingsRemindersToggle');
    if (remindersToggle) {
      bindRowClickToToggle('settingsRemindersToggle');
      remindersToggle.addEventListener('change', async (e) => {
        const val = e.target.checked;
        if (this.audio && this.storage.isSoundEnabled()) {
          this.audio.playClick();
        }
        PlatformBridge.vibrateLight();

        if (val) {
          const granted = await NotificationService.requestPermission();
          if (granted) {
            this.storage.setRemindersEnabled(true);
            await NotificationService.scheduleDailyReminder({ hour: 9, minute: 0 });
            Toast.show('Daily Reminders Scheduled (9:00 AM)', { type: 'success' });
          } else {
            this.storage.setRemindersEnabled(false);
            remindersToggle.checked = false;
            Toast.show('Notification permission was not granted', { type: 'warning' });
          }
        } else {
          this.storage.setRemindersEnabled(false);
          await NotificationService.cancelDailyReminder();
          Toast.show('Daily Reminders Turned Off', { type: 'info' });
        }
      });
    }

    // Remove Ads In-App Purchase
    const btnRemoveAds = document.getElementById('btnRemoveAds');
    const rowRemoveAds = document.getElementById('rowRemoveAds');

    const triggerRemoveAds = async (e) => {
      if (e) e.stopPropagation();
      if (this.storage.hasRemovedAds()) {
        const isConfirmReenable = window.confirm(
          "Ads are currently permanently disabled on this device.\n\nWould you like to re-enable advertisements for testing purposes?"
        );
        if (isConfirmReenable) {
          this.storage.setRemoveAds(false);
          AdService.showBanner();
          this.syncState();
          this.showFeedbackNotice(
            'ADS RE-ENABLED',
            'Advertisements and banners have been restored for testing.'
          );
        }
        return;
      }

      if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
      PlatformBridge.vibrateLight();

      try {
        const res = await IAPService.purchase(IAP_PRODUCTS.REMOVE_ADS.id);
        if (res && res.success) {
          AdService.hideBanner();
          AdService.destroyBanner();
          this.syncState();
          this.showFeedbackNotice(
            'PURCHASE SUCCESSFUL',
            'Thank you for supporting Flapcrypt!\n\nAll advertisements have been permanently removed.'
          );
        } else if (res && !res.cancelled && res.error) {
          this.showFeedbackNotice('PURCHASE FAILED', res.error);
        }
      } catch (err) {
        console.error('[SettingsScreen] Purchase error:', err);
      }
    };

    if (btnRemoveAds) {
      btnRemoveAds.addEventListener('click', triggerRemoveAds);
    }
    if (rowRemoveAds) {
      rowRemoveAds.addEventListener('click', (e) => {
        if (e.target === btnRemoveAds || e.target.closest('#btnRemoveAds')) return;
        triggerRemoveAds(e);
      });
    }

    // Rate Us Native In-App Review with Loading Spinner
    const btnRateUs = document.getElementById('btnRateUs');
    const rowRateUs = document.getElementById('rowRateUs');
    let isReviewLoading = false;

    const triggerRateUs = async (e) => {
      if (e) e.stopPropagation();
      if (isReviewLoading) return;

      if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
      PlatformBridge.vibrateLight();

      isReviewLoading = true;
      if (btnRateUs) {
        btnRateUs.classList.add('loading');
        btnRateUs.setAttribute('disabled', 'true');
      }

      try {
        await Promise.all([
          PlatformBridge.requestInAppReview(),
          new Promise(resolve => setTimeout(resolve, 650))
        ]);
      } catch (err) {
        console.warn('[SettingsScreen] Review request error:', err);
      } finally {
        isReviewLoading = false;
        if (btnRateUs) {
          btnRateUs.classList.remove('loading');
          btnRateUs.removeAttribute('disabled');
        }
      }
    };

    if (btnRateUs) {
      btnRateUs.addEventListener('click', triggerRateUs);
    }
    if (rowRateUs) {
      rowRateUs.addEventListener('click', (e) => {
        if (e.target === btnRateUs || e.target.closest('#btnRateUs')) return;
        triggerRateUs(e);
      });
    }

    // Contact Support Email
    const btnContactSupport = document.getElementById('btnContactSupport');
    const rowContactSupport = document.getElementById('rowContactSupport');

    const triggerContactSupport = (e) => {
      if (e) e.stopPropagation();
      if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
      PlatformBridge.vibrateLight();

      PlatformBridge.openSupportMail({
        email: 'olaidigitalstudios@gmail.com',
        subject: `Flapcrypt Support & Feedback (v${TargetConfig.version})`
      });
    };

    if (btnContactSupport) {
      btnContactSupport.addEventListener('click', triggerContactSupport);
    }
    if (rowContactSupport) {
      rowContactSupport.addEventListener('click', (e) => {
        if (e.target === btnContactSupport || e.target.closest('#btnContactSupport')) return;
        triggerContactSupport(e);
      });
    }

    // Privacy Policy Navigation
    const rowPrivacy = document.getElementById('rowPrivacyPolicy');
    if (rowPrivacy) {
      rowPrivacy.addEventListener('click', () => {
        if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
        PlatformBridge.vibrateLight();
        this.openSubview('privacy');
      });
    }

    // About Flapcrypt Navigation
    const rowAbout = document.getElementById('rowAbout');
    if (rowAbout) {
      rowAbout.addEventListener('click', () => {
        if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
        PlatformBridge.vibrateLight();
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
      const isHapticsOn = this.storage.isHapticsEnabled();
      hapticsToggle.checked = isHapticsOn;
      PlatformBridge.setHapticsEnabled(isHapticsOn);
      const hapticsRow = document.getElementById('rowHaptics') || hapticsToggle.closest('.settings-row');
      if (hapticsRow && TargetConfig.capabilities.isStandaloneMode) {
        hapticsRow.style.display = 'none';
      }
    }

    const remindersToggle = document.getElementById('settingsRemindersToggle');
    if (remindersToggle) {
      remindersToggle.checked = this.storage.isRemindersEnabled();
      const remindersRow = remindersToggle.closest('.settings-row');
      if (remindersRow && !TargetConfig.capabilities.hasLocalNotifications) {
        remindersRow.style.display = 'none';
      }
    }

    // Platform-tailored adjustments: Hide Upgrades & Purchases on Standalone builds (Desktop / Web)
    const sectionUpgrades = document.getElementById('sectionUpgrades') || document.getElementById('rowRemoveAds')?.closest('.settings-group-section');
    if (sectionUpgrades && TargetConfig.capabilities.isStandaloneMode) {
      sectionUpgrades.style.display = 'none';
    }

    // Platform-tailored adjustments: Hide Rate Flapcrypt on Standalone builds (Desktop / Web)
    const rowRateUs = document.getElementById('rowRateUs');
    if (rowRateUs && TargetConfig.capabilities.isStandaloneMode) {
      rowRateUs.style.display = 'none';
    }

    // Sync Remove Ads Button State
    const hasRemovedAds = this.storage.hasRemovedAds();
    const btnRemoveAds = document.getElementById('btnRemoveAds');
    if (btnRemoveAds) {
      if (hasRemovedAds) {
        btnRemoveAds.classList.add('purchased');
        btnRemoveAds.innerHTML = `
          <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>ACTIVE</span>
        `;
      } else {
        btnRemoveAds.classList.remove('purchased');
        const price = IAPService.getPrice(IAP_PRODUCTS.REMOVE_ADS.id) || '$4.90';
        btnRemoveAds.innerHTML = `
          <span>UPGRADE</span>
          <span class="btn-iap-price">${price}</span>
        `;
      }
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
          <h4 class="subview-section-title">1. INTRODUCTION & SCOPE</h4>
          <p class="subview-text">
            This Privacy Policy applies to the game <strong class="highlight-text">Flapcrypt</strong> across Mobile (Google Play Store / Android), Web, and Standalone platforms operated by <strong class="highlight-text">OLAI Digital Studios</strong> (Effective October 10, 2026).
          </p>
          <p class="subview-text">
            Flapcrypt is engineered with an offline-first architecture to provide an enjoyable, distraction-free, and privacy-respecting cryptogram puzzle experience. We do not collect, sell, rent, or trade your personally identifiable information (PII).
          </p>
        </div>

        <div class="subview-section">
          <h4 class="subview-section-title">2. INFORMATION WE DO NOT COLLECT</h4>
          <p class="subview-text">
            Flapcrypt does not require account creation, login, or social authentication. We do not harvest, track, or store:
          </p>
          <p class="subview-text">
            &bull; Real names, physical home addresses, or phone numbers<br>
            &bull; Email addresses (unless you voluntarily contact support)<br>
            &bull; Contacts, camera, photos, or microphone data<br>
            &bull; Precise geolocation or GPS coordinates<br>
            &bull; Biometric or financial banking credentials
          </p>
        </div>

        <div class="subview-section">
          <h4 class="subview-section-title">3. LOCAL ON-DEVICE STORAGE</h4>
          <p class="subview-text">
            All puzzle progression and preferences are stored exclusively on your local device (HTML5 localStorage / isolated app sandbox):
          </p>
          <p class="subview-text">
            &bull; Campaign puzzle progression, unlocked levels, and solved cryptograms across all categories<br>
            &bull; Solved cryptograms, midway flap positions, and daily streaks<br>
            &bull; In-game hint inventory balance<br>
            &bull; Audio, haptic vibration, and daily reminder preferences<br>
            &bull; In-app purchase entitlement status (e.g. Ad-Free mode)
          </p>
          <p class="subview-text">
            This data remains strictly on your device and is never transmitted to cloud servers. You may erase or reset your data at any time via in-game Reset options or device storage settings.
          </p>
        </div>

        <div class="subview-section">
          <h4 class="subview-section-title">4. LOCAL NOTIFICATIONS</h4>
          <p class="subview-text">
            Optional Daily Reminder alerts (default 10:00 AM) are generated and scheduled locally on your device by the operating system. No remote push notification servers, device tokens, or external tracking systems are utilized.
          </p>
        </div>

        <div class="subview-section">
          <h4 class="subview-section-title">5. IN-APP PURCHASES & ADS</h4>
          <p class="subview-text">
            <strong class="highlight-text">Google Play Billing:</strong> Optional upgrades (Remove Ads, 25 Hints, 50 Hints) are processed exclusively and securely by Google Play Billing (Google LLC). OLAI Digital Studios never receives, processes, or stores your financial or credit card information.
          </p>
          <p class="subview-text">
            <strong class="highlight-text">Advertising:</strong> Where active on mobile/web, non-intrusive advertisements may be served by Google AdMob/AdSense using pseudonymous identifiers in compliance with Google policies. Desktop standalone builds are 100% offline and ad-free.
          </p>
        </div>

        <div class="subview-section">
          <h4 class="subview-section-title">6. THIRD-PARTY LIBRARIES</h4>
          <p class="subview-text">
            Flapcrypt integrates standard Google Play Core and Capacitor APIs for native features:
          </p>
          <p class="subview-text">
            &bull; Google Play Billing (@capgo/native-purchases)<br>
            &bull; Google Play In-App Review (@capawesome/capacitor-app-review)<br>
            &bull; Google Play In-App Update (@capawesome/capacitor-app-update)<br>
            &bull; Capacitor Framework (Haptics, status bar, local notifications)
          </p>
        </div>

        <div class="subview-section">
          <h4 class="subview-section-title">7. CHILDREN’S PRIVACY & DATA RIGHTS</h4>
          <p class="subview-text">
            Flapcrypt is a family-friendly educational word puzzle suitable for general audiences. In compliance with COPPA and GDPR, we do not knowingly collect personal data from children under 13 (or 16 in the EU).
          </p>
          <p class="subview-text">
            We honor GDPR (EEA/UK) and CCPA/CPRA rights. We do not sell personal information or share personal data for monetary consideration.
          </p>
        </div>

        <div class="subview-section">
          <h4 class="subview-section-title">8. CONTACT US</h4>
          <p class="subview-text">
            If you have questions, feedback, or privacy-related inquiries regarding Flapcrypt, please contact our team:
          </p>
          <p class="subview-text">
            <strong class="highlight-text">Studio:</strong> OLAI Digital Studios<br>
            <strong class="highlight-text">Lead Developer:</strong> Dhinesh<br>
            <strong class="highlight-text">Location:</strong> Chennai, Tamil Nadu, India<br>
            <strong class="highlight-text">Email:</strong> <strong class="highlight-text">olaidigitalstudios@gmail.com</strong>
          </p>
        </div>

        <div class="subview-action-footer">
          <button id="btnViewPrivacySite" class="btn-about-pill" aria-label="View Privacy Policy Online">
            <span>View Privacy Policy Online</span>
            <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>
        </div>
      `;

      // Wire View Privacy Policy Website button
      const btnViewPrivacy = document.getElementById('btnViewPrivacySite');
      if (btnViewPrivacy) {
        btnViewPrivacy.addEventListener('click', () => {
          if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
          PlatformBridge.vibrateLight();
          try {
            PlatformBridge.openExternalUrl('https://sites.google.com/view/flapcrypt-privacy-policy/home');
          } catch (_) {
            window.open('https://sites.google.com/view/flapcrypt-privacy-policy/home', '_blank');
          }
        });
      }
    } else if (type === 'about') {
      this.subviewBody.className = 'subview-article about-mode';
      this.subviewTitle.innerHTML = `<span>ABOUT</span>`;
      this.subviewBody.innerHTML = `
        <div class="about-screen-layout">
          <!-- App Icon (Center) -->
          <div class="about-icon-wrapper">
            <div class="about-squircle-icon">
              <img src="./icon-512.png" alt="Flapcrypt Icon" class="about-app-icon-img" />
            </div>
          </div>

          <!-- Game Title -->
          <h1 class="about-title">FLAPCRYPT</h1>

          <!-- Version Pill -->
          <div class="about-version-badge">v${TargetConfig.version}</div>

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
            ${TargetConfig.isPlayStore ? `
            <button id="btnCheckUpdates" class="btn-about-pill" aria-label="Check for Updates">
              <span>Check for Updates</span>
            </button>` : ''}
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
        btnCheckUpdates.addEventListener('click', async () => {
          if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
          PlatformBridge.vibrateLight();

          const originalContent = btnCheckUpdates.innerHTML;
          btnCheckUpdates.disabled = true;
          btnCheckUpdates.innerHTML = `
            <span class="btn-spinner-icon">
              <svg class="ui-icon spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
            </span>
            <span>Checking...</span>
          `;

          if (TargetConfig.isDesktop) {
            btnCheckUpdates.disabled = false;
            btnCheckUpdates.innerHTML = originalContent;
            Toast.show(`Running Flapcrypt Desktop v${TargetConfig.version}`, { type: 'info' });
            PlatformBridge.openExternalUrl('https://olaidigitalstudios.itch.io/flapcrypt');
            return;
          }

          try {
            const updateInfo = await AppUpdateService.checkForUpdate();
            btnCheckUpdates.disabled = false;
            btnCheckUpdates.innerHTML = originalContent;

            if (updateInfo.available || updateInfo.isDownloaded) {
              if (this.modals) {
                this.modals.open('appUpdate', updateInfo);
              }
            } else if (updateInfo.error && !updateInfo.currentVersion) {
              Toast.show('Unable to connect to update service. Check connection.', { type: 'warning' });
            } else {
              Toast.show(`You're running the latest version (v${updateInfo.currentVersion || TargetConfig.version})!`, { type: 'success' });
            }
          } catch (err) {
            btnCheckUpdates.disabled = false;
            btnCheckUpdates.innerHTML = originalContent;
            Toast.show(`You're running the latest version (v${TargetConfig.version})!`, { type: 'success' });
          }
        });
      }

      const btnMoreGames = document.getElementById('btnMoreGames');
      if (btnMoreGames) {
        btnMoreGames.addEventListener('click', () => {
          if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
          PlatformBridge.vibrateLight();
          try {
            PlatformBridge.openExternalUrl('https://play.google.com/store/apps/developer?id=OlaiDigitalStudios');
          } catch (_) {
            window.open('https://play.google.com/store/apps/developer?id=OlaiDigitalStudios', '_blank');
          }
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
          if (this.audio && this.storage.isSoundEnabled()) this.audio.playClick();
          PlatformBridge.vibrateLight();
          overlay.classList.remove('active');
        }, { once: true });
      }
    } else {
      alert(`${title}\n\n${message}`);
    }
  }
}
