/**
 * FlapCrypt — Notification & Daily Reminder Service
 * Handles native Android push/local notifications, permission requests without system settings redirect,
 * daily alarm scheduling, and dev testing.
 */

class NotificationServiceImpl {
  isNativeAvailable() {
    return typeof window !== 'undefined' && Boolean(window.Capacitor?.Plugins?.DailyNotification);
  }

  /**
   * Requests notification permissions from the OS.
   * On Android 13+, triggers standard in-app permission pop-up.
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestPermission() {
    if (this.isNativeAvailable()) {
      try {
        const result = await window.Capacitor.Plugins.DailyNotification.requestPermissions();
        return Boolean(result && result.granted);
      } catch (err) {
        console.warn('[NotificationService] Native permission request failed:', err);
        return false;
      }
    }

    // Web Notification API fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (_) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if notification permission is currently granted.
   * @returns {Promise<boolean>}
   */
  async isPermissionGranted() {
    if (this.isNativeAvailable()) {
      try {
        const result = await window.Capacitor.Plugins.DailyNotification.isPermissionGranted();
        return Boolean(result && result.granted);
      } catch (err) {
        return false;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }

    return true;
  }

  /**
   * Schedules recurring daily reminder (default 9:00 AM).
   * @param {Object} [options]
   * @param {number} [options.hour=9]
   * @param {number} [options.minute=0]
   */
  async scheduleDailyReminder({ hour = 9, minute = 0 } = {}) {
    if (this.isNativeAvailable()) {
      try {
        return await window.Capacitor.Plugins.DailyNotification.scheduleDailyReminder({ hour, minute });
      } catch (err) {
        console.warn('[NotificationService] Failed to schedule native daily reminder:', err);
      }
    }
    return { success: true };
  }

  /**
   * Cancels the scheduled daily reminder.
   */
  async cancelDailyReminder() {
    if (this.isNativeAvailable()) {
      try {
        return await window.Capacitor.Plugins.DailyNotification.cancelDailyReminder();
      } catch (err) {
        console.warn('[NotificationService] Failed to cancel native daily reminder:', err);
      }
    }
    return { success: true };
  }

  /**
   * Immediately fires a test notification to the system tray for testing.
   */
  async sendTestNotification() {
    if (this.isNativeAvailable()) {
      try {
        return await window.Capacitor.Plugins.DailyNotification.sendTestNotification();
      } catch (err) {
        console.warn('[NotificationService] Failed to send native test notification:', err);
      }
    }

    // Web Notification API fallback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('FLAPCRYPT', {
          body: "Today's puzzle is waiting for you! Can you crack today's code?",
          icon: '/assets/icon.png'
        });
      } catch (_) {}
    }

    return { success: true };
  }
}

export const NotificationService = new NotificationServiceImpl();
