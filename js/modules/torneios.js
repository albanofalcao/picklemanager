'use strict';

/**
 * TorneioModule — Módulo de Torneios
 * Fase 1: Fundação (lista de eventos, navegação)
 * Fase 2: Participantes & Estrutura (CRUD eventos, categorias, participantes)
 */
const TorneioModule = {

  /* ------------------------------------------------------------------ */
  /*  Constantes                                                          */
  /* ------------------------------------------------------------------ */

  SK:             'torneios',
  SK_CAT:         'torneio_categorias',
  SK_PART:        'torneio_participantes',
  SK_INSC:        'torneio_inscricoes',
  SK_DUPLA:       'torneio_duplas',
  SK_FASE:        'torneio_fases',
  SK_GRUPO:       'torneio_grupos',
  SK_PARTIDA:     'torneio_partidas',
  SK_SET:         'torneio_sets',
  SK_PAG:         'torneio_pagamentos',

  ESPORTES: {
    pickleball:   { label: 'Pickleball',    icon: '🏓' },
    tenis:        { label: 'Tênis',         icon: '🎾' },
    beach_tennis: { label: 'Beach Tennis',  icon: '🏖️' },
    futvolei:     { label: 'Futevolei',     icon: '⚽' },
  },

  STATUS: {
    rascunho:          { label: 'Rascunho',           badge: 'badge-gray'    },
    inscricoes_abertas:{ label: 'Inscrições Abertas', badge: 'badge-blue'   },
    em_andamento:      { label: 'Em Andamento',       badge: 'badge-warning' },
    encerrado:         { label: 'Encerrado',          badge: 'badge-success' },
    cancelado:         { label: 'Cancelado',          badge: 'badge-error'   },
  },

  FAIXA_ETARIA: {
    sub12:  'Sub-12',
    sub15:  'Sub-15',
    sub18:  'Sub-18',
    adulto: 'Adulto (19–49)',
    '50mais': '50+',
    '60mais': '60+',
    '70mais': '70+',
    aberto: 'Aberto',
  },

  NIVEL: {
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    elite:         'Elite',
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
  },

  TIPO_PART: {
    singles: 'Singles',
    duplas:  'Duplas',
  },

  /* ------------------------------------------------------------------ */
  /*  Estado                                                              */
  /* ------------------------------------------------------------------ */

  _state: {
    tab:           'eventos',   // 'eventos' | 'participantes'
    search:        '',
    filterStatus:  '',
    filterEsporte: '',
    searchPart:    '',
    _eventoId:     null,        // evento aberto no detalhe
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
    if (tab === 'participantes') return this._renderParticipantes();
    return this._renderEventos();
  },

  /* ------------------------------------------------------------------ */
  /*  Aba: Eventos                                                        */
  /* ------------------------------------------------------------------ */

  _renderEventos() {
    const todos     = Storage.getAll(this.SK);
    const filtered  = this._filtrarEventos(todos);

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
        <select class="filter-select" onchange="TorneioModule._state.filterStatus=this.value;TorneioModule._reRenderContent()">
          <option value="">Todos os status</option>
          ${statusOpts}
        </select>
        <select class="filter-select" onchange="TorneioModule._state.filterEsporte=this.value;TorneioModule._reRenderContent()">
          <option value="">Todos os esportes</option>
          ${esporteOpts}
        </select>
        <span class="results-count">${filtered.length} torneio${filtered.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" onclick="TorneioModule.openModalEvento()">
          + Novo Torneio
        </button>
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
    const esp    = this.ESPORTES[e.esporte] || { label: e.esporte, icon: '🏅' };
    const st     = this.STATUS[e.status]    || { label: e.status,  badge: 'badge-gray' };
    const cats   = Storage.getAll(this.SK_CAT).filter(c => c.eventoId === e.id);
    const insc   = Storage.getAll(this.SK_INSC).filter(i => cats.some(c => c.id === i.categoriaId));
    const dtIni  = UI.formatDate(e.dataInicio);
    const dtFim  = UI.formatDate(e.dataFim);

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
          <span>📅 ${dtIni}${e.dataFim && e.dataFim !== e.dataInicio ? ` → ${dtFim}` : ''}</span>
          <span>📂 ${cats.length} categoria${cats.length !== 1 ? 's' : ''}</span>
          <span>👤 ${insc.length} inscrito${insc.length !== 1 ? 's' : ''}</span>
        </div>
        ${e.observacoes ? `<div class="torneio-card-obs">${UI.escape(e.observacoes)}</div>` : ''}
        <div class="torneio-card-actions">
          <button class="btn btn-primary btn-sm" onclick="TorneioModule.abrirDetalhe('${e.id}')">
            Gerenciar →
          </button>
          <button class="btn btn-ghost btn-sm" onclick="TorneioModule.openModalEvento('${e.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger" onclick="TorneioModule.deleteEvento('${e.id}')" title="Excluir">🗑️</button>
        </div>
      </div>`;
  },

  _emptyEventos() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <div class="empty-title">Nenhum torneio cadastrado</div>
        <div class="empty-desc">Crie o primeiro torneio da arena para começar.</div>
        <button class="btn btn-primary mt-16" onclick="TorneioModule.openModalEvento()">+ Criar Torneio</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Detalhe do Evento (categorias + gerenciamento)                      */
  /* ------------------------------------------------------------------ */

  abrirDetalhe(id) {
    const evento = Storage.getById(this.SK, id);
    if (!evento) return;
    this._state._eventoId = id;

    const esp  = this.ESPORTES[evento.esporte] || { label: evento.esporte, icon: '🏅' };
    const st   = this.STATUS[evento.status]    || { label: evento.status, badge: 'badge-gray' };
    const cats = Storage.getAll(this.SK_CAT).filter(c => c.eventoId === id);

    const area = document.getElementById('content-area');
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <button class="btn btn-ghost btn-sm" onclick="TorneioModule.render()" style="margin-bottom:4px;">
            ← Torneios
          </button>
          <h2>${esp.icon} ${UI.escape(evento.nome)}</h2>
          <p>${UI.formatDate(evento.dataInicio)}${evento.dataFim !== evento.dataInicio ? ` → ${UI.formatDate(evento.dataFim)}` : ''}
            &nbsp;·&nbsp; <span class="badge ${st.badge}">${st.label}</span></p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${this._statusActions(evento)}
          <button class="btn btn-secondary btn-sm" onclick="TorneioModule.openModalEvento('${id}')">✏️ Editar</button>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h3 style="font-size:15px;font-weight:700;">📂 Categorias <span class="badge badge-gray" style="font-size:12px;">${cats.length}</span></h3>
        <button class="btn btn-primary btn-sm" onclick="TorneioModule.openModalCategoria('${id}')">+ Nova Categoria</button>
      </div>

      <div id="torneio-cats-list">
        ${cats.length ? cats.map(c => this._renderCatCard(c, evento)).join('') : this._emptyCats(id)}
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
      onclick="TorneioModule._avancarStatus('${evento.id}','${n.status}')">
      ${n.label}
    </button>`;
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
    const isent = insc.filter(i => i.statusPagamento === 'isento').length;
    const fmt   = this.FORMATO[cat.formato] || cat.formato;
    const stCat = this.STATUS[cat.status]   || { label: cat.status, badge: 'badge-gray' };

    return `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div>
            <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${UI.escape(cat.nome)}</div>
            <div style="font-size:12px;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:8px;">
              <span>🎮 ${fmt}</span>
              <span>👥 ${this.TIPO_PART[cat.tipoParticipacao] || cat.tipoParticipacao}</span>
              ${cat.taxaInscricao > 0 ? `<span>💰 R$ ${(+cat.taxaInscricao).toLocaleString('pt-BR',{minimumFractionDigits:2})}/pessoa</span>` : '<span>Gratuita</span>'}
              ${cat.maxParticipantes ? `<span>🔢 Máx. ${cat.maxParticipantes}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span class="badge ${stCat.badge}">${stCat.label}</span>
          </div>
        </div>

        <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;">
          <span>👤 <strong>${insc.length}</strong> inscritos</span>
          <span style="color:var(--color-success);">✓ ${pago} pagos</span>
          ${pend  ? `<span style="color:var(--color-warning);">⏳ ${pend} pendentes</span>` : ''}
          ${isent ? `<span style="color:var(--text-muted);">🎁 ${isent} isentos</span>` : ''}
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm"
            onclick="TorneioModule.abrirCategoria('${cat.id}','${evento.id}')">Gerenciar →</button>
          <button class="btn btn-ghost btn-sm"
            onclick="TorneioModule.openModalCategoria('${evento.id}','${cat.id}')">✏️ Editar</button>
          <button class="btn btn-ghost btn-sm danger"
            onclick="TorneioModule.deleteCategoria('${cat.id}','${evento.id}')">🗑️</button>
        </div>
      </div>`;
  },

  _emptyCats(eventoId) {
    return `
      <div class="empty-state" style="padding:40px 0;">
        <div class="empty-icon">📂</div>
        <div class="empty-title">Nenhuma categoria criada</div>
        <div class="empty-desc">Defina as categorias de competição deste torneio.</div>
        <button class="btn btn-primary mt-16" onclick="TorneioModule.openModalCategoria('${eventoId}')">+ Nova Categoria</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Aba: Participantes                                                  */
  /* ------------------------------------------------------------------ */

  _renderParticipantes() {
    const todos    = Storage.getAll(this.SK_PART);
    const q        = this._state.searchPart.toLowerCase();
    const filtered = q
      ? todos.filter(p => (p.nome || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
      : todos;
    filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

    return `
      <div class="filters-bar" style="margin-bottom:20px;">
        <div class="search-wrapper" style="flex:1;">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar participante…"
            value="${UI.escape(this._state.searchPart)}"
            oninput="TorneioModule._state.searchPart=this.value;TorneioModule._reRenderContent()" />
        </div>
        <span class="results-count">${filtered.length} participante${filtered.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" onclick="TorneioModule.openModalParticipante()">+ Novo Participante</button>
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
        </div>` : `
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <div class="empty-title">Nenhum participante cadastrado</div>
          <div class="empty-desc">Cadastre participantes externos ou vincule alunos da arena.</div>
          <button class="btn btn-primary mt-16" onclick="TorneioModule.openModalParticipante()">+ Cadastrar Participante</button>
        </div>`}
    `;
  },

  _renderPartRow(p) {
    const idade = p.dataNascimento ? this._calcIdade(p.dataNascimento) + ' anos' : '—';
    const sexo  = { masculino: '♂ Masc.', feminino: '♀ Fem.' }[p.sexo] || '—';
    return `<tr>
      <td><strong>${UI.escape(p.nome)}</strong></td>
      <td>${sexo}</td>
      <td>${UI.escape(p.dataNascimento ? UI.formatDate(p.dataNascimento + 'T00:00:00') + ' · ' + idade : '—')}</td>
      <td><span class="badge badge-blue" style="font-size:11px;">${UI.escape(this.NIVEL[p.nivel] || p.nivel || '—')}</span></td>
      <td>${UI.escape(p.telefone || '—')}</td>
      <td>${UI.escape(p.email    || '—')}</td>
      <td class="aluno-row-actions">
        <button class="btn btn-ghost btn-sm" onclick="TorneioModule.openModalParticipante('${p.id}')" title="Editar">✏️</button>
        <button class="btn btn-ghost btn-sm danger" onclick="TorneioModule.deleteParticipante('${p.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal — Evento                                                      */
  /* ------------------------------------------------------------------ */

  openModalEvento(id = null) {
    const ev   = id ? Storage.getById(this.SK, id) : null;
    const v    = (f, fb = '') => ev ? UI.escape(String(ev[f] ?? fb)) : fb;
    const isEd = !!ev;

    const esporteOpts = Object.entries(this.ESPORTES)
      .map(([k, e]) => `<option value="${k}" ${ev?.esporte === k ? 'selected' : ''}>${e.icon} ${e.label}</option>`)
      .join('');

    UI.openModal({
      title:        isEd ? `Editar Torneio` : 'Novo Torneio',
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
                ${Object.entries(this.STATUS).map(([k, s]) =>
                  `<option value="${k}" ${(ev?.status || 'rascunho') === k ? 'selected' : ''}>${s.label}</option>`
                ).join('')}
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
  },

  saveEvento(id = null) {
    const g   = sel => document.getElementById(sel);
    const nome = g('t-nome')?.value.trim();
    const esporte = g('t-esporte')?.value;
    const dataInicio = g('t-data-ini')?.value;

    if (!nome)      { UI.toast('Informe o nome do torneio', 'error');  return; }
    if (!esporte)   { UI.toast('Selecione o esporte',       'error');  return; }
    if (!dataInicio){ UI.toast('Informe a data de início',  'error');  return; }

    const data = {
      nome,
      esporte,
      dataInicio,
      dataFim:      g('t-data-fim')?.value  || dataInicio,
      status:       g('t-status')?.value    || 'rascunho',
      observacoes:  g('t-obs')?.value.trim() || '',
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
    UI.confirm('Excluir este torneio? As categorias e inscrições também serão removidas.', 'Confirmar Exclusão', 'Excluir')
      .then(ok => {
        if (!ok) return;
        // Remove categorias, inscrições, etc.
        const cats = Storage.getAll(this.SK_CAT).filter(c => c.eventoId === id);
        cats.forEach(c => {
          Storage.getAll(this.SK_INSC).filter(i => i.categoriaId === c.id).forEach(i => Storage.delete(this.SK_INSC, i.id));
          Storage.delete(this.SK_CAT, c.id);
        });
        Storage.delete(this.SK, id);
        UI.toast('Torneio excluído.', 'success');
        this.render();
      });
  },

  /* ------------------------------------------------------------------ */
  /*  Modal — Categoria                                                   */
  /* ------------------------------------------------------------------ */

  openModalCategoria(eventoId, catId = null) {
    const cat  = catId ? Storage.getById(this.SK_CAT, catId) : null;
    const v    = (f, fb = '') => cat ? UI.escape(String(cat[f] ?? fb)) : fb;
    const isEd = !!cat;

    const opts = (map, field) => Object.entries(map)
      .map(([k, l]) => `<option value="${k}" ${(cat?.[field]) === k ? 'selected' : ''}>${l}</option>`)
      .join('');

    UI.openModal({
      title:        isEd ? 'Editar Categoria' : 'Nova Categoria',
      confirmLabel: isEd ? 'Salvar'           : 'Criar Categoria',
      onConfirm:    () => this.saveCategoria(eventoId, catId),
      content: `
        <div class="form-grid">

          <div class="aluno-secao-titulo">🔖 Identificação</div>

          <div class="form-group">
            <label class="form-label">Nome da categoria</label>
            <input id="tc-nome" type="text" class="form-input"
              placeholder="Gerado automaticamente se vazio"
              value="${v('nome')}" autocomplete="off" />
            <small class="form-hint">Ex: Masculino Adulto Iniciante Duplas</small>
          </div>

          <div class="aluno-secao-titulo">⚙️ Definição</div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Sexo <span class="required-star">*</span></label>
              <select id="tc-sexo" class="form-select" onchange="TorneioModule._atualizarNomeCat()">
                <option value="">— Selecionar —</option>
                ${opts(this.SEXO, 'sexo')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Faixa etária <span class="required-star">*</span></label>
              <select id="tc-faixa" class="form-select" onchange="TorneioModule._atualizarNomeCat()">
                <option value="">— Selecionar —</option>
                ${opts(this.FAIXA_ETARIA, 'faixaEtaria')}
              </select>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Nível <span class="required-star">*</span></label>
              <select id="tc-nivel" class="form-select" onchange="TorneioModule._atualizarNomeCat()">
                <option value="">— Selecionar —</option>
                ${opts(this.NIVEL, 'nivel')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de participação <span class="required-star">*</span></label>
              <select id="tc-tipo" class="form-select" onchange="TorneioModule._atualizarNomeCat()">
                <option value="">— Selecionar —</option>
                ${opts(this.TIPO_PART, 'tipoParticipacao')}
              </select>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Formato <span class="required-star">*</span></label>
              <select id="tc-formato" class="form-select">
                <option value="">— Selecionar —</option>
                ${opts(this.FORMATO, 'formato')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="tc-status" class="form-select">
                ${Object.entries(this.STATUS).map(([k, s]) =>
                  `<option value="${k}" ${(cat?.status || 'rascunho') === k ? 'selected' : ''}>${s.label}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <div class="aluno-secao-titulo">💰 Financeiro</div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Taxa de inscrição (R$/pessoa)</label>
              <input id="tc-taxa" type="number" class="form-input" min="0" step="0.01"
                placeholder="0.00 = gratuita" value="${v('taxaInscricao', '0')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Máx. participantes</label>
              <input id="tc-max" type="number" class="form-input" min="2" step="1"
                placeholder="Sem limite" value="${v('maxParticipantes', '')}" />
            </div>
          </div>

        </div>`,
    });
  },

  _atualizarNomeCat() {
    const g   = id => document.getElementById(id)?.value || '';
    const sx  = this.SEXO[g('tc-sexo')]        || '';
    const fx  = this.FAIXA_ETARIA[g('tc-faixa')] || '';
    const nv  = this.NIVEL[g('tc-nivel')]      || '';
    const tp  = this.TIPO_PART[g('tc-tipo')]   || '';
    const el  = document.getElementById('tc-nome');
    if (el && !el.dataset.manual) {
      el.value = [sx, fx, nv, tp].filter(Boolean).join(' — ');
    }
  },

  saveCategoria(eventoId, catId = null) {
    const g = id => document.getElementById(id);
    const sexo   = g('tc-sexo')?.value;
    const faixa  = g('tc-faixa')?.value;
    const nivel  = g('tc-nivel')?.value;
    const tipo   = g('tc-tipo')?.value;
    const fmt    = g('tc-formato')?.value;

    if (!sexo)  { UI.toast('Selecione o sexo',              'error'); return; }
    if (!faixa) { UI.toast('Selecione a faixa etária',      'error'); return; }
    if (!nivel) { UI.toast('Selecione o nível',             'error'); return; }
    if (!tipo)  { UI.toast('Selecione o tipo de participação','error'); return; }
    if (!fmt)   { UI.toast('Selecione o formato',           'error'); return; }

    const sx  = this.SEXO[sexo]          || sexo;
    const fx  = this.FAIXA_ETARIA[faixa] || faixa;
    const nv  = this.NIVEL[nivel]        || nivel;
    const tp  = this.TIPO_PART[tipo]     || tipo;
    const nomeAuto = [sx, fx, nv, tp].filter(Boolean).join(' — ');

    const data = {
      eventoId,
      nome:             g('tc-nome')?.value.trim()    || nomeAuto,
      sexo, faixaEtaria: faixa, nivel,
      tipoParticipacao: tipo,
      formato:          fmt,
      status:           g('tc-status')?.value         || 'rascunho',
      taxaInscricao:    parseFloat(g('tc-taxa')?.value) || 0,
      maxParticipantes: parseInt(g('tc-max')?.value)  || null,
    };

    if (catId) {
      Storage.update(this.SK_CAT, catId, data);
      UI.toast('Categoria atualizada!', 'success');
    } else {
      Storage.create(this.SK_CAT, data);
      UI.toast('Categoria criada!', 'success');
    }

    UI.closeModal();
    this.abrirDetalhe(eventoId);
  },

  deleteCategoria(catId, eventoId) {
    UI.confirm('Excluir esta categoria? As inscrições também serão removidas.', 'Confirmar', 'Excluir')
      .then(ok => {
        if (!ok) return;
        Storage.getAll(this.SK_INSC).filter(i => i.categoriaId === catId)
          .forEach(i => Storage.delete(this.SK_INSC, i.id));
        Storage.delete(this.SK_CAT, catId);
        UI.toast('Categoria excluída.', 'success');
        this.abrirDetalhe(eventoId);
      });
  },

  /* ------------------------------------------------------------------ */
  /*  Modal — Participante                                                */
  /* ------------------------------------------------------------------ */

  openModalParticipante(id = null) {
    const p    = id ? Storage.getById(this.SK_PART, id) : null;
    const v    = (f, fb = '') => p ? UI.escape(String(p[f] ?? fb)) : fb;
    const isEd = !!p;

    // Alunos da arena para vínculo opcional
    const alunos = Storage.getAll('alunos').filter(a => a.status === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const alunoOpts = alunos
      .map(a => `<option value="${a.id}" ${p?.alunoId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`)
      .join('');

    const nivelOpts = Object.entries(this.NIVEL)
      .map(([k, l]) => `<option value="${k}" ${p?.nivel === k ? 'selected' : ''}>${l}</option>`)
      .join('');

    UI.openModal({
      title:        isEd ? 'Editar Participante' : 'Novo Participante',
      confirmLabel: isEd ? 'Salvar' : 'Cadastrar',
      onConfirm:    () => this.saveParticipante(id),
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Nome completo <span class="required-star">*</span></label>
            <input id="tp-nome" type="text" class="form-input"
              placeholder="Nome do participante" value="${v('nome')}" autocomplete="off" />
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Sexo <span class="required-star">*</span></label>
              <select id="tp-sexo" class="form-select">
                <option value="">— Selecionar —</option>
                <option value="masculino" ${p?.sexo === 'masculino' ? 'selected' : ''}>♂ Masculino</option>
                <option value="feminino"  ${p?.sexo === 'feminino'  ? 'selected' : ''}>♀ Feminino</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Data de nascimento <span class="required-star">*</span></label>
              <input id="tp-nasc" type="date" class="form-input" value="${v('dataNascimento')}" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Nível <span class="required-star">*</span></label>
              <select id="tp-nivel" class="form-select">
                <option value="">— Selecionar —</option>
                ${nivelOpts}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Telefone</label>
              <input id="tp-tel" type="text" class="form-input"
                placeholder="(00) 00000-0000" value="${v('telefone')}" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input id="tp-email" type="email" class="form-input"
                placeholder="email@exemplo.com" value="${v('email')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Aluno da arena (opcional)</label>
              <select id="tp-aluno" class="form-select">
                <option value="">— Externo (não aluno) —</option>
                ${alunoOpts}
              </select>
            </div>
          </div>
        </div>`,
    });
  },

  saveParticipante(id = null) {
    const g    = sel => document.getElementById(sel);
    const nome = g('tp-nome')?.value.trim();
    const sexo = g('tp-sexo')?.value;
    const nasc = g('tp-nasc')?.value;
    const niv  = g('tp-nivel')?.value;

    if (!nome) { UI.toast('Informe o nome do participante', 'error'); return; }
    if (!sexo) { UI.toast('Selecione o sexo',               'error'); return; }
    if (!nasc) { UI.toast('Informe a data de nascimento',   'error'); return; }
    if (!niv)  { UI.toast('Selecione o nível',              'error'); return; }

    const alunoId = g('tp-aluno')?.value || null;
    const aluno   = alunoId ? Storage.getById('alunos', alunoId) : null;

    const data = {
      nome,
      sexo,
      dataNascimento: nasc,
      nivel:          niv,
      telefone:       g('tp-tel')?.value.trim()   || '',
      email:          g('tp-email')?.value.trim() || '',
      alunoId:        alunoId || null,
      alunoNome:      aluno?.nome || null,
    };

    if (id) {
      Storage.update(this.SK_PART, id, data);
      UI.toast('Participante atualizado!', 'success');
    } else {
      Storage.create(this.SK_PART, data);
      UI.toast('Participante cadastrado!', 'success');
    }

    UI.closeModal();
    this.switchTab('participantes');
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

  /* ------------------------------------------------------------------ */
  /*  Detalhe da Categoria (inscrições — Fase 3)                          */
  /* ------------------------------------------------------------------ */

  abrirCategoria(catId, eventoId) {
    // Placeholder para Fase 3 — Inscrições & Financeiro
    UI.toast('Gestão de inscrições — em breve (Fase 3)', 'info');
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _reRenderContent() {
    const c = document.getElementById('torneio-content');
    if (c) c.innerHTML = this._renderTab(this._state.tab);
  },

  _calcIdade(dataNasc) {
    if (!dataNasc) return null;
    const hoje = new Date();
    const nasc = new Date(dataNasc + 'T00:00:00');
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m  = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
    return anos;
  },
};
