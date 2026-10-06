/**
 * Target Platform Configuration Provider for FlapCrypt
 * Controls build-time and runtime feature flags for Web, Itch.io, Desktop (Tauri), and Android Play Store (Capacitor).
 */

export const TARGET_MODES = {
  WEB: "web",
  ITCH: "itch",
  DESKTOP: "desktop",
  PLAYSTORE: "playstore"
};

// Automatic detection for native Tauri Desktop runtime
const isTauriRuntime = typeof window !== "undefined" && Boolean(
  window.__TAURI_INTERNALS__ || window.__TAURI__ || window.__TAURI_METADATA__ || window.__TAURI_IPC__ || window.__TAURI_PATTERN__
);

const rawMode = (isTauriRuntime ? "desktop" : (import.meta.env?.VITE_APP_TARGET || "web")).toLowerCase();
const activeMode = Object.values(TARGET_MODES).includes(rawMode) ? rawMode : TARGET_MODES.WEB;

export const TargetConfig = {
  mode: activeMode,
  title: import.meta.env?.VITE_APP_TITLE || "FlapCrypt",
  version: "1.0.0",

  isWeb: activeMode === TARGET_MODES.WEB,
  isItch: activeMode === TARGET_MODES.ITCH,
  isDesktop: activeMode === TARGET_MODES.DESKTOP,
  isPlayStore: activeMode === TARGET_MODES.PLAYSTORE,

  features: {
    // Desktop and web browser fullscreen capability
    fullscreenControl: activeMode === TARGET_MODES.ITCH || activeMode === TARGET_MODES.WEB || activeMode === TARGET_MODES.DESKTOP,
    // Native haptic feedback for drum flips & solve celebrations
    haptics: activeMode === TARGET_MODES.PLAYSTORE,
    // Keyboard instructions banner display
    keyboardHints: true,
    // Mobile viewport & safe-area handling
    safeAreaPadding: activeMode === TARGET_MODES.PLAYSTORE || activeMode === TARGET_MODES.WEB
  }
};
