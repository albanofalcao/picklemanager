'use strict';

/**
 * TorneioModule — Módulo de Torneios
 *
 * Hierarquia:
 *   torneio_cat_tipos   → catálogo global de categorias da arena (reutilizável)
 *   torneios            → eventos (Torneio de Verão 2026, etc.)
 *   torneio_categorias  → categorias selecionadas para cada torneio + configurações
 *   torneio_inscricoes  → inscrições por categoria
 */
const TorneioModule = {

  /* ------------------------------------------------------------------ */
  /*  Storage keys                                                        */
  /* ------------------------------------------------------------------ */

  SK:          'torneios',
  SK_CAT_TIPO: 'torneio_cat_tipos',    // catálogo reutilizável
  SK_CAT:      'torneio_categorias',   // categorias de um torneio específico
  SK_PART:     'torneio_participantes',
  SK_INSC:     'torneio_inscricoes',
  SK_DUPLA:    'torneio_duplas',
  SK_FASE:     'torneio_fases',
  SK_GRUPO:    'torneio_grupos',
  SK_PARTIDA:  'torneio_partidas',
  SK_SET:      'torneio_sets',
  SK_PAG:      'torneio_pagamentos',

  /* ------------------------------------------------------------------ */
  /*  Constantes de domínio                                               */
  /* ------------------------------------------------------------------ */

  ESPORTES: {
    pickleball:   { label: 'Pickleball',   icon: '🏓' },
    tenis:        { label: 'Tênis',        icon: '🎾' },
    beach_tennis: { label: 'Beach Tennis', icon: '🏖️' },
    futvolei:     { label: 'Futevolei',    icon: '⚽' },
  },

  STATUS: {
    rascunho:           { label: 'Rascunho',           badge: 'badge-gray'    },
    inscricoes_abertas: { label: 'Inscrições Abertas', badge: 'badge-blue'    },
    em_andamento:       { label: 'Em Andamento',       badge: 'badge-warning' },
    encerrado:          { label: 'Encerrado',          badge: 'badge-success' },
    cancelado:          { label: 'Cancelado',          badge: 'badge-error'   },
  },

  FORMATO: {
    eliminatoria_simples: 'Eliminatória Simples',
    eliminatoria_dupla:   'Eliminatória Dupla',
    round_robin:          'Round Robin',
    grupos_mata_mata:     'Grupos + Mata-Mata',
    suico:                'Sistema Suíço',
    repescagem:           'Repescagem',
  },

  SEXO: {
    masculino: 'Masculino',
    feminino:  'Feminino',
    misto:     'Misto',
    aberto:    'Aberto',
  },

  TIPO_PART: {
    singles: 'Singles',
    duplas:  'Duplas',
  },

  NIVEL: {
    kids:          'Kids',
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    profissional:  'Profissional',
  },

  /* ------------------------------------------------------------------ */
  /*  Estado                                                              */
  /* ------------------------------------------------------------------ */

  _state: {
    tab:           'eventos',
    search:        '',
    filterStatus:  '',
    filterEsporte: '',
    searchPart:    '',
    searchCatTipo: '',
    _eventoId:     null,
  },

  /* ------------------------------------------------------------------ */
  /*  Seed de categorias padrão (roda uma vez se o catálogo estiver      */
  /*  vazio)                                                              */
  /* ------------------------------------------------------------------ */

  SEED_CAT_TIPOS: [
    // ── Singles ──────────────────────────────────────────────────────────────────────────────────────────
    { nome: 'Masculino Profissional', tipoParticipacao: 'singles', sexo: 'masculino', nivel: 'profissional',  idadeMin: null, idadeMax: null, descricao: 'Singles masculino nível profissional' },
    { nome: 'Masculino Avançado',     tipoParticipacao: 'singles', sexo: 'masculino', nivel: 'avancado',      idadeMin: null, idadeMax: null, descricao: 'Singles masculino nível avançado' },
    { nome: 'Masculino Intermediário',tipoParticipacao: 'singles', sexo: 'masculino', nivel: 'intermediario', idadeMin: null, idadeMax: null, descricao: 'Singles masculino nível intermediário' },
    { nome: 'Masculino Iniciante',    tipoParticipacao: 'singles', sexo: 'masculino', nivel: 'iniciante',     idadeMin: null, idadeMax: null, descricao: 'Singles masculino nível iniciante' },
    { nome: 'Feminino Profissional',  tipoParticipacao: 'singles', sexo: 'feminino',  nivel: 'profissional',  idadeMin: null, idadeMax: null, descricao: 'Singles feminino nível profissional' },
    { nome: 'Feminino Avançado',      tipoParticipacao: 'singles', sexo: 'feminino',  nivel: 'avancado',      idadeMin: null, idadeMax: null, descricao: 'Singles feminino nível avançado' },
    { nome: 'Feminino Intermediário', tipoParticipacao: 'singles', sexo: 'feminino',  nivel: 'intermediario', idadeMin: null, idadeMax: null, descricao: 'Singles feminino nível intermediário' },
    { nome: 'Feminino Iniciante',     tipoParticipacao: 'singles', sexo: 'feminino',  nivel: 'iniciante',     idadeMin: null, idadeMax: null, descricao: 'Singles feminino nível iniciante' },
    // ── Duplas ───────────────────────────────────────────────────────────────────────────────────────────
    { nome: 'Duplas Masc Profissional',  tipoParticipacao: 'duplas', sexo: 'masculino', nivel: 'profissional',  idadeMin: null, idadeMax: null, descricao: 'Duplas masculinas profissional' },
    { nome: 'Duplas Masc Avançado',      tipoParticipacao: 'duplas', sexo: 'masculino', nivel: 'avancado',      idadeMin: null, idadeMax: null, descricao: 'Duplas masculinas avançado' },
    { nome: 'Duplas Masc Intermediário', tipoParticipacao: 'duplas', sexo: 'masculino', nivel: 'intermediario', idadeMin: null, idadeMax: null, descricao: 'Duplas masculinas intermediário' },
    { nome: 'Duplas Masc Iniciante',     tipoParticipacao: 'duplas', sexo: 'masculino', nivel: 'iniciante',     idadeMin: null, idadeMax: null, descricao: 'Duplas masculinas iniciante' },
    { nome: 'Duplas Fem Profissional',   tipoParticipacao: 'duplas', sexo: 'feminino',  nivel: 'profissional',  idadeMin: null, idadeMax: null, descricao: 'Duplas femininas profissional' },
    { nome: 'Duplas Fem Avançado',       tipoParticipacao: 'duplas', sexo: 'feminino',  nivel: 'avancado',      idadeMin: null, idadeMax: null, descricao: 'Duplas femininas avançado' },
    { nome: 'Duplas Fem Intermediário',  tipoParticipacao: 'duplas', sexo: 'feminino',  nivel: 'intermediario', idadeMin: null, idadeMax: null, descricao: 'Duplas femininas intermediário' },
    { nome: 'Duplas Fem Iniciante',      tipoParticipacao: 'duplas', sexo: 'feminino',  nivel: 'iniciante',     idadeMin: null, idadeMax: null, descricao: 'Duplas femininas iniciante' },
    { nome: 'Duplas Mistas Profissional',tipoParticipacao: 'duplas', sexo: 'misto',     nivel: 'profissional',  idadeMin: null, idadeMax: null, descricao: 'Duplas mistas profissional' },
    { nome: 'Duplas Mistas Avançado',    tipoParticipacao: 'duplas', sexo: 'misto',     nivel: 'avancado',      idadeMin: null, idadeMax: null, descricao: 'Duplas mistas avançado' },
    { nome: 'Duplas Mistas Intermediário',tipoParticipacao:'duplas', sexo: 'misto',     nivel: 'intermediario', idadeMin: null, idadeMax: null, descricao: 'Duplas mistas intermediário' },
    { nome: 'Duplas Mistas Iniciante',   tipoParticipacao: 'duplas', sexo: 'misto',     nivel: 'iniciante',     idadeMin: null, idadeMax: null, descricao: 'Duplas mistas iniciante' },
    // ── Kids & Jovens ────────────────────────────────────────────────────────────────────────────────────
    { nome: 'Kids Sub-10',        tipoParticipacao: '', sexo: 'aberto',    nivel: 'kids',     idadeMin: null, idadeMax: 10, descricao: 'Até 10 anos' },
    { nome: 'Kids Sub-12',        tipoParticipacao: '', sexo: 'aberto',    nivel: 'kids',     idadeMin: null, idadeMax: 12, descricao: 'Até 12 anos' },
    { nome: 'Sub-15',             tipoParticipacao: '', sexo: 'aberto',    nivel: 'iniciante',idadeMin: null, idadeMax: 15, descricao: 'Até 15 anos' },
    { nome: 'Sub-18',             tipoParticipacao: '', sexo: 'aberto',    nivel: 'iniciante',idadeMin: null, idadeMax: 18, descricao: 'Até 18 anos' },
    // ── Sênior ───────────────────────────────────────────────────────────────────────────────────────────
    { nome: '50+ Masculino',      tipoParticipacao: '', sexo: 'masculino', nivel: 'iniciante',idadeMin: 50, idadeMax: null, descricao: 'Masculino 50 anos ou mais' },
    { nome: '50+ Feminino',       tipoParticipacao: '', sexo: 'feminino',  nivel: 'iniciante',idadeMin: 50, idadeMax: null, descricao: 'Feminino 50 anos ou mais' },
    { nome: '60+ Masculino',      tipoParticipacao: '', sexo: 'masculino', nivel: 'iniciante',idadeMin: 60, idadeMax: null, descricao: 'Masculino 60 anos ou mais' },
    { nome: '60+ Feminino',       tipoParticipacao: '', sexo: 'feminino',  nivel: 'iniciante',idadeMin: 60, idadeMax: null, descricao: 'Feminino 60 anos ou mais' },
    // ── Aberto ───────────────────────────────────────────────────────────────────────────────────────────
    { nome: 'Open',               tipoParticipacao: '', sexo: 'aberto',    nivel: 'iniciante',idadeMin: null, idadeMax: null, descricao: 'Categoria aberta sem restrição de nível ou idade' },
  ],

  _seedCatTipos() {
    if (Storage.getAll(this.SK_CAT_TIPO).length > 0) return;
    const now = new Date().toISOString();
    this.SEED_CAT_TIPOS.forEach(cat => {
      Storage.create(this.SK_CAT_TIPO, cat);
    });
    console.log('[TorneioModule] Categorias padrão criadas:', this.SEED_CAT_TIPOS.length);
  },

  /* ------------------------------------------------------------------ */
  /*  Render principal                                                    */
  /* ------------------------------------------------------------------ */

  render() {
    this._seedCatTipos();
    const area = document.getElementById('content-area');
    if (!area) return;
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>🥇 Torneios</h2>
          <p>Gerencie eventos esportivos, categorias, inscrições e resultados</p>
        </div>
      </div>

      <div class="tabs-bar">
        ${this._tabBtn('eventos',       '🏆 Eventos')}
        ${this._tabBtn('categorias',    '📂 Categorias')}
        ${this._tabBtn('participantes', '👤 Participantes')}
      </div>

      <div id="torneio-content">
        ${this._renderTab(this._state.tab)}
      </div>
    `;
  },

  switchTab(tab) {
    this._state.tab = tab;
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    const c = document.getElementById('torneio-content');
    if (c) c.innerHTML = this._renderTab(tab);
  },

  _tabBtn(key, label) {
    return `<button class="tab-btn ${this._state.tab === key ? 'active' : ''}"
      data-tab="${key}" onclick="TorneioModule.switchTab('${key}')">${label}</button>`;
  },

  _renderTab(tab) {
    if (tab === 'categorias')    return this._renderCatTipos();
    if (tab === 'participantes') return this._renderParticipantes();
    return this._renderEventos();
  },

  _reRenderContent() {
    const c = document.getElementById('torneio-content');
    if (c) c.innerHTML = this._renderTab(this._state.tab);
  },

  /* ================================================================== */
  /*  ABA: EVENTOS                                                        */
  /* ================================================================== */

  _renderEventos() {
    const todos    = Storage.getAll(this.SK);
    const filtered = this._filtrarEventos(todos);

    const statusOpts = Object.entries(this.STATUS)
      .map(([k, v]) => `<option value="${k}" ${this._state.filterStatus === k ? 'selected' : ''}>${v.label}</option>`)
      .join('');
    const esporteOpts = Object.entries(this.ESPORTES)
      .map(([k, v]) => `<option value="${k}" ${this._state.filterEsporte === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`)
      .join('');

    return `
      <div class="filters-bar" style="flex-wrap:wrap;gap:8px;margin-bottom:20px;">
        <div class="search-wrapper" style="flex:1;min-width:200px;">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar torneio…"
            value="${UI.escape(this._state.search)}"
            oninput="TorneioModule._state.search=this.value;TorneioModule._reRenderContent()" />
        </div>
        <select class="filter-select"
          onchange="TorneioModule._state.filterStatus=this.value;TorneioModule._reRenderContent()">
          <option value="">Todos os status</option>
          ${statusOpts}
        </select>
        <select class="filter-select"
          onchange="TorneioModule._state.filterEsporte=this.value;TorneioModule._reRenderContent()">
          <option value="">Todos os esportes</option>
          ${esporteOpts}
        </select>
        <span class="results-count">${filtered.length} torneio${filtered.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" onclick="TorneioModule.openModalEvento()">+ Novo Torneio</button>
      </div>
      ${filtered.length ? this._renderCards(filtered) : this._emptyEventos()}
    `;
  },

  _filtrarEventos(todos) {
    let list = todos.slice();
    if (this._state.search) {
      const q = this._state.search.toLowerCase();
      list = list.filter(e => (e.nome || '').toLowerCase().includes(q));
    }
    if (this._state.filterStatus)  list = list.filter(e => e.status  === this._state.filterStatus);
    if (this._state.filterEsporte) list = list.filter(e => e.esporte === this._state.filterEsporte);
    return list.sort((a, b) => (b.dataInicio || '').localeCompare(a.dataInicio || ''));
  },

  _renderCards(eventos) {
    return `<div class="torneio-cards-grid">
      ${eventos.map(e => this._renderCard(e)).join('')}
    </div>`;
  },

  _renderCard(e) {
    const esp  = this.ESPORTES[e.esporte] || { label: e.esporte, icon: '🏅' };
    const st   = this.STATUS[e.status]    || { label: e.status,  badge: 'badge-gray' };
    const cats = Storage.getAll(this.SK_CAT).filter(c => c.eventoId === e.id);
    const insc = Storage.getAll(this.SK_INSC).filter(i => cats.some(c => c.id === i.categoriaId));

    return `
      <div class="card torneio-card">
        <div class="torneio-card-header">
          <div>
            <div class="torneio-card-esporte">${esp.icon} ${esp.label}</div>
            <div class="torneio-card-nome">${UI.escape(e.nome)}</div>
          </div>
          <span class="badge ${st.badge}">${st.label}</span>
        </div>
        <div class="torneio-card-info">
          <span>📅 ${UI.formatDate(e.dataInicio)}${e.dataFim && e.dataFim !== e.dataInicio ? ` → ${UI.formatDate(e.dataFim)}` : ''}</span>
          ${e.horarioInicio ? `<span>⏰ ${e.horarioInicio}${e.horarioFim ? ' → ' + e.horarioFim : ''}</span>` : ''}
          <span>📂 ${cats.length} categoria${cats.length !== 1 ? 's' : ''}</span>
          <span>👤 ${insc.length} inscrito${insc.length !== 1 ? 's' : ''}</span>
        </div>
        ${e.observacoes ? `<div class="torneio-card-obs">${UI.escape(e.observacoes)}</div>` : ''}
        <div class="torneio-card-actions">
          <button class="btn btn-secondary btn-sm"
            onclick="TorneioModule.abrirPreCalendario('${e.id}')"
            title="Ver pré-calendário de partidas">📅 Calendário</button>
          <button class="btn btn-primary btn-sm"
            onclick="TorneioModule.abrirDetalhe('${e.id}')">⚙️ Gerenciar</button>
          <button class="btn btn-ghost btn-sm"
            onclick="TorneioModule.openModalEvento('${e.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger"
            onclick="TorneioModule.deleteEvento('${e.id}')" title="Excluir">🗑️</button>
        </div>
      </div>`;
  },

  _emptyEventos() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <div class="empty-title">Nenhum torneio cadastrado</div>
        <div class="empty-desc">Crie o primeiro torneio da arena para começar.</div>
        <button class="btn btn-primary mt-16"
          onclick="TorneioModule.openModalEvento()">+ Criar Torneio</button>
      </div>`;
  },

  /* ================================================================== */
  /*  DETALHE DO EVENTO                                                   */
  /* ================================================================== */

  abrirDetalhe(id) {
    const evento = Storage.getById(this.SK, id);
    if (!evento) return;
    this._state._eventoId = id;

    const esp  = this.ESPORTES[evento.esporte] || { label: evento.esporte, icon: '🏅' };
    const st   = this.STATUS[evento.status]    || { label: evento.status,  badge: 'badge-gray' };
    const cats = Storage.getAll(this.SK_CAT).filter(c => c.eventoId === id);

    const area = document.getElementById('content-area');
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <button class="btn btn-ghost btn-sm"
            onclick="TorneioModule.render()" style="margin-bottom:4px;">← Torneios</button>
          <h2>${esp.icon} ${UI.escape(evento.nome)}</h2>
          <p>${UI.formatDate(evento.dataInicio)}${evento.dataFim !== evento.dataInicio
            ? ` → ${UI.formatDate(evento.dataFim)}` : ''}
            &nbsp;·&nbsp; <span class="badge ${st.badge}">${st.label}</span></p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${this._statusActions(evento)}
          <button class="btn btn-secondary btn-sm"
            onclick="TorneioModule.abrirPreCalendario('${id}')">📅 Pré-Calendário</button>
          <button class="btn btn-secondary btn-sm"
            onclick="TorneioModule.openModalEvento('${id}')">✏️ Editar</button>
        </div>
      </div>

      ${this._renderViabilidadeBanner(evento, cats)}

      <div style="display:flex;align-items:center;justify-content:space-between;margin:20px 0 16px;">
        <h3 style="font-size:15px;font-weight:700;">
          📂 Categorias
          <span class="badge badge-gray" style="font-size:12px;margin-left:6px;">${cats.length}</span>
        </h3>
        <button class="btn btn-primary btn-sm"
          onclick="TorneioModule.openModalAdicionarCat('${id}')">+ Adicionar Categoria</button>
      </div>

      <div id="torneio-cats-list">
        ${cats.length
          ? `<div class="torneio-cat-grid">${cats.map(c => this._renderCatCard(c, evento)).join('')}</div>`
          : this._emptyCats(id)}
      </div>
    `;
  },

  _statusActions(evento) {
    const next = {
      rascunho:           { status: 'inscricoes_abertas', label: '▶ Abrir Inscrições' },
      inscricoes_abertas: { status: 'em_andamento',       label: '▶ Iniciar Torneio'  },
      em_andamento:       { status: 'encerrado',          label: '✓ Encerrar'         },
    };
    const n = next[evento.status];
    if (!n) return '';
    return `<button class="btn btn-primary btn-sm"
      onclick="TorneioModule._avancarStatus('${evento.id}','${n.status}')">${n.label}</button>`;
  },

  _avancarStatus(id, novoStatus) {
    Storage.update(this.SK, id, { status: novoStatus });
    UI.toast('Status atualizado!', 'success');
    this.abrirDetalhe(id);
  },

  _renderCatCard(cat, evento) {
    const insc   = Storage.getAll(this.SK_INSC).filter(i => i.categoriaId === cat.id);
    const pago   = insc.filter(i => i.statusPagamento === 'pago').length;
    const pend   = insc.filter(i => i.statusPagamento === 'pendente').length;
    const fmt    = this.FORMATO[cat.formato] || null;
    const tipo   = this.TIPO_PART[cat.tipoParticipacao] || null;
    const est    = this._calcEstimativa(cat, evento.quadrasDisponiveis);

    return `
      <div class="card torneio-cat-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;">
          <div class="torneio-cat-nome">${UI.escape(cat.nome)}</div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn btn-ghost btn-sm"
              onclick="TorneioModule.openModalConfigCat('${cat.id}','${evento.id}')"
              title="Configurar">⚙️</button>
            <button class="btn btn-ghost btn-sm danger"
              onclick="TorneioModule.deleteCatEvento('${cat.id}','${evento.id}')"
              title="Remover do torneio">🗑️</button>
          </div>
        </div>

        <div class="torneio-cat-stats">
          ${tipo ? `<span>👥 ${tipo}</span>` : ''}
          ${fmt  ? `<span>🎮 ${fmt}</span>`  : '<span style="color:var(--color-warning);">⚠️ Formato não definido</span>'}
          <span>🎾 ${cat.numSets === 'melhor_de_3' ? 'Melhor de 3' : '1 Set'}</span>
          ${cat.taxaInscricao > 0
            ? `<span>💰 R$ ${(+cat.taxaInscricao).toLocaleString('pt-BR',{minimumFractionDigits:2})}/pessoa</span>`
            : '<span style="color:var(--color-success);">Gratuita</span>'}
          ${cat.maxParticipantes ? `<span>🔢 Máx ${cat.maxParticipantes}</span>` : '<span style="color:var(--text-muted);">Sem limite</span>'}
        </div>

        ${est ? `
        <div class="torneio-est-bar">
          <span title="Partidas estimadas">🎯 ${est.partidas} partidas</span>
          <span title="Duração estimada com ${evento.quadrasDisponiveis || 1} quadra(s)">⏱ ~${est.duracaoStr}</span>
          <span title="Tempo por partida">${cat.tempoPartidaMin || 25} min/jogo</span>
        </div>` : `
        <div class="torneio-est-bar" style="color:var(--text-muted);font-style:italic;">
          Configure formato e máx. participantes para ver a estimativa
        </div>`}

        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--card-border);
             display:flex;gap:12px;font-size:13px;align-items:center;">
          <span>👤 <strong>${insc.length}</strong> inscritos</span>
          ${pago ? `<span style="color:var(--color-success);">✓ ${pago} pagos</span>` : ''}
          ${pend ? `<span style="color:var(--color-warning);">⏳ ${pend} pendentes</span>` : ''}
          <button class="btn btn-primary btn-sm" style="margin-left:auto;"
            onclick="TorneioModule.abrirCategoria('${cat.id}','${evento.id}')">👤 Inscrições</button>
        </div>
      </div>`;
  },

  _emptyCats(eventoId) {
    const temTipos = Storage.getAll(this.SK_CAT_TIPO).length > 0;
    return `
      <div class="empty-state" style="padding:40px 0;">
        <div class="empty-icon">📂</div>
        <div class="empty-title">Nenhuma categoria adicionada</div>
        <div class="empty-desc">${temTipos
          ? 'Clique em <strong>+ Adicionar Categoria</strong> para selecionar da lista.'
          : 'Primeiro cadastre as categorias na aba <strong>📂 Categorias</strong>, depois adicione aqui.'}</div>
        ${temTipos
          ? `<button class="btn btn-primary mt-16"
               onclick="TorneioModule.openModalAdicionarCat('${eventoId}')">+ Adicionar Categoria</button>`
          : `<button class="btn btn-secondary mt-16"
               onclick="TorneioModule.switchTab('categorias')">→ Ir para Categorias</button>`}
      </div>`;
  },

  /* ================================================================== */
  /*  ABA: CATEGORIAS (catálogo reutilizável)                             */
  /* ================================================================== */

  _renderCatTipos() {
    const todos    = Storage.getAll(this.SK_CAT_TIPO);
    const q        = (this._state.searchCatTipo || '').toLowerCase();
    const filtered = q ? todos.filter(c => (c.nome || '').toLowerCase().includes(q)) : todos;
    filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

    return `
      <div class="filters-bar" style="margin-bottom:20px;">
        <div class="search-wrapper" style="flex:1;">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar categoria…"
            value="${UI.escape(this._state.searchCatTipo || '')}"
            oninput="TorneioModule._state.searchCatTipo=this.value;TorneioModule._reRenderContent()" />
        </div>
        <span class="results-count">${filtered.length} categoria${filtered.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary"
          onclick="TorneioModule.openModalCatTipo()">+ Nova Categoria</button>
      </div>

      ${filtered.length ? `
        <div class="table-card">
          <table class="data-table">
            <thead><tr>
              <th>Nome</th>
              <th>Participação</th>
              <th>Sexo</th>
              <th>Nível</th>
              <th>Idade</th>
              <th>Descrição</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${filtered.map(c => this._renderCatTipoRow(c)).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-title">Nenhuma categoria cadastrada</div>
          <div class="empty-desc">
            Cadastre aqui as categorias que serão usadas nos torneios da arena.<br>
            Exemplos: <em>Masculino A</em>, <em>Feminino</em>, <em>Duplas Mistas</em>, <em>Sub-18</em>, <em>50+</em>…
          </div>
          <button class="btn btn-primary mt-16"
            onclick="TorneioModule.openModalCatTipo()">+ Criar primeira categoria</button>
        </div>
      `}
    `;
  },

  _renderCatTipoRow(c) {
    const emUso   = Storage.getAll(this.SK_CAT).filter(x => x.catTipoId === c.id).length;
    const idadeStr = c.idadeMin && c.idadeMax ? `${c.idadeMin}–${c.idadeMax} anos`
                   : c.idadeMin ? `${c.idadeMin}+ anos`
                   : c.idadeMax ? `até ${c.idadeMax} anos`
                   : '—';
    return `<tr>
      <td><strong>${UI.escape(c.nome)}</strong></td>
      <td>${this.TIPO_PART[c.tipoParticipacao] || '—'}</td>
      <td>${this.SEXO[c.sexo]   || '—'}</td>
      <td>${this.NIVEL[c.nivel] || '—'}</td>
      <td>${idadeStr}</td>
      <td style="color:var(--text-muted);font-size:12px;">${UI.escape(c.descricao || '—')}</td>
      <td class="aluno-row-actions">
        ${emUso ? `<span class="badge badge-gray" style="font-size:11px;">${emUso} torneio${emUso > 1 ? 's' : ''}</span>` : ''}
        <button class="btn btn-ghost btn-sm"
          onclick="TorneioModule.openModalCatTipo('${c.id}')" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-sm danger"
          onclick="TorneioModule.deleteCatTipo('${c.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal — Categoria (catálogo)                                        */
  /* ------------------------------------------------------------------ */

  openModalCatTipo(id = null) {
    const cat  = id ? Storage.getById(this.SK_CAT_TIPO, id) : null;
    const isEd = !!cat;
    const v    = (f, fb = '') => cat ? UI.escape(String(cat[f] ?? fb)) : fb;

    const mkOpts = (map, field) => Object.entries(map)
      .map(([k, l]) => `<option value="${k}" ${cat?.[field] === k ? 'selected' : ''}>${l}</option>`)
      .join('');

    UI.openModal({
      title:        isEd ? 'Editar Categoria' : 'Nova Categoria',
      confirmLabel: isEd ? 'Salvar'           : 'Criar',
      onConfirm:    () => this.saveCatTipo(id),
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Nome <span class="required-star">*</span></label>
            <input id="ct-nome" type="text" class="form-input"
              placeholder="ex: Masculino Avançado, Feminino Iniciante, Sub-18, 50+…"
              value="${v('nome')}" autocomplete="off" />
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label">Participação</label>
              <select id="ct-tipo" class="form-select">
                <option value="">— Qualquer —</option>
                ${mkOpts(this.TIPO_PART, 'tipoParticipacao')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Sexo</label>
              <select id="ct-sexo" class="form-select">
                <option value="">— Qualquer —</option>
                ${mkOpts(this.SEXO, 'sexo')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Nível de jogo</label>
              <select id="ct-nivel" class="form-select">
                <option value="">— Qualquer —</option>
                ${mkOpts(this.NIVEL, 'nivel')}
              </select>
            </div>
          </div>

          <div style="background:var(--bg-secondary);border-radius:10px;padding:14px 16px;border:1px solid var(--card-border);">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">
              🎂 Restrição de Idade (deixe em branco = sem restrição)
            </div>
            <div class="form-grid-2">
              <div class="form-group" style="margin:0;">
                <label class="form-label">Idade mínima</label>
                <input id="ct-idade-min" type="number" class="form-input" min="0" max="120"
                  placeholder="ex: 50 para categoria 50+"
                  value="${cat?.idadeMin ?? ''}" />
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label">Idade máxima</label>
                <input id="ct-idade-max" type="number" class="form-input" min="0" max="120"
                  placeholder="ex: 18 para Sub-18"
                  value="${cat?.idadeMax ?? ''}" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Descrição / observação</label>
            <input id="ct-desc" type="text" class="form-input"
              placeholder="Critério de classificação, regras específicas…"
              value="${v('descricao')}" />
          </div>
        </div>`,
    });
    setTimeout(() => document.getElementById('ct-nome')?.focus(), 100);
  },

  saveCatTipo(id = null) {
    const g    = sel => document.getElementById(sel);
    const nome = g('ct-nome')?.value.trim();
    if (!nome) { UI.toast('Informe o nome da categoria', 'error'); return; }

    const data = {
      nome,
      tipoParticipacao: g('ct-tipo')?.value          || '',
      sexo:             g('ct-sexo')?.value          || '',
      nivel:            g('ct-nivel')?.value         || '',
      idadeMin:         parseInt(g('ct-idade-min')?.value) || null,
      idadeMax:         parseInt(g('ct-idade-max')?.value) || null,
      descricao:        g('ct-desc')?.value.trim()   || '',
    };

    if (id) {
      Storage.update(this.SK_CAT_TIPO, id, data);
      UI.toast('Categoria atualizada!', 'success');
    } else {
      Storage.create(this.SK_CAT_TIPO, data);
      UI.toast('Categoria criada!', 'success');
    }
    UI.closeModal();
    this._reRenderContent();
  },

  deleteCatTipo(id) {
    const emUso = Storage.getAll(this.SK_CAT).filter(c => c.catTipoId === id).length;
    if (emUso) {
      UI.toast(`Esta categoria está em uso em ${emUso} torneio(s) e não pode ser excluída.`, 'error');
      return;
    }
    UI.confirm('Excluir esta categoria do catálogo?', 'Confirmar', 'Excluir')
      .then(ok => {
        if (!ok) return;
        Storage.delete(this.SK_CAT_TIPO, id);
        UI.toast('Categoria excluída.', 'success');
        this._reRenderContent();
      });
  },

  /* ================================================================== */
  /*  MODAL — Adicionar categorias ao torneio                            */
  /* ================================================================== */

  openModalAdicionarCat(eventoId) {
    const tipos = Storage.getAll(this.SK_CAT_TIPO)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const jaTem = new Set(
      Storage.getAll(this.SK_CAT).filter(c => c.eventoId === eventoId).map(c => c.catTipoId)
    );

    if (!tipos.length) {
      UI.toast('Cadastre categorias na aba 📂 Categorias antes de adicionar ao torneio.', 'warning');
      this.switchTab('categorias');
      return;
    }

    const lista = tipos.map(t => {
      const usado = jaTem.has(t.id);
      const info  = [
        this.TIPO_PART[t.tipoParticipacao] || '',
        this.SEXO[t.sexo]                  || '',
        this.NIVEL[t.nivel]                || '',
        t.descricao                        || '',
      ].filter(Boolean).join(' · ');

      return `
        <label class="torneio-add-cat-item${usado ? ' torneio-add-cat-used' : ''}">
          <input type="checkbox" value="${t.id}" ${usado ? 'disabled checked' : ''} />
          <div style="flex:1;">
            <div style="font-weight:600;font-size:14px;">${UI.escape(t.nome)}</div>
            ${info ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${UI.escape(info)}</div>` : ''}
          </div>
          ${usado ? '<span class="badge badge-gray" style="font-size:11px;flex-shrink:0;">já adicionada</span>' : ''}
        </label>`;
    }).join('');

    UI.openModal({
      title:        'Adicionar Categorias ao Torneio',
      confirmLabel: 'Adicionar selecionadas',
      onConfirm:    () => this._confirmarAdicionarCats(eventoId),
      content: `
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
          Selecione as categorias que farão parte deste torneio.
          As já adicionadas aparecem marcadas e não podem ser desmarcadas aqui.
        </p>
        <div class="torneio-add-cat-list" id="torneio-add-cat-list">
          ${lista}
        </div>`,
    });
  },

  _confirmarAdicionarCats(eventoId) {
    const checks = document.querySelectorAll(
      '#torneio-add-cat-list input[type=checkbox]:not(:disabled):checked'
    );
    if (!checks.length) { UI.toast('Selecione ao menos uma categoria', 'warning'); return; }

    checks.forEach(cb => {
      const tipo = Storage.getById(this.SK_CAT_TIPO, cb.value);
      if (!tipo) return;
      Storage.create(this.SK_CAT, {
        eventoId,
        catTipoId:        tipo.id,
        nome:             tipo.nome,
        tipoParticipacao: tipo.tipoParticipacao || '',
        taxaInscricao:    0,
        maxParticipantes: null,
        formato:          '',
        status:           'rascunho',
      });
    });

    UI.toast(`${checks.length} categoria(s) adicionada(s)!`, 'success');
    UI.closeModal();
    this.abrirDetalhe(eventoId);
  },

  /* ================================================================== */
  /*  MODAL — Configurar categoria no torneio (taxa, formato, max)        */
  /* ================================================================== */

  // Tempo sugerido (min) por formato de sets
  _tempoSugeridoPorSets(numSets) {
    return numSets === 'melhor_de_3' ? 50 : 25;
  },

  openModalConfigCat(catId, eventoId) {
    const cat = Storage.getById(this.SK_CAT, catId);
    if (!cat) return;
    const v = (f, fb = '') => cat ? UI.escape(String(cat[f] ?? fb)) : fb;

    const fmtOpts = Object.entries(this.FORMATO)
      .map(([k, l]) => `<option value="${k}" ${cat.formato === k ? 'selected' : ''}>${l}</option>`)
      .join('');

    const numSetsVal = cat.numSets || '1_set';

    UI.openModal({
      title:        `⚙️ ${UI.escape(cat.nome)}`,
      confirmLabel: 'Salvar',
      onConfirm:    () => this.saveConfigCat(catId, eventoId),
      content: `
        <div class="form-grid">

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Formato de sets</label>
              <select id="cc-sets" class="form-select"
                onchange="TorneioModule._atualizarTempoSugerido()">
                <option value="1_set"       ${numSetsVal === '1_set'       ? 'selected' : ''}>1 Set</option>
                <option value="melhor_de_3" ${numSetsVal === 'melhor_de_3' ? 'selected' : ''}>Melhor de 3</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tempo por partida (min)
                <span id="cc-tempo-hint" style="font-weight:400;color:var(--text-muted);font-size:11px;"></span>
              </label>
              <input id="cc-tempo" type="number" class="form-input" min="5" max="180"
                placeholder="ex: 25" value="${v('tempoPartidaMin', this._tempoSugeridoPorSets(numSetsVal))}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Formato de disputa</label>
            <select id="cc-formato" class="form-select">
              <option value="">— Definir depois —</option>
              ${fmtOpts}
            </select>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Máx. participantes</label>
              <input id="cc-max" type="number" class="form-input" min="2"
                placeholder="Sem limite" value="${v('maxParticipantes', '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Taxa de inscrição (R$/pessoa)</label>
              <input id="cc-taxa" type="number" class="form-input" min="0" step="0.01"
                placeholder="0.00 = gratuita" value="${v('taxaInscricao', '0')}" />
            </div>
          </div>

        </div>`,
    });

    // Inicializa o hint assim que o modal abre
    setTimeout(() => this._atualizarTempoSugerido(true), 80);
  },

  _atualizarTempoSugerido(apenasHint = false) {
    const sel    = document.getElementById('cc-sets');
    const input  = document.getElementById('cc-tempo');
    const hint   = document.getElementById('cc-tempo-hint');
    if (!sel) return;

    const sugerido = this._tempoSugeridoPorSets(sel.value);
    const label    = sel.value === 'melhor_de_3' ? 'Melhor de 3 · sugestão: 50 min' : '1 Set · sugestão: 25 min';

    if (hint) hint.textContent = `(${label})`;

    // Só preenche automaticamente se o usuário não digitou nada (ou se é init)
    if (!apenasHint && input && (!input.value || input.dataset.auto === 'true')) {
      input.value = sugerido;
      input.dataset.auto = 'true';
    }
    if (input) {
      input.addEventListener('input', () => { input.dataset.auto = 'false'; }, { once: true });
    }
  },

  saveConfigCat(catId, eventoId) {
    const g = id => document.getElementById(id);
    Storage.update(this.SK_CAT, catId, {
      taxaInscricao:    parseFloat(g('cc-taxa')?.value)   || 0,
      maxParticipantes: parseInt(g('cc-max')?.value)      || null,
      numSets:          g('cc-sets')?.value               || '1_set',
      tempoPartidaMin:  parseInt(g('cc-tempo')?.value)    || 25,
      formato:          g('cc-formato')?.value            || '',
    });
    UI.toast('Configuração salva!', 'success');
    UI.closeModal();
    this.abrirDetalhe(eventoId);
  },

  deleteCatEvento(catId, eventoId) {
    UI.confirm(
      'Remover esta categoria do torneio? As inscrições vinculadas também serão removidas.',
      'Confirmar', 'Remover'
    ).then(ok => {
      if (!ok) return;
      Storage.getAll(this.SK_INSC).filter(i => i.categoriaId === catId)
        .forEach(i => Storage.delete(this.SK_INSC, i.id));
      Storage.delete(this.SK_CAT, catId);
      UI.toast('Categoria removida.', 'success');
      this.abrirDetalhe(eventoId);
    });
  },

  /* ================================================================== */
  /*  MODAL — Evento                                                      */
  /* ================================================================== */

  openModalEvento(id = null) {
    const ev   = id ? Storage.getById(this.SK, id) : null;
    const v    = (f, fb = '') => ev ? UI.escape(String(ev[f] ?? fb)) : fb;
    const isEd = !!ev;

    const esporteOpts = Object.entries(this.ESPORTES)
      .map(([k, e]) => `<option value="${k}" ${ev?.esporte === k ? 'selected' : ''}>${e.icon} ${e.label}</option>`)
      .join('');

    UI.openModal({
      title:        isEd ? 'Editar Torneio' : 'Novo Torneio',
      confirmLabel: isEd ? 'Salvar alterações' : 'Criar Torneio',
      onConfirm:    () => this.saveEvento(id),
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Nome do torneio <span class="required-star">*</span></label>
            <input id="t-nome" type="text" class="form-input"
              placeholder="ex: Torneio de Verão Pickleball 2026"
              value="${v('nome')}" autocomplete="off" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Esporte <span class="required-star">*</span></label>
              <select id="t-esporte" class="form-select">
                <option value="">— Selecionar —</option>
                ${esporteOpts}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="t-status" class="form-select">
                ${Object.entries(this.STATUS)
                  .map(([k, s]) => `<option value="${k}" ${(ev?.status || 'rascunho') === k ? 'selected' : ''}>${s.label}</option>`)
                  .join('')}
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Data de início <span class="required-star">*</span></label>
              <input id="t-data-ini" type="date" class="form-input" value="${v('dataInicio')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Data de encerramento</label>
              <input id="t-data-fim" type="date" class="form-input" value="${v('dataFim')}" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Quadras disponíveis para o torneio</label>
              <input id="t-quadras" type="number" class="form-input" min="1" max="50"
                placeholder="ex: 4"
                value="${v('quadrasDisponiveis', '')}" />
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                Usado para calcular duração estimada por categoria
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Horário início → fim</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <input id="t-hora-ini" type="time" class="form-input"
                  value="${v('horarioInicio', '')}" style="flex:1;" />
                <span style="color:var(--text-muted);">→</span>
                <input id="t-hora-fim" type="time" class="form-input"
                  value="${v('horarioFim', '')}" style="flex:1;" />
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observações internas</label>
            <textarea id="t-obs" class="form-input" rows="3"
              placeholder="Notas para o admin…">${v('observacoes')}</textarea>
          </div>
        </div>`,
    });
    setTimeout(() => document.getElementById('t-nome')?.focus(), 100);
  },

  saveEvento(id = null) {
    const g          = sel => document.getElementById(sel);
    const nome       = g('t-nome')?.value.trim();
    const esporte    = g('t-esporte')?.value;
    const dataInicio = g('t-data-ini')?.value;

    if (!nome)       { UI.toast('Informe o nome do torneio', 'error'); return; }
    if (!esporte)    { UI.toast('Selecione o esporte',       'error'); return; }
    if (!dataInicio) { UI.toast('Informe a data de início',  'error'); return; }

    const data = {
      nome, esporte, dataInicio,
      dataFim:             g('t-data-fim')?.value    || dataInicio,
      status:              g('t-status')?.value      || 'rascunho',
      quadrasDisponiveis:  parseInt(g('t-quadras')?.value)  || null,
      horarioInicio:       g('t-hora-ini')?.value          || '',
      horarioFim:          g('t-hora-fim')?.value          || '',
      observacoes:         g('t-obs')?.value.trim()  || '',
    };

    if (id) {
      Storage.update(this.SK, id, data);
      UI.toast('Torneio atualizado!', 'success');
    } else {
      Storage.create(this.SK, data);
      UI.toast('Torneio criado!', 'success');
    }
    UI.closeModal();
    this.render();
  },

  deleteEvento(id) {
    UI.confirm(
      'Excluir este torneio? As categorias e inscrições também serão removidas.',
      'Confirmar Exclusão', 'Excluir'
    ).then(ok => {
      if (!ok) return;
      const cats = Storage.getAll(this.SK_CAT).filter(c => c.eventoId === id);
      cats.forEach(c => {
        Storage.getAll(this.SK_INSC).filter(i => i.categoriaId === c.id)
          .forEach(i => Storage.delete(this.SK_INSC, i.id));
        Storage.delete(this.SK_CAT, c.id);
      });
      Storage.delete(this.SK, id);
      UI.toast('Torneio excluído.', 'success');
      this.render();
    });
  },

  /* ================================================================== */
  /*  ABA: PARTICIPANTES                                                  */
  /* ================================================================== */

  _renderParticipantes() {
    const todos    = Storage.getAll(this.SK_PART);
    const q        = (this._state.searchPart || '').toLowerCase();
    const filtered = q
      ? todos.filter(p =>
          (p.nome  || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q))
      : todos;
    filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

    return `
      <div class="filters-bar" style="margin-bottom:20px;">
        <div class="search-wrapper" style="flex:1;">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar participante…"
            value="${UI.escape(this._state.searchPart || '')}"
            oninput="TorneioModule._state.searchPart=this.value;TorneioModule._reRenderContent()" />
        </div>
        <span class="results-count">${filtered.length} participante${filtered.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary"
          onclick="TorneioModule.openModalParticipante()">+ Novo Participante</button>
      </div>

      ${filtered.length ? `
        <div class="table-card" style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Nome</th><th>Sexo</th><th>Nascimento / Idade</th>
              <th>Nível</th><th>Telefone</th><th>E-mail</th><th></th>
            </tr></thead>
            <tbody>
              ${filtered.map(p => this._renderPartRow(p)).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <div class="empty-title">Nenhum participante cadastrado</div>
          <div class="empty-desc">Cadastre participantes externos ou vincule alunos da arena.</div>
          <button class="btn btn-primary mt-16"
            onclick="TorneioModule.openModalParticipante()">+ Cadastrar Participante</button>
        </div>`}
    `;
  },

  _renderPartRow(p) {
    const idade = p.dataNascimento ? this._calcIdade(p.dataNascimento) + ' anos' : '—';
    const sexo  = { masculino: '♂ Masc.', feminino: '♀ Fem.' }[p.sexo] || '—';
    return `<tr>
      <td><strong>${UI.escape(p.nome)}</strong></td>
      <td>${sexo}</td>
      <td>${UI.escape(p.dataNascimento
        ? UI.formatDate(p.dataNascimento + 'T00:00:00') + ' · ' + idade
        : '—')}</td>
      <td><span class="badge badge-blue" style="font-size:11px;">${
        UI.escape(this.NIVEL[p.nivel] || p.nivel || '—')}</span></td>
      <td>${UI.escape(p.telefone || '—')}</td>
      <td>${UI.escape(p.email    || '—')}</td>
      <td class="aluno-row-actions">
        <button class="btn btn-ghost btn-sm"
          onclick="TorneioModule.openModalParticipante('${p.id}')" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-sm danger"
          onclick="TorneioModule.deleteParticipante('${p.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal — Participante                                                */
  /* ------------------------------------------------------------------ */

  openModalParticipante(id = null) {
    const p    = id ? Storage.getById(this.SK_PART, id) : null;
    const v    = (f, fb = '') => p ? UI.escape(String(p[f] ?? fb)) : fb;
    const isEd = !!p;

    const alunos = Storage.getAll('alunos').filter(a => a.status === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const alunoOpts = alunos
      .map(a => `<option value="${a.id}" ${p?.alunoId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`)
      .join('');
    const nivelOpts = Object.entries(this.NIVEL)
      .map(([k, l]) => `<option value="${k}" ${p?.nivel === k ? 'selected' : ''}>${l}</option>`)
      .join('');
    const sexoOpts = [['masculino','Masculino'],['feminino','Feminino']]
      .map(([k, l]) => `<option value="${k}" ${p?.sexo === k ? 'selected' : ''}>${l}</option>`)
      .join('');

    UI.openModal({
      title:        isEd ? 'Editar Participante' : 'Novo Participante',
      confirmLabel: isEd ? 'Salvar'              : 'Cadastrar',
      onConfirm:    () => this.saveParticipante(id),
      content: `
        <div class="form-grid">
          ${alunos.length ? `
          <div class="form-group">
            <label class="form-label">Vincular aluno da arena (opcional)</label>
            <select id="tp-aluno" class="form-select"
              onchange="TorneioModule._preencherAluno(this.value)">
              <option value="">— Participante externo —</option>
              ${alunoOpts}
            </select>
          </div>` : ''}
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Nome <span class="required-star">*</span></label>
              <input id="tp-nome" type="text" class="form-input"
                value="${v('nome')}" autocomplete="off" />
            </div>
            <div class="form-group">
              <label class="form-label">Sexo</label>
              <select id="tp-sexo" class="form-select">
                <option value="">—</option>
                ${sexoOpts}
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Data de nascimento</label>
              <input id="tp-nasc" type="date" class="form-input" value="${v('dataNascimento')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Nível</label>
              <select id="tp-nivel" class="form-select">
                <option value="">—</option>
                ${nivelOpts}
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Telefone</label>
              <input id="tp-tel" type="tel" class="form-input" value="${v('telefone')}" />
            </div>
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input id="tp-email" type="email" class="form-input" value="${v('email')}" />
            </div>
          </div>
        </div>`,
    });
    setTimeout(() => document.getElementById('tp-nome')?.focus(), 100);
  },

  _preencherAluno(alunoId) {
    if (!alunoId) return;
    const a = Storage.getById('alunos', alunoId);
    if (!a) return;
    const s = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    s('tp-nome',  a.nome);
    s('tp-sexo',  a.sexo || '');
    s('tp-nasc',  a.dataNascimento || '');
    s('tp-nivel', a.nivel || '');
    s('tp-tel',   a.telefone || '');
    s('tp-email', a.email || '');
  },

  saveParticipante(id = null) {
    const g    = sel => document.getElementById(sel);
    const nome = g('tp-nome')?.value.trim();
    if (!nome) { UI.toast('Informe o nome do participante', 'error'); return; }

    const data = {
      alunoId:        g('tp-aluno')?.value        || null,
      nome,
      sexo:           g('tp-sexo')?.value         || '',
      dataNascimento: g('tp-nasc')?.value         || '',
      nivel:          g('tp-nivel')?.value        || '',
      telefone:       g('tp-tel')?.value.trim()   || '',
      email:          g('tp-email')?.value.trim() || '',
    };

    if (id) {
      Storage.update(this.SK_PART, id, data);
      UI.toast('Participante atualizado!', 'success');
    } else {
      Storage.create(this.SK_PART, data);
      UI.toast('Participante cadastrado!', 'success');
    }
    UI.closeModal();
    this._reRenderContent();
  },

  deleteParticipante(id) {
    UI.confirm('Excluir este participante?', 'Confirmar', 'Excluir')
      .then(ok => {
        if (!ok) return;
        Storage.delete(this.SK_PART, id);
        UI.toast('Participante excluído.', 'success');
        this._reRenderContent();
      });
  },

  /* ================================================================== */
  /*  Inscrições por Categoria                                           */
  /* ================================================================== */

  abrirCategoria(catId, eventoId) {
    const cat    = Storage.getById(this.SK_CAT, catId);
    const evento = Storage.getById(this.SK, eventoId);
    if (!cat || !evento) return;

    if (!this._state._catTab) this._state._catTab = {};
    const tab         = this._state._catTab[catId] || 'inscricoes';
    const inscs       = Storage.getAll(this.SK_INSC).filter(i => i.categoriaId === catId);
    const inscAtivas  = inscs.filter(i => i.status !== 'cancelado').length;
    const link        = this._gerarLinkInscricao(evento.id, catId);
    const vagasTotal  = cat.maxParticipantes || null;
    const vagasRest   = vagasTotal ? vagasTotal - inscAtivas : null;
    const partidas    = Storage.getAll(this.SK_PARTIDA).filter(p => p.categoriaId === catId);

    const area = document.getElementById('content-area');
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <button class="btn btn-ghost btn-sm"
            onclick="TorneioModule.abrirDetalhe('${eventoId}')" style="margin-bottom:4px;">
            ← ${UI.escape(evento.nome)}
          </button>
          <h2>📂 ${UI.escape(cat.nome)}</h2>
          <p>${inscAtivas} inscrito${inscAtivas !== 1 ? 's' : ''}
            ${vagasRest !== null
              ? ` · <span style="color:${vagasRest <= 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
                  ${vagasRest <= 0 ? '🚫 Esgotada' : vagasRest + ' vaga' + (vagasRest > 1 ? 's' : '') + ' restante' + (vagasRest > 1 ? 's' : '')}
                </span>`
              : ''}
            ${partidas.length ? ` · <span style="color:var(--color-primary);">🎲 ${partidas.length} partidas geradas</span>` : ''}
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm"
            onclick="TorneioModule._copiarLink('${link}')">🔗 Link de Inscrição</button>
          <button class="btn btn-primary btn-sm"
            onclick="TorneioModule.openModalAdicionarInscricao('${catId}','${eventoId}')">
            ➕ Secretaria</button>
        </div>
      </div>

      <!-- Abas -->
      <div class="tabs-bar" style="margin-bottom:20px;">
        <button class="tab-btn ${tab === 'inscricoes' ? 'active' : ''}"
          onclick="TorneioModule._switchCatTab('${catId}','${eventoId}','inscricoes')">
          👤 Inscrições
          <span class="badge badge-gray" style="margin-left:4px;font-size:11px;">${inscAtivas}</span>
        </button>
        <button class="tab-btn ${tab === 'chaves' ? 'active' : ''}"
          onclick="TorneioModule._switchCatTab('${catId}','${eventoId}','chaves')">
          🎲 Chaves e Jogos
          ${partidas.length ? `<span class="badge badge-blue" style="margin-left:4px;font-size:11px;">${partidas.length}</span>` : ''}
        </button>
      </div>

      <div id="cat-tab-content">
        ${tab === 'inscricoes'
          ? this._renderInscricoesList(catId, eventoId, inscs)
          : this._renderSecaoChaves(catId, eventoId, cat, evento, inscs)}
      </div>
    `;
  },

  _switchCatTab(catId, eventoId, tab) {
    if (!this._state._catTab) this._state._catTab = {};
    this._state._catTab[catId] = tab;
    this.abrirCategoria(catId, eventoId);
  },

  _gerarLinkInscricao(eventoId, catId = null) {
    const url  = new URL(window.location.href);
    const base = url.origin + url.pathname.replace(/[^/]*$/, '');
    const tk   = typeof getActiveTenantKey === 'function' ? getActiveTenantKey() : '';
    let link   = `${base}inscricao.html?t=${eventoId}`;
    if (tk)    link += `&tk=${tk}`;
    if (catId) link += `&c=${catId}`;
    return link;
  },

  _copiarLink(link) {
    navigator.clipboard.writeText(link)
      .then(() => UI.toast('Link copiado!', 'success'))
      .catch(() => {
        // Fallback: seleciona o input
        const el = document.getElementById('link-insc-input');
        if (el) { el.select(); document.execCommand('copy'); }
        UI.toast('Link copiado!', 'success');
      });
  },

  _renderInscricoesList(catId, eventoId, inscs) {
    if (!inscs.length) {
      return `
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-icon">👤</div>
          <div class="empty-title">Nenhuma inscrição ainda</div>
          <div class="empty-desc">Compartilhe o link acima ou inscreva participantes pela secretaria.</div>
        </div>`;
    }

    const pago    = inscs.filter(i => i.statusPagamento === 'pago').length;
    const pend    = inscs.filter(i => i.statusPagamento === 'pendente').length;
    const canc    = inscs.filter(i => i.status === 'cancelado').length;

    const rows = inscs.map(i => {
      const part = Storage.getById(this.SK_PART, i.participanteId);
      const nome = part?.nome || i.nomeParticipante || '—';

      const stPag = {
        pago:      { label: 'Pago',     badge: 'badge-success' },
        pendente:  { label: 'Pendente', badge: 'badge-warning' },
        cancelado: { label: 'Cancelado',badge: 'badge-error'   },
      }[i.statusPagamento] || { label: i.statusPagamento, badge: 'badge-gray' };

      const origem = i.origem === 'secretaria'
        ? '<span style="font-size:11px;color:var(--text-muted);">🏢 Secretaria</span>'
        : '<span style="font-size:11px;color:var(--text-muted);">🌐 Online</span>';

      return `<tr>
        <td>
          <strong>${UI.escape(nome)}</strong><br>
          <span style="font-size:11px;color:var(--text-muted);">${UI.escape(part?.email || i.email || '')}</span>
        </td>
        <td style="font-size:12px;">${UI.escape(part?.telefone || i.telefone || '—')}</td>
        <td>${origem}</td>
        <td><span class="badge ${stPag.badge}">${stPag.label}</span></td>
        <td class="aluno-row-actions">
          ${i.statusPagamento !== 'pago' && i.status !== 'cancelado' ? `
          <button class="btn btn-ghost btn-sm" title="Confirmar pagamento"
            onclick="TorneioModule._confirmarPagamento('${i.id}','${catId}','${eventoId}')">✅ Pago</button>` : ''}
          ${i.status !== 'cancelado' ? `
          <button class="btn btn-ghost btn-sm danger" title="Cancelar inscrição"
            onclick="TorneioModule._cancelarInscricao('${i.id}','${catId}','${eventoId}')">✕</button>` : ''}
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="filters-bar" style="margin-bottom:12px;padding:10px 16px;
        background:var(--bg-secondary);border-radius:10px;border:1px solid var(--card-border);">
        <span>👤 <strong>${inscs.length}</strong> inscrito${inscs.length > 1 ? 's' : ''}</span>
        ${pago  ? `<span style="color:var(--color-success);">✅ ${pago} pago${pago > 1 ? 's' : ''}</span>` : ''}
        ${pend  ? `<span style="color:var(--color-warning);">⏳ ${pend} pendente${pend > 1 ? 's' : ''}</span>` : ''}
        ${canc  ? `<span style="color:var(--text-muted);">✕ ${canc} cancelado${canc > 1 ? 's' : ''}</span>` : ''}
      </div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr>
            <th>Participante</th><th>Telefone</th><th>Origem</th><th>Pagamento</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _confirmarPagamento(inscId, catId, eventoId) {
    Storage.update(this.SK_INSC, inscId, { statusPagamento: 'pago' });
    UI.toast('Pagamento confirmado!', 'success');
    this.abrirCategoria(catId, eventoId);
  },

  _cancelarInscricao(inscId, catId, eventoId) {
    UI.confirm('Cancelar esta inscrição?', 'Confirmar', 'Cancelar Inscrição')
      .then(ok => {
        if (!ok) return;
        Storage.update(this.SK_INSC, inscId, { status: 'cancelado', statusPagamento: 'cancelado' });
        UI.toast('Inscrição cancelada.', 'success');
        this.abrirCategoria(catId, eventoId);
      });
  },

  /* ------------------------------------------------------------------ */
  /*  Modal — Inscrever pela Secretaria                                   */
  /* ------------------------------------------------------------------ */

  openModalAdicionarInscricao(catId, eventoId) {
    const cat = Storage.getById(this.SK_CAT, catId);
    if (!cat) return;

    const alunos = Storage.getAll('alunos').filter(a => a.status === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const alunoOpts = alunos
      .map(a => `<option value="${a.id}">${UI.escape(a.nome)}</option>`)
      .join('');
    const nivelOpts = Object.entries(this.NIVEL)
      .map(([k, l]) => `<option value="${k}">${l}</option>`)
      .join('');

    UI.openModal({
      title:        `➕ Inscrever em ${UI.escape(cat.nome)}`,
      confirmLabel: 'Inscrever',
      onConfirm:    () => this._salvarInscricaoSecretaria(catId, eventoId),
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Tipo de participante</label>
            <div style="display:flex;gap:20px;padding:4px 0;">
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:14px;">
                <input type="radio" name="insc-tipo" value="aluno" checked
                  onchange="TorneioModule._toggleTipoInsc('aluno')" /> Aluno da arena
              </label>
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:14px;">
                <input type="radio" name="insc-tipo" value="externo"
                  onchange="TorneioModule._toggleTipoInsc('externo')" /> Participante externo
              </label>
            </div>
          </div>

          <div id="insc-aluno-sec">
            <div class="form-group">
              <label class="form-label">Selecionar aluno <span class="required-star">*</span></label>
              <select id="insc-aluno-id" class="form-select">
                <option value="">— Selecionar —</option>
                ${alunoOpts}
              </select>
            </div>
          </div>

          <div id="insc-ext-sec" style="display:none;">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Nome <span class="required-star">*</span></label>
                <input id="insc-nome" type="text" class="form-input" autocomplete="off" />
              </div>
              <div class="form-group">
                <label class="form-label">E-mail</label>
                <input id="insc-email" type="email" class="form-input" />
              </div>
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input id="insc-tel" type="tel" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Nível</label>
                <select id="insc-nivel" class="form-select">
                  <option value="">—</option>
                  ${nivelOpts}
                </select>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Pagamento</label>
            <select id="insc-pag" class="form-select">
              <option value="pendente">Pendente</option>
              <option value="pago">Pago (já recebido)</option>
            </select>
          </div>
        </div>`,
    });
  },

  _toggleTipoInsc(tipo) {
    const a = document.getElementById('insc-aluno-sec');
    const e = document.getElementById('insc-ext-sec');
    if (a) a.style.display = tipo === 'aluno'   ? '' : 'none';
    if (e) e.style.display = tipo === 'externo' ? '' : 'none';
  },

  _salvarInscricaoSecretaria(catId, eventoId) {
    const g    = id => document.getElementById(id);
    const tipo = document.querySelector('input[name="insc-tipo"]:checked')?.value || 'aluno';
    const pag  = g('insc-pag')?.value || 'pendente';

    let participanteId, nomeParticipante;

    if (tipo === 'aluno') {
      const alunoId = g('insc-aluno-id')?.value;
      if (!alunoId) { UI.toast('Selecione um aluno', 'error'); return; }
      const aluno = Storage.getById('alunos', alunoId);
      if (!aluno)  { UI.toast('Aluno não encontrado', 'error'); return; }

      // Reutiliza participante existente vinculado ao aluno, ou cria
      let part = Storage.getAll(this.SK_PART).find(p => p.alunoId === alunoId);
      if (!part) {
        part = Storage.create(this.SK_PART, {
          alunoId,
          nome:           aluno.nome,
          sexo:           aluno.sexo           || '',
          dataNascimento: aluno.dataNascimento  || '',
          nivel:          aluno.nivel           || '',
          telefone:       aluno.telefone        || '',
          email:          aluno.email           || '',
        });
      }
      participanteId   = part.id;
      nomeParticipante = aluno.nome;

    } else {
      const nome = g('insc-nome')?.value.trim();
      if (!nome) { UI.toast('Informe o nome do participante', 'error'); return; }
      const part = Storage.create(this.SK_PART, {
        alunoId:        null,
        nome,
        email:          g('insc-email')?.value.trim() || '',
        telefone:       g('insc-tel')?.value.trim()   || '',
        nivel:          g('insc-nivel')?.value        || '',
        sexo:           '',
        dataNascimento: '',
      });
      participanteId   = part.id;
      nomeParticipante = nome;
    }

    // Evita duplicidade na mesma categoria
    const jaInscrito = Storage.getAll(this.SK_INSC).find(
      i => i.categoriaId === catId && i.participanteId === participanteId && i.status !== 'cancelado'
    );
    if (jaInscrito) {
      UI.toast('Este participante já está inscrito nesta categoria.', 'error');
      return;
    }

    Storage.create(this.SK_INSC, {
      categoriaId:      catId,
      eventoId,
      participanteId,
      nomeParticipante,
      statusPagamento:  pag,
      status:           'confirmado',
      origem:           'secretaria',
    });

    UI.toast('Inscrição realizada!', 'success');
    UI.closeModal();
    this.abrirCategoria(catId, eventoId);
  },

  /* ================================================================== */
  /*  Simulador de viabilidade                                            */
  /* ================================================================== */

  /**
   * Calcula estimativa de partidas e duração de uma categoria.
   * quadras: número de quadras disponíveis para esta categoria.
   */
  _calcEstimativa(cat, quadras) {
    const maxP  = cat.maxParticipantes;
    const tempo = cat.tempoPartidaMin || 30;
    const q     = Math.max(1, quadras || 1);
    const fmt   = cat.formato;

    if (!maxP || maxP < 2 || !fmt) return null;

    let partidas = 0;

    switch (fmt) {
      case 'eliminatoria_simples':
        partidas = maxP - 1;
        break;
      case 'eliminatoria_dupla':
        partidas = (maxP - 1) * 2;
        break;
      case 'round_robin':
        partidas = (maxP * (maxP - 1)) / 2;
        break;
      case 'grupos_mata_mata': {
        const nGrupos      = Math.ceil(maxP / 4);
        const pPorGrupo    = Math.ceil(maxP / nGrupos);
        const pGrupo       = nGrupos * (pPorGrupo * (pPorGrupo - 1) / 2);
        const classificados= nGrupos * 2;
        const pMata        = classificados > 1 ? classificados - 1 : 0;
        partidas = pGrupo + pMata;
        break;
      }
      case 'suico': {
        const rodadas = Math.ceil(Math.log2(maxP));
        partidas = Math.floor(maxP / 2) * rodadas;
        break;
      }
      case 'repescagem':
        partidas = maxP;
        break;
      default:
        return null;
    }

    partidas = Math.ceil(partidas);
    // Minutos totais considerando rodadas paralelas nas quadras
    const rodadas  = Math.ceil(partidas / q);
    const minutos  = rodadas * tempo;
    const horas    = Math.floor(minutos / 60);
    const min      = minutos % 60;
    const duracaoStr = horas > 0
      ? `${horas}h${min > 0 ? min + 'min' : ''}`
      : `${min}min`;

    return { partidas, rodadas, minutos, duracaoStr };
  },

  /**
   * Avalia a viabilidade global do evento:
   * soma os minutos-quadra necessários de todas as categorias
   * e compara com os minutos-quadra disponíveis (dias × quadras × janela/dia).
   */
  _calcViabilidade(evento, cats) {
    const quadras = evento.quadrasDisponiveis;
    const hIni    = evento.horarioInicio;
    const hFim    = evento.horarioFim;

    if (!quadras || !hIni || !hFim || !evento.dataInicio) return null;

    const [hh1, mm1] = hIni.split(':').map(Number);
    const [hh2, mm2] = hFim.split(':').map(Number);
    const janela = (hh2 * 60 + mm2) - (hh1 * 60 + mm1);
    if (janela <= 0) return null;

    // Número de dias do evento
    const numDias = this._getDias(evento.dataInicio, evento.dataFim || evento.dataInicio).length;

    // Minutos-quadra disponíveis no evento (todos os dias)
    const disponivelMin = quadras * janela * numDias;

    // Minutos-quadra necessários por categoria (1 quadra = tempo bruto)
    let necessarioMin = 0;
    let totalPartidas = 0;
    const catDetalhe  = [];

    cats.forEach(cat => {
      const est = this._calcEstimativa(cat, 1);
      if (est) {
        const minCat = est.partidas * (cat.tempoPartidaMin || 30);
        necessarioMin += minCat;
        totalPartidas += est.partidas;
        catDetalhe.push({
          id:       cat.id,
          eventoId: cat.eventoId,
          nome:     cat.nome,
          partidas: est.partidas,
          minutos:  minCat,
          tempo:    cat.tempoPartidaMin || 30,
          formato:  cat.formato,
          maxP:     cat.maxParticipantes,
        });
      }
    });

    if (!catDetalhe.length) return null;

    const catsSemDados = cats.filter(c => !this._calcEstimativa(c, 1));
    const ocupacao     = Math.round(necessarioMin / disponivelMin * 100);
    const folgaMin     = disponivelMin - necessarioMin;

    const hJanela  = Math.floor(janela / 60);
    const mJanela  = janela % 60;
    const janelaStr = `${hJanela}h${mJanela > 0 ? mJanela + 'min' : ''}`;

    let status, mensagem, badge, cor;
    if (ocupacao <= 75) {
      status   = '✅ Os jogos cabem no período';
      mensagem = `Folga de ${this._minToHStr(folgaMin)} (${100 - ocupacao}% do tempo livre)`;
      badge = 'badge-success'; cor = 'var(--color-success)';
    } else if (ocupacao <= 100) {
      status   = '⚠️ Os jogos cabem, mas com pouca margem';
      mensagem = `Sobram apenas ${this._minToHStr(folgaMin)} — considere mais quadras ou dias`;
      badge = 'badge-warning'; cor = 'var(--color-warning)';
    } else {
      status   = '❌ Os jogos NÃO cabem no período';
      mensagem = `Faltam ${this._minToHStr(-folgaMin)} — adicione dias, quadras ou reduza categorias`;
      badge = 'badge-danger'; cor = 'var(--color-danger,#ef4444)';
    }

    return {
      quadras, numDias, janela, janelaStr,
      disponivelMin, necessarioMin, folgaMin,
      totalPartidas, ocupacao,
      catDetalhe, catsSemDados,
      status, mensagem, badge, cor,
    };
  },

  /** Converte minutos em string legível: 125 → "2h5min" */
  _minToHStr(min) {
    const m = Math.abs(Math.round(min));
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h > 0 && r > 0) return `${h}h${r}min`;
    if (h > 0)          return `${h}h`;
    return `${r}min`;
  },

  _renderViabilidadeBanner(evento, cats) {
    const v = this._calcViabilidade(evento, cats);

    if (!v) {
      const semQuadras = !evento.quadrasDisponiveis;
      const semHora    = !evento.horarioInicio || !evento.horarioFim;
      if (semQuadras || semHora) {
        return `
          <div class="torneio-viab-banner torneio-viab-info">
            ℹ️ Para ativar o simulador, edite o torneio e informe
            ${semQuadras ? '<strong>quadras disponíveis</strong>' : ''}
            ${semQuadras && semHora ? ' e ' : ''}
            ${semHora ? '<strong>horário início → fim</strong>' : ''}.
            <button class="btn btn-ghost btn-sm" style="margin-left:auto;"
              onclick="TorneioModule.openModalEvento('${evento.id}')">✏️ Editar</button>
          </div>`;
      }
      return `
        <div class="torneio-viab-banner torneio-viab-info">
          ℹ️ Configure <strong>formato</strong> e <strong>máx. participantes</strong>
          nas categorias para ver a simulação.
        </div>`;
    }

    const dispHStr = this._minToHStr(v.disponivelMin);
    const necHStr  = this._minToHStr(v.necessarioMin);
    const barPct   = Math.min(v.ocupacao, 100);

    // Detalhamento por categoria — ordenado do que mais consome para o menos
    const sortedCats = [...v.catDetalhe].sort((a, b) => b.minutos - a.minutos);
    const catRows = sortedCats.map((c, idx) => {
      const pct    = Math.round(c.minutos / v.necessarioMin * 100);
      const hStr   = this._minToHStr(c.minutos);
      // Sugestões de ajuste quando o evento está apertado/inviável
      const dicas  = [];
      if (v.ocupacao > 75) {
        if (c.formato === 'round_robin')     dicas.push('trocar para Eliminatória reduz muito');
        if (c.formato === 'eliminatoria_dupla') dicas.push('Eliminatória Simples usa metade do tempo');
        if (c.maxP > 8)                      dicas.push(`reduzir máx. participantes (${c.maxP} → ${Math.ceil(c.maxP * 0.75)})`);
        if (c.tempo > 30)                    dicas.push(`reduzir tempo/jogo (${c.tempo} → ${c.tempo - 5} min)`);
      }
      const dicaHtml = dicas.length ? `
        <div style="font-size:11px;color:var(--color-warning,#f59e0b);margin-top:3px;">
          💡 ${dicas[0]}
        </div>` : '';

      return `
        <div style="padding:8px 0;border-bottom:1px solid var(--card-border);">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
            <span style="min-width:18px;color:var(--text-muted);font-size:11px;">${idx + 1}.</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
              font-weight:600;">${UI.escape(c.nome)}</span>
            <span style="color:var(--text-muted);white-space:nowrap;">${c.partidas} jogos</span>
            <span style="color:var(--text-muted);white-space:nowrap;">${c.tempo} min/jogo</span>
            <strong style="white-space:nowrap;color:${v.cor};">~${hStr}</strong>
            <div style="width:44px;background:var(--card-border);border-radius:4px;height:5px;
              overflow:hidden;flex-shrink:0;">
              <div style="height:100%;width:${pct}%;background:${v.cor};border-radius:4px;"></div>
            </div>
            <button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:11px;flex-shrink:0;"
              onclick="TorneioModule.openModalConfigCat('${c.id}','${c.eventoId}')"
              title="Ajustar configuração desta categoria">⚙️</button>
          </div>
          ${dicaHtml}
        </div>`;
    }).join('');

    const semDadosAviso = v.catsSemDados.length ? `
      <div style="font-size:11px;color:var(--text-muted);margin-top:10px;">
        ⚠️ ${v.catsSemDados.length} categoria${v.catsSemDados.length > 1 ? 's' : ''}
        sem configuração completa não foram incluídas no cálculo.
      </div>` : '';

    return `
      <div class="card" style="margin-bottom:20px;border-left:4px solid ${v.cor};padding:20px 20px 16px;">

        <!-- Status principal -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;
          flex-wrap:wrap;gap:10px;margin-bottom:16px;">
          <div>
            <span class="badge ${v.badge}" style="font-size:13px;padding:6px 14px;">${v.status}</span>
            <div style="font-size:12px;color:var(--text-muted);margin-top:7px;">${v.mensagem}</div>
          </div>
          <button class="btn btn-ghost btn-sm"
            onclick="TorneioModule.openModalEvento('${evento.id}')">✏️ Ajustar</button>
        </div>

        <!-- Capacidade disponível -->
        <div style="background:var(--bg-secondary);border-radius:8px;padding:12px 14px;
          margin-bottom:14px;font-size:13px;">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
            <span>📅 ${v.numDias} dia${v.numDias > 1 ? 's' : ''}</span>
            <span style="color:var(--text-muted);">×</span>
            <span>🏟️ ${v.quadras} quadra${v.quadras > 1 ? 's' : ''}</span>
            <span style="color:var(--text-muted);">×</span>
            <span>⏰ ${v.janelaStr}/dia</span>
            <span style="color:var(--text-muted);">=</span>
            <strong>${dispHStr} disponíveis</strong>
          </div>
          <!-- Barra de ocupação -->
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:1;background:var(--card-border);border-radius:6px;height:10px;overflow:hidden;">
              <div style="height:100%;width:${barPct}%;background:${v.cor};
                border-radius:6px;transition:width .4s;"></div>
            </div>
            <span style="font-size:13px;font-weight:700;color:${v.cor};white-space:nowrap;">
              ${necHStr} / ${dispHStr}
            </span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:5px;">
            🎯 ${v.totalPartidas} partidas · ${v.ocupacao}% da capacidade utilizada
          </div>
        </div>

        <!-- Detalhamento por categoria (expansível) -->
        <details>
          <summary style="font-size:12px;font-weight:700;color:var(--text-muted);
            text-transform:uppercase;letter-spacing:.5px;cursor:pointer;
            list-style:none;display:flex;align-items:center;gap:6px;outline:none;">
            <span style="font-size:10px;">▶</span>
            Detalhamento por categoria
            <span style="font-weight:400;text-transform:none;letter-spacing:0;">
              (${sortedCats.length} categorias)
            </span>
          </summary>
          <div style="margin-top:10px;">
            ${catRows}
            ${semDadosAviso}
          </div>
        </details>

      </div>`;
  },

  /* ================================================================== */
  /*  Pré-Calendário                                                      */
  /* ================================================================== */

  abrirPreCalendario(eventoId) {
    const evento = Storage.getById(this.SK, eventoId);
    if (!evento) return;
    const cats = Storage.getAll(this.SK_CAT).filter(c => c.eventoId === eventoId);
    const esp  = this.ESPORTES[evento.esporte] || { icon: '🏅' };

    const area = document.getElementById('content-area');
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <button class="btn btn-ghost btn-sm"
            onclick="TorneioModule.abrirDetalhe('${eventoId}')"
            style="margin-bottom:4px;">← ${esp.icon} ${UI.escape(evento.nome)}</button>
          <h2>📅 Pré-Calendário</h2>
          <p>Distribuição estimada de partidas por quadra e dia</p>
        </div>
        <div style="font-size:12px;color:var(--text-muted);text-align:right;max-width:260px;line-height:1.6;">
          ℹ️ Estimativa baseada nos parâmetros configurados.<br>
          O calendário definitivo é gerado após o fechamento das inscrições.
        </div>
      </div>
      ${this._renderPreCalendario(evento, cats)}
    `;
  },

  _renderPreCalendario(evento, cats) {
    const quadras = evento.quadrasDisponiveis;
    const hIni    = evento.horarioInicio;
    const hFim    = evento.horarioFim;

    // Verificações de dados
    if (!quadras || !hIni || !hFim) {
      return `
        <div class="empty-state">
          <div class="empty-icon">⚙️</div>
          <div class="empty-title">Dados insuficientes</div>
          <div class="empty-desc">Para gerar o pré-calendário, edite o torneio e informe
            <strong>quadras disponíveis</strong> e <strong>horário início → fim</strong>.</div>
          <button class="btn btn-primary mt-16"
            onclick="TorneioModule.openModalEvento('${evento.id}')">✏️ Editar Torneio</button>
        </div>`;
    }

    const catsValidas   = cats.filter(c => c.maxParticipantes && c.formato);
    const catsPendentes = cats.filter(c => !c.maxParticipantes || !c.formato);

    // Bloco de aviso para categorias sem configuração completa
    const avisoPendentes = catsPendentes.length ? `
      <div class="torneio-viab-banner" style="border-color:#f59e0b33;background:#fef3c780;margin-bottom:20px;flex-direction:column;align-items:flex-start;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#92400e;">
          ⚠️ ${catsPendentes.length} categoria${catsPendentes.length > 1 ? 's' : ''} sem configuração completa
          — não aparecem no calendário
        </div>
        <ul style="margin:0;padding-left:20px;font-size:13px;color:var(--text-secondary);line-height:1.8;">
          ${catsPendentes.map(c => {
            const falta = [];
            if (!c.formato)          falta.push('formato');
            if (!c.maxParticipantes) falta.push('máx. participantes');
            return `<li><strong>${UI.escape(c.nome)}</strong> — falta: ${falta.join(' e ')}</li>`;
          }).join('')}
        </ul>
        <div style="font-size:12px;color:var(--text-muted);">
          Configure via <strong>⚙️ Gerenciar → botão ⚙️</strong> em cada categoria.
        </div>
      </div>` : '';

    if (!catsValidas.length) {
      return `
        ${avisoPendentes}
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div class="empty-title">Nenhuma categoria pronta para o calendário</div>
          <div class="empty-desc">Configure <strong>formato</strong> e <strong>máx. participantes</strong>
            nas categorias listadas acima para gerar o pré-calendário.</div>
        </div>`;
    }

    // Dados por categoria
    const catData = catsValidas.map(cat => {
      const est = this._calcEstimativa(cat, 1);
      if (!est || est.partidas === 0) return null;
      return {
        nome:     cat.nome,
        partidas: est.partidas,
        tempo:    cat.tempoPartidaMin || 30,
        totalMin: est.partidas * (cat.tempoPartidaMin || 30),
      };
    }).filter(Boolean).sort((a, b) => b.totalMin - a.totalMin); // maiores primeiro

    if (!catData.length) return `<div class="empty-state"><div class="empty-title">Sem dados suficientes nas categorias.</div></div>`;

    // Distribuição entre quadras — greedy: menor carga total primeiro
    const courts = Array.from({ length: quadras }, (_, i) => ({
      num: i + 1, totalMin: 0, cats: [],
    }));

    catData.forEach(cat => {
      const court = courts.reduce((min, c) => c.totalMin < min.totalMin ? c : min, courts[0]);
      court.cats.push({ ...cat, restante: cat.partidas });
      court.totalMin += cat.totalMin;
    });

    // Gera blocos por quadra por dia
    const dias    = this._getDias(evento.dataInicio, evento.dataFim || evento.dataInicio);
    const [hh1, mm1] = hIni.split(':').map(Number);
    const [hh2, mm2] = hFim.split(':').map(Number);
    const iniMin  = hh1 * 60 + mm1;
    const fimMin  = hh2 * 60 + mm2;

    courts.forEach(court => {
      court.blocks = [];
      let dayIdx = 0;
      let curMin = iniMin;

      court.cats.forEach(cat => {
        let restante = cat.partidas;
        while (restante > 0 && dayIdx < dias.length) {
          const cabe = Math.floor((fimMin - curMin) / cat.tempo);
          if (cabe > 0) {
            const jogos = Math.min(restante, cabe);
            court.blocks.push({
              dia: dias[dayIdx], catNome: cat.nome,
              startMin: curMin, endMin: curMin + jogos * cat.tempo,
              partidas: jogos,
            });
            curMin  += jogos * cat.tempo;
            restante -= jogos;
          }
          if (curMin >= fimMin || cabe === 0) { dayIdx++; curMin = iniMin; }
        }
      });
    });

    // Totais
    const totalPartidas = catData.reduce((s, c) => s + c.partidas, 0);
    const diasUsados    = [...new Set(courts.flatMap(c => c.blocks.map(b => b.dia)))].sort();

    // Paleta de cores por categoria
    const cores = ['#3b9e8f','#f59e0b','#8b5cf6','#ef4444','#10b981','#f97316','#06b6d4','#ec4899'];
    const catCores = {};
    catData.forEach((c, i) => { catCores[c.nome] = cores[i % cores.length]; });

    // Renderização por dia
    const diasHtml = diasUsados.map(dia => {
      const dtLabel = new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR',
        { weekday: 'long', day: '2-digit', month: 'long' });

      const courtCols = courts.map(court => {
        const blocks = court.blocks.filter(b => b.dia === dia);
        if (!blocks.length) {
          return `<td class="precal-cell precal-livre">Livre</td>`;
        }
        const blocksHtml = blocks.map(b => `
          <div class="precal-block" style="background:${catCores[b.catNome]};">
            <div class="precal-block-nome">${UI.escape(b.catNome)}</div>
            <div class="precal-block-hora">${this._minToTime(b.startMin)} → ${this._minToTime(b.endMin)}</div>
            <div class="precal-block-info">🎯 ${b.partidas} jogo${b.partidas > 1 ? 's' : ''}</div>
          </div>`).join('');
        return `<td class="precal-cell">${blocksHtml}</td>`;
      }).join('');

      return `
        <div class="precal-dia">
          <div class="precal-dia-titulo">📅 ${dtLabel}</div>
          <div style="overflow-x:auto;">
            <table class="precal-table">
              <thead><tr>
                ${courts.map(c => `<th class="precal-th">🏟️ Quadra ${c.num}</th>`).join('')}
              </tr></thead>
              <tbody><tr>${courtCols}</tr></tbody>
            </table>
          </div>
        </div>`;
    }).join('');

    // Legenda de categorias
    const legendaHtml = catData.map(c => `
      <div class="precal-legenda-item">
        <span class="precal-legenda-cor" style="background:${catCores[c.nome]};"></span>
        <span>${UI.escape(c.nome)}</span>
        <span style="color:var(--text-muted);">${c.partidas} jogos · ${c.tempo} min/jogo</span>
      </div>`).join('');

    return `
      ${avisoPendentes}

      <div class="card precal-resumo">
        <div class="precal-resumo-items">
          <span>📅 ${diasUsados.length} dia${diasUsados.length > 1 ? 's' : ''}</span>
          <span>🏟️ ${quadras} quadra${quadras > 1 ? 's' : ''}</span>
          <span>⏰ ${hIni} → ${hFim}</span>
          <span>📂 ${catData.length} categoria${catData.length > 1 ? 's' : ''} no calendário${catsPendentes.length ? ` · ⚠️ ${catsPendentes.length} pendente${catsPendentes.length > 1 ? 's' : ''}` : ''}</span>
          <span>🎯 ${totalPartidas} partidas no total</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;
          color:var(--text-muted);margin-bottom:10px;">Legenda</div>
        <div class="precal-legenda">${legendaHtml}</div>
      </div>

      ${diasHtml}

      <div class="precal-aviso">
        ℹ️ Este pré-calendário é uma <strong>estimativa</strong>. Os horários e quadras reais
        de cada partida serão definidos após o encerramento das inscrições e sorteio das chaves.
      </div>
    `;
  },

  _getDias(dataIni, dataFim) {
    const dias = [];
    const ini  = new Date(dataIni + 'T12:00:00');
    const fim  = new Date((dataFim || dataIni) + 'T12:00:00');
    const cur  = new Date(ini);
    while (cur <= fim) {
      dias.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dias;
  },

  _minToTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  /* ================================================================== */
  /*  Chaves e Jogos — geração e exibição de bracket / round-robin       */
  /* ================================================================== */

  _renderSecaoChaves(catId, eventoId, cat, evento, inscs) {
    const partidas   = Storage.getAll(this.SK_PARTIDA).filter(p => p.categoriaId === catId);
    const inscAtivas = inscs.filter(i => i.status !== 'cancelado');

    if (!cat.formato) {
      return `
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-icon">⚙️</div>
          <div class="empty-title">Formato não configurado</div>
          <div class="empty-desc">Configure o formato de disputa desta categoria para gerar as chaves.</div>
          <button class="btn btn-primary mt-16"
            onclick="TorneioModule.openModalConfigCat('${catId}','${eventoId}')">⚙️ Configurar Categoria</button>
        </div>`;
    }

    if (!partidas.length) {
      if (inscAtivas.length < 2) {
        return `
          <div class="empty-state" style="padding:40px 0;">
            <div class="empty-icon">👤</div>
            <div class="empty-title">Inscrições insuficientes</div>
            <div class="empty-desc">São necessários ao menos 2 inscritos para gerar as chaves.</div>
          </div>`;
      }
      const fmt     = this.FORMATO[cat.formato] || cat.formato;
      const numSets = cat.numSets === 'melhor_de_3' ? 'Melhor de 3' : '1 Set';
      return `
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-icon">🎲</div>
          <div class="empty-title">Chaves ainda não geradas</div>
          <div class="empty-desc">
            <strong>${inscAtivas.length}</strong> inscritos · Formato: <strong>${fmt}</strong> · ${numSets}
          </div>
          <button class="btn btn-primary mt-16"
            onclick="TorneioModule.gerarChaves('${catId}','${eventoId}')">🎲 Gerar Chaves</button>
        </div>`;
    }

    const finalizadas = partidas.filter(p => p.status === 'finalizado').length;
    const totalReais  = partidas.filter(p => !p.isBye).length;

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;
        margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <div style="font-size:13px;color:var(--text-muted);">
          🎯 ${finalizadas} / ${totalReais} partidas realizadas
        </div>
        <button class="btn btn-ghost btn-sm danger"
          onclick="TorneioModule._resetarChaves('${catId}','${eventoId}')">🔄 Regenerar Chaves</button>
      </div>
      ${cat.formato === 'round_robin'
        ? this._renderTabelaRoundRobin(catId, eventoId, partidas, inscAtivas)
        : this._renderBracketEliminatoria(catId, eventoId, partidas, inscAtivas)}
    `;
  },

  /* ------------------------------------------------------------------ */

  gerarChaves(catId, eventoId) {
    const cat   = Storage.getById(this.SK_CAT, catId);
    const inscs = Storage.getAll(this.SK_INSC).filter(
      i => i.categoriaId === catId && i.status !== 'cancelado'
    );

    if (!cat || inscs.length < 2) {
      UI.toast('São necessários ao menos 2 inscritos para gerar as chaves.', 'error');
      return;
    }

    // Resolver participantes a partir das inscrições
    const parts = inscs.map(i => {
      const p = Storage.getById(this.SK_PART, i.participanteId);
      return p ? { id: p.id, nome: p.nome } : null;
    }).filter(Boolean);

    if (parts.length < 2) {
      UI.toast('Não foi possível resolver os participantes. Verifique as inscrições.', 'error');
      return;
    }

    // Remove partidas antigas desta categoria
    Storage.getAll(this.SK_PARTIDA)
      .filter(p => p.categoriaId === catId)
      .forEach(p => Storage.delete(this.SK_PARTIDA, p.id));

    if (cat.formato === 'round_robin') {
      this._gerarRoundRobin(parts, catId, eventoId, cat);
    } else {
      this._gerarEliminatoria(parts, catId, eventoId, cat);
    }

    UI.toast('Chaves geradas com sucesso!', 'success');
    this._switchCatTab(catId, eventoId, 'chaves');
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers de nomeação de fases                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Retorna array com nomes de fase do round 1 ao final.
   * numRounds: total de rounds (ex: 3 para 8 jogadores)
   * resultado: ['Oitavas','Quartas','Semifinal','Final'] etc.
   */
  _getFaseNames(numRounds) {
    const labelFromEnd = (distFinal) => {
      switch (distFinal) {
        case 0: return 'Final';
        case 1: return 'Semifinal';
        case 2: return 'Quartas';
        case 3: return 'Oitavas';
        default: return `Rodada ${numRounds - distFinal}`;
      }
    };
    const names = [];
    for (let r = 0; r < numRounds; r++) {
      names.push(labelFromEnd(numRounds - 1 - r));
    }
    return names; // index 0 = primeiro round
  },

  /* ------------------------------------------------------------------ */
  /*  Round Robin — geração                                               */
  /* ------------------------------------------------------------------ */

  _gerarRoundRobin(parts, catId, eventoId, cat) {
    let players = [...parts];
    if (players.length % 2 !== 0) players.push(null); // null = BYE

    const n       = players.length;
    const half    = n / 2;
    const numSets = cat.numSets || '1_set';
    const fixed   = players[0];
    let rotating  = players.slice(1);

    for (let r = 0; r < n - 1; r++) {
      const current = [fixed, ...rotating];
      for (let i = 0; i < half; i++) {
        const p1 = current[i];
        const p2 = current[n - 1 - i];
        if (p1 === null && p2 === null) continue;

        const isBye  = (p1 === null || p2 === null);
        const realP1 = isBye ? (p1 || p2) : p1;
        const realP2 = isBye ? null : p2;

        Storage.create(this.SK_PARTIDA, {
          categoriaId:    catId,
          eventoId,
          fase:           `Rodada ${r + 1}`,
          rodada:         r + 1,
          posicao:        i + 1,
          formato:        'round_robin',
          numSets,
          part1Id:        realP1?.id   || null,
          part1Nome:      realP1?.nome || null,
          part2Id:        realP2?.id   || null,
          part2Nome:      realP2?.nome || null,
          isBye,
          status:         isBye ? 'walkover' : 'aguardando',
          vencedorId:     isBye ? (realP1?.id   || null) : null,
          vencedorNome:   isBye ? (realP1?.nome || null) : null,
          sets:           [],
          fonte1MatchId:  null,
          fonte2MatchId:  null,
          proximoMatchId: null,
          proximoSlot:    null,
        });
      }
      // Rotação: último elemento vai para o início
      rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Eliminatória Simples — geração                                      */
  /* ------------------------------------------------------------------ */

  _gerarEliminatoria(parts, catId, eventoId, cat) {
    const n         = parts.length;
    const numRounds = Math.ceil(Math.log2(Math.max(n, 2)));
    const size      = Math.pow(2, numRounds);
    const faseNomes = this._getFaseNames(numRounds);
    const numSets   = cat.numSets || '1_set';

    // Embaralha e posiciona participantes (os excedentes ficam como BYE)
    const shuffled  = [...parts].sort(() => Math.random() - 0.5);
    const allSlots  = Array(size).fill(null);
    shuffled.forEach((p, i) => { allSlots[i] = p; });

    // Estrutura de rounds para referenciar matches depois de criá-los
    const roundMatches = [];
    for (let r = 0; r < numRounds; r++) {
      const numInRound = size / Math.pow(2, r + 1);
      roundMatches[r] = Array.from({ length: numInRound }, (_, i) => ({
        posicao: i + 1, fase: faseNomes[r], match: null,
      }));
    }

    // Cria os matches no Storage round a round
    for (let r = 0; r < numRounds; r++) {
      for (let i = 0; i < roundMatches[r].length; i++) {
        const info = roundMatches[r][i];
        let p1 = null, p2 = null, isBye = false;

        if (r === 0) {
          p1    = allSlots[i * 2];
          p2    = allSlots[i * 2 + 1];
          isBye = (p1 === null || p2 === null);
        }

        const real1 = isBye ? (p1 || p2) : p1;
        const real2 = isBye ? null        : p2;

        const m = Storage.create(this.SK_PARTIDA, {
          categoriaId:    catId,
          eventoId,
          fase:           info.fase,
          rodada:         r + 1,
          posicao:        i + 1,
          formato:        'eliminatoria_simples',
          numSets,
          part1Id:        real1?.id   || null,
          part1Nome:      real1?.nome || null,
          part2Id:        real2?.id   || null,
          part2Nome:      real2?.nome || null,
          isBye,
          status:         isBye ? 'walkover' : 'aguardando',
          vencedorId:     isBye ? (real1?.id   || null) : null,
          vencedorNome:   isBye ? (real1?.nome || null) : null,
          sets:           [],
          fonte1MatchId:  null,
          fonte2MatchId:  null,
          proximoMatchId: null,
          proximoSlot:    null,
        });
        roundMatches[r][i].match = m;
      }
    }

    // Liga os matches entre rounds e define proximoMatchId/fonte
    for (let r = 1; r < numRounds; r++) {
      for (let i = 0; i < roundMatches[r].length; i++) {
        const next = roundMatches[r][i].match;
        const src1 = roundMatches[r - 1][i * 2].match;
        const src2 = roundMatches[r - 1][i * 2 + 1].match;

        Storage.update(this.SK_PARTIDA, src1.id, { proximoMatchId: next.id, proximoSlot: 1 });
        Storage.update(this.SK_PARTIDA, src2.id, { proximoMatchId: next.id, proximoSlot: 2 });
        Storage.update(this.SK_PARTIDA, next.id, { fonte1MatchId: src1.id, fonte2MatchId: src2.id });
      }
    }

    // Avanço automático de byes
    Storage.getAll(this.SK_PARTIDA)
      .filter(p => p.categoriaId === catId && p.isBye && p.proximoMatchId)
      .forEach(p => this._avancarVencedor(p, { id: p.vencedorId, nome: p.vencedorNome }));
  },

  _avancarVencedor(partida, vencedor) {
    if (!partida.proximoMatchId || !vencedor?.id) return;
    const slot = partida.proximoSlot;
    const upd  = {};
    upd[`part${slot}Id`]   = vencedor.id;
    upd[`part${slot}Nome`] = vencedor.nome;
    Storage.update(this.SK_PARTIDA, partida.proximoMatchId, upd);
  },

  /* ------------------------------------------------------------------ */
  /*  Eliminatória — exibição de bracket                                  */
  /* ------------------------------------------------------------------ */

  _renderBracketEliminatoria(catId, eventoId, partidas) {
    const byRound = {};
    partidas.forEach(p => {
      if (!byRound[p.rodada]) byRound[p.rodada] = [];
      byRound[p.rodada].push(p);
    });
    const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

    const cols = rounds.map(r => {
      const rodadaParts = byRound[r].sort((a, b) => a.posicao - b.posicao);
      const fase        = rodadaParts[0]?.fase || `Rodada ${r}`;

      const cards = rodadaParts.map(p => {
        if (p.isBye) return ''; // Byes não aparecem no bracket visual

        const p1w      = p.status === 'finalizado' && p.vencedorId === p.part1Id;
        const p2w      = p.status === 'finalizado' && p.vencedorId === p.part2Id;
        const hasRes   = p.status === 'finalizado';
        const canEdit  = p.part1Id && p.part2Id && !hasRes;
        const aguardaP = !p.part1Id || !p.part2Id; // aguardando adversário anterior

        const scoreStr = hasRes && p.sets?.length
          ? p.sets.map(s => `${s.p1}–${s.p2}`).join(' / ')
          : '';

        return `
          <div class="bracket-match${aguardaP ? ' bracket-match-pending' : ''}">
            <div class="bracket-player${p1w ? ' winner' : ''}">
              <span class="bracket-player-name">${UI.escape(p.part1Nome || (p.fonte1MatchId ? '…' : '—'))}</span>
            </div>
            <div class="bracket-player${p2w ? ' winner' : ''}">
              <span class="bracket-player-name">${UI.escape(p.part2Nome || (p.fonte2MatchId ? '…' : '—'))}</span>
            </div>
            ${scoreStr ? `<div class="bracket-score">${UI.escape(scoreStr)}</div>` : ''}
            <div class="bracket-match-action">
              ${canEdit ? `<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 10px;"
                onclick="TorneioModule.openModalResultado('${p.id}','${catId}','${eventoId}')">
                ✏️ Resultado</button>` : ''}
              ${hasRes ? `<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px;color:var(--text-muted);"
                onclick="TorneioModule.openModalResultado('${p.id}','${catId}','${eventoId}')">
                ✏️ Editar</button>` : ''}
            </div>
          </div>`;
      }).join('');

      return `
        <div class="bracket-round">
          <div class="bracket-round-label">${UI.escape(fase)}</div>
          ${cards || '<div class="bracket-match bracket-match-pending" style="min-height:60px;"></div>'}
        </div>`;
    }).join('');

    return `<div style="overflow-x:auto;"><div class="bracket-wrap">${cols}</div></div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Round Robin — exibição                                              */
  /* ------------------------------------------------------------------ */

  _renderTabelaRoundRobin(catId, eventoId, partidas, inscAtivas) {
    const standings = this._calcRRStandings(inscAtivas, partidas);
    const byRound   = {};
    partidas.forEach(p => {
      if (!byRound[p.rodada]) byRound[p.rodada] = [];
      byRound[p.rodada].push(p);
    });
    const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

    const medalha = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

    const standingsHtml = standings.length ? `
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;
          color:var(--text-muted);margin-bottom:10px;">🏅 Classificação</div>
        <div class="table-card">
          <table class="data-table rr-table">
            <thead><tr>
              <th>#</th><th>Participante</th>
              <th title="Vitórias">V</th><th title="Derrotas">D</th>
              <th title="Sets vencidos / perdidos">Sets</th>
              <th title="Pontos vencidos / perdidos">Pontos</th>
            </tr></thead>
            <tbody>
              ${standings.map((s, i) => `<tr>
                <td style="font-weight:700;">${medalha(i)}</td>
                <td><strong>${UI.escape(s.nome)}</strong></td>
                <td class="rr-win">${s.wins}</td>
                <td class="rr-loss">${s.losses}</td>
                <td>${s.setsVencidos}/${s.setsPerdidos}</td>
                <td style="font-size:12px;color:var(--text-muted);">${s.pontosVencidos}/${s.pontosPerdidos}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : '';

    const rodadasHtml = rounds.map(r => {
      const rodadaParts = byRound[r].sort((a, b) => a.posicao - b.posicao);
      const fase        = rodadaParts[0]?.fase || `Rodada ${r}`;
      const fin         = rodadaParts.filter(p => !p.isBye && p.status === 'finalizado').length;
      const tot         = rodadaParts.filter(p => !p.isBye).length;

      const rows = rodadaParts.map(p => {
        if (p.isBye) return '';
        const hasRes = p.status === 'finalizado';
        const p1w    = hasRes && p.vencedorId === p.part1Id;
        const p2w    = hasRes && p.vencedorId === p.part2Id;
        const score  = hasRes && p.sets?.length
          ? p.sets.map(s => `${s.p1}–${s.p2}`).join(', ')
          : null;

        return `
          <div class="rr-match-row">
            <span class="rr-player${p1w ? ' rr-winner' : ''}">${UI.escape(p.part1Nome || '—')}</span>
            <div class="rr-score-cell">
              ${score
                ? `<span class="rr-score-txt">${UI.escape(score)}</span>
                   <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:1px 6px;color:var(--text-muted);"
                     onclick="TorneioModule.openModalResultado('${p.id}','${catId}','${eventoId}')">✏️</button>`
                : `<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 10px;"
                     onclick="TorneioModule.openModalResultado('${p.id}','${catId}','${eventoId}')">+ Resultado</button>`}
            </div>
            <span class="rr-player rr-right${p2w ? ' rr-winner' : ''}">${UI.escape(p.part2Nome || '—')}</span>
          </div>`;
      }).filter(Boolean).join('');

      return `
        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="font-size:13px;font-weight:700;">${UI.escape(fase)}</div>
            <span style="font-size:11px;color:var(--text-muted);">${fin}/${tot} jogados</span>
          </div>
          <div class="card" style="padding:8px 12px;">
            ${rows || '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">Sem partidas nesta rodada.</div>'}
          </div>
        </div>`;
    }).join('');

    return standingsHtml + rodadasHtml;
  },

  _calcRRStandings(inscAtivas, partidas) {
    const standings = {};

    inscAtivas.forEach(i => {
      const p = Storage.getById(this.SK_PART, i.participanteId);
      if (p) {
        standings[p.id] = {
          id: p.id, nome: p.nome,
          wins: 0, losses: 0,
          setsVencidos: 0, setsPerdidos: 0,
          pontosVencidos: 0, pontosPerdidos: 0,
        };
      }
    });

    partidas.filter(p => p.status === 'finalizado' && !p.isBye).forEach(p => {
      if (p.vencedorId && standings[p.vencedorId]) standings[p.vencedorId].wins++;
      const perdedorId = (p.vencedorId === p.part1Id) ? p.part2Id : p.part1Id;
      if (perdedorId && standings[perdedorId]) standings[perdedorId].losses++;

      (p.sets || []).forEach(s => {
        if (standings[p.part1Id]) {
          standings[p.part1Id].setsVencidos   += s.p1 > s.p2 ? 1 : 0;
          standings[p.part1Id].setsPerdidos   += s.p2 > s.p1 ? 1 : 0;
          standings[p.part1Id].pontosVencidos  += s.p1;
          standings[p.part1Id].pontosPerdidos  += s.p2;
        }
        if (standings[p.part2Id]) {
          standings[p.part2Id].setsVencidos   += s.p2 > s.p1 ? 1 : 0;
          standings[p.part2Id].setsPerdidos   += s.p1 > s.p2 ? 1 : 0;
          standings[p.part2Id].pontosVencidos  += s.p2;
          standings[p.part2Id].pontosPerdidos  += s.p1;
        }
      });
    });

    return Object.values(standings).sort((a, b) =>
      b.wins - a.wins ||
      (b.setsVencidos - b.setsPerdidos) - (a.setsVencidos - a.setsPerdidos) ||
      (b.pontosVencidos - b.pontosPerdidos) - (a.pontosVencidos - a.pontosPerdidos)
    );
  },

  /* ------------------------------------------------------------------ */
  /*  Modal — Registrar / editar resultado                                */
  /* ------------------------------------------------------------------ */

  openModalResultado(partidaId, catId, eventoId) {
    const partida = Storage.getById(this.SK_PARTIDA, partidaId);
    if (!partida) return;

    const numSets = partida.numSets || '1_set';
    const maxSets = numSets === 'melhor_de_3' ? 3 : 1;

    let setsHtml = '';
    for (let s = 0; s < maxSets; s++) {
      const p1v = partida.sets?.[s]?.p1 ?? '';
      const p2v = partida.sets?.[s]?.p2 ?? '';
      const isTb = numSets === 'melhor_de_3' && s === 2;
      setsHtml += `
        ${isTb ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:-4px;">
          Set 3 — Desempate (opcional, apenas se 1×1)</div>` : ''}
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Set ${s + 1} · ${UI.escape(partida.part1Nome || 'P1')}</label>
            <input id="set-${s}-p1" type="number" class="form-input" min="0" max="99"
              value="${p1v}" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Set ${s + 1} · ${UI.escape(partida.part2Nome || 'P2')}</label>
            <input id="set-${s}-p2" type="number" class="form-input" min="0" max="99"
              value="${p2v}" placeholder="0" />
          </div>
        </div>`;
    }

    UI.openModal({
      title:        '🎾 Registrar Resultado',
      confirmLabel: 'Salvar',
      onConfirm:    () => this.saveResultado(partidaId, catId, eventoId),
      content: `
        <div class="form-grid">
          <div style="background:var(--bg-secondary);border-radius:10px;padding:14px 16px;
            text-align:center;margin-bottom:4px;">
            <div style="font-size:15px;font-weight:700;">
              ${UI.escape(partida.part1Nome || '—')}
              <span style="color:var(--text-muted);font-size:13px;margin:0 8px;">vs</span>
              ${UI.escape(partida.part2Nome || '—')}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
              ${UI.escape(partida.fase)}
            </div>
          </div>
          ${setsHtml}
        </div>`,
    });
    setTimeout(() => document.getElementById('set-0-p1')?.focus(), 100);
  },

  saveResultado(partidaId, catId, eventoId) {
    const partida = Storage.getById(this.SK_PARTIDA, partidaId);
    if (!partida) return;

    const numSets = partida.numSets || '1_set';
    const maxSets = numSets === 'melhor_de_3' ? 3 : 1;

    const sets  = [];
    let p1Wins  = 0;
    let p2Wins  = 0;

    for (let s = 0; s < maxSets; s++) {
      const p1El = document.getElementById(`set-${s}-p1`);
      const p2El = document.getElementById(`set-${s}-p2`);
      if (!p1El || !p2El) continue;
      if (p1El.value === '' && p2El.value === '') continue; // set em branco (tiebreak opcional)
      const p1 = parseInt(p1El.value) || 0;
      const p2 = parseInt(p2El.value) || 0;
      sets.push({ p1, p2 });
      if (p1 > p2) p1Wins++;
      else if (p2 > p1) p2Wins++;
    }

    if (!sets.length) { UI.toast('Informe o placar de ao menos um set', 'error'); return; }

    let vencedorId, vencedorNome;

    if (numSets === 'melhor_de_3') {
      if (p1Wins > p2Wins)      { vencedorId = partida.part1Id; vencedorNome = partida.part1Nome; }
      else if (p2Wins > p1Wins) { vencedorId = partida.part2Id; vencedorNome = partida.part2Nome; }
      else { UI.toast('Sets empatados — revise os placares ou complete o set de desempate', 'error'); return; }
    } else {
      const s = sets[0];
      if (s.p1 > s.p2)      { vencedorId = partida.part1Id; vencedorNome = partida.part1Nome; }
      else if (s.p2 > s.p1) { vencedorId = partida.part2Id; vencedorNome = partida.part2Nome; }
      else { UI.toast('Placar empatado — não é possível salvar sem vencedor', 'error'); return; }
    }

    Storage.update(this.SK_PARTIDA, partidaId, {
      sets, status: 'finalizado', vencedorId, vencedorNome,
    });

    // Avançar vencedor no bracket de eliminatória
    if (partida.formato === 'eliminatoria_simples' && partida.proximoMatchId) {
      this._avancarVencedor(
        { proximoMatchId: partida.proximoMatchId, proximoSlot: partida.proximoSlot },
        { id: vencedorId, nome: vencedorNome }
      );
    }

    UI.toast('Resultado salvo!', 'success');
    UI.closeModal();
    this.abrirCategoria(catId, eventoId);
  },

  _resetarChaves(catId, eventoId) {
    UI.confirm(
      'Apagar todas as chaves e resultados desta categoria? Os dados lançados serão perdidos.',
      'Confirmar', 'Apagar'
    ).then(ok => {
      if (!ok) return;
      Storage.getAll(this.SK_PARTIDA)
        .filter(p => p.categoriaId === catId)
        .forEach(p => Storage.delete(this.SK_PARTIDA, p.id));
      UI.toast('Chaves apagadas. Gere novamente quando quiser.', 'success');
      this.abrirCategoria(catId, eventoId);
    });
  },

  /* ================================================================== */
  /*  Utilitários                                                         */
  /* ================================================================== */

  _calcIdade(dataNasc) {
    const hoje  = new Date();
    const nasc  = new Date(dataNasc + 'T00:00:00');
    let   idade = hoje.getFullYear() - nasc.getFullYear();
    const m     = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  },
};
