'use strict';

const ManutencaoModule = {
  SK:       'manutencao',
  SK_PREV:  'manutencao_prev',
  SK_AREAS: 'manut_areas',
  SK_CAT:   'manut_catalogo',
  SK_GRUP:  'manut_grupos',

  _state: {
    tab:            'chamados',
    search:         '',
    filterStatus:   '',
    filterUrgencia: '',
    filterTipo:     '',
    filterArea:     '',
    calMes:         new Date().getMonth(),
    calAno:         new Date().getFullYear(),
    _clPrevTemp:    [],
  },

  STATUS: {
    aberto:              { label:'Aberto',           badge:'badge-danger',  icon:'🔴', ordem:0 },
    atribuido:           { label:'Atribuído',        badge:'badge-blue',    icon:'👤', ordem:1 },
    em_execucao:         { label:'Em Execução',      badge:'badge-warning', icon:'⚙️', ordem:2 },
    aguardando_material: { label:'Aguard. Material', badge:'badge-amber',   icon:'📦', ordem:3 },
    concluido:           { label:'Concluído',        badge:'badge-success', icon:'✅', ordem:4 },
    cancelado:           { label:'Cancelado',        badge:'badge-gray',    icon:'❌', ordem:5 },
  },

  URGENCIA: {
    normal:         { label:'Normal',         badge:'badge-success', sla:72,  icon:'🟢', ordem:0 },
    urgencia_leve:  { label:'Urgência Leve',  badge:'badge-blue',    sla:24,  icon:'🟡', ordem:1 },
    urgencia_grave: { label:'Urgência Grave', badge:'badge-warning', sla:8,   icon:'🟠', ordem:2 },
    emergencia:     { label:'Emergência',     badge:'badge-danger',  sla:2,   icon:'🔴', ordem:3 },
  },

  TIPO: {
    corretiva:  { label:'Corretiva',  icon:'🔧' },
    preventiva: { label:'Preventiva', icon:'📋' },
    preditiva:  { label:'Preditiva',  icon:'🔬' },
  },

  FREQUENCIA: {
    diaria:     { label:'Diária',     dias:1   },
    semanal:    { label:'Semanal',    dias:7   },
    quinzenal:  { label:'Quinzenal',  dias:14  },
    mensal:     { label:'Mensal',     dias:30  },
    bimestral:  { label:'Bimestral',  dias:60  },
    trimestral: { label:'Trimestral', dias:90  },
    semestral:  { label:'Semestral',  dias:180 },
    anual:      { label:'Anual',      dias:365 },
  },

  /* ── Data helpers ─────────────────────────────────────────── */
  getAll()    { return Storage.getAll(this.SK); },
  getAreas()  { return Storage.getAll(this.SK_AREAS); },
  getCat()    { return Storage.getAll(this.SK_CAT); },
  getGrupos() { return Storage.getAll(this.SK_GRUP); },

  _nextNum() {
    const all = this.getAll();
    if (!all.length) return 1;
    return Math.max(...all.map(c => parseInt(c.numero||0)||0)) + 1;
  },

  _slaDeadline(urgencia, dataAbertura) {
    const u = this.URGENCIA[urgencia];
    if (!u || !dataAbertura) return null;
    return this._slaDeadlineFromHrs(u.sla, dataAbertura);
  },

  _slaDeadlineFromHrs(hrs, dataAbertura) {
    if (!hrs || !dataAbertura) return null;
    const d = new Date(dataAbertura + 'T08:00:00');
    d.setHours(d.getHours() + hrs);
    return d.toISOString();
  },

  _slaHrsFromCatalogo(servicoId, urgencia) {
    const cat = this.getCat().find(c => c.id === servicoId);
    if (!cat) return this.URGENCIA[urgencia]?.sla || 72;
    const map = { normal: cat.slaNormal||72, urgencia_leve: cat.slaLeve||24, urgencia_grave: cat.slaGrave||8, emergencia: cat.slaEmergencia||2 };
    return map[urgencia] || 72;
  },

  _formatDeadline(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  },

  _slaStatus(m) {
    if (!m.prazo || ['concluido','cancelado'].includes(m.status)) return null;
    const diffH = (new Date(m.prazo) - new Date()) / 3600000;
    if (diffH < 0)  return { label:'Atrasado',              css:'sla-vencido' };
    if (diffH < 2)  return { label:`${Math.round(diffH*60)}min`, css:'sla-critico' };
    if (diffH < 8)  return { label:`${Math.round(diffH)}h`,  css:'sla-alerta'  };
    return            { label:`${Math.round(diffH)}h`,  css:'sla-ok'      };
  },

  _addHistorico(chamadoId, acao, observacao='', statusAnt=null, statusNovo=null) {
    const m = Storage.getById(this.SK, chamadoId);
    if (!m) return;
    const session = Auth.getCurrentUser();
    const hist = Array.isArray(m.historico) ? [...m.historico] : [];
    hist.push({
      id:          Storage.generateId(),
      data:        new Date().toISOString(),
      usuarioNome: session?.nome || '—',
      acao, observacao, statusAnt, statusNovo,
    });
    Storage.update(this.SK, chamadoId, { historico: hist });
  },

  getFiltered() {
    const { search, filterStatus, filterUrgencia, filterTipo, filterArea } = this._state;
    return this.getAll().slice()
      .sort((a,b) => {
        const uo = (this.URGENCIA[b.urgencia]?.ordem??0) - (this.URGENCIA[a.urgencia]?.ordem??0);
        if (uo) return uo;
        const so = (this.STATUS[a.status]?.ordem??9) - (this.STATUS[b.status]?.ordem??9);
        if (so) return so;
        return (b.dataAbertura||'').localeCompare(a.dataAbertura||'');
      })
      .filter(m => {
        const q = search.toLowerCase();
        const matchQ = !q ||
          (m.titulo||'').toLowerCase().includes(q) ||
          (m.descricao||'').toLowerCase().includes(q) ||
          String(m.numero||'').includes(q);
        return matchQ &&
          (!filterStatus   || m.status   === filterStatus) &&
          (!filterUrgencia || m.urgencia === filterUrgencia) &&
          (!filterTipo     || m.tipo     === filterTipo) &&
          (!filterArea     || m.areaId   === filterArea);
      });
  },

  getStats() {
    const all = this.getAll();
    const now = new Date();
    return {
      total:     all.length,
      abertos:   all.filter(m => m.status === 'aberto').length,
      andamento: all.filter(m => ['atribuido','em_execucao'].includes(m.status)).length,
      concluidos:all.filter(m => m.status === 'concluido').length,
      atrasados: all.filter(m => m.prazo && new Date(m.prazo)<now && !['concluido','cancelado'].includes(m.status)).length,
      emergencia:all.filter(m => m.urgencia==='emergencia' && !['concluido','cancelado'].includes(m.status)).length,
    };
  },

  /* ── RENDER PRINCIPAL ─────────────────────────────────────── */
  render() {
    const area = document.getElementById('content-area');
    if (!area) return;
    const tab = this._state.tab;

    const tabs = [
      { k:'chamados',    icon:'🔧', label:'Chamados'    },
      { k:'checklists',  icon:'📋', label:'Checklists'  },
      { k:'catalogo',    icon:'📦', label:'Catálogo'    },
      { k:'areas',       icon:'🏗️',  label:'Áreas'       },
      { k:'grupos',      icon:'👥', label:'Grupos'      },
      { k:'stats',       icon:'📊', label:'Estatísticas'},
    ];

    const btnMap = {
      chamados:   { label:'+ Abrir Chamado', fn:'ManutencaoModule.openModalChamado()' },
      checklists: { label:'+ Novo Modelo',   fn:'ManutencaoModule.openModalChecklist()' },
      catalogo:   { label:'+ Novo Serviço',  fn:'ManutencaoModule.openModalCatalogo()' },
      areas:      { label:'+ Nova Área',     fn:'ManutencaoModule.openModalArea()' },
      grupos:     { label:'+ Novo Grupo',    fn:'ManutencaoModule.openModalGrupo()' },
    };
    const btn = btnMap[tab];

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Manutenção</h2>
          <p>Chamados, checklists, catálogo de serviços e estatísticas</p>
        </div>
        ${btn ? `<button class="btn btn-primary" onclick="${btn.fn}">${btn.label}</button>` : ''}
      </div>
      <div class="tabs-bar">
        ${tabs.map(t=>`<button class="tab-btn ${tab===t.k?'active':''}" onclick="ManutencaoModule.switchTab('${t.k}')">${t.icon} ${t.label}</button>`).join('')}
      </div>
      <div id="tab-content">${this._renderTab(tab)}</div>`;
  },

  switchTab(t) { this._state.tab = t; this.render(); },

  _renderTab(tab) {
    switch(tab) {
      case 'chamados':   return this._renderChamados();
      case 'checklists': return this._renderChecklists();
      case 'catalogo':   return this._renderCatalogo();
      case 'areas':      return this._renderAreas();
      case 'grupos':     return this._renderGrupos();
      case 'stats':      return this._renderStats();
      default:           return '';
    }
  },

  /* ── TAB: CHAMADOS ────────────────────────────────────────── */
  _renderChamados() {
    const stats    = this.getStats();
    const filtered = this.getFiltered();
    const areas    = this.getAreas();

    return `
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:20px;">
        <div class="stat-card"><div class="stat-icon blue">🔧</div><div class="stat-info"><div class="stat-value">${stats.total}</div><div class="stat-label">Total</div></div></div>
        <div class="stat-card"><div class="stat-icon ${stats.abertos?'amber':'gray'}">🔴</div><div class="stat-info"><div class="stat-value">${stats.abertos}</div><div class="stat-label">Abertos</div></div></div>
        <div class="stat-card"><div class="stat-icon amber">⚙️</div><div class="stat-info"><div class="stat-value">${stats.andamento}</div><div class="stat-label">Em andamento</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">${stats.concluidos}</div><div class="stat-label">Concluídos</div></div></div>
        <div class="stat-card"><div class="stat-icon ${stats.atrasados?'red':'gray'}">⏰</div><div class="stat-info"><div class="stat-value">${stats.atrasados}</div><div class="stat-label">Atrasados</div></div></div>
      </div>

      ${stats.emergencia>0?`<div class="manut-alerta"><span>🚨</span><span><strong>${stats.emergencia} chamado${stats.emergencia!==1?'s':''} de EMERGÊNCIA</strong> requer${stats.emergencia===1?'':'m'} atenção imediata!</span></div>`:''}
      ${stats.atrasados>0?`<div class="manut-alerta" style="background:#fff7ed;border-color:#f97316;"><span>⏰</span><span><strong>${stats.atrasados} chamado${stats.atrasados!==1?'s':''} com SLA vencido</strong></span></div>`:''}

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar por título, número…"
            value="${UI.escape(this._state.search)}"
            oninput="ManutencaoModule._setState('search',this.value);ManutencaoModule._reRenderCards()" />
        </div>
        <select class="filter-select" onchange="ManutencaoModule._setState('filterStatus',this.value);ManutencaoModule._reRenderCards()">
          <option value="">Todos os status</option>
          ${Object.entries(this.STATUS).map(([k,v])=>`<option value="${k}" ${this._state.filterStatus===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="ManutencaoModule._setState('filterUrgencia',this.value);ManutencaoModule._reRenderCards()">
          <option value="">Todas as urgências</option>
          ${Object.entries(this.URGENCIA).map(([k,v])=>`<option value="${k}" ${this._state.filterUrgencia===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="ManutencaoModule._setState('filterTipo',this.value);ManutencaoModule._reRenderCards()">
          <option value="">Todos os tipos</option>
          ${Object.entries(this.TIPO).map(([k,v])=>`<option value="${k}" ${this._state.filterTipo===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="ManutencaoModule._setState('filterArea',this.value);ManutencaoModule._reRenderCards()">
          <option value="">Todas as áreas</option>
          ${areas.map(a=>`<option value="${a.id}" ${this._state.filterArea===a.id?'selected':''}>${UI.escape(a.nome)}</option>`).join('')}
        </select>
        <span class="results-count">${filtered.length} chamado${filtered.length!==1?'s':''}</span>
      </div>

      <div class="manut-list" id="manutencao-grid">
        ${filtered.length ? filtered.map(m=>this._renderRow(m)).join('') : this._renderEmpty()}
      </div>`;
  },

  _renderRow(m) {
    const status   = this.STATUS[m.status]     || { label:m.status,   badge:'badge-gray', icon:'?' };
    const urgencia = this.URGENCIA[m.urgencia] || { label:'Normal',   badge:'badge-gray', icon:'🟢' };
    const tipo     = this.TIPO[m.tipo]         || { label:'Corretiva', icon:'🔧' };
    const sla      = this._slaStatus(m);
    const area     = this.getAreas().find(a=>a.id===m.areaId);
    const grupo    = this.getGrupos().find(g=>g.id===m.grupoId);
    const nMat     = (m.materiais||[]).length;

    return `
      <div class="manut-row" onclick="ManutencaoModule.abrirDetalhe('${m.id}')">
        <div class="manut-row-num">#${String(m.numero||'?').padStart(4,'0')}</div>
        <div class="manut-row-tipo" title="${tipo.label}">${tipo.icon}</div>
        <div class="manut-row-info">
          <div class="manut-row-titulo">${UI.escape(m.titulo)}</div>
          <div class="manut-row-meta">
            ${area?`<span>🏗️ ${UI.escape(area.nome)}</span>`:''}
            ${grupo?`<span>👥 ${UI.escape(grupo.nome)}</span>`:m.responsavelNome?`<span>👤 ${UI.escape(m.responsavelNome)}</span>`:''}
            <span>📅 ${UI.formatDate(m.dataAbertura)}</span>
            ${nMat?`<span>📦 ${nMat} material${nMat!==1?'is':''}</span>`:''}
          </div>
        </div>
        <div class="manut-row-badges">
          <span class="badge ${urgencia.badge}" style="font-size:11px;">${urgencia.icon} ${urgencia.label}</span>
          <span class="badge ${status.badge}" style="font-size:11px;">${status.icon} ${status.label}</span>
          ${sla?`<span class="manut-sla ${sla.css}">⏱ ${sla.label}</span>`:''}
        </div>
        <div class="manut-row-actions" onclick="event.stopPropagation()">
          ${m.status==='aberto'?`<button class="btn btn-sm btn-secondary" onclick="ManutencaoModule.assumir('${m.id}')">Assumir</button>`:''}
          ${!['concluido','cancelado'].includes(m.status)?`<button class="btn btn-sm btn-ghost" title="Avançar status" onclick="ManutencaoModule.avancarStatus('${m.id}')">▶</button>`:''}
        </div>
      </div>`;
  },

  /* ── DETALHE DO CHAMADO ──────────────────────────────────── */
  abrirDetalhe(id) {
    const m = Storage.getById(this.SK, id);
    if (!m) return;
    const status   = this.STATUS[m.status]     || { label:m.status,   badge:'badge-gray', icon:'?' };
    const urgencia = this.URGENCIA[m.urgencia] || { label:'Normal',   badge:'badge-gray', icon:'🟢' };
    const tipo     = this.TIPO[m.tipo]         || { label:'Corretiva', icon:'🔧' };
    const area     = this.getAreas().find(a=>a.id===m.areaId);
    const grupo    = this.getGrupos().find(g=>g.id===m.grupoId);
    const cat      = this.getCat().find(c=>c.id===m.servicoId);
    const sla      = this._slaStatus(m);
    const materiais= Array.isArray(m.materiais) ? m.materiais : [];
    const historico= Array.isArray(m.historico) ? m.historico : [];
    const ativo    = !['concluido','cancelado'].includes(m.status);

    const custoMat = materiais.reduce((s,mt)=>s+(parseFloat(mt.custoUnit||0)*(parseInt(mt.qtd)||1)),0);
    const custoMO  = parseFloat(m.custoMaoObra)||0;
    const custoTot = custoMat + custoMO;

    const proxStatus = { aberto:'atribuido', atribuido:'em_execucao', em_execucao:'concluido', aguardando_material:'em_execucao' };
    const prox = proxStatus[m.status];

    UI.openModal({
      title: `#${String(m.numero||'?').padStart(4,'0')} — ${m.titulo}`,
      wide: true,
      content: `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
          <span class="badge ${m.tipo==='corretiva'?'badge-danger':m.tipo==='preventiva'?'badge-blue':'badge-warning'}">${tipo.icon} ${tipo.label}</span>
          <span class="badge ${urgencia.badge}">${urgencia.icon} ${urgencia.label}</span>
          <span class="badge ${status.badge}">${status.icon} ${status.label}</span>
          ${sla?`<span class="manut-sla ${sla.css}">⏱ SLA: ${sla.label}</span>`:''}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:16px;font-size:13px;">
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Área</span><div style="font-weight:600;">${area?UI.escape(area.nome):'—'}</div></div>
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Serviço</span><div style="font-weight:600;">${cat?UI.escape(cat.nome):'—'}</div></div>
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Responsável</span><div style="font-weight:600;">${grupo?UI.escape(grupo.nome):m.responsavelNome||'—'}</div></div>
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Prazo (SLA)</span><div style="font-weight:600;">${m.prazo?UI.formatDate(m.prazo):'—'}</div></div>
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Abertura</span><div>${UI.formatDate(m.dataAbertura)}</div></div>
          ${m.dataConclusao?`<div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Conclusão</span><div>${UI.formatDate(m.dataConclusao)}</div></div>`:''}
        </div>

        ${m.descricao?`<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;">💬 ${UI.escape(m.descricao)}</div>`:''}

        ${ativo?`
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--card-border);">
          ${m.status==='aberto'?`<button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.assumir('${id}');UI.closeModal()">👤 Assumir</button>`:''}
          ${prox?`<button class="btn btn-primary btn-sm" onclick="ManutencaoModule.avancarStatus('${id}');UI.closeModal()">▶ ${this.STATUS[prox]?.label||'Avançar'}</button>`:''}
          <button class="btn btn-ghost btn-sm" onclick="ManutencaoModule.marcarAguardandoMaterial('${id}');UI.closeModal()">📦 Aguardando Material</button>
          <button class="btn btn-secondary btn-sm" onclick="UI.closeModal();setTimeout(()=>ManutencaoModule.openModalChamado('${id}'),200)">✏️ Editar</button>
          <button class="btn btn-ghost btn-sm danger" onclick="ManutencaoModule.cancelar('${id}')">❌ Cancelar</button>
        </div>`:''}

        <!-- MATERIAIS -->
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h4 style="font-size:13px;font-weight:700;margin:0;">📦 Materiais</h4>
            ${ativo?`<button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.abrirModalMateriais('${id}')">+ Material</button>`:''}
          </div>
          ${materiais.length?`
          <div class="table-wrapper" style="margin:0;">
          <table class="data-table" style="font-size:12px;">
            <thead><tr><th>Item</th><th>Qtd</th><th>Estoque</th><th>Custo unit.</th><th>Total</th></tr></thead>
            <tbody>
              ${materiais.map(mt=>{
                const est = Storage.getAll('loja_estoque_loja').find(e=>e.produtoId===mt.produtoId);
                const disp= est?parseInt(est.quantidade||0):0;
                const sit = mt.produtoId
                  ? (disp>=(mt.qtd||1)?`<span class="badge badge-success" style="font-size:10px;">✅ ${disp}</span>`
                    :disp>0?`<span class="badge badge-warning" style="font-size:10px;">⚠️ ${disp}</span>`
                    :`<span class="badge badge-danger" style="font-size:10px;">❌ 0</span>`)
                  : `<span style="color:var(--text-muted);font-size:11px;">Manual</span>`;
                const cu  = parseFloat(mt.custoUnit||0);
                const tot = cu*(parseInt(mt.qtd)||1);
                return `<tr>
                  <td>${UI.escape(mt.nome||'—')}</td>
                  <td>${mt.qtd||1}</td><td>${sit}</td>
                  <td>${cu.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                  <td>${tot.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr><td colspan="4" style="text-align:right;font-weight:600;">Materiais:</td><td style="font-weight:700;">${custoMat.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>
              ${custoMO?`<tr><td colspan="4" style="text-align:right;">Mão de obra:</td><td>${custoMO.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>`:''}
              <tr style="border-top:2px solid var(--card-border)"><td colspan="4" style="text-align:right;font-weight:700;">TOTAL:</td><td style="font-weight:700;">${custoTot.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>
            </tfoot>
          </table></div>`:`<div style="color:var(--text-muted);font-size:13px;">Nenhum material adicionado.</div>`}
        </div>

        <!-- HISTÓRICO -->
        <div>
          <h4 style="font-size:13px;font-weight:700;margin-bottom:12px;">📜 Histórico</h4>
          ${historico.length?`
          <div class="manut-timeline">
            ${[...historico].reverse().map(h=>`
              <div class="manut-tl-item">
                <div class="manut-tl-dot"></div>
                <div class="manut-tl-content">
                  <div class="manut-tl-header">
                    <span class="manut-tl-acao">${UI.escape(h.acao)}</span>
                    <span class="manut-tl-data">${UI.formatDate(h.data)} ${new Date(h.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  ${h.observacao?`<div class="manut-tl-obs">${UI.escape(h.observacao)}</div>`:''}
                  <div class="manut-tl-user">👤 ${UI.escape(h.usuarioNome)}</div>
                  ${h.statusAnt&&h.statusNovo?`<div class="manut-tl-status">${this.STATUS[h.statusAnt]?.label||h.statusAnt} → ${this.STATUS[h.statusNovo]?.label||h.statusNovo}</div>`:''}
                </div>
              </div>`).join('')}
          </div>`:`<div style="color:var(--text-muted);font-size:13px;">Nenhuma movimentação.</div>`}
          ${ativo?`
          <div style="margin-top:12px;display:flex;gap:8px;">
            <input id="manut-obs-input" type="text" class="form-input" style="flex:1;font-size:13px;" placeholder="Registrar observação…"
              onkeydown="if(event.key==='Enter')ManutencaoModule.addObs('${id}')" />
            <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.addObs('${id}')">Registrar</button>
          </div>`:''}
        </div>`,
      hideFooter: true,
    });
  },

  addObs(id) {
    const inp = document.getElementById('manut-obs-input');
    const obs = inp?.value.trim();
    if (!obs) return;
    this._addHistorico(id, 'Observação registrada', obs);
    inp.value = '';
    UI.toast('Observação registrada.', 'success');
    this.abrirDetalhe(id);
  },

  /* ── STATUS ACTIONS ───────────────────────────────────────── */
  assumir(id) {
    const m = Storage.getById(this.SK, id);
    if (!m) return;
    const s = Auth.getCurrentUser();
    const ant = m.status;
    Storage.update(this.SK, id, { status:'atribuido', responsavelId:s?.id||'', responsavelNome:s?.nome||'' });
    this._addHistorico(id, 'Chamado assumido', `Responsável: ${s?.nome||'—'}`, ant, 'atribuido');
    UI.toast('Chamado assumido!', 'success');
    this.render();
  },

  avancarStatus(id) {
    const m = Storage.getById(this.SK, id);
    if (!m) return;
    const prox = { aberto:'atribuido', atribuido:'em_execucao', em_execucao:'concluido', aguardando_material:'em_execucao' };
    const novo = prox[m.status];
    if (!novo) return;
    const changes = { status:novo };
    if (novo==='concluido') changes.dataConclusao = new Date().toISOString().slice(0,10);
    Storage.update(this.SK, id, changes);
    this._addHistorico(id, `Status: ${this.STATUS[novo]?.label}`, '', m.status, novo);
    UI.toast(`Status: ${this.STATUS[novo]?.label}`, 'success');
    this.render();
  },

  marcarAguardandoMaterial(id) {
    const m = Storage.getById(this.SK, id);
    if (!m||['concluido','cancelado'].includes(m.status)) return;
    Storage.update(this.SK, id, { status:'aguardando_material' });
    this._addHistorico(id, 'Aguardando material', '', m.status, 'aguardando_material');
    UI.toast('Marcado como Aguardando Material.', 'info');
    this.render();
  },

  cancelar(id) {
    const m = Storage.getById(this.SK, id);
    if (!m) return;
    UI.openModal({
      title: 'Cancelar Chamado',
      content: `
        <div class="form-group">
          <label class="form-label">Motivo do cancelamento</label>
          <textarea id="cancel-motivo" class="form-textarea" rows="3" placeholder="Descreva o motivo…"></textarea>
        </div>`,
      confirmLabel: 'Confirmar Cancelamento',
      onConfirm: () => {
        const motivo = document.getElementById('cancel-motivo')?.value.trim()||'';
        Storage.update(this.SK, id, { status:'cancelado' });
        this._addHistorico(id, 'Chamado cancelado', motivo, m.status, 'cancelado');
        UI.toast('Chamado cancelado.', 'info');
        this.render();
      },
    });
  },

  /* ── MODAL MATERIAIS ──────────────────────────────────────── */
  abrirModalMateriais(chamadoId) {
    const produtos = Storage.getAll('loja_produtos').filter(p=>p.ativo!==false);
    const estoque  = Storage.getAll('loja_estoque_loja');

    UI.openModal({
      title: '📦 Adicionar Material ao Chamado',
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Produto do Estoque</label>
            <select id="mat-produto" class="form-select" onchange="ManutencaoModule._onProdutoSelect(this)">
              <option value="">— Selecionar produto —</option>
              ${produtos.map(p=>{
                const est  = estoque.find(e=>e.produtoId===p.id);
                const disp = est?parseInt(est.quantidade||0):0;
                return `<option value="${p.id}" data-nome="${UI.escape(p.nome)}" data-custo="${p.precoCompra||p.preco||0}" data-disp="${disp}">${UI.escape(p.nome)} (${disp>0?'✅ '+disp:'❌ 0'})</option>`;
              }).join('')}
              <option value="__manual__">— Informar manualmente —</option>
            </select>
          </div>
          <div id="mat-nome-wrap" class="form-group" style="display:none;">
            <label class="form-label">Nome do material</label>
            <input id="mat-nome" type="text" class="form-input" placeholder="ex: Cabo de rede CAT6 — 20m" />
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Quantidade <span class="required-star">*</span></label>
              <input id="mat-qtd" type="number" class="form-input" min="1" value="1" /></div>
            <div class="form-group"><label class="form-label">Custo unitário (R$)</label>
              <input id="mat-custo" type="number" class="form-input" min="0" step="0.01" value="0" /></div>
          </div>
          <div id="mat-info" style="font-size:12px;color:var(--text-muted);"></div>
          <div class="form-group"><label class="form-label">Observação</label>
            <input id="mat-obs" type="text" class="form-input" placeholder="ex: Comprar no fornecedor X" /></div>
        </div>`,
      confirmLabel: 'Adicionar Material',
      onConfirm: () => this._salvarMaterial(chamadoId),
    });
  },

  _onProdutoSelect(sel) {
    const opt    = sel.selectedOptions[0];
    const manual = sel.value==='__manual__';
    const wrap   = document.getElementById('mat-nome-wrap');
    const info   = document.getElementById('mat-info');
    const custo  = document.getElementById('mat-custo');
    if (wrap) wrap.style.display = manual?'':'none';
    if (!manual && sel.value && opt) {
      if (custo) custo.value = opt.dataset.custo||0;
      const disp = parseInt(opt.dataset.disp||0);
      if (info) info.innerHTML = disp>0
        ?`<span style="color:green">✅ ${disp} unidades em estoque</span>`
        :`<span style="color:red">❌ Sem estoque — será necessário comprar</span>`;
    } else if (info) info.innerHTML='';
  },

  _salvarMaterial(chamadoId) {
    const prodEl = document.getElementById('mat-produto');
    const isMan  = prodEl?.value==='__manual__';
    const nome   = isMan
      ? (document.getElementById('mat-nome')?.value.trim()||'')
      : (prodEl?.selectedOptions[0]?.dataset?.nome||'');
    if (!nome) { UI.toast('Informe o material.','warning'); return; }
    const c = Storage.getById(this.SK, chamadoId);
    const mats = Array.isArray(c?.materiais) ? [...c.materiais] : [];
    mats.push({
      id:        Storage.generateId(),
      produtoId: isMan?null:(prodEl?.value||null),
      nome,
      qtd:       parseInt(document.getElementById('mat-qtd')?.value)||1,
      custoUnit: parseFloat(document.getElementById('mat-custo')?.value)||0,
      obs:       document.getElementById('mat-obs')?.value.trim()||'',
      status:    'pendente',
    });
    Storage.update(this.SK, chamadoId, { materiais:mats });
    this._addHistorico(chamadoId, `Material adicionado: ${nome}`, `Qtd: ${mats[mats.length-1].qtd}`);
    UI.toast(`"${nome}" adicionado!`, 'success');
    UI.closeModal();
    this.render();
  },

  /* ── MODAL CHAMADO ────────────────────────────────────────── */
  openModalChamado(id=null) {
    const item   = id?Storage.getById(this.SK,id):null;
    const isEdit = !!item;
    const v      = (f,fb='')=>item?UI.escape(String(item[f]??fb)):fb;

    const areas   = this.getAreas();
    const grupos  = this.getGrupos();
    const cat     = this.getCat();

    const areaOpts  = `<option value="">— Selecionar área —</option>`+areas.map(a=>`<option value="${a.id}" ${item?.areaId===a.id?'selected':''}>${UI.escape(a.nome)}${a.tipo?` (${a.tipo})`:''}</option>`).join('');
    const grupoOpts = `<option value="">— Sem grupo —</option>`+grupos.map(g=>`<option value="${g.id}" ${item?.grupoId===g.id?'selected':''}>${UI.escape(g.nome)}</option>`).join('');
    const catOpts   = `<option value="">— Sem serviço —</option>`+cat.map(c=>`<option value="${c.id}" ${item?.servicoId===c.id?'selected':''}>${UI.escape(c.nome)}</option>`).join('');
    const tipoOpts  = Object.entries(this.TIPO).map(([k,v2])=>`<option value="${k}" ${(item?.tipo||'corretiva')===k?'selected':''}>${v2.icon} ${v2.label}</option>`).join('');
    const urgOpts   = Object.entries(this.URGENCIA).map(([k,v2])=>`<option value="${k}" ${(item?.urgencia||'normal')===k?'selected':''}>${v2.icon} ${v2.label}</option>`).join('');
    const stOpts    = Object.entries(this.STATUS).map(([k,v2])=>`<option value="${k}" ${(item?.status||'aberto')===k?'selected':''}>${v2.label}</option>`).join('');
    const urgAtual  = item?.urgencia || 'normal';
    const srvAtual  = item?.servicoId || '';
    const slaHrsInit= srvAtual ? this._slaHrsFromCatalogo(srvAtual, urgAtual) : (this.URGENCIA[urgAtual]?.sla||72);

    UI.openModal({
      title: isEdit?`Editar Chamado #${String(item.numero||'?').padStart(4,'0')}`:'Abrir Chamado de Manutenção',
      wide: true,
      content: `
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Título <span class="required-star">*</span></label>
            <input id="mn-titulo" type="text" class="form-input" placeholder="Descreva brevemente o problema"
              value="${v('titulo')}" required autocomplete="off" /></div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Tipo de manutenção</label>
              <select id="mn-tipo" class="form-select">${tipoOpts}</select></div>
            <div class="form-group"><label class="form-label">Urgência</label>
              <select id="mn-urgencia" class="form-select"
                onchange="ManutencaoModule._updateSlaPreview()">${urgOpts}</select></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Área</label>
              <select id="mn-area" class="form-select">${areaOpts}</select></div>
            <div class="form-group"><label class="form-label">Serviço (catálogo)</label>
              <select id="mn-servico" class="form-select"
                onchange="ManutencaoModule._updateSlaPreview()">${catOpts}</select></div>
          </div>

          <!-- SLA PREVIEW -->
          <div id="mn-sla-preview" class="mn-sla-preview">
            ${this._buildSlaPreviewHtml(srvAtual, urgAtual, item?.dataAbertura||new Date().toISOString().slice(0,10))}
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Grupo de manutenção</label>
              <select id="mn-grupo" class="form-select">${grupoOpts}</select></div>
            <div class="form-group"><label class="form-label">Status</label>
              <select id="mn-status" class="form-select">${stOpts}</select></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Data de abertura <span class="required-star">*</span></label>
              <input id="mn-abertura" type="date" class="form-input"
                value="${v('dataAbertura',new Date().toISOString().slice(0,10))}" required /></div>
            <div class="form-group"><label class="form-label">Custo mão de obra (R$)</label>
              <input id="mn-custo-mo" type="number" class="form-input" min="0" step="0.01"
                value="${v('custoMaoObra','0')}" /></div>
          </div>
          <div class="form-group"><label class="form-label">Descrição do problema</label>
            <textarea id="mn-desc" class="form-textarea" rows="3" placeholder="Detalhe o problema…">${item?UI.escape(item.descricao||''):''}</textarea></div>
        </div>`,
      confirmLabel: isEdit?'Salvar':'Abrir Chamado',
      onConfirm: ()=>this._saveChamado(id),
    });
  },

  _saveChamado(id=null) {
    const g = n=>document.getElementById(`mn-${n}`);
    if (!g('titulo')?.value.trim()||!g('abertura')?.value) {
      UI.toast('Preencha os campos obrigatórios.','warning'); return;
    }
    const grupoEl   = g('grupo');
    const grupoObj  = this.getGrupos().find(gr=>gr.id===grupoEl?.value);
    const urgencia  = g('urgencia')?.value  || 'normal';
    const servicoId = g('servico')?.value   || '';
    const slaHrs    = this._slaHrsFromCatalogo(servicoId, urgencia);
    const prazo     = this._slaDeadlineFromHrs(slaHrs, g('abertura').value);
    const record = {
      titulo:       g('titulo').value.trim(),
      tipo:         g('tipo')?.value       ||'corretiva',
      urgencia,
      areaId:       g('area')?.value       ||'',
      servicoId,
      grupoId:      grupoEl?.value         ||'',
      grupoNome:    grupoObj?.nome         ||'',
      status:       g('status')?.value     ||'aberto',
      dataAbertura: g('abertura').value,
      prazo,
      slaHrs,
      custoMaoObra: parseFloat(g('custo-mo')?.value)||0,
      descricao:    g('desc')?.value.trim()||'',
    };
    if (id) {
      Storage.update(this.SK,id,record);
      this._addHistorico(id,'Chamado editado','');
      UI.toast('Chamado atualizado!','success');
    } else {
      record.numero   = this._nextNum();
      record.materiais= [];
      record.historico= [];
      const novo = Storage.create(this.SK,record);
      this._addHistorico(novo.id,'Chamado aberto',record.descricao);
      UI.toast(`Chamado #${String(record.numero).padStart(4,'0')} aberto!`,'success');
    }
    UI.closeModal();
    this._state.tab='chamados';
    this.render();
  },

  /* ── SLA PREVIEW ─────────────────────────────────────────── */
  _updateSlaPreview() {
    const preview  = document.getElementById('mn-sla-preview');
    if (!preview) return;
    const servicoId = document.getElementById('mn-servico')?.value  || '';
    const urgencia  = document.getElementById('mn-urgencia')?.value || 'normal';
    const abertura  = document.getElementById('mn-abertura')?.value || new Date().toISOString().slice(0,10);
    preview.innerHTML = this._buildSlaPreviewHtml(servicoId, urgencia, abertura);
  },

  _buildSlaPreviewHtml(servicoId, urgencia, abertura) {
    const cat    = servicoId ? this.getCat().find(c=>c.id===servicoId) : null;
    const u      = this.URGENCIA[urgencia] || this.URGENCIA.normal;
    const slaMap = cat
      ? { normal:cat.slaNormal||72, urgencia_leve:cat.slaLeve||24, urgencia_grave:cat.slaGrave||8, emergencia:cat.slaEmergencia||2 }
      : { normal:72, urgencia_leve:24, urgencia_grave:8, emergencia:2 };
    const slaHrs = slaMap[urgencia] || 72;
    const prazo  = this._slaDeadlineFromHrs(slaHrs, abertura);

    const badges = Object.entries(slaMap).map(([k,h])=>{
      const ug  = this.URGENCIA[k];
      const sel = k===urgencia;
      return `<span class="badge ${ug?.badge||'badge-gray'}" style="font-size:11px;${sel?'box-shadow:0 0 0 2px currentColor;':''}">${ug?.icon} ${ug?.label}: <strong>${h}h</strong></span>`;
    }).join('');

    return `
      <div class="mn-sla-header">
        <span>⏱ SLA ${cat?`do serviço <strong>${UI.escape(cat.nome)}</strong>`:'padrão do sistema'}</span>
        ${cat?'':`<span style="font-size:11px;color:var(--text-muted);">Selecione um serviço para usar SLA personalizado</span>`}
      </div>
      <div class="mn-sla-badges">${badges}</div>
      <div class="mn-sla-resultado">
        ${u.icon} <strong>${u.label}</strong> → prazo de <strong>${slaHrs}h</strong>
        ${prazo?` → vence em <strong>${this._formatDeadline(prazo)}</strong>`:''}
      </div>`;
  },

  /* ── TAB: CHECKLISTS ──────────────────────────────────────── */
  _renderChecklists() {
    const all   = Storage.getAll(this.SK_PREV);
    const today = new Date().toISOString().slice(0,10);
    if (!all.length) return `
      <div class="empty-state" style="margin-top:32px;">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Nenhum modelo de checklist</div>
        <div class="empty-desc">Crie modelos de inspeção preventiva e preditiva.</div>
        <button class="btn btn-primary mt-16" onclick="ManutencaoModule.openModalChecklist()">+ Novo Modelo</button>
      </div>`;
    return `<div class="cards-grid">${all.map(p=>this._renderChecklistCard(p,today)).join('')}</div>`;
  },

  _renderChecklistCard(p, today) {
    const freq    = this.FREQUENCIA[p.frequencia]||{label:p.frequencia||'—'};
    const tipo    = this.TIPO[p.tipoManut]||{label:'Preventiva',icon:'📋'};
    const vencida = p.ativo && p.proximaData && p.proximaData<today;
    const nItems  = (p.checklistTemplate||[]).length;
    return `
      <div class="arena-card ${vencida?'card-vencida':''}" data-id="${p.id}">
        <div class="arena-card-top">
          <span class="card-status-badge"><span class="badge ${p.ativo?(vencida?'badge-danger':'badge-success'):'badge-gray'}">${p.ativo?(vencida?'Vencida':'Ativa'):'Inativa'}</span></span>
          <div style="font-size:28px;margin-bottom:6px;">${tipo.icon}</div>
          <div class="arena-name">${UI.escape(p.titulo)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px;">
            <span class="badge badge-blue" style="font-size:10px;">${tipo.label}</span>
            <span class="badge badge-gray" style="font-size:10px;">🔁 ${freq.label}</span>
          </div>
        </div>
        <div class="arena-details">
          <div class="detail-item"><div class="detail-label">Próxima execução</div>
            <div class="detail-value">${p.proximaData?UI.formatDate(p.proximaData):'—'}</div></div>
          <div class="detail-item"><div class="detail-label">Itens</div>
            <div class="detail-value">${nItems} item${nItems!==1?'s':''}</div></div>
          <div class="detail-item"><div class="detail-label">Responsável</div>
            <div class="detail-value">${UI.escape(p.responsavel||'—')}</div></div>
        </div>
        <div class="arena-actions">
          <button class="btn btn-primary btn-sm" onclick="ManutencaoModule.executarChecklist('${p.id}')">▶ Executar</button>
          <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.openModalChecklist('${p.id}')">✏️ Editar</button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="ManutencaoModule._deleteChecklist('${p.id}')">🗑️</button>
        </div>
      </div>`;
  },

  openModalChecklist(id=null) {
    const item   = id?Storage.getById(this.SK_PREV,id):null;
    const isEdit = !!item;
    const v      = (f,fb='')=>item?UI.escape(String(item[f]??fb)):fb;
    this._state._clPrevTemp = item?.checklistTemplate?item.checklistTemplate.map(i=>({...i})):[];

    const areas    = this.getAreas();
    const areaOpts = `<option value="">— Todas as áreas —</option>`+areas.map(a=>`<option value="${a.id}" ${item?.areaId===a.id?'selected':''}>${UI.escape(a.nome)}</option>`).join('');
    const tipoOpts = ['preventiva','preditiva'].map(t=>`<option value="${t}" ${(item?.tipoManut||'preventiva')===t?'selected':''}>${this.TIPO[t]?.icon} ${this.TIPO[t]?.label||t}</option>`).join('');
    const freqOpts = Object.entries(this.FREQUENCIA).map(([k,v2])=>`<option value="${k}" ${(item?.frequencia||'mensal')===k?'selected':''}>${v2.label}</option>`).join('');

    UI.openModal({
      title: isEdit?`Editar Modelo — ${item.titulo}`:'Novo Modelo de Checklist',
      content: `
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Título <span class="required-star">*</span></label>
            <input id="prev-titulo" type="text" class="form-input" placeholder="ex: Inspeção mensal — Quadras"
              value="${v('titulo')}" required /></div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Tipo</label>
              <select id="prev-tipo" class="form-select">${tipoOpts}</select></div>
            <div class="form-group"><label class="form-label">Frequência <span class="required-star">*</span></label>
              <select id="prev-freq" class="form-select">${freqOpts}</select></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Área padrão</label>
              <select id="prev-area" class="form-select">${areaOpts}</select></div>
            <div class="form-group"><label class="form-label">Próxima execução <span class="required-star">*</span></label>
              <input id="prev-proxima" type="date" class="form-input"
                value="${v('proximaData',new Date().toISOString().slice(0,10))}" required /></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Responsável</label>
              <input id="prev-resp" type="text" class="form-input" value="${v('responsavel')}" /></div>
            <div class="form-group" style="display:flex;align-items:center;gap:12px;padding-top:24px;">
              <label class="form-label" style="margin:0;">Ativo</label>
              <label class="toggle-switch"><input type="checkbox" id="prev-ativo" ${!item||item.ativo!==false?'checked':''}><span class="toggle-slider"></span></label>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Descrição</label>
            <textarea id="prev-desc" class="form-textarea" rows="2" placeholder="Atividades a executar…">${item?UI.escape(item.descricao||''):''}</textarea></div>
          <div class="form-group">
            <label class="form-label">Itens do Checklist</label>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">Copiados a cada execução.</div>
            ${this._renderCLEditor('_clPrevTemp')}
          </div>
        </div>`,
      confirmLabel: isEdit?'Salvar':'Criar Modelo',
      onConfirm: ()=>this._saveChecklist(id),
    });
  },

  _saveChecklist(id=null) {
    const g = n=>document.getElementById(`prev-${n}`);
    if (!g('titulo')?.value.trim()||!g('proxima')?.value) {
      UI.toast('Preencha os campos obrigatórios.','warning'); return;
    }
    const record = {
      titulo:            g('titulo').value.trim(),
      tipoManut:         g('tipo')?.value          ||'preventiva',
      frequencia:        g('freq')?.value           ||'mensal',
      areaId:            g('area')?.value           ||'',
      proximaData:       g('proxima').value,
      responsavel:       g('resp')?.value.trim()    ||'',
      descricao:         g('desc')?.value.trim()    ||'',
      ativo:             g('ativo')?.checked??true,
      checklistTemplate: this._state._clPrevTemp.slice(),
    };
    if (id) { Storage.update(this.SK_PREV,id,record); UI.toast('Modelo atualizado!','success'); }
    else    { Storage.create(this.SK_PREV,record);    UI.toast('Modelo criado!','success');     }
    UI.closeModal();
    this.render();
  },

  async _deleteChecklist(id) {
    if (!await UI.confirm('Excluir este modelo de checklist?','Excluir')) return;
    Storage.delete(this.SK_PREV,id);
    UI.toast('Modelo excluído.','success');
    this.render();
  },

  executarChecklist(id) {
    const p = Storage.getById(this.SK_PREV,id);
    if (!p) return;
    const items = p.checklistTemplate||[];
    if (!items.length) { UI.toast('Adicione itens ao checklist antes de executar.','warning'); return; }

    UI.openModal({
      title: `▶ Executar: ${p.titulo}`,
      wide: true,
      content: `
        <div style="margin-bottom:12px;font-size:13px;color:var(--text-muted);">
          Responda cada item. Ao encontrar defeito, um chamado é gerado automaticamente.
        </div>
        <div id="exec-cl-list">
          ${items.map((it,idx)=>`
            <div class="exec-cl-item">
              <div class="exec-cl-pergunta">${UI.escape(it.texto)}</div>
              <div class="exec-cl-respostas">
                <label class="exec-cl-label ok"><input type="radio" name="cl-${idx}" value="ok" checked> ✅ OK</label>
                <label class="exec-cl-label nok"><input type="radio" name="cl-${idx}" value="nok"
                  onchange="document.getElementById('exec-obs-${idx}').style.display=''"> ❌ Defeito</label>
              </div>
              <div id="exec-obs-${idx}" style="display:none;margin-top:8px;">
                <input type="text" class="form-input" style="font-size:12px;" id="exec-obs-txt-${idx}"
                  placeholder="Descreva o defeito encontrado…" />
              </div>
            </div>`).join('')}
        </div>`,
      confirmLabel: 'Concluir Inspeção',
      onConfirm: ()=>this._finalizarExecucao(id,items),
    });
  },

  _finalizarExecucao(checklistId, items) {
    let gerados = 0;
    items.forEach((it,idx)=>{
      const radio = document.querySelector(`input[name="cl-${idx}"]:checked`);
      if (radio?.value==='nok') {
        const obs = document.getElementById(`exec-obs-txt-${idx}`)?.value.trim()||it.texto;
        const num = this._nextNum();
        const p   = Storage.getById(this.SK_PREV,checklistId);
        const novo = Storage.create(this.SK,{
          numero:       num,
          titulo:       `[Inspeção] ${it.texto}`,
          tipo:         p?.tipoManut||'preventiva',
          urgencia:     'normal',
          areaId:       p?.areaId||'',
          checklistId,
          status:       'aberto',
          dataAbertura: new Date().toISOString().slice(0,10),
          prazo:        this._slaDeadline('normal',new Date().toISOString().slice(0,10)),
          descricao:    obs,
          materiais:    [],
          historico:    [],
        });
        this._addHistorico(novo.id,'Gerado por inspeção',`Checklist: ${p?.titulo||'—'}`);
        gerados++;
      }
    });
    const p    = Storage.getById(this.SK_PREV,checklistId);
    const freq = p?this.FREQUENCIA[p.frequencia]:null;
    if (freq?.dias) {
      const next = new Date();
      next.setDate(next.getDate()+freq.dias);
      Storage.update(this.SK_PREV,checklistId,{
        ultimaExecucao: new Date().toISOString().slice(0,10),
        proximaData:    next.toISOString().slice(0,10),
      });
    }
    UI.closeModal();
    UI.toast(gerados>0
      ?`Inspeção concluída! ${gerados} chamado${gerados!==1?'s':''} gerado${gerados!==1?'s':''}.`
      :'Inspeção concluída sem defeitos! ✅','success');
    this._state.tab = gerados>0?'chamados':'checklists';
    this.render();
  },

  /* ── TAB: CATÁLOGO ────────────────────────────────────────── */
  _renderCatalogo() {
    const all = this.getCat();
    if (!all.length) return `
      <div class="empty-state" style="margin-top:32px;">
        <div class="empty-icon">📦</div>
        <div class="empty-title">Catálogo vazio</div>
        <div class="empty-desc">Adicione serviços com SLA por nível de urgência.</div>
        <button class="btn btn-primary mt-16" onclick="ManutencaoModule.openModalCatalogo()">+ Novo Serviço</button>
      </div>`;
    return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Serviço</th><th>Tipo</th><th>🟢 Normal</th><th>🟡 Leve</th><th>🟠 Grave</th><th>🔴 Emerg.</th><th></th></tr></thead>
          <tbody>
            ${all.map(c=>`
              <tr>
                <td><strong>${UI.escape(c.nome)}</strong>${c.descricao?`<br><small style="color:var(--text-muted)">${UI.escape(c.descricao)}</small>`:''}</td>
                <td>${this.TIPO[c.tipo]?.icon||'🔧'} ${this.TIPO[c.tipo]?.label||c.tipo||'—'}</td>
                <td>${c.slaNormal||72}h</td>
                <td>${c.slaLeve||24}h</td>
                <td>${c.slaGrave||8}h</td>
                <td>${c.slaEmergencia||2}h</td>
                <td>
                  <button class="btn btn-ghost btn-sm" onclick="ManutencaoModule.openModalCatalogo('${c.id}')">✏️</button>
                  <button class="btn btn-ghost btn-sm danger" onclick="ManutencaoModule._deleteCatalogo('${c.id}')">🗑️</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  openModalCatalogo(id=null) {
    const item   = id?Storage.getById(this.SK_CAT,id):null;
    const isEdit = !!item;
    const v      = (f,fb='')=>item?String(item[f]??fb):fb;
    const tipoOpts = Object.entries(this.TIPO).map(([k,v2])=>`<option value="${k}" ${(item?.tipo||'corretiva')===k?'selected':''}>${v2.icon} ${v2.label}</option>`).join('');

    UI.openModal({
      title: isEdit?`Editar — ${item.nome}`:'Novo Serviço no Catálogo',
      content: `
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Nome <span class="required-star">*</span></label>
            <input id="cat-nome" type="text" class="form-input" placeholder="ex: Troca de lâmpada"
              value="${UI.escape(v('nome'))}" required /></div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Tipo</label>
              <select id="cat-tipo" class="form-select">${tipoOpts}</select></div>
            <div class="form-group"><label class="form-label">Descrição</label>
              <input id="cat-desc" type="text" class="form-input" value="${UI.escape(v('descricao'))}"
                placeholder="Descrição opcional" /></div>
          </div>
          <div style="background:var(--bg-secondary);border-radius:8px;padding:12px;">
            <div style="font-size:12px;font-weight:700;margin-bottom:10px;color:var(--text-muted);">SLA POR URGÊNCIA (horas)</div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label">🟢 Normal</label>
                <input id="cat-sla-n" type="number" class="form-input" min="1" value="${v('slaNormal',72)}" /></div>
              <div class="form-group"><label class="form-label">🟡 Urgência Leve</label>
                <input id="cat-sla-l" type="number" class="form-input" min="1" value="${v('slaLeve',24)}" /></div>
              <div class="form-group"><label class="form-label">🟠 Urgência Grave</label>
                <input id="cat-sla-g" type="number" class="form-input" min="1" value="${v('slaGrave',8)}" /></div>
              <div class="form-group"><label class="form-label">🔴 Emergência</label>
                <input id="cat-sla-e" type="number" class="form-input" min="1" value="${v('slaEmergencia',2)}" /></div>
            </div>
          </div>
        </div>`,
      confirmLabel: isEdit?'Salvar':'Criar Serviço',
      onConfirm: ()=>this._saveCatalogo(id),
    });
  },

  _saveCatalogo(id=null) {
    const g = n=>document.getElementById(`cat-${n}`);
    if (!g('nome')?.value.trim()) { UI.toast('Informe o nome.','warning'); return; }
    const record = {
      nome:          g('nome').value.trim(),
      tipo:          g('tipo')?.value      ||'corretiva',
      descricao:     g('desc')?.value.trim()||'',
      slaNormal:     parseInt(g('sla-n')?.value)||72,
      slaLeve:       parseInt(g('sla-l')?.value)||24,
      slaGrave:      parseInt(g('sla-g')?.value)||8,
      slaEmergencia: parseInt(g('sla-e')?.value)||2,
    };
    if (id) { Storage.update(this.SK_CAT,id,record); UI.toast('Serviço atualizado!','success'); }
    else    { Storage.create(this.SK_CAT,record);    UI.toast('Serviço criado!','success');     }
    UI.closeModal();
    this.render();
  },

  async _deleteCatalogo(id) {
    if (!await UI.confirm('Excluir este serviço?','Excluir')) return;
    Storage.delete(this.SK_CAT,id);
    UI.toast('Serviço excluído.','success');
    this.render();
  },

  /* ── TAB: ÁREAS ───────────────────────────────────────────── */
  _areaIcon(t) {
    return {quadra:'🎾',vestiário:'🚿',vestiario:'🚿',recepção:'🏠',recepcao:'🏠',sala:'🏫',depósito:'📦',deposito:'📦',externo:'🌳',banheiro:'🚻'}[(t||'').toLowerCase()]||'🏗️';
  },

  _renderAreas() {
    const all = this.getAreas();
    if (!all.length) return `
      <div class="empty-state" style="margin-top:32px;">
        <div class="empty-icon">🏗️</div>
        <div class="empty-title">Nenhuma área cadastrada</div>
        <div class="empty-desc">Cadastre as áreas da unidade (quadras, vestiários, recepção…).</div>
        <button class="btn btn-primary mt-16" onclick="ManutencaoModule.openModalArea()">+ Nova Área</button>
      </div>`;
    return `
      <div class="cards-grid">
        ${all.map(a=>`
          <div class="arena-card">
            <div class="arena-card-top">
              <span class="card-status-badge"><span class="badge ${a.ativa!==false?'badge-success':'badge-gray'}">${a.ativa!==false?'Ativa':'Inativa'}</span></span>
              <div style="font-size:28px;margin-bottom:6px;">${this._areaIcon(a.tipo)}</div>
              <div class="arena-name">${UI.escape(a.nome)}</div>
              ${a.tipo?`<div class="arena-code">${UI.escape(a.tipo)}</div>`:''}
            </div>
            ${a.descricao?`<div class="arena-obs"><div class="arena-obs-text">${UI.escape(a.descricao)}</div></div>`:''}
            <div class="arena-actions">
              <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.openModalArea('${a.id}')">✏️ Editar</button>
              <span class="spacer"></span>
              <button class="btn btn-ghost btn-sm danger" onclick="ManutencaoModule._deleteArea('${a.id}')">🗑️</button>
            </div>
          </div>`).join('')}
      </div>`;
  },

  openModalArea(id=null) {
    const item   = id?Storage.getById(this.SK_AREAS,id):null;
    const isEdit = !!item;
    const v      = (f,fb='')=>item?UI.escape(String(item[f]??fb)):fb;
    const tipos  = ['Quadra','Vestiário','Recepção','Sala','Depósito','Área Externa','Banheiro','Outro'];
    const tOpts  = `<option value="">— Tipo —</option>`+tipos.map(t=>`<option value="${t}" ${item?.tipo===t?'selected':''}>${t}</option>`).join('');

    UI.openModal({
      title: isEdit?`Editar Área — ${item.nome}`:'Nova Área',
      content: `
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Nome <span class="required-star">*</span></label>
            <input id="area-nome" type="text" class="form-input" placeholder="ex: Quadra 1"
              value="${v('nome')}" required /></div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Tipo</label>
              <select id="area-tipo" class="form-select">${tOpts}</select></div>
            <div class="form-group" style="display:flex;align-items:center;gap:12px;padding-top:24px;">
              <label class="form-label" style="margin:0;">Ativa</label>
              <label class="toggle-switch"><input type="checkbox" id="area-ativa" ${!item||item.ativa!==false?'checked':''}><span class="toggle-slider"></span></label>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Descrição</label>
            <input id="area-desc" type="text" class="form-input" value="${v('descricao')}" placeholder="Detalhes…" /></div>
        </div>`,
      confirmLabel: isEdit?'Salvar':'Criar Área',
      onConfirm: ()=>this._saveArea(id),
    });
  },

  _saveArea(id=null) {
    const g = n=>document.getElementById(`area-${n}`);
    if (!g('nome')?.value.trim()) { UI.toast('Informe o nome da área.','warning'); return; }
    const record = { nome:g('nome').value.trim(), tipo:g('tipo')?.value||'', descricao:g('desc')?.value.trim()||'', ativa:g('ativa')?.checked??true };
    if (id) { Storage.update(this.SK_AREAS,id,record); UI.toast('Área atualizada!','success'); }
    else    { Storage.create(this.SK_AREAS,record);    UI.toast('Área criada!','success');     }
    UI.closeModal();
    this.render();
  },

  async _deleteArea(id) {
    if (!await UI.confirm('Excluir esta área?','Excluir')) return;
    Storage.delete(this.SK_AREAS,id);
    UI.toast('Área excluída.','success');
    this.render();
  },

  /* ── TAB: GRUPOS ──────────────────────────────────────────── */
  _renderGrupos() {
    const all = this.getGrupos();
    if (!all.length) return `
      <div class="empty-state" style="margin-top:32px;">
        <div class="empty-icon">👥</div>
        <div class="empty-title">Nenhum grupo cadastrado</div>
        <div class="empty-desc">Crie grupos internos ou prestadores externos.</div>
        <button class="btn btn-primary mt-16" onclick="ManutencaoModule.openModalGrupo()">+ Novo Grupo</button>
      </div>`;
    return `
      <div class="cards-grid">
        ${all.map(g=>`
          <div class="arena-card">
            <div class="arena-card-top">
              <span class="card-status-badge"><span class="badge ${g.tipo==='externo'?'badge-warning':'badge-blue'}">${g.tipo==='externo'?'Prestador':'Interno'}</span></span>
              <div style="font-size:28px;margin-bottom:6px;">👥</div>
              <div class="arena-name">${UI.escape(g.nome)}</div>
              ${g.especialidade?`<div class="arena-code">${UI.escape(g.especialidade)}</div>`:''}
            </div>
            ${g.contato?`<div class="arena-details"><div class="detail-item"><div class="detail-label">Contato</div><div class="detail-value">${UI.escape(g.contato)}</div></div></div>`:''}
            <div class="arena-actions">
              <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule.openModalGrupo('${g.id}')">✏️ Editar</button>
              <span class="spacer"></span>
              <button class="btn btn-ghost btn-sm danger" onclick="ManutencaoModule._deleteGrupo('${g.id}')">🗑️</button>
            </div>
          </div>`).join('')}
      </div>`;
  },

  openModalGrupo(id=null) {
    const item   = id?Storage.getById(this.SK_GRUP,id):null;
    const isEdit = !!item;
    const v      = (f,fb='')=>item?UI.escape(String(item[f]??fb)):fb;
    UI.openModal({
      title: isEdit?`Editar — ${item.nome}`:'Novo Grupo de Manutenção',
      content: `
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Nome <span class="required-star">*</span></label>
            <input id="grp-nome" type="text" class="form-input" placeholder="ex: Equipe Elétrica"
              value="${v('nome')}" required /></div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Tipo</label>
              <select id="grp-tipo" class="form-select">
                <option value="interno" ${(item?.tipo||'interno')==='interno'?'selected':''}>Interno</option>
                <option value="externo" ${item?.tipo==='externo'?'selected':''}>Prestador Externo</option>
              </select></div>
            <div class="form-group"><label class="form-label">Especialidade</label>
              <input id="grp-esp" type="text" class="form-input" placeholder="ex: Elétrica, Hidráulica"
                value="${v('especialidade')}" /></div>
          </div>
          <div class="form-group"><label class="form-label">Contato (e-mail ou telefone)</label>
            <input id="grp-contato" type="text" class="form-input" value="${v('contato')}" /></div>
          <div class="form-group"><label class="form-label">Observações</label>
            <textarea id="grp-obs" class="form-textarea" rows="2">${item?UI.escape(item.obs||''):''}</textarea></div>
        </div>`,
      confirmLabel: isEdit?'Salvar':'Criar Grupo',
      onConfirm: ()=>this._saveGrupo(id),
    });
  },

  _saveGrupo(id=null) {
    const g = n=>document.getElementById(`grp-${n}`);
    if (!g('nome')?.value.trim()) { UI.toast('Informe o nome do grupo.','warning'); return; }
    const record = { nome:g('nome').value.trim(), tipo:g('tipo')?.value||'interno', especialidade:g('esp')?.value.trim()||'', contato:g('contato')?.value.trim()||'', obs:g('obs')?.value.trim()||'' };
    if (id) { Storage.update(this.SK_GRUP,id,record); UI.toast('Grupo atualizado!','success'); }
    else    { Storage.create(this.SK_GRUP,record);    UI.toast('Grupo criado!','success');     }
    UI.closeModal();
    this.render();
  },

  async _deleteGrupo(id) {
    if (!await UI.confirm('Excluir este grupo?','Excluir')) return;
    Storage.delete(this.SK_GRUP,id);
    UI.toast('Grupo excluído.','success');
    this.render();
  },

  /* ── TAB: ESTATÍSTICAS ────────────────────────────────────── */
  _renderStats() {
    const all        = this.getAll();
    const concluidos = all.filter(m=>m.status==='concluido');
    const now        = new Date();

    const tempos = concluidos.filter(m=>m.dataAbertura&&m.dataConclusao)
      .map(m=>Math.round((new Date(m.dataConclusao)-new Date(m.dataAbertura))/86400000));
    const tempoMedio = tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : 0;

    const custoTotal = all.reduce((s,m)=>{
      const mat=(m.materiais||[]).reduce((sm,mt)=>sm+(parseFloat(mt.custoUnit||0)*(parseInt(mt.qtd)||1)),0);
      return s+mat+(parseFloat(m.custoMaoObra)||0);
    },0);

    const finalizados   = all.filter(m=>['concluido','cancelado'].includes(m.status));
    const noPrazo       = finalizados.filter(m=>m.prazo&&m.dataConclusao&&new Date(m.dataConclusao)<=new Date(m.prazo)).length;
    const slaCompliance = finalizados.length ? Math.round((noPrazo/finalizados.length)*100) : 0;

    const porUrgencia = Object.entries(this.URGENCIA).map(([k,v])=>({
      label:`${v.icon} ${v.label}`, badge:v.badge,
      total: all.filter(m=>m.urgencia===k).length,
      ativos:all.filter(m=>m.urgencia===k&&!['concluido','cancelado'].includes(m.status)).length,
    }));

    const porTipo = Object.entries(this.TIPO).map(([k,v])=>({
      label:`${v.icon} ${v.label}`,
      total:all.filter(m=>m.tipo===k).length,
    }));

    const porArea = this.getAreas().map(a=>({
      nome:a.nome, total:all.filter(m=>m.areaId===a.id).length,
    })).filter(a=>a.total>0).sort((a,b)=>b.total-a.total).slice(0,5);

    return `
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:24px;">
        <div class="stat-card"><div class="stat-icon blue">🔧</div><div class="stat-info"><div class="stat-value">${all.length}</div><div class="stat-label">Total Chamados</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">${concluidos.length}</div><div class="stat-label">Concluídos</div></div></div>
        <div class="stat-card"><div class="stat-icon amber">⏱️</div><div class="stat-info"><div class="stat-value">${tempoMedio}d</div><div class="stat-label">Tempo médio</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">💰</div><div class="stat-info"><div class="stat-value">${custoTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div><div class="stat-label">Custo total</div></div></div>
        <div class="stat-card"><div class="stat-icon ${slaCompliance>=80?'green':slaCompliance>=50?'amber':'red'}">🎯</div><div class="stat-info"><div class="stat-value">${slaCompliance}%</div><div class="stat-label">Conform. SLA</div></div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
        <div class="card" style="padding:16px;">
          <h4 style="font-size:13px;font-weight:700;margin-bottom:12px;">Por Urgência</h4>
          ${porUrgencia.map(u=>`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;">
              <span>${u.label}</span>
              <div style="display:flex;gap:6px;align-items:center;">
                ${u.ativos>0?`<span class="badge badge-danger" style="font-size:10px;">${u.ativos} ativos</span>`:''}
                <strong>${u.total}</strong>
              </div>
            </div>`).join('')}
        </div>
        <div class="card" style="padding:16px;">
          <h4 style="font-size:13px;font-weight:700;margin-bottom:12px;">Por Tipo</h4>
          ${porTipo.map(t=>`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;">
              <span>${t.label}</span><strong>${t.total}</strong>
            </div>`).join('')}
        </div>
      </div>

      ${porArea.length?`
      <div class="card" style="padding:16px;">
        <h4 style="font-size:13px;font-weight:700;margin-bottom:12px;">🗺️ Áreas com mais ocorrências</h4>
        ${porArea.map((a,i)=>{
          const pct = all.length?Math.round((a.total/all.length)*100):0;
          return `
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span>${i+1}. ${UI.escape(a.nome)}</span>
                <strong>${a.total} chamado${a.total!==1?'s':''}</strong>
              </div>
              <div style="background:var(--bg-secondary);border-radius:4px;height:6px;">
                <div style="background:var(--color-primary);border-radius:4px;height:6px;width:${pct}%;"></div>
              </div>
            </div>`;
        }).join('')}
      </div>`:''}`;
  },

  /* ── CHECKLIST EDITOR ─────────────────────────────────────── */
  _renderCLEditor(key) {
    const items = this._state[key]||[];
    const html  = items.length
      ? items.map((it,idx)=>`
          <div class="checklist-edit-item">
            <input class="form-input" style="flex:1;font-size:13px;" value="${UI.escape(it.texto)}"
              oninput="ManutencaoModule._updateCLItem('${key}',${idx},this.value)" />
            <button class="btn btn-ghost btn-sm danger" style="padding:4px 8px;"
              onclick="ManutencaoModule._removeCLItem('${key}',${idx})">✕</button>
          </div>`).join('')
      : `<div class="cl-empty">Nenhum item. Adicione abaixo.</div>`;
    return `
      <div id="cl-editor-${key}">${html}</div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <input id="cl-new-${key}" type="text" class="form-input" style="flex:1;font-size:13px;"
          placeholder="Novo item…"
          onkeydown="if(event.key==='Enter'){event.preventDefault();ManutencaoModule._addCLItem('${key}');}" />
        <button class="btn btn-secondary btn-sm" onclick="ManutencaoModule._addCLItem('${key}')">+ Add</button>
      </div>`;
  },

  _addCLItem(key) {
    const inp = document.getElementById(`cl-new-${key}`);
    if (!inp?.value.trim()) return;
    if (!this._state[key]) this._state[key]=[];
    this._state[key].push({ id:Storage.generateId(), texto:inp.value.trim() });
    inp.value='';
    this._refreshCLEditor(key);
  },
  _removeCLItem(key,idx) { this._state[key].splice(idx,1); this._refreshCLEditor(key); },
  _updateCLItem(key,idx,val) { if (this._state[key]?.[idx]) this._state[key][idx].texto=val; },
  _refreshCLEditor(key) {
    const el = document.getElementById(`cl-editor-${key}`);
    if (!el) return;
    const items = this._state[key]||[];
    el.innerHTML = items.length
      ? items.map((it,idx)=>`
          <div class="checklist-edit-item">
            <input class="form-input" style="flex:1;font-size:13px;" value="${UI.escape(it.texto)}"
              oninput="ManutencaoModule._updateCLItem('${key}',${idx},this.value)" />
            <button class="btn btn-ghost btn-sm danger" style="padding:4px 8px;"
              onclick="ManutencaoModule._removeCLItem('${key}',${idx})">✕</button>
          </div>`).join('')
      : `<div class="cl-empty">Nenhum item.</div>`;
  },

  /* ── MISC ─────────────────────────────────────────────────── */
  _setState(k,v) { this._state[k]=v; },

  _reRenderCards() {
    const f   = this.getFiltered();
    const g   = document.getElementById('manutencao-grid');
    if (g) g.innerHTML = f.length?f.map(m=>this._renderRow(m)).join(''):this._renderEmpty();
    const cnt = document.querySelector('.results-count');
    if (cnt) cnt.textContent=`${f.length} chamado${f.length!==1?'s':''}`;
  },

  _renderEmpty() {
    const s = this._state;
    const filtered = s.search||s.filterStatus||s.filterUrgencia||s.filterTipo||s.filterArea;
    return filtered
      ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-title">Nenhum chamado encontrado</div><button class="btn btn-secondary mt-16" onclick="ManutencaoModule.clearFilters()">Limpar filtros</button></div>`
      : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔧</div><div class="empty-title">Nenhum chamado de manutenção</div><div class="empty-desc">Abra um chamado ou execute um checklist de inspeção.</div><button class="btn btn-primary mt-16" onclick="ManutencaoModule.openModalChamado()">+ Abrir primeiro chamado</button></div>`;
  },

  clearFilters() {
    Object.assign(this._state,{search:'',filterStatus:'',filterUrgencia:'',filterTipo:'',filterArea:''});
    this.render();
  },
};
