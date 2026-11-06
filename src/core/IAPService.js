/**
 * FlapCrypt — In-App Purchase (IAP) Service
 * Bridges to Google Play Billing (v7.1.1) on native Android, with dev sandbox support for web/desktop.
 */

import { TargetConfig } from '../platform/target-config.js';

export const IAP_PRODUCTS = {
  REMOVE_ADS: {
    id: 'remove_ads',
    type: 'inapp',
    defaultPrice: '$4.90',
    name: 'Remove Advertisements',
    desc: 'Permanently disable banner ads & intermissions',
    isConsumable: false
  },
  HINTS_25: {
    id: 'hints_25',
    type: 'inapp',
    defaultPrice: '$2.45',
    name: '25 Hints Pack',
    desc: '25 letter decryption assists',
    hints: 25,
    isConsumable: true
  },
  HINTS_50: {
    id: 'hints_50',
    type: 'inapp',
    defaultPrice: '$4.90',
    name: '50 Hints Pack',
    desc: '50 letter decryption assists for marathon solves',
    hints: 50,
    isConsumable: true
  }
};

class IAPServiceImpl {
  constructor() {
    this.storage = null;
    this.audio = null;
    this.listeners = new Set();
    this.cachedProductDetails = {};
    this.isInitialized = false;
  }

  init(storageService, audioService) {
    this.storage = storageService;
    this.audio = audioService;
    this.isInitialized = true;

    if (!TargetConfig.capabilities.hasIAP) {
      console.log('[IAPService] Standalone target active — billing disabled.');
      return;
    }

    // Prefetch live Google Play prices if on native Android
    this.queryProducts().catch(err => {
      console.warn('[IAPService] Initial product query skipped:', err);
    });
  }

  isNativeBillingAvailable() {
    return typeof window !== 'undefined' && Boolean(window.Capacitor?.Plugins?.Billing);
  }

  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
    return () => this.listeners.delete(callback);
  }

  notify(event, data) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (e) {
        console.error('[IAPService] Listener callback error:', e);
      }
    });
  }

  async queryProducts() {
    if (!this.isNativeBillingAvailable()) {
      return Object.values(IAP_PRODUCTS);
    }

    try {
      const res = await window.Capacitor.Plugins.Billing.queryProducts();
      if (res && res.products && Array.isArray(res.products)) {
        res.products.forEach(p => {
          if (p.productId) {
            this.cachedProductDetails[p.productId] = p;
          }
        });
      }
      return res?.products || [];
    } catch (err) {
      console.warn('[IAPService] Failed to query Google Play products:', err);
      return [];
    }
  }

  getPrice(productId) {
    const cached = this.cachedProductDetails[productId];
    if (cached && cached.formattedPrice) {
      return cached.formattedPrice;
    }
    const def = IAP_PRODUCTS[Object.keys(IAP_PRODUCTS).find(k => IAP_PRODUCTS[k].id === productId)];
    return def ? def.defaultPrice : '$4.90';
  }

  /**
   * Purchases an in-app product.
   * @param {string} productId - 'remove_ads', 'hints_25', or 'hints_50'
   * @param {Object} [options]
   * @returns {Promise<{ success: boolean, cancelled?: boolean, error?: string }>}
   */
  async purchase(productId, options = {}) {
    const productMeta = Object.values(IAP_PRODUCTS).find(p => p.id === productId);
    if (!productMeta) {
      return { success: false, error: `Unknown product ID: ${productId}` };
    }

    // 1. Native Google Play Billing Flow
    if (this.isNativeBillingAvailable()) {
      try {
        const res = await window.Capacitor.Plugins.Billing.purchase({ productId });
        if (res && res.cancelled) {
          return { success: false, cancelled: true };
        }

        if (res && res.success) {
          this.deliverProduct(productId, productMeta);
          return { success: true, productId };
        }

        return { success: false, error: res?.error || 'Purchase could not be verified' };
      } catch (err) {
        console.error('[IAPService] Native purchase exception:', err);
        return { success: false, error: err.message || 'Google Play purchase error' };
      }
    }

    // 2. Dev / Web Sandbox Fallback
    return new Promise((resolve) => {
      const price = this.getPrice(productId);
      const isDevConfirm = window.confirm(
        `[FLAPCRYPT TEST SANDBOX]\n\nPurchase ${productMeta.name} for ${price}?\n\n(Click OK to simulate successful Google Play Billing completion)`
      );

      if (isDevConfirm) {
        this.deliverProduct(productId, productMeta);
        resolve({ success: true, productId, isSandbox: true });
      } else {
        resolve({ success: false, cancelled: true });
      }
    });
  }

  deliverProduct(productId, productMeta) {
    if (productId === 'remove_ads') {
      if (this.storage) {
        this.storage.setRemoveAds(true);
      }
      if (this.audio) {
        this.audio.playVictoryFanfare();
      }
      this.notify('purchase_remove_ads', { productId });
    } else if (productId === 'hints_25') {
      let newBalance = 25;
      if (this.storage) {
        newBalance = this.storage.addHints(25);
      }
      if (this.audio) {
        this.audio.playVictoryFanfare();
      }
      this.notify('purchase_hints', { productId, added: 25, newBalance });
    } else if (productId === 'hints_50') {
      let newBalance = 50;
      if (this.storage) {
        newBalance = this.storage.addHints(50);
      }
      if (this.audio) {
        this.audio.playVictoryFanfare();
      }
      this.notify('purchase_hints', { productId, added: 50, newBalance });
    }
  }

  /**
   * Restores non-consumable purchases from Google Play.
   */
  async restorePurchases() {
    if (!this.isNativeBillingAvailable()) {
      const hasAdsRemoved = this.storage ? this.storage.hasRemovedAds() : false;
      return {
        success: true,
        restoredCount: hasAdsRemoved ? 1 : 0,
        hasRemoveAds: hasAdsRemoved,
        isSandbox: true
      };
    }

    try {
      const res = await window.Capacitor.Plugins.Billing.restorePurchases();
      if (res && res.success) {
        let restoredCount = 0;
        if (res.removeAds || (res.ownedProducts && res.ownedProducts.includes('remove_ads'))) {
          if (this.storage) {
            this.storage.setRemoveAds(true);
          }
          restoredCount++;
          this.notify('purchase_remove_ads', { productId: 'remove_ads', restored: true });
        }

        return {
          success: true,
          restoredCount,
          hasRemoveAds: Boolean(res.removeAds),
          ownedProducts: res.ownedProducts || []
        };
      }

      return { success: false, error: 'Failed to query purchases' };
    } catch (err) {
      console.error('[IAPService] restorePurchases exception:', err);
      return { success: false, error: err.message || 'Google Play restore error' };
    }
  }
}

export const IAPService = new IAPServiceImpl();
