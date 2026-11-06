/**
 * FlapCrypt — Platform Lifecycle & Hardware Integration Bridge
 * Provides cross-platform visibility tracking, background audio sleep, haptics, and back gestures.
 */

import { TargetConfig } from "./target-config.js";

let _hapticsEnabled = true;

const checkCapacitor = () => typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.Plugins?.Haptics);

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
   * Enables or disables haptic vibration feedback dynamically from settings.
   */
  setHapticsEnabled(enabled) {
    _hapticsEnabled = Boolean(enabled);
  },

  isHapticsEnabled() {
    return _hapticsEnabled;
  },

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
    if (typeof window !== "undefined" && window.Capacitor?.Plugins?.App) {
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

    if (typeof window !== "undefined" && window.Capacitor?.Plugins?.StatusBar) {
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
      if (!handled && typeof window !== "undefined" && window.Capacitor?.Plugins?.App) {
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
    if (!_hapticsEnabled) return;

    if (typeof window !== "undefined" && window.Capacitor?.Plugins?.Haptics) {
      try {
        await window.Capacitor.Plugins.Haptics.impact({ style: "LIGHT" });
        return;
      } catch (_) {}
    }

    if (this.canVibrate()) {
      try {
        navigator.vibrate(15);
      } catch (_) {}
    }
  },

  async vibrateSuccess() {
    if (!_hapticsEnabled) return;

    if (typeof window !== "undefined" && window.Capacitor?.Plugins?.Haptics) {
      try {
        await window.Capacitor.Plugins.Haptics.notification({ type: "SUCCESS" });
        return;
      } catch (_) {}
    }

    if (this.canVibrate()) {
      try {
        navigator.vibrate([30, 50, 30]);
      } catch (_) {}
    }
  },

  // ── Safe URL Opener ────────────────────────────────────────────────────────
  async openExternalUrl(url) {
    if (!url || typeof window === "undefined") return;

    // Tauri Desktop native URL opener
    const tauriInvoke = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
    if (typeof tauriInvoke === "function") {
      try {
        await tauriInvoke("open_url", { url });
        return;
      } catch (err) {
        console.warn("[PlatformBridge] Tauri open_url error, attempting fallback:", err);
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

  // ── Native In-App Review & Store ───────────────────────────────────────────
  async requestInAppReview() {
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.olaidigitalstudios.flapcrypt";

    if (typeof window !== "undefined" && window.Capacitor?.Plugins?.InAppReview) {
      try {
        const res = await window.Capacitor.Plugins.InAppReview.requestReview();
        return res;
      } catch (err) {
        console.warn("[PlatformBridge] InAppReview plugin error, falling back to URL:", err);
        this.openExternalUrl(playStoreUrl);
        return { success: false, fallback: true };
      }
    }

    // Web / Desktop fallback
    this.openExternalUrl(playStoreUrl);
    return { success: true, fallback: true };
  },

  // ── Support Email ──────────────────────────────────────────────────────────
  openSupportMail({ email = "olaidigitalstudios@gmail.com", subject = `Flapcrypt Support & Feedback (v${TargetConfig.version})`, body = "" } = {}) {
    const defaultBody = body || `Hi Olai Digital Studios team,\n\n[Describe your feedback, bug report, or idea here]\n\n-------------------------\nApp: Flapcrypt (v${TargetConfig.version})\nPlatform: ${typeof navigator !== "undefined" ? navigator.userAgent : "Unknown"}\n`;
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(defaultBody)}`;

    if (typeof window !== "undefined") {
      try {
        window.location.href = mailtoUrl;
      } catch (_) {
        this.openExternalUrl(mailtoUrl);
      }
    }
  },

  isCapacitor: () => typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.()),

  capabilities: TargetConfig.capabilities,

  /**
   * Save data synchronization hook for desktop %APPDATA%/Flapcrypt/save.json
   */
  async saveDesktopBackup(dataJson) {
    if (!TargetConfig.capabilities.hasDesktopStorage || typeof window === "undefined") return;
    try {
      const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.tauri?.invoke || window.__TAURI_INTERNALS__?.invoke;
      if (typeof invoke === "function") {
        await invoke("backup_save_data", { payload: dataJson });
      }
    } catch (err) {
      console.warn("[PlatformBridge] Desktop backup failed:", err);
    }
  },

  /**
   * Loads save data from %APPDATA%/Flapcrypt/save.json if available
   */
  async loadDesktopBackup() {
    if (!TargetConfig.capabilities.hasDesktopStorage || typeof window === "undefined") return null;
    try {
      const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.tauri?.invoke || window.__TAURI_INTERNALS__?.invoke;
      if (typeof invoke === "function") {
        const raw = await invoke("load_save_data");
        return raw ? JSON.parse(raw) : null;
      }
    } catch (err) {
      console.warn("[PlatformBridge] Desktop save load failed:", err);
    }
    return null;
  }
};

