/**
 * Telegram WebApp SDK Wrapper
 * Proper integration with Telegram Mini App
 */

class TelegramSDK {
  constructor() {
    this.webApp = window.Telegram?.WebApp;
    this.isReady = false;
    this.init();
  }

  init() {
    if (!this.webApp) {
      console.warn('Telegram WebApp not available');
      return;
    }

    this.webApp.ready();
    this.webApp.expand();
    this.applySafeAreas();
    this.applyTheme();
    this.isReady = true;

    // Listen for theme changes
    this.webApp.onEvent('themeChanged', () => {
      this.applyTheme();
    });
  }

  applySafeAreas() {
    if (!this.webApp) return;
    
    const safeAreaInset = this.webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
    const root = document.documentElement;
    
    root.style.setProperty('--tg-safe-area-top', `${safeAreaInset.top}px`);
    root.style.setProperty('--tg-safe-area-bottom', `${safeAreaInset.bottom}px`);
    root.style.setProperty('--tg-safe-area-left', `${safeAreaInset.left}px`);
    root.style.setProperty('--tg-safe-area-right', `${safeAreaInset.right}px`);
    root.style.setProperty('--tg-viewport-height', `${this.webApp.viewportHeight}px`);
    root.style.setProperty('--tg-viewport-stable-height', `${this.webApp.viewportStableHeight}px`);
  }

  applyTheme() {
    if (!this.webApp) return;

    const theme = this.webApp.themeParams || {};
    const root = document.documentElement;

    root.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-text-color', theme.text_color || '#000000');
    root.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#999999');
    root.style.setProperty('--tg-theme-link-color', theme.link_color || '#3390ec');
    root.style.setProperty('--tg-theme-button-color', theme.button_color || '#3390ec');
    root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
    root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#f4f4f5');
    root.style.setProperty('--tg-theme-header-bg-color', theme.header_bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-accent-text-color', theme.accent_text_color || '#3390ec');
    root.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color || '#6d6d72');
    root.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color || '#999999');
    root.style.setProperty('--tg-theme-destructive-text-color', theme.destructive_text_color || '#ff3b30');

    root.dataset.tgTheme = this.webApp.colorScheme || 'light';
  }

  // Init Data
  getInitData() {
    return this.webApp?.initData || '';
  }

  getInitDataUnsafe() {
    return this.webApp?.initDataUnsafe || {};
  }

  // User info
  getUser() {
    return this.webApp?.initDataUnsafe?.user || null;
  }

  // Haptic Feedback
  haptic(type = 'medium') {
    const types = ['light', 'medium', 'heavy', 'rigid', 'soft'];
    if (types.includes(type)) {
      this.webApp?.HapticFeedback?.impactOccurred(type);
    }
  }

  notificationOccurred(type = 'success') {
    const types = ['error', 'success', 'warning'];
    if (types.includes(type)) {
      this.webApp?.HapticFeedback?.notificationOccurred(type);
    }
  }

  selectionChanged() {
    this.webApp?.HapticFeedback?.selectionChanged();
  }

  // BackButton
  showBackButton(callback) {
    if (!this.webApp) return;
    this.webApp.BackButton.show();
    if (callback) {
      this.webApp.BackButton.onClick(callback);
    }
  }

  hideBackButton() {
    this.webApp?.BackButton.hide();
  }

  // MainButton (improved)
  setupMainButton(config) {
    if (!this.webApp) return () => {};

    const {
      text,
      onClick,
      color,
      textColor,
      disabled = false,
    } = config;

    // Remove previous listeners
    this.webApp.MainButton.offClick(this._mainButtonCallback);

    // Set text
    this.webApp.MainButton.setText(text);

    // Set colors if provided
    if (color) {
      this.webApp.MainButton.setParams({ color });
    }
    if (textColor) {
      this.webApp.MainButton.setParams({ text_color: textColor });
    }

    // Set state
    if (disabled) {
      this.webApp.MainButton.disable();
    } else {
      this.webApp.MainButton.enable();
    }

    // Set callback
    this._mainButtonCallback = onClick;
    this.webApp.MainButton.onClick(onClick);

    // Show button
    this.webApp.MainButton.show();

    // Return cleanup function
    return () => {
      this.webApp?.MainButton.offClick(onClick);
      this.webApp?.MainButton.hide();
    };
  }

  updateMainButton(updates) {
    if (!this.webApp) return;

    if (updates.text !== undefined) {
      this.webApp.MainButton.setText(updates.text);
    }

    if (updates.disabled !== undefined) {
      if (updates.disabled) {
        this.webApp.MainButton.disable();
      } else {
        this.webApp.MainButton.enable();
      }
    }

    if (updates.loading !== undefined) {
      if (updates.loading) {
        this.webApp.MainButton.showProgress();
      } else {
        this.webApp.MainButton.hideProgress();
      }
    }

    if (updates.color) {
      this.webApp.MainButton.setParams({ color: updates.color });
    }

    if (updates.textColor) {
      this.webApp.MainButton.setParams({ text_color: updates.textColor });
    }
  }

  hideMainButton() {
    if (!this.webApp) return;
    this.webApp.MainButton.offClick(this._mainButtonCallback);
    this.webApp.MainButton.hide();
  }

  // Alerts
  showAlert(message) {
    return new Promise((resolve) => {
      this.webApp?.showAlert(message, resolve);
    });
  }

  showConfirm(message) {
    return new Promise((resolve) => {
      this.webApp?.showConfirm(message, resolve);
    });
  }

  showPopup(params) {
    return new Promise((resolve) => {
      this.webApp?.showPopup(params, resolve);
    });
  }

  // Close Mini App
  close() {
    this.webApp?.close();
  }

  // Opening links
  openLink(url, options = {}) {
    this.webApp?.openLink(url, options);
  }

  openTelegramLink(url) {
    this.webApp?.openTelegramLink(url);
  }

  // Utils
  get platform() {
    return this.webApp?.platform || 'unknown';
  }

  get version() {
    return this.webApp?.version || '6.0';
  }

  get colorScheme() {
    return this.webApp?.colorScheme || 'light';
  }

  isVersionAtLeast(version) {
    return this.webApp?.isVersionAtLeast(version) || false;
  }
}

export const telegram = new TelegramSDK();
export default telegram;
