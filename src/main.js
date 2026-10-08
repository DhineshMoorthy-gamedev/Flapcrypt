import '../styles/main.css';
import '../styles/board.css';
import '../styles/flaps.css';
import '../styles/controls.css';
import '../styles/home.css';
import '../styles/settings.css';
import '../styles/level-select.css';

import { $ } from './utils/dom.js';
import { GameState } from './core/GameState.js';
import { AudioService } from './core/AudioService.js';
import { StorageService } from './core/StorageService.js';
import { BoardRenderer } from './rendering/BoardRenderer.js';
import { UIController } from './ui/UIController.js';
import { HomeScreen } from './ui/HomeScreen.js';
import { SettingsScreen } from './ui/SettingsScreen.js';
import { LevelSelectScreen } from './ui/LevelSelectScreen.js';
import { ModalManager } from './ui/ModalManager.js';
import { InputManager } from './input/InputManager.js';
import { Game } from './core/Game.js';
import { TargetConfig } from './platform/target-config.js';
import { PlatformBridge } from './platform/lifecycle.js';
import { Confetti } from './ui/Confetti.js';

function initApp() {
  // Expose config for runtime inspection and set DOM attributes
  if (typeof window !== 'undefined') {
    window.TargetConfig = TargetConfig;
  }
  document.body.setAttribute('data-target', TargetConfig.mode);

  const elements = {
    homeScreen: $('homeScreen'),
    gameScreen: $('gameScreen'),
    settingsScreen: $('settingsScreen'),
    levelSelectScreen: $('levelSelectScreen'),
    board: $('board'),
    quoteArea: $('quoteArea'),
    authorRow: $('authorRow'),
    levelTitleText: $('levelTitleText'),
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
    window.resetFlapcrypt = () => {
      localStorage.clear();
      console.log('%c[Flapcrypt] All game data, campaign progress, daily streaks, and settings have been completely reset.', 'color: #34D399; font-weight: bold;');
      location.reload();
    };
    window.flapcrypt = {
      storage: storageService,
      game: null, // assigned below
      resetAll: window.resetFlapcrypt
    };
  }

  // Sync initial sound preference
  audioService.setSoundEnabled(storageService.isSoundEnabled());

  const renderer = new BoardRenderer(elements.board, elements.quoteArea, elements.authorRow);
  const uiController = new UIController(elements);

  let homeScreenInstance = null;
  let settingsScreenInstance = null;
  let levelSelectScreenInstance = null;
  let activeScreen = 'home';
  let previousScreen = 'home';

  function showScreen(screenName) {
    if (activeScreen === screenName) return;
    previousScreen = activeScreen;
    activeScreen = screenName;

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
      if (elements.levelSelectScreen) {
        elements.levelSelectScreen.classList.add('active');
      }
      if (levelSelectScreenInstance) {
        levelSelectScreenInstance.render();
      }
      if (homeScreenInstance) {
        homeScreenInstance.clearAnimation();
      }
    } else {
      elements.homeScreen.classList.add('active');
      if (homeScreenInstance) {
        homeScreenInstance.resetTitle();
        homeScreenInstance.updateProgress();
        // Delay cascade until the 0.25s screen transition settles
        setTimeout(() => {
          if (elements.homeScreen.classList.contains('active')) {
            homeScreenInstance.animateTitle();
          }
        }, 260);
      }
    }
  }

  const modalManager = new ModalManager({
    storageService,
    audioService,
    onProgressReset: () => {
      if (homeScreenInstance) {
        homeScreenInstance.updateProgress();
      }
    }
  });

  const game = new Game({
    gameState,
    audioService,
    renderer,
    uiController,
    storageService,
    onReturnToHome: () => {
      modalManager.open('returnHome', {
        onConfirm: () => {
          showScreen('home');
        }
      });
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
          showScreen('game');
          requestAnimationFrame(() => {
            game.start(nextIdx, { mode: 'campaign' });
          });
        },
        onLevelSelect: () => {
          showScreen('levelSelect');
        },
        onHome: () => {
          showScreen('home');
        }
      });
    }
  });

  if (typeof window !== 'undefined' && window.flapcrypt) {
    window.flapcrypt.game = game;
  }

  if (elements.gameHelpBtn) {
    elements.gameHelpBtn.addEventListener('click', () => {
      modalManager.open('howToPlay');
    });
  }

  if (elements.gameSettingsBtn) {
    elements.gameSettingsBtn.addEventListener('click', () => {
      showScreen('settings');
    });
  }

  settingsScreenInstance = new SettingsScreen({
    container: elements.settingsScreen,
    storageService,
    audioService,
    onBack: () => {
      showScreen(previousScreen === 'game' ? 'game' : 'home');
    }
  });

  levelSelectScreenInstance = new LevelSelectScreen({
    container: elements.levelSelectScreen,
    storageService,
    audioService,
    onSelectLevel: (levelIndex) => {
      showScreen('game');
      requestAnimationFrame(() => {
        game.start(levelIndex, { mode: 'campaign' });
      });
    },
    onBack: () => {
      showScreen('home');
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
      showScreen('levelSelect');
    },
    onStartGame: (levelIndex, options = {}) => {
      showScreen('game');
      requestAnimationFrame(() => {
        game.start(levelIndex, options);
      });
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
        // Show confirmation modal to return to home
        modalManager.open('returnHome', {
          onConfirm: () => {
            showScreen('home');
          }
        });
        return true;
      }

      // 4. On home screen: let OS minimize app
      return false;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
