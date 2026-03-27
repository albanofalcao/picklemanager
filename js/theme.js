'use strict';

/**
 * Theme — Controle de modo escuro / claro com persistência.
 */
const Theme = {
  _KEY: 'pm_theme',

  init() {
    const saved = localStorage.getItem(this._KEY) || 'light';
    this._apply(saved);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next    = current === 'dark' ? 'light' : 'dark';
    this._apply(next);
    localStorage.setItem(this._KEY, next);
  },

  _apply(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.title = mode === 'dark' ? 'Modo claro' : 'Modo escuro';
    if (btn) btn.textContent = mode === 'dark' ? '☀️' : '🌙';
  },
};
