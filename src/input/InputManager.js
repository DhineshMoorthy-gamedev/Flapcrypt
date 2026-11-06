export class InputManager {
  constructor(game, elements) {
    this.game = game;
    this.elements = elements;
    this.setupListeners();
  }

  setupListeners() {
    // Keyboard listener
    document.addEventListener("keydown", (e) => {
      if (document.body.classList.contains("tour-active")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const key = e.key;

      if (/^[a-zA-Z]$/.test(key)) {
        this.game.handleTypeLetter(key.toUpperCase());
        e.preventDefault();
      } else if (key === "ArrowUp") {
        this.game.handleStep('t', 1);
        e.preventDefault();
      } else if (key === "ArrowDown") {
        this.game.handleStep('t', -1);
        e.preventDefault();
      } else if (key === "Tab") {
        this.game.handleNavigateUnsolved(e.shiftKey ? -1 : 1);
        e.preventDefault();
      } else if (key === "ArrowRight" || key === " ") {
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

    // Stepper Button Click Listeners (Forward ▲ and Reverse ▼)
    const forwardBtn = this.elements.tu || this.elements.stepUpBtn;
    if (forwardBtn) {
      forwardBtn.addEventListener('click', () => this.game.handleStep('t', 1));
    }

    const reverseBtn = this.elements.td || this.elements.stepDownBtn;
    if (reverseBtn) {
      reverseBtn.addEventListener('click', () => this.game.handleStep('t', -1));
    }

    if (this.elements.hintBtn) {
      this.elements.hintBtn.addEventListener('click', () => this.game.handleHint());
    }

    if (this.elements.prevBtn) {
      this.elements.prevBtn.addEventListener('click', () => this.game.handleNavigateUnsolved(-1));
    }

    if (this.elements.nextBtn) {
      this.elements.nextBtn.addEventListener('click', () => this.game.handleNavigateUnsolved(1));
    }


    if (this.elements.soundBtn) {
      this.elements.soundBtn.addEventListener('click', () => this.game.handleToggleSound());
    }

    if (this.elements.homeBtn) {
      this.elements.homeBtn.addEventListener('click', () => this.game.handleReturnToHome());
    }

    if (this.elements.btnResetLevel) {
      this.elements.btnResetLevel.addEventListener('click', () => this.game.handleRequestResetLevel());
    }
  }
}

