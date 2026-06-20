'use strict';

/**
 * SuperAdmin — painel de gestão de tenants (arenas clientes)
 * Autenticação via Supabase Auth
 * Usa o design system do PickleManager (CSS variables)
 */
const SuperAdmin = {
  _user:   null,
  _tab:    'lista',
  _tenant: null,

  /* ------------------------------------------------------------------ */
  /*  Auth                                                                */
  /* ------------------------------------------------------------------ */

  REDIRECT_URL: 'https://albanofalcao.github.io/picklemanager/',

  init() {
    sessionStorage.removeItem('pm_admin_login');
    this._renderLogin();
  },

  async login(loginOrEmail, senha) {
    const btn = document.getElementById('sa-login-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando…'; }
    try {
      const hash = btoa(senha);
      const lc   = (loginOrEmail || '').trim().toLowerCase();
      if (!lc || !senha) { this._renderLogin('Preencha login e senha.'); return; }

      // Busca em todos os tenants (sem filtro) para encontrar o superadmin
      const records = await window.PocketBaseClient.collection('app_usuarios')
        .getFullList({ requestKey: null })
        .catch(() => []);

      const match = records.find(r =>
        (r.data?.login?.toLowerCase() === lc || r.data?.email?.toLowerCase() === lc) &&
        r.data?.senha === hash &&
        r.data?.perfil === 'superadmin' &&
        r.data?.status === 'ativo'
      );

      if (!match) {
        this._renderLogin('❌ Login, senha incorretos ou sem perfil superadmin.');
        return;
      }

      this._user = {
        id:     match.id,
        nome:   match.data.nome || match.data.login || 'Super Admin',
        login:  match.data.login,
        perfil: 'superadmin',
      };
      this._showPanel();
    } catch (ex) {
      this._renderLogin('Erro: ' + ex.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
    }
  },

  async enviarRecuperacao() {
    const msgEl = document.getElementById('sa-rec-msg') || document.querySelector('[id^="sa-rec"]');
    this._renderRecuperacao('Entre em contato com o administrador para redefinir sua senha.', false);
  },

  async definirNovaSenha() {
    const s1  = document.getElementById('sa-ns-senha')?.value;
    const s2  = document.getElementById('sa-ns-confirma')?.value;
    const btn = document.getElementById('sa-ns-btn');
    if (!s1 || s1.length < 6) { alert('Mínimo 6 caracteres.'); return; }
    if (s1 !== s2)             { alert('As senhas não coincidem.'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    alert('Para redefinir senhas, use o painel do PocketBase em /_ ou contate o administrador.');
    if (btn) { btn.disabled = false; btn.textContent = '🔐 Salvar nova senha'; }
  },

  logout() {
    this._user   = null;
    this._tenant = null;
    const wrap = document.getElementById('sa-wrap');
    if (wrap) wrap.remove();
    document.getElementById('login-overlay')?.style.removeProperty('display');
    const loginEl = document.getElementById('login-overlay');
    if (loginEl) { loginEl.classList.add('open'); loginEl.removeAttribute('aria-hidden'); }
  },

  /* ------------------------------------------------------------------ */
  /*  Login UI                                                            */
  /* ------------------------------------------------------------------ */

  _showWrap(html, flex = true) {
    document.getElementById('app-layout')?.style.setProperty('display', 'none');
    document.getElementById('portal-wrap')?.style.setProperty('display', 'none');
    document.getElementById('login-overlay')?.style.setProperty('display', 'none');
    let wrap = document.getElementById('sa-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'sa-wrap'; document.body.appendChild(wrap); }
    wrap.style.display = flex ? 'flex' : 'block';
    wrap.innerHTML = html;
  },

  _renderLogin(msg = '') {
    const isSuccess = msg.startsWith('✅');
    const msgHtml = msg ? `
      <div style="background:${isSuccess ? 'var(--success-light,#d1fae5)' : 'var(--red-light,#fee2e2)'};
        color:${isSuccess ? 'var(--success-text,#065f46)' : 'var(--red-text,#991b1b)'};
        border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;
        display:flex;align-items:flex-start;gap:8px;">${msg}</div>` : '';

    this._showWrap(`
      <div style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(135deg,var(--sidebar-bg) 0%,var(--sidebar-hover) 100%);">
        <div class="login-box" style="max-width:380px;">

          <!-- Brand -->
          <div class="login-brand" style="margin-bottom:18px;">
            <span class="login-brand-icon">
              <img src="img/pickleball-paddle.svg" alt="" style="width:40px;height:40px;vertical-align:middle;">
            </span>
            <div>
              <div class="login-brand-name">PickleManager</div>
              <div class="login-brand-sub">Gestão de Pickleball</div>
            </div>
          </div>

          <!-- Admin badge -->
          <div style="text-align:center;margin-bottom:18px;">
            <span style="display:inline-flex;align-items:center;gap:5px;
              background:rgba(109,40,217,.1);color:#6d28d9;
              border:1px solid rgba(109,40,217,.2);
              padding:5px 14px;border-radius:999px;
              font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">
              🔧 Área Administrativa</span>
          </div>

          <h2 class="login-title" style="font-size:16px;margin-bottom:18px;">Acesso restrito</h2>
          ${msgHtml}

          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label" for="sa-login">Login ou e-mail</label>
            <input id="sa-login" type="text" class="form-input" placeholder="login ou e-mail" autocomplete="username"
              style="height:44px;border-radius:10px;"
              onkeydown="if(event.key==='Enter') document.getElementById('sa-senha').focus()" />
          </div>
          <div class="form-group" style="margin-bottom:20px;">
            <label class="form-label" for="sa-senha">Senha</label>
            <input id="sa-senha" type="password" class="form-input" placeholder="••••••••"
              style="height:44px;border-radius:10px;"
              onkeydown="if(event.key==='Enter') SuperAdmin.login(document.getElementById('sa-login').value, this.value)" />
          </div>

          <button id="sa-login-btn" class="btn btn-primary"
            style="width:100%;height:46px;font-size:15px;font-weight:700;border-radius:10px;"
            onclick="SuperAdmin.login(document.getElementById('sa-login').value, document.getElementById('sa-senha').value)">
            Entrar →
          </button>

          <div style="text-align:center;margin-top:14px;">
            <button class="btn btn-ghost btn-sm" style="color:var(--text-muted);font-size:12px;"
              onclick="SuperAdmin._renderRecuperacao()">Esqueci minha senha</button>
          </div>
          <div style="text-align:center;margin-top:10px;padding-top:12px;border-top:1px solid var(--card-border);">
            <button class="btn btn-ghost btn-sm" style="font-size:12px;"
              onclick="SuperAdmin.voltarApp()">← Voltar ao sistema</button>
          </div>

        </div>
      </div>`);
  },

  _renderRecuperacao(msg = '', enviado = false) {
    const msgHtml = msg ? `<div style="background:var(--red-light);color:var(--red-text);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;">${msg}</div>` : '';
    this._showWrap(`
      <div style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(135deg,var(--sidebar-bg) 0%,var(--sidebar-hover) 100%);">
        <div class="login-box" style="max-width:380px;">
          <div class="login-brand">
            <span class="login-brand-icon"><img src="img/pickleball-paddle.svg" alt="" style="width:40px;height:40px;vertical-align:middle;"></span>
            <div>
              <div class="login-brand-name">PickleManager</div>
              <div class="login-brand-sub">Recuperar acesso</div>
            </div>
          </div>
          <h2 class="login-title" style="font-size:16px;">Esqueci minha senha</h2>
          ${msgHtml}
          ${enviado ? `
            <div style="background:var(--success-light);color:var(--success-text);border-radius:8px;
              padding:14px;font-size:13px;text-align:center;line-height:1.6;">
              ✅ <strong>Link enviado!</strong><br>
              Verifique seu e-mail e clique no link de recuperação.<br>
              <small style="opacity:.8;">O link redireciona para o sistema publicado.</small>
            </div>
            <div style="text-align:center;margin-top:16px;">
              <button class="btn btn-ghost btn-sm" onclick="SuperAdmin._renderLogin()">← Voltar ao login</button>
            </div>` : `
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
              Informe seu e-mail de administrador. Enviaremos um link para redefinir a senha.
            </p>
            <div class="form-group" style="margin-bottom:20px;">
              <label class="form-label" for="sa-rec-email">E-mail</label>
              <input id="sa-rec-email" type="email" class="form-input" placeholder="seu@email.com"
                onkeydown="if(event.key==='Enter') SuperAdmin.enviarRecuperacao()" />
            </div>
            <button id="sa-rec-btn" class="btn btn-primary" style="width:100%;"
              onclick="SuperAdmin.enviarRecuperacao()">Enviar link de recuperação</button>
            <div style="text-align:center;margin-top:12px;">
              <button class="btn btn-ghost btn-sm" onclick="SuperAdmin._renderLogin()">← Voltar ao login</button>
            </div>`}
        </div>
      </div>`);
  },

  _renderNovaSenha() {
    this._showWrap(`
      <div style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(135deg,var(--sidebar-bg) 0%,var(--sidebar-hover) 100%);">
        <div class="login-box" style="max-width:380px;">
          <div class="login-brand">
            <span class="login-brand-icon"><img src="img/pickleball-paddle.svg" alt="" style="width:40px;height:40px;vertical-align:middle;"></span>
            <div>
              <div class="login-brand-name">PickleManager</div>
              <div class="login-brand-sub">Redefinir senha</div>
            </div>
          </div>
          <h2 class="login-title" style="font-size:16px;">🔐 Nova senha</h2>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
            Defina uma nova senha para sua conta de administrador.
          </p>
          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label">Nova senha <span style="color:var(--text-muted);font-size:11px;">(mín. 6 caracteres)</span></label>
            <input id="sa-ns-senha" type="password" class="form-input" placeholder="••••••••"
              onkeydown="if(event.key==='Enter') document.getElementById('sa-ns-confirma').focus()" />
          </div>
          <div class="form-group" style="margin-bottom:20px;">
            <label class="form-label">Confirmar nova senha</label>
            <input id="sa-ns-confirma" type="password" class="form-input" placeholder="••••••••"
              onkeydown="if(event.key==='Enter') SuperAdmin.definirNovaSenha()" />
          </div>
          <button id="sa-ns-btn" class="btn btn-primary" style="width:100%;"
            onclick="SuperAdmin.definirNovaSenha()">🔐 Salvar nova senha</button>
        </div>
      </div>`);
  },

  voltarApp() {
    document.getElementById('sa-wrap')?.style.setProperty('display','none');
    document.getElementById('login-overlay')?.style.removeProperty('display');
    document.getElementById('app-layout')?.style.removeProperty('display');
  },

  /* ------------------------------------------------------------------ */
  /*  Painel principal                                                    */
  /* ------------------------------------------------------------------ */

  _showPanel() {
    this._showWrap('', false);
    this._renderPanel();
  },

  _renderPanel() {
    let wrap = document.getElementById('sa-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'sa-wrap'; document.body.appendChild(wrap); }
    wrap.style.display = 'block';

    const nome    = this._user?.nome || 'Admin';
    const inicial = nome.trim().charAt(0).toUpperCase();
    const crumb   = this._tab === 'detalhe' ? this._tenant?.nome
                  : this._tab === 'novo'    ? (this._tenantEditId ? 'Editar Base' : 'Nova Base')
                  : null;

    wrap.innerHTML = `
      <div style="min-height:100vh;background:var(--page-bg);">

        <!-- HEADER -->
        <header style="background:var(--sidebar-bg);padding:0 28px;height:64px;
          display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 1px 0 rgba(255,255,255,.06),0 4px 16px rgba(0,0,0,.18);
          position:sticky;top:0;z-index:200;">

          <div style="display:flex;align-items:center;">
            <!-- Brand -->
            <div style="display:flex;align-items:center;gap:10px;
              padding-right:20px;border-right:1px solid rgba(255,255,255,.1);">
              <img src="img/pickleball-paddle.svg" alt="" style="width:26px;height:26px;opacity:.9;">
              <div>
                <div style="color:var(--sidebar-text-active);font-weight:800;font-size:14px;letter-spacing:-.2px;">
                  PickleManager</div>
                <div style="color:var(--sidebar-text);font-size:10px;opacity:.55;
                  letter-spacing:.6px;text-transform:uppercase;">Admin</div>
              </div>
            </div>
            <!-- Breadcrumb -->
            <nav style="display:flex;align-items:center;gap:2px;padding-left:20px;">
              <button onclick="SuperAdmin._tab='lista';SuperAdmin._renderPanel()"
                style="background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:8px;
                  font-size:13px;font-weight:600;transition:.15s;
                  color:${!crumb?'var(--sidebar-text-active)':'var(--sidebar-text)'};
                  opacity:${!crumb?'1':'.6'};"
                onmouseover="this.style.background='rgba(255,255,255,.08)'"
                onmouseout="this.style.background='none'">Bases</button>
              ${crumb ? `
                <span style="color:var(--sidebar-text);opacity:.3;font-size:16px;line-height:1;">›</span>
                <span style="font-size:13px;font-weight:600;color:var(--sidebar-text-active);
                  padding:6px 10px;max-width:240px;
                  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  ${this._esc(crumb)}</span>` : ''}
            </nav>
          </div>

          <!-- User area -->
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="display:flex;align-items:center;gap:8px;
              background:rgba(255,255,255,.07);border-radius:24px;
              padding:5px 14px 5px 6px;border:1px solid rgba(255,255,255,.08);">
              <div style="width:30px;height:30px;border-radius:50%;
                background:linear-gradient(135deg,var(--primary,#3b9e8f),#2a7068);
                display:flex;align-items:center;justify-content:center;
                font-size:12px;font-weight:800;color:#fff;
                box-shadow:0 0 0 2px rgba(255,255,255,.15);">${inicial}</div>
              <span style="color:var(--sidebar-text-active);font-size:13px;font-weight:600;
                max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${this._esc(nome)}</span>
            </div>
            <button onclick="SuperAdmin.logout()"
              style="display:flex;align-items:center;gap:5px;
                background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
                border-radius:8px;padding:7px 13px;font-size:12px;font-weight:600;
                color:var(--sidebar-text);cursor:pointer;transition:.15s;white-space:nowrap;"
              onmouseover="this.style.background='rgba(255,255,255,.14)';this.style.borderColor='rgba(255,255,255,.22)'"
              onmouseout="this.style.background='rgba(255,255,255,.06)';this.style.borderColor='rgba(255,255,255,.1)'">
              <span style="font-size:14px;">⏻</span> Sair
            </button>
          </div>
        </header>

        <!-- CONTENT -->
        <div style="padding:32px 28px 56px;max-width:1280px;margin:0 auto;" id="sa-content">
          ${this._tab === 'lista'   ? this._renderLista()   : ''}
          ${this._tab === 'detalhe' ? this._renderDetalhe() : ''}
          ${this._tab === 'novo'    ? this._renderForm()    : ''}
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Lista de Tenants                                                    */
  /* ------------------------------------------------------------------ */

  _renderLista() {
    setTimeout(() => this._carregarLista(), 0);
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:var(--text-primary);letter-spacing:-.5px;">Bases</h1>
          <p style="margin:5px 0 0;color:var(--text-muted);font-size:13px;">Gestão de todos os clientes PickleManager</p>
        </div>
        <button class="btn btn-primary"
          style="display:flex;align-items:center;gap:6px;height:40px;padding:0 18px;font-size:13px;"
          onclick="SuperAdmin._novoTenant()">
          <span style="font-size:20px;line-height:1;margin-top:-1px;">+</span> Nova Base
        </button>
      </div>
      <div id="sa-lista-wrap">
        <!-- Skeleton stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
          ${Array(4).fill(0).map(() => `
            <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:20px 22px;
              border:1px solid var(--card-border);display:flex;align-items:center;gap:14px;opacity:.45;">
              <div style="width:44px;height:44px;border-radius:12px;background:var(--gray-light);flex-shrink:0;"></div>
              <div style="flex:1;">
                <div style="height:10px;background:var(--gray-light);border-radius:6px;width:60%;margin-bottom:10px;"></div>
                <div style="height:22px;background:var(--gray-light);border-radius:6px;width:35%;"></div>
              </div>
            </div>`).join('')}
        </div>
        <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:40px;
          text-align:center;border:1px solid var(--card-border);color:var(--text-muted);font-size:14px;">
          Carregando bases…
        </div>
      </div>`;
  },

  async _carregarLista() {
    const wrap = document.getElementById('sa-lista-wrap');
    if (!wrap) return;

    try {
      let tenants = [];
      try {
        tenants = await window.PocketBaseClient.collection('tenants')
          .getFullList({ sort: 'nome', requestKey: null });
      } catch (e) {
        if (!document.contains(wrap)) return;
        wrap.innerHTML = `<div style="color:var(--red);padding:16px;">Erro ao carregar: ${this._esc(e.message)}</div>`;
        return;
      }
      if (!document.contains(wrap)) return;
      if (!tenants.length) {
        wrap.innerHTML = `<div style="padding:16px;color:var(--text-muted);">Nenhuma base cadastrada ainda.</div>`;
        return;
      }

    const TIPO_STYLE  = { matriz:'background:#ede9fe;color:#6d28d9;', arena:'background:#d1fae5;color:#065f46;' };
    const TIPO_ICON   = { matriz:'🏛️', arena:'🏢' };
    const TIPO_LABEL  = { matriz:'Matriz / Rede', arena:'Base' };
    const STATUS_DOT  = { ativa:'#22c55e', inativa:'#94a3b8', suspensa:'#ef4444' };
    const STATUS_TXT  = { ativa:'Ativa', inativa:'Inativa', suspensa:'Suspensa' };
    const PLANO_BG    = { basico:'#dbeafe', pro:'#ede9fe', premium:'var(--amber-light)' };
    const PLANO_COLOR = { basico:'#1e40af', pro:'#6d28d9', premium:'#92400e' };

    const matrizes = tenants.filter(t => t.tipo === 'matriz');
    const bases    = tenants.filter(t => t.tipo !== 'matriz');
    const ordenados = [...matrizes, ...bases];

    // Stats
    const S = {
      total:    tenants.length,
      ativas:   tenants.filter(t => t.status === 'ativa').length,
      matrizes: matrizes.length,
      inativas: tenants.filter(t => t.status !== 'ativa').length,
    };
    const statsCards = [
      { icon:'🏢', label:'Total de Bases',  value:S.total,    accent:'#3b9e8f', bg:'#d1fae5' },
      { icon:'✅', label:'Ativas',           value:S.ativas,  accent:'#059669', bg:'#d1fae5' },
      { icon:'🏛️', label:'Matrizes / Redes', value:S.matrizes, accent:'#6d28d9', bg:'#ede9fe' },
      { icon:'⚠️', label:'Inativas',         value:S.inativas, accent:'#d97706', bg:'#fef3c7' },
    ];

    const btnAcao = (onclick, title, icon, hover) =>
      `<button onclick="${onclick}" title="${title}"
        style="width:32px;height:32px;border-radius:8px;border:1px solid var(--card-border);
          background:var(--card-bg);cursor:pointer;font-size:14px;transition:.15s;
          display:inline-flex;align-items:center;justify-content:center;"
        onmouseover="this.style.background='${hover}';this.style.borderColor='${hover}'"
        onmouseout="this.style.background='var(--card-bg)';this.style.borderColor='var(--card-border)'">${icon}</button>`;

    wrap.innerHTML = `
      <!-- Stats cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
        ${statsCards.map(s => `
          <div style="background:var(--card-bg);border-radius:var(--card-radius);
            padding:18px 20px;border:1px solid var(--card-border);
            box-shadow:var(--card-shadow);display:flex;align-items:center;gap:14px;
            transition:transform .18s,box-shadow .18s;"
            onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.09)'"
            onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='var(--card-shadow)'">
            <div style="width:44px;height:44px;border-radius:12px;background:${s.bg};
              display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${s.icon}</div>
            <div>
              <div style="font-size:11px;font-weight:600;color:var(--text-muted);
                text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px;">${s.label}</div>
              <div style="font-size:26px;font-weight:800;color:var(--text-primary);line-height:1.1;">${s.value}</div>
            </div>
          </div>`).join('')}
      </div>

      ${ordenados.length ? `
      <!-- Table card -->
      <div style="background:var(--card-bg);border-radius:var(--card-radius);
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);overflow:hidden;">

        <div style="padding:14px 20px;border-bottom:1px solid var(--card-border);
          display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);">
            ${ordenados.length} base${ordenados.length !== 1 ? 's' : ''} cadastrada${ordenados.length !== 1 ? 's' : ''}
          </span>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--bg-secondary,#f8f6f1);">
              ${['Base','Tipo','Cidade','Plano','Status','Contrato',''].map((h,i) => `
                <th style="padding:10px ${i===6?'16px':'14px'};text-align:${i===6?'right':'left'};
                  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
                  color:var(--text-muted);${i===0?'padding-left:20px;':''}">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${ordenados.map(t => `
              <tr style="border-top:1px solid var(--card-border);transition:background .12s;
                background:${t.tipo==='matriz'?'linear-gradient(90deg,rgba(109,40,217,.025) 0%,transparent 60%)':'transparent'};"
                onmouseover="this.style.background='var(--bg-secondary,#f8f6f1)'"
                onmouseout="this.style.background='${t.tipo==='matriz'?'linear-gradient(90deg,rgba(109,40,217,.025) 0%,transparent 60%)':'transparent'}'">

                <td style="padding:13px 14px 13px 20px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:34px;height:34px;border-radius:10px;flex-shrink:0;
                      background:${t.tipo==='matriz'?'#ede9fe':'#d1fae5'};
                      display:flex;align-items:center;justify-content:center;font-size:15px;">
                      ${TIPO_ICON[t.tipo]||'🏢'}</div>
                    <div>
                      <div style="font-weight:700;color:var(--text-primary);font-size:13px;">
                        ${this._esc(t.nome)}</div>
                      <div style="font-size:11px;color:var(--text-muted);font-family:monospace;margin-top:1px;">
                        ${this._esc(t.slug||'')}</div>
                    </div>
                  </div>
                </td>

                <td style="padding:13px 14px;">
                  <span style="${TIPO_STYLE[t.tipo]||TIPO_STYLE.arena}
                    padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;">
                    ${TIPO_LABEL[t.tipo]||'Base'}</span>
                </td>

                <td style="padding:13px 14px;color:var(--text-secondary);font-size:12px;white-space:nowrap;">
                  ${this._esc(t.cidade||'—')}${t.estado?`<span style="color:var(--text-muted);"> / ${this._esc(t.estado)}</span>`:''}
                </td>

                <td style="padding:13px 14px;">
                  <span style="background:${PLANO_BG[t.plano]||'var(--gray-light)'};
                    color:${PLANO_COLOR[t.plano]||'var(--text-muted)'};
                    padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;">
                    ${t.plano||'—'}</span>
                </td>

                <td style="padding:13px 14px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;
                      background:${STATUS_DOT[t.status]||'#94a3b8'};
                      box-shadow:0 0 0 3px ${STATUS_DOT[t.status]||'#94a3b8'}28;"></span>
                    <span style="font-size:12px;color:var(--text-secondary);font-weight:500;">
                      ${STATUS_TXT[t.status]||t.status||'—'}</span>
                  </div>
                </td>

                <td style="padding:13px 14px;color:var(--text-muted);font-size:12px;white-space:nowrap;">
                  ${t.contrato_inicio ? new Date(t.contrato_inicio).toLocaleDateString('pt-BR') : '—'}
                </td>

                <td style="padding:13px 16px;text-align:right;">
                  <div style="display:inline-flex;align-items:center;gap:4px;">
                    ${btnAcao(`SuperAdmin._abrirDetalhe('${t.id}')`,    'Ver detalhe', '📂', 'var(--primary)')}
                    ${btnAcao(`SuperAdmin._copiarId('${t.id}','${this._esc(t.nome)}')`, 'Copiar ID', '📋', '#bfdbfe')}
                    ${btnAcao(`SuperAdmin._deletarTenant('${t.id}','${this._esc(t.nome)}')`, 'Excluir', '🗑️', '#fca5a5')}
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`

      : `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:72px 40px;
        text-align:center;box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
        <div style="width:72px;height:72px;border-radius:20px;background:#d1fae5;
          display:flex;align-items:center;justify-content:center;font-size:36px;
          margin:0 auto 16px;">🏟️</div>
        <div style="font-size:18px;font-weight:800;color:var(--text-primary);margin-bottom:6px;">
          Nenhuma base cadastrada</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px;">
          Cadastre a primeira base cliente para começar.</div>
        <button class="btn btn-primary" onclick="SuperAdmin._novoTenant()">+ Cadastrar Base</button>
      </div>`}
    `;
    } catch(e) {
      if (document.contains(wrap)) {
        wrap.innerHTML = `<div style="color:var(--red);padding:16px;">Erro inesperado: ${this._esc(e.message)}</div>`;
      }
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Detalhe do Tenant — abas                                            */
  /* ------------------------------------------------------------------ */

  _detailTab: 'dados',

  async _abrirDetalhe(id) {
    try {
      let data;
      try {
        data = await window.PocketBaseClient.collection('tenants').getOne(id, { requestKey: null });
      } catch (e) {
        alert('Erro ao carregar base: ' + e.message); return;
      }
      this._tenant = data;
      this._tab = 'detalhe';
      this._detailTab = 'dados';
      this._renderPanel();
    } catch(e) {
      alert('Erro inesperado: ' + e.message);
    }
  },

  _copiarId(id, nome) {
    navigator.clipboard.writeText(id).then(() => {
      alert(`ID copiado!\n\n${nome}\n${id}\n\nCole em supabase-config.js → TENANT_ID`);
    }).catch(() => {
      // Fallback para browsers sem clipboard API
      prompt(`Copie o ID abaixo (Ctrl+C):`, id);
    });
  },

  _renderDetalhe() {
    const t = this._tenant;
    if (!t) return '';

    setTimeout(() => this._carregarSubdados(), 0);

    const tab = this._detailTab;
    const STATUS_DOT  = { ativa:'#22c55e', inativa:'#94a3b8', suspensa:'#ef4444' };
    const STATUS_BG   = { ativa:'#d1fae5', inativa:'var(--gray-light)', suspensa:'#fee2e2' };
    const STATUS_TXT  = { ativa:'#065f46', inativa:'var(--gray-text)',  suspensa:'#991b1b' };
    const PLANO_BG    = { basico:'#dbeafe', pro:'#ede9fe', premium:'var(--amber-light)' };
    const PLANO_TXT   = { basico:'#1e40af', pro:'#6d28d9', premium:'#92400e' };
    const TIPO_ICON   = { matriz:'🏛️', arena:'🏢' };
    const TIPO_LABEL  = { matriz:'Matriz / Rede', arena:'Base' };
    const TIPO_BG     = { matriz:'#ede9fe', arena:'#d1fae5' };

    const ABAS = [
      { key:'dados',        icon:'📋', label:'Dados'        },
      { key:'responsaveis', icon:'👤', label:'Responsáveis' },
      { key:'quadras',      icon:'🏟️', label:'Quadras'       },
      { key:'contrato',     icon:'📄', label:'Contrato'      },
      { key:'financeiro',   icon:'💰', label:'Financeiro'    },
      { key:'usuarios',     icon:'🔑', label:'Usuários'      },
    ];

    return `
      <!-- Hero card -->
      <div style="background:var(--card-bg);border-radius:var(--card-radius);
        border:1px solid var(--card-border);box-shadow:var(--card-shadow);
        padding:22px 24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">

          <div style="display:flex;align-items:center;gap:14px;">
            <button onclick="SuperAdmin._tab='lista';SuperAdmin._renderPanel()"
              title="Voltar para lista"
              style="width:34px;height:34px;border-radius:9px;border:1px solid var(--card-border);
                background:var(--card-bg);cursor:pointer;font-size:16px;transition:.15s;flex-shrink:0;
                display:flex;align-items:center;justify-content:center;color:var(--text-muted);"
              onmouseover="this.style.background='var(--gray-light)'"
              onmouseout="this.style.background='var(--card-bg)'">←</button>

            <div style="width:48px;height:48px;border-radius:14px;flex-shrink:0;
              background:${TIPO_BG[t.tipo]||'#d1fae5'};
              display:flex;align-items:center;justify-content:center;font-size:24px;">
              ${TIPO_ICON[t.tipo]||'🏢'}</div>

            <div>
              <div style="font-size:19px;font-weight:800;color:var(--text-primary);letter-spacing:-.3px;">
                ${this._esc(t.nome)}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap;">
                <span style="font-family:monospace;font-size:11px;color:var(--text-muted);">
                  ${this._esc(t.slug||'')}</span>
                ${t.cidade ? `<span style="font-size:11px;color:var(--text-muted);">
                  · ${this._esc(t.cidade)}${t.estado?' / '+this._esc(t.estado):''}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
            <span style="display:inline-flex;align-items:center;gap:5px;
              background:${STATUS_BG[t.status]||'var(--gray-light)'};
              color:${STATUS_TXT[t.status]||'var(--gray-text)'};
              padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;">
              <span style="width:6px;height:6px;border-radius:50%;
                background:${STATUS_DOT[t.status]||'#94a3b8'};flex-shrink:0;"></span>
              ${t.status||'—'}</span>
            <span style="background:${PLANO_BG[t.plano]||'var(--gray-light)'};
              color:${PLANO_TXT[t.plano]||'var(--gray-text)'};
              padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase;">
              ${t.plano||'—'}</span>
            <span style="background:${TIPO_BG[t.tipo]||'#d1fae5'};
              color:${t.tipo==='matriz'?'#6d28d9':'#065f46'};
              padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;">
              ${TIPO_LABEL[t.tipo]||'Base'}</span>
            <button onclick="SuperAdmin._novoTenant('${t.id}')"
              class="btn btn-primary btn-sm">✏️ Editar</button>
          </div>
        </div>
      </div>

      <!-- Pill tabs -->
      <div style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:var(--card-radius);padding:5px;margin-bottom:16px;
        box-shadow:var(--card-shadow);display:flex;gap:3px;overflow-x:auto;scrollbar-width:none;">
        ${ABAS.map(a => `
          <button onclick="SuperAdmin._detailTab='${a.key}';SuperAdmin._renderPanel()"
            style="display:inline-flex;align-items:center;gap:6px;
              padding:8px 15px;border-radius:8px;border:none;cursor:pointer;
              font-size:13px;font-weight:600;white-space:nowrap;transition:.15s;
              background:${tab===a.key?'var(--primary)':'transparent'};
              color:${tab===a.key?'#fff':'var(--text-muted)'};"
            onmouseover="if('${a.key}'!=='${tab}'){this.style.background='var(--gray-light)';this.style.color='var(--text-primary)'}"
            onmouseout="if('${a.key}'!=='${tab}'){this.style.background='transparent';this.style.color='var(--text-muted)'}">
            <span>${a.icon}</span><span>${a.label}</span>
          </button>`).join('')}
      </div>

      <div id="sa-detail-content">
        <div style="text-align:center;padding:48px;color:var(--text-muted);">Carregando…</div>
      </div>`;
  },

  async _carregarSubdados() {
    const t   = this._tenant;
    const tab = this._detailTab;
    const el  = document.getElementById('sa-detail-content');
    if (!el || !t) return;

    if (tab === 'dados')        el.innerHTML = this._tabDados(t);
    if (tab === 'contrato')     el.innerHTML = this._tabContrato(t);
    if (tab === 'responsaveis') {
      el.innerHTML = this._tabResponsaveis([]);
    }
    if (tab === 'usuarios') {
      const dataId = this._dataId(t);
      const usRows = await window.PocketBaseClient.collection('app_usuarios')
        .getFullList({ filter: `tenant_id="${dataId}"`, requestKey: null }).catch(() => []);
      el.innerHTML = this._tabUsuarios(usRows);
    }
    if (tab === 'quadras') {
      const dataId = this._dataId(t);
      const qRows = await window.PocketBaseClient.collection('app_quadras')
        .getFullList({ filter: `tenant_id="${dataId}"`, requestKey: null }).catch(() => []);
      el.innerHTML = this._tabQuadras(qRows);
    }
    if (tab === 'financeiro') {
      el.innerHTML = this._tabFinanceiro([]);
    }
  },

  _tabDados(t) {
    const row = (label, value) => `
      <div style="display:flex;flex-direction:column;padding:12px 0;
        border-bottom:1px solid var(--card-border);">
        <span style="font-size:11px;font-weight:600;text-transform:uppercase;
          letter-spacing:.5px;color:var(--text-muted);margin-bottom:3px;">${label}</span>
        <span style="font-size:14px;color:var(--text-primary);font-weight:500;">
          ${this._esc(String(value||'—'))}</span>
      </div>`;

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 32px;
        background:var(--card-bg);border-radius:var(--card-radius);padding:8px 24px 16px;
        max-width:760px;box-shadow:var(--card-shadow);border:1px solid var(--card-border);">

        <div style="grid-column:1/-1;display:flex;justify-content:space-between;
          align-items:center;padding:16px 0 4px;border-bottom:2px solid var(--card-border);margin-bottom:4px;">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Informações da Base</span>
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._novoTenant('${t.id}')">✏️ Editar</button>
        </div>

        ${row('Nome',            t.nome)}
        ${row('Slug / URL',      t.slug)}
        ${row('Status',          t.status)}
        ${row('Plano',           t.plano)}
        ${row('Endereço',        t.endereco)}
        ${row('Bairro',          t.bairro)}
        ${row('Cidade',          t.cidade)}
        ${row('Estado',          t.estado)}
        ${row('CEP',             t.cep)}
        ${row('Área total',      t.area_total_m2 ? t.area_total_m2 + ' m²' : '—')}
        ${row('Grupo Econômico', t.grupos_economicos?.nome || '—')}
      </div>`;
  },

  _tabContrato(t) {
    const row = (label, value) => `
      <div style="display:flex;flex-direction:column;padding:12px 0;
        border-bottom:1px solid var(--card-border);">
        <span style="font-size:11px;font-weight:600;text-transform:uppercase;
          letter-spacing:.5px;color:var(--text-muted);margin-bottom:3px;">${label}</span>
        <span style="font-size:14px;color:var(--text-primary);font-weight:500;">
          ${this._esc(String(value||'—'))}</span>
      </div>`;

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 32px;
        background:var(--card-bg);border-radius:var(--card-radius);padding:8px 24px 16px;
        max-width:760px;box-shadow:var(--card-shadow);border:1px solid var(--card-border);">

        <div style="grid-column:1/-1;display:flex;justify-content:space-between;
          align-items:center;padding:16px 0 4px;border-bottom:2px solid var(--card-border);margin-bottom:4px;">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);">📄 Informações de Contrato</span>
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._novoTenant('${t.id}')">✏️ Editar</button>
        </div>

        ${row('Início do contrato', t.contrato_inicio   ? new Date(t.contrato_inicio).toLocaleDateString('pt-BR')   : '—')}
        ${row('Vigência',           t.contrato_vigencia ? new Date(t.contrato_vigencia).toLocaleDateString('pt-BR') : '—')}
        ${row('Canal de aquisição', t.canal_aquisicao)}
        ${row('Data de onboarding', t.data_onboarding   ? new Date(t.data_onboarding).toLocaleDateString('pt-BR')   : '—')}
        ${row('Responsável cobrança', t.responsavel_cobranca)}
        ${row('Plano', t.plano)}

        ${t.observacoes_internas ? `
          <div style="grid-column:1/-1;padding:14px 0 4px;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;
              letter-spacing:.5px;color:var(--text-muted);margin-bottom:8px;">Observações Internas</div>
            <div style="background:var(--bg-secondary,#f8f6f1);border-radius:10px;
              padding:14px;font-size:13px;color:var(--text-secondary);line-height:1.65;
              border:1px solid var(--card-border);">${this._esc(t.observacoes_internas)}</div>
          </div>` : ''}
      </div>`;
  },

  _tabResponsaveis(lista) {
    const btnAcao = (onclick, title, icon, hover) =>
      `<button onclick="${onclick}" title="${title}"
        style="width:30px;height:30px;border-radius:7px;border:1px solid var(--card-border);
          background:var(--card-bg);cursor:pointer;font-size:13px;transition:.15s;
          display:inline-flex;align-items:center;justify-content:center;"
        onmouseover="this.style.background='${hover}';this.style.borderColor='${hover}'"
        onmouseout="this.style.background='var(--card-bg)';this.style.borderColor='var(--card-border)'">${icon}</button>`;
    const iniciais = n => (n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();

    return `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);overflow:hidden;">

        <div style="padding:14px 20px;border-bottom:1px solid var(--card-border);
          display:flex;align-items:center;justify-content:space-between;
          background:var(--bg-secondary,#f8f6f1);">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);">
            ${lista.length} responsável${lista.length !== 1 ? 'is' : ''} cadastrado${lista.length !== 1 ? 's' : ''}
          </span>
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addResponsavel()">+ Responsável</button>
        </div>

        ${lista.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--bg-secondary,#f8f6f1);">
              ${['Nome / Cargo','E-mail','Telefone','Principal',''].map((h,i) => `
                <th style="padding:10px ${i===4?'16px':'14px'};text-align:${i===4?'right':'left'};
                  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
                  color:var(--text-muted);${i===0?'padding-left:20px;':''}">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${lista.map(r => `
              <tr style="border-top:1px solid var(--card-border);transition:background .12s;"
                onmouseover="this.style.background='var(--bg-secondary,#f8f6f1)'"
                onmouseout="this.style.background='transparent'">

                <td style="padding:13px 14px 13px 20px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;
                      background:linear-gradient(135deg,#3b9e8f,#2a7068);
                      display:flex;align-items:center;justify-content:center;
                      font-size:12px;font-weight:700;color:#fff;letter-spacing:-.5px;">
                      ${iniciais(r.nome)}</div>
                    <div>
                      <div style="font-weight:700;color:var(--text-primary);font-size:13px;">${this._esc(r.nome)}</div>
                      <div style="font-size:11px;color:var(--text-muted);margin-top:1px;">${this._esc(r.cargo||'—')}</div>
                    </div>
                  </div>
                </td>

                <td style="padding:13px 14px;font-size:12px;color:var(--text-secondary);">
                  ${this._esc(r.email||'—')}
                </td>

                <td style="padding:13px 14px;font-size:12px;color:var(--text-secondary);">
                  ${this._esc(r.telefone||'—')}
                </td>

                <td style="padding:13px 14px;">
                  ${r.principal
                    ? `<span style="background:#fef3c7;color:#92400e;padding:3px 9px;
                        border-radius:999px;font-size:11px;font-weight:700;">⭐ Principal</span>`
                    : `<span style="color:var(--text-muted);font-size:12px;">—</span>`}
                </td>

                <td style="padding:13px 16px;text-align:right;">
                  ${btnAcao(`SuperAdmin._delResponsavel('${r.id}')`, 'Remover', '🗑️', '#fca5a5')}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>` : `
        <div style="text-align:center;padding:64px 40px;">
          <div style="width:56px;height:56px;border-radius:16px;background:#dbeafe;
            display:flex;align-items:center;justify-content:center;font-size:26px;
            margin:0 auto 14px;">👤</div>
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">
            Nenhum responsável</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">
            Adicione responsáveis para gerenciar os contatos desta base.</div>
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addResponsavel()">+ Adicionar Responsável</button>
        </div>`}
      </div>`;
  },

  _tabQuadras(lista) {
    const btnAcao = (onclick, title, icon, hover) =>
      `<button onclick="${onclick}" title="${title}"
        style="width:30px;height:30px;border-radius:7px;border:1px solid var(--card-border);
          background:var(--card-bg);cursor:pointer;font-size:13px;transition:.15s;
          display:inline-flex;align-items:center;justify-content:center;"
        onmouseover="this.style.background='${hover}';this.style.borderColor='${hover}'"
        onmouseout="this.style.background='var(--card-bg)';this.style.borderColor='var(--card-border)'">${icon}</button>`;
    const STATUS_DOT = { ativa:'#22c55e', inativa:'#94a3b8', manutencao:'#f59e0b' };
    const STATUS_TXT = { ativa:'Ativa', inativa:'Inativa', manutencao:'Manutenção' };
    const COB_ICON   = { coberta:'🏠', descoberta:'☀️', 'semi-coberta':'⛅' };

    return `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);overflow:hidden;">

        <div style="padding:14px 20px;border-bottom:1px solid var(--card-border);
          display:flex;align-items:center;justify-content:space-between;
          background:var(--bg-secondary,#f8f6f1);">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);">
            ${lista.length} quadra${lista.length !== 1 ? 's' : ''} cadastrada${lista.length !== 1 ? 's' : ''}
          </span>
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addQuadra()">+ Quadra</button>
        </div>

        ${lista.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--bg-secondary,#f8f6f1);">
              ${['Quadra','Dimensões','Cobertura','Piso','Status',''].map((h,i) => `
                <th style="padding:10px ${i===5?'16px':'14px'};text-align:${i===5?'right':'left'};
                  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
                  color:var(--text-muted);${i===0?'padding-left:20px;':''}">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${lista.map(q => { const qd = q.data || {}; return `
              <tr style="border-top:1px solid var(--card-border);transition:background .12s;"
                onmouseover="this.style.background='var(--bg-secondary,#f8f6f1)'"
                onmouseout="this.style.background='transparent'">

                <td style="padding:13px 14px 13px 20px;">
                  <div style="display:flex;align-items:center;gap:9px;">
                    <div style="width:32px;height:32px;border-radius:9px;flex-shrink:0;
                      background:#d1fae5;display:flex;align-items:center;justify-content:center;font-size:14px;">🏟️</div>
                    <span style="font-weight:700;color:var(--text-primary);">${this._esc(qd.nome||q.nome||'')}</span>
                  </div>
                </td>

                <td style="padding:13px 14px;font-size:12px;color:var(--text-secondary);font-family:monospace;">
                  ${this._esc(qd.dimensoes||q.dimensoes||'—')}
                </td>

                <td style="padding:13px 14px;font-size:12px;color:var(--text-secondary);">
                  ${COB_ICON[qd.cobertura||q.cobertura]||''} ${this._esc(qd.cobertura||q.cobertura||'—')}
                </td>

                <td style="padding:13px 14px;font-size:12px;color:var(--text-secondary);">
                  ${this._esc(qd.tipo_piso||q.tipo_piso||'—')}
                </td>

                <td style="padding:13px 14px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;
                      background:${STATUS_DOT[qd.status||q.status]||'#94a3b8'};
                      box-shadow:0 0 0 3px ${STATUS_DOT[qd.status||q.status]||'#94a3b8'}28;"></span>
                    <span style="font-size:12px;color:var(--text-secondary);font-weight:500;">
                      ${STATUS_TXT[qd.status||q.status]||(qd.status||q.status)||'—'}</span>
                  </div>
                </td>

                <td style="padding:13px 16px;text-align:right;">
                  ${btnAcao(`SuperAdmin._delQuadra('${q.id}')`, 'Remover', '🗑️', '#fca5a5')}
                </td>
              </tr>`; }).join('')}
          </tbody>
        </table>` : `
        <div style="text-align:center;padding:64px 40px;">
          <div style="width:56px;height:56px;border-radius:16px;background:#d1fae5;
            display:flex;align-items:center;justify-content:center;font-size:26px;
            margin:0 auto 14px;">🏟️</div>
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">
            Nenhuma quadra</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">
            Cadastre as quadras físicas desta base.</div>
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addQuadra()">+ Adicionar Quadra</button>
        </div>`}
      </div>`;
  },

  _tabFinanceiro(lista) {
    const fmt = v => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const btnAcao = (onclick, title, icon, hover) =>
      `<button onclick="${onclick}" title="${title}"
        style="width:30px;height:30px;border-radius:7px;border:1px solid var(--card-border);
          background:var(--card-bg);cursor:pointer;font-size:13px;transition:.15s;
          display:inline-flex;align-items:center;justify-content:center;"
        onmouseover="this.style.background='${hover}';this.style.borderColor='${hover}'"
        onmouseout="this.style.background='var(--card-bg)';this.style.borderColor='var(--card-border)'">${icon}</button>`;
    const STATUS_DOT = { pago:'#22c55e', pendente:'#f59e0b', atrasado:'#ef4444', cancelado:'#94a3b8' };
    const STATUS_TXT = { pago:'Pago', pendente:'Pendente', atrasado:'Atrasado', cancelado:'Cancelado' };

    const totalGeral = lista.reduce((a,p) => a + (parseFloat(p.valor)||0), 0);
    const totalPago  = lista.filter(p => p.status === 'pago').reduce((a,p) => a + (parseFloat(p.valor)||0), 0);
    const totalAberto = lista.filter(p => p.status === 'pendente' || p.status === 'atrasado')
                            .reduce((a,p) => a + (parseFloat(p.valor)||0), 0);

    return `
      <div>
        ${lista.length ? `
        <!-- Mini stats financeiros -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
          ${[
            { label:'Total Lançado', value:fmt(totalGeral), bg:'var(--card-bg)',   color:'var(--text-primary)' },
            { label:'Recebido',      value:fmt(totalPago),  bg:'#d1fae5',          color:'#065f46'            },
            { label:'Em Aberto',     value:fmt(totalAberto), bg:'#fef3c7',         color:'#92400e'            },
          ].map(s => `
            <div style="background:${s.bg};border:1px solid var(--card-border);
              border-radius:var(--card-radius);padding:14px 18px;box-shadow:var(--card-shadow);">
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;
                color:var(--text-muted);margin-bottom:5px;">${s.label}</div>
              <div style="font-size:20px;font-weight:800;color:${s.color};">${s.value}</div>
            </div>`).join('')}
        </div>` : ''}

        <div style="background:var(--card-bg);border-radius:var(--card-radius);
          box-shadow:var(--card-shadow);border:1px solid var(--card-border);overflow:hidden;">

          <div style="padding:14px 20px;border-bottom:1px solid var(--card-border);
            display:flex;align-items:center;justify-content:space-between;
            background:var(--bg-secondary,#f8f6f1);">
            <span style="font-size:13px;font-weight:700;color:var(--text-primary);">
              ${lista.length} lançamento${lista.length !== 1 ? 's' : ''}
            </span>
            <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addPagamento()">+ Lançar Pagamento</button>
          </div>

          ${lista.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:var(--bg-secondary,#f8f6f1);">
                ${['Vencimento','Pagamento','Valor','Status','Obs',''].map((h,i) => `
                  <th style="padding:10px ${i===5?'16px':'14px'};
                    text-align:${i===2?'right':i===5?'right':'left'};
                    font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
                    color:var(--text-muted);${i===0?'padding-left:20px;':''}">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${lista.map(p => `
                <tr style="border-top:1px solid var(--card-border);transition:background .12s;"
                  onmouseover="this.style.background='var(--bg-secondary,#f8f6f1)'"
                  onmouseout="this.style.background='transparent'">

                  <td style="padding:13px 14px 13px 20px;color:var(--text-secondary);font-size:12px;white-space:nowrap;">
                    ${new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
                  </td>

                  <td style="padding:13px 14px;color:var(--text-secondary);font-size:12px;white-space:nowrap;">
                    ${p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '—'}
                  </td>

                  <td style="padding:13px 14px;text-align:right;font-weight:700;
                    color:var(--text-primary);white-space:nowrap;">
                    ${fmt(p.valor)}
                  </td>

                  <td style="padding:13px 14px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;
                        background:${STATUS_DOT[p.status]||'#94a3b8'};
                        box-shadow:0 0 0 3px ${STATUS_DOT[p.status]||'#94a3b8'}28;"></span>
                      <span style="font-size:12px;color:var(--text-secondary);font-weight:500;">
                        ${STATUS_TXT[p.status]||p.status||'—'}</span>
                    </div>
                  </td>

                  <td style="padding:13px 14px;color:var(--text-muted);font-size:12px;
                    max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${this._esc(p.observacoes||'—')}
                  </td>

                  <td style="padding:13px 16px;text-align:right;">
                    ${btnAcao(`SuperAdmin._delPagamento('${p.id}')`, 'Remover', '🗑️', '#fca5a5')}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>` : `
          <div style="text-align:center;padding:64px 40px;">
            <div style="width:56px;height:56px;border-radius:16px;background:#fef3c7;
              display:flex;align-items:center;justify-content:center;font-size:26px;
              margin:0 auto 14px;">💰</div>
            <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">
              Sem pagamentos</div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">
              Registre os pagamentos desta base para acompanhar o financeiro.</div>
            <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addPagamento()">+ Lançar Pagamento</button>
          </div>`}
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Formulário Tenant (novo / editar)                                   */
  /* ------------------------------------------------------------------ */

  _tenantEditId: null,

  _novoTenant(id = null) {
    this._tab = 'novo';
    this._tenantEditId = id;
    this._renderPanel();
    if (id) setTimeout(() => this._preencherForm(id), 0);
  },

  async _preencherForm(id) {
    let t;
    try { t = await window.PocketBaseClient.collection('tenants').getOne(id, { requestKey: null }); } catch { return; }
    if (!t) return;
    const s = (n, v) => { const el = document.getElementById(`sa-${n}`); if (el) el.value = v || ''; };
    s('nome', t.nome); s('slug', t.slug); s('tipo', t.tipo || 'arena'); s('status', t.status); s('plano', t.plano);
    s('endereco', t.endereco); s('bairro', t.bairro); s('cidade', t.cidade);
    s('estado', t.estado); s('cep', t.cep); s('area', t.area_total_m2);
    s('canal', t.canal_aquisicao); s('obs', t.observacoes_internas);
    s('resp-cob', t.responsavel_cobranca);
    if (t.contrato_inicio)   s('c-inicio',   t.contrato_inicio);
    if (t.contrato_vigencia) s('c-vigencia', t.contrato_vigencia);
    if (t.data_onboarding)   s('c-onboard',  t.data_onboarding);
  },

  _renderForm() {
    const isEdit = !!this._tenantEditId;
    const sec = (icon, title, content) => `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);
        margin-bottom:14px;box-shadow:var(--card-shadow);border:1px solid var(--card-border);overflow:hidden;">
        <div style="padding:14px 20px;border-bottom:1px solid var(--card-border);
          display:flex;align-items:center;gap:8px;background:var(--bg-secondary,#f8f6f1);">
          <span style="font-size:15px;">${icon}</span>
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);">${title}</span>
        </div>
        <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">${content}</div>
      </div>`;

    return `
      <div style="max-width:720px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <button onclick="SuperAdmin._tab='lista';SuperAdmin._renderPanel()"
            style="width:34px;height:34px;border-radius:9px;border:1px solid var(--card-border);
              background:var(--card-bg);cursor:pointer;font-size:16px;transition:.15s;flex-shrink:0;
              display:flex;align-items:center;justify-content:center;color:var(--text-muted);"
            onmouseover="this.style.background='var(--gray-light)'"
            onmouseout="this.style.background='var(--card-bg)'">←</button>
          <div>
            <h1 style="margin:0;font-size:20px;font-weight:800;color:var(--text-primary);letter-spacing:-.3px;">
              ${isEdit ? 'Editar Base' : 'Nova Base'}</h1>
            <p style="margin:3px 0 0;font-size:12px;color:var(--text-muted);">
              ${isEdit ? 'Atualize os dados cadastrais da base' : 'Preencha os dados para cadastrar uma nova base cliente'}</p>
          </div>
        </div>

        ${sec('🏢', 'Dados Básicos', `
          ${this._campo('Nome da Base *', 'sa-nome', 'text', 'ex: Rede Pickle SP')}
          ${this._campo('Slug (URL) *', 'sa-slug', 'text', 'ex: rede-pickle-sp')}
          <div>
            <label class="form-label" style="margin-bottom:5px;">Tipo</label>
            <select id="sa-tipo" class="form-input" style="cursor:pointer;">
              <option value="arena">Base</option>
              <option value="matriz">Matriz / Rede</option>
            </select>
          </div>
          ${this._select('Status', 'sa-status', ['ativa','inativa','suspensa'])}
          ${this._select('Plano', 'sa-plano', ['basico','pro','premium'])}
          ${this._campo('Área total (m²)', 'sa-area', 'number', '0')}
        `)}

        ${sec('📍', 'Endereço', `
          <div style="grid-column:1/-1;">${this._campo('Endereço', 'sa-endereco', 'text', 'Rua, número')}</div>
          ${this._campo('Bairro', 'sa-bairro', 'text', '')}
          ${this._campo('Cidade', 'sa-cidade', 'text', '')}
          ${this._campo('Estado', 'sa-estado', 'text', 'SP')}
          ${this._campo('CEP', 'sa-cep', 'text', '00000-000')}
        `)}

        ${sec('📄', 'Contrato', `
          ${this._campo('Início do contrato', 'sa-c-inicio', 'date', '')}
          ${this._campo('Vigência', 'sa-c-vigencia', 'date', '')}
          ${this._campo('Canal de aquisição', 'sa-canal', 'text', 'ex: indicação, Google Ads…')}
          ${this._campo('Data de onboarding', 'sa-c-onboard', 'date', '')}
          <div>
            <label class="form-label" style="margin-bottom:5px;">Responsável cobrança</label>
            <select id="sa-resp-cob" class="form-input" style="cursor:pointer;">
              <option value="arena">Base</option>
              <option value="grupo">Grupo / Rede</option>
            </select>
          </div>
          <div style="grid-column:1/-1;">
            <label class="form-label" style="margin-bottom:5px;">Observações internas</label>
            <textarea id="sa-obs" rows="3" class="form-input"
              style="resize:vertical;" placeholder="Notas sobre o contrato, histórico, etc."></textarea>
          </div>
        `)}

        <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px;">
          <button class="btn btn-secondary"
            onclick="SuperAdmin._tab='lista';SuperAdmin._renderPanel()">Cancelar</button>
          <button class="btn btn-primary" onclick="SuperAdmin._salvarTenant()">
            ${isEdit ? '💾 Salvar alterações' : '✅ Cadastrar Base'}
          </button>
        </div>
      </div>`;
  },

  async _salvarTenant() {
    const g = n => document.getElementById(`sa-${n}`)?.value.trim() || '';
    const nome = g('nome'), slug = g('slug');
    if (!nome || !slug) { alert('Nome e slug são obrigatórios.'); return; }

    const record = {
      nome, slug, tipo: g('tipo') || 'arena', status: g('status') || 'ativa', plano: g('plano') || 'basico',
      endereco: g('endereco'), bairro: g('bairro'), cidade: g('cidade'),
      estado: g('estado'), cep: g('cep'),
      area_total_m2: parseFloat(document.getElementById('sa-area')?.value) || null,
      contrato_inicio: g('c-inicio') || null, contrato_vigencia: g('c-vigencia') || null,
      canal_aquisicao: g('canal'), data_onboarding: g('c-onboard') || null,
      responsavel_cobranca: g('resp-cob') || 'arena',
      observacoes_internas: document.getElementById('sa-obs')?.value.trim() || '',
    };

    let error = null;
    try {
      if (this._tenantEditId) {
        await window.PocketBaseClient.collection('tenants').update(this._tenantEditId, record);
      } else {
        await window.PocketBaseClient.collection('tenants').create(record);
      }
    } catch (e) { error = e; }

    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    this._tab = 'lista';
    this._tenantEditId = null;
    this._renderPanel();
  },

  /* ------------------------------------------------------------------ */
  /*  Aba Usuários                                                        */
  /* ------------------------------------------------------------------ */

  _tabUsuarios(rows) {
    const usuarios = rows.map(r => ({ id: r.id, ...r.data }))
      .sort((a,b) => (a.login||'').localeCompare(b.login||''));

    const btnAcao = (onclick, title, icon, hover) =>
      `<button onclick="${onclick}" title="${title}"
        style="width:30px;height:30px;border-radius:7px;border:1px solid var(--card-border);
          background:var(--card-bg);cursor:pointer;font-size:13px;transition:.15s;
          display:inline-flex;align-items:center;justify-content:center;"
        onmouseover="this.style.background='${hover}';this.style.borderColor='${hover}'"
        onmouseout="this.style.background='var(--card-bg)';this.style.borderColor='var(--card-border)'">${icon}</button>`;
    const PERFIL_BG   = { admin:'#fef3c7', professor:'#dbeafe', aluno:'#d1fae5' };
    const PERFIL_CLR  = { admin:'#92400e', professor:'#1e40af', aluno:'#065f46' };
    const PERFIL_ICON = { admin:'👑', professor:'🎯', aluno:'🏓' };
    const iniciais = u => ((u.nome||u.login||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase());

    return `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);overflow:hidden;">

        <div style="padding:14px 20px;border-bottom:1px solid var(--card-border);
          display:flex;align-items:center;justify-content:space-between;
          background:var(--bg-secondary,#f8f6f1);">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);">
            ${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} cadastrado${usuarios.length !== 1 ? 's' : ''}
          </span>
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._criarUsuarioAdmin()">+ Criar usuário</button>
        </div>

        ${usuarios.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--bg-secondary,#f8f6f1);">
              ${['Usuário','E-mail','Perfil','Status',''].map((h,i) => `
                <th style="padding:10px ${i===4?'16px':'14px'};text-align:${i===4?'right':'left'};
                  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
                  color:var(--text-muted);${i===0?'padding-left:20px;':''}">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${usuarios.map(u => `
              <tr style="border-top:1px solid var(--card-border);transition:background .12s;"
                onmouseover="this.style.background='var(--bg-secondary,#f8f6f1)'"
                onmouseout="this.style.background='transparent'">

                <td style="padding:13px 14px 13px 20px;">
                  <div style="display:flex;align-items:center;gap:9px;">
                    <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;
                      background:${PERFIL_BG[u.perfil]||'var(--gray-light)'};
                      display:flex;align-items:center;justify-content:center;
                      font-size:12px;font-weight:700;letter-spacing:-.5px;
                      color:${PERFIL_CLR[u.perfil]||'var(--text-muted)'};">
                      ${iniciais(u)}</div>
                    <div>
                      <div style="font-weight:700;color:var(--text-primary);font-size:13px;">${this._esc(u.nome||'—')}</div>
                      <div style="font-size:11px;font-family:monospace;color:var(--text-muted);margin-top:1px;">${this._esc(u.login||'')}</div>
                    </div>
                  </div>
                </td>

                <td style="padding:13px 14px;font-size:12px;color:var(--text-secondary);">
                  ${this._esc(u.email||'—')}
                </td>

                <td style="padding:13px 14px;">
                  <span style="background:${PERFIL_BG[u.perfil]||'var(--gray-light)'};
                    color:${PERFIL_CLR[u.perfil]||'var(--text-muted)'};
                    padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;">
                    ${PERFIL_ICON[u.perfil]||''} ${u.perfil||'—'}</span>
                </td>

                <td style="padding:13px 14px;">
                  <div style="display:flex;align-items:center;gap:5px;">
                    <span style="width:6px;height:6px;border-radius:50%;
                      background:${u.status==='ativo'?'#22c55e':'#94a3b8'};flex-shrink:0;"></span>
                    <span style="font-size:12px;color:var(--text-secondary);font-weight:500;">
                      ${u.status==='ativo'?'Ativo':'Inativo'}</span>
                  </div>
                </td>

                <td style="padding:13px 16px;text-align:right;">
                  ${btnAcao(
                    `SuperAdmin._resetSenhaUsuario('${u.id}','${this._esc(u.login||'')}','${this._esc(u.nome||'')}')`,
                    'Redefinir senha', '🔑', '#fef3c7')}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>` : `
        <div style="text-align:center;padding:64px 40px;">
          <div style="width:56px;height:56px;border-radius:16px;background:#fef3c7;
            display:flex;align-items:center;justify-content:center;font-size:26px;
            margin:0 auto 14px;">🔑</div>
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">
            Nenhum usuário</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">
            Crie um usuário administrador para acessar esta base.</div>
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._criarUsuarioAdmin()">+ Criar usuário admin</button>
        </div>`}
      </div>`;
  },

  _resetSenhaUsuario(id, login, nome) {
    this._modal(`🔑 Redefinir senha — ${login}`, `
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
        Usuário: <strong>${this._esc(nome)}</strong> (${this._esc(login)})
      </p>
      <div style="display:grid;gap:12px;">
        ${this._campo('Nova senha *', 'rs-senha', 'password', 'mínimo 4 caracteres')}
        ${this._campo('Confirmar senha *', 'rs-confirma', 'password', '')}
      </div>`,
      async () => {
        const s1 = document.getElementById('rs-senha')?.value || '';
        const s2 = document.getElementById('rs-confirma')?.value || '';
        if (s1.length < 4) { alert('Senha muito curta (mínimo 4 caracteres).'); return false; }
        if (s1 !== s2)      { alert('As senhas não coincidem.'); return false; }

        try {
          const row = await window.PocketBaseClient.collection('app_usuarios').getOne(id, { requestKey: null });
          const dadosAtualizados = { ...(row.data || {}), senha: btoa(s1) };
          await window.PocketBaseClient.collection('app_usuarios').update(id, { data: dadosAtualizados });
        } catch (e) { alert('Erro ao salvar: ' + e.message); return false; }

        alert(`✅ Senha de "${login}" redefinida!\nNova senha: ${s1}`);
        return true;
      }
    );
  },

  async _criarUsuarioAdmin() {
    const t = this._tenant;
    if (!t) return;
    this._modal('+ Criar usuário admin', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${this._campo('Nome *', 'nu-nome', 'text', 'ex: Administrador')}
        ${this._campo('Login *', 'nu-login', 'text', 'ex: admin')}
        ${this._campo('E-mail', 'nu-email', 'email', 'ex: admin@arena.com')}
        ${this._campo('Perfil', 'nu-perfil', 'text', 'admin')}
        ${this._campo('Senha *', 'nu-senha', 'password', 'mínimo 4 caracteres')}
        ${this._campo('Confirmar senha *', 'nu-confirma', 'password', '')}
      </div>`,
      async () => {
        const nome   = document.getElementById('nu-nome')?.value.trim()   || '';
        const login  = document.getElementById('nu-login')?.value.trim()  || '';
        const email  = document.getElementById('nu-email')?.value.trim()  || '';
        const perfil = document.getElementById('nu-perfil')?.value.trim() || 'admin';
        const senha  = document.getElementById('nu-senha')?.value         || '';
        const conf   = document.getElementById('nu-confirma')?.value      || '';
        if (!nome || !login)  { alert('Nome e login são obrigatórios.'); return false; }
        if (senha.length < 4) { alert('Senha muito curta.'); return false; }
        if (senha !== conf)   { alert('As senhas não coincidem.'); return false; }
        const hash = btoa(senha);
        const id   = Date.now().toString(36) + Math.random().toString(36).slice(2,7);
        try {
          await window.PocketBaseClient.collection('app_usuarios').create({
            id, tenant_id: this._dataId(t),
            data: { nome, login, email, senha: hash, perfil, status: 'ativo' },
          });
        } catch (e) { alert('Erro: ' + e.message); return false; }
        alert(`✅ Usuário "${login}" criado!\nSenha: ${senha}`);
        return true;
      }
    );
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD Responsáveis                                                   */
  /* ------------------------------------------------------------------ */

  _addResponsavel() {
    const html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        ${this._campo('Nome *', 'resp-nome', 'text', '')}
        ${this._campo('Cargo', 'resp-cargo', 'text', '')}
        ${this._campo('Telefone', 'resp-tel', 'text', '')}
        ${this._campo('E-mail', 'resp-email', 'email', '')}
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">
        <input type="checkbox" id="resp-principal" /> Responsável principal
      </label>`;
    this._modal('Novo Responsável', html, async () => {
      alert('Gestão de responsáveis não disponível nesta versão.');
      return false;
    });
  },

  _delResponsavel(id) {
    alert('Gestão de responsáveis não disponível nesta versão.');
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD Quadras                                                        */
  /* ------------------------------------------------------------------ */

  _addQuadra() {
    const html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${this._campo('Nome *', 'q-nome', 'text', 'ex: Quadra 1')}
        ${this._campo('Dimensões', 'q-dim', 'text', 'ex: 10m x 20m')}
        ${this._select('Cobertura', 'q-cob', ['coberta','descoberta','semi-coberta'])}
        ${this._select('Tipo de Piso', 'q-piso', ['saibro','cimento','madeira','emborrachado','outro'])}
        ${this._select('Status', 'q-status', ['ativa','inativa','manutencao'])}
      </div>`;
    this._modal('Nova Quadra', html, async () => {
      const g = n => document.getElementById(`q-${n}`)?.value.trim() || '';
      const nome = g('nome');
      if (!nome) { alert('Nome obrigatório.'); return false; }
      try {
        await window.PocketBaseClient.collection('app_quadras').create({
          tenant_id: this._dataId(this._tenant),
          data: { nome, dimensoes: g('dim'), cobertura: g('cob'), status: 'ativa' },
        });
      } catch (e) { alert('Erro: ' + e.message); return false; }
      return true;
    });
  },

  async _delQuadra(id) {
    if (!confirm('Remover esta quadra?')) return;
    await window.PocketBaseClient.collection('app_quadras').delete(id).catch(() => {});
    this._detailTab = 'quadras';
    this._renderPanel();
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD Pagamentos                                                     */
  /* ------------------------------------------------------------------ */

  _addPagamento() {
    const html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${this._campo('Vencimento *', 'pag-venc', 'date', '')}
        ${this._campo('Data pagamento', 'pag-pgto', 'date', '')}
        ${this._campo('Valor (R$) *', 'pag-valor', 'number', '0')}
        ${this._select('Status', 'pag-status', ['pendente','pago','atrasado','cancelado'])}
      </div>
      <div style="margin-top:12px;">${this._campo('Observações', 'pag-obs', 'text', '')}</div>`;
    this._modal('Lançar Pagamento', html, async () => {
      alert('Gestão de pagamentos não disponível nesta versão.'); return false;
    });
  },

  _delPagamento(id) {
    alert('Gestão de pagamentos não disponível nesta versão.');
  },

  async _deletarTenant(id, nome) {
    if (!confirm(`Excluir a base "${nome}"? Esta ação não pode ser desfeita.`)) return;
    await window.PocketBaseClient.collection('tenants').delete(id).catch(() => {});
    this._tab = 'lista';
    this._renderPanel();
  },

  /* ------------------------------------------------------------------ */
  /*  Modal helper                                                        */
  /* ------------------------------------------------------------------ */

  _modal(titulo, html, onConfirm) {
    let el = document.getElementById('sa-modal');
    if (!el) { el = document.createElement('div'); el.id = 'sa-modal'; document.body.appendChild(el); }
    el.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;
        display:flex;align-items:center;justify-content:center;padding:16px;">
        <div style="background:var(--card-bg);border-radius:var(--radius-lg);padding:28px;
          width:100%;max-width:520px;max-height:90vh;overflow-y:auto;
          box-shadow:0 20px 60px rgba(0,0,0,.25);border:1px solid var(--card-border);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="margin:0;font-size:17px;font-weight:800;color:var(--text-primary);">${titulo}</h2>
            <button onclick="document.getElementById('sa-modal').innerHTML=''"
              class="btn btn-icon" style="color:var(--text-muted);">✕</button>
          </div>
          ${html}
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
            <button class="btn btn-secondary" onclick="document.getElementById('sa-modal').innerHTML=''">Cancelar</button>
            <button class="btn btn-primary" id="sa-modal-confirm">Confirmar</button>
          </div>
        </div>
      </div>`;
    document.getElementById('sa-modal-confirm').onclick = async () => {
      const ok = await onConfirm();
      if (ok !== false) {
        el.innerHTML = '';
        this._renderPanel();
      }
    };
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers UI                                                          */
  /* ------------------------------------------------------------------ */

  _campo(label, id, tipo, placeholder) {
    return `<div>
      <label class="form-label" style="margin-bottom:5px;">${label}</label>
      <input id="${id}" type="${tipo}" placeholder="${placeholder}" class="form-input" />
    </div>`;
  },

  _select(label, id, opcoes) {
    return `<div>
      <label class="form-label" style="margin-bottom:5px;">${label}</label>
      <select id="${id}" class="form-input" style="cursor:pointer;">
        ${opcoes.map(o=>`<option value="${o}">${o}</option>`).join('')}
      </select>
    </div>`;
  },

  _select2(label, id, opcoes) { return this._select(label, id, opcoes); },

  _linha(label, valor) {
    return `<div style="padding:10px 0;border-bottom:1px solid var(--card-border);">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:3px;">${label}</div>
      <div style="font-size:14px;color:var(--text-primary);">${this._esc(String(valor||'—'))}</div>
    </div>`;
  },

  /**
   * Resolve the UUID-based tenant_id used in data records (app_usuarios, app_quadras, etc.)
   * PocketBase auto-generates 15-char IDs for the `tenants` collection, but data records
   * store the legacy UUID as their tenant_id. We look up the UUID via the tenant's slug
   * in the static TENANTS map (pocketbase-config.js).
   */
  _dataId(t) {
    if (!t) return null;
    if (typeof TENANTS !== 'undefined' && t.slug && TENANTS[t.slug]) {
      return TENANTS[t.slug].id;
    }
    return t.id; // fallback: use PocketBase ID if TENANTS map is unavailable
  },

  _esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};

// Recuperação de senha via link removida — gerenciada pelo painel PocketBase (/_/)
