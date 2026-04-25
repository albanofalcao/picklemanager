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
    aberto:        'Aberto',
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    elite:         'Elite',
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
  /*  Render principal                                                    */
  /* ------------------------------------------------------------------ */

  render() {
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
          <span>📂 ${cats.length} categoria${cats.length !== 1 ? 's' : ''}</span>
          <span>👤 ${insc.length} inscrito${insc.length !== 1 ? 's' : ''}</span>
        </div>
        ${e.observacoes ? `<div class="torneio-card-obs">${UI.escape(e.observacoes)}</div>` : ''}
        <div class="torneio-card-actions">
          <button class="btn btn-primary btn-sm"
            onclick="TorneioModule.abrirDetalhe('${e.id}')">Gerenciar →</button>
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
            onclick="TorneioModule.openModalEvento('${id}')">✏️ Editar</button>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
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
    const insc  = Storage.getAll(this.SK_INSC).filter(i => i.categoriaId === cat.id);
    const pago  = insc.filter(i => i.statusPagamento === 'pago').length;
    const pend  = insc.filter(i => i.statusPagamento === 'pendente').length;
    const fmt   = this.FORMATO[cat.formato] || null;
    const tipo  = this.TIPO_PART[cat.tipoParticipacao] || null;

    return `
      <div class="card torneio-cat-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;">
          <div class="torneio-cat-nome">${UI.escape(cat.nome)}</div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn btn-ghost btn-sm"
              onclick="TorneioModule.openModalConfigCat('${cat.id}','${evento.id}')"
              title="Configurar taxas e formato">⚙️</button>
            <button class="btn btn-ghost btn-sm danger"
              onclick="TorneioModule.deleteCatEvento('${cat.id}','${evento.id}')"
              title="Remover do torneio">🗑️</button>
          </div>
        </div>
        <div class="torneio-cat-stats">
          ${tipo  ? `<span>👥 ${tipo}</span>`             : ''}
          ${fmt   ? `<span>🎮 ${fmt}</span>`              : ''}
          ${cat.taxaInscricao > 0
            ? `<span>💰 R$ ${(+cat.taxaInscricao).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>`
            : '<span style="color:var(--color-success);">Gratuita</span>'}
          ${cat.maxParticipantes ? `<span>🔢 Máx ${cat.maxParticipantes}</span>` : ''}
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--card-border);
             display:flex;gap:12px;font-size:13px;align-items:center;">
          <span>👤 <strong>${insc.length}</strong> inscritos</span>
          ${pago ? `<span style="color:var(--color-success);">✓ ${pago} pagos</span>` : ''}
          ${pend ? `<span style="color:var(--color-warning);">⏳ ${pend} pendentes</span>` : ''}
          <button class="btn btn-primary btn-sm" style="margin-left:auto;"
            onclick="TorneioModule.abrirCategoria('${cat.id}','${evento.id}')">Gerenciar →</button>
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
    const emUso = Storage.getAll(this.SK_CAT).filter(x => x.catTipoId === c.id).length;
    return `<tr>
      <td><strong>${UI.escape(c.nome)}</strong></td>
      <td>${this.TIPO_PART[c.tipoParticipacao] || '—'}</td>
      <td>${this.SEXO[c.sexo]   || '—'}</td>
      <td>${this.NIVEL[c.nivel] || '—'}</td>
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
              placeholder="ex: Masculino A, Feminino, Duplas Mistas, Sub-18…"
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
              <label class="form-label">Nível</label>
              <select id="ct-nivel" class="form-select">
                <option value="">— Qualquer —</option>
                ${mkOpts(this.NIVEL, 'nivel')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição / observação</label>
            <input id="ct-desc" type="text" class="form-input"
              placeholder="Faixa etária, critério de classificação…"
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
      tipoParticipacao: g('ct-tipo')?.value  || '',
      sexo:             g('ct-sexo')?.value  || '',
      nivel:            g('ct-nivel')?.value || '',
      descricao:        g('ct-desc')?.value.trim() || '',
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

  openModalConfigCat(catId, eventoId) {
    const cat = Storage.getById(this.SK_CAT, catId);
    if (!cat) return;
    const v = (f, fb = '') => cat ? UI.escape(String(cat[f] ?? fb)) : fb;

    const fmtOpts = Object.entries(this.FORMATO)
      .map(([k, l]) => `<option value="${k}" ${cat.formato === k ? 'selected' : ''}>${l}</option>`)
      .join('');

    UI.openModal({
      title:        `⚙️ ${UI.escape(cat.nome)}`,
      confirmLabel: 'Salvar',
      onConfirm:    () => this.saveConfigCat(catId, eventoId),
      content: `
        <div class="form-grid">
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Taxa de inscrição (R$/pessoa)</label>
              <input id="cc-taxa" type="number" class="form-input" min="0" step="0.01"
                placeholder="0.00 = gratuita" value="${v('taxaInscricao', '0')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Máx. participantes</label>
              <input id="cc-max" type="number" class="form-input" min="2"
                placeholder="Sem limite" value="${v('maxParticipantes', '')}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Formato de disputa</label>
            <select id="cc-formato" class="form-select">
              <option value="">— Definir depois —</option>
              ${fmtOpts}
            </select>
          </div>
        </div>`,
    });
  },

  saveConfigCat(catId, eventoId) {
    const g = id => document.getElementById(id);
    Storage.update(this.SK_CAT, catId, {
      taxaInscricao:    parseFloat(g('cc-taxa')?.value)  || 0,
      maxParticipantes: parseInt(g('cc-max')?.value)     || null,
      formato:          g('cc-formato')?.value           || '',
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
      dataFim:     g('t-data-fim')?.value   || dataInicio,
      status:      g('t-status')?.value     || 'rascunho',
      observacoes: g('t-obs')?.value.trim() || '',
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
  /*  Gerenciar Categoria (Fase 3 — placeholder)                         */
  /* ================================================================== */

  abrirCategoria(catId, eventoId) {
    const cat    = Storage.getById(this.SK_CAT, catId);
    const evento = Storage.getById(this.SK, eventoId);
    if (!cat || !evento) return;

    const area = document.getElementById('content-area');
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <button class="btn btn-ghost btn-sm"
            onclick="TorneioModule.abrirDetalhe('${eventoId}')" style="margin-bottom:4px;">
            ← ${UI.escape(evento.nome)}
          </button>
          <h2>📂 ${UI.escape(cat.nome)}</h2>
          <p>Inscrições, chave e resultados</p>
        </div>
      </div>
      <div class="empty-state" style="margin-top:40px;">
        <div class="empty-icon">🚧</div>
        <div class="empty-title">Em desenvolvimento</div>
        <div class="empty-desc">Inscrições, geração de chaves e lançamento de resultados estão na próxima fase.</div>
      </div>`;
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
