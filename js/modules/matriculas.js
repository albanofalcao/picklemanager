'use strict';

/**
 * MatriculaModule — Gestão de matrículas: vincula alunos a planos com controle de validade.
 */
const MatriculaModule = {
  STORAGE_KEY: 'matriculas',

  _state: {
    search:       '',
    filterStatus: '',
    filterPlano:  '',
  },

  STATUS: {
    ativa:     { label: 'Ativa',     badge: 'badge-success' },
    suspensa:  { label: 'Suspensa',  badge: 'badge-warning' },
    encerrada: { label: 'Encerrada', badge: 'badge-gray'    },
    vencida:   { label: 'Vencida',   badge: 'badge-danger'  },
  },

  FORMA_PAGAMENTO: {
    dinheiro:       'Dinheiro',
    pix:            'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito:  'Cartão de Débito',
    transferencia:  'Transferência',
    boleto:         'Boleto',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterStatus, filterPlano } = this._state;
    return this.getAll()
      .slice()
      .sort((a, b) => (b.dataInicio || '').localeCompare(a.dataInicio || ''))
      .filter(m => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          (m.alunoNome  && m.alunoNome.toLowerCase().includes(q)) ||
          (m.planoNome  && m.planoNome.toLowerCase().includes(q));
        const matchStatus = !filterStatus || m.status === filterStatus;
        const matchPlano  = !filterPlano  || m.planoId === filterPlano;
        return matchSearch && matchStatus && matchPlano;
      });
  },

  getStats() {
    this._syncVencidas();
    const all = this.getAll();
    return {
      total:     all.length,
      ativas:    all.filter(m => m.status === 'ativa').length,
      vencidas:  all.filter(m => m.status === 'vencida').length,
      encerradas:all.filter(m => m.status === 'encerrada').length,
    };
  },

  /** Auto-marca como "vencida" qualquer matrícula ativa com dataFim no passado */
  _syncVencidas() {
    const hoje = new Date().toISOString().slice(0, 10);
    const all  = this.getAll();
    all.forEach(m => {
      if (m.status === 'ativa' && m.dataFim && m.dataFim < hoje) {
        Storage.update(this.STORAGE_KEY, m.id, { status: 'vencida' });
      }
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  render() {
    this._syncVencidas();
    const stats    = this.getStats();
    const filtered = this.getFiltered();
    const area     = document.getElementById('content-area');
    if (!area) return;

    const planos = Storage.getAll('planos').filter(p => p.status === 'ativo');
    const planoFilterOpts = planos.map(p =>
      `<option value="${p.id}" ${this._state.filterPlano === p.id ? 'selected' : ''}>${UI.escape(p.nome)}</option>`
    ).join('');

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Matrículas</h2>
          <p>Vinculação de alunos a planos de contratação e controle de validade</p>
        </div>
        <button class="btn btn-primary" onclick="MatriculaModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Matrícula
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📝</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Matrículas</div>
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
          <div class="stat-icon amber">⚠️</div>
          <div class="stat-info">
            <div class="stat-value">${stats.vencidas}</div>
            <div class="stat-label">Vencidas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gray">⚪</div>
          <div class="stat-info">
            <div class="stat-value">${stats.encerradas}</div>
            <div class="stat-label">Encerradas</div>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por aluno ou plano…"
            value="${UI.escape(this._state.search)}"
            oninput="MatriculaModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="MatriculaModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS).map(([k, v]) =>
            `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <select class="filter-select" onchange="MatriculaModule.handleFilterPlano(this.value)">
          <option value="">Todos os planos</option>
          ${planoFilterOpts}
        </select>
        <span class="results-count">
          ${filtered.length} matrícula${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div class="alunos-table-wrap" id="matriculas-list">
        ${filtered.length ? this.renderTable(filtered) : this.renderEmpty()}
      </div>
    `;
  },

  renderTable(matriculas) {
    const hoje = new Date().toISOString().slice(0, 10);

    const rows = matriculas.map(m => {
      const status     = this.STATUS[m.status] || { label: m.status, badge: 'badge-gray' };
      const dataInicio = m.dataInicio ? this._fmtDate(m.dataInicio) : '—';
      const dataFim    = m.dataFim    ? this._fmtDate(m.dataFim)    : '—';
      const diasRest   = m.dataFim && m.status === 'ativa'
        ? this._diasRestantes(m.dataFim, hoje) : null;
      const alertaVenc = diasRest !== null && diasRest <= 7
        ? `<span class="badge badge-warning" style="font-size:10px;margin-left:4px;">${diasRest <= 0 ? 'Hoje!' : diasRest + 'd'}</span>`
        : '';

      return `
        <tr>
          <td>
            <div class="aluno-nome">${UI.escape(m.alunoNome || '—')}</div>
          </td>
          <td>
            <div class="font-bold">${UI.escape(m.planoNome || '—')}</div>
            ${m.valorPago ? `<div class="aluno-sub">${this._fmtMoeda(m.valorPago)}</div>` : ''}
          </td>
          <td>${dataInicio}</td>
          <td>
            ${dataFim}${alertaVenc}
          </td>
          <td><span class="badge ${status.badge}">${status.label}</span></td>
          <td class="text-muted text-sm">${UI.escape(m.formaPagamento ? (this.FORMA_PAGAMENTO[m.formaPagamento] || m.formaPagamento) : '—')}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="MatriculaModule.openModal('${m.id}')" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-sm danger" onclick="MatriculaModule.deleteMatricula('${m.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Plano</th>
              <th>Início</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Pagamento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterStatus || this._state.filterPlano;
    if (isFiltered) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhuma matrícula encontrada</div>
          <div class="empty-desc">Nenhuma matrícula corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="MatriculaModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-title">Nenhuma matrícula cadastrada</div>
        <div class="empty-desc">Vincule alunos a planos de contratação para controlar a validade.</div>
        <button class="btn btn-primary mt-16" onclick="MatriculaModule.openModal()">+ Criar primeira matrícula</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const mat    = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!mat;
    const v      = (field, fallback = '') => mat ? UI.escape(String(mat[field] ?? fallback)) : fallback;

    const alunos = Storage.getAll('alunos').filter(a => a.status === 'ativo');
    const planos = Storage.getAll('planos').filter(p => p.status === 'ativo');

    const alunoOpts = `<option value="">— Selecionar aluno —</option>` +
      alunos.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
          ${mat && mat.alunoId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
      ).join('');

    const planoOpts = `<option value="">— Selecionar plano —</option>` +
      planos.map(p =>
        `<option value="${p.id}" data-nome="${UI.escape(p.nome)}" data-tipo="${p.tipo}" data-valor="${p.valor}"
          ${mat && mat.planoId === p.id ? 'selected' : ''}>${UI.escape(p.nome)} — ${this._fmtMoeda(p.valor)}</option>`
      ).join('');

    const statusOpts = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${mat && mat.status === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const fpOpts = `<option value="">— Selecionar —</option>` +
      Object.entries(this.FORMA_PAGAMENTO).map(([k, lbl]) =>
        `<option value="${k}" ${mat && mat.formaPagamento === k ? 'selected' : ''}>${lbl}</option>`
      ).join('');

    const hoje = new Date().toISOString().slice(0, 10);

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="mat-aluno">Aluno <span class="required-star">*</span></label>
          <select id="mat-aluno" class="form-select" onchange="MatriculaModule._onPlanoChange()">${alunoOpts}</select>
        </div>

        <div class="form-group">
          <label class="form-label" for="mat-plano">Plano <span class="required-star">*</span></label>
          <select id="mat-plano" class="form-select" onchange="MatriculaModule._onPlanoChange()">${planoOpts}</select>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mat-inicio">Data de início <span class="required-star">*</span></label>
            <input id="mat-inicio" type="date" class="form-input"
              value="${v('dataInicio', hoje)}"
              onchange="MatriculaModule._onPlanoChange()" />
          </div>
          <div class="form-group">
            <label class="form-label" for="mat-fim">Data de vencimento</label>
            <input id="mat-fim" type="date" class="form-input" value="${v('dataFim')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mat-valor">Valor pago (R$)</label>
            <input id="mat-valor" type="number" class="form-input"
              placeholder="0,00" min="0" step="0.01" value="${v('valorPago')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="mat-fp">Forma de pagamento</label>
            <select id="mat-fp" class="form-select">${fpOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="mat-status">Status</label>
          <select id="mat-status" class="form-select">${statusOpts}</select>
        </div>

        <div class="form-group">
          <label class="form-label" for="mat-obs">Observações</label>
          <textarea id="mat-obs" class="form-textarea"
            placeholder="Informações adicionais…" rows="2">${mat ? UI.escape(mat.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Matrícula — ${mat.alunoNome}` : 'Nova Matrícula',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Cadastrar Matrícula',
      onConfirm:    () => this.saveMatricula(id),
    });
  },

  /** Ao selecionar plano + início, calcula e preenche data fim automaticamente */
  _onPlanoChange() {
    const planoSel = document.getElementById('mat-plano');
    const inicioEl = document.getElementById('mat-inicio');
    const fimEl    = document.getElementById('mat-fim');
    if (!planoSel || !inicioEl || !fimEl) return;

    const opt   = planoSel.selectedOptions[0];
    const tipo  = opt ? opt.dataset.tipo : '';
    const inicio = inicioEl.value;
    if (!inicio || !tipo) return;

    const d = new Date(inicio + 'T00:00:00');
    const meses = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
    if (meses[tipo]) {
      d.setMonth(d.getMonth() + meses[tipo]);
      d.setDate(d.getDate() - 1);
      fimEl.value = d.toISOString().slice(0, 10);
    }

    // Preenche valor do plano se campo vazio
    const valorEl = document.getElementById('mat-valor');
    if (valorEl && !valorEl.value && opt && opt.dataset.valor) {
      valorEl.value = opt.dataset.valor;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  saveMatricula(id = null) {
    const g       = n => document.getElementById(`mat-${n}`);
    const alunoSel = g('aluno');
    const planoSel = g('plano');
    const inicio   = g('inicio');

    let valid = true;
    [alunoSel, planoSel, inicio].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    const alunoOpt = alunoSel.selectedOptions[0];
    const planoOpt = planoSel.selectedOptions[0];

    const data = {
      alunoId:       alunoSel.value,
      alunoNome:     alunoOpt ? (alunoOpt.dataset.nome || alunoOpt.textContent) : '',
      planoId:       planoSel.value,
      planoNome:     planoOpt ? (planoOpt.dataset.nome || planoOpt.textContent) : '',
      dataInicio:    inicio.value,
      dataFim:       g('fim')    ? g('fim').value    : '',
      valorPago:     g('valor')  ? parseFloat(g('valor').value) || 0 : 0,
      formaPagamento:g('fp')     ? g('fp').value     : '',
      status:        g('status') ? g('status').value : 'ativa',
      observacoes:   g('obs')    ? g('obs').value.trim() : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      UI.toast(`Matrícula de "${data.alunoNome}" atualizada!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, data);
      UI.toast(`Matrícula de "${data.alunoNome}" criada com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteMatricula(id) {
    const mat = Storage.getById(this.STORAGE_KEY, id);
    if (!mat) return;

    const confirmed = await UI.confirm(
      `Deseja realmente excluir a matrícula de "${mat.alunoNome}"? Esta ação não pode ser desfeita.`,
      'Excluir Matrícula'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Matrícula de "${mat.alunoNome}" excluída.`, 'success');
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

  handleFilterPlano(value) {
    this._state.filterPlano = value;
    this._reRender();
  },

  clearFilters() {
    this._state.search       = '';
    this._state.filterStatus = '';
    this._state.filterPlano  = '';
    this.render();
  },

  _reRender() {
    const filtered = this.getFiltered();
    const list = document.getElementById('matriculas-list');
    if (list) {
      list.innerHTML = filtered.length ? this.renderTable(filtered) : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} matrícula${filtered.length !== 1 ? 's' : ''}`;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },

  _fmtMoeda(v) {
    return (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  _diasRestantes(dataFim, hoje) {
    const d1 = new Date(hoje  + 'T00:00:00');
    const d2 = new Date(dataFim + 'T00:00:00');
    return Math.ceil((d2 - d1) / 86400000);
  },
};
