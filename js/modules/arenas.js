'use strict';

/**
 * ArenaModule — CRUD de Arenas + CRUD de Quadras (dois níveis)
 */
const ArenaModule = {
  STORAGE_KEY:  'arenas',
  SK_QUADRAS:   'quadras',

  _state: {
    search:       '',
    filterStatus: '',
    tab:          'arenas', // 'arenas' | 'quadras'
    filterArena:  '',       // filtro de arena na aba Quadras
  },

  STATUS: {
    ativa:      { label: 'Ativa',          badge: 'badge-success' },
    inativa:    { label: 'Inativa',        badge: 'badge-gray'    },
    manutencao: { label: 'Em Manutenção',  badge: 'badge-warning' },
  },

  _STATUS_CYCLE: ['ativa', 'manutencao', 'inativa'],

  STATUS_QUADRA: {
    disponivel: { label: 'Disponível', badge: 'badge-success' },
    manutencao: { label: 'Manutenção', badge: 'badge-warning' },
    inativa:    { label: 'Inativa',    badge: 'badge-gray'    },
  },

  TIPO_QUADRA: {
    coberta:    { label: 'Coberta',    badge: 'badge-blue'    },
    descoberta: { label: 'Descoberta', badge: 'badge-success' },
  },

  PISO_QUADRA: {
    saibro:    'Saibro',
    sintetico: 'Sintético',
    cimento:   'Cimento',
    madeira:   'Madeira',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterStatus } = this._state;
    return this.getAll().filter(arena => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        arena.nome.toLowerCase().includes(q) ||
        (arena.cidade || '').toLowerCase().includes(q);
      const matchStatus = !filterStatus || arena.status === filterStatus;
      return matchSearch && matchStatus;
    });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:      all.length,
      ativas:     all.filter(a => a.status === 'ativa').length,
      manutencao: all.filter(a => a.status === 'manutencao').length,
      inativas:   all.filter(a => a.status === 'inativa').length,
    };
  },

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;

    const tab    = this._state.tab;
    const stats  = this.getStats();
    const svgPlus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

    const btnLabel = tab === 'arenas' ? 'Nova Arena' : 'Nova Quadra';
    const btnClick = tab === 'arenas' ? 'ArenaModule.openModal()' : 'ArenaModule.openModalQuadra()';

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Arenas</h2>
          <p>Gerencie as arenas e quadras da academia</p>
        </div>
        <button class="btn btn-primary" onclick="${btnClick}">
          ${svgPlus} ${btnLabel}
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon green">🏟️</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Arenas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.ativas}</div>
            <div class="stat-label">Ativas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">🔧</div>
          <div class="stat-info">
            <div class="stat-value">${stats.manutencao}</div>
            <div class="stat-label">Em Manutenção</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gray">🏓</div>
          <div class="stat-info">
            <div class="stat-value">${Storage.getAll(this.SK_QUADRAS).length}</div>
            <div class="stat-label">Total de Quadras</div>
          </div>
        </div>
      </div>

      <div class="tabs-bar">
        <button class="tab-btn ${tab === 'arenas'  ? 'active' : ''}" onclick="ArenaModule.switchTab('arenas')">🏟️ Arenas</button>
        <button class="tab-btn ${tab === 'quadras' ? 'active' : ''}" onclick="ArenaModule.switchTab('quadras')">🏓 Quadras</button>
      </div>

      <div id="arenas-tab-content">
        ${this._renderTab()}
      </div>
    `;
  },

  switchTab(tab, filterArena = '') {
    this._state.tab = tab;
    if (filterArena) this._state.filterArena = filterArena;
    this.render();
  },

  _renderTab() {
    return this._state.tab === 'quadras'
      ? this._renderTabQuadras()
      : this._renderTabArenas();
  },

  /* ================================================================== */
  /*  Aba Arenas                                                          */
  /* ================================================================== */

  _renderTabArenas() {
    const filtered = this.getFiltered();
    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por nome ou cidade…"
            value="${UI.escape(this._state.search)}"
            oninput="ArenaModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="ArenaModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          <option value="ativa"      ${this._state.filterStatus === 'ativa'      ? 'selected' : ''}>Ativa</option>
          <option value="manutencao" ${this._state.filterStatus === 'manutencao' ? 'selected' : ''}>Em Manutenção</option>
          <option value="inativa"    ${this._state.filterStatus === 'inativa'    ? 'selected' : ''}>Inativa</option>
        </select>
        <span class="results-count">
          ${filtered.length} arena${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      ${filtered.length
        ? `<div class="table-card">
             <table class="data-table">
               <thead><tr>
                 <th>Arena</th>
                 <th>Endereço</th>
                 <th>Cidade</th>
                 <th>Quadras</th>
                 <th>Status</th>
                 <th></th>
               </tr></thead>
               <tbody>${filtered.map(a => this._rowArena(a)).join('')}</tbody>
             </table>
           </div>`
        : this._emptyArenas()
      }`;
  },

  _rowArena(a) {
    const st = this.STATUS[a.status] || { label: a.status, badge: 'badge-gray' };
    const qtdQuadras = Storage.getAll(this.SK_QUADRAS).filter(q => q.arenaId === a.id).length;
    const quadrasBadge = qtdQuadras > 0
      ? `<button class="quadra-arena-link" onclick="ArenaModule.switchTab('quadras','${a.id}')" title="Ver quadras desta arena">${qtdQuadras} quadra${qtdQuadras !== 1 ? 's' : ''}</button>`
      : `<span class="badge badge-gray" style="cursor:pointer;" onclick="ArenaModule.switchTab('quadras','${a.id}')">0 quadras</span>`;

    return `
      <tr>
        <td>
          <div class="aluno-nome">${UI.escape(a.nome)}</div>
          ${a.observacoes ? `<div class="aluno-sub">${UI.escape(a.observacoes.slice(0, 60))}${a.observacoes.length > 60 ? '…' : ''}</div>` : ''}
        </td>
        <td>${UI.escape(a.endereco || '—')}</td>
        <td>${UI.escape(a.cidade || '—')}</td>
        <td>${quadrasBadge}</td>
        <td><span class="badge ${st.badge}">${st.label}</span></td>
        <td class="aluno-row-actions">
          <button class="btn btn-ghost btn-sm" onclick="ArenaModule.openModal('${a.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="ArenaModule.toggleStatus('${a.id}')" title="Alternar status">🔄</button>
          <button class="btn btn-ghost btn-sm danger" onclick="ArenaModule.deleteArena('${a.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`;
  },

  _emptyArenas() {
    const isFiltered = this._state.search || this._state.filterStatus;
    if (isFiltered) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhuma arena encontrada</div>
          <div class="empty-desc">Tente ajustar os critérios de busca.</div>
          <button class="btn btn-secondary mt-16" onclick="ArenaModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state">
        <div class="empty-icon">🏟️</div>
        <div class="empty-title">Nenhuma arena cadastrada</div>
        <div class="empty-desc">Comece adicionando a primeira arena da academia.</div>
        <button class="btn btn-primary mt-16" onclick="ArenaModule.openModal()">+ Cadastrar primeira arena</button>
      </div>`;
  },

  /* ================================================================== */
  /*  Aba Quadras                                                         */
  /* ================================================================== */

  _renderTabQuadras() {
    const arenas  = this.getAll().sort((a, b) => a.nome.localeCompare(b.nome));
    const fArena  = this._state.filterArena;
    let quadras   = Storage.getAll(this.SK_QUADRAS);
    if (fArena) quadras = quadras.filter(q => q.arenaId === fArena);
    quadras.sort((a, b) => (a.arenaNome + a.nome).localeCompare(b.arenaNome + b.nome));

    const arenaOpts = `<option value="">Todas as arenas</option>` +
      arenas.map(a =>
        `<option value="${a.id}" ${fArena === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
      ).join('');

    return `
      <div class="filters-bar">
        <select class="filter-select" style="min-width:220px;"
          onchange="ArenaModule._state.filterArena=this.value;ArenaModule._reRenderTabContent()">
          ${arenaOpts}
        </select>
        <span class="results-count">${quadras.length} quadra${quadras.length !== 1 ? 's' : ''}</span>
      </div>

      ${quadras.length
        ? `<div class="table-card">
             <table class="data-table">
               <thead><tr>
                 <th>Arena</th>
                 <th>Nome</th>
                 <th>Tipo</th>
                 <th>Piso</th>
                 <th>Capacidade</th>
                 <th>Status</th>
                 <th></th>
               </tr></thead>
               <tbody>${quadras.map(q => this._rowQuadra(q)).join('')}</tbody>
             </table>
           </div>`
        : `<div class="empty-state">
             <div class="empty-icon">🏓</div>
             <div class="empty-title">Nenhuma quadra cadastrada</div>
             <div class="empty-desc">${fArena ? 'Esta arena não possui quadras.' : 'Adicione quadras para as arenas cadastradas.'}</div>
             <button class="btn btn-primary mt-16" onclick="ArenaModule.openModalQuadra()">+ Nova Quadra</button>
           </div>`
      }`;
  },

  _rowQuadra(q) {
    const st   = this.STATUS_QUADRA[q.status]  || { label: q.status,  badge: 'badge-gray' };
    const tipo = this.TIPO_QUADRA[q.tipo]      || { label: q.tipo || '—', badge: 'badge-gray' };
    const piso = this.PISO_QUADRA[q.piso]      || q.piso || '—';

    return `
      <tr>
        <td>${UI.escape(q.arenaNome || '—')}</td>
        <td>
          <div class="aluno-nome">${UI.escape(q.nome)}</div>
          ${q.observacoes ? `<div class="aluno-sub">${UI.escape(q.observacoes.slice(0, 50))}${q.observacoes.length > 50 ? '…' : ''}</div>` : ''}
        </td>
        <td><span class="badge ${tipo.badge}">${tipo.label}</span></td>
        <td>${UI.escape(piso)}</td>
        <td>${q.capacidade || '—'}</td>
        <td><span class="badge ${st.badge}">${st.label}</span></td>
        <td class="aluno-row-actions">
          <button class="btn btn-ghost btn-sm" onclick="ArenaModule.openModalQuadra('${q.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger" onclick="ArenaModule.deleteQuadra('${q.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`;
  },

  /* ================================================================== */
  /*  Modal Arena (CRUD existente — mantido)                             */
  /* ================================================================== */

  openModal(id = null) {
    const arena  = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!arena;
    const v      = (field, fallback = '') => arena ? UI.escape(String(arena[field] ?? fallback)) : fallback;

    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${arena && arena.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="f-nome">Nome da Arena <span class="required-star">*</span></label>
            <input id="f-nome" name="nome" type="text" class="form-input"
              placeholder="ex: Arena Central"
              value="${v('nome')}" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-telefone">Telefone</label>
            <input id="f-telefone" name="telefone" type="text" class="form-input"
              placeholder="ex: (11) 99999-9999"
              value="${v('telefone')}" autocomplete="off" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="f-endereco">Endereço</label>
          <input id="f-endereco" name="endereco" type="text" class="form-input"
            placeholder="Rua, número, bairro"
            value="${v('endereco')}" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="f-cidade">Cidade</label>
            <input id="f-cidade" name="cidade" type="text" class="form-input"
              placeholder="ex: São Paulo"
              value="${v('cidade')}" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-status">Status</label>
            <select id="f-status" name="status" class="form-select">
              ${statusOptions}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="f-obs">Observações</label>
          <textarea id="f-obs" name="observacoes" class="form-textarea"
            placeholder="Informações adicionais…" rows="3">${arena ? UI.escape(arena.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:         isEdit ? `Editar Arena — ${arena.nome}` : 'Nova Arena',
      content,
      confirmLabel:  isEdit ? 'Salvar alterações' : 'Cadastrar Arena',
      onConfirm:     () => this.saveArena(id),
    });
  },

  saveArena(id = null) {
    const g    = n => document.getElementById(`f-${n}`);
    const nome = g('nome');

    if (!nome || !nome.value.trim()) {
      if (nome) nome.classList.add('error');
      UI.toast('Preencha o nome da arena.', 'warning');
      return;
    }
    nome.classList.remove('error');

    const data = {
      nome:        nome.value.trim(),
      telefone:    g('telefone')  ? g('telefone').value.trim()  : '',
      endereco:    g('endereco')  ? g('endereco').value.trim()  : '',
      cidade:      g('cidade')    ? g('cidade').value.trim()    : '',
      status:      g('status')    ? g('status').value           : 'ativa',
      observacoes: g('obs')       ? g('obs').value.trim()       : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      // Desnormaliza arenaNome nas quadras vinculadas
      Storage.getAll(this.SK_QUADRAS)
        .filter(q => q.arenaId === id)
        .forEach(q => Storage.update(this.SK_QUADRAS, q.id, { arenaNome: data.nome }));
      UI.toast(`Arena "${data.nome}" atualizada!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, data);
      UI.toast(`Arena "${data.nome}" cadastrada!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  toggleStatus(id) {
    const arena = Storage.getById(this.STORAGE_KEY, id);
    if (!arena) return;
    const cycle   = this._STATUS_CYCLE;
    const current = cycle.indexOf(arena.status);
    const next    = cycle[(current + 1) % cycle.length];
    Storage.update(this.STORAGE_KEY, id, { status: next });
    UI.toast(`Status de "${arena.nome}" → ${this.STATUS[next].label}`, 'info');
    this.render();
  },

  async deleteArena(id) {
    const arena = Storage.getById(this.STORAGE_KEY, id);
    if (!arena) return;
    const qtdQuadras = Storage.getAll(this.SK_QUADRAS).filter(q => q.arenaId === id).length;
    const extra = qtdQuadras > 0 ? ` Esta arena possui ${qtdQuadras} quadra${qtdQuadras !== 1 ? 's' : ''} vinculada${qtdQuadras !== 1 ? 's' : ''}.` : '';
    const ok = await UI.confirm(
      `Excluir a arena "${arena.nome}"?${extra} Esta ação não pode ser desfeita.`,
      'Excluir Arena'
    );
    if (!ok) return;
    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Arena "${arena.nome}" excluída.`, 'success');
    this.render();
  },

  /* ================================================================== */
  /*  Modal Quadra                                                        */
  /* ================================================================== */

  openModalQuadra(id = null) {
    const quadra  = id ? Storage.getById(this.SK_QUADRAS, id) : null;
    const isEdit  = !!quadra;
    const v       = (f, fb = '') => quadra ? UI.escape(String(quadra[f] ?? fb)) : fb;

    const arenas  = this.getAll().filter(a => a.status === 'ativa');
    const arenaOpts = `<option value="">— Selecionar arena —</option>` +
      arenas.map(a =>
        `<option value="${a.id}" ${quadra && quadra.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
      ).join('');

    const tipoOpts = Object.entries(this.TIPO_QUADRA).map(([k, cfg]) =>
      `<option value="${k}" ${quadra?.tipo === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const pisoOpts = Object.entries(this.PISO_QUADRA).map(([k, label]) =>
      `<option value="${k}" ${quadra?.piso === k ? 'selected' : ''}>${label}</option>`
    ).join('');

    const statusOpts = Object.entries(this.STATUS_QUADRA).map(([k, cfg]) =>
      `<option value="${k}" ${quadra?.status === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="qd-arena">Arena <span class="required-star">*</span></label>
          <select id="qd-arena" class="form-select">${arenaOpts}</select>
        </div>

        <div class="form-group">
          <label class="form-label" for="qd-nome">Nome da Quadra <span class="required-star">*</span></label>
          <input id="qd-nome" type="text" class="form-input"
            placeholder="ex: Quadra 1, Coberta 001"
            value="${v('nome')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="qd-tipo">Tipo</label>
            <select id="qd-tipo" class="form-select">${tipoOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="qd-piso">Piso</label>
            <select id="qd-piso" class="form-select">${pisoOpts}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="qd-capacidade">Capacidade (jogadores)</label>
            <input id="qd-capacidade" type="number" class="form-input"
              min="1" max="20" value="${v('capacidade', '4')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="qd-status">Status</label>
            <select id="qd-status" class="form-select">${statusOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="qd-obs">Observações</label>
          <textarea id="qd-obs" class="form-textarea" rows="2"
            placeholder="Informações adicionais sobre a quadra…">${quadra ? UI.escape(quadra.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Quadra — ${quadra.nome}` : 'Nova Quadra',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Cadastrar Quadra',
      onConfirm:    () => this.saveQuadra(id),
    });
  },

  saveQuadra(id = null) {
    const g       = n => document.getElementById(`qd-${n}`);
    const arenaEl = g('arena');
    const nomeEl  = g('nome');

    let valid = true;
    [arenaEl, nomeEl].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios (Arena e Nome).', 'warning');
      return;
    }

    const arenaId = arenaEl.value;
    const arena   = Storage.getById(this.STORAGE_KEY, arenaId);

    const data = {
      arenaId,
      arenaNome:   arena ? arena.nome : '',
      nome:        nomeEl.value.trim(),
      tipo:        g('tipo')       ? g('tipo').value                   : 'descoberta',
      piso:        g('piso')       ? g('piso').value                   : 'sintetico',
      capacidade:  g('capacidade') ? parseInt(g('capacidade').value, 10) || 4 : 4,
      status:      g('status')     ? g('status').value                 : 'disponivel',
      observacoes: g('obs')        ? g('obs').value.trim()             : '',
    };

    if (id) {
      Storage.update(this.SK_QUADRAS, id, data);
      UI.toast(`Quadra "${data.nome}" atualizada!`, 'success');
    } else {
      Storage.create(this.SK_QUADRAS, data);
      UI.toast(`Quadra "${data.nome}" cadastrada!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteQuadra(id) {
    const quadra = Storage.getById(this.SK_QUADRAS, id);
    if (!quadra) return;

    const aulasVinculadas = Storage.getAll('aulas').filter(a => a.quadraId === id);
    const extra = aulasVinculadas.length > 0
      ? ` Esta quadra possui ${aulasVinculadas.length} aula${aulasVinculadas.length !== 1 ? 's' : ''} vinculada${aulasVinculadas.length !== 1 ? 's' : ''}.`
      : '';

    const ok = await UI.confirm(
      `Excluir a quadra "${quadra.nome}"?${extra} Esta ação não pode ser desfeita.`,
      'Excluir Quadra'
    );
    if (!ok) return;

    Storage.delete(this.SK_QUADRAS, id);
    UI.toast(`Quadra "${quadra.nome}" excluída.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Filter handlers                                                     */
  /* ------------------------------------------------------------------ */

  handleSearch(value) {
    this._state.search = value;
    this._reRenderTabContent();
  },

  handleFilterStatus(value) {
    this._state.filterStatus = value;
    this._reRenderTabContent();
  },

  clearFilters() {
    this._state.search       = '';
    this._state.filterStatus = '';
    this._state.filterArena  = '';
    this.render();
  },

  _reRenderTabContent() {
    const el = document.getElementById('arenas-tab-content');
    if (el) el.innerHTML = this._renderTab();
  },
};
