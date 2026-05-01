'use strict';

/**
 * HomeKiosk — Tela inicial institucional do PickleManager.
 *
 * Exibida automaticamente quando nenhum usuário está autenticado:
 *   • Na abertura do sistema (sem sessão ativa)
 *   • Após logout
 *   • Após o lock screen ficar sem ação por HOME_WAIT_MIN minutos
 *
 * Serve como vitrine da academia para visitantes na recepção e como
 * ponto de entrada natural para quem vai usar o sistema.
 */
const HomeKiosk = {

  _clockTimer: null,   // setInterval do relógio
  _keyHandler: null,   // listener global de teclado

  /* ------------------------------------------------------------------ */
  /*  API pública                                                          */
  /* ------------------------------------------------------------------ */

  show() {
    this._stop();
    this._hideAll();
    this._render();
    this._startClock();
    this._bindClick();
  },

  hide() {
    this._stop();
    const el = document.getElementById('kiosk-wrap');
    if (el) el.remove();
  },

  /** Fecha a tela kiosk: volta ao app se há sessão ativa, senão abre login */
  goLogin() {
    this.hide();
    if (Auth.getSession()) {
      document.getElementById('app-layout')?.style.removeProperty('display');
    } else {
      Auth.showLogin();
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Internals                                                            */
  /* ------------------------------------------------------------------ */

  _stop() {
    clearInterval(this._clockTimer);
    this._clockTimer = null;
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  },

  _hideAll() {
    document.getElementById('app-layout')   ?.style.setProperty('display', 'none');
    document.getElementById('portal-wrap')  ?.style.setProperty('display', 'none');
    const loginEl = document.getElementById('login-overlay');
    if (loginEl) { loginEl.classList.remove('open'); loginEl.setAttribute('aria-hidden', 'true'); }
    const lockEl = document.getElementById('lock-overlay');
    if (lockEl)  { lockEl.classList.remove('open');  lockEl.setAttribute('aria-hidden', 'true'); }
  },

  _render() {
    let wrap = document.getElementById('kiosk-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'kiosk-wrap'; document.body.appendChild(wrap); }

    const academyName = this._getAcademyName();
    const now         = new Date();
    const timeStr     = now.toLocaleTimeString('pt-BR',  { hour: '2-digit', minute: '2-digit' });
    const dateStr     = now.toLocaleDateString('pt-BR',  { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    wrap.style.cssText =
      'position:fixed;inset:0;z-index:500;overflow:hidden;' +
      'background:linear-gradient(145deg,#0d3d34 0%,#1a6b5e 45%,#134f43 100%);' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'cursor:pointer;';

    wrap.innerHTML = `
      <style>
        @keyframes kiosk-in     { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes kiosk-float  { 0%,100%{transform:translateY(0) rotate(-6deg)} 50%{transform:translateY(-10px) rotate(-6deg)} }
        @keyframes kiosk-pulse  { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes kiosk-shimmer{ 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        #kiosk-main             { animation:kiosk-in .55s cubic-bezier(.22,1,.36,1) both; }
        .kiosk-pill:hover       { background:rgba(125,232,220,.18)!important; transform:translateY(-2px)!important; }
        .kiosk-enter-btn:hover  { transform:translateY(-3px)!important; box-shadow:0 14px 36px rgba(0,0,0,.40)!important; }
      </style>

      <!-- Círculos decorativos de fundo -->
      <div style="position:absolute;right:-100px;top:-100px;width:480px;height:480px;
        border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none;"></div>
      <div style="position:absolute;left:-80px;bottom:-80px;width:360px;height:360px;
        border-radius:50%;background:rgba(255,255,255,.03);pointer-events:none;"></div>
      <div style="position:absolute;right:22%;top:18%;width:140px;height:140px;
        border-radius:50%;background:rgba(125,232,220,.05);pointer-events:none;"></div>
      <div style="position:absolute;left:15%;bottom:22%;width:100px;height:100px;
        border-radius:50%;background:rgba(125,232,220,.04);pointer-events:none;"></div>

      <!-- Conteúdo central -->
      <div id="kiosk-main" style="text-align:center;padding:32px 24px;z-index:1;
        max-width:640px;width:100%;pointer-events:none;">

        <!-- Logo + nome do sistema -->
        <div style="display:flex;align-items:center;justify-content:center;
          gap:14px;margin-bottom:30px;pointer-events:none;">
          <img src="img/pickleball-paddle.svg" alt=""
            style="width:56px;height:56px;opacity:.9;
              animation:kiosk-float 3.8s ease-in-out infinite;">
          <div style="text-align:left;">
            <div style="color:#fff;font-size:clamp(22px,3.5vw,32px);
              font-weight:900;letter-spacing:-.5px;line-height:1.1;">PickleManager</div>
            <div style="color:rgba(255,255,255,.5);font-size:12px;
              letter-spacing:.6px;text-transform:uppercase;margin-top:3px;">
              ${this._esc(academyName)}</div>
          </div>
        </div>

        <!-- Relógio ao vivo -->
        <div style="margin-bottom:8px;pointer-events:none;">
          <div id="kiosk-time"
            style="color:#7de8dc;font-size:clamp(64px,12vw,96px);font-weight:900;
              letter-spacing:-4px;line-height:1;
              text-shadow:0 0 48px rgba(125,232,220,.3);">${timeStr}</div>
          <div id="kiosk-date"
            style="color:rgba(255,255,255,.5);font-size:15px;font-weight:500;
              margin-top:8px;text-transform:capitalize;">${dateStr}</div>
        </div>

        <!-- Linha divisória -->
        <div style="width:72px;height:3px;border-radius:99px;margin:26px auto;
          background:linear-gradient(90deg,transparent,rgba(125,232,220,.55),transparent);
          pointer-events:none;"></div>

        <!-- Pills de funcionalidades -->
        <div style="display:flex;flex-wrap:wrap;justify-content:center;
          gap:8px;margin-bottom:36px;pointer-events:none;">
          ${[
            { icon:'🏟️', label:'Quadras'   },
            { icon:'📋', label:'Turmas'    },
            { icon:'🏆', label:'Torneios'  },
            { icon:'👥', label:'Alunos'    },
            { icon:'💰', label:'Financeiro'},
            { icon:'🛒', label:'Loja'      },
          ].map(f => `
            <div class="kiosk-pill"
              style="display:inline-flex;align-items:center;gap:6px;
                background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
                border-radius:999px;padding:7px 16px;
                font-size:13px;color:rgba(255,255,255,.75);font-weight:600;
                transition:.18s;cursor:default;pointer-events:none;">
              <span>${f.icon}</span><span>${f.label}</span>
            </div>`).join('')}
        </div>

        <!-- Botão Entrar (único elemento com pointer-events ativos) -->
        <div style="pointer-events:auto;">
          <button id="kiosk-login-btn" class="kiosk-enter-btn"
            onclick="event.stopPropagation(); HomeKiosk.goLogin();"
            style="display:inline-flex;align-items:center;gap:10px;
              background:linear-gradient(135deg,#7de8dc 0%,#3bb5a7 100%);
              color:#0d3d34;font-size:16px;font-weight:800;
              border:none;border-radius:14px;padding:16px 38px;
              cursor:pointer;transition:.2s;
              box-shadow:0 8px 28px rgba(0,0,0,.32);">
            <span style="font-size:20px;">🔑</span> Entrar no Sistema
          </button>
        </div>

        <!-- Dica de toque -->
        <div style="color:rgba(255,255,255,.28);font-size:12px;
          margin-top:22px;letter-spacing:.4px;pointer-events:none;
          animation:kiosk-pulse 2.8s ease-in-out infinite;">
          Toque em qualquer lugar para continuar
        </div>

      </div>`;
  },

  _startClock() {
    const tick = () => {
      const now  = new Date();
      const tEl  = document.getElementById('kiosk-time');
      const dEl  = document.getElementById('kiosk-date');
      if (tEl) tEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (dEl) dEl.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    };
    this._clockTimer = setInterval(tick, 1000);
  },

  _bindClick() {
    const wrap = document.getElementById('kiosk-wrap');
    if (!wrap) return;

    // Clique em qualquer lugar (exceto botão, tratado pelo próprio onclick)
    wrap.addEventListener('click', (e) => {
      if (e.target.id === 'kiosk-login-btn' || e.target.closest?.('#kiosk-login-btn')) return;
      this.goLogin();
    });

    // Qualquer tecla também abre o login
    this._keyHandler = () => this.goLogin();
    document.addEventListener('keydown', this._keyHandler, { once: true });
  },

  _getAcademyName() {
    // 1. Tenta pegar do brand já renderizado no DOM
    const sub = document.getElementById('brand-sub');
    if (sub?.textContent?.trim() && sub.textContent.trim() !== 'Academia de Pickleball') {
      return sub.textContent.trim();
    }
    // 2. Tenta via helper de tenant ativo
    if (typeof getActiveTenantLabel === 'function') {
      try { const v = getActiveTenantLabel(); if (v) return v; } catch (_) {}
    }
    // 3. Fallback
    return 'Academia de Pickleball';
  },

  _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};
