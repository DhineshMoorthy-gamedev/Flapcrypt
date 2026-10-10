/**
 * FlapCrypt — In-App Update Service
 * Communicates with Google Play In-App Updates on native Android via Capacitor AppUpdate plugin,
 * with graceful fallback and sandbox simulation for Web/Desktop.
 */

import { TargetConfig } from '../platform/target-config.js';

class AppUpdateServiceImpl {
  constructor() {
    this.cachedUpdateInfo = null;
  }

  isNativeUpdateAvailable() {
    return typeof window !== 'undefined' && Boolean(window.Capacitor?.Plugins?.AppUpdate);
  }

  /**
   * Checks for available updates via Google Play In-App Updates API.
   * @returns {Promise<{
   *   available: boolean,
   *   availableVersionName?: string,
   *   availableVersionCode?: number,
   *   currentVersion: string,
   *   currentVersionCode: number,
   *   isDownloaded?: boolean,
   *   isFlexibleAllowed?: boolean,
   *   isImmediateAllowed?: boolean,
   *   releaseNotes?: string[],
   *   error?: string
   * }>}
   */
  async checkForUpdate() {
    const currentVersion = TargetConfig.version;
    const currentVersionCode = TargetConfig.versionCode;

    if (this.isNativeUpdateAvailable()) {
      try {
        const result = await window.Capacitor.Plugins.AppUpdate.checkForUpdate();
        this.cachedUpdateInfo = result;

        const isAvailable = Boolean(result.available);
        const availableVersionCode = result.availableVersionCode || currentVersionCode;
        
        // Calculate estimated version name if not explicitly provided
        let availableVersionName = result.availableVersionName;
        if (!availableVersionName && availableVersionCode > currentVersionCode) {
          availableVersionName = `0.0.${availableVersionCode}`;
        }

        return {
          available: isAvailable,
          availableVersionName: availableVersionName || currentVersion,
          availableVersionCode,
          currentVersion,
          currentVersionCode,
          isDownloaded: Boolean(result.isDownloaded),
          isFlexibleAllowed: Boolean(result.isFlexibleAllowed),
          isImmediateAllowed: Boolean(result.isImmediateAllowed),
          inProgress: Boolean(result.inProgress),
          releaseNotes: [
            'New Cryptogram Puzzle Categories & Quotes',
            'Sleek 3-Column Home Navigation Dock',
            'Mechanical Split-Flap Animation Polish',
            'Performance Improvements & Bug Fixes'
          ],
          error: result.error || null
        };
      } catch (err) {
        console.warn('[AppUpdateService] Native update check failed:', err);
        return {
          available: false,
          currentVersion,
          currentVersionCode,
          error: err?.message || 'Update check failed'
        };
      }
    }

    // Web / Desktop / Dev Fallback: Simulated latency check
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      available: false,
      currentVersion,
      currentVersionCode,
      releaseNotes: [
        'New Cryptogram Puzzle Categories & Quotes',
        'Sleek 3-Column Home Navigation Dock',
        'Mechanical Split-Flap Animation Polish',
        'Performance Improvements & Bug Fixes'
      ]
    };
  }

  /**
   * Starts Google Play in-app update flow or opens store page.
   * @param {'flexible'|'immediate'} [type='flexible']
   */
  async startUpdate(type = 'flexible') {
    if (this.isNativeUpdateAvailable()) {
      try {
        return await window.Capacitor.Plugins.AppUpdate.startUpdate({ type });
      } catch (err) {
        console.warn('[AppUpdateService] startUpdate error:', err);
        return this.openStore();
      }
    }

    // Web fallback: Open Google Play Store or itch page
    this.openStore();
    return { success: true, fallback: true };
  }

  /**
   * Completes a flexible update by restarting the app.
   */
  async completeUpdate() {
    if (this.isNativeUpdateAvailable()) {
      try {
        return await window.Capacitor.Plugins.AppUpdate.completeUpdate();
      } catch (err) {
        console.warn('[AppUpdateService] completeUpdate error:', err);
      }
    }
  }

  /**
   * Opens Google Play Store app page directly.
   */
  openStore() {
    if (this.isNativeUpdateAvailable()) {
      try {
        window.Capacitor.Plugins.AppUpdate.openStore();
        return;
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.open('https://play.google.com/store/apps/details?id=com.olaidigitalstudios.flapcrypt', '_blank');
    }
  }
}

export const AppUpdateService = new AppUpdateServiceImpl();
