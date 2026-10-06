# Refactor & Migration Report

## 1. Summary of Changes
The monolithic single-file implementation in `index.html` was refactored into a structured, modular Vite application. All existing behaviors, rules, timings, audio synthesis, and visual designs were strictly preserved.

---

## 2. Inventory of File Transformations

| Original Monolith Location | Refactored Destination | Purpose |
| :--- | :--- | :--- |
| `<style>` (Root Variables, Layout, Typography) | `styles/main.css` | Base stylesheet, variables, and typography. |
| `<style>` (Board, Word, Cell, Tag layouts) | `styles/board.css` | Board layout and responsive cell positioning. |
| `<style>` (3D Flap Perspective, Highlights, Seams) | `styles/flaps.css` | 3D transform keyframes and fixed clue card styling. |
| `<style>` (Controls Deck, Badges, Status Bar) | `styles/controls.css` | Button steppers, badges, and status bar styles. |
| `const LEVEL_DATA = [...]` | `src/data/levels.js` | Isolated level content repository. |
| `const ORDER = ...`, animation/audio constants | `src/config/constants.js` | Immutable configuration and constants. |
| `function createRng(...)` | `src/utils/prng.js` | Deterministic pseudo-random number generator. |
| `function buildCipherMap(...)` | `src/core/Cipher.js` | Pure cipher derangement generator. |
| Audio functions (`audio()`, `playClick()`, `playTone()`) | `src/core/AudioService.js` | Web Audio API click/tone engine. |
| State variables (`drums`, `groups`, `isWon`, etc.) | `src/core/GameState.js` | Pure state store and validation rules. |
| `function animateFlap(...)` | `src/rendering/FlapAnimator.js` | Web Animations API 3D flip animation controller. |
| `function renderWordBlock(...)`, board DOM creation | `src/rendering/BoardRenderer.js` | DOM generation and visual cell state updates. |
| Status text, badges, toggle button updates | `src/ui/UIController.js` | HUD display updates and feedback. |
| `addEventListener("keydown")`, button click bindings | `src/input/InputManager.js` | Unified user input event management. |
| `function buildLevel(...)`, `stepDrum(...)`, lifecycle | `src/core/Game.js` | Main coordinator tying all modules together. |
| Root document script | `src/main.js` | Application bootstrapper. |
| Monolithic `index.html` | Clean `index.html` | Minimal HTML shell with module script tag. |

---

## 3. Behavior Preservation Verification

### Checked Gameplay & Mechanics:
- **Cipher Generation**: Same deterministic seed formula (`seed * 97 + 13`) guarantees identical cipher permutations per level.
- **Flap Physics & Animation**: Identical 65ms/80ms 3D flip keyframes (`rotateX(0deg)` to `rotateX(-90deg)` / `rotateX(90deg)` to `rotateX(0deg)`).
- **Audio Feedback**: Exact synthesized bandpass click frequencies (1600Hz + jitter) and tone chimes (650Hz + index * 16Hz).
- **Fixed Clue Clamping**: Starting fixed clues (`level.given`) are identically calculated and protected from manual edits.
- **Both Flaps Mode**: Synchronized top/bottom stepping with <kbd>L</kbd> toggle preserved.
- **Guessable Author**: Author row with identical `—` styling and shared cipher mapping preserved.
- **Punctuation Tiles**: Fixed punctuation cards remain non-interactive and styled consistently.

---

## 4. Build Verification Results

### Build Command:
`npm run build`

### Results:
- Bundler: Vite v6
- Output Directory: `dist/`
- Chunks Generated:
  - `dist/index.html`
  - `dist/assets/index-[hash].js`
  - `dist/assets/index-[hash].css`
- Zero errors, zero warnings.
