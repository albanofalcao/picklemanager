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

  STORAGE_KEY_PC:     'planoContas',
  STORAGE_KEY_ORC:    'orcamento',
  STORAGE_KEY_MODELO: 'orcamento_modelo',

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
    cmv:     { label: 'CMV',     badge: 'badge-blue',    color: 'blue'  },
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

  /* Linhas padrão do DRE — usadas no orçamento e no comparativo */
  _DRE_LINHAS: [
    { grupo:'receita', id:'mensalidade',  label:'Mensalidades',             cats:['mensalidade','Mensalidade'] },
    { grupo:'receita', id:'aula_avulsa',  label:'Aulas Avulsas / Pacotes',  cats:['aula_avulsa','Aula Avulsa','pacote','Pacote de Aulas'] },
    { grupo:'receita', id:'day_use',      label:'Day Use',                  cats:['day_use','Day Use'] },
    { grupo:'receita', id:'loja_venda',   label:'Loja — Vendas',            cats:['Venda de Produtos','loja_venda'] },
    { grupo:'receita', id:'eventos',      label:'Eventos / Torneios',       cats:['inscricao_evento','Inscrição em Evento'] },
    { grupo:'receita', id:'outro_r',      label:'Outras Receitas',          cats:['outro_r','Outro'] },
    { grupo:'cmv',     id:'cmv_loja',     label:'CMV — Custo dos Produtos', cats:['cmv_loja','cmv'] },
    { grupo:'cmv',     id:'cmv_interno',  label:'Consumo Interno',          cats:['cmv_interno'] },
    { grupo:'despesa', id:'salarios',     label:'Pessoal / Salários',       cats:['salarios','Salários'] },
    { grupo:'despesa', id:'aluguel',      label:'Aluguel',                  cats:['aluguel','Aluguel'] },
    { grupo:'despesa', id:'utilities',    label:'Luz / Água / Internet',    cats:['utilities','Água / Luz / Internet'] },
    { grupo:'despesa', id:'manutencao',   label:'Manutenção',               cats:['manutencao','Manutenção'] },
    { grupo:'despesa', id:'marketing',    label:'Marketing',                cats:['marketing','Marketing'] },
    { grupo:'despesa', id:'equipamentos', label:'Equipamentos',             cats:['equipamentos','Equipamentos'] },
    { grupo:'despesa', id:'outro_d',      label:'Outras Despesas',          cats:['outro_d','Outro'] },
  ],

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
    const receitas    = doMes.filter(l => l.tipo === 'receita').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
    const cmv         = doMes.filter(l => l.tipo === 'cmv').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
    const despesas    = doMes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
    const pendentes   = this.getAll().filter(l => l.status === 'pendente').length;
    const margemBruta = receitas - cmv;
    return { receitas, cmv, margemBruta, despesas, saldo: margemBruta - despesas, pendentes };
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
        <button class="tab-btn ${tab === 'orcamento'   ? 'active' : ''}" onclick="FinanceiroModule.switchTab('orcamento')">📊 Orçamento</button>
        <button class="tab-btn ${tab === 'dre'         ? 'active' : ''}" onclick="FinanceiroModule.switchTab('dre')">📈 DRE</button>
        <button class="tab-btn ${tab === 'planoContas' ? 'active' : ''}" onclick="FinanceiroModule.switchTab('planoContas')">📋 Plano de Contas</button>
      </div>`;

    if (tab === 'planoContas') {
      area.innerHTML = tabsBar + this._renderPlanoContas();
      return;
    }
    if (tab === 'orcamento') {
      area.innerHTML = tabsBar + this._renderOrcamento();
      return;
    }
    if (tab === 'dre') {
      area.innerHTML = tabsBar + this._renderDRE();
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
          <option value="">Todos os tipos</option>
          <option value="receita"  ${this._state.filterTipo === 'receita'  ? 'selected' : ''}>Receitas</option>
          <option value="despesa"  ${this._state.filterTipo === 'despesa'  ? 'selected' : ''}>Despesas</option>
          <option value="cmv"      ${this._state.filterTipo === 'cmv'      ? 'selected' : ''}>CMV</option>
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
      const forma  = ListasService.label('financeiro_forma_pagamento', l.formaPagamento) || '—';
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
    const formaOptions  = ListasService.opts('financeiro_forma_pagamento', lanc?.formaPagamento || '');

    const catRecOptions = CadastrosModule.buildOptions(
      CadastrosModule.getCategoriasReceita(),
      lanc && tipoAtual === 'receita' ? (lanc.categoria || '') : ''
    );
    const catDesOptions = CadastrosModule.buildOptions(
      CadastrosModule.getCategoriasDespesa(),
      lanc && tipoAtual === 'despesa' ? (lanc.categoria || '') : ''
    );
    const catCMVOptions = `
      <option value="cmv_loja"    ${lanc?.categoria === 'cmv_loja'    ? 'selected' : ''}>CMV — Custo dos Produtos</option>
      <option value="cmv_interno" ${lanc?.categoria === 'cmv_interno' ? 'selected' : ''}>Consumo Interno (Materiais)</option>`;

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
              ${tipoAtual === 'receita' ? catRecOptions : tipoAtual === 'cmv' ? catCMVOptions : catDesOptions}
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
    if (tipo === 'cmv') {
      cat.innerHTML = `
        <option value="cmv_loja">CMV — Custo dos Produtos</option>
        <option value="cmv_interno">Consumo Interno (Materiais)</option>`;
    } else {
      const items = tipo === 'receita'
        ? CadastrosModule.getCategoriasReceita()
        : CadastrosModule.getCategoriasDespesa();
      cat.innerHTML = items.map(c =>
        `<option value="${UI.escape(c.nome)}">${UI.escape(c.nome)}</option>`
      ).join('');
    }
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

  /* ------------------------------------------------------------------ */
  /*  Orçamento — Render                                                  */
  /* ------------------------------------------------------------------ */

  _renderOrcamento() {
    const mesSel   = this._state.filterMes || new Date().toISOString().slice(0, 7);
    const mesLabel = this._formatMesLabel(mesSel);

    const hoje = new Date();
    const todosMeses = [];
    for (let i = -3; i <= 12; i++) {
      const d  = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      todosMeses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    const mesOptions = todosMeses.map(m =>
      `<option value="${m}" ${mesSel === m ? 'selected' : ''}>${this._formatMesLabel(m)}</option>`
    ).join('');

    const orcamentos = Storage.getAll(this.STORAGE_KEY_ORC)
      .filter(o => o.periodo === mesSel)
      .sort((a, b) => {
        const ord = { receita: 0, cmv: 1, despesa: 2 };
        return (ord[a.tipo] ?? 3) - (ord[b.tipo] ?? 3);
      });

    const totRec    = orcamentos.filter(o => o.tipo === 'receita').reduce((s, o) => s + (parseFloat(o.valor)||0), 0);
    const totCMV    = orcamentos.filter(o => o.tipo === 'cmv').reduce((s, o) => s + (parseFloat(o.valor)||0), 0);
    const totDesp   = orcamentos.filter(o => o.tipo === 'despesa').reduce((s, o) => s + (parseFloat(o.valor)||0), 0);
    const resultado = totRec - totCMV - totDesp;

    const rows = orcamentos.map(o => {
      const tipoCfg = this.TIPO[o.tipo] || { label: o.tipo, badge: 'badge-gray' };
      return `
        <tr>
          <td><span class="badge ${tipoCfg.badge}">${tipoCfg.label}</span></td>
          <td>${UI.escape(o.categoria || '—')}</td>
          <td style="text-align:right;font-weight:600;">${this._fmt(o.valor)}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="FinanceiroModule.openModalOrcamento('${o.id}')">✏️</button>
            <button class="btn btn-ghost btn-sm danger" onclick="FinanceiroModule.deleteOrcamento('${o.id}')">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    const temModelo      = Storage.getAll(this.STORAGE_KEY_MODELO).length > 0;
    const temLinhas      = orcamentos.length > 0;
    const temLancamentos = this.getAll().length > 0;
    const anoAtual       = mesSel.slice(0, 4);

    return `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Orçamento</h2>
          <p>Planejamento financeiro — valores projetados por período</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="FinanceiroModule.openModalOrcamento()">+ Nova Linha</button>
          ${temLancamentos ? `<button class="btn btn-secondary" onclick="FinanceiroModule.gerarProjecaoLinhaDeBase()" title="Gerar orçamento baseado no realizado do ano anterior">📈 Linha de Base</button>` : ''}
          ${temLinhas ? `<button class="btn btn-secondary" onclick="FinanceiroModule.openModalReplicar('${mesSel}')">📋 Replicar</button>` : ''}
          ${temLinhas ? `<button class="btn btn-secondary" onclick="FinanceiroModule.projetarAnoTodo('${mesSel}')">📅 Projetar Ano Todo</button>` : ''}
          ${temLinhas ? `<button class="btn btn-ghost btn-sm" onclick="FinanceiroModule.salvarComoModelo('${mesSel}')" title="Salvar como modelo permanente">💾 Salvar Modelo</button>` : ''}
          ${temModelo && !temLinhas ? `<button class="btn btn-secondary" onclick="FinanceiroModule.carregarModelo('${mesSel}')">📂 Carregar Modelo</button>` : ''}
        </div>
      </div>

      <div class="filters-bar" style="margin-bottom:20px;">
        <label class="form-label" style="margin:0;white-space:nowrap;">Período:</label>
        <select class="filter-select" onchange="FinanceiroModule._state.filterMes=this.value;FinanceiroModule.switchTab('orcamento')">
          ${mesOptions}
        </select>
        ${temModelo && temLinhas ? `<button class="btn btn-ghost btn-sm" onclick="FinanceiroModule.carregarModelo('${mesSel}')" style="font-size:12px;">📂 Carregar Modelo</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="FinanceiroModule.switchTab('dre')" style="margin-left:auto;">
          📈 Ver DRE Comparativo →
        </button>
      </div>

      <div class="financeiro-banner" style="margin-bottom:20px;">
        <div class="fin-banner-item">
          <div class="fin-banner-label">Receitas orçadas</div>
          <div class="fin-banner-value receita">${this._fmt(totRec)}</div>
        </div>
        <div class="fin-banner-sep">−</div>
        <div class="fin-banner-item">
          <div class="fin-banner-label">CMV orçado</div>
          <div class="fin-banner-value" style="color:var(--color-primary,#3b9e8f);">${this._fmt(totCMV)}</div>
        </div>
        <div class="fin-banner-sep">−</div>
        <div class="fin-banner-item">
          <div class="fin-banner-label">Despesas orçadas</div>
          <div class="fin-banner-value despesa">${this._fmt(totDesp)}</div>
        </div>
        <div class="fin-banner-sep">=</div>
        <div class="fin-banner-item">
          <div class="fin-banner-label">Resultado orçado</div>
          <div class="fin-banner-value ${resultado < 0 ? 'financeiro-saldo-neg' : 'financeiro-saldo-pos'}">${this._fmt(resultado)}</div>
        </div>
      </div>

      <div class="alunos-table-wrap">
        ${orcamentos.length ? `
          <div class="table-card">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th style="text-align:right;">Valor Orçado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <div class="empty-title">Nenhum item orçado para ${UI.escape(mesLabel)}</div>
            <div class="empty-desc">Adicione as linhas de orçamento para comparar projetado × realizado no DRE.</div>
            <button class="btn btn-primary mt-16" onclick="FinanceiroModule.openModalOrcamento()">+ Adicionar primeira linha</button>
          </div>
        `}
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  DRE — Demonstrativo de Resultado (Orçado × Realizado)              */
  /* ------------------------------------------------------------------ */

  _renderDRE() {
    const mesSel   = this._state.filterMes || new Date().toISOString().slice(0, 7);
    const mesLabel = this._formatMesLabel(mesSel);

    const hoje = new Date();
    const todosMeses = [];
    for (let i = -11; i <= 3; i++) {
      const d  = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      todosMeses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    const mesOptions = todosMeses.map(m =>
      `<option value="${m}" ${mesSel === m ? 'selected' : ''}>${this._formatMesLabel(m)}</option>`
    ).join('');

    const realizado = this.getAll()
      .filter(l => l.data && l.data.slice(0, 7) === mesSel && l.status !== 'cancelado');
    const orcado = Storage.getAll(this.STORAGE_KEY_ORC)
      .filter(o => o.periodo === mesSel);

    const linhaReal = (linha) =>
      realizado
        .filter(r => r.tipo === linha.grupo &&
          linha.cats.some(c => c.toLowerCase() === (r.categoria||'').toLowerCase()))
        .reduce((s, r) => s + (parseFloat(r.valor)||0), 0);

    const linhaOrc = (linha) =>
      orcado
        .filter(o => o.tipo === linha.grupo && o.catId === linha.id)
        .reduce((s, o) => s + (parseFloat(o.valor)||0), 0);

    const buildLinhas = (grupo) =>
      this._DRE_LINHAS
        .filter(l => l.grupo === grupo)
        .map(l => ({ ...l, real: linhaReal(l), orc: linhaOrc(l) }))
        .filter(l => l.real > 0.01 || l.orc > 0.01);

    const linhasRec  = buildLinhas('receita');
    const linhasCMV  = buildLinhas('cmv');
    const linhasDesp = buildLinhas('despesa');

    const allRecReal    = realizado.filter(r=>r.tipo==='receita').reduce((s,r)=>s+(parseFloat(r.valor)||0),0);
    const mapRecReal    = linhasRec.reduce((s,l)=>s+l.real,0);
    const outrosRecReal = Math.max(0, allRecReal - mapRecReal);
    const totRecOrc     = orcado.filter(o=>o.tipo==='receita').reduce((s,o)=>s+(parseFloat(o.valor)||0),0);

    const totCMVReal  = realizado.filter(r=>r.tipo==='cmv').reduce((s,r)=>s+(parseFloat(r.valor)||0),0);
    const totCMVOrc   = orcado.filter(o=>o.tipo==='cmv').reduce((s,o)=>s+(parseFloat(o.valor)||0),0);

    const allDespReal   = realizado.filter(r=>r.tipo==='despesa').reduce((s,r)=>s+(parseFloat(r.valor)||0),0);
    const mapDespReal   = linhasDesp.reduce((s,l)=>s+l.real,0);
    const outrosDespReal = Math.max(0, allDespReal - mapDespReal);
    const totDespOrc    = orcado.filter(o=>o.tipo==='despesa').reduce((s,o)=>s+(parseFloat(o.valor)||0),0);

    const margBrutaReal = allRecReal  - totCMVReal;
    const margBrutaOrc  = totRecOrc   - totCMVOrc;
    const resultReal    = margBrutaReal - allDespReal;
    const resultOrc     = margBrutaOrc  - totDespOrc;

    const fmtVar = (orc, real, negGood=false) => {
      const v    = real - orc;
      const p    = orc !== 0 ? (v / Math.abs(orc)) * 100 : (real !== 0 ? 100 : 0);
      const good = negGood ? v <= 0 : v >= 0;
      const sty  = Math.abs(v) < 0.01 ? '' : good ? 'color:var(--success,#16a34a)' : 'color:var(--danger,#ef4444)';
      return `<td style="${sty};text-align:right;">${Math.abs(v)<0.01 ? '—' : (v>0?'+':'')+this._fmt(v)}</td>`
           + `<td style="${sty};text-align:right;">${orc!==0 ? (p>0?'+':'')+p.toFixed(1)+'%' : '—'}</td>`;
    };

    const dreRow = (label, orc, real, indent=false, negGood=false) => {
      const b  = 'font-weight:600;';
      const pl = indent ? 'padding-left:24px;' : '';
      return `<tr>
        <td style="${pl}">${label}</td>
        <td style="text-align:right;">${(orc > 0.01) ? this._fmt(orc) : '—'}</td>
        <td style="text-align:right;">${(real > 0.01) ? this._fmt(real) : '—'}</td>
        ${fmtVar(orc, real, negGood)}
      </tr>`;
    };

    const secRow = (label) =>
      `<tr style="background:var(--bg-secondary,#f8f5ec);">
        <td colspan="5" style="font-weight:700;font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:var(--text-muted);padding:7px 12px;">${label}</td>
      </tr>`;

    const totRow = (label, orc, real, bgColor='', negGood=false) => {
      const v    = real - orc;
      const p    = orc !== 0 ? (v / Math.abs(orc)) * 100 : (real !== 0 ? 100 : 0);
      const good = negGood ? v <= 0 : v >= 0;
      const sty  = Math.abs(v) < 0.01 ? '' : good ? 'color:var(--success,#16a34a)' : 'color:var(--danger,#ef4444)';
      const bg   = bgColor || 'background:var(--card-bg)';
      return `<tr style="${bg};border-top:2px solid var(--border-color);border-bottom:2px solid var(--border-color);">
        <td style="font-weight:800;font-size:14px;">${label}</td>
        <td style="font-weight:800;text-align:right;">${this._fmt(orc)}</td>
        <td style="font-weight:800;text-align:right;">${this._fmt(real)}</td>
        <td style="font-weight:800;${sty};text-align:right;">${Math.abs(v)<0.01?'—':(v>0?'+':'')+this._fmt(v)}</td>
        <td style="font-weight:800;${sty};text-align:right;">${orc!==0?(p>0?'+':'')+p.toFixed(1)+'%':'—'}</td>
      </tr>`;
    };

    const hasData = realizado.length > 0 || orcado.length > 0;

    return `
      <div class="page-header">
        <div class="page-header-text">
          <h2>DRE — Demonstrativo de Resultado</h2>
          <p>Orçado × Realizado · ${UI.escape(mesLabel)}</p>
        </div>
        <button class="btn btn-secondary" onclick="FinanceiroModule.switchTab('orcamento')">
          📊 Editar Orçamento
        </button>
      </div>

      <div class="filters-bar" style="margin-bottom:20px;">
        <label class="form-label" style="margin:0;white-space:nowrap;">Período:</label>
        <select class="filter-select" onchange="FinanceiroModule._state.filterMes=this.value;FinanceiroModule.switchTab('dre')">
          ${mesOptions}
        </select>
      </div>

      ${!hasData ? `
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-title">Sem dados para ${UI.escape(mesLabel)}</div>
          <div class="empty-desc">Nenhum lançamento ou orçamento encontrado para este período.</div>
        </div>
      ` : `
        <div class="table-card" style="overflow-x:auto;">
          <table class="data-table" style="min-width:580px;">
            <thead>
              <tr>
                <th style="text-align:left;min-width:200px;">Linha</th>
                <th style="text-align:right;min-width:110px;">Orçado</th>
                <th style="text-align:right;min-width:110px;">Realizado</th>
                <th style="text-align:right;min-width:120px;">Variação (R$)</th>
                <th style="text-align:right;min-width:90px;">Variação (%)</th>
              </tr>
            </thead>
            <tbody>
              ${secRow('📈 RECEITAS')}
              ${linhasRec.map(l => dreRow(l.label, l.orc, l.real, true)).join('')}
              ${outrosRecReal > 0.01 ? dreRow('Outros (não categorizados)', 0, outrosRecReal, true) : ''}
              ${totRow('TOTAL RECEITAS', totRecOrc, allRecReal)}

              ${secRow('📦 CUSTO DA MERCADORIA VENDIDA (CMV)')}
              ${linhasCMV.map(l => dreRow(l.label, l.orc, l.real, true, true)).join('')}
              ${(totCMVReal > 0.01 && linhasCMV.length === 0) ? dreRow('CMV (automático — Loja)', 0, totCMVReal, true, true) : ''}
              ${totRow('TOTAL CMV', totCMVOrc, totCMVReal, '', true)}

              ${totRow('= MARGEM BRUTA', margBrutaOrc, margBrutaReal, 'background:var(--bg-secondary,#f8f5ec)')}

              ${secRow('📉 DESPESAS OPERACIONAIS')}
              ${linhasDesp.map(l => dreRow(l.label, l.orc, l.real, true, true)).join('')}
              ${outrosDespReal > 0.01 ? dreRow('Outros (não categorizados)', 0, outrosDespReal, true, true) : ''}
              ${totRow('TOTAL DESPESAS', totDespOrc, allDespReal, '', true)}

              ${totRow('= RESULTADO',
                resultOrc, resultReal,
                resultReal >= 0 ? 'background:rgba(22,163,74,.08)' : 'background:rgba(239,68,68,.08)'
              )}
            </tbody>
          </table>
        </div>

        ${(totRecOrc === 0 && totCMVOrc === 0 && totDespOrc === 0) ? `
          <div style="margin-top:12px;padding:12px 16px;background:var(--bg-secondary);border-radius:10px;font-size:13px;color:var(--text-muted);">
            💡 Sem orçamento cadastrado para ${UI.escape(mesLabel)}.
            <a href="#" onclick="event.preventDefault();FinanceiroModule.switchTab('orcamento')" style="color:var(--primary,#3b9e8f);">
              Adicionar orçamento →
            </a>
          </div>` : ''}
      `}`;
  },

  /* ------------------------------------------------------------------ */
  /*  Orçamento — Modal / CRUD                                           */
  /* ------------------------------------------------------------------ */

  openModalOrcamento(id = null) {
    const orc    = id ? Storage.getById(this.STORAGE_KEY_ORC, id) : null;
    const isEdit = !!orc;
    const mesSel = this._state.filterMes || new Date().toISOString().slice(0, 7);

    const hoje = new Date();
    const mesesOpts = [];
    for (let i = -2; i <= 11; i++) {
      const d  = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      mesesOpts.push(`<option value="${ym}" ${(orc ? orc.periodo : mesSel) === ym ? 'selected' : ''}>${this._formatMesLabel(ym)}</option>`);
    }

    const tipoAtual = orc?.tipo || 'receita';
    const tipoOpts  = [
      { k: 'receita', l: 'Receita'     },
      { k: 'cmv',     l: 'CMV (Custo)' },
      { k: 'despesa', l: 'Despesa'     },
    ].map(t => `<option value="${t.k}" ${tipoAtual === t.k ? 'selected' : ''}>${t.l}</option>`).join('');

    UI.openModal({
      title:        isEdit ? 'Editar linha de orçamento' : 'Nova linha de orçamento',
      content: `
        <div class="form-grid">
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Período <span class="required-star">*</span></label>
              <select id="orc-periodo" class="form-select">${mesesOpts.join('')}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo <span class="required-star">*</span></label>
              <select id="orc-tipo" class="form-select" onchange="FinanceiroModule._toggleOrcCategoria(this.value)">${tipoOpts}</select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Categoria <span class="required-star">*</span></label>
            <select id="orc-cat" class="form-select">
              ${this._buildOrcCatOptions(tipoAtual, orc?.catId || '')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Valor Orçado (R$) <span class="required-star">*</span></label>
            <input id="orc-valor" type="number" class="form-input" min="0" step="0.01"
              placeholder="0,00" value="${orc ? orc.valor : ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Observações</label>
            <input id="orc-obs" type="text" class="form-input" placeholder="Opcional"
              value="${orc ? UI.escape(orc.obs || '') : ''}" />
          </div>
        </div>`,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Adicionar',
      onConfirm:    () => this.saveOrcamento(id),
    });
  },

  _buildOrcCatOptions(tipo, selected) {
    return this._DRE_LINHAS
      .filter(l => l.grupo === tipo)
      .map(c => `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${UI.escape(c.label)}</option>`)
      .join('');
  },

  _toggleOrcCategoria(tipo) {
    const el = document.getElementById('orc-cat');
    if (el) el.innerHTML = this._buildOrcCatOptions(tipo, '');
  },

  saveOrcamento(id = null) {
    const g     = n => document.getElementById(`orc-${n}`);
    const valor = g('valor');
    const cat   = g('cat');

    if (!valor?.value || parseFloat(valor.value) <= 0) {
      valor?.classList.add('error');
      UI.toast('Informe o valor orçado.', 'warning');
      return;
    }
    if (!cat?.value) {
      UI.toast('Selecione a categoria.', 'warning');
      return;
    }

    const tipo  = g('tipo')?.value || 'receita';
    const catId = cat.value;
    const linha = this._DRE_LINHAS.find(l => l.id === catId);

    const record = {
      periodo:   g('periodo')?.value || new Date().toISOString().slice(0, 7),
      tipo,
      catId,
      categoria: linha ? linha.label : catId,
      valor:     parseFloat(valor.value) || 0,
      obs:       g('obs')?.value.trim() || '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY_ORC, id, record);
      UI.toast('Linha de orçamento atualizada!', 'success');
    } else {
      Storage.create(this.STORAGE_KEY_ORC, record);
      UI.toast('Linha adicionada!', 'success');
    }

    UI.closeModal();
    this.switchTab('orcamento');
  },

  async deleteOrcamento(id) {
    const orc = Storage.getById(this.STORAGE_KEY_ORC, id);
    if (!orc) return;
    const ok = await UI.confirm(
      `Remover "${orc.categoria}" do orçamento de ${this._formatMesLabel(orc.periodo)}?`,
      'Remover linha'
    );
    if (!ok) return;
    Storage.delete(this.STORAGE_KEY_ORC, id);
    UI.toast('Linha removida.', 'success');
    this.switchTab('orcamento');
  },

  /* ------------------------------------------------------------------ */
  /*  Orçamento — Replicar / Modelo / Projetar Ano                       */
  /* ------------------------------------------------------------------ */

  /** Abre modal para replicar orçamento do mês atual para outros meses */
  openModalReplicar(mesOrigem) {
    const hoje = new Date();
    const meses = [];
    for (let i = 1; i <= 18; i++) {
      const d  = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      meses.push(ym);
    }
    const nLinhas = Storage.getAll(this.STORAGE_KEY_ORC).filter(o => o.periodo === mesOrigem).length;

    UI.openModal({
      title: `📋 Replicar orçamento de ${this._formatMesLabel(mesOrigem)}`,
      wide: true,
      content: `
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
          ${nLinhas} linha${nLinhas!==1?'s':''} serão copiadas para os meses selecionados.
        </div>

        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <label class="form-label" style="margin:0;">Meses de destino</label>
            <button type="button" class="btn btn-ghost btn-sm"
              onclick="document.querySelectorAll('.rep-mes-chk').forEach(c=>c.checked=true)">
              Selecionar todos
            </button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
            ${meses.map(m => `
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;
                background:var(--bg-secondary);border-radius:6px;padding:6px 10px;">
                <input type="checkbox" class="rep-mes-chk" value="${m}">
                ${this._formatMesLabel(m)}
              </label>`).join('')}
          </div>
        </div>

        <div class="form-grid-2" style="margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">Ajuste de valor (%)</label>
            <input id="rep-ajuste" type="number" class="form-input" value="0" step="0.5"
              placeholder="0 = sem ajuste, +5 = 5% a mais" />
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
              Ex: +5% para corrigir pelo IPCA anual
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Se o mês já tiver orçamento</label>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="radio" name="rep-conflito" value="manter" checked> Manter existente
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="radio" name="rep-conflito" value="substituir"> Substituir tudo
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="radio" name="rep-conflito" value="acrescentar"> Acrescentar linhas
              </label>
            </div>
          </div>
        </div>`,
      confirmLabel: 'Replicar',
      onConfirm: () => this._executarReplicacao(mesOrigem),
    });
  },

  _executarReplicacao(mesOrigem) {
    const selecionados = [...document.querySelectorAll('.rep-mes-chk:checked')].map(c => c.value);
    if (!selecionados.length) { UI.toast('Selecione pelo menos um mês.', 'warning'); return false; }

    const ajustePct  = parseFloat(document.getElementById('rep-ajuste')?.value) || 0;
    const conflito   = document.querySelector('input[name="rep-conflito"]:checked')?.value || 'manter';
    const linhasOrig = Storage.getAll(this.STORAGE_KEY_ORC).filter(o => o.periodo === mesOrigem);
    const fator      = 1 + ajustePct / 100;
    let criados = 0;

    selecionados.forEach(mes => {
      const existentes = Storage.getAll(this.STORAGE_KEY_ORC).filter(o => o.periodo === mes);
      if (existentes.length && conflito === 'manter') return; // pula
      if (existentes.length && conflito === 'substituir') {
        existentes.forEach(e => Storage.delete(this.STORAGE_KEY_ORC, e.id));
      }
      linhasOrig.forEach(l => {
        Storage.create(this.STORAGE_KEY_ORC, {
          periodo:   mes,
          tipo:      l.tipo,
          catId:     l.catId,
          categoria: l.categoria,
          valor:     Math.round((parseFloat(l.valor) * fator) * 100) / 100,
          obs:       l.obs || '',
        });
        criados++;
      });
    });

    UI.toast(`✅ ${criados} linha${criados!==1?'s':''} criada${criados!==1?'s':''} em ${selecionados.length} mês${selecionados.length!==1?'es':''}!`, 'success');
    UI.closeModal();
    this.switchTab('orcamento');
  },

  /** Projeta o orçamento do mês atual para todos os meses do ano */
  async projetarAnoTodo(mesOrigem) {
    const ano    = mesOrigem.slice(0, 4);
    const meses  = Array.from({length: 12}, (_, i) =>
      `${ano}-${String(i + 1).padStart(2,'0')}`
    ).filter(m => m !== mesOrigem);

    const linhasOrig  = Storage.getAll(this.STORAGE_KEY_ORC).filter(o => o.periodo === mesOrigem);
    const jaExistem   = meses.filter(m =>
      Storage.getAll(this.STORAGE_KEY_ORC).some(o => o.periodo === m)
    );

    const msg = jaExistem.length
      ? `Replicar as ${linhasOrig.length} linhas de ${this._formatMesLabel(mesOrigem)} para todos os ${meses.length} meses restantes de ${ano}?\n\n⚠️ ${jaExistem.length} mês${jaExistem.length!==1?'es':''} já tem orçamento e será substituído.`
      : `Replicar as ${linhasOrig.length} linhas de ${this._formatMesLabel(mesOrigem)} para todos os ${meses.length} meses restantes de ${ano}?`;

    const ok = await UI.confirm(msg, `📅 Projetar ${ano} completo`);
    if (!ok) return;

    let criados = 0;
    meses.forEach(mes => {
      // Remove existentes e recria
      Storage.getAll(this.STORAGE_KEY_ORC)
        .filter(o => o.periodo === mes)
        .forEach(e => Storage.delete(this.STORAGE_KEY_ORC, e.id));
      linhasOrig.forEach(l => {
        Storage.create(this.STORAGE_KEY_ORC, {
          periodo:   mes,
          tipo:      l.tipo,
          catId:     l.catId,
          categoria: l.categoria,
          valor:     parseFloat(l.valor),
          obs:       l.obs || '',
        });
        criados++;
      });
    });

    UI.toast(`✅ Ano ${ano} projetado! ${criados} linhas criadas em ${meses.length} meses.`, 'success');
    this.switchTab('orcamento');
  },

  /** Salva as linhas do mês atual como modelo permanente */
  async salvarComoModelo(mesSel) {
    const linhas = Storage.getAll(this.STORAGE_KEY_ORC).filter(o => o.periodo === mesSel);
    if (!linhas.length) { UI.toast('Nenhuma linha para salvar.', 'warning'); return; }

    const temModelo = Storage.getAll(this.STORAGE_KEY_MODELO).length > 0;
    if (temModelo) {
      const ok = await UI.confirm('Substituir o modelo permanente existente pelas linhas deste mês?', 'Salvar Modelo');
      if (!ok) return;
      // Limpa modelo anterior
      Storage.getAll(this.STORAGE_KEY_MODELO).forEach(m => Storage.delete(this.STORAGE_KEY_MODELO, m.id));
    }

    linhas.forEach(l => {
      Storage.create(this.STORAGE_KEY_MODELO, {
        tipo:      l.tipo,
        catId:     l.catId,
        categoria: l.categoria,
        valor:     parseFloat(l.valor),
        obs:       l.obs || '',
      });
    });

    UI.toast(`💾 Modelo salvo com ${linhas.length} linha${linhas.length!==1?'s':''}!`, 'success');
    this.switchTab('orcamento');
  },

  /** Aplica o modelo permanente ao mês selecionado */
  async carregarModelo(mesSel) {
    const modelo  = Storage.getAll(this.STORAGE_KEY_MODELO);
    if (!modelo.length) { UI.toast('Nenhum modelo salvo ainda. Crie linhas e clique em "💾 Salvar Modelo".', 'info'); return; }

    const existentes = Storage.getAll(this.STORAGE_KEY_ORC).filter(o => o.periodo === mesSel);
    if (existentes.length) {
      const ok = await UI.confirm(
        `Substituir as ${existentes.length} linhas existentes de ${this._formatMesLabel(mesSel)} pelo modelo (${modelo.length} linhas)?`,
        'Carregar Modelo'
      );
      if (!ok) return;
      existentes.forEach(e => Storage.delete(this.STORAGE_KEY_ORC, e.id));
    }

    modelo.forEach(m => {
      Storage.create(this.STORAGE_KEY_ORC, {
        periodo:   mesSel,
        tipo:      m.tipo,
        catId:     m.catId,
        categoria: m.categoria,
        valor:     parseFloat(m.valor),
        obs:       m.obs || '',
      });
    });

    UI.toast(`✅ Modelo aplicado: ${modelo.length} linha${modelo.length!==1?'s':''} criada${modelo.length!==1?'s':''} em ${this._formatMesLabel(mesSel)}.`, 'success');
    this.switchTab('orcamento');
  },

  /* ------------------------------------------------------------------ */
  /*  Orçamento — Projeção por Linha de Base (ano anterior × crescimento) */
  /* ------------------------------------------------------------------ */

  /** Abre modal para gerar orçamento baseado no realizado do ano anterior */
  gerarProjecaoLinhaDeBase() {
    const hoje     = new Date();
    const anoAtual = hoje.getFullYear();

    // Anos com lançamentos realizados
    const todosAnos = [...new Set(
      this.getAll()
        .map(l => l.data ? l.data.slice(0, 4) : null)
        .filter(Boolean)
    )].sort((a, b) => b.localeCompare(a));

    const anoBaseDefault = String(anoAtual - 1);
    const anoBaseOpts = todosAnos.length
      ? todosAnos.map(a =>
          `<option value="${a}" ${a === anoBaseDefault ? 'selected' : ''}>${a}</option>`
        ).join('')
      : `<option value="${anoBaseDefault}">${anoBaseDefault} (sem dados)</option>`;

    const anosDestino = [anoAtual, anoAtual + 1, anoAtual + 2];
    const anoDestOpts = anosDestino.map(a =>
      `<option value="${a}" ${a === anoAtual ? 'selected' : ''}>${a}</option>`
    ).join('');

    const semDados = !todosAnos.length;

    UI.openModal({
      title:   '📈 Projeção por Linha de Base',
      wide:    true,
      content: `
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;
          background:var(--bg-secondary);border-radius:8px;padding:12px;line-height:1.6;">
          Gera o orçamento de cada mês usando o <strong>realizado do mesmo mês no ano de base</strong>
          multiplicado pelo crescimento definido, respeitando a sazonalidade.
          Os valores gerados podem ser ajustados individualmente após a criação.
        </div>

        ${semDados ? `
          <div style="padding:12px;background:rgba(239,68,68,.08);border-radius:8px;
            font-size:13px;color:var(--danger,#ef4444);margin-bottom:16px;">
            ⚠️ Nenhum lançamento encontrado. Para usar esta função, cadastre os lançamentos
            realizados do ano de base primeiro. Você ainda pode gerar um orçamento zerado
            para depois preencher manualmente.
          </div>` : ''}

        <div class="form-grid-2" style="margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">Ano de base — realizado <span class="required-star">*</span></label>
            <select id="proj-ano-base" class="form-select"
              onchange="FinanceiroModule._atualizarPreviaProjecao()">${anoBaseOpts}</select>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
              Fonte dos valores realizados (sazonalidade preservada)
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Ano de destino — orçamento <span class="required-star">*</span></label>
            <select id="proj-ano-dest" class="form-select"
              onchange="FinanceiroModule._atualizarPreviaProjecao()">${anoDestOpts}</select>
          </div>
        </div>

        <div class="form-grid-2" style="margin-bottom:16px;">
          <div class="form-group">
            <label class="form-label">Crescimento — Receitas (%)</label>
            <input id="proj-pct-rec" type="number" class="form-input" value="0" step="0.5"
              placeholder="0 = sem crescimento"
              oninput="FinanceiroModule._atualizarPreviaProjecao()" />
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
              Ex: +10 para projetar 10% a mais de receita
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Crescimento — Despesas / CMV (%)</label>
            <input id="proj-pct-desp" type="number" class="form-input" value="0" step="0.5"
              placeholder="0 = sem crescimento"
              oninput="FinanceiroModule._atualizarPreviaProjecao()" />
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
              Ex: +6 para reajuste salarial / inflação de custos
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">Se o mês já tiver orçamento</label>
          <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:6px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
              <input type="radio" name="proj-conflito" value="substituir" checked>
              Substituir (recomendado)
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
              <input type="radio" name="proj-conflito" value="manter"> Manter existente (pular mês)
            </label>
          </div>
        </div>

        <div id="proj-preview">
          <!-- preenchido por _atualizarPreviaProjecao -->
        </div>`,
      confirmLabel: 'Aplicar Projeção',
      onConfirm:    () => this._aplicarProjecao(),
    });

    requestAnimationFrame(() => this._atualizarPreviaProjecao());
  },

  /** Atualiza a tabela de pré-visualização no modal de projeção */
  _atualizarPreviaProjecao() {
    const el = document.getElementById('proj-preview');
    if (!el) return;

    const anoBase = document.getElementById('proj-ano-base')?.value;
    const anoDest = document.getElementById('proj-ano-dest')?.value;
    if (!anoBase || !anoDest) return;

    const pctRec    = parseFloat(document.getElementById('proj-pct-rec')?.value)  || 0;
    const pctDesp   = parseFloat(document.getElementById('proj-pct-desp')?.value) || 0;
    const fatorRec  = 1 + pctRec  / 100;
    const fatorDesp = 1 + pctDesp / 100;

    let totalBaseRec = 0, totalBaseDesp = 0;
    let totalDestRec = 0, totalDestDesp = 0;
    let mesesComDados = 0;

    const rows = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(mm => {
      const mesBase = `${anoBase}-${mm}`;
      const mesDest = `${anoDest}-${mm}`;

      const lancsMes = this.getAll().filter(l =>
        l.data && l.data.slice(0, 7) === mesBase && l.status !== 'cancelado'
      );

      const recBase  = lancsMes.filter(l => l.tipo === 'receita')
        .reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
      const despBase = lancsMes.filter(l => l.tipo === 'despesa' || l.tipo === 'cmv')
        .reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);

      const recDest  = Math.round(recBase  * fatorRec  * 100) / 100;
      const despDest = Math.round(despBase * fatorDesp * 100) / 100;

      const temOrc  = Storage.getAll(this.STORAGE_KEY_ORC).some(o => o.periodo === mesDest);
      const semDado = recBase < 0.01 && despBase < 0.01;

      if (!semDado) mesesComDados++;
      totalBaseRec  += recBase;
      totalBaseDesp += despBase;
      totalDestRec  += recDest;
      totalDestDesp += despDest;

      const nomeMes  = new Date(+anoBase, +mm - 1, 1)
        .toLocaleDateString('pt-BR', { month: 'short' })
        .replace('.', '');
      const statusBadge = temOrc
        ? `<span class="badge badge-warning" style="font-size:10px;">já tem orç.</span>`
        : semDado
          ? `<span class="badge badge-gray" style="font-size:10px;">sem dados</span>`
          : `<span class="badge badge-success" style="font-size:10px;">novo</span>`;

      return `<tr style="${semDado ? 'opacity:.42' : ''}">
        <td style="font-weight:600;text-transform:capitalize;">${nomeMes}</td>
        <td style="text-align:right;">${recBase  > 0.01 ? this._fmt(recBase)  : '—'}</td>
        <td style="text-align:right;">${despBase > 0.01 ? this._fmt(despBase) : '—'}</td>
        <td style="text-align:right;color:var(--success,#16a34a);font-weight:600;">${recDest  > 0.01 ? this._fmt(recDest)  : '—'}</td>
        <td style="text-align:right;color:var(--danger,#ef4444);font-weight:600;">${despDest > 0.01 ? this._fmt(despDest) : '—'}</td>
        <td>${statusBadge}</td>
      </tr>`;
    }).join('');

    const varRec  = totalBaseRec  > 0.01 ? `(${pctRec  >= 0 ? '+' : ''}${pctRec}%)` : '';
    const varDesp = totalBaseDesp > 0.01 ? `(${pctDesp >= 0 ? '+' : ''}${pctDesp}%)` : '';

    el.innerHTML = `
      <div style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;
        color:var(--text-muted);margin-bottom:8px;">
        Pré-visualização — ${mesesComDados} mês${mesesComDados !== 1 ? 'es' : ''} com dados em ${anoBase}
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" style="min-width:520px;font-size:12px;">
          <thead>
            <tr>
              <th>Mês</th>
              <th style="text-align:right;">Rec. ${anoBase}</th>
              <th style="text-align:right;">Desp. ${anoBase}</th>
              <th style="text-align:right;">Rec. orç. ${anoDest} ${varRec}</th>
              <th style="text-align:right;">Desp. orç. ${anoDest} ${varDesp}</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="font-weight:800;border-top:2px solid var(--border-color);">
              <td>TOTAL ANO</td>
              <td style="text-align:right;">${this._fmt(totalBaseRec)}</td>
              <td style="text-align:right;">${this._fmt(totalBaseDesp)}</td>
              <td style="text-align:right;color:var(--success,#16a34a);">${this._fmt(totalDestRec)}</td>
              <td style="text-align:right;color:var(--danger,#ef4444);">${this._fmt(totalDestDesp)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      ${mesesComDados === 0 ? `
        <div style="margin-top:10px;padding:10px 14px;background:rgba(239,68,68,.08);
          border-radius:8px;font-size:13px;color:var(--danger,#ef4444);">
          ⚠️ Nenhum dado encontrado para ${anoBase}. Será criado orçamento com valores zero —
          você poderá editá-los manualmente linha por linha.
        </div>` : `
        <div style="margin-top:10px;padding:10px 14px;background:rgba(22,163,74,.06);
          border-radius:8px;font-size:12px;color:var(--text-muted);">
          💡 Após aplicar, cada linha pode ser ajustada individualmente pelo botão ✏️ na tabela de orçamento.
        </div>`}`;
  },

  /** Aplica a projeção de linha de base para todos os 12 meses do ano de destino */
  _aplicarProjecao() {
    const anoBase = document.getElementById('proj-ano-base')?.value;
    const anoDest = document.getElementById('proj-ano-dest')?.value;
    if (!anoBase || !anoDest) { UI.toast('Selecione os anos.', 'warning'); return false; }
    if (anoBase === anoDest)  { UI.toast('Ano de base e destino não podem ser iguais.', 'warning'); return false; }

    const pctRec   = parseFloat(document.getElementById('proj-pct-rec')?.value)  || 0;
    const pctDesp  = parseFloat(document.getElementById('proj-pct-desp')?.value) || 0;
    const fatorRec  = 1 + pctRec  / 100;
    const fatorDesp = 1 + pctDesp / 100;
    const conflito  = document.querySelector('input[name="proj-conflito"]:checked')?.value || 'substituir';

    let criados = 0, mesesAfetados = 0, mesesPulados = 0;

    Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).forEach(mm => {
      const mesBase = `${anoBase}-${mm}`;
      const mesDest = `${anoDest}-${mm}`;

      const existentes = Storage.getAll(this.STORAGE_KEY_ORC).filter(o => o.periodo === mesDest);
      if (existentes.length && conflito === 'manter') { mesesPulados++; return; }
      if (existentes.length) {
        existentes.forEach(e => Storage.delete(this.STORAGE_KEY_ORC, e.id));
      }

      const lancsMes = this.getAll().filter(l =>
        l.data && l.data.slice(0, 7) === mesBase && l.status !== 'cancelado'
      );

      // Mapear para linhas DRE (preserva categorias detalhadas)
      this._DRE_LINHAS.forEach(linha => {
        const total = lancsMes
          .filter(l => l.tipo === linha.grupo &&
            linha.cats.some(c => c.toLowerCase() === (l.categoria || '').toLowerCase()))
          .reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);

        if (total < 0.01) return;

        const fator    = linha.grupo === 'receita' ? fatorRec : fatorDesp;
        const valorOrc = Math.round(total * fator * 100) / 100;

        Storage.create(this.STORAGE_KEY_ORC, {
          periodo:   mesDest,
          tipo:      linha.grupo,
          catId:     linha.id,
          categoria: linha.label,
          valor:     valorOrc,
          obs:       `Base: ${this._fmt(total)} realizado em ${this._formatMesLabel(mesBase)}`,
        });
        criados++;
      });

      // Itens não mapeados nas linhas DRE → agrupar em "Outros"
      ['receita', 'cmv', 'despesa'].forEach(tipo => {
        const mapeadas  = this._DRE_LINHAS.filter(l => l.grupo === tipo)
          .flatMap(l => l.cats.map(c => c.toLowerCase()));
        const naoMapeadas = lancsMes.filter(l =>
          l.tipo === tipo &&
          !mapeadas.includes((l.categoria || '').toLowerCase())
        );
        if (!naoMapeadas.length) return;

        const total = naoMapeadas.reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
        if (total < 0.01) return;

        const fator      = tipo === 'receita' ? fatorRec : fatorDesp;
        const linhaOutro = this._DRE_LINHAS.find(l =>
          l.grupo === tipo && (l.id === 'outro_r' || l.id === 'outro_d' || l.id === 'cmv_loja')
        );

        Storage.create(this.STORAGE_KEY_ORC, {
          periodo:   mesDest,
          tipo,
          catId:     linhaOutro?.id  || `outro_${tipo}`,
          categoria: linhaOutro?.label || 'Outros',
          valor:     Math.round(total * fator * 100) / 100,
          obs:       `Base: ${this._fmt(total)} realizado em ${this._formatMesLabel(mesBase)} (não categ.)`,
        });
        criados++;
      });

      mesesAfetados++;
    });

    const aviso = mesesPulados > 0 ? ` · ${mesesPulados} mês${mesesPulados !== 1 ? 'es' : ''} mantido${mesesPulados !== 1 ? 's' : ''} (já tinham orçamento)` : '';
    UI.toast(
      `✅ Projeção ${anoDest} gerada! ${criados} linha${criados !== 1 ? 's' : ''} em ${mesesAfetados} mês${mesesAfetados !== 1 ? 'es' : ''}${aviso}.`,
      'success'
    );
    UI.closeModal();
    this._state.filterMes = `${anoDest}-01`;
    this.switchTab('orcamento');
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
    if (tipo === 'cmv') {
      const map = { cmv_loja: 'CMV — Custo dos Produtos', cmv_interno: 'Consumo Interno' };
      return map[cat] || cat;
    }
    // Try legacy key map first (for old data), then show stored value as-is
    return (tipo === 'receita'
      ? (this.CATEGORIA_RECEITA[cat] || cat)
      : (this.CATEGORIA_DESPESA[cat] || cat));
  },
};
