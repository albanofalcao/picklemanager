'use strict';

/**
 * UI — Shared UI utilities: modal, confirm dialog, toasts, formatters
 */
const UI = {
  _confirmResolve: null,

  /** Bind modal close triggers (close button, cancel button, backdrop click, ESC) */
  initModal() {
    const overlay  = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');

    closeBtn && closeBtn.addEventListener('click', () => this.closeModal());
    cancelBtn && cancelBtn.addEventListener('click', () => this.closeModal());

    // Close on backdrop click (only when clicking the overlay itself)
    overlay && overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    // Close confirm dialog on backdrop
    const confirmOverlay = document.getElementById('confirm-overlay');
    confirmOverlay && confirmOverlay.addEventListener('click', (e) => {
      if (e.target === confirmOverlay) this._resolveConfirm(false);
    });

    // Cancel confirm
    const confirmCancel = document.getElementById('confirm-cancel');
    confirmCancel && confirmCancel.addEventListener('click', () => this._resolveConfirm(false));

    // OK confirm
    const confirmOk = document.getElementById('confirm-ok');
    confirmOk && confirmOk.addEventListener('click', () => this._resolveConfirm(true));

    // ESC key handler
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const confirmOverlayEl = document.getElementById('confirm-overlay');
      if (confirmOverlayEl && confirmOverlayEl.classList.contains('open')) {
        this._resolveConfirm(false);
      } else {
        this.closeModal();
      }
    });

    // Sidebar toggle for mobile
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    toggle && toggle.addEventListener('click', () => {
      sidebar && sidebar.classList.toggle('open');
    });
  },

  /**
   * Open the main modal.
   * @param {Object} opts
   * @param {string}   opts.title
   * @param {string}   opts.content   - HTML string
   * @param {string}   [opts.confirmLabel='Salvar']
   * @param {Function} [opts.onConfirm]
   * @param {boolean}  [opts.hideFooter=false]
   */
  openModal({ title = '', content = '', confirmLabel = 'Salvar', cancelLabel = 'Cancelar', onConfirm = null, hideFooter = false, wide = false } = {}) {
    const overlay    = document.getElementById('modal-overlay');
    const dialog     = document.getElementById('modal-dialog');
    const titleEl    = document.getElementById('modal-title');
    const bodyEl     = document.getElementById('modal-body');
    const footerEl   = document.getElementById('modal-footer');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn  = document.getElementById('modal-cancel');

    if (!overlay) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    dialog.classList.toggle('modal-wide', !!wide);
    if (cancelBtn) cancelBtn.textContent = cancelLabel;

    if (hideFooter) {
      footerEl.style.display = 'none';
    } else {
      footerEl.style.display = '';
      confirmBtn.textContent = confirmLabel;

      // Remove old listener by cloning
      const newConfirm = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

      if (typeof onConfirm === 'function') {
        newConfirm.addEventListener('click', onConfirm);
      }
    }

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');

    // Focus first focusable element inside modal
    requestAnimationFrame(() => {
      const focusable = bodyEl.querySelector('input, select, textarea, button');
      focusable && focusable.focus();
    });
  },

  /** Hide modal and clear its content */
  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    // Clear after animation
    setTimeout(() => {
      const bodyEl = document.getElementById('modal-body');
      if (bodyEl) bodyEl.innerHTML = '';
    }, 300);
  },

  /**
   * Show a confirm dialog; returns a Promise<boolean>.
   * @param {string} message
   * @param {string} [title='Confirmar']
   */
  confirm(message, title = 'Confirmar') {
    return new Promise((resolve) => {
      this._confirmResolve = resolve;

      const overlay = document.getElementById('confirm-overlay');
      const titleEl = document.getElementById('confirm-title');
      const msgEl   = document.getElementById('confirm-message');

      if (!overlay) { resolve(false); return; }

      titleEl.textContent = title;
      msgEl.textContent   = message;

      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');

      // Focus confirm button
      requestAnimationFrame(() => {
        const ok = document.getElementById('confirm-ok');
        ok && ok.focus();
      });
    });
  },

  _resolveConfirm(value) {
    const overlay = document.getElementById('confirm-overlay');
    overlay && overlay.classList.remove('open');
    overlay && overlay.setAttribute('aria-hidden', 'true');
    if (this._confirmResolve) {
      this._confirmResolve(value);
      this._confirmResolve = null;
    }
  },

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type='success']
   * @param {number} [duration=3500]
   */
  toast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✓',
      error:   '✕',
      warning: '⚠',
      info:    'ℹ',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-msg">${this.escape(message)}</span>
    `;

    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  /**
   * Format an ISO date string to pt-BR locale (dd/mm/yyyy).
   * Returns '—' if invalid.
   */
  formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch (e) {
      return '—';
    }
  },

  /**
   * Format an ISO date string to pt-BR locale with time (dd/mm/yyyy HH:mm).
   * Returns '—' if invalid.
   */
  formatDateTime(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch (e) {
      return '—';
    }
  },

  /**
   * Escape a string for safe HTML injection.
   * Uses DOM textContent trick to avoid XSS.
   */
  escape(str) {
    if (str === null || str === undefined) return '';
    const el = document.createElement('span');
    el.textContent = String(str);
    return el.innerHTML;
  },
};
