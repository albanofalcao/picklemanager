'use strict';

/**
 * PortalModule — Portal dedicado para Professor e Aluno.
 * Substitui o layout completo da aplicação para esses perfis.
 */
const PortalModule = {

  _tab: 'hoje',

  /* ------------------------------------------------------------------ */
  /*  Bootstrap                                                           */
  /* ------------------------------------------------------------------ */

  init() {
    const session = Auth.getSession();
    const perfil  = session?.perfil;
    if (perfil !== 'professor' && perfil !== 'aluno') return false;

    // Esconde o app completo, mostra o portal
    const appLayout = document.getElementById('app-layout');
    const portalWrap = document.getElementById('portal-wrap');
    if (appLayout)  appLayout.style.display  = 'none';
    if (portalWrap) portalWrap.style.display = 'flex';

    // Badge do usuário no header
    const badge = document.getElementById('portal-user-badge');
    if (badge) {
      const icon = perfil === 'professor' ? '🎓' : '🧑‍🎓';
      badge.innerHTML = `${icon} <strong>${UI.escape(session.nome)}</strong>`;
    }

    if (perfil === 'professor') {
      this._tab = 'hoje';
      this._renderProfessor(session);
    } else {
      this._tab = 'grades';
      this._renderAluno(session);
    }

    return true;
  },

  _reRender() {
    const session = Auth.getSession();
    if (!session) return;
    if (session.perfil === 'professor') this._renderProfessor(session);
    else this._renderAluno(session);
  },

  /* ------------------------------------------------------------------ */
  /*  PORTAL DO PROFESSOR                                                 */
  /* ------------------------------------------------------------------ */

  _renderProfessor(session) {
    const el = document.getElementById('portal-content');
    if (!el) return;

    const hoje     = new Date();
    const hojeStr  = hoje.toISOString().slice(0, 10);
    const hojeFmt  = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    const todasAulas = Storage.getAll('aulas').filter(a => {
      if (session.professorId) return a.professorId === session.professorId;
      return a.professorNome === session.nome;
    });

    const aulasHoje    = todasAulas.filter(a => a.data === hojeStr && a.status !== 'cancelada').sort((a,b) => (a.horarioInicio||'').localeCompare(b.horarioInicio||''));
    const proximas     = todasAulas.filter(a => a.data > hojeStr && a.status !== 'cancelada').sort((a,b) => a.data.localeCompare(b.data) || (a.horarioInicio||'').localeCompare(b.horarioInicio||'')).slice(0, 20);
    const anteriores   = todasAulas.filter(a => a.data < hojeStr && a.status !== 'cancelada').sort((a,b) => b.data.localeCompare(a.data)).slice(0, 10);

    const tabs = [
      { key: 'hoje',     label: `📅 Hoje (${aulasHoje.length})` },
      { key: 'proximas', label: '🔜 Próximas' },
      { key: 'passadas', label: '📋 Histórico' },
    ];

    const tabBar = tabs.map(t =>
      `<button class="tab-btn ${this._tab === t.key ? 'active' : ''}"
        onclick="PortalModule._setTabProf('${t.key}')">${t.label}</button>`
    ).join('');

    let content = '';
    if (this._tab === 'hoje') {
      content = aulasHoje.length
        ? aulasHoje.map(a => this._cardAulaProfessor(a, true)).join('')
        : `<div class="portal-empty"><div class="portal-empty-icon">🏖️</div><div>Nenhuma aula hoje</div></div>`;
    } else if (this._tab === 'proximas') {
      content = proximas.length
        ? proximas.map(a => this._cardAulaProfessor(a, false)).join('')
        : `<div class="portal-empty"><div class="portal-empty-icon">📭</div><div>Nenhuma aula próxima</div></div>`;
    } else {
      content = anteriores.length
        ? anteriores.map(a => this._cardAulaProfessor(a, false)).join('')
        : `<div class="portal-empty"><div class="portal-empty-icon">📭</div><div>Nenhum histórico</div></div>`;
    }

    el.innerHTML = `
      <div class="portal-inner">
        <div class="portal-page-header">
          <div>
            <h2 class="portal-title">Portal do Professor</h2>
            <div class="portal-subtitle">${hojeFmt}</div>
          </div>
        </div>
        <div class="tabs-bar">${tabBar}</div>
        <div class="portal-cards">${content}</div>
      </div>`;
  },

  _setTabProf(tab) {
    this._tab = tab;
    const session = Auth.getSession();
    if (session) this._renderProfessor(session);
  },

  _cardAulaProfessor(a, isHoje) {
    const [ay, am, ad] = (a.data || '').split('-');
    const dataFmt = a.data ? `${ad}/${am}/${ay}` : '—';
    const hr      = [a.horarioInicio, a.horarioFim].filter(Boolean).join(' – ');
    const st      = TurmasModule?.STATUS_AULA?.[a.status] || {};
    const inscritos = a.turmaId
      ? Storage.getAll('turmaAlunos').filter(i => i.turmaId === a.turmaId && i.status === 'ativo')
      : [];

    // Presença stats
    const presencas  = Storage.getAll('presencas').filter(p => p.aulaId === a.id);
    const presentes  = presencas.filter(p => p.presente).length;
    const total      = presencas.length;

    // Check-in professor
    const temCheckin  = !!a.professorCheckin;
    const temCheckout = !!a.professorCheckout;

    let acoes = '';
    if (isHoje) {
      if (!temCheckin && ['agendada','em_andamento'].includes(a.status)) {
        acoes += `<button class="btn btn-primary btn-sm" onclick="PortalModule.professorCheckin('${a.id}')">▶ Registrar entrada</button>`;
      }
      if (temCheckin && !temCheckout && a.status === 'em_andamento') {
        acoes += `<button class="btn btn-secondary btn-sm" onclick="PortalModule.professorCheckout('${a.id}')">■ Registrar saída</button>`;
      }
      if (['agendada','em_andamento','concluida'].includes(a.status)) {
        acoes += `<button class="btn btn-ghost btn-sm" onclick="PortalModule.abrirPresenca('${a.id}')">📋 Frequência</button>`;
      }
    } else if (a.status === 'concluida') {
      acoes += `<button class="btn btn-ghost btn-sm" onclick="PortalModule.abrirPresenca('${a.id}')">📋 Ver frequência</button>`;
    }

    const checkinInfo = temCheckin
      ? `<span class="portal-badge badge-success">▶ ${a.professorCheckin}</span>${temCheckout ? `<span class="portal-badge badge-gray">■ ${a.professorCheckout}</span>` : ''}`
      : '';

    const presStats = total
      ? `<span class="portal-badge ${presentes === total ? 'badge-success' : 'badge-warning'}">${presentes}/${total} presentes</span>`
      : '';

    return `
      <div class="portal-card${isHoje ? ' portal-card-destaque' : ''}">
        <div class="portal-card-top">
          <div class="portal-card-info">
            <div class="portal-card-titulo">${UI.escape(a.titulo)}</div>
            <div class="portal-card-meta">
              📅 ${dataFmt} &nbsp;·&nbsp; 🕐 ${hr || '—'}
              ${a.arenaNome ? `&nbsp;·&nbsp; 🏟️ ${UI.escape(a.arenaNome)}` : ''}
              ${a.turmaNome ? `&nbsp;·&nbsp; 📚 ${UI.escape(a.turmaNome)}` : ''}
            </div>
            <div class="portal-card-badges">
              <span class="portal-badge" style="background:${st.cor || '#6b7280'}20;color:${st.cor || '#6b7280'};border:1px solid ${st.cor || '#6b7280'}40;">${st.label || a.status}</span>
              ${inscritos.length ? `<span class="portal-badge badge-blue">👥 ${inscritos.length} aluno${inscritos.length !== 1 ? 's' : ''}</span>` : ''}
              ${checkinInfo}
              ${presStats}
            </div>
          </div>
        </div>
        ${acoes ? `<div class="portal-card-acoes">${acoes}</div>` : ''}
      </div>`;
  },

  professorCheckin(aulaId) {
    const hr = new Date().toTimeString().slice(0,5);
    Storage.update('aulas', aulaId, { status: 'em_andamento', professorCheckin: hr });
    UI.toast(`Entrada registrada às ${hr}`, 'success');
    this._reRender();
  },

  professorCheckout(aulaId) {
    const hr = new Date().toTimeString().slice(0,5);
    Storage.update('aulas', aulaId, { professorCheckout: hr });
    UI.toast(`Saída registrada às ${hr}`, 'success');
    this._reRender();
  },

  abrirPresenca(aulaId) {
    const aula = Storage.getById('aulas', aulaId);
    if (!aula) return;

    const inscritos = aula.turmaId
      ? Storage.getAll('turmaAlunos').filter(i => i.turmaId === aula.turmaId && i.status === 'ativo')
      : [];

    if (!inscritos.length) {
      UI.toast('Nenhum aluno inscrito nesta grade.', 'warning');
      return;
    }

    const presencas = Storage.getAll('presencas').filter(p => p.aulaId === aulaId);
    const presMap   = {};
    presencas.forEach(p => { presMap[p.alunoId] = p; });

    const rows = inscritos.map(i => {
      const p      = presMap[i.alunoId];
      const pres   = p?.presente ?? false;
      return `
        <div class="presenca-row">
          <label class="presenca-aluno-label">
            <input type="checkbox" class="presenca-check" data-aluno-id="${i.alunoId}" data-aluno-nome="${UI.escape(i.alunoNome)}" ${pres ? 'checked' : ''} />
            <span>${UI.escape(i.alunoNome)}</span>
          </label>
        </div>`;
    }).join('');

    UI.openModal({
      title:        `📋 Frequência — ${aula.titulo}`,
      content:      `<div class="presenca-list">${rows}</div>`,
      confirmLabel: 'Salvar Frequência',
      onConfirm:    () => this._salvarPresenca(aulaId, inscritos),
    });
  },

  _salvarPresenca(aulaId, inscritos) {
    const checks = document.querySelectorAll('.presenca-check');
    let salvos = 0;
    checks.forEach(cb => {
      const alunoId   = cb.dataset.alunoId;
      const alunoNome = cb.dataset.alunoNome;
      const presente  = cb.checked;
      const existing  = Storage.getAll('presencas').find(p => p.aulaId === aulaId && p.alunoId === alunoId);
      if (existing) {
        Storage.update('presencas', existing.id, { presente });
      } else {
        Storage.create('presencas', { aulaId, alunoId, alunoNome, presente });
      }
      salvos++;
    });

    // Marca aula como concluída
    Storage.update('aulas', aulaId, { status: 'concluida' });
    UI.closeModal();
    UI.toast(`Frequência de ${salvos} aluno${salvos !== 1 ? 's' : ''} salva!`, 'success');
    this._reRender();
  },

  /* ------------------------------------------------------------------ */
  /*  PORTAL DO ALUNO                                                     */
  /* ------------------------------------------------------------------ */

  _renderAluno(session) {
    const el = document.getElementById('portal-content');
    if (!el) return;

    const hoje    = new Date().toISOString().slice(0, 10);
    const hojeFmt = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    const tabs = [
      { key: 'grades',    label: '📚 Minhas Grades' },
      { key: 'descobrir', label: '🔍 Descobrir Grades' },
      { key: 'aulas',     label: '📅 Cronograma' },
      { key: 'financeiro',label: '💰 Financeiro' },
    ];

    const tabBar = tabs.map(t =>
      `<button class="tab-btn ${this._tab === t.key ? 'active' : ''}"
        onclick="PortalModule._setTabAluno('${t.key}')">${t.label}</button>`
    ).join('');

    let content = '';
    if (this._tab === 'grades')         content = this._renderAlunoGrades(session);
    else if (this._tab === 'descobrir') content = this._renderAlunoDescobrirGrades(session);
    else if (this._tab === 'financeiro')content = this._renderAlunoFinanceiro(session);
    else                                content = this._renderAlunoAulas(session, hoje);

    el.innerHTML = `
      <div class="portal-inner">
        <div class="portal-page-header">
          <div>
            <h2 class="portal-title">Portal do Aluno</h2>
            <div class="portal-subtitle">${hojeFmt}</div>
          </div>
        </div>
        <div class="tabs-bar">${tabBar}</div>
        <div class="portal-cards">${content}</div>
      </div>`;
  },

  _setTabAluno(tab) {
    this._tab = tab;
    const session = Auth.getSession();
    if (session) this._renderAluno(session);
  },

  _renderAlunoGrades(session) {
    const inscricoes = Storage.getAll('turmaAlunos').filter(i =>
      (session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome) &&
      i.status === 'ativo'
    );

    if (!inscricoes.length) {
      return `<div class="portal-empty">
        <div class="portal-empty-icon">📭</div>
        <div>Você ainda não está inscrito em nenhuma grade.</div>
        <button class="btn btn-primary" style="margin-top:12px;" onclick="PortalModule._setTabAluno('descobrir')">Descobrir grades</button>
      </div>`;
    }

    return inscricoes.map(i => {
      const turma = Storage.getById('turmas', i.turmaId);
      const dias  = (turma?.diasSemana || []).join(', ').toUpperCase();
      const hr    = turma ? [turma.horarioInicio, turma.horarioFim].filter(Boolean).join(' – ') : '';
      return `
        <div class="portal-card">
          <div class="portal-card-top">
            <div class="portal-card-info">
              <div class="portal-card-titulo">📚 ${UI.escape(i.turmaNome)}</div>
              <div class="portal-card-meta">
                ${turma?.professorNome ? `🎓 ${UI.escape(turma.professorNome)} &nbsp;·&nbsp; ` : ''}
                ${turma?.arenaNome ? `🏟️ ${UI.escape(turma.arenaNome)} &nbsp;·&nbsp; ` : ''}
                ${dias ? `📆 ${dias} &nbsp;·&nbsp; ` : ''}
                ${hr ? `🕐 ${hr}` : ''}
              </div>
            </div>
          </div>
          <div class="portal-card-acoes">
            <button class="btn btn-ghost btn-sm danger" onclick="PortalModule.cancelarInscricao('${i.id}')">Cancelar inscrição</button>
          </div>
        </div>`;
    }).join('');
  },

  _renderAlunoDescobrirGrades(session) {
    const inscricoes = Storage.getAll('turmaAlunos').filter(i =>
      (session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome) &&
      i.status === 'ativo'
    );
    const inscritosIds = new Set(inscricoes.map(i => i.turmaId));

    const grades = Storage.getAll('turmas').filter(t => t.status === 'ativa' && !inscritosIds.has(t.id));

    if (!grades.length) {
      return `<div class="portal-empty"><div class="portal-empty-icon">✅</div><div>Você está inscrito em todas as grades disponíveis!</div></div>`;
    }

    return grades.map(t => {
      const dias = (t.diasSemana || []).join(', ').toUpperCase();
      const hr   = [t.horarioInicio, t.horarioFim].filter(Boolean).join(' – ');
      const ins  = Storage.getAll('turmaAlunos').filter(i => i.turmaId === t.id && i.status === 'ativo').length;
      const vagas = t.vagas > 0 ? Math.max(0, t.vagas - ins) : null;
      const semVaga = vagas !== null && vagas === 0;
      return `
        <div class="portal-card">
          <div class="portal-card-top">
            <div class="portal-card-info">
              <div class="portal-card-titulo">📚 ${UI.escape(t.nome)}</div>
              <div class="portal-card-meta">
                ${t.professorNome ? `🎓 ${UI.escape(t.professorNome)} &nbsp;·&nbsp; ` : ''}
                ${t.arenaNome ? `🏟️ ${UI.escape(t.arenaNome)} &nbsp;·&nbsp; ` : ''}
                ${dias ? `📆 ${dias} &nbsp;·&nbsp; ` : ''}
                ${hr ? `🕐 ${hr}` : ''}
              </div>
              <div class="portal-card-badges">
                ${vagas !== null
                  ? `<span class="portal-badge ${semVaga ? 'badge-danger' : 'badge-success'}">${semVaga ? 'Sem vagas' : vagas + ' vaga' + (vagas !== 1 ? 's' : '')}</span>`
                  : '<span class="portal-badge badge-blue">Vagas ilimitadas</span>'}
                <span class="portal-badge badge-gray">${t.nivel || ''}</span>
              </div>
            </div>
          </div>
          ${!semVaga ? `<div class="portal-card-acoes"><button class="btn btn-primary btn-sm" onclick="PortalModule.inscreverAluno('${t.id}')">Inscrever-se</button></div>` : ''}
        </div>`;
    }).join('');
  },

  _renderAlunoAulas(session, hoje) {
    const inscricoes = Storage.getAll('turmaAlunos').filter(i =>
      (session.alunoId ? i.alunoId === session.alunoId : i.alunoNome === session.nome) &&
      i.status === 'ativo'
    );
    const turmaIds = new Set(inscricoes.map(i => i.turmaId));

    const aulas = Storage.getAll('aulas')
      .filter(a => a.turmaId && turmaIds.has(a.turmaId) && a.data >= hoje && a.status !== 'cancelada')
      .sort((a, b) => a.data.localeCompare(b.data) || (a.horarioInicio||'').localeCompare(b.horarioInicio||''))
      .slice(0, 20);

    if (!aulas.length) {
      return `<div class="portal-empty"><div class="portal-empty-icon">📭</div><div>Nenhuma aula próxima encontrada.</div></div>`;
    }

    return aulas.map(a => {
      const [ay, am, ad] = (a.data || '').split('-');
      const dataFmt = `${ad}/${am}/${ay}`;
      const hr      = [a.horarioInicio, a.horarioFim].filter(Boolean).join(' – ');
      const isHoje  = a.data === hoje;

      // Verifica se aluno já tem reposição agendada para esta aula
      const alunoId = session.alunoId || session.id;
      const jaTemRep = Storage.getAll('reposicoes').find(r =>
        r.aulaOriginalId === a.id && r.alunoId === alunoId && r.status === 'agendada'
      );

      const repBtn = !jaTemRep && a.status === 'agendada' && TurmasModule?.solicitarReposicao
        ? `<button class="btn btn-ghost btn-sm" onclick="TurmasModule.solicitarReposicao('${a.id}')" title="Solicitar reposição">🔄 Reposição</button>`
        : '';

      const presenca = Storage.getAll('presencas').find(p => p.aulaId === a.id && p.alunoId === alunoId);
      const presTag  = presenca
        ? `<span class="portal-badge ${presenca.presente ? 'badge-success' : 'badge-danger'}">${presenca.presente ? '✓ Presente' : '✗ Falta'}</span>`
        : '';

      return `
        <div class="portal-card${isHoje ? ' portal-card-destaque' : ''}">
          <div class="portal-card-top">
            <div class="portal-card-info">
              <div class="portal-card-titulo">${isHoje ? '📍 Hoje — ' : ''}${UI.escape(a.titulo)}</div>
              <div class="portal-card-meta">
                📅 ${dataFmt} &nbsp;·&nbsp; 🕐 ${hr || '—'}
                ${a.arenaNome ? `&nbsp;·&nbsp; 🏟️ ${UI.escape(a.arenaNome)}` : ''}
                ${a.turmaNome ? `&nbsp;·&nbsp; 📚 ${UI.escape(a.turmaNome)}` : ''}
              </div>
              ${presTag ? `<div class="portal-card-badges">${presTag}</div>` : ''}
            </div>
          </div>
          ${repBtn ? `<div class="portal-card-acoes">${repBtn}</div>` : ''}
        </div>`;
    }).join('');
  },

  async inscreverAluno(turmaId) {
    const session = Auth.getSession();
    const turma   = Storage.getById('turmas', turmaId);
    if (!turma) return;

    const alunoId   = session.alunoId || session.id;
    const alunoNome = session.nome;

    const jaInscrito = Storage.getAll('turmaAlunos').find(i =>
      i.turmaId === turmaId && i.alunoId === alunoId && i.status === 'ativo'
    );
    if (jaInscrito) { UI.toast('Você já está inscrito nesta grade.', 'warning'); return; }

    Storage.create('turmaAlunos', { turmaId, turmaNome: turma.nome, alunoId, alunoNome, status: 'ativo', dataInscricao: new Date().toISOString() });
    UI.toast(`Inscrição em "${turma.nome}" realizada!`, 'success');
    this._tab = 'grades';
    this._renderAluno(session);
  },

  _renderAlunoFinanceiro(session) {
    const alunoId   = session.alunoId || session.id;
    const alunoNome = session.nome;

    // Matrículas do aluno
    const matriculas = Storage.getAll('matriculas').filter(m =>
      (alunoId && m.alunoId === alunoId) || m.alunoNome === alunoNome
    ).sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));

    const ST = {
      ativa:     { label: 'Ativa',     cor: '#10b981' },
      suspensa:  { label: 'Suspensa',  cor: '#f59e0b' },
      encerrada: { label: 'Encerrada', cor: '#6b7280' },
      cancelada: { label: 'Cancelada', cor: '#ef4444' },
    };

    const ativa = matriculas.find(m => m.status === 'ativa');

    const resumo = ativa ? `
      <div class="portal-fin-resumo">
        <div class="portal-fin-plano">
          <div class="portal-fin-plano-label">Plano atual</div>
          <div class="portal-fin-plano-nome">${UI.escape(ativa.planoNome)}</div>
        </div>
        <div class="portal-fin-vals">
          <div><span class="portal-fin-label">Valor pago</span><span class="portal-fin-val">R$ ${Number(ativa.valorPago||0).toFixed(2).replace('.',',')}</span></div>
          <div><span class="portal-fin-label">Pagamento</span><span class="portal-fin-val">${ativa.formaPagamento?.replace('_',' ') || '—'}</span></div>
          <div><span class="portal-fin-label">Vigência</span><span class="portal-fin-val">${(ativa.dataInicio||'').split('-').reverse().join('/')} – ${(ativa.dataFim||'').split('-').reverse().join('/')}</span></div>
        </div>
      </div>` : `<div class="portal-empty"><div class="portal-empty-icon">📄</div><div>Nenhuma matrícula ativa</div></div>`;

    const historico = matriculas.length ? `
      <div class="portal-fin-historico">
        <div class="portal-fin-hist-titulo">Histórico de matrículas</div>
        ${matriculas.map(m => {
          const st = ST[m.status] || { label: m.status, cor: '#6b7280' };
          return `
            <div class="portal-fin-hist-row">
              <div>
                <div style="font-weight:600;font-size:13px;">${UI.escape(m.planoNome)}</div>
                <div style="font-size:12px;color:var(--text-muted);">${(m.dataInicio||'').split('-').reverse().join('/')} – ${(m.dataFim||'').split('-').reverse().join('/')}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:600;">R$ ${Number(m.valorPago||0).toFixed(2).replace('.',',')}</div>
                <span class="portal-badge" style="background:${st.cor}20;color:${st.cor};border:1px solid ${st.cor}40;">${st.label}</span>
              </div>
            </div>`;
        }).join('')}
      </div>` : '';

    return `<div class="portal-fin">${resumo}${historico}</div>`;
  },

  async cancelarInscricao(inscricaoId) {
    const i  = Storage.getById('turmaAlunos', inscricaoId);
    if (!i) return;
    const ok = await UI.confirm(`Cancelar inscrição em "${i.turmaNome}"?`, 'Cancelar inscrição');
    if (!ok) return;
    Storage.update('turmaAlunos', inscricaoId, { status: 'inativo' });
    UI.toast('Inscrição cancelada.', 'info');
    const session = Auth.getSession();
    if (session) this._renderAluno(session);
  },
};
