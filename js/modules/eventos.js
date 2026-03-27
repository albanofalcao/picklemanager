'use strict';

/**
 * EventoModule — Complete CRUD module for managing pickleball events
 */
const EventoModule = {
  STORAGE_KEY: 'eventos',

  _state: {
    search:       '',
    filterStatus: '',
    filterTipo:   '',
  },

  STATUS: {
    planejado:    { label: 'Planejado',     badge: 'badge-blue'    },
    aberto:       { label: 'Inscrições abertas', badge: 'badge-success' },
    em_andamento: { label: 'Em andamento',  badge: 'badge-warning' },
    concluido:    { label: 'Concluído',     badge: 'badge-gray'    },
    cancelado:    { label: 'Cancelado',     badge: 'badge-danger'  },
  },

  TIPO: {
    torneio:    'Torneio',
    campeonato: 'Campeonato',
    clinica:    'Clínica / Workshop',
    social:     'Jogo Social',
    amistoso:   'Amistoso',
    outro:      'Outro',
  },

  NIVEL: {
    aberto:        'Aberto a todos',
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    profissional:  'Profissional',
  },

  TIPO_ICON: {
    torneio: '🏆', campeonato: '🥇', clinica: '📚',
    social: '🎉', amistoso: '🤝', outro: '📌',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterStatus, filterTipo } = this._state;
    return this.getAll()
      .slice()
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .filter(e => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          e.nome.toLowerCase().includes(q) ||
          (e.descricao && e.descricao.toLowerCase().includes(q)) ||
          (e.arenaNome && e.arenaNome.toLowerCase().includes(q));
        const matchStatus = !filterStatus || e.status === filterStatus;
        const matchTipo   = !filterTipo   || e.tipo   === filterTipo;
        return matchSearch && matchStatus && matchTipo;
      });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:       all.length,
      proximos:    all.filter(e => e.status === 'planejado' || e.status === 'aberto').length,
      andamento:   all.filter(e => e.status === 'em_andamento').length,
      concluidos:  all.filter(e => e.status === 'concluido').length,
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
          <h2>Eventos</h2>
          <p>Organize torneios, campeonatos e eventos especiais da academia</p>
        </div>
        <button class="btn btn-primary" onclick="EventoModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Evento
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">🏆</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Eventos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.proximos}</div>
            <div class="stat-label">Próximos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">⚡</div>
          <div class="stat-info">
            <div class="stat-value">${stats.andamento}</div>
            <div class="stat-label">Em andamento</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.concluidos}</div>
            <div class="stat-label">Concluídos</div>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por nome, descrição ou arena…"
            value="${UI.escape(this._state.search)}"
            oninput="EventoModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="EventoModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS).map(([k, v]) =>
            `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <select class="filter-select" onchange="EventoModule.handleFilterTipo(this.value)">
          <option value="">Todos os tipos</option>
          ${CadastrosModule.getTiposEvento().map(t =>
            `<option value="${UI.escape(t.nome)}" ${this._state.filterTipo === t.nome ? 'selected' : ''}>${UI.escape(t.nome)}</option>`
          ).join('')}
        </select>
        <span class="results-count">
          ${filtered.length} evento${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div class="cards-grid" id="eventos-grid">
        ${filtered.length
          ? filtered.map(e => this.renderCard(e)).join('')
          : this.renderEmpty()
        }
      </div>
    `;
  },

  renderCard(e) {
    const status = this.STATUS[e.status] || { label: e.status, badge: 'badge-gray' };
    const tipo   = this.TIPO[e.tipo]     || e.tipo   || '—';
    const nivel  = this.NIVEL[e.nivel]   || e.nivel  || '—';
    const icon   = this.TIPO_ICON[e.tipo] || '📌';

    const dataInicio = e.data    ? this._formatData(e.data)    : '—';
    const dataFim    = e.dataFim ? this._formatData(e.dataFim) : null;
    const periodoStr = dataFim ? `${dataInicio} até ${dataFim}` : dataInicio;

    const hora = (e.horarioInicio && e.horarioFim)
      ? `${UI.escape(e.horarioInicio)} – ${UI.escape(e.horarioFim)}`
      : e.horarioInicio ? UI.escape(e.horarioInicio) : '—';

    const inscricao = e.valorInscricao
      ? parseFloat(e.valorInscricao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Gratuito';

    const descBlock = e.descricao
      ? `<div class="arena-obs"><div class="arena-obs-text">💬 ${UI.escape(e.descricao)}</div></div>`
      : '';

    return `
      <div class="arena-card evento-card" data-id="${e.id}" data-status="${UI.escape(e.status)}">
        <div class="evento-card-top">
          <span class="card-status-badge">
            <span class="badge ${status.badge}">${status.label}</span>
          </span>
          <div class="evento-icon-wrap">${icon}</div>
          <div class="arena-name">${UI.escape(e.nome)}</div>
          <span class="arena-code">${UI.escape(tipo)}</span>
        </div>

        <div class="arena-details">
          <div class="detail-item">
            <div class="detail-label">Data</div>
            <div class="detail-value">${UI.escape(periodoStr)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Horário</div>
            <div class="detail-value">${hora}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Arena</div>
            <div class="detail-value">${UI.escape(e.arenaNome || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Nível</div>
            <div class="detail-value">${UI.escape(nivel)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Vagas</div>
            <div class="detail-value">${e.vagas ? UI.escape(String(e.vagas)) : '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Inscrição</div>
            <div class="detail-value ${e.valorInscricao ? '' : 'yes'}">${UI.escape(inscricao)}</div>
          </div>
        </div>

        ${descBlock}

        <div class="arena-actions">
          <button class="btn btn-secondary btn-sm" onclick="EventoModule.openModal('${e.id}')">
            ✏️ Editar
          </button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="EventoModule.deleteEvento('${e.id}')" title="Excluir">
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
          <div class="empty-title">Nenhum evento encontrado</div>
          <div class="empty-desc">Nenhum evento corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="EventoModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🏆</div>
        <div class="empty-title">Nenhum evento cadastrado</div>
        <div class="empty-desc">Crie o primeiro torneio ou evento especial da academia.</div>
        <button class="btn btn-primary mt-16" onclick="EventoModule.openModal()">+ Criar primeiro evento</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const evento = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!evento;
    const v      = (field, fallback = '') => evento ? UI.escape(String(evento[field] ?? fallback)) : fallback;

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOptions = `<option value="">— Selecionar —</option>` +
      arenas.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
          ${evento && evento.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)} (${UI.escape(a.codigo)})</option>`
      ).join('');

    const tipoOptions = CadastrosModule.buildOptions(
      CadastrosModule.getTiposEvento(),
      evento ? (evento.tipo || '') : ''
    );
    const nivelOptions  = ListasService.opts('eventos_nivel', evento?.nivel || '');
    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${evento && evento.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="ev-nome">Nome do evento <span class="required-star">*</span></label>
          <input id="ev-nome" type="text" class="form-input"
            placeholder="ex: 1º Torneio Open da Academia"
            value="${v('nome')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-tipo">Tipo</label>
            <select id="ev-tipo" class="form-select">${tipoOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-nivel">Nível</label>
            <select id="ev-nivel" class="form-select">${nivelOptions}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-data">Data de início <span class="required-star">*</span></label>
            <input id="ev-data" type="date" class="form-input" value="${v('data')}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-datafim">Data de fim <span class="form-hint">(opcional)</span></label>
            <input id="ev-datafim" type="date" class="form-input" value="${v('dataFim')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-hinicio">Horário início</label>
            <input id="ev-hinicio" type="time" class="form-input" value="${v('horarioInicio')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-hfim">Horário fim</label>
            <input id="ev-hfim" type="time" class="form-input" value="${v('horarioFim')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-arena">Arena</label>
            <select id="ev-arena" class="form-select">${arenaOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-vagas">Vagas</label>
            <input id="ev-vagas" type="number" class="form-input"
              placeholder="ex: 16" min="1" value="${v('vagas')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-valor">Valor de inscrição (R$) <span class="form-hint">(0 = gratuito)</span></label>
            <input id="ev-valor" type="number" class="form-input"
              placeholder="0,00" min="0" step="0.01" value="${v('valorInscricao', '0')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-status">Status</label>
            <select id="ev-status" class="form-select">${statusOptions}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="ev-desc">Descrição</label>
          <textarea id="ev-desc" class="form-textarea"
            placeholder="Descreva o evento, regras, premiação…" rows="3">${evento ? UI.escape(evento.descricao || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Evento — ${evento.nome}` : 'Novo Evento',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Criar Evento',
      onConfirm:    () => this.saveEvento(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  saveEvento(id = null) {
    const g    = n => document.getElementById(`ev-${n}`);
    const nome = g('nome');
    const data = g('data');

    let valid = true;
    [nome, data].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    const arenaSel  = g('arena');
    const arenaId   = arenaSel ? arenaSel.value : '';
    const arenaNome = arenaSel && arenaSel.selectedOptions[0]
      ? (arenaSel.selectedOptions[0].dataset.nome || '') : '';

    const record = {
      nome:           nome.value.trim(),
      tipo:           g('tipo')    ? g('tipo').value                        : 'torneio',
      nivel:          g('nivel')   ? g('nivel').value                       : 'aberto',
      data:           data.value,
      dataFim:        g('datafim') ? g('datafim').value                     : '',
      horarioInicio:  g('hinicio') ? g('hinicio').value                     : '',
      horarioFim:     g('hfim')    ? g('hfim').value                        : '',
      arenaId,
      arenaNome,
      vagas:          g('vagas')   ? parseInt(g('vagas').value, 10) || 0    : 0,
      valorInscricao: g('valor')   ? parseFloat(g('valor').value)   || 0    : 0,
      status:         g('status')  ? g('status').value                      : 'planejado',
      descricao:      g('desc')    ? g('desc').value.trim()                 : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, record);
      UI.toast(`Evento "${record.nome}" atualizado com sucesso!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, record);
      UI.toast(`Evento "${record.nome}" criado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteEvento(id) {
    const evento = Storage.getById(this.STORAGE_KEY, id);
    if (!evento) return;

    const confirmed = await UI.confirm(
      `Deseja realmente excluir o evento "${evento.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Evento'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Evento "${evento.nome}" excluído.`, 'success');
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
    const grid = document.getElementById('eventos-grid');
    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map(e => this.renderCard(e)).join('')
        : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} evento${filtered.length !== 1 ? 's' : ''}`;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _formatData(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  },
};
