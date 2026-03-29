'use strict';

/**
 * FinanceiroModule — Complete CRUD module for financial management
 */
const FinanceiroModule = {
  STORAGE_KEY: 'financeiro',

  _state: {
    tab:          'lancamentos',
    search:       '',
    filterTipo:   '',
    filterStatus: '',
    filterMes:    '',
  },

  STORAGE_KEY_PC: 'planoContas',

  TIPO_PC: {
    receita:    { label: 'Receita',    badge: 'badge-success' },
    deducao:    { label: 'Dedução',    badge: 'badge-warning' },
    custo:      { label: 'Custo',      badge: 'badge-blue'    },
    despesa:    { label: 'Despesa',    badge: 'badge-danger'  },
    financeiro: { label: 'Financeiro', badge: 'badge-gray'    },
    imposto:    { label: 'Imposto',    badge: 'badge-danger'  },
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

  switchTab(tab) {
    this._state.tab = tab;
    this.render();
  },

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;

    const tab = this._state.tab;

    const tabsBar = `
      <div class="tabs-bar">
        <button class="tab-btn ${tab === 'lancamentos' ? 'active' : ''}" onclick="FinanceiroModule.switchTab('lancamentos')">💰 Lançamentos</button>
        <button class="tab-btn ${tab === 'planoContas' ? 'active' : ''}" onclick="FinanceiroModule.switchTab('planoContas')">📋 Plano de Contas</button>
      </div>`;

    if (tab === 'planoContas') {
      area.innerHTML = tabsBar + this._renderPlanoContas();
      return;
    }

    const stats    = this.getStats();
    const filtered = this.getFiltered();

    const mesSel     = this._state.filterMes || new Date().toISOString().slice(0, 7);
    const mesLabel   = this._formatMesLabel(mesSel);
    const meses      = this._getMesesDisponiveis();
    const mesOptions = meses.map(m =>
      `<option value="${m}" ${this._state.filterMes === m ? 'selected' : ''}>${this._formatMesLabel(m)}</option>`
    ).join('');

    const saldoClass = stats.saldo >= 0 ? 'financeiro-saldo-pos' : 'financeiro-saldo-neg';

    area.innerHTML = `
      ${tabsBar}
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

  /* ------------------------------------------------------------------ */
  /*  Plano de Contas                                                     */
  /* ------------------------------------------------------------------ */

  _getAllContas() {
    return Storage.getAll(this.STORAGE_KEY_PC);
  },

  _sortContas(contas) {
    return contas.slice().sort((a, b) => {
      const pa = (a.codigo || '').split('.').map(n => parseInt(n, 10) || 0);
      const pb = (b.codigo || '').split('.').map(n => parseInt(n, 10) || 0);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
  },

  _hasFilhos(codigo) {
    return this._getAllContas().some(c => c.codigoPai === codigo);
  },

  _renderPlanoContas() {
    const contas = this._sortContas(this._getAllContas());

    const rows = contas.map(c => {
      const tipoCfg   = this.TIPO_PC[c.tipo] || { label: c.tipo, badge: 'badge-gray' };
      const natureza  = c.natureza === 'credito' ? 'Crédito' : 'Débito';
      const ativoIcon = c.ativo ? '✅' : '⚪';
      const temFilhos = this._hasFilhos(c.codigo);

      let nivelClass  = '';
      let indentClass = '';
      if (c.nivel === 1) { nivelClass = 'pc-nivel-1'; indentClass = 'pc-indent-1'; }
      if (c.nivel === 2) { nivelClass = 'pc-nivel-2'; indentClass = 'pc-indent-2'; }
      if (c.nivel === 3) { nivelClass = 'pc-nivel-3'; indentClass = 'pc-indent-3'; }

      const subcontaBtn = (c.nivel === 1 || c.nivel === 2)
        ? `<button class="btn btn-ghost btn-sm" onclick="FinanceiroModule.openModalSubconta('${UI.escape(c.codigo)}')" title="Nova subconta" style="font-size:11px;padding:2px 6px;">+ Subconta</button>`
        : '';

      const deleteBtn = !temFilhos
        ? `<button class="btn btn-ghost btn-sm danger" onclick="FinanceiroModule.deleteConta('${c.id}')" title="Excluir">🗑️</button>`
        : `<button class="btn btn-ghost btn-sm" disabled title="Possui subcontas" style="opacity:.35;cursor:not-allowed;">🗑️</button>`;

      return `
        <tr class="${nivelClass}">
          <td class="pc-codigo ${indentClass}">${UI.escape(c.codigo)}</td>
          <td class="${indentClass}">
            ${UI.escape(c.descricao)}
            ${subcontaBtn}
          </td>
          <td><span class="badge ${tipoCfg.badge}">${tipoCfg.label}</span></td>
          <td class="text-sm">${natureza}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="FinanceiroModule.toggleAtivoConta('${c.id}')" title="Alternar ativo" style="font-size:16px;padding:2px 4px;">${ativoIcon}</button>
          </td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="FinanceiroModule.openModalConta('${c.id}')" title="Editar">✏️</button>
            ${deleteBtn}
          </td>
        </tr>`;
    }).join('');

    const emptyState = !contas.length ? `
      <tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
        Nenhuma conta cadastrada. Clique em "+ Nova Conta" para começar.
      </td></tr>` : '';

    return `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Plano de Contas</h2>
          <p>Estrutura hierárquica de receitas, custos e despesas</p>
        </div>
        <button class="btn btn-primary" onclick="FinanceiroModule.openModalConta()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Conta
        </button>
      </div>
      <div class="alunos-table-wrap">
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Natureza</th>
                <th>Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}${emptyState}</tbody>
          </table>
        </div>
      </div>`;
  },

  openModalConta(id = null) {
    const conta  = id ? Storage.getById(this.STORAGE_KEY_PC, id) : null;
    const isEdit = !!conta;
    const v      = (field, fallback = '') => conta ? UI.escape(String(conta[field] ?? fallback)) : fallback;

    const todasContas = this._sortContas(this._getAllContas());
    const pais        = todasContas.filter(c => c.nivel === 1 || c.nivel === 2);
    const paiOptions  = pais.map(c =>
      `<option value="${UI.escape(c.codigo)}" ${conta && conta.codigoPai === c.codigo ? 'selected' : ''}>${UI.escape(c.codigo)} — ${UI.escape(c.descricao)}</option>`
    ).join('');

    const tipoOptions = Object.entries(this.TIPO_PC).map(([k, cfg]) =>
      `<option value="${k}" ${conta && conta.tipo === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const content = `
      <div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pc-codigo">Código <span class="required-star">*</span></label>
            <input id="pc-codigo" type="text" class="form-input" placeholder="ex: 1.1.1" value="${v('codigo')}" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="pc-nivel">Nível <span class="required-star">*</span></label>
            <select id="pc-nivel" class="form-select">
              <option value="1" ${conta && conta.nivel === 1 ? 'selected' : ''}>1 — Grupo raiz</option>
              <option value="2" ${conta && conta.nivel === 2 ? 'selected' : ''}>2 — Subgrupo</option>
              <option value="3" ${(!conta || conta.nivel === 3) ? 'selected' : ''}>3 — Conta</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="pc-descricao">Descrição <span class="required-star">*</span></label>
          <input id="pc-descricao" type="text" class="form-input" placeholder="ex: Mensalidade — Plano Mensal" value="${v('descricao')}" required autocomplete="off" />
        </div>
        <div class="form-group">
          <label class="form-label" for="pc-pai">Conta Pai</label>
          <select id="pc-pai" class="form-select" onchange="FinanceiroModule._syncTipoPorPai(this.value)">
            <option value="">— Nenhuma (grupo raiz) —</option>
            ${paiOptions}
          </select>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pc-tipo">Tipo <span class="required-star">*</span></label>
            <select id="pc-tipo" class="form-select">${tipoOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="pc-natureza">Natureza <span class="required-star">*</span></label>
            <select id="pc-natureza" class="form-select">
              <option value="credito" ${conta && conta.natureza === 'credito' ? 'selected' : ''}>Crédito</option>
              <option value="debito"  ${conta && conta.natureza === 'debito'  ? 'selected' : ''}>Débito</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" id="pc-ativo" ${(!conta || conta.ativo !== false) ? 'checked' : ''} style="margin-right:6px;" />
            Conta ativa
          </label>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? 'Editar Conta' : 'Nova Conta',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Cadastrar',
      onConfirm:    () => this.saveConta(id),
    });
  },

  _syncTipoPorPai(codigoPai) {
    if (!codigoPai) return;
    const pai = this._getAllContas().find(c => c.codigo === codigoPai);
    if (!pai) return;
    const tipoEl = document.getElementById('pc-tipo');
    if (tipoEl) tipoEl.value = pai.tipo;
  },

  openModalSubconta(codigoPai) {
    const pai = this._getAllContas().find(c => c.codigo === codigoPai);
    if (!pai) return;

    // Suggest next available code in the group
    const filhos  = this._getAllContas().filter(c => c.codigoPai === codigoPai);
    const nextNum = filhos.length
      ? Math.max(...filhos.map(c => {
          const parts = c.codigo.split('.');
          return parseInt(parts[parts.length - 1], 10) || 0;
        })) + 1
      : 1;
    const codigoSugerido = `${codigoPai}.${nextNum}`;

    this.openModalConta(null);
    // Pre-fill after modal opens
    requestAnimationFrame(() => {
      const codEl = document.getElementById('pc-codigo');
      if (codEl) codEl.value = codigoSugerido;
      const paiEl = document.getElementById('pc-pai');
      if (paiEl) { paiEl.value = codigoPai; this._syncTipoPorPai(codigoPai); }
      const nivelEl = document.getElementById('pc-nivel');
      if (nivelEl) nivelEl.value = String(pai.nivel + 1);
    });
  },

  saveConta(id = null) {
    const g = n => document.getElementById(`pc-${n}`);
    const codigoEl   = g('codigo');
    const descEl     = g('descricao');

    let valid = true;
    [codigoEl, descEl].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });
    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const codigo = codigoEl.value.trim();

    // Validate unique code
    const existing = this._getAllContas().find(c => c.codigo === codigo && c.id !== id);
    if (existing) {
      codigoEl.classList.add('error');
      UI.toast('Já existe uma conta com este código.', 'warning');
      return;
    }

    const record = {
      codigo,
      descricao:  descEl.value.trim(),
      codigoPai:  g('pai')      ? (g('pai').value      || null)          : null,
      nivel:      g('nivel')    ? parseInt(g('nivel').value, 10)         : 3,
      tipo:       g('tipo')     ? g('tipo').value                        : 'despesa',
      natureza:   g('natureza') ? g('natureza').value                    : 'debito',
      ativo:      g('ativo')    ? g('ativo').checked                     : true,
    };

    if (id) {
      Storage.update(this.STORAGE_KEY_PC, id, record);
      UI.toast('Conta atualizada com sucesso!', 'success');
    } else {
      Storage.create(this.STORAGE_KEY_PC, record);
      UI.toast('Conta cadastrada com sucesso!', 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteConta(id) {
    const conta = Storage.getById(this.STORAGE_KEY_PC, id);
    if (!conta) return;

    if (this._hasFilhos(conta.codigo)) {
      UI.toast('Não é possível excluir uma conta que possui subcontas vinculadas.', 'warning');
      return;
    }

    const confirmed = await UI.confirm(
      `Deseja realmente excluir a conta "${conta.codigo} — ${conta.descricao}"?`,
      'Excluir Conta'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY_PC, id);
    UI.toast('Conta excluída.', 'success');
    this.render();
  },

  toggleAtivoConta(id) {
    const conta = Storage.getById(this.STORAGE_KEY_PC, id);
    if (!conta) return;
    Storage.update(this.STORAGE_KEY_PC, id, { ativo: !conta.ativo });
    this.render();
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

      const matriculaBadge = l.matriculaId
        ? `<span class="badge badge-blue" style="font-size:10px;margin-left:4px;">📋 Matrícula</span>`
        : '';

      return `
        <tr class="${l.status === 'cancelado' ? 'aula-row-cancelada' : ''}">
          <td>${UI.escape(data)}</td>
          <td>
            <div class="aluno-nome">${UI.escape(l.descricao)}${matriculaBadge}</div>
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

    const aviso = lanc.matriculaId
      ? `\n\nEste lançamento foi gerado automaticamente por uma matrícula.`
      : '';

    const confirmed = await UI.confirm(
      `Deseja realmente excluir o lançamento "${lanc.descricao}"?${aviso}`,
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
