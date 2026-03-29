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
    _grades:      [],
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
          <td>
            ${dataFim}${alertaVenc}
          </td>
          <td><span class="badge ${status.badge}">${status.label}</span></td>
          <td class="text-muted text-sm">${UI.escape(m.formaPagamento ? (this.FORMA_PAGAMENTO[m.formaPagamento] || m.formaPagamento) : '—')}</td>
          <td>${financeiroBadge}</td>
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

    // Resetar grades ao abrir o modal
    this._state._grades = [];

    // Se for edição, carregar turmaAlunos existentes para _state._grades
    if (isEdit) {
      const turmaAlunos = Storage.getAll('turmaAlunos').filter(ta => ta.matriculaId === id);
      this._state._grades = turmaAlunos.map(ta => ({
        turmaId:        ta.turmaId        || '',
        turmaNome:      ta.turmaNome      || '',
        aulas:          ta.aulasAlocadas  || 1,
        aulasEscolhidas: ta.aulasEscolhidas || [],
      }));
    }

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
      Object.entries(this.FORMA_PAGAMENTO).map(([k, lbl]) =>
        `<option value="${k}" ${mat && mat.formaPagamento === k ? 'selected' : ''}>${lbl}</option>`
      ).join('');

    const hoje = new Date().toISOString().slice(0, 10);

    // Calcular aulasIncluidas do plano selecionado (para edição)
    let aulasIncluidas = 0;
    let planoTipo = '';
    if (mat && mat.planoId) {
      const planoAtual = Storage.getById('planos', mat.planoId);
      if (planoAtual) {
        aulasIncluidas = planoAtual.aulasIncluidas || 0;
        planoTipo      = planoAtual.tipo || '';
      }
    }

    const gradeRows = this._state._grades;

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
              placeholder="0,00" min="0" step="0.01" value="${v('valorPago')}"
              oninput="MatriculaModule._onParcelasChange()" />
          </div>
          <div class="form-group">
            <label class="form-label" for="mat-fp">Forma de pagamento</label>
            <select id="mat-fp" class="form-select">${fpOpts}</select>
          </div>
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

        <div id="mat-grades-section">
          ${this._renderGradesSection(aulasIncluidas, gradeRows, planoTipo)}
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
  /*  Grades section                                                      */
  /* ------------------------------------------------------------------ */

  // Planos curtos (mensal/trimestral) → escolha individual de aulas
  // Planos longos (semestral/anual)   → quantidade por mês + geração automática
  _PLANO_CURTO: ['mensal', 'trimestral'],

  _renderGradesSection(aulasIncluidas, gradeRows, planoTipo) {
    aulasIncluidas = parseInt(aulasIncluidas) || 0;
    const rows     = gradeRows || this._state._grades;
    if (aulasIncluidas <= 0) return '';

    const isCurto  = this._PLANO_CURTO.includes(planoTipo);
    const grades   = Storage.getAll('turmas').filter(t => t.status === 'ativa');

    const inicioEl   = document.getElementById('mat-inicio');
    const fimEl      = document.getElementById('mat-fim');
    const dataInicio = inicioEl ? inicioEl.value : '';
    const dataFim    = fimEl    ? fimEl.value    : '';

    const DIAS_LABEL = { 0:'Dom',1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sáb' };

    // ── Resumo contador ──────────────────────────────────────
    let totalUsado, counterColor, resumoDetalhe;
    if (isCurto) {
      totalUsado   = rows.reduce((s, r) => s + (r.aulasEscolhidas || []).length, 0);
      counterColor = totalUsado === aulasIncluidas ? '#16a34a'
        : totalUsado > aulasIncluidas ? '#dc2626' : '#d97706';
      resumoDetalhe = `<span style="font-weight:700;color:${counterColor}">${totalUsado} selecionada${totalUsado !== 1 ? 's' : ''}</span>
        ${totalUsado > aulasIncluidas ? '<span class="mat-resumo-alerta"> (limite excedido)</span>' : ''}`;
    } else {
      totalUsado   = rows.reduce((s, r) => s + (parseInt(r.aulas) || 0), 0);
      counterColor = totalUsado === aulasIncluidas ? '#16a34a'
        : totalUsado > aulasIncluidas ? '#dc2626' : '#d97706';
      resumoDetalhe = `<span style="font-weight:700;color:${counterColor}">${totalUsado} distribuída${totalUsado !== 1 ? 's' : ''} / mês</span>
        ${totalUsado > aulasIncluidas ? '<span class="mat-resumo-alerta"> (limite excedido)</span>' : ''}`;
    }

    // ── Linhas de grade ──────────────────────────────────────
    const rowsHtml = rows.map((row, idx) => {
      const optsHtml = `<option value="">— Selecionar grade —</option>` +
        grades.map(g =>
          `<option value="${g.id}" data-nome="${UI.escape(g.nome)}"
            ${row.turmaId === g.id ? 'selected' : ''}>${UI.escape(g.nome)}</option>`
        ).join('');

      let expandHtml = '';

      if (isCurto) {
        // ── Modo curto: picker de aulas individuais ──────────
        const escolhidas = new Set(row.aulasEscolhidas || []);
        const usadasOutras = rows
          .filter((_, i) => i !== idx)
          .reduce((s, r) => s + (r.aulasEscolhidas || []).length, 0);
        const restante = aulasIncluidas - usadasOutras;

        if (row.turmaId) {
          const aulasDisp = Storage.getAll('aulas')
            .filter(a => {
              if (a.turmaId !== row.turmaId || a.status === 'cancelada') return false;
              if (dataInicio && a.data < dataInicio) return false;
              if (dataFim    && a.data > dataFim)    return false;
              return true;
            })
            .sort((a, b) => a.data.localeCompare(b.data));

          if (!aulasDisp.length) {
            expandHtml = `<div class="mat-aulas-vazio">Nenhuma aula agendada nesta grade para o período.</div>`;
          } else {
            const items = aulasDisp.map(a => {
              const checked  = escolhidas.has(a.id);
              const disabled = !checked && restante <= 0;
              const [, mes, dia] = (a.data || '').split('-');
              const diaNome = DIAS_LABEL[new Date(a.data + 'T12:00:00').getDay()] || '';
              const hora    = [a.horarioInicio, a.horarioFim].filter(Boolean).join('–');
              return `
                <label class="mat-aula-item${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}">
                  <input type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}
                    onchange="MatriculaModule._toggleAulaEscolhida(${idx}, '${a.id}', this.checked)" />
                  <span class="mat-aula-data">${diaNome} ${dia}/${mes}</span>
                  ${hora ? `<span class="mat-aula-hora">${hora}</span>` : ''}
                </label>`;
            }).join('');

            expandHtml = `
              <div class="mat-aulas-lista">
                <div class="mat-aulas-cabecalho">
                  <span>${escolhidas.size} de ${Math.min(restante + escolhidas.size, aulasDisp.length)} selecionadas</span>
                  <button type="button" class="mat-btn-selmax"
                    onclick="MatriculaModule._selecionarMaxGrade(${idx})">Selecionar máx.</button>
                  ${escolhidas.size > 0 ? `<button type="button" class="mat-btn-selmax"
                    onclick="MatriculaModule._limparGrade(${idx})">Limpar</button>` : ''}
                </div>
                <div class="mat-aulas-grid">${items}</div>
              </div>`;
          }
        }

        const badge = row.turmaId
          ? `<span class="mat-grade-badge">${escolhidas.size} aula${escolhidas.size !== 1 ? 's' : ''}</span>` : '';

        return `
          <div class="grade-row-wrap">
            <div class="grade-row">
              <select class="form-select"
                onchange="MatriculaModule._onGradeSelect(${idx}, this.value, this.selectedOptions[0])">
                ${optsHtml}
              </select>
              ${badge}
              <button type="button" class="btn btn-ghost btn-sm danger"
                onclick="MatriculaModule._removeGradeRow(${idx})" title="Remover">🗑️</button>
            </div>
            ${expandHtml}
          </div>`;

      } else {
        // ── Modo longo: quantidade por mês ───────────────────
        const aulasMes = parseInt(row.aulas) || 1;
        return `
          <div class="grade-row-wrap">
            <div class="grade-row">
              <select class="form-select"
                onchange="MatriculaModule._onGradeSelect(${idx}, this.value, this.selectedOptions[0])">
                ${optsHtml}
              </select>
              <div class="mat-grade-mensal">
                <input type="number" class="form-input" style="width:70px;" min="1" max="${aulasIncluidas}"
                  value="${aulasMes}" title="Aulas por mês"
                  onchange="MatriculaModule._updateGradeRow(${idx}, 'aulas', parseInt(this.value) || 1)" />
                <span class="mat-grade-mensal-label">/ mês</span>
              </div>
              <button type="button" class="btn btn-ghost btn-sm danger"
                onclick="MatriculaModule._removeGradeRow(${idx})" title="Remover">🗑️</button>
            </div>
          </div>`;
      }
    }).join('');

    const tipoLabel = isCurto
      ? `Escolha as aulas individuais dentro de cada grade`
      : `Defina quantas aulas por mês em cada grade (geração automática no cronograma)`;

    return `
      <div class="form-group">
        <label class="form-label">Grades e Aulas</label>
        <div class="mat-aulas-resumo">
          <span>${tipoLabel}</span><br>
          Plano: <strong>${aulasIncluidas}</strong> aula${aulasIncluidas !== 1 ? 's' : ''} incluídas
          &nbsp;·&nbsp; ${resumoDetalhe}
        </div>
        ${rowsHtml}
        <button type="button" class="btn btn-secondary btn-sm mat-add-grade"
          onclick="MatriculaModule._addGradeRow()">+ Adicionar Grade</button>
      </div>`;
  },

  _addGradeRow() {
    this._state._grades.push({ turmaId: '', turmaNome: '', aulas: 0, aulasEscolhidas: [] });
    this._reRenderGradesSection();
  },

  _removeGradeRow(idx) {
    this._state._grades.splice(idx, 1);
    this._reRenderGradesSection();
  },

  _onGradeSelect(idx, turmaId, opt) {
    if (!this._state._grades[idx]) return;
    this._state._grades[idx].turmaId        = turmaId;
    this._state._grades[idx].turmaNome      = opt ? (opt.dataset.nome || opt.textContent.trim()) : '';
    this._state._grades[idx].aulasEscolhidas = [];
    this._state._grades[idx].aulas           = 0;
    this._reRenderGradesSection();
  },

  _updateGradeRow(idx, field, value) {
    if (!this._state._grades[idx]) return;
    this._state._grades[idx][field] = value;
    this._reRenderGradesSection();
  },

  _toggleAulaEscolhida(gradeIdx, aulaId, checked) {
    const row = this._state._grades[gradeIdx];
    if (!row) return;
    const escolhidas = row.aulasEscolhidas || [];
    if (checked) {
      if (!escolhidas.includes(aulaId)) escolhidas.push(aulaId);
    } else {
      const i = escolhidas.indexOf(aulaId);
      if (i > -1) escolhidas.splice(i, 1);
    }
    row.aulasEscolhidas = escolhidas;
    row.aulas           = escolhidas.length;
    this._reRenderGradesSection();
  },

  _selecionarMaxGrade(gradeIdx) {
    const row = this._state._grades[gradeIdx];
    if (!row || !row.turmaId) return;

    const planoSel = document.getElementById('mat-plano');
    const aulasMax = planoSel && planoSel.value
      ? (parseInt((planoSel.selectedOptions[0] || {}).dataset?.aulas) || 0) : 0;

    const usadasOutras = this._state._grades
      .filter((_, i) => i !== gradeIdx)
      .reduce((s, r) => s + (r.aulasEscolhidas || []).length, 0);
    const limite = aulasMax - usadasOutras;
    if (limite <= 0) return;

    const inicioEl  = document.getElementById('mat-inicio');
    const fimEl     = document.getElementById('mat-fim');
    const dataInicio = inicioEl ? inicioEl.value : '';
    const dataFim    = fimEl    ? fimEl.value    : '';

    const aulasDisp = Storage.getAll('aulas')
      .filter(a => {
        if (a.turmaId !== row.turmaId || a.status === 'cancelada') return false;
        if (dataInicio && a.data < dataInicio) return false;
        if (dataFim    && a.data > dataFim)    return false;
        return true;
      })
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, limite);

    row.aulasEscolhidas = aulasDisp.map(a => a.id);
    row.aulas           = row.aulasEscolhidas.length;
    this._reRenderGradesSection();
  },

  _limparGrade(gradeIdx) {
    const row = this._state._grades[gradeIdx];
    if (!row) return;
    row.aulasEscolhidas = [];
    row.aulas           = 0;
    this._reRenderGradesSection();
  },

  _reRenderGradesSection() {
    const section = document.getElementById('mat-grades-section');
    if (!section) return;

    const planoSel = document.getElementById('mat-plano');
    let aulasIncluidas = 0;
    let planoTipo = '';

    if (planoSel && planoSel.value) {
      const opt = planoSel.selectedOptions[0];
      aulasIncluidas = parseInt(opt?.dataset?.aulas) || 0;
      planoTipo      = opt?.dataset?.tipo || '';
      if (!aulasIncluidas || !planoTipo) {
        const plano = Storage.getById('planos', planoSel.value);
        if (plano) {
          aulasIncluidas = aulasIncluidas || plano.aulasIncluidas || 0;
          planoTipo      = planoTipo      || plano.tipo || '';
        }
      }
    }

    // Ao mudar tipo de plano, limpa aulasEscolhidas (incompatível com modo longo)
    const isCurto = this._PLANO_CURTO.includes(planoTipo);
    if (!isCurto) {
      this._state._grades.forEach(r => { r.aulasEscolhidas = []; });
    }

    section.innerHTML = this._renderGradesSection(aulasIncluidas, this._state._grades, planoTipo);
  },

  /* ------------------------------------------------------------------ */
  /*  Plan change handler                                                 */
  /* ------------------------------------------------------------------ */

  /** Ao selecionar plano + início, calcula e preenche data fim automaticamente */
  _onPlanoChange() {
    const planoSel = document.getElementById('mat-plano');
    const inicioEl = document.getElementById('mat-inicio');
    const fimEl    = document.getElementById('mat-fim');
    if (!planoSel || !inicioEl || !fimEl) return;

    const opt   = planoSel.selectedOptions[0];
    const tipo  = opt ? opt.dataset.tipo : '';
    const inicio = inicioEl.value;
    if (inicio && tipo) {
      const d = new Date(inicio + 'T00:00:00');
      const meses = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
      if (meses[tipo]) {
        d.setMonth(d.getMonth() + meses[tipo]);
        d.setDate(d.getDate() - 1);
        fimEl.value = d.toISOString().slice(0, 10);
      }
    }

    // Preenche valor do plano se campo vazio
    const valorEl = document.getElementById('mat-valor');
    if (valorEl && !valorEl.value && opt && opt.dataset.valor) {
      valorEl.value = opt.dataset.valor;
    }

    // Atualiza a seção de distribuição de grades
    this._reRenderGradesSection();
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
      numeroParcelas:g('parcelas') ? parseInt(g('parcelas').value) || 1 : 1,
      status:        g('status') ? g('status').value : 'ativa',
      observacoes:   g('obs')    ? g('obs').value.trim() : '',
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

    // Sincronizar turmaAlunos com _state._grades
    if (matriculaId) {
      const alunoId   = data.alunoId;
      const alunoNome = data.alunoNome;

      // Buscar turmaAlunos existentes para esta matrícula
      const existentes = Storage.getAll('turmaAlunos').filter(ta => ta.matriculaId === matriculaId);

      // Grades válidas do estado atual (com turmaId definido e aulas > 0)
      const gradesValidas = this._state._grades.filter(g => g.turmaId && (parseInt(g.aulas) || 0) > 0);

      // Para cada grade válida: criar ou atualizar
      gradesValidas.forEach(gradeEntry => {
        const turmaId        = gradeEntry.turmaId;
        const turmaNome      = gradeEntry.turmaNome || '';
        const aulasEscolhidas = gradeEntry.aulasEscolhidas || [];
        const aulasAlocadas  = aulasEscolhidas.length || parseInt(gradeEntry.aulas) || 1;

        const existente = existentes.find(ta => ta.turmaId === turmaId);

        if (!existente) {
          Storage.create('turmaAlunos', {
            turmaId,
            turmaNome,
            alunoId,
            alunoNome,
            aulasAlocadas,
            aulasEscolhidas,
            matriculaId,
            status:        'ativo',
            dataInscricao: new Date().toISOString(),
          });
        } else {
          Storage.update('turmaAlunos', existente.id, { aulasAlocadas, aulasEscolhidas });
        }
      });

      // Remover turmaAlunos que não estão mais em _state._grades
      const turmaIdsValidas = new Set(gradesValidas.map(g => g.turmaId));
      existentes.forEach(ta => {
        if (!turmaIdsValidas.has(ta.turmaId)) {
          Storage.delete('turmaAlunos', ta.id);
        }
      });
    }

    // Gerar aulas no cronograma para cada grade contratada
    if (matriculaId) {
      const count = this._gerarAulasMatricula(matriculaId, data.dataInicio, data.dataFim, data.alunoId, data.alunoNome);
      if (count > 0) UI.toast(`${count} aula${count !== 1 ? 's' : ''} gerada${count !== 1 ? 's' : ''} no cronograma.`, 'info');
    }

    // Sincronizar lançamentos financeiros
    if (matriculaId) {
      this._sincronizarFinanceiro(matriculaId, data);
    }

    UI.closeModal();
    this.render();
  },

  /**
   * Gera aulas no cronograma para cada grade da matrícula,
   * respeitando diasSemana da grade e o limite de aulasAlocadas por mês.
   */
  _gerarAulasMatricula(matriculaId, dataInicio, dataFim, alunoId, alunoNome) {
    if (!dataInicio || !dataFim) return 0;

    const DIAS_JS = { dom:0, seg:1, ter:2, qua:3, qui:4, sex:5, sab:6 };
    const gradesVinculadas = Storage.getAll('turmaAlunos')
      .filter(ta => ta.matriculaId === matriculaId && ta.status === 'ativo');

    let totalGeradas = 0;

    gradesVinculadas.forEach(ta => {
      // Se o aluno escolheu aulas específicas, não gera automaticamente
      if (ta.aulasEscolhidas && ta.aulasEscolhidas.length > 0) return;

      const turma = Storage.getById('turmas', ta.turmaId);
      if (!turma || !(turma.diasSemana || []).length) return;

      const diasJs   = turma.diasSemana.map(d => DIAS_JS[d]).filter(d => d !== undefined);
      const aulasMax = parseInt(ta.aulasAlocadas) || 0;
      if (aulasMax <= 0) return;

      // Aulas já existentes desta turma no período (para não duplicar)
      const aulasExistentes = new Set(
        Storage.getAll('aulas')
          .filter(a => a.turmaId === ta.turmaId && a.data >= dataInicio && a.data <= dataFim)
          .map(a => a.data)
      );

      // Percorre cada dia do período
      const cur = new Date(dataInicio + 'T12:00:00');
      const fim = new Date(dataFim   + 'T12:00:00');

      // Controla aulas geradas por mês
      let mesAtual = '';
      let aulasNoMes = 0;

      while (cur <= fim) {
        const mesStr  = cur.toISOString().slice(0, 7); // 'YYYY-MM'
        const dataStr = cur.toISOString().slice(0, 10);
        const diaSem  = cur.getDay();

        // Reseta contador ao entrar num novo mês
        if (mesStr !== mesAtual) {
          mesAtual   = mesStr;
          aulasNoMes = 0;
        }

        if (diasJs.includes(diaSem) && aulasNoMes < aulasMax) {
          if (!aulasExistentes.has(dataStr)) {
            Storage.create('aulas', {
              titulo:         turma.nome,
              turmaId:        turma.id,
              turmaNome:      turma.nome,
              professorId:    turma.professorId   || '',
              professorNome:  turma.professorNome || '',
              arenaId:        turma.arenaId       || '',
              arenaNome:      turma.arenaNome     || '',
              data:           dataStr,
              horarioInicio:  turma.horarioInicio || '',
              horarioFim:     turma.horarioFim    || '',
              vagas:          turma.vagas         || 0,
              tipo:           turma.tipo          || 'grupo',
              nivel:          turma.nivel         || '',
              status:         'agendada',
              observacoes:    `Gerado automaticamente — matrícula ${matriculaId}`,
            });
            aulasExistentes.add(dataStr);
            totalGeradas++;
          }
          aulasNoMes++;
        }

        cur.setDate(cur.getDate() + 1);
      }
    });

    return totalGeradas;
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
  /*  Parcelas                                                            */
  /* ------------------------------------------------------------------ */

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

    // 1. Remove lançamentos pendentes vinculados a esta matrícula
    Storage.getAll('financeiro')
      .filter(l => l.matriculaId === matriculaId && l.status === 'pendente')
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

      const status = i === 0 && valorPago > 0 && formaPagamento
        ? 'pago'
        : 'pendente';

      Storage.create('financeiro', {
        tipo:           'receita',
        categoria:      'mensalidade',
        descricao,
        valor:          valorParc,
        data:           dataLanc,
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
