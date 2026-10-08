/**
 * FlapCrypt — Platform Lifecycle & Hardware Integration Bridge
 * Provides cross-platform visibility tracking, background audio sleep, haptics, and back gestures.
 */

import { TargetConfig } from "./target-config.js";

const isCapacitor = typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());

let hasUserInteracted = false;
if (typeof window !== "undefined") {
  const onFirstInteraction = () => {
    hasUserInteracted = true;
    window.removeEventListener("pointerdown", onFirstInteraction, true);
    window.removeEventListener("keydown", onFirstInteraction, true);
    window.removeEventListener("touchstart", onFirstInteraction, true);
  };
  window.addEventListener("pointerdown", onFirstInteraction, true);
  window.addEventListener("keydown", onFirstInteraction, true);
  window.addEventListener("touchstart", onFirstInteraction, true);
}

let onPauseCallback = null;
let onResumeCallback = null;
let onBackActionCallback = null;

export const PlatformBridge = {
  /**
   * Initializes lifecycle listeners for Web, Desktop, and Capacitor mobile.
   */
  async init({ onPause, onResume, onBackAction } = {}) {
    onPauseCallback = onPause;
    onResumeCallback = onResume;
    onBackActionCallback = onBackAction;

    // 1. Standard Web Page Visibility API
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          if (typeof onPauseCallback === "function") onPauseCallback("visibility_hidden");
        } else {
          if (typeof onResumeCallback === "function") onResumeCallback("visibility_visible");
        }
      });
    }

    // 2. Window Focus / Blur Listeners
    if (typeof window !== "undefined") {
      window.addEventListener("blur", () => {
        if (typeof onPauseCallback === "function") onPauseCallback("window_blur");
      });
      window.addEventListener("focus", () => {
        if (typeof onResumeCallback === "function") onResumeCallback("window_focus");
      });

      // Popstate fallback for browser back gesture
      window.addEventListener("popstate", () => {
        this.handleBackButton();
      });

      try {
        window.history.pushState({ app: "flapcrypt" }, "");
      } catch (_) {}
    }

    // 3. Native Capacitor Bridge (if running inside native Android/iOS shell)
    if (isCapacitor && window.Capacitor?.Plugins?.App) {
      try {
        const App = window.Capacitor.Plugins.App;
        App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) {
            if (typeof onPauseCallback === "function") onPauseCallback("capacitor_app_inactive");
          } else {
            if (typeof onResumeCallback === "function") onResumeCallback("capacitor_app_active");
          }
        });

        App.addListener("backButton", () => {
          this.handleBackButton();
        });
      } catch (err) {
        console.warn("[PlatformBridge] Capacitor App listeners setup skipped:", err);
      }
    }

    if (isCapacitor && window.Capacitor?.Plugins?.StatusBar) {
      try {
        const StatusBar = window.Capacitor.Plugins.StatusBar;
        await StatusBar.hide();
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch (err) {
        console.warn("[PlatformBridge] StatusBar setup skipped:", err);
      }
    }
  },

  handleBackButton() {
    if (typeof onBackActionCallback === "function") {
      const handled = onBackActionCallback();
      if (!handled && isCapacitor && window.Capacitor?.Plugins?.App) {
        window.Capacitor.Plugins.App.minimizeApp();
      } else if (!handled) {
        try {
          window.history.pushState({ app: "flapcrypt" }, "");
        } catch (_) {}
      }
    }
  },

  // ── Haptic Vibration ───────────────────────────────────────────────────────
  canVibrate() {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
    if ("userActivation" in navigator) {
      return Boolean(navigator.userActivation.hasBeenActive);
    }
    return hasUserInteracted;
  },

  async vibrateLight() {
    if (!TargetConfig.features.haptics) return;
    if (isCapacitor && window.Capacitor?.Plugins?.Haptics) {
      try {
        await window.Capacitor.Plugins.Haptics.impact({ style: "LIGHT" });
      } catch (_) {}
    } else if (this.canVibrate()) {
      try { navigator.vibrate(12); } catch (_) {}
    }
  },

  async vibrateSuccess() {
    if (!TargetConfig.features.haptics) return;
    if (isCapacitor && window.Capacitor?.Plugins?.Haptics) {
      try {
        await window.Capacitor.Plugins.Haptics.notification({ type: "SUCCESS" });
      } catch (_) {}
    } else if (this.canVibrate()) {
      try { navigator.vibrate([25, 60, 30]); } catch (_) {}
    }
  },

  // ── Safe URL Opener ────────────────────────────────────────────────────────
  openExternalUrl(url) {
    if (!url || typeof window === "undefined") return;

    // Tauri Desktop native URL opener
    const tauriInvoke = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
    if (typeof tauriInvoke === "function") {
      try {
        tauriInvoke("open_url", { url });
        return;
      } catch (err) {
        console.warn("[PlatformBridge] Tauri open_url error:", err);
      }
    }

    // Web / browser standard fallback
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (_) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  },

  isCapacitor: () => isCapacitor
};
