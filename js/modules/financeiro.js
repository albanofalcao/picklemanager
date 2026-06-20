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
  STORAGE_KEY_CAIXA:  'sessoes_caixa',

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
    cortesia:  { label: 'Cortesia',  badge: 'badge-blue'    },
  },

  CATEGORIA_RECEITA: {
    mensalidade:       'Mensalidade',
    inscricao_evento:  'Inscrição em Evento',
    aula_avulsa:       'Aula Avulsa',
    pacote:            'Pacote de Aulas',
    day_use:           'Day Use',
    aula_experimental: 'Aula Experimental',
    outro_r:           'Outro',
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

    const caixaAtual  = this.getCaixaAtual();
    const caixaBadge  = caixaAtual
      ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-left:4px;vertical-align:middle;"></span>`
      : '';

    const tabsBar = `
      <div class="tabs-bar">
        <button class="tab-btn ${tab === 'lancamentos' ? 'active' : ''}" onclick="FinanceiroModule.switchTab('lancamentos')">💰 Lançamentos</button>
        <button class="tab-btn ${tab === 'caixa'       ? 'active' : ''}" onclick="FinanceiroModule.switchTab('caixa')">🗂️ Caixa${caixaBadge}</button>
        <button class="tab-btn ${tab === 'orcamento'   ? 'active' : ''}" onclick="FinanceiroModule.switchTab('orcamento')">📊 Orçamento</button>
        <button class="tab-btn ${tab === 'dre'         ? 'active' : ''}" onclick="FinanceiroModule.switchTab('dre')">📈 DRE</button>
        <button class="tab-btn ${tab === 'planoContas' ? 'active' : ''}" onclick="FinanceiroModule.switchTab('planoContas')">📋 Plano de Contas</button>
      </div>`;

    if (tab === 'caixa') {
      area.innerHTML = tabsBar + this._renderCaixa();
      return;
    }
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
        <div class="export-group">
          <div class="export-group-col">
            <span class="export-group-label">📥 Baixar planilha</span>
            <span class="export-hint">registros do filtro atual</span>
          </div>
          <button class="btn-export"
            onclick="FinanceiroModule._exportExcel()"
            title="Exporta os lançamentos financeiros atualmente exibidos (respeitando filtros de período, tipo e status).&#10;&#10;Colunas incluídas:&#10;Data · Tipo · Descrição · Categoria · Valor (R$) · Forma de Pagamento · Status · Referência · Observações">
            Financeiro <span class="export-fmt">.xlsx</span>
          </button>
        </div>
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

    const caixaAberto = this.getCaixaAtual();
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
      caixa_id:       (!id && caixaAberto) ? caixaAberto.id : undefined,
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

  /* ------------------------------------------------------------------ */
  /*  Caixa — helpers                                                     */
  /* ------------------------------------------------------------------ */

  getCaixaAtual() {
    return Storage.getAll(this.STORAGE_KEY_CAIXA)
      .find(s => s.status === 'aberto') || null;
  },

  _calcTotaisCaixa(caixaId) {
    const lancs = Storage.getAll(this.STORAGE_KEY)
      .filter(l => l.caixa_id === caixaId && l.status !== 'cancelado');

    const formas = ['dinheiro','pix','cartao_credito','cartao_debito','transferencia','boleto'];
    const totForma = {};
    formas.forEach(f => { totForma[f] = 0; });

    let totalReceita = 0, totalDespesa = 0;
    lancs.forEach(l => {
      const v = parseFloat(l.valor) || 0;
      const forma = l.formaPagamento || 'outros';
      totForma[forma] = (totForma[forma] || 0) + (l.tipo === 'receita' ? v : 0);
      if (l.tipo === 'receita') totalReceita += v;
      else if (l.tipo === 'despesa') totalDespesa += v;
    });

    return { lancs, totForma, totalReceita, totalDespesa, saldoSistema: totalReceita - totalDespesa };
  },

  /* ------------------------------------------------------------------ */
  /*  Caixa — abrir / fechar                                              */
  /* ------------------------------------------------------------------ */

  abrirCaixa() {
    if (this.getCaixaAtual()) {
      UI.toast('Já existe um caixa aberto.', 'warning');
      return;
    }
    const responsavel = document.getElementById('cx-responsavel')?.value?.trim();
    const saldoInicial = parseFloat(document.getElementById('cx-saldo-inicial')?.value) || 0;
    if (!responsavel) {
      UI.toast('Informe o nome do responsável.', 'warning');
      return;
    }
    const agora = new Date();
    Storage.create(this.STORAGE_KEY_CAIXA, {
      data:           agora.toISOString().slice(0, 10),
      hora_abertura:  agora.toTimeString().slice(0, 5),
      responsavel,
      saldo_inicial:  saldoInicial,
      status:         'aberto',
    });
    UI.toast(`✅ Caixa aberto por ${responsavel}`, 'success');
    this.render();
  },

  abrirModalFecharCaixa() {
    const caixa = this.getCaixaAtual();
    if (!caixa) return;
    const { totForma, totalReceita, totalDespesa, saldoSistema, lancs } = this._calcTotaisCaixa(caixa.id);
    const saldoEsperadoDinheiro = (parseFloat(caixa.saldo_inicial) || 0) + (totForma.dinheiro || 0) - totalDespesa;

    UI.openModal({
      title: '🔒 Fechar Caixa',
      hideFooter: true,
      content: `
        <div style="display:flex;flex-direction:column;gap:16px;">

          <div style="background:var(--bg-secondary,#f8f5ec);border-radius:10px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
            <div><span style="color:var(--text-muted)">Abertura:</span> <strong>${caixa.data} às ${caixa.hora_abertura}</strong></div>
            <div><span style="color:var(--text-muted)">Responsável:</span> <strong>${UI.escape(caixa.responsavel)}</strong></div>
            <div><span style="color:var(--text-muted)">Fundo inicial:</span> <strong>${this._fmt(caixa.saldo_inicial)}</strong></div>
            <div><span style="color:var(--text-muted)">Transações:</span> <strong>${lancs.length}</strong></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:13px;text-align:center;">
            <div style="background:rgba(22,163,74,.08);border-radius:8px;padding:10px;">
              <div style="color:var(--text-muted);font-size:11px;">Total Receitas</div>
              <div style="font-weight:700;color:#16a34a;">${this._fmt(totalReceita)}</div>
            </div>
            <div style="background:rgba(239,68,68,.08);border-radius:8px;padding:10px;">
              <div style="color:var(--text-muted);font-size:11px;">Total Despesas</div>
              <div style="font-weight:700;color:#ef4444;">${this._fmt(totalDespesa)}</div>
            </div>
            <div style="background:rgba(59,158,143,.08);border-radius:8px;padding:10px;">
              <div style="color:var(--text-muted);font-size:11px;">Saldo Sistema</div>
              <div style="font-weight:700;">${this._fmt(saldoSistema)}</div>
            </div>
          </div>

          <div style="font-size:13px;">
            <div style="font-weight:600;margin-bottom:8px;">Recebimentos por forma de pagamento:</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              ${[
                ['💵 Dinheiro',        'dinheiro'],
                ['📲 PIX',             'pix'],
                ['💳 Cartão Crédito',  'cartao_credito'],
                ['💳 Cartão Débito',   'cartao_debito'],
                ['🏦 Transferência',   'transferencia'],
                ['📄 Boleto',          'boleto'],
              ].map(([label, key]) => totForma[key] > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--bg-secondary,#f8f5ec);border-radius:6px;">
                  <span>${label}</span><strong>${this._fmt(totForma[key])}</strong>
                </div>` : '').join('') || '<div style="color:var(--text-muted);font-size:12px;">Sem movimentações nesta sessão.</div>'}
            </div>
          </div>

          <div style="border-top:1px solid var(--border-color,#e5e7eb);padding-top:14px;">
            <div style="font-weight:600;margin-bottom:8px;">Contagem física de dinheiro:</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">
              Esperado em caixa: <strong>${this._fmt(saldoEsperadoDinheiro)}</strong>
              (fundo + entradas em dinheiro)
            </div>
            <div class="form-group">
              <label class="form-label">Total contado (R$) *</label>
              <input id="cx-contado" type="number" class="form-input" step="0.01" min="0"
                placeholder="0,00"
                oninput="FinanceiroModule._atualizarDiferenca(${saldoEsperadoDinheiro})" />
            </div>
            <div id="cx-diferenca-preview" style="font-size:13px;margin-top:6px;color:var(--text-muted);">
              Digite o valor contado para ver a diferença.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea id="cx-obs-fechar" class="form-input" rows="2"
              placeholder="Divergências, ocorrências, etc."></textarea>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px;">
            <button class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
            <button class="btn btn-danger" onclick="FinanceiroModule.confirmarFechamento()">
              🔒 Confirmar Fechamento
            </button>
          </div>
        </div>
      `,
    });
  },

  _atualizarDiferenca(esperado) {
    const contado = parseFloat(document.getElementById('cx-contado')?.value) || 0;
    const dif = contado - esperado;
    const el = document.getElementById('cx-diferenca-preview');
    if (!el) return;
    const cor = Math.abs(dif) < 0.01 ? '#16a34a' : dif < 0 ? '#ef4444' : '#d97706';
    const txt = Math.abs(dif) < 0.01
      ? '✅ Sem diferença — caixa fechado corretamente.'
      : dif < 0
        ? `⚠️ Falta ${this._fmt(Math.abs(dif))} no caixa.`
        : `📈 Sobra ${this._fmt(dif)} no caixa.`;
    el.innerHTML = `<span style="color:${cor};font-weight:600;">${txt}</span>`;
  },

  confirmarFechamento() {
    const caixa   = this.getCaixaAtual();
    if (!caixa) return;
    const contado = parseFloat(document.getElementById('cx-contado')?.value);
    if (isNaN(contado)) { UI.toast('Informe o valor contado.', 'warning'); return; }
    const obs     = document.getElementById('cx-obs-fechar')?.value?.trim() || '';

    const { totForma, totalReceita, totalDespesa, saldoSistema } = this._calcTotaisCaixa(caixa.id);
    const saldoEsperado = (parseFloat(caixa.saldo_inicial) || 0) + (totForma.dinheiro || 0) - totalDespesa;
    const diferenca = contado - saldoEsperado;

    const agora = new Date();
    Storage.update(this.STORAGE_KEY_CAIXA, caixa.id, {
      status:           'fechado',
      hora_fechamento:  agora.toTimeString().slice(0, 5),
      total_receita:    totalReceita,
      total_despesa:    totalDespesa,
      saldo_sistema:    saldoSistema,
      saldo_esperado:   saldoEsperado,
      saldo_contado:    contado,
      diferenca,
      tot_dinheiro:     totForma.dinheiro || 0,
      tot_pix:          totForma.pix || 0,
      tot_cartao_cred:  totForma.cartao_credito || 0,
      tot_cartao_deb:   totForma.cartao_debito || 0,
      observacao:       obs,
    });

    UI.closeModal();
    const difTxt = Math.abs(diferenca) < 0.01
      ? 'Sem diferença.'
      : diferenca < 0
        ? `Falta ${this._fmt(Math.abs(diferenca))}.`
        : `Sobra ${this._fmt(diferenca)}.`;
    UI.toast(`🔒 Caixa fechado. ${difTxt}`, Math.abs(diferenca) < 0.01 ? 'success' : 'warning');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Caixa — render                                                      */
  /* ------------------------------------------------------------------ */

  _renderCaixa() {
    const caixa    = this.getCaixaAtual();
    const historico = Storage.getAll(this.STORAGE_KEY_CAIXA)
      .filter(s => s.status === 'fechado')
      .sort((a, b) => (b.data + b.hora_fechamento).localeCompare(a.data + a.hora_fechamento))
      .slice(0, 15);

    const secAbrir = !caixa ? `
      <div style="max-width:440px;margin:0 auto;">
        <div style="text-align:center;padding:24px 0 20px;">
          <div style="font-size:48px;">🗂️</div>
          <h3 style="margin:8px 0 4px;">Nenhum caixa aberto</h3>
          <p style="color:var(--text-muted);font-size:14px;">
            Abra o caixa para começar a registrar movimentações do dia.
          </p>
        </div>
        <div class="form-group">
          <label class="form-label">Responsável *</label>
          <input id="cx-responsavel" class="form-input" type="text"
            placeholder="Nome do operador de caixa" />
        </div>
        <div class="form-group">
          <label class="form-label">Fundo de caixa (dinheiro inicial)</label>
          <input id="cx-saldo-inicial" class="form-input" type="number"
            step="0.01" min="0" placeholder="0,00" value="0" />
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:8px;"
          onclick="FinanceiroModule.abrirCaixa()">
          🔓 Abrir Caixa
        </button>
      </div>
    ` : '';

    let secAberto = '';
    if (caixa) {
      const { totForma, totalReceita, totalDespesa, saldoSistema, lancs } = this._calcTotaisCaixa(caixa.id);
      const duracao = (() => {
        const [hA, mA] = caixa.hora_abertura.split(':').map(Number);
        const agora    = new Date();
        const diffMin  = Math.round((agora - new Date().setHours(hA, mA, 0, 0)) / 60000);
        if (diffMin < 0 || diffMin > 1440) return '—';
        return diffMin < 60
          ? `${diffMin} min`
          : `${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;
      })();

      const linhaLanc = (l) => {
        const v = parseFloat(l.valor) || 0;
        const cor = l.tipo === 'receita' ? '#16a34a' : '#ef4444';
        const sinal = l.tipo === 'receita' ? '+' : '−';
        return `
          <tr>
            <td style="font-size:12px;color:var(--text-muted);">${l.data || ''}</td>
            <td style="font-size:13px;">${UI.escape(l.descricao)}</td>
            <td style="font-size:12px;color:var(--text-muted);">${this.FORMA_PAGAMENTO[l.formaPagamento] || l.formaPagamento || '—'}</td>
            <td style="font-weight:700;color:${cor};text-align:right;">${sinal} ${this._fmt(v)}</td>
          </tr>`;
      };

      secAberto = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;
              background:rgba(22,163,74,.12);color:#16a34a;font-weight:600;font-size:13px;">
              <span style="width:8px;height:8px;border-radius:50%;background:#16a34a;display:inline-block;"></span>
              Caixa Aberto
            </span>
            <span style="font-size:13px;color:var(--text-muted);">
              Desde ${caixa.hora_abertura} · ${UI.escape(caixa.responsavel)} · ${duracao}
            </span>
          </div>
          <button class="btn btn-danger" onclick="FinanceiroModule.abrirModalFecharCaixa()">
            🔒 Fechar Caixa
          </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
          <div style="background:var(--card-bg);border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Fundo Inicial</div>
            <div style="font-size:18px;font-weight:700;margin-top:4px;">${this._fmt(caixa.saldo_inicial)}</div>
          </div>
          <div style="background:rgba(22,163,74,.06);border:1px solid rgba(22,163,74,.2);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Receitas</div>
            <div style="font-size:18px;font-weight:700;color:#16a34a;margin-top:4px;">${this._fmt(totalReceita)}</div>
          </div>
          <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Despesas</div>
            <div style="font-size:18px;font-weight:700;color:#ef4444;margin-top:4px;">${this._fmt(totalDespesa)}</div>
          </div>
          <div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Saldo Sistema</div>
            <div style="font-size:18px;font-weight:700;color:#2563eb;margin-top:4px;">${this._fmt(saldoSistema)}</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
          ${[
            ['💵','dinheiro','Dinheiro'],
            ['📲','pix','PIX'],
            ['💳','cartao_credito','Crédito'],
            ['💳','cartao_debito','Débito'],
            ['🏦','transferencia','Transfer.'],
          ].filter(([,k]) => (totForma[k]||0) > 0).map(([icon,k,label]) => `
            <span style="padding:5px 12px;border-radius:20px;font-size:13px;
              background:var(--bg-secondary,#f8f5ec);border:1px solid var(--border-color,#e5e7eb);">
              ${icon} ${label}: <strong>${this._fmt(totForma[k])}</strong>
            </span>`).join('')}
        </div>

        <div style="background:var(--card-bg);border:1px solid var(--border-color,#e5e7eb);border-radius:10px;overflow:hidden;">
          <div style="padding:12px 16px;font-weight:600;font-size:14px;border-bottom:1px solid var(--border-color,#e5e7eb);">
            Movimentações desta sessão (${lancs.length})
          </div>
          ${lancs.length ? `
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:var(--bg-secondary,#f8f5ec);">
                  <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text-muted);">Data</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text-muted);">Descrição</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text-muted);">Forma</th>
                  <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:var(--text-muted);">Valor</th>
                </tr>
              </thead>
              <tbody>${lancs.map(linhaLanc).join('')}</tbody>
            </table>
          </div>` : `
          <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
            Nenhuma movimentação registrada neste caixa ainda.
          </div>`}
        </div>
      `;
    }

    const secHistorico = historico.length ? `
      <div style="margin-top:28px;">
        <h4 style="font-size:14px;font-weight:600;margin-bottom:12px;">Histórico de fechamentos</h4>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:var(--bg-secondary,#f8f5ec);">
                <th style="padding:8px 12px;text-align:left;">Data</th>
                <th style="padding:8px 12px;text-align:left;">Responsável</th>
                <th style="padding:8px 12px;text-align:left;">Abertura</th>
                <th style="padding:8px 12px;text-align:left;">Fechamento</th>
                <th style="padding:8px 12px;text-align:right;">Receitas</th>
                <th style="padding:8px 12px;text-align:right;">Saldo Sistema</th>
                <th style="padding:8px 12px;text-align:right;">Diferença</th>
              </tr>
            </thead>
            <tbody>
              ${historico.map(s => {
                const dif = parseFloat(s.diferenca) || 0;
                const difCor = Math.abs(dif) < 0.01 ? '#16a34a' : dif < 0 ? '#ef4444' : '#d97706';
                const difTxt = Math.abs(dif) < 0.01 ? '—' : (dif > 0 ? '+' : '') + this._fmt(dif);
                return `
                  <tr style="border-bottom:1px solid var(--border-color,#e5e7eb);">
                    <td style="padding:8px 12px;">${s.data}</td>
                    <td style="padding:8px 12px;">${UI.escape(s.responsavel || '—')}</td>
                    <td style="padding:8px 12px;">${s.hora_abertura || '—'}</td>
                    <td style="padding:8px 12px;">${s.hora_fechamento || '—'}</td>
                    <td style="padding:8px 12px;text-align:right;color:#16a34a;font-weight:600;">${this._fmt(s.total_receita)}</td>
                    <td style="padding:8px 12px;text-align:right;font-weight:600;">${this._fmt(s.saldo_sistema)}</td>
                    <td style="padding:8px 12px;text-align:right;font-weight:700;color:${difCor};">${difTxt}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : '';

    return `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Caixa</h2>
          <p>${caixa ? `Sessão aberta em ${caixa.data} · Operador: ${UI.escape(caixa.responsavel)}` : 'Abertura, conferência e fechamento de caixa'}</p>
        </div>
      </div>
      <div style="max-width:900px;">
        ${secAbrir}
        ${secAberto}
        ${secHistorico}
      </div>
    `;
  },

  /* ------------------------------------------------------------------ */
  /*  Exportar para Excel                                                 */
  /* ------------------------------------------------------------------ */

  _exportExcel() {
    const filtered = this._getFiltered();
    if (!filtered.length) { UI.toast('Nenhum lançamento para exportar', 'warning'); return; }

    const headers = ['Tipo', 'Data', 'Descrição', 'Categoria', 'Valor (R$)', 'Forma Pgto.', 'Status', 'Referência', 'Observações'];
    const rows = filtered.map(f => [
      f.tipo                                              || '',
      f.data                                              || '',
      f.descricao                                         || '',
      this._categoriaLabel(f.tipo, f.categoria),
      ExportService.fmtMoeda(f.valor),
      f.formaPagamento                                    || '',
      f.status                                            || '',
      f.referencia                                        || '',
      f.observacoes                                       || '',
    ]);

    const periodo = this._state.filterMes
      ? `_${this._state.filterMes}`
      : '';
    ExportService.toXLSX(`picklemanager_financeiro${periodo}`, headers, rows, 'Lançamentos');
  },
};
