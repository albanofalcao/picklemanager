'use strict';

/**
 * Stub modules configuration and dashboard renderer
 */

const STUB_CONFIG = {
  alunos: {
    icon:  '👥',
    title: 'Alunos',
    desc:  'Cadastro e gestão de alunos matriculados, histórico de aulas e progresso.',
  },
  planos: {
    icon:  '📋',
    title: 'Planos de Contratação',
    desc:  'Gerencie pacotes, mensalidades e contratos dos alunos.',
  },
  professores: {
    icon:  '🎓',
    title: 'Professores',
    desc:  'Cadastro de instrutores, horários disponíveis e especialidades.',
  },
  aulas: {
    icon:  '🏸',
    title: 'Aulas',
    desc:  'Agendamento e gestão de aulas individuais e em grupo.',
  },
  eventos: {
    icon:  '🏆',
    title: 'Eventos',
    desc:  'Organize torneios, campeonatos e eventos especiais da academia.',
  },
  financeiro: {
    icon:  '💰',
    title: 'Financeiro',
    desc:  'Controle de receitas, despesas, cobranças e relatórios financeiros.',
  },
  manutencao: {
    icon:  '🔧',
    title: 'Manutenção',
    desc:  'Registro de chamados de manutenção das arenas e equipamentos.',
  },
};

/**
 * Render a stub page or the real dashboard.
 * @param {string} key - module key
 */
function renderStub(key) {
  if (key === 'dashboard') {
    renderDashboard();
    return;
  }

  const cfg = STUB_CONFIG[key];
  const area = document.getElementById('content-area');
  if (!area) return;

  area.innerHTML = `
    <div class="coming-soon">
      <div class="coming-soon-icon">${cfg ? cfg.icon : '🚧'}</div>
      <div class="coming-soon-title">${cfg ? UI.escape(cfg.title) : UI.escape(key)}</div>
      <div class="coming-soon-desc">
        ${cfg ? UI.escape(cfg.desc) : 'Este módulo está em desenvolvimento.'}
        <br><br>
        Em breve estará disponível com todas as funcionalidades necessárias para a gestão completa da academia.
      </div>
      <span class="badge badge-warning mt-16" style="font-size:13px;padding:5px 14px;">🚧 Em desenvolvimento</span>
    </div>`;
}

/**
 * Builds the HTML for the "Vencimentos Próximos" dashboard panel.
 * Shows matrículas vencidas or expiring in ≤ 30 days.
 */
function _buildVencimentosHtml() {
  const hoje = new Date().toISOString().slice(0, 10);

  const lista = Storage.getAll('matriculas')
    .filter(m => (m.status === 'ativa' || m.status === 'vencida') && m.dataFim)
    .map(m => {
      const diff = Math.ceil(
        (new Date(m.dataFim + 'T00:00:00') - new Date(hoje + 'T00:00:00')) / 86400000
      );
      return { ...m, _diff: diff };
    })
    .filter(m => m._diff <= 30)
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 8);

  if (!lista.length) {
    return `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">
      ✅ Nenhum vencimento nos próximos 30 dias.
    </div>`;
  }

  const _fmtDate = d => {
    if (!d) return '—';
    const [y, m, dy] = d.split('-');
    return `${dy}/${m}/${y}`;
  };

  return lista.map(m => {
    const diff   = m._diff;
    const vencTxt = diff < 0
      ? `<span style="color:var(--red,#dc2626);font-weight:700;">Vencida há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}</span>`
      : diff === 0
        ? `<span style="color:var(--red,#dc2626);font-weight:700;">Vence hoje</span>`
        : diff <= 3
          ? `<span style="color:var(--red,#dc2626);font-weight:600;">Em ${diff} dia${diff !== 1 ? 's' : ''}</span>`
          : diff <= 7
            ? `<span style="color:var(--amber,#d97706);font-weight:600;">Em ${diff} dias</span>`
            : `<span style="color:var(--text-muted);">Em ${diff} dias — ${_fmtDate(m.dataFim)}</span>`;

    return `
      <div class="dash-venc-item" onclick="MatriculaModule.abrirCobranca('${m.id}')" title="Abrir cobrança">
        <div class="dash-venc-avatar">${(m.alunoNome || '?').charAt(0).toUpperCase()}</div>
        <div class="dash-venc-info">
          <div class="dash-venc-nome">${UI.escape(m.alunoNome || '—')}</div>
          <div class="dash-venc-plano">${UI.escape(m.planoNome || '—')}</div>
        </div>
        <div class="dash-venc-status">${vencTxt}</div>
      </div>`;
  }).join('');
}

/**
 * Render the main dashboard page.
 * Layout: stats compactos → duas colunas (alertas | gráficos).
 */
function renderDashboard() {
  if (typeof isMatriz === 'function' && isMatriz()) {
    renderMatrizDashboard();
    return;
  }
  const area = document.getElementById('content-area');
  if (!area) return;

  const session        = Auth.getCurrentUser();
  const alunoStats     = AlunoModule.getStats();
  const aulaStats      = TurmasModule.getAulaStats();
  const finStats       = FinanceiroModule.getStats();
  const manutStats     = ManutencaoModule.getStats();
  const matStats       = MatriculaModule.getStats();

  // ── Notificações agrupadas ──────────────────────────────
  const notifs = Notifications.getAll();

  const nivelConfig = {
    error:   { cor: '#ef4444', bg: '#fee2e2', borda: '#fca5a5', label: 'Urgente'  },
    warning: { cor: '#f59e0b', bg: '#fef3c7', borda: '#fcd34d', label: 'Atenção'  },
    info:    { cor: '#3b82f6', bg: '#dbeafe', borda: '#93c5fd', label: 'Info'     },
  };

  const alertasHtml = notifs.length
    ? notifs.map(n => {
        const cfg = nivelConfig[n.nivel] || nivelConfig.info;
        return `
          <div class="dash-alerta" onclick="Router.navigate('${n.rota}')"
            style="border-left:3px solid ${cfg.cor};">
            <span class="dash-alerta-icon">${n.icon}</span>
            <div class="dash-alerta-body">
              <div class="dash-alerta-titulo" style="color:${cfg.cor};">${UI.escape(n.titulo)}</div>
              <div class="dash-alerta-desc">${UI.escape(n.desc)}</div>
            </div>
            <span class="dash-alerta-badge" style="background:${cfg.cor};">${cfg.label}</span>
          </div>`;
      }).join('')
    : `<div class="dash-tudo-ok">
        <span style="font-size:36px;">✅</span>
        <p>Tudo em dia! Nenhum alerta no momento.</p>
      </div>`;

  // ── Agenda do dia (hoje e amanhã) ──────────────────────
  const hoje   = new Date().toISOString().slice(0, 10);
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const _buildAulaItem = (a, label, badgeClass) => {
    // Conta alunos alocados (turmaAlunos ou aulaAlunos)
    const alocados = a.turmaId
      ? Storage.getAll('turmaAlunos').filter(i => i.turmaId === a.turmaId && i.status === 'ativo').length
      : Storage.getAll('aulaAlunos').filter(i => i.aulaId === a.id && i.status === 'ativo').length;
    const vagas = a.vagas || 0;
    const alunosLabel = alocados > 0
      ? `👥 ${alocados}${vagas > 0 ? '/' + vagas : ''}`
      : vagas > 0 ? `👥 0/${vagas}` : '';
    return `
      <div class="dash-aula-item" onclick="Router.navigate('turmas')" style="cursor:pointer;">
        <div class="dash-aula-hora">${UI.escape(a.horarioInicio || '--:--')}</div>
        <div class="dash-aula-info">
          <div class="dash-aula-titulo">${UI.escape(a.titulo)}</div>
          <div class="dash-aula-sub">
            ${UI.escape(a.professorNome || '—')} · ${UI.escape(a.arenaNome || '—')}
            ${alunosLabel ? `<span style="margin-left:6px;color:var(--text-muted);">${alunosLabel}</span>` : ''}
          </div>
        </div>
        <span class="badge ${badgeClass}" style="font-size:10px;flex-shrink:0;">${label}</span>
      </div>`;
  };

  const aulasHoje   = Storage.getAll('aulas').filter(a => a.data === hoje  && a.status === 'agendada').sort((a,b) => (a.horarioInicio||'').localeCompare(b.horarioInicio||''));
  const aulasAmanha = Storage.getAll('aulas').filter(a => a.data === amanha && a.status === 'agendada').sort((a,b) => (a.horarioInicio||'').localeCompare(b.horarioInicio||''));

  const aulasHtml = (aulasHoje.length + aulasAmanha.length) > 0
    ? `
      ${aulasHoje.length ? `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--color-primary,#3b9e8f);padding:6px 0 4px;">
          🌅 Hoje — ${aulasHoje.length} aula${aulasHoje.length !== 1 ? 's' : ''}
        </div>
        ${aulasHoje.map(a => _buildAulaItem(a, 'Hoje', 'badge-warning')).join('')}` : ''}
      ${aulasAmanha.length ? `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);padding:8px 0 4px;">
          ☀️ Amanhã — ${aulasAmanha.length} aula${aulasAmanha.length !== 1 ? 's' : ''}
        </div>
        ${aulasAmanha.slice(0, 4).map(a => _buildAulaItem(a, 'Amanhã', 'badge-blue')).join('')}` : ''}`
    : `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">Sem aulas agendadas para hoje ou amanhã.</div>`;

  area.innerHTML = `

    <!-- Stats compactos (1 linha) -->
    <div class="dash-stats-row">
      <div class="dash-stat" onclick="Router.navigate('alunos')" title="Alunos ativos">
        <span class="dash-stat-icon">👥</span>
        <div><div class="dash-stat-val">${alunoStats.ativos}</div><div class="dash-stat-lbl">Alunos ativos</div></div>
      </div>
      <div class="dash-stat" onclick="Router.navigate('turmas')" title="Aulas agendadas">
        <span class="dash-stat-icon">🏸</span>
        <div><div class="dash-stat-val">${aulaStats.agendadas}</div><div class="dash-stat-lbl">Aulas agendadas</div></div>
      </div>
      <div class="dash-stat" onclick="Router.navigate('matriculas')" title="Matrículas ativas">
        <span class="dash-stat-icon">📝</span>
        <div><div class="dash-stat-val">${matStats.ativas}</div><div class="dash-stat-lbl">Matrículas ativas</div></div>
      </div>
      <div class="dash-stat ${finStats.saldo < 0 ? 'dash-stat-danger' : ''}" onclick="Router.navigate('financeiro')" title="Saldo do mês">
        <span class="dash-stat-icon">💰</span>
        <div>
          <div class="dash-stat-val" style="font-size:13px;">${finStats.saldo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
          <div class="dash-stat-lbl">Saldo do mês</div>
        </div>
      </div>
      <div class="dash-stat ${(manutStats.abertos + manutStats.andamento) > 0 ? 'dash-stat-warn' : ''}" onclick="Router.navigate('manutencao')" title="Manutenções abertas">
        <span class="dash-stat-icon">🔧</span>
        <div><div class="dash-stat-val">${manutStats.abertos + manutStats.andamento}</div><div class="dash-stat-lbl">Manutenções abertas</div></div>
      </div>
      <div class="dash-stat ${(matStats.vencidas + matStats.vencendoEmBreve) > 0 ? 'dash-stat-danger' : ''}"
        onclick="MatriculaModule.abrirVencimentosRapido ? MatriculaModule.abrirVencimentosRapido() : Router.navigate('matriculas')"
        title="Vencimentos urgentes (vencidas + vencendo em ≤ 7 dias)">
        <span class="dash-stat-icon">⚠️</span>
        <div>
          <div class="dash-stat-val">${matStats.vencidas + matStats.vencendoEmBreve}</div>
          <div class="dash-stat-lbl">Vencimentos</div>
        </div>
      </div>
    </div>

    <!-- Layout principal: 2 colunas -->
    <div class="dash-main-grid">

      <!-- Coluna esquerda: Alertas + Próximas aulas -->
      <div class="dash-col-left">

        <!-- Painel de Alertas -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">🔔 Alertas &amp; Pendências</span>
            <span class="badge ${notifs.length > 0 ? 'badge-danger' : 'badge-success'}" style="font-size:11px;">
              ${notifs.length > 0 ? notifs.length + ' alerta' + (notifs.length > 1 ? 's' : '') : 'Tudo ok'}
            </span>
          </div>
          <div class="dash-alertas-list">
            ${alertasHtml}
          </div>
        </div>

        <!-- Próximas aulas -->
        <div class="dash-panel" style="margin-top:20px;">
          <div class="dash-panel-header">
            <span class="dash-panel-title">🏸 Próximas Aulas</span>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('turmas')" style="font-size:12px;">Ver todas →</button>
          </div>
          <div class="dash-aulas-list">
            ${aulasHtml}
          </div>
        </div>

      </div>

      <!-- Coluna direita: Gráficos + Vencimentos -->
      <div class="dash-col-right">

        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">💰 Financeiro — Mês Atual</span>
          </div>
          <div class="dash-chart-wrap" style="height:160px;">
            <canvas id="chart-financeiro"></canvas>
          </div>
        </div>

        <div class="dash-panel" style="margin-top:20px;">
          <div class="dash-panel-header">
            <span class="dash-panel-title">📅 Vencimentos Próximos</span>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('matriculas')" style="font-size:12px;">Ver todas →</button>
          </div>
          <div id="dash-vencimentos-list">
            ${_buildVencimentosHtml()}
          </div>
        </div>

        <div class="dash-panel" style="margin-top:20px;">
          <div class="dash-panel-header">
            <span class="dash-panel-title">👥 Alunos por Nível</span>
          </div>
          <div class="dash-chart-wrap" style="height:180px;">
            <canvas id="chart-niveis"></canvas>
          </div>
        </div>

      </div>

    </div>
  `;

  requestAnimationFrame(() => _initDashboardCharts(finStats));
}

/* ──────────────────────────────────────────────────────────
   MATRIZ — Dashboard consolidado de todas as arenas
   ────────────────────────────────────────────────────────── */

function renderMatrizDashboard() {
  const area = document.getElementById('content-area');
  if (!area) return;

  const mesAtual = new Date().toISOString().slice(0, 7);
  const _fmt = v => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

  // Tenants-arena (excluí a matriz)
  const arenasTenants = typeof TENANTS !== 'undefined'
    ? Object.entries(TENANTS)
        .filter(([, t]) => t.tipo !== 'matriz' && t.id)
        // Deduplica por ID (aliases lauro/LAU apontam pro mesmo tenant)
        .filter(([, t], idx, arr) => arr.findIndex(([, x]) => x.id === t.id) === idx)
        .map(([key, t]) => ({ key, ...t, nomeClean: (t.label||'').replace(/^[\u{1F3DB}\u{1F3EB}️\s]+/u, '') }))
    : [];

  // Dados consolidados
  const todosAlunos     = Storage.getAll('alunos');
  const todasMatriculas = Storage.getAll('matriculas');
  const todosFin        = Storage.getAll('financeiro');
  const todasAulas      = Storage.getAll('aulas');

  const totalAtivos    = todosAlunos.filter(a => a.status === 'ativo').length;
  const totalMatrics   = todasMatriculas.filter(m => m.status === 'ativa').length;
  const receitaMes     = todosFin.filter(f => f.tipo === 'receita' && (f.data||'').startsWith(mesAtual)).reduce((s,f) => s+(parseFloat(f.valor)||0), 0);
  const despesaMes     = todosFin.filter(f => f.tipo === 'despesa' && (f.data||'').startsWith(mesAtual)).reduce((s,f) => s+(parseFloat(f.valor)||0), 0);
  const saldoMes       = receitaMes - despesaMes;

  // Por-arena
  const porArena = {};
  arenasTenants.forEach(t => {
    const tid = t.id;
    porArena[tid] = {
      alunos:     todosAlunos.filter(a => a._tenantId === tid && a.status === 'ativo').length,
      matriculas: todasMatriculas.filter(m => m._tenantId === tid && m.status === 'ativa').length,
      receita:    todosFin.filter(f => f._tenantId === tid && f.tipo === 'receita' && (f.data||'').startsWith(mesAtual)).reduce((s,f) => s+(parseFloat(f.valor)||0), 0),
      aulas:      todasAulas.filter(a => a._tenantId === tid && a.status === 'agendada').length,
    };
  });

  // Ranking por receita
  const rankingReceita = [...arenasTenants]
    .sort((a,b) => (porArena[b.id]?.receita||0) - (porArena[a.id]?.receita||0))
    .slice(0, 5);

  const rankHtml = rankingReceita.map((t, i) => `
    <div class="dash-ranking-item" onclick="setTenant('${t.key}')" style="cursor:pointer;">
      <div class="dash-ranking-pos">${['🥇','🥈','🥉','4°','5°'][i]}</div>
      <div class="dash-ranking-nome">${UI.escape(t.nomeClean)}</div>
      <div class="dash-ranking-val">${_fmt(porArena[t.id]?.receita || 0)}</div>
    </div>`).join('');

  // Arena cards
  const arenaCards = arenasTenants.map(t => {
    const d = porArena[t.id] || {};
    const kpiRec = _fmt(d.receita || 0);
    return `
      <div class="dash-arena-card" onclick="setTenant('${t.key}')">
        <div class="dash-arena-card-header">
          <div class="dash-arena-card-icon">🏫</div>
          <div>
            <div class="dash-arena-card-nome">${UI.escape(t.nomeClean)}</div>
            <div class="dash-arena-card-slug">${t.key}</div>
          </div>
          <div class="dash-arena-card-go">→</div>
        </div>
        <div class="dash-arena-kpis">
          <div class="dash-arena-kpi">
            <div class="dash-arena-kpi-val">${d.alunos || 0}</div>
            <div class="dash-arena-kpi-lbl">Alunos</div>
          </div>
          <div class="dash-arena-kpi">
            <div class="dash-arena-kpi-val">${d.matriculas || 0}</div>
            <div class="dash-arena-kpi-lbl">Matrículas</div>
          </div>
          <div class="dash-arena-kpi">
            <div class="dash-arena-kpi-val" style="font-size:11px;line-height:1.4;">${kpiRec}</div>
            <div class="dash-arena-kpi-lbl">Receita</div>
          </div>
        </div>
      </div>`;
  }).join('');

  const mesLabel = new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' });

  area.innerHTML = `

    <div class="dash-matriz-hero">
      <div>
        <div class="dash-matriz-hero-title">🏛️ Rede Pickleball — Visão Consolidada</div>
        <div class="dash-matriz-hero-sub">${mesLabel}</div>
      </div>
      <div class="dash-matriz-hero-badge">Modo Matriz</div>
    </div>

    <div class="dash-stats-row" style="margin-bottom:20px;">
      <div class="dash-stat">
        <span class="dash-stat-icon">🏫</span>
        <div><div class="dash-stat-val">${arenasTenants.length}</div><div class="dash-stat-lbl">Arenas</div></div>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-icon">👥</span>
        <div><div class="dash-stat-val">${totalAtivos}</div><div class="dash-stat-lbl">Alunos ativos</div></div>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-icon">📝</span>
        <div><div class="dash-stat-val">${totalMatrics}</div><div class="dash-stat-lbl">Matrículas ativas</div></div>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-icon">💰</span>
        <div><div class="dash-stat-val" style="font-size:13px;">${_fmt(receitaMes)}</div><div class="dash-stat-lbl">Receita consolidada</div></div>
      </div>
      <div class="dash-stat ${saldoMes < 0 ? 'dash-stat-danger' : ''}">
        <span class="dash-stat-icon">${saldoMes >= 0 ? '📈' : '📉'}</span>
        <div>
          <div class="dash-stat-val" style="font-size:13px;color:${saldoMes >= 0 ? 'var(--green,#16a34a)' : 'var(--red,#dc2626)'};">${_fmt(saldoMes)}</div>
          <div class="dash-stat-lbl">Saldo do mês</div>
        </div>
      </div>
    </div>

    <!-- Arena cards -->
    <div class="dash-panel" style="margin-bottom:20px;">
      <div class="dash-panel-header">
        <span class="dash-panel-title">🏫 Suas Arenas — clique para gerenciar</span>
        <button class="btn btn-primary btn-sm" onclick="Router.navigate('arenas')">+ Nova Arena</button>
      </div>
      <div class="dash-arenas-grid">
        ${arenaCards || '<div style="padding:24px;text-align:center;color:var(--text-muted);">Nenhuma arena cadastrada. Crie a primeira acima.</div>'}
      </div>
    </div>

    <!-- Gráficos + ranking -->
    <div class="dash-main-grid">
      <div class="dash-col-left">
        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">💰 Receita por Arena</span>
          </div>
          <div class="dash-chart-wrap" style="height:200px;">
            <canvas id="chart-mtz-receita"></canvas>
          </div>
        </div>
      </div>
      <div class="dash-col-right">
        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">🏆 Ranking de Receita</span>
          </div>
          <div class="dash-ranking-list" style="padding:12px 16px;">
            ${rankHtml || '<div style="padding:12px;color:var(--text-muted);font-size:13px;text-align:center;">Sem dados de receita ainda.</div>'}
          </div>
        </div>

        <div class="dash-panel" style="margin-top:20px;">
          <div class="dash-panel-header">
            <span class="dash-panel-title">👥 Alunos por Arena</span>
          </div>
          <div class="dash-chart-wrap" style="height:170px;">
            <canvas id="chart-mtz-alunos"></canvas>
          </div>
        </div>
      </div>
    </div>`;

  requestAnimationFrame(() => _initMatrizCharts(porArena, arenasTenants));
}

function _initMatrizCharts(porArena, arenasTenants) {
  if (typeof Chart === 'undefined' || !arenasTenants.length) return;

  const labels = arenasTenants.map(t => t.nomeClean);
  const CORES  = ['#3b9e8f','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#10b981','#f97316','#ec4899'];

  // Receita por arena
  const ctxRec = document.getElementById('chart-mtz-receita');
  if (ctxRec) {
    new Chart(ctxRec, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Receita (R$)',
          data:  arenasTenants.map(t => porArena[t.id]?.receita || 0),
          backgroundColor: CORES.map((c,i) => CORES[i % CORES.length] + 'bb'),
          borderColor:     CORES.map((c,i) => CORES[i % CORES.length]),
          borderWidth: 2,
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.raw.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => 'R$'+v.toLocaleString('pt-BR'), font:{size:10} }, grid:{color:'rgba(0,0,0,.05)'} },
          x: { grid: { display: false }, ticks: { font:{size:11} } },
        },
      },
    });
  }

  // Alunos por arena (doughnut)
  const ctxAl = document.getElementById('chart-mtz-alunos');
  if (ctxAl) {
    const values = arenasTenants.map(t => porArena[t.id]?.alunos || 0);
    new Chart(ctxAl, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: CORES.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { position: 'bottom', labels: { padding:8, font:{size:11}, boxWidth:12 } },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} aluno${ctx.raw!==1?'s':''}` } },
        },
      },
    });
  }
}

/* ────────────────────────────────────────────────────────── */

function _initDashboardCharts(finStats) {
  if (typeof Chart === 'undefined') return;

  // --- Gráfico Financeiro: Receitas vs Despesas por categoria ---
  const ctxFin = document.getElementById('chart-financeiro');
  if (ctxFin) {
    const fin      = Storage.getAll('financeiro');
    const mesAtual = new Date().toISOString().slice(0, 7);
    const doMes    = fin.filter(f => (f.data || '').startsWith(mesAtual));

    // Agrupa receitas por categoria
    const catReceita = {};
    const catDespesa = {};
    doMes.forEach(f => {
      if (f.tipo === 'receita') {
        catReceita[f.categoria || 'outro'] = (catReceita[f.categoria || 'outro'] || 0) + (parseFloat(f.valor) || 0);
      } else {
        catDespesa[f.categoria || 'outro'] = (catDespesa[f.categoria || 'outro'] || 0) + (parseFloat(f.valor) || 0);
      }
    });

    const totalReceita = Object.values(catReceita).reduce((a, b) => a + b, 0);
    const totalDespesa = Object.values(catDespesa).reduce((a, b) => a + b, 0);

    new Chart(ctxFin, {
      type: 'bar',
      data: {
        labels: ['Receitas', 'Despesas'],
        datasets: [{
          label: 'Valor (R$)',
          data:  [totalReceita, totalDespesa],
          backgroundColor: ['rgba(22,163,74,0.7)', 'rgba(239,68,68,0.7)'],
          borderColor:     ['#16a34a', '#ef4444'],
          borderWidth: 2,
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.raw.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => 'R$ ' + v.toLocaleString('pt-BR'),
              font: { size: 10 },
            },
            grid: { color: 'rgba(0,0,0,.06)' },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // --- Gráfico Alunos por Nível ---
  const ctxNiveis = document.getElementById('chart-niveis');
  if (ctxNiveis) {
    const alunos = Storage.getAll('alunos').filter(a => a.status === 'ativo');
    const contagem = {};
    alunos.forEach(a => {
      const n = a.nivel || 'sem nível';
      contagem[n] = (contagem[n] || 0) + 1;
    });

    const labelMap = {
      iniciante: 'Iniciante', intermediario: 'Intermediário',
      avancado: 'Avançado', profissional: 'Profissional',
    };

    const labels = Object.keys(contagem).map(k => labelMap[k] || k);
    const values = Object.values(contagem);
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

    new Chart(ctxNiveis, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, values.length),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 10, font: { size: 11 }, boxWidth: 12 },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.raw} aluno${ctx.raw !== 1 ? 's' : ''}`,
            },
          },
        },
      },
    });
  }
}
