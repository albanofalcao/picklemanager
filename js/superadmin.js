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

  async init() {
    if (!SupabaseClient) { console.error('Supabase não configurado.'); return; }

    const { data: { session } } = await SupabaseClient.auth.getSession();
    if (session) {
      await this._onLogin(session.user);
    } else {
      this._renderLogin();
    }

    SupabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN')  await this._onLogin(session.user);
      if (event === 'SIGNED_OUT') this._renderLogin();
    });
  },

  async _onLogin(authUser) {
    const { data: usuario } = await SupabaseClient
      .from('usuarios')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();

    if (!usuario || usuario.perfil !== 'superadmin') {
      await SupabaseClient.auth.signOut();
      this._renderLogin('Acesso negado — usuário não é superadmin.');
      return;
    }

    this._user = usuario;
    this._showPanel();
  },

  async login(email, senha) {
    const btn = document.getElementById('sa-login-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando…'; }
    const { error } = await SupabaseClient.auth.signInWithPassword({ email, password: senha });
    if (error) {
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
      this._renderLogin('E-mail ou senha incorretos.');
    }
  },

  async logout() {
    await SupabaseClient.auth.signOut();
    this._user = null;
    this._tenant = null;
    this._renderLogin();
  },

  /* ------------------------------------------------------------------ */
  /*  Login UI                                                            */
  /* ------------------------------------------------------------------ */

  _renderLogin(erro = '') {
    document.getElementById('app-layout')?.style.setProperty('display', 'none');
    document.getElementById('portal-wrap')?.style.setProperty('display', 'none');
    document.getElementById('login-overlay')?.style.setProperty('display', 'none');

    let wrap = document.getElementById('sa-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'sa-wrap';
      document.body.appendChild(wrap);
    }
    wrap.style.display = 'flex';
    wrap.innerHTML = `
      <div style="min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(135deg,var(--sidebar-bg) 0%,var(--sidebar-hover) 100%);">
        <div class="login-box" style="max-width:380px;">
          <div class="login-brand">
            <span class="login-brand-icon"><img src="img/pickleball-paddle.svg" alt="" style="width:40px;height:40px;vertical-align:middle;"></span>
            <div>
              <div class="login-brand-name">PickleManager</div>
              <div class="login-brand-sub">Painel Administrativo</div>
            </div>
          </div>
          <h2 class="login-title" style="font-size:16px;">Área do Administrador</h2>
          ${erro ? `<div style="background:var(--red-light);color:var(--red-text);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;">${erro}</div>` : ''}
          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label" for="sa-email">E-mail</label>
            <input id="sa-email" type="email" class="form-input" placeholder="seu@email.com"
              onkeydown="if(event.key==='Enter') document.getElementById('sa-senha').focus()" />
          </div>
          <div class="form-group" style="margin-bottom:20px;">
            <label class="form-label" for="sa-senha">Senha</label>
            <input id="sa-senha" type="password" class="form-input" placeholder="••••••••"
              onkeydown="if(event.key==='Enter') SuperAdmin.login(document.getElementById('sa-email').value, this.value)" />
          </div>
          <button id="sa-login-btn" class="btn btn-primary" style="width:100%;"
            onclick="SuperAdmin.login(document.getElementById('sa-email').value, document.getElementById('sa-senha').value)">
            Entrar
          </button>
          <div style="text-align:center;margin-top:16px;">
            <button class="btn btn-ghost btn-sm" onclick="SuperAdmin.voltarApp()">← Voltar ao sistema</button>
          </div>
        </div>
      </div>`;
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
    document.getElementById('app-layout')?.style.setProperty('display','none');
    document.getElementById('portal-wrap')?.style.setProperty('display','none');
    document.getElementById('login-overlay')?.style.setProperty('display','none');

    let wrap = document.getElementById('sa-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'sa-wrap'; document.body.appendChild(wrap); }
    wrap.style.display = 'block';
    this._renderPanel();
  },

  _renderPanel() {
    const wrap = document.getElementById('sa-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div style="min-height:100vh;background:var(--page-bg);">

        <!-- Header — mesmo estilo do top-header -->
        <header style="background:var(--sidebar-bg);padding:0 24px;height:var(--header-height,64px);
          display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 2px 8px rgba(0,0,0,.15);">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="img/pickleball-paddle.svg" alt="" style="width:28px;height:28px;">
            <div>
              <div style="color:var(--sidebar-text-active);font-weight:800;font-size:15px;">PickleManager</div>
              <div style="color:var(--sidebar-text);font-size:11px;">Painel Administrativo</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="color:var(--sidebar-text);font-size:13px;">👤 ${this._esc(this._user?.nome || '')}</span>
            <button class="btn btn-sm" onclick="SuperAdmin.logout()"
              style="color:var(--sidebar-text-active);border:1px solid rgba(255,255,255,.25);
              background:rgba(255,255,255,.1);border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer;">
              ⏻ Sair
            </button>
          </div>
        </header>

        <!-- Content -->
        <div style="padding:28px 24px;max-width:1200px;margin:0 auto;" id="sa-content">
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="margin:0;font-size:22px;font-weight:800;color:var(--text-primary);">Arenas Cadastradas</h1>
          <p style="margin:4px 0 0;color:var(--text-muted);font-size:13px;">Gestão de todos os clientes PickleManager</p>
        </div>
        <button class="btn btn-primary" onclick="SuperAdmin._novoTenant()">+ Nova Arena</button>
      </div>
      <div id="sa-lista-wrap">
        <div style="text-align:center;padding:40px;color:var(--text-muted);">Carregando…</div>
      </div>`;
  },

  async _carregarLista() {
    const { data: tenants, error } = await SupabaseClient
      .from('tenants')
      .select('*, grupos_economicos(nome)')
      .order('nome');

    const wrap = document.getElementById('sa-lista-wrap');
    if (!wrap) return;

    if (error) {
      wrap.innerHTML = `<div style="color:var(--red);padding:16px;">Erro: ${error.message}</div>`;
      return;
    }

    const STATUS_STYLE = {
      ativa:    'background:var(--success-light);color:var(--success-text);',
      inativa:  'background:var(--gray-light);color:var(--gray-text);',
      suspensa: 'background:var(--red-light);color:var(--red-text);',
    };
    const PLANO_STYLE = {
      basico:  'background:#dbeafe;color:#1e40af;',
      pro:     'background:#ede9fe;color:#6d28d9;',
      premium: 'background:var(--amber-light);color:var(--amber-text);',
    };

    wrap.innerHTML = tenants.length ? `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);overflow:hidden;
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:var(--gray-light);border-bottom:2px solid var(--card-border);">
              <th style="padding:14px 18px;text-align:left;font-weight:700;color:var(--text-primary);">Arena</th>
              <th style="padding:14px 18px;text-align:left;font-weight:700;color:var(--text-primary);">Cidade</th>
              <th style="padding:14px 18px;text-align:left;font-weight:700;color:var(--text-primary);">Plano</th>
              <th style="padding:14px 18px;text-align:left;font-weight:700;color:var(--text-primary);">Status</th>
              <th style="padding:14px 18px;text-align:left;font-weight:700;color:var(--text-primary);">Início</th>
              <th style="padding:14px 18px;text-align:center;font-weight:700;color:var(--text-primary);">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${tenants.map(t => `
              <tr style="border-bottom:1px solid var(--card-border);transition:background .15s;"
                onmouseover="this.style.background='var(--gray-light)'" onmouseout="this.style.background=''">
                <td style="padding:14px 18px;">
                  <div style="font-weight:700;color:var(--text-primary);">${this._esc(t.nome)}</div>
                  ${t.grupos_economicos ? `<div style="font-size:11px;color:var(--text-muted);">${this._esc(t.grupos_economicos.nome)}</div>` : ''}
                </td>
                <td style="padding:14px 18px;color:var(--text-secondary);">${this._esc(t.cidade||'—')}${t.estado?' / '+this._esc(t.estado):''}</td>
                <td style="padding:14px 18px;">
                  <span style="${PLANO_STYLE[t.plano]||''}padding:3px 10px;border-radius:var(--radius-full);font-size:12px;font-weight:700;text-transform:uppercase;">
                    ${t.plano}
                  </span>
                </td>
                <td style="padding:14px 18px;">
                  <span style="${STATUS_STYLE[t.status]||''}padding:3px 10px;border-radius:var(--radius-full);font-size:12px;font-weight:700;">
                    ${t.status}
                  </span>
                </td>
                <td style="padding:14px 18px;color:var(--text-secondary);font-size:13px;">
                  ${t.contrato_inicio ? new Date(t.contrato_inicio).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td style="padding:14px 18px;text-align:center;">
                  <button onclick="SuperAdmin._abrirDetalhe('${t.id}')" class="btn btn-primary btn-sm" style="margin-right:6px;">
                    📂 Detalhe
                  </button>
                  <button onclick="SuperAdmin._deletarTenant('${t.id}','${this._esc(t.nome)}')"
                    class="btn btn-sm" style="background:var(--red-light);color:var(--red-text);border:none;">
                    🗑️
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`
    : `<div style="background:var(--card-bg);border-radius:var(--card-radius);padding:60px;text-align:center;
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
        <div style="font-size:40px;margin-bottom:12px;">🏟️</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;color:var(--text-primary);">Nenhuma arena cadastrada</div>
        <div style="margin-bottom:20px;color:var(--text-muted);">Cadastre a primeira arena cliente.</div>
        <button class="btn btn-primary" onclick="SuperAdmin._novoTenant()">+ Cadastrar Arena</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Detalhe do Tenant — abas                                            */
  /* ------------------------------------------------------------------ */

  _detailTab: 'dados',

  async _abrirDetalhe(id) {
    const { data } = await SupabaseClient.from('tenants').select('*, grupos_economicos(id,nome)').eq('id', id).single();
    this._tenant = data;
    this._tab = 'detalhe';
    this._detailTab = 'dados';
    this._renderPanel();
  },

  _renderDetalhe() {
    const t = this._tenant;
    if (!t) return '';

    setTimeout(() => this._carregarSubdados(), 0);

    const tab = this._detailTab;
    const STATUS_STYLE = {
      ativa: 'color:var(--success);', inativa: 'color:var(--gray-text);', suspensa: 'color:var(--red);'
    };
    const ABAS = {
      dados: '📋 Dados', responsaveis: '👤 Responsáveis', quadras: '🏟️ Quadras',
      contrato: '📄 Contrato', financeiro: '💰 Financeiro'
    };

    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="SuperAdmin._tab='lista';SuperAdmin._renderPanel()">← Voltar</button>
        <div>
          <h1 style="margin:0;font-size:20px;font-weight:800;color:var(--text-primary);">${this._esc(t.nome)}</h1>
          <p style="margin:2px 0 0;font-size:13px;color:var(--text-muted);">
            <span style="${STATUS_STYLE[t.status]||''}font-weight:700;">${t.status}</span>
            &nbsp;·&nbsp;${t.cidade||'—'}
            &nbsp;·&nbsp;Plano <strong>${t.plano}</strong>
          </p>
        </div>
      </div>

      <!-- Abas -->
      <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;border-bottom:2px solid var(--card-border);padding-bottom:0;">
        ${Object.entries(ABAS).map(([a, label]) => `
          <button onclick="SuperAdmin._detailTab='${a}';SuperAdmin._renderPanel()"
            style="padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;border:none;
              background:transparent;border-bottom:3px solid ${tab===a?'var(--primary)':'transparent'};
              color:${tab===a?'var(--primary)':'var(--text-muted)'};margin-bottom:-2px;transition:var(--transition);">
            ${label}
          </button>`).join('')}
      </div>

      <div id="sa-detail-content">
        <div style="text-align:center;padding:40px;color:var(--text-muted);">Carregando…</div>
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
      const {data} = await SupabaseClient.from('tenant_responsaveis').select('*').eq('tenant_id',t.id).order('principal',{ascending:false});
      el.innerHTML = this._tabResponsaveis(data||[]);
    }
    if (tab === 'quadras') {
      const {data} = await SupabaseClient.from('quadras').select('*').eq('tenant_id',t.id).order('nome');
      el.innerHTML = this._tabQuadras(data||[]);
    }
    if (tab === 'financeiro') {
      const {data} = await SupabaseClient.from('tenant_pagamentos').select('*').eq('tenant_id',t.id).order('data_vencimento',{ascending:false});
      el.innerHTML = this._tabFinanceiro(data||[]);
    }
  },

  _tabDados(t) {
    return `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:24px;max-width:700px;
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._novoTenant('${t.id}')">✏️ Editar dados</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          ${this._linha('Nome',            t.nome)}
          ${this._linha('Slug/URL',        t.slug)}
          ${this._linha('Status',          t.status)}
          ${this._linha('Plano',           t.plano)}
          ${this._linha('Endereço',        t.endereco)}
          ${this._linha('Bairro',          t.bairro)}
          ${this._linha('Cidade',          t.cidade)}
          ${this._linha('Estado',          t.estado)}
          ${this._linha('CEP',             t.cep)}
          ${this._linha('Área total',      t.area_total_m2 ? t.area_total_m2 + ' m²' : '—')}
          ${this._linha('Grupo Econômico', t.grupos_economicos?.nome || '—')}
        </div>
      </div>`;
  },

  _tabContrato(t) {
    return `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:24px;max-width:700px;
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._novoTenant('${t.id}')">✏️ Editar</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          ${this._linha('Início',           t.contrato_inicio   ? new Date(t.contrato_inicio).toLocaleDateString('pt-BR')   : '—')}
          ${this._linha('Vigência',         t.contrato_vigencia ? new Date(t.contrato_vigencia).toLocaleDateString('pt-BR') : '—')}
          ${this._linha('Canal aquisição',  t.canal_aquisicao)}
          ${this._linha('Onboarding',       t.data_onboarding   ? new Date(t.data_onboarding).toLocaleDateString('pt-BR')   : '—')}
          ${this._linha('Resp. cobrança',   t.responsavel_cobranca)}
        </div>
        ${t.observacoes_internas ? `
          <div style="margin-top:16px;padding:14px;background:var(--gray-light);border-radius:var(--radius-md);font-size:13px;color:var(--text-secondary);">
            <strong>Observações:</strong><br>${this._esc(t.observacoes_internas)}
          </div>` : ''}
      </div>`;
  },

  _tabResponsaveis(lista) {
    return `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:24px;
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addResponsavel()">+ Responsável</button>
        </div>
        ${lista.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:var(--gray-light);border-bottom:2px solid var(--card-border);">
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Nome</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Cargo</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Telefone</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">E-mail</th>
                <th style="padding:10px 14px;text-align:center;color:var(--text-primary);">Principal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${lista.map(r => `
                <tr style="border-bottom:1px solid var(--card-border);">
                  <td style="padding:10px 14px;font-weight:600;color:var(--text-primary);">${this._esc(r.nome)}</td>
                  <td style="padding:10px 14px;color:var(--text-muted);">${this._esc(r.cargo||'—')}</td>
                  <td style="padding:10px 14px;color:var(--text-secondary);">${this._esc(r.telefone||'—')}</td>
                  <td style="padding:10px 14px;color:var(--text-secondary);">${this._esc(r.email||'—')}</td>
                  <td style="padding:10px 14px;text-align:center;">${r.principal?'⭐':'—'}</td>
                  <td style="padding:10px 14px;">
                    <button onclick="SuperAdmin._delResponsavel('${r.id}')"
                      class="btn btn-sm" style="background:var(--red-light);color:var(--red-text);border:none;">🗑️</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : `<div style="text-align:center;padding:32px;color:var(--text-muted);">Nenhum responsável cadastrado</div>`}
      </div>`;
  },

  _tabQuadras(lista) {
    return `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:24px;
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addQuadra()">+ Quadra</button>
        </div>
        ${lista.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:var(--gray-light);border-bottom:2px solid var(--card-border);">
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Nome</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Dimensões</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Cobertura</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Piso</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${lista.map(q => `
                <tr style="border-bottom:1px solid var(--card-border);">
                  <td style="padding:10px 14px;font-weight:600;color:var(--text-primary);">${this._esc(q.nome)}</td>
                  <td style="padding:10px 14px;color:var(--text-muted);">${this._esc(q.dimensoes||'—')}</td>
                  <td style="padding:10px 14px;color:var(--text-secondary);">${this._esc(q.cobertura||'—')}</td>
                  <td style="padding:10px 14px;color:var(--text-secondary);">${this._esc(q.tipo_piso||'—')}</td>
                  <td style="padding:10px 14px;">
                    <span style="background:${q.status==='ativa'?'var(--success-light)':'var(--red-light)'};
                      color:${q.status==='ativa'?'var(--success-text)':'var(--red-text)'};
                      padding:2px 10px;border-radius:var(--radius-full);font-size:12px;font-weight:700;">${q.status}</span>
                  </td>
                  <td style="padding:10px 14px;">
                    <button onclick="SuperAdmin._delQuadra('${q.id}')"
                      class="btn btn-sm" style="background:var(--red-light);color:var(--red-text);border:none;">🗑️</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : `<div style="text-align:center;padding:32px;color:var(--text-muted);">Nenhuma quadra cadastrada</div>`}
      </div>`;
  },

  _tabFinanceiro(lista) {
    const fmt = v => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const STATUS_STYLE = {
      pago:      'background:var(--success-light);color:var(--success-text);',
      pendente:  'background:var(--amber-light);color:var(--amber-text);',
      atrasado:  'background:var(--red-light);color:var(--red-text);',
      cancelado: 'background:var(--gray-light);color:var(--gray-text);',
    };
    return `
      <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:24px;
        box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
          <button class="btn btn-primary btn-sm" onclick="SuperAdmin._addPagamento()">+ Lançar Pagamento</button>
        </div>
        ${lista.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:var(--gray-light);border-bottom:2px solid var(--card-border);">
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Vencimento</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Pagamento</th>
                <th style="padding:10px 14px;text-align:right;color:var(--text-primary);">Valor</th>
                <th style="padding:10px 14px;text-align:center;color:var(--text-primary);">Status</th>
                <th style="padding:10px 14px;text-align:left;color:var(--text-primary);">Obs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${lista.map(p => `
                <tr style="border-bottom:1px solid var(--card-border);">
                  <td style="padding:10px 14px;color:var(--text-secondary);">${new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</td>
                  <td style="padding:10px 14px;color:var(--text-secondary);">${p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '—'}</td>
                  <td style="padding:10px 14px;text-align:right;font-weight:700;color:var(--text-primary);">${fmt(p.valor)}</td>
                  <td style="padding:10px 14px;text-align:center;">
                    <span style="${STATUS_STYLE[p.status]||''}padding:2px 10px;border-radius:var(--radius-full);font-size:12px;font-weight:700;">${p.status}</span>
                  </td>
                  <td style="padding:10px 14px;color:var(--text-muted);font-size:12px;">${this._esc(p.observacoes||'')}</td>
                  <td style="padding:10px 14px;">
                    <button onclick="SuperAdmin._delPagamento('${p.id}')"
                      class="btn btn-sm" style="background:var(--red-light);color:var(--red-text);border:none;">🗑️</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : `<div style="text-align:center;padding:32px;color:var(--text-muted);">Nenhum pagamento registrado</div>`}
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
    const { data: t } = await SupabaseClient.from('tenants').select('*').eq('id', id).single();
    if (!t) return;
    const s = (n, v) => { const el = document.getElementById(`sa-${n}`); if (el) el.value = v || ''; };
    s('nome', t.nome); s('slug', t.slug); s('status', t.status); s('plano', t.plano);
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
    return `
      <div style="max-width:700px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <button class="btn btn-secondary btn-sm" onclick="SuperAdmin._tab='lista';SuperAdmin._renderPanel()">← Voltar</button>
          <h1 style="margin:0;font-size:20px;font-weight:800;color:var(--text-primary);">
            ${isEdit ? 'Editar Arena' : 'Nova Arena'}
          </h1>
        </div>

        <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:24px;margin-bottom:16px;
          box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
          <h3 style="margin:0 0 16px;font-size:14px;font-weight:700;color:var(--text-primary);
            border-bottom:1px solid var(--card-border);padding-bottom:10px;">Dados Básicos</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${this._campo('Nome da Arena *', 'sa-nome', 'text', 'ex: Arena Pickle Centro')}
            ${this._campo('Slug (URL) *', 'sa-slug', 'text', 'ex: arena-pickle-centro')}
            ${this._select('Status', 'sa-status', ['ativa','inativa','suspensa'])}
            ${this._select('Plano', 'sa-plano', ['basico','pro','premium'])}
            ${this._campo('Área total (m²)', 'sa-area', 'number', '0')}
          </div>
        </div>

        <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:24px;margin-bottom:16px;
          box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
          <h3 style="margin:0 0 16px;font-size:14px;font-weight:700;color:var(--text-primary);
            border-bottom:1px solid var(--card-border);padding-bottom:10px;">Endereço</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${this._campo('Endereço', 'sa-endereco', 'text', 'Rua, número')}
            ${this._campo('Bairro', 'sa-bairro', 'text', '')}
            ${this._campo('Cidade', 'sa-cidade', 'text', '')}
            ${this._campo('Estado', 'sa-estado', 'text', 'SP')}
            ${this._campo('CEP', 'sa-cep', 'text', '00000-000')}
          </div>
        </div>

        <div style="background:var(--card-bg);border-radius:var(--card-radius);padding:24px;margin-bottom:16px;
          box-shadow:var(--card-shadow);border:1px solid var(--card-border);">
          <h3 style="margin:0 0 16px;font-size:14px;font-weight:700;color:var(--text-primary);
            border-bottom:1px solid var(--card-border);padding-bottom:10px;">Contrato</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${this._campo('Início do contrato', 'sa-c-inicio', 'date', '')}
            ${this._campo('Vigência', 'sa-c-vigencia', 'date', '')}
            ${this._campo('Canal de aquisição', 'sa-canal', 'text', 'ex: indicação, Google Ads…')}
            ${this._campo('Data de onboarding', 'sa-c-onboard', 'date', '')}
            ${this._select('Responsável cobrança', 'sa-resp-cob', ['arena','grupo'])}
          </div>
          <div style="margin-top:14px;">
            <label class="form-label">Observações internas</label>
            <textarea id="sa-obs" rows="3" class="form-input"
              style="resize:vertical;" placeholder="Observações sobre o contrato, cliente, etc."></textarea>
          </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn btn-secondary" onclick="SuperAdmin._tab='lista';SuperAdmin._renderPanel()">Cancelar</button>
          <button class="btn btn-primary" onclick="SuperAdmin._salvarTenant()">
            ${isEdit ? '💾 Salvar alterações' : '✅ Cadastrar Arena'}
          </button>
        </div>
      </div>`;
  },

  async _salvarTenant() {
    const g = n => document.getElementById(`sa-${n}`)?.value.trim() || '';
    const nome = g('nome'), slug = g('slug');
    if (!nome || !slug) { alert('Nome e slug são obrigatórios.'); return; }

    const record = {
      nome, slug, status: g('status') || 'ativa', plano: g('plano') || 'basico',
      endereco: g('endereco'), bairro: g('bairro'), cidade: g('cidade'),
      estado: g('estado'), cep: g('cep'),
      area_total_m2: parseFloat(document.getElementById('sa-area')?.value) || null,
      contrato_inicio: g('c-inicio') || null, contrato_vigencia: g('c-vigencia') || null,
      canal_aquisicao: g('canal'), data_onboarding: g('c-onboard') || null,
      responsavel_cobranca: g('resp-cob') || 'arena',
      observacoes_internas: document.getElementById('sa-obs')?.value.trim() || '',
    };

    let error;
    if (this._tenantEditId) {
      ({ error } = await SupabaseClient.from('tenants').update(record).eq('id', this._tenantEditId));
    } else {
      ({ error } = await SupabaseClient.from('tenants').insert(record));
    }

    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    this._tab = 'lista';
    this._tenantEditId = null;
    this._renderPanel();
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
      const g = n => document.getElementById(`resp-${n}`)?.value.trim() || '';
      const nome = g('nome');
      if (!nome) { alert('Nome obrigatório.'); return false; }
      const { error } = await SupabaseClient.from('tenant_responsaveis').insert({
        tenant_id: this._tenant.id, nome, cargo: g('cargo'),
        telefone: g('tel'), email: g('email'),
        principal: document.getElementById('resp-principal')?.checked || false,
      });
      if (error) { alert('Erro: ' + error.message); return false; }
      return true;
    });
  },

  async _delResponsavel(id) {
    if (!confirm('Remover este responsável?')) return;
    await SupabaseClient.from('tenant_responsaveis').delete().eq('id', id);
    this._detailTab = 'responsaveis';
    this._renderPanel();
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
      const { error } = await SupabaseClient.from('quadras').insert({
        tenant_id: this._tenant.id, nome,
        dimensoes: g('dim'), cobertura: g('cob'),
        tipo_piso: g('piso'), status: g('status') || 'ativa',
      });
      if (error) { alert('Erro: ' + error.message); return false; }
      return true;
    });
  },

  async _delQuadra(id) {
    if (!confirm('Remover esta quadra?')) return;
    await SupabaseClient.from('quadras').delete().eq('id', id);
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
      const g = n => document.getElementById(`pag-${n}`)?.value.trim() || '';
      if (!g('venc') || !g('valor')) { alert('Vencimento e valor são obrigatórios.'); return false; }
      const { error } = await SupabaseClient.from('tenant_pagamentos').insert({
        tenant_id:       this._tenant.id,
        data_vencimento: g('venc'),
        data_pagamento:  g('pgto') || null,
        valor:           parseFloat(g('valor')),
        status:          g('status') || 'pendente',
        observacoes:     g('obs'),
      });
      if (error) { alert('Erro: ' + error.message); return false; }
      return true;
    });
  },

  async _delPagamento(id) {
    if (!confirm('Remover este pagamento?')) return;
    await SupabaseClient.from('tenant_pagamentos').delete().eq('id', id);
    this._detailTab = 'financeiro';
    this._renderPanel();
  },

  async _deletarTenant(id, nome) {
    if (!confirm(`Excluir a arena "${nome}"? Esta ação não pode ser desfeita.`)) return;
    await SupabaseClient.from('tenants').delete().eq('id', id);
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

  _esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};
