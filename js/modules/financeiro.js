'use strict';

/**
 * FinanceiroModule — Complete CRUD module for financial management
 */
const FinanceiroModule = {
  STORAGE_KEY: 'financeiro',

  _state: {
    search:       '',
    filterTipo:   '',
    filterStatus: '',
    filterMes:    '',
  },

  TIPO: {
    receita: { label: 'Receita', badge: 'badge-success', color: 'green' },
    despesa: { label: 'Despesa', badge: 'badge-danger',  color: 'red'   },
  },

  STATUS: {
    pago:      { label: 'Pago',      badge: 'badge-success' },
    pendente:  { label: 'Pendente',  badge: 'badge-warning' },
    cancelado: { label: 'Cancelado', badge: 'badge-gray'    },
  },

  CATEGORIA_RECEITA: {
    mensalidade:      'Mensalidade',
    inscricao_evento: 'Inscrição em Evento',
    aula_avulsa:      'Aula Avulsa',
    pacote:           'Pacote de Aulas',
    day_use:          'Day Use',
    outro_r:          'Outro',
  },

  CATEGORIA_DESPESA: {
    manutencao:   'Manutenção',
    equipamentos: 'Equipamentos',
    salarios:     'Salários',
    aluguel:      'Aluguel',
    utilities:    'Água / Luz / Internet',
    marketing:    'Marketing',
    outro_d:      'Outro',
  },

  FORMA_PAGAMENTO: {
    dinheiro:        'Dinheiro',
    pix:             'PIX',
    cartao_credito:  'Cartão de Crédito',
    cartao_debito:   'Cartão de Débito',
    transferencia:   'Transferência',
    boleto:          'Boleto',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterTipo, filterStatus, filterMes } = this._state;
    return this.getAll()
      .slice()
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .filter(l => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          l.descricao.toLowerCase().includes(q) ||
          (l.referencia && l.referencia.toLowerCase().includes(q)) ||
          (l.categoria  && l.categoria.toLowerCase().includes(q));
        const matchTipo   = !filterTipo   || l.tipo   === filterTipo;
        const matchStatus = !filterStatus || l.status === filterStatus;
        const matchMes    = !filterMes    || (l.data && l.data.slice(0, 7) === filterMes);
        return matchSearch && matchTipo && matchStatus && matchMes;
      });
  },

  getStats() {
    const mes  = this._state.filterMes || new Date().toISOString().slice(0, 7);
    const doMes = this.getAll().filter(l => l.data && l.data.slice(0, 7) === mes && l.status !== 'cancelado');
    const receitas  = doMes.filter(l => l.tipo === 'receita').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
    const despesas  = doMes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
    const pendentes = this.getAll().filter(l => l.status === 'pendente').length;
    return { receitas, despesas, saldo: receitas - despesas, pendentes };
  },

  _getMesesDisponiveis() {
    const meses = [...new Set(this.getAll().map(l => l.data ? l.data.slice(0, 7) : null).filter(Boolean))];
    return meses.sort((a, b) => b.localeCompare(a));
  },

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  render() {
    const stats    = this.getStats();
    const filtered = this.getFiltered();
    const area     = document.getElementById('content-area');
    if (!area) return;

    const mesSel     = this._state.filterMes || new Date().toISOString().slice(0, 7);
    const mesLabel   = this._formatMesLabel(mesSel);
    const meses      = this._getMesesDisponiveis();
    const mesOptions = meses.map(m =>
      `<option value="${m}" ${this._state.filterMes === m ? 'selected' : ''}>${this._formatMesLabel(m)}</option>`
    ).join('');

    const saldoClass = stats.saldo >= 0 ? 'financeiro-saldo-pos' : 'financeiro-saldo-neg';

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Financeiro</h2>
          <p>Controle de receitas, despesas e saldo da academia</p>
        </div>
        <button class="btn btn-primary" onclick="FinanceiroModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Lançamento
        </button>
      </div>

      <!-- Month summary banner -->
      <div class="financeiro-banner">
        <div class="fin-banner-item">
          <div class="fin-banner-label">Receitas — ${UI.escape(mesLabel)}</div>
          <div class="fin-banner-value receita">${this._fmt(stats.receitas)}</div>
        </div>
        <div class="fin-banner-sep">—</div>
        <div class="fin-banner-item">
          <div class="fin-banner-label">Despesas — ${UI.escape(mesLabel)}</div>
          <div class="fin-banner-value despesa">${this._fmt(stats.despesas)}</div>
        </div>
        <div class="fin-banner-sep">=</div>
        <div class="fin-banner-item">
          <div class="fin-banner-label">Saldo do mês</div>
          <div class="fin-banner-value ${saldoClass}">${this._fmt(stats.saldo)}</div>
        </div>
        ${stats.pendentes > 0 ? `
        <div class="fin-banner-alert">
          <span class="badge badge-warning">⚠ ${stats.pendentes} pendente${stats.pendentes !== 1 ? 's' : ''}</span>
        </div>` : ''}
      </div>

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por descrição ou referência…"
            value="${UI.escape(this._state.search)}"
            oninput="FinanceiroModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="FinanceiroModule.handleFilterMes(this.value)">
          <option value="">Todos os meses</option>
          ${mesOptions}
        </select>
        <select class="filter-select" onchange="FinanceiroModule.handleFilterTipo(this.value)">
          <option value="">Receitas e Despesas</option>
          <option value="receita"  ${this._state.filterTipo === 'receita'  ? 'selected' : ''}>Receitas</option>
          <option value="despesa"  ${this._state.filterTipo === 'despesa'  ? 'selected' : ''}>Despesas</option>
        </select>
        <select class="filter-select" onchange="FinanceiroModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS).map(([k, v]) =>
            `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <span class="results-count">
          ${filtered.length} lançamento${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div class="alunos-table-wrap" id="financeiro-list">
        ${filtered.length ? this.renderTable(filtered) : this.renderEmpty()}
      </div>
    `;
  },

  renderTable(lancamentos) {
    const rows = lancamentos.map(l => {
      const tipo   = this.TIPO[l.tipo]     || { label: l.tipo,   badge: 'badge-gray', color: '' };
      const status = this.STATUS[l.status] || { label: l.status, badge: 'badge-gray' };
      const cat    = this._categoriaLabel(l.tipo, l.categoria);
      const forma  = this.FORMA_PAGAMENTO[l.formaPagamento] || '—';
      const data   = UI.formatDate(l.data);
      const sinal  = l.tipo === 'receita' ? '+' : '−';
      const valClass = l.tipo === 'receita' ? 'fin-val-pos' : 'fin-val-neg';

      return `
        <tr class="${l.status === 'cancelado' ? 'aula-row-cancelada' : ''}">
          <td>${UI.escape(data)}</td>
          <td>
            <div class="aluno-nome">${UI.escape(l.descricao)}</div>
            <div class="aluno-sub">${UI.escape(cat)}${l.referencia ? ' · ' + UI.escape(l.referencia) : ''}</div>
          </td>
          <td><span class="badge ${tipo.badge}">${tipo.label}</span></td>
          <td class="text-sm">${UI.escape(forma)}</td>
          <td><span class="badge ${status.badge}">${status.label}</span></td>
          <td class="fin-valor ${valClass}">${sinal} ${this._fmt(l.valor)}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="FinanceiroModule.openModal('${l.id}')" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-sm danger" onclick="FinanceiroModule.deleteLancamento('${l.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição / Categoria</th>
              <th>Tipo</th>
              <th>Forma</th>
              <th>Status</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterTipo || this._state.filterStatus || this._state.filterMes;
    if (isFiltered) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhum lançamento encontrado</div>
          <div class="empty-desc">Nenhum lançamento corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="FinanceiroModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <div class="empty-title">Nenhum lançamento cadastrado</div>
        <div class="empty-desc">Registre receitas e despesas da academia para acompanhar o financeiro.</div>
        <button class="btn btn-primary mt-16" onclick="FinanceiroModule.openModal()">+ Novo lançamento</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const lanc   = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!lanc;
    const v      = (field, fallback = '') => lanc ? UI.escape(String(lanc[field] ?? fallback)) : fallback;
    const tipoAtual = lanc ? lanc.tipo : 'receita';

    const tipoOptions   = Object.entries(this.TIPO).map(([k, cfg]) =>
      `<option value="${k}" ${tipoAtual === k ? 'selected' : ''}>${cfg.label}</option>`).join('');
    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${lanc && lanc.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');
    const formaOptions  = Object.entries(this.FORMA_PAGAMENTO).map(([k, l]) =>
      `<option value="${k}" ${lanc && lanc.formaPagamento === k ? 'selected' : ''}>${l}</option>`).join('');

    const catRecOptions = CadastrosModule.buildOptions(
      CadastrosModule.getCategoriasReceita(),
      lanc && tipoAtual === 'receita' ? (lanc.categoria || '') : ''
    );
    const catDesOptions = CadastrosModule.buildOptions(
      CadastrosModule.getCategoriasDespesa(),
      lanc && tipoAtual === 'despesa' ? (lanc.categoria || '') : ''
    );

    const content = `
      <div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="fi-tipo">Tipo <span class="required-star">*</span></label>
            <select id="fi-tipo" class="form-select" onchange="FinanceiroModule._toggleCategoria(this.value)">
              ${tipoOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="fi-data">Data <span class="required-star">*</span></label>
            <input id="fi-data" type="date" class="form-input"
              value="${v('data', new Date().toISOString().slice(0, 10))}" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="fi-desc">Descrição <span class="required-star">*</span></label>
          <input id="fi-desc" type="text" class="form-input"
            placeholder="ex: Mensalidade — Ana Paula"
            value="${v('descricao')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group" id="fi-cat-wrap">
            <label class="form-label" for="fi-cat">Categoria</label>
            <select id="fi-cat" class="form-select">
              ${tipoAtual === 'receita' ? catRecOptions : catDesOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="fi-valor">Valor (R$) <span class="required-star">*</span></label>
            <input id="fi-valor" type="number" class="form-input"
              placeholder="0,00" min="0" step="0.01" value="${v('valor')}" required />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="fi-forma">Forma de pagamento</label>
            <select id="fi-forma" class="form-select">${formaOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="fi-status">Status</label>
            <select id="fi-status" class="form-select">${statusOptions}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="fi-ref">Referência <span class="form-hint">(ex: nome do aluno, evento)</span></label>
          <input id="fi-ref" type="text" class="form-input"
            placeholder="ex: Ana Paula Ferreira"
            value="${v('referencia')}" autocomplete="off" />
        </div>

        <div class="form-group">
          <label class="form-label" for="fi-obs">Observações</label>
          <textarea id="fi-obs" class="form-textarea"
            placeholder="Informações adicionais…" rows="2">${lanc ? UI.escape(lanc.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? 'Editar Lançamento' : 'Novo Lançamento',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Registrar',
      onConfirm:    () => this.saveLancamento(id),
    });
  },

  /** Swap category options when tipo changes in modal */
  _toggleCategoria(tipo) {
    const cat = document.getElementById('fi-cat');
    if (!cat) return;
    const items = tipo === 'receita'
      ? CadastrosModule.getCategoriasReceita()
      : CadastrosModule.getCategoriasDespesa();
    cat.innerHTML = items.map(c =>
      `<option value="${UI.escape(c.nome)}">${UI.escape(c.nome)}</option>`
    ).join('');
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  saveLancamento(id = null) {
    const g     = n => document.getElementById(`fi-${n}`);
    const desc  = g('desc');
    const valor = g('valor');
    const data  = g('data');

    let valid = true;
    [desc, valor, data].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim() || (el === valor && (isNaN(parseFloat(el.value)) || parseFloat(el.value) <= 0));
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    const record = {
      tipo:           g('tipo')   ? g('tipo').value                    : 'receita',
      data:           data.value,
      descricao:      desc.value.trim(),
      categoria:      g('cat')    ? g('cat').value                     : '',
      valor:          parseFloat(valor.value) || 0,
      formaPagamento: g('forma')  ? g('forma').value                   : 'pix',
      status:         g('status') ? g('status').value                  : 'pago',
      referencia:     g('ref')    ? g('ref').value.trim()              : '',
      observacoes:    g('obs')    ? g('obs').value.trim()              : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, record);
      UI.toast('Lançamento atualizado com sucesso!', 'success');
    } else {
      Storage.create(this.STORAGE_KEY, record);
      UI.toast('Lançamento registrado com sucesso!', 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteLancamento(id) {
    const lanc = Storage.getById(this.STORAGE_KEY, id);
    if (!lanc) return;

    const confirmed = await UI.confirm(
      `Deseja realmente excluir o lançamento "${lanc.descricao}"?`,
      'Excluir Lançamento'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast('Lançamento excluído.', 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Filter handlers                                                     */
  /* ------------------------------------------------------------------ */

  handleSearch(value) {
    this._state.search = value;
    this._reRender();
  },

  handleFilterTipo(value) {
    this._state.filterTipo = value;
    this._reRender();
  },

  handleFilterStatus(value) {
    this._state.filterStatus = value;
    this._reRender();
  },

  handleFilterMes(value) {
    this._state.filterMes = value;
    this.render(); // full re-render to update banner stats
  },

  clearFilters() {
    this._state.search       = '';
    this._state.filterTipo   = '';
    this._state.filterStatus = '';
    this._state.filterMes    = '';
    this.render();
  },

  _reRender() {
    const filtered = this.getFiltered();
    const list = document.getElementById('financeiro-list');
    if (list) {
      list.innerHTML = filtered.length ? this.renderTable(filtered) : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} lançamento${filtered.length !== 1 ? 's' : ''}`;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _fmt(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  _formatMesLabel(ym) {
    if (!ym) return '—';
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  },

  _categoriaLabel(tipo, cat) {
    if (!cat) return '—';
    // Try legacy key map first (for old data), then show stored value as-is
    return (tipo === 'receita'
      ? (this.CATEGORIA_RECEITA[cat] || cat)
      : (this.CATEGORIA_DESPESA[cat] || cat));
  },
};
