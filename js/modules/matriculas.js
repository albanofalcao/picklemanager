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
    ativa:        { label: 'Ativa',        badge: 'badge-success' },
    suspensa:     { label: 'Suspensa',     badge: 'badge-warning' },
    encerrada:    { label: 'Encerrada',    badge: 'badge-gray'    },
    inadimplente: { label: 'Inadimplente', badge: 'badge-danger'  },
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
    const all = this.getAll();
    return {
      total:        all.length,
      ativas:       all.filter(m => m.status === 'ativa').length,
      inadimplentes:all.filter(m => m.status === 'inadimplente').length,
      encerradas:   all.filter(m => m.status === 'encerrada').length,
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
            <div class="stat-value">${stats.inadimplentes}</div>
            <div class="stat-label">Inadimplentes</div>
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
    const rows = matriculas.map(m => {
      const status     = this.STATUS[m.status] || { label: m.status, badge: 'badge-gray' };
      const dataInicio = m.dataInicio ? this._fmtDate(m.dataInicio) : '—';

      // Badge de status financeiro
      const lancamentos = Storage.getAll('financeiro').filter(l => l.matriculaId === m.id);
      let financeiroBadge = '';
      if (lancamentos.length > 0) {
        const totalParcelas = lancamentos.length;
        const totalPagas    = lancamentos.filter(l => l.status === 'pago').length;
        const totalPendente = lancamentos.filter(l => l.status === 'pendente').length;
        if (totalPagas === totalParcelas) {
          financeiroBadge = `<span class="badge badge-success" title="Financeiro">💰 Pago</span>`;
        } else if (totalPagas > 0) {
          financeiroBadge = `<span class="badge badge-success" title="Financeiro">✅ ${totalPagas}/${totalParcelas} pagas</span>`;
        } else if (totalPendente > 0) {
          financeiroBadge = `<span class="badge badge-warning" title="Financeiro">⏳ Pendente</span>`;
        }
      }

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
          <td><span class="badge ${status.badge}">${status.label}</span></td>
          <td class="text-muted text-sm">${UI.escape(m.formaPagamento ? ListasService.label('matriculas_forma_pagamento', m.formaPagamento) : '—')}</td>
          <td>${financeiroBadge}${SaldoService.badgeSaldo(m.alunoId)}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="MatriculaModule.gerarComprovante('${m.id}')" title="Gerar comprovante">📄</button>
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
              <th>Status</th>
              <th>Pagamento</th>
              <th>Financeiro</th>
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
        `<option value="${p.id}" data-nome="${UI.escape(p.nome)}" data-tipo="${p.tipo}" data-valor="${p.valor}" data-aulas="${p.aulasIncluidas || 0}"
          ${mat && mat.planoId === p.id ? 'selected' : ''}>${UI.escape(p.nome)} — ${this._fmtMoeda(p.valor)}</option>`
      ).join('');

    const statusOpts = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${mat && mat.status === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const fpOpts = `<option value="">— Selecionar —</option>` +
      ListasService.opts('matriculas_forma_pagamento', mat?.formaPagamento || '');

    const hoje = new Date().toISOString().slice(0, 10);

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="mat-aluno">Aluno ${isEdit ? '' : '<span class="required-star">*</span>'}</label>
          ${isEdit
            ? `<input id="mat-aluno" class="form-input" value="${UI.escape(mat.alunoNome || '')}" disabled />`
            : `<select id="mat-aluno" class="form-select" onchange="MatriculaModule._onPlanoChange()">${alunoOpts}</select>`
          }
        </div>

        <div class="form-group">
          <label class="form-label" for="mat-plano">Plano <span class="required-star">*</span></label>
          <select id="mat-plano" class="form-select" onchange="MatriculaModule._onPlanoChange()">${planoOpts}</select>
        </div>

        <div class="form-group">
          <label class="form-label" for="mat-inicio">Data de início <span class="required-star">*</span></label>
          <input id="mat-inicio" type="date" class="form-input"
            value="${v('dataInicio', hoje)}"
            onchange="MatriculaModule._onPlanoChange()" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mat-valor">Valor (R$)</label>
            <input id="mat-valor" type="number" class="form-input"
              placeholder="0,00" min="0" step="0.01" value="${v('valorPago')}"
              oninput="MatriculaModule._onParcelasChange()" />
          </div>
          <div class="form-group">
            <label class="form-label" for="mat-fp">Forma de pagamento</label>
            <select id="mat-fp" class="form-select">${fpOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label checkbox-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="mat-pago"
              ${mat?.pagamentoConfirmado ? 'checked' : ''}
              onchange="MatriculaModule._onPagoChange()" />
            Pagamento recebido
          </label>
        </div>

        <div id="mat-data-pag-wrap" class="form-group" ${mat?.pagamentoConfirmado ? '' : 'style="display:none"'}>
          <label class="form-label" for="mat-data-pag">Data do recebimento</label>
          <input id="mat-data-pag" type="date" class="form-input"
            value="${v('dataPagamento', new Date().toISOString().slice(0,10))}" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mat-parcelas">Parcelas</label>
            <select id="mat-parcelas" class="form-select" onchange="MatriculaModule._onParcelasChange()">
              <option value="1" ${(mat?.numeroParcelas || 1) === 1 ? 'selected' : ''}>1x (à vista)</option>
              <option value="2" ${(mat?.numeroParcelas || 1) === 2 ? 'selected' : ''}>2x</option>
              <option value="3" ${(mat?.numeroParcelas || 1) === 3 ? 'selected' : ''}>3x</option>
              <option value="4" ${(mat?.numeroParcelas || 1) === 4 ? 'selected' : ''}>4x</option>
              <option value="5" ${(mat?.numeroParcelas || 1) === 5 ? 'selected' : ''}>5x</option>
              <option value="6" ${(mat?.numeroParcelas || 1) === 6 ? 'selected' : ''}>6x</option>
              <option value="7" ${(mat?.numeroParcelas || 1) === 7 ? 'selected' : ''}>7x</option>
              <option value="8" ${(mat?.numeroParcelas || 1) === 8 ? 'selected' : ''}>8x</option>
              <option value="9" ${(mat?.numeroParcelas || 1) === 9 ? 'selected' : ''}>9x</option>
              <option value="10" ${(mat?.numeroParcelas || 1) === 10 ? 'selected' : ''}>10x</option>
              <option value="11" ${(mat?.numeroParcelas || 1) === 11 ? 'selected' : ''}>11x</option>
              <option value="12" ${(mat?.numeroParcelas || 1) === 12 ? 'selected' : ''}>12x</option>
            </select>
          </div>
          <div id="mat-parcelas-preview" class="mat-parcelas-preview" style="display:none;"></div>
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


  /* ------------------------------------------------------------------ */
  /*  Plan change handler                                                 */
  /* ------------------------------------------------------------------ */

  _onPlanoChange() {
    const planoSel = document.getElementById('mat-plano');
    const inicioEl = document.getElementById('mat-inicio');
    if (!planoSel || !inicioEl) return;

    const opt = planoSel.selectedOptions[0];

    // Preenche valor do plano se campo vazio
    const valorEl = document.getElementById('mat-valor');
    if (valorEl && !valorEl.value && opt && opt.dataset.valor) {
      valorEl.value = opt.dataset.valor;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  async saveMatricula(id = null) {
    if (this._saving) return;
    this._saving = true;

    const g        = n => document.getElementById(`mat-${n}`);
    const isEdit   = !!id;
    const matAtual = isEdit ? Storage.getById(this.STORAGE_KEY, id) : null;
    const alunoSel = g('aluno');
    const planoSel = g('plano');
    const inicio   = g('inicio');

    let valid = true;
    // Em edição o aluno está desabilitado — valida só plano e data
    [isEdit ? null : alunoSel, planoSel, inicio].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    // ── Matrícula ativa duplicada (bloqueia criação) ─────────────────
    if (!isEdit) {
      const alunoIdSel = alunoSel ? alunoSel.value : '';
      if (alunoIdSel) {
        const matAtiva = Storage.getAll(this.STORAGE_KEY).find(m =>
          m.alunoId === alunoIdSel && m.status === 'ativa'
        );
        if (matAtiva) {
          UI.toast(
            `Este aluno já possui matrícula ativa (${matAtiva.planoNome || 'Plano'}). ` +
            `Encerre ou cancele a atual antes de criar uma nova.`,
            'error'
          );
          return;
        }
      }
    }

    const planoOpt = planoSel.selectedOptions[0];

    // Em edição preserva aluno original; em criação lê do select
    const alunoId   = isEdit ? matAtual.alunoId   : alunoSel.value;
    const alunoOpt  = isEdit ? null : alunoSel.selectedOptions[0];
    const alunoNome = isEdit ? matAtual.alunoNome  : (alunoOpt ? (alunoOpt.dataset.nome || alunoOpt.textContent) : '');

    const data = {
      alunoId,
      alunoNome,
      planoId:       planoSel.value,
      planoNome:     planoOpt ? (planoOpt.dataset.nome || planoOpt.textContent) : '',
      dataInicio:    inicio.value,
      valorPago:           g('valor')    ? parseFloat(g('valor').value) || 0 : 0,
      formaPagamento:      g('fp')       ? g('fp').value       : '',
      numeroParcelas:      g('parcelas') ? parseInt(g('parcelas').value) || 1 : 1,
      pagamentoConfirmado: g('pago')     ? g('pago').checked   : false,
      dataPagamento:       g('data-pag') ? g('data-pag').value : '',
      status:              g('status')   ? g('status').value   : 'ativa',
      observacoes:         g('obs')      ? g('obs').value.trim() : '',
    };

    let matriculaId = id;

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      UI.toast(`Matrícula de "${data.alunoNome}" atualizada!`, 'success');
    } else {
      const nova = Storage.create(this.STORAGE_KEY, data);
      matriculaId = nova ? nova.id : null;
      UI.toast(`Matrícula de "${data.alunoNome}" criada com sucesso!`, 'success');
    }

    // Sincronizar lançamentos financeiros
    if (matriculaId) {
      this._sincronizarFinanceiro(matriculaId, data);
    }

    this._saving = false;
    UI.closeModal();
    this.render();
    this._refreshDependentes();

    // ── Se cancelou/suspendeu matrícula ativa, oferece remoção das aulas futuras ──
    const statusFinal = data.status;
    const statusAntes = matAtual?.status;
    if (id && statusAntes === 'ativa' && ['cancelada', 'suspensa'].includes(statusFinal)) {
      await this._removerAlunoDeAulasFuturas(data.alunoId, data.alunoNome);
    }
  },

  async deleteMatricula(id) {
    const mat = Storage.getById(this.STORAGE_KEY, id);
    if (!mat) return;

    const confirmed = await UI.confirm(
      `Deseja realmente excluir a matrícula de "${mat.alunoNome}"? Esta ação não pode ser desfeita.`,
      'Excluir Matrícula'
    );
    if (!confirmed) return;

    // Cancelar lançamentos financeiros vinculados (apenas pendentes)
    Storage.getAll('financeiro')
      .filter(l => l.matriculaId === id)
      .forEach(l => Storage.update('financeiro', l.id, { status: 'cancelado' }));

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Matrícula de "${mat.alunoNome}" excluída.`, 'success');
    this.render();
    this._refreshDependentes();

    // Oferece remoção das aulas e grades futuras
    if (mat.alunoId) {
      await this._removerAlunoDeAulasFuturas(mat.alunoId, mat.alunoNome);
    }
  },

  /**
   * Verifica se o aluno tem aulas avulsas futuras ou grades ativas e oferece remoção.
   */
  async _removerAlunoDeAulasFuturas(alunoId, alunoNome) {
    if (!alunoId) return;
    const hoje = new Date().toISOString().slice(0, 10);

    // Aulas avulsas futuras com este aluno
    const aulasRecs = Storage.getAll('aulaAlunos').filter(aa => aa.alunoId === alunoId && aa.status === 'ativo');
    const aulasFuturas = aulasRecs.filter(aa => {
      const aula = Storage.getById('aulas', aa.aulaId);
      return aula && aula.data >= hoje && aula.status !== 'cancelada';
    });

    // Grades (turmaAlunos)
    const gradesRecs = Storage.getAll('turmaAlunos').filter(ta =>
      ta.alunoId === alunoId && ta.status === 'ativo'
    );

    const total = aulasFuturas.length + gradesRecs.length;
    if (total === 0) return;

    const partes = [];
    if (aulasFuturas.length) partes.push(`${aulasFuturas.length} aula${aulasFuturas.length !== 1 ? 's' : ''} avulsa${aulasFuturas.length !== 1 ? 's' : ''} futura${aulasFuturas.length !== 1 ? 's' : ''}`);
    if (gradesRecs.length)   partes.push(`${gradesRecs.length} turma${gradesRecs.length !== 1 ? 's' : ''} inscrita${gradesRecs.length !== 1 ? 's' : ''}`);

    const ok = await UI.confirm(
      `"${alunoNome}" ainda está em: ${partes.join(' e ')}.\n\nDeseja removê-lo(a) de todas?`,
      'Remover das aulas e turmas',
      'Sim, remover'
    );
    if (!ok) return;

    aulasFuturas.forEach(aa => Storage.update('aulaAlunos', aa.id, { status: 'inativo' }));
    gradesRecs.forEach(ta => Storage.update('turmaAlunos', ta.id, { status: 'inativo' }));

    UI.toast(`"${alunoNome}" removido(a) de ${total} aula${total !== 1 ? 's' : ''}/turma${total !== 1 ? 's' : ''}.`, 'success');
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

  /**
   * Atualiza em cascata todos os módulos que dependem de matrículas:
   * - Lista de alunos (badge de plano na tabela)
   * - Perfil de aluno aberto (se houver modal visível com dados de aluno)
   */
  _refreshDependentes() {
    // 1. Atualiza tabela de alunos se estiver visível
    const alunosList = document.getElementById('alunos-list');
    if (alunosList && typeof AlunoModule !== 'undefined') {
      const filtered = AlunoModule.getFiltered();
      alunosList.innerHTML = filtered.length ? AlunoModule.renderTable(filtered) : AlunoModule.renderEmpty();
    }

    // 2. Atualiza cards de stats de alunos se visíveis
    const statsEls = document.querySelectorAll('.stat-number[data-stat]');
    if (statsEls.length && typeof AlunoModule !== 'undefined') {
      const stats = AlunoModule.getStats();
      statsEls.forEach(el => {
        const key = el.dataset.stat;
        if (key && stats[key] !== undefined) el.textContent = stats[key];
      });
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Parcelas                                                            */
  /* ------------------------------------------------------------------ */

  _onPagoChange() {
    const cb   = document.getElementById('mat-pago');
    const wrap = document.getElementById('mat-data-pag-wrap');
    if (wrap) wrap.style.display = cb?.checked ? '' : 'none';
  },

  _onParcelasChange() {
    const valorEl    = document.getElementById('mat-valor');
    const parcelasEl = document.getElementById('mat-parcelas');
    const preview    = document.getElementById('mat-parcelas-preview');
    if (!preview) return;

    const total    = parseFloat(valorEl?.value) || 0;
    const parcelas = parseInt(parcelasEl?.value) || 1;

    if (total > 0 && parcelas > 1) {
      const valorParc = total / parcelas;
      preview.style.display = '';
      preview.textContent   = `${parcelas}x de ${this._fmtMoeda(valorParc)}`;
    } else {
      preview.style.display = 'none';
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Sincronização financeira                                            */
  /* ------------------------------------------------------------------ */

  _sincronizarFinanceiro(matriculaId, matData) {
    const alunoNome = matData.alunoNome || '';
    const planoNome = matData.planoNome || '';
    const valorPago = parseFloat(matData.valorPago) || 0;
    const N         = parseInt(matData.numeroParcelas) || 1;
    const dataInicio = matData.dataInicio || new Date().toISOString().slice(0, 10);
    const formaPagamento = matData.formaPagamento || '';

    // 1. Remove TODOS os lançamentos vinculados a esta matrícula (pendentes e pagos)
    //    Necessário para evitar duplicação ao editar matrícula com pagamento confirmado
    Storage.getAll('financeiro')
      .filter(l => l.matriculaId === matriculaId)
      .forEach(l => Storage.delete('financeiro', l.id));

    // 2. Cria N lançamentos
    const valorParc = Math.round((valorPago / N) * 100) / 100;

    for (let i = 0; i < N; i++) {
      const d = new Date(dataInicio + 'T00:00:00');
      d.setMonth(d.getMonth() + i);
      const dataLanc = d.toISOString().slice(0, 10);

      const descricao = N === 1
        ? `Mensalidade — ${alunoNome} — ${planoNome}`
        : `Mensalidade ${i + 1}/${N} — ${alunoNome} — ${planoNome}`;

      const status = i === 0 && matData.pagamentoConfirmado
        ? 'pago'
        : 'pendente';

      Storage.create('financeiro', {
        tipo:           'receita',
        categoria:      'mensalidade',
        descricao,
        valor:          valorParc,
        data:           i === 0 && matData.pagamentoConfirmado && matData.dataPagamento
                          ? matData.dataPagamento
                          : dataLanc,
        formaPagamento,
        status,
        referencia:     alunoNome,
        matriculaId,
        origem:         'matricula',
        observacoes:    'Gerado automaticamente pela matrícula',
      });
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Comprovante                                                         */
  /* ------------------------------------------------------------------ */

  gerarComprovante(id) {
    const mat   = Storage.getById(this.STORAGE_KEY, id);
    if (!mat) return;

    const aluno = Storage.getAll('alunos').find(a => a.id === mat.alunoId) || {};
    const plano = Storage.getAll('planos').find(p => p.id === mat.planoId) || {};

    // Grades onde o aluno está inscrito (turmaAlunos ativos)
    const inscricoes = Storage.getAll('turmaAlunos').filter(i =>
      i.alunoId === mat.alunoId && i.status === 'ativo'
    );
    const turmasIds = new Set(inscricoes.map(i => i.turmaId));
    const turmas = Storage.getAll('turmas').filter(t => turmasIds.has(t.id));

    const lancamentos = Storage.getAll('financeiro')
      .filter(l => l.matriculaId === id)
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    const academia = Storage.getAll('config_academia')[0] || {};
    const nomeAcademia = academia.nome || 'PickleManager Academia';
    const fmtDate  = d => this._fmtDate(d);
    const fmtMoeda = v => this._fmtMoeda(v);
    const hoje     = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

    // Embute config do EmailJS no popup (lido aqui, na janela principal)
    const ejsCfg = (typeof EmailJSConfig !== 'undefined' && EmailJSConfig.templateAtivo('matricula'))
      ? JSON.stringify({ s: EmailJSConfig.SERVICE_ID, p: EmailJSConfig.PUBLIC_KEY, t: EmailJSConfig.TEMPLATES.matricula })
      : 'null';

    const DIAS = { seg:'Segunda', ter:'Terça', qua:'Quarta', qui:'Quinta', sex:'Sexta', sab:'Sábado', dom:'Domingo' };

    const turmasHtml = turmas.length ? turmas.map(t => {
      // Normaliza diasSemana para novo formato (objeto ou string)
      const diasNorm = (t.diasSemana || []).map(d => typeof d === 'object' ? d : { dia: d, inicio: t.horarioInicio || '', fim: t.horarioFim || '' });
      const diasLabel = diasNorm.map(d => DIAS[d.dia] || d.dia).join(', ') || '—';
      // Horário: único ou por dia
      const unicas = [...new Set(diasNorm.map(d => `${d.inicio}–${d.fim}`))];
      const horario = unicas.length === 1
        ? `${diasNorm[0].inicio || '—'}${diasNorm[0].fim ? ' – ' + diasNorm[0].fim : ''}`
        : diasNorm.filter(d => d.inicio).map(d => `${DIAS[d.dia]||d.dia}: ${d.inicio}–${d.fim}`).join(' · ') || '—';
      return `<tr>
        <td>${t.nome || '—'}</td>
        <td>${diasLabel}</td>
        <td>${horario}</td>
        <td>${t.professorNome || '—'}</td>
        <td>${t.arenaNome || '—'}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="5" style="text-align:center;color:#888;">Aluno não inscrito em nenhuma turma</td></tr>`;

    const parcelasHtml = lancamentos.length ? lancamentos.map((l, i) => `
      <tr>
        <td>${i + 1}º</td>
        <td>${fmtDate(l.data)}</td>
        <td>${fmtMoeda(l.valor)}</td>
        <td>${ListasService.label('matriculas_forma_pagamento', l.formaPagamento)}</td>
        <td style="color:${l.status === 'pago' ? '#16a34a' : '#d97706'}">${l.status === 'pago' ? '✔ Pago' : '⏳ Pendente'}</td>
      </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:#888;">—</td></tr>`;

    const emailAluno = aluno.email || '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Comprovante de Matrícula — ${aluno.nome || mat.alunoNome}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;padding:32px}
    .doc{max-width:780px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #083c2f;padding-bottom:16px;margin-bottom:24px}
    .brand{font-size:22px;font-weight:700;color:#083c2f}
    .brand small{display:block;font-size:12px;font-weight:400;color:#555;margin-top:2px}
    .doc-title{text-align:right}
    .doc-title h1{font-size:18px;color:#083c2f}
    .doc-title p{font-size:11px;color:#777;margin-top:4px}
    section{margin-bottom:24px}
    h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#083c2f;border-bottom:1px solid #d1e8e2;padding-bottom:6px;margin-bottom:12px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}
    .field label{font-size:11px;color:#777;font-weight:600;text-transform:uppercase;letter-spacing:.3px}
    .field p{font-size:13px;color:#1a1a1a;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f0f7f5;color:#083c2f;font-weight:600;text-align:left;padding:7px 10px;border-bottom:2px solid #d1e8e2}
    td{padding:6px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top}
    tr:last-child td{border-bottom:none}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#888}
    .assinatura{text-align:center}
    .assinatura .linha{border-top:1px solid #999;width:200px;margin:32px auto 4px}
    .badge-pago{color:#16a34a;font-weight:600}
    .badge-pendente{color:#d97706}
    .no-print{margin-bottom:24px;display:flex;gap:12px;flex-wrap:wrap}
    @media print{.no-print{display:none!important}body{padding:16px}}
  </style>
</head>
<body>
<div class="doc">

  <div class="no-print">
    <button onclick="window.print()" style="padding:8px 18px;background:#083c2f;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
    ${emailAluno
      ? `<button id="btn-email-mat"
          data-email="${emailAluno.replace(/"/g,'&quot;')}"
          data-name="${(aluno.nome||'').replace(/"/g,'&quot;')}"
          data-academia="${nomeAcademia.replace(/"/g,'&quot;')}"
          data-plano="${(mat.planoNome||'—').replace(/"/g,'&quot;')}"
          data-inicio="${fmtDate(mat.dataInicio)}"
          data-fim="${fmtDate(mat.dataFim)||'Indeterminado'}"
          onclick="_enviarEmailMatricula(this)"
          style="padding:8px 18px;background:#0d6efd;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">
          ✉️ Enviar por e-mail para ${emailAluno}
        </button>`
      : '<span style="font-size:12px;color:#888">⚠️ Aluno sem e-mail cadastrado</span>'}
  </div>

  <div class="header">
    <div class="brand">${nomeAcademia}<small>Comprovante de Matrícula</small></div>
    <div class="doc-title"><h1>Confirmação de Matrícula</h1><p>Emitido em ${hoje}</p></div>
  </div>

  <section>
    <h2>Dados do Aluno</h2>
    <div class="grid2">
      <div class="field"><label>Nome</label><p>${aluno.nome || mat.alunoNome || '—'}</p></div>
      <div class="field"><label>CPF</label><p>${aluno.cpf || '—'}</p></div>
      <div class="field"><label>E-mail</label><p>${aluno.email || '—'}</p></div>
      <div class="field"><label>Telefone</label><p>${aluno.telefone || '—'}</p></div>
    </div>
  </section>

  <section>
    <h2>Plano Contratado</h2>
    <div class="grid2">
      <div class="field"><label>Plano</label><p>${mat.planoNome || '—'}</p></div>
      <div class="field"><label>Tipo</label><p>${ListasService.label('planos_tipo', plano.tipo)}</p></div>
      <div class="field"><label>Data de início</label><p>${fmtDate(mat.dataInicio)}</p></div>
      <div class="field"><label>Vencimento</label><p>${mat.dataFim ? fmtDate(mat.dataFim) : 'Indeterminado'}</p></div>
      <div class="field"><label>Aulas incluídas</label><p>${plano.aulasIncluidas ? plano.aulasIncluidas + ' aulas/mês' : '—'}</p></div>
      <div class="field"><label>Status</label><p>${this.STATUS[mat.status]?.label || mat.status || '—'}</p></div>
    </div>
  </section>

  <section>
    <h2>Pagamento</h2>
    <table>
      <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Forma</th><th>Status</th></tr></thead>
      <tbody>${parcelasHtml}</tbody>
    </table>
  </section>

  <section>
    <h2>Cronograma Contratado</h2>
    <table>
      <thead><tr><th>Turma</th><th>Dias</th><th>Horário</th><th>Professor</th><th>Arena</th></tr></thead>
      <tbody>${turmasHtml}</tbody>
    </table>
  </section>

  ${(() => {
    const hojeComp = new Date().toISOString().slice(0, 10);
    const aulaAlunosComp = Storage.getAll('aulaAlunos').filter(aa =>
      aa.alunoId === mat.alunoId && aa.status === 'ativo'
    );
    const aulaIdsComp = new Set(aulaAlunosComp.map(aa => aa.aulaId));
    const aulasAvComp = Storage.getAll('aulas').filter(a =>
      aulaIdsComp.has(a.id) && !a.turmaId && a.data >= hojeComp && a.status === 'agendada'
    ).sort((a, b) => a.data.localeCompare(b.data));

    if (!aulasAvComp.length) return '';

    const rowsAv = aulasAvComp.map(a => {
      const [ay, am, ad] = (a.data || '').split('-');
      const dFmt = a.data ? `${ad}/${am}/${ay}` : '—';
      const hor  = [a.horarioInicio, a.horarioFim].filter(Boolean).join(' – ') || '—';
      return `<tr>
        <td>${a.titulo || '—'}</td>
        <td>${dFmt}</td>
        <td>${hor}</td>
        <td>${a.professorNome || '—'}</td>
        <td>${a.arenaNome || '—'}</td>
      </tr>`;
    }).join('');

    return `
  <section>
    <h2>Aulas Avulsas Agendadas</h2>
    <table>
      <thead><tr><th>Aula</th><th>Data</th><th>Horário</th><th>Professor</th><th>Arena</th></tr></thead>
      <tbody>${rowsAv}</tbody>
    </table>
  </section>`;
  })()}

  <div class="footer">
    <div>Documento gerado em ${hoje} — ${nomeAcademia}</div>
    <div class="assinatura">
      <div class="linha"></div>
      <div>Assinatura do Responsável</div>
    </div>
  </div>

</div>
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
<script>
(function () {
  const _cfg = ${ejsCfg};
  if (_cfg) emailjs.init(_cfg.p);

  window._enviarEmailMatricula = async function (btn) {
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = '📧 Enviando...';
    if (!_cfg) {
      btn.textContent = '⚠️ EmailJS não configurado';
      setTimeout(() => { btn.disabled = false; btn.textContent = orig; }, 4000);
      return;
    }
    try {
      await emailjs.send(_cfg.s, _cfg.t, {
        to_email:    btn.dataset.email,
        to_name:     btn.dataset.name,
        academia:    btn.dataset.academia,
        plano:       btn.dataset.plano,
        data_inicio: btn.dataset.inicio,
        data_fim:    btn.dataset.fim,
      });
      btn.textContent = '✅ E-mail enviado!';
    } catch (err) {
      console.warn('EmailJS erro:', err);
      btn.textContent = '❌ Falha no envio';
    }
    setTimeout(() => { btn.disabled = false; btn.textContent = orig; }, 4000);
  };
})();
</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
    else UI.toast('Permita pop-ups para gerar o comprovante.', 'warning');
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
