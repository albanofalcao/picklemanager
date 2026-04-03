'use strict';

/**
 * PortalModule — Portal dedicado para Professor e Aluno.
 * Interface moderna e focada em cada perfil.
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

    const appLayout  = document.getElementById('app-layout');
    const portalWrap = document.getElementById('portal-wrap');
    if (appLayout)  appLayout.style.display  = 'none';
    if (portalWrap) portalWrap.style.display = 'flex';

    const badge = document.getElementById('portal-user-badge');
    if (badge) {
      const icon = perfil === 'professor' ? '🎓' : '🧑‍🎓';
      badge.innerHTML = `${icon} <strong>${UI.escape(session.nome)}</strong>`;
    }

    if (perfil === 'professor') {
      this._tab = 'hoje';
      this._renderProfessor(session);
    } else {
      this._tab = 'proxima';
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
  /*  Helpers compartilhados                                              */
  /* ------------------------------------------------------------------ */

  _saudacao() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  },

  _fmtHora(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },

  _fmtDataCurta(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  },

  _diasRestantes(dataFim) {
    if (!dataFim) return null;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const fim  = new Date(dataFim + 'T00:00:00');
    return Math.ceil((fim - hoje) / 86400000);
  },

  /* ------------------------------------------------------------------ */
  /*  PORTAL DO PROFESSOR                                                 */
  /* ------------------------------------------------------------------ */

  _renderProfessor(session) {
    const el = document.getElementById('portal-content');
    if (!el) return;

    const hoje    = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);
    const hojeFmt = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    const todasAulas = Storage.getAll('aulas').filter(a =>
      session.professorId ? a.professorId === session.professorId : a.professorNome === session.nome
    );

    const aulasHoje  = todasAulas.filter(a => a.data === hojeStr && a.status !== 'cancelada')
                                 .sort((a,b) => (a.horarioInicio||'').localeCompare(b.horarioInicio||''));
    const proximas   = todasAulas.filter(a => a.data > hojeStr  && a.status !== 'cancelada')
                                 .sort((a,b) => a.data.localeCompare(b.data) || (a.horarioInicio||'').localeCompare(b.horarioInicio||''))
                                 .slice(0, 20);
    const anteriores = todasAulas.filter(a => a.data < hojeStr  && a.status !== 'cancelada')
                                 .sort((a,b) => b.data.localeCompare(a.data))
                                 .slice(0, 15);

    // Stats do hero
    const totalAlunosHoje = aulasHoje.reduce((acc, a) => {
      const ins = a.turmaId
        ? Storage.getAll('turmaAlunos').filter(i => i.turmaId === a.turmaId && i.status === 'ativo').length
        : 0;
      return acc + ins;
    }, 0);

    const proximaAula = aulasHoje.find(a => {
      const agora = hoje.toTimeString().slice(0,5);
      return (a.horarioInicio || '00:00') >= agora;
    }) || aulasHoje[0];

    const proximaInfo = proximaAula
      ? `${proximaAula.horarioInicio} – ${proximaAula.horarioFim || '—'}`
      : 'Nenhuma';

    // Tabs
    const tabs = [
      { key: 'hoje',     label: `Hoje  (${aulasHoje.length})` },
      { key: 'proximas', label: 'Próximas' },
      { key: 'passadas', label: 'Histórico' },
    ];

    const tabBar = tabs.map(t => `
      <button class="portal-tab-btn ${this._tab === t.key ? 'active' : ''}"
        onclick="PortalModule._setTabProf('${t.key}')">${t.label}</button>
    `).join('');

    let content = '';
    if (this._tab === 'hoje') {
      content = aulasHoje.length
        ? aulasHoje.map((a, i) => this._cardAulaProfessor(a, true, i === 0)).join('')
        : `<div class="portal-empty">
             <div class="portal-empty-icon">🏖️</div>
             <p>Nenhuma aula programada para hoje.<br>Aproveite o descanso!</p>
           </div>`;
    } else if (this._tab === 'proximas') {
      content = proximas.length
        ? proximas.map(a => this._cardAulaProfessor(a, false, false)).join('')
        : `<div class="portal-empty">
             <div class="portal-empty-icon">📭</div>
             <p>Nenhuma aula próxima agendada.</p>
           </div>`;
    } else {
      content = anteriores.length
        ? anteriores.map(a => this._cardAulaProfessor(a, false, false)).join('')
        : `<div class="portal-empty">
             <div class="portal-empty-icon">📋</div>
             <p>Nenhum histórico disponível.</p>
           </div>`;
    }

    el.innerHTML = `
      <div class="portal-inner">

        <!-- Hero -->
        <div class="portal-hero">
          <div class="portal-hero-inner">
            <div class="portal-hero-saudacao">${this._saudacao()}</div>
            <div class="portal-hero-nome">${UI.escape(session.nome.split(' ')[0])} 👋</div>
            <div class="portal-hero-data">${hojeFmt}</div>
            <div class="portal-hero-stats">
              <div class="portal-hero-stat">
                <div class="portal-hero-stat-val">${aulasHoje.length}</div>
                <div class="portal-hero-stat-label">Aulas hoje</div>
              </div>
              <div class="portal-hero-stat">
                <div class="portal-hero-stat-val">${totalAlunosHoje}</div>
                <div class="portal-hero-stat-label">Alunos esperados</div>
              </div>
              <div class="portal-hero-stat portal-hero-stat-accent">
                <div class="portal-hero-stat-val">${proximas.length}</div>
                <div class="portal-hero-stat-label">Próximas aulas</div>
              </div>
              ${proximaAula ? `
              <div class="portal-hero-stat">
                <div class="portal-hero-stat-val" style="font-size:15px;">${proximaInfo}</div>
                <div class="portal-hero-stat-label">Próxima aula</div>
              </div>` : ''}
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="portal-tabs">${tabBar}</div>

        <!-- Conteúdo -->
        <div class="portal-cards">${content}</div>

      </div>`;
  },

  _setTabProf(tab) {
    this._tab = tab;
    const session = Auth.getSession();
    if (session) this._renderProfessor(session);
  },

  _cardAulaProfessor(a, isHoje, isProxima) {
    const hr       = a.horarioInicio || '—';
    const hrFim    = a.horarioFim    || '—';
    const st       = TurmasModule?.STATUS_AULA?.[a.status] || {};

    const inscritos = a.turmaId
      ? Storage.getAll('turmaAlunos').filter(i => i.turmaId === a.turmaId && i.status === 'ativo')
      : [];

    const presencas = Storage.getAll('presencas').filter(p => p.aulaId === a.id);
    const presentes = presencas.filter(p => p.presente).length;
    const totalP    = presencas.length;

    const temCheckin  = !!a.professorCheckin;
    const temCheckout = !!a.professorCheckout;

    const corStatus = st.cor || '#6b7280';
    const classe    = isProxima && isHoje ? 'portal-card portal-card-hoje' : 'portal-card';

    let acoesBtns = '';
    if (isHoje) {
      if (!temCheckin && ['agendada','em_andamento'].includes(a.status)) {
        acoesBtns += `<button class="btn btn-primary btn-sm" onclick="PortalModule.professorCheckin('${a.id}')">▶ Registrar entrada</button>`;
      }
      if (temCheckin && !temCheckout && a.status === 'em_andamento') {
        acoesBtns += `<button class="btn btn-secondary btn-sm" onclick="PortalModule.professorCheckout('${a.id}')">■ Registrar saída</button>`;
      }
      if (['agendada','em_andamento','concluida'].includes(a.status)) {
        acoesBtns += `<button class="btn btn-ghost btn-sm" onclick="PortalModule.abrirPresenca('${a.id}')">📋 Frequência</button>`;
      }
    } else if (a.status === 'concluida') {
      acoesBtns += `<button class="btn btn-ghost btn-sm" onclick="PortalModule.abrirPresenca('${a.id}')">📋 Ver frequência</button>`;
    }

    const dataLabel = !isHoje ? `<span>📅 ${this._fmtDataCurta(a.data)}</span>` : '';

    const checkinBadge = temCheckin
      ? `<span class="portal-badge badge-success">▶ ${a.professorCheckin}${temCheckout ? ` · ■ ${a.professorCheckout}` : ''}</span>`
      : '';

    const presStats = totalP
      ? `<span class="portal-badge ${presentes === inscritos.length && presentes > 0 ? 'badge-success' : 'badge-warning'}">${presentes}/${inscritos.length} presentes</span>`
      : '';

    return `
      <div class="${classe}">
        <div class="portal-card-body">
          <div class="portal-card-horario">
            <div class="portal-card-hora-inicio">${hr}</div>
            <div class="portal-card-hora-sep"></div>
            <div class="portal-card-hora-fim">${hrFim}</div>
          </div>
          <div class="portal-card-info">
            <div class="portal-card-titulo">${UI.escape(a.titulo)}</div>
            <div class="portal-card-meta">
              ${dataLabel}
              ${a.arenaNome ? `<span>🏟️ ${UI.escape(a.arenaNome)}</span>` : ''}
              ${inscritos.length ? `<span>👥 ${inscritos.length} aluno${inscritos.length !== 1 ? 's' : ''}</span>` : ''}
              ${a.turmaNome ? `<span>📚 ${UI.escape(a.turmaNome)}</span>` : ''}
            </div>
            <div class="portal-card-badges">
              <span class="portal-badge" style="background:${corStatus}20;color:${corStatus};border:1px solid ${corStatus}40;">${st.label || a.status}</span>
              ${checkinBadge}
              ${presStats}
            </div>
          </div>
        </div>
        ${acoesBtns ? `<div class="portal-card-acoes">${acoesBtns}</div>` : ''}
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
      const p    = presMap[i.alunoId];
      const pres = p?.presente ?? false;
      return `
        <div class="presenca-row">
          <label class="presenca-aluno-label">
            <input type="checkbox" class="presenca-check"
              data-aluno-id="${i.alunoId}"
              data-aluno-nome="${UI.escape(i.alunoNome)}"
              ${pres ? 'checked' : ''} />
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
      if (existing) Storage.update('presencas', existing.id, { presente });
      else          Storage.create('presencas', { aulaId, alunoId, alunoNome, presente });
      salvos++;
    });
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

    const alunoId = session.alunoId || session.id;

    // Plano ativo
    const matriculas = Storage.getAll('matriculas').filter(m =>
      (alunoId && m.alunoId === alunoId) || m.alunoNome === session.nome
    ).sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
    const ativa = matriculas.find(m => m.status === 'ativa');
    const plano = ativa ? Storage.getAll('planos').find(p => p.id === ativa.planoId) : null;

    // Saldo de aulas
    const mesAtual = hoje.slice(0, 7);
    const saldo    = SaldoService.getSaldo(alunoId, mesAtual);

    // Próximas aulas
    const inscricoes = Storage.getAll('turmaAlunos').filter(i =>
      (alunoId ? i.alunoId === alunoId : i.alunoNome === session.nome) && i.status === 'ativo'
    );
    const turmaIds = new Set(inscricoes.map(i => i.turmaId));
    const proximasAulas = Storage.getAll('aulas')
      .filter(a => a.turmaId && turmaIds.has(a.turmaId) && a.data >= hoje && a.status !== 'cancelada')
      .sort((a, b) => a.data.localeCompare(b.data) || (a.horarioInicio||'').localeCompare(b.horarioInicio||''));

    const proxima = proximasAulas[0];

    // Hero banner
    const diasRestantes = ativa ? this._diasRestantes(ativa.dataFim) : null;
    const nivelAluno    = Storage.getAll('alunos').find(a => a.id === alunoId)?.nivel || '';

    const tabs = [
      { key: 'proxima',   label: '📅 Cronograma' },
      { key: 'grades',    label: '📚 Minhas Grades' },
      { key: 'descobrir', label: '🔍 Descobrir' },
      { key: 'financeiro',label: '💰 Financeiro' },
    ];

    const tabBar = tabs.map(t => `
      <button class="portal-tab-btn ${this._tab === t.key ? 'active' : ''}"
        onclick="PortalModule._setTabAluno('${t.key}')">${t.label}</button>
    `).join('');

    let content = '';
    if      (this._tab === 'proxima')    content = this._renderAlunoProximas(session, hoje, proximasAulas);
    else if (this._tab === 'grades')     content = this._renderAlunoGrades(session);
    else if (this._tab === 'descobrir')  content = this._renderAlunoDescobrirGrades(session);
    else if (this._tab === 'financeiro') content = this._renderAlunoFinanceiro(session, matriculas);

    // Card do plano
    const pct      = saldo.total > 0 ? Math.min(100, Math.round((saldo.usado / saldo.total) * 100)) : 0;
    const corProg  = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
    const nivelBadge = nivelAluno ? `<span class="portal-badge badge-blue" style="margin-left:8px;">${nivelAluno}</span>` : '';

    const planoCard = ativa ? `
      <div class="portal-plano-card">
        <div class="portal-plano-label">Plano ativo</div>
        <div class="portal-plano-nome">${UI.escape(ativa.planoNome)}</div>
        ${saldo.total > 0 ? `
        <div class="portal-plano-progress-wrap">
          <div class="portal-plano-progress-header">
            <span class="portal-plano-progress-label">Aulas do mês</span>
            <span class="portal-plano-progress-nums">${saldo.usado} de ${saldo.total} usadas · ${saldo.disponivel} disponíveis</span>
          </div>
          <div class="portal-plano-progress-track">
            <div class="portal-plano-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${corProg},${corProg}cc);"></div>
          </div>
        </div>` : ''}
        <div class="portal-plano-footer">
          ${ativa.dataInicio ? `<div class="portal-plano-info-item"><div class="portal-plano-info-label">Início</div><div class="portal-plano-info-val">${this._fmtDataCurta(ativa.dataInicio)}</div></div>` : ''}
          ${ativa.dataFim ? `<div class="portal-plano-info-item"><div class="portal-plano-info-label">Vencimento</div><div class="portal-plano-info-val">${this._fmtDataCurta(ativa.dataFim)}${diasRestantes !== null ? ` (${diasRestantes}d)` : ''}</div></div>` : ''}
          ${ativa.formaPagamento ? `<div class="portal-plano-info-item"><div class="portal-plano-info-label">Pagamento</div><div class="portal-plano-info-val">${ListasService.label('matriculas_forma_pagamento', ativa.formaPagamento)}</div></div>` : ''}
        </div>
      </div>` : `
      <div class="portal-plano-card" style="text-align:center;">
        <div class="portal-plano-label">Plano ativo</div>
        <div style="font-size:32px;margin:8px 0;">📋</div>
        <div style="color:rgba(255,255,255,.7);font-size:14px;">Nenhuma matrícula ativa</div>
      </div>`;

    el.innerHTML = `
      <div class="portal-inner">

        <!-- Hero -->
        <div class="portal-hero">
          <div class="portal-hero-inner">
            <div class="portal-hero-saudacao">${this._saudacao()}</div>
            <div class="portal-hero-nome">${UI.escape(session.nome.split(' ')[0])} 👋${nivelBadge}</div>
            <div class="portal-hero-data">${hojeFmt}</div>
            <div class="portal-hero-stats">
              <div class="portal-hero-stat portal-hero-stat-accent">
                <div class="portal-hero-stat-val">${saldo.disponivel}</div>
                <div class="portal-hero-stat-label">Aulas disponíveis</div>
              </div>
              <div class="portal-hero-stat">
                <div class="portal-hero-stat-val">${inscricoes.length}</div>
                <div class="portal-hero-stat-label">Grades inscritas</div>
              </div>
              <div class="portal-hero-stat">
                <div class="portal-hero-stat-val">${proximasAulas.length}</div>
                <div class="portal-hero-stat-label">Aulas próximas</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Plano card -->
        ${planoCard}

        <!-- Tabs -->
        <div class="portal-tabs">${tabBar}</div>

        <!-- Conteúdo -->
        <div class="portal-cards">${content}</div>

      </div>`;
  },

  _setTabAluno(tab) {
    this._tab = tab;
    const session = Auth.getSession();
    if (session) this._renderAluno(session);
  },

  _renderAlunoProximas(session, hoje, aulas) {
    if (!aulas.length) {
      return `<div class="portal-empty">
        <div class="portal-empty-icon">📭</div>
        <p>Nenhuma aula próxima encontrada.<br>Inscreva-se em uma grade para começar!</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="PortalModule._setTabAluno('descobrir')">Descobrir grades</button>
      </div>`;
    }

    const alunoId = session.alunoId || session.id;

    return aulas.map((a, idx) => {
      const isHoje   = a.data === hoje;
      const dataFmt  = isHoje ? 'Hoje' : this._fmtDataCurta(a.data);
      const hr       = [a.horarioInicio, a.horarioFim].filter(Boolean).join(' – ') || '—';
      const presenca = Storage.getAll('presencas').find(p => p.aulaId === a.id && p.alunoId === alunoId);
      const jaTemRep = Storage.getAll('reposicoes').find(r =>
        r.aulaOriginalId === a.id && r.alunoId === alunoId && r.status === 'agendada'
      );

      const presTag = presenca
        ? `<span class="portal-badge ${presenca.presente ? 'badge-success' : 'badge-danger'}">${presenca.presente ? '✓ Presente' : '✗ Falta'}</span>`
        : '';

      const repBtn = !jaTemRep && a.status === 'agendada' && TurmasModule?.solicitarReposicao
        ? `<button class="btn btn-ghost btn-sm" onclick="TurmasModule.solicitarReposicao('${a.id}')">🔄 Solicitar reposição</button>`
        : '';

      const classe = isHoje && idx === 0 ? 'portal-card portal-card-hoje' : 'portal-card';

      return `
        <div class="${classe}">
          <div class="portal-card-body">
            <div class="portal-card-horario">
              <div class="portal-card-hora-inicio">${a.horarioInicio || '—'}</div>
              <div class="portal-card-hora-sep"></div>
              <div class="portal-card-hora-fim">${a.horarioFim || '—'}</div>
            </div>
            <div class="portal-card-info">
              <div class="portal-card-titulo">${isHoje && idx === 0 ? '📍 ' : ''}${UI.escape(a.titulo)}</div>
              <div class="portal-card-meta">
                <span>📅 ${dataFmt}</span>
                ${a.arenaNome ? `<span>🏟️ ${UI.escape(a.arenaNome)}</span>` : ''}
                ${a.turmaNome ? `<span>📚 ${UI.escape(a.turmaNome)}</span>` : ''}
              </div>
              ${presTag ? `<div class="portal-card-badges">${presTag}</div>` : ''}
            </div>
          </div>
          ${repBtn ? `<div class="portal-card-acoes">${repBtn}</div>` : ''}
        </div>`;
    }).join('');
  },

  _renderAlunoGrades(session) {
    const alunoId = session.alunoId || session.id;
    const inscricoes = Storage.getAll('turmaAlunos').filter(i =>
      (alunoId ? i.alunoId === alunoId : i.alunoNome === session.nome) && i.status === 'ativo'
    );

    if (!inscricoes.length) {
      return `<div class="portal-empty">
        <div class="portal-empty-icon">📭</div>
        <p>Você ainda não está inscrito em nenhuma grade.</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="PortalModule._setTabAluno('descobrir')">Descobrir grades</button>
      </div>`;
    }

    const DIAS = { seg:'Seg', ter:'Ter', qua:'Qua', qui:'Qui', sex:'Sex', sab:'Sáb', dom:'Dom' };

    return inscricoes.map(i => {
      const turma = Storage.getById('turmas', i.turmaId);
      const dias  = (turma?.diasSemana || []).map(d => DIAS[d] || d).join(' · ');
      const hr    = turma ? [turma.horarioInicio, turma.horarioFim].filter(Boolean).join(' – ') : '';
      return `
        <div class="portal-card">
          <div class="portal-card-body">
            <div class="portal-card-info">
              <div class="portal-card-titulo">📚 ${UI.escape(i.turmaNome)}</div>
              <div class="portal-card-meta">
                ${turma?.professorNome ? `<span>🎓 ${UI.escape(turma.professorNome)}</span>` : ''}
                ${turma?.arenaNome    ? `<span>🏟️ ${UI.escape(turma.arenaNome)}</span>` : ''}
                ${dias ? `<span>📆 ${dias}</span>` : ''}
                ${hr   ? `<span>🕐 ${hr}</span>` : ''}
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
    const alunoId = session.alunoId || session.id;
    const inscricoes = Storage.getAll('turmaAlunos').filter(i =>
      (alunoId ? i.alunoId === alunoId : i.alunoNome === session.nome) && i.status === 'ativo'
    );
    const inscritosIds = new Set(inscricoes.map(i => i.turmaId));
    const grades = Storage.getAll('turmas').filter(t => t.status === 'ativa' && !inscritosIds.has(t.id));

    if (!grades.length) {
      return `<div class="portal-empty">
        <div class="portal-empty-icon">✅</div>
        <p>Você está inscrito em todas as grades disponíveis!</p>
      </div>`;
    }

    const DIAS = { seg:'Seg', ter:'Ter', qua:'Qua', qui:'Qui', sex:'Sex', sab:'Sáb', dom:'Dom' };

    return grades.map(t => {
      const dias  = (t.diasSemana || []).map(d => DIAS[d] || d).join(' · ');
      const hr    = [t.horarioInicio, t.horarioFim].filter(Boolean).join(' – ');
      const ins   = Storage.getAll('turmaAlunos').filter(i => i.turmaId === t.id && i.status === 'ativo').length;
      const vagas = t.vagas > 0 ? Math.max(0, t.vagas - ins) : null;
      const semVaga = vagas !== null && vagas === 0;

      return `
        <div class="portal-card">
          <div class="portal-card-body">
            <div class="portal-card-info">
              <div class="portal-card-titulo">📚 ${UI.escape(t.nome)}</div>
              <div class="portal-card-meta">
                ${t.professorNome ? `<span>🎓 ${UI.escape(t.professorNome)}</span>` : ''}
                ${t.arenaNome    ? `<span>🏟️ ${UI.escape(t.arenaNome)}</span>` : ''}
                ${dias ? `<span>📆 ${dias}</span>` : ''}
                ${hr   ? `<span>🕐 ${hr}</span>`  : ''}
              </div>
              <div class="portal-card-badges">
                ${vagas !== null
                  ? `<span class="portal-badge ${semVaga ? 'badge-danger' : 'badge-success'}">${semVaga ? 'Sem vagas' : vagas + ' vaga' + (vagas !== 1 ? 's' : '')}</span>`
                  : '<span class="portal-badge badge-blue">Vagas ilimitadas</span>'}
                ${t.nivel ? `<span class="portal-badge badge-gray">${t.nivel}</span>` : ''}
              </div>
            </div>
          </div>
          ${!semVaga ? `
          <div class="portal-card-acoes">
            <button class="btn btn-primary btn-sm" onclick="PortalModule.inscreverAluno('${t.id}')">+ Inscrever-se</button>
          </div>` : ''}
        </div>`;
    }).join('');
  },

  _renderAlunoFinanceiro(session, matriculas) {
    const alunoId = session.alunoId || session.id;

    const ST = {
      ativa:     { label: 'Ativa',     cor: '#10b981' },
      suspensa:  { label: 'Suspensa',  cor: '#f59e0b' },
      encerrada: { label: 'Encerrada', cor: '#6b7280' },
      vencida:   { label: 'Vencida',   cor: '#ef4444' },
    };

    const ativa = matriculas.find(m => m.status === 'ativa');

    // Barras de saldo
    const agora = new Date();
    const saldoBars = [0, -1, -2].map(offset => {
      const d   = new Date(agora.getFullYear(), agora.getMonth() + offset, 1);
      const mes = d.toISOString().slice(0, 7);
      return SaldoService.barSaldo(alunoId, mes);
    }).join('');

    const resumo = ativa ? `
      <div class="portal-fin-resumo">
        <div class="portal-fin-plano">
          <div class="portal-fin-plano-label">Plano atual</div>
          <div class="portal-fin-plano-nome">${UI.escape(ativa.planoNome)}</div>
        </div>
        <div class="portal-fin-vals">
          <div>
            <span class="portal-fin-label">Valor</span>
            <span class="portal-fin-val">R$ ${Number(ativa.valorPago||0).toFixed(2).replace('.',',')}</span>
          </div>
          <div>
            <span class="portal-fin-label">Forma</span>
            <span class="portal-fin-val">${ListasService.label('matriculas_forma_pagamento', ativa.formaPagamento)}</span>
          </div>
          <div>
            <span class="portal-fin-label">Vigência</span>
            <span class="portal-fin-val">${this._fmtDataCurta(ativa.dataInicio)} – ${this._fmtDataCurta(ativa.dataFim)}</span>
          </div>
        </div>
      </div>` : `<div class="portal-empty"><div class="portal-empty-icon">📄</div><p>Nenhuma matrícula ativa</p></div>`;

    const historico = matriculas.length ? `
      <div class="portal-fin-historico">
        <div class="portal-fin-hist-titulo">Histórico de matrículas</div>
        ${matriculas.map(m => {
          const st = ST[m.status] || { label: m.status, cor: '#6b7280' };
          return `
            <div class="portal-fin-hist-row">
              <div>
                <div style="font-weight:600;font-size:13px;">${UI.escape(m.planoNome)}</div>
                <div style="font-size:12px;color:var(--text-muted);">${this._fmtDataCurta(m.dataInicio)} – ${this._fmtDataCurta(m.dataFim)}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:600;">R$ ${Number(m.valorPago||0).toFixed(2).replace('.',',')}</div>
                <span class="portal-badge" style="background:${st.cor}20;color:${st.cor};border:1px solid ${st.cor}40;">${st.label}</span>
              </div>
            </div>`;
        }).join('')}
      </div>` : '';

    return `<div class="portal-fin"><div class="portal-fin-saldo">${saldoBars}</div>${resumo}${historico}</div>`;
  },

  async inscreverAluno(turmaId) {
    const session   = Auth.getSession();
    const turma     = Storage.getById('turmas', turmaId);
    if (!turma) return;

    const alunoId   = session.alunoId || session.id;
    const alunoNome = session.nome;

    const jaInscrito = Storage.getAll('turmaAlunos').find(i =>
      i.turmaId === turmaId && i.alunoId === alunoId && i.status === 'ativo'
    );
    if (jaInscrito) { UI.toast('Você já está inscrito nesta grade.', 'warning'); return; }

    Storage.create('turmaAlunos', {
      turmaId, turmaNome: turma.nome, alunoId, alunoNome,
      status: 'ativo', dataInscricao: new Date().toISOString(),
    });
    UI.toast(`Inscrição em "${turma.nome}" realizada!`, 'success');
    this._tab = 'grades';
    this._renderAluno(session);
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
