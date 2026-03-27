'use strict';

const ManutencaoModule = {
  STORAGE_KEY:      'manutencao',
  STORAGE_KEY_PREV: 'manutencao_prev',

  _state: {
    tab:              'chamados',
    search:           '',
    filterStatus:     '',
    filterPrioridade: '',
    filterArena:      '',
    calMes:           new Date().getMonth(),
    calAno:           new Date().getFullYear(),
    _checklistTemp:     [],
    _checklistPrevTemp: [],
  },

  STATUS: {
    aberto:       { label: 'Aberto',       badge: 'badge-danger'  },
    em_andamento: { label: 'Em andamento', badge: 'badge-warning' },
    concluido:    { label: 'Concluído',    badge: 'badge-success' },
    cancelado:    { label: 'Cancelado',    badge: 'badge-gray'    },
  },

  PRIORIDADE: {
    baixa:   { label: 'Baixa',   badge: 'badge-blue',    order: 1 },
    media:   { label: 'Média',   badge: 'badge-success', order: 2 },
    alta:    { label: 'Alta',    badge: 'badge-warning', order: 3 },
    urgente: { label: 'Urgente', badge: 'badge-danger',  order: 4 },
  },

  TIPO: {
    eletrica:    'Elétrica',
    hidraulica:  'Hidráulica',
    piso:        'Piso / Quadra',
    equipamento: 'Equipamento',
    pintura:     'Pintura',
    limpeza:     'Limpeza',
    estrutural:  'Estrutural',
    outro:       'Outro',
  },

  TIPO_ICON: {
    eletrica: '⚡', hidraulica: '💧', piso: '🟩',
    equipamento: '🔩', pintura: '🎨', limpeza: '🧹',
    estrutural: '🏗️', outro: '🔧',
  },

  FREQUENCIA: {
    semanal:    { label: 'Semanal',    dias: 7   },
    quinzenal:  { label: 'Quinzenal',  dias: 14  },
    mensal:     { label: 'Mensal',     dias: 30  },
    trimestral: { label: 'Trimestral', dias: 90  },
    semestral:  { label: 'Semestral',  dias: 180 },
    anual:      { label: 'Anual',      dias: 365 },
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll()         { return Storage.getAll(this.STORAGE_KEY); },
  getAllPreventiva(){ return Storage.getAll(this.STORAGE_KEY_PREV); },

  getFiltered() {
    const { search, filterStatus, filterPrioridade, filterArena } = this._state;
    return this.getAll()
      .slice()
      .sort((a, b) => {
        const so = { aberto:0, em_andamento:1, concluido:2, cancelado:3 };
        const d = (so[a.status]??9) - (so[b.status]??9);
        if (d !== 0) return d;
        const p = (this.PRIORIDADE[b.prioridade]?.order??0) - (this.PRIORIDADE[a.prioridade]?.order??0);
        if (p !== 0) return p;
        return (b.dataAbertura||'').localeCompare(a.dataAbertura||'');
      })
      .filter(m => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          m.titulo.toLowerCase().includes(q) ||
          (m.arenaNome   && m.arenaNome.toLowerCase().includes(q)) ||
          (m.responsavel && m.responsavel.toLowerCase().includes(q)) ||
          (m.descricao   && m.descricao.toLowerCase().includes(q));
        return matchSearch &&
          (!filterStatus     || m.status     === filterStatus) &&
          (!filterPrioridade || m.prioridade === filterPrioridade) &&
          (!filterArena      || m.arenaId    === filterArena);
      });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:     all.length,
      abertos:   all.filter(m => m.status === 'aberto').length,
      andamento: all.filter(m => m.status === 'em_andamento').length,
      concluidos:all.filter(m => m.status === 'concluido').length,
      urgentes:  all.filter(m => m.prioridade === 'urgente' && m.status !== 'concluido' && m.status !== 'cancelado').length,
    };
  },

  /* ------------------------------------------------------------------ */
  /*  Main render                                                         */
  /* ------------------------------------------------------------------ */

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;
    const tab = this._state.tab;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Manutenção</h2>
          <p>Registro, acompanhamento e planejamento de manutenções</p>
        </div>
        ${tab === 'chamados'   ? `<button class="btn btn-primary" onclick="ManutencaoModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Abrir Chamado</button>` : ''}
        ${tab === 'preventiva' ? `<button class="btn btn-primary" onclick="ManutencaoModule.openModalPreventiva()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Preventiva</button>` : ''}
      </div>

      <div class="tabs-bar">
        <button class="tab-btn ${tab==='chamados'   ?'active':''}" onclick="ManutencaoModule.switchTab('chamados')">🔧 Chamados Corretivos</button>
        <button class="tab-btn ${tab==='preventiva' ?'active':''}" onclick="ManutencaoModule.switchTab('preventiva')">📋 Preventiva</button>
        <button class="tab-btn ${tab==='calendario' ?'active':''}" onclick="ManutencaoModule.switchTab('calendario')">📅 Calendário</button>
      </div>

      <div id="tab-content">
        ${tab === 'chamados'   ? this._renderChamados()   : ''}
        ${tab === 'preventiva' ? this._renderPreventiva() : ''}
        ${tab === 'calendario' ? this._renderCalendario() : ''}
      </div>`;
  },

  switchTab(tab) { this._state.tab = tab; this.render(); },

  /* ------------------------------------------------------------------ */
  /*  Tab: Chamados Corretivos                                            */
  /* ------------------------------------------------------------------ */

  _renderChamados() {
    const stats    = this.getStats();
    const filtered = this.getFiltered();
    const arenas   = Storage.getAll('arenas');
    const arenaOpts = arenas.map(a =>
      `<option value="${a.id}" ${this._state.filterArena===a.id?'selected':''}>${UI.escape(a.nome)}</option>`
    ).join('');

    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon blue">🔧</div><div class="stat-info"><div class="stat-value">${stats.total}</div><div class="stat-label">Total</div></div></div>
        <div class="stat-card"><div class="stat-icon ${stats.abertos>0?'amber':'gray'}">🔴</div><div class="stat-info"><div class="stat-value">${stats.abertos}</div><div class="stat-label">Abertos</div></div></div>
        <div class="stat-card"><div class="stat-icon amber">⚙️</div><div class="stat-info"><div class="stat-value">${stats.andamento}</div><div class="stat-label">Em andamento</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">${stats.concluidos}</div><div class="stat-label">Concluídos</div></div></div>
      </div>

      ${stats.urgentes > 0 ? `<div class="manut-alerta"><span>🚨</span><span><strong>${stats.urgentes} chamado${stats.urgentes!==1?'s':''} urgente${stats.urgentes!==1?'s':''}</strong> aguarda${stats.urgentes===1?'':'m'} resolução imediata.</span></div>` : ''}

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar por título, arena ou responsável…"
            value="${UI.escape(this._state.search)}" oninput="ManutencaoModule.handleSearch(this.value)" />
        </div>
        <select class="filter-select" onchange="ManutencaoModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS).map(([k,v])=>`<option value="${k}" ${this._state.filterStatus===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="ManutencaoModule.handleFilterPrioridade(this.value)">
          <option value="">Todas as prioridades</option>
          ${ListasService.opts('manutencao_prioridade', this._state.filterPrioridade)}
        </select>
        <select class="filter-select" onchange="ManutencaoModule.handleFilterArena(this.value)">
          <option value="">Todas as arenas</option>
          ${arenaOpts}
        </select>
        <span class="results-count">${filtered.length} chamado${filtered.length!==1?'s':''}</span>
      </div>

      <div class="cards-grid" id="manutencao-grid">
        ${filtered.length ? filtered.map(m=>this.renderCard(m)).join('') : this.renderEmpty()}
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Tab: Preventiva                                                     */
  /* ------------------------------------------------------------------ */

  _renderPreventiva() {
    const all   = this.getAllPreventiva();
    const today = new Date().toISOString().slice(0,10);

    if (!all.length) return `
      <div class="empty-state" style="margin-top:32px;">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Nenhuma manutenção preventiva cadastrada</div>
        <div class="empty-desc">Crie planos preventivos para manter suas arenas em dia.</div>
        <button class="btn btn-primary mt-16" onclick="ManutencaoModule.openModalPreventiva()">+ Nova Preventiva</button>
      </div>`;

    const vencidas = all.filter(p =>  p.ativo && p.proximaData < today);
    const proximas = all.filter(p =>  p.ativo && p.proximaData >= today);
    const inativas = all.filter(p => !p.ativo);

    const group = (title, items, color) => !items.length ? '' : `
      <div style="margin-bottom:24px;">
        <h3 style="font-size:14px;font-weight:600;color:${color};margin-bottom:12px;">${title} (${items.length})</h3>
        <div class="cards-grid">${items.map(p=>this._renderPrevCard(p,today)).join('')}</div>
      </div>`;

    return `
      ${vencidas.length ? `<div class="manut-alerta"><span>⚠️</span><span><strong>${vencidas.length} preventiva${vencidas.length!==1?'s':''} vencida${vencidas.length!==1?'s':''}</strong> — execute para manter a agenda em dia.</span></div>` : ''}
      ${group('🔴 Vencidas', vencidas, 'var(--red)')}
      ${group('🟢 Próximas', proximas, 'var(--primary-dark)')}
      ${group('⚪ Inativas', inativas, 'var(--text-muted)')}`;
  },

  _renderPrevCard(p, today) {
    const freqItem  = ListasService.get('manutencao_frequencia').find(i => i.v === p.frequencia);
    const freq      = freqItem ? { label: freqItem.l, dias: freqItem.dias } : this.FREQUENCIA[p.frequencia] || { label: p.frequencia };
    const icon      = this.TIPO_ICON[p.tipo] || '🔧';
    const tipo      = this.TIPO[p.tipo] || p.tipo || '—';
    const vencida   = p.ativo && p.proximaData < today;
    const checkCount= (p.checklistTemplate||[]).length;
    const dias      = p.proximaData ? Math.round((new Date(p.proximaData)-new Date())/86400000) : null;

    let proximaLabel = '—';
    if (p.proximaData) {
      if (vencida)     proximaLabel = `<span style="color:var(--red)">Vencida (${UI.formatDate(p.proximaData)})</span>`;
      else if (dias===0) proximaLabel = `<span style="color:var(--amber)">Hoje!</span>`;
      else if (dias<=7)  proximaLabel = `<span style="color:var(--amber)">${UI.formatDate(p.proximaData)} (${dias}d)</span>`;
      else               proximaLabel = UI.formatDate(p.proximaData);
    }

    return `
      <div class="arena-card ${vencida?'card-vencida':''}" data-id="${p.id}">
        <div class="arena-card-top">
          <span class="card-status-badge">
            <span class="badge ${p.ativo?(vencida?'badge-danger':'badge-success'):'badge-gray'}">
              ${p.ativo?(vencida?'Vencida':'Ativa'):'Inativa'}
            </span>
          </span>
          <div style="font-size:28px;margin-bottom:6px;">${icon}</div>
          <div class="arena-name">${UI.escape(p.titulo)}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap;">
            <span class="arena-code">${UI.escape(tipo)}</span>
            <span class="badge badge-blue" style="font-size:10px;">🔁 ${freq.label}</span>
          </div>
        </div>
        <div class="arena-details">
          <div class="detail-item"><div class="detail-label">Arena / Setor</div>
            <div class="detail-value">${UI.escape(p.arenaNome||'—')}${p.setor?` — ${UI.escape(p.setor)}`:''}</div></div>
          <div class="detail-item"><div class="detail-label">Responsável</div>
            <div class="detail-value">${UI.escape(p.responsavel||'—')}</div></div>
          <div class="detail-item"><div class="detail-label">Próxima execução</div>
            <div class="detail-value">${proximaLabel}</div></div>
          <div class="detail-item"><div class="detail-label">Checklist</div>
            <div class="detail-value">${checkCount} item${checkCount!==1?'s':''}</div></div>
        </div>
        <div class="arena-actions">
          <button class="btn btn-primary btn-sm" onclick="ManutencaoModule.executarPreventiva('${p.id}')">▶ Executar</button>
          <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.openModalPreventiva('${p.id}')">✏️ Editar</button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="ManutencaoModule.deletePreventiva('${p.id}')">🗑️</button>
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Tab: Calendário                                                     */
  /* ------------------------------------------------------------------ */

  _renderCalendario() {
    const { calMes, calAno } = this._state;
    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const preventivas = this.getAllPreventiva().filter(p => p.ativo && p.proximaData);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().slice(0,10);

    const firstDay = new Date(calAno, calMes, 1);
    const lastDay  = new Date(calAno, calMes+1, 0);
    const eventsByDate = {};

    preventivas.forEach(p => {
      const freqItem = ListasService.get('manutencao_frequencia').find(i => i.v === p.frequencia);
      const freq     = freqItem || this.FREQUENCIA[p.frequencia];
      if (!freq || !freq.dias) return;
      let d = new Date(p.proximaData + 'T00:00:00');
      while (d > firstDay) d = new Date(d.getTime() - freq.dias*86400000);
      while (d <= lastDay) {
        if (d >= firstDay) {
          const key = d.toISOString().slice(0,10);
          if (!eventsByDate[key]) eventsByDate[key] = [];
          eventsByDate[key].push(p);
        }
        d = new Date(d.getTime() + freq.dias*86400000);
      }
    });

    const firstWeekday = new Date(calAno, calMes, 1).getDay();
    const daysInMonth  = new Date(calAno, calMes+1, 0).getDate();
    let cells = '';
    for (let i=0; i<firstWeekday; i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;
    for (let day=1; day<=daysInMonth; day++) {
      const ds  = `${calAno}-${String(calMes+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const evs = eventsByDate[ds] || [];
      const isToday = ds === todayStr;
      const isPast  = ds < todayStr && !isToday;
      const evHtml = evs.slice(0,3).map(p=>
        `<div class="cal-event" title="${UI.escape(p.titulo)}">${this.TIPO_ICON[p.tipo]||'🔧'} ${UI.escape(p.titulo.length>13?p.titulo.slice(0,13)+'…':p.titulo)}</div>`
      ).join('');
      cells += `
        <div class="cal-cell${isToday?' cal-today':''}${isPast?' cal-past':''}${evs.length?' cal-has-events':''}">
          <div class="cal-day-num">${day}</div>
          ${evHtml}
          ${evs.length>3?`<div class="cal-event-more">+${evs.length-3} mais</div>`:''}
        </div>`;
    }

    const next30 = new Date(today.getTime()+30*86400000);
    const upcoming = preventivas
      .map(p => ({ ...p, _d: new Date(p.proximaData+'T00:00:00') }))
      .filter(p => p._d >= today && p._d <= next30)
      .sort((a,b) => a._d - b._d);

    return `
      <div class="cal-container">
        <div class="cal-nav">
          <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.calNavMes(-1)">‹ Anterior</button>
          <span class="cal-title">${MESES[calMes]} ${calAno}</span>
          <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.calNavMes(1)">Próximo ›</button>
        </div>
        <div class="cal-grid">
          ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>`<div class="cal-header">${d}</div>`).join('')}
          ${cells}
        </div>
        ${upcoming.length ? `
        <div style="margin-top:24px;">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">📌 Próximas Preventivas (30 dias)</h3>
          <div class="prev-list">
            ${upcoming.map(p=>`
              <div class="prev-list-item">
                <span class="prev-list-icon">${this.TIPO_ICON[p.tipo]||'🔧'}</span>
                <div class="prev-list-info">
                  <div class="prev-list-title">${UI.escape(p.titulo)}</div>
                  <div class="prev-list-meta">${UI.escape(p.arenaNome||'—')}${p.setor?` — ${UI.escape(p.setor)}`:''} · ${UI.formatDate(p.proximaData)}</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="ManutencaoModule.executarPreventiva('${p.id}')">▶ Executar</button>
              </div>`).join('')}
          </div>
        </div>` : `<div style="margin-top:24px;text-align:center;color:var(--text-muted);font-size:14px;">Nenhuma preventiva nos próximos 30 dias.</div>`}
      </div>`;
  },

  calNavMes(delta) {
    let { calMes, calAno } = this._state;
    calMes += delta;
    if (calMes < 0)  { calMes = 11; calAno--; }
    if (calMes > 11) { calMes = 0;  calAno++; }
    this._state.calMes = calMes;
    this._state.calAno = calAno;
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Checklist helpers                                                   */
  /* ------------------------------------------------------------------ */

  _renderChecklistEditor(key) {
    const items = this._state[key] || [];
    const html = items.length
      ? items.map((it,idx)=>`
          <div class="checklist-edit-item">
            <input class="form-input" style="flex:1;font-size:13px;" value="${UI.escape(it.texto)}"
              oninput="ManutencaoModule._updateCLItem('${key}',${idx},this.value)" />
            <button class="btn btn-ghost btn-sm danger" style="padding:4px 8px;"
              onclick="ManutencaoModule._removeCLItem('${key}',${idx})">✕</button>
          </div>`).join('')
      : `<div class="cl-empty">Nenhum item adicionado.</div>`;
    return `
      <div id="cl-editor-${key}">${html}</div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <input id="cl-new-${key}" type="text" class="form-input" style="flex:1;font-size:13px;"
          placeholder="Novo item…"
          onkeydown="if(event.key==='Enter'){event.preventDefault();ManutencaoModule._addCLItem('${key}');}" />
        <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule._addCLItem('${key}')">+ Adicionar</button>
      </div>`;
  },

  _addCLItem(key) {
    const input = document.getElementById(`cl-new-${key}`);
    if (!input || !input.value.trim()) return;
    this._state[key].push({ id: Storage.generateId(), texto: input.value.trim(), concluido: false });
    input.value = '';
    this._refreshCLEditor(key);
  },

  _removeCLItem(key, idx) {
    this._state[key].splice(idx, 1);
    this._refreshCLEditor(key);
  },

  _updateCLItem(key, idx, value) {
    if (this._state[key][idx]) this._state[key][idx].texto = value;
  },

  _refreshCLEditor(key) {
    const el = document.getElementById(`cl-editor-${key}`);
    if (!el) return;
    const items = this._state[key] || [];
    el.innerHTML = items.length
      ? items.map((it,idx)=>`
          <div class="checklist-edit-item">
            <input class="form-input" style="flex:1;font-size:13px;" value="${UI.escape(it.texto)}"
              oninput="ManutencaoModule._updateCLItem('${key}',${idx},this.value)" />
            <button class="btn btn-ghost btn-sm danger" style="padding:4px 8px;"
              onclick="ManutencaoModule._removeCLItem('${key}',${idx})">✕</button>
          </div>`).join('')
      : `<div class="cl-empty">Nenhum item adicionado.</div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Checklist toggle (inside card)                                      */
  /* ------------------------------------------------------------------ */

  toggleCLItem(chamadoId, itemId) {
    const chamado = Storage.getById(this.STORAGE_KEY, chamadoId);
    if (!chamado || !chamado.checklist) return;
    const checklist = chamado.checklist.map(it =>
      it.id === itemId ? { ...it, concluido: !it.concluido } : it
    );
    Storage.update(this.STORAGE_KEY, chamadoId, { checklist });
    const cardEl = document.querySelector(`.arena-card[data-id="${chamadoId}"]`);
    const updated = Storage.getById(this.STORAGE_KEY, chamadoId);
    if (cardEl && updated) cardEl.outerHTML = this.renderCard(updated);
  },

  /* ------------------------------------------------------------------ */
  /*  Render card (corrective)                                            */
  /* ------------------------------------------------------------------ */

  renderCard(m) {
    const status  = this.STATUS[m.status]         || { label: m.status,     badge: 'badge-gray' };
    const prior   = this.PRIORIDADE[m.prioridade] || { label: m.prioridade, badge: 'badge-gray' };
    const tipo    = this.TIPO[m.tipo]             || m.tipo || '—';
    const icon    = this.TIPO_ICON[m.tipo]        || '🔧';
    const abertura  = UI.formatDate(m.dataAbertura);
    const conclusao = m.dataConclusao ? UI.formatDate(m.dataConclusao) : null;
    const dias      = m.dataAbertura ? this._diasAberto(m.dataAbertura, m.dataConclusao) : null;
    const custo     = m.custo
      ? parseFloat(m.custo).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) : '—';

    const descBlock = m.descricao
      ? `<div class="arena-obs"><div class="arena-obs-text">💬 ${UI.escape(m.descricao)}</div></div>` : '';

    let checklistBlock = '';
    if (m.checklist && m.checklist.length) {
      const done = m.checklist.filter(i => i.concluido).length;
      const pct  = Math.round((done / m.checklist.length) * 100);
      checklistBlock = `
        <div class="checklist-inline">
          <div class="cl-inline-header">
            <span class="cl-inline-label">CHECKLIST</span>
            <span class="cl-inline-count">${done}/${m.checklist.length}</span>
          </div>
          <div class="cl-progress-bar"><div class="cl-progress-fill" style="width:${pct}%"></div></div>
          ${m.checklist.map(it=>`
            <div class="cl-card-item${it.concluido?' done':''}" onclick="ManutencaoModule.toggleCLItem('${m.id}','${it.id}')">
              <span class="cl-check">${it.concluido?'☑':'☐'}</span>
              <span>${UI.escape(it.texto)}</span>
            </div>`).join('')}
        </div>`;
    }

    return `
      <div class="arena-card" data-id="${m.id}" data-prior="${UI.escape(m.prioridade)}" data-status="${UI.escape(m.status)}">
        <div class="arena-card-top">
          <span class="card-status-badge"><span class="badge ${status.badge}">${status.label}</span></span>
          <div style="font-size:28px;margin-bottom:6px;">${icon}</div>
          <div class="arena-name">${UI.escape(m.titulo)}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap;">
            <span class="arena-code">${UI.escape(tipo)}</span>
            <span class="badge ${prior.badge}" style="font-size:10px;">⚑ ${prior.label}</span>
          </div>
        </div>
        <div class="arena-details">
          <div class="detail-item"><div class="detail-label">Arena / Setor</div>
            <div class="detail-value">${UI.escape(m.arenaNome||'—')}${m.setor?` — ${UI.escape(m.setor)}`:''}</div></div>
          <div class="detail-item"><div class="detail-label">Responsável</div>
            <div class="detail-value">${UI.escape(m.responsavel||'—')}</div></div>
          <div class="detail-item"><div class="detail-label">Abertura</div>
            <div class="detail-value">${abertura}${dias!==null?` <span class="text-muted text-sm">(${dias}d)</span>`:''}</div></div>
          <div class="detail-item"><div class="detail-label">${conclusao?'Conclusão':'Custo previsto'}</div>
            <div class="detail-value">${conclusao||custo}</div></div>
        </div>
        ${descBlock}
        ${checklistBlock}
        <div class="arena-actions">
          <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.openModal('${m.id}')">✏️ Editar</button>
          ${m.status!=='concluido'&&m.status!=='cancelado'?`
          <button class="btn btn-ghost btn-sm" onclick="ManutencaoModule.concluir('${m.id}')">✅ Concluir</button>`:''}
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="ManutencaoModule.deleteChamado('${m.id}')">🗑️</button>
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal: Chamado Corretivo                                            */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const item   = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!item;
    const v      = (f, fb='') => item ? UI.escape(String(item[f]??fb)) : fb;

    const arenas = Storage.getAll('arenas');
    const arenaOpts = `<option value="">— Selecionar —</option>` +
      arenas.map(a=>`<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
        ${item&&item.arenaId===a.id?'selected':''}>${UI.escape(a.nome)} (${UI.escape(a.codigo)})</option>`).join('');

    const tipoOpts   = ListasService.opts('manutencao_tipo',       item?.tipo       || '');
    const priorOpts  = ListasService.opts('manutencao_prioridade', item?.prioridade || '');
    const statusOpts = Object.entries(this.STATUS).map(([k,c])=>`<option value="${k}" ${item&&item.status===k?'selected':''}>${c.label}</option>`).join('');

    UI.openModal({
      title:        isEdit ? `Editar Chamado — ${item.titulo}` : 'Abrir Chamado de Manutenção',
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="mn-titulo">Título <span class="required-star">*</span></label>
            <input id="mn-titulo" type="text" class="form-input" placeholder="ex: Troca de lâmpada — Arena Norte"
              value="${v('titulo')}" required autocomplete="off" />
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="mn-tipo">Tipo</label>
              <select id="mn-tipo" class="form-select">${tipoOpts}</select></div>
            <div class="form-group"><label class="form-label" for="mn-prioridade">Prioridade</label>
              <select id="mn-prioridade" class="form-select">${priorOpts}</select></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="mn-arena">Arena</label>
              <select id="mn-arena" class="form-select">${arenaOpts}</select></div>
            <div class="form-group"><label class="form-label" for="mn-setor">Setor / Local</label>
              <input id="mn-setor" type="text" class="form-input" placeholder="ex: Quadra 2, Vestiário"
                value="${v('setor')}" autocomplete="off" /></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="mn-status">Status</label>
              <select id="mn-status" class="form-select">${statusOpts}</select></div>
            <div class="form-group"><label class="form-label" for="mn-responsavel">Responsável</label>
              <input id="mn-responsavel" type="text" class="form-input" placeholder="ex: João Eletricista"
                value="${v('responsavel')}" autocomplete="off" /></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="mn-abertura">Data de abertura <span class="required-star">*</span></label>
              <input id="mn-abertura" type="date" class="form-input"
                value="${v('dataAbertura', new Date().toISOString().slice(0,10))}" required /></div>
            <div class="form-group"><label class="form-label" for="mn-conclusao">Data de conclusão</label>
              <input id="mn-conclusao" type="date" class="form-input" value="${v('dataConclusao')}" /></div>
          </div>
          <div class="form-group"><label class="form-label" for="mn-custo">Custo (R$)</label>
            <input id="mn-custo" type="number" class="form-input" placeholder="0,00" min="0" step="0.01" value="${v('custo')}" /></div>
          <div class="form-group"><label class="form-label" for="mn-desc">Descrição do problema</label>
            <textarea id="mn-desc" class="form-textarea" placeholder="Descreva o problema…" rows="3">${item?UI.escape(item.descricao||''):''}</textarea></div>
        </div>`,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Abrir Chamado',
      onConfirm:    () => this.saveChamado(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Modal: Preventiva                                                   */
  /* ------------------------------------------------------------------ */

  openModalPreventiva(id = null) {
    const item   = id ? Storage.getById(this.STORAGE_KEY_PREV, id) : null;
    const isEdit = !!item;
    const v      = (f, fb='') => item ? UI.escape(String(item[f]??fb)) : fb;

    this._state._checklistPrevTemp = item && item.checklistTemplate
      ? item.checklistTemplate.map(i=>({...i})) : [];

    const arenas = Storage.getAll('arenas');
    const arenaOpts = `<option value="">— Selecionar —</option>` +
      arenas.map(a=>`<option value="${a.id}" data-nome="${UI.escape(a.nome)}"
        ${item&&item.arenaId===a.id?'selected':''}>${UI.escape(a.nome)} (${UI.escape(a.codigo)})</option>`).join('');

    const tipoOpts = ListasService.opts('manutencao_tipo',       item?.tipo       || '');
    const freqOpts = ListasService.opts('manutencao_frequencia', item?.frequencia || '');

    UI.openModal({
      title:        isEdit ? `Editar Preventiva — ${item.titulo}` : 'Nova Manutenção Preventiva',
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="prev-titulo">Título <span class="required-star">*</span></label>
            <input id="prev-titulo" type="text" class="form-input" placeholder="ex: Inspeção mensal — Quadra Norte"
              value="${v('titulo')}" required autocomplete="off" />
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="prev-tipo">Tipo</label>
              <select id="prev-tipo" class="form-select">${tipoOpts}</select></div>
            <div class="form-group"><label class="form-label" for="prev-frequencia">Frequência <span class="required-star">*</span></label>
              <select id="prev-frequencia" class="form-select">${freqOpts}</select></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="prev-arena">Arena</label>
              <select id="prev-arena" class="form-select">${arenaOpts}</select></div>
            <div class="form-group"><label class="form-label" for="prev-setor">Setor / Local</label>
              <input id="prev-setor" type="text" class="form-input" placeholder="ex: Quadra 1, Iluminação"
                value="${v('setor')}" autocomplete="off" /></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="prev-proxima">Próxima execução <span class="required-star">*</span></label>
              <input id="prev-proxima" type="date" class="form-input"
                value="${v('proximaData', new Date().toISOString().slice(0,10))}" required /></div>
            <div class="form-group"><label class="form-label" for="prev-responsavel">Responsável</label>
              <input id="prev-responsavel" type="text" class="form-input" placeholder="ex: Técnico Silva"
                value="${v('responsavel')}" autocomplete="off" /></div>
          </div>
          <div class="form-group"><label class="form-label" for="prev-desc">Descrição</label>
            <textarea id="prev-desc" class="form-textarea" placeholder="Atividades a executar…" rows="2">${item?UI.escape(item.descricao||''):''}</textarea></div>
          <div class="form-group">
            <div style="display:flex;align-items:center;gap:12px;">
              <label class="form-label" style="margin:0;">Ativo</label>
              <label class="toggle-switch">
                <input type="checkbox" id="prev-ativo" ${!item||item.ativo!==false?'checked':''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Checklist modelo</label>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">Itens copiados para o chamado a cada execução.</div>
            ${this._renderChecklistEditor('_checklistPrevTemp')}
          </div>
        </div>`,
      confirmLabel: isEdit ? 'Salvar' : 'Criar',
      onConfirm:    () => this.savePreventiva(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD: Chamado                                                       */
  /* ------------------------------------------------------------------ */

  saveChamado(id = null) {
    const g        = n => document.getElementById(`mn-${n}`);
    const titulo   = g('titulo');
    const abertura = g('abertura');
    let valid = true;
    [titulo, abertura].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });
    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const arenaSel  = g('arena');
    const arenaId   = arenaSel ? arenaSel.value : '';
    const arenaNome = arenaSel?.selectedOptions[0]?.dataset?.nome || '';

    const record = {
      titulo:       titulo.value.trim(),
      tipo:         g('tipo')?.value        || 'outro',
      prioridade:   g('prioridade')?.value  || 'media',
      arenaId, arenaNome,
      setor:        g('setor')?.value.trim()       || '',
      status:       g('status')?.value             || 'aberto',
      dataAbertura: abertura.value,
      dataConclusao:g('conclusao')?.value          || '',
      responsavel:  g('responsavel')?.value.trim() || '',
      custo:        parseFloat(g('custo')?.value) || 0,
      descricao:    g('desc')?.value.trim()        || '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, record);
      UI.toast(`Chamado "${record.titulo}" atualizado!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, record);
      UI.toast(`Chamado "${record.titulo}" aberto!`, 'success');
    }
    UI.closeModal();
    this._state.tab = 'chamados';
    this.render();
  },

  async concluir(id) {
    const item = Storage.getById(this.STORAGE_KEY, id);
    if (!item) return;
    if (!await UI.confirm(`Marcar "${item.titulo}" como concluído?`, 'Concluir')) return;
    Storage.update(this.STORAGE_KEY, id, { status:'concluido', dataConclusao: new Date().toISOString().slice(0,10) });
    UI.toast(`Chamado "${item.titulo}" concluído!`, 'success');
    this.render();
  },

  async deleteChamado(id) {
    const item = Storage.getById(this.STORAGE_KEY, id);
    if (!item) return;
    if (!await UI.confirm(`Excluir chamado "${item.titulo}"?`, 'Excluir')) return;
    Storage.delete(this.STORAGE_KEY, id);
    UI.toast('Chamado excluído.', 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD: Preventiva                                                    */
  /* ------------------------------------------------------------------ */

  savePreventiva(id = null) {
    const g        = n => document.getElementById(`prev-${n}`);
    const titulo   = g('titulo');
    const proxima  = g('proxima');
    let valid = true;
    [titulo, proxima].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });
    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const arenaSel  = g('arena');
    const arenaId   = arenaSel ? arenaSel.value : '';
    const arenaNome = arenaSel?.selectedOptions[0]?.dataset?.nome || '';

    const record = {
      titulo:            titulo.value.trim(),
      tipo:              g('tipo')?.value             || 'outro',
      frequencia:        g('frequencia')?.value       || 'mensal',
      arenaId, arenaNome,
      setor:             g('setor')?.value.trim()     || '',
      proximaData:       proxima.value,
      responsavel:       g('responsavel')?.value.trim() || '',
      descricao:         g('desc')?.value.trim()      || '',
      ativo:             g('ativo')?.checked ?? true,
      checklistTemplate: this._state._checklistPrevTemp.slice(),
    };

    if (id) {
      Storage.update(this.STORAGE_KEY_PREV, id, record);
      UI.toast(`Preventiva "${record.titulo}" atualizada!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY_PREV, record);
      UI.toast(`Preventiva "${record.titulo}" criada!`, 'success');
    }
    UI.closeModal();
    this._state.tab = 'preventiva';
    this.render();
  },

  async deletePreventiva(id) {
    const item = Storage.getById(this.STORAGE_KEY_PREV, id);
    if (!item) return;
    if (!await UI.confirm(`Excluir preventiva "${item.titulo}"?`, 'Excluir')) return;
    Storage.delete(this.STORAGE_KEY_PREV, id);
    UI.toast('Preventiva excluída.', 'success');
    this.render();
  },

  async executarPreventiva(id) {
    const p = Storage.getById(this.STORAGE_KEY_PREV, id);
    if (!p) return;
    if (!await UI.confirm(`Executar "${p.titulo}"?\n\nUm chamado será criado com o checklist do plano.`, 'Executar Preventiva')) return;

    const checklist = (p.checklistTemplate||[]).map(it=>({
      ...it, id: Storage.generateId(), concluido: false,
    }));
    const today = new Date().toISOString().slice(0,10);

    Storage.create(this.STORAGE_KEY, {
      titulo:       `[Preventiva] ${p.titulo}`,
      tipo:         p.tipo || 'outro',
      prioridade:   'media',
      arenaId:      p.arenaId,
      arenaNome:    p.arenaNome,
      setor:        p.setor || '',
      status:       'em_andamento',
      dataAbertura: today,
      dataConclusao:'',
      responsavel:  p.responsavel || '',
      custo:        0,
      descricao:    p.descricao || '',
      preventivaId: p.id,
      checklist,
    });

    const freqItem = ListasService.get('manutencao_frequencia').find(i => i.v === p.frequencia);
    const freq = freqItem || this.FREQUENCIA[p.frequencia];
    if (freq && freq.dias) {
      const next = new Date(p.proximaData+'T00:00:00');
      next.setDate(next.getDate() + freq.dias);
      Storage.update(this.STORAGE_KEY_PREV, id, {
        ultimaExecucao: today,
        proximaData:    next.toISOString().slice(0,10),
      });
    }

    UI.toast('Preventiva executada! Chamado criado em "Em andamento".', 'success');
    this._state.tab = 'chamados';
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Filter handlers / helpers                                          */
  /* ------------------------------------------------------------------ */

  renderEmpty() {
    const isFiltered = this._state.search||this._state.filterStatus||this._state.filterPrioridade||this._state.filterArena;
    if (isFiltered) return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div><div class="empty-title">Nenhum chamado encontrado</div>
        <div class="empty-desc">Nenhum chamado corresponde aos filtros.</div>
        <button class="btn btn-secondary mt-16" onclick="ManutencaoModule.clearFilters()">Limpar filtros</button>
      </div>`;
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔧</div><div class="empty-title">Nenhum chamado de manutenção</div>
        <div class="empty-desc">Registre chamados de manutenção das arenas.</div>
        <button class="btn btn-primary mt-16" onclick="ManutencaoModule.openModal()">+ Abrir primeiro chamado</button>
      </div>`;
  },

  handleSearch(v)           { this._state.search           = v; this._reRenderCards(); },
  handleFilterStatus(v)     { this._state.filterStatus     = v; this._reRenderCards(); },
  handleFilterPrioridade(v) { this._state.filterPrioridade = v; this._reRenderCards(); },
  handleFilterArena(v)      { this._state.filterArena      = v; this._reRenderCards(); },

  clearFilters() {
    this._state.search = this._state.filterStatus = this._state.filterPrioridade = this._state.filterArena = '';
    this.render();
  },

  _reRenderCards() {
    const filtered = this.getFiltered();
    const grid = document.getElementById('manutencao-grid');
    if (grid) grid.innerHTML = filtered.length ? filtered.map(m=>this.renderCard(m)).join('') : this.renderEmpty();
    const cnt = document.querySelector('.results-count');
    if (cnt) cnt.textContent = `${filtered.length} chamado${filtered.length!==1?'s':''}`;
  },

  _diasAberto(abertura, conclusao) {
    if (!abertura) return null;
    const diff = Math.round((new Date(conclusao||undefined) - new Date(abertura)) / 86400000);
    return diff >= 0 ? diff : 0;
  },
};
