'use strict';

/**
 * InactivityLock — Bloqueia a tela após período de inatividade.
 * Após HOME_WAIT_MIN minutos com o lock ativo sem desbloqueio,
 * faz logout automático e exibe a tela inicial (HomeKiosk).
 */
const InactivityLock = {
  _timer:    null,
  _warnTimer:null,
  _warnCount:null,
  _homeTimer:null,   // temporizador de retorno ao home pós-lock
  _locked:   false,
  _started:  false,

  CONFIG_KEY:    'pm_inatividade_min',
  DEFAULT_MIN:   10,   // minutos até o lock
  WARN_SEC:      60,   // aviso N segundos antes do lock
  HOME_WAIT_MIN:  5,   // minutos sem desbloquear → logout + HomeKiosk

  /* ------------------------------------------------------------------ */

  getTimeoutMs() {
    const v = parseInt(localStorage.getItem(this.CONFIG_KEY), 10);
    return ((v && v > 0) ? v : this.DEFAULT_MIN) * 60 * 1000;
  },

  getTimeoutMin() {
    const v = parseInt(localStorage.getItem(this.CONFIG_KEY), 10);
    return (v && v > 0) ? v : this.DEFAULT_MIN;
  },

  setTimeoutMin(min) {
    localStorage.setItem(this.CONFIG_KEY, String(min));
  },

  /* ------------------------------------------------------------------ */

  start() {
    if (this.getTimeoutMin() === 0) return; // desativado
    if (this._started) return;
    this._started = true;
    const events = ['mousemove','mousedown','keydown','touchstart','scroll','click'];
    events.forEach(ev =>
      document.addEventListener(ev, () => { if (!this._locked) this._reset(); }, { passive: true })
    );
    this._reset();
  },

  stop() {
    this._started = false;
    clearTimeout(this._timer);
    clearTimeout(this._warnTimer);
    clearTimeout(this._homeTimer);
    clearInterval(this._warnCount);
    this._hideWarn();
    this._doUnlock();
  },

  /* ------------------------------------------------------------------ */

  _reset() {
    clearTimeout(this._timer);
    clearTimeout(this._warnTimer);
    clearInterval(this._warnCount);
    this._hideWarn();

    const ms     = this.getTimeoutMs();
    const warnMs = ms - this.WARN_SEC * 1000;

    if (warnMs > 0) {
      this._warnTimer = setTimeout(() => this._showWarn(), warnMs);
    } else {
      // Timeout menor que o aviso — mostra imediatamente
      this._showWarn();
    }
    this._timer = setTimeout(() => this._lock(), ms);
  },

  /* ------------------------------------------------------------------ */

  _lock() {
    if (this._locked) return;
    this._locked = true;
    this._hideWarn();

    const session  = Auth.getCurrentUser();
    const avatarEl = document.getElementById('lock-avatar');
    const nameEl   = document.getElementById('lock-name');
    if (avatarEl) avatarEl.textContent = session?.avatar || '?';
    if (nameEl)   nameEl.textContent   = session?.nome   || 'Usuário';

    const overlay = document.getElementById('lock-overlay');
    if (overlay) {
      overlay.classList.add('open');
      overlay.removeAttribute('aria-hidden');
    }
    setTimeout(() => {
      document.getElementById('lock-senha')?.focus();
    }, 300);

    // Temporizador de retorno ao home: se ninguém desbloquear em HOME_WAIT_MIN
    // minutos, faz logout automático e exibe a tela inicial (HomeKiosk).
    if (this.HOME_WAIT_MIN > 0) {
      clearTimeout(this._homeTimer);
      this._homeTimer = setTimeout(() => {
        if (this._locked) Auth.logout();
      }, this.HOME_WAIT_MIN * 60 * 1000);
    }
  },

  _doUnlock() {
    this._locked = false;
    clearTimeout(this._homeTimer);   // cancela retorno automático ao home
    const overlay = document.getElementById('lock-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    const errEl   = document.getElementById('lock-error');
    const senhaEl = document.getElementById('lock-senha');
    if (errEl)   errEl.style.display = 'none';
    if (senhaEl) senhaEl.value       = '';
  },

  tryUnlock(senha) {
    const session = Auth.getCurrentUser();
    if (!session) { Auth.logout(); return false; }
    const users = Storage.getAll('usuarios');
    const user  = users.find(u =>
      u.login === session.login && u.senha === btoa(senha) && u.status === 'ativo'
    );
    if (!user) return false;
    this._doUnlock();
    this._reset();
    return true;
  },

  /* ------------------------------------------------------------------ */

  _showWarn() {
    const el = document.getElementById('lock-warn');
    if (!el) return;
    let restante = this.WARN_SEC;
    const atualiza = () => {
      el.innerHTML = `⏱️ Tela será bloqueada por inatividade em <strong>${restante}s</strong>. Mova o mouse para continuar.`;
      el.style.display = 'flex';
    };
    atualiza();
    clearInterval(this._warnCount);
    this._warnCount = setInterval(() => {
      restante--;
      if (restante <= 0) { clearInterval(this._warnCount); return; }
      atualiza();
    }, 1000);
  },

  _hideWarn() {
    clearInterval(this._warnCount);
    const el = document.getElementById('lock-warn');
    if (el) el.style.display = 'none';
  },
};
