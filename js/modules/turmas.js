'use strict';

/**
 * TurmasModule — Gestão de turmas, calendário de aulas e frequência de alunos.
 * Substitui AulaModule. Mantém o storage 'aulas' para compatibilidade.
 */
const TurmasModule = {
  SK:        'turmas',      // turmas (grupos recorrentes)
  SK_AULA:   'aulas',       // ocorrências individuais de aula
  SK_INSCR:  'turmaAlunos', // matrículas de alunos em turmas

  DIAS: { dom:'Dom', seg:'Seg', ter:'Ter', qua:'Qua', qui:'Qui', sex:'Sex', sab:'Sáb' },
  DIAS_LABEL: { dom:'Domingo', seg:'Segunda', ter:'Terça', qua:'Quarta', qui:'Quinta', sex:'Sexta', sab:'Sábado' },
  DIAS_JS:    ['dom','seg','ter','qua','qui','sex','sab'],

  STATUS_TURMA: {
    ativa:     { label: 'Ativa',     badge: 'badge-success' },
    suspensa:  { label: 'Suspensa',  badge: 'badge-warning' },
    encerrada: { label: 'Encerrada', badge: 'badge-gray'    },
  },

  STATUS_AULA: {
    agendada:     { label: 'Agendada',     badge: 'badge-blue',    cor: '#3b82f6' },
    em_andamento: { label: 'Em andamento', badge: 'badge-warning', cor: '#f59e0b' },
    concluida:    { label: 'Concluída',    badge: 'badge-success', cor: '#22c55e' },
    cancelada:    { label: 'Cancelada',    badge: 'badge-danger',  cor: '#ef4444' },
  },

  NIVEL: {
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    profissional:  'Profissional',
  },

  _state: {
    tab:          'turmas', // 'turmas' | 'calendario' | 'frequencia'
    search:       '',
    filterStatus: '',
    calAno:       null,
    calMes:       null,
    turmaSel:     '',
  },

  /* ------------------------------------------------------------------ */
  /*  Init / Compat                                                       */
  /* ------------------------------------------------------------------ */

  _initCal() {
    if (!this._state.calAno) {
      const now = new Date();
      this._state.calAno = now.getFullYear();
      this._state.calMes = now.getMonth();
    }
  },

  /** Usado pelo dashboard (compat com AulaModule.getStats) */
  getAulaStats() {
    const all = Storage.getAll(this.SK_AULA);
    return {
      total:      all.length,
      agendadas:  all.filter(a => a.status === 'agendada').length,
      concluidas: all.filter(a => a.status === 'concluida').length,
      canceladas: all.filter(a => a.status === 'cancelada').length,
    };
  },

  /* ------------------------------------------------------------------ */
  /*  Render principal                                                    */
  /* ------------------------------------------------------------------ */

  render() {
    this._initCal();
    const area = document.getElementById('content-area');
    if (!area) return;

    const btnHeader =
      this._state.tab === 'turmas'
        ? `<button class="btn btn-primary" onclick="TurmasModule.openModalTurma()">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/>
               <line x1="5" y1="12" x2="19" y2="12"/></svg>
             Nova Turma
           </button>`
        : this._state.tab === 'calendario'
        ? `<button class="btn btn-primary" onclick="TurmasModule.openModalAula()">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/>
               <line x1="5" y1="12" x2="19" y2="12"/></svg>
             Nova Aula
           </button>`
        : '';

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Turmas</h2>
          <p>Gestão de turmas, calendário de aulas e frequência de alunos</p>
        </div>
        ${btnHeader}
      </div>

      <div class="tabs-bar">
        ${this._tabBtn('turmas',     '📋 Turmas')}
        ${this._tabBtn('calendario', '📅 Calendário')}
        ${this._tabBtn('frequencia', '📊 Frequência')}
      </div>

      <div id="turmas-content">
        ${this._renderTab()}
      </div>`;
  },

  _tabBtn(key, label) {
    return `<button class="tab-btn ${this._state.tab === key ? 'active' : ''}"
      onclick="TurmasModule._setTab('${key}')">${label}</button>`;
  },

  _setTab(tab) {
    this._state.tab = tab;
    this.render();
  },

  _renderTab() {
    switch (this._state.tab) {
      case 'turmas':     return this._renderTurmas();
      case 'calendario': return this._renderCalendario();
      case 'frequencia': return this._renderFrequencia();
      default:           return this._renderTurmas();
    }
  },

  /* ================================================================== */
  /*  ABA 1 — Turmas                                                     */
  /* ================================================================== */

  _renderTurmas() {
    const all = Storage.getAll(this.SK)
      .filter(t => {
        const q = this._state.search.toLowerCase();
        return (!q || t.nome.toLowerCase().includes(q) ||
          (t.professorNome || '').toLowerCase().includes(q))
          && (!this._state.filterStatus || t.status === this._state.filterStatus);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar turma ou professor…"
            value="${UI.escape(this._state.search)}"
            oninput="TurmasModule._state.search=this.value;TurmasModule._reRenderContent()" />
        </div>
        <select class="filter-select"
          onchange="TurmasModule._state.filterStatus=this.value;TurmasModule._reRenderContent()">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS_TURMA).map(([k, v]) =>
            `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <span class="results-count">${all.length} turma${all.length !== 1 ? 's' : ''}</span>
      </div>

      ${all.length
        ? `<div class="table-card">
             <table class="data-table">
               <thead><tr>
                 <th>Turma</th>
                 <th>Professor</th>
                 <th>Horário / Dias</th>
                 <th>Alunos inscritos</th>
                 <th>Status</th>
                 <th></th>
               </tr></thead>
               <tbody>${all.map(t => this._rowTurma(t)).join('')}</tbody>
             </table>
           </div>`
        : this._emptyTurmas()}`;
  },

  _rowTurma(t) {
    const st       = this.STATUS_TURMA[t.status] || { label: t.status, badge: 'badge-gray' };
    const nivel    = this.NIVEL[t.nivel] || t.nivel || '—';
    const dias     = (t.diasSemana || []).map(d => this.DIAS[d] || d).join(', ') || '—';
    const hora     = t.horarioInicio
      ? `${t.horarioInicio}${t.horarioFim ? ' – ' + t.horarioFim : ''}`
      : '—';
    const nAulas     = Storage.getAll(this.SK_AULA).filter(a => a.turmaId === t.id).length;
    const inscritos  = Storage.getAll(this.SK_INSCR).filter(i => i.turmaId === t.id && i.status === 'ativo');
    const nInscritos = inscritos.length;
    const vagas      = t.vagas || 0;
    const vagasLivre = Math.max(0, vagas - nInscritos);

    // Chips com o nome de cada aluno inscrito
    const chipsHtml = inscritos.length
      ? inscritos.map(i => {
          const primeiroNome = UI.escape(i.alunoNome.split(' ')[0]);
          return `<span class="turma-aluno-chip" title="${UI.escape(i.alunoNome)}">${primeiroNome}</span>`;
        }).join('')
      : `<span class="turma-sem-alunos">Nenhum aluno inscrito</span>`;

    // Badge de vagas
    const vagasBadge = vagas > 0
      ? `<span class="turma-vagas-badge ${vagasLivre === 0 ? 'turma-vagas-cheia' : ''}">${nInscritos}/${vagas}</span>`
      : `<span class="turma-vagas-badge">${nInscritos}</span>`;

    return `
      <tr>
        <td>
          <div class="aluno-nome">${UI.escape(t.nome)}</div>
          <div class="aluno-sub">${UI.escape(nivel)} · ${UI.escape(t.tipo || 'Grupo')} · ${nAulas} aula${nAulas !== 1 ? 's' : ''}</div>
        </td>
        <td>${UI.escape(t.professorNome || '—')}</td>
        <td>
          <div style="font-size:13px;font-weight:600;">${hora}</div>
          <div class="aluno-sub">${dias}</div>
        </td>
        <td>
          <div class="turma-alunos-cell">
            <div class="turma-alunos-chips">${chipsHtml}</div>
            <button class="turma-add-aluno-btn" onclick="TurmasModule.openModalAlunos('${t.id}')" title="Gerenciar alunos">
              ${vagasBadge} ＋
            </button>
          </div>
        </td>
        <td><span class="badge ${st.badge}">${st.label}</span></td>
        <td class="aluno-row-actions">
          <button class="btn btn-ghost btn-sm" onclick="TurmasModule.openGerarAulas('${t.id}')" title="Gerar aulas no calendário">📅</button>
          <button class="btn btn-ghost btn-sm" onclick="TurmasModule.openModalTurma('${t.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger" onclick="TurmasModule.deleteTurma('${t.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`;
  },

  _emptyTurmas() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🏸</div>
        <div class="empty-title">Nenhuma turma cadastrada</div>
        <div class="empty-desc">Crie a primeira turma para organizar as aulas da academia.</div>
        <button class="btn btn-primary mt-16" onclick="TurmasModule.openModalTurma()">+ Nova Turma</button>
      </div>`;
  },

  _reRenderContent() {
    const el = document.getElementById('turmas-content');
    if (el) el.innerHTML = this._renderTab();
  },

  /* ================================================================== */
  /*  ABA 2 — Calendário                                                 */
  /* ================================================================== */

  _renderCalendario() {
    const { calAno, calMes } = this._state;
    const mesNome = new Date(calAno, calMes, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const titulo = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);

    return `
      <div class="cal-header">
        <button class="btn btn-ghost btn-sm cal-nav" onclick="TurmasModule._navCal(-1)">&#8249;</button>
        <span class="cal-title">${titulo}</span>
        <button class="btn btn-ghost btn-sm cal-nav" onclick="TurmasModule._navCal(1)">&#8250;</button>
        <button class="btn btn-secondary btn-sm" style="margin-left:12px;" onclick="TurmasModule._navCalHoje()">Hoje</button>
      </div>
      ${this._renderGrade(calAno, calMes)}`;
  },

  _navCal(delta) {
    let { calAno, calMes } = this._state;
    calMes += delta;
    if (calMes < 0)  { calMes = 11; calAno--; }
    if (calMes > 11) { calMes = 0;  calAno++; }
    this._state.calAno = calAno;
    this._state.calMes = calMes;
    this._reRenderContent();
  },

  _navCalHoje() {
    const now = new Date();
    this._state.calAno = now.getFullYear();
    this._state.calMes = now.getMonth();
    this._reRenderContent();
  },

  _renderGrade(ano, mes) {
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia   = new Date(ano, mes + 1, 0);
    const diasDoMes   = ultimoDia.getDate();
    const inicioSem   = primeiroDia.getDay(); // 0=dom

    const mesStr    = String(mes + 1).padStart(2, '0');
    const inicioStr = `${ano}-${mesStr}-01`;
    const fimStr    = `${ano}-${mesStr}-${String(diasDoMes).padStart(2, '0')}`;

    const aulasDoMes = Storage.getAll(this.SK_AULA)
      .filter(a => a.data && a.data >= inicioStr && a.data <= fimStr)
      .sort((a, b) => (a.horarioInicio || '').localeCompare(b.horarioInicio || ''));

    const hoje    = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const HEADER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let cells = '';

    // Células em branco antes do dia 1
    for (let i = 0; i < inicioSem; i++) {
      cells += `<div class="cal-cell cal-cell-outside"></div>`;
    }

    for (let d = 1; d <= diasDoMes; d++) {
      const dataStr = `${ano}-${mesStr}-${String(d).padStart(2, '0')}`;
      const aulasHoje = aulasDoMes.filter(a => a.data === dataStr);
      const isHoje    = dataStr === hojeStr;

      const eventos = aulasHoje.map(a => {
        const cor = (this.STATUS_AULA[a.status] || {}).cor || '#6b7280';
        return `
          <div class="cal-event" style="border-left-color:${cor};"
            onclick="TurmasModule.openModalAulaDetalhe('${a.id}')">
            <span class="cal-event-hora">${a.horarioInicio || ''}</span>
            <span class="cal-event-nome">${UI.escape(a.titulo)}</span>
          </div>`;
      }).join('');

      cells += `
        <div class="cal-cell${isHoje ? ' cal-cell-hoje' : ''}">
          <div class="cal-day-num${isHoje ? ' cal-day-hoje' : ''}">${d}</div>
          <div class="cal-events">${eventos}</div>
        </div>`;
    }

    // Preencher colunas restantes
    const total = inicioSem + diasDoMes;
    const resto = total % 7;
    if (resto > 0) {
      for (let i = resto; i < 7; i++) {
        cells += `<div class="cal-cell cal-cell-outside"></div>`;
      }
    }

    return `
      <div class="cal-grid">
        <div class="cal-dow-header">
          ${HEADER.map(d => `<div class="cal-dow">${d}</div>`).join('')}
        </div>
        <div class="cal-cells">${cells}</div>
      </div>`;
  },

  /* ================================================================== */
  /*  ABA 3 — Frequência                                                 */
  /* ================================================================== */

  _renderFrequencia() {
    const turmas = Storage.getAll(this.SK).sort((a, b) => a.nome.localeCompare(b.nome));
    const sel    = this._state.turmaSel;

    const opts = `<option value="">— Selecionar turma —</option>` +
      turmas.map(t =>
        `<option value="${t.id}" ${sel === t.id ? 'selected' : ''}>${UI.escape(t.nome)}</option>`
      ).join('');

    return `
      <div class="filters-bar">
        <select class="filter-select" style="min-width:260px;"
          onchange="TurmasModule._state.turmaSel=this.value;TurmasModule._reRenderContent()">
          ${opts}
        </select>
      </div>
      ${sel ? this._tabelaFrequencia(sel) : `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-title">Selecione uma turma</div>
          <div class="empty-desc">Escolha uma turma para visualizar o relatório de frequência.</div>
        </div>`}`;
  },

  _tabelaFrequencia(turmaId) {
    const aulas = Storage.getAll(this.SK_AULA)
      .filter(a => a.turmaId === turmaId && a.status !== 'cancelada')
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    if (!aulas.length) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div class="empty-title">Nenhuma aula registrada para esta turma</div>
          <div class="empty-desc">Gere aulas a partir da aba Turmas ou agende aulas avulsas.</div>
        </div>`;
    }

    const presencas = Storage.getAll('presencas');
    const aulaIds   = aulas.map(a => a.id);

    // Coleta todos os alunos que aparecem nas presenças desta turma
    const alunosMap = {};
    presencas
      .filter(p => aulaIds.includes(p.aulaId))
      .forEach(p => { alunosMap[p.alunoId] = p.alunoNome; });
    const alunos = Object.entries(alunosMap)
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    if (!alunos.length) {
      return `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-title">Nenhuma frequência registrada</div>
          <div class="empty-desc">Registre a presença dos alunos nas aulas desta turma pelo Calendário.</div>
        </div>`;
    }

    const colDatas = aulas.map(a =>
      `<th class="text-center freq-col-data" title="${this._fmtDataLonga(a.data)}">${this._fmtDataCurta(a.data)}</th>`
    ).join('');

    const rows = alunos.map(al => {
      let presentes = 0;
      let registrados = 0;

      const cells = aulas.map(a => {
        const reg = presencas.find(p => p.aulaId === a.id && p.alunoId === al.id);
        if (!reg) return `<td class="text-center freq-cell-nd" title="Sem registro">—</td>`;
        registrados++;
        if (reg.presente) {
          presentes++;
          return `<td class="text-center freq-cell-ok" title="Presente">✅</td>`;
        }
        return `<td class="text-center freq-cell-falta" title="Ausente">❌</td>`;
      }).join('');

      const pct = registrados > 0 ? Math.round((presentes / registrados) * 100) : null;
      const pctClass = pct === null ? 'text-muted' : pct >= 75 ? 'freq-pct-ok' : pct >= 50 ? 'freq-pct-med' : 'freq-pct-ruim';
      const pctLabel = pct === null ? '—' : `${pct}%`;

      return `
        <tr>
          <td class="freq-aluno-nome">${UI.escape(al.nome)}</td>
          ${cells}
          <td class="text-center font-bold ${pctClass}">${pctLabel}</td>
        </tr>`;
    }).join('');

    return `
      <div style="overflow-x:auto;">
        <div class="table-card">
          <table class="data-table freq-table">
            <thead>
              <tr>
                <th class="freq-col-aluno">Aluno</th>
                ${colDatas}
                <th class="text-center">Freq.</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ================================================================== */
  /*  Modal: Nova / Editar Turma                                         */
  /* ================================================================== */

  openModalTurma(id = null) {
    const turma  = id ? Storage.getById(this.SK, id) : null;
    const v      = (f, fb = '') => turma ? UI.escape(String(turma[f] ?? fb)) : fb;

    const professores = Storage.getAll('professores').filter(p => p.status === 'ativo');
    const profOpts = `<option value="">— Selecionar —</option>` +
      professores.map(p =>
        `<option value="${p.id}" data-nome="${UI.escape(p.nome)}"
          ${turma && turma.professorId === p.id ? 'selected' : ''}>${UI.escape(p.nome)}</option>`
      ).join('');

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOpts = `<option value="">— Selecionar —</option>` +
      arenas.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
          ${turma && turma.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
      ).join('');

    const DIAS_ORDER = [['seg','Segunda'],['ter','Terça'],['qua','Quarta'],['qui','Quinta'],['sex','Sexta'],['sab','Sábado'],['dom','Domingo']];
    const diasChecks = DIAS_ORDER.map(([k, label]) => `
      <label class="check-inline">
        <input type="checkbox" name="dia-turma" value="${k}"
          ${turma && (turma.diasSemana || []).includes(k) ? 'checked' : ''} />
        ${label}
      </label>`).join('');

    const statusOpts = Object.entries(this.STATUS_TURMA).map(([k, cfg]) =>
      `<option value="${k}" ${turma && turma.status === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const nivelOpts  = ListasService.opts('aulas_nivel', turma?.nivel || '');
    const tipoOpts   = [['individual','Individual'],['dupla','Dupla'],['grupo','Grupo']]
      .map(([k, l]) => `<option value="${k}" ${turma?.tipo === k ? 'selected' : ''}>${l}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="tm-nome">Nome da turma <span class="required-star">*</span></label>
          <input id="tm-nome" type="text" class="form-input"
            placeholder="ex: Turma Iniciante Manhã"
            value="${v('nome')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="tm-tipo">Tipo</label>
            <select id="tm-tipo" class="form-select">${tipoOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="tm-nivel">Nível</label>
            <select id="tm-nivel" class="form-select">${nivelOpts}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="tm-prof">Professor</label>
            <select id="tm-prof" class="form-select">${profOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="tm-arena">Arena</label>
            <select id="tm-arena" class="form-select">${arenaOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Dias da semana</label>
          <div class="check-group">${diasChecks}</div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="tm-hi">Horário início</label>
            <input id="tm-hi" type="time" class="form-input" value="${v('horarioInicio')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="tm-hf">Horário fim</label>
            <input id="tm-hf" type="time" class="form-input" value="${v('horarioFim')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="tm-vagas">Vagas</label>
            <input id="tm-vagas" type="number" class="form-input" min="1" max="30"
              value="${v('vagas', '4')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="tm-status">Status</label>
            <select id="tm-status" class="form-select">${statusOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="tm-obs">Observações</label>
          <textarea id="tm-obs" class="form-textarea" rows="2"
            placeholder="Informações sobre a turma…">${turma ? UI.escape(turma.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        id ? `Editar Turma — ${turma.nome}` : 'Nova Turma',
      content,
      confirmLabel: id ? 'Salvar alterações' : 'Criar Turma',
      onConfirm:    () => this.saveTurma(id),
    });
  },

  saveTurma(id = null) {
    const g      = n => document.getElementById(`tm-${n}`);
    const nomeEl = g('nome');
    if (!nomeEl || !nomeEl.value.trim()) {
      if (nomeEl) nomeEl.classList.add('error');
      UI.toast('Informe o nome da turma.', 'warning');
      return;
    }
    nomeEl.classList.remove('error');

    const diasSemana = Array.from(
      document.querySelectorAll('input[name="dia-turma"]:checked')
    ).map(cb => cb.value);

    const profSel  = g('prof');
    const professorId   = profSel ? profSel.value : '';
    const professorNome = profSel && profSel.selectedOptions[0]
      ? (profSel.selectedOptions[0].dataset.nome || '') : '';

    const arenaSel = g('arena');
    const arenaId   = arenaSel ? arenaSel.value : '';
    const arenaNome = arenaSel && arenaSel.selectedOptions[0]
      ? (arenaSel.selectedOptions[0].dataset.nome || '') : '';

    const record = {
      nome:          nomeEl.value.trim(),
      tipo:          g('tipo')   ? g('tipo').value                   : 'grupo',
      nivel:         g('nivel')  ? g('nivel').value                  : 'iniciante',
      professorId, professorNome, arenaId, arenaNome,
      diasSemana,
      horarioInicio: g('hi')     ? g('hi').value                     : '',
      horarioFim:    g('hf')     ? g('hf').value                     : '',
      vagas:         g('vagas')  ? parseInt(g('vagas').value, 10) || 4 : 4,
      status:        g('status') ? g('status').value                 : 'ativa',
      observacoes:   g('obs')    ? g('obs').value.trim()             : '',
    };

    if (id) {
      Storage.update(this.SK, id, record);
      UI.toast(`Turma "${record.nome}" atualizada!`, 'success');
    } else {
      Storage.create(this.SK, record);
      UI.toast(`Turma "${record.nome}" criada!`, 'success');
    }
    UI.closeModal();
    this.render();
  },

  async deleteTurma(id) {
    const t = Storage.getById(this.SK, id);
    if (!t) return;
    const ok = await UI.confirm(
      `Excluir a turma "${t.nome}"? As aulas vinculadas não serão removidas.`,
      'Excluir Turma'
    );
    if (!ok) return;
    Storage.delete(this.SK, id);
    UI.toast(`Turma "${t.nome}" excluída.`, 'success');
    this.render();
  },

  /* ================================================================== */
  /*  Gerar aulas a partir do calendário da turma                        */
  /* ================================================================== */

  openGerarAulas(turmaId) {
    const t = Storage.getById(this.SK, turmaId);
    if (!t) return;

    if (!(t.diasSemana || []).length) {
      UI.toast('Configure os dias da semana na turma antes de gerar aulas.', 'warning');
      return;
    }

    const hoje    = new Date();
    const hojeStr = this._isoDate(hoje);
    const diasLabel = (t.diasSemana || [])
      .map(d => this.DIAS_LABEL[d] || d).join(', ');

    const content = `
      <div class="form-grid">
        <div class="info-box">
          <strong>${UI.escape(t.nome)}</strong><br>
          <span class="text-muted" style="font-size:13px;">
            ${diasLabel} · ${t.horarioInicio || '—'}${t.horarioFim ? ' – ' + t.horarioFim : ''}
            · Prof. ${UI.escape(t.professorNome || '—')}
          </span>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ga-ini">Data início <span class="required-star">*</span></label>
            <input id="ga-ini" type="date" class="form-input" value="${hojeStr}"
              oninput="TurmasModule._prevGerar('${turmaId}')" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ga-fim">Data fim <span class="required-star">*</span></label>
            <input id="ga-fim" type="date" class="form-input"
              oninput="TurmasModule._prevGerar('${turmaId}')" />
          </div>
        </div>

        <div id="ga-preview" class="info-box" style="display:none;"></div>
      </div>`;

    UI.openModal({
      title:        `Gerar Aulas — ${t.nome}`,
      content,
      confirmLabel: 'Gerar Aulas',
      onConfirm:    () => this._gerarAulas(turmaId),
    });
  },

  _prevGerar(turmaId) {
    const t   = Storage.getById(this.SK, turmaId);
    const ini = document.getElementById('ga-ini')?.value;
    const fim = document.getElementById('ga-fim')?.value;
    const box = document.getElementById('ga-preview');
    if (!t || !ini || !fim || !box) return;

    const diasSel = this._diasJS(t.diasSemana || []);
    const count   = this._contarOcorrencias(ini, fim, diasSel);
    box.style.display = 'block';
    box.innerHTML = `Serão geradas aproximadamente <strong>${count} aula${count !== 1 ? 's' : ''}</strong> entre ${this._fmtDataCurta(ini)} e ${this._fmtDataCurta(fim)}.`;
  },

  _diasJS(diasSemana) {
    const MAP = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
    return diasSemana.map(d => MAP[d]).filter(d => d !== undefined);
  },

  _contarOcorrencias(inicioStr, fimStr, diasSel) {
    let count = 0;
    const cur = new Date(inicioStr + 'T12:00:00');
    const end = new Date(fimStr + 'T12:00:00');
    while (cur <= end) {
      if (diasSel.includes(cur.getDay())) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  },

  _gerarAulas(turmaId) {
    const t   = Storage.getById(this.SK, turmaId);
    const ini = document.getElementById('ga-ini')?.value;
    const fim = document.getElementById('ga-fim')?.value;

    if (!ini || !fim) { UI.toast('Informe as datas de início e fim.', 'warning'); return; }
    if (ini > fim)    { UI.toast('Data de início deve ser anterior ao fim.', 'warning'); return; }

    const diasSel = this._diasJS(t.diasSemana || []);
    if (!diasSel.length) {
      UI.toast('Configure os dias da semana da turma.', 'warning');
      return;
    }

    const existentes = new Set(
      Storage.getAll(this.SK_AULA).filter(a => a.turmaId === turmaId).map(a => a.data)
    );

    let count = 0;
    const cur = new Date(ini + 'T12:00:00');
    const end = new Date(fim + 'T12:00:00');
    const MAX = 365;

    while (cur <= end && count < MAX) {
      if (diasSel.includes(cur.getDay())) {
        const dataStr = this._isoDate(cur);
        if (!existentes.has(dataStr)) {
          Storage.create(this.SK_AULA, {
            titulo:        t.nome,
            tipo:          t.tipo,
            nivel:         t.nivel,
            turmaId:       t.id,
            turmaNome:     t.nome,
            professorId:   t.professorId,
            professorNome: t.professorNome,
            arenaId:       t.arenaId,
            arenaNome:     t.arenaNome,
            data:          dataStr,
            horarioInicio: t.horarioInicio,
            horarioFim:    t.horarioFim,
            vagas:         t.vagas,
            status:        'agendada',
            observacoes:   '',
          });
          count++;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    UI.closeModal();
    UI.toast(`${count} aula${count !== 1 ? 's' : ''} gerada${count !== 1 ? 's' : ''} com sucesso!`, 'success');
    // Vai para o calendário no mês de início
    const dIni = new Date(ini + 'T12:00:00');
    this._state.tab    = 'calendario';
    this._state.calAno = dIni.getFullYear();
    this._state.calMes = dIni.getMonth();
    this.render();
  },

  /* ================================================================== */
  /*  Modal: Nova / Editar Aula Avulsa                                   */
  /* ================================================================== */

  openModalAula(id = null) {
    const aula   = id ? Storage.getById(this.SK_AULA, id) : null;
    const isEdit = !!aula;
    const v      = (f, fb = '') => aula ? UI.escape(String(aula[f] ?? fb)) : fb;

    const turmas = Storage.getAll(this.SK);
    const turmaOpts = `<option value="">— Avulsa (sem turma) —</option>` +
      turmas.map(t =>
        `<option value="${t.id}" data-nome="${UI.escape(t.nome)}"
          ${aula && aula.turmaId === t.id ? 'selected' : ''}>${UI.escape(t.nome)}</option>`
      ).join('');

    const professores = Storage.getAll('professores').filter(p => p.status === 'ativo');
    const profOpts = `<option value="">— Selecionar —</option>` +
      professores.map(p =>
        `<option value="${p.id}" data-nome="${UI.escape(p.nome)}"
          ${aula && aula.professorId === p.id ? 'selected' : ''}>${UI.escape(p.nome)}</option>`
      ).join('');

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOpts = `<option value="">— Selecionar —</option>` +
      arenas.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
          ${aula && aula.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
      ).join('');

    const statusOpts = Object.entries(this.STATUS_AULA).map(([k, cfg]) =>
      `<option value="${k}" ${aula && aula.status === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');
    const nivelOpts = ListasService.opts('aulas_nivel', aula?.nivel || '');

    const content = `
      <div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-titulo">Título <span class="required-star">*</span></label>
            <input id="au-titulo" type="text" class="form-input"
              placeholder="ex: Aula de Saque" value="${v('titulo')}" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="au-turma">Turma</label>
            <select id="au-turma" class="form-select">${turmaOpts}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-nivel">Nível</label>
            <select id="au-nivel" class="form-select">${nivelOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="au-prof">Professor</label>
            <select id="au-prof" class="form-select">${profOpts}</select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-arena">Arena</label>
            <select id="au-arena" class="form-select">${arenaOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="au-data">Data <span class="required-star">*</span></label>
            <input id="au-data" type="date" class="form-input" value="${v('data')}" required />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-hi">Horário início</label>
            <input id="au-hi" type="time" class="form-input" value="${v('horarioInicio')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="au-hf">Horário fim</label>
            <input id="au-hf" type="time" class="form-input" value="${v('horarioFim')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-vagas">Vagas</label>
            <input id="au-vagas" type="number" class="form-input" min="1" max="30" value="${v('vagas', '4')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="au-status">Status</label>
            <select id="au-status" class="form-select">${statusOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="au-obs">Observações</label>
          <textarea id="au-obs" class="form-textarea" rows="2"
            placeholder="Informações adicionais…">${aula ? UI.escape(aula.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Aula — ${aula.titulo}` : 'Nova Aula',
      content,
      confirmLabel: isEdit ? 'Salvar' : 'Agendar',
      onConfirm:    () => this.saveAula(id),
    });
  },

  saveAula(id = null) {
    const g       = n => document.getElementById(`au-${n}`);
    const tituloEl = g('titulo');
    const dataEl   = g('data');
    let valid = true;
    [tituloEl, dataEl].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });
    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const turmaSel      = g('turma');
    const turmaId       = turmaSel ? turmaSel.value : '';
    const turmaNome     = turmaSel && turmaSel.selectedOptions[0] ? (turmaSel.selectedOptions[0].dataset.nome || '') : '';
    const profSel       = g('prof');
    const professorId   = profSel ? profSel.value : '';
    const professorNome = profSel && profSel.selectedOptions[0] ? (profSel.selectedOptions[0].dataset.nome || '') : '';
    const arenaSel      = g('arena');
    const arenaId       = arenaSel ? arenaSel.value : '';
    const arenaNome     = arenaSel && arenaSel.selectedOptions[0] ? (arenaSel.selectedOptions[0].dataset.nome || '') : '';

    const record = {
      titulo:        tituloEl.value.trim(),
      nivel:         g('nivel')  ? g('nivel').value                    : 'iniciante',
      turmaId, turmaNome, professorId, professorNome, arenaId, arenaNome,
      data:          dataEl.value,
      horarioInicio: g('hi')     ? g('hi').value                       : '',
      horarioFim:    g('hf')     ? g('hf').value                       : '',
      vagas:         g('vagas')  ? parseInt(g('vagas').value, 10) || 4 : 4,
      status:        g('status') ? g('status').value                   : 'agendada',
      observacoes:   g('obs')    ? g('obs').value.trim()               : '',
    };

    if (id) {
      Storage.update(this.SK_AULA, id, record);
      UI.toast(`Aula "${record.titulo}" atualizada!`, 'success');
    } else {
      Storage.create(this.SK_AULA, record);
      UI.toast(`Aula "${record.titulo}" agendada!`, 'success');
    }
    UI.closeModal();
    this.render();
  },

  /* ================================================================== */
  /*  Modal: Detalhe da Aula (pelo Calendário)                           */
  /* ================================================================== */

  openModalAulaDetalhe(id) {
    const aula = Storage.getById(this.SK_AULA, id);
    if (!aula) return;

    const st      = this.STATUS_AULA[aula.status] || { label: aula.status, badge: 'badge-gray' };
    const pStats  = PresencaModule.getStats(id);
    const hora    = aula.horarioInicio
      ? `${aula.horarioInicio}${aula.horarioFim ? ' – ' + aula.horarioFim : ''}` : '—';
    const checkin  = aula.professorCheckin  ? this._fmtTime(aula.professorCheckin)  : null;
    const checkout = aula.professorCheckout ? this._fmtTime(aula.professorCheckout) : null;

    // --- Seção check-in professor ---
    let checkinHtml = '';
    if (aula.status !== 'cancelada') {
      if (checkin && checkout) {
        checkinHtml = `
          <div class="presenca-cell" style="gap:10px;">
            <span class="presenca-tag presenca-entrada">▶ Entrada: ${checkin}</span>
            <span class="presenca-tag presenca-saida">■ Saída: ${checkout}</span>
          </div>`;
      } else if (checkin) {
        checkinHtml = `
          <div class="presenca-cell" style="gap:10px;">
            <span class="presenca-tag presenca-entrada">▶ Entrada: ${checkin}</span>
            <button class="btn btn-ghost btn-sm presenca-checkout"
              onclick="TurmasModule.professorCheckout('${id}');UI.closeModal();">■ Registrar saída</button>
          </div>`;
      } else if (['agendada', 'em_andamento'].includes(aula.status)) {
        checkinHtml = `
          <button class="btn btn-primary"
            onclick="TurmasModule.professorCheckin('${id}');UI.closeModal();">
            ▶ Registrar entrada do professor
          </button>`;
      } else {
        checkinHtml = `<span class="text-muted" style="font-size:13px;">Não registrado</span>`;
      }
    } else {
      checkinHtml = `<span class="text-muted" style="font-size:13px;">Aula cancelada</span>`;
    }

    const content = `
      <div class="form-grid">
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <span class="badge ${st.badge}">${st.label}</span>
          ${aula.turmaNome ? `<span class="badge badge-blue">${UI.escape(aula.turmaNome)}</span>` : '<span class="badge badge-gray">Avulsa</span>'}
        </div>

        <div class="info-grid">
          <span class="text-muted">Data:</span>      <strong>${this._fmtDataLonga(aula.data)}</strong>
          <span class="text-muted">Horário:</span>   <strong>${hora}</strong>
          <span class="text-muted">Professor:</span> <strong>${UI.escape(aula.professorNome || '—')}</strong>
          <span class="text-muted">Arena:</span>     <strong>${UI.escape(aula.arenaNome || '—')}</strong>
          <span class="text-muted">Nível:</span>     <strong>${this.NIVEL[aula.nivel] || aula.nivel || '—'}</strong>
          <span class="text-muted">Vagas:</span>     <strong>${aula.vagas || '—'}</strong>
        </div>

        <div class="detalhe-section">
          <div class="detalhe-section-title">👨‍🏫 Presença do Professor</div>
          ${checkinHtml}
        </div>

        <div class="detalhe-section">
          <div class="detalhe-section-title">👥 Frequência dos Alunos</div>
          <button class="btn btn-secondary"
            onclick="UI.closeModal();PresencaModule.abrirModal('${id}')">
            Registrar / Ver Frequência
            ${pStats.total ? `<span class="badge badge-success" style="margin-left:6px;">${pStats.presentes}/${pStats.total}</span>` : ''}
          </button>
        </div>

        ${aula.observacoes ? `
          <div class="detalhe-section">
            <div class="detalhe-section-title">📝 Observações</div>
            <p style="font-size:13px;color:var(--text-secondary);margin:0;">${UI.escape(aula.observacoes)}</p>
          </div>` : ''}
      </div>`;

    UI.openModal({
      title:        aula.titulo,
      content,
      confirmLabel: 'Editar Aula',
      cancelLabel:  'Fechar',
      onConfirm:    () => { UI.closeModal(); this.openModalAula(id); },
    });
  },

  /* ================================================================== */
  /*  Professor Check-in / Check-out                                     */
  /* ================================================================== */

  professorCheckin(id) {
    const aula = Storage.getById(this.SK_AULA, id);
    if (!aula) return;
    if (aula.professorCheckin) { UI.toast('Entrada já registrada.', 'warning'); return; }
    Storage.update(this.SK_AULA, id, {
      professorCheckin: new Date().toISOString(),
      status: aula.status === 'agendada' ? 'em_andamento' : aula.status,
    });
    UI.toast(`Entrada registrada — "${aula.titulo}"`, 'success');
    this._reRenderContent();
  },

  async professorCheckout(id) {
    const aula = Storage.getById(this.SK_AULA, id);
    if (!aula) return;
    if (!aula.professorCheckin)  { UI.toast('Registre a entrada primeiro.', 'warning'); return; }
    if (aula.professorCheckout)  { UI.toast('Saída já registrada.', 'warning'); return; }
    const ok = await UI.confirm(
      `Registrar saída e concluir a aula "${aula.titulo}"?`, 'Confirmar Saída'
    );
    if (!ok) return;
    Storage.update(this.SK_AULA, id, {
      professorCheckout: new Date().toISOString(),
      status: 'concluida',
    });
    UI.toast(`Aula "${aula.titulo}" concluída.`, 'success');
    this._reRenderContent();
  },

  /* ================================================================== */
  /*  Alunos inscritos na turma                                         */
  /* ================================================================== */

  openModalAlunos(turmaId) {
    const turma = Storage.getById(this.SK, turmaId);
    if (!turma) return;

    UI.openModal({
      title:        `👥 Alunos — ${turma.nome}`,
      content:      this._renderInscricoes(turmaId),
      confirmLabel: null,
      cancelLabel:  'Fechar',
    });
  },

  _renderInscricoes(turmaId) {
    const turma     = Storage.getById(this.SK, turmaId);
    const inscritos = Storage.getAll(this.SK_INSCR)
      .filter(i => i.turmaId === turmaId && i.status === 'ativo')
      .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome));

    const vagas     = turma?.vagas || 0;
    const disponiveis = Math.max(0, vagas - inscritos.length);

    // Alunos disponíveis para adicionar (ativos, ainda não inscritos)
    const inscritosIds = new Set(inscritos.map(i => i.alunoId));
    const alunosDisponiveis = Storage.getAll('alunos')
      .filter(a => a.status === 'ativo' && !inscritosIds.has(a.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const alunoOpts = `<option value="">— Selecionar aluno —</option>` +
      alunosDisponiveis.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}" data-nivel="${UI.escape(a.nivel || '')}">${UI.escape(a.nome)}</option>`
      ).join('');

    const listaHtml = inscritos.length
      ? `<div class="inscricao-list">
           ${inscritos.map(i => `
             <div class="inscricao-item">
               <div style="flex:1;min-width:0;">
                 <div class="inscricao-nome">${UI.escape(i.alunoNome)}</div>
                 <div class="inscricao-sub">Inscrito em ${this._fmtDataCurta(i.dataInscricao?.slice(0,10))}</div>
               </div>
               <button class="btn btn-ghost btn-sm danger"
                 onclick="TurmasModule._removerInscricao('${i.id}','${turmaId}')" title="Remover da turma">✕</button>
             </div>`).join('')}
         </div>`
      : `<div class="empty-state" style="padding:24px 16px;">
           <div class="empty-icon" style="font-size:28px;">👤</div>
           <div class="empty-title" style="font-size:14px;">Nenhum aluno inscrito</div>
         </div>`;

    return `
      <div class="form-grid">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <span class="badge badge-success">${inscritos.length} inscrito${inscritos.length !== 1 ? 's' : ''}</span>
          <span class="badge ${disponiveis > 0 ? 'badge-blue' : 'badge-danger'}">${disponiveis} vaga${disponiveis !== 1 ? 's' : ''} disponível${disponiveis !== 1 ? 'is' : ''}</span>
        </div>

        <div>
          <label class="form-label" style="margin-bottom:6px;">Adicionar aluno</label>
          <div style="display:flex;gap:8px;">
            <select id="inscr-aluno-sel" class="form-select" style="flex:1;">${alunoOpts}</select>
            <button class="btn btn-primary" onclick="TurmasModule._adicionarInscricao('${turmaId}')">Adicionar</button>
          </div>
        </div>

        <div>
          <div class="dash-panel-header" style="border-radius:var(--radius-sm) var(--radius-sm) 0 0;margin-bottom:0;">
            <span class="dash-panel-title">Alunos inscritos</span>
          </div>
          <div style="border:1px solid var(--card-border);border-top:none;border-radius:0 0 var(--radius-sm) var(--radius-sm);overflow:hidden;">
            ${listaHtml}
          </div>
        </div>
      </div>`;
  },

  _adicionarInscricao(turmaId) {
    const sel   = document.getElementById('inscr-aluno-sel');
    const opt   = sel && sel.selectedOptions[0];
    if (!sel || !sel.value) { UI.toast('Selecione um aluno.', 'warning'); return; }

    const turma = Storage.getById(this.SK, turmaId);
    const vagas = turma?.vagas || 0;
    const atual = Storage.getAll(this.SK_INSCR).filter(i => i.turmaId === turmaId && i.status === 'ativo').length;
    if (vagas > 0 && atual >= vagas) {
      UI.toast('Turma sem vagas disponíveis.', 'warning');
      return;
    }

    Storage.create(this.SK_INSCR, {
      turmaId,
      turmaNome:    turma?.nome || '',
      alunoId:      sel.value,
      alunoNome:    opt.dataset.nome || '',
      alunoNivel:   opt.dataset.nivel || '',
      dataInscricao: new Date().toISOString(),
      status:       'ativo',
    });

    UI.toast(`${opt.dataset.nome} adicionado à turma!`, 'success');
    // Atualiza o conteúdo do modal sem fechá-lo
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.innerHTML = this._renderInscricoes(turmaId);
  },

  async _removerInscricao(inscricaoId, turmaId) {
    const inscr = Storage.getById(this.SK_INSCR, inscricaoId);
    if (!inscr) return;
    const ok = await UI.confirm(`Remover ${inscr.alunoNome} da turma?`, 'Remover Aluno');
    if (!ok) return;
    Storage.update(this.SK_INSCR, inscricaoId, { status: 'inativo' });
    UI.toast(`${inscr.alunoNome} removido da turma.`, 'success');
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.innerHTML = this._renderInscricoes(turmaId);
  },

  /** Retorna alunos ativos inscritos numa turma */
  getAlunosInscritos(turmaId) {
    return Storage.getAll(this.SK_INSCR).filter(i => i.turmaId === turmaId && i.status === 'ativo');
  },

  /* ================================================================== */
  /*  Helpers                                                            */
  /* ================================================================== */

  _isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  _fmtDataCurta(iso) {
    if (!iso) return '—';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  },

  _fmtDataLonga(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return new Date(+y, +m - 1, +d)
      .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  },

  _fmtTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },
};

/* ======================================================================
   Compat shim — presenca.js e stubs.js referem AulaModule
   ====================================================================== */
const AulaModule = {
  render:   () => TurmasModule.render(),
  getStats: () => TurmasModule.getAulaStats(),
};
