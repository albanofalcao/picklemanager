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

/* ══════════════════════════════════════════════════════════════
   HOME — Página de Boas-vindas
   ══════════════════════════════════════════════════════════════ */

/** Frases do esporte usadas no ticker animado */
const _HOME_TICKER_PHRASES = [
  { emoji: '🏓', text: 'O pickleball cresce mais que qualquer esporte no mundo' },
  { emoji: '🎯', text: 'Domine o dink, domine o jogo' },
  { emoji: '⚡', text: 'Velocidade · Precisão · Estratégia' },
  { emoji: '🏆', text: 'Do iniciante ao campeão — na mesma quadra' },
  { emoji: '🤝', text: 'Um esporte para todas as idades e ritmos' },
  { emoji: '🌎', text: 'Mais de 36 milhões de jogadores no mundo' },
  { emoji: '🔥', text: 'O court chama. Você vem?'  },
];

/** Dicas do PickleBot — sorteadas aleatoriamente */
const _BOT_TIPS = [
  'Alunos com matrícula vencendo em menos de 7 dias aparecem no Dashboard. Acompanhe!',
  'Você sabia que pode registrar pagamentos diretamente pelo módulo de Matrículas?',
  'Torneios com chave eliminatória: o PickleManager propaga os vencedores automaticamente!',
  'Use o módulo de Turmas para ver todas as aulas do dia em um só lugar.',
  'Categorias de duplas já têm inscrição em par — cadastre os dois atletas de uma vez!',
  'O financeiro mostra receitas vs despesas por categoria. Confira o mês atual!',
  'Matrículas vencidas ficam marcadas em vermelho. Renove antes do aluno perceber! 😄',
  'Crie eventos para torneios internos, aulas especiais e clínicas de treinamento.',
  'No mínimo 6 jogadores para gerar chave eliminatória em um torneio.',
  'Professores podem ser vinculados por arena — útil em redes com várias unidades.',
];

/** Retorna uma dica aleatória do bot (chamável do HTML via onclick) */
function _getBotTip() {
  const idx = Math.floor(Math.random() * _BOT_TIPS.length);
  const tip = _BOT_TIPS[idx];
  return `<em style="opacity:.85;">"${tip}"</em>`;
}
window._getBotTip = _getBotTip; // expõe para onclick inline

/** Gera os itens do ticker (duplicados para loop sem costura) */
function _buildTickerItems() {
  return _HOME_TICKER_PHRASES.map(p => `
    <div style="display:inline-flex;align-items:center;gap:8px;
      padding:0 32px;white-space:nowrap;font-size:13px;font-weight:600;
      color:var(--text-secondary);border-right:1px solid var(--card-border);">
      <span style="font-size:18px;">${p.emoji}</span>
      <span>${p.text}</span>
    </div>`).join('');
}

/** Card de pendência/indicador para a home */
function _buildHomePendingCard({ icon, label, value, color, bg, badgeText, urgente, route }) {
  return `
    <div class="home-pending-card" onclick="Router.navigate('${route}')"
      style="background:${bg};border:1.5px solid ${urgente ? color : 'var(--card-border)'};
        border-radius:16px;padding:20px;cursor:pointer;
        box-shadow:var(--card-shadow);transition:transform .18s,box-shadow .18s;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:28px;line-height:1;">${icon}</span>
        ${urgente && value > 0
          ? `<span style="background:${color};color:#fff;font-size:10px;font-weight:700;
              border-radius:20px;padding:2px 9px;">${badgeText}</span>`
          : `<span style="background:var(--gray-light,#f0ede6);color:var(--text-muted);font-size:10px;font-weight:700;
              border-radius:20px;padding:2px 9px;">${value > 0 ? badgeText : 'Ok ✓'}</span>`}
      </div>
      <div style="font-size:32px;font-weight:900;color:${value > 0 ? color : 'var(--text-muted)'};">
        ${value}
      </div>
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-top:4px;">
        ${label}
      </div>
    </div>`;
}

/** Card de funcionalidade (quick actions) */
function _buildHomeFeatureCard(icon, titulo, desc, route, cor) {
  return `
    <div class="home-feature-card" onclick="Router.navigate('${route}')"
      style="background:var(--card-bg);border:1px solid var(--card-border);
        border-radius:14px;padding:18px;cursor:pointer;
        box-shadow:var(--card-shadow);transition:transform .18s,box-shadow .18s;">
      <div style="width:42px;height:42px;border-radius:12px;background:${cor}22;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;margin-bottom:12px;">${icon}</div>
      <div style="font-weight:800;font-size:14px;color:var(--text-primary);margin-bottom:4px;">${titulo}</div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.5;">${desc}</div>
    </div>`;
}

/** Mascote SVG — tamanho configurável */
function _botSvg(size = 100) {
  const s = size / 110;
  return `<svg width="${Math.round(110*s)}" height="${Math.round(130*s)}"
    viewBox="0 0 110 130" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="45" width="60" height="60" rx="16"
      fill="rgba(59,158,143,.25)" stroke="rgba(59,158,143,.7)" stroke-width="2"/>
    <rect x="30" y="12" width="50" height="40" rx="14"
      fill="rgba(59,158,143,.25)" stroke="rgba(59,158,143,.7)" stroke-width="2"/>
    <circle cx="44" cy="29" r="7" fill="#3b9e8f"/>
    <circle cx="66" cy="29" r="7" fill="#3b9e8f"/>
    <circle cx="46" cy="27" r="3" fill="#fff"/>
    <circle cx="68" cy="27" r="3" fill="#fff"/>
    <path d="M43 38 Q55 46 67 38" stroke="rgba(59,158,143,.9)"
      stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <line x1="55" y1="12" x2="55" y2="3" stroke="rgba(59,158,143,.6)" stroke-width="2"/>
    <circle cx="55" cy="2" r="3" fill="#f0c040"/>
    <rect x="48" y="52" width="14" height="8" rx="4" fill="rgba(59,158,143,.2)"/>
    <ellipse cx="82" cy="85" rx="12" ry="16" fill="#3b9e8f" opacity=".7"/>
    <line x1="82" y1="101" x2="88" y2="118" stroke="rgba(59,158,143,.8)"
      stroke-width="4" stroke-linecap="round"/>
    <rect x="38" y="62" width="34" height="6" rx="3" fill="rgba(59,158,143,.3)"/>
    <rect x="43" y="74" width="10" height="10" rx="3" fill="#3b9e8f" opacity=".5"/>
    <rect x="57" y="74" width="10" height="10" rx="3" fill="#3b9e8f" opacity=".5"/>
    <rect x="32" y="100" width="18" height="10" rx="6" fill="rgba(59,158,143,.3)"/>
    <rect x="60" y="100" width="18" height="10" rx="6" fill="rgba(59,158,143,.3)"/>
  </svg>`;
}

/**
 * Renderiza a página de Boas-vindas (Início).
 * Separada do Dashboard: aqui ficam saudação, ticker do esporte,
 * pendências do usuário e atalhos de funcionalidades.
 */
function renderHome() {
  const area = document.getElementById('content-area');
  if (!area) return;

  const user = Auth.getCurrentUser();
  const nomePrimeiro = (user?.nome || user?.login || 'Visitante').split(' ')[0];

  // Saudação por horário
  const h = new Date().getHours();
  const saudacao      = h < 12 ? 'Bom dia'  : h < 18 ? 'Boa tarde'  : 'Boa noite';
  const saudacaoEmoji = h < 12 ? '🌅' : h < 18 ? '☀️' : '🌙';

  // Pendências do sistema
  const hoje         = new Date().toISOString().slice(0, 10);
  const aulasHoje    = Storage.getAll('aulas').filter(a => a.data === hoje && a.status === 'agendada').length;
  const matVencendo  = Storage.getAll('matriculas').filter(m => {
    if (!m.dataFim || m.status !== 'ativa') return false;
    const diff = Math.ceil((new Date(m.dataFim + 'T00:00:00') - new Date(hoje + 'T00:00:00')) / 86400000);
    return diff <= 7;
  }).length;
  const cobVencidas   = Storage.getAll('matriculas').filter(m => m.status === 'vencida').length;
  const manutAbertos  = Storage.getAll('manutencao').filter(m => m.status === 'aberto' || m.status === 'andamento').length;

  // Ticker: items × 2 para loop contínuo sem costura
  const tickerContent = _buildTickerItems().repeat(2);

  area.innerHTML = `
    <style>
      @keyframes pm-ticker { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
      @keyframes pm-float  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
      .pm-ticker-inner  { display:flex;animation:pm-ticker 28s linear infinite;width:max-content; }
      .pm-ticker-inner:hover { animation-play-state:paused; }
      .pm-bot-float     { animation:pm-float 3.2s ease-in-out infinite; display:inline-block; }
      .home-pending-card:hover { transform:translateY(-3px)!important;
        box-shadow:0 10px 28px rgba(0,0,0,.13)!important; }
      .home-feature-card:hover { transform:translateY(-2px)!important;
        box-shadow:0 8px 22px rgba(0,0,0,.11)!important; }
    </style>

    <!-- ── HERO ── -->
    <div style="background:linear-gradient(135deg,#1f6b62 0%,#1a7a6e 55%,#0f5c52 100%);
      border-radius:20px;padding:36px 40px 32px;margin-bottom:22px;
      display:flex;align-items:center;justify-content:space-between;gap:32px;
      position:relative;overflow:hidden;">

      <!-- Círculos decorativos -->
      <div style="position:absolute;right:-40px;top:-40px;width:220px;height:220px;
        border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none;"></div>
      <div style="position:absolute;right:80px;bottom:-50px;width:150px;height:150px;
        border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none;"></div>
      <div style="position:absolute;left:35%;top:-20px;width:80px;height:80px;
        border-radius:50%;background:rgba(125,232,220,.07);pointer-events:none;"></div>

      <!-- Esquerda: saudação + CTA -->
      <div style="flex:1;z-index:1;min-width:0;">
        <div style="color:rgba(255,255,255,.7);font-size:12px;font-weight:700;
          letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px;">
          ${saudacaoEmoji} ${saudacao}, ${UI.escape(nomePrimeiro)}
        </div>
        <h1 style="margin:0 0 10px;color:#fff;font-size:clamp(20px,2.8vw,30px);
          font-weight:900;line-height:1.15;">
          Bem-vindo ao<br>
          <span style="color:#7de8dc;letter-spacing:-.5px;">PickleManager</span>
        </h1>
        <p style="margin:0 0 22px;color:rgba(255,255,255,.65);font-size:13.5px;
          line-height:1.65;max-width:400px;">
          Gestão completa da sua academia de pickleball —
          alunos, aulas, torneios, financeiro e muito mais.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="Router.navigate('dashboard')"
            style="background:#7de8dc;color:#0e5248;border:none;font-weight:800;
              border-radius:10px;padding:9px 20px;cursor:pointer;font-size:13px;
              transition:opacity .15s;" onmouseover="this.style.opacity='.85'"
              onmouseout="this.style.opacity='1'">
            📊 Ver Dashboard
          </button>
          <button onclick="Router.navigate('alunos')"
            style="background:rgba(255,255,255,.13);color:#fff;
              border:1.5px solid rgba(255,255,255,.3);font-weight:600;
              border-radius:10px;padding:9px 20px;cursor:pointer;font-size:13px;
              transition:opacity .15s;" onmouseover="this.style.opacity='.75'"
              onmouseout="this.style.opacity='1'">
            👥 Alunos
          </button>
          <button onclick="Router.navigate('turmas')"
            style="background:rgba(255,255,255,.13);color:#fff;
              border:1.5px solid rgba(255,255,255,.3);font-weight:600;
              border-radius:10px;padding:9px 20px;cursor:pointer;font-size:13px;
              transition:opacity .15s;" onmouseover="this.style.opacity='.75'"
              onmouseout="this.style.opacity='1'">
            🏸 Aulas
          </button>
        </div>
      </div>

      <!-- Direita: mascote PickleBot -->
      <div style="flex-shrink:0;z-index:1;text-align:center;">
        <div class="pm-bot-float">
          ${_botSvg(118)}
        </div>
        <div style="margin-top:8px;background:rgba(255,255,255,.15);border-radius:20px;
          padding:5px 14px;display:inline-block;backdrop-filter:blur(6px);">
          <span style="color:#7de8dc;font-weight:700;font-size:11px;letter-spacing:.4px;">
            🤖 PickleBot
          </span>
        </div>
      </div>
    </div>

    <!-- ── TICKER: Frases do esporte ── -->
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
      border-radius:14px;overflow:hidden;margin-bottom:24px;
      box-shadow:var(--card-shadow);">
      <div style="overflow:hidden;padding:11px 0;position:relative;">
        <!-- fade esquerda/direita -->
        <div style="position:absolute;left:0;top:0;bottom:0;width:50px;
          background:linear-gradient(to right,var(--card-bg),transparent);z-index:2;pointer-events:none;"></div>
        <div style="position:absolute;right:0;top:0;bottom:0;width:50px;
          background:linear-gradient(to left,var(--card-bg),transparent);z-index:2;pointer-events:none;"></div>
        <div class="pm-ticker-inner">${tickerContent}</div>
      </div>
    </div>

    <!-- ── PENDÊNCIAS DO USUÁRIO ── -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <h2 style="margin:0;font-size:15px;font-weight:800;color:var(--text-primary);">
          📋 Sua visão de hoje
        </h2>
        <span style="font-size:12px;color:var(--text-muted);">
          ${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}
        </span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px;">

        ${_buildHomePendingCard({
          icon: '🏸', label: 'Aulas agendadas hoje',
          value: aulasHoje,
          color: '#3b9e8f', bg: aulasHoje > 0 ? 'rgba(59,158,143,.08)' : 'var(--card-bg)',
          badgeText: 'Na quadra', urgente: false, route: 'turmas',
        })}

        ${_buildHomePendingCard({
          icon: '⏰', label: 'Matrículas vencendo em 7 dias',
          value: matVencendo,
          color: '#d97706', bg: matVencendo > 0 ? '#fef9ec' : 'var(--card-bg)',
          badgeText: 'Atenção', urgente: true, route: 'matriculas',
        })}

        ${_buildHomePendingCard({
          icon: '🔴', label: 'Cobranças vencidas',
          value: cobVencidas,
          color: '#dc2626', bg: cobVencidas > 0 ? '#fff5f5' : 'var(--card-bg)',
          badgeText: 'Urgente', urgente: true, route: 'financeiro',
        })}

        ${_buildHomePendingCard({
          icon: '🔧', label: 'Manutenções em aberto',
          value: manutAbertos,
          color: '#7c3aed', bg: manutAbertos > 0 ? '#f5f3ff' : 'var(--card-bg)',
          badgeText: 'Pendente', urgente: true, route: 'manutencao',
        })}

      </div>
    </div>

    <!-- ── QUICK ACTIONS + BOT TIP ── -->
    <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:start;">

      <!-- Feature cards: quick actions -->
      <div>
        <h2 style="margin:0 0 14px;font-size:15px;font-weight:800;color:var(--text-primary);">
          ⚡ Acesso rápido
        </h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;">
          ${_buildHomeFeatureCard('🎫','Matrículas','Contratos e planos dos alunos','matriculas','#3b82f6')}
          ${_buildHomeFeatureCard('🥇','Torneios','Chaves, resultados e medalhas','torneios','#f59e0b')}
          ${_buildHomeFeatureCard('💰','Financeiro','Receitas, despesas e cobranças','financeiro','#16a34a')}
          ${_buildHomeFeatureCard('🏆','Eventos','Eventos e competições especiais','eventos','#8b5cf6')}
          ${_buildHomeFeatureCard('🎓','Professores','Instrutores e especialidades','professores','#ec4899')}
          ${_buildHomeFeatureCard('📋','Planos','Pacotes e mensalidades','planos','#06b6d4')}
        </div>
      </div>

      <!-- PickleBot dica -->
      <div>
        <h2 style="margin:0 0 14px;font-size:15px;font-weight:800;color:var(--text-primary);">
          🤖 PickleBot
        </h2>
        <div style="background:var(--card-bg);border:1px solid var(--card-border);
          border-radius:16px;padding:22px;box-shadow:var(--card-shadow);text-align:center;">

          <div class="pm-bot-float" style="margin-bottom:10px;">
            ${_botSvg(72)}
          </div>

          <!-- Balão de fala -->
          <div style="background:var(--bg-secondary,#f6f3ec);border:1px solid var(--card-border);
            border-radius:12px;padding:14px 16px;margin-bottom:14px;position:relative;">
            <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);
              width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;
              border-bottom:8px solid var(--card-border);"></div>
            <div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);
              width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
              border-bottom:7px solid var(--bg-secondary,#f6f3ec);"></div>
            <div id="pm-bot-tip" style="font-size:12.5px;color:var(--text-secondary);
              line-height:1.65;min-height:72px;display:flex;align-items:center;">
              ${_getBotTip()}
            </div>
          </div>

          <button class="btn btn-ghost btn-sm"
            style="font-size:11px;color:var(--text-muted);width:100%;"
            onclick="document.getElementById('pm-bot-tip').innerHTML=window._getBotTip()">
            🔄 Nova dica
          </button>
        </div>
      </div>

    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════ */

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

  const alunoStats     = AlunoModule.getStats();
  const aulaStats      = TurmasModule.getAulaStats();
  const finStats       = FinanceiroModule.getStats();
  const manutStats     = ManutencaoModule.getStats();
  const matStats       = MatriculaModule.getStats();

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

    <!-- Layout: Próximas Aulas (larga) + 2 gráficos -->
    <div class="dash-main-grid">

      <!-- Coluna esquerda: Agenda -->
      <div class="dash-col-left">
        <div class="dash-panel">
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
          <div class="dash-chart-wrap" style="height:180px;">
            <canvas id="chart-financeiro"></canvas>
          </div>
        </div>

        <div class="dash-panel" style="margin-top:20px;">
          <div class="dash-panel-header">
            <span class="dash-panel-title">👥 Alunos por Nível</span>
          </div>
          <div class="dash-chart-wrap" style="height:200px;">
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
