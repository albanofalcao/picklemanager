'use strict';

/**
 * DayUseModule — Registro de entradas avulsas (day use) com planos e integração financeira
 */
const DayUseModule = {
  STORAGE_KEY_ENTRADAS: 'dayuse_entradas',
  STORAGE_KEY_PLANOS:   'dayuse_planos',

  STORAGE_KEY_RECORRENTES: 'dayuse_recorrentes',

  _CAL_DIAS:  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  _CAL_MESES: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],

  _calAno:         null,
  _calMes:         null,
  _calDia:         null,
  _calView:        'mes',  // 'dia' | 'semana' | 'mes' | 'agenda'
  _calFilterArena: '',
  _calSubView:     'cal',  // 'cal' | 'recorrentes'

  _state: {
    aba:          'entradas',  // 'entradas' | 'planos' | 'cronograma'
    searchEnt:    '',
    filterData:   '',
    filterPlano:  '',
    filterArena:  '',
    searchPlan:   '',
    filterStatus: '',
  },

  STATUS_PLANO: {
    ativo:   { label: 'Ativo',   badge: 'badge-success' },
    inativo: { label: 'Inativo', badge: 'badge-gray'    },
  },

  FORMA_PAGAMENTO: {
    dinheiro:    'Dinheiro',
    cartao_deb:  'Cartão de Débito',
    cartao_cred: 'Cartão de Crédito',
    pix:         'PIX',
    outro:       'Outro',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAllEntradas() {
    return Storage.getAll(this.STORAGE_KEY_ENTRADAS);
  },

  getAllPlanos() {
    return Storage.getAll(this.STORAGE_KEY_PLANOS);
  },

  getPlanosAtivos() {
    return this.getAllPlanos().filter(p => p.status === 'ativo');
  },

  getFilteredEntradas() {
    const { searchEnt, filterData, filterPlano, filterArena } = this._state;
    return this.getAllEntradas()
      .filter(e => {
        const q = searchEnt.toLowerCase();
        const matchSearch = !q ||
          e.clienteNome.toLowerCase().includes(q) ||
          (e.clienteCpf   && e.clienteCpf.includes(q)) ||
          (e.clienteTel   && e.clienteTel.includes(q)) ||
          (e.clienteEmail && e.clienteEmail.toLowerCase().includes(q));
        const matchData   = !filterData  || e.data === filterData;
        const matchPlano  = !filterPlano || e.planoId === filterPlano;
        const matchArena  = !filterArena || e.arenaId === filterArena;
        return matchSearch && matchData && matchPlano && matchArena;
      })
      .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt));
  },

  getFilteredPlanos() {
    const { searchPlan, filterStatus } = this._state;
    return this.getAllPlanos().filter(p => {
      const q = searchPlan.toLowerCase();
      const matchSearch = !q || p.nome.toLowerCase().includes(q) ||
        (p.descricao && p.descricao.toLowerCase().includes(q));
      const matchStatus = !filterStatus || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  },

  getStatsEntradas() {
    const hoje    = new Date().toISOString().slice(0, 10);
    const todas   = this.getAllEntradas();
    const deHoje  = todas.filter(e => e.data === hoje);
    const totalHoje = deHoje.reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
    const totalGeral = todas.reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
    return {
      totalHoje:    deHoje.length,
      receitaHoje:  totalHoje,
      totalGeral:   todas.length,
      receitaGeral: totalGeral,
    };
  },

  /* ------------------------------------------------------------------ */
  /*  Render principal                                                    */
  /* ------------------------------------------------------------------ */

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;

    this._calInitDate();
    const stats = this.getStatsEntradas();
    const aba   = this._state.aba;
    const svgPlus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

    const btnHeader =
      aba === 'planos'
        ? `<button class="btn btn-primary" onclick="DayUseModule.openModalPlano()">${svgPlus} Novo Plano</button>`
        : `<button class="btn btn-primary" onclick="DayUseModule.openModalEntrada()">${svgPlus} Nova Entrada</button>`;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Day Use</h2>
          <p>Entradas avulsas, grupos recorrentes e planos</p>
        </div>
        ${btnHeader}
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon green">🚪</div>
          <div class="stat-info">
            <div class="stat-value">${stats.totalHoje}</div>
            <div class="stat-label">Entradas Hoje</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">💵</div>
          <div class="stat-info">
            <div class="stat-value">${this._fmt(stats.receitaHoje)}</div>
            <div class="stat-label">Receita Hoje</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">📋</div>
          <div class="stat-info">
            <div class="stat-value">${stats.totalGeral}</div>
            <div class="stat-label">Total de Entradas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gray">💰</div>
          <div class="stat-info">
            <div class="stat-value">${this._fmt(stats.receitaGeral)}</div>
            <div class="stat-label">Receita Total</div>
          </div>
        </div>
      </div>

      <div class="tabs-bar">
        <button class="tab-btn ${aba==='entradas'   ? 'active' : ''}" onclick="DayUseModule._trocarAba('entradas')">🚪 Entradas</button>
        <button class="tab-btn ${aba==='planos'     ? 'active' : ''}" onclick="DayUseModule._trocarAba('planos')">📋 Planos</button>
        <button class="tab-btn ${aba==='cronograma' ? 'active' : ''}" onclick="DayUseModule._trocarAba('cronograma')">📅 Calendário</button>
      </div>

      <div id="dayuse-content">
        ${aba === 'entradas'   ? this._renderEntradas()   : ''}
        ${aba === 'planos'     ? this._renderPlanos()     : ''}
        ${aba === 'cronograma' ? this._renderCronograma() : ''}
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Render Entradas                                                     */
  /* ------------------------------------------------------------------ */

  _renderEntradas() {
    const filtered = this.getFilteredEntradas();
    const planos   = this.getAllPlanos();
    const planoOpts = planos.map(p =>
      `<option value="${p.id}" ${this._state.filterPlano === p.id ? 'selected' : ''}>${UI.escape(p.nome)}</option>`
    ).join('');

    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input"
            placeholder="Buscar por nome, CPF, telefone ou e-mail…"
            value="${UI.escape(this._state.searchEnt)}"
            oninput="DayUseModule._state.searchEnt=this.value; DayUseModule._reRenderEntradas()" />
        </div>
        <input type="date" class="filter-select"
          value="${this._state.filterData}"
          onchange="DayUseModule._state.filterData=this.value; DayUseModule._reRenderEntradas()" />
        <select class="filter-select" onchange="DayUseModule._state.filterPlano=this.value; DayUseModule._reRenderEntradas()">
          <option value="">Todos os planos</option>
          ${planoOpts}
        </select>
        <select class="filter-select" onchange="DayUseModule._state.filterArena=this.value; DayUseModule._reRenderEntradas()">
          <option value="">Todas as arenas</option>
          ${Storage.getAll('arenas').sort((a,b)=>a.nome.localeCompare(b.nome)).map(a =>
            `<option value="${a.id}" ${this._state.filterArena === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
          ).join('')}
        </select>
        <span class="results-count">${filtered.length} entrada${filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div id="dayuse-entradas-list">
        ${filtered.length ? this._renderTabelaEntradas(filtered) : this._renderEmptyEntradas()}
      </div>`;
  },

  _renderTabelaEntradas(entradas) {
    const rows = entradas.map(e => {
      const [ano, mes, dia] = (e.data || '').split('-');
      const dataFmt  = e.data ? `${dia}/${mes}/${ano}` : '—';
      const plano    = Storage.getById(this.STORAGE_KEY_PLANOS, e.planoId);
      const planoNome = plano ? UI.escape(plano.nome) : '—';
      const forma    = ListasService.label('dayuse_forma_pagamento', e.formaPagamento) || '—';

      return `
        <tr>
          <td>
            <div class="aluno-nome">${UI.escape(e.clienteNome)}</div>
            <div class="aluno-sub">${UI.escape(e.clienteEmail || '—')}</div>
          </td>
          <td>${UI.escape(e.clienteCpf || '—')}</td>
          <td>${UI.escape(e.clienteTel || '—')}</td>
          <td>${dataFmt} ${e.hora ? '<span class="text-muted">'+UI.escape(e.hora)+'</span>' : ''}</td>
          <td>${planoNome}</td>
          <td class="fin-val-pos"><strong>${this._fmt(e.valor)}</strong></td>
          <td class="text-muted text-sm">${UI.escape(forma)}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm danger" onclick="DayUseModule.deleteEntrada('${e.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Data / Hora</th>
              <th>Plano</th>
              <th>Valor</th>
              <th>Pagamento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _renderEmptyEntradas() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🚪</div>
        <div class="empty-title">Nenhuma entrada registrada</div>
        <div class="empty-desc">Registre a primeira entrada de day use da academia.</div>
        <button class="btn btn-primary mt-16" onclick="DayUseModule.openModalEntrada()">+ Nova Entrada</button>
      </div>`;
  },

  _reRenderEntradas() {
    const filtered = this.getFilteredEntradas();
    const list = document.getElementById('dayuse-entradas-list');
    if (list) {
      list.innerHTML = filtered.length ? this._renderTabelaEntradas(filtered) : this._renderEmptyEntradas();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) countEl.textContent = `${filtered.length} entrada${filtered.length !== 1 ? 's' : ''}`;
  },

  /* ------------------------------------------------------------------ */
  /*  Render Planos                                                       */
  /* ------------------------------------------------------------------ */

  _renderPlanos() {
    const filtered = this.getFilteredPlanos();

    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input"
            placeholder="Buscar plano…"
            value="${UI.escape(this._state.searchPlan)}"
            oninput="DayUseModule._state.searchPlan=this.value; DayUseModule._reRenderPlanos()" />
        </div>
        <select class="filter-select" onchange="DayUseModule._state.filterStatus=this.value; DayUseModule._reRenderPlanos()">
          <option value="">Todos os status</option>
          <option value="ativo"   ${this._state.filterStatus === 'ativo'   ? 'selected' : ''}>Ativo</option>
          <option value="inativo" ${this._state.filterStatus === 'inativo' ? 'selected' : ''}>Inativo</option>
        </select>
        <span class="results-count">${filtered.length} plano${filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div id="dayuse-planos-list">
        ${filtered.length ? this._renderTabelaPlanos(filtered) : this._renderEmptyPlanos()}
      </div>`;
  },

  _renderTabelaPlanos(planos) {
    const rows = planos.map(p => {
      const st = this.STATUS_PLANO[p.status] || { label: p.status, badge: 'badge-gray' };
      return `
        <tr>
          <td><strong>${UI.escape(p.nome)}</strong></td>
          <td>${UI.escape(p.descricao || '—')}</td>
          <td class="fin-val-pos"><strong>${this._fmt(p.valor)}</strong></td>
          <td><span class="badge ${st.badge}">${st.label}</span></td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="DayUseModule.openModalPlano('${p.id}')" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-sm danger" onclick="DayUseModule.deletePlano('${p.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _renderEmptyPlanos() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Nenhum plano cadastrado</div>
        <div class="empty-desc">Crie planos de day use para facilitar o registro de entradas.</div>
        <button class="btn btn-primary mt-16" onclick="DayUseModule.openModalPlano()">+ Novo Plano</button>
      </div>`;
  },

  _reRenderPlanos() {
    const filtered = this.getFilteredPlanos();
    const list = document.getElementById('dayuse-planos-list');
    if (list) {
      list.innerHTML = filtered.length ? this._renderTabelaPlanos(filtered) : this._renderEmptyPlanos();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) countEl.textContent = `${filtered.length} plano${filtered.length !== 1 ? 's' : ''}`;
  },

  /* ------------------------------------------------------------------ */
  /*  Cronograma — Calendário                                             */
  /* ------------------------------------------------------------------ */

  _calInitDate() {
    if (!this._calAno) {
      const now = new Date();
      this._calAno = now.getFullYear();
      this._calMes = now.getMonth();
      this._calDia = now.getDate();
    }
  },

  _getAllRecorrentes() {
    return Storage.getAll(this.STORAGE_KEY_RECORRENTES);
  },

  _renderCronograma() {
    const view    = this._calView;
    const titulo  = this._calGetTitulo();
    const arenas  = Storage.getAll('arenas').sort((a,b) => a.nome.localeCompare(b.nome));
    const arenaOpts = `<option value="">Todas as arenas</option>` +
      arenas.map(a => `<option value="${a.id}" ${this._calFilterArena===a.id?'selected':''}>${UI.escape(a.nome)}</option>`).join('');

    const subBtns = [
      { k:'cal',         l:'📅 Calendário'  },
      { k:'recorrentes', l:'🔁 Recorrentes' },
    ].map(({k,l}) =>
      `<button class="tab-btn tab-btn-sm ${this._calSubView===k?'active':''}"
        onclick="DayUseModule._calSetSubView('${k}')">${l}</button>`
    ).join('');

    if (this._calSubView === 'recorrentes') {
      return `
        <div class="cal-toolbar" style="flex-wrap:wrap;gap:8px;">
          <div style="display:flex;gap:4px;">${subBtns}</div>
          <div style="display:flex;gap:8px;margin-left:auto;align-items:center;">
            <select class="filter-select filter-select-sm"
              onchange="DayUseModule._calFilterArena=this.value;DayUseModule._reRenderContent()">${arenaOpts}</select>
            <button class="btn btn-primary btn-sm" onclick="DayUseModule.openModalRecorrente()">+ Recorrente</button>
          </div>
        </div>
        <div id="dayuse-cal-body">${this._renderRecorrentes()}</div>`;
    }

    return `
      <div class="cal-toolbar">
        <div class="cal-toolbar-nav">
          <button class="btn btn-ghost btn-sm cal-nav" onclick="DayUseModule._calNavegar(-1)">&#8249;</button>
          <span class="cal-title">${titulo}</span>
          <button class="btn btn-ghost btn-sm cal-nav" onclick="DayUseModule._calNavegar(1)">&#8250;</button>
          <button class="btn btn-secondary btn-sm cal-hoje-btn" onclick="DayUseModule._calIrHoje()">Hoje</button>
        </div>
        <div class="cal-view-switcher">
          ${['dia','semana','mes','agenda'].map(v =>
            `<button class="cal-view-btn${view===v?' active':''}" onclick="DayUseModule._calSetView('${v}')">
              ${{dia:'Dia',semana:'Semana',mes:'Mês',agenda:'Agenda'}[v]}
            </button>`
          ).join('')}
        </div>
        <div class="cal-toolbar-filters">
          <select class="filter-select filter-select-sm"
            onchange="DayUseModule._calFilterArena=this.value;DayUseModule._reRenderContent()">${arenaOpts}</select>
          <div style="display:flex;gap:4px;">${subBtns}</div>
        </div>
      </div>
      <div class="cal-legenda">
        <span class="cal-leg-item"><span class="cal-leg-dot" style="background:#10b981"></span>Entrada avulsa</span>
        <span class="cal-leg-item"><span class="cal-leg-dot" style="background:#8b5cf6"></span>Grupo recorrente</span>
      </div>
      <div class="cal-body" id="dayuse-cal-body">
        ${view === 'dia'    ? this._calViewDia()    : ''}
        ${view === 'semana' ? this._calViewSemana() : ''}
        ${view === 'mes'    ? this._calViewMes()    : ''}
        ${view === 'agenda' ? this._calViewAgenda() : ''}
      </div>`;
  },

  _calSetSubView(sv) {
    this._calSubView = sv;
    this._reRenderContent();
  },

  _calSetView(v) {
    this._calView = v;
    this._reRenderContent();
  },

  _calGetTitulo() {
    const { _calAno: ano, _calMes: mes, _calDia: dia, _calView: view } = this;
    if (view === 'dia') {
      const d = new Date(ano, mes, dia);
      const t = d.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    if (view === 'semana') {
      const { ini, fim } = this._calGetSemana();
      const di = ini.toLocaleDateString('pt-BR', { day:'numeric', month:'short' });
      const df = fim.toLocaleDateString('pt-BR', { day:'numeric', month:'short', year:'numeric' });
      return `${di} – ${df}`;
    }
    if (view === 'mes') {
      const t = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    return 'Próximas Entradas';
  },

  _calGetSemana() {
    const ref = new Date(this._calAno, this._calMes, this._calDia);
    const dow = ref.getDay();
    const ini = new Date(ref); ini.setDate(ref.getDate() - dow);
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
    return { ini, fim };
  },

  _calNavegar(delta) {
    const view = this._calView;
    if (view === 'mes') {
      let m = this._calMes + delta, a = this._calAno;
      if (m < 0)  { m = 11; a--; }
      if (m > 11) { m = 0;  a++; }
      this._calAno = a; this._calMes = m;
    } else if (view === 'semana') {
      const d = new Date(this._calAno, this._calMes, this._calDia);
      d.setDate(d.getDate() + delta * 7);
      this._calAno = d.getFullYear(); this._calMes = d.getMonth(); this._calDia = d.getDate();
    } else if (view === 'dia') {
      const d = new Date(this._calAno, this._calMes, this._calDia);
      d.setDate(d.getDate() + delta);
      this._calAno = d.getFullYear(); this._calMes = d.getMonth(); this._calDia = d.getDate();
    } else {
      const d = new Date(this._calAno, this._calMes, this._calDia);
      d.setDate(d.getDate() + delta * 14);
      this._calAno = d.getFullYear(); this._calMes = d.getMonth(); this._calDia = d.getDate();
    }
    this._reRenderContent();
  },

  _calIrHoje() {
    const now = new Date();
    this._calAno = now.getFullYear(); this._calMes = now.getMonth(); this._calDia = now.getDate();
    this._reRenderContent();
  },

  _calGetEntradas(dataIni, dataFim) {
    const ini = dataIni.toISOString().slice(0,10);
    const fim = dataFim.toISOString().slice(0,10);
    return this.getAllEntradas().filter(e => {
      if (!e.data || e.data < ini || e.data > fim) return false;
      if (this._calFilterArena && e.arenaId !== this._calFilterArena) return false;
      return true;
    }).sort((a,b) => (a.hora||'').localeCompare(b.hora||''));
  },

  _calGetRecorrentesParaDia(dow) {
    return this._getAllRecorrentes().filter(r => {
      if (parseInt(r.diaSemana, 10) !== dow) return false;
      if (this._calFilterArena && r.arenaId !== this._calFilterArena) return false;
      return true;
    }).sort((a,b) => (a.horarioInicio||'').localeCompare(b.horarioInicio||''));
  },

  _calViewDia() {
    const { _calAno: ano, _calMes: mes, _calDia: dia } = this;
    const d       = new Date(ano, mes, dia);
    const dataStr = d.toISOString().slice(0,10);
    const entradas = this._calGetEntradas(d, d);
    const recorr   = this._calGetRecorrentesParaDia(d.getDay());

    if (!entradas.length && !recorr.length) {
      return `
        <div class="cal-dia-vazio">
          <span>🚪</span>
          <p>Nenhuma entrada neste dia.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px;"
            onclick="DayUseModule.openModalEntrada('${dataStr}')">+ Nova Entrada</button>
        </div>`;
    }

    return `
      <div class="cal-dia-lista">
        ${recorr.map(r => this._calCardRecorrente(r, 'lg')).join('')}
        ${entradas.map(e => this._calCardEntrada(e, 'lg')).join('')}
        <div style="margin-top:12px;text-align:center;">
          <button class="btn btn-secondary btn-sm" onclick="DayUseModule.openModalEntrada('${dataStr}')">+ Nova Entrada</button>
        </div>
      </div>`;
  },

  _calViewSemana() {
    const { ini, fim } = this._calGetSemana();
    const entradas = this._calGetEntradas(ini, fim);
    const hojeStr  = new Date().toISOString().slice(0,10);
    const DIAS     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    const cols = [];
    for (let i = 0; i < 7; i++) {
      const d  = new Date(ini); d.setDate(ini.getDate() + i);
      const ds = d.toISOString().slice(0,10);
      const isHoje  = ds === hojeStr;
      const entrDia = entradas.filter(e => e.data === ds);
      const recDia  = this._calGetRecorrentesParaDia(d.getDay());
      const content = (recDia.length || entrDia.length)
        ? [
            ...recDia.map(r  => this._calCardRecorrente(r, 'sm')),
            ...entrDia.map(e => this._calCardEntrada(e, 'sm')),
          ].join('')
        : `<div class="cal-sem-vazio">—</div>`;

      cols.push(`
        <div class="cal-sem-col${isHoje?' cal-sem-hoje':''}">
          <div class="cal-sem-header" onclick="DayUseModule.openModalEntrada('${ds}')"
            style="cursor:pointer;" title="Nova entrada neste dia">
            <span class="cal-sem-diaNome">${DIAS[i]}</span>
            <span class="cal-sem-diaNum${isHoje?' hoje':''}">${d.getDate()}</span>
          </div>
          <div class="cal-sem-aulas">${content}</div>
        </div>`);
    }
    return `<div class="cal-semana-grid">${cols.join('')}</div>`;
  },

  _calViewMes() {
    const { _calAno: ano, _calMes: mes } = this;
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia   = new Date(ano, mes + 1, 0);
    const diasDoMes   = ultimoDia.getDate();
    const inicioSem   = primeiroDia.getDay();
    const mesStr      = String(mes + 1).padStart(2, '0');
    const hojeStr     = new Date().toISOString().slice(0, 10);
    const HEADER      = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const WKEND       = [0, 6];
    const entradasMes = this._calGetEntradas(primeiroDia, ultimoDia);

    const headerCols = HEADER.map(h => `<div class="cal-mes-th">${h}</div>`).join('');
    let cells = '';
    for (let i = 0; i < inicioSem; i++) {
      cells += `<div class="cal-cell cal-cell-outside${WKEND.includes(i)?' cal-cell-fds':''}"></div>`;
    }

    for (let d = 1; d <= diasDoMes; d++) {
      const dataStr  = `${ano}-${mesStr}-${String(d).padStart(2,'0')}`;
      const diaDt    = new Date(ano, mes, d);
      const dow      = diaDt.getDay();
      const isHoje   = dataStr === hojeStr;
      const isPast   = dataStr < hojeStr;
      const isFds    = WKEND.includes(dow);
      const entrDia  = entradasMes.filter(e => e.data === dataStr);
      const recDia   = this._calGetRecorrentesParaDia(dow);
      const MAX      = 3;
      const todos    = [...recDia.map(r => ({_t:'r',r})), ...entrDia.map(e => ({_t:'e',e}))];
      const visiveis = todos.slice(0, MAX);
      const extras   = todos.length - MAX;

      const eventos = visiveis.map(item => {
        if (item._t === 'r') {
          const r = item.r;
          return `<div class="cal-event" style="--ev-cor:#8b5cf6;"
            onclick="event.stopPropagation();DayUseModule.openModalRecorrente('${r.id}')">
            <span class="cal-ev-dot" style="background:#8b5cf6;"></span>
            <span class="cal-event-hora">${(r.horarioInicio||'').slice(0,5)}</span>
            <span class="cal-event-nome">🔁 ${UI.escape(r.nome)}</span>
          </div>`;
        }
        const e = item.e;
        return `<div class="cal-event" style="--ev-cor:#10b981;">
          <span class="cal-ev-dot" style="background:#10b981;"></span>
          <span class="cal-event-hora">${(e.hora||'').slice(0,5)}</span>
          <span class="cal-event-nome">${UI.escape(e.clienteNome)}</span>
        </div>`;
      }).join('');

      const mais = extras > 0
        ? `<div class="cal-event-mais" onclick="event.stopPropagation();DayUseModule._calSetView('dia');DayUseModule._calDia=${d};DayUseModule._reRenderContent()">+${extras} mais</div>`
        : '';

      cells += `
        <div class="cal-cell${isHoje?' cal-cell-hoje':''}${isPast?' cal-cell-passado':''}${isFds?' cal-cell-fds':''}"
          onclick="DayUseModule.openModalEntrada('${dataStr}')" style="cursor:pointer;">
          <div class="cal-cell-num${isHoje?' hoje':''}">${d}</div>
          ${eventos}${mais}
        </div>`;
    }

    return `
      <div class="cal-mes-wrap">
        <div class="cal-mes-header">${headerCols}</div>
        <div class="cal-mes-grid">${cells}</div>
      </div>`;
  },

  _calViewAgenda() {
    const ref = new Date(this._calAno, this._calMes, this._calDia);
    const fim = new Date(ref); fim.setDate(ref.getDate() + 30);
    const entradas = this._calGetEntradas(ref, fim);
    const hojeStr  = new Date().toISOString().slice(0,10);

    if (!entradas.length) {
      return `<div class="cal-dia-vazio"><span>📭</span><p>Nenhuma entrada nos próximos 30 dias.</p></div>`;
    }

    const grupos = {};
    entradas.forEach(e => { (grupos[e.data] = grupos[e.data] || []).push(e); });

    return `<div class="cal-agenda-wrap">` +
      Object.entries(grupos).sort(([a],[b]) => a.localeCompare(b)).map(([data, ents]) => {
        const [ano, mes, dia] = data.split('-');
        const dateObj = new Date(+ano, +mes-1, +dia);
        const label   = dateObj.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
        const isHoje  = data === hojeStr;
        const recDia  = this._calGetRecorrentesParaDia(dateObj.getDay());
        const cards   = [
          ...recDia.map(r  => this._calCardRecorrente(r, 'md')),
          ...ents.map(e    => this._calCardEntrada(e, 'md')),
        ].join('');
        return `
          <div class="cal-agenda-grupo">
            <div class="cal-agenda-data${isHoje?' hoje':''}">
              ${label.charAt(0).toUpperCase() + label.slice(1)}
              ${isHoje ? '<span class="cal-agenda-hoje-badge">Hoje</span>' : ''}
            </div>
            <div class="cal-agenda-aulas">${cards}</div>
          </div>`;
      }).join('') + `</div>`;
  },

  _calCardEntrada(e, size = 'md') {
    const cor   = '#10b981';
    const plano = Storage.getById(this.STORAGE_KEY_PLANOS, e.planoId);
    const hr    = (e.hora || '').slice(0, 5);

    if (size === 'sm') {
      return `
        <div class="cal-card cal-card-sm" style="--ev-cor:${cor};">
          <div class="cal-card-hora">${hr}</div>
          <div class="cal-card-titulo">${UI.escape(e.clienteNome)}</div>
        </div>`;
    }
    if (size === 'md') {
      return `
        <div class="cal-card cal-card-md" style="--ev-cor:${cor};">
          <div class="cal-card-left-bar" style="background:${cor};"></div>
          <div class="cal-card-body">
            <div class="cal-card-row1">
              <span class="cal-card-hora">${hr || '—'}</span>
              <span class="cal-card-badge" style="background:#10b98120;color:${cor};">Day Use</span>
            </div>
            <div class="cal-card-titulo">${UI.escape(e.clienteNome)}</div>
            <div class="cal-card-sub">
              ${plano     ? `📋 ${UI.escape(plano.nome)}`     : ''}
              ${e.arenaNome ? `· 📍 ${UI.escape(e.arenaNome)}` : ''}
              · 💰 ${this._fmt(e.valor)}
            </div>
          </div>
        </div>`;
    }
    // lg
    return `
      <div class="cal-card cal-card-lg" style="--ev-cor:${cor};">
        <div class="cal-card-left-bar" style="background:${cor};"></div>
        <div class="cal-card-body">
          <div class="cal-card-row1">
            <span class="cal-card-hora-lg">${hr || '—'}</span>
            <span class="cal-card-badge" style="background:#10b98120;color:${cor};">Day Use</span>
          </div>
          <div class="cal-card-titulo-lg">${UI.escape(e.clienteNome)}</div>
          <div class="cal-card-meta">
            ${e.clienteTel ? `<span>📱 ${UI.escape(e.clienteTel)}</span>` : ''}
            ${plano        ? `<span>📋 ${UI.escape(plano.nome)}</span>`   : ''}
            ${e.arenaNome  ? `<span>📍 ${UI.escape(e.arenaNome)}</span>`  : ''}
            <span>💰 ${this._fmt(e.valor)}</span>
          </div>
        </div>
        <div class="cal-card-actions">
          <button class="btn btn-ghost btn-sm danger" onclick="event.stopPropagation();DayUseModule.deleteEntrada('${e.id}')" title="Excluir">🗑️</button>
        </div>
      </div>`;
  },

  _calCardRecorrente(r, size = 'md') {
    const cor = '#8b5cf6';
    const hr  = r.horarioInicio
      ? `${r.horarioInicio}${r.horarioFim ? '–' + r.horarioFim : ''}`
      : '—';

    if (size === 'sm') {
      return `
        <div class="cal-card cal-card-sm" style="--ev-cor:${cor};">
          <div class="cal-card-hora">${(r.horarioInicio||'').slice(0,5)}</div>
          <div class="cal-card-titulo">🔁 ${UI.escape(r.nome)}</div>
        </div>`;
    }
    if (size === 'md') {
      return `
        <div class="cal-card cal-card-md" style="--ev-cor:${cor};">
          <div class="cal-card-left-bar" style="background:${cor};"></div>
          <div class="cal-card-body">
            <div class="cal-card-row1">
              <span class="cal-card-hora">${hr}</span>
              <span class="cal-card-badge" style="background:#8b5cf620;color:${cor};">Recorrente</span>
            </div>
            <div class="cal-card-titulo">🔁 ${UI.escape(r.nome)}</div>
            <div class="cal-card-sub">
              ${r.arenaNome ? `📍 ${UI.escape(r.arenaNome)}` : ''}
              ${r.descricao ? `· ${UI.escape(r.descricao)}` : ''}
            </div>
          </div>
        </div>`;
    }
    // lg
    return `
      <div class="cal-card cal-card-lg" style="--ev-cor:${cor};">
        <div class="cal-card-left-bar" style="background:${cor};"></div>
        <div class="cal-card-body">
          <div class="cal-card-row1">
            <span class="cal-card-hora-lg">${hr}</span>
            <span class="cal-card-badge" style="background:#8b5cf620;color:${cor};">Recorrente</span>
          </div>
          <div class="cal-card-titulo-lg">🔁 ${UI.escape(r.nome)}</div>
          <div class="cal-card-meta">
            ${r.arenaNome ? `<span>📍 ${UI.escape(r.arenaNome)}</span>` : ''}
            ${r.descricao ? `<span>📝 ${UI.escape(r.descricao)}</span>` : ''}
          </div>
        </div>
        <div class="cal-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();DayUseModule.openModalRecorrente('${r.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger" onclick="event.stopPropagation();DayUseModule.deleteRecorrente('${r.id}')" title="Excluir">🗑️</button>
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Recorrentes — CRUD                                                  */
  /* ------------------------------------------------------------------ */

  _renderRecorrentes() {
    const DIAS_LABEL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    const todos = this._getAllRecorrentes()
      .filter(r => !this._calFilterArena || r.arenaId === this._calFilterArena)
      .sort((a,b) => {
        const da = parseInt(a.diaSemana,10), db = parseInt(b.diaSemana,10);
        return da - db || (a.horarioInicio||'').localeCompare(b.horarioInicio||'');
      });

    if (!todos.length) {
      return `
        <div class="empty-state" style="margin-top:32px;">
          <div class="empty-icon">🔁</div>
          <div class="empty-title">Nenhum grupo recorrente cadastrado</div>
          <div class="empty-desc">Grupos recorrentes aparecem automaticamente todas as semanas no calendário.</div>
          <button class="btn btn-primary mt-16" onclick="DayUseModule.openModalRecorrente()">+ Novo Grupo Recorrente</button>
        </div>`;
    }

    const grupos = {};
    todos.forEach(r => { const d = String(r.diaSemana); (grupos[d] = grupos[d] || []).push(r); });

    return `<div style="padding:16px 0;">` +
      Object.entries(grupos).sort(([a],[b]) => +a - +b).map(([dow, recs]) => {
        const rows = recs.map(r => {
          const hr = r.horarioInicio
            ? `${r.horarioInicio}${r.horarioFim ? '–' + r.horarioFim : ''}`
            : '—';
          return `
            <tr>
              <td><strong>${UI.escape(r.nome)}</strong></td>
              <td class="text-muted">${hr}</td>
              <td class="text-muted">${UI.escape(r.arenaNome || '—')}</td>
              <td class="text-muted text-sm">${UI.escape(r.descricao || '—')}</td>
              <td class="aluno-row-actions">
                <button class="btn btn-ghost btn-sm" onclick="DayUseModule.openModalRecorrente('${r.id}')" title="Editar">✏️</button>
                <button class="btn btn-ghost btn-sm danger" onclick="DayUseModule.deleteRecorrente('${r.id}')" title="Excluir">🗑️</button>
              </td>
            </tr>`;
        }).join('');
        return `
          <div style="margin-bottom:20px;">
            <div style="font-weight:700;font-size:12px;color:var(--color-primary);text-transform:uppercase;letter-spacing:.7px;padding:8px 0 6px;border-bottom:2px solid var(--color-primary);margin-bottom:8px;">
              🔁 ${DIAS_LABEL[+dow]}
            </div>
            <div class="table-card">
              <table class="data-table">
                <thead><tr><th>Nome</th><th>Horário</th><th>Arena</th><th>Descrição</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
      }).join('') + `</div>`;
  },

  openModalRecorrente(id = null) {
    const rec    = id ? Storage.getById(this.STORAGE_KEY_RECORRENTES, id) : null;
    const isEdit = !!rec;
    const v = (field, fb = '') => rec ? UI.escape(String(rec[field] ?? fb)) : fb;
    const DIAS_LABEL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

    const diaOpts = DIAS_LABEL.map((l, i) =>
      `<option value="${i}" ${rec && parseInt(rec.diaSemana,10) === i ? 'selected' : ''}>${l}</option>`
    ).join('');

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOpts = `<option value="">— Sem arena —</option>` +
      arenas.map(a => `<option value="${a.id}" ${rec && rec.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="dr-nome">Nome do grupo <span class="required-star">*</span></label>
          <input id="dr-nome" type="text" class="form-input"
            placeholder="ex: Day Use Matinal" value="${v('nome')}" autocomplete="off" />
        </div>
        <div class="form-group">
          <label class="form-label" for="dr-dia">Dia da semana <span class="required-star">*</span></label>
          <select id="dr-dia" class="form-select">${diaOpts}</select>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="dr-ini">Horário início</label>
            <input id="dr-ini" type="time" class="form-input" value="${v('horarioInicio')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="dr-fim">Horário fim</label>
            <input id="dr-fim" type="time" class="form-input" value="${v('horarioFim')}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="dr-arena">Arena</label>
          <select id="dr-arena" class="form-select">${arenaOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="dr-desc">Descrição</label>
          <input id="dr-desc" type="text" class="form-input"
            placeholder="ex: Grupo fixo às terças" value="${v('descricao')}" autocomplete="off" />
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Grupo — ${rec.nome}` : 'Novo Grupo Recorrente',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Criar Grupo',
      onConfirm:    () => this.saveRecorrente(id),
    });
  },

  saveRecorrente(id = null) {
    const g    = sel => document.getElementById(sel);
    const nome = g('dr-nome');
    if (!nome || !nome.value.trim()) {
      if (nome) nome.classList.add('error');
      UI.toast('Preencha o nome do grupo.', 'warning'); return;
    }
    nome.classList.remove('error');

    const arenaId = g('dr-arena')?.value || '';
    const arena   = arenaId ? Storage.getById('arenas', arenaId) : null;

    const data = {
      nome:          nome.value.trim(),
      diaSemana:     parseInt(g('dr-dia')?.value || '1', 10),
      horarioInicio: g('dr-ini')?.value  || '',
      horarioFim:    g('dr-fim')?.value  || '',
      arenaId,
      arenaNome:     arena ? arena.nome : '',
      descricao:     g('dr-desc')?.value.trim() || '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY_RECORRENTES, id, data);
      UI.toast(`Grupo "${data.nome}" atualizado!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY_RECORRENTES, data);
      UI.toast(`Grupo "${data.nome}" criado com sucesso!`, 'success');
    }
    UI.closeModal();
    this._reRenderContent();
  },

  async deleteRecorrente(id) {
    const rec = Storage.getById(this.STORAGE_KEY_RECORRENTES, id);
    if (!rec) return;
    const ok = await UI.confirm(`Deseja excluir o grupo recorrente "${rec.nome}"?`, 'Excluir Grupo');
    if (!ok) return;
    Storage.delete(this.STORAGE_KEY_RECORRENTES, id);
    UI.toast('Grupo recorrente excluído.', 'success');
    this._reRenderContent();
  },

  _reRenderContent() {
    const el = document.getElementById('dayuse-content');
    if (el) el.innerHTML = this._renderCronograma();
    else this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Modal Entrada                                                       */
  /* ------------------------------------------------------------------ */

  openModalEntrada(dataPreenchida = null) {
    const hoje    = dataPreenchida || new Date().toISOString().slice(0, 10);
    const agora   = new Date().toTimeString().slice(0, 5);
    const planos  = this.getPlanosAtivos();

    if (!planos.length) {
      UI.toast('Cadastre ao menos um plano de day use antes de registrar uma entrada.', 'warning');
      return;
    }

    const planoOpts = planos.map(p =>
      `<option value="${p.id}" data-valor="${p.valor}">${UI.escape(p.nome)} — ${this._fmt(p.valor)}</option>`
    ).join('');

    const formaOpts = ListasService.opts('dayuse_forma_pagamento', '');

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOpts = arenas.map(a =>
      `<option value="${a.id}">${UI.escape(a.nome)}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="du-nome">Nome do cliente <span class="required-star">*</span></label>
          <input id="du-nome" type="text" class="form-input" placeholder="ex: João da Silva" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="du-cpf">CPF</label>
            <input id="du-cpf" type="text" class="form-input" placeholder="000.000.000-00"
              maxlength="14"
              oninput="DayUseModule._maskCpf(this)"
              onblur="DayUseModule._buscarClientePorCpf(this.value)"
              autocomplete="off" />
            <span id="du-cpf-hint" class="text-muted text-sm" style="display:none;margin-top:4px;"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="du-tel">Telefone / WhatsApp</label>
            <input id="du-tel" type="text" class="form-input" placeholder="(00) 00000-0000"
              maxlength="15" oninput="DayUseModule._maskTel(this)" autocomplete="off" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="du-email">E-mail</label>
          <input id="du-email" type="email" class="form-input" placeholder="cliente@email.com" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="du-data">Data <span class="required-star">*</span></label>
            <input id="du-data" type="date" class="form-input" value="${hoje}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="du-hora">Hora de entrada</label>
            <input id="du-hora" type="time" class="form-input" value="${agora}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="du-plano">Plano <span class="required-star">*</span></label>
          <select id="du-plano" class="form-select" onchange="DayUseModule._preencherValor(this)">
            ${planoOpts}
          </select>
        </div>

        ${arenas.length ? `
        <div class="form-group">
          <label class="form-label" for="du-arena">Arena</label>
          <select id="du-arena" class="form-select">
            <option value="">— Selecionar arena —</option>
            ${arenaOpts}
          </select>
        </div>` : ''}

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="du-valor">Valor (R$) <span class="required-star">*</span></label>
            <input id="du-valor" type="number" class="form-input" min="0" step="0.01"
              value="${planos[0] ? planos[0].valor : ''}" placeholder="0,00" />
          </div>
          <div class="form-group">
            <label class="form-label" for="du-forma">Forma de pagamento</label>
            <select id="du-forma" class="form-select">${formaOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="du-obs">Observações</label>
          <textarea id="du-obs" class="form-textarea" rows="2" placeholder="Observações adicionais…"></textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        'Registrar Entrada Day Use',
      content,
      confirmLabel: 'Registrar Entrada',
      onConfirm:    () => this.saveEntrada(),
    });
  },

  _preencherValor(sel) {
    const opt = sel.options[sel.selectedIndex];
    const val = opt ? opt.dataset.valor : '';
    const input = document.getElementById('du-valor');
    if (input && val) input.value = val;
  },

  saveEntrada() {
    const g = id => document.getElementById(id);
    const nome  = g('du-nome');
    const plano = g('du-plano');
    const data  = g('du-data');
    const valor = g('du-valor');

    let valid = true;
    [nome, plano, data, valor].forEach(el => {
      if (!el || !el.value.trim()) { el && el.classList.add('error'); valid = false; }
      else el && el.classList.remove('error');
    });

    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const planoObj = Storage.getById(this.STORAGE_KEY_PLANOS, plano.value);
    const arenaEl  = g('du-arena');
    const arenaObj = arenaEl && arenaEl.value ? Storage.getById('arenas', arenaEl.value) : null;

    const entrada = {
      clienteNome:    nome.value.trim(),
      clienteCpf:     g('du-cpf')   ? g('du-cpf').value.trim()   : '',
      clienteTel:     g('du-tel')   ? g('du-tel').value.trim()   : '',
      clienteEmail:   g('du-email') ? g('du-email').value.trim() : '',
      data:           data.value,
      hora:           g('du-hora')  ? g('du-hora').value         : '',
      planoId:        plano.value,
      planoNome:      planoObj ? planoObj.nome : '',
      arenaId:        arenaObj ? arenaObj.id   : '',
      arenaNome:      arenaObj ? arenaObj.nome : '',
      valor:          parseFloat(valor.value) || 0,
      formaPagamento: g('du-forma') ? g('du-forma').value : 'dinheiro',
      observacoes:    g('du-obs')   ? g('du-obs').value.trim()   : '',
    };

    Storage.create(this.STORAGE_KEY_ENTRADAS, entrada);

    // Lança no financeiro automaticamente
    this._lancarFinanceiro(entrada);

    UI.toast(`Entrada de "${entrada.clienteNome}" registrada com sucesso!`, 'success');
    UI.closeModal();
    this.render();
  },

  _lancarFinanceiro(entrada) {
    const [ano, mes, dia] = (entrada.data || '').split('-');
    const dataFmt = entrada.data ? `${dia}/${mes}/${ano}` : '';
    Storage.create('financeiro', {
      tipo:           'receita',
      categoria:      'day_use',
      descricao:      `Day Use — ${entrada.clienteNome}${entrada.planoNome ? ' (' + entrada.planoNome + ')' : ''}`,
      valor:          entrada.valor,
      data:           entrada.data,
      formaPagamento: entrada.formaPagamento,
      status:         'pago',
      observacoes:    `Entrada day use em ${dataFmt}. ${entrada.observacoes || ''}`.trim(),
    });
  },

  async deleteEntrada(id) {
    const entrada = Storage.getById(this.STORAGE_KEY_ENTRADAS, id);
    if (!entrada) return;
    const confirmed = await UI.confirm(
      `Deseja excluir a entrada de "${entrada.clienteNome}"? Esta ação não pode ser desfeita.`,
      'Excluir Entrada'
    );
    if (!confirmed) return;
    Storage.delete(this.STORAGE_KEY_ENTRADAS, id);
    UI.toast('Entrada excluída.', 'success');
    this._reRenderEntradas();
  },

  /* ------------------------------------------------------------------ */
  /*  Modal Plano                                                         */
  /* ------------------------------------------------------------------ */

  openModalPlano(id = null) {
    const plano  = id ? Storage.getById(this.STORAGE_KEY_PLANOS, id) : null;
    const isEdit = !!plano;
    const v = (field, fallback = '') => plano ? UI.escape(String(plano[field] ?? fallback)) : fallback;

    const statusOpts = Object.entries(this.STATUS_PLANO).map(([k, cfg]) =>
      `<option value="${k}" ${plano && plano.status === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="dp-nome">Nome do plano <span class="required-star">*</span></label>
          <input id="dp-nome" type="text" class="form-input"
            placeholder="ex: Day Use Standard"
            value="${v('nome')}" autocomplete="off" />
        </div>

        <div class="form-group">
          <label class="form-label" for="dp-descricao">Descrição</label>
          <input id="dp-descricao" type="text" class="form-input"
            placeholder="ex: Acesso por 1 dia a qualquer arena"
            value="${v('descricao')}" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="dp-valor">Valor (R$) <span class="required-star">*</span></label>
            <input id="dp-valor" type="number" class="form-input" min="0" step="0.01"
              value="${v('valor')}" placeholder="0,00" />
          </div>
          <div class="form-group">
            <label class="form-label" for="dp-status">Status</label>
            <select id="dp-status" class="form-select">${statusOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="dp-obs">Observações</label>
          <textarea id="dp-obs" class="form-textarea" rows="2"
            placeholder="Informações adicionais sobre o plano…">${plano ? UI.escape(plano.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Plano — ${plano.nome}` : 'Novo Plano Day Use',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Criar Plano',
      onConfirm:    () => this.savePlano(id),
    });
  },

  savePlano(id = null) {
    const g    = sel => document.getElementById(sel);
    const nome  = g('dp-nome');
    const valor = g('dp-valor');

    let valid = true;
    [nome, valor].forEach(el => {
      if (!el || !el.value.trim()) { el && el.classList.add('error'); valid = false; }
      else el && el.classList.remove('error');
    });

    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const data = {
      nome:        nome.value.trim(),
      descricao:   g('dp-descricao') ? g('dp-descricao').value.trim() : '',
      valor:       parseFloat(valor.value) || 0,
      status:      g('dp-status')    ? g('dp-status').value           : 'ativo',
      observacoes: g('dp-obs')       ? g('dp-obs').value.trim()       : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY_PLANOS, id, data);
      UI.toast(`Plano "${data.nome}" atualizado!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY_PLANOS, data);
      UI.toast(`Plano "${data.nome}" criado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deletePlano(id) {
    const plano = Storage.getById(this.STORAGE_KEY_PLANOS, id);
    if (!plano) return;

    const emUso = this.getAllEntradas().some(e => e.planoId === id);
    if (emUso) {
      UI.toast('Este plano possui entradas vinculadas e não pode ser excluído.', 'warning');
      return;
    }

    const confirmed = await UI.confirm(
      `Deseja excluir o plano "${plano.nome}"?`,
      'Excluir Plano'
    );
    if (!confirmed) return;
    Storage.delete(this.STORAGE_KEY_PLANOS, id);
    UI.toast(`Plano "${plano.nome}" excluído.`, 'success');
    this._reRenderPlanos();
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _buscarClientePorCpf(cpf) {
    if (!cpf || cpf.length < 11) return;
    const hint = document.getElementById('du-cpf-hint');

    // Busca em alunos
    const aluno = Storage.getAll('alunos').find(a => a.cpf === cpf);
    if (aluno) {
      this._preencherCamposCliente(aluno.nome, aluno.telefone || '', aluno.email || '');
      if (hint) { hint.textContent = '✅ Cliente encontrado nos alunos.'; hint.style.display = 'block'; }
      return;
    }

    // Busca em entradas anteriores de day use
    const entradas = this.getAllEntradas().filter(e => e.clienteCpf === cpf);
    if (entradas.length) {
      const ultima = entradas.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      this._preencherCamposCliente(ultima.clienteNome, ultima.clienteTel || '', ultima.clienteEmail || '');
      if (hint) { hint.textContent = '✅ Cliente encontrado em entradas anteriores.'; hint.style.display = 'block'; }
      return;
    }

    // Não encontrado — campos ficam abertos para preenchimento manual
    if (hint) { hint.textContent = '🆕 Novo cliente — preencha os dados abaixo.'; hint.style.display = 'block'; }
  },

  _preencherCamposCliente(nome, tel, email) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('du-nome',  nome);
    set('du-tel',   tel);
    set('du-email', email);
  },

  _trocarAba(aba) {
    this._state.aba = aba;
    this.render();
  },

  _fmt(valor) {
    return 'R$ ' + (parseFloat(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  _maskCpf(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    el.value = v;
  },

  _maskTel(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    el.value = v;
  },
};
