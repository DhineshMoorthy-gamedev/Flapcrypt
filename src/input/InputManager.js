export class InputManager {
  constructor(game, elements) {
    this.game = game;
    this.elements = elements;
    this.setupListeners();
  }

  setupListeners() {
    // Keyboard listener
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;

      if (key === "l" || key === "L") {
        this.game.handleToggleLinked();
        e.preventDefault();
      } else if (/^[a-zA-Z]$/.test(key)) {
        this.game.handleTypeLetter(key.toUpperCase());
        e.preventDefault();
      } else if (key === "ArrowUp") {
        this.game.handleStep(e.shiftKey ? "b" : "t", 1);
        e.preventDefault();
      } else if (key === "ArrowDown") {
        this.game.handleStep(e.shiftKey ? "b" : "t", -1);
        e.preventDefault();
      } else if (key === "ArrowRight" || key === "Tab" || key === " ") {
        this.game.handleMoveSelection(1);
        e.preventDefault();
      } else if (key === "ArrowLeft") {
        this.game.handleMoveSelection(-1);
        e.preventDefault();
      } else if (key === "Backspace" || key === "Delete") {
        this.game.handleClear();
        e.preventDefault();
      }
    });

    // Button Click Listeners
    if (this.elements.linkToggleBtn) {
      this.elements.linkToggleBtn.addEventListener('click', () => this.game.handleToggleLinked());
    }

    if (this.elements.tu) {
      this.elements.tu.addEventListener('click', () => this.game.handleStep('t', 1));
    }
    if (this.elements.td) {
      this.elements.td.addEventListener('click', () => this.game.handleStep('t', -1));
    }
    if (this.elements.bu) {
      this.elements.bu.addEventListener('click', () => this.game.handleStep('b', 1));
    }
    if (this.elements.bd) {
      this.elements.bd.addEventListener('click', () => this.game.handleStep('b', -1));
    }

    if (this.elements.clearBtn) {
      this.elements.clearBtn.addEventListener('click', () => this.game.handleClear());
    }

    if (this.elements.hintBtn) {
      this.elements.hintBtn.addEventListener('click', () => this.game.handleHint());
    }

    if (this.elements.prevBtn) {
      this.elements.prevBtn.addEventListener('click', () => this.game.handlePrevLevel());
    }

    if (this.elements.nextBtn) {
      this.elements.nextBtn.addEventListener('click', () => this.game.handleNextLevel());
    }

    if (this.elements.soundBtn) {
      this.elements.soundBtn.addEventListener('click', () => this.game.handleToggleSound());
    }
  }
}
