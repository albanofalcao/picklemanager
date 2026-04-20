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
    tab:            'turmas', // 'turmas' | 'aulas' | 'calendario' | 'frequencia'
    search:         '',
    filterStatus:   '',
    calAno:         null,
    calMes:         null,
    calView:        'mes',
    calDia:         new Date().getDate(),
    turmaSel:       '',
    aulaSearch:     '',
    aulaFilterTurma:'',
    aulaFilterData: '',
    aulaFilterSt:   '',
    aulaFilterArena:'',
    calFilterArena: '',
    calFilterTurma: '',
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

  /* ------------------------------------------------------------------ */
  /*  Helpers — diasSemana (novo formato: [{dia,inicio,fim}])             */
  /* ------------------------------------------------------------------ */

  /**
   * Normaliza diasSemana para o novo formato de objetos.
   * Compatibilidade com formato antigo (array de strings).
   */
  _normalizeDias(turma) {
    const dias = turma?.diasSemana || [];
    if (!dias.length) return [];
    if (typeof dias[0] === 'object' && dias[0] !== null) return dias;
    // Formato antigo: array de strings — migra com horarioInicio/horarioFim globais
    return dias.map(d => ({
      dia:    d,
      inicio: turma.horarioInicio || '',
      fim:    turma.horarioFim    || '',
    }));
  },

  /**
   * Formata a exibição dos horários.
   * Se todos os dias têm o mesmo horário, mostra uma vez.
   * Se diferentes, mostra "Seg: 08:00–09:00 · Qua: 09:00–10:00".
   */
  _formatHorarios(diasNorm) {
    if (!diasNorm.length) return '—';
    const temHora = diasNorm.some(d => d.inicio);
    if (!temHora) return '—';
    const unicas = [...new Set(diasNorm.map(d => `${d.inicio}–${d.fim}`))];
    if (unicas.length === 1) {
      const { inicio, fim } = diasNorm[0];
      return `${inicio}${fim ? ' – ' + fim : ''}`;
    }
    return diasNorm
      .filter(d => d.inicio)
      .map(d => `${this.DIAS[d.dia]}: ${d.inicio}${d.fim ? '–' + d.fim : ''}`)
      .join(' · ');
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

    const svgPlus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    const btnHeader =
      this._state.tab === 'turmas'
        ? `<button class="btn btn-primary" onclick="TurmasModule.openModalTurma()">${svgPlus} Nova Grade</button>`
        : (this._state.tab === 'calendario' || this._state.tab === 'aulas')
        ? `<button class="btn btn-primary" onclick="TurmasModule.openModalAula()">${svgPlus} Nova Aula</button>`
        : '';

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Grade</h2>
          <p>Gestão de grades, calendário de aulas e frequência de alunos</p>
        </div>
        ${btnHeader}
      </div>

      <div class="tabs-bar">
        ${this._tabBtn('turmas',     '📋 Grade')}
        ${this._tabBtn('aulas',      '🏸 Aulas')}
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
      case 'aulas':      return this._renderAulas();
      case 'calendario': return this._renderCalendario();
      case 'frequencia': return this._renderFrequencia();
      default:           return this._renderTurmas();
    }
  },

  /* ================================================================== */
  /*  ABA 1 — Turmas                                                     */
  /* ================================================================== */

  _renderTurmas() {
    const session     = Auth.getSession();
    const isProfessor = session?.perfil === 'professor';
    const isAluno     = session?.perfil === 'aluno';

    // Aluno tem view própria com todas as grades disponíveis
    if (isAluno) return this._renderTurmasAluno(session);

    // Pré-filtra por professor vinculado
    let base = Storage.getAll(this.SK);
    if (isProfessor) {
      base = base.filter(t =>
        session.professorId ? t.professorId === session.professorId : t.professorNome === session.nome
      );
    }

    const all = base
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
          <input type="text" class="search-input" placeholder="Buscar grade ou professor…"
            value="${UI.escape(this._state.search)}" data-search="search"
            oninput="TurmasModule._onSearchInput('search', this)" />
        </div>
        <select class="filter-select"
          onchange="TurmasModule._state.filterStatus=this.value;TurmasModule._reRenderContent()">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS_TURMA).map(([k, v]) =>
            `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <span class="results-count">${all.length} grade${all.length !== 1 ? 's' : ''}</span>
      </div>

      ${all.length
        ? `<div class="table-card">
             <table class="data-table">
               <thead><tr>
                 <th>Grade</th>
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
    const diasNorm = this._normalizeDias(t);
    const dias     = diasNorm.map(d => this.DIAS[d.dia] || d.dia).join(', ') || '—';
    const hora     = this._formatHorarios(diasNorm);
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
          <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;">
            ${t.esporte   ? `<span class="badge badge-blue" style="font-size:0.65rem;">${UI.escape(t.esporte)}</span>` : ''}
            ${t.tipoplano ? `<span class="badge badge-success" style="font-size:0.65rem;">${UI.escape(t.tipoplano)}</span>` : ''}
          </div>
        </td>
        <td>
          <div style="font-size:13px;">${UI.escape(t.professorNome || '—')}</div>
          <div class="aluno-sub">${UI.escape(t.arenaNome || '')}${t.quadraNome ? ' → ' + UI.escape(t.quadraNome) : ''}</div>
        </td>
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
        <div class="empty-title">Nenhuma grade cadastrada</div>
        <div class="empty-desc">Crie a primeira grade para organizar as aulas da academia.</div>
        <button class="btn btn-primary mt-16" onclick="TurmasModule.openModalTurma()">+ Nova Grade</button>
      </div>`;
  },

  _reRenderContent() {
    const el = document.getElementById('turmas-content');
    if (el) el.innerHTML = this._renderTab();
  },

  /** Atualiza campo de busca sem perder foco (re-render destrói o DOM) */
  _onSearchInput(stateKey, input) {
    const sel = input.selectionStart;
    this._state[stateKey] = input.value;
    this._reRenderContent();
    const novo = document.querySelector(`[data-search="${stateKey}"]`);
    if (novo) { novo.focus(); try { novo.setSelectionRange(sel, sel); } catch {} }
  },

  /* ================================================================== */
  /*  VIEW DO ALUNO — Escolher grades                                    */
  /* ================================================================== */

  _renderTurmasAluno(session) {
    const grades = Storage.getAll(this.SK)
      .filter(t => t.status === 'ativa')
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const inscricoes = Storage.getAll(this.SK_INSCR)
      .filter(i => session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome);
    const inscritosMap = {};
    inscricoes.forEach(i => { inscritosMap[i.turmaId] = i.id; });

    if (!grades.length) {
      return `<div class="empty-state">
        <div class="empty-icon">🏸</div>
        <div class="empty-title">Nenhuma grade disponível</div>
        <div class="empty-desc">Não há grades ativas no momento.</div>
      </div>`;
    }

    const cards = grades.map(t => {
      const inscrito    = !!inscritosMap[t.id];
      const inscricaoId = inscritosMap[t.id] || '';
      const nivel       = this.NIVEL[t.nivel] || t.nivel || '—';
      const diasNorm    = this._normalizeDias(t);
      const dias        = diasNorm.map(d => this.DIAS[d.dia] || d.dia).join(', ') || '—';
      const hora        = this._formatHorarios(diasNorm);
      const inscritos   = Storage.getAll(this.SK_INSCR).filter(i => i.turmaId === t.id && i.status === 'ativo').length;
      const vagas       = t.vagas || 0;
      const vagasLivre  = vagas > 0 ? Math.max(0, vagas - inscritos) : null;
      const semVaga     = vagasLivre !== null && vagasLivre === 0 && !inscrito;

      return `
        <div class="table-card" style="padding:16px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <strong style="font-size:1rem;">${UI.escape(t.nome)}</strong>
              ${inscrito ? `<span class="badge badge-success" style="font-size:0.7rem;">✓ Inscrito</span>` : ''}
            </div>
            <div class="info-grid" style="grid-template-columns:repeat(2,1fr);gap:4px 16px;font-size:0.82rem;">
              <div><span class="text-muted">Professor:</span> ${UI.escape(t.professorNome || '—')}</div>
              <div><span class="text-muted">Arena:</span> ${UI.escape(t.arenaNome || '—')}</div>
              <div><span class="text-muted">Dias:</span> ${UI.escape(dias)}</div>
              <div><span class="text-muted">Horário:</span> ${UI.escape(hora)}</div>
              <div><span class="text-muted">Nível:</span> ${UI.escape(nivel)}</div>
              <div><span class="text-muted">Vagas:</span> ${vagasLivre !== null ? `${vagasLivre} disponível${vagasLivre !== 1 ? 'is' : ''}` : '—'}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;">
            ${inscrito
              ? `<button class="btn btn-secondary btn-sm" onclick="TurmasModule.cancelarInscricaoAluno('${inscricaoId}')">Cancelar inscrição</button>`
              : semVaga
              ? `<button class="btn btn-secondary btn-sm" disabled title="Sem vagas">Sem vagas</button>`
              : `<button class="btn btn-primary btn-sm" onclick="TurmasModule.inscreverAluno('${t.id}')">Inscrever-se</button>`
            }
          </div>
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom:12px;">
        <span class="badge badge-success">${Object.keys(inscritosMap).length} grade${Object.keys(inscritosMap).length !== 1 ? 's' : ''} inscrito</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">${cards}</div>`;
  },

  inscreverAluno(turmaId) {
    const session = Auth.getSession();
    if (!session) return;
    const turma = Storage.getById(this.SK, turmaId);
    if (!turma) return;

    // Verifica se já está inscrito
    const jaInscrito = Storage.getAll(this.SK_INSCR)
      .find(i => i.turmaId === turmaId &&
        (session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome));
    if (jaInscrito) return;

    Storage.create(this.SK_INSCR, {
      turmaId,
      turmaNome:      turma.nome,
      alunoId:        session.alunoId || session.id,
      alunoNome:      session.nome,
      status:         'ativo',
      dataInscricao:  new Date().toISOString(),
    });

    UI.toast(`Inscrição na grade "${turma.nome}" realizada!`, 'success');
    this._reRenderContent();
  },

  async cancelarInscricaoAluno(inscricaoId) {
    const inscricao = Storage.getById(this.SK_INSCR, inscricaoId);
    if (!inscricao) return;
    const ok = await UI.confirm(`Cancelar inscrição na grade "${inscricao.turmaNome}"?`, 'Cancelar inscrição');
    if (!ok) return;
    Storage.delete(this.SK_INSCR, inscricaoId);
    UI.toast('Inscrição cancelada.', 'success');
    this._reRenderContent();
  },

  /* ================================================================== */
  /*  ABA 2 — Aulas                                                      */
  /* ================================================================== */

  _renderAulas() {
    const session     = Auth.getSession();
    const isProfessor = session?.perfil === 'professor';
    const isAluno     = session?.perfil === 'aluno';

    // Auto-filtro para professor ou aluno
    if ((isProfessor || isAluno) && !this._state.aulaFilterTurma) {
      this._state.aulaFilterTurma = '__meu__';
    }

    const hoje = new Date().toISOString().slice(0, 10);

    // Coleta aulas
    let aulas = Storage.getAll(this.SK_AULA);

    if (this._state.aulaFilterTurma === '__meu__') {
      let minhasTurmas;
      if (isProfessor) {
        minhasTurmas = new Set(
          Storage.getAll(this.SK).filter(t =>
            session.professorId ? t.professorId === session.professorId : t.professorNome === session.nome
          ).map(t => t.id)
        );
      } else if (isAluno) {
        minhasTurmas = new Set(
          Storage.getAll(this.SK_INSCR)
            .filter(i => session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome)
            .map(i => i.turmaId)
        );
      } else {
        minhasTurmas = new Set(Storage.getAll(this.SK).map(t => t.id));
      }
      aulas = aulas.filter(a => minhasTurmas.has(a.turmaId));
    } else if (this._state.aulaFilterTurma) {
      aulas = aulas.filter(a => a.turmaId === this._state.aulaFilterTurma);
    }

    if (this._state.aulaFilterData) {
      aulas = aulas.filter(a => a.data === this._state.aulaFilterData);
    }
    if (this._state.aulaFilterSt) {
      aulas = aulas.filter(a => a.status === this._state.aulaFilterSt);
    }
    if (this._state.aulaFilterArena) {
      aulas = aulas.filter(a => a.arenaId === this._state.aulaFilterArena);
    }
    if (this._state.aulaSearch) {
      const q = this._state.aulaSearch.toLowerCase();
      aulas = aulas.filter(a =>
        (a.titulo        || '').toLowerCase().includes(q) ||
        (a.turmaNome     || '').toLowerCase().includes(q) ||
        (a.professorNome || '').toLowerCase().includes(q) ||
        (a.arenaNome     || '').toLowerCase().includes(q)
      );
    }

    aulas = aulas.sort((a, b) => {
      const d = (b.data || '').localeCompare(a.data || '');
      return d !== 0 ? d : (a.horarioInicio || '').localeCompare(b.horarioInicio || '');
    });

    // Opções de turma para o filtro
    const turmas = Storage.getAll(this.SK).sort((a, b) => a.nome.localeCompare(b.nome));
    const minhaLabel = isProfessor ? 'Minhas grades' : isAluno ? 'Minhas grades' : '';
    let turmaOpts = `<option value="">Todas as grades</option>`;
    if (isProfessor || isAluno) {
      turmaOpts = `<option value="__meu__" ${this._state.aulaFilterTurma === '__meu__' ? 'selected' : ''}>${minhaLabel}</option>
        <option value="">Todas as grades</option>`;
    }
    turmaOpts += turmas.map(t =>
      `<option value="${t.id}" ${this._state.aulaFilterTurma === t.id ? 'selected' : ''}>${UI.escape(t.nome)}</option>`
    ).join('');

    const statusOpts = `<option value="">Todos os status</option>` +
      Object.entries(this.STATUS_AULA).map(([k, v]) =>
        `<option value="${k}" ${this._state.aulaFilterSt === k ? 'selected' : ''}>${v.label}</option>`
      ).join('');

    const arenas = Storage.getAll('arenas').sort((a, b) => a.nome.localeCompare(b.nome));
    const arenaOpts = `<option value="">Todas as arenas</option>` +
      arenas.map(a =>
        `<option value="${a.id}" ${this._state.aulaFilterArena === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
      ).join('');

    const rows = aulas.map(a => {
      const st      = this.STATUS_AULA[a.status] || { label: a.status, badge: 'badge-gray' };
      const [y,m,d] = (a.data || '').split('-');
      const dataFmt = a.data ? `${d}/${m}/${y}` : '—';
      const hora    = [a.horarioInicio, a.horarioFim].filter(Boolean).join(' – ') || '—';
      const isHoje  = a.data === hoje;
      const pStats  = PresencaModule.getStats(a.id);
      const presTag = pStats.total
        ? `<span class="badge badge-success" style="font-size:0.7rem;">${pStats.presentes}/${pStats.total}</span>`
        : '<span class="text-muted text-sm">—</span>';

      // Alunos alocados nesta aula específica
      const alocados = Storage.getAll('aulaAlunos').filter(aa => aa.aulaId === a.id && aa.status === 'ativo');
      const vagasAula = a.vagas || 0;
      const vagasLivresAula = vagasAula > 0 ? Math.max(0, vagasAula - alocados.length) : null;
      const vagasBadgeAula = vagasAula > 0
        ? `<span class="turma-vagas-badge ${vagasLivresAula === 0 ? 'turma-vagas-cheia' : ''}">${alocados.length}/${vagasAula}</span>`
        : `<span class="turma-vagas-badge">${alocados.length}</span>`;
      const alunosHtml = alocados.length
        ? alocados.slice(0, 4).map(aa =>
            `<span class="turma-aluno-chip" title="${UI.escape(aa.alunoNome)}">${UI.escape(aa.alunoNome.split(' ')[0])}</span>`
          ).join('') + (alocados.length > 4 ? `<span class="turma-aluno-chip">+${alocados.length - 4}</span>` : '')
        : '<span class="text-muted text-sm">Nenhum alocado</span>';

      // Botões de ação rápida
      let acoes = '';
      // Botão alocar aluno (só para admin/recepcionista)
      if (!isProfessor && !isAluno) {
        acoes += `<button class="btn btn-ghost btn-sm" title="Alocar alunos"
          onclick="TurmasModule.openModalAlocarAluno('${a.id}')">👥 ${vagasBadgeAula} ＋</button>`;
      }
      if (a.status === 'agendada' || a.status === 'em_andamento') {
        acoes += `<button class="btn btn-ghost btn-sm" title="Lançar presença"
          onclick="TurmasModule.abrirPresencaRapida('${a.id}')">📋</button>`;
      }
      if (a.status === 'agendada') {
        acoes += `<button class="btn btn-ghost btn-sm" title="Iniciar aula"
          onclick="TurmasModule.professorCheckin('${a.id}')">▶</button>`;
      }
      if (a.status === 'em_andamento') {
        acoes += `<button class="btn btn-ghost btn-sm" title="Concluir aula"
          onclick="TurmasModule.professorCheckout('${a.id}')">■</button>`;
      }
      // Botão reposição: aluno vê nas suas aulas agendadas; admin/recepção vê em todas
      if (isAluno && a.status === 'agendada') {
        const estaInscrito = a.turmaId && Storage.getAll(this.SK_INSCR).find(i =>
          i.turmaId === a.turmaId &&
          (session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome)
        );
        if (estaInscrito) {
          acoes += `<button class="btn btn-ghost btn-sm" title="Solicitar reposição"
            onclick="TurmasModule.solicitarReposicao('${a.id}')">🔄</button>`;
        }
      } else if (!isAluno && !isProfessor && a.status === 'agendada') {
        acoes += `<button class="btn btn-ghost btn-sm" title="Agendar reposição"
          onclick="TurmasModule.solicitarReposicaoAdmin('${a.id}')">🔄</button>`;
      }
      acoes += `<button class="btn btn-ghost btn-sm" title="Detalhe"
        onclick="TurmasModule.openModalAulaDetalhe('${a.id}')">👁</button>`;
      if (!isAluno) {
        acoes += `<button class="btn btn-ghost btn-sm" title="Editar"
          onclick="TurmasModule.openModalAula('${a.id}')">✏️</button>`;
      }

      return `
        <tr ${isHoje ? 'style="background:var(--today-row,rgba(59,130,246,0.05));"' : ''}>
          <td>
            <div class="aluno-nome">${UI.escape(a.titulo)}</div>
            <div class="aluno-sub">${UI.escape(a.nivel ? (this.NIVEL[a.nivel] || a.nivel) : '')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;">
              ${a.esporte   ? `<span class="badge badge-blue" style="font-size:0.65rem;">${UI.escape(a.esporte)}</span>` : ''}
              ${a.tipoplano ? `<span class="badge badge-success" style="font-size:0.65rem;">${UI.escape(a.tipoplano)}</span>` : ''}
            </div>
          </td>
          <td>
            <div style="font-size:13px;font-weight:600;">${UI.escape(a.turmaNome || '—')}</div>
            <div class="aluno-sub">${UI.escape(a.quadraNome ? `${a.arenaNome || ''} — ${a.quadraNome}` : (a.arenaNome || '—'))}</div>
          </td>
          <td>
            <div style="font-weight:600;">${dataFmt}${isHoje ? ' <span class="badge badge-blue" style="font-size:0.65rem;">Hoje</span>' : ''}</div>
            <div class="aluno-sub">${UI.escape(hora)}</div>
          </td>
          <td><div class="turma-alunos-chips">${alunosHtml}</div></td>
          <td>${UI.escape(a.professorNome || '—')}</td>
          <td><span class="badge ${st.badge}">${st.label}</span></td>
          <td>${presTag}</td>
          <td class="aluno-row-actions">${acoes}</td>
        </tr>`;
    }).join('');

    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar aula, grade, professor…"
            value="${UI.escape(this._state.aulaSearch)}" data-search="aulaSearch"
            oninput="TurmasModule._onSearchInput('aulaSearch', this)" />
        </div>
        <select class="filter-select" style="min-width:180px;"
          onchange="TurmasModule._state.aulaFilterTurma=this.value;TurmasModule._reRenderContent()">
          ${turmaOpts}
        </select>
        <input type="date" class="filter-select"
          value="${this._state.aulaFilterData}"
          onchange="TurmasModule._state.aulaFilterData=this.value;TurmasModule._reRenderContent()" />
        <select class="filter-select"
          onchange="TurmasModule._state.aulaFilterArena=this.value;TurmasModule._reRenderContent()">
          ${arenaOpts}
        </select>
        <select class="filter-select"
          onchange="TurmasModule._state.aulaFilterSt=this.value;TurmasModule._reRenderContent()">
          ${statusOpts}
        </select>
        <span class="results-count">${aulas.length} aula${aulas.length !== 1 ? 's' : ''}</span>
      </div>
      ${aulas.length ? `
        <div class="table-card">
          <table class="data-table">
            <thead><tr>
              <th>Aula</th><th>Grade</th><th>Período</th>
              <th>Alunos</th><th>Professor</th><th>Status</th><th>Presença</th><th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : `
        <div class="empty-state">
          <div class="empty-icon">🏸</div>
          <div class="empty-title">Nenhuma aula encontrada</div>
          <div class="empty-desc">Ajuste os filtros ou gere aulas a partir da aba Grade.</div>
        </div>`}`;
  },

  /* Lança presença rápida: todos presentes por padrão, desmarca faltosos */
  abrirPresencaRapida(aulaId) {
    const aula = Storage.getById(this.SK_AULA, aulaId);
    if (!aula) return;

    const inscritos = aula.turmaId
      ? this.getAlunosInscritos(aula.turmaId)
      : [];

    if (!inscritos.length) {
      UI.toast('Nenhum aluno inscrito nesta grade. Adicione alunos antes de lançar presença.', 'warning');
      return;
    }

    const presencas   = Storage.getAll('presencas');
    const [y, m, d]   = (aula.data || '').split('-');
    const dataFmt     = aula.data ? `${d}/${m}/${y}` : '—';
    const hora        = [aula.horarioInicio, aula.horarioFim].filter(Boolean).join(' – ') || '';

    // Alunos de reposição nesta aula
    const repostos = Storage.getAll('reposicoes')
      .filter(r => r.aulaReposicaoId === aulaId && r.status === 'agendada');

    // Combina inscritos regulares + alunos de reposição (sem duplicar)
    const inscritosIds = new Set(inscritos.map(i => i.alunoId));
    const todosAlunos = [
      ...inscritos.map(i => ({ alunoId: i.alunoId, alunoNome: i.alunoNome, reposicao: false })),
      ...repostos.filter(r => !inscritosIds.has(r.alunoId))
                 .map(r => ({ alunoId: r.alunoId, alunoNome: r.alunoNome, reposicao: true, repId: r.id })),
    ];

    const rows = todosAlunos.map((insc, idx) => {
      const reg      = presencas.find(p => p.aulaId === aulaId && p.alunoId === insc.alunoId);
      const presente = reg ? reg.presente : true;
      const repBadge = insc.reposicao
        ? `<span class="badge badge-warning" style="font-size:0.65rem;margin-left:6px;" title="Reposição">R</span>`
        : '';
      const initials = insc.alunoNome.trim().split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
      return `
        <div class="presenca-row-card" id="prc-${idx}">
          <div class="presenca-row-aluno">
            <div class="presenca-avatar">${initials}</div>
            <span class="presenca-nome">${UI.escape(insc.alunoNome)}${repBadge}</span>
          </div>
          <div class="presenca-toggle-group">
            <button type="button"
              class="presenca-toggle-btn presenca-presente ${presente ? 'active' : ''}"
              onclick="TurmasModule._togglePresenca(${idx}, true)"
              data-idx="${idx}">✅ Presente</button>
            <button type="button"
              class="presenca-toggle-btn presenca-faltou ${!presente ? 'active' : ''}"
              onclick="TurmasModule._togglePresenca(${idx}, false)"
              data-idx="${idx}">❌ Faltou</button>
          </div>
          <input type="hidden" class="presenca-check"
            data-aluno-id="${insc.alunoId}"
            data-aluno-nome="${UI.escape(insc.alunoNome)}"
            data-reposicao-id="${insc.repId || ''}"
            data-presente="${presente ? '1' : '0'}" />
        </div>`;
    }).join('');

    const total    = todosAlunos.length;
    const content = `
      <div class="info-box" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>
            <strong>${UI.escape(aula.titulo)}</strong>
            <span class="text-muted" style="margin-left:8px;">${dataFmt}${hora ? ' · ' + hora : ''}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn btn-ghost btn-sm" onclick="TurmasModule._marcarTodos(true)">✅ Todos presentes</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="TurmasModule._marcarTodos(false)">❌ Todos faltaram</button>
          </div>
        </div>
      </div>
      <div class="presenca-lista" id="presenca-lista">${rows}</div>
      <div class="presenca-resumo" id="presenca-resumo"></div>`;

    UI.openModal({
      title:        `📋 Presença — ${aula.titulo}`,
      content,
      confirmLabel: 'Salvar Presença',
      cancelLabel:  'Cancelar',
      onConfirm:    () => this._salvarPresencaRapida(aulaId, aula),
    });

    setTimeout(() => this._atualizarResumoPresenca(total), 80);
  },

  _salvarPresencaRapida(aulaId, aula) {
    const checks   = document.querySelectorAll('.presenca-check');
    const presencas = Storage.getAll('presencas');
    let salvos = 0;

    checks.forEach(cb => {
      const alunoId     = cb.dataset.alunoId;
      const alunoNome   = cb.dataset.alunoNome;
      const presente    = cb.dataset.presente === '1';
      const reposicaoId = cb.dataset.reposicaoId;
      const existing    = presencas.find(p => p.aulaId === aulaId && p.alunoId === alunoId);

      if (existing) {
        Storage.update('presencas', existing.id, { presente });
      } else {
        Storage.create('presencas', {
          aulaId,
          alunoId,
          alunoNome,
          turmaId:   aula.turmaId   || '',
          turmaNome: aula.turmaNome || '',
          data:      aula.data      || '',
          presente,
        });
      }
      // Marca reposição como concluída se aluno esteve presente
      if (reposicaoId && presente) {
        Storage.update('reposicoes', reposicaoId, { status: 'concluida' });
      }
      salvos++;
    });

    // Marca a aula como concluída se ainda estiver agendada/em andamento
    if (['agendada', 'em_andamento'].includes(aula.status)) {
      Storage.update(this.SK_AULA, aulaId, { status: 'concluida' });
    }

    // Verificar alunos que esgotaram o saldo mensal
    const presentes = [...checks].filter(cb => cb.dataset.presente === '1').map(cb => ({ alunoId: cb.dataset.alunoId }));
    const semSaldo = presentes.filter(a => {
      const s = SaldoService.getSaldo(a.alunoId);
      return s.total > 0 && s.disponivel === 0;
    });
    if (semSaldo.length) {
      UI.toast(`⚠️ ${semSaldo.length} aluno${semSaldo.length !== 1 ? 's' : ''} esgotou o saldo mensal.`, 'warning');
    }

    UI.closeModal();
    UI.toast(`Presença de ${salvos} aluno${salvos !== 1 ? 's' : ''} salva! Aula marcada como concluída.`, 'success');
    this._reRenderContent();
  },

  _togglePresenca(idx, presente) {
    const card   = document.getElementById(`prc-${idx}`);
    if (!card) return;
    const hidden = card.querySelector('.presenca-check');
    const btnP   = card.querySelector('.presenca-presente');
    const btnF   = card.querySelector('.presenca-faltou');
    if (hidden) hidden.dataset.presente = presente ? '1' : '0';
    if (btnP)   btnP.classList.toggle('active', presente);
    if (btnF)   btnF.classList.toggle('active', !presente);
    const total = document.querySelectorAll('.presenca-check').length;
    this._atualizarResumoPresenca(total);
  },

  _marcarTodos(presente) {
    document.querySelectorAll('.presenca-check').forEach((hidden, idx) => {
      hidden.dataset.presente = presente ? '1' : '0';
      const card = document.getElementById(`prc-${idx}`);
      if (!card) return;
      card.querySelector('.presenca-presente')?.classList.toggle('active', presente);
      card.querySelector('.presenca-faltou')?.classList.toggle('active', !presente);
    });
    const total = document.querySelectorAll('.presenca-check').length;
    this._atualizarResumoPresenca(total);
  },

  _atualizarResumoPresenca(total) {
    const resumo = document.getElementById('presenca-resumo');
    if (!resumo) return;
    const presentes = [...document.querySelectorAll('.presenca-check')].filter(h => h.dataset.presente === '1').length;
    const faltas    = total - presentes;
    resumo.innerHTML = `
      <div class="presenca-resumo-bar">
        <span class="presenca-resumo-item presenca-resumo-p">✅ ${presentes} presente${presentes !== 1 ? 's' : ''}</span>
        <span class="presenca-resumo-item presenca-resumo-f">❌ ${faltas} falta${faltas !== 1 ? 's' : ''}</span>
        <span class="presenca-resumo-item">👥 ${total} total</span>
      </div>`;
  },

  /* ================================================================== */
  /*  REPOSIÇÃO DE AULAS                                                  */
  /* ================================================================== */

  _syncReposicoes() {
    const hoje = new Date().toISOString().slice(0, 10);
    Storage.getAll('reposicoes')
      .filter(r => r.status === 'agendada' && r.dataLimite < hoje)
      .forEach(r => Storage.update('reposicoes', r.id, { status: 'perdida' }));
  },

  _getSaldoReposicao(alunoId, alunoNome, turmaId, ano, mes) {
    const mesStr   = `${ano}-${mes}`;
    const total    = Storage.getAll(this.SK_AULA)
      .filter(a => a.turmaId === turmaId && (a.data || '').startsWith(mesStr) && a.status !== 'cancelada')
      .length;
    const maxRep   = Math.floor(total * 0.5);
    const usadas   = Storage.getAll('reposicoes')
      .filter(r =>
        r.turmaId === turmaId &&
        (alunoId ? r.alunoId === alunoId : r.alunoNome === alunoNome) &&
        (r.aulaOriginalData || '').startsWith(mesStr) &&
        r.status !== 'perdida'
      ).length;
    return Math.max(0, maxRep - usadas);
  },

  _modalReposicao(aulaId, alunoId, alunoNome, onConfirm) {
    this._syncReposicoes();
    const aula = Storage.getById(this.SK_AULA, aulaId);
    if (!aula || !aula.turmaId) return;

    const [ano, mes, dia] = (aula.data || '').split('-');
    const dataFmt  = aula.data ? `${dia}/${mes}/${ano}` : '—';
    const saldo    = this._getSaldoReposicao(alunoId, alunoNome, aula.turmaId, ano, mes);

    const hoje     = new Date().toISOString().slice(0, 10);
    const limite   = new Date(aula.data + 'T00:00:00');
    limite.setDate(limite.getDate() + 30);
    const limStr   = limite.toISOString().slice(0, 10);

    const proximas = Storage.getAll(this.SK_AULA)
      .filter(a =>
        a.turmaId === aula.turmaId &&
        a.id !== aulaId &&
        a.data > hoje &&
        a.data <= limStr &&
        a.status === 'agendada'
      )
      .sort((a, b) => a.data.localeCompare(b.data));

    const aulaOpts = proximas.map(a => {
      const [ay, am, ad] = (a.data || '').split('-');
      const df  = `${ad}/${am}/${ay}`;
      const hr  = [a.horarioInicio, a.horarioFim].filter(Boolean).join(' – ');
      const ins = Storage.getAll(this.SK_INSCR).filter(i => i.turmaId === a.turmaId && i.status === 'ativo').length;
      const vg  = a.vagas > 0 ? Math.max(0, a.vagas - ins) : null;
      const vgLabel = vg !== null ? `${vg} vaga${vg !== 1 ? 's' : ''}` : 'sem limite';
      return `<option value="${a.id}">${df} · ${hr} · ${vgLabel}</option>`;
    }).join('');

    const semVaga  = !proximas.length;
    const semSaldo = saldo <= 0;

    const content = `
      <div class="info-box" style="margin-bottom:12px;">
        <div><strong>Aluno:</strong> ${UI.escape(alunoNome)}</div>
        <div><strong>Aula:</strong> ${UI.escape(aula.titulo)} — ${dataFmt}</div>
        <div><strong>Grade:</strong> ${UI.escape(aula.turmaNome || '—')}</div>
        <div style="margin-top:8px;">
          <span class="badge ${saldo > 0 ? 'badge-success' : 'badge-danger'}">
            Saldo de reposições neste mês: ${saldo}
          </span>
        </div>
      </div>
      ${semSaldo ? `<div class="login-error" style="display:flex;margin-bottom:12px;">Limite de 50% de reposições atingido para este mês.</div>` : ''}
      ${!semVaga ? `
        <div class="form-group">
          <label class="form-label">Escolha a aula de reposição <span class="required-star">*</span></label>
          <select id="rep-aula-sel" class="form-select" ${semSaldo ? 'disabled' : ''}>
            <option value="">— Selecionar data —</option>
            ${aulaOpts}
          </select>
          <div class="form-hint" style="margin-top:4px;">Próximas aulas da mesma grade nos próximos 30 dias.</div>
        </div>` : `
        <div class="empty-state" style="padding:16px 0;">
          <div class="empty-icon">📅</div>
          <div class="empty-title" style="font-size:14px;">Nenhuma aula disponível</div>
          <div class="empty-desc">Não há aulas agendadas nesta grade nos próximos 30 dias.</div>
        </div>`}`;

    UI.openModal({
      title:        '🔄 Solicitar Reposição',
      content,
      confirmLabel: 'Confirmar Reposição',
      cancelLabel:  (!semVaga && !semSaldo) ? 'Cancelar' : 'Fechar',
      hideFooter:   semVaga || semSaldo,
      onConfirm:    () => onConfirm(aula),
    });
  },

  solicitarReposicao(aulaId) {
    const session   = Auth.getSession();
    const alunoId   = session?.alunoId || session?.id;
    const alunoNome = session?.nome;
    this._modalReposicao(aulaId, alunoId, alunoNome, (aula) => {
      this._confirmarReposicao(aulaId, alunoId, alunoNome, aula);
    });
  },

  solicitarReposicaoAdmin(aulaId) {
    const aula = Storage.getById(this.SK_AULA, aulaId);
    if (!aula || !aula.turmaId) return;

    const inscritos = Storage.getAll(this.SK_INSCR)
      .filter(i => i.turmaId === aula.turmaId && i.status === 'ativo')
      .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome));

    if (!inscritos.length) {
      UI.toast('Nenhum aluno inscrito nesta grade.', 'warning');
      return;
    }

    const opts = `<option value="">— Selecionar aluno —</option>` +
      inscritos.map(i => `<option value="${i.alunoId}" data-nome="${UI.escape(i.alunoNome)}">${UI.escape(i.alunoNome)}</option>`).join('');

    UI.openModal({
      title:        '🔄 Reposição — Selecionar Aluno',
      content:      `<div class="form-group">
        <label class="form-label">Aluno <span class="required-star">*</span></label>
        <select id="rep-aluno-sel" class="form-select">${opts}</select>
      </div>`,
      confirmLabel: 'Continuar',
      onConfirm: () => {
        const sel  = document.getElementById('rep-aluno-sel');
        const opt  = sel?.selectedOptions[0];
        if (!sel?.value) { UI.toast('Selecione um aluno.', 'warning'); return; }
        const alunoId   = sel.value;
        const alunoNome = opt?.dataset?.nome || opt?.textContent || '';
        UI.closeModal();
        setTimeout(() => {
          this._modalReposicao(aulaId, alunoId, alunoNome, (aula) => {
            this._confirmarReposicao(aulaId, alunoId, alunoNome, aula);
          });
        }, 350);
      },
    });
  },

  _confirmarReposicao(aulaOriginalId, alunoId, alunoNome, aulaOriginal) {
    const sel = document.getElementById('rep-aula-sel');
    if (!sel?.value) { UI.toast('Selecione uma aula de reposição.', 'warning'); return; }

    const aulaRep = Storage.getById(this.SK_AULA, sel.value);
    if (!aulaRep) return;

    const limite = new Date((aulaOriginal.data || '') + 'T00:00:00');
    limite.setDate(limite.getDate() + 30);

    Storage.create('reposicoes', {
      alunoId,
      alunoNome,
      turmaId:          aulaOriginal.turmaId,
      turmaNome:        aulaOriginal.turmaNome || '',
      aulaOriginalId,
      aulaOriginalData: aulaOriginal.data,
      aulaReposicaoId:  aulaRep.id,
      aulaReposicaoData:aulaRep.data,
      dataLimite:       limite.toISOString().slice(0, 10),
      status:           'agendada',
    });

    UI.toast(`Reposição agendada para ${aulaRep.data.split('-').reverse().join('/')}!`, 'success');
    UI.closeModal();
    this._reRenderContent();
  },

  /* ================================================================== */
  /*  ABA 3 — Calendário                                                 */
  /* ================================================================== */

  _renderCalendario() {
    const { calAno, calMes, calView } = this._state;
    const hoje = new Date();

    // Calcula label do período conforme a view
    let titulo = '';
    if (calView === 'dia') {
      const d = new Date(calAno, calMes, this._state.calDia);
      titulo = d.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
    } else if (calView === 'semana') {
      const { inicio, fim } = this._getSemanaAtual();
      const di = inicio.toLocaleDateString('pt-BR', { day:'numeric', month:'short' });
      const df = fim.toLocaleDateString('pt-BR',   { day:'numeric', month:'short', year:'numeric' });
      titulo = `${di} – ${df}`;
    } else if (calView === 'mes') {
      const mn = new Date(calAno, calMes, 1).toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
      titulo = mn.charAt(0).toUpperCase() + mn.slice(1);
    } else {
      titulo = 'Próximas Aulas';
    }

    const arenas = Storage.getAll('arenas').sort((a,b) => a.nome.localeCompare(b.nome));
    const turmas = Storage.getAll(this.SK).sort((a,b) => a.nome.localeCompare(b.nome));

    const arenaOpts = `<option value="">Todas as arenas</option>` +
      arenas.map(a => `<option value="${a.id}" ${this._state.calFilterArena===a.id?'selected':''}>${UI.escape(a.nome)}</option>`).join('');
    const turmaOpts = `<option value="">Todas as grades</option>` +
      turmas.map(t => `<option value="${t.id}" ${this._state.calFilterTurma===t.id?'selected':''}>${UI.escape(t.nome)}</option>`).join('');

    // Legenda de cores por grade
    const legendaHtml = turmas.slice(0,8).map(t => {
      const cor = this._getGradeCor(t.id);
      return `<span class="cal-leg-item"><span class="cal-leg-dot" style="background:${cor}"></span>${UI.escape(t.nome)}</span>`;
    }).join('');

    return `
      <div class="cal-toolbar">
        <div class="cal-toolbar-nav">
          <button class="btn btn-ghost btn-sm cal-nav" onclick="TurmasModule._navCal(-1)">&#8249;</button>
          <span class="cal-title">${titulo}</span>
          <button class="btn btn-ghost btn-sm cal-nav" onclick="TurmasModule._navCal(1)">&#8250;</button>
          <button class="btn btn-secondary btn-sm cal-hoje-btn" onclick="TurmasModule._navCalHoje()">Hoje</button>
        </div>
        <div class="cal-view-switcher">
          ${['dia','semana','mes','agenda'].map(v =>
            `<button class="cal-view-btn${calView===v?' active':''}" onclick="TurmasModule._setCalView('${v}')">
              ${{dia:'Dia',semana:'Semana',mes:'Mês',agenda:'Agenda'}[v]}
            </button>`
          ).join('')}
        </div>
        <div class="cal-toolbar-filters">
          <select class="filter-select filter-select-sm"
            onchange="TurmasModule._state.calFilterArena=this.value;TurmasModule._reRenderContent()">${arenaOpts}</select>
          <select class="filter-select filter-select-sm"
            onchange="TurmasModule._state.calFilterTurma=this.value;TurmasModule._reRenderContent()">${turmaOpts}</select>
        </div>
      </div>
      <div class="cal-legenda">${legendaHtml}</div>
      <div class="cal-body">
        ${calView === 'dia'     ? this._renderViewDia()     : ''}
        ${calView === 'semana'  ? this._renderViewSemana()  : ''}
        ${calView === 'mes'     ? this._renderViewMes()     : ''}
        ${calView === 'agenda'  ? this._renderViewAgenda()  : ''}
      </div>`;
  },

  _setCalView(view) {
    this._state.calView = view;
    this._reRenderContent();
  },

  _navCal(delta) {
    const view = this._state.calView;
    if (view === 'dia') {
      const d = new Date(this._state.calAno, this._state.calMes, this._state.calDia);
      d.setDate(d.getDate() + delta);
      this._state.calAno = d.getFullYear();
      this._state.calMes = d.getMonth();
      this._state.calDia = d.getDate();
    } else if (view === 'semana') {
      const d = new Date(this._state.calAno, this._state.calMes, this._state.calDia);
      d.setDate(d.getDate() + delta * 7);
      this._state.calAno = d.getFullYear();
      this._state.calMes = d.getMonth();
      this._state.calDia = d.getDate();
    } else if (view === 'mes') {
      let { calAno, calMes } = this._state;
      calMes += delta;
      if (calMes < 0)  { calMes = 11; calAno--; }
      if (calMes > 11) { calMes = 0;  calAno++; }
      this._state.calAno = calAno;
      this._state.calMes = calMes;
    } else {
      // agenda: avança 14 dias
      const d = new Date(this._state.calAno, this._state.calMes, this._state.calDia);
      d.setDate(d.getDate() + delta * 14);
      this._state.calAno = d.getFullYear();
      this._state.calMes = d.getMonth();
      this._state.calDia = d.getDate();
    }
    this._reRenderContent();
  },

  _navCalHoje() {
    const now = new Date();
    this._state.calAno = now.getFullYear();
    this._state.calMes = now.getMonth();
    this._state.calDia = now.getDate();
    this._reRenderContent();
  },

  _getSemanaAtual() {
    const ref = new Date(this._state.calAno, this._state.calMes, this._state.calDia);
    const diaSem = ref.getDay(); // 0=dom
    const inicio = new Date(ref); inicio.setDate(ref.getDate() - diaSem);
    const fim    = new Date(inicio); fim.setDate(inicio.getDate() + 6);
    return { inicio, fim };
  },

  _getAulasFiltradas(dataIni, dataFim) {
    const ini = dataIni.toISOString().slice(0,10);
    const fim = dataFim.toISOString().slice(0,10);
    return Storage.getAll(this.SK_AULA).filter(a => {
      if (!a.data || a.data < ini || a.data > fim) return false;
      if (this._state.calFilterArena && a.arenaId !== this._state.calFilterArena) return false;
      if (this._state.calFilterTurma && a.turmaId !== this._state.calFilterTurma) return false;
      return true;
    }).sort((a,b) => (a.horarioInicio||'').localeCompare(b.horarioInicio||''));
  },

  _getGradeCor(turmaId) {
    if (!turmaId) return '#6b7280';
    const CORES = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#a855f7'];
    const turmas = Storage.getAll(this.SK).sort((a, b) => a.nome.localeCompare(b.nome));
    const idx    = turmas.findIndex(t => t.id === turmaId);
    return CORES[idx >= 0 ? idx % CORES.length : 0];
  },

  _renderViewDia() {
    const { calAno, calMes, calDia } = this._state;
    const aulas   = this._getAulasFiltradas(new Date(calAno, calMes, calDia), new Date(calAno, calMes, calDia));

    if (!aulas.length) {
      return `<div class="cal-dia-vazio"><span>📭</span><p>Nenhuma aula neste dia.</p></div>`;
    }

    const cards = aulas.map(a => this._renderCardAula(a, 'lg')).join('');
    return `<div class="cal-dia-lista">${cards}</div>`;
  },

  _renderViewSemana() {
    const { inicio, fim } = this._getSemanaAtual();
    const aulas = this._getAulasFiltradas(inicio, fim);
    const hojeStr = new Date().toISOString().slice(0,10);
    const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    // Colunas de cada dia
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      dias.push(d);
    }

    const cols = dias.map((d, i) => {
      const ds = d.toISOString().slice(0,10);
      const isHoje = ds === hojeStr;
      const aulasD = aulas.filter(a => a.data === ds);
      const cards  = aulasD.length
        ? aulasD.map(a => this._renderCardAula(a, 'sm')).join('')
        : `<div class="cal-sem-vazio">—</div>`;
      return `
        <div class="cal-sem-col${isHoje ? ' cal-sem-hoje' : ''}">
          <div class="cal-sem-header">
            <span class="cal-sem-diaNome">${DIAS[i]}</span>
            <span class="cal-sem-diaNum${isHoje ? ' hoje' : ''}">${d.getDate()}</span>
          </div>
          <div class="cal-sem-aulas">${cards}</div>
        </div>`;
    }).join('');

    return `<div class="cal-semana-grid">${cols}</div>`;
  },

  _renderViewMes() {
    const { calAno, calMes } = this._state;
    const primeiroDia = new Date(calAno, calMes, 1);
    const ultimoDia   = new Date(calAno, calMes + 1, 0);
    const diasDoMes   = ultimoDia.getDate();
    const inicioSem   = primeiroDia.getDay();
    const mesStr      = String(calMes + 1).padStart(2, '0');
    const hojeStr     = new Date().toISOString().slice(0, 10);
    const HEADER      = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const WKEND       = [0, 6];

    const aulasDoMes = this._getAulasFiltradas(primeiroDia, ultimoDia);

    const headerCols = HEADER.map(h =>
      `<div class="cal-mes-th">${h}</div>`).join('');

    let cells = '';
    for (let i = 0; i < inicioSem; i++) {
      cells += `<div class="cal-cell cal-cell-outside${WKEND.includes(i)?' cal-cell-fds':''}"></div>`;
    }

    for (let d = 1; d <= diasDoMes; d++) {
      const dataStr   = `${calAno}-${mesStr}-${String(d).padStart(2, '0')}`;
      const aulasHoje = aulasDoMes.filter(a => a.data === dataStr);
      const isHoje    = dataStr === hojeStr;
      const isPast    = dataStr < hojeStr;
      const diaSem    = new Date(calAno, calMes, d).getDay();
      const isFds     = WKEND.includes(diaSem);
      const MAX       = 3;
      const visiveis  = aulasHoje.slice(0, MAX);
      const extras    = aulasHoje.length - MAX;

      const eventos = visiveis.map(a => {
        const cor = this._getGradeCor(a.turmaId);
        const hr  = (a.horarioInicio || '').slice(0, 5);
        const st  = this.STATUS_AULA[a.status] || {};
        return `
          <div class="cal-event" style="--ev-cor:${cor};"
            onclick="TurmasModule.openModalAulaDetalhe('${a.id}')">
            <span class="cal-ev-dot" style="background:${st.cor||cor};"></span>
            <span class="cal-event-hora">${hr}</span>
            <span class="cal-event-nome">${UI.escape(a.titulo || a.turmaNome || '')}</span>
          </div>`;
      }).join('');

      const mais = extras > 0
        ? `<div class="cal-event-mais" onclick="TurmasModule._setCalView('dia');TurmasModule._state.calDia=${d};TurmasModule._reRenderContent()">+${extras} mais</div>`
        : '';

      cells += `
        <div class="cal-cell${isHoje?' cal-cell-hoje':''}${isPast?' cal-cell-passado':''}${isFds?' cal-cell-fds':''}">
          <div class="cal-cell-num${isHoje?' hoje':''}">${d}</div>
          ${eventos}${mais}
        </div>`;
    }

    return `
      <div class="cal-mes-wrap">
        <div class="cal-mes-header">${headerCols}</div>
        <div class="cal-mes-grid">${cells}</div>
      </div>`;
  },

  _renderViewAgenda() {
    const ref  = new Date(this._state.calAno, this._state.calMes, this._state.calDia);
    const fim  = new Date(ref); fim.setDate(ref.getDate() + 30);
    const aulas = this._getAulasFiltradas(ref, fim);

    if (!aulas.length) {
      return `<div class="cal-dia-vazio"><span>📭</span><p>Nenhuma aula nos próximos 30 dias.</p></div>`;
    }

    // Agrupa por data
    const grupos = {};
    aulas.forEach(a => {
      if (!grupos[a.data]) grupos[a.data] = [];
      grupos[a.data].push(a);
    });

    const hojeStr = new Date().toISOString().slice(0,10);

    return `<div class="cal-agenda-wrap">` +
      Object.entries(grupos).sort(([a],[b]) => a.localeCompare(b)).map(([data, aulasD]) => {
        const [ano, mes, dia] = data.split('-');
        const dateObj = new Date(+ano, +mes-1, +dia);
        const label   = dateObj.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
        const isHoje  = data === hojeStr;
        const cards   = aulasD.map(a => this._renderCardAula(a, 'md')).join('');
        return `
          <div class="cal-agenda-grupo">
            <div class="cal-agenda-data${isHoje?' hoje':''}">
              ${label.charAt(0).toUpperCase() + label.slice(1)}
              ${isHoje ? '<span class="cal-agenda-hoje-badge">Hoje</span>' : ''}
            </div>
            <div class="cal-agenda-aulas">${cards}</div>
          </div>`;
      }).join('') + `</div>`;
  },

  _renderCardAula(a, size = 'md') {
    const cor    = this._getGradeCor(a.turmaId);
    const st     = this.STATUS_AULA[a.status] || { label: a.status, cor: '#6b7280' };
    const hr     = [a.horarioInicio, a.horarioFim].filter(Boolean).join('–') || '—';

    // Conta alunos inscritos nesta turma
    const inscritos = Storage.getAll('turmaAlunos').filter(ta => ta.turmaId === a.turmaId && ta.status === 'ativo').length;

    // Local: arena → quadra quando disponível
    const local = a.quadraNome
      ? `${a.arenaNome || ''} — ${a.quadraNome}`
      : (a.arenaNome || '—');

    if (size === 'sm') {
      return `
        <div class="cal-card cal-card-sm" style="--ev-cor:${cor};"
          onclick="TurmasModule.openModalAulaDetalhe('${a.id}')">
          <div class="cal-card-hora">${(a.horarioInicio||'').slice(0,5)}</div>
          <div class="cal-card-titulo">${UI.escape(a.titulo || a.turmaNome || '—')}</div>
          <span class="cal-card-st-dot" style="background:${st.cor};" title="${st.label}"></span>
        </div>`;
    }

    if (size === 'md') {
      return `
        <div class="cal-card cal-card-md" style="--ev-cor:${cor};"
          onclick="TurmasModule.openModalAulaDetalhe('${a.id}')">
          <div class="cal-card-left-bar" style="background:${cor};"></div>
          <div class="cal-card-body">
            <div class="cal-card-row1">
              <span class="cal-card-hora">${hr}</span>
              <span class="cal-card-badge" style="background:${st.cor}20;color:${st.cor};">${st.label}</span>
            </div>
            <div class="cal-card-titulo">${UI.escape(a.titulo || a.turmaNome || '—')}</div>
            <div class="cal-card-sub">
              ${a.professorNome ? `👤 ${UI.escape(a.professorNome)}` : ''}
              ${local !== '—'   ? `· 📍 ${UI.escape(local)}`         : ''}
              ${inscritos       ? `· 👥 ${inscritos}`                : ''}
            </div>
          </div>
        </div>`;
    }

    // lg
    return `
      <div class="cal-card cal-card-lg" style="--ev-cor:${cor};"
        onclick="TurmasModule.openModalAulaDetalhe('${a.id}')">
        <div class="cal-card-left-bar" style="background:${cor};"></div>
        <div class="cal-card-body">
          <div class="cal-card-row1">
            <span class="cal-card-hora-lg">${hr}</span>
            <span class="cal-card-badge" style="background:${st.cor}20;color:${st.cor};">${st.label}</span>
          </div>
          <div class="cal-card-titulo-lg">${UI.escape(a.titulo || a.turmaNome || '—')}</div>
          <div class="cal-card-meta">
            ${a.turmaNome     ? `<span>🏷️ ${UI.escape(a.turmaNome)}</span>`     : ''}
            ${a.professorNome ? `<span>👤 ${UI.escape(a.professorNome)}</span>` : ''}
            ${local !== '—'   ? `<span>📍 ${UI.escape(local)}</span>`           : ''}
            ${inscritos       ? `<span>👥 ${inscritos} aluno${inscritos!==1?'s':''}</span>` : ''}
          </div>
        </div>
        <div class="cal-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();TurmasModule.abrirPresencaRapida('${a.id}')" title="Presença">📋</button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();TurmasModule.openModalAula('${a.id}')" title="Editar">✏️</button>
        </div>
      </div>`;
  },

  /* ================================================================== */
  /*  ABA 3 — Frequência                                                 */
  /* ================================================================== */

  _renderFrequencia() {
    const turmas = Storage.getAll(this.SK).sort((a, b) => a.nome.localeCompare(b.nome));
    const sel    = this._state.turmaSel;

    const opts = `<option value="">— Selecionar grade —</option>` +
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
          <div class="empty-title">Selecione uma grade</div>
          <div class="empty-desc">Escolha uma grade para visualizar o relatório de frequência.</div>
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
          <div class="empty-title">Nenhuma aula registrada para esta grade</div>
          <div class="empty-desc">Gere aulas a partir da aba Grade ou agende aulas avulsas.</div>
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
          <div class="empty-desc">Registre a presença dos alunos nas aulas desta grade pelo Calendário.</div>
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
    const arenaOpts = `<option value="">— Selecionar arena —</option>` +
      arenas.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
          ${turma && turma.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
      ).join('');

    // Quadras da arena já selecionada (para edição)
    const quadrasInicial = turma && turma.arenaId
      ? Storage.getAll('quadras').filter(q => q.arenaId === turma.arenaId && q.status === 'disponivel')
      : [];
    const quadraOpts = `<option value="">— Selecionar quadra —</option>` +
      quadrasInicial.map(q =>
        `<option value="${q.id}" data-nome="${UI.escape(q.nome)}"
          ${turma && turma.quadraId === q.id ? 'selected' : ''}>${UI.escape(q.nome)}</option>`
      ).join('');

    const DIAS_ORDER   = [['seg','Segunda'],['ter','Terça'],['qua','Quarta'],['qui','Quinta'],['sex','Sexta'],['sab','Sábado'],['dom','Domingo']];
    const diasNormEdit = turma ? this._normalizeDias(turma) : [];
    const diasMapEdit  = {};
    diasNormEdit.forEach(d => { diasMapEdit[d.dia] = d; });

    const diasRows = DIAS_ORDER.map(([k, label]) => {
      const sel   = diasMapEdit[k];
      const isChk = !!sel;
      const hi    = sel ? (sel.inicio || '') : '';
      const hf    = sel ? (sel.fim    || '') : '';
      return `
        <div class="tm-dia-row" id="tm-dia-row-${k}">
          <label class="tm-dia-check-label">
            <input type="checkbox" name="dia-turma" value="${k}" ${isChk ? 'checked' : ''}
              onchange="TurmasModule._onDiaCheck('${k}', this.checked)" />
            <span class="tm-dia-nome">${label}</span>
          </label>
          <input type="time" id="tm-dia-hi-${k}" class="form-input tm-dia-time"
            data-dia="${k}" value="${hi}" ${!isChk ? 'disabled' : ''}
            style="width:110px;${!isChk ? 'opacity:0.35;' : ''}" />
          <span class="tm-hora-sep" style="color:var(--text-muted);${!isChk ? 'opacity:0.35;' : ''}">–</span>
          <input type="time" id="tm-dia-hf-${k}" class="form-input tm-dia-time"
            data-dia="${k}" value="${hf}" ${!isChk ? 'disabled' : ''}
            style="width:110px;${!isChk ? 'opacity:0.35;' : ''}" />
        </div>`;
    }).join('');

    const statusOpts = Object.entries(this.STATUS_TURMA).map(([k, cfg]) =>
      `<option value="${k}" ${turma && turma.status === k ? 'selected' : ''}>${cfg.label}</option>`
    ).join('');

    const nivelOpts  = ListasService.opts('aulas_nivel', turma?.nivel || '');
    const tipoOpts   = ListasService.opts('aulas_tipo', turma?.tipo || '');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="tm-nome">Nome da grade <span class="required-star">*</span></label>
          <input id="tm-nome" type="text" class="form-input"
            placeholder="ex: Grade Iniciante Manhã"
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
            <label class="form-label" for="tm-esporte">Esporte</label>
            <select id="tm-esporte" class="form-select">
              <option value="">— Selecionar —</option>
              ${ListasService.opts('esporte', turma?.esporte || '')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="tm-tipoplano">Tipo de Aula</label>
            <select id="tm-tipoplano" class="form-select">
              <option value="">— Selecionar —</option>
              ${ListasService.opts('aulas_tipoplano', turma?.tipoplano || '')}
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="tm-prof">Professor</label>
            <select id="tm-prof" class="form-select">${profOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="tm-arena">Arena</label>
            <select id="tm-arena" class="form-select" onchange="TurmasModule._onArenaChange()">${arenaOpts}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="tm-quadra">Quadra</label>
          <select id="tm-quadra" class="form-select">${quadraOpts}</select>
        </div>

        <div class="form-group">
          <label class="form-label">Dias da semana e horários</label>
          <div style="display:flex;flex-direction:column;gap:5px;" id="tm-dias-grid">
            ${diasRows}
          </div>
          <div style="margin-top:8px;">
            <button type="button" class="btn btn-ghost btn-sm"
              onclick="TurmasModule._aplicarHorarioTodos()"
              title="Copia o horário do primeiro dia selecionado para todos os outros">
              ↳ Mesmo horário para todos os dias
            </button>
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
            placeholder="Informações sobre a grade…">${turma ? UI.escape(turma.observacoes || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        id ? `Editar Grade — ${turma.nome}` : 'Nova Grade',
      content,
      confirmLabel: id ? 'Salvar alterações' : 'Criar Grade',
      onConfirm:    () => this.saveTurma(id),
    });
  },

  saveTurma(id = null) {
    const g      = n => document.getElementById(`tm-${n}`);
    const nomeEl = g('nome');
    if (!nomeEl || !nomeEl.value.trim()) {
      if (nomeEl) nomeEl.classList.add('error');
      UI.toast('Informe o nome da grade.', 'warning');
      return;
    }
    nomeEl.classList.remove('error');

    const DIAS_KEYS  = ['seg','ter','qua','qui','sex','sab','dom'];
    const diasSemana = DIAS_KEYS
      .filter(k => document.querySelector(`input[name="dia-turma"][value="${k}"]`)?.checked)
      .map(k => ({
        dia:    k,
        inicio: document.getElementById(`tm-dia-hi-${k}`)?.value || '',
        fim:    document.getElementById(`tm-dia-hf-${k}`)?.value || '',
      }));

    const profSel  = g('prof');
    const professorId   = profSel ? profSel.value : '';
    const professorNome = profSel && profSel.selectedOptions[0]
      ? (profSel.selectedOptions[0].dataset.nome || '') : '';

    const arenaSel = g('arena');
    const arenaId   = arenaSel ? arenaSel.value : '';
    const arenaNome = arenaSel && arenaSel.selectedOptions[0]
      ? (arenaSel.selectedOptions[0].dataset.nome || '') : '';

    const quadraSel  = g('quadra');
    const quadraId   = quadraSel ? quadraSel.value : '';
    const quadraNome = quadraSel && quadraSel.selectedOptions[0]
      ? (quadraSel.selectedOptions[0].dataset.nome || '') : '';

    const record = {
      nome:          nomeEl.value.trim(),
      tipo:          g('tipo')      ? g('tipo').value                     : 'grupo',
      nivel:         g('nivel')     ? g('nivel').value                    : 'iniciante',
      esporte:       g('esporte')   ? g('esporte').value                  : '',
      tipoplano:     g('tipoplano') ? g('tipoplano').value                : '',
      professorId, professorNome, arenaId, arenaNome, quadraId, quadraNome,
      diasSemana,
      // horarioInicio/Fim derivados do primeiro dia (retrocompat com exibições antigas)
      horarioInicio: diasSemana.length ? (diasSemana[0].inicio || '') : '',
      horarioFim:    diasSemana.length ? (diasSemana[0].fim    || '') : '',
      vagas:         g('vagas')     ? parseInt(g('vagas').value, 10) || 4 : 4,
      status:        g('status')    ? g('status').value                   : 'ativa',
      observacoes:   g('obs')       ? g('obs').value.trim()               : '',
    };

    if (id) {
      Storage.update(this.SK, id, record);
      UI.toast(`Grade "${record.nome}" atualizada!`, 'success');
    } else {
      Storage.create(this.SK, record);
      UI.toast(`Grade "${record.nome}" criada!`, 'success');
    }
    UI.closeModal();
    this.render();
  },

  /** Habilita/desabilita os inputs de horário ao marcar/desmarcar um dia */
  _onDiaCheck(dia, checked) {
    const hi  = document.getElementById(`tm-dia-hi-${dia}`);
    const hf  = document.getElementById(`tm-dia-hf-${dia}`);
    const row = document.getElementById(`tm-dia-row-${dia}`);
    [hi, hf].forEach(el => {
      if (!el) return;
      el.disabled     = !checked;
      el.style.opacity = checked ? '' : '0.35';
    });
    const sep = row?.querySelector('.tm-hora-sep');
    if (sep) sep.style.opacity = checked ? '' : '0.35';
  },

  /** Copia o horário do primeiro dia selecionado para todos os dias selecionados */
  _aplicarHorarioTodos() {
    const DIAS_KEYS = ['seg','ter','qua','qui','sex','sab','dom'];
    let primeiroHi = '', primeiroHf = '';
    for (const k of DIAS_KEYS) {
      const cb = document.querySelector(`input[name="dia-turma"][value="${k}"]`);
      const hi = document.getElementById(`tm-dia-hi-${k}`);
      if (cb?.checked && hi?.value) {
        primeiroHi = hi.value;
        primeiroHf = document.getElementById(`tm-dia-hf-${k}`)?.value || '';
        break;
      }
    }
    if (!primeiroHi) { UI.toast('Defina o horário de pelo menos um dia selecionado.', 'warning'); return; }
    let count = 0;
    DIAS_KEYS.forEach(k => {
      const cb = document.querySelector(`input[name="dia-turma"][value="${k}"]`);
      if (!cb?.checked) return;
      const hi = document.getElementById(`tm-dia-hi-${k}`);
      const hf = document.getElementById(`tm-dia-hf-${k}`);
      if (hi) hi.value = primeiroHi;
      if (hf) hf.value = primeiroHf;
      count++;
    });
    UI.toast(`Horário ${primeiroHi}–${primeiroHf} aplicado a ${count} dia${count !== 1 ? 's' : ''}!`, 'success');
  },

  async deleteTurma(id) {
    const t = Storage.getById(this.SK, id);
    if (!t) return;

    const vinculos =
      Storage.getAll(this.SK_AULA).filter(r => r.turmaId === id).length +
      Storage.getAll(this.SK_INSCR).filter(r => r.turmaId === id).length;

    if (vinculos > 0) {
      const inativar = await UI.confirm(
        `"${t.nome}" possui ${vinculos} registro(s) vinculado(s) (aulas e inscrições). Não é possível excluir.\n\nDeseja encerrar a grade em vez disso?`,
        'Não é possível excluir',
        'Encerrar'
      );
      if (!inativar) return;
      Storage.update(this.SK, id, { status: 'encerrada' });
      UI.toast(`Grade "${t.nome}" encerrada.`, 'success');
      this.render();
      return;
    }

    const ok = await UI.confirm(
      `Excluir a grade "${t.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Grade'
    );
    if (!ok) return;
    Storage.delete(this.SK, id);
    UI.toast(`Grade "${t.nome}" excluída.`, 'success');
    this.render();
  },

  /* ================================================================== */
  /*  Gerar aulas a partir do calendário da turma                        */
  /* ================================================================== */

  openGerarAulas(turmaId) {
    const t = Storage.getById(this.SK, turmaId);
    if (!t) return;

    const diasNormGerar = this._normalizeDias(t);
    if (!diasNormGerar.length) {
      UI.toast('Configure os dias da semana na grade antes de gerar aulas.', 'warning');
      return;
    }

    const hoje    = new Date();
    const hojeStr = this._isoDate(hoje);
    const diasLabel = diasNormGerar.map(d => this.DIAS_LABEL[d.dia] || d.dia).join(', ');

    const content = `
      <div class="form-grid">
        <div class="info-box">
          <strong>${UI.escape(t.nome)}</strong><br>
          <span class="text-muted" style="font-size:13px;">
            ${diasLabel} · ${this._formatHorarios(diasNormGerar)}
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

    const diasSel = this._diasJS(this._normalizeDias(t).map(d => d.dia));
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

    const diasNormGer = this._normalizeDias(t);
    const diasSel     = this._diasJS(diasNormGer.map(d => d.dia));
    if (!diasSel.length) {
      UI.toast('Configure os dias da semana da grade.', 'warning');
      return;
    }

    // Mapa: índice JS do dia (0-6) → {inicio, fim}
    const diasHorasMap = {};
    diasNormGer.forEach(d => {
      const idx = this.DIAS_JS.indexOf(d.dia);
      if (idx >= 0) diasHorasMap[idx] = { inicio: d.inicio || '', fim: d.fim || '' };
    });

    const existentes = new Set(
      Storage.getAll(this.SK_AULA).filter(a => a.turmaId === turmaId).map(a => a.data)
    );

    let count = 0;
    const cur = new Date(ini + 'T12:00:00');
    const end = new Date(fim + 'T12:00:00');
    const MAX = 365;

    while (cur <= end && count < MAX) {
      const diaSemJS = cur.getDay();
      if (diasSel.includes(diaSemJS)) {
        const dataStr = this._isoDate(cur);
        if (!existentes.has(dataStr)) {
          const horario = diasHorasMap[diaSemJS] || { inicio: t.horarioInicio || '', fim: t.horarioFim || '' };
          // Verificar conflito de quadra (só avisa, não bloqueia)
          const conflito = this._verificarConflitoQuadra(
            t.quadraId, dataStr, horario.inicio, horario.fim
          );
          if (conflito) {
            UI.toast(`⚠️ Quadra ocupada em ${dataStr} por "${conflito.titulo || conflito.turmaNome}".`, 'warning');
          }
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
            quadraId:      t.quadraId   || '',
            quadraNome:    t.quadraNome || '',
            data:          dataStr,
            horarioInicio: horario.inicio,
            horarioFim:    horario.fim,
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
    const turmaOpts = `<option value="">— Avulsa (sem grade) —</option>` +
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

    // Quadras para a arena já selecionada (edição)
    const quadrasInicial = aula && aula.arenaId
      ? Storage.getAll('quadras').filter(q => q.arenaId === aula.arenaId && q.status === 'disponivel')
      : [];
    const quadraOptsAu = `<option value="">— Selecionar quadra —</option>` +
      quadrasInicial.map(q =>
        `<option value="${q.id}" data-nome="${UI.escape(q.nome)}"
          ${aula && aula.quadraId === q.id ? 'selected' : ''}>${UI.escape(q.nome)}</option>`
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
            <label class="form-label" for="au-turma">Grade</label>
            <select id="au-turma" class="form-select" onchange="TurmasModule._onTurmaChangeAula()">${turmaOpts}</select>
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
            <label class="form-label" for="au-esporte">Esporte</label>
            <select id="au-esporte" class="form-select">
              <option value="">— Selecionar —</option>
              ${ListasService.opts('esporte', aula?.esporte || '')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="au-tipoplano">Tipo de Aula</label>
            <select id="au-tipoplano" class="form-select">
              <option value="">— Selecionar —</option>
              ${ListasService.opts('aulas_tipoplano', aula?.tipoplano || '')}
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="au-arena">Arena</label>
            <select id="au-arena" class="form-select" onchange="TurmasModule._onArenaChangeAula()">${arenaOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="au-quadra">Quadra</label>
            <select id="au-quadra" class="form-select">${quadraOptsAu}</select>
          </div>
        </div>

        <div id="au-data-wrap" class="form-group" ${aula && aula.turmaId ? 'style="display:none"' : ''}>
          <label class="form-label" for="au-data">Data <span class="required-star">*</span></label>
          <input id="au-data" type="date" class="form-input" value="${v('data')}" />
        </div>
        <div id="au-data-info" ${aula && aula.turmaId ? '' : 'style="display:none"'}>
          <div class="cadastro-tab-info">
            📅 Aula vinculada à grade — as datas são geradas automaticamente pelo botão <strong>Gerar Aulas</strong> na aba Grade.
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
    const turmaEl  = g('turma');
    const isAvulsa = !turmaEl?.value;
    let valid = true;

    // Título sempre obrigatório
    if (!tituloEl?.value.trim()) {
      tituloEl?.classList.add('error');
      valid = false;
    } else {
      tituloEl?.classList.remove('error');
    }

    // Data obrigatória apenas para aulas avulsas
    if (isAvulsa) {
      if (!dataEl?.value.trim()) {
        dataEl?.classList.add('error');
        valid = false;
      } else {
        dataEl?.classList.remove('error');
      }
    }

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

    const quadraSel     = g('quadra');
    const quadraId      = quadraSel ? quadraSel.value : '';
    const quadraNome    = quadraSel && quadraSel.selectedOptions[0] ? (quadraSel.selectedOptions[0].dataset.nome || '') : '';

    const horarioInicio = g('hi')  ? g('hi').value  : '';
    const horarioFim    = g('hf')  ? g('hf').value  : '';
    const data          = isAvulsa ? (dataEl?.value || '') : '';

    const record = {
      titulo:        tituloEl.value.trim(),
      nivel:         g('nivel')     ? g('nivel').value                    : 'iniciante',
      esporte:       g('esporte')   ? g('esporte').value                  : '',
      tipoplano:     g('tipoplano') ? g('tipoplano').value                : '',
      turmaId, turmaNome, professorId, professorNome, arenaId, arenaNome, quadraId, quadraNome,
      data,
      horarioInicio,
      horarioFim,
      vagas:         g('vagas')     ? parseInt(g('vagas').value, 10) || 4 : 4,
      status:        g('status')    ? g('status').value                   : 'agendada',
      observacoes:   g('obs')       ? g('obs').value.trim()               : '',
    };

    // Verificar conflito de quadra
    const conflito = this._verificarConflitoQuadra(quadraId, data, horarioInicio, horarioFim, id || null);
    if (conflito) {
      UI.toast(`⚠️ Quadra já ocupada neste horário por "${conflito.titulo || conflito.turmaNome}".`, 'warning');
    }

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

  /* ================================================================== */
  /*  Alocação de alunos por aula                                        */
  /* ================================================================== */

  openModalAlocarAluno(aulaId) {
    const aula = Storage.getById(this.SK_AULA, aulaId);
    if (!aula) return;

    const alocados   = Storage.getAll('aulaAlunos').filter(aa => aa.aulaId === aulaId && aa.status === 'ativo');
    const alocadosIds = new Set(alocados.map(aa => aa.alunoId));
    const vagasAula  = aula.vagas || 0;
    const vagasLivres = vagasAula > 0 ? Math.max(0, vagasAula - alocados.length) : null;

    // Alunos com matrícula ativa, filtrados pelo nível da aula (se definido)
    const matriculasAtivas = Storage.getAll('matriculas').filter(m => m.status === 'ativa');
    const alunosComMat = new Set(matriculasAtivas.map(m => m.alunoId));
    let alunos = Storage.getAll('alunos')
      .filter(a => a.status === 'ativo' && alunosComMat.has(a.id) && !alocadosIds.has(a.id));

    // Filtra por nível se a aula não for aberta
    if (aula.nivel && aula.nivel !== 'aberto') {
      alunos = alunos.filter(a => !a.nivel || a.nivel === aula.nivel);
    }
    alunos = alunos.sort((a, b) => a.nome.localeCompare(b.nome));

    const [y,m,d] = (aula.data || '').split('-');
    const dataFmt = aula.data ? `${d}/${m}/${y}` : '—';

    const alocadosRows = alocados.map(aa => `
      <tr>
        <td>${UI.escape(aa.alunoNome)}</td>
        <td><span class="badge badge-success">Alocado</span></td>
        <td>
          <button class="btn btn-ghost btn-sm danger"
            onclick="TurmasModule._desalocarAlunoNaAula('${aa.id}', '${aulaId}')"
            title="Remover da aula">✕</button>
        </td>
      </tr>`).join('');

    const dispOpts = vagasLivres !== null && vagasLivres === 0
      ? `<div class="empty-state" style="padding:16px 0;"><div class="empty-icon">🚫</div><div class="empty-title">Aula lotada</div><div class="empty-desc">Todas as ${vagasAula} vagas estão ocupadas.</div></div>`
      : alunos.length
        ? `<div class="form-group" style="margin-top:12px;">
             <label class="form-label">Adicionar aluno${aula.nivel && aula.nivel !== 'aberto' ? ` (nível: ${aula.nivel})` : ''}</label>
             <div style="display:flex;gap:8px;">
               <select id="alocar-aluno-sel" class="form-select">
                 <option value="">— Selecionar aluno —</option>
                 ${alunos.map(a => `<option value="${a.id}" data-nome="${UI.escape(a.nome)}">${UI.escape(a.nome)}</option>`).join('')}
               </select>
               <button class="btn btn-primary btn-sm" onclick="TurmasModule._alocarAlunoNaAula('${aulaId}')">Alocar</button>
             </div>
           </div>`
        : `<div class="text-muted" style="font-size:13px;margin-top:12px;">Nenhum aluno disponível com matrícula ativa${aula.nivel && aula.nivel !== 'aberto' ? ` no nível ${aula.nivel}` : ''}.</div>`;

    const content = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary);">
        <strong>${UI.escape(aula.titulo)}</strong> · ${dataFmt}
        ${aula.horarioInicio ? ` · ${aula.horarioInicio}` : ''}
        ${aula.nivel ? ` · ${aula.nivel}` : ''}
        · <span class="${vagasLivres === 0 ? 'badge badge-danger' : 'badge badge-success'}">${alocados.length}/${vagasAula} vagas</span>
      </div>

      ${alocados.length ? `
        <div class="table-card" style="margin-bottom:12px;max-height:200px;overflow-y:auto;">
          <table class="data-table">
            <thead><tr><th>Aluno</th><th>Status</th><th></th></tr></thead>
            <tbody>${alocadosRows}</tbody>
          </table>
        </div>` : `<div class="text-muted" style="font-size:13px;margin-bottom:12px;">Nenhum aluno alocado ainda.</div>`}

      ${dispOpts}`;

    UI.openModal({
      title: `Alocar Alunos — ${aula.titulo}`,
      content,
      confirmLabel: 'Fechar',
      onConfirm: () => UI.closeModal(),
    });
  },

  _alocarAlunoNaAula(aulaId) {
    const sel = document.getElementById('alocar-aluno-sel');
    if (!sel || !sel.value) { UI.toast('Selecione um aluno.', 'warning'); return; }

    const aula = Storage.getById(this.SK_AULA, aulaId);
    if (!aula) return;

    // Verifica vaga
    const alocados = Storage.getAll('aulaAlunos').filter(aa => aa.aulaId === aulaId && aa.status === 'ativo');
    if (aula.vagas > 0 && alocados.length >= aula.vagas) {
      UI.toast('Aula sem vagas disponíveis.', 'warning'); return;
    }

    // Verifica se já alocado
    if (alocados.find(aa => aa.alunoId === sel.value)) {
      UI.toast('Aluno já alocado nesta aula.', 'warning'); return;
    }

    const opt = sel.selectedOptions[0];
    const alunoNome = opt ? (opt.dataset.nome || opt.textContent.trim()) : '';
    const mat = Storage.getAll('matriculas').find(m => m.alunoId === sel.value && m.status === 'ativa');

    Storage.create('aulaAlunos', {
      aulaId,
      alunoId:    sel.value,
      alunoNome,
      matriculaId: mat ? mat.id : '',
      dataAlocacao: new Date().toISOString().slice(0, 10),
      status: 'ativo',
    });

    UI.toast(`${alunoNome} alocado na aula!`, 'success');
    // Reabre o modal atualizado
    this.openModalAlocarAluno(aulaId);
    // Atualiza a lista de aulas
    const list = document.getElementById('aulas-list') || document.querySelector('.aulas-table-wrap');
    if (list) {
      const filtered = Storage.getAll(this.SK_AULA);
      // force re-render da aba
      this.render();
      // Mantém na aba aulas
      this._state.tab = 'aulas';
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.textContent.includes('Aulas')));
    }
  },

  _desalocarAlunoNaAula(aulaAlunoId, aulaId) {
    const rec = Storage.getById('aulaAlunos', aulaAlunoId);
    if (!rec) return;
    Storage.update('aulaAlunos', aulaAlunoId, { status: 'inativo' });
    UI.toast(`${rec.alunoNome} removido da aula.`, 'success');
    this.openModalAlocarAluno(aulaId);
  },

  _renderInscricoes(turmaId) {
    const turma     = Storage.getById(this.SK, turmaId);
    const inscritos = Storage.getAll(this.SK_INSCR)
      .filter(i => i.turmaId === turmaId && i.status === 'ativo')
      .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome));

    const vagas     = turma?.vagas || 0;
    const disponiveis = Math.max(0, vagas - inscritos.length);

    // Alunos disponíveis para adicionar (ativos, com matrícula ativa, ainda não inscritos)
    const inscritosIds = new Set(inscritos.map(i => i.alunoId));
    const alunosDisponiveis = Storage.getAll('alunos')
      .filter(a => a.status === 'ativo' && !inscritosIds.has(a.id) && AlunoModule.temMatriculaAtiva(a.id))
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
          <label class="form-label" style="margin-bottom:6px;">Adicionar aluno
            <span class="text-muted" style="font-size:11px;font-weight:400;margin-left:6px;">⚠️ Apenas alunos com matrícula ativa</span>
          </label>
          <div style="display:flex;gap:8px;">
            <select id="inscr-aluno-sel" class="form-select" style="flex:1;">${alunoOpts}</select>
            <button class="btn btn-primary" onclick="TurmasModule._adicionarInscricao('${turmaId}')">Adicionar</button>
          </div>
          ${alunosDisponiveis.length === 0 ? `<p class="text-muted" style="font-size:12px;margin-top:6px;">Nenhum aluno com matrícula ativa disponível. <a href="#" onclick="MatriculaModule && MatriculaModule.openModal(); return false;" style="color:var(--primary);">+ Nova matrícula</a></p>` : ''}
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

    // Bloqueia alunos sem matrícula ativa (validação de segurança)
    if (!AlunoModule.temMatriculaAtiva(sel.value)) {
      UI.toast('Aluno não possui matrícula ativa. Cadastre uma matrícula antes de inscrever na grade.', 'warning');
      return;
    }

    const turma = Storage.getById(this.SK, turmaId);
    const vagas = turma?.vagas || 0;
    const atual = Storage.getAll(this.SK_INSCR).filter(i => i.turmaId === turmaId && i.status === 'ativo').length;
    if (vagas > 0 && atual >= vagas) {
      UI.toast('Grade sem vagas disponíveis.', 'warning');
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

    UI.toast(`${opt.dataset.nome} adicionado à grade!`, 'success');
    // Atualiza o conteúdo do modal sem fechá-lo
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.innerHTML = this._renderInscricoes(turmaId);
  },

  async _removerInscricao(inscricaoId, turmaId) {
    const inscr = Storage.getById(this.SK_INSCR, inscricaoId);
    if (!inscr) return;
    const ok = await UI.confirm(`Remover ${inscr.alunoNome} da grade?`, 'Remover Aluno');
    if (!ok) return;
    Storage.update(this.SK_INSCR, inscricaoId, { status: 'inativo' });
    UI.toast(`${inscr.alunoNome} removido da grade.`, 'success');
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.innerHTML = this._renderInscricoes(turmaId);
  },

  /** Retorna alunos ativos inscritos numa turma */
  getAlunosInscritos(turmaId) {
    return Storage.getAll(this.SK_INSCR).filter(i => i.turmaId === turmaId && i.status === 'ativo');
  },

  /* ================================================================== */
  /*  Cascading Arena → Quadra                                          */
  /* ================================================================== */

  _onArenaChange() {
    const arenaId = document.getElementById('tm-arena')?.value;

    // Atualiza quadras
    const selQ = document.getElementById('tm-quadra');
    if (selQ) {
      if (!arenaId) {
        selQ.innerHTML = '<option value="">— Selecionar arena primeiro —</option>';
      } else {
        const quadras = Storage.getAll('quadras').filter(q => q.arenaId === arenaId && q.status === 'disponivel');
        selQ.innerHTML = '<option value="">— Selecionar quadra —</option>' +
          quadras.map(q => `<option value="${q.id}" data-nome="${UI.escape(q.nome)}">${UI.escape(q.nome)}</option>`).join('');
      }
    }

    // Atualiza professores filtrados pela arena
    const selP = document.getElementById('tm-prof');
    if (selP) {
      const profAtual = selP.value;
      const todosProfessores = Storage.getAll('professores').filter(p => p.status === 'ativo');
      const profsFiltrados = arenaId
        ? todosProfessores.filter(p => Array.isArray(p.arenas) && p.arenas.includes(arenaId))
        : todosProfessores;
      selP.innerHTML = '<option value="">— Selecionar —</option>' +
        profsFiltrados.map(p =>
          `<option value="${p.id}" data-nome="${UI.escape(p.nome)}"
            ${p.id === profAtual ? 'selected' : ''}>${UI.escape(p.nome)}</option>`
        ).join('');
    }
  },

  _onArenaChangeAula() {
    const arenaId = document.getElementById('au-arena')?.value;
    const sel     = document.getElementById('au-quadra');
    if (!sel) return;
    if (!arenaId) {
      sel.innerHTML = '<option value="">— Selecionar arena primeiro —</option>';
      return;
    }
    const quadras = Storage.getAll('quadras').filter(q => q.arenaId === arenaId && q.status === 'disponivel');
    sel.innerHTML = '<option value="">— Selecionar quadra —</option>' +
      quadras.map(q => `<option value="${q.id}" data-nome="${UI.escape(q.nome)}">${UI.escape(q.nome)}</option>`).join('');
  },

  _onTurmaChangeAula() {
    const turmaEl = document.getElementById('au-turma');
    if (!turmaEl) return;

    // Mostra/esconde campo data conforme tipo
    const dataWrap = document.getElementById('au-data-wrap');
    const dataInfo = document.getElementById('au-data-info');
    const isAvulsa = !turmaEl.value;
    if (dataWrap) dataWrap.style.display = isAvulsa ? '' : 'none';
    if (dataInfo) dataInfo.style.display = isAvulsa ? 'none' : '';

    if (!turmaEl.value) return;
    const turma = Storage.getById(this.SK, turmaEl.value);
    if (!turma) return;

    // Preenche arena
    const arenaEl = document.getElementById('au-arena');
    if (arenaEl && turma.arenaId) {
      arenaEl.value = turma.arenaId;
      this._onArenaChangeAula(); // atualiza quadras
      // depois de renderizar, seleciona a quadra da turma
      setTimeout(() => {
        const qEl = document.getElementById('au-quadra');
        if (qEl && turma.quadraId) qEl.value = turma.quadraId;
      }, 50);
    }

    // Preenche professor
    const profEl = document.getElementById('au-prof');
    if (profEl && turma.professorId) profEl.value = turma.professorId;

    // Preenche nível
    const nivelEl = document.getElementById('au-nivel');
    if (nivelEl && turma.nivel) nivelEl.value = turma.nivel;

    // Preenche esporte
    const esporteEl = document.getElementById('au-esporte');
    if (esporteEl && turma.esporte) esporteEl.value = turma.esporte;

    // Preenche tipo plano
    const tipoEl = document.getElementById('au-tipoplano');
    if (tipoEl && turma.tipoplano) tipoEl.value = turma.tipoplano;

    // Preenche horários
    const hiEl = document.getElementById('au-hi');
    const hfEl = document.getElementById('au-hf');
    if (hiEl && turma.horarioInicio) hiEl.value = turma.horarioInicio;
    if (hfEl && turma.horarioFim)    hfEl.value = turma.horarioFim;
  },

  /* ================================================================== */
  /*  Conflito de horário em quadra                                      */
  /* ================================================================== */

  _verificarConflitoQuadra(quadraId, data, horarioInicio, horarioFim, aulaIdIgnorar = null) {
    if (!quadraId || !data || !horarioInicio) return null;
    return Storage.getAll('aulas').find(a =>
      a.id !== aulaIdIgnorar &&
      a.quadraId === quadraId &&
      a.data     === data &&
      a.status   !== 'cancelada' &&
      a.horarioInicio < (horarioFim || '23:59') &&
      (a.horarioFim || '23:59') > horarioInicio
    ) || null;
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
