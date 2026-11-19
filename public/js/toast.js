/**
 * ============================================================================
 *  UPay 2.0 Enterprise Toast & Notification Engine (upay-toast.js)
 *  Zero-dependency, accessible (ARIA live regions), fintech-grade toast system
 *  Supports:
 *    - Positions: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
 *    - Variants: success, error, warning, info, payment, neutral, custom
 *    - Rich payloads: title, message, description, badge, amount/UTR metadata, icon/SVG
 *    - Action buttons, close buttons, swipe-to-dismiss, hover-to-pause timer, progress bar
 *    - Deduplication, queue limiting, rate throttling, promise/async lifecycles, undo helpers
 *    - Theme synchronization (light, dark, fintech, auto prefers-color-scheme, CSS vars)
 *    - Event emitter hooks, keyboard escape support, SSR/non-DOM safety guards
 * ============================================================================
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    const target = typeof global !== 'undefined' ? global : self;
    target.UPayToast = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==========================================================================
   * 1. CONSTANTS, ENUMS & DEFAULT CONFIGURATION
   * ========================================================================== */

  const VERSION = '2.4.0';
  const STYLE_ELEMENT_ID = 'upay-toast-engine-styles';
  const ROOT_ATTR = 'data-upay-toast-root';
  const CONTAINER_ATTR = 'data-upay-toast-container';
  const TOAST_ATTR = 'data-upay-toast-id';

  const POSITIONS = Object.freeze({
    TOP_LEFT: 'top-left',
    TOP_CENTER: 'top-center',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_CENTER: 'bottom-center',
    BOTTOM_RIGHT: 'bottom-right'
  });

  const VARIANTS = Object.freeze({
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    PAYMENT: 'payment',
    NEUTRAL: 'neutral'
  });

  const THEMES = Object.freeze({
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
  });

  const DEFAULT_CONFIG = Object.freeze({
    position: POSITIONS.TOP_CENTER,
    theme: THEMES.AUTO,
    duration: 3200,
    maxVisible: 5,
    maxQueue: 40,
    newestOnTop: true,
    pauseOnHover: true,
    pauseOnWindowBlur: true,
    closeOnClick: false,
    dismissible: true,
    showProgress: true,
    swipeToDismiss: true,
    swipeThreshold: 64,
    preventDuplicates: true,
    duplicateWindowMs: 1800,
    throttleMs: 60,
    gap: 10,
    offsetX: 16,
    offsetY: 16,
    zIndex: 99999,
    maxWidth: 420,
    escapeHtml: true,
    soundEnabled: false,
    soundSrc: '/assets/done.mp3',
    defaultLocale: 'en-IN',
    currency: 'INR',
    onCreate: null,
    onShow: null,
    onDismiss: null,
    onUpdate: null,
    onAction: null
  });

  const VARIANT_PALETTE = Object.freeze({
    [VARIANTS.SUCCESS]: {
      accent: '#10b981',
      accentSoft: 'rgba(16, 185, 129, 0.12)',
      accentBorder: 'rgba(16, 185, 129, 0.28)',
      progress: '#10b981',
      role: 'status',
      live: 'polite'
    },
    [VARIANTS.ERROR]: {
      accent: '#e11d48',
      accentSoft: 'rgba(225, 29, 72, 0.12)',
      accentBorder: 'rgba(225, 29, 72, 0.28)',
      progress: '#e11d48',
      role: 'alert',
      live: 'assertive'
    },
    [VARIANTS.WARNING]: {
      accent: '#f59e0b',
      accentSoft: 'rgba(245, 158, 11, 0.14)',
      accentBorder: 'rgba(245, 158, 11, 0.30)',
      progress: '#f59e0b',
      role: 'alert',
      live: 'assertive'
    },
    [VARIANTS.INFO]: {
      accent: '#0284c7',
      accentSoft: 'rgba(2, 132, 199, 0.12)',
      accentBorder: 'rgba(2, 132, 199, 0.26)',
      progress: '#0284c7',
      role: 'status',
      live: 'polite'
    },
    [VARIANTS.PAYMENT]: {
      accent: '#5b21b6',
      accentSoft: 'rgba(91, 33, 182, 0.12)',
      accentBorder: 'rgba(124, 58, 237, 0.28)',
      progress: 'linear-gradient(90deg, #5b21b6, #10b981)',
      role: 'status',
      live: 'polite'
    },
    [VARIANTS.NEUTRAL]: {
      accent: '#334155',
      accentSoft: 'rgba(51, 65, 85, 0.10)',
      accentBorder: 'rgba(51, 65, 85, 0.20)',
      progress: '#475569',
      role: 'status',
      live: 'polite'
    }
  });

  /* ==========================================================================
   * 2. UTILITY HELPERS (TYPE CHECKS, SANITIZATION, FORMATTING, IDS)
   * ========================================================================== */

  let idSequence = 0;

  function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  function isPlainObject(val) {
    if (val === null || typeof val !== 'object') return false;
    const proto = Object.getPrototypeOf(val);
    return proto === null || proto === Object.prototype;
  }

  function isFunction(val) {
    return typeof val === 'function';
  }

  function isString(val) {
    return typeof val === 'string';
  }

  function isNumber(val) {
    return typeof val === 'number' && Number.isFinite(val);
  }

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  function generateUid(prefix = 'upay_toast') {
    idSequence = (idSequence + 1) % Number.MAX_SAFE_INTEGER;
    const randomPart = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now().toString(36)}_${idSequence}_${randomPart}`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizePosition(pos) {
    if (isString(pos)) {
      const lowered = pos.trim().toLowerCase();
      const valid = Object.values(POSITIONS);
      if (valid.includes(lowered)) return lowered;
    }
    return POSITIONS.TOP_CENTER;
  }

  function normalizeVariant(variant) {
    if (isString(variant)) {
      const lowered = variant.trim().toLowerCase();
      if (VARIANTS[lowered.toUpperCase()]) return lowered;
      if (lowered === 'danger' || lowered === 'fail' || lowered === 'failed') return VARIANTS.ERROR;
      if (lowered === 'ok' || lowered === 'done' || lowered === 'paid') return VARIANTS.SUCCESS;
      if (lowered === 'warn') return VARIANTS.WARNING;
    }
    return VARIANTS.INFO;
  }

  function normalizeTheme(theme) {
    if (isString(theme)) {
      const lowered = theme.trim().toLowerCase();
      if (Object.values(THEMES).includes(lowered)) return lowered;
    }
    return THEMES.AUTO;
  }

  function formatINR(amount, locale = 'en-IN', showDecimals = true) {
    const num = Number(amount);
    if (!Number.isFinite(num)) return '₹0.00';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0
      }).format(num);
    } catch (_) {
      return `₹${num.toFixed(showDecimals ? 2 : 0)}`;
    }
  }

  function resolveEffectiveTheme(configuredTheme) {
    const mode = normalizeTheme(configuredTheme);
    if (mode === THEMES.LIGHT || mode === THEMES.DARK) {
      return mode;
    }
    if (isBrowser() && typeof window.matchMedia === 'function') {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? THEMES.DARK
          : THEMES.LIGHT;
      } catch (_) {
        return THEMES.LIGHT;
      }
    }
    return THEMES.LIGHT;
  }

  /* ==========================================================================
   * 3. SVG ICON LIBRARY (FINTECH & STATUS ICONS)
   * ========================================================================== */

  const ICONS = Object.freeze({
    success: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    `,
    error: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    `,
    warning: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    `,
    info: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    `,
    payment: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V7l7-4z" />
        <path d="M9.5 12l1.7 1.7 3.3-3.4" />
      </svg>
    `,
    neutral: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M7 10h10M7 14h6" />
      </svg>
    `,
    spinner: `
      <svg class="upay-toast-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
        <path d="M21 12a9 9 0 11-6.22-8.56" />
      </svg>
    `,
    close: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    `
  });

  function getDefaultIconForVariant(variant, loading = false) {
    if (loading) return ICONS.spinner;
    return ICONS[variant] || ICONS.info;
  }

  /* ==========================================================================
   * 4. STYLESHEET INJECTION (RESPONSIVE, ANIMATED, THEME-AWARE)
   * ========================================================================== */

  function buildStylesheet() {
    return `
      [${ROOT_ATTR}] {
        --ut-font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        --ut-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        --ut-bg: rgba(255, 255, 255, 0.96);
        --ut-bg-elevated: #ffffff;
        --ut-text: #0f172a;
        --ut-text-muted: #475569;
        --ut-border: rgba(15, 23, 42, 0.09);
        --ut-shadow: 0 18px 40px -14px rgba(15, 23, 42, 0.18), 0 4px 12px -4px rgba(15, 23, 42, 0.06);
        --ut-radius: 16px;
        --ut-chip-bg: rgba(15, 23, 42, 0.05);
        --ut-chip-text: #0f172a;
        --ut-track-bg: rgba(15, 23, 42, 0.06);
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 99999;
        font-family: var(--ut-font);
      }

      [${ROOT_ATTR}][data-theme="dark"] {
        --ut-bg: rgba(15, 23, 42, 0.95);
        --ut-bg-elevated: #1e293b;
        --ut-text: #f8fafc;
        --ut-text-muted: #94a3b8;
        --ut-border: rgba(248, 250, 252, 0.11);
        --ut-shadow: 0 20px 44px -14px rgba(0, 0, 0, 0.55), 0 4px 14px -4px rgba(0, 0, 0, 0.35);
        --ut-chip-bg: rgba(248, 250, 252, 0.08);
        --ut-chip-text: #f1f5f9;
        --ut-track-bg: rgba(248, 250, 252, 0.08);
      }

      [${CONTAINER_ATTR}] {
        position: fixed;
        display: flex;
        flex-direction: column;
        gap: var(--ut-gap, 10px);
        max-width: min(var(--ut-max-width, 420px), calc(100vw - var(--ut-offset-x, 16px) * 2));
        width: 100%;
        pointer-events: none;
        z-index: inherit;
      }

      [${CONTAINER_ATTR}][data-position="top-left"] {
        top: var(--ut-offset-y, 16px);
        left: var(--ut-offset-x, 16px);
        align-items: flex-start;
      }

      [${CONTAINER_ATTR}][data-position="top-center"] {
        top: var(--ut-offset-y, 16px);
        left: 50%;
        transform: translateX(-50%);
        align-items: center;
      }

      [${CONTAINER_ATTR}][data-position="top-right"] {
        top: var(--ut-offset-y, 16px);
        right: var(--ut-offset-x, 16px);
        align-items: flex-end;
      }

      [${CONTAINER_ATTR}][data-position="bottom-left"] {
        bottom: var(--ut-offset-y, 16px);
        left: var(--ut-offset-x, 16px);
        align-items: flex-start;
        flex-direction: column-reverse;
      }

      [${CONTAINER_ATTR}][data-position="bottom-center"] {
        bottom: var(--ut-offset-y, 16px);
        left: 50%;
        transform: translateX(-50%);
        align-items: center;
        flex-direction: column-reverse;
      }

      [${CONTAINER_ATTR}][data-position="bottom-right"] {
        bottom: var(--ut-offset-y, 16px);
        right: var(--ut-offset-x, 16px);
        align-items: flex-end;
        flex-direction: column-reverse;
      }

      .upay-toast-item {
        position: relative;
        width: 100%;
        background: var(--ut-bg);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: var(--ut-text);
        border: 1px solid var(--ut-border);
        border-radius: var(--ut-radius);
        box-shadow: var(--ut-shadow);
        overflow: hidden;
        pointer-events: auto;
        user-select: none;
        touch-action: pan-y;
        opacity: 0;
        transform: translateY(-10px) scale(0.97);
        transition:
          opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1),
          transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
          box-shadow 0.2s ease,
          border-color 0.2s ease;
      }

      [${CONTAINER_ATTR}][data-position^="bottom"] .upay-toast-item {
        transform: translateY(10px) scale(0.97);
      }

      .upay-toast-item.is-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .upay-toast-item.is-leaving {
        opacity: 0;
        transform: translateY(-8px) scale(0.96);
        pointer-events: none;
      }

      [${CONTAINER_ATTR}][data-position^="bottom"] .upay-toast-item.is-leaving {
        transform: translateY(8px) scale(0.96);
      }

      .upay-toast-item.is-dragging {
        transition: none;
        cursor: grabbing;
      }

      .upay-toast-body {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        padding: 12px 14px;
      }

      .upay-toast-icon {
        flex: 0 0 auto;
        width: 30px;
        height: 30px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--ut-accent-soft, rgba(91, 33, 182, 0.12));
        color: var(--ut-accent, #5b21b6);
        border: 1px solid var(--ut-accent-border, rgba(91, 33, 182, 0.22));
        margin-top: 1px;
      }

      .upay-toast-icon svg {
        width: 16px;
        height: 16px;
      }

      .upay-toast-content {
        flex: 1 1 auto;
        min-width: 0;
      }

      .upay-toast-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .upay-toast-title {
        font-size: 12.5px;
        font-weight: 800;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--ut-text);
        word-break: break-word;
      }

      .upay-toast-badge {
        flex: 0 0 auto;
        font-family: var(--ut-mono);
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 999px;
        background: var(--ut-chip-bg);
        color: var(--ut-chip-text);
        white-space: nowrap;
      }

      .upay-toast-message {
        font-size: 12px;
        font-weight: 600;
        line-height: 1.42;
        color: var(--ut-text);
        margin-top: 2px;
        word-break: break-word;
      }

      .upay-toast-desc {
        font-size: 11px;
        font-weight: 500;
        line-height: 1.38;
        color: var(--ut-text-muted);
        margin-top: 3px;
        word-break: break-word;
      }

      .upay-toast-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 7px;
      }

      .upay-toast-pill {
        font-family: var(--ut-mono);
        font-size: 10.5px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 7px;
        background: var(--ut-chip-bg);
        color: var(--ut-chip-text);
      }

      .upay-toast-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 9px;
      }

      .upay-toast-btn {
        appearance: none;
        border: 1px solid var(--ut-border);
        background: var(--ut-bg-elevated);
        color: var(--ut-text);
        font-family: var(--ut-font);
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 9px;
        cursor: pointer;
        line-height: 1.2;
        transition: background 0.15s ease, transform 0.12s ease, border-color 0.15s ease;
      }

      .upay-toast-btn:hover {
        border-color: var(--ut-accent, #5b21b6);
      }

      .upay-toast-btn:active {
        transform: scale(0.97);
      }

      .upay-toast-btn.is-primary {
        background: var(--ut-accent, #5b21b6);
        border-color: transparent;
        color: #ffffff;
      }

      .upay-toast-close {
        appearance: none;
        border: none;
        background: transparent;
        color: var(--ut-text-muted);
        width: 24px;
        height: 24px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex: 0 0 auto;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .upay-toast-close:hover {
        background: var(--ut-chip-bg);
        color: var(--ut-text);
      }

      .upay-toast-close svg {
        width: 13px;
        height: 13px;
      }

      .upay-toast-progress-wrap {
        position: relative;
        width: 100%;
        height: 3px;
        background: var(--ut-track-bg);
        overflow: hidden;
      }

      .upay-toast-progress-bar {
        height: 100%;
        width: 100%;
        transform-origin: left center;
        background: var(--ut-progress, var(--ut-accent, #5b21b6));
        transition: transform 60ms linear;
      }

      @keyframes upayToastSpin {
        to { transform: rotate(360deg); }
      }

      .upay-toast-spin {
        animation: upayToastSpin 0.85s linear infinite;
      }

      @media (max-width: 480px) {
        [${CONTAINER_ATTR}] {
          max-width: calc(100vw - 20px);
        }
        [${CONTAINER_ATTR}][data-position$="-left"],
        [${CONTAINER_ATTR}][data-position$="-right"] {
          left: 10px;
          right: 10px;
          align-items: stretch;
        }
        [${CONTAINER_ATTR}][data-position$="-center"] {
          left: 10px;
          right: 10px;
          transform: none;
          align-items: stretch;
        }
        .upay-toast-body {
          padding: 11px 12px;
          gap: 9px;
        }
        .upay-toast-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .upay-toast-item,
        .upay-toast-progress-bar,
        .upay-toast-btn,
        .upay-toast-close {
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
        }
      }
    `;
  }

  function injectStylesOnce() {
    if (!isBrowser()) return null;
    let styleEl = document.getElementById(STYLE_ELEMENT_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ELEMENT_ID;
      styleEl.type = 'text/css';
      styleEl.textContent = buildStylesheet();
      (document.head || document.documentElement).appendChild(styleEl);
    }
    return styleEl;
  }

  /* ==========================================================================
   * 5. EVENT EMITTER CLASS
   * ========================================================================== */

  class EventBus {
    constructor() {
      this._listeners = new Map();
    }

    on(event, handler) {
      if (!isString(event) || !isFunction(handler)) return () => {};
      if (!this._listeners.has(event)) {
        this._listeners.set(event, new Set());
      }
      const set = this._listeners.get(event);
      set.add(handler);
      return () => this.off(event, handler);
    }

    once(event, handler) {
      if (!isString(event) || !isFunction(handler)) return () => {};
      const wrapper = (payload) => {
        this.off(event, wrapper);
        handler(payload);
      };
      return this.on(event, wrapper);
    }

    off(event, handler) {
      const set = this._listeners.get(event);
      if (!set) return;
      if (handler) {
        set.delete(handler);
        if (set.size === 0) this._listeners.delete(event);
      } else {
        this._listeners.delete(event);
      }
    }

    emit(event, payload) {
      const set = this._listeners.get(event);
      if (!set || set.size === 0) return;
      set.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          if (typeof console !== 'undefined' && isFunction(console.error)) {
            console.error(`[UPayToast] Listener error on "${event}":`, err);
          }
        }
      });
    }

    clear() {
      this._listeners.clear();
    }
  }

  /* ==========================================================================
   * 6. TOAST RECORD / ITEM CLASS
   * ========================================================================== */

  class ToastItem {
    constructor(options, manager) {
      this.id = options.id || generateUid();
      this.manager = manager;
      this.createdAt = Date.now();
      this.shownAt = null;
      this.pausedAt = null;
      this.elapsedWhileRunning = 0;
      this.dismissed = false;
      this.isHovered = false;
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragDeltaX = 0;
      this._justDragged = false;

      this.config = this._normalizeOptions(options);
      this.remainingMs = isNumber(this.config.duration) && this.config.duration > 0
        ? this.config.duration
        : 0;

      this.el = null;
      this.progressBarEl = null;
      this._rafId = null;
      this._timeoutId = null;
      this._lastTickTime = null;
    }

    _normalizeOptions(raw) {
      const opts = isPlainObject(raw) ? raw : { message: String(raw ?? '') };
      const variant = normalizeVariant(opts.variant || opts.type);
      const position = normalizePosition(opts.position || this.manager.config.position);
      const duration = opts.duration !== undefined
        ? opts.duration
        : (opts.sticky || opts.persistent ? 0 : this.manager.config.duration);

      const actions = Array.isArray(opts.actions)
        ? opts.actions.filter((a) => a && isString(a.label)).slice(0, 3)
        : [];

      if (opts.action && isString(opts.action.label)) {
        actions.unshift({
          label: opts.action.label,
          onClick: opts.action.onClick,
          primary: opts.action.primary !== false,
          dismissOnClick: opts.action.dismissOnClick !== false
        });
      }

      return {
        id: opts.id || this.id,
        title: opts.title ? String(opts.title) : '',
        message: opts.message !== undefined && opts.message !== null ? String(opts.message) : '',
        description: opts.description ? String(opts.description) : '',
        badge: opts.badge ? String(opts.badge) : '',
        amount: isNumber(opts.amount) ? opts.amount : (opts.amount ? Number(opts.amount) : null),
        utr: opts.utr ? String(opts.utr) : '',
        orderId: opts.orderId ? String(opts.orderId) : '',
        variant,
        position,
        duration: Number.isFinite(Number(duration)) ? Math.max(0, Number(duration)) : 3200,
        loading: Boolean(opts.loading),
        dismissible: opts.dismissible !== undefined ? Boolean(opts.dismissible) : this.manager.config.dismissible,
        closeOnClick: opts.closeOnClick !== undefined ? Boolean(opts.closeOnClick) : this.manager.config.closeOnClick,
        showProgress: opts.showProgress !== undefined ? Boolean(opts.showProgress) : this.manager.config.showProgress,
        swipeToDismiss: opts.swipeToDismiss !== undefined ? Boolean(opts.swipeToDismiss) : this.manager.config.swipeToDismiss,
        pauseOnHover: opts.pauseOnHover !== undefined ? Boolean(opts.pauseOnHover) : this.manager.config.pauseOnHover,
        escapeHtml: opts.escapeHtml !== undefined ? Boolean(opts.escapeHtml) : this.manager.config.escapeHtml,
        playSound: Boolean(opts.playSound),
        icon: opts.icon || null,
        actions,
        data: isPlainObject(opts.data) ? { ...opts.data } : {},
        onShow: isFunction(opts.onShow) ? opts.onShow : null,
        onDismiss: isFunction(opts.onDismiss) ? opts.onDismiss : null,
        onAction: isFunction(opts.onAction) ? opts.onAction : null
      };
    }

    getSignature() {
      return [
        this.config.variant,
        this.config.position,
        this.config.title,
        this.config.message,
        this.config.utr,
        this.config.orderId
      ].join('::');
    }

    _formatText(text) {
      if (!text) return '';
      return this.config.escapeHtml ? escapeHtml(text) : text;
    }

    _renderMarkup() {
      const { config } = this;
      const palette = VARIANT_PALETTE[config.variant] || VARIANT_PALETTE[VARIANTS.INFO];
      const iconHtml = config.icon
        ? (isString(config.icon) ? config.icon : getDefaultIconForVariant(config.variant, config.loading))
        : getDefaultIconForVariant(config.variant, config.loading);

      const titleMarkup = config.title
        ? `<div class="upay-toast-title">${this._formatText(config.title)}</div>`
        : '';

      const badgeMarkup = config.badge
        ? `<span class="upay-toast-badge">${this._formatText(config.badge)}</span>`
        : '';

      const headerMarkup = (titleMarkup || badgeMarkup)
        ? `<div class="upay-toast-header">${titleMarkup}${badgeMarkup}</div>`
        : '';

      const messageMarkup = config.message
        ? `<div class="upay-toast-message">${this._formatText(config.message)}</div>`
        : '';

      const descMarkup = config.description
        ? `<div class="upay-toast-desc">${this._formatText(config.description)}</div>`
        : '';

      const pills = [];
      if (config.amount !== null && Number.isFinite(config.amount)) {
        pills.push(`<span class="upay-toast-pill">${escapeHtml(formatINR(config.amount, this.manager.config.defaultLocale))}</span>`);
      }
      if (config.utr) {
        pills.push(`<span class="upay-toast-pill">UTR: ${escapeHtml(config.utr)}</span>`);
      }
      if (config.orderId) {
        pills.push(`<span class="upay-toast-pill">#${escapeHtml(config.orderId)}</span>`);
      }

      const metaMarkup = pills.length > 0
        ? `<div class="upay-toast-meta">${pills.join('')}</div>`
        : '';

      const actionsMarkup = config.actions.length > 0
        ? `<div class="upay-toast-actions">${config.actions.map((act, idx) => {
            const cls = act.primary ? 'upay-toast-btn is-primary' : 'upay-toast-btn';
            return `<button type="button" class="${cls}" data-action-index="${idx}">${escapeHtml(act.label)}</button>`;
          }).join('')}</div>`
        : '';

      const closeMarkup = config.dismissible
        ? `<button type="button" class="upay-toast-close" aria-label="Dismiss notification" data-close-btn="true">${ICONS.close}</button>`
        : '';

      const hasTimedProgress = config.showProgress && config.duration > 0 && !config.loading;
      const progressMarkup = hasTimedProgress
        ? `<div class="upay-toast-progress-wrap"><div class="upay-toast-progress-bar" data-progress-bar="true"></div></div>`
        : '';

      return `
        <div
          class="upay-toast-item"
          ${TOAST_ATTR}="${escapeHtml(this.id)}"
          data-variant="${escapeHtml(config.variant)}"
          role="${escapeHtml(palette.role)}"
          aria-live="${escapeHtml(palette.live)}"
          aria-atomic="true"
          style="--ut-accent: ${palette.accent}; --ut-accent-soft: ${palette.accentSoft}; --ut-accent-border: ${palette.accentBorder}; --ut-progress: ${palette.progress};"
        >
          <div class="upay-toast-body">
            <div class="upay-toast-icon">${iconHtml}</div>
            <div class="upay-toast-content">
              ${headerMarkup}
              ${messageMarkup}
              ${descMarkup}
              ${metaMarkup}
              ${actionsMarkup}
            </div>
            ${closeMarkup}
          </div>
          ${progressMarkup}
        </div>
      `;
    }

    mount(containerEl) {
      if (!isBrowser() || !containerEl) return this.el;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = this._renderMarkup().trim();
      const el = wrapper.firstElementChild;
      if (!el) return null;

      this.el = el;
      this.progressBarEl = el.querySelector('[data-progress-bar="true"]');

      if (this.manager.config.newestOnTop) {
        containerEl.insertBefore(el, containerEl.firstChild);
      } else {
        containerEl.appendChild(el);
      }

      this._bindEvents();

      requestAnimationFrame(() => {
        if (!this.el || this.dismissed) return;
        this.el.classList.add('is-visible');
        this.shownAt = Date.now();
        this._lastTickTime = performance.now();

        if (this.config.playSound) {
          this.manager.playSound();
        }

        if (this.config.onShow) {
          try { this.config.onShow(this.getSnapshot()); } catch (_) {}
        }
        if (isFunction(this.manager.config.onShow)) {
          try { this.manager.config.onShow(this.getSnapshot()); } catch (_) {}
        }
        this.manager.events.emit('show', this.getSnapshot());

        if (this.remainingMs > 0 && !this.config.loading) {
          this._startTimerLoop();
        }
      });

      return this.el;
    }

    update(patch = {}) {
      if (this.dismissed || !isPlainObject(patch)) return this.getSnapshot();
      const merged = {
        ...this.config,
        ...patch,
        id: this.id,
        position: patch.position ? normalizePosition(patch.position) : this.config.position,
        variant: (patch.variant || patch.type) ? normalizeVariant(patch.variant || patch.type) : this.config.variant
      };

      if (patch.duration !== undefined) {
        const nextDur = Math.max(0, Number(patch.duration) || 0);
        merged.duration = nextDur;
        this.remainingMs = nextDur;
        this.elapsedWhileRunning = 0;
      }

      this.config = this._normalizeOptions(merged);

      if (this.el && this.el.parentElement) {
        const parent = this.el.parentElement;
        const wasVisible = this.el.classList.contains('is-visible');
        const nextNode = this._buildDetachedElement();
        if (nextNode) {
          parent.replaceChild(nextNode, this.el);
          this.el = nextNode;
          this.progressBarEl = this.el.querySelector('[data-progress-bar="true"]');
          if (wasVisible) {
            requestAnimationFrame(() => {
              if (this.el) this.el.classList.add('is-visible');
            });
          }
          this._bindEvents();
          this._stopTimerLoop();
          if (this.remainingMs > 0 && !this.config.loading && !this.isHovered) {
            this._lastTickTime = performance.now();
            this._startTimerLoop();
          }
        }
      }

      const snap = this.getSnapshot();
      if (isFunction(this.manager.config.onUpdate)) {
        try { this.manager.config.onUpdate(snap); } catch (_) {}
      }
      this.manager.events.emit('update', snap);
      return snap;
    }

    _buildDetachedElement() {
      const tmp = document.createElement('div');
      tmp.innerHTML = this._renderMarkup().trim();
      return tmp.firstElementChild;
    }

    _bindEvents() {
      if (!this.el) return;

      const closeBtn = this.el.querySelector('[data-close-btn="true"]');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dismiss('close_button');
        });
      }

      const actionBtns = this.el.querySelectorAll('[data-action-index]');
      actionBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = Number(btn.getAttribute('data-action-index'));
          const action = this.config.actions[idx];
          if (!action) return;

          const snap = this.getSnapshot();
          if (isFunction(action.onClick)) {
            try { action.onClick(snap, this); } catch (_) {}
          }
          if (this.config.onAction) {
            try { this.config.onAction(action, snap); } catch (_) {}
          }
          if (isFunction(this.manager.config.onAction)) {
            try { this.manager.config.onAction(action, snap); } catch (_) {}
          }
          this.manager.events.emit('action', { action, toast: snap });

          if (action.dismissOnClick !== false) {
            this.dismiss('action');
          }
        });
      });

      this.el.addEventListener('click', () => {
        if (this._justDragged) {
          this._justDragged = false;
          return;
        }
        if (this.config.closeOnClick && this.config.dismissible) {
          this.dismiss('click');
        }
      });

      this.el.addEventListener('mouseenter', () => {
        this.isHovered = true;
        if (this.config.pauseOnHover) {
          this.pause();
        }
      });

      this.el.addEventListener('mouseleave', () => {
        this.isHovered = false;
        if (this.config.pauseOnHover && !this.manager.isWindowBlurred) {
          this.resume();
        }
      });

      if (this.config.swipeToDismiss) {
        this._bindSwipeGestures();
      }
    }

    _bindSwipeGestures() {
      if (!this.el) return;
      const threshold = this.manager.config.swipeThreshold || 64;

      const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (e.target && e.target.closest('button')) return;
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragDeltaX = 0;
        this.el.classList.add('is-dragging');
        if (isFunction(this.el.setPointerCapture) && e.pointerId !== undefined) {
          try { this.el.setPointerCapture(e.pointerId); } catch (_) {}
        }
      };

      const onPointerMove = (e) => {
        if (!this.isDragging || !this.el) return;
        this.dragDeltaX = e.clientX - this.dragStartX;
        if (Math.abs(this.dragDeltaX) > 6) {
          this._justDragged = true;
        }
        const opacity = clamp(1 - Math.abs(this.dragDeltaX) / (threshold * 2.2), 0.25, 1);
        this.el.style.transform = `translateX(${this.dragDeltaX}px)`;
        this.el.style.opacity = String(opacity);
      };

      const onPointerUp = (e) => {
        if (!this.isDragging || !this.el) return;
        this.isDragging = false;
        this.el.classList.remove('is-dragging');
        if (isFunction(this.el.releasePointerCapture) && e.pointerId !== undefined) {
          try { this.el.releasePointerCapture(e.pointerId); } catch (_) {}
        }

        if (Math.abs(this.dragDeltaX) >= threshold) {
          const dir = this.dragDeltaX > 0 ? 1 : -1;
          this.el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
          this.el.style.transform = `translateX(${dir * 260}px)`;
          this.el.style.opacity = '0';
          setTimeout(() => this.dismiss('swipe'), 180);
        } else {
          this.el.style.transform = '';
          this.el.style.opacity = '';
        }
        this.dragDeltaX = 0;
      };

      this.el.addEventListener('pointerdown', onPointerDown);
      this.el.addEventListener('pointermove', onPointerMove);
      this.el.addEventListener('pointerup', onPointerUp);
      this.el.addEventListener('pointercancel', onPointerUp);
    }

    _startTimerLoop() {
      this._stopTimerLoop();
      if (this.remainingMs <= 0 || this.config.loading) return;

      this._lastTickTime = performance.now();

      const tick = (now) => {
        if (this.dismissed) return;
        if (this.isHovered || (this.manager.config.pauseOnWindowBlur && this.manager.isWindowBlurred)) {
          this._lastTickTime = now;
          this._rafId = requestAnimationFrame(tick);
          return;
        }

        const dt = Math.max(0, now - (this._lastTickTime || now));
        this._lastTickTime = now;
        this.elapsedWhileRunning += dt;
        this.remainingMs = Math.max(0, this.remainingMs - dt);

        if (this.progressBarEl && this.config.duration > 0) {
          const ratio = clamp(this.remainingMs / this.config.duration, 0, 1);
          this.progressBarEl.style.transform = `scaleX(${ratio})`;
        }

        if (this.remainingMs <= 0) {
          this.dismiss('timeout');
          return;
        }

        this._rafId = requestAnimationFrame(tick);
      };

      this._rafId = requestAnimationFrame(tick);
    }

    _stopTimerLoop() {
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._timeoutId !== null) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
    }

    pause() {
      if (this.dismissed || this.pausedAt !== null) return;
      this.pausedAt = Date.now();
    }

    resume() {
      if (this.dismissed) return;
      this.pausedAt = null;
      this._lastTickTime = performance.now();
    }

    dismiss(reason = 'manual') {
      if (this.dismissed) return;
      this.dismissed = true;
      this._stopTimerLoop();

      const snap = this.getSnapshot();
      this.manager._onToastDismissed(this.id, reason, snap);

      if (this.config.onDismiss) {
        try { this.config.onDismiss(reason, snap); } catch (_) {}
      }
      if (isFunction(this.manager.config.onDismiss)) {
        try { this.manager.config.onDismiss(reason, snap); } catch (_) {}
      }
      this.manager.events.emit('dismiss', { id: this.id, reason, toast: snap });

      if (this.el && this.el.parentElement) {
        const elToRemove = this.el;
        elToRemove.classList.remove('is-visible');
        elToRemove.classList.add('is-leaving');
        setTimeout(() => {
          if (elToRemove.parentElement) {
            elToRemove.parentElement.removeChild(elToRemove);
          }
          this.manager._cleanupEmptyContainers();
          this.manager._drainQueue();
        }, 240);
      } else {
        this.manager._drainQueue();
      }
    }

    getSnapshot() {
      return Object.freeze({
        id: this.id,
        title: this.config.title,
        message: this.config.message,
        description: this.config.description,
        variant: this.config.variant,
        position: this.config.position,
        duration: this.config.duration,
        remainingMs: Math.round(this.remainingMs),
        createdAt: this.createdAt,
        shownAt: this.shownAt,
        data: { ...this.config.data }
      });
    }
  }

  /* ==========================================================================
   * 7. MAIN TOAST MANAGER ENGINE
   * ========================================================================== */

  class ToastManager {
    constructor(customConfig = {}) {
      this.config = { ...DEFAULT_CONFIG, ...(isPlainObject(customConfig) ? customConfig : {}) };
      this.events = new EventBus();
      this.activeMap = new Map();
      this.queue = [];
      this.recentSignatures = new Map();
      this.lastEmitTimestamp = 0;
      this.isWindowBlurred = false;
      this._rootEl = null;
      this._containers = new Map();
      this._audioEl = null;
      this._mediaQuery = null;
      this._bound = false;

      if (isBrowser()) {
        this._ensureDomRoot();
        this._bindGlobalListeners();
      }
    }

    _ensureDomRoot() {
      if (!isBrowser()) return null;
      injectStylesOnce();

      const mountTarget = document.body || document.documentElement;
      if (!mountTarget) return null;

      if (!this._rootEl || !mountTarget.contains(this._rootEl)) {
        let existing = document.querySelector(`[${ROOT_ATTR}="true"]`);
        if (!existing) {
          existing = document.createElement('div');
          existing.setAttribute(ROOT_ATTR, 'true');
          mountTarget.appendChild(existing);
        } else if (document.body && existing.parentElement !== document.body) {
          document.body.appendChild(existing);
        }
        this._rootEl = existing;
      } else if (document.body && this._rootEl.parentElement !== document.body) {
        document.body.appendChild(this._rootEl);
      }

      this._syncRootAttributes();
      return this._rootEl;
    }

    _syncRootAttributes() {
      if (!this._rootEl) return;
      const effectiveTheme = resolveEffectiveTheme(this.config.theme);
      this._rootEl.setAttribute('data-theme', effectiveTheme);
      this._rootEl.style.zIndex = String(this.config.zIndex);
      this._rootEl.style.setProperty('--ut-gap', `${this.config.gap}px`);
      this._rootEl.style.setProperty('--ut-offset-x', `${this.config.offsetX}px`);
      this._rootEl.style.setProperty('--ut-offset-y', `${this.config.offsetY}px`);
      this._rootEl.style.setProperty('--ut-max-width', `${this.config.maxWidth}px`);
    }

    _getOrCreateContainer(position) {
      const pos = normalizePosition(position);
      this._ensureDomRoot();
      if (!this._rootEl) return null;

      let container = this._containers.get(pos);
      if (!container || !this._rootEl.contains(container)) {
        container = this._rootEl.querySelector(`[${CONTAINER_ATTR}="true"][data-position="${pos}"]`);
        if (!container) {
          container = document.createElement('div');
          container.setAttribute(CONTAINER_ATTR, 'true');
          container.setAttribute('data-position', pos);
          this._rootEl.appendChild(container);
        }
        this._containers.set(pos, container);
      }
      return container;
    }

    _cleanupEmptyContainers() {
      this._containers.forEach((container, pos) => {
        if (container && container.children.length === 0) {
          if (container.parentElement) {
            container.parentElement.removeChild(container);
          }
          this._containers.delete(pos);
        }
      });
    }

    _bindGlobalListeners() {
      if (!isBrowser() || this._bound) return;
      this._bound = true;

      this._onWindowBlur = () => {
        this.isWindowBlurred = true;
        this.activeMap.forEach((item) => {
          if (this.config.pauseOnWindowBlur) item.pause();
        });
      };

      this._onWindowFocus = () => {
        this.isWindowBlurred = false;
        this.activeMap.forEach((item) => {
          if (this.config.pauseOnWindowBlur && !item.isHovered) item.resume();
        });
      };

      this._onVisibilityChange = () => {
        if (document.hidden) {
          this._onWindowBlur();
        } else {
          this._onWindowFocus();
        }
      };

      this._onKeyDown = (e) => {
        if (e.key === 'Escape' && this.activeMap.size > 0) {
          const entries = Array.from(this.activeMap.values());
          const topToast = this.config.newestOnTop ? entries[entries.length - 1] : entries[0];
          if (topToast && topToast.config.dismissible) {
            topToast.dismiss('escape');
          }
        }
      };

      window.addEventListener('blur', this._onWindowBlur);
      window.addEventListener('focus', this._onWindowFocus);
      document.addEventListener('visibilitychange', this._onVisibilityChange);
      document.addEventListener('keydown', this._onKeyDown);

      if (typeof window.matchMedia === 'function') {
        try {
          this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          this._onThemeChange = () => {
            if (this.config.theme === THEMES.AUTO) {
              this._syncRootAttributes();
            }
          };
          if (isFunction(this._mediaQuery.addEventListener)) {
            this._mediaQuery.addEventListener('change', this._onThemeChange);
          } else if (isFunction(this._mediaQuery.addListener)) {
            this._mediaQuery.addListener(this._onThemeChange);
          }
        } catch (_) {}
      }
    }

    _isDuplicate(item) {
      if (!this.config.preventDuplicates) return false;
      const sig = item.getSignature();
      const now = Date.now();
      const win = this.config.duplicateWindowMs || 1800;

      for (const [key, ts] of this.recentSignatures.entries()) {
        if (now - ts > win) {
          this.recentSignatures.delete(key);
        }
      }

      if (this.recentSignatures.has(sig)) {
        return true;
      }
      this.recentSignatures.set(sig, now);
      return false;
    }

    _mountItem(item) {
      const container = this._getOrCreateContainer(item.config.position);
      this.activeMap.set(item.id, item);
      if (container) {
        item.mount(container);
      }
      if (isFunction(this.config.onCreate)) {
        try { this.config.onCreate(item.getSnapshot()); } catch (_) {}
      }
      this.events.emit('create', item.getSnapshot());
    }

    _drainQueue() {
      while (this.queue.length > 0 && this.activeMap.size < this.config.maxVisible) {
        const nextItem = this.queue.shift();
        if (nextItem && !nextItem.dismissed) {
          this._mountItem(nextItem);
        }
      }
    }

    _onToastDismissed(id) {
      this.activeMap.delete(id);
      this.queue = this.queue.filter((q) => q.id !== id);
    }

    /* ------------------------------------------------------------------------
     * Public Core API Methods
     * ------------------------------------------------------------------------ */

    configure(nextConfig = {}) {
      if (!isPlainObject(nextConfig)) return this.config;
      this.config = { ...this.config, ...nextConfig };
      this._syncRootAttributes();
      this.events.emit('configure', { ...this.config });
      return { ...this.config };
    }

    setTheme(theme) {
      this.config.theme = normalizeTheme(theme);
      this._syncRootAttributes();
      this.events.emit('theme', this.config.theme);
      return this.config.theme;
    }

    setPosition(position) {
      this.config.position = normalizePosition(position);
      this.events.emit('position', this.config.position);
      return this.config.position;
    }

    playSound(src) {
      if (!isBrowser()) return;
      const audioSrc = src || this.config.soundSrc || '/assets/done.mp3';
      try {
        if (!this._audioEl || this._audioEl.src.indexOf(audioSrc) === -1) {
          this._audioEl = new Audio(audioSrc);
          this._audioEl.preload = 'auto';
        }
        this._audioEl.pause();
        this._audioEl.currentTime = 0;
        const promise = this._audioEl.play();
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {});
        }
      } catch (_) {}
    }

    show(options) {
      const now = Date.now();
      if (this.config.throttleMs > 0 && now - this.lastEmitTimestamp < this.config.throttleMs) {
        // Allow explicit high-priority or non-throttled calls to pass
        if (!isPlainObject(options) || options.force !== true) {
          return this._createHandle(null);
        }
      }
      this.lastEmitTimestamp = now;

      const item = new ToastItem(options, this);
      if (this._isDuplicate(item)) {
        const existing = Array.from(this.activeMap.values()).find(
          (active) => active.getSignature() === item.getSignature()
        );
        if (existing) {
          existing.remainingMs = existing.config.duration;
          existing.elapsedWhileRunning = 0;
          existing._lastTickTime = performance.now();
          if (existing.progressBarEl) {
            existing.progressBarEl.style.transform = 'scaleX(1)';
          }
          return this._createHandle(existing);
        }
        const queued = this.queue.find((q) => q.getSignature() === item.getSignature());
        return this._createHandle(queued || null);
      }

      if (this.activeMap.size >= this.config.maxVisible) {
        if (this.queue.length >= this.config.maxQueue) {
          this.queue.shift();
        }
        this.queue.push(item);
        this.events.emit('queue', item.getSnapshot());
        return this._createHandle(item);
      }

      this._mountItem(item);
      return this._createHandle(item);
    }

    _createHandle(item) {
      const id = item ? item.id : null;
      return {
        id,
        dismiss: (reason = 'manual') => {
          if (item) item.dismiss(reason);
        },
        update: (patch) => {
          if (item) return item.update(patch);
          return null;
        },
        getSnapshot: () => (item ? item.getSnapshot() : null)
      };
    }

    /* ------------------------------------------------------------------------
     * Convenience Variant Methods
     * ------------------------------------------------------------------------ */

    success(message, opts = {}) {
      return this.show({
        ...(isPlainObject(opts) ? opts : { title: String(opts || '') }),
        message,
        variant: VARIANTS.SUCCESS
      });
    }

    error(message, opts = {}) {
      return this.show({
        ...(isPlainObject(opts) ? opts : { title: String(opts || '') }),
        message,
        variant: VARIANTS.ERROR
      });
    }

    warning(message, opts = {}) {
      return this.show({
        ...(isPlainObject(opts) ? opts : { title: String(opts || '') }),
        message,
        variant: VARIANTS.WARNING
      });
    }

    info(message, opts = {}) {
      return this.show({
        ...(isPlainObject(opts) ? opts : { title: String(opts || '') }),
        message,
        variant: VARIANTS.INFO
      });
    }

    neutral(message, opts = {}) {
      return this.show({
        ...(isPlainObject(opts) ? opts : { title: String(opts || '') }),
        message,
        variant: VARIANTS.NEUTRAL
      });
    }

    loading(message, opts = {}) {
      return this.show({
        ...(isPlainObject(opts) ? opts : {}),
        message,
        variant: opts && opts.variant ? opts.variant : VARIANTS.INFO,
        loading: true,
        duration: 0,
        showProgress: false,
        dismissible: opts && opts.dismissible !== undefined ? opts.dismissible : false
      });
    }

    payment(payload = {}) {
      const p = isPlainObject(payload) ? payload : { message: String(payload) };
      const formattedAmt = p.amount !== undefined && p.amount !== null
        ? formatINR(p.amount, this.config.defaultLocale)
        : '';

      return this.show({
        ...p,
        title: p.title || 'UPI Payment Verified',
        message: p.message || (formattedAmt ? `Received ${formattedAmt}` : 'Payment confirmed'),
        description: p.description || '',
        badge: p.badge || 'UPay 2.0',
        amount: p.amount,
        utr: p.utr,
        orderId: p.orderId,
        variant: p.variant || VARIANTS.PAYMENT,
        duration: p.duration !== undefined ? p.duration : 4200,
        playSound: p.playSound !== undefined ? Boolean(p.playSound) : true
      });
    }

    async promise(targetPromise, messages = {}, baseOpts = {}) {
      const loadingCfg = isPlainObject(messages.loading)
        ? messages.loading
        : { message: messages.loading || 'Processing request...' };

      const handle = this.loading(loadingCfg.message, {
        ...baseOpts,
        ...loadingCfg
      });

      try {
        const result = await (isFunction(targetPromise) ? targetPromise() : targetPromise);
        const successCfg = isFunction(messages.success)
          ? messages.success(result)
          : (isPlainObject(messages.success)
              ? messages.success
              : { message: messages.success || 'Completed successfully' });

        handle.update({
          ...baseOpts,
          ...successCfg,
          variant: VARIANTS.SUCCESS,
          loading: false,
          dismissible: true,
          showProgress: true,
          duration: successCfg.duration !== undefined ? successCfg.duration : this.config.duration
        });
        return result;
      } catch (err) {
        const errorCfg = isFunction(messages.error)
          ? messages.error(err)
          : (isPlainObject(messages.error)
              ? messages.error
              : { message: messages.error || (err && err.message) || 'Something went wrong' });

        handle.update({
          ...baseOpts,
          ...errorCfg,
          variant: VARIANTS.ERROR,
          loading: false,
          dismissible: true,
          showProgress: true,
          duration: errorCfg.duration !== undefined ? errorCfg.duration : 4000
        });
        throw err;
      }
    }

    dismiss(id, reason = 'manual') {
      if (!id) return false;
      const active = this.activeMap.get(id);
      if (active) {
        active.dismiss(reason);
        return true;
      }
      const beforeLen = this.queue.length;
      this.queue = this.queue.filter((q) => q.id !== id);
      return this.queue.length < beforeLen;
    }

    dismissAll(reason = 'clear_all') {
      this.queue = [];
      const items = Array.from(this.activeMap.values());
      items.forEach((item) => item.dismiss(reason));
    }

    getActive() {
      return Array.from(this.activeMap.values()).map((item) => item.getSnapshot());
    }

    getQueued() {
      return this.queue.map((item) => item.getSnapshot());
    }

    on(event, handler) {
      return this.events.on(event, handler);
    }

    once(event, handler) {
      return this.events.once(event, handler);
    }

    off(event, handler) {
      return this.events.off(event, handler);
    }

    destroy() {
      this.dismissAll('destroy');
      this.events.clear();
      if (isBrowser() && this._bound) {
        if (this._onWindowBlur) window.removeEventListener('blur', this._onWindowBlur);
        if (this._onWindowFocus) window.removeEventListener('focus', this._onWindowFocus);
        if (this._onVisibilityChange) document.removeEventListener('visibilitychange', this._onVisibilityChange);
        if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
        if (this._mediaQuery && this._onThemeChange) {
          if (isFunction(this._mediaQuery.removeEventListener)) {
            this._mediaQuery.removeEventListener('change', this._onThemeChange);
          } else if (isFunction(this._mediaQuery.removeListener)) {
            this._mediaQuery.removeListener(this._onThemeChange);
          }
        }
      }
      if (this._rootEl && this._rootEl.parentElement) {
        this._rootEl.parentElement.removeChild(this._rootEl);
      }
      this._rootEl = null;
      this._containers.clear();
      this._bound = false;
    }
  }

  /* ==========================================================================
   * 8. FACTORY & SINGLETON EXPORT
   * ========================================================================== */

  const defaultInstance = new ToastManager();

  function createToastEngine(config = {}) {
    return new ToastManager(config);
  }

  const api = {
    version: VERSION,
    POSITIONS,
    VARIANTS,
    THEMES,
    DEFAULT_CONFIG,
    create: createToastEngine,
    configure: (cfg) => defaultInstance.configure(cfg),
    setTheme: (theme) => defaultInstance.setTheme(theme),
    setPosition: (pos) => defaultInstance.setPosition(pos),
    playSound: (src) => defaultInstance.playSound(src),
    show: (opts) => defaultInstance.show(opts),
    success: (msg, opts) => defaultInstance.success(msg, opts),
    error: (msg, opts) => defaultInstance.error(msg, opts),
    warning: (msg, opts) => defaultInstance.warning(msg, opts),
    info: (msg, opts) => defaultInstance.info(msg, opts),
    neutral: (msg, opts) => defaultInstance.neutral(msg, opts),
    loading: (msg, opts) => defaultInstance.loading(msg, opts),
    payment: (payload) => defaultInstance.payment(payload),
    promise: (p, msgs, opts) => defaultInstance.promise(p, msgs, opts),
    dismiss: (id, reason) => defaultInstance.dismiss(id, reason),
    dismissAll: (reason) => defaultInstance.dismissAll(reason),
    getActive: () => defaultInstance.getActive(),
    getQueued: () => defaultInstance.getQueued(),
    on: (ev, fn) => defaultInstance.on(ev, fn),
    once: (ev, fn) => defaultInstance.once(ev, fn),
    off: (ev, fn) => defaultInstance.off(ev, fn),
    destroy: () => defaultInstance.destroy()
  };

  return api;
});
