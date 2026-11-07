import '../styles/main.css';
import '../styles/board.css';
import '../styles/flaps.css';
import '../styles/controls.css';
import '../styles/home.css';
import '../styles/settings.css';
import '../styles/level-select.css';
import '../styles/studio-intro.css';
import 'driver.js/dist/driver.css';
import '../styles/onboarding.css';

import { $ } from './utils/dom.js';
import { GameState } from './core/GameState.js';
import { AudioService } from './core/AudioService.js';
import { StorageService } from './core/StorageService.js';
import { BoardRenderer } from './rendering/BoardRenderer.js';
import { UIController } from './ui/UIController.js';
import { HomeScreen } from './ui/HomeScreen.js';
import { SettingsScreen } from './ui/SettingsScreen.js';
import { ModalManager } from './ui/ModalManager.js';
import { InputManager } from './input/InputManager.js';
import { Game } from './core/Game.js';
import { TargetConfig } from './platform/target-config.js';
import { PlatformBridge } from './platform/lifecycle.js';
import { IAPService } from './core/IAPService.js';
import { Confetti } from './ui/Confetti.js';
import { AdService } from './core/AdService.js';
import { StudioIntro } from './ui/StudioIntro.js';
import { OnboardingTour } from './ui/OnboardingTour.js';
import { AppUpdateService } from './core/AppUpdateService.js';

// Global early fallback aliases for console debugging
if (typeof window !== 'undefined') {
  const earlyReset = () => {
    try {
      localStorage.clear();
      console.log('%c[Flapcrypt] Storage cleared. Reloading...', 'color: #34D399; font-weight: bold;');
    } catch (e) {}
    location.reload();
  };
  window.resetFlapcrypt = earlyReset;
  window.resetflapcrypt = earlyReset;
}

function initApp() {
  // Completely suppress native browser hover tooltips across all targets
  const stripTitles = (root = document) => {
    root.querySelectorAll?.('[title]').forEach(el => el.removeAttribute('title'));
  };
  stripTitles();
  if (typeof MutationObserver !== 'undefined') {
    const titleObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.hasAttribute('title')) node.removeAttribute('title');
              node.querySelectorAll?.('[title]').forEach(el => el.removeAttribute('title'));
            }
          });
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
          if (mutation.target.hasAttribute('title')) {
            mutation.target.removeAttribute('title');
          }
        }
      }
    });
    titleObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title']
    });
  }

  // Expose config for runtime inspection and set DOM attributes
  if (typeof window !== 'undefined') {
    window.TargetConfig = TargetConfig;
  }
  document.body.setAttribute('data-target', TargetConfig.mode);

  // Initialize and run Studio Intro sequence
  let introCompleted = false;
  StudioIntro.run(() => {
    console.log('[Flapcrypt] Studio intro completed.');
    introCompleted = true;
    if (typeof checkAutoUpdate === 'function') {
      checkAutoUpdate();
    }
  });

  const elements = {
    homeScreen: $('homeScreen'),
    gameScreen: $('gameScreen'),
    settingsScreen: $('settingsScreen'),
    levelSelectScreen: $('levelSelectScreen'),
    board: $('board'),
    quoteArea: $('quoteArea'),
    authorRow: $('authorRow'),
    levelTitleText: $('levelTitleText'),
    chipWords: $('chipWords'),
    chipWordsText: $('chipWordsText'),
    chipLetters: $('chipLetters'),
    chipLettersText: $('chipLettersText'),
    levelSubBadge: $('levelSubBadge'),
    levelBadge: $('levelBadge'),
    headerProgressFill: $('headerProgressFill'),
    letterBadge: $('letterBadge'),
    statusBar: $('status-bar'),
    tu: $('tu'),
    td: $('td'),
    hintBtn: $('hint'),
    prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'),
    soundBtn: $('soundBtn'),
    homeBtn: $('homeBtn'),
    btnResetLevel: $('btnResetLevel'),
    gameHelpBtn: $('gameHelpBtn'),
    gameSettingsBtn: $('gameSettingsBtn')
  };

  const storageService = new StorageService();
  const gameState = new GameState();
  const audioService = new AudioService();

  // Expose global debug & reset helper in dev/console
  if (typeof window !== 'undefined') {
    const doReset = () => {
      try {
        if (storageService) {
          storageService.resetProgress();
        }
        localStorage.clear();
        if (storageService) {
          storageService.save();
        }
        console.log('%c[Flapcrypt] All game data, campaign progress, daily streaks, and settings have been completely reset.', 'color: #34D399; font-weight: bold;');
      } catch (err) {
        console.error('[Flapcrypt] Reset error:', err);
      }
      setTimeout(() => {
        location.reload();
      }, 100);
    };

    window.resetFlapcrypt = doReset;
    window.resetflapcrypt = doReset;
    window.flapcrypt = {
      storage: storageService,
      game: null, // assigned below
      resetAll: doReset,
      reset: doReset
    };
  }

  // Sync initial sound and haptic preferences
  audioService.setSoundEnabled(storageService.isSoundEnabled());
  PlatformBridge.setHapticsEnabled(storageService.isHapticsEnabled());
  IAPService.init(storageService, audioService);
  IAPService.addListener((event) => {
    if (event === 'purchase_remove_ads' || event === 'restore_success') {
      AdService.onAdsRemoved();
    }
  });

  // Pre-warm AudioContext and procedural click buffers on first user gesture
  const prewarmAudio = () => {
    window.removeEventListener('pointerdown', prewarmAudio, true);
    window.removeEventListener('touchstart', prewarmAudio, true);
    window.removeEventListener('keydown', prewarmAudio, true);
    if (audioService.isSoundEnabled()) {
      audioService.getAudioContext();
    }
  };
  window.addEventListener('pointerdown', prewarmAudio, true);
  window.addEventListener('touchstart', prewarmAudio, true);
  window.addEventListener('keydown', prewarmAudio, true);

  const renderer = new BoardRenderer(elements.board, elements.quoteArea, elements.authorRow);
  const uiController = new UIController(elements);

  let homeScreenInstance = null;
  let settingsScreenInstance = null;
  let levelSelectScreenInstance = null;
  let activeScreen = 'home';
  let previousScreen = 'home';

  function showScreen(screenName, { instant = false } = {}) {
    OnboardingTour.dismiss();
    if (activeScreen === screenName) return;
    previousScreen = activeScreen;
    activeScreen = screenName;

    if (instant) {
      elements.homeScreen.classList.add('no-transition');
      elements.gameScreen.classList.add('no-transition');
      if (elements.settingsScreen) elements.settingsScreen.classList.add('no-transition');
    }

    elements.homeScreen.classList.remove('active');
    elements.gameScreen.classList.remove('active');
    if (elements.settingsScreen) {
      elements.settingsScreen.classList.remove('active');
    }
    if (elements.levelSelectScreen) {
      elements.levelSelectScreen.classList.remove('active');
    }

    if (screenName === 'game') {
      elements.gameScreen.classList.add('active');
      if (homeScreenInstance) {
        homeScreenInstance.clearAnimation();
      }
    } else if (screenName === 'settings') {
      if (elements.settingsScreen) {
        elements.settingsScreen.classList.add('active');
      }
      if (settingsScreenInstance) {
        settingsScreenInstance.syncState();
      }
      if (homeScreenInstance) {
        homeScreenInstance.clearAnimation();
      }
    } else if (screenName === 'levelSelect') {
      activeScreen = previousScreen;
      modalManager.open('levelSelect', {
        onSelectLevel: (idx) => {
          game.start(idx, { mode: 'campaign' });
          showScreen('game', { instant: true });
        }
      });
      return;
    } else {
      elements.homeScreen.classList.add('active');
      if (homeScreenInstance) {
        homeScreenInstance.resetTitle();
        homeScreenInstance.updateProgress();
        // Delay cascade until the screen transition settles (fast when instant)
        const animDelay = instant ? 60 : 260;
        setTimeout(() => {
          if (elements.homeScreen.classList.contains('active')) {
            homeScreenInstance.animateTitle();
          }
        }, animDelay);
      }
    }

    if (instant) {
      requestAnimationFrame(() => {
        elements.homeScreen.classList.remove('no-transition');
        elements.gameScreen.classList.remove('no-transition');
        if (elements.settingsScreen) elements.settingsScreen.classList.remove('no-transition');
      });
    }

    // Ensure active screen banner is displayed
    if (AdService && !AdService.hasAdsRemoved()) {
      AdService.showBanner();
    }
  }

  let game = null;

  const modalManager = new ModalManager({
    storageService,
    audioService,
    onProgressReset: () => {
      if (homeScreenInstance) {
        homeScreenInstance.updateProgress();
      }
    },
    onHintInventoryChanged: () => {
      if (game) {
        game.refreshHintButton();
      }
    }
  });

  // Initialize central Google AdMob service
  AdService.init({
    storageService,
    audioService,
    modalManager,
    uiController
  });

  game = new Game({
    gameState,
    audioService,
    renderer,
    uiController,
    storageService,
    modalManager,
    onRequestShop: () => {
      modalManager.open('shop');
    },
    onReturnToHome: () => {
      if (gameState.isWon) {
        showScreen('home', { instant: true });
        if (AdService.shouldShowInterstitial({ force: true })) {
          AdService.showInterstitial();
        }
      } else {
        modalManager.open('returnHome', {
          onConfirm: () => {
            showScreen('home', { instant: true });
          }
        });
      }
    },
    onRequestResetLevel: () => {
      modalManager.open('resetLevel', {
        onConfirm: () => {
          game.handleResetLevel();
        }
      });
    },
    onLevelCompleted: (data) => {
      Confetti.burst();
      modalManager.open('levelComplete', {
        ...data,
        onNextLevel: (nextIdx) => {
          const proceed = () => {
            game.start(nextIdx, { mode: 'campaign' });
            showScreen('game');
          };
          if (AdService.shouldShowInterstitial()) {
            AdService.showInterstitial({ onComplete: proceed });
          } else {
            proceed();
          }
        },
        onLevelSelect: () => {
          const proceed = () => {
            modalManager.open('levelSelect', {
              onSelectLevel: (nextIdx) => {
                game.start(nextIdx, { mode: 'campaign' });
                showScreen('game', { instant: true });
              }
            });
          };
          if (AdService.shouldShowInterstitial()) {
            AdService.showInterstitial({ onComplete: proceed });
          } else {
            proceed();
          }
        },
        onStartDailyGame: (levelIndex, dailyOptions) => {
          const proceed = () => {
            game.start(levelIndex, dailyOptions);
            showScreen('game', { instant: true });
          };
          if (AdService.shouldShowInterstitial()) {
            AdService.showInterstitial({ onComplete: proceed });
          } else {
            proceed();
          }
        },
        onHome: () => {
          showScreen('home', { instant: true });
          if (AdService.shouldShowInterstitial()) {
            AdService.showInterstitial();
          }
        }
      });
    }
  });

  if (typeof window !== 'undefined' && window.flapcrypt) {
    window.flapcrypt.game = game;
  }

  if (elements.gameHelpBtn) {
    elements.gameHelpBtn.addEventListener('click', () => {
      if (audioService) audioService.playClick();
      modalManager.open('howToPlay');
    });
  }

  if (elements.gameSettingsBtn) {
    elements.gameSettingsBtn.addEventListener('click', () => {
      if (audioService) audioService.playClick();
      showScreen('settings');
    });
  }

  settingsScreenInstance = new SettingsScreen({
    container: elements.settingsScreen,
    storageService,
    audioService,
    modalManager,
    onBack: () => {
      showScreen(previousScreen === 'game' ? 'game' : 'home');
    }
  });

  homeScreenInstance = new HomeScreen({
    storageService,
    audioService,
    modalManager,
    onOpenSettings: () => {
      showScreen('settings');
    },
    onOpenLevelSelect: () => {
      modalManager.open('levelSelect', {
        onSelectLevel: (levelIndex) => {
          game.start(levelIndex, { mode: 'campaign' });
          showScreen('game', { instant: true });
        }
      });
    },
    onStartGame: (levelIndex, options = {}) => {
      game.start(levelIndex, options);
      showScreen('game', { instant: true });
    }
  });

  // Cascade split-flap letters visually on initial load (silent, no unprompted haptics/audio)
  setTimeout(() => {
    if (homeScreenInstance) {
      homeScreenInstance.animateTitle({ silent: true });
    }
  }, 120);

  new InputManager(game, elements);

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      game.saveCurrentLevelState();
    });

    // Prevent sticky hover and focus on touch press across all buttons and interactive cards
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') {
        const btn = e.target.closest('button, [role="button"], .hero-split-flap-board');
        if (btn) {
          btn.blur();
        }
      }
    }, { passive: true });
  }

  PlatformBridge.init({
    onPause: (reason) => {
      audioService.suspend();
      game.saveCurrentLevelState();
    },
    onResume: (reason) => {
      audioService.resume();
    },
    onBackAction: () => {
      // 0. If studio intro overlay is active, dismiss it on back press
      const startupOverlay = document.getElementById('startupOverlay');
      if (startupOverlay) {
        startupOverlay.dispatchEvent(new PointerEvent('pointerdown'));
        return true;
      }

      // 0.5 If onboarding tour is active, dismiss tour on back press
      if (OnboardingTour.isActive()) {
        OnboardingTour.dismiss();
        return true;
      }

      // 1. If modal overlay is open, close modal
      if (modalManager.isOpen()) {
        modalManager.close();
        return true;
      }

      // 2. If inside Settings Screen:
      if (elements.settingsScreen && elements.settingsScreen.classList.contains('active')) {
        // If nested subview is active, close subview
        if (settingsScreenInstance && settingsScreenInstance.hasActiveSubview()) {
          settingsScreenInstance.closeSubview();
          return true;
        }
        // Return to previous screen (or home)
        showScreen(previousScreen === 'game' ? 'game' : 'home');
        return true;
      }

      // 3. If inside Level Select Screen:
      if (elements.levelSelectScreen && elements.levelSelectScreen.classList.contains('active')) {
        showScreen('home');
        return true;
      }

      // 4. If in game screen:
      if (elements.gameScreen.classList.contains('active')) {
        // If a letter group is selected, clear selection first
        if (gameState.selectedGroup) {
          gameState.selectedGroup = null;
          renderer.updateBoardState(gameState.groups, gameState);
          return true;
        }

        // If level has already been completed/won, return to home with interstitial ad
        if (gameState.isWon) {
          showScreen('home', { instant: true });
          if (AdService.shouldShowInterstitial({ force: true })) {
            AdService.showInterstitial();
          }
          return true;
        }

        // Show confirmation modal to return to home
        modalManager.open('returnHome', {
          onConfirm: () => {
            showScreen('home', { instant: true });
          }
        });
        return true;
      }

      // 4. On home screen: let OS minimize app
      return false;
    }
  });

  // Automatically check for in-app updates upon opening app
  async function checkAutoUpdate() {
    try {
      const updateInfo = await AppUpdateService.checkForUpdate();
      if (updateInfo && (updateInfo.available || updateInfo.isDownloaded)) {
        if (activeScreen === 'home' && !modalManager.isOpen()) {
          modalManager.open('appUpdate', updateInfo);
        }
      }
    } catch (err) {
      console.warn('[Flapcrypt] Auto-update check error:', err);
    }
  }

  if (introCompleted) {
    checkAutoUpdate();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
