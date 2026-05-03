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
        ? `<button class="btn btn-primary" onclick="TurmasModule.openModalTurma()">${svgPlus} Nova Turma</button>`
        : this._state.tab === 'aulas'
        ? `<div style="display:flex;gap:8px;">
             <button class="btn btn-secondary" onclick="TurmasModule.openGerarAulasAvulsas()">📅 Em Lote</button>
             <button class="btn btn-primary" onclick="TurmasModule.openModalAula()">${svgPlus} Nova Aula</button>
           </div>`
        : this._state.tab === 'calendario'
        ? `<button class="btn btn-primary" onclick="TurmasModule.openModalAula()">${svgPlus} Nova Aula</button>`
        : '';

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Turmas</h2>
          <p>Gestão de grades, calendário de aulas e frequência de alunos</p>
        </div>
        ${btnHeader}
      </div>

      <div class="tabs-bar">
        ${this._tabBtn('turmas',     '📋 Cronogramas')}
        ${this._tabBtn('aulas',      '🏸 Agenda')}
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

    // Pré-filtra por professor vinculado; mini-turmas avulsas nunca aparecem na aba Grades
    let base = Storage.getAll(this.SK).filter(t => t.tipo !== 'avulsa');
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
          <input type="text" class="search-input" placeholder="Buscar turma ou professor…"
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
            <div class="turma-alunos-chips" data-turma-chips="${t.id}">${chipsHtml}</div>
            <button class="turma-add-aluno-btn" onclick="TurmasModule.openModalAlunos('${t.id}')" title="Gerenciar alunos">
              <span data-turma-vagas="${t.id}" class="turma-vagas-badge ${vagasLivre === 0 ? 'turma-vagas-cheia' : ''}">${vagas > 0 ? `${nInscritos}/${vagas}` : nInscritos}</span> ＋
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
    // Mini-turmas avulsas não devem aparecer na lista de inscrição do aluno
    const grades = Storage.getAll(this.SK)
      .filter(t => t.status === 'ativa' && t.tipo !== 'avulsa')
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const inscricoes = Storage.getAll(this.SK_INSCR)
      .filter(i => session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome);
    const inscritosMap = {};
    inscricoes.forEach(i => { inscritosMap[i.turmaId] = i.id; });

    if (!grades.length) {
      return `<div class="empty-state">
        <div class="empty-icon">🏸</div>
        <div class="empty-title">Nenhuma turma disponível</div>
        <div class="empty-desc">Não há turmas ativas no momento.</div>
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
        <span class="badge badge-success">${Object.keys(inscritosMap).length} turma${Object.keys(inscritosMap).length !== 1 ? 's' : ''} inscrita${Object.keys(inscritosMap).length !== 1 ? 's' : ''}</span>
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

    UI.toast(`Inscrição na turma "${turma.nome}" realizada!`, 'success');
    this._reRenderContent();
  },

  async cancelarInscricaoAluno(inscricaoId) {
    const inscricao = Storage.getById(this.SK_INSCR, inscricaoId);
    if (!inscricao) return;
    const ok = await UI.confirm(`Cancelar inscrição na turma "${inscricao.turmaNome}"?`, 'Cancelar inscrição');
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
    } else if (this._state.aulaFilterTurma === '__avulsa__') {
      // Inclui avulsas legadas (!turmaId) E mini-turmas avulsas (avulsa: true)
      aulas = aulas.filter(a => !a.turmaId || !!a.avulsa);
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
      const d = (a.data || '').localeCompare(b.data || '');
      return d !== 0 ? d : (a.horarioInicio || '').localeCompare(b.horarioInicio || '');
    });

    // Guarda para exportação
    this._aulasFiltered = aulas;

    // Opções de turma para o filtro — mini-turmas avulsas não aparecem como opção de filtro
    const turmas = Storage.getAll(this.SK).filter(t => t.tipo !== 'avulsa').sort((a, b) => a.nome.localeCompare(b.nome));
    const minhaLabel = isProfessor ? 'Minhas turmas' : isAluno ? 'Minhas turmas' : '';
    let turmaOpts = `<option value="">Todas as turmas</option>`;
    if (isProfessor || isAluno) {
      turmaOpts = `<option value="__meu__" ${this._state.aulaFilterTurma === '__meu__' ? 'selected' : ''}>${minhaLabel}</option>
        <option value="">Todas as turmas</option>`;
    }
    turmaOpts += `<option value="__avulsa__" ${this._state.aulaFilterTurma === '__avulsa__' ? 'selected' : ''}>🏸 Avulsas (sem turma)</option>`;
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

      // Mescla turmaAlunos (inscrições na grade) + aulaAlunos (alocações diretas legacy)
      // sem duplicar o mesmo alunoId. Garante visibilidade de registros em ambas as fontes.
      const _tmInscritos = a.turmaId ? this.getAlunosInscritos(a.turmaId, a.data || null) : [];
      const _tmIds       = new Set(_tmInscritos.map(i => i.alunoId));
      const _aaExtra     = Storage.getAll('aulaAlunos')
        .filter(aa => aa.aulaId === a.id && aa.status === 'ativo' && !_tmIds.has(aa.alunoId));
      const alocados     = [..._tmInscritos, ..._aaExtra];
      // Inclui alunos experimentais (suporta formato array novo e legado de campo único)
      const _expList = a.experimental
        ? (a.alunosExperimentais?.length
            ? a.alunosExperimentais
            : a.alunoExperimentalId ? [{ id: a.alunoExperimentalId, nome: a.alunoExperimentalNome || '?' }] : [])
        : [];
      _expList.forEach(e => {
        if (!alocados.some(x => x.alunoId === e.id))
          alocados.push({ alunoId: e.id, alunoNome: e.nome, experimental: true });
      });
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

      // ── Botões de ação ──────────────────────────────────────────────
      // Ghost (ícone neutro, ação secundária): _btn(icon, title, onclick [, 'muted'])
      // CTA   (pílula sólida, ação primária):  _cta(label, cls, title, onclick)
      //   cls: 'green' = Iniciar | 'orange' = Concluir | 'amber' = Avaliar
      const _btn = (icon, title, onclick, extra = '') =>
        `<button class="aula-btn-ghost${extra ? ' ' + extra : ''}" title="${title}" onclick="${onclick}">${icon}</button>`;
      const _cta = (label, cls, title, onclick) =>
        `<button class="aula-btn-cta ${cls}" title="${title}" onclick="${onclick}">${label}</button>`;

      let acoes = '';

      // 1. 👥 Alunos — sempre (admin/recepção)
      if (!isProfessor && !isAluno) {
        const _fnAlunos = a.turmaId
          ? `TurmasModule.openModalAlunos('${a.turmaId}')`
          : `TurmasModule.openModalAlocarAluno('${a.id}')`;
        acoes += _btn('👥', 'Gerenciar alunos', _fnAlunos);
      }

      // Indicador 🧪 inativo — prof vê que a aula é experimental antes de concluir
      const _expPendente = a.experimental && a.avaliacaoStatus === 'pendente';
      const _btnExpInativo = isProfessor && _expPendente
        ? _btn('🧪', 'Aula experimental — conclua para avaliar',
            `UI.toast('Conclua a aula primeiro para liberar a avaliação experimental.','info')`,
            'muted')
        : '';

      if (!isAluno) {
        if (a.status === 'agendada') {
          acoes += _cta('Iniciar', 'green', 'Iniciar aula',
            `TurmasModule.professorCheckin('${a.id}')`);
          acoes += _btn('📋', 'Lançar presença',
            `TurmasModule.abrirPresencaRapida('${a.id}')`);
          acoes += _btnExpInativo;

        } else if (a.status === 'em_andamento') {
          acoes += _btn('📋', 'Lançar presença',
            `TurmasModule.abrirPresencaRapida('${a.id}')`);
          acoes += _cta('Concluir', 'orange', 'Concluir aula',
            `TurmasModule.professorCheckout('${a.id}')`);
          acoes += _btnExpInativo;

        } else if (_expPendente) {
          acoes += _cta('Avaliar', 'amber', 'Avaliar aula experimental',
            `TurmasModule.abrirAvaliacaoExperimental('${a.id}')`);

        } else {
          acoes += _btn('✏️', 'Editar',
            `TurmasModule.openModalAula('${a.id}')`);
        }
      }

      // Aluno: reposição (se inscrito e agendada)
      if (isAluno && a.status === 'agendada') {
        const estaInscrito = a.turmaId && Storage.getAll(this.SK_INSCR).find(i =>
          i.turmaId === a.turmaId &&
          (session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome)
        );
        if (estaInscrito) {
          acoes += _btn('🔄', 'Solicitar reposição', `TurmasModule.solicitarReposicao('${a.id}')`);
        }
      }

      // 👁 Detalhe — sempre (contém ✏️ 🗑️ 🔄 🔁)
      acoes += _btn('👁', 'Detalhe', `TurmasModule.openModalAulaDetalhe('${a.id}')`);


      return `
        <tr ${isHoje ? 'style="background:var(--today-row,rgba(59,130,246,0.05));"' : ''}>
          <td>
            <div class="aluno-nome">${UI.escape(a.titulo)}</div>
            <div class="aluno-sub">${UI.escape(a.nivel ? (this.NIVEL[a.nivel] || a.nivel) : '')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;">
              ${(!a.turmaId || a.avulsa)  ? `<span class="badge badge-gray" style="font-size:0.65rem;">Avulsa</span>` : ''}
              ${a.experimental ? `<span class="badge" style="font-size:0.65rem;background:#f59e0b;color:#fff;font-weight:700;">🧪 Exp.</span>` : ''}
              ${a.esporte   ? `<span class="badge badge-blue" style="font-size:0.65rem;">${UI.escape(a.esporte)}</span>` : ''}
              ${a.tipoplano ? `<span class="badge badge-success" style="font-size:0.65rem;">${UI.escape(a.tipoplano)}</span>` : ''}
            </div>
          </td>
          <td>
            <div style="font-size:13px;font-weight:600;">${UI.escape(a.turmaNome || '—')}</div>
            <div class="aluno-sub">${UI.escape(a.quadraNome ? `${a.arenaNome || ''} — ${a.quadraNome}` : (a.arenaNome || '—'))}</div>
            ${a.professorNome ? `<div class="aluno-sub" style="margin-top:2px;">👤 ${UI.escape(a.professorNome)}</div>` : ''}
          </td>
          <td>
            <div style="font-weight:600;">${dataFmt}${isHoje ? ' <span class="badge badge-blue" style="font-size:0.65rem;">Hoje</span>' : ''}</div>
            <div class="aluno-sub">${UI.escape(hora)}</div>
          </td>
          <td>
            <div class="turma-alunos-chips">${alunosHtml}</div>
            ${vagasAula > 0 ? `<div class="aluno-sub" style="margin-top:2px;">${alocados.length}/${vagasAula} vagas</div>` : ''}
          </td>
          <td><span class="badge ${st.badge}">${st.label}</span></td>
          <td>${presTag}</td>
          <td><div class="aula-acoes-wrap">${acoes}</div></td>
        </tr>`;
    }).join('');

    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar aula, turma, professor…"
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
        <div class="export-group">
          <div class="export-group-col">
            <span class="export-group-label">📥 Baixar planilha</span>
            <span class="export-hint">registros do filtro atual</span>
          </div>
          <button class="btn-export"
            onclick="TurmasModule._exportAulas()"
            title="Exporta as aulas atualmente exibidas (respeitando filtros de turma, status e período).&#10;&#10;Colunas incluídas:&#10;Título · Turma · Data · Início · Fim · Professor · Arena · Status · Nº de Alunos">
            Aulas <span class="export-fmt">.xlsx</span>
          </button>
          <button class="btn-export"
            onclick="TurmasModule._exportPresencas()"
            title="Exporta o histórico completo de presenças de todos os alunos em todas as aulas.&#10;&#10;Colunas incluídas:&#10;Aula · Turma · Data · Professor · Aluno · Presença (Presente/Ausente) · Registrado em">
            Presenças <span class="export-fmt">.xlsx</span>
          </button>
        </div>
      </div>
      ${aulas.length ? `
        <div class="table-card">
          <table class="data-table aulas-table">
            <thead><tr>
              <th>Aula</th><th>Turma / Professor</th><th>Período</th>
              <th>Alunos</th><th>Status</th><th>Presença</th><th></th>
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

    // Mescla turmaAlunos + aulaAlunos (legacy) sem duplicar o mesmo alunoId
    const _tmList  = aula.turmaId ? this.getAlunosInscritos(aula.turmaId, aula.data || null) : [];
    const _tmIds   = new Set(_tmList.map(i => i.alunoId));
    const _aaList  = Storage.getAll('aulaAlunos')
      .filter(aa => aa.aulaId === aulaId && aa.status === 'ativo' && !_tmIds.has(aa.alunoId))
      .map(aa => ({ alunoId: aa.alunoId, alunoNome: aa.alunoNome }));
    const inscritos = [..._tmList, ..._aaList];

    // Suporta formato array novo (alunosExperimentais) e legado (alunoExperimentalId)
    const expList = aula.experimental
      ? (aula.alunosExperimentais?.length
          ? aula.alunosExperimentais
          : aula.alunoExperimentalId
            ? [{ id: aula.alunoExperimentalId, nome: aula.alunoExperimentalNome || '?' }]
            : [])
      : [];
    const hasExperimental = expList.length > 0;
    if (!inscritos.length && !hasExperimental) {
      UI.toast('Nenhum aluno inscrito nesta turma. Adicione alunos antes de lançar presença.', 'warning');
      return;
    }

    const presencas   = Storage.getAll('presencas');
    const [y, m, d]   = (aula.data || '').split('-');
    const dataFmt     = aula.data ? `${d}/${m}/${y}` : '—';
    const hora        = [aula.horarioInicio, aula.horarioFim].filter(Boolean).join(' – ') || '';

    // Alunos de reposição nesta aula
    const repostos = Storage.getAll('reposicoes')
      .filter(r => r.aulaReposicaoId === aulaId && r.status === 'agendada');

    // Alunos de permuta nesta aula (chegando de outra turma/aula)
    const permutados = Storage.getAll('permutas')
      .filter(p => p.aulaPermutaId === aulaId && p.status === 'agendada');

    // Combina inscritos regulares + alunos de reposição + alunos de permuta + aluno experimental
    const inscritosIds = new Set(inscritos.map(i => i.alunoId));
    const todosAlunos = [
      ...inscritos.map(i => ({ alunoId: i.alunoId, alunoNome: i.alunoNome, reposicao: false })),
      ...repostos.filter(r => !inscritosIds.has(r.alunoId))
                 .map(r => ({ alunoId: r.alunoId, alunoNome: r.alunoNome, reposicao: true, repId: r.id })),
      ...permutados.filter(p => !inscritosIds.has(p.alunoId))
                   .map(p => ({ alunoId: p.alunoId, alunoNome: p.alunoNome, permuta: true, permutaId: p.id })),
    ];
    // Alunos experimentais: aparecem na presença mesmo sem estar inscritos na grade
    expList.forEach(e => {
      if (!inscritosIds.has(e.id))
        todosAlunos.push({ alunoId: e.id, alunoNome: e.nome, reposicao: false, experimental: true });
    });

    const rows = todosAlunos.map((insc, idx) => {
      const reg      = presencas.find(p => p.aulaId === aulaId && p.alunoId === insc.alunoId);
      const presente = reg ? reg.presente : true;
      const repBadge = insc.reposicao
        ? `<span class="badge badge-warning" style="font-size:0.65rem;margin-left:6px;" title="Reposição">R</span>`
        : '';
      const permBadge = insc.permuta
        ? `<span class="badge" style="font-size:0.65rem;margin-left:6px;background:#6366f1;color:#fff;font-weight:700;" title="Permuta">🔁</span>`
        : '';
      const expBadge = insc.experimental
        ? `<span class="badge" style="font-size:0.65rem;margin-left:6px;background:#f59e0b;color:#fff;font-weight:700;" title="Aula experimental">🧪</span>`
        : '';
      const initials = insc.alunoNome.trim().split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
      return `
        <div class="presenca-row-card" id="prc-${idx}">
          <div class="presenca-row-aluno">
            <div class="presenca-avatar">${initials}</div>
            <span class="presenca-nome">${UI.escape(insc.alunoNome)}${repBadge}${permBadge}${expBadge}</span>
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
            data-permuta-id="${insc.permutaId || ''}"
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

      const sess = Auth.getSession();
      const logFields = {
        registradoPor:       sess?.nome   || '',
        registradoPorId:     sess?.id     || '',
        registradoPorPerfil: sess?.perfil || '',
        registradoEm:        new Date().toISOString(),
      };
      if (existing) {
        Storage.update('presencas', existing.id, { presente, ...logFields });
      } else {
        Storage.create('presencas', {
          aulaId,
          alunoId,
          alunoNome,
          turmaId:   aula.turmaId   || '',
          turmaNome: aula.turmaNome || '',
          data:      aula.data      || '',
          presente,
          ...logFields,
        });
      }
      // Marca reposição como concluída se aluno esteve presente
      if (reposicaoId && presente) {
        Storage.update('reposicoes', reposicaoId, { status: 'concluida' });
      }
      // Marca permuta como concluída se aluno esteve presente
      const permutaId = cb.dataset.permutaId;
      if (permutaId && presente) {
        Storage.update('permutas', permutaId, { status: 'concluida' });
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
        <div><strong>Turma:</strong> ${UI.escape(aula.turmaNome || '—')}</div>
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
      UI.toast('Nenhum aluno inscrito nesta turma.', 'warning');
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

  /* ------------------------------------------------------------------ */
  /*  Permuta de Aula                                                    */
  /* ------------------------------------------------------------------ */

  _modalPermuta(aulaId, alunoId, alunoNome, onConfirm) {
    const jaTemPermuta = Storage.getAll('permutas').find(p =>
      p.aulaOriginalId === aulaId && p.alunoId === alunoId && p.status === 'agendada'
    );
    if (jaTemPermuta) {
      UI.toast('Você já tem uma permuta agendada para esta aula.', 'warning');
      return;
    }

    const aula = Storage.getById(this.SK_AULA, aulaId);
    if (!aula) return;

    const [ay, am, ad] = (aula.data || '').split('-');
    const dataFmt = aula.data ? `${ad}/${am}/${ay}` : '—';

    const hoje   = new Date().toISOString().slice(0, 10);
    const limite = new Date(aula.data + 'T00:00:00');
    limite.setDate(limite.getDate() + 30);
    const limStr = limite.toISOString().slice(0, 10);

    // Aulas futuras com vagas disponíveis (qualquer turma, exceto a aula original)
    const disponiveis = Storage.getAll(this.SK_AULA)
      .filter(a =>
        a.id !== aulaId &&
        a.data > hoje &&
        a.data <= limStr &&
        a.status === 'agendada'
      )
      .map(a => {
        const inscritos = Storage.getAll(this.SK_INSCR)
          .filter(i => i.turmaId === a.turmaId && i.status === 'ativo').length;
        const vagas = a.vagas > 0 ? Math.max(0, a.vagas - inscritos) : null;
        return { ...a, _vagasDisp: vagas };
      })
      .filter(a => a._vagasDisp === null || a._vagasDisp > 0)
      .sort((a, b) => a.data.localeCompare(b.data) || (a.horarioInicio || '').localeCompare(b.horarioInicio || ''));

    const aulaOpts = disponiveis.map(a => {
      const [dy, dm, dd] = (a.data || '').split('-');
      const df  = `${dd}/${dm}/${dy}`;
      const hr  = [a.horarioInicio, a.horarioFim].filter(Boolean).join(' – ');
      const vgLabel = a._vagasDisp !== null ? `${a._vagasDisp} vaga${a._vagasDisp !== 1 ? 's' : ''}` : 'sem limite';
      const turmaInfo = a.turmaNome ? ` · ${a.turmaNome}` : '';
      return `<option value="${a.id}">${df} · ${hr}${turmaInfo} · ${vgLabel}</option>`;
    }).join('');

    const semVaga = !disponiveis.length;

    const content = `
      <div class="info-box" style="margin-bottom:12px;">
        <div><strong>Aluno:</strong> ${UI.escape(alunoNome)}</div>
        <div><strong>Aula a permutar:</strong> ${UI.escape(aula.titulo)} — ${dataFmt}</div>
        <div><strong>Turma:</strong> ${UI.escape(aula.turmaNome || '—')}</div>
      </div>
      ${!semVaga ? `
        <div class="form-group">
          <label class="form-label">Escolha a aula substituta <span class="required-star">*</span></label>
          <select id="perm-aula-sel" class="form-select">
            <option value="">— Selecionar aula —</option>
            ${aulaOpts}
          </select>
          <div class="form-hint" style="margin-top:4px;">Aulas com vagas disponíveis nos próximos 30 dias.</div>
        </div>` : `
        <div class="empty-state" style="padding:16px 0;">
          <div class="empty-icon">📅</div>
          <div class="empty-title" style="font-size:14px;">Nenhuma aula disponível</div>
          <div class="empty-desc">Não há aulas com vagas disponíveis nos próximos 30 dias para permuta.</div>
        </div>`}`;

    UI.openModal({
      title:        '🔁 Permutar Aula',
      content,
      confirmLabel: 'Confirmar Permuta',
      cancelLabel:  !semVaga ? 'Cancelar' : 'Fechar',
      hideFooter:   semVaga,
      onConfirm:    () => onConfirm(aula),
    });
  },

  solicitarPermuta(aulaId) {
    const session   = Auth.getSession();
    const alunoId   = session?.alunoId || session?.id;
    const alunoNome = session?.nome;
    this._modalPermuta(aulaId, alunoId, alunoNome, (aula) => {
      this._confirmarPermuta(aulaId, alunoId, alunoNome, aula);
    });
  },

  _confirmarPermuta(aulaOriginalId, alunoId, alunoNome, aulaOriginal) {
    const sel = document.getElementById('perm-aula-sel');
    if (!sel?.value) { UI.toast('Selecione uma aula substituta.', 'warning'); return; }

    const aulaPermuta = Storage.getById(this.SK_AULA, sel.value);
    if (!aulaPermuta) return;

    const sess = Auth.getSession();
    Storage.create('permutas', {
      alunoId,
      alunoNome,
      turmaId:             aulaOriginal.turmaId   || '',
      turmaNome:           aulaOriginal.turmaNome  || '',
      aulaOriginalId,
      aulaOriginalData:    aulaOriginal.data,
      aulaPermutaId:       aulaPermuta.id,
      aulaPermutaData:     aulaPermuta.data,
      aulaPermutaTurma:    aulaPermuta.turmaNome   || '',
      status:              'agendada',
      registradoPor:       sess?.nome   || '',
      registradoPorId:     sess?.id     || '',
      registradoPorPerfil: sess?.perfil || '',
      registradoEm:        new Date().toISOString(),
    });

    UI.toast(`Permuta agendada para ${aulaPermuta.data.split('-').reverse().join('/')}!`, 'success');
    UI.closeModal();
    if (typeof PortalModule !== 'undefined') PortalModule._reRender();
    else this._reRenderContent?.();
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
    const turmas = Storage.getAll(this.SK).filter(t => t.tipo !== 'avulsa').sort((a,b) => a.nome.localeCompare(b.nome));

    const arenaOpts = `<option value="">Todas as arenas</option>` +
      arenas.map(a => `<option value="${a.id}" ${this._state.calFilterArena===a.id?'selected':''}>${UI.escape(a.nome)}</option>`).join('');
    const turmaOpts = `<option value="">Todas as turmas</option>` +
      `<option value="__avulsa__" ${this._state.calFilterTurma==='__avulsa__'?'selected':''}>🏸 Avulsas (sem turma)</option>` +
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
      if (this._state.calFilterTurma === '__avulsa__') { if (a.turmaId && !a.avulsa) return false; }
      else if (this._state.calFilterTurma && a.turmaId !== this._state.calFilterTurma) return false;
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
              ${!a.turmaId ? `<span class="cal-avulsa-badge">Avulsa</span>` : ''}
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
            ${!a.turmaId      ? `<span class="cal-avulsa-badge">Avulsa</span>`  : ''}
            ${a.turmaNome     ? `<span>🏷️ ${UI.escape(a.turmaNome)}</span>`     : ''}
            ${a.professorNome ? `<span>👤 ${UI.escape(a.professorNome)}</span>` : ''}
            ${local !== '—'   ? `<span>📍 ${UI.escape(local)}</span>`           : ''}
            ${inscritos       ? `<span>👥 ${inscritos} aluno${inscritos!==1?'s':''}</span>` : ''}
          </div>
        </div>
        <div class="cal-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();TurmasModule.abrirPresencaRapida('${a.id}')" title="Presença">📋</button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();TurmasModule.openModalAula('${a.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger" onclick="event.stopPropagation();TurmasModule.deleteAula('${a.id}')" title="Excluir">🗑️</button>
        </div>
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
      title:        id ? `Editar Turma — ${turma.nome}` : 'Nova Turma',
      content,
      confirmLabel: id ? 'Salvar alterações' : 'Criar Turma',
      onConfirm:    () => this.saveTurma(id),
      wide:         true,   // formulário longo — modal larga evita overflow
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
      // Verifica se o professor mudou para propagar às aulas futuras
      const turmaAntes = Storage.getById(this.SK, id);
      const profMudou  = turmaAntes && turmaAntes.professorId !== record.professorId;

      Storage.update(this.SK, id, record);

      // Propaga professor para aulas futuras (agendadas a partir de hoje)
      if (profMudou && record.professorId) {
        const hoje      = new Date().toISOString().slice(0, 10);
        const aulasFut  = Storage.getAll(this.SK_AULA)
          .filter(a => a.turmaId === id && a.status === 'agendada' && (a.data || '') >= hoje);
        aulasFut.forEach(a => Storage.update(this.SK_AULA, a.id, {
          professorId:   record.professorId,
          professorNome: record.professorNome,
        }));
        const n = aulasFut.length;
        UI.toast(
          `Turma "${record.nome}" atualizada! Professor propagado para ${n} aula${n !== 1 ? 's' : ''} futura${n !== 1 ? 's' : ''}.`,
          'success'
        );
      } else {
        UI.toast(`Turma "${record.nome}" atualizada!`, 'success');
      }
    } else {
      Storage.create(this.SK, record);
      UI.toast(`Turma "${record.nome}" criada!`, 'success');
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

    const aulas      = Storage.getAll(this.SK_AULA).filter(r => r.turmaId === id);
    const inscricoes = Storage.getAll(this.SK_INSCR).filter(r => r.turmaId === id);
    const presencas  = Storage.getAll('presencas').filter(p => aulas.some(a => a.id === p.aulaId));
    const aulaAlunos = Storage.getAll('aulaAlunos').filter(aa => aulas.some(a => a.id === aa.aulaId));
    const reposicoes = Storage.getAll('reposicoes').filter(r => r.turmaId === id);

    const partes = [];
    if (aulas.length)      partes.push(`${aulas.length} aula${aulas.length !== 1 ? 's' : ''}`);
    if (inscricoes.length) partes.push(`${inscricoes.length} inscrição${inscricoes.length !== 1 ? 'ões' : ''}`);
    if (presencas.length)  partes.push(`${presencas.length} registro${presencas.length !== 1 ? 's' : ''} de presença`);
    if (aulaAlunos.length) partes.push(`${aulaAlunos.length} alocação${aulaAlunos.length !== 1 ? 'ões' : ''} de alunos`);
    if (reposicoes.length) partes.push(`${reposicoes.length} reposição${reposicoes.length !== 1 ? 'ões' : ''}`);

    const total = aulas.length + inscricoes.length;

    if (total > 0) {
      const detalhe = partes.length ? `\n\n• ${partes.join('\n• ')}` : '';
      // Passo 1: oferecer excluir tudo
      const excluirTudo = await UI.confirm(
        `"${t.nome}" possui registros vinculados:${detalhe}\n\nDeseja EXCLUIR a turma e todos esses registros permanentemente?`,
        'Excluir tudo?',
        'Sim, excluir tudo'
      );

      if (excluirTudo) {
        // Passo 2: confirmação extra antes de apagar tudo
        const confirma = await UI.confirm(
          `⚠️ Isso apagará a turma e todos os ${partes.join(', ')} vinculados. Esta ação não pode ser desfeita.`,
          'Confirmar exclusão total',
          'Confirmar'
        );
        if (!confirma) return;

        reposicoes.forEach(r  => Storage.delete('reposicoes',  r.id));
        presencas.forEach(p   => Storage.delete('presencas',   p.id));
        aulaAlunos.forEach(aa => Storage.delete('aulaAlunos',  aa.id));
        aulas.forEach(a       => Storage.delete(this.SK_AULA,  a.id));
        inscricoes.forEach(i  => Storage.delete(this.SK_INSCR, i.id));
        Storage.delete(this.SK, id);
        UI.toast(`Turma "${t.nome}" e todos os seus registros foram excluídos.`, 'success');
        this.render();
        return;
      }

      // Passo 1b: se não quis excluir tudo, oferece encerrar
      const encerrar = await UI.confirm(
        `Deseja encerrar a turma "${t.nome}" em vez disso? Os registros são mantidos.`,
        'Encerrar turma',
        'Encerrar'
      );
      if (!encerrar) return;
      Storage.update(this.SK, id, { status: 'encerrada' });
      UI.toast(`Turma "${t.nome}" encerrada.`, 'success');
      this.render();
      return;
    }

    const ok = await UI.confirm(
      `Excluir a turma "${t.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Turma'
    );
    if (!ok) return;
    Storage.delete(this.SK, id);
    UI.toast(`Turma "${t.nome}" excluída.`, 'success');
    this.render();
  },

  async deleteAula(id) {
    const aula = Storage.getById(this.SK_AULA, id);
    if (!aula) return;

    // Verifica se há presenças registradas
    const presencas = Storage.getAll('presencas').filter(p => p.aulaId === id);
    if (presencas.length > 0) {
      const ok = await UI.confirm(
        `A aula "${aula.titulo}" (${aula.data || '—'}) possui ${presencas.length} registro(s) de presença.\n\nDeseja cancelar a aula em vez de excluir, preservando o histórico?`,
        'Excluir Aula',
        'Cancelar aula'
      );
      if (!ok) return;
      Storage.update(this.SK_AULA, id, { status: 'cancelada' });
      UI.toast(`Aula "${aula.titulo}" cancelada.`, 'success');
      this._reRenderContent();
      return;
    }

    const ok = await UI.confirm(
      `Excluir a aula "${aula.titulo}"${aula.data ? ' de ' + this._fmtDataLonga(aula.data) : ''}? Esta ação não pode ser desfeita.`,
      'Excluir Aula'
    );
    if (!ok) return;
    Storage.delete(this.SK_AULA, id);
    UI.toast(`Aula "${aula.titulo}" excluída.`, 'success');
    this._reRenderContent();
  },

  /* ================================================================== */
  /*  Gerar aulas a partir do calendário da turma                        */
  /* ================================================================== */

  async openGerarAulas(turmaId) {
    const t = Storage.getById(this.SK, turmaId);
    if (!t) return;

    const diasNormGerar = this._normalizeDias(t);
    if (!diasNormGerar.length) {
      UI.toast('Configure os dias da semana na grade antes de gerar aulas.', 'warning');
      return;
    }

    // Guard: se a turma já tem aulas geradas, exige confirmação antes de prosseguir
    const aulasExistentes = Storage.getAll(this.SK_AULA).filter(a => a.turmaId === turmaId);
    if (aulasExistentes.length > 0) {
      const ok = await UI.confirm(
        `Esta turma já possui ${aulasExistentes.length} aula${aulasExistentes.length !== 1 ? 's' : ''} gerada${aulasExistentes.length !== 1 ? 's' : ''}. Ao gerar novamente, apenas datas ainda sem aula serão adicionadas (as existentes não são alteradas). Deseja continuar?`,
        'Aulas já geradas',
        'Continuar assim mesmo'
      );
      if (!ok) return;
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
    let skipped = 0;
    const cur = new Date(ini + 'T12:00:00');
    const end = new Date(fim + 'T12:00:00');
    const MAX = 365;

    while (cur <= end && count < MAX) {
      const diaSemJS = cur.getDay();
      if (diasSel.includes(diaSemJS)) {
        const dataStr = this._isoDate(cur);
        if (!existentes.has(dataStr)) {
          const horario = diasHorasMap[diaSemJS] || { inicio: t.horarioInicio || '', fim: t.horarioFim || '' };

          // Verificar conflito de quadra ou professor (pula se houver)
          const conflitoQ = this._verificarConflitoQuadra(t.quadraId, dataStr, horario.inicio, horario.fim);
          const conflitoP = this._verificarConflitoProfessor(t.professorId, dataStr, horario.inicio, horario.fim);

          if (conflitoQ || conflitoP) {
            skipped++;
          } else {
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
      }
      cur.setDate(cur.getDate() + 1);
    }

    UI.closeModal();
    const skipMsg = skipped > 0 ? ` (${skipped} ignorada${skipped !== 1 ? 's' : ''} por conflito de quadra/professor)` : '';
    UI.toast(`${count} aula${count !== 1 ? 's' : ''} gerada${count !== 1 ? 's' : ''} com sucesso!${skipMsg}`, count > 0 ? 'success' : 'warning');
    // Vai para o calendário no mês de início
    const dIni = new Date(ini + 'T12:00:00');
    this._state.tab    = 'calendario';
    this._state.calAno = dIni.getFullYear();
    this._state.calMes = dIni.getMonth();
    this.render();
  },

  /* ================================================================== */
  /*  Gerar Aulas Avulsas em Lote (a partir de dias + período)          */
  /* ================================================================== */

  openGerarAulasAvulsas() {
    const professores = Storage.getAll('professores').filter(p => p.status === 'ativo');
    const profOpts = `<option value="">— Selecionar —</option>` +
      professores.map(p =>
        `<option value="${p.id}" data-nome="${UI.escape(p.nome)}">${UI.escape(p.nome)}</option>`
      ).join('');

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOpts = `<option value="">— Selecionar —</option>` +
      arenas.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}">${UI.escape(a.nome)}</option>`
      ).join('');

    const nivelOpts = ListasService.opts('aulas_nivel', '');
    const hoje = this._isoDate(new Date());

    const DIAS = [
      { k: 'seg', l: 'Seg' }, { k: 'ter', l: 'Ter' }, { k: 'qua', l: 'Qua' },
      { k: 'qui', l: 'Qui' }, { k: 'sex', l: 'Sex' }, { k: 'sab', l: 'Sáb' },
      { k: 'dom', l: 'Dom' },
    ];
    const diasHtml = DIAS.map(d =>
      `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none;">
         <input type="checkbox" class="gav-dia" value="${d.k}"
           style="width:15px;height:15px;cursor:pointer;accent-color:var(--color-primary,#3b9e8f);"
           onchange="TurmasModule._prevGerarAvulsas()" />
         <span style="font-size:13px;font-weight:600;">${d.l}</span>
       </label>`
    ).join('');

    const content = `
      <div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="gav-titulo">Título <span class="required-star">*</span></label>
            <input id="gav-titulo" type="text" class="form-input" placeholder="ex: Aula Avulsa" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="gav-prof">Professor</label>
            <select id="gav-prof" class="form-select">${profOpts}</select>
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="gav-arena">Arena</label>
            <select id="gav-arena" class="form-select" onchange="TurmasModule._onArenaChangeGav()">${arenaOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="gav-quadra">Quadra</label>
            <select id="gav-quadra" class="form-select">
              <option value="">— Selecionar arena primeiro —</option>
            </select>
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="gav-nivel">Nível</label>
            <select id="gav-nivel" class="form-select">${nivelOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="gav-vagas">Vagas</label>
            <input id="gav-vagas" type="number" class="form-input" min="1" max="30" value="4" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="gav-hi">Horário início <span class="required-star">*</span></label>
            <input id="gav-hi" type="time" class="form-input" oninput="TurmasModule._prevGerarAvulsas()" />
          </div>
          <div class="form-group">
            <label class="form-label" for="gav-hf">Horário fim</label>
            <input id="gav-hf" type="time" class="form-input" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Dias da semana <span class="required-star">*</span></label>
          <div style="display:flex;flex-wrap:wrap;gap:16px;padding:10px 12px;
                      background:var(--bg-secondary);border-radius:8px;
                      border:1.5px solid var(--input-border);">
            ${diasHtml}
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="gav-ini">De <span class="required-star">*</span></label>
            <input id="gav-ini" type="date" class="form-input" value="${hoje}"
              oninput="TurmasModule._prevGerarAvulsas()" />
          </div>
          <div class="form-group">
            <label class="form-label" for="gav-fim">Até <span class="required-star">*</span></label>
            <input id="gav-fim" type="date" class="form-input"
              oninput="TurmasModule._prevGerarAvulsas()" />
          </div>
        </div>
        <div id="gav-preview" style="font-size:12px;color:var(--text-muted);padding:10px 12px;
             background:var(--bg-secondary);border-radius:8px;min-height:32px;display:none;"></div>
      </div>`;

    UI.openModal({
      title:        '📅 Gerar Aulas Avulsas em Lote',
      content,
      confirmLabel: 'Gerar Aulas',
      onConfirm:    () => this._gerarAulasAvulsas(),
    });
  },

  _onArenaChangeGav() {
    const arenaId = document.getElementById('gav-arena')?.value;
    const sel     = document.getElementById('gav-quadra');
    if (!sel) return;
    if (!arenaId) {
      sel.innerHTML = '<option value="">— Selecionar arena primeiro —</option>';
      return;
    }
    const quadras = Storage.getAll('quadras').filter(q => q.arenaId === arenaId && q.status === 'disponivel');
    sel.innerHTML = '<option value="">— Selecionar quadra —</option>' +
      quadras.map(q =>
        `<option value="${q.id}" data-nome="${UI.escape(q.nome)}">${UI.escape(q.nome)}</option>`
      ).join('');
  },

  _prevGerarAvulsas() {
    const ini     = document.getElementById('gav-ini')?.value;
    const fim     = document.getElementById('gav-fim')?.value;
    const preview = document.getElementById('gav-preview');
    if (!preview) return;

    const diasSel = [...document.querySelectorAll('.gav-dia:checked')].map(cb => cb.value);
    if (!ini || !fim || !diasSel.length) { preview.style.display = 'none'; return; }

    const diasJS = this._diasJS(diasSel);
    const count  = this._contarOcorrencias(ini, fim, diasJS);

    const dates = [];
    const cur = new Date(ini + 'T12:00:00');
    const end = new Date(fim + 'T12:00:00');
    while (cur <= end && dates.length < 6) {
      if (diasJS.includes(cur.getDay()))
        dates.push(cur.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }));
      cur.setDate(cur.getDate() + 1);
    }
    const extra = count > 6 ? ` +${count - 6} mais…` : '';
    preview.style.display = 'block';
    preview.textContent   = `📅 ${count} aula${count !== 1 ? 's' : ''}: ${dates.join(' · ')}${extra}`;
  },

  _gerarAulasAvulsas() {
    const titulo    = document.getElementById('gav-titulo')?.value?.trim();
    const profSel   = document.getElementById('gav-prof');
    const arenaSel  = document.getElementById('gav-arena');
    const quadraSel = document.getElementById('gav-quadra');
    const nivelSel  = document.getElementById('gav-nivel');
    const vagas     = parseInt(document.getElementById('gav-vagas')?.value) || 4;
    const hi        = document.getElementById('gav-hi')?.value;
    const hf        = document.getElementById('gav-hf')?.value || '';
    const ini       = document.getElementById('gav-ini')?.value;
    const fim       = document.getElementById('gav-fim')?.value;
    const diasSel   = [...document.querySelectorAll('.gav-dia:checked')].map(cb => cb.value);

    if (!titulo)         { UI.toast('Informe o título da aula.', 'warning');              return; }
    if (!hi)             { UI.toast('Informe o horário de início.', 'warning');           return; }
    if (!diasSel.length) { UI.toast('Selecione ao menos um dia da semana.', 'warning');   return; }
    if (!ini || !fim)    { UI.toast('Informe o período (De / Até).', 'warning');          return; }
    if (ini > fim)       { UI.toast('A data início deve ser anterior ao fim.', 'warning'); return; }

    const professorId   = profSel?.value  || '';
    const professorNome = profSel?.options[profSel?.selectedIndex]?.dataset?.nome   || '';
    const arenaId       = arenaSel?.value || '';
    const arenaNome     = arenaSel?.options[arenaSel?.selectedIndex]?.dataset?.nome || '';
    const quadraId      = quadraSel?.value || '';
    const quadraNome    = quadraSel?.options[quadraSel?.selectedIndex]?.dataset?.nome || '';
    const nivel         = nivelSel?.value  || '';

    const diasJS = this._diasJS(diasSel);
    let criadas = 0, conflitos = 0;
    const cur = new Date(ini + 'T12:00:00');
    const end = new Date(fim + 'T12:00:00');
    let iter = 0;

    while (cur <= end && iter++ < 400) {
      if (diasJS.includes(cur.getDay())) {
        const dataStr = this._isoDate(cur);
        const confQ   = quadraId    ? this._verificarConflitoQuadra(quadraId, dataStr, hi, hf)       : false;
        const confP   = professorId ? this._verificarConflitoProfessor(professorId, dataStr, hi, hf) : false;

        if (confQ || confP) {
          conflitos++;
        } else {
          Storage.create(this.SK_AULA, {
            titulo, professorId, professorNome, arenaId, arenaNome,
            quadraId, quadraNome, nivel, vagas,
            horarioInicio: hi, horarioFim: hf,
            data: dataStr, status: 'agendada',
            avulsa: true, turmaId: null,
          });
          criadas++;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    UI.closeModal();
    const skipMsg = conflitos > 0
      ? ` (${conflitos} ignorada${conflitos !== 1 ? 's' : ''} por conflito)`
      : '';
    UI.toast(
      `${criadas} aula${criadas !== 1 ? 's' : ''} avulsa${criadas !== 1 ? 's' : ''} gerada${criadas !== 1 ? 's' : ''}!${skipMsg}`,
      criadas > 0 ? 'success' : 'warning'
    );
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

    // Mini-turmas avulsas não aparecem no seletor (são criadas automaticamente)
    const turmas = Storage.getAll(this.SK).filter(t => t.tipo !== 'avulsa');
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
      <input id="au-current-id" type="hidden" value="${id || ''}" />
      <input id="au-mini-turma-id" type="hidden" value="${(aula?.avulsa && aula?.turmaId) ? aula.turmaId : ''}" />
      <div class="au-modal-layout">
        <div class="au-form-col">
          <div class="form-grid">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label" for="au-titulo">Título <span class="required-star">*</span></label>
                <input id="au-titulo" type="text" class="form-input"
                  placeholder="ex: Aula de Saque" value="${v('titulo')}" required autocomplete="off" />
              </div>
              <div class="form-group">
                <label class="form-label" for="au-turma">Turma</label>
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
                <select id="au-prof" class="form-select"
                  onchange="TurmasModule._updateDayViewModal()">${profOpts}</select>
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
                <select id="au-quadra" class="form-select"
                  onchange="TurmasModule._updateDayViewModal()">${quadraOptsAu}</select>
              </div>
            </div>

            <div id="au-data-wrap" class="form-group" ${aula && aula.turmaId && !aula.avulsa ? 'style="display:none"' : ''}>
              <label class="form-label" for="au-data">Data <span class="required-star">*</span></label>
              <input id="au-data" type="date" class="form-input" value="${v('data')}"
                onchange="TurmasModule._updateDayViewModal()" />
            </div>
            <div id="au-data-info" ${aula && aula.turmaId && !aula.avulsa ? '' : 'style="display:none"'}>
              <div class="cadastro-tab-info">
                📅 Aula vinculada à grade — as datas são geradas automaticamente pelo botão <strong>Gerar Aulas</strong> na aba Grade.
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label" for="au-hi">Horário início</label>
                <input id="au-hi" type="time" class="form-input" value="${v('horarioInicio')}"
                  onchange="TurmasModule._updateDayViewModal()" />
              </div>
              <div class="form-group">
                <label class="form-label" for="au-hf">Horário fim</label>
                <input id="au-hf" type="time" class="form-input" value="${v('horarioFim')}"
                  onchange="TurmasModule._updateDayViewModal()" />
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

            <!-- 🧪 Aula Experimental -->
            <div class="form-group" style="padding-top:12px;border-top:1px solid var(--card-border);margin-top:4px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;">
                <input type="checkbox" id="au-experimental"
                  ${aula?.experimental ? 'checked' : ''}
                  onchange="TurmasModule._onExperimentalChange()"
                  style="width:16px;height:16px;cursor:pointer;flex-shrink:0;" />
                🧪 Aula Experimental (avaliação de nível)
              </label>
            </div>
            <div id="au-exp-section" style="${aula?.experimental ? '' : 'display:none'}">
              ${(() => {
                const alunosExp = Storage.getAll('alunos')
                  .filter(a => a.status === 'ativo')
                  .sort((a, b) => a.nome.localeCompare(b.nome));
                const jaSelect = aula?.alunosExperimentais?.map(e => e.id)
                  || (aula?.alunoExperimentalId ? [aula.alunoExperimentalId] : []);
                const checkboxes = alunosExp.map(a => `
                  <label id="au-exp-item-${a.id}" class="exp-aluno-item"
                    style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:7px;
                           cursor:pointer;font-size:13px;transition:background .12s;
                           ${jaSelect.includes(a.id) ? 'background:var(--color-primary-light,#e6f4f2);font-weight:600;' : ''}">
                    <input type="checkbox" class="au-exp-chk"
                      value="${a.id}" data-nome="${UI.escape(a.nome)}"
                      ${jaSelect.includes(a.id) ? 'checked' : ''}
                      onchange="TurmasModule._onExpAlunoChange(this)"
                      style="width:15px;height:15px;cursor:pointer;accent-color:var(--color-primary,#3b9e8f);flex-shrink:0;" />
                    ${UI.escape(a.nome)}
                  </label>`).join('');
                return `
                <div class="form-group">
                  <label class="form-label">💰 Cobrança da aula</label>
                  <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:6px;">
                    <div style="flex:1;min-width:110px;">
                      <label style="font-size:11px;color:var(--text-muted);margin-bottom:3px;display:block;">Valor (R$)</label>
                      <input type="number" id="au-exp-valor" class="form-input" min="0" step="0.01"
                        value="${aula?.valorExperimental ?? ''}" placeholder="0,00"
                        style="height:38px;" />
                    </div>
                    <div style="flex:1;min-width:140px;">
                      <label style="font-size:11px;color:var(--text-muted);margin-bottom:3px;display:block;">Modalidade</label>
                      <select id="au-exp-modalidade" class="form-input" style="height:38px;">
                        <option value="pendente" ${!aula?.modalidadeExperimental || aula?.modalidadeExperimental === 'pendente' ? 'selected' : ''}>💳 Cobrar (pendente)</option>
                        <option value="cortesia"  ${aula?.modalidadeExperimental === 'cortesia' ? 'selected' : ''}>🎁 Cortesia (gratuita)</option>
                      </select>
                    </div>
                  </div>
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text-secondary);">
                    <input type="checkbox" id="au-exp-compensar"
                      ${aula?.compensarSeFechar ? 'checked' : ''}
                      style="width:13px;height:13px;" />
                    Compensar na 1ª mensalidade se fechar matrícula
                  </label>
                </div>
                <div class="form-group">
                  <label class="form-label">Alunos avaliados <span class="required-star">*</span></label>
                  <input type="text" id="au-exp-search" class="form-input"
                    placeholder="🔍 Buscar aluno…" autocomplete="off"
                    oninput="TurmasModule._filtrarAlunosExpModal(this.value)"
                    style="margin-bottom:6px;" />
                  <div id="au-exp-alunos-list"
                    style="max-height:160px;overflow-y:auto;border:1.5px solid var(--input-border);
                           border-radius:8px;padding:4px;">
                    ${checkboxes}
                  </div>
                  <div id="au-exp-sel-count" style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                    ${jaSelect.length} aluno${jaSelect.length !== 1 ? 's' : ''} selecionado${jaSelect.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="au-exp-notas">Notas gerais da sessão</label>
                  <textarea id="au-exp-notas" class="form-textarea" rows="2"
                    placeholder="Observações gerais da aula experimental…">${aula ? UI.escape(aula.notasExperimental || '') : ''}</textarea>
                </div>
                `;
              })()}
            </div>

            ${!isEdit ? (() => {
              const alunosDisp = Storage.getAll('alunos')
                .filter(a => a.status === 'ativo' && AlunoModule.temMatriculaAtiva(a.id))
                .sort((a, b) => a.nome.localeCompare(b.nome));
              if (!alunosDisp.length) return '';
              return `
              <div class="aluno-secao-titulo" style="margin-top:12px;">👥 Alunos — opcional</div>
              <div class="form-group">
                <input type="text" id="au-alunos-search" class="form-input"
                  placeholder="🔍 Buscar aluno…" autocomplete="off"
                  oninput="TurmasModule._filtrarAlunosAulaModal(this.value)"
                  style="margin-bottom:6px;" />
                <select id="au-alunos-sel" class="form-select" multiple size="4"
                  style="height:auto;min-height:90px;">
                  ${alunosDisp.map(a =>
                    `<option value="${a.id}" data-nome="${UI.escape(a.nome)}">${UI.escape(a.nome)}</option>`
                  ).join('')}
                </select>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                  Segure Ctrl (ou ⌘) para selecionar mais de um.
                </div>
              </div>`;
            })() : ''}

          </div><!-- /form-grid -->
        </div><!-- /au-form-col -->

        <!-- ── Day-view panel ────────────────────────── -->
        <div class="au-dayview-col">
          <div class="au-dayview-header">📅 Agenda do dia</div>
          <div id="au-dayview" class="au-dayview-wrap">
            <div style="padding:24px 8px;text-align:center;color:var(--text-muted);font-size:12px;line-height:1.6;">
              Selecione uma data para<br>visualizar a agenda.
            </div>
          </div>
        </div>

      </div><!-- /au-modal-layout -->`;

    UI.openModal({
      title:        isEdit ? `Editar Aula — ${aula.titulo}` : 'Nova Aula',
      content,
      confirmLabel: isEdit ? 'Salvar' : 'Agendar',
      onConfirm:    () => this.saveAula(id),
      wide:         true,
    });
    // Expand to xl and render day-view immediately if date already filled
    requestAnimationFrame(() => {
      document.getElementById('modal-dialog')?.classList.add('modal-xl');
      this._updateDayViewModal();
    });
    // Aula vinculada à grade em modo edição: herda dados atuais da grade
    // (professor, arena, quadra, horários, nível, esporte, tipoplano)
    if (isEdit && aula.turmaId && !aula.avulsa) {
      setTimeout(() => TurmasModule._onTurmaChangeAula(), 150);
    }
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

    const aulaAtual        = id ? Storage.getById(this.SK_AULA, id) : null;
    const isExperimental   = !!document.getElementById('au-experimental')?.checked;
    const alunosExperimentais = Array.from(
      document.querySelectorAll('.au-exp-chk:checked')
    ).map(cb => ({ id: cb.value, nome: cb.dataset.nome || '' }));

    // Pelo menos 1 aluno obrigatório quando experimental está marcado
    if (isExperimental && !alunosExperimentais.length) {
      document.getElementById('au-exp-alunos-list')?.classList.add('error');
      UI.toast('🧪 Selecione ao menos um aluno para aula experimental.', 'warning');
      return;
    }
    document.getElementById('au-exp-alunos-list')?.classList.remove('error');

    const record = {
      titulo:               tituloEl.value.trim(),
      nivel:                g('nivel')     ? g('nivel').value                    : 'iniciante',
      esporte:              g('esporte')   ? g('esporte').value                  : '',
      tipoplano:            g('tipoplano') ? g('tipoplano').value                : '',
      turmaId, turmaNome, professorId, professorNome, arenaId, arenaNome, quadraId, quadraNome,
      data,
      horarioInicio,
      horarioFim,
      vagas:                g('vagas')     ? parseInt(g('vagas').value, 10) || 4 : 4,
      status:               g('status')    ? g('status').value                   : 'agendada',
      observacoes:          g('obs')       ? g('obs').value.trim()               : '',
      experimental:          isExperimental,
      alunosExperimentais:   alunosExperimentais,
      alunoExperimentalId:   alunosExperimentais[0]?.id   || '',  // compat legado
      alunoExperimentalNome: alunosExperimentais[0]?.nome || '',  // compat legado
      notasExperimental:     document.getElementById('au-exp-notas')?.value.trim() || '',
      avaliacaoStatus:       aulaAtual?.avaliacaoStatus || (isExperimental ? 'pendente' : ''),
      valorExperimental:     isExperimental ? (parseFloat(document.getElementById('au-exp-valor')?.value) || 0) : 0,
      modalidadeExperimental:isExperimental ? (document.getElementById('au-exp-modalidade')?.value || 'pendente') : '',
      compensarSeFechar:     isExperimental ? !!document.getElementById('au-exp-compensar')?.checked : false,
    };

    // ── Verificar conflito de quadra (bloqueia) ─────────────────────
    if (quadraId && data && horarioInicio) {
      const conflitoQ = this._verificarConflitoQuadra(quadraId, data, horarioInicio, horarioFim, id || null);
      if (conflitoQ) {
        UI.toast(
          `🚫 Quadra já ocupada neste horário por "${conflitoQ.titulo || conflitoQ.turmaNome}". ` +
          `Escolha outro horário ou outra quadra.`,
          'error'
        );
        return;
      }
    }

    // ── Verificar conflito de professor (bloqueia) ───────────────────
    if (professorId && data && horarioInicio) {
      const conflitoP = this._verificarConflitoProfessor(professorId, data, horarioInicio, horarioFim, id || null);
      if (conflitoP) {
        UI.toast(
          `🚫 Professor já está alocado neste horário em "${conflitoP.titulo || conflitoP.turmaNome}". ` +
          `Escolha outro professor ou horário.`,
          'error'
        );
        return;
      }
    }

    if (id) {
      // Se é edição de mini-turma avulsa: sincroniza também a turma-pai
      const miniTurmaId = document.getElementById('au-mini-turma-id')?.value || '';
      if (isAvulsa && miniTurmaId) {
        Storage.update(this.SK, miniTurmaId, {
          nome:          record.titulo,
          nivel:         record.nivel,
          esporte:       record.esporte,
          tipoplano:     record.tipoplano,
          professorId:   record.professorId,
          professorNome: record.professorNome,
          arenaId:       record.arenaId,
          arenaNome:     record.arenaNome,
          quadraId:      record.quadraId   || '',
          quadraNome:    record.quadraNome || '',
          horarioInicio: record.horarioInicio,
          horarioFim:    record.horarioFim,
          vagas:         record.vagas,
          observacoes:   record.observacoes,
        });
        // Preserva vínculo com a mini-turma existente
        record.turmaId   = miniTurmaId;
        record.turmaNome = '';
        record.avulsa    = true;
      }
      Storage.update(this.SK_AULA, id, record);
      UI.toast(`Aula "${record.titulo}" atualizada!`, 'success');
    } else {
      if (isAvulsa) {
        // Cria mini-turma silenciosa (tipo: 'avulsa') para esta série
        const minTurma = Storage.create(this.SK, {
          nome:          record.titulo,
          tipo:          'avulsa',
          nivel:         record.nivel         || '',
          esporte:       record.esporte       || '',
          tipoplano:     record.tipoplano     || '',
          professorId:   record.professorId   || '',
          professorNome: record.professorNome || '',
          arenaId:       record.arenaId       || '',
          arenaNome:     record.arenaNome     || '',
          quadraId:      record.quadraId      || '',
          quadraNome:    record.quadraNome    || '',
          horarioInicio: record.horarioInicio || '',
          horarioFim:    record.horarioFim    || '',
          vagas:         record.vagas         || 4,
          status:        'ativa',
          diasSemana:    [],
          observacoes:   record.observacoes   || '',
        });
        if (minTurma) {
          record.turmaId   = minTurma.id;
          record.turmaNome = '';      // vazio → badge "Avulsa" continua aparecendo
          record.avulsa    = true;    // flag para roteamento de presença, botões etc.
        }
      }

      const novaAula = Storage.create(this.SK_AULA, record);

      // Alunos selecionados no form
      if (novaAula) {
        const alunosSel = document.getElementById('au-alunos-sel');
        if (alunosSel) {
          Array.from(alunosSel.selectedOptions).forEach(opt => {
            if (record.turmaId && record.avulsa) {
              // Mini-turma avulsa: matrícula na série (turmaAlunos) — respeita janela de contrato
              Storage.create(this.SK_INSCR, {
                turmaId:       record.turmaId,
                turmaNome:     record.titulo,
                alunoId:       opt.value,
                alunoNome:     opt.dataset.nome || opt.textContent.trim(),
                dataInscricao: new Date().toISOString(),
                status:        'ativo',
              });
            } else if (record.turmaId) {
              // Aula vinculada à grade: inscreve na grade (turmaAlunos)
              // → aluno aparecerá em TODAS as aulas da grade dentro do período contratado
              // → filtrado automaticamente por _matriculaAtivaEmData em getAlunosInscritos
              Storage.create(this.SK_INSCR, {
                turmaId:       record.turmaId,
                turmaNome:     record.turmaNome || record.titulo,
                alunoId:       opt.value,
                alunoNome:     opt.dataset.nome || opt.textContent.trim(),
                dataInscricao: new Date().toISOString(),
                status:        'ativo',
              });
            } else {
              // Legacy (aula sem turmaId): alocação direta na aula
              Storage.create('aulaAlunos', {
                aulaId:    novaAula.id,
                alunoId:   opt.value,
                alunoNome: opt.dataset.nome || opt.textContent.trim(),
                status:    'ativo',
              });
            }
          });
        }
      }
      UI.toast(`Aula "${record.titulo}" agendada!`, 'success');
    }

    // ── Lançamentos financeiros para alunos experimentais ───────────────
    if (isExperimental && alunosExperimentais.length) {
      const aulaId   = id || Storage.getAll(this.SK_AULA).slice(-1)[0]?.id || '';
      const dataAula = record.data || new Date().toISOString().slice(0, 10);
      const sess     = Auth.getSession();
      const existing = Storage.getAll('financeiro')
        .filter(f => f.aulaId === aulaId && f.categoria === 'aula_experimental');
      const existIds = new Set(existing.map(f => f.alunoId));
      alunosExperimentais.forEach(al => {
        if (existIds.has(al.id)) return; // já tem lançamento para este aluno
        Storage.create('financeiro', {
          tipo:               'receita',
          data:               dataAula,
          descricao:          `Aula experimental — ${record.titulo}`,
          categoria:          'aula_experimental',
          valor:              record.modalidadeExperimental === 'cortesia' ? 0 : (record.valorExperimental || 0),
          formaPagamento:     'pix',
          status:             record.modalidadeExperimental || 'pendente',
          referencia:         '',
          observacoes:        record.compensarSeFechar ? 'Compensar se fechar matrícula' : '',
          aulaId,
          alunoId:            al.id,
          alunoNome:          al.nome,
          compensarSeFechar:  record.compensarSeFechar || false,
          registradoPor:      sess?.nome    || '',
          registradoPorId:    sess?.id      || '',
          registradoPorPerfil:sess?.perfil  || '',
        });
      });
    }

    UI.closeModal();
    this.render();
  },

  _filtrarAlunosAulaModal(query) {
    const sel = document.getElementById('au-alunos-sel');
    if (!sel) return;
    const q = query.toLowerCase();
    Array.from(sel.options).forEach(opt => {
      opt.style.display = !q || opt.text.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  /** Marca pagamento de aula experimental como pago ou cortesia e reabre detalhe */
  _registrarPagamentoExp(recId, aulaId, novoStatus = 'pago') {
    Storage.update('financeiro', recId, {
      status:  novoStatus,
      paidAt:  new Date().toISOString(),
      valor:   novoStatus === 'cortesia' ? 0 : undefined,
    });
    UI.toast(novoStatus === 'cortesia' ? '🎁 Marcado como cortesia!' : '💚 Pagamento registrado!', 'success');
    UI.closeModal();
    setTimeout(() => this.openModalAulaDetalhe(aulaId), 200);
  },

  _filtrarAlunosExpModal(query) {
    const list = document.getElementById('au-exp-alunos-list');
    if (!list) return;
    const q = query.toLowerCase().trim();
    list.querySelectorAll('.exp-aluno-item').forEach(lbl => {
      const nome = lbl.textContent.toLowerCase();
      lbl.style.display = !q || nome.includes(q) ? '' : 'none';
    });
  },

  _onExpAlunoChange(cb) {
    // Destaca linha selecionada
    const lbl = cb.closest('label');
    if (lbl) {
      lbl.style.background   = cb.checked ? 'var(--color-primary-light,#e6f4f2)' : '';
      lbl.style.fontWeight   = cb.checked ? '600' : '';
    }
    // Atualiza contador
    const total = document.querySelectorAll('.au-exp-chk:checked').length;
    const cnt   = document.getElementById('au-exp-sel-count');
    if (cnt) cnt.textContent = `${total} aluno${total !== 1 ? 's' : ''} selecionado${total !== 1 ? 's' : ''}`;
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

    const session    = Auth.getSession();
    const isAdmin    = !session || !['professor','aluno'].includes(session.perfil);
    const isAluno    = session?.perfil === 'aluno';

    const content = `
      <div class="form-grid">
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="badge ${st.badge}">${st.label}</span>
          ${aula.turmaNome ? `<span class="badge badge-blue">${UI.escape(aula.turmaNome)}</span>` : '<span class="badge badge-gray">Avulsa</span>'}
          ${aula.experimental ? `<span class="badge" style="background:#f59e0b;color:#fff;font-weight:700;">🧪 Exp.</span>` : ''}
          <span style="flex:1;min-width:0;"></span>
          ${isAdmin ? `
            ${aula.status === 'agendada' && aula.turmaId ? `
              <button class="aula-btn-ghost" title="Agendar reposição"
                onclick="UI.closeModal();TurmasModule.solicitarReposicaoAdmin('${id}')">🔄</button>
            ` : ''}
            <button class="aula-btn-ghost" title="Editar"
              onclick="UI.closeModal();TurmasModule.openModalAula('${id}')">✏️</button>
            <button class="aula-btn-ghost" title="Excluir aula" style="color:var(--red,#e53e3e);"
              onclick="UI.closeModal();TurmasModule.deleteAula('${id}')">🗑️</button>
          ` : ''}
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
            onclick="UI.closeModal();TurmasModule.abrirPresencaRapida('${id}')">
            Registrar / Ver Frequência
            ${pStats.total ? `<span class="badge badge-success" style="margin-left:6px;">${pStats.presentes}/${pStats.total}</span>` : ''}
          </button>
        </div>

        ${(() => {
          if (!aula.experimental) return '';
          const expList2 = aula.alunosExperimentais?.length
            ? aula.alunosExperimentais
            : aula.alunoExperimentalId ? [{ id: aula.alunoExperimentalId, nome: aula.alunoExperimentalNome || '?' }] : [];
          if (!expList2.length) return '';
          const pagRecs  = Storage.getAll('financeiro').filter(f => f.aulaId === id && f.categoria === 'aula_experimental');
          const pagMap   = {};
          pagRecs.forEach(f => { pagMap[f.alunoId] = f; });
          const STATUS_PAG = {
            pago:     '<span class="badge badge-success" style="font-size:11px;">💚 Pago</span>',
            cortesia: '<span class="badge badge-blue"    style="font-size:11px;">🎁 Cortesia</span>',
            pendente: '<span class="badge badge-warning" style="font-size:11px;">⏳ Pendente</span>',
          };
          const rows = expList2.map(e => {
            const rec   = pagMap[e.id];
            const badge = rec ? (STATUS_PAG[rec.status] || STATUS_PAG.pendente) : '<span class="text-muted" style="font-size:11px;">Sem lançamento</span>';
            const valor = rec?.valor > 0 ? `<span style="font-size:12px;color:var(--text-muted);">R$ ${parseFloat(rec.valor).toFixed(2).replace('.',',')}</span>` : '';
            const btnPagar = (rec && rec.status === 'pendente')
              ? `<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px;"
                   onclick="TurmasModule._registrarPagamentoExp('${rec.id}','${id}')">✔ Marcar pago</button>`
              : '';
            const btnCortesia = (rec && rec.status === 'pendente')
              ? `<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px;"
                   onclick="TurmasModule._registrarPagamentoExp('${rec.id}','${id}','cortesia')">🎁 Cortesia</button>`
              : '';
            return `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--card-border);flex-wrap:wrap;">
              <span style="flex:1;font-size:13px;">${UI.escape(e.nome)}</span>
              ${valor}${badge}${btnPagar}${btnCortesia}
            </div>`;
          }).join('');
          const temPendente = expList2.some(e => { const r = pagMap[e.id]; return !r || r.status === 'pendente'; });
          return `<div class="detalhe-section">
            <div class="detalhe-section-title">💰 Pagamentos — Experimental</div>
            ${rows}
            ${temPendente && aula.compensarSeFechar ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">♻️ Será compensado na 1ª mensalidade se fechar matrícula.</div>` : ''}
          </div>`;
        })()}

        ${aula.experimental && aula.avaliacaoStatus === 'pendente' ? `
          <div class="detalhe-section">
            <div class="detalhe-section-title">🧪 Avaliação Experimental</div>
            <button class="btn btn-primary" style="background:#f59e0b;border-color:#d97706;"
              onclick="UI.closeModal();TurmasModule.abrirAvaliacaoExperimental('${id}')">
              🧪 Avaliar aula experimental
            </button>
          </div>` : ''}

        ${aula.observacoes ? `
          <div class="detalhe-section">
            <div class="detalhe-section-title">📝 Observações</div>
            <p style="font-size:13px;color:var(--text-secondary);margin:0;">${UI.escape(aula.observacoes)}</p>
          </div>` : ''}
      </div>`;

    UI.openModal({
      title:      aula.titulo,
      content,
      hideFooter: false,
      confirmLabel: isAdmin ? 'Editar Aula' : 'Fechar',
      cancelLabel:  isAdmin ? 'Fechar' : '',
      onConfirm:    isAdmin ? () => { UI.closeModal(); this.openModalAula(id); } : () => UI.closeModal(),
    });
  },

  /* ================================================================== */
  /*  Professor Check-in / Check-out                                     */
  /* ================================================================== */

  professorCheckin(id) {
    const aula = Storage.getById(this.SK_AULA, id);
    if (!aula) return;
    if (aula.professorCheckin) { UI.toast('Entrada já registrada.', 'warning'); return; }
    const sess = Auth.getSession();
    Storage.update(this.SK_AULA, id, {
      professorCheckin:        new Date().toISOString(),
      status:                  aula.status === 'agendada' ? 'em_andamento' : aula.status,
      iniciadoPor:             sess?.nome   || '',
      iniciadoPorId:           sess?.id     || '',
      iniciadoPorPerfil:       sess?.perfil || '',
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
    const sess = Auth.getSession();
    Storage.update(this.SK_AULA, id, {
      professorCheckout:       new Date().toISOString(),
      status:                  'concluida',
      encerradoPor:            sess?.nome   || '',
      encerradoPorId:          sess?.id     || '',
      encerradoPorPerfil:      sess?.perfil || '',
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

    const hoje = new Date().toISOString().slice(0, 10);
    const listaHtml = inscritos.length
      ? `<div class="inscricao-list">
           ${inscritos.map(i => {
             const mat = Storage.getAll('matriculas')
               .find(m => m.alunoId === i.alunoId && m.status === 'ativa');
             const semMat   = !mat;
             const vencido  = mat && mat.dataFim && mat.dataFim < hoje;
             const contratoLabel = semMat
               ? 'Sem matrícula ativa'
               : (mat.dataFim ? `Contrato até ${this._fmtDataCurta(mat.dataFim)}` : 'Contrato indeterminado');
             const badge = vencido
               ? `<span class="badge badge-danger" style="font-size:0.6rem;margin-left:4px;" title="Contrato vencido">Vencido</span>`
               : semMat
                 ? `<span class="badge badge-warning" style="font-size:0.6rem;margin-left:4px;" title="Sem matrícula ativa">Sem matrícula</span>`
                 : '';
             return `
             <div class="inscricao-item">
               <div style="flex:1;min-width:0;">
                 <div class="inscricao-nome">${UI.escape(i.alunoNome)}${badge}</div>
                 <div class="inscricao-sub">
                   Inscrito em ${this._fmtDataCurta(i.dataInscricao?.slice(0,10))}
                   &nbsp;·&nbsp; <span style="color:${vencido || semMat ? 'var(--color-danger,#ef4444)' : 'var(--text-muted)'}">${contratoLabel}</span>
                 </div>
               </div>
               <button class="btn btn-ghost btn-sm danger"
                 onclick="TurmasModule._removerInscricao('${i.id}','${turmaId}')" title="Remover da turma">✕</button>
             </div>`;
           }).join('')}
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
          <div style="display:flex;gap:8px;overflow:hidden;">
            <select id="inscr-aluno-sel" class="form-select" style="flex:1;min-width:0;">${alunoOpts}</select>
            <button class="btn btn-primary" style="flex-shrink:0;" onclick="TurmasModule._adicionarInscricao('${turmaId}')">Adicionar</button>
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
      UI.toast('Aluno não possui matrícula ativa. Cadastre uma matrícula antes de inscrever na turma.', 'warning');
      return;
    }

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
    // Atualiza o modal e re-renderiza o cronograma em background
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.innerHTML = this._renderInscricoes(turmaId);
    this._refreshTurmaRow(turmaId);
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
    this._refreshTurmaRow(turmaId);
  },

  /** Atualiza os chips de alunos da linha da turma no cronograma sem re-render total */
  _refreshTurmaRow(turmaId) {
    const inscritos = Storage.getAll(this.SK_INSCR)
      .filter(i => i.turmaId === turmaId && i.status === 'ativo');
    const turma  = Storage.getById(this.SK, turmaId);
    const vagas  = turma?.vagas || 0;
    const livre  = vagas > 0 ? Math.max(0, vagas - inscritos.length) : null;

    // Atualiza chips
    const chipsEl = document.querySelector(`[data-turma-chips="${turmaId}"]`);
    if (chipsEl) {
      chipsEl.innerHTML = inscritos.length
        ? inscritos.map(i =>
            `<span class="turma-aluno-chip" title="${UI.escape(i.alunoNome)}">${UI.escape(i.alunoNome.split(' ')[0])}</span>`
          ).join('')
        : `<span class="turma-sem-alunos">Nenhum aluno inscrito</span>`;
    }

    // Atualiza badge de vagas
    const vagasEl = document.querySelector(`[data-turma-vagas="${turmaId}"]`);
    if (vagasEl) {
      vagasEl.textContent = vagas > 0 ? `${inscritos.length}/${vagas}` : String(inscritos.length);
      vagasEl.className = `turma-vagas-badge${livre === 0 ? ' turma-vagas-cheia' : ''}`;
    }
  },

  /**
   * Verifica se o aluno pode participar de uma aula na data informada.
   * Regra: se o aluno tem matrícula ativa, ela deve cobrir a data.
   *        se não tem nenhuma matrícula ativa, aparece sem restrição
   *        (a matrícula limita o período quando existe, não bloqueia sem ela).
   */
  _matriculaAtivaEmData(alunoId, data) {
    if (!data) return true;
    const ativas = Storage.getAll('matriculas').filter(m =>
      m.alunoId === alunoId && m.status === 'ativa'
    );
    // Sem matrícula cadastrada → sem restrição de período
    if (!ativas.length) return true;
    // Com matrícula → pelo menos uma deve cobrir a data
    return ativas.some(m =>
      (!m.dataInicio || m.dataInicio <= data) &&
      (!m.dataFim    || m.dataFim   >= data)
    );
  },

  /**
   * Retorna alunos ativos inscritos numa turma.
   * Se aulaData for fornecido, filtra apenas os alunos cujo contrato
   * cobre aquela data (janela contratada).
   */
  getAlunosInscritos(turmaId, aulaData = null) {
    const inscr = Storage.getAll(this.SK_INSCR)
      .filter(i => i.turmaId === turmaId && i.status === 'ativo');
    if (!aulaData) return inscr;
    return inscr.filter(i => this._matriculaAtivaEmData(i.alunoId, aulaData));
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
      this._updateDayViewModal();
      return;
    }
    const quadras = Storage.getAll('quadras').filter(q => q.arenaId === arenaId && q.status === 'disponivel');
    sel.innerHTML = '<option value="">— Selecionar quadra —</option>' +
      quadras.map(q => `<option value="${q.id}" data-nome="${UI.escape(q.nome)}">${UI.escape(q.nome)}</option>`).join('');
    this._updateDayViewModal();
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

    // Preenche título com o nome da grade (somente se o campo estiver vazio)
    const tituloEl = document.getElementById('au-titulo');
    if (tituloEl && !tituloEl.value.trim()) tituloEl.value = turma.nome;

    this._updateDayViewModal();
  },

  /* ================================================================== */
  /*  Day-view do modal de aula                                          */
  /* ================================================================== */

  /** Lê os campos do formulário e redesenha o day-view */
  _updateDayViewModal() {
    const data     = document.getElementById('au-data')?.value;
    const profId   = document.getElementById('au-prof')?.value   || '';
    const quadraId = document.getElementById('au-quadra')?.value || '';
    const hi       = document.getElementById('au-hi')?.value     || '';
    const hf       = document.getElementById('au-hf')?.value     || '';
    const curId    = document.getElementById('au-current-id')?.value || null;
    this._renderDayView(data, profId, quadraId, hi, hf, curId);
  },

  /** Renderiza a timeline do dia no painel direito do modal */
  _renderDayView(data, profId, quadraId, hiNova, hfNova, currentAulaId) {
    const container = document.getElementById('au-dayview');
    if (!container) return;

    if (!data) {
      container.innerHTML = `<div style="padding:24px 8px;text-align:center;color:var(--text-muted);font-size:12px;line-height:1.6;">Selecione uma data para<br>visualizar a agenda.</div>`;
      return;
    }

    // Converte HH:MM → minutos desde meia-noite
    const toMin = hhmm => {
      if (!hhmm) return null;
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };

    const START = 6 * 60;   // 06:00
    const END   = 22 * 60;  // 22:00
    const TOTAL = END - START;

    const pct = min => ((min - START) / TOTAL * 100).toFixed(2) + '%';
    const hgt = (s, e) => ((Math.min(e, END) - Math.max(s, START)) / TOTAL * 100).toFixed(2) + '%';

    // Aulas do dia (excluindo a atual ao editar)
    const aulasNoDia = Storage.getAll('aulas').filter(a =>
      a.data === data && a.status !== 'cancelada' && a.id !== currentAulaId
    );

    // Marcadores de hora
    let hourHtml = '';
    for (let h = 6; h <= 22; h++) {
      hourHtml += `
        <div class="au-dv-hour" style="top:${pct(h * 60)}">
          <span class="au-dv-hour-lbl">${String(h).padStart(2,'0')}:00</span>
          <div class="au-dv-hour-line"></div>
        </div>`;
    }

    // Blocos de aulas existentes
    let blocksHtml = '';
    aulasNoDia.forEach(a => {
      const s = toMin(a.horarioInicio);
      const e = toMin(a.horarioFim) || (s + 60);
      if (s === null || s >= END || e <= START) return;

      const qConflito = quadraId && a.quadraId === quadraId;
      const pConflito = profId   && a.professorId === profId;
      let cor = '#6b7280';           // cinza — sem conflito
      if (qConflito) cor = '#ef4444'; // vermelho — quadra ocupada
      else if (pConflito) cor = '#f59e0b'; // laranja — prof ocupado

      // Sobreposição com nova aula?
      const novS = toMin(hiNova);
      const novE = toMin(hfNova) || (novS !== null ? novS + 60 : null);
      const overlap = novS !== null && novE !== null && s < novE && e > novS;
      if (overlap && (qConflito || pConflito)) cor = cor; // já é conflito

      const top = pct(Math.max(s, START));
      const h2  = hgt(s, e);
      blocksHtml += `
        <div class="au-dv-block" style="top:${top};height:${h2};background:${cor}18;border-left:3px solid ${cor};color:${cor};" title="${UI.escape(a.titulo)}">
          <div class="au-dv-blk-title">${UI.escape(a.titulo)}</div>
          <div class="au-dv-blk-sub">${a.horarioInicio||''}${a.horarioFim?'–'+a.horarioFim:''} · ${UI.escape(a.professorNome||'—')}</div>
        </div>`;
    });

    // Bloco de prévia da nova aula
    let previewHtml = '';
    if (hiNova) {
      const s = toMin(hiNova);
      const e = toMin(hfNova) || (s + 60);
      if (s !== null && s < END && e > START) {
        previewHtml = `
          <div class="au-dv-block au-dv-preview" style="top:${pct(Math.max(s,START))};height:${hgt(s,e)};" title="Nova aula">
            <div class="au-dv-blk-title">✏️ Esta aula</div>
            <div class="au-dv-blk-sub">${hiNova}${hfNova?'–'+hfNova:''}</div>
          </div>`;
      }
    }

    // Label de data
    const [y, m, d] = data.split('-');
    const dtFmt = new Date(+y, +m-1, +d)
      .toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'short'});

    // Legenda
    const legenda = `
      <div class="au-dv-legend">
        <span style="color:#3b82f6;">■ Esta</span>
        <span style="color:#f59e0b;">■ Prof.</span>
        <span style="color:#ef4444;">■ Quadra</span>
        <span style="color:#6b7280;">■ Outro</span>
      </div>`;

    container.innerHTML = `
      <div class="au-dv-datelbl">${dtFmt}</div>
      ${legenda}
      <div class="au-dv-timeline">
        ${hourHtml}
        ${blocksHtml}
        ${previewHtml}
        ${!aulasNoDia.length && !hiNova
          ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--text-muted);font-size:11px;text-align:center;pointer-events:none;">Sem aulas<br>agendadas</div>`
          : ''}
      </div>`;
  },

  /* ================================================================== */
  /*  Aula Experimental — avaliação de nível                             */
  /* ================================================================== */

  _onExperimentalChange() {
    const cb  = document.getElementById('au-experimental');
    const sec = document.getElementById('au-exp-section');

    if (cb?.checked) {
      // Guard: a turma precisa ter pelo menos 1 aluno inscrito
      // (o aluno experimental precisa de colegas para treinar)
      const turmaId = document.getElementById('au-turma')?.value;
      if (turmaId) {
        const inscritos = Storage.getAll(this.SK_INSCR)
          .filter(i => i.turmaId === turmaId && i.status === 'ativo');
        if (inscritos.length === 0) {
          UI.toast('A turma não tem alunos inscritos. Inscreva pelo menos um aluno antes de marcar a aula como experimental.', 'warning');
          cb.checked = false;
          if (sec) sec.style.display = 'none';
          return;
        }
      }
    }

    if (sec) sec.style.display = cb?.checked ? '' : 'none';
  },

  /** Abre o modal de avaliação de uma aula experimental concluída */
  abrirAvaliacaoExperimental(aulaId) {
    const aula = Storage.getById(this.SK_AULA, aulaId);
    if (!aula || !aula.experimental) { UI.toast('Aula não é experimental.', 'warning'); return; }

    // Suporta formato array novo e legado
    const expList = aula.alunosExperimentais?.length
      ? aula.alunosExperimentais
      : aula.alunoExperimentalId
        ? [{ id: aula.alunoExperimentalId, nome: aula.alunoExperimentalNome || '?' }]
        : [];

    if (!expList.length) { UI.toast('Nenhum aluno experimental vinculado à aula.', 'warning'); return; }

    // Avaliações já existentes para esta aula
    const avalExist = Storage.getAll('avaliacoes_experimentais').filter(av => av.aulaId === aulaId);
    const avalMap   = {};
    avalExist.forEach(av => { avalMap[av.alunoId] = av; });

    const cards = expList.map((e, idx) => {
      const aluno    = Storage.getById('alunos', e.id);
      const nivelAtual = aluno?.nivel || '';
      const avExist  = avalMap[e.id];
      const nivelOpts = ListasService.opts('aulas_nivel', avExist?.nivelAvaliado || nivelAtual || '');
      const initials  = e.nome.trim().split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();

      return `
        <div style="border:1px solid var(--card-border);border-radius:10px;padding:14px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <div class="presenca-avatar" style="flex-shrink:0;">${initials}</div>
            <div>
              <div style="font-weight:700;font-size:14px;">${UI.escape(e.nome)}</div>
              <div style="font-size:11px;color:var(--text-muted);">
                Nível atual: <strong>${nivelAtual || 'não definido'}</strong>
                ${avExist ? `&nbsp;·&nbsp;<span style="color:#10b981;font-weight:600;">✓ já avaliado</span>` : ''}
              </div>
            </div>
          </div>

          <div class="form-grid-2" style="gap:10px;margin-bottom:8px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11px;">Nível avaliado <span class="required-star">*</span></label>
              <select id="aval-nivel-${idx}" class="form-select" style="height:36px;"
                onchange="TurmasModule._sugerirGradesCompativeis(this.value,document.getElementById('aval-grades-${idx}'))">
                ${nivelOpts}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;display:flex;align-items:flex-end;padding-bottom:4px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
                <input type="checkbox" id="aval-compensar-${idx}" style="width:14px;height:14px;"
                  ${avExist?.compensar ? 'checked' : ''} />
                Compensar se fechar matrícula
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:8px;">
            <label class="form-label" style="font-size:11px;">Laudo / Observações</label>
            <textarea id="aval-notas-${idx}" class="form-textarea" rows="2"
              style="font-size:12px;"
              placeholder="Desempenho, pontos fortes e a desenvolver…">${UI.escape(avExist?.notas || aula.notasExperimental || '')}</textarea>
          </div>

          <div id="aval-grades-${idx}" style="font-size:12px;"></div>

          <input type="hidden" id="aval-aluno-id-${idx}"   value="${e.id}" />
          <input type="hidden" id="aval-aluno-nome-${idx}" value="${UI.escape(e.nome)}" />
        </div>`;
    }).join('');

    const content = `
      <div class="info-box" style="margin-bottom:14px;">
        <strong>${UI.escape(aula.titulo)}</strong>
        <span class="text-muted" style="margin-left:8px;">
          ${expList.length} aluno${expList.length !== 1 ? 's' : ''} experimental${expList.length !== 1 ? 'is' : ''}
          ${avalExist.length ? `· ${avalExist.length}/${expList.length} já avaliado${avalExist.length !== 1 ? 's' : ''}` : ''}
        </span>
        ${aula.notasExperimental ? `<div style="margin-top:4px;font-size:12px;color:var(--text-muted);">Notas da sessão: ${UI.escape(aula.notasExperimental)}</div>` : ''}
      </div>
      <input type="hidden" id="aval-count" value="${expList.length}" />
      ${cards}`;

    UI.openModal({
      title:        `🧪 Avaliação Experimental — ${UI.escape(aula.titulo)}`,
      content,
      confirmLabel: `Salvar ${expList.length > 1 ? expList.length + ' avaliações' : 'Avaliação'}`,
      onConfirm:    () => this._salvarAvaliacaoExperimental(aulaId),
    });

    requestAnimationFrame(() => {
      expList.forEach((_, idx) => {
        const sel = document.getElementById(`aval-nivel-${idx}`);
        if (sel?.value) this._sugerirGradesCompativeis(sel.value, document.getElementById(`aval-grades-${idx}`));
      });
    });
  },

  _salvarAvaliacaoExperimental(aulaId) {
    const countEl = document.getElementById('aval-count');
    const count   = parseInt(countEl?.value || '0', 10);
    if (!count) return;

    const sess = Auth.getSession();
    const logFields = {
      avaliadoPor:       sess?.nome   || '',
      avaliadoPorId:     sess?.id     || '',
      avaliadoPorPerfil: sess?.perfil || '',
      avaliadoEm:        new Date().toISOString(),
    };

    let salvos = 0;
    let semNivel = 0;

    for (let idx = 0; idx < count; idx++) {
      const nivelEl   = document.getElementById(`aval-nivel-${idx}`);
      const notasEl   = document.getElementById(`aval-notas-${idx}`);
      const compEl    = document.getElementById(`aval-compensar-${idx}`);
      const alunoId   = document.getElementById(`aval-aluno-id-${idx}`)?.value   || '';
      const alunoNome = document.getElementById(`aval-aluno-nome-${idx}`)?.value || '';

      if (!nivelEl?.value) { semNivel++; continue; }

      const nivel     = nivelEl.value;
      const notas     = notasEl?.value.trim() || '';
      const compensar = !!compEl?.checked;

      // Cria ou atualiza registro de avaliação por aluno
      const existing = Storage.getAll('avaliacoes_experimentais')
        .find(av => av.aulaId === aulaId && av.alunoId === alunoId);

      if (existing) {
        Storage.update('avaliacoes_experimentais', existing.id, { nivelAvaliado: nivel, notas, compensar, status: 'concluida', ...logFields });
      } else {
        Storage.create('avaliacoes_experimentais', {
          aulaId, alunoId, alunoNome,
          nivelAvaliado: nivel, notas, compensar,
          status: 'concluida',
          ...logFields,
        });
      }

      // Atualiza o nível individual do aluno no cadastro
      if (alunoId) {
        Storage.update('alunos', alunoId, { nivel });
      }

      salvos++;
    }

    if (semNivel > 0) {
      UI.toast(`⚠️ ${semNivel} aluno${semNivel !== 1 ? 's' : ''} sem nível selecionado — não ${semNivel !== 1 ? 'foram' : 'foi'} salvo${semNivel !== 1 ? 's' : ''}.`, 'warning');
    }

    // Marca a aula como avaliação concluída
    Storage.update(this.SK_AULA, aulaId, { avaliacaoStatus: 'concluida', ...logFields });

    if (salvos > 0) {
      UI.toast(`✅ ${salvos} avaliação${salvos !== 1 ? 'ões' : ''} salva${salvos !== 1 ? 's' : ''}! Nível de cada aluno atualizado.`, 'success');
    }
    UI.closeModal();

    const portalEl = document.getElementById('portal-wrap');
    if (portalEl && portalEl.style.display !== 'none') {
      PortalModule._reRender();
    } else {
      this.render();
    }
  },

  /** Exibe grades compatíveis com o nível avaliado */
  _sugerirGradesCompativeis(nivel, containerEl) {
    if (!containerEl) return;
    if (!nivel) { containerEl.innerHTML = ''; return; }

    const grades = Storage.getAll(this.SK).filter(t => t.nivel === nivel && t.status !== 'cancelada');
    if (!grades.length) {
      containerEl.innerHTML = `<div class="cadastro-tab-info" style="margin-top:8px;">
        Nenhuma turma com nível <strong>${nivel}</strong> encontrada.</div>`;
      return;
    }
    containerEl.innerHTML = `
      <div style="margin-top:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px;">
          🏸 Turmas compatíveis — nível ${nivel}
        </div>
        ${grades.map(t => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;
            background:var(--gray-light);border-radius:8px;margin-bottom:4px;gap:8px;">
            <div style="min-width:0;">
              <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.escape(t.nome)}</div>
              <div style="font-size:11px;color:var(--text-muted);">
                ${Array.isArray(t.diaSemana) ? t.diaSemana.join(', ') : (t.diaSemana||'—')}
                · ${t.horarioInicio||'?'}–${t.horarioFim||'?'}
              </div>
            </div>
            <a href="#" class="btn btn-sm btn-primary" style="flex-shrink:0;font-size:11px;"
              onclick="event.preventDefault();UI.closeModal();TurmasModule._abrirGradeParaInscricao('${t.id}')">
              Ver turma →
            </a>
          </div>`).join('')}
      </div>`;
  },

  _abrirGradeParaInscricao(turmaId) {
    // Navega para a aba de turmas destacando a grade em questão
    this._state.tab = 'turmas';
    this._state.filtroTurma = turmaId;
    this.render();
    UI.toast('Abra a turma e use a aba Alunos para inscrever o aluno.', 'info');
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

  /**
   * Verifica se um professor já está alocado em outra aula no mesmo horário.
   * Retorna a aula conflitante ou null.
   */
  _verificarConflitoProfessor(professorId, data, horarioInicio, horarioFim, aulaIdIgnorar = null) {
    if (!professorId || !data || !horarioInicio) return null;
    return Storage.getAll('aulas').find(a =>
      a.id          !== aulaIdIgnorar &&
      a.professorId === professorId &&
      a.data        === data &&
      a.status      !== 'cancelada' &&
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

  _fmtTime(val) {
    if (!val) return '—';
    // Valor já é HH:MM — retorna direto
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(val)) return val.slice(0, 5);
    // ISO datetime — extrai horário
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  /* ------------------------------------------------------------------ */
  /*  Exportar Aulas para Excel                                           */
  /* ------------------------------------------------------------------ */

  _exportAulas() {
    const aulas = this._aulasFiltered || [];
    if (!aulas.length) { UI.toast('Nenhuma aula para exportar', 'warning'); return; }

    const headers = ['Título', 'Turma', 'Data', 'Início', 'Fim', 'Professor', 'Arena', 'Status', 'Alunos'];
    const aulaAlunosAll = Storage.getAll('aulaAlunos');
    const rows = aulas.map(a => {
      const qtdAlunos = aulaAlunosAll.filter(aa => aa.aulaId === a.id && aa.status === 'ativo').length;
      return [
        a.titulo          || '',
        a.turmaNome       || '',
        ExportService.fmtData(a.data),
        a.horarioInicio   || '',
        a.horarioFim      || '',
        a.professorNome   || '',
        a.arenaNome       || '',
        a.status          || '',
        qtdAlunos,
      ];
    });

    ExportService.toXLSX('picklemanager_aulas', headers, rows, 'Aulas');
  },

  /* ------------------------------------------------------------------ */
  /*  Exportar Presenças para Excel                                       */
  /* ------------------------------------------------------------------ */

  _exportPresencas() {
    const presencas = Storage.getAll('presencas');
    if (!presencas.length) { UI.toast('Nenhuma presença registrada para exportar', 'warning'); return; }

    const aulaMap = {};
    Storage.getAll('aulas').forEach(a => { aulaMap[a.id] = a; });

    const headers = ['Aula', 'Turma', 'Data', 'Professor', 'Aluno', 'Presença', 'Registrado em'];
    const rows = presencas
      .slice()
      .sort((a, b) => {
        const da = aulaMap[a.aulaId]?.data || '';
        const db = aulaMap[b.aulaId]?.data || '';
        return db.localeCompare(da);
      })
      .map(p => {
        const aula = aulaMap[p.aulaId] || {};
        return [
          aula.titulo        || '',
          aula.turmaNome     || '',
          ExportService.fmtData(aula.data),
          aula.professorNome || '',
          p.alunoNome        || '',
          p.presente ? 'Presente' : 'Ausente',
          ExportService.fmtData(p.registradoEm),
        ];
      });

    ExportService.toXLSX('picklemanager_presencas', headers, rows, 'Presenças');
  },
};

/* ======================================================================
   Compat shim — presenca.js e stubs.js referem AulaModule
   ====================================================================== */
const AulaModule = {
  render:   () => TurmasModule.render(),
  getStats: () => TurmasModule.getAulaStats(),
};
