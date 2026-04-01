'use strict';

/**
 * ProfessorModule — Complete CRUD module for managing pickleball instructors
 */
const ProfessorModule = {
  STORAGE_KEY: 'professores',

  _state: {
    search:           '',
    filterStatus:     '',
    filterEspecialidade: '',
  },

  STATUS: {
    ativo:    { label: 'Ativo',    badge: 'badge-success' },
    inativo:  { label: 'Inativo',  badge: 'badge-gray'    },
    ferias:   { label: 'Férias',   badge: 'badge-blue'    },
  },

  ESPECIALIDADE: {
    iniciantes:   'Iniciantes',
    intermediario:'Intermediário',
    avancado:     'Avançado',
    competicao:   'Competição',
    infantil:     'Infantil',
    fisioterapia: 'Fisioterapia / Reabilitação',
  },

  DIAS: {
    seg: 'Seg', ter: 'Ter', qua: 'Qua',
    qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterStatus, filterEspecialidade } = this._state;
    return this.getAll().filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.nome.toLowerCase().includes(q) ||
        (p.email    && p.email.toLowerCase().includes(q)) ||
        (p.cpf      && p.cpf.includes(q)) ||
        (p.telefone && p.telefone.includes(q));
      const matchStatus = !filterStatus || p.status === filterStatus;
      const matchEsp    = !filterEspecialidade || p.especialidade === filterEspecialidade;
      return matchSearch && matchStatus && matchEsp;
    });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:   all.length,
      ativos:  all.filter(p => p.status === 'ativo').length,
      ferias:  all.filter(p => p.status === 'ferias').length,
      inativos:all.filter(p => p.status === 'inativo').length,
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
          <h2>Professores</h2>
          <p>Cadastro de instrutores, horários disponíveis e especialidades</p>
        </div>
        <button class="btn btn-primary" onclick="ProfessorModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Professor
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">🎓</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total</div>
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
          <div class="stat-icon blue">🏖️</div>
          <div class="stat-info">
            <div class="stat-value">${stats.ferias}</div>
            <div class="stat-label">Férias</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gray">⚪</div>
          <div class="stat-info">
            <div class="stat-value">${stats.inativos}</div>
            <div class="stat-label">Inativos</div>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por nome, e-mail, CPF ou telefone…"
            value="${UI.escape(this._state.search)}"
            oninput="ProfessorModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="ProfessorModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          <option value="ativo"   ${this._state.filterStatus === 'ativo'   ? 'selected' : ''}>Ativo</option>
          <option value="ferias"  ${this._state.filterStatus === 'ferias'  ? 'selected' : ''}>Férias</option>
          <option value="inativo" ${this._state.filterStatus === 'inativo' ? 'selected' : ''}>Inativo</option>
        </select>
        <select class="filter-select" onchange="ProfessorModule.handleFilterEsp(this.value)">
          <option value="">Todas as especialidades</option>
          ${CadastrosModule.getEspecialidades().map(e =>
            `<option value="${UI.escape(e.nome)}" ${this._state.filterEspecialidade === e.nome ? 'selected' : ''}>${UI.escape(e.nome)}</option>`
          ).join('')}
        </select>
        <span class="results-count">
          ${filtered.length} professor${filtered.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div class="cards-grid" id="professores-grid">
        ${filtered.length
          ? filtered.map(p => this.renderCard(p)).join('')
          : this.renderEmpty()
        }
      </div>
    `;
  },

  renderCard(p) {
    const status = this.STATUS[p.status] || { label: p.status, badge: 'badge-gray' };
    const esp    = (p.especialidade ? (this.ESPECIALIDADE[p.especialidade] || p.especialidade) : '—');
    const dias   = Array.isArray(p.diasDisponiveis) && p.diasDisponiveis.length
      ? p.diasDisponiveis.map(d => `<span class="dia-chip">${this.DIAS[d] || d}</span>`).join('')
      : '<span class="text-muted text-sm">—</span>';
    const horario = (p.horarioInicio && p.horarioFim)
      ? `${UI.escape(p.horarioInicio)} – ${UI.escape(p.horarioFim)}`
      : '—';
    const cadastro = UI.formatDate(p.createdAt);
    const todasArenas = Storage.getAll('arenas');
    const arenasChips = Array.isArray(p.arenas) && p.arenas.length
      ? p.arenas.map(aid => {
          const ar = todasArenas.find(a => a.id === aid);
          return ar ? `<span class="dia-chip">${UI.escape(ar.nome)}</span>` : '';
        }).join('')
      : '';

    const obsBlock = p.observacoes
      ? `<div class="arena-obs"><div class="arena-obs-text">💬 ${UI.escape(p.observacoes)}</div></div>`
      : '';

    return `
      <div class="arena-card" data-id="${p.id}" data-status="${UI.escape(p.status)}">
        <div class="arena-card-top">
          <span class="card-status-badge">
            <span class="badge ${status.badge}">${status.label}</span>
          </span>
          <div class="arena-name">${UI.escape(p.nome)}</div>
          <span class="arena-code">${UI.escape(esp)}</span>
        </div>

        <div class="arena-details">
          <div class="detail-item">
            <div class="detail-label">E-mail</div>
            <div class="detail-value">${UI.escape(p.email || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Telefone</div>
            <div class="detail-value">${UI.escape(p.telefone || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Horário</div>
            <div class="detail-value">${horario}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Cadastro</div>
            <div class="detail-value">${cadastro}</div>
          </div>
        </div>

        <div style="padding:10px 16px 4px;border-top:1px solid #f1f5f9;">
          <div class="detail-label" style="margin-bottom:6px;">Dias disponíveis</div>
          <div class="dias-chips">${dias}</div>
        </div>

        ${arenasChips ? `
        <div style="padding:6px 16px 8px;border-top:1px solid #f1f5f9;">
          <div class="detail-label" style="margin-bottom:6px;">Arenas</div>
          <div class="dias-chips">${arenasChips}</div>
        </div>` : ''}

        ${obsBlock}

        <div class="arena-actions">
          <button class="btn btn-secondary btn-sm" onclick="ProfessorModule.openModal('${p.id}')">
            ✏️ Editar
          </button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="ProfessorModule.deleteProfessor('${p.id}')" title="Excluir">
            🗑️
          </button>
        </div>
      </div>`;
  },

  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterStatus || this._state.filterEspecialidade;
    if (isFiltered) {
      return `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhum professor encontrado</div>
          <div class="empty-desc">Nenhum professor corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="ProfessorModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎓</div>
        <div class="empty-title">Nenhum professor cadastrado</div>
        <div class="empty-desc">Comece adicionando o primeiro instrutor da academia.</div>
        <button class="btn btn-primary mt-16" onclick="ProfessorModule.openModal()">+ Cadastrar primeiro professor</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const prof   = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!prof;
    const v      = (field, fallback = '') => prof ? UI.escape(String(prof[field] ?? fallback)) : fallback;
    const dias   = Array.isArray(prof?.diasDisponiveis) ? prof.diasDisponiveis : [];

    const espOptions = CadastrosModule.buildOptions(
      CadastrosModule.getEspecialidades(),
      prof ? (prof.especialidade || '') : ''
    );
    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${prof && prof.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const diasChecks = Object.entries(this.DIAS).map(([k, l]) => `
      <label class="dia-check-label">
        <input type="checkbox" name="dias" value="${k}" ${dias.includes(k) ? 'checked' : ''} />
        <span>${l}</span>
      </label>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="p-nome">Nome completo <span class="required-star">*</span></label>
          <input id="p-nome" type="text" class="form-input"
            placeholder="ex: Prof. Ricardo Alves"
            value="${v('nome')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-cpf">CPF</label>
            <input id="p-cpf" type="text" class="form-input"
              placeholder="000.000.000-00"
              value="${v('cpf')}" maxlength="14" autocomplete="off"
              oninput="ProfessorModule._maskCpf(this)" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-telefone">Telefone</label>
            <input id="p-telefone" type="text" class="form-input"
              placeholder="(00) 00000-0000"
              value="${v('telefone')}" maxlength="15" autocomplete="off"
              oninput="ProfessorModule._maskTel(this)" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="p-email">E-mail</label>
          <input id="p-email" type="email" class="form-input"
            placeholder="professor@email.com"
            value="${v('email')}" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-especialidade">Especialidade</label>
            <select id="p-especialidade" class="form-select">${espOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="p-status">Status</label>
            <select id="p-status" class="form-select">${statusOptions}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-hinicio">Horário início</label>
            <input id="p-hinicio" type="time" class="form-input" value="${v('horarioInicio')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-hfim">Horário fim</label>
            <input id="p-hfim" type="time" class="form-input" value="${v('horarioFim')}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Dias disponíveis</label>
          <div class="dias-check-group">${diasChecks}</div>
        </div>

        <div class="form-group">
          <label class="form-label">Arenas onde leciona</label>
          <div class="arenas-check-group" id="p-arenas-checks">
            ${(() => {
              const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
              const profArenas = Array.isArray(prof?.arenas) ? prof.arenas : [];
              return arenas.map(a => `
                <label class="dia-check-label">
                  <input type="checkbox" name="prof-arena" value="${a.id}"
                    ${profArenas.includes(a.id) ? 'checked' : ''} />
                  <span>${UI.escape(a.nome)}</span>
                </label>`).join('') || '<span class="text-muted" style="font-size:12px;">Nenhuma arena cadastrada.</span>';
            })()}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="p-obs">Observações</label>
          <textarea id="p-obs" class="form-textarea"
            placeholder="Informações adicionais sobre o professor…" rows="3">${prof ? UI.escape(prof.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Professor — ${prof.nome}` : 'Novo Professor',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Cadastrar Professor',
      onConfirm:    () => this.saveProfessor(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  saveProfessor(id = null) {
    const g    = n => document.getElementById(`p-${n}`);
    const nome = g('nome');

    if (!nome || !nome.value.trim()) {
      nome && nome.classList.add('error');
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }
    nome.classList.remove('error');

    const diasChecked = [...document.querySelectorAll('input[name="dias"]:checked')]
      .map(el => el.value);

    const arenaChecks = document.querySelectorAll('input[name="prof-arena"]:checked');
    const arenas = Array.from(arenaChecks).map(cb => cb.value);

    const data = {
      nome:           nome.value.trim(),
      cpf:            g('cpf')          ? g('cpf').value.trim()          : '',
      telefone:       g('telefone')     ? g('telefone').value.trim()     : '',
      email:          g('email')        ? g('email').value.trim()        : '',
      especialidade:  g('especialidade')? g('especialidade').value        : 'iniciantes',
      status:         g('status')       ? g('status').value              : 'ativo',
      horarioInicio:  g('hinicio')      ? g('hinicio').value             : '',
      horarioFim:     g('hfim')         ? g('hfim').value                : '',
      diasDisponiveis: diasChecked,
      arenas,
      observacoes:    g('obs')          ? g('obs').value.trim()          : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      UI.toast(`Professor "${data.nome}" atualizado com sucesso!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, data);
      UI.toast(`Professor "${data.nome}" cadastrado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteProfessor(id) {
    const prof = Storage.getById(this.STORAGE_KEY, id);
    if (!prof) return;

    const confirmed = await UI.confirm(
      `Deseja realmente excluir o professor "${prof.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Professor'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Professor "${prof.nome}" excluído.`, 'success');
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

  handleFilterEsp(value) {
    this._state.filterEspecialidade = value;
    this._reRenderCards();
  },

  clearFilters() {
    this._state.search              = '';
    this._state.filterStatus        = '';
    this._state.filterEspecialidade = '';
    this.render();
  },

  _reRenderCards() {
    const filtered = this.getFiltered();
    const grid = document.getElementById('professores-grid');
    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map(p => this.renderCard(p)).join('')
        : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} professor${filtered.length !== 1 ? 'es' : ''}`;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

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
