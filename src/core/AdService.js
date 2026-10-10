import { TargetConfig } from '../platform/target-config.js';

// Production Ad Unit IDs provided by developer
const PROD_IDS = {
  appId: 'ca-app-pub-4890313674539327~5030519641',
  banner: 'ca-app-pub-4890313674539327/3005982376',
  interstitial: 'ca-app-pub-4890313674539327/1754453765',
  rewarded: 'ca-app-pub-4890313674539327/3997473727'
};

// Official Google Sample Ad Unit IDs for safe local verification
const TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917'
};

class AdServiceClass {
  constructor() {
    this.storage = null;
    this.audio = null;
    this.modalManager = null;
    this.uiController = null;
    this.isInitialized = false;
    this.isNative = false;
    this.useTestAds = false; // Set to true if testing on unregistered test devices

    // Concurrency & timing guards for interstitial ads
    this.isShowingInterstitial = false;
    this.lastInterstitialTimestamp = 0;
    this.INTERSTITIAL_COOLDOWN_MS = 10000; // 10s minimum spacing between interstitials
  }

  getIds() {
    return this.useTestAds ? TEST_IDS : PROD_IDS;
  }

  init({ storageService, audioService, modalManager, uiController } = {}) {
    this.storage = storageService;
    this.audio = audioService;
    this.modalManager = modalManager;
    this.uiController = uiController;

    // Desktop builds are completely offline and ad-free
    if (TargetConfig.isDesktop) {
      console.log('[AdService] Desktop build active — ads disabled.');
      return;
    }

    const Capacitor = typeof window !== 'undefined' ? window.Capacitor : null;
    this.isNative = Boolean(Capacitor?.isNativePlatform?.() && Capacitor?.Plugins?.AdMob);

    if (this.isNative) {
      const ids = this.getIds();
      Capacitor.Plugins.AdMob.initialize({
        bannerId: ids.banner,
        interstitialId: ids.interstitial,
        rewardedId: ids.rewarded
      }).then(() => {
        this.isInitialized = true;
        console.log('[AdService] Native AdMob initialized successfully.');

        // Show banner if ads are not removed
        if (!this.hasAdsRemoved()) {
          this.showBanner();
        }

        // Preload interstitial so it is immediately cached for the first level completion
        this.preloadInterstitial();
      }).catch(err => {
        console.warn('[AdService] Native AdMob initialize error:', err);
      });
    } else {
      this.isInitialized = true;
      console.log('[AdService] Running in Web/Dev mode — simulation active.');
      if (!this.hasAdsRemoved()) {
        this.showBanner();
      }
    }
  }

  hasAdsRemoved() {
    return Boolean(
      this.storage?.hasRemovedAds?.() ||
      this.storage?.isRemoveAds?.() ||
      this.storage?.data?.removeAds
    );
  }

  onAdsRemoved() {
    console.log('[AdService] Remove Ads verified — permanently disabling all ads.');
    this.hideBanner();
    this.destroyBanner();
  }

  async preloadInterstitial() {
    if (this.hasAdsRemoved() || TargetConfig.isDesktop) return;
    if (this.isNative && window.Capacitor?.Plugins?.AdMob?.loadInterstitial) {
      try {
        await window.Capacitor.Plugins.AdMob.loadInterstitial();
      } catch (err) {
        console.warn('[AdService] Preload interstitial notice:', err);
      }
    }
  }

  // =========================================================================
  // BANNER ADS
  // =========================================================================

  async showBanner() {
    if (this.hasAdsRemoved() || TargetConfig.isDesktop) {
      this.hideBanner();
      return;
    }

    // Keep banner slots visible as dark background spacing containers without dummy content
    const slots = document.querySelectorAll('.ad-banner-slot');
    slots.forEach(slot => {
      slot.innerHTML = '';
      slot.style.display = 'flex';
      slot.style.visibility = 'visible';
    });

    if (this.isNative) {
      try {
        const ids = this.getIds();
        await window.Capacitor.Plugins.AdMob.showBanner({ adId: ids.banner });
      } catch (err) {
        console.warn('[AdService] Error showing native banner:', err);
      }
    }
  }

  async hideBanner() {
    if (this.isNative) {
      try {
        await window.Capacitor.Plugins.AdMob.hideBanner();
      } catch (_) {}
    }
    const slots = document.querySelectorAll('.ad-banner-slot');
    slots.forEach(slot => {
      slot.style.display = 'none';
      slot.innerHTML = '';
    });
  }

  async destroyBanner() {
    if (this.isNative) {
      try {
        await window.Capacitor.Plugins.AdMob.destroyBanner();
      } catch (_) {}
    }
  }

  renderWebBanner() {
    // Keep slots clear of any dummy preview text/badges
    const slots = document.querySelectorAll('.ad-banner-slot');
    slots.forEach(slot => {
      slot.innerHTML = '';
    });
  }

  // =========================================================================
  // INTERSTITIAL ADS (Every 1 Level Cadence & Edge Case Handling)
  // =========================================================================

  shouldShowInterstitial(options = {}) {
    if (this.hasAdsRemoved() || TargetConfig.isDesktop) return false;

    // Support both boolean/object options or legacy level index argument
    const force = typeof options === 'object' && options !== null ? Boolean(options.force) : false;
    if (force) return true;

    // Safety cooldown to prevent accidental rapid double-triggering
    const now = Date.now();
    if (now - this.lastInterstitialTimestamp < this.INTERSTITIAL_COOLDOWN_MS) {
      return false;
    }

    // Interstitial cadence is 1 level (every completed level, including Daily Challenges)
    return true;
  }

  async showInterstitial({ onComplete } = {}) {
    let hasFinished = false;
    let safetyTimer = null;

    const finish = () => {
      if (hasFinished) return;
      hasFinished = true;

      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }

      this.isShowingInterstitial = false;

      // Audio safety restoration: unmute if sound is enabled
      try {
        if (this.audio && this.storage?.isSoundEnabled?.()) {
          this.audio.unmute?.();
        }
      } catch (err) {
        console.warn('[AdService] Audio unmute error:', err);
      }

      // Automatically preload next interstitial ad in background
      this.preloadInterstitial().catch(() => {});

      if (typeof onComplete === 'function') {
        try {
          onComplete();
        } catch (err) {
          console.error('[AdService] onComplete callback error:', err);
        }
      }
    };

    // If player purchased Remove Ads or on desktop, bypass immediately
    if (this.hasAdsRemoved() || TargetConfig.isDesktop) {
      finish();
      return;
    }

    // Concurrency guard: if an ad is already presenting, don't spawn another
    if (this.isShowingInterstitial) {
      console.warn('[AdService] Interstitial already active — bypassing duplicate trigger.');
      finish();
      return;
    }

    this.isShowingInterstitial = true;
    this.lastInterstitialTimestamp = Date.now();

    // Safety race: 7.5s maximum timeout ensures the game NEVER hangs even if native SDK fails
    safetyTimer = setTimeout(() => {
      console.warn('[AdService] Interstitial timeout reached (7.5s) — forcing completion.');
      finish();
    }, 7500);

    // Mute game audio during ad presentation
    try {
      if (this.audio) {
        this.audio.mute?.();
      }
    } catch (_) {}

    if (this.isNative) {
      try {
        const res = await window.Capacitor.Plugins.AdMob.showInterstitial();
        finish();
      } catch (err) {
        console.warn('[AdService] Interstitial display error (offline/no fill):', err);
        finish();
      }
    } else {
      // Web / Dev simulation: brief intermission transition
      console.log('[AdService] Simulating interstitial intermission in Web/Dev');
      setTimeout(finish, 350);
    }
  }

  // =========================================================================
  // REWARDED ADS (Earn Hints with Claim Modal)
  // =========================================================================

  async showRewarded({ onRewardEarned, onDismiss, onFail } = {}) {
    // If player purchased Remove Ads, immediately grant the hint reward without showing an ad!
    if (this.hasAdsRemoved()) {
      this.handleRewardConfirmed({ amount: 1, type: 'hint', onRewardEarned });
      return;
    }

    // Temporarily mute audio during video
    if (this.audio) {
      try {
        this.audio.mute?.();
      } catch (_) {}
    }

    const restoreAudio = () => {
      if (this.audio && this.storage?.isSoundEnabled?.()) {
        try {
          this.audio.unmute?.();
        } catch (_) {}
      }
    };

    if (this.isNative) {
      try {
        const res = await window.Capacitor.Plugins.AdMob.showRewarded();
        restoreAudio();

        if (res && res.rewardEarned) {
          this.handleRewardConfirmed({ amount: 1, type: 'hint', onRewardEarned });
        } else {
          if (typeof onDismiss === 'function') onDismiss();
        }
      } catch (err) {
        restoreAudio();
        console.warn('[AdService] Rewarded video display error:', err);
        if (typeof onFail === 'function') onFail(err);
      }
    } else {
      // Realistic Interactive Web Simulation for dev/browser testing
      this.simulateRewardedAd({
        onComplete: (rewardEarned) => {
          restoreAudio();
          if (rewardEarned) {
            this.handleRewardConfirmed({ amount: 1, type: 'hint', onRewardEarned });
          } else {
            if (typeof onDismiss === 'function') onDismiss();
          }
        }
      });
    }
  }

  /**
   * CRITICAL SPECIFICATION:
   * When reward is confirmed, DO NOT directly activate/reveal it on the board!
   * Show a dedicated Claim Reward modal window, then let player claim it to their hint counter.
   */
  handleRewardConfirmed({ amount = 1, type = 'hint', onRewardEarned } = {}) {
    const rewardCount = 1; // Strictly 1 hint per rewarded video watched
    if (typeof onRewardEarned === 'function') {
      onRewardEarned({ amount: rewardCount, type });
    }

    if (this.modalManager) {
      this.modalManager.open('claimReward', {
        amount: rewardCount,
        type,
        onClaim: () => {
          if (this.storage) {
            const newBal = this.storage.addHints(rewardCount);
            if (this.uiController) {
              this.uiController.updateHintButton(newBal);
            }
          }
        }
      });
    }
  }

  // =========================================================================
  // WEB SIMULATION DIALOG
  // =========================================================================

  simulateRewardedAd({ onComplete }) {
    let overlay = document.getElementById('simulatedAdOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'simulatedAdOverlay';
      overlay.className = 'simulated-ad-overlay';
      document.body.appendChild(overlay);
    }

    let secondsLeft = 5;
    overlay.innerHTML = `
      <div class="simulated-ad-card">
        <div class="sim-ad-badge">SPONSORED VIDEO SIMULATION</div>
        <div class="sim-ad-body">
          <div class="sim-ad-spinner">
            <svg class="ui-icon spinning" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
            </svg>
          </div>
          <div class="sim-ad-title">Sponsor Message Playing...</div>
          <div class="sim-ad-timer">Reward unlocks in <span id="simAdTimer">${secondsLeft}</span>s</div>
          <div class="sim-ad-progress-bar"><div id="simAdBar" class="sim-ad-bar-fill"></div></div>
        </div>
        <div class="sim-ad-actions">
          <button id="btnCancelSimAd" class="btn-sim-skip">CANCEL</button>
        </div>
      </div>
    `;

    overlay.classList.add('active');
    const timerEl = document.getElementById('simAdTimer');
    const barEl = document.getElementById('simAdBar');
    const btnCancel = document.getElementById('btnCancelSimAd');

    let isCompleted = false;

    const interval = setInterval(() => {
      secondsLeft--;
      if (timerEl) timerEl.textContent = String(secondsLeft);
      if (barEl) barEl.style.width = `${((5 - secondsLeft) / 5) * 100}%`;

      if (secondsLeft <= 0) {
        clearInterval(interval);
        isCompleted = true;
        overlay.classList.remove('active');
        if (typeof onComplete === 'function') onComplete(true);
      }
    }, 1000);

    if (btnCancel) {
      btnCancel.onclick = () => {
        clearInterval(interval);
        overlay.classList.remove('active');
        if (!isCompleted && typeof onComplete === 'function') {
          onComplete(false);
        }
      };
    }
  }
}

export const AdService = new AdServiceClass();
