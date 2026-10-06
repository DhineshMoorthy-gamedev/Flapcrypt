import '../styles/main.css';
import '../styles/board.css';
import '../styles/flaps.css';
import '../styles/controls.css';

import { $ } from './utils/dom.js';
import { GameState } from './core/GameState.js';
import { AudioService } from './core/AudioService.js';
import { BoardRenderer } from './rendering/BoardRenderer.js';
import { UIController } from './ui/UIController.js';
import { InputManager } from './input/InputManager.js';
import { Game } from './core/Game.js';
import { TargetConfig } from './platform/target-config.js';
import { PlatformBridge } from './platform/lifecycle.js';

function initApp() {
  // Expose config for runtime inspection and set DOM attributes
  if (typeof window !== 'undefined') {
    window.TargetConfig = TargetConfig;
  }
  document.body.setAttribute('data-target', TargetConfig.mode);
  const elements = {
    board: $('board'),
    quoteArea: $('quoteArea'),
    authorRow: $('authorRow'),
    levelBadge: $('levelBadge'),
    prevLevelBtn: $('prevLevelBtn'),
    nextLevelBtn: $('nextLevelBtn'),
    letterBadge: $('letterBadge'),
    statusBar: $('status-bar'),
    tu: $('tu'),
    td: $('td'),
    hintBtn: $('hint'),
    prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'),
    soundBtn: $('soundBtn')
  };

  const gameState = new GameState();
  const audioService = new AudioService();
  const renderer = new BoardRenderer(elements.board, elements.quoteArea, elements.authorRow);
  const uiController = new UIController(elements);

  const game = new Game({
    gameState,
    audioService,
    renderer,
    uiController
  });

  new InputManager(game, elements);

  PlatformBridge.init({
    onPause: (reason) => {
      audioService.suspend();
    },
    onResume: (reason) => {
      audioService.resume();
    },
    onBackAction: () => {
      // If a group is selected, clear selection first
      if (gameState.selectedGroup) {
        gameState.selectedGroup = null;
        renderer.updateBoardState(gameState.groups, gameState);
        return true; // handled
      }
      return false; // let OS minimize app
    }
  });

  game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
