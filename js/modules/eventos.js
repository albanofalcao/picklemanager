'use strict';

/**
 * EventoModule — CRUD + detalhe com abas Dados / Orçamento / Tarefas
 */
const EventoModule = {
  STORAGE_KEY: 'eventos',

  _state: {
    search:       '',
    filterStatus: '',
    filterTipo:   '',
    filterArena:  '',
  },

  _detail: {
    id:  null,
    tab: 'dados',
  },

  /* ---- Calendar state ---- */
  _calSubView:     'lista',   // 'lista' | 'cal'
  _calView:        'mes',     // 'mes' | 'semana' | 'dia' | 'agenda'
  _calAno:         null,
  _calMes:         null,
  _calDia:         null,
  _calFilterArena: '',

  _CAL_DIAS:  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  _CAL_MESES: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],

  /* Cor por tipo de evento */
  CAL_COR: {
    torneio:    '#f59e0b',
    campeonato: '#8b5cf6',
    clinica:    '#3b82f6',
    social:     '#10b981',
    amistoso:   '#14b8a6',
    outro:      '#6b7280',
  },

  STATUS: {
    planejado:    { label: 'Planejado',          badge: 'badge-blue'    },
    aberto:       { label: 'Inscrições abertas', badge: 'badge-success' },
    em_andamento: { label: 'Em andamento',       badge: 'badge-warning' },
    concluido:    { label: 'Concluído',          badge: 'badge-gray'    },
    cancelado:    { label: 'Cancelado',          badge: 'badge-danger'  },
  },

  TIPO: {
    torneio:    'Torneio',
    campeonato: 'Campeonato',
    clinica:    'Clínica / Workshop',
    social:     'Jogo Social',
    amistoso:   'Amistoso',
    outro:      'Outro',
  },

  NIVEL: {
    aberto:        'Aberto a todos',
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    profissional:  'Profissional',
  },

  TIPO_ICON: {
    torneio: '🏆', campeonato: '🥇', clinica: '📚',
    social: '🎉', amistoso: '🤝', outro: '📌',
  },

  CAT_RECEITA: ['Inscrições', 'Patrocínio', 'Cotas', 'Venda de produtos', 'Outros'],
  CAT_DESPESA: ['Local / Arena', 'Premiação', 'Arbitragem', 'Marketing', 'Alimentação', 'Equipamentos', 'Outros'],

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterStatus, filterTipo, filterArena } = this._state;
    return this.getAll()
      .slice()
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .filter(e => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          e.nome.toLowerCase().includes(q) ||
          (e.descricao && e.descricao.toLowerCase().includes(q)) ||
          (e.arenaNome && e.arenaNome.toLowerCase().includes(q));
        const matchStatus = !filterStatus || e.status === filterStatus;
        const matchTipo   = !filterTipo   || e.tipo   === filterTipo;
        const matchArena  = !filterArena  || e.arenaId === filterArena;
        return matchSearch && matchStatus && matchTipo && matchArena;
      });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:      all.length,
      proximos:   all.filter(e => e.status === 'planejado' || e.status === 'aberto').length,
      andamento:  all.filter(e => e.status === 'em_andamento').length,
      concluidos: all.filter(e => e.status === 'concluido').length,
    };
  },

  /* ------------------------------------------------------------------ */
  /*  Lista principal                                                      */
  /* ------------------------------------------------------------------ */

  render() {
    this._detail.id = null;
    this._calInitDate();
    const stats    = this.getStats();
    const filtered = this.getFiltered();
    const area     = document.getElementById('content-area');
    if (!area) return;
    const sv = this._calSubView;
    const svgPlus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Eventos</h2>
          <p>Organize torneios, campeonatos e eventos especiais da academia</p>
        </div>
        <button class="btn btn-primary" onclick="EventoModule.openModal()">
          ${svgPlus} Novo Evento
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">🏆</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Eventos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.proximos}</div>
            <div class="stat-label">Próximos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">⚡</div>
          <div class="stat-info">
            <div class="stat-value">${stats.andamento}</div>
            <div class="stat-label">Em andamento</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.concluidos}</div>
            <div class="stat-label">Concluídos</div>
          </div>
        </div>
      </div>

      <div class="tabs-bar">
        <button class="tab-btn ${sv==='lista' ?'active':''}" onclick="EventoModule._calSubView='lista';EventoModule.render()">📋 Lista</button>
        <button class="tab-btn ${sv==='cal'   ?'active':''}" onclick="EventoModule._calSubView='cal';EventoModule.render()">📅 Calendário</button>
      </div>

      <div id="eventos-content">
        ${sv === 'lista' ? this._renderLista(filtered) : this._renderCalendario()}
      </div>`;
  },

  _renderLista(filtered) {
    return `
      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input"
            placeholder="Buscar por nome, descrição ou arena…"
            value="${UI.escape(this._state.search)}"
            oninput="EventoModule.handleSearch(this.value)" />
        </div>
        <select class="filter-select" onchange="EventoModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS).map(([k, v]) =>
            `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <select class="filter-select" onchange="EventoModule.handleFilterTipo(this.value)">
          <option value="">Todos os tipos</option>
          ${CadastrosModule.getTiposEvento().map(t =>
            `<option value="${UI.escape(t.nome)}" ${this._state.filterTipo === t.nome ? 'selected' : ''}>${UI.escape(t.nome)}</option>`
          ).join('')}
        </select>
        <select class="filter-select" onchange="EventoModule._state.filterArena=this.value;EventoModule.render()">
          <option value="">Todas as arenas</option>
          ${Storage.getAll('arenas').sort((a,b)=>a.nome.localeCompare(b.nome)).map(a =>
            `<option value="${a.id}" ${this._state.filterArena === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
          ).join('')}
        </select>
        <span class="results-count">
          ${filtered.length} evento${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div class="cards-grid" id="eventos-grid">
        ${filtered.length
          ? filtered.map(e => this.renderCard(e)).join('')
          : this.renderEmpty()
        }
      </div>`;
  },

  renderCard(e) {
    const status = this.STATUS[e.status] || { label: e.status, badge: 'badge-gray' };
    const tipo   = this.TIPO[e.tipo]     || e.tipo   || '—';
    const nivel  = this.NIVEL[e.nivel]   || e.nivel  || '—';
    const icon   = this.TIPO_ICON[e.tipo] || '📌';

    const dataInicio = e.data    ? this._fmtData(e.data)    : '—';
    const dataFim    = e.dataFim ? this._fmtData(e.dataFim) : null;
    const periodo    = dataFim ? `${dataInicio} até ${dataFim}` : dataInicio;

    const hora = (e.horarioInicio && e.horarioFim)
      ? `${UI.escape(e.horarioInicio)} – ${UI.escape(e.horarioFim)}`
      : e.horarioInicio ? UI.escape(e.horarioInicio) : '—';

    const inscricao = e.valorInscricao
      ? parseFloat(e.valorInscricao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Gratuito';

    const descBlock = e.descricao
      ? `<div class="arena-obs"><div class="arena-obs-text">💬 ${UI.escape(e.descricao)}</div></div>`
      : '';

    // indicadores de orçamento e tarefas
    const nTarefas   = (e.tarefas   || []).length;
    const nConcluidas = (e.tarefas  || []).filter(t => t.concluida).length;
    const nReceitas  = (e.orcamento?.receitas || []).length;
    const nDespesas  = (e.orcamento?.despesas || []).length;
    const badges = [
      nTarefas   ? `<span class="badge badge-blue" title="Tarefas">✅ ${nConcluidas}/${nTarefas}</span>` : '',
      (nReceitas || nDespesas) ? `<span class="badge badge-gray" title="Orçamento">💰 ${nReceitas + nDespesas} itens</span>` : '',
    ].filter(Boolean).join(' ');

    return `
      <div class="arena-card evento-card" data-id="${e.id}" data-status="${UI.escape(e.status)}">
        <div class="evento-card-top">
          <span class="card-status-badge">
            <span class="badge ${status.badge}">${status.label}</span>
          </span>
          <div class="evento-icon-wrap">${icon}</div>
          <div class="arena-name">${UI.escape(e.nome)}</div>
          <span class="arena-code">${UI.escape(tipo)}</span>
        </div>

        <div class="arena-details">
          <div class="detail-item">
            <div class="detail-label">Data</div>
            <div class="detail-value">${UI.escape(periodo)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Horário</div>
            <div class="detail-value">${hora}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Arena</div>
            <div class="detail-value">${UI.escape(e.arenaNome || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Nível</div>
            <div class="detail-value">${UI.escape(nivel)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Vagas</div>
            <div class="detail-value">${e.vagas ? UI.escape(String(e.vagas)) : '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Inscrição</div>
            <div class="detail-value ${e.valorInscricao ? '' : 'yes'}">${UI.escape(inscricao)}</div>
          </div>
        </div>

        ${descBlock}
        ${badges ? `<div style="padding:0 16px 8px;display:flex;gap:6px;flex-wrap:wrap;">${badges}</div>` : ''}

        <div class="arena-actions">
          <button class="btn btn-secondary btn-sm" onclick="EventoModule.openDetail('${e.id}')">
            📂 Detalhe
          </button>
          <button class="btn btn-ghost btn-sm" onclick="EventoModule.openModal('${e.id}')">
            ✏️ Editar
          </button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="EventoModule.deleteEvento('${e.id}')" title="Excluir">
            🗑️
          </button>
        </div>
      </div>`;
  },

  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterStatus || this._state.filterTipo;
    if (isFiltered) {
      return `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhum evento encontrado</div>
          <div class="empty-desc">Nenhum evento corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="EventoModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🏆</div>
        <div class="empty-title">Nenhum evento cadastrado</div>
        <div class="empty-desc">Crie o primeiro torneio ou evento especial da academia.</div>
        <button class="btn btn-primary mt-16" onclick="EventoModule.openModal()">+ Criar primeiro evento</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Página de detalhe                                                   */
  /* ------------------------------------------------------------------ */

  openDetail(id, tab = 'dados') {
    this._detail.id  = id;
    this._detail.tab = tab;
    this._renderDetail();
  },

  _setTab(tab) {
    this._detail.tab = tab;
    this._renderDetail();
  },

  _renderDetail() {
    const { id, tab } = this._detail;
    const evento = Storage.getById(this.STORAGE_KEY, id);
    if (!evento) { this.render(); return; }

    const status = this.STATUS[evento.status] || { label: evento.status, badge: 'badge-gray' };
    const icon   = this.TIPO_ICON[evento.tipo] || '📌';

    const area = document.getElementById('content-area');
    if (!area) return;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <button class="btn btn-ghost btn-sm" onclick="EventoModule.render()"
            style="margin-bottom:6px;padding:4px 10px;font-size:12px;">
            ← Voltar aos Eventos
          </button>
          <h2>${icon} ${UI.escape(evento.nome)}</h2>
          <p><span class="badge ${status.badge}">${status.label}</span>
             &nbsp;${UI.escape(this.TIPO[evento.tipo] || evento.tipo || '')}
             ${evento.data ? '· ' + this._fmtData(evento.data) : ''}
          </p>
        </div>
        <button class="btn btn-secondary" onclick="EventoModule.openModal('${id}')">
          ✏️ Editar dados
        </button>
      </div>

      <div class="tabs-bar" style="margin-bottom:24px;">
        <button class="tab-btn ${tab==='dados'     ?'active':''}" onclick="EventoModule._setTab('dados')">📋 Dados</button>
        <button class="tab-btn ${tab==='orcamento' ?'active':''}" onclick="EventoModule._setTab('orcamento')">💰 Orçamento</button>
        <button class="tab-btn ${tab==='tarefas'   ?'active':''}" onclick="EventoModule._setTab('tarefas')">✅ Tarefas</button>
      </div>

      <div id="evento-tab-content">
        ${tab === 'dados'     ? this._tabDados(evento)     : ''}
        ${tab === 'orcamento' ? this._tabOrcamento(evento) : ''}
        ${tab === 'tarefas'   ? this._tabTarefas(evento)   : ''}
      </div>`;
  },

  /* ---- ABA: DADOS ---- */

  _tabDados(e) {
    const linha = (label, val) =>
      `<div class="detail-item"><div class="detail-label">${label}</div><div class="detail-value">${val}</div></div>`;

    const periodo = e.dataFim
      ? `${this._fmtData(e.data)} até ${this._fmtData(e.dataFim)}`
      : (e.data ? this._fmtData(e.data) : '—');

    const hora = (e.horarioInicio && e.horarioFim)
      ? `${UI.escape(e.horarioInicio)} – ${UI.escape(e.horarioFim)}`
      : e.horarioInicio ? UI.escape(e.horarioInicio) : '—';

    const inscricao = e.valorInscricao
      ? parseFloat(e.valorInscricao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Gratuito';

    return `
      <div class="card" style="max-width:680px;">
        <div class="card-body">
          <div class="arena-details" style="grid-template-columns:repeat(2,1fr);gap:16px;">
            ${linha('Tipo',      UI.escape(this.TIPO[e.tipo] || e.tipo || '—'))}
            ${linha('Nível',     UI.escape(this.NIVEL[e.nivel] || e.nivel || '—'))}
            ${linha('Data',      UI.escape(periodo))}
            ${linha('Horário',   hora)}
            ${linha('Arena',     UI.escape(e.arenaNome || '—'))}
            ${linha('Vagas',     e.vagas ? UI.escape(String(e.vagas)) : '—')}
            ${linha('Inscrição', inscricao)}
            ${linha('Status',    `<span class="badge ${(this.STATUS[e.status]||{badge:'badge-gray'}).badge}">${(this.STATUS[e.status]||{label:e.status}).label}</span>`)}
          </div>
          ${e.descricao ? `<div class="arena-obs" style="margin-top:12px;"><div class="arena-obs-text">💬 ${UI.escape(e.descricao)}</div></div>` : ''}
        </div>
      </div>`;
  },

  /* ---- ABA: ORÇAMENTO ---- */

  _tabOrcamento(e) {
    const cancelado = e.status === 'cancelado';
    const aviso = cancelado ? `
      <div style="display:flex;align-items:center;gap:10px;background:#fee2e2;border:1px solid #fca5a5;
        border-radius:10px;padding:12px 16px;margin-bottom:20px;color:#991b1b;font-size:13px;font-weight:600;">
        🚫 Evento cancelado — não é possível lançar novos dados.
        Para habilitar, edite o evento e altere o status.
      </div>` : '';

    const orc      = e.orcamento || { receitas: [], despesas: [] };
    const receitas = orc.receitas || [];
    const despesas = orc.despesas || [];

    const totalR = receitas.reduce((s, i) => s + (parseFloat(i.valor) * (parseInt(i.qtd, 10) || 1)), 0);
    const totalD = despesas.reduce((s, i) => s + (parseFloat(i.valor) * (parseInt(i.qtd, 10) || 1)), 0);
    const resultado = totalR - totalD;

    const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const linhaItem = (tipo, item) => `
      <tr>
        <td>${UI.escape(item.descricao)}</td>
        <td style="white-space:nowrap;"><span class="badge badge-gray" style="font-size:0.7rem;">${UI.escape(item.categoria || '—')}</span></td>
        <td style="text-align:center;">${item.qtd || 1}</td>
        <td style="text-align:right;">${fmt(parseFloat(item.valor) || 0)}</td>
        <td style="text-align:right;font-weight:600;">${fmt((parseFloat(item.valor)||0) * (parseInt(item.qtd,10)||1))}</td>
        <td style="text-align:center;white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" style="padding:2px 8px;"
            onclick="EventoModule._editarItemOrc('${e.id}','${tipo}','${item.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger" style="padding:2px 8px;"
            onclick="EventoModule._removerItemOrc('${e.id}','${tipo}','${item.id}')" title="Remover">🗑️</button>
        </td>
      </tr>`;

    const tabelaVazia = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px;">Nenhum item cadastrado</td></tr>`;

    const catOptsR = this.CAT_RECEITA.map(c => `<option>${c}</option>`).join('');
    const catOptsD = this.CAT_DESPESA.map(c => `<option>${c}</option>`).join('');

    const corResultado = resultado >= 0 ? 'var(--success)' : 'var(--danger)';

    // --- Ponto de Equilíbrio ---
    // % mínimo das receitas que precisa ser realizado para cobrir todas as despesas
    const bePct      = totalR > 0 ? (totalD / totalR) * 100 : null;
    const beViavel   = bePct !== null && bePct <= 100;
    const beCorBarra = beViavel ? '#22c55e' : '#ef4444';
    const beCorTexto = beViavel ? 'var(--success)' : 'var(--danger)';
    const beBarraW   = bePct !== null ? Math.min(100, bePct).toFixed(1) : 0;

    const beStatusLabel = bePct === null
      ? '— Sem receitas cadastradas'
      : beViavel
        ? `✅ Viável — realizando ${bePct.toFixed(1)}% das receitas previstas`
        : `⚠️ Inviável — mesmo realizando 100% das receitas há déficit de ${fmt(totalD - totalR)}`;

    const beTabelaLinhas = receitas.map(item => {
      const itemTotal = (parseFloat(item.valor) || 0) * (parseInt(item.qtd, 10) || 1);
      // valor mínimo que ESTE item precisa gerar (proporcionalmente)
      const itemMin   = bePct !== null ? itemTotal * Math.min(1, totalD / totalR) : 0;
      const pctLabel  = bePct !== null ? `${Math.min(bePct, 100).toFixed(1)}%` : '—';
      const barW      = bePct !== null ? Math.min(100, bePct).toFixed(1) : 0;
      return `
        <tr>
          <td>
            <div style="font-size:13px;">${UI.escape(item.descricao)}</div>
            ${item.categoria ? `<span class="badge badge-gray" style="font-size:0.65rem;">${UI.escape(item.categoria)}</span>` : ''}
          </td>
          <td style="text-align:right;">${fmt(itemTotal)}</td>
          <td style="text-align:right;font-weight:600;color:${beCorTexto};">${fmt(itemMin)}</td>
          <td style="min-width:110px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;height:7px;background:var(--border-color);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${barW}%;background:${beCorBarra};border-radius:4px;transition:width .4s;"></div>
              </div>
              <span style="font-size:12px;font-weight:700;color:${beCorTexto};white-space:nowrap;">${pctLabel}</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    const beCustoVaga = e.vagas && totalD > 0
      ? `<div style="margin-top:10px;font-size:12px;color:var(--text-secondary);">
           🎯 Custo por vaga (${e.vagas} vagas): <strong>${fmt(totalD / parseInt(e.vagas, 10))}</strong>
           — valor mínimo de inscrição para cobrir as despesas com 100% das vagas preenchidas.
         </div>`
      : '';

    const secaoPE = `
      <div class="card" style="margin-bottom:24px;border:2px solid ${beViavel ? '#bbf7d0' : '#fecaca'};">
        <div class="card-header" style="padding:14px 20px;background:${beViavel ? '#f0fdf4' : '#fff5f5'};display:flex;flex-direction:column;gap:4px;">
          <h3 style="margin:0;font-size:15px;font-weight:700;">🎯 Ponto de Equilíbrio</h3>
          <div style="font-size:13px;margin-top:4px;color:${beCorTexto};font-weight:600;">${beStatusLabel}</div>
          ${beCustoVaga}
        </div>
        ${receitas.length ? `
        <div class="card-body" style="padding:0 0 8px;">
          <table class="data-table">
            <thead><tr>
              <th>Fonte de Receita</th>
              <th style="text-align:right;">Previsto</th>
              <th style="text-align:right;">Mín. necessário</th>
              <th>% de realização</th>
            </tr></thead>
            <tbody>${beTabelaLinhas}</tbody>
          </table>
        </div>` : ''}
      </div>`;

    return `
      ${aviso}
      <!-- RESUMO -->
      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-icon green">📈</div>
          <div class="stat-info">
            <div class="stat-value" style="font-size:18px;">${fmt(totalR)}</div>
            <div class="stat-label">Total Receitas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">📉</div>
          <div class="stat-info">
            <div class="stat-value" style="font-size:18px;">${fmt(totalD)}</div>
            <div class="stat-label">Total Despesas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon ${resultado >= 0 ? 'green' : 'amber'}">${resultado >= 0 ? '✅' : '⚠️'}</div>
          <div class="stat-info">
            <div class="stat-value" style="font-size:18px;color:${corResultado};">${fmt(resultado)}</div>
            <div class="stat-label">Resultado ${resultado >= 0 ? '(Viável)' : '(Déficit)'}</div>
          </div>
        </div>
        ${bePct !== null ? `
        <div class="stat-card">
          <div class="stat-icon ${beViavel ? 'green' : 'red'}">🎯</div>
          <div class="stat-info">
            <div class="stat-value" style="font-size:18px;color:${beCorTexto};">${bePct.toFixed(1)}%</div>
            <div class="stat-label">Realização mínima</div>
          </div>
        </div>` : ''}
      </div>

      <!-- PONTO DE EQUILÍBRIO -->
      ${secaoPE}

      <!-- RECEITAS -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;">
          <h3 style="margin:0;font-size:15px;font-weight:700;color:var(--success);">📈 Receitas</h3>
        </div>
        <div class="card-body" style="padding:0 0 8px;">
          <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Descrição</th><th style="white-space:nowrap;min-width:110px;">Categoria</th><th style="text-align:center;">Qtd</th>
              <th style="text-align:right;white-space:nowrap;">Valor Unit.</th><th style="text-align:right;">Total</th><th></th>
            </tr></thead>
            <tbody>${receitas.length ? receitas.map(i => linhaItem('receitas', i)).join('') : tabelaVazia}</tbody>
            ${receitas.length ? `<tfoot><tr>
              <td colspan="4" style="text-align:right;font-weight:700;padding:10px 12px;">Total Receitas</td>
              <td style="text-align:right;font-weight:700;color:var(--success);padding:10px 12px;">${fmt(totalR)}</td>
              <td></td>
            </tr></tfoot>` : ''}
          </table>
          </div>

          <!-- Formulário adicionar receita -->
          <div style="padding:12px 20px;border-top:1px solid var(--border-color);background:var(--bg-secondary);border-radius:0 0 12px 12px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
              <div style="flex:2;min-width:150px;">
                <label class="form-label" style="font-size:11px;">Descrição</label>
                <input id="orc-r-desc" class="form-input" style="height:34px;" placeholder="ex: Inscrições 32 atletas" />
              </div>
              <div style="flex:1;min-width:150px;">
                <label class="form-label" style="font-size:11px;">Categoria</label>
                <div class="select-wrap">
                  <select id="orc-r-cat" class="form-select">${catOptsR}</select>
                </div>
              </div>
              <div style="width:60px;">
                <label class="form-label" style="font-size:11px;">Qtd</label>
                <input id="orc-r-qtd" class="form-input" style="height:34px;" type="number" min="1" value="1" />
              </div>
              <div style="width:110px;">
                <label class="form-label" style="font-size:11px;">Valor unit. (R$)</label>
                <input id="orc-r-val" class="form-input" style="height:34px;" type="number" min="0" step="0.01" placeholder="0,00" />
              </div>
              <button class="btn btn-primary btn-sm" style="height:34px;"
                onclick="EventoModule._addItemOrc('${e.id}','receitas')"
                ${cancelado ? 'disabled title="Evento cancelado"' : ''}>+ Adicionar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- DESPESAS -->
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;">
          <h3 style="margin:0;font-size:15px;font-weight:700;color:var(--danger);">📉 Despesas</h3>
        </div>
        <div class="card-body" style="padding:0 0 8px;">
          <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Descrição</th><th style="white-space:nowrap;min-width:110px;">Categoria</th><th style="text-align:center;">Qtd</th>
              <th style="text-align:right;white-space:nowrap;">Valor Unit.</th><th style="text-align:right;">Total</th><th></th>
            </tr></thead>
            <tbody>${despesas.length ? despesas.map(i => linhaItem('despesas', i)).join('') : tabelaVazia}</tbody>
            ${despesas.length ? `<tfoot><tr>
              <td colspan="4" style="text-align:right;font-weight:700;padding:10px 12px;">Total Despesas</td>
              <td style="text-align:right;font-weight:700;color:var(--danger);padding:10px 12px;">${fmt(totalD)}</td>
              <td></td>
            </tr></tfoot>` : ''}
          </table>
          </div>

          <!-- Formulário adicionar despesa -->
          <div style="padding:12px 20px;border-top:1px solid var(--border-color);background:var(--bg-secondary);border-radius:0 0 12px 12px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
              <div style="flex:2;min-width:150px;">
                <label class="form-label" style="font-size:11px;">Descrição</label>
                <input id="orc-d-desc" class="form-input" style="height:34px;" placeholder="ex: Premiação 1º lugar" />
              </div>
              <div style="flex:1;min-width:150px;">
                <label class="form-label" style="font-size:11px;">Categoria</label>
                <div class="select-wrap">
                  <select id="orc-d-cat" class="form-select">${catOptsD}</select>
                </div>
              </div>
              <div style="width:60px;">
                <label class="form-label" style="font-size:11px;">Qtd</label>
                <input id="orc-d-qtd" class="form-input" style="height:34px;" type="number" min="1" value="1" />
              </div>
              <div style="width:110px;">
                <label class="form-label" style="font-size:11px;">Valor unit. (R$)</label>
                <input id="orc-d-val" class="form-input" style="height:34px;" type="number" min="0" step="0.01" placeholder="0,00" />
              </div>
              <button class="btn btn-primary btn-sm" style="height:34px;"
                onclick="EventoModule._addItemOrc('${e.id}','despesas')"
                ${cancelado ? 'disabled title="Evento cancelado"' : ''}>+ Adicionar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- PARECER FINAL -->
      <div class="card" style="margin-top:20px;">
        <div class="card-header" style="padding:16px 20px;">
          <h3 style="margin:0;font-size:15px;font-weight:700;">📝 Parecer Final</h3>
        </div>
        <div class="card-body" style="padding:16px 20px;">
          <textarea id="orc-parecer" class="form-textarea" rows="4"
            placeholder="Descreva a viabilidade do evento, observações sobre receitas e despesas, condições para realização…"
            style="width:100%;resize:vertical;">${UI.escape(e.orcamento?.parecer || '')}</textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:10px;">
            <button class="btn btn-primary btn-sm"
              onclick="EventoModule._salvarParecer('${e.id}')">💾 Salvar parecer</button>
          </div>
        </div>
      </div>`;
  },

  _addItemOrc(eventoId, tipo) {
    const ev = Storage.getById(this.STORAGE_KEY, eventoId);
    if (ev?.status === 'cancelado') { UI.toast('Evento cancelado. Altere o status para lançar dados.', 'warning'); return; }
    const p    = tipo === 'receitas' ? 'r' : 'd';
    const desc = document.getElementById(`orc-${p}-desc`);
    const cat  = document.getElementById(`orc-${p}-cat`);
    const qtd  = document.getElementById(`orc-${p}-qtd`);
    const val  = document.getElementById(`orc-${p}-val`);

    if (!desc || !desc.value.trim()) {
      UI.toast('Informe a descrição do item.', 'warning');
      if (desc) desc.classList.add('error');
      return;
    }
    if (!val || !val.value || parseFloat(val.value) < 0) {
      UI.toast('Informe o valor do item.', 'warning');
      if (val) val.classList.add('error');
      return;
    }

    const evento = Storage.getById(this.STORAGE_KEY, eventoId);
    if (!evento) return;

    const orc = evento.orcamento || { receitas: [], despesas: [] };
    orc.receitas = orc.receitas || [];
    orc.despesas = orc.despesas || [];

    orc[tipo].push({
      id:        `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      descricao: desc.value.trim(),
      categoria: cat ? cat.value : '',
      qtd:       parseInt(qtd?.value, 10) || 1,
      valor:     parseFloat(val.value) || 0,
    });

    Storage.update(this.STORAGE_KEY, eventoId, { orcamento: orc });
    UI.toast('Item adicionado.', 'success');
    this._detail.tab = 'orcamento';
    this._renderDetail();
  },

  _removerItemOrc(eventoId, tipo, itemId) {
    const evento = Storage.getById(this.STORAGE_KEY, eventoId);
    if (!evento) return;

    const orc = evento.orcamento || { receitas: [], despesas: [] };
    orc[tipo] = (orc[tipo] || []).filter(i => i.id !== itemId);

    Storage.update(this.STORAGE_KEY, eventoId, { orcamento: orc });
    this._detail.tab = 'orcamento';
    this._renderDetail();
  },

  _editarItemOrc(eventoId, tipo, itemId) {
    const evento = Storage.getById(this.STORAGE_KEY, eventoId);
    if (!evento) return;

    const orc   = evento.orcamento || { receitas: [], despesas: [] };
    const lista = orc[tipo] || [];
    const item  = lista.find(i => i.id === itemId);
    if (!item) return;

    const cats    = tipo === 'receitas' ? this.CAT_RECEITA : this.CAT_DESPESA;
    const catOpts = cats.map(c =>
      `<option value="${UI.escape(c)}" ${c === item.categoria ? 'selected' : ''}>${UI.escape(c)}</option>`
    ).join('');
    const label = tipo === 'receitas' ? 'Receita' : 'Despesa';

    UI.openModal({
      title:        `✏️ Editar ${label}`,
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Descrição <span class="required-star">*</span></label>
            <input id="edit-orc-desc" class="form-input" value="${UI.escape(item.descricao)}" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label">Categoria</label>
            <select id="edit-orc-cat" class="form-select">${catOpts}</select>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Qtd</label>
              <input id="edit-orc-qtd" class="form-input" type="number" min="1" value="${item.qtd || 1}" />
            </div>
            <div class="form-group">
              <label class="form-label">Valor unit. (R$)</label>
              <input id="edit-orc-val" class="form-input" type="number" min="0" step="0.01" value="${item.valor || 0}" />
            </div>
          </div>
        </div>`,
      confirmLabel: 'Salvar',
      onConfirm: () => {
        const desc = document.getElementById('edit-orc-desc');
        const cat  = document.getElementById('edit-orc-cat');
        const qtd  = document.getElementById('edit-orc-qtd');
        const val  = document.getElementById('edit-orc-val');

        if (!desc?.value.trim()) {
          UI.toast('Informe a descrição.', 'warning');
          desc?.classList.add('error');
          return;
        }
        if (!val?.value || isNaN(parseFloat(val.value)) || parseFloat(val.value) < 0) {
          UI.toast('Informe um valor válido.', 'warning');
          val?.classList.add('error');
          return;
        }

        const idx = lista.findIndex(i => i.id === itemId);
        if (idx < 0) return;

        lista[idx] = {
          ...lista[idx],
          descricao: desc.value.trim(),
          categoria: cat?.value || '',
          qtd:       parseInt(qtd?.value, 10) || 1,
          valor:     parseFloat(val.value) || 0,
        };

        orc[tipo] = lista;
        Storage.update(this.STORAGE_KEY, eventoId, { orcamento: orc });
        UI.toast(`${label} atualizada!`, 'success');
        UI.closeModal();
        this._detail.tab = 'orcamento';
        this._renderDetail();
      },
    });
  },

  _salvarParecer(eventoId) {
    const texto = document.getElementById('orc-parecer')?.value.trim() ?? '';
    const evento = Storage.getById(this.STORAGE_KEY, eventoId);
    if (!evento) return;

    const orc = evento.orcamento || { receitas: [], despesas: [] };
    orc.parecer = texto;

    Storage.update(this.STORAGE_KEY, eventoId, { orcamento: orc });
    UI.toast('Parecer salvo.', 'success');
  },

  /* ---- ABA: TAREFAS ---- */

  _tabTarefas(e) {
    const cancelado = e.status === 'cancelado';
    const aviso = cancelado ? `
      <div style="display:flex;align-items:center;gap:10px;background:#fee2e2;border:1px solid #fca5a5;
        border-radius:10px;padding:12px 16px;margin-bottom:20px;color:#991b1b;font-size:13px;font-weight:600;">
        🚫 Evento cancelado — não é possível lançar novos dados.
        Para habilitar, edite o evento e altere o status.
      </div>` : '';

    const tarefas    = e.tarefas || [];
    const total      = tarefas.length;
    const pctGeral   = total
      ? Math.round(tarefas.reduce((s, t) => s + (parseInt(t.execucao, 10) || 0), 0) / total)
      : 0;
    const corBar = pctGeral === 100 ? 'var(--success)' : pctGeral >= 50 ? 'var(--warning)' : 'var(--primary)';

    // Datalist: todos os ativos exceto alunos e professores (digitação livre também é permitida)
    const adminUsers    = Storage.getAll('usuarios').filter(u => { const p = (u.perfil||'').toLowerCase(); return u.status === 'ativo' && p !== 'aluno' && p !== 'professor'; });
    const adminDatalist = adminUsers.map(u => `<option value="${UI.escape(u.nome)}">`).join('');

    const barPct = pct => {
      const c = pct === 100 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--primary)';
      return `<div style="display:flex;align-items:center;gap:6px;min-width:120px;">
        <div style="flex:1;background:var(--border-color);border-radius:99px;height:7px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${c};border-radius:99px;"></div>
        </div>
        <span style="font-size:12px;font-weight:600;white-space:nowrap;">${pct}%</span>
      </div>`;
    };

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const rowStyle = t => {
      const exec = parseInt(t.execucao, 10) || 0;
      if (exec === 100 || !t.prazo) return '';
      const prazo = new Date(t.prazo); prazo.setHours(0,0,0,0);
      const diff  = Math.floor((prazo - hoje) / 86400000);
      if (diff < 0)  return 'background:rgba(239,68,68,.18);border-left:4px solid #ef4444;';
      if (diff <= 5) return 'background:rgba(245,158,11,.18);border-left:4px solid #f59e0b;';
      return             'background:rgba(16,185,129,.15);border-left:4px solid #10b981;';
    };

    const linhaT = t => {
      const exec = parseInt(t.execucao, 10) || 0;
      const concluida = exec === 100;
      const obsHtml = t.observacao
        ? `<div style="font-size:11px;color:var(--text-muted);margin-top:3px;font-style:italic;">${UI.escape(t.observacao)}</div>`
        : '';
      return `
      <tr class="${concluida ? 'tarefa-concluida' : ''}" style="${rowStyle(t)}">
        <td style="${concluida ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">
          <div>${UI.escape(t.descricao)}</div>${obsHtml}
        </td>
        <td>${UI.escape(t.responsavel || '—')}</td>
        <td>${t.dataInicio ? this._fmtData(t.dataInicio) : '—'}</td>
        <td>${t.prazo ? this._fmtData(t.prazo) : '—'}</td>
        <td style="min-width:150px;">
          <div style="display:flex;align-items:center;gap:6px;">
            ${barPct(exec)}
            <input type="number" min="0" max="100" value="${exec}"
              style="width:52px;height:26px;padding:2px 4px;font-size:12px;border:1px solid var(--border-color);border-radius:6px;text-align:center;"
              onchange="EventoModule._atualizarExecucao('${e.id}','${t.id}',this.value)"
              title="% de execução" />
          </div>
        </td>
        <td style="text-align:center;white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" style="padding:2px 8px;"
            onclick="EventoModule._editarTarefa('${e.id}','${t.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger" style="padding:2px 8px;"
            onclick="EventoModule._removerTarefa('${e.id}','${t.id}')" title="Remover">🗑️</button>
        </td>
      </tr>`;
    };

    return `
      ${aviso}
      <!-- PROGRESSO GERAL -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-body" style="padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-weight:700;font-size:14px;">Progresso geral das tarefas</span>
            <span style="font-size:13px;color:var(--text-muted);">${total} tarefa${total !== 1 ? 's' : ''} · média ${pctGeral}% executado</span>
          </div>
          <div style="background:var(--border-color);border-radius:99px;height:10px;overflow:hidden;">
            <div style="width:${pctGeral}%;height:100%;background:${corBar};border-radius:99px;transition:width .4s;"></div>
          </div>
        </div>
      </div>

      <!-- LISTA -->
      <div class="card">
        <div class="card-body" style="padding:0 0 8px;">
          <table class="data-table">
            <thead><tr>
              <th>Tarefa</th>
              <th>Responsável</th>
              <th>Início</th>
              <th>Prazo</th>
              <th>Execução</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${tarefas.length
                ? tarefas.map(t => linhaT(t)).join('')
                : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">Nenhuma tarefa cadastrada</td></tr>`}
            </tbody>
          </table>

          <!-- Formulário adicionar tarefa -->
          <div style="padding:14px 20px;border-top:1px solid var(--border-color);background:var(--bg-secondary);border-radius:0 0 12px 12px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
              <div style="flex:3;min-width:180px;">
                <label class="form-label" style="font-size:11px;">Tarefa <span class="required-star">*</span></label>
                <input id="tar-desc" class="form-input" style="height:34px;" placeholder="ex: Confirmar reserva da arena" autocomplete="off" />
              </div>
              <div style="flex:1;min-width:160px;">
                <label class="form-label" style="font-size:11px;">Responsável</label>
                <input id="tar-resp" class="form-input" style="height:34px;" list="tar-resp-list"
                  placeholder="Nome ou selecione..." autocomplete="off" />
                <datalist id="tar-resp-list">${adminDatalist}</datalist>
              </div>
              <div style="width:136px;">
                <label class="form-label" style="font-size:11px;">Data início</label>
                <input id="tar-inicio" class="form-input" style="height:34px;" type="date" />
              </div>
              <div style="width:136px;">
                <label class="form-label" style="font-size:11px;">Prazo</label>
                <input id="tar-prazo" class="form-input" style="height:34px;" type="date" />
              </div>
              <button class="btn btn-primary btn-sm" style="height:34px;"
                onclick="EventoModule._addTarefa('${e.id}')"
                ${cancelado ? 'disabled title="Evento cancelado"' : ''}>+ Adicionar</button>
            </div>
            <div style="margin-top:8px;">
              <label class="form-label" style="font-size:11px;">Observação</label>
              <input id="tar-obs" class="form-input" style="height:34px;"
                placeholder="Observações sobre a tarefa (opcional)" autocomplete="off" />
            </div>
          </div>
        </div>
      </div>`;
  },

  _addTarefa(eventoId) {
    const evCheck = Storage.getById(this.STORAGE_KEY, eventoId);
    if (evCheck?.status === 'cancelado') { UI.toast('Evento cancelado. Altere o status para lançar dados.', 'warning'); return; }
    const desc = document.getElementById('tar-desc');
    if (!desc || !desc.value.trim()) {
      UI.toast('Informe a descrição da tarefa.', 'warning');
      if (desc) desc.classList.add('error');
      return;
    }

    const evento = Storage.getById(this.STORAGE_KEY, eventoId);
    if (!evento) return;

    const tarefas = evento.tarefas || [];
    tarefas.push({
      id:          `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      descricao:   desc.value.trim(),
      responsavel: document.getElementById('tar-resp')?.value.trim() || '',
      dataInicio:  document.getElementById('tar-inicio')?.value || '',
      prazo:       document.getElementById('tar-prazo')?.value || '',
      observacao:  document.getElementById('tar-obs')?.value.trim() || '',
      execucao:    0,
    });

    Storage.update(this.STORAGE_KEY, eventoId, { tarefas });
    UI.toast('Tarefa adicionada.', 'success');

    // Notificar responsável por e-mail
    this._notificarTarefa(eventoId, tarefas[tarefas.length - 1]);

    this._detail.tab = 'tarefas';
    this._renderDetail();
  },

  async _notificarTarefa(eventoId, tarefa) {
    if (!tarefa.responsavel) return;
    const usuario = Storage.getAll('usuarios').find(u => u.nome === tarefa.responsavel);
    if (!usuario?.email) return;

    const evento = Storage.getById(this.STORAGE_KEY, eventoId);

    // Envio direto via EmailJS
    if (typeof EmailJSConfig !== 'undefined' && EmailJSConfig.templateAtivo('tarefa')) {
      const enviado = await EmailJSConfig.enviar('tarefa', {
        to_email:    usuario.email,
        to_name:     usuario.nome,
        evento_nome: evento?.nome || '',
        tarefa:      tarefa.descricao,
        data_inicio: tarefa.dataInicio ? this._fmtData(tarefa.dataInicio) : '—',
        prazo:       tarefa.prazo      ? this._fmtData(tarefa.prazo)      : '—',
        observacao:  tarefa.observacao || '',
      });
      if (enviado) {
        UI.toast(`📧 E-mail enviado para ${usuario.nome}.`, 'success');
      } else {
        UI.toast(`Falha ao enviar e-mail para ${usuario.nome}.`, 'warning');
      }
    }
    // Se EmailJS não configurado, silencia — sem abrir cliente de e-mail
  },

  _atualizarExecucao(eventoId, tarefaId, valor) {
    const pct = Math.min(100, Math.max(0, parseInt(valor, 10) || 0));
    const evento = Storage.getById(this.STORAGE_KEY, eventoId);
    if (!evento) return;
    const tarefas = (evento.tarefas || []).map(t =>
      t.id === tarefaId ? { ...t, execucao: pct } : t
    );
    Storage.update(this.STORAGE_KEY, eventoId, { tarefas });
    this._detail.tab = 'tarefas';
    this._renderDetail();
  },

  _removerTarefa(eventoId, tarefaId) {
    const evento = Storage.getById(this.STORAGE_KEY, eventoId);
    if (!evento) return;
    const tarefas = (evento.tarefas || []).filter(t => t.id !== tarefaId);
    Storage.update(this.STORAGE_KEY, eventoId, { tarefas });
    this._detail.tab = 'tarefas';
    this._renderDetail();
  },

  _editarTarefa(eventoId, tarefaId) {
    const evento = Storage.getById(this.STORAGE_KEY, eventoId);
    if (!evento) return;
    const tarefas = evento.tarefas || [];
    const tarefa  = tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return;

    const adminUsers    = Storage.getAll('usuarios').filter(u => { const p = (u.perfil||'').toLowerCase(); return u.status === 'ativo' && p !== 'aluno' && p !== 'professor'; });
    const adminDatalist = adminUsers.map(u => `<option value="${UI.escape(u.nome)}">`).join('');

    UI.openModal({
      title: '✏️ Editar Tarefa',
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Tarefa <span class="required-star">*</span></label>
            <input id="edit-tar-desc" class="form-input" value="${UI.escape(tarefa.descricao)}" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label">Responsável</label>
            <input id="edit-tar-resp" class="form-input" list="edit-tar-resp-list"
              value="${UI.escape(tarefa.responsavel || '')}"
              placeholder="Nome ou selecione..." autocomplete="off" />
            <datalist id="edit-tar-resp-list">${adminDatalist}</datalist>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Data início</label>
              <input id="edit-tar-inicio" class="form-input" type="date" value="${tarefa.dataInicio || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Prazo</label>
              <input id="edit-tar-prazo" class="form-input" type="date" value="${tarefa.prazo || ''}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observação</label>
            <textarea id="edit-tar-obs" class="form-textarea" rows="3"
              placeholder="Observações sobre a tarefa...">${UI.escape(tarefa.observacao || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Execução (%)</label>
            <input id="edit-tar-exec" class="form-input" type="number" min="0" max="100"
              value="${tarefa.execucao || 0}" />
          </div>
        </div>`,
      confirmLabel: 'Salvar',
      onConfirm: () => {
        const desc = document.getElementById('edit-tar-desc');
        if (!desc?.value.trim()) {
          UI.toast('Informe a descrição da tarefa.', 'warning');
          desc?.classList.add('error');
          return;
        }
        const idx = tarefas.findIndex(t => t.id === tarefaId);
        if (idx < 0) return;
        tarefas[idx] = {
          ...tarefas[idx],
          descricao:   desc.value.trim(),
          responsavel: document.getElementById('edit-tar-resp')?.value.trim() || '',
          dataInicio:  document.getElementById('edit-tar-inicio')?.value || '',
          prazo:       document.getElementById('edit-tar-prazo')?.value || '',
          observacao:  document.getElementById('edit-tar-obs')?.value.trim() || '',
          execucao:    Math.min(100, Math.max(0, parseInt(document.getElementById('edit-tar-exec')?.value, 10) || 0)),
        };
        Storage.update(this.STORAGE_KEY, eventoId, { tarefas });
        UI.toast('Tarefa atualizada!', 'success');
        UI.closeModal();
        this._detail.tab = 'tarefas';
        this._renderDetail();
      },
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form (dados gerais)                                         */
  /* ------------------------------------------------------------------ */

  openModal(id = null, dataPre = null) {
    const evento = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!evento;
    const v      = (field, fallback = '') => {
      if (evento) return UI.escape(String(evento[field] ?? fallback));
      if (field === 'data' && dataPre) return dataPre;
      return fallback;
    };

    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const arenaOptions = `<option value="">— Selecionar —</option>` +
      arenas.map(a =>
        `<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
          ${evento && evento.arenaId === a.id ? 'selected' : ''}>${UI.escape(a.nome)} (${UI.escape(a.codigo)})</option>`
      ).join('');

    const tipoOptions   = CadastrosModule.buildOptions(CadastrosModule.getTiposEvento(), evento ? (evento.tipo || '') : '');
    const nivelOptions  = ListasService.opts('eventos_nivel', evento?.nivel || '');
    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${evento && evento.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="ev-nome">Nome do evento <span class="required-star">*</span></label>
          <input id="ev-nome" type="text" class="form-input"
            placeholder="ex: 1º Torneio Open da Academia"
            value="${v('nome')}" required autocomplete="off" />
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-tipo">Tipo</label>
            <select id="ev-tipo" class="form-select">${tipoOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-nivel">Nível</label>
            <select id="ev-nivel" class="form-select">${nivelOptions}</select>
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-data">Data de início <span class="required-star">*</span></label>
            <input id="ev-data" type="date" class="form-input" value="${v('data')}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-datafim">Data de fim <span class="form-hint">(opcional)</span></label>
            <input id="ev-datafim" type="date" class="form-input" value="${v('dataFim')}" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-hinicio">Horário início</label>
            <input id="ev-hinicio" type="time" class="form-input" value="${v('horarioInicio')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-hfim">Horário fim</label>
            <input id="ev-hfim" type="time" class="form-input" value="${v('horarioFim')}" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-arena">Arena</label>
            <select id="ev-arena" class="form-select">${arenaOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-vagas">Vagas</label>
            <input id="ev-vagas" type="number" class="form-input"
              placeholder="ex: 16" min="1" value="${v('vagas')}" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ev-valor">Valor de inscrição (R$) <span class="form-hint">(0 = gratuito)</span></label>
            <input id="ev-valor" type="number" class="form-input"
              placeholder="0,00" min="0" step="0.01" value="${v('valorInscricao', '0')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ev-status">Status</label>
            <select id="ev-status" class="form-select">${statusOptions}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="ev-desc">Descrição</label>
          <textarea id="ev-desc" class="form-textarea"
            placeholder="Descreva o evento, regras, premiação…" rows="3">${evento ? UI.escape(evento.descricao || '') : ''}</textarea>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Evento — ${evento.nome}` : 'Novo Evento',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Criar Evento',
      onConfirm:    () => this.saveEvento(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD                                                                */
  /* ------------------------------------------------------------------ */

  saveEvento(id = null) {
    const g    = n => document.getElementById(`ev-${n}`);
    const nome = g('nome');
    const data = g('data');

    let valid = true;
    [nome, data].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });
    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const arenaSel  = g('arena');
    const arenaId   = arenaSel ? arenaSel.value : '';
    const arenaNome = arenaSel?.selectedOptions[0]?.dataset.nome || '';

    const record = {
      nome:           nome.value.trim(),
      tipo:           g('tipo')    ? g('tipo').value                     : 'torneio',
      nivel:          g('nivel')   ? g('nivel').value                    : 'aberto',
      data:           data.value,
      dataFim:        g('datafim') ? g('datafim').value                  : '',
      horarioInicio:  g('hinicio') ? g('hinicio').value                  : '',
      horarioFim:     g('hfim')    ? g('hfim').value                     : '',
      arenaId,
      arenaNome,
      vagas:          g('vagas')   ? parseInt(g('vagas').value, 10) || 0 : 0,
      valorInscricao: g('valor')   ? parseFloat(g('valor').value)  || 0  : 0,
      status:         g('status')  ? g('status').value                   : 'planejado',
      descricao:      g('desc')    ? g('desc').value.trim()              : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, record);
      UI.toast(`Evento "${record.nome}" atualizado com sucesso!`, 'success');
      UI.closeModal();
      // se estiver na página de detalhe, volta para lá
      if (this._detail.id === id) {
        this._detail.tab = 'dados';
        this._renderDetail();
        return;
      }
    } else {
      Storage.create(this.STORAGE_KEY, record);
      UI.toast(`Evento "${record.nome}" criado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteEvento(id) {
    const evento = Storage.getById(this.STORAGE_KEY, id);
    if (!evento) return;
    const confirmed = await UI.confirm(
      `Deseja realmente excluir o evento "${evento.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Evento'
    );
    if (!confirmed) return;
    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Evento "${evento.nome}" excluído.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Filtros                                                              */
  /* ------------------------------------------------------------------ */

  handleSearch(value) {
    this._state.search = value;
    this._reRenderCards();
  },

  handleFilterStatus(value) {
    this._state.filterStatus = value;
    this._reRenderCards();
  },

  handleFilterTipo(value) {
    this._state.filterTipo = value;
    this._reRenderCards();
  },

  clearFilters() {
    this._state.search = this._state.filterStatus = this._state.filterTipo = this._state.filterArena = '';
    this.render();
  },

  _reRenderCards() {
    const filtered = this.getFiltered();
    const grid = document.getElementById('eventos-grid');
    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map(e => this.renderCard(e)).join('')
        : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) countEl.textContent = `${filtered.length} evento${filtered.length !== 1 ? 's' : ''}`;
  },

  _reRenderCalContent() {
    const el = document.getElementById('ev-cal-content');
    if (el) el.innerHTML = this._calRenderBody();
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _fmtData(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  },

  /* ================================================================== */
  /*  CALENDÁRIO DE EVENTOS                                               */
  /* ================================================================== */

  _calInitDate() {
    if (this._calAno !== null) return;
    const now = new Date();
    this._calAno = now.getFullYear();
    this._calMes = now.getMonth();
    this._calDia = now.getDate();
  },

  /* Retorna eventos que ocorrem em determinada data (span multi-dia) */
  _calEventosParaDia(dataStr) {
    return this.getAll().filter(e => {
      if (!e.data) return false;
      const fim = e.dataFim || e.data;
      if (dataStr < e.data || dataStr > fim) return false;
      if (this._calFilterArena && e.arenaId !== this._calFilterArena) return false;
      return true;
    }).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  },

  /* Eventos dentro de um intervalo (para agenda/semana) */
  _calEventosIntervalo(ini, fim) {
    const iniStr = (ini instanceof Date) ? ini.toISOString().slice(0,10) : ini;
    const fimStr = (fim instanceof Date) ? fim.toISOString().slice(0,10) : fim;
    return this.getAll().filter(e => {
      if (!e.data) return false;
      const eFim = e.dataFim || e.data;
      // Intervalo do evento se sobrepõe com intervalo de busca
      if (eFim < iniStr || e.data > fimStr) return false;
      if (this._calFilterArena && e.arenaId !== this._calFilterArena) return false;
      return true;
    }).sort((a, b) => a.data.localeCompare(b.data) || (a.horarioInicio||'').localeCompare(b.horarioInicio||''));
  },

  _calSetView(v) {
    this._calView = v;
    this._reRenderCalContent();
  },

  _calNavegar(delta) {
    const view = this._calView;
    if (view === 'mes') {
      let m = this._calMes + delta, a = this._calAno;
      if (m < 0)  { m = 11; a--; }
      if (m > 11) { m = 0;  a++; }
      this._calAno = a; this._calMes = m;
    } else if (view === 'semana') {
      const d = new Date(this._calAno, this._calMes, this._calDia);
      d.setDate(d.getDate() + delta * 7);
      this._calAno = d.getFullYear(); this._calMes = d.getMonth(); this._calDia = d.getDate();
    } else if (view === 'dia') {
      const d = new Date(this._calAno, this._calMes, this._calDia);
      d.setDate(d.getDate() + delta);
      this._calAno = d.getFullYear(); this._calMes = d.getMonth(); this._calDia = d.getDate();
    } else {
      const d = new Date(this._calAno, this._calMes, this._calDia);
      d.setDate(d.getDate() + delta * 14);
      this._calAno = d.getFullYear(); this._calMes = d.getMonth(); this._calDia = d.getDate();
    }
    this._reRenderCalContent();
  },

  _calIrHoje() {
    const now = new Date();
    this._calAno = now.getFullYear(); this._calMes = now.getMonth(); this._calDia = now.getDate();
    this._reRenderCalContent();
  },

  _calGetTitulo() {
    const { _calView: v, _calAno: a, _calMes: m, _calDia: d } = this;
    if (v === 'mes') return `${this._CAL_MESES[m]} ${a}`;
    if (v === 'dia') return new Date(a, m, d).toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    if (v === 'semana') {
      const ini = new Date(a, m, d);
      ini.setDate(ini.getDate() - ini.getDay());
      const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
      return `${ini.getDate()} – ${fim.getDate()} de ${this._CAL_MESES[fim.getMonth()]} ${fim.getFullYear()}`;
    }
    return `Próximos eventos`;
  },

  _renderCalendario() {
    const arenas = Storage.getAll('arenas').sort((a,b)=>a.nome.localeCompare(b.nome));
    const v = this._calView;
    return `
      <div class="cal-toolbar">
        <div class="cal-toolbar-left">
          <button class="btn btn-secondary btn-sm" onclick="EventoModule._calIrHoje()">Hoje</button>
          <button class="btn btn-icon" onclick="EventoModule._calNavegar(-1)">‹</button>
          <button class="btn btn-icon" onclick="EventoModule._calNavegar(1)">›</button>
          <span class="cal-titulo">${this._calGetTitulo()}</span>
        </div>
        <div class="cal-toolbar-right">
          <select class="filter-select" style="min-width:130px;"
            onchange="EventoModule._calFilterArena=this.value;EventoModule._reRenderCalContent()">
            <option value="">Todas as arenas</option>
            ${arenas.map(a =>
              `<option value="${a.id}" ${this._calFilterArena===a.id?'selected':''}>${UI.escape(a.nome)}</option>`
            ).join('')}
          </select>
          <div class="cal-view-btns">
            <button class="cal-view-btn${v==='mes'    ?'  cal-view-active':''}" onclick="EventoModule._calSetView('mes')">Mês</button>
            <button class="cal-view-btn${v==='semana' ?' cal-view-active':''}" onclick="EventoModule._calSetView('semana')">Semana</button>
            <button class="cal-view-btn${v==='dia'    ?' cal-view-active':''}" onclick="EventoModule._calSetView('dia')">Dia</button>
            <button class="cal-view-btn${v==='agenda' ?' cal-view-active':''}" onclick="EventoModule._calSetView('agenda')">Agenda</button>
          </div>
        </div>
      </div>
      <div class="cal-legenda" style="margin-bottom:12px;display:flex;gap:10px;flex-wrap:wrap;font-size:12px;">
        ${Object.entries(this.CAL_COR).map(([tipo, cor]) =>
          `<span style="display:flex;align-items:center;gap:4px;">
             <span style="width:10px;height:10px;border-radius:50%;background:${cor};flex-shrink:0;"></span>
             ${this.TIPO_ICON[tipo]||''} ${this.TIPO[tipo]||tipo}
           </span>`
        ).join('')}
      </div>
      <div id="ev-cal-content">${this._calRenderBody()}</div>`;
  },

  _calRenderBody() {
    const v = this._calView;
    if (v === 'mes')    return this._calViewMes();
    if (v === 'semana') return this._calViewSemana();
    if (v === 'dia')    return this._calViewDia();
    return this._calViewAgenda();
  },

  /* ---- Vista Mês ---- */
  _calViewMes() {
    const { _calAno: ano, _calMes: mes } = this;
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia   = new Date(ano, mes + 1, 0);
    const diasDoMes   = ultimoDia.getDate();
    const inicioSem   = primeiroDia.getDay();
    const mesStr      = String(mes + 1).padStart(2, '0');
    const hojeStr     = new Date().toISOString().slice(0, 10);
    const HEADER      = this._CAL_DIAS;
    const WKEND       = [0, 6];

    const headerCols = HEADER.map(h => `<div class="cal-mes-th">${h}</div>`).join('');
    let cells = '';

    for (let i = 0; i < inicioSem; i++) {
      cells += `<div class="cal-cell cal-cell-outside${WKEND.includes(i)?' cal-cell-fds':''}"></div>`;
    }

    for (let d = 1; d <= diasDoMes; d++) {
      const dataStr = `${ano}-${mesStr}-${String(d).padStart(2,'0')}`;
      const dow     = new Date(ano, mes, d).getDay();
      const isHoje  = dataStr === hojeStr;
      const isPast  = dataStr < hojeStr;
      const isFds   = WKEND.includes(dow);
      const evsDia  = this._calEventosParaDia(dataStr);
      const MAX     = 3;
      const visiveis = evsDia.slice(0, MAX);
      const extras   = evsDia.length - MAX;

      const evHtml = visiveis.map(e => {
        const cor  = this.CAL_COR[e.tipo] || '#6b7280';
        const icon = this.TIPO_ICON[e.tipo] || '📌';
        const hr   = (e.horarioInicio || '').slice(0,5);
        return `<div class="cal-event" style="--ev-cor:${cor};"
          onclick="event.stopPropagation();EventoModule.openDetail('${e.id}')">
          <span class="cal-ev-dot" style="background:${cor};"></span>
          ${hr ? `<span class="cal-event-hora">${hr}</span>` : ''}
          <span class="cal-event-nome">${icon} ${UI.escape(e.nome)}</span>
        </div>`;
      }).join('');

      const mais = extras > 0
        ? `<div class="cal-event-mais"
            onclick="event.stopPropagation();EventoModule._calDia=${d};EventoModule._calSetView('dia')">+${extras} mais</div>`
        : '';

      cells += `
        <div class="cal-cell${isHoje?' cal-cell-hoje':''}${isPast?' cal-cell-passado':''}${isFds?' cal-cell-fds':''}"
          onclick="EventoModule.openModal(null,'${dataStr}')" style="cursor:pointer;">
          <div class="cal-cell-num${isHoje?' hoje':''}">${d}</div>
          ${evHtml}${mais}
        </div>`;
    }

    return `
      <div class="cal-mes-wrap">
        <div class="cal-mes-header">${headerCols}</div>
        <div class="cal-mes-grid">${cells}</div>
      </div>`;
  },

  /* ---- Vista Semana ---- */
  _calViewSemana() {
    const { _calAno: ano, _calMes: mes, _calDia: dia } = this;
    const ref = new Date(ano, mes, dia);
    const ini = new Date(ref); ini.setDate(ref.getDate() - ref.getDay());
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
    const eventos   = this._calEventosIntervalo(ini, fim);
    const hojeStr   = new Date().toISOString().slice(0,10);

    const cols = [];
    for (let i = 0; i < 7; i++) {
      const d  = new Date(ini); d.setDate(ini.getDate() + i);
      const ds = d.toISOString().slice(0,10);
      const isHoje  = ds === hojeStr;
      const evsDia  = eventos.filter(e => {
        const eFim = e.dataFim || e.data;
        return e.data <= ds && eFim >= ds;
      });
      const content = evsDia.length
        ? evsDia.map(e => this._calCardEvento(e, 'sm')).join('')
        : `<div class="cal-sem-vazio">—</div>`;

      cols.push(`
        <div class="cal-sem-col${isHoje?' cal-sem-hoje':''}">
          <div class="cal-sem-header" onclick="EventoModule.openModal(null,'${ds}')"
            style="cursor:pointer;" title="Novo evento neste dia">
            <span class="cal-sem-diaNome">${this._CAL_DIAS[i]}</span>
            <span class="cal-sem-diaNum${isHoje?' hoje':''}">${d.getDate()}</span>
          </div>
          <div class="cal-sem-aulas">${content}</div>
        </div>`);
    }
    return `<div class="cal-semana-grid">${cols.join('')}</div>`;
  },

  /* ---- Vista Dia ---- */
  _calViewDia() {
    const { _calAno: ano, _calMes: mes, _calDia: dia } = this;
    const d       = new Date(ano, mes, dia);
    const dataStr = d.toISOString().slice(0,10);
    const evsDia  = this._calEventosParaDia(dataStr);

    if (!evsDia.length) {
      return `
        <div class="cal-dia-vazio">
          <span>🏆</span>
          <p>Nenhum evento neste dia.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px;"
            onclick="EventoModule.openModal(null,'${dataStr}')">+ Novo Evento</button>
        </div>`;
    }
    return `
      <div class="cal-dia-lista">
        ${evsDia.map(e => this._calCardEvento(e, 'lg')).join('')}
        <div style="margin-top:12px;text-align:center;">
          <button class="btn btn-secondary btn-sm"
            onclick="EventoModule.openModal(null,'${dataStr}')">+ Novo Evento neste dia</button>
        </div>
      </div>`;
  },

  /* ---- Vista Agenda ---- */
  _calViewAgenda() {
    const ref = new Date(this._calAno, this._calMes, this._calDia);
    const fim = new Date(ref); fim.setDate(ref.getDate() + 60);
    const eventos = this._calEventosIntervalo(ref, fim);
    const hojeStr = new Date().toISOString().slice(0,10);

    if (!eventos.length) {
      return `<div class="cal-dia-vazio"><span>📭</span><p>Nenhum evento nos próximos 60 dias.</p></div>`;
    }

    // Agrupa por data de início
    const grupos = {};
    eventos.forEach(e => {
      const k = e.data;
      (grupos[k] = grupos[k] || []).push(e);
    });

    return `<div class="cal-agenda-wrap">` +
      Object.entries(grupos).sort(([a],[b]) => a.localeCompare(b)).map(([data, evs]) => {
        const [y, m, d] = data.split('-');
        const dateObj = new Date(+y, +m-1, +d);
        const label   = dateObj.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        const isHoje  = data === hojeStr;
        return `
          <div class="cal-agenda-grupo">
            <div class="cal-agenda-data${isHoje?' hoje':''}">
              ${label.charAt(0).toUpperCase() + label.slice(1)}
              ${isHoje ? '<span class="cal-agenda-hoje-badge">Hoje</span>' : ''}
            </div>
            <div class="cal-agenda-aulas">
              ${evs.map(e => this._calCardEvento(e, 'md')).join('')}
            </div>
          </div>`;
      }).join('') + `</div>`;
  },

  /* ---- Card de evento no calendário ---- */
  _calCardEvento(e, size = 'md') {
    const cor    = this.CAL_COR[e.tipo] || '#6b7280';
    const icon   = this.TIPO_ICON[e.tipo] || '📌';
    const status = this.STATUS[e.status] || { label: e.status, badge: 'badge-gray' };
    const hr     = (e.horarioInicio || '').slice(0, 5);
    const hrFim  = (e.horarioFim   || '').slice(0, 5);
    const horario = hr ? (hrFim ? `${hr}–${hrFim}` : hr) : '';

    if (size === 'sm') {
      return `
        <div class="cal-card cal-card-sm" style="--ev-cor:${cor};"
          onclick="EventoModule.openDetail('${e.id}')">
          <div class="cal-card-hora">${horario || icon}</div>
          <div class="cal-card-titulo">${UI.escape(e.nome)}</div>
        </div>`;
    }

    const periodo = e.dataFim && e.dataFim !== e.data
      ? `${this._fmtData(e.data)} – ${this._fmtData(e.dataFim)}`
      : this._fmtData(e.data);

    if (size === 'md') {
      return `
        <div class="cal-card cal-card-md" style="--ev-cor:${cor};"
          onclick="EventoModule.openDetail('${e.id}')">
          <div class="cal-card-left-bar" style="background:${cor};"></div>
          <div class="cal-card-body">
            <div class="cal-card-row1">
              <span class="cal-card-hora">${horario || icon}</span>
              <span class="cal-card-badge" style="background:${cor}20;color:${cor};">${this.TIPO[e.tipo]||e.tipo}</span>
              <span class="badge ${status.badge}" style="font-size:10px;">${status.label}</span>
            </div>
            <div class="cal-card-titulo">${icon} ${UI.escape(e.nome)}</div>
            <div class="cal-card-sub">
              📅 ${periodo}
              ${e.arenaNome ? `· 📍 ${UI.escape(e.arenaNome)}` : ''}
              ${e.vagas ? `· 👥 ${e.vagas} vagas` : ''}
            </div>
          </div>
        </div>`;
    }

    // size === 'lg'
    return `
      <div class="cal-card cal-card-lg" style="--ev-cor:${cor};">
        <div class="cal-card-left-bar" style="background:${cor};"></div>
        <div class="cal-card-body">
          <div class="cal-card-row1">
            <span class="cal-card-hora">${horario}</span>
            <span class="cal-card-badge" style="background:${cor}20;color:${cor};">${this.TIPO[e.tipo]||e.tipo}</span>
            <span class="badge ${status.badge}">${status.label}</span>
          </div>
          <div class="cal-card-titulo">${icon} ${UI.escape(e.nome)}</div>
          <div class="cal-card-sub">
            📅 ${periodo}
            ${e.arenaNome ? `· 📍 ${UI.escape(e.arenaNome)}` : ''}
            ${e.vagas     ? `· 👥 ${e.vagas} vagas`         : ''}
            ${e.nivel     ? `· 🎯 ${this.NIVEL[e.nivel]||e.nivel}` : ''}
          </div>
          <div style="margin-top:10px;display:flex;gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="EventoModule.openDetail('${e.id}')">📂 Detalhe</button>
            <button class="btn btn-ghost btn-sm" onclick="EventoModule.openModal('${e.id}')">✏️ Editar</button>
          </div>
        </div>
      </div>`;
  },
