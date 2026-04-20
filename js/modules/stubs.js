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
 * Render the main dashboard page.
 * Layout: stats compactos → duas colunas (alertas | gráficos).
 */
function renderDashboard() {
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
      <div class="dash-stat ${matStats.vencidas > 0 ? 'dash-stat-danger' : ''}" onclick="Router.navigate('matriculas')" title="Matrículas vencidas">
        <span class="dash-stat-icon">⚠️</span>
        <div><div class="dash-stat-val">${matStats.vencidas}</div><div class="dash-stat-lbl">Matrículas vencidas</div></div>
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

      <!-- Coluna direita: Gráficos -->
      <div class="dash-col-right">

        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">💰 Financeiro — Mês Atual</span>
          </div>
          <div class="dash-chart-wrap" style="height:160px;">
            <canvas id="chart-financeiro"></canvas>
          </div>
        </div>

        <div class="dash-panel">
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
