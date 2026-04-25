'use strict';

/**
 * AulaModule — Complete CRUD module for managing pickleball classes
 */
const AulaModule = {
  STORAGE_KEY: 'aulas',

  _state: {
    search:        '',
    filterStatus:  '',
    filterTipo:    '',
    filterNivel:   '',
  },

  STATUS: {
    agendada:      { label: 'Agendada',       badge: 'badge-blue'    },
    em_andamento:  { label: 'Em andamento',   badge: 'badge-warning' },
    concluida:     { label: 'Concluída',      badge: 'badge-success' },
    cancelada:     { label: 'Cancelada',      badge: 'badge-danger'  },
  },

  TIPO: {
    individual: 'Individual',
    dupla:      'Dupla',
    grupo:      'Grupo',
  },

  NIVEL: {
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    profissional:  'Profissional',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  /** Return sorted by data desc, then filtered */
  getFiltered() {
    const { search, filterStatus, filterTipo, filterNivel } = this._state;
    return this.getAll()
      .slice()
      .sort((a, b) => {
        const da = a.data + (a.horarioInicio || '');
        const db = b.data + (b.horarioInicio || '');
        return db.localeCompare(da);
      })
      .filter(a => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          a.titulo.toLowerCase().includes(q) ||
          (a.professorNome && a.professorNome.toLowerCase().includes(q)) ||
          (a.arenaNome     && a.arenaNome.toLowerCase().includes(q));
        const matchStatus = !filterStatus || a.status === filterStatus;
        const matchTipo   = !filterTipo   || a.tipo   === filterTipo;
        const matchNivel  = !filterNivel  || a.nivel  === filterNivel;
        return matchSearch && matchStatus && matchTipo && matchNivel;
      });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:       all.length,
      agendadas:   all.filter(a => a.status === 'agendada').length,
      concluidas:  all.filter(a => a.status === 'concluida').length,
      canceladas:  all.filter(a => a.status === 'cancelada').length,
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
          <h2>Aulas</h2>
          <p>Agendamento e gestão de aulas individuais e em grupo</p>
        </div>
        <button class="btn btn-primary" onclick="AulaModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Aula
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">🏸</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Aulas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.agendadas}</div>
            <div class="stat-label">Agendadas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.concluidas}</div>
            <div class="stat-label">Concluídas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gray">❌</div>
          <div class="stat-info">
            <div class="stat-value">${stats.canceladas}</div>
            <div class="stat-label">Canceladas</div>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por título, professor ou arena…"
            value="${UI.escape(this._state.search)}"
            oninput="AulaModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="AulaModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS).map(([k, v]) =>
            `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <select class="filter-select" onchange="AulaModule.handleFilterTipo(this.value)">
          <option value="">Todos os tipos</option>
          ${CadastrosModule.getTiposAula().map(t =>
            `<option value="${UI.escape(t.nome)}" ${this._state.filterTipo === t.nome ? 'selected' : ''}>${UI.escape(t.nome)}</option>`
          ).join('')}
        </select>
        <select class="filter-select" onchange="AulaModule.handleFilterNivel(this.value)">
          <option value="">Todos os níveis</option>
          ${ListasService.opts('aulas_nivel', this._state.filterNivel)}
        </select>
        <span class="results-count">
          ${filtered.length} aula${filtered.length !== 1 ? 's' : ''}
        </span>
        <button class="btn btn-secondary btn-sm" onclick="AulaModule._exportExcel()" title="Exportar para Excel">
          ⬇ Excel
        </button>
      </div>

      <div class="alunos-table-wrap" id="aulas-list">
        ${filtered.length ? this.renderTable(filtered) : this.renderEmpty()}
      </div>
    `;
  },

  renderTable(aulas) {
    const rows = aulas.map(a => {
      const status = this.STATUS[a.status] || { label: a.status, badge: 'badge-gray' };
      const tipo   = this.TIPO[a.tipo]     || a.tipo   || '—';
      const nivel  = this.NIVEL[a.nivel]   || a.nivel  || '—';
      const data   = a.data ? this._formatData(a.data) : '—';
      const hora   = (a.horarioInicio && a.horarioFim)
        ? `${UI.escape(a.horarioInicio)} – ${UI.escape(a.horarioFim)}`
        : a.horarioInicio ? UI.escape(a.horarioInicio) : '—';

      const rowClass = a.status === 'cancelada' ? 'aula-row-cancelada' : '';

      return `
        <tr class="${rowClass}">
          <td>
            <div class="aluno-nome">${UI.escape(a.titulo)}</div>
            <div class="aluno-sub">${UI.escape(tipo)} · ${UI.escape(nivel)}</div>
          </td>
          <td>
            <div class="font-bold">${data}</div>
            <div class="aluno-sub">${hora}</div>
          </td>
          <td>${UI.escape(a.professorNome || '—')}</td>
          <td>${UI.escape(a.arenaNome || '—')}</td>
          <td class="text-center">${a.vagas ? UI.escape(String(a.vagas)) : '—'}</td>
          <td><span class="badge ${status.badge}">${status.label}</span></td>
          <td>${this._renderPresencaCell(a)}</td>
          <td class="text-center">${PresencaModule.getBadge(a.id)}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="PresencaModule.abrirModal('${a.id}')" title="Gerenciar presença de alunos">👥</button>
            <button class="btn btn-ghost btn-sm" onclick="AulaModule.openModal('${a.id}')" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-sm danger" onclick="AulaModule.deleteAula('${a.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Título / Tipo</th>
              <th>Data / Horário</th>
              <th>Professor</th>
              <th>Arena</th>
              <th class="text-center">Vagas</th>
              <th>Status</th>
              <th>Presença Prof.</th>
              <th class="text-center">Alunos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterStatus || this._state.filterTipo || this._state.filterNivel;
    if (isFiltered) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhuma aula encontrada</div>
          <div class="empty-desc">Nenhuma aula corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="AulaModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state">
        <div class="empty-icon">🏸</div>
        <div class="empty-title">Nenhuma aula cadastrada</div>
        <div class="empty-desc">Comece agendando a primeira aula da academia.</div>
        <button class="btn btn-primary mt-16" onclick="AulaModule.openModal()">+ Agendar primeira aula</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const aula   = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!aula;
    const v      = (field, fallback = '') => aula ? UI.escape(String(aula[field] ?? fallback)) : fallback;

    // Build professor options from storage
    const professores = Storage.getAll('professores').filter(p => p.status === 'ativo');
    const profOptions = `<option value="">— Selecionar —</option>` +
      professores.map(p =>
        `<option value="${p.id}" data-nome="${UI.escape(p.nome)}"
          ${aula && aula.professorId === p.id ? 'selected' : ''}>${UI.escape(p.nome)}</option>`
      ).join('');

    // Build arena options from storage
    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOptions = `<option value="">— Selecionar —</option>` +
      arenas.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
          ${aula && aula.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)} (${UI.escape(a.codigo)})</option>`
      ).join('');

    const tipoOptions = CadastrosModule.buildOptions(
      CadastrosModule.getTiposAula(),
      aula ? (aula.tipo || '') : ''
    );
    const nivelOptions  = ListasService.opts('aulas_nivel', aula?.nivel || '');
    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${aula && aula.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="au-titulo">Título da aula <span class="required-star">*</span></label>
          <input id="au-titulo" type="text" class="form-input"
            placeholder="ex: Aula de Saque e Devolução"
            value="${v('titulo')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-tipo">Tipo</label>
            <select id="au-tipo" class="form-select">${tipoOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="au-nivel">Nível</label>
            <select id="au-nivel" class="form-select">${nivelOptions}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-professor">Professor</label>
            <select id="au-professor" class="form-select">${profOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="au-arena">Arena</label>
            <select id="au-arena" class="form-select">${arenaOptions}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-data">Data <span class="required-star">*</span></label>
            <input id="au-data" type="date" class="form-input" value="${v('data')}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="au-vagas">Vagas</label>
            <input id="au-vagas" type="number" class="form-input"
              placeholder="ex: 4" min="1" max="20" value="${v('vagas', '4')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-hinicio">Horário início</label>
            <input id="au-hinicio" type="time" class="form-input" value="${v('horarioInicio')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="au-hfim">Horário fim</label>
            <input id="au-hfim" type="time" class="form-input" value="${v('horarioFim')}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="au-status">Status</label>
          <select id="au-status" class="form-select">${statusOptions}</select>
        </div>

        <div class="form-group">
          <label class="form-label" for="au-obs">Observações</label>
          <textarea id="au-obs" class="form-textarea"
            placeholder="Informações adicionais sobre a aula…" rows="2">${aula ? UI.escape(aula.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Aula — ${aula.titulo}` : 'Nova Aula',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Agendar Aula',
      onConfirm:    () => this.saveAula(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  saveAula(id = null) {
    const g      = n => document.getElementById(`au-${n}`);
    const titulo = g('titulo');
    const data   = g('data');

    let valid = true;
    [titulo, data].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    // Resolve professor name
    const profSel   = g('professor');
    const profId    = profSel ? profSel.value : '';
    const profNome  = profSel && profSel.selectedOptions[0]
      ? (profSel.selectedOptions[0].dataset.nome || '')
      : '';

    // Resolve arena name
    const arenaSel  = g('arena');
    const arenaId   = arenaSel ? arenaSel.value : '';
    const arenaNome = arenaSel && arenaSel.selectedOptions[0]
      ? (arenaSel.selectedOptions[0].dataset.nome || '')
      : '';

    const record = {
      titulo:        titulo.value.trim(),
      tipo:          g('tipo')    ? g('tipo').value                     : 'grupo',
      nivel:         g('nivel')   ? g('nivel').value                    : 'iniciante',
      professorId:   profId,
      professorNome: profNome,
      arenaId:       arenaId,
      arenaNome:     arenaNome,
      data:          data.value,
      vagas:         g('vagas')   ? parseInt(g('vagas').value, 10) || 4  : 4,
      horarioInicio: g('hinicio') ? g('hinicio').value                  : '',
      horarioFim:    g('hfim')    ? g('hfim').value                     : '',
      status:        g('status')  ? g('status').value                   : 'agendada',
      observacoes:   g('obs')     ? g('obs').value.trim()               : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, record);
      UI.toast(`Aula "${record.titulo}" atualizada com sucesso!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, record);
      UI.toast(`Aula "${record.titulo}" agendada com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteAula(id) {
    const aula = Storage.getById(this.STORAGE_KEY, id);
    if (!aula) return;

    const confirmed = await UI.confirm(
      `Deseja realmente excluir a aula "${aula.titulo}"? Esta ação não pode ser desfeita.`,
      'Excluir Aula'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Aula "${aula.titulo}" excluída.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Filter handlers                                                     */
  /* ------------------------------------------------------------------ */

  handleSearch(value) {
    this._state.search = value;
    this._reRender();
  },

  handleFilterStatus(value) {
    this._state.filterStatus = value;
    this._reRender();
  },

  handleFilterTipo(value) {
    this._state.filterTipo = value;
    this._reRender();
  },

  handleFilterNivel(value) {
    this._state.filterNivel = value;
    this._reRender();
  },

  clearFilters() {
    this._state.search       = '';
    this._state.filterStatus = '';
    this._state.filterTipo   = '';
    this._state.filterNivel  = '';
    this.render();
  },

  _reRender() {
    const filtered = this.getFiltered();
    const list = document.getElementById('aulas-list');
    if (list) {
      list.innerHTML = filtered.length ? this.renderTable(filtered) : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} aula${filtered.length !== 1 ? 's' : ''}`;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Professor check-in / check-out                                     */
  /* ------------------------------------------------------------------ */

  professorCheckin(id) {
    const aula = Storage.getById(this.STORAGE_KEY, id);
    if (!aula) return;
    if (aula.professorCheckin) {
      UI.toast('Entrada já registrada para esta aula.', 'warning');
      return;
    }
    Storage.update(this.STORAGE_KEY, id, {
      professorCheckin: new Date().toISOString(),
      status: aula.status === 'agendada' ? 'em_andamento' : aula.status,
    });
    const hora = this._fmtTimestamp(new Date().toISOString());
    UI.toast(`Entrada do professor registrada às ${hora} — "${aula.titulo}"`, 'success');
    this.render();
  },

  async professorCheckout(id) {
    const aula = Storage.getById(this.STORAGE_KEY, id);
    if (!aula) return;
    if (!aula.professorCheckin) {
      UI.toast('Registre a entrada antes de registrar a saída.', 'warning');
      return;
    }
    if (aula.professorCheckout) {
      UI.toast('Saída já registrada para esta aula.', 'warning');
      return;
    }
    const confirmed = await UI.confirm(
      `Registrar saída do professor da aula "${aula.titulo}"? O status será alterado para Concluída.`,
      'Confirmar Saída'
    );
    if (!confirmed) return;
    Storage.update(this.STORAGE_KEY, id, {
      professorCheckout: new Date().toISOString(),
      status: 'concluida',
    });
    const hora = this._fmtTimestamp(new Date().toISOString());
    UI.toast(`Saída registrada às ${hora} — aula "${aula.titulo}" concluída.`, 'success');
    this.render();
  },

  _renderPresencaCell(a) {
    const cancelada = a.status === 'cancelada';
    if (cancelada) return '<span class="text-muted">—</span>';

    const temEntrada = !!a.professorCheckin;
    const temSaida   = !!a.professorCheckout;

    if (temEntrada && temSaida) {
      return `
        <div class="presenca-cell">
          <span class="presenca-tag presenca-entrada">▶ ${this._fmtTimestamp(a.professorCheckin)}</span>
          <span class="presenca-tag presenca-saida">■ ${this._fmtTimestamp(a.professorCheckout)}</span>
        </div>`;
    }

    if (temEntrada) {
      return `
        <div class="presenca-cell">
          <span class="presenca-tag presenca-entrada">▶ ${this._fmtTimestamp(a.professorCheckin)}</span>
          <button class="btn btn-ghost btn-sm presenca-checkout"
            onclick="AulaModule.professorCheckout('${a.id}')" title="Registrar saída">
            ■ Saída
          </button>
        </div>`;
    }

    const podeCheckin = ['agendada', 'em_andamento'].includes(a.status);
    if (podeCheckin) {
      return `
        <button class="btn btn-ghost btn-sm presenca-checkin"
          onclick="AulaModule.professorCheckin('${a.id}')" title="Registrar entrada do professor">
          ▶ Entrada
        </button>`;
    }

    return '<span class="text-muted">—</span>';
  },

  _fmtTimestamp(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _formatData(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    const date = new Date(+y, +m - 1, +d);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  /* ------------------------------------------------------------------ */
  /*  Exportar para Excel                                                 */
  /* ------------------------------------------------------------------ */

  _exportExcel() {
    const filtered = this._getFiltered();
    if (!filtered.length) { UI.toast('Nenhuma aula para exportar', 'warning'); return; }

    const headers = ['Título', 'Data', 'Início', 'Fim', 'Tipo', 'Nível', 'Professor', 'Arena', 'Vagas', 'Status'];
    const rows = filtered.map(a => [
      a.titulo          || '',
      ExportService.fmtData(a.data),
      a.horarioInicio   || '',
      a.horarioFim      || '',
      a.tipo            || '',
      a.nivel           || '',
      a.professorNome   || '',
      a.arenaNome       || '',
      a.vagas           ?? '',
      a.status          || '',
    ]);

    ExportService.toXLSX('picklemanager_aulas', headers, rows, 'Aulas');
  },
};
