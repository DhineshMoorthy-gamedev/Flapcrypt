/**
 * FlapCrypt — Reusable Toast Notification System
 * Renders sleek, mechanical-themed toast pills with icons, backdrop blur, and smooth animations.
 */

import { Icons } from './Icons.js';

class ToastManager {
  constructor() {
    this.toastEl = null;
    this.timer = null;
    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('appToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'appToast';
      el.className = 'app-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    this.toastEl = el;
  }

  /**
   * Displays a toast notification.
   * @param {string} message - Text content to display
   * @param {Object} options - Customization options
   * @param {'success'|'info'|'warning'|'error'} [options.type='success']
   * @param {number} [options.duration=3200] - Duration in ms before auto-dismiss
   * @param {string} [options.icon] - Custom SVG string
   */
  show(message, { type = 'success', duration = 3200, icon = null } = {}) {
    if (!this.toastEl) this.init();
    if (!this.toastEl) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    let defaultIcon = '';
    if (icon) {
      defaultIcon = icon;
    } else if (type === 'success') {
      defaultIcon = `
        <svg class="ui-icon toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
    } else if (type === 'warning' || type === 'error') {
      defaultIcon = `
        <svg class="ui-icon toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      `;
    } else {
      defaultIcon = `
        <svg class="ui-icon toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      `;
    }

    this.toastEl.className = `app-toast toast-${type}`;
    this.toastEl.innerHTML = `
      <span class="toast-icon-wrapper">${defaultIcon}</span>
      <span class="toast-message">${message}</span>
    `;

    // Trigger reflow to restart CSS animation if re-opening quickly
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('active');

    this.timer = setTimeout(() => {
      this.dismiss();
    }, duration);
  }

  dismiss() {
    if (this.toastEl) {
      this.toastEl.classList.remove('active');
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const Toast = new ToastManager();
