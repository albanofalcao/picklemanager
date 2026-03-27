'use strict';

/**
 * ArenaModule — Complete CRUD module for managing pickleball arenas
 */
const ArenaModule = {
  STORAGE_KEY: 'arenas',

  _state: {
    search:       '',
    filterStatus: '',
    filterTipo:   '',
  },

  /** Status configuration: value → { label, badge class } */
  STATUS: {
    ativa:      { label: 'Ativa',          badge: 'badge-success' },
    inativa:    { label: 'Inativa',        badge: 'badge-gray'    },
    manutencao: { label: 'Em Manutenção',  badge: 'badge-warning' },
  },

  /** Status cycle order for toggleStatus */
  _STATUS_CYCLE: ['ativa', 'manutencao', 'inativa'],

  TIPO: {
    indoor:  'Indoor (Coberta)',
    outdoor: 'Outdoor (Descoberta)',
  },

  PISO: {
    sintetico: 'Sintético',
    madeira:   'Madeira',
    concreto:  'Concreto',
    outro:     'Outro',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  /** Return arenas filtered by current _state (search + status + tipo) */
  getFiltered() {
    const { search, filterStatus, filterTipo } = this._state;
    return this.getAll().filter(arena => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        arena.nome.toLowerCase().includes(q) ||
        arena.codigo.toLowerCase().includes(q);
      const matchStatus = !filterStatus || arena.status === filterStatus;
      const matchTipo   = !filterTipo   || arena.tipo   === filterTipo;
      return matchSearch && matchStatus && matchTipo;
    });
  },

  /** Aggregate counts for the stats cards */
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
    const stats    = this.getStats();
    const filtered = this.getFiltered();
    const area     = document.getElementById('content-area');
    if (!area) return;

    area.innerHTML = `
      <!-- Page header -->
      <div class="page-header">
        <div class="page-header-text">
          <h2>Arenas</h2>
          <p>Gerencie as quadras e arenas da academia</p>
        </div>
        <button class="btn btn-primary" onclick="ArenaModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Arena
        </button>
      </div>

      <!-- Stats -->
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
          <div class="stat-icon gray">⚪</div>
          <div class="stat-info">
            <div class="stat-value">${stats.inativas}</div>
            <div class="stat-label">Inativas</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por nome ou código…"
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
        <select class="filter-select" onchange="ArenaModule.handleFilterTipo(this.value)">
          <option value="">Todos os tipos</option>
          ${ListasService.opts('arenas_tipo', this._state.filterTipo)}
        </select>
        <span class="results-count">
          ${filtered.length} arena${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <!-- Cards -->
      <div class="cards-grid" id="arenas-grid">
        ${filtered.length
          ? filtered.map(a => this.renderCard(a)).join('')
          : this.renderEmpty()
        }
      </div>
    `;
  },

  /** Empty state HTML — different message for filtered vs. truly empty */
  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterStatus || this._state.filterTipo;
    if (isFiltered) {
      return `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhuma arena encontrada</div>
          <div class="empty-desc">Nenhuma arena corresponde aos filtros aplicados. Tente ajustar os critérios de busca.</div>
          <button class="btn btn-secondary mt-16" onclick="ArenaModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🏟️</div>
        <div class="empty-title">Nenhuma arena cadastrada</div>
        <div class="empty-desc">Comece adicionando a primeira arena da academia para gerenciá-la aqui.</div>
        <button class="btn btn-primary mt-16" onclick="ArenaModule.openModal()">
          + Cadastrar primeira arena
        </button>
      </div>`;
  },

  /** Generate the full HTML for a single arena card */
  renderCard(arena) {
    const status   = this.STATUS[arena.status] || { label: arena.status, badge: 'badge-gray' };
    const tipo     = this.TIPO[arena.tipo]     || arena.tipo;
    const piso     = this.PISO[arena.piso]     || arena.piso;
    const ilum     = arena.iluminacao
      ? '<span class="detail-value yes">✓ Sim</span>'
      : '<span class="detail-value no">✗ Não</span>';
    const createdAt = UI.formatDate(arena.createdAt);

    const obsBlock = arena.observacoes
      ? `<div class="arena-obs">
           <div class="arena-obs-text">💬 ${UI.escape(arena.observacoes)}</div>
         </div>`
      : '';

    return `
      <div class="arena-card" data-id="${arena.id}" data-status="${UI.escape(arena.status)}">
        <div class="arena-card-top">
          <span class="card-status-badge">
            <span class="badge ${status.badge}">${status.label}</span>
          </span>
          <div class="arena-name">${UI.escape(arena.nome)}</div>
          <span class="arena-code">${UI.escape(arena.codigo)}</span>
        </div>

        <div class="arena-details">
          <div class="detail-item">
            <div class="detail-label">Tipo</div>
            <div class="detail-value">${UI.escape(tipo)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Dimensões</div>
            <div class="detail-value">${UI.escape(arena.dimensoes || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Piso</div>
            <div class="detail-value">${UI.escape(piso)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Capacidade</div>
            <div class="detail-value">${UI.escape(String(arena.capacidade || '—'))} jogadores</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Iluminação</div>
            ${ilum}
          </div>
          <div class="detail-item">
            <div class="detail-label">Cadastrado em</div>
            <div class="detail-value">${createdAt}</div>
          </div>
        </div>

        ${obsBlock}

        <div class="arena-actions">
          <button class="btn btn-secondary btn-sm" onclick="ArenaModule.openModal('${arena.id}')">
            ✏️ Editar
          </button>
          <button class="btn btn-ghost btn-sm" onclick="ArenaModule.toggleStatus('${arena.id}')" title="Alternar status">
            🔄 Status
          </button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="ArenaModule.deleteArena('${arena.id}')" title="Excluir arena">
            🗑️
          </button>
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Open the add/edit modal.
   * @param {string|null} id - if provided, load existing arena for editing
   */
  openModal(id = null) {
    const arena  = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!arena;
    const v      = (field, fallback = '') => arena ? UI.escape(String(arena[field] ?? fallback)) : fallback;

    const tipoOptions  = ListasService.opts('arenas_tipo',  arena?.tipo || '');
    const pisoOptions  = ListasService.opts('arenas_piso',  arena?.piso || '');
    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${arena && arena.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const checked = arena && arena.iluminacao ? 'checked' : '';

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
            <label class="form-label" for="f-codigo">Código <span class="required-star">*</span></label>
            <input id="f-codigo" name="codigo" type="text" class="form-input"
              placeholder="ex: AC"
              value="${v('codigo')}" required maxlength="10" autocomplete="off"
              oninput="this.value=this.value.toUpperCase()" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="f-tipo">Tipo</label>
            <select id="f-tipo" name="tipo" class="form-select">
              ${tipoOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f-capacidade">Capacidade (jogadores)</label>
            <input id="f-capacidade" name="capacidade" type="number" class="form-input"
              min="1" max="20" value="${v('capacidade', '4')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="f-dimensoes">Dimensões</label>
            <input id="f-dimensoes" name="dimensoes" type="text" class="form-input"
              placeholder="ex: 6.10m × 13.72m"
              value="${v('dimensoes')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-piso">Tipo de Piso</label>
            <select id="f-piso" name="piso" class="form-select">
              ${pisoOptions}
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="f-status">Status</label>
            <select id="f-status" name="status" class="form-select">
              ${statusOptions}
            </select>
          </div>
          <div class="form-group" style="justify-content:flex-end;padding-top:22px;">
            <label class="form-toggle" for="f-iluminacao">
              <input type="checkbox" id="f-iluminacao" name="iluminacao" class="toggle-input" ${checked} />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
              <span class="toggle-label-text">Iluminação artificial</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="f-obs">Observações</label>
          <textarea id="f-obs" name="observacoes" class="form-textarea"
            placeholder="Informações adicionais sobre a arena…" rows="3">${arena ? UI.escape(arena.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:         isEdit ? `Editar Arena — ${arena.nome}` : 'Nova Arena',
      content,
      confirmLabel:  isEdit ? 'Salvar alterações' : 'Cadastrar Arena',
      onConfirm:     () => this.saveArena(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Read form values, validate, then create or update arena.
   * @param {string|null} id
   */
  saveArena(id = null) {
    const getName  = n => document.getElementById(`f-${n}`);
    const nome     = getName('nome');
    const codigo   = getName('codigo');

    // Validate required fields
    let valid = true;
    [nome, codigo].forEach(el => {
      if (!el) return;
      const isEmpty = !el.value.trim();
      el.classList.toggle('error', isEmpty);
      if (isEmpty) valid = false;
    });

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    const data = {
      nome:        nome.value.trim(),
      codigo:      codigo.value.trim().toUpperCase(),
      tipo:        getName('tipo')        ? getName('tipo').value        : 'indoor',
      capacidade:  getName('capacidade') ? parseInt(getName('capacidade').value, 10) || 4 : 4,
      dimensoes:   getName('dimensoes')  ? getName('dimensoes').value.trim()  : '',
      piso:        getName('piso')       ? getName('piso').value        : 'sintetico',
      status:      getName('status')     ? getName('status').value      : 'ativa',
      iluminacao:  !!document.getElementById('f-iluminacao')?.checked,
      observacoes: getName('obs')        ? getName('obs').value.trim()  : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      UI.toast(`Arena "${data.nome}" atualizada com sucesso!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, data);
      UI.toast(`Arena "${data.nome}" cadastrada com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  /**
   * Cycle the arena status: ativa → manutencao → inativa → ativa
   * @param {string} id
   */
  toggleStatus(id) {
    const arena = Storage.getById(this.STORAGE_KEY, id);
    if (!arena) return;

    const cycle   = this._STATUS_CYCLE;
    const current = cycle.indexOf(arena.status);
    const next    = cycle[(current + 1) % cycle.length];
    const nextCfg = this.STATUS[next];

    Storage.update(this.STORAGE_KEY, id, { status: next });
    UI.toast(`Status de "${arena.nome}" alterado para: ${nextCfg.label}`, 'info');
    this.render();
  },

  /**
   * Delete an arena after confirmation.
   * @param {string} id
   */
  async deleteArena(id) {
    const arena = Storage.getById(this.STORAGE_KEY, id);
    if (!arena) return;

    const confirmed = await UI.confirm(
      `Deseja realmente excluir a arena "${arena.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Arena'
    );

    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Arena "${arena.nome}" excluída.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Filter handlers                                                     */
  /* ------------------------------------------------------------------ */

  handleSearch(value) {
    this._state.search = value;
    this._reRenderCards();
  },

  handleFilterStatus(value) {
    this._state.filterStatus = value;
    this._reRenderCards();
  },

  handleFilterTipo(value) {
    this._state.filterTipo = value;
    this._reRenderCards();
  },

  clearFilters() {
    this._state.search       = '';
    this._state.filterStatus = '';
    this._state.filterTipo   = '';
    this.render();
  },

  /**
   * Efficiently update only the cards grid and results count,
   * without rebuilding the entire page.
   */
  _reRenderCards() {
    const filtered = this.getFiltered();
    const grid = document.getElementById('arenas-grid');
    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map(a => this.renderCard(a)).join('')
        : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} arena${filtered.length !== 1 ? 's' : ''}`;
    }
  },
};
