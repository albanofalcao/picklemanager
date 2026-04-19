'use strict';

/**
 * PlanoModule — Complete CRUD module for managing subscription plans
 */
const PlanoModule = {
  STORAGE_KEY: 'planos',

  _state: {
    search:       '',
    filterStatus: '',
    filterTipo:   '',
  },

  STATUS: {
    ativo:    { label: 'Ativo',    badge: 'badge-success' },
    inativo:  { label: 'Inativo',  badge: 'badge-gray'    },
    pausado:  { label: 'Pausado',  badge: 'badge-warning' },
  },

  TIPO: {
    mensal:    'Mensal',
    trimestral:'Trimestral',
    semestral: 'Semestral',
    anual:     'Anual',
    avulso:    'Aula Avulsa',
    pacote:    'Pacote de Aulas',
  },

  ESPORTE: {
    pickleball: 'Pickleball',
    padel:      'Padel',
    tenis:      'Tênis',
    beach:      'Beach Tennis',
    outro:      'Outro',
  },

  NIVEL_PLANO: {
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    profissional:  'Profissional',
  },

  TIPO_PLANO: {
    personal:  'Personal',
    coletivo:  'Coletivo',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterStatus, filterTipo } = this._state;
    return this.getAll().filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.nome.toLowerCase().includes(q) ||
        (p.descricao && p.descricao.toLowerCase().includes(q));
      const matchStatus = !filterStatus || p.status === filterStatus;
      const matchTipo   = !filterTipo   || p.tipo   === filterTipo;
      return matchSearch && matchStatus && matchTipo;
    });
  },

  getStats() {
    const all = this.getAll();
    const totalReceita = all
      .filter(p => p.status === 'ativo')
      .reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
    return {
      total:        all.length,
      ativos:       all.filter(p => p.status === 'ativo').length,
      inativos:     all.filter(p => p.status === 'inativo').length,
      totalReceita,
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
      <div class="page-header">
        <div class="page-header-text">
          <h2>Planos de Contratação</h2>
          <p>Gerencie pacotes, mensalidades e contratos dos alunos</p>
        </div>
        <button class="btn btn-primary" onclick="PlanoModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Plano
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📋</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Planos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.ativos}</div>
            <div class="stat-label">Ativos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gray">⚪</div>
          <div class="stat-info">
            <div class="stat-value">${stats.inativos}</div>
            <div class="stat-label">Inativos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">💰</div>
          <div class="stat-info">
            <div class="stat-value">${this._formatMoeda(stats.totalReceita)}</div>
            <div class="stat-label">Receita Potencial / mês</div>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por nome ou descrição…"
            value="${UI.escape(this._state.search)}"
            oninput="PlanoModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="PlanoModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS).map(([k, v]) =>
            `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <select class="filter-select" onchange="PlanoModule.handleFilterTipo(this.value)">
          <option value="">Todos os tipos</option>
          ${ListasService.opts('planos_tipo', this._state.filterTipo)}
        </select>
        <span class="results-count">
          ${filtered.length} plano${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div class="cards-grid" id="planos-grid">
        ${filtered.length
          ? filtered.map(p => this.renderCard(p)).join('')
          : this.renderEmpty()
        }
      </div>
    `;
  },

  renderCard(p) {
    const status  = this.STATUS[p.status] || { label: p.status, badge: 'badge-gray' };
    const tipo    = this.TIPO[p.tipo]     || p.tipo    || '—';
    const cadastro = UI.formatDate(p.createdAt);

    const descBlock = p.descricao
      ? `<div class="arena-obs"><div class="arena-obs-text">💬 ${UI.escape(p.descricao)}</div></div>`
      : '';

    const beneficiosBlock = p.beneficios
      ? `<div class="plano-beneficios">
           ${p.beneficios.split('\n').filter(l => l.trim()).map(l =>
             `<div class="beneficio-item">✓ ${UI.escape(l.trim())}</div>`
           ).join('')}
         </div>`
      : '';

    return `
      <div class="arena-card plano-card" data-id="${p.id}" data-status="${UI.escape(p.status)}">
        <div class="arena-card-top">
          <span class="card-status-badge">
            <span class="badge ${status.badge}">${status.label}</span>
          </span>
          <div class="arena-name">${UI.escape(p.nome)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
            ${p.esporte    ? `<span class="badge badge-blue">${UI.escape(ListasService.label('esporte', p.esporte))}</span>` : ''}
            ${p.tipoplano  ? `<span class="badge badge-success">${UI.escape(ListasService.label('aulas_tipoplano', p.tipoplano))}</span>` : ''}
            ${p.desconto > 0 ? `<span class="badge badge-warning">${p.desconto}% desc.</span>` : ''}
            ${p.arenaNome  ? `<span class="badge badge-gray">${UI.escape(p.arenaNome)}</span>` : ''}
          </div>
          <div class="plano-valor">${this._formatMoeda(p.valor)}<span class="plano-periodo">/${this._periodoLabel(p.tipo)}</span></div>
        </div>

        <div class="arena-details">
          <div class="detail-item">
            <div class="detail-label">Tipo</div>
            <div class="detail-value">${UI.escape(tipo)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Aulas incluídas</div>
            <div class="detail-value">${p.aulasIncluidas ? UI.escape(String(p.aulasIncluidas)) + ' aulas' : '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Cadastrado em</div>
            <div class="detail-value">${cadastro}</div>
          </div>
        </div>

        ${beneficiosBlock}
        ${descBlock}

        <div class="arena-actions">
          <button class="btn btn-secondary btn-sm" onclick="PlanoModule.openModal('${p.id}')">
            ✏️ Editar
          </button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="PlanoModule.deletePlano('${p.id}')" title="Excluir">
            🗑️
          </button>
        </div>
      </div>`;
  },

  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterStatus || this._state.filterTipo;
    if (isFiltered) {
      return `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhum plano encontrado</div>
          <div class="empty-desc">Nenhum plano corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="PlanoModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Nenhum plano cadastrado</div>
        <div class="empty-desc">Comece criando o primeiro plano de contratação da academia.</div>
        <button class="btn btn-primary mt-16" onclick="PlanoModule.openModal()">+ Criar primeiro plano</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const plano  = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!plano;
    const v      = (field, fallback = '') => plano ? UI.escape(String(plano[field] ?? fallback)) : fallback;

    const tipoOptions   = ListasService.opts('planos_tipo', plano?.tipo || '');
    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${plano && plano.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const esporteOpts   = ListasService.opts('esporte',        plano?.esporte   || '');
    const tipoPlanoOpts = ListasService.opts('aulas_tipoplano', plano?.tipoplano || '');

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOpts = arenas.map(a =>
      `<option value="${a.id}" ${plano?.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="pl-nome">Nome do plano <span class="required-star">*</span></label>
          <input id="pl-nome" type="text" class="form-input"
            placeholder="ex: Mensalidade Intermediário"
            value="${v('nome')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pl-tipo">Tipo <span class="required-star">*</span></label>
            <select id="pl-tipo" class="form-select">${tipoOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="pl-status">Status</label>
            <select id="pl-status" class="form-select">${statusOptions}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pl-esporte">Esporte</label>
            <select id="pl-esporte" class="form-select">
              <option value="">— Selecionar —</option>
              ${esporteOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="pl-tipoplano">Tipo de Aula</label>
            <select id="pl-tipoplano" class="form-select">
              <option value="">— Selecionar —</option>
              ${tipoPlanoOpts}
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pl-valor">Valor (R$) <span class="required-star">*</span></label>
            <input id="pl-valor" type="number" class="form-input"
              placeholder="0,00" min="0" step="0.01"
              value="${v('valor')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="pl-aulas">Aulas incluídas</label>
            <input id="pl-aulas" type="number" class="form-input"
              placeholder="ex: 8" min="0" step="1"
              value="${v('aulasIncluidas')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pl-desconto">Desconto (%)</label>
            <input id="pl-desconto" type="number" class="form-input"
              placeholder="ex: 10" min="0" max="100" step="0.01"
              value="${v('desconto')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="pl-arena">Arena</label>
            <select id="pl-arena" class="form-select">
              <option value="">Todas as arenas</option>
              ${arenaOpts}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="pl-beneficios">Benefícios incluídos <span class="form-hint">(um por linha)</span></label>
          <textarea id="pl-beneficios" class="form-textarea"
            placeholder="Acesso a todas as arenas&#10;Aula de avaliação gratuita&#10;Desconto em eventos" rows="4">${plano ? UI.escape(plano.beneficios || '') : ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="pl-desc">Descrição</label>
          <textarea id="pl-desc" class="form-textarea"
            placeholder="Descreva o plano em detalhes…" rows="2">${plano ? UI.escape(plano.descricao || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Plano — ${plano.nome}` : 'Novo Plano',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Criar Plano',
      onConfirm:    () => this.savePlano(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  savePlano(id = null) {
    const g    = n => document.getElementById(`pl-${n}`);
    const nome  = g('nome');
    const valor = g('valor');

    let valid = true;
    [nome, valor].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim() || (el === valor && isNaN(parseFloat(el.value)));
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    const data = {
      nome:          nome.value.trim(),
      tipo:          g('tipo')      ? g('tipo').value                      : 'mensal',
      esporte:       g('esporte')   ? g('esporte').value                   : '',
      tipoplano:     g('tipoplano') ? g('tipoplano').value                 : '',
      valor:         parseFloat(valor.value) || 0,
      aulasIncluidas:g('aulas')     ? parseInt(g('aulas').value, 10) || 0  : 0,
      desconto:      g('desconto')  ? parseFloat(g('desconto').value) || 0 : 0,
      arenaId:       g('arena')     ? g('arena').value                     : '',
      arenaNome:     (() => { const el = g('arena'); return el && el.selectedOptions[0] ? el.selectedOptions[0].textContent.trim() : ''; })(),
      status:        g('status')    ? g('status').value                    : 'ativo',
      beneficios:    g('beneficios')? g('beneficios').value.trim()         : '',
      descricao:     g('desc')      ? g('desc').value.trim()               : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      UI.toast(`Plano "${data.nome}" atualizado com sucesso!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, data);
      UI.toast(`Plano "${data.nome}" criado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deletePlano(id) {
    const plano = Storage.getById(this.STORAGE_KEY, id);
    if (!plano) return;

    const vinculos = Storage.getAll('matriculas').filter(r => r.planoId === id).length;

    if (vinculos > 0) {
      const inativar = await UI.confirm(
        `"${plano.nome}" possui ${vinculos} matrícula(s) vinculada(s). Não é possível excluir.\n\nDeseja pausar o plano em vez disso?`,
        'Não é possível excluir',
        'Pausar'
      );
      if (!inativar) return;
      Storage.update(this.STORAGE_KEY, id, { status: 'pausado' });
      UI.toast(`Plano "${plano.nome}" pausado.`, 'success');
      this.render();
      return;
    }

    const confirmed = await UI.confirm(
      `Excluir o plano "${plano.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Plano'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Plano "${plano.nome}" excluído.`, 'success');
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

  _reRenderCards() {
    const filtered = this.getFiltered();
    const grid = document.getElementById('planos-grid');
    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map(p => this.renderCard(p)).join('')
        : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} plano${filtered.length !== 1 ? 's' : ''}`;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _formatMoeda(valor) {
    const n = parseFloat(valor) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  _periodoLabel(tipo) {
    const map = { mensal: 'mês', trimestral: 'trim.', semestral: 'sem.', anual: 'ano', avulso: 'aula', pacote: 'pacote' };
    return map[tipo] || tipo;
  },
};
