'use strict';

const FornecedoresModule = {
  SK:         'loja_fornecedores',
  SK_COMP:    'loja_compras',
  SK_REQ:     'forn_requisitos',       // requisitos por categoria
  SK_QUALIF:  'forn_qualificacoes',    // fornecedor × categoria
  SK_REQIT:   'forn_qualif_requisitos',// itens atendidos
  SK_CRIT:    'forn_criterios',        // critérios de avaliação
  SK_AVAL:    'forn_avaliacoes',       // avaliações

  _state: {
    tab:          'fornecedores',
    search:       '',
    filterStatus: '',
    filterCat:    '',
    filterForn:   '',
    filterMes:    '',
  },

  CATEGORIA: {
    reagentes:     { label: 'Reagentes',     icon: '🧪' },
    materiais:     { label: 'Materiais',     icon: '🧱' },
    equipamentos:  { label: 'Equipamentos',  icon: '🔧' },
    servicos:      { label: 'Serviços',      icon: '⚙️'  },
    produtos:      { label: 'Produtos',      icon: '📦' },
    outros:        { label: 'Outros',        icon: '📋' },
  },

  TIPO_REQ: {
    documento:      { label: 'Documento',       icon: '📄' },
    certificacao:   { label: 'Certificação',    icon: '🏅' },
    amostra:        { label: 'Amostra',         icon: '🧫' },
    visita_tecnica: { label: 'Visita Técnica',  icon: '🏭' },
  },

  STATUS_QUALIF: {
    pendente:    { label: 'Pendente',    badge: 'badge-gray',    icon: '⏳' },
    em_analise:  { label: 'Em Análise', badge: 'badge-warning', icon: '🔍' },
    qualificado: { label: 'Qualificado',badge: 'badge-success', icon: '✅' },
    reprovado:   { label: 'Reprovado',  badge: 'badge-danger',  icon: '❌' },
  },

  /* Escala de notas → status */
  _notaParaStatus(nota) {
    if (nota < 4)  return { key:'suspenso',        label:'Suspenso',          badge:'badge-danger',  icon:'🔴' };
    if (nota < 6)  return { key:'semi_qualificado', label:'Semi-qualificado',  badge:'badge-warning', icon:'🟡' };
    if (nota < 8)  return { key:'qualificado',      label:'Qualificado',       badge:'badge-success', icon:'🟢' };
    return               { key:'super_qualificado', label:'Super Qualificado', badge:'badge-blue',    icon:'⭐' };
  },

  /* Calcula nota ponderada e status de um fornecedor */
  _calcStatusFornecedor(fornId) {
    const avaliacoes = Storage.getAll(this.SK_AVAL).filter(a => a.fornecedorId === fornId);
    if (!avaliacoes.length) return null;
    const ultima = avaliacoes.sort((a,b)=>(b.data||'').localeCompare(a.data||''))[0];
    return { nota: ultima.notaTotal, status: this._notaParaStatus(ultima.notaTotal), data: ultima.data };
  },

  /* Verifica se fornecedor está qualificado para uma categoria */
  isQualificado(fornId, categoria) {
    const q = Storage.getAll(this.SK_QUALIF)
      .find(q => q.fornecedorId === fornId && q.categoria === categoria && q.status === 'qualificado');
    if (!q) return false;
    if (q.dataValidade && q.dataValidade < new Date().toISOString().slice(0,10)) return false;
    return true;
  },

  AVALIACAO: { 1:'⭐', 2:'⭐⭐', 3:'⭐⭐⭐', 4:'⭐⭐⭐⭐', 5:'⭐⭐⭐⭐⭐' },

  getAll()   { return Storage.getAll(this.SK); },
  getCompras(){ return Storage.getAll(this.SK_COMP); },

  getFiltered() {
    const { search, filterStatus, filterCat } = this._state;
    return this.getAll()
      .sort((a,b) => (a.nome||'').localeCompare(b.nome||''))
      .filter(f => {
        const q = search.toLowerCase();
        const matchQ = !q ||
          (f.nome||'').toLowerCase().includes(q) ||
          (f.cnpj||'').toLowerCase().includes(q) ||
          (f.contato||'').toLowerCase().includes(q) ||
          (f.email||'').toLowerCase().includes(q) ||
          (f.cidade||'').toLowerCase().includes(q);
        return matchQ &&
          (!filterStatus || (filterStatus === 'inativo' ? f.ativo === false : f.ativo !== false)) &&
          (!filterCat    || f.categoria === filterCat);
      });
  },

  getComprasFiltradas() {
    const { filterForn, filterMes } = this._state;
    return this.getCompras()
      .filter(c =>
        (!filterForn || c.fornecedorId === filterForn) &&
        (!filterMes  || (c.data||'').startsWith(filterMes))
      )
      .sort((a,b) => (b.data||'').localeCompare(a.data||''));
  },

  getStats() {
    const forns  = this.getAll();
    const compras = this.getCompras();
    const totalGasto = compras.reduce((s,c) => s + (parseFloat(c.total)||0), 0);
    const ativos  = forns.filter(f => f.ativo !== false).length;
    const inativos = forns.length - ativos;

    const gastoPorForn = {};
    compras.forEach(c => {
      const k = c.fornecedorId || '__sem__';
      gastoPorForn[k] = (gastoPorForn[k]||0) + (parseFloat(c.total)||0);
    });

    const ranking = forns
      .map(f => ({ ...f, totalGasto: gastoPorForn[f.id]||0, nCompras: compras.filter(c=>c.fornecedorId===f.id).length }))
      .sort((a,b) => b.totalGasto - a.totalGasto)
      .slice(0, 8);

    const gastoMes = {};
    compras.forEach(c => {
      const mes = (c.data||'').slice(0,7);
      if (mes) gastoMes[mes] = (gastoMes[mes]||0) + (parseFloat(c.total)||0);
    });
    const meses = Object.entries(gastoMes).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);

    return { total: forns.length, ativos, inativos, totalGasto, ranking, meses, nCompras: compras.length };
  },

  /* ── RENDER PRINCIPAL ─────────────────────────────────────── */
  render() {
    const area = document.getElementById('content-area');
    if (!area) return;
    const tab = this._state.tab;

    const tabs = [
      { k:'fornecedores', icon:'🚚', label:'Fornecedores' },
      { k:'qualificacao', icon:'🏅', label:'Qualificação'  },
      { k:'requisitos',   icon:'📋', label:'Requisitos'    },
      { k:'avaliacoes',   icon:'⭐', label:'Avaliações'    },
      { k:'compras',      icon:'🛒', label:'Compras'       },
      { k:'stats',        icon:'📊', label:'Estatísticas'  },
    ];

    const btnMap = {
      fornecedores: { label:'+ Novo Fornecedor',    fn:'FornecedoresModule.openModal()' },
      requisitos:   { label:'+ Novo Requisito',     fn:'FornecedoresModule.openModalRequisito()' },
      qualificacao: { label:'+ Qualificar Fornecedor', fn:'FornecedoresModule.openModalQualif()' },
      avaliacoes:   { label:'+ Nova Avaliação',     fn:'FornecedoresModule.openModalAvaliacao()' },
      compras:      { label:'+ Registrar Compra',   fn:'FornecedoresModule.openModalCompra()' },
    };
    const btn = btnMap[tab];

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>🚚 Fornecedores</h2>
          <p>Cadastro de fornecedores, histórico de compras e análises</p>
        </div>
        ${btn ? `<button class="btn btn-primary" onclick="${btn.fn}">${btn.label}</button>` : ''}
      </div>
      <div class="tabs-bar">
        ${tabs.map(t=>`<button class="tab-btn ${tab===t.k?'active':''}" onclick="FornecedoresModule.switchTab('${t.k}')">${t.icon} ${t.label}</button>`).join('')}
      </div>
      <div id="tab-content">${this._renderTab(tab)}</div>`;
  },

  switchTab(t) { this._state.tab = t; this.render(); },

  _renderTab(tab) {
    switch (tab) {
      case 'fornecedores': return this._renderFornecedores();
      case 'qualificacao': return this._renderQualificacao();
      case 'requisitos':   return this._renderRequisitos();
      case 'avaliacoes':   return this._renderAvaliacoes();
      case 'compras':      return this._renderCompras();
      case 'stats':        return this._renderStats();
      default:             return '';
    }
  },

  /* ── TAB: FORNECEDORES ──────────────────────────────────── */
  _renderFornecedores() {
    const filtered = this.getFiltered();
    const stats    = this.getStats();

    return `
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:20px;">
        <div class="stat-card"><div class="stat-icon blue">🚚</div><div class="stat-info"><div class="stat-value">${stats.total}</div><div class="stat-label">Total</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">${stats.ativos}</div><div class="stat-label">Ativos</div></div></div>
        <div class="stat-card"><div class="stat-icon gray">❌</div><div class="stat-info"><div class="stat-value">${stats.inativos}</div><div class="stat-label">Inativos</div></div></div>
        <div class="stat-card"><div class="stat-icon amber">🛒</div><div class="stat-info"><div class="stat-value">${stats.nCompras}</div><div class="stat-label">Compras</div></div></div>
        <div class="stat-card"><div class="stat-icon green">💰</div><div class="stat-info"><div class="stat-value" style="font-size:15px;">${stats.totalGasto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div><div class="stat-label">Total gasto</div></div></div>
      </div>

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="Buscar por nome, CNPJ, contato…"
            value="${UI.escape(this._state.search)}"
            oninput="FornecedoresModule._setState('search',this.value);FornecedoresModule._reRender()" />
        </div>
        <select class="filter-select" onchange="FornecedoresModule._setState('filterStatus',this.value);FornecedoresModule._reRender()">
          <option value="">Todos os status</option>
          <option value="ativo"   ${this._state.filterStatus==='ativo'  ?'selected':''}>✅ Ativos</option>
          <option value="inativo" ${this._state.filterStatus==='inativo'?'selected':''}>❌ Inativos</option>
        </select>
        <select class="filter-select" onchange="FornecedoresModule._setState('filterCat',this.value);FornecedoresModule._reRender()">
          <option value="">Todas as categorias</option>
          ${Object.entries(this.CATEGORIA).map(([k,v])=>`<option value="${k}" ${this._state.filterCat===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
        </select>
        <span class="results-count">${filtered.length} fornecedor${filtered.length!==1?'es':''}</span>
      </div>

      <div id="forn-lista">
        ${this._renderLista(filtered)}
      </div>`;
  },

  _renderLista(forns) {
    if (!forns.length) return `
      <div class="empty-state">
        <div class="empty-icon">🚚</div>
        <div class="empty-title">Nenhum fornecedor encontrado</div>
        <div class="empty-desc">Cadastre um fornecedor ou ajuste os filtros.</div>
        <button class="btn btn-primary mt-16" onclick="FornecedoresModule.openModal()">+ Novo Fornecedor</button>
      </div>`;

    const compras = this.getCompras();
    return `
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th style="text-align:right;">Compras</th>
                <th style="text-align:right;">Total gasto</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${forns.map(f => {
                const cat    = this.CATEGORIA[f.categoria] || { icon:'📋', label:'—' };
                const ativo  = f.ativo !== false;
                const nComp  = compras.filter(c=>c.fornecedorId===f.id).length;
                const gasto  = compras.filter(c=>c.fornecedorId===f.id).reduce((s,c)=>s+(parseFloat(c.total)||0),0);
                return `
                <tr style="cursor:pointer;" onclick="FornecedoresModule.abrirDetalhe('${f.id}')">
                  <td>
                    <strong>${UI.escape(f.nome)}</strong>
                    ${f.avaliacao ? `<div style="font-size:11px;">${this.AVALIACAO[f.avaliacao]||''}</div>` : ''}
                    ${f.cidade ? `<div style="font-size:11px;color:var(--text-muted);">📍 ${UI.escape(f.cidade)}${f.estado?' — '+f.estado:''}</div>` : ''}
                  </td>
                  <td>${cat.icon} ${cat.label}</td>
                  <td>${UI.escape(f.cnpj||'—')}</td>
                  <td>${UI.escape(f.contato||'—')}</td>
                  <td>${f.telefone?`<a href="tel:${f.telefone}" onclick="event.stopPropagation()">${UI.escape(f.telefone)}</a>`:'—'}</td>
                  <td>${f.email?`<a href="mailto:${f.email}" onclick="event.stopPropagation()">${UI.escape(f.email)}</a>`:'—'}</td>
                  <td style="text-align:right;">${nComp}</td>
                  <td style="text-align:right;font-weight:${gasto?'700':'400'};">${gasto?gasto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—'}</td>
                  <td><span class="badge ${ativo?'badge-success':'badge-gray'}">${ativo?'Ativo':'Inativo'}</span></td>
                  <td onclick="event.stopPropagation()">
                    <button class="btn btn-ghost btn-sm" title="Editar" onclick="FornecedoresModule.openModal('${f.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm danger" title="Excluir" onclick="FornecedoresModule.deletar('${f.id}')">🗑️</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  /* ── DETALHE DO FORNECEDOR ──────────────────────────────── */
  abrirDetalhe(id) {
    const f = Storage.getById(this.SK, id);
    if (!f) return;

    const cat     = this.CATEGORIA[f.categoria] || { icon:'📋', label:'—' };
    const compras = this.getCompras().filter(c => c.fornecedorId === id)
      .sort((a,b) => (b.data||'').localeCompare(a.data||''));
    const totalGasto = compras.reduce((s,c) => s+(parseFloat(c.total)||0), 0);
    const ativo   = f.ativo !== false;

    UI.openModal({
      title: `${f.nome}`,
      wide: true,
      content: `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
          <span class="badge ${ativo?'badge-success':'badge-gray'}">${ativo?'Ativo':'Inativo'}</span>
          <span class="badge badge-blue">${cat.icon} ${cat.label}</span>
          ${f.avaliacao ? `<span class="badge badge-amber">${this.AVALIACAO[f.avaliacao]||''}</span>` : ''}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:16px;font-size:13px;">
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">CNPJ</span><div style="font-weight:600;">${UI.escape(f.cnpj||'—')}</div></div>
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Contato</span><div style="font-weight:600;">${UI.escape(f.contato||'—')}</div></div>
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Telefone</span><div>${f.telefone?`<a href="tel:${f.telefone}">${UI.escape(f.telefone)}</a>`:'—'}</div></div>
          <div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">E-mail</span><div>${f.email?`<a href="mailto:${f.email}">${UI.escape(f.email)}</a>`:'—'}</div></div>
          ${f.site?`<div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Site</span><div><a href="${UI.escape(f.site)}" target="_blank">${UI.escape(f.site)}</a></div></div>`:''}
          ${f.cidade?`<div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Cidade / Estado</span><div>${UI.escape(f.cidade)}${f.estado?' — '+f.estado:''}</div></div>`:''}
          ${f.prazoEntregaDias?`<div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Prazo de entrega</span><div>${f.prazoEntregaDias} dia${f.prazoEntregaDias!=1?'s':''}</div></div>`:''}
          ${f.condicoesPagamento?`<div><span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Condições de pagamento</span><div>${UI.escape(f.condicoesPagamento)}</div></div>`:''}
        </div>

        ${f.observacoes?`<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;">💬 ${UI.escape(f.observacoes)}</div>`:''}

        <div style="display:flex;gap:16px;margin-bottom:20px;padding:12px;background:var(--bg-secondary);border-radius:8px;text-align:center;">
          <div style="flex:1;"><div style="font-size:20px;font-weight:700;">${compras.length}</div><div style="font-size:12px;color:var(--text-muted);">compras</div></div>
          <div style="flex:1;border-left:1px solid var(--card-border);padding-left:16px;"><div style="font-size:18px;font-weight:700;">${totalGasto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div><div style="font-size:12px;color:var(--text-muted);">total gasto</div></div>
        </div>

        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h4 style="font-size:13px;font-weight:700;margin:0;">🛒 Histórico de Compras</h4>
            <button class="btn btn-secondary btn-sm" onclick="UI.closeModal();setTimeout(()=>FornecedoresModule.openModalCompra(null,'${f.id}'),150)">+ Registrar Compra</button>
          </div>
          ${compras.length ? `
          <div class="table-wrapper" style="margin:0;max-height:280px;overflow-y:auto;">
            <table class="data-table" style="font-size:12px;">
              <thead><tr><th>Data</th><th>NF</th><th>Itens</th><th style="text-align:right;">Total</th><th>Obs.</th></tr></thead>
              <tbody>
                ${compras.map(c=>`
                <tr>
                  <td>${UI.formatDate(c.data)}</td>
                  <td>${UI.escape(c.nf||'—')}</td>
                  <td>${(c.itens||[]).length} item${(c.itens||[]).length!==1?'s':''}</td>
                  <td style="text-align:right;font-weight:700;">${(parseFloat(c.total)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                  <td style="color:var(--text-muted);">${UI.escape(c.obs||'')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px 0;">Nenhuma compra registrada para este fornecedor.</div>`}
        </div>`,
      hideFooter: true,
    });
  },

  /* ── TAB: COMPRAS ───────────────────────────────────────── */
  _renderCompras() {
    const forns   = this.getAll().sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
    const comp    = this.getComprasFiltradas();
    const totalFilt = comp.reduce((s,c)=>s+(parseFloat(c.total)||0),0);

    const fornOpts = `<option value="">Todos os fornecedores</option>` +
      forns.map(f=>`<option value="${f.id}" ${this._state.filterForn===f.id?'selected':''}>${UI.escape(f.nome)}</option>`).join('');

    return `
      <div class="filters-bar">
        <select class="filter-select" style="min-width:200px;" onchange="FornecedoresModule._setState('filterForn',this.value);FornecedoresModule._reRender()">
          ${fornOpts}
        </select>
        <input type="month" class="filter-select" style="min-width:140px;cursor:pointer;"
          value="${this._state.filterMes}"
          onchange="FornecedoresModule._setState('filterMes',this.value);FornecedoresModule._reRender()" />
        <span class="results-count">${comp.length} compra${comp.length!==1?'s':''} · ${totalFilt.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
      </div>

      ${comp.length ? `
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Fornecedor</th>
                <th>NF / Ref.</th>
                <th>Itens</th>
                <th style="text-align:right;">Total</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${comp.map(c => `
              <tr>
                <td>${UI.formatDate(c.data)}</td>
                <td><strong>${UI.escape(c.fornecedorNome||'—')}</strong></td>
                <td>${UI.escape(c.nf||'—')}</td>
                <td>
                  ${(c.itens||[]).length} item${(c.itens||[]).length!==1?'s':''}
                  ${(c.itens||[]).slice(0,2).map(i=>`<div style="font-size:11px;color:var(--text-muted);">${UI.escape(i.produtoNome||i.nome||'')} × ${i.qtd||1}</div>`).join('')}
                  ${(c.itens||[]).length>2?`<div style="font-size:11px;color:var(--text-muted);">+${(c.itens||[]).length-2} mais</div>`:''}
                </td>
                <td style="text-align:right;font-weight:700;">${(parseFloat(c.total)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td style="color:var(--text-muted);font-size:12px;">${UI.escape(c.obs||'')}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align:right;font-weight:600;">Total:</td>
                <td style="text-align:right;font-weight:700;">${totalFilt.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>` : `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <div class="empty-title">Nenhuma compra encontrada</div>
        <div class="empty-desc">Ajuste os filtros ou registre uma compra.</div>
        <button class="btn btn-primary mt-16" onclick="FornecedoresModule.openModalCompra()">+ Registrar Compra</button>
      </div>`}`;
  },

  /* ── TAB: ESTATÍSTICAS ──────────────────────────────────── */
  _renderStats() {
    const stats = this.getStats();
    const fmt   = v => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const max   = stats.ranking[0]?.totalGasto || 1;

    const catCount = {};
    this.getAll().forEach(f => { const c = f.categoria||'outros'; catCount[c]=(catCount[c]||0)+1; });

    return `
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:24px;">
        <div class="stat-card"><div class="stat-icon blue">🚚</div><div class="stat-info"><div class="stat-value">${stats.total}</div><div class="stat-label">Fornecedores</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">${stats.ativos}</div><div class="stat-label">Ativos</div></div></div>
        <div class="stat-card"><div class="stat-icon amber">🛒</div><div class="stat-info"><div class="stat-value">${stats.nCompras}</div><div class="stat-label">Compras</div></div></div>
        <div class="stat-card"><div class="stat-icon green">💰</div><div class="stat-info"><div class="stat-value" style="font-size:14px;">${fmt(stats.totalGasto)}</div><div class="stat-label">Total gasto</div></div></div>
      </div>

      <div class="form-grid-2" style="margin-bottom:24px;">

        <!-- Ranking fornecedores -->
        <div class="card">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="margin:0;font-size:14px;font-weight:700;">🏆 Maiores fornecedores (por gasto)</h3>
          </div>
          <div class="card-body" style="padding:16px;">
            ${stats.ranking.length ? stats.ranking.map((f,i) => {
              const pct = max>0 ? Math.round((f.totalGasto/max)*100) : 0;
              const cor = i===0?'#3b9e8f':i===1?'#f59e0b':i===2?'#e06b4f':'#94a3b8';
              return `
              <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                  <span style="font-weight:${i<3?'700':'400'}">${i+1}. ${UI.escape(f.nome)}</span>
                  <span style="color:var(--text-muted);font-size:12px;">${f.nCompras} compra${f.nCompras!==1?'s':''} · <strong>${fmt(f.totalGasto)}</strong></span>
                </div>
                <div style="height:6px;background:var(--bg-secondary);border-radius:99px;overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:${cor};border-radius:99px;"></div>
                </div>
              </div>`;
            }).join('') : '<div style="color:var(--text-muted);font-size:13px;">Sem compras registradas.</div>'}
          </div>
        </div>

        <!-- Gastos por mês -->
        <div class="card">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="margin:0;font-size:14px;font-weight:700;">📅 Gastos por mês (últimos 6 meses)</h3>
          </div>
          <div class="card-body" style="padding:16px;">
            ${stats.meses.length ? (() => {
              const maxMes = Math.max(...stats.meses.map(([,v])=>v),1);
              return stats.meses.map(([mes, val]) => {
                const [y,m] = mes.split('-');
                const label = new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
                const pct   = Math.round((val/maxMes)*100);
                return `
                <div style="margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                    <span>${label}</span><span style="font-weight:700;">${fmt(val)}</span>
                  </div>
                  <div style="height:8px;background:var(--bg-secondary);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:var(--color-primary);border-radius:99px;"></div>
                  </div>
                </div>`;
              }).join('');
            })() : '<div style="color:var(--text-muted);font-size:13px;">Sem dados de compras.</div>'}
          </div>
        </div>

      </div>

      <!-- Categorias -->
      <div class="card">
        <div class="card-header" style="padding:14px 18px;"><h3 style="margin:0;font-size:14px;font-weight:700;">📦 Distribuição por categoria</h3></div>
        <div class="card-body" style="padding:16px;display:flex;flex-wrap:wrap;gap:12px;">
          ${Object.entries(this.CATEGORIA).map(([k,v]) => {
            const n = catCount[k]||0;
            return `<div style="background:var(--bg-secondary);border-radius:10px;padding:12px 20px;text-align:center;min-width:110px;">
              <div style="font-size:24px;">${v.icon}</div>
              <div style="font-size:20px;font-weight:700;margin:4px 0;">${n}</div>
              <div style="font-size:12px;color:var(--text-muted);">${v.label}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  /* ── MODAL FORNECEDOR ───────────────────────────────────── */
  openModal(id=null) {
    const f    = id ? Storage.getById(this.SK, id) : null;
    const isEd = !!f;
    const v    = (k,fb='') => f ? UI.escape(String(f[k]??fb)) : fb;

    const catOpts = Object.entries(this.CATEGORIA)
      .map(([k,c])=>`<option value="${k}" ${(f?.categoria||'produtos')===k?'selected':''}>${c.icon} ${c.label}</option>`)
      .join('');

    const avOpts = [1,2,3,4,5].map(n=>`<option value="${n}" ${(f?.avaliacao||0)==n?'selected':''}>${this.AVALIACAO[n]}</option>`).join('');

    UI.openModal({
      title: isEd ? `Editar — ${f.nome}` : '🚚 Novo Fornecedor',
      wide: true,
      content: `
        <div class="form-grid">

          <div class="form-group">
            <label class="form-label">Nome / Razão Social <span class="required-star">*</span></label>
            <input id="fn-nome" class="form-input" value="${v('nome')}" autocomplete="off" />
          </div>

          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Categoria</label>
              <select id="fn-cat" class="form-select">${catOpts}</select></div>
            <div class="form-group"><label class="form-label">Avaliação</label>
              <select id="fn-av" class="form-select">
                <option value="">— Não avaliado —</option>${avOpts}
              </select></div>
          </div>

          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">CNPJ / CPF</label>
              <input id="fn-cnpj" class="form-input" value="${v('cnpj')}" placeholder="00.000.000/0001-00" /></div>
            <div class="form-group"><label class="form-label">Nome do contato</label>
              <input id="fn-contato" class="form-input" value="${v('contato')}" /></div>
          </div>

          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Telefone</label>
              <input id="fn-tel" class="form-input" value="${v('telefone')}" placeholder="(00) 00000-0000" /></div>
            <div class="form-group"><label class="form-label">E-mail</label>
              <input id="fn-email" class="form-input" type="email" value="${v('email')}" /></div>
          </div>

          <div class="form-group"><label class="form-label">Site</label>
            <input id="fn-site" class="form-input" value="${v('site')}" placeholder="https://…" /></div>

          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Cidade</label>
              <input id="fn-cidade" class="form-input" value="${v('cidade')}" /></div>
            <div class="form-group"><label class="form-label">Estado</label>
              <input id="fn-estado" class="form-input" value="${v('estado')}" placeholder="SP" maxlength="2" style="text-transform:uppercase;" /></div>
          </div>

          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Prazo de entrega (dias)</label>
              <input id="fn-prazo" class="form-input" type="number" min="0" value="${v('prazoEntregaDias','')}" placeholder="ex: 5" /></div>
            <div class="form-group"><label class="form-label">Condições de pagamento</label>
              <input id="fn-cond" class="form-input" value="${v('condicoesPagamento')}" placeholder="ex: 30/60 dias, boleto" /></div>
          </div>

          <div class="form-group"><label class="form-label">Observações</label>
            <textarea id="fn-obs" class="form-textarea" rows="2">${f?UI.escape(f.observacoes||''):''}</textarea></div>

          ${isEd?`
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="fn-ativo" class="form-select">
              <option value="ativo"   ${f.ativo!==false?'selected':''}>✅ Ativo</option>
              <option value="inativo" ${f.ativo===false?'selected':''}>❌ Inativo</option>
            </select>
          </div>`:''}

        </div>`,
      confirmLabel: isEd ? 'Salvar' : 'Cadastrar',
      onConfirm: () => this._save(id),
    });
  },

  _save(id) {
    const nome = document.getElementById('fn-nome')?.value.trim();
    if (!nome) { UI.toast('Informe o nome do fornecedor.', 'warning'); return false; }

    const ativoSel = document.getElementById('fn-ativo')?.value;
    const record = {
      nome,
      categoria:           document.getElementById('fn-cat')?.value        || 'outros',
      avaliacao:           parseInt(document.getElementById('fn-av')?.value)||0,
      cnpj:                document.getElementById('fn-cnpj')?.value.trim()    || '',
      contato:             document.getElementById('fn-contato')?.value.trim() || '',
      telefone:            document.getElementById('fn-tel')?.value.trim()     || '',
      email:               document.getElementById('fn-email')?.value.trim()   || '',
      site:                document.getElementById('fn-site')?.value.trim()    || '',
      cidade:              document.getElementById('fn-cidade')?.value.trim()  || '',
      estado:              (document.getElementById('fn-estado')?.value.trim()||'').toUpperCase(),
      prazoEntregaDias:    parseInt(document.getElementById('fn-prazo')?.value)||0,
      condicoesPagamento:  document.getElementById('fn-cond')?.value.trim()    || '',
      observacoes:         document.getElementById('fn-obs')?.value.trim()     || '',
    };
    if (ativoSel) record.ativo = ativoSel !== 'inativo';

    if (id) {
      Storage.update(this.SK, id, record);
      UI.toast('Fornecedor atualizado.', 'success');
    } else {
      record.ativo = true;
      Storage.create(this.SK, record);
      UI.toast('Fornecedor cadastrado!', 'success');
    }
    UI.closeModal();
    this.render();
  },

  async deletar(id) {
    const f = Storage.getById(this.SK, id);
    if (!f) return;
    const ok = await UI.confirm(`Excluir fornecedor "${f.nome}"? Esta ação não pode ser desfeita.`, 'Excluir');
    if (!ok) return;
    Storage.delete(this.SK, id);
    UI.toast('Fornecedor excluído.', 'success');
    this.render();
  },

  /* ── MODAL COMPRA ───────────────────────────────────────── */
  openModalCompra(compraId=null, fornIdPre='') {
    const forns   = this.getAll().filter(f=>f.ativo!==false).sort((a,b)=>a.nome.localeCompare(b.nome));
    const fornOpts = `<option value="">— Selecionar fornecedor —</option>` +
      forns.map(f=>`<option value="${f.id}" ${(fornIdPre===f.id)?'selected':''}>${UI.escape(f.nome)}</option>`).join('');

    UI.openModal({
      title: '🛒 Registrar Compra',
      wide: true,
      content: `
        <div class="form-grid">
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Fornecedor <span class="required-star">*</span></label>
              <select id="cp-forn" class="form-select">${fornOpts}</select></div>
            <div class="form-group"><label class="form-label">Data <span class="required-star">*</span></label>
              <input id="cp-data" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" /></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Nota fiscal / Ref.</label>
              <input id="cp-nf" class="form-input" placeholder="NF 00000" /></div>
            <div class="form-group"><label class="form-label">Total (R$) <span class="required-star">*</span></label>
              <input id="cp-total" class="form-input" type="number" min="0" step="0.01" placeholder="0,00" /></div>
          </div>

          <div class="form-group">
            <label class="form-label">Itens comprados</label>
            <div id="cp-itens-list" style="margin-bottom:8px;"></div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="FornecedoresModule._addItemLinha()">+ Adicionar item</button>
          </div>

          <div class="form-group"><label class="form-label">Observações</label>
            <textarea id="cp-obs" class="form-textarea" rows="2" placeholder="Condição de pagamento, data de entrega…"></textarea></div>
        </div>`,
      confirmLabel: 'Registrar Compra',
      onConfirm: () => this._saveCompra(),
    });

    // Inicia com uma linha vazia
    setTimeout(() => this._addItemLinha(), 50);
  },

  _addItemLinha() {
    const list = document.getElementById('cp-itens-list');
    if (!list) return;
    const idx  = list.children.length;
    const div  = document.createElement('div');
    div.style.cssText = 'display:grid;grid-template-columns:1fr 80px 120px auto;gap:8px;margin-bottom:6px;align-items:center;';
    div.innerHTML = `
      <input type="text"   class="form-input" style="font-size:13px;" placeholder="Nome do item" data-field="nome" />
      <input type="number" class="form-input" style="font-size:13px;" placeholder="Qtd" min="1" value="1" data-field="qtd" />
      <input type="number" class="form-input" style="font-size:13px;" placeholder="R$ unit." min="0" step="0.01" data-field="unitario" />
      <button type="button" class="btn btn-ghost btn-sm danger" onclick="this.parentElement.remove()" title="Remover">🗑️</button>`;
    list.appendChild(div);
  },

  _saveCompra() {
    const fornEl = document.getElementById('cp-forn');
    const data   = document.getElementById('cp-data')?.value;
    const total  = parseFloat(document.getElementById('cp-total')?.value);

    if (!fornEl?.value) { UI.toast('Selecione o fornecedor.', 'warning'); return false; }
    if (!data)          { UI.toast('Informe a data.', 'warning');          return false; }
    if (!total || total <= 0) { UI.toast('Informe o valor total.', 'warning'); return false; }

    const fornecedor = Storage.getById(this.SK, fornEl.value);

    const itens = [];
    document.querySelectorAll('#cp-itens-list > div').forEach(row => {
      const nome     = row.querySelector('[data-field="nome"]')?.value.trim();
      const qtd      = parseInt(row.querySelector('[data-field="qtd"]')?.value)||1;
      const unitario = parseFloat(row.querySelector('[data-field="unitario"]')?.value)||0;
      if (nome) itens.push({ nome, qtd, unitario });
    });

    Storage.create(this.SK_COMP, {
      data,
      fornecedorId:   fornecedor?.id   || '',
      fornecedorNome: fornecedor?.nome || '',
      nf:             document.getElementById('cp-nf')?.value.trim()  || '',
      obs:            document.getElementById('cp-obs')?.value.trim() || '',
      itens,
      total,
    });

    UI.toast('Compra registrada!', 'success');
    UI.closeModal();
    this.render();
  },

  /* ── TAB: REQUISITOS DE QUALIFICAÇÃO ───────────────────── */
  _renderRequisitos() {
    const reqs = Storage.getAll(this.SK_REQ)
      .sort((a,b) => (a.categoria||'').localeCompare(b.categoria||''));

    const rows = reqs.map(r => {
      const cat  = this.CATEGORIA[r.categoria] || { icon:'📋', label: r.categoria };
      const tipo = this.TIPO_REQ[r.tipo]       || { icon:'📄', label: r.tipo };
      return `<tr>
        <td>${cat.icon} ${cat.label}</td>
        <td>${tipo.icon} ${tipo.label}</td>
        <td><strong>${UI.escape(r.nome)}</strong><div style="font-size:11px;color:var(--text-muted);">${UI.escape(r.descricao||'')}</div></td>
        <td><span class="badge ${r.obrigatorio?'badge-danger':'badge-gray'}">${r.obrigatorio?'Obrigatório':'Opcional'}</span></td>
        <td class="aluno-row-actions">
          <button class="btn btn-ghost btn-sm" onclick="FornecedoresModule.openModalRequisito('${r.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm danger" onclick="FornecedoresModule.deleteRequisito('${r.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    return `
      ${!reqs.length ? `<div class="empty-state"><div class="empty-icon">📋</div>
        <div class="empty-title">Nenhum requisito cadastrado</div>
        <div class="empty-desc">Defina os requisitos por categoria de produto/serviço.</div>
        <button class="btn btn-primary mt-16" onclick="FornecedoresModule.openModalRequisito()">+ Novo Requisito</button>
      </div>` : `
      <div class="table-card">
        <table class="data-table">
          <thead><tr><th>Categoria</th><th>Tipo</th><th>Requisito</th><th>Obrigatoriedade</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`}`;
  },

  openModalRequisito(id=null) {
    const r    = id ? Storage.getById(this.SK_REQ, id) : null;
    const catOpts = Object.entries(this.CATEGORIA).map(([k,v])=>
      `<option value="${k}" ${r?.categoria===k?'selected':''}>${v.icon} ${v.label}</option>`).join('');
    const tipoOpts = Object.entries(this.TIPO_REQ).map(([k,v])=>
      `<option value="${k}" ${r?.tipo===k?'selected':''}>${v.icon} ${v.label}</option>`).join('');

    UI.openModal({
      title: r ? 'Editar Requisito' : 'Novo Requisito de Qualificação',
      content: `<div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">Categoria <span class="required-star">*</span></label>
            <select id="rq-cat" class="form-select">${catOpts}</select></div>
          <div class="form-group"><label class="form-label">Tipo <span class="required-star">*</span></label>
            <select id="rq-tipo" class="form-select">${tipoOpts}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Nome do requisito <span class="required-star">*</span></label>
          <input id="rq-nome" class="form-input" value="${UI.escape(r?.nome||'')}" placeholder="ex: Licença ANVISA" /></div>
        <div class="form-group"><label class="form-label">Descrição</label>
          <textarea id="rq-desc" class="form-textarea" rows="2">${UI.escape(r?.descricao||'')}</textarea></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="rq-obrig" ${r?.obrigatorio!==false?'checked':''} />
            <span class="form-label" style="margin:0;">Requisito obrigatório</span>
          </label>
        </div>
      </div>`,
      confirmLabel: r ? 'Salvar' : 'Cadastrar',
      onConfirm: () => this._saveRequisito(id),
    });
  },

  _saveRequisito(id) {
    const nome = document.getElementById('rq-nome')?.value.trim();
    if (!nome) { UI.toast('Informe o nome do requisito.', 'warning'); return false; }
    const rec = {
      categoria:   document.getElementById('rq-cat')?.value   || 'outros',
      tipo:        document.getElementById('rq-tipo')?.value  || 'documento',
      nome,
      descricao:   document.getElementById('rq-desc')?.value.trim() || '',
      obrigatorio: document.getElementById('rq-obrig')?.checked !== false,
    };
    if (id) { Storage.update(this.SK_REQ, id, rec); UI.toast('Requisito atualizado.','success'); }
    else    { Storage.create(this.SK_REQ, rec);      UI.toast('Requisito cadastrado!','success'); }
    UI.closeModal(); this.render();
  },

  async deleteRequisito(id) {
    const r = Storage.getById(this.SK_REQ, id);
    if (!r) return;
    const ok = await UI.confirm(`Excluir requisito "${r.nome}"?`, 'Excluir');
    if (!ok) return;
    Storage.delete(this.SK_REQ, id);
    UI.toast('Requisito excluído.', 'success');
    this.render();
  },

  /* ── TAB: QUALIFICAÇÃO POR FORNECEDOR ──────────────────── */
  _renderQualificacao() {
    const qualifs = Storage.getAll(this.SK_QUALIF)
      .sort((a,b) => (a.fornecedorNome||'').localeCompare(b.fornecedorNome||''));

    const hoje = new Date().toISOString().slice(0,10);

    const rows = qualifs.map(q => {
      const cat    = this.CATEGORIA[q.categoria] || { icon:'📋', label: q.categoria };
      const st     = this.STATUS_QUALIF[q.status] || { label: q.status, badge:'badge-gray', icon:'❓' };
      const venceu = q.dataValidade && q.dataValidade < hoje;
      return `<tr>
        <td><strong>${UI.escape(q.fornecedorNome||'—')}</strong></td>
        <td>${cat.icon} ${cat.label}</td>
        <td><span class="badge ${st.badge}">${st.icon} ${st.label}</span>${venceu?'<span class="badge badge-danger" style="margin-left:4px;">⚠ Vencida</span>':''}</td>
        <td style="font-size:12px;">${q.dataQualificacao ? UI.formatDate(q.dataQualificacao) : '—'}</td>
        <td style="font-size:12px;">${q.dataValidade     ? UI.formatDate(q.dataValidade)     : '—'}</td>
        <td class="aluno-row-actions">
          <button class="btn btn-ghost btn-sm" onclick="FornecedoresModule.abrirQualif('${q.id}')">📋 Requisitos</button>
          <button class="btn btn-ghost btn-sm" onclick="FornecedoresModule.openModalQualif('${q.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm danger" onclick="FornecedoresModule.deleteQualif('${q.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    return `
      ${!qualifs.length ? `<div class="empty-state"><div class="empty-icon">🏅</div>
        <div class="empty-title">Nenhuma qualificação registrada</div>
        <div class="empty-desc">Inicie o processo de qualificação de um fornecedor por categoria.</div>
        <button class="btn btn-primary mt-16" onclick="FornecedoresModule.openModalQualif()">+ Qualificar Fornecedor</button>
      </div>` : `
      <div class="table-card">
        <table class="data-table">
          <thead><tr><th>Fornecedor</th><th>Categoria</th><th>Status</th><th>Qualificado em</th><th>Validade</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`}`;
  },

  openModalQualif(id=null) {
    const q      = id ? Storage.getById(this.SK_QUALIF, id) : null;
    const forns  = this.getAll().sort((a,b)=>a.nome.localeCompare(b.nome));
    const fornOpts = forns.map(f=>`<option value="${f.id}" ${q?.fornecedorId===f.id?'selected':''}>${UI.escape(f.nome)}</option>`).join('');
    const catOpts  = Object.entries(this.CATEGORIA).map(([k,v])=>
      `<option value="${k}" ${q?.categoria===k?'selected':''}>${v.icon} ${v.label}</option>`).join('');
    const stOpts   = Object.entries(this.STATUS_QUALIF).map(([k,v])=>
      `<option value="${k}" ${(q?.status||'pendente')===k?'selected':''}>${v.icon} ${v.label}</option>`).join('');

    UI.openModal({
      title: q ? 'Editar Qualificação' : 'Iniciar Qualificação',
      content: `<div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">Fornecedor <span class="required-star">*</span></label>
            <select id="ql-forn" class="form-select"><option value="">— Selecionar —</option>${fornOpts}</select></div>
          <div class="form-group"><label class="form-label">Categoria <span class="required-star">*</span></label>
            <select id="ql-cat" class="form-select">${catOpts}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="ql-status" class="form-select">${stOpts}</select></div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">Data de qualificação</label>
            <input id="ql-data" type="date" class="form-input" value="${q?.dataQualificacao||''}" /></div>
          <div class="form-group"><label class="form-label">Validade (12 meses recomendado)</label>
            <input id="ql-val" type="date" class="form-input" value="${q?.dataValidade||''}" /></div>
        </div>
        <div class="form-group"><label class="form-label">Observações</label>
          <textarea id="ql-obs" class="form-textarea" rows="2">${UI.escape(q?.observacoes||'')}</textarea></div>
      </div>`,
      confirmLabel: q ? 'Salvar' : 'Iniciar',
      onConfirm: () => this._saveQualif(id),
    });
  },

  _saveQualif(id) {
    const fornEl = document.getElementById('ql-forn');
    const catEl  = document.getElementById('ql-cat');
    if (!fornEl?.value) { UI.toast('Selecione o fornecedor.', 'warning'); return false; }
    const forn = Storage.getById(this.SK, fornEl.value);
    const rec  = {
      fornecedorId:   fornEl.value,
      fornecedorNome: forn?.nome || '',
      categoria:      catEl?.value        || 'outros',
      status:         document.getElementById('ql-status')?.value || 'pendente',
      dataQualificacao: document.getElementById('ql-data')?.value || '',
      dataValidade:     document.getElementById('ql-val')?.value  || '',
      observacoes:      document.getElementById('ql-obs')?.value.trim() || '',
    };
    if (id) { Storage.update(this.SK_QUALIF, id, rec); UI.toast('Qualificação atualizada.','success'); }
    else    { Storage.create(this.SK_QUALIF, rec);      UI.toast('Qualificação iniciada!','success'); }
    UI.closeModal(); this.render();
  },

  async deleteQualif(id) {
    const ok = await UI.confirm('Remover esta qualificação?', 'Remover');
    if (!ok) return;
    Storage.delete(this.SK_QUALIF, id);
    UI.toast('Qualificação removida.', 'success');
    this.render();
  },

  /* Abre detalhe de requisitos de uma qualificação */
  abrirQualif(qualifId) {
    const q     = Storage.getById(this.SK_QUALIF, qualifId);
    if (!q) return;
    const reqs  = Storage.getAll(this.SK_REQ).filter(r => r.categoria === q.categoria);
    const itens = Storage.getAll(this.SK_REQIT).filter(i => i.qualificacaoId === qualifId);

    const rows = reqs.map(r => {
      const item  = itens.find(i => i.requisitoid === r.id);
      const ok    = !!item;
      const tipo  = this.TIPO_REQ[r.tipo] || { icon:'📄' };
      return `<tr>
        <td>${tipo.icon} ${UI.escape(r.nome)} ${r.obrigatorio?'<span class="badge badge-danger" style="font-size:10px;">Obrigatório</span>':''}</td>
        <td><span class="badge ${ok?'badge-success':'badge-gray'}">${ok?'✅ Atendido':'⏳ Pendente'}</span></td>
        <td style="font-size:12px;">${item?.documento ? UI.escape(item.documento) : '—'}</td>
        <td style="font-size:12px;">${item?.dataAtendimento ? UI.formatDate(item.dataAtendimento) : '—'}</td>
        <td>
          ${ok
            ? `<button class="btn btn-ghost btn-sm danger" onclick="FornecedoresModule._removeReqItem('${item.id}','${qualifId}')">✕</button>`
            : `<button class="btn btn-ghost btn-sm" onclick="FornecedoresModule._atenderReq('${qualifId}','${r.id}')">Atender</button>`}
        </td>
      </tr>`;
    }).join('');

    const obrigPendentes = reqs.filter(r => r.obrigatorio && !itens.find(i=>i.requisitoid===r.id)).length;

    UI.openModal({
      title: `📋 Requisitos — ${q.fornecedorNome} · ${this.CATEGORIA[q.categoria]?.label||q.categoria}`,
      wide: true,
      content: `
        ${obrigPendentes > 0
          ? `<div style="background:rgba(239,68,68,.08);border:1px solid #ef4444;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#ef4444;">
              ⚠ ${obrigPendentes} requisito${obrigPendentes!==1?'s':''} obrigatório${obrigPendentes!==1?'s':''} pendente${obrigPendentes!==1?'s':''}
             </div>`
          : reqs.length
            ? `<div style="background:rgba(22,163,74,.08);border:1px solid #16a34a;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#16a34a;">
                ✅ Todos os requisitos obrigatórios atendidos
               </div>`
            : ''}
        ${reqs.length ? `
        <div class="table-card" style="margin:0;">
          <table class="data-table" style="font-size:13px;">
            <thead><tr><th>Requisito</th><th>Status</th><th>Documento / Ref.</th><th>Data</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px;">
          Nenhum requisito cadastrado para esta categoria.
          <a href="#" onclick="event.preventDefault();UI.closeModal();FornecedoresModule.openModalRequisito()">Cadastrar requisito →</a>
        </div>`}`,
      hideFooter: true,
    });
  },

  _atenderReq(qualifId, requisitoid) {
    UI.openModal({
      title: 'Atender Requisito',
      content: `<div class="form-grid">
        <div class="form-group"><label class="form-label">Documento / Referência</label>
          <input id="ri-doc" class="form-input" placeholder="ex: ANVISA nº 12345, ISO 9001:2015" /></div>
        <div class="form-group"><label class="form-label">Data de atendimento</label>
          <input id="ri-data" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" /></div>
        <div class="form-group"><label class="form-label">Observações</label>
          <textarea id="ri-obs" class="form-textarea" rows="2"></textarea></div>
      </div>`,
      confirmLabel: 'Confirmar',
      onConfirm: () => {
        Storage.create(this.SK_REQIT, {
          qualificacaoId:   qualifId,
          requisitoid,
          documento:        document.getElementById('ri-doc')?.value.trim()  || '',
          dataAtendimento:  document.getElementById('ri-data')?.value        || '',
          observacoes:      document.getElementById('ri-obs')?.value.trim()  || '',
        });
        UI.toast('Requisito atendido!', 'success');
        UI.closeModal();
        setTimeout(() => this.abrirQualif(qualifId), 150);
      },
    });
  },

  _removeReqItem(itemId, qualifId) {
    Storage.delete(this.SK_REQIT, itemId);
    UI.toast('Atendimento removido.', 'success');
    UI.closeModal();
    setTimeout(() => this.abrirQualif(qualifId), 150);
  },

  /* ── TAB: AVALIAÇÕES ────────────────────────────────────── */
  _renderAvaliacoes() {
    const avals = Storage.getAll(this.SK_AVAL)
      .sort((a,b) => (b.data||'').localeCompare(a.data||''));
    const crits = Storage.getAll(this.SK_CRIT);

    const rows = avals.map(a => {
      const st = this._notaParaStatus(a.notaTotal||0);
      return `<tr>
        <td><strong>${UI.escape(a.fornecedorNome||'—')}</strong></td>
        <td style="font-size:12px;">${a.data ? UI.formatDate(a.data) : '—'}</td>
        <td style="font-size:12px;">${UI.escape(a.periodo||'—')}</td>
        <td style="font-weight:700;text-align:center;">${(a.notaTotal||0).toFixed(1)}</td>
        <td><span class="badge ${st.badge}">${st.icon} ${st.label}</span></td>
        <td class="aluno-row-actions">
          <button class="btn btn-ghost btn-sm danger" onclick="FornecedoresModule.deleteAvaliacao('${a.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    return `
      ${!crits.length ? `<div style="background:var(--bg-secondary);border-radius:10px;padding:14px 18px;margin-bottom:16px;font-size:13px;">
        ⚠ Nenhum critério de avaliação cadastrado.
        <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="FornecedoresModule.openModalCriterio()">+ Cadastrar critérios</button>
      </div>` : ''}

      <div style="margin-bottom:16px;">
        <button class="btn btn-secondary btn-sm" onclick="FornecedoresModule.openModalCriterio()">⚙ Critérios de Avaliação</button>
      </div>

      ${!avals.length ? `<div class="empty-state"><div class="empty-icon">⭐</div>
        <div class="empty-title">Nenhuma avaliação registrada</div>
        <div class="empty-desc">Avalie fornecedores por critérios com peso para gerar o status.</div>
        <button class="btn btn-primary mt-16" onclick="FornecedoresModule.openModalAvaliacao()">+ Nova Avaliação</button>
      </div>` : `
      <div class="table-card">
        <table class="data-table">
          <thead><tr><th>Fornecedor</th><th>Data</th><th>Período</th><th style="text-align:center;">Nota</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`}`;
  },

  openModalCriterio() {
    const crits = Storage.getAll(this.SK_CRIT);
    const totalPeso = crits.reduce((s,c)=>s+(parseFloat(c.peso)||0),0);

    UI.openModal({
      title: '⚙ Critérios de Avaliação',
      wide: true,
      content: `
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
          A soma dos pesos deve ser 100%. Atual: <strong>${totalPeso}%</strong>
        </div>
        ${crits.length ? `
        <div class="table-card" style="margin-bottom:16px;">
          <table class="data-table" style="font-size:13px;">
            <thead><tr><th>Critério</th><th style="text-align:right;">Peso (%)</th><th></th></tr></thead>
            <tbody>
              ${crits.map(c=>`<tr>
                <td>${UI.escape(c.nome)}</td>
                <td style="text-align:right;font-weight:700;">${c.peso}%</td>
                <td><button class="btn btn-ghost btn-sm danger" onclick="FornecedoresModule._deleteCriterio('${c.id}')">🗑️</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}
        <div style="display:flex;gap:8px;align-items:flex-end;">
          <div class="form-group" style="flex:1;margin:0;">
            <label class="form-label">Nome do critério</label>
            <input id="cr-nome" class="form-input" placeholder="ex: Prazo de entrega" />
          </div>
          <div class="form-group" style="width:100px;margin:0;">
            <label class="form-label">Peso (%)</label>
            <input id="cr-peso" class="form-input" type="number" min="1" max="100" placeholder="25" />
          </div>
          <button class="btn btn-primary" onclick="FornecedoresModule._addCriterio()">+ Adicionar</button>
        </div>`,
      hideFooter: true,
    });
  },

  _addCriterio() {
    const nome = document.getElementById('cr-nome')?.value.trim();
    const peso = parseFloat(document.getElementById('cr-peso')?.value)||0;
    if (!nome) { UI.toast('Informe o nome.', 'warning'); return; }
    if (peso <= 0) { UI.toast('Informe o peso.', 'warning'); return; }
    Storage.create(this.SK_CRIT, { nome, peso });
    UI.closeModal();
    setTimeout(() => this.openModalCriterio(), 100);
  },

  _deleteCriterio(id) {
    Storage.delete(this.SK_CRIT, id);
    UI.closeModal();
    setTimeout(() => this.openModalCriterio(), 100);
  },

  openModalAvaliacao(id=null) {
    const crits = Storage.getAll(this.SK_CRIT);
    if (!crits.length) {
      UI.toast('Cadastre os critérios de avaliação primeiro.', 'warning');
      this.openModalCriterio();
      return;
    }
    const forns  = this.getAll().sort((a,b)=>a.nome.localeCompare(b.nome));
    const fornOpts = `<option value="">— Selecionar —</option>` +
      forns.map(f=>`<option value="${f.id}">${UI.escape(f.nome)}</option>`).join('');

    UI.openModal({
      title: '⭐ Nova Avaliação de Fornecedor',
      wide: true,
      content: `<div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">Fornecedor <span class="required-star">*</span></label>
            <select id="av-forn" class="form-select">${fornOpts}</select></div>
          <div class="form-group"><label class="form-label">Período de referência</label>
            <input id="av-per" type="month" class="form-input" value="${new Date().toISOString().slice(0,7)}" /></div>
        </div>
        <div class="form-group"><label class="form-label">Data da avaliação</label>
          <input id="av-data" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" /></div>

        <div style="margin-top:8px;">
          <label class="form-label">Notas por critério (0 a 10)</label>
          ${crits.map(c=>`
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <span style="flex:1;font-size:13px;">${UI.escape(c.nome)} <span style="color:var(--text-muted);font-size:11px;">(peso ${c.peso}%)</span></span>
            <input type="number" class="form-input av-nota" data-critid="${c.id}" data-peso="${c.peso}"
              min="0" max="10" step="0.5" value="7" style="width:80px;"
              oninput="FornecedoresModule._calcNotaPreview()" />
          </div>`).join('')}
          <div style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:8px;font-size:13px;">
            Nota ponderada: <strong id="av-preview">—</strong>
          </div>
        </div>

        <div class="form-group"><label class="form-label">Observações</label>
          <textarea id="av-obs" class="form-textarea" rows="2"></textarea></div>
      </div>`,
      confirmLabel: 'Registrar Avaliação',
      onConfirm: () => this._saveAvaliacao(),
    });
    setTimeout(() => this._calcNotaPreview(), 100);
  },

  _calcNotaPreview() {
    let total = 0, somaPeso = 0;
    document.querySelectorAll('.av-nota').forEach(el => {
      const nota = parseFloat(el.value)||0;
      const peso = parseFloat(el.dataset.peso)||0;
      total    += nota * (peso/100);
      somaPeso += peso;
    });
    const el = document.getElementById('av-preview');
    if (el) {
      const nota = somaPeso > 0 ? total : 0;
      const st   = this._notaParaStatus(nota);
      el.textContent = `${nota.toFixed(1)} — ${st.icon} ${st.label}`;
    }
  },

  _saveAvaliacao() {
    const fornEl = document.getElementById('av-forn');
    if (!fornEl?.value) { UI.toast('Selecione o fornecedor.', 'warning'); return false; }
    const forn   = Storage.getById(this.SK, fornEl.value);
    const crits  = [];
    let notaTotal = 0;
    document.querySelectorAll('.av-nota').forEach(el => {
      const nota = parseFloat(el.value)||0;
      const peso = parseFloat(el.dataset.peso)||0;
      crits.push({ critId: el.dataset.critid, nota, peso });
      notaTotal += nota * (peso/100);
    });
    const status = this._notaParaStatus(notaTotal);
    Storage.create(this.SK_AVAL, {
      fornecedorId:   fornEl.value,
      fornecedorNome: forn?.nome || '',
      periodo:        document.getElementById('av-per')?.value  || '',
      data:           document.getElementById('av-data')?.value || '',
      criterios:      crits,
      notaTotal:      Math.round(notaTotal * 10) / 10,
      statusResultante: status.key,
      observacoes:    document.getElementById('av-obs')?.value.trim() || '',
    });
    UI.toast(`Avaliação registrada! Nota: ${notaTotal.toFixed(1)} — ${status.icon} ${status.label}`, 'success');
    UI.closeModal();
    this.render();
  },

  async deleteAvaliacao(id) {
    const ok = await UI.confirm('Excluir esta avaliação?', 'Excluir');
    if (!ok) return;
    Storage.delete(this.SK_AVAL, id);
    UI.toast('Avaliação excluída.', 'success');
    this.render();
  },

  /* ── HELPERS ────────────────────────────────────────────── */
  _setState(k, v) {
    this._state[k] = v;
  },

  _reRender() {
    const tab = this._state.tab;
    const el  = document.getElementById('tab-content');
    if (el) el.innerHTML = this._renderTab(tab);
  },
};
