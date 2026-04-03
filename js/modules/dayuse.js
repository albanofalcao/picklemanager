'use strict';

/**
 * DayUseModule — Registro de entradas avulsas (day use) com planos e integração financeira
 */
const DayUseModule = {
  STORAGE_KEY_ENTRADAS: 'dayuse_entradas',
  STORAGE_KEY_PLANOS:   'dayuse_planos',

  _state: {
    aba:          'entradas',  // 'entradas' | 'planos'
    searchEnt:    '',
    filterData:   '',
    filterPlano:  '',
    filterArena:  '',
    searchPlan:   '',
    filterStatus: '',
  },

  STATUS_PLANO: {
    ativo:   { label: 'Ativo',   badge: 'badge-success' },
    inativo: { label: 'Inativo', badge: 'badge-gray'    },
  },

  FORMA_PAGAMENTO: {
    dinheiro:    'Dinheiro',
    cartao_deb:  'Cartão de Débito',
    cartao_cred: 'Cartão de Crédito',
    pix:         'PIX',
    outro:       'Outro',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAllEntradas() {
    return Storage.getAll(this.STORAGE_KEY_ENTRADAS);
  },

  getAllPlanos() {
    return Storage.getAll(this.STORAGE_KEY_PLANOS);
  },

  getPlanosAtivos() {
    return this.getAllPlanos().filter(p => p.status === 'ativo');
  },

  getFilteredEntradas() {
    const { searchEnt, filterData, filterPlano, filterArena } = this._state;
    return this.getAllEntradas()
      .filter(e => {
        const q = searchEnt.toLowerCase();
        const matchSearch = !q ||
          e.clienteNome.toLowerCase().includes(q) ||
          (e.clienteCpf   && e.clienteCpf.includes(q)) ||
          (e.clienteTel   && e.clienteTel.includes(q)) ||
          (e.clienteEmail && e.clienteEmail.toLowerCase().includes(q));
        const matchData   = !filterData  || e.data === filterData;
        const matchPlano  = !filterPlano || e.planoId === filterPlano;
        const matchArena  = !filterArena || e.arenaId === filterArena;
        return matchSearch && matchData && matchPlano && matchArena;
      })
      .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt));
  },

  getFilteredPlanos() {
    const { searchPlan, filterStatus } = this._state;
    return this.getAllPlanos().filter(p => {
      const q = searchPlan.toLowerCase();
      const matchSearch = !q || p.nome.toLowerCase().includes(q) ||
        (p.descricao && p.descricao.toLowerCase().includes(q));
      const matchStatus = !filterStatus || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  },

  getStatsEntradas() {
    const hoje    = new Date().toISOString().slice(0, 10);
    const todas   = this.getAllEntradas();
    const deHoje  = todas.filter(e => e.data === hoje);
    const totalHoje = deHoje.reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
    const totalGeral = todas.reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
    return {
      totalHoje:    deHoje.length,
      receitaHoje:  totalHoje,
      totalGeral:   todas.length,
      receitaGeral: totalGeral,
    };
  },

  /* ------------------------------------------------------------------ */
  /*  Render principal                                                    */
  /* ------------------------------------------------------------------ */

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;

    const stats = this.getStatsEntradas();
    const abaEnt  = this._state.aba === 'entradas';

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Day Use</h2>
          <p>Entradas avulsas e planos de day use</p>
        </div>
        ${abaEnt ? `
        <button class="btn btn-primary" onclick="DayUseModule.openModalEntrada()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Entrada
        </button>` : `
        <button class="btn btn-primary" onclick="DayUseModule.openModalPlano()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Plano
        </button>`}
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon green">🚪</div>
          <div class="stat-info">
            <div class="stat-value">${stats.totalHoje}</div>
            <div class="stat-label">Entradas Hoje</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">💵</div>
          <div class="stat-info">
            <div class="stat-value">${this._fmt(stats.receitaHoje)}</div>
            <div class="stat-label">Receita Hoje</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">📋</div>
          <div class="stat-info">
            <div class="stat-value">${stats.totalGeral}</div>
            <div class="stat-label">Total de Entradas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gray">💰</div>
          <div class="stat-info">
            <div class="stat-value">${this._fmt(stats.receitaGeral)}</div>
            <div class="stat-label">Receita Total</div>
          </div>
        </div>
      </div>

      <div class="tabs-bar">
        <button class="tab-btn ${abaEnt ? 'active' : ''}" onclick="DayUseModule._trocarAba('entradas')">Entradas</button>
        <button class="tab-btn ${!abaEnt ? 'active' : ''}" onclick="DayUseModule._trocarAba('planos')">Planos Day Use</button>
      </div>

      <div id="dayuse-content">
        ${abaEnt ? this._renderEntradas() : this._renderPlanos()}
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Render Entradas                                                     */
  /* ------------------------------------------------------------------ */

  _renderEntradas() {
    const filtered = this.getFilteredEntradas();
    const planos   = this.getAllPlanos();
    const planoOpts = planos.map(p =>
      `<option value="${p.id}" ${this._state.filterPlano === p.id ? 'selected' : ''}>${UI.escape(p.nome)}</option>`
    ).join('');

    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input"
            placeholder="Buscar por nome, CPF, telefone ou e-mail…"
            value="${UI.escape(this._state.searchEnt)}"
            oninput="DayUseModule._state.searchEnt=this.value; DayUseModule._reRenderEntradas()" />
        </div>
        <input type="date" class="filter-select"
          value="${this._state.filterData}"
          onchange="DayUseModule._state.filterData=this.value; DayUseModule._reRenderEntradas()" />
        <select class="filter-select" onchange="DayUseModule._state.filterPlano=this.value; DayUseModule._reRenderEntradas()">
          <option value="">Todos os planos</option>
          ${planoOpts}
        </select>
        <select class="filter-select" onchange="DayUseModule._state.filterArena=this.value; DayUseModule._reRenderEntradas()">
          <option value="">Todas as arenas</option>
          ${Storage.getAll('arenas').sort((a,b)=>a.nome.localeCompare(b.nome)).map(a =>
            `<option value="${a.id}" ${this._state.filterArena === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
          ).join('')}
        </select>
        <span class="results-count">${filtered.length} entrada${filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div id="dayuse-entradas-list">
        ${filtered.length ? this._renderTabelaEntradas(filtered) : this._renderEmptyEntradas()}
      </div>`;
  },

  _renderTabelaEntradas(entradas) {
    const rows = entradas.map(e => {
      const [ano, mes, dia] = (e.data || '').split('-');
      const dataFmt  = e.data ? `${dia}/${mes}/${ano}` : '—';
      const plano    = Storage.getById(this.STORAGE_KEY_PLANOS, e.planoId);
      const planoNome = plano ? UI.escape(plano.nome) : '—';
      const forma    = ListasService.label('dayuse_forma_pagamento', e.formaPagamento) || '—';

      return `
        <tr>
          <td>
            <div class="aluno-nome">${UI.escape(e.clienteNome)}</div>
            <div class="aluno-sub">${UI.escape(e.clienteEmail || '—')}</div>
          </td>
          <td>${UI.escape(e.clienteCpf || '—')}</td>
          <td>${UI.escape(e.clienteTel || '—')}</td>
          <td>${dataFmt} ${e.hora ? '<span class="text-muted">'+UI.escape(e.hora)+'</span>' : ''}</td>
          <td>${planoNome}</td>
          <td class="fin-val-pos"><strong>${this._fmt(e.valor)}</strong></td>
          <td class="text-muted text-sm">${UI.escape(forma)}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm danger" onclick="DayUseModule.deleteEntrada('${e.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Data / Hora</th>
              <th>Plano</th>
              <th>Valor</th>
              <th>Pagamento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _renderEmptyEntradas() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🚪</div>
        <div class="empty-title">Nenhuma entrada registrada</div>
        <div class="empty-desc">Registre a primeira entrada de day use da academia.</div>
        <button class="btn btn-primary mt-16" onclick="DayUseModule.openModalEntrada()">+ Nova Entrada</button>
      </div>`;
  },

  _reRenderEntradas() {
    const filtered = this.getFilteredEntradas();
    const list = document.getElementById('dayuse-entradas-list');
    if (list) {
      list.innerHTML = filtered.length ? this._renderTabelaEntradas(filtered) : this._renderEmptyEntradas();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) countEl.textContent = `${filtered.length} entrada${filtered.length !== 1 ? 's' : ''}`;
  },

  /* ------------------------------------------------------------------ */
  /*  Render Planos                                                       */
  /* ------------------------------------------------------------------ */

  _renderPlanos() {
    const filtered = this.getFilteredPlanos();

    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input"
            placeholder="Buscar plano…"
            value="${UI.escape(this._state.searchPlan)}"
            oninput="DayUseModule._state.searchPlan=this.value; DayUseModule._reRenderPlanos()" />
        </div>
        <select class="filter-select" onchange="DayUseModule._state.filterStatus=this.value; DayUseModule._reRenderPlanos()">
          <option value="">Todos os status</option>
          <option value="ativo"   ${this._state.filterStatus === 'ativo'   ? 'selected' : ''}>Ativo</option>
          <option value="inativo" ${this._state.filterStatus === 'inativo' ? 'selected' : ''}>Inativo</option>
        </select>
        <span class="results-count">${filtered.length} plano${filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div id="dayuse-planos-list">
        ${filtered.length ? this._renderTabelaPlanos(filtered) : this._renderEmptyPlanos()}
      </div>`;
  },

  _renderTabelaPlanos(planos) {
    const rows = planos.map(p => {
      const st = this.STATUS_PLANO[p.status] || { label: p.status, badge: 'badge-gray' };
      return `
        <tr>
          <td><strong>${UI.escape(p.nome)}</strong></td>
          <td>${UI.escape(p.descricao || '—')}</td>
          <td class="fin-val-pos"><strong>${this._fmt(p.valor)}</strong></td>
          <td><span class="badge ${st.badge}">${st.label}</span></td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="DayUseModule.openModalPlano('${p.id}')" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-sm danger" onclick="DayUseModule.deletePlano('${p.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _renderEmptyPlanos() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Nenhum plano cadastrado</div>
        <div class="empty-desc">Crie planos de day use para facilitar o registro de entradas.</div>
        <button class="btn btn-primary mt-16" onclick="DayUseModule.openModalPlano()">+ Novo Plano</button>
      </div>`;
  },

  _reRenderPlanos() {
    const filtered = this.getFilteredPlanos();
    const list = document.getElementById('dayuse-planos-list');
    if (list) {
      list.innerHTML = filtered.length ? this._renderTabelaPlanos(filtered) : this._renderEmptyPlanos();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) countEl.textContent = `${filtered.length} plano${filtered.length !== 1 ? 's' : ''}`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal Entrada                                                       */
  /* ------------------------------------------------------------------ */

  openModalEntrada() {
    const hoje    = new Date().toISOString().slice(0, 10);
    const agora   = new Date().toTimeString().slice(0, 5);
    const planos  = this.getPlanosAtivos();

    if (!planos.length) {
      UI.toast('Cadastre ao menos um plano de day use antes de registrar uma entrada.', 'warning');
      return;
    }

    const planoOpts = planos.map(p =>
      `<option value="${p.id}" data-valor="${p.valor}">${UI.escape(p.nome)} — ${this._fmt(p.valor)}</option>`
    ).join('');

    const formaOpts = ListasService.opts('dayuse_forma_pagamento', '');

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOpts = arenas.map(a =>
      `<option value="${a.id}">${UI.escape(a.nome)}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="du-nome">Nome do cliente <span class="required-star">*</span></label>
          <input id="du-nome" type="text" class="form-input" placeholder="ex: João da Silva" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="du-cpf">CPF</label>
            <input id="du-cpf" type="text" class="form-input" placeholder="000.000.000-00"
              maxlength="14"
              oninput="DayUseModule._maskCpf(this)"
              onblur="DayUseModule._buscarClientePorCpf(this.value)"
              autocomplete="off" />
            <span id="du-cpf-hint" class="text-muted text-sm" style="display:none;margin-top:4px;"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="du-tel">Telefone / WhatsApp</label>
            <input id="du-tel" type="text" class="form-input" placeholder="(00) 00000-0000"
              maxlength="15" oninput="DayUseModule._maskTel(this)" autocomplete="off" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="du-email">E-mail</label>
          <input id="du-email" type="email" class="form-input" placeholder="cliente@email.com" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="du-data">Data <span class="required-star">*</span></label>
            <input id="du-data" type="date" class="form-input" value="${hoje}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="du-hora">Hora de entrada</label>
            <input id="du-hora" type="time" class="form-input" value="${agora}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="du-plano">Plano <span class="required-star">*</span></label>
          <select id="du-plano" class="form-select" onchange="DayUseModule._preencherValor(this)">
            ${planoOpts}
          </select>
        </div>

        ${arenas.length ? `
        <div class="form-group">
          <label class="form-label" for="du-arena">Arena</label>
          <select id="du-arena" class="form-select">
            <option value="">— Selecionar arena —</option>
            ${arenaOpts}
          </select>
        </div>` : ''}

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="du-valor">Valor (R$) <span class="required-star">*</span></label>
            <input id="du-valor" type="number" class="form-input" min="0" step="0.01"
              value="${planos[0] ? planos[0].valor : ''}" placeholder="0,00" />
          </div>
          <div class="form-group">
            <label class="form-label" for="du-forma">Forma de pagamento</label>
            <select id="du-forma" class="form-select">${formaOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="du-obs">Observações</label>
          <textarea id="du-obs" class="form-textarea" rows="2" placeholder="Observações adicionais…"></textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        'Registrar Entrada Day Use',
      content,
      confirmLabel: 'Registrar Entrada',
      onConfirm:    () => this.saveEntrada(),
    });
  },

  _preencherValor(sel) {
    const opt = sel.options[sel.selectedIndex];
    const val = opt ? opt.dataset.valor : '';
    const input = document.getElementById('du-valor');
    if (input && val) input.value = val;
  },

  saveEntrada() {
    const g = id => document.getElementById(id);
    const nome  = g('du-nome');
    const plano = g('du-plano');
    const data  = g('du-data');
    const valor = g('du-valor');

    let valid = true;
    [nome, plano, data, valor].forEach(el => {
      if (!el || !el.value.trim()) { el && el.classList.add('error'); valid = false; }
      else el && el.classList.remove('error');
    });

    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const planoObj = Storage.getById(this.STORAGE_KEY_PLANOS, plano.value);
    const arenaEl  = g('du-arena');
    const arenaObj = arenaEl && arenaEl.value ? Storage.getById('arenas', arenaEl.value) : null;

    const entrada = {
      clienteNome:    nome.value.trim(),
      clienteCpf:     g('du-cpf')   ? g('du-cpf').value.trim()   : '',
      clienteTel:     g('du-tel')   ? g('du-tel').value.trim()   : '',
      clienteEmail:   g('du-email') ? g('du-email').value.trim() : '',
      data:           data.value,
      hora:           g('du-hora')  ? g('du-hora').value         : '',
      planoId:        plano.value,
      planoNome:      planoObj ? planoObj.nome : '',
      arenaId:        arenaObj ? arenaObj.id   : '',
      arenaNome:      arenaObj ? arenaObj.nome : '',
      valor:          parseFloat(valor.value) || 0,
      formaPagamento: g('du-forma') ? g('du-forma').value : 'dinheiro',
      observacoes:    g('du-obs')   ? g('du-obs').value.trim()   : '',
    };

    Storage.create(this.STORAGE_KEY_ENTRADAS, entrada);

    // Lança no financeiro automaticamente
    this._lancarFinanceiro(entrada);

    UI.toast(`Entrada de "${entrada.clienteNome}" registrada com sucesso!`, 'success');
    UI.closeModal();
    this.render();
  },

  _lancarFinanceiro(entrada) {
    const [ano, mes, dia] = (entrada.data || '').split('-');
    const dataFmt = entrada.data ? `${dia}/${mes}/${ano}` : '';
    Storage.create('financeiro', {
      tipo:           'receita',
      categoria:      'day_use',
      descricao:      `Day Use — ${entrada.clienteNome}${entrada.planoNome ? ' (' + entrada.planoNome + ')' : ''}`,
      valor:          entrada.valor,
      data:           entrada.data,
      formaPagamento: entrada.formaPagamento,
      status:         'pago',
      observacoes:    `Entrada day use em ${dataFmt}. ${entrada.observacoes || ''}`.trim(),
    });
  },

  async deleteEntrada(id) {
    const entrada = Storage.getById(this.STORAGE_KEY_ENTRADAS, id);
    if (!entrada) return;
    const confirmed = await UI.confirm(
      `Deseja excluir a entrada de "${entrada.clienteNome}"? Esta ação não pode ser desfeita.`,
      'Excluir Entrada'
    );
    if (!confirmed) return;
    Storage.delete(this.STORAGE_KEY_ENTRADAS, id);
    UI.toast('Entrada excluída.', 'success');
    this._reRenderEntradas();
  },

  /* ------------------------------------------------------------------ */
  /*  Modal Plano                                                         */
  /* ------------------------------------------------------------------ */

  openModalPlano(id = null) {
    const plano  = id ? Storage.getById(this.STORAGE_KEY_PLANOS, id) : null;
    const isEdit = !!plano;
    const v = (field, fallback = '') => plano ? UI.escape(String(plano[field] ?? fallback)) : fallback;

    const statusOpts = Object.entries(this.STATUS_PLANO).map(([k, cfg]) =>
      `<option value="${k}" ${plano && plano.status === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="dp-nome">Nome do plano <span class="required-star">*</span></label>
          <input id="dp-nome" type="text" class="form-input"
            placeholder="ex: Day Use Standard"
            value="${v('nome')}" autocomplete="off" />
        </div>

        <div class="form-group">
          <label class="form-label" for="dp-descricao">Descrição</label>
          <input id="dp-descricao" type="text" class="form-input"
            placeholder="ex: Acesso por 1 dia a qualquer arena"
            value="${v('descricao')}" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="dp-valor">Valor (R$) <span class="required-star">*</span></label>
            <input id="dp-valor" type="number" class="form-input" min="0" step="0.01"
              value="${v('valor')}" placeholder="0,00" />
          </div>
          <div class="form-group">
            <label class="form-label" for="dp-status">Status</label>
            <select id="dp-status" class="form-select">${statusOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="dp-obs">Observações</label>
          <textarea id="dp-obs" class="form-textarea" rows="2"
            placeholder="Informações adicionais sobre o plano…">${plano ? UI.escape(plano.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Plano — ${plano.nome}` : 'Novo Plano Day Use',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Criar Plano',
      onConfirm:    () => this.savePlano(id),
    });
  },

  savePlano(id = null) {
    const g    = sel => document.getElementById(sel);
    const nome  = g('dp-nome');
    const valor = g('dp-valor');

    let valid = true;
    [nome, valor].forEach(el => {
      if (!el || !el.value.trim()) { el && el.classList.add('error'); valid = false; }
      else el && el.classList.remove('error');
    });

    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const data = {
      nome:        nome.value.trim(),
      descricao:   g('dp-descricao') ? g('dp-descricao').value.trim() : '',
      valor:       parseFloat(valor.value) || 0,
      status:      g('dp-status')    ? g('dp-status').value           : 'ativo',
      observacoes: g('dp-obs')       ? g('dp-obs').value.trim()       : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY_PLANOS, id, data);
      UI.toast(`Plano "${data.nome}" atualizado!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY_PLANOS, data);
      UI.toast(`Plano "${data.nome}" criado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deletePlano(id) {
    const plano = Storage.getById(this.STORAGE_KEY_PLANOS, id);
    if (!plano) return;

    const emUso = this.getAllEntradas().some(e => e.planoId === id);
    if (emUso) {
      UI.toast('Este plano possui entradas vinculadas e não pode ser excluído.', 'warning');
      return;
    }

    const confirmed = await UI.confirm(
      `Deseja excluir o plano "${plano.nome}"?`,
      'Excluir Plano'
    );
    if (!confirmed) return;
    Storage.delete(this.STORAGE_KEY_PLANOS, id);
    UI.toast(`Plano "${plano.nome}" excluído.`, 'success');
    this._reRenderPlanos();
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _buscarClientePorCpf(cpf) {
    if (!cpf || cpf.length < 11) return;
    const hint = document.getElementById('du-cpf-hint');

    // Busca em alunos
    const aluno = Storage.getAll('alunos').find(a => a.cpf === cpf);
    if (aluno) {
      this._preencherCamposCliente(aluno.nome, aluno.telefone || '', aluno.email || '');
      if (hint) { hint.textContent = '✅ Cliente encontrado nos alunos.'; hint.style.display = 'block'; }
      return;
    }

    // Busca em entradas anteriores de day use
    const entradas = this.getAllEntradas().filter(e => e.clienteCpf === cpf);
    if (entradas.length) {
      const ultima = entradas.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      this._preencherCamposCliente(ultima.clienteNome, ultima.clienteTel || '', ultima.clienteEmail || '');
      if (hint) { hint.textContent = '✅ Cliente encontrado em entradas anteriores.'; hint.style.display = 'block'; }
      return;
    }

    // Não encontrado — campos ficam abertos para preenchimento manual
    if (hint) { hint.textContent = '🆕 Novo cliente — preencha os dados abaixo.'; hint.style.display = 'block'; }
  },

  _preencherCamposCliente(nome, tel, email) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('du-nome',  nome);
    set('du-tel',   tel);
    set('du-email', email);
  },

  _trocarAba(aba) {
    this._state.aba = aba;
    this.render();
  },

  _fmt(valor) {
    return 'R$ ' + (parseFloat(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

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
