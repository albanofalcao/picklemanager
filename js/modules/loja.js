'use strict';

/**
 * LojaModule — Loja de materiais de pickleball
 * Modelo: Matriz (estoque central) + Lojas (por arena)
 * Abas: Produtos | Estoque | Transferências | Compras | Vendas | Fornecedores | Relatórios
 */
const LojaModule = {
  SK_PROD:     'loja_produtos',
  SK_FORN:     'loja_fornecedores',
  SK_VEND:     'loja_vendas',
  SK_MOV:      'loja_estoque_mov',
  SK_COMPRA:   'loja_compras',
  SK_EST_LOJA: 'loja_estoque_loja',
  SK_TRANSF:   'loja_transferencias',

  _tab: 'produtos',

  CATEGORIAS: ['Raquetes', 'Bolas', 'Roupas', 'Calçados', 'Acessórios', 'Outros'],
  FORMA_PAG:  ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'],

  /* ------------------------------------------------------------------ */
  /*  Entry point                                                         */
  /* ------------------------------------------------------------------ */

  render(tab) {
    if (tab) this._tab = tab;
    const area = document.getElementById('content-area');
    if (!area) return;
    const stats = this._getStats();

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>🛒 Loja</h2>
          <p>Gestão centralizada: produtos, estoque, transferências e vendas</p>
        </div>
        ${this._tab === 'produtos'       ? `<button class="btn btn-primary" onclick="LojaModule.openModalProduto()">+ Novo Produto</button>` : ''}
        ${this._tab === 'fornecedores'   ? `<button class="btn btn-primary" onclick="LojaModule.openModalFornecedor()">+ Novo Fornecedor</button>` : ''}
        ${this._tab === 'vendas'         ? `<button class="btn btn-primary" onclick="LojaModule.openModalVenda()">🛍️ Nova Venda</button>` : ''}
        ${this._tab === 'compras'        ? `<button class="btn btn-primary" onclick="LojaModule.openModalCompra()">📥 Registrar Compra</button>` : ''}
        ${this._tab === 'transferencias' ? `<button class="btn btn-primary" onclick="LojaModule.openModalTransferencia()">🔄 Nova Transferência</button>` : ''}
      </div>

      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-icon blue">📦</div>
          <div class="stat-info">
            <div class="stat-value">${stats.totalProdutos}</div>
            <div class="stat-label">Produtos ativos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">⚠️</div>
          <div class="stat-info">
            <div class="stat-value">${stats.centralCritico}</div>
            <div class="stat-label">Central crítico</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">🛍️</div>
          <div class="stat-info">
            <div class="stat-value">${stats.vendasMes}</div>
            <div class="stat-label">Vendas este mês</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">💰</div>
          <div class="stat-info">
            <div class="stat-value">${this._fmt(stats.faturamentoMes)}</div>
            <div class="stat-label">Faturamento este mês</div>
          </div>
        </div>
      </div>

      <div class="tabs-bar" style="margin-bottom:24px;flex-wrap:wrap;gap:4px;">
        <button class="tab-btn ${this._tab==='produtos'       ?'active':''}" onclick="LojaModule.render('produtos')">📦 Produtos</button>
        <button class="tab-btn ${this._tab==='estoque'        ?'active':''}" onclick="LojaModule.render('estoque')">🗃️ Estoque</button>
        <button class="tab-btn ${this._tab==='transferencias' ?'active':''}" onclick="LojaModule.render('transferencias')">🔄 Transferências</button>
        <button class="tab-btn ${this._tab==='compras'        ?'active':''}" onclick="LojaModule.render('compras')">🧾 Compras</button>
        <button class="tab-btn ${this._tab==='vendas'         ?'active':''}" onclick="LojaModule.render('vendas')">🛍️ Vendas</button>
        <button class="tab-btn ${this._tab==='fornecedores'   ?'active':''}" onclick="LojaModule.render('fornecedores')">🚚 Fornecedores</button>
        <button class="tab-btn ${this._tab==='relatorios'     ?'active':''}" onclick="LojaModule.render('relatorios')">📊 Relatórios</button>
      </div>

      <div id="loja-tab-content">
        ${this._tab === 'produtos'       ? this._tabProdutos()       : ''}
        ${this._tab === 'estoque'        ? this._tabEstoque()        : ''}
        ${this._tab === 'transferencias' ? this._tabTransferencias() : ''}
        ${this._tab === 'compras'        ? this._tabCompras()        : ''}
        ${this._tab === 'vendas'         ? this._tabVendas()         : ''}
        ${this._tab === 'fornecedores'   ? this._tabFornecedores()   : ''}
        ${this._tab === 'relatorios'     ? this._tabRelatorios()     : ''}
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Stats                                                               */
  /* ------------------------------------------------------------------ */

  _getStats() {
    const produtos = Storage.getAll(this.SK_PROD);
    const vendas   = Storage.getAll(this.SK_VEND);
    const mesAtual = new Date().toISOString().slice(0, 7);
    const vendasMes = vendas.filter(v => (v.data||'').startsWith(mesAtual));
    return {
      totalProdutos:  produtos.filter(p => p.status !== 'inativo').length,
      centralCritico: produtos.filter(p => p.status !== 'inativo' && (parseInt(p.estoqueAtual,10)||0) <= (parseInt(p.estoqueMinimo,10)||0)).length,
      vendasMes:      vendasMes.length,
      faturamentoMes: vendasMes.reduce((s,v) => s + (parseFloat(v.total)||0), 0),
    };
  },

  /* ------------------------------------------------------------------ */
  /*  ABA: PRODUTOS                                                       */
  /* ------------------------------------------------------------------ */

  _tabProdutos() {
    const produtos = Storage.getAll(this.SK_PROD)
      .filter(p => p.status !== 'inativo')
      .sort((a,b) => a.nome.localeCompare(b.nome));

    if (!produtos.length) return `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">Nenhum produto cadastrado</div>
        <button class="btn btn-primary mt-16" onclick="LojaModule.openModalProduto()">+ Cadastrar primeiro produto</button>
      </div>`;

    return `
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Marca</th>
              <th style="text-align:right;">Custo</th>
              <th style="text-align:right;">Venda</th>
              <th style="text-align:center;">Central</th>
              <th style="text-align:center;">Status</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${produtos.map(p => {
                const qtd  = parseInt(p.estoqueAtual,10)||0;
                const min  = parseInt(p.estoqueMinimo,10)||0;
                const crit = qtd <= min;
                return `<tr>
                  <td><strong>${UI.escape(p.nome)}</strong>${p.sku ? `<br><small style="color:var(--text-muted);">SKU: ${UI.escape(p.sku)}</small>` : ''}</td>
                  <td><span class="badge badge-blue">${UI.escape(p.categoria||'—')}</span></td>
                  <td>${UI.escape(p.marca||'—')}</td>
                  <td style="text-align:right;">${this._fmt(p.precoCusto||0)}</td>
                  <td style="text-align:right;font-weight:600;">${this._fmt(p.precoVenda||0)}</td>
                  <td style="text-align:center;font-weight:700;color:${crit?'var(--danger)':'inherit'};">${qtd}<small style="color:var(--text-muted);font-weight:400;"> /mín ${min}</small></td>
                  <td style="text-align:center;">${crit ? '<span class="badge badge-danger">⚠️ Crítico</span>' : '<span class="badge badge-success">✓ OK</span>'}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="LojaModule.openModalProduto('${p.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm danger" onclick="LojaModule.inativarProduto('${p.id}')">🗑️</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  openModalProduto(id = null) {
    const p = id ? Storage.getById(this.SK_PROD, id) : null;
    const isEdit = !!p;
    const v = (f, fb='') => p ? UI.escape(String(p[f]??fb)) : fb;

    const fornOpts = `<option value="">— Selecionar —</option>` +
      Storage.getAll(this.SK_FORN).map(f =>
        `<option value="${f.id}" ${p?.fornecedorId===f.id?'selected':''}>${UI.escape(f.nome)}</option>`
      ).join('');

    const catOpts = this.CATEGORIAS.map(c =>
      `<option value="${c}" ${(p?.categoria||'') === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    UI.openModal({
      title: isEdit ? `Editar — ${p.nome}` : 'Novo Produto',
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Nome <span class="required-star">*</span></label>
            <input id="lp-nome" class="form-input" value="${v('nome')}" placeholder="ex: Raquete Head Extreme Pro" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Categoria</label>
              <select id="lp-cat" class="form-select"><option value="">— Selecionar —</option>${catOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Marca</label>
              <input id="lp-marca" class="form-input" value="${v('marca')}" placeholder="ex: Head, Selkirk…" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">SKU / Código</label>
              <input id="lp-sku" class="form-input" value="${v('sku')}" placeholder="ex: RQ-001" />
            </div>
            <div class="form-group">
              <label class="form-label">Fornecedor</label>
              <select id="lp-forn" class="form-select">${fornOpts}</select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Preço de Custo (R$)</label>
              <input id="lp-custo" class="form-input" type="number" min="0" step="0.01" value="${v('precoCusto','0')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Preço de Venda (R$) <span class="required-star">*</span></label>
              <input id="lp-venda" class="form-input" type="number" min="0" step="0.01" value="${v('precoVenda','0')}" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Estoque Central inicial${isEdit ? ' <small style="color:var(--text-muted);">(ajuste via compras)</small>' : ''}</label>
              <input id="lp-estoque" class="form-input" type="number" min="0" value="${v('estoqueAtual','0')}" ${isEdit ? 'disabled' : ''} />
            </div>
            <div class="form-group">
              <label class="form-label">Mínimo Central (alerta)</label>
              <input id="lp-minimo" class="form-input" type="number" min="0" value="${v('estoqueMinimo','5')}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea id="lp-desc" class="form-textarea" rows="2">${p ? UI.escape(p.descricao||'') : ''}</textarea>
          </div>
        </div>`,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Cadastrar Produto',
      onConfirm: () => this._saveProduto(id),
    });
  },

  _saveProduto(id) {
    const nome = document.getElementById('lp-nome');
    if (!nome?.value.trim()) { UI.toast('Informe o nome do produto.', 'warning'); nome?.classList.add('error'); return; }
    const record = {
      nome:          nome.value.trim(),
      categoria:     document.getElementById('lp-cat')?.value || '',
      marca:         document.getElementById('lp-marca')?.value.trim() || '',
      sku:           document.getElementById('lp-sku')?.value.trim() || '',
      fornecedorId:  document.getElementById('lp-forn')?.value || '',
      precoCusto:    parseFloat(document.getElementById('lp-custo')?.value) || 0,
      precoVenda:    parseFloat(document.getElementById('lp-venda')?.value) || 0,
      estoqueMinimo: parseInt(document.getElementById('lp-minimo')?.value, 10) || 0,
      descricao:     document.getElementById('lp-desc')?.value.trim() || '',
      status:        'ativo',
    };
    if (!id) record.estoqueAtual = parseInt(document.getElementById('lp-estoque')?.value, 10) || 0;
    if (id) { Storage.update(this.SK_PROD, id, record); UI.toast('Produto atualizado.', 'success'); }
    else    { Storage.create(this.SK_PROD, record);      UI.toast('Produto cadastrado.', 'success'); }
    UI.closeModal();
    this.render('produtos');
  },

  async inativarProduto(id) {
    const p = Storage.getById(this.SK_PROD, id);
    if (!p) return;
    const ok = await UI.confirm(`Remover "${p.nome}" do catálogo?`, 'Remover Produto');
    if (!ok) return;
    Storage.update(this.SK_PROD, id, { status: 'inativo' });
    UI.toast('Produto removido.', 'success');
    this.render('produtos');
  },

  /* ------------------------------------------------------------------ */
  /*  ABA: ESTOQUE                                                        */
  /* ------------------------------------------------------------------ */

  _tabEstoque() {
    const produtos = Storage.getAll(this.SK_PROD).filter(p => p.status !== 'inativo').sort((a,b) => a.nome.localeCompare(b.nome));
    const arenas   = Storage.getAll('arenas').filter(a => a.status === 'ativa').sort((a,b) => a.nome.localeCompare(b.nome));
    const estLojas = Storage.getAll(this.SK_EST_LOJA);
    const movs     = Storage.getAll(this.SK_MOV).slice().sort((a,b) => (b.data||'').localeCompare(a.data||'')).slice(0, 30);
    const critCentral = produtos.filter(p => (parseInt(p.estoqueAtual,10)||0) <= (parseInt(p.estoqueMinimo,10)||0));

    return `
      ${critCentral.length ? `
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
          <strong style="color:#991b1b;">⚠️ ${critCentral.length} produto(s) com estoque central crítico:</strong>
          <ul style="margin:8px 0 0 18px;color:#991b1b;font-size:13px;">
            ${critCentral.map(p => `<li>${UI.escape(p.nome)} — ${p.estoqueAtual||0} un. (mín: ${p.estoqueMinimo||0})</li>`).join('')}
          </ul>
        </div>` : ''}

      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:14px;font-weight:700;">🏭 Estoque Central (Matriz)</h3>
          <button class="btn btn-primary btn-sm" onclick="LojaModule.openModalTransferencia()">🔄 Transferir para Loja</button>
        </div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Produto</th><th>SKU</th>
              <th style="text-align:center;">Saldo Central</th>
              <th style="text-align:center;">Mínimo</th>
              <th style="text-align:center;">Status</th>
            </tr></thead>
            <tbody>
              ${produtos.length ? produtos.map(p => {
                const qtd = parseInt(p.estoqueAtual,10)||0;
                const min = parseInt(p.estoqueMinimo,10)||0;
                const crit = qtd <= min;
                return `<tr>
                  <td><strong>${UI.escape(p.nome)}</strong></td>
                  <td style="color:var(--text-muted);">${UI.escape(p.sku||'—')}</td>
                  <td style="text-align:center;font-weight:700;color:${crit?'var(--danger)':'inherit'};">${qtd}</td>
                  <td style="text-align:center;color:var(--text-muted);">${min}</td>
                  <td style="text-align:center;">${crit ? '<span class="badge badge-danger">Crítico</span>' : '<span class="badge badge-success">OK</span>'}</td>
                </tr>`;
              }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px;">Nenhum produto</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="padding:14px 18px;">
          <h3 style="margin:0;font-size:14px;font-weight:700;">🏪 Estoque por Loja (Arenas)</h3>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Produto</th>
              ${arenas.map(a => `<th style="text-align:center;">${UI.escape(a.nome)}</th>`).join('')}
              <th style="text-align:center;">Total Lojas</th>
            </tr></thead>
            <tbody>
              ${produtos.length ? produtos.map(p => {
                const saldos = arenas.map(a => {
                  const est = estLojas.find(e => e.produtoId === p.id && e.arenaId === a.id);
                  return parseInt(est?.saldoAtual, 10) || 0;
                });
                const totalLojas = saldos.reduce((s,v) => s+v, 0);
                return `<tr>
                  <td><strong>${UI.escape(p.nome)}</strong></td>
                  ${saldos.map(s => `<td style="text-align:center;font-weight:700;">${s}</td>`).join('')}
                  <td style="text-align:center;font-weight:700;color:var(--primary);">${totalLojas}</td>
                </tr>`;
              }).join('') : `<tr><td colspan="${arenas.length+2}" style="text-align:center;color:var(--text-muted);padding:16px;">Nenhum produto</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="padding:14px 18px;">
          <h3 style="margin:0;font-size:14px;font-weight:700;">🔄 Últimas Movimentações</h3>
        </div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Data</th><th>Produto</th><th>Tipo</th><th>Origem/Destino</th>
              <th style="text-align:center;">Qtd</th>
            </tr></thead>
            <tbody>
              ${movs.length ? movs.map(m => `
                <tr>
                  <td style="white-space:nowrap;">${this._fmtData(m.data)}</td>
                  <td>${UI.escape(m.produtoNome||'—')}</td>
                  <td><span class="badge ${
                    m.tipo==='entrada'          ? 'badge-success' :
                    m.tipo==='saida'            ? 'badge-danger'  :
                    m.tipo==='transferencia_out'? 'badge-warning'  :
                    m.tipo==='transferencia_in' ? 'badge-blue'    : 'badge-gray'
                  }">${
                    m.tipo==='entrada'          ? 'Entrada'       :
                    m.tipo==='saida'            ? 'Saída'         :
                    m.tipo==='transferencia_out'? 'Transf. Saída' :
                    m.tipo==='transferencia_in' ? 'Transf. Entrada': 'Ajuste'
                  }</span></td>
                  <td style="font-size:12px;color:var(--text-muted);">${UI.escape(m.motivo||'—')}</td>
                  <td style="text-align:center;font-weight:600;">${['saida','transferencia_out'].includes(m.tipo)?'-':'+'} ${m.quantidade}</td>
                </tr>`).join('')
              : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px;">Nenhuma movimentação</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers de estoque por loja                                         */
  /* ------------------------------------------------------------------ */

  _getEstoqueLoja(produtoId, arenaId) {
    return Storage.getAll(this.SK_EST_LOJA).find(e => e.produtoId === produtoId && e.arenaId === arenaId) || null;
  },

  _atualizarEstoqueLoja(produtoId, produtoNome, arenaId, arenaNome, delta) {
    const est = this._getEstoqueLoja(produtoId, arenaId);
    if (est) {
      Storage.update(this.SK_EST_LOJA, est.id, { saldoAtual: Math.max(0, (parseInt(est.saldoAtual,10)||0) + delta) });
    } else {
      Storage.create(this.SK_EST_LOJA, { produtoId, produtoNome, arenaId, arenaNome, saldoAtual: Math.max(0, delta), saldoMinimo: 0 });
    }
  },

  /* ------------------------------------------------------------------ */
  /*  ABA: TRANSFERÊNCIAS                                                 */
  /* ------------------------------------------------------------------ */

  _tabTransferencias() {
    const transfs = Storage.getAll(this.SK_TRANSF).slice().sort((a,b) => (b.data||'').localeCompare(a.data||''));
    return `
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Data</th><th>Destino</th><th>Produtos</th>
              <th style="text-align:center;">Un. enviadas</th><th>Obs</th><th></th>
            </tr></thead>
            <tbody>
              ${transfs.length ? transfs.map(t => `
                <tr>
                  <td style="white-space:nowrap;">${this._fmtData(t.data)}</td>
                  <td><strong>${UI.escape(t.arenaNome||'—')}</strong></td>
                  <td style="color:var(--text-muted);font-size:12px;">${(t.itens||[]).map(i=>UI.escape(i.produtoNome)).join(', ').slice(0,60)||'—'}</td>
                  <td style="text-align:center;">${(t.itens||[]).reduce((s,i)=>s+(i.quantidade||0),0)}</td>
                  <td style="color:var(--text-muted);font-size:12px;">${UI.escape(t.obs||'—')}</td>
                  <td><button class="btn btn-ghost btn-sm" onclick="LojaModule._verTransferencia('${t.id}')">👁️</button></td>
                </tr>`).join('')
              : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhuma transferência registrada</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _verTransferencia(id) {
    const t = Storage.getById(this.SK_TRANSF, id);
    if (!t) return;
    UI.openModal({
      title: `Transferência — ${this._fmtData(t.data)}`,
      hideFooter: true,
      content: `
        <div style="font-size:14px;">
          <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
            <div><strong>Origem:</strong> Estoque Central</div>
            <div><strong>Destino:</strong> ${UI.escape(t.arenaNome||'—')}</div>
            ${t.obs ? `<div><strong>Obs:</strong> ${UI.escape(t.obs)}</div>` : ''}
          </div>
          <table class="data-table">
            <thead><tr><th>Produto</th><th style="text-align:center;">Qtd transferida</th></tr></thead>
            <tbody>${(t.itens||[]).map(i=>`
              <tr>
                <td>${UI.escape(i.produtoNome)}</td>
                <td style="text-align:center;font-weight:700;">${i.quantidade}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`,
    });
  },

  openModalTransferencia() {
    const arenas  = Storage.getAll('arenas').filter(a => a.status === 'ativa').sort((a,b) => a.nome.localeCompare(b.nome));
    const produtos = Storage.getAll(this.SK_PROD)
      .filter(p => p.status !== 'inativo' && (parseInt(p.estoqueAtual,10)||0) > 0)
      .sort((a,b) => a.nome.localeCompare(b.nome));

    const arenaOpts = `<option value="">— Selecionar loja destino —</option>` +
      arenas.map(a => `<option value="${a.id}">${UI.escape(a.nome)}</option>`).join('');

    const prodOpts = `<option value="">— Selecionar produto —</option>` +
      produtos.map(p =>
        `<option value="${p.id}" data-nome="${UI.escape(p.nome)}" data-max="${parseInt(p.estoqueAtual,10)||0}">${UI.escape(p.nome)} (central: ${p.estoqueAtual||0} un.)</option>`
      ).join('');

    window._lojaTransfItens = [];

    UI.openModal({
      title: '🔄 Transferência Central → Loja',
      content: `
        <div class="form-grid">
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Loja destino <span class="required-star">*</span></label>
              <select id="tf-arena" class="form-select">${arenaOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Data</label>
              <input id="tf-data" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observação</label>
            <input id="tf-obs" class="form-input" placeholder="Opcional" />
          </div>
          <div class="card" style="border:1px solid var(--border-color);border-radius:10px;padding:14px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:10px;">Produtos a transferir</div>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px;">
              <div style="flex:3;min-width:160px;">
                <label class="form-label" style="font-size:11px;">Produto</label>
                <select id="tf-prod" class="form-select">${prodOpts}</select>
              </div>
              <div style="width:90px;">
                <label class="form-label" style="font-size:11px;">Quantidade</label>
                <input id="tf-qtd" class="form-input" type="number" min="1" value="1" />
              </div>
              <button class="btn btn-secondary btn-sm" onclick="LojaModule._addItemTransf()">+ Adicionar</button>
            </div>
            <table class="data-table">
              <thead><tr>
                <th>Produto</th>
                <th style="text-align:center;">Qtd</th>
                <th style="text-align:center;">Disponível</th>
                <th></th>
              </tr></thead>
              <tbody id="tf-itens-body">
                <tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:10px;">Nenhum item</td></tr>
              </tbody>
            </table>
          </div>
        </div>`,
      confirmLabel: '✅ Confirmar Transferência',
      onConfirm: () => this._saveTransferencia(),
    });
  },

  _addItemTransf() {
    const sel   = document.getElementById('tf-prod');
    const qtdEl = document.getElementById('tf-qtd');
    if (!sel?.value) { UI.toast('Selecione um produto.', 'warning'); return; }
    const qtd    = parseInt(qtdEl?.value, 10) || 1;
    const opt    = sel.selectedOptions[0];
    const maxDisp = parseInt(opt?.dataset.max, 10) || 0;
    const jaAdic = (window._lojaTransfItens||[]).filter(i => i.produtoId === sel.value).reduce((s,i)=>s+i.quantidade,0);
    if (jaAdic + qtd > maxDisp) { UI.toast(`Estoque central insuficiente. Disponível: ${maxDisp - jaAdic} un.`, 'warning'); return; }
    const existente = (window._lojaTransfItens||[]).find(i => i.produtoId === sel.value);
    if (existente) { existente.quantidade += qtd; }
    else { (window._lojaTransfItens = window._lojaTransfItens||[]).push({ produtoId: sel.value, produtoNome: opt?.dataset.nome || '', quantidade: qtd, maxDisp }); }
    this._renderItensTransf();
    sel.value = ''; if (qtdEl) qtdEl.value = '1';
  },

  _renderItensTransf() {
    const tbody = document.getElementById('tf-itens-body');
    if (!tbody) return;
    const itens = window._lojaTransfItens || [];
    tbody.innerHTML = itens.length
      ? itens.map((i,idx) => `
          <tr>
            <td>${UI.escape(i.produtoNome)}</td>
            <td style="text-align:center;font-weight:700;">${i.quantidade}</td>
            <td style="text-align:center;color:var(--text-muted);">${i.maxDisp}</td>
            <td><button class="btn btn-ghost btn-sm danger" onclick="LojaModule._remItemTransf(${idx})">✕</button></td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:10px;">Nenhum item</td></tr>';
  },

  _remItemTransf(idx) { window._lojaTransfItens.splice(idx,1); this._renderItensTransf(); },

  _saveTransferencia() {
    const itens = window._lojaTransfItens || [];
    if (!itens.length) { UI.toast('Adicione pelo menos um produto.', 'warning'); return; }
    const arenaSel = document.getElementById('tf-arena');
    if (!arenaSel?.value) { UI.toast('Selecione a loja destino.', 'warning'); return; }
    const arenaId   = arenaSel.value;
    const arenaNome = arenaSel.selectedOptions[0]?.text || '';
    const data = document.getElementById('tf-data')?.value || new Date().toISOString().slice(0,10);
    const obs  = document.getElementById('tf-obs')?.value.trim() || '';

    Storage.create(this.SK_TRANSF, { data, arenaId, arenaNome, itens, obs });

    itens.forEach(item => {
      const prod = Storage.getById(this.SK_PROD, item.produtoId);
      if (prod) {
        Storage.update(this.SK_PROD, item.produtoId, { estoqueAtual: Math.max(0,(parseInt(prod.estoqueAtual,10)||0) - item.quantidade) });
        Storage.create(this.SK_MOV, { data, produtoId: item.produtoId, produtoNome: item.produtoNome, tipo: 'transferencia_out', quantidade: item.quantidade, motivo: `Transferência → ${arenaNome}` });
      }
      this._atualizarEstoqueLoja(item.produtoId, item.produtoNome, arenaId, arenaNome, item.quantidade);
      Storage.create(this.SK_MOV, { data, produtoId: item.produtoId, produtoNome: item.produtoNome, tipo: 'transferencia_in', quantidade: item.quantidade, motivo: `Recebido na loja ${arenaNome}` });
    });

    UI.toast(`Transferência concluída! ${itens.reduce((s,i)=>s+i.quantidade,0)} itens → ${arenaNome}`, 'success');
    UI.closeModal();
    window._lojaTransfItens = [];
    this.render('transferencias');
  },

  /* ------------------------------------------------------------------ */
  /*  ABA: COMPRAS                                                        */
  /* ------------------------------------------------------------------ */

  _tabCompras() {
    const compras = Storage.getAll(this.SK_COMPRA).slice().sort((a,b) => (b.data||'').localeCompare(a.data||'')).slice(0,30);
    return `
      <div class="card">
        <div class="card-header" style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:14px;font-weight:700;">🧾 Compras → Estoque Central</h3>
          <button class="btn btn-primary btn-sm" onclick="LojaModule.openModalCompra()">📥 Registrar Compra</button>
        </div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Data</th><th>Fornecedor</th><th>NF</th><th>Produtos</th>
              <th style="text-align:right;">Total</th><th></th>
            </tr></thead>
            <tbody>
              ${compras.length ? compras.map(c => `
                <tr>
                  <td style="white-space:nowrap;">${this._fmtData(c.data)}</td>
                  <td>${UI.escape(c.fornecedorNome||'—')}</td>
                  <td>${UI.escape(c.nf||'—')}</td>
                  <td style="color:var(--text-muted);font-size:12px;">${(c.itens||[]).map(i=>UI.escape(i.produtoNome)).join(', ').slice(0,60)||'—'}</td>
                  <td style="text-align:right;font-weight:700;">${this._fmt(c.total||0)}</td>
                  <td><button class="btn btn-ghost btn-sm" onclick="LojaModule._verCompra('${c.id}')">👁️</button></td>
                </tr>`).join('')
              : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhuma compra registrada</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _verCompra(id) {
    const c = Storage.getById(this.SK_COMPRA, id);
    if (!c) return;
    UI.openModal({
      title: `Compra — ${this._fmtData(c.data)}`,
      hideFooter: true,
      content: `
        <div style="font-size:14px;">
          <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
            <div><strong>Fornecedor:</strong> ${UI.escape(c.fornecedorNome||'—')}</div>
            <div><strong>NF:</strong> ${UI.escape(c.nf||'—')}</div>
            ${c.obs ? `<div><strong>Obs:</strong> ${UI.escape(c.obs)}</div>` : ''}
          </div>
          <table class="data-table">
            <thead><tr><th>Produto</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Custo Unit.</th><th style="text-align:right;">Total</th></tr></thead>
            <tbody>${(c.itens||[]).map(i=>`
              <tr>
                <td>${UI.escape(i.produtoNome)}</td>
                <td style="text-align:center;">${i.qtd}</td>
                <td style="text-align:right;">${this._fmt(i.custoUnit)}</td>
                <td style="text-align:right;font-weight:600;">${this._fmt(i.total)}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot><tr>
              <td colspan="3" style="text-align:right;font-weight:800;padding:10px 12px;">TOTAL</td>
              <td style="text-align:right;font-weight:800;padding:10px 12px;color:var(--primary);">${this._fmt(c.total||0)}</td>
            </tr></tfoot>
          </table>
        </div>`,
    });
  },

  openModalCompra() {
    const fornOpts = `<option value="">— Selecionar fornecedor —</option>` +
      Storage.getAll(this.SK_FORN).sort((a,b)=>a.nome.localeCompare(b.nome)).map(f =>
        `<option value="${f.id}">${UI.escape(f.nome)}</option>`).join('');
    const prodOpts = `<option value="">— Selecionar produto —</option>` +
      Storage.getAll(this.SK_PROD).filter(p=>p.status!=='inativo').sort((a,b)=>a.nome.localeCompare(b.nome)).map(p =>
        `<option value="${p.id}" data-custo="${p.precoCusto||0}" data-nome="${UI.escape(p.nome)}">${UI.escape(p.nome)} (central: ${p.estoqueAtual||0})</option>`).join('');

    window._lojaCompraItens = [];
    UI.openModal({
      title: '📥 Registrar Compra → Estoque Central',
      content: `
        <div class="form-grid">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;font-size:12px;color:#166534;">
            💡 Compras entram no <strong>Estoque Central</strong>. Use Transferências para enviar às lojas.
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Fornecedor <span class="required-star">*</span></label>
              <select id="cp-forn" class="form-select">${fornOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Nota Fiscal</label>
              <input id="cp-nf" class="form-input" placeholder="ex: 001234" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Data de entrada</label>
              <input id="cp-data" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Observações</label>
              <input id="cp-obs" class="form-input" placeholder="Opcional" />
            </div>
          </div>
          <div class="card" style="border:1px solid var(--border-color);border-radius:10px;padding:14px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:10px;">Itens da compra</div>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px;">
              <div style="flex:3;min-width:160px;">
                <label class="form-label" style="font-size:11px;">Produto</label>
                <select id="cp-prod" class="form-select" onchange="LojaModule._onProdCompraSelect()">${prodOpts}</select>
              </div>
              <div style="width:70px;">
                <label class="form-label" style="font-size:11px;">Qtd</label>
                <input id="cp-qtd" class="form-input" type="number" min="1" value="1" />
              </div>
              <div style="width:120px;">
                <label class="form-label" style="font-size:11px;">Custo unit. (R$)</label>
                <input id="cp-custo" class="form-input" type="number" min="0" step="0.01" placeholder="0,00" />
              </div>
              <button class="btn btn-secondary btn-sm" onclick="LojaModule._addItemCompra()">+ Item</button>
            </div>
            <table class="data-table">
              <thead><tr><th>Produto</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Custo Unit.</th><th style="text-align:right;">Total</th><th></th></tr></thead>
              <tbody id="cp-itens-body"><tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:10px;">Nenhum item</td></tr></tbody>
              <tfoot><tr>
                <td colspan="3" style="text-align:right;font-weight:700;padding:10px 12px;">Total</td>
                <td style="text-align:right;font-weight:700;padding:10px 12px;color:var(--primary);" id="cp-total">R$ 0,00</td>
                <td></td>
              </tr></tfoot>
            </table>
          </div>
        </div>`,
      confirmLabel: '✅ Confirmar Entrada no Central',
      onConfirm: () => this._saveCompra(),
    });
  },

  _onProdCompraSelect() {
    const sel = document.getElementById('cp-prod');
    const el  = document.getElementById('cp-custo');
    if (el) el.value = parseFloat(sel?.selectedOptions[0]?.dataset.custo||0).toFixed(2);
  },

  _addItemCompra() {
    const sel   = document.getElementById('cp-prod');
    const qtdEl = document.getElementById('cp-qtd');
    const cusEl = document.getElementById('cp-custo');
    if (!sel?.value) { UI.toast('Selecione um produto.','warning'); return; }
    const qtd   = parseInt(qtdEl?.value,10)||1;
    const custo = parseFloat(cusEl?.value)||0;
    const opt   = sel.selectedOptions[0];
    const existente = (window._lojaCompraItens||[]).find(i => i.produtoId === sel.value);
    if (existente) { existente.qtd += qtd; existente.total = existente.qtd * existente.custoUnit; }
    else { (window._lojaCompraItens=window._lojaCompraItens||[]).push({ produtoId: sel.value, produtoNome: opt?.dataset.nome||'', qtd, custoUnit: custo, total: qtd*custo }); }
    this._renderItensCompra();
    sel.value=''; if(qtdEl) qtdEl.value='1'; if(cusEl) cusEl.value='';
  },

  _renderItensCompra() {
    const itens = window._lojaCompraItens||[];
    const tbody = document.getElementById('cp-itens-body');
    const totEl = document.getElementById('cp-total');
    if (!tbody) return;
    const total = itens.reduce((s,i)=>s+(i.total||0),0);
    tbody.innerHTML = itens.length
      ? itens.map((i,idx)=>`<tr>
          <td>${UI.escape(i.produtoNome)}</td>
          <td style="text-align:center;">${i.qtd}</td>
          <td style="text-align:right;">${this._fmt(i.custoUnit)}</td>
          <td style="text-align:right;font-weight:600;">${this._fmt(i.total)}</td>
          <td><button class="btn btn-ghost btn-sm danger" onclick="LojaModule._remItemCompra(${idx})">✕</button></td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:10px;">Nenhum item</td></tr>';
    if (totEl) totEl.textContent = this._fmt(total);
  },

  _remItemCompra(idx) { window._lojaCompraItens.splice(idx,1); this._renderItensCompra(); },

  _saveCompra() {
    const itens = window._lojaCompraItens||[];
    if (!itens.length) { UI.toast('Adicione pelo menos um item.','warning'); return; }
    const fornSel = document.getElementById('cp-forn');
    if (!fornSel?.value) { UI.toast('Selecione o fornecedor.','warning'); return; }
    const fornecedor = Storage.getById(this.SK_FORN, fornSel.value);
    const nf   = document.getElementById('cp-nf')?.value.trim()||'';
    const data = document.getElementById('cp-data')?.value||new Date().toISOString().slice(0,10);
    const obs  = document.getElementById('cp-obs')?.value.trim()||'';
    const totalCompra = itens.reduce((s,i)=>s+(i.total||0),0);

    Storage.create(this.SK_COMPRA, { data, fornecedorId: fornecedor?.id||'', fornecedorNome: fornecedor?.nome||'', nf, obs, itens, total: totalCompra });

    itens.forEach(item => {
      const prod = Storage.getById(this.SK_PROD, item.produtoId);
      if (!prod) return;
      Storage.update(this.SK_PROD, item.produtoId, {
        estoqueAtual: (parseInt(prod.estoqueAtual,10)||0) + item.qtd,
        ...(item.custoUnit > 0 ? { precoCusto: item.custoUnit } : {}),
      });
      Storage.create(this.SK_MOV, { data, produtoId: item.produtoId, produtoNome: item.produtoNome, tipo: 'entrada', quantidade: item.qtd, motivo: `Compra${nf?' NF '+nf:''}${fornecedor?' — '+fornecedor.nome:''} → Central` });
    });

    UI.toast(`Compra registrada! ${itens.length} produto(s) adicionados ao central.`, 'success');
    UI.closeModal(); window._lojaCompraItens=[]; this.render('compras');
  },

  /* ------------------------------------------------------------------ */
  /*  ABA: VENDAS                                                         */
  /* ------------------------------------------------------------------ */

  _tabVendas() {
    const vendas = Storage.getAll(this.SK_VEND).slice().sort((a,b)=>(b.data||'').localeCompare(a.data||''));
    if (!vendas.length) return `
      <div class="empty-state">
        <div class="empty-icon">🛍️</div>
        <div class="empty-title">Nenhuma venda registrada</div>
        <button class="btn btn-primary mt-16" onclick="LojaModule.openModalVenda()">🛍️ Registrar Venda</button>
      </div>`;
    return `
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Data</th><th>Loja</th><th>Cliente</th><th>Produtos</th>
              <th>Pagamento</th><th style="text-align:right;">Total</th><th></th>
            </tr></thead>
            <tbody>
              ${vendas.map(v=>`
                <tr>
                  <td style="white-space:nowrap;">${this._fmtData(v.data)}</td>
                  <td><span class="badge badge-blue">${UI.escape(v.arenaNome||'—')}</span></td>
                  <td>${UI.escape(v.clienteNome||'Avulso')}</td>
                  <td style="color:var(--text-muted);font-size:12px;">${(v.itens||[]).map(i=>UI.escape(i.produtoNome)).join(', ').slice(0,50)||'—'}</td>
                  <td><span class="badge badge-gray">${UI.escape(v.formaPagamento||'—')}</span></td>
                  <td style="text-align:right;font-weight:700;">${this._fmt(v.total||0)}</td>
                  <td><button class="btn btn-ghost btn-sm" onclick="LojaModule.verVenda('${v.id}')">👁️</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  openModalVenda() {
    const arenas  = Storage.getAll('arenas').filter(a=>a.status==='ativa').sort((a,b)=>a.nome.localeCompare(b.nome));
    const pagOpts = this.FORMA_PAG.map(f=>`<option>${f}</option>`).join('');
    const arenaOpts = `<option value="">— Selecionar loja —</option>` +
      arenas.map(a=>`<option value="${a.id}">${UI.escape(a.nome)}</option>`).join('');

    window._lojaVendaItens   = [];
    window._lojaVendaArenaId = '';

    UI.openModal({
      title: '🛍️ Registrar Venda',
      content: `
        <div class="form-grid">
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Loja <span class="required-star">*</span></label>
              <select id="vd-arena" class="form-select" onchange="LojaModule._onArenaVendaChange()">${arenaOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Data</label>
              <input id="vd-data" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Cliente (opcional)</label>
            <input id="vd-cliente" class="form-input" placeholder="Nome do cliente ou deixe em branco" />
          </div>
          <div id="vd-aviso-arena" style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400e;">
            ⚠️ Selecione a loja para ver os produtos disponíveis.
          </div>
          <div class="card" style="border:1px solid var(--border-color);border-radius:10px;padding:14px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:10px;">Itens da venda</div>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px;">
              <div style="flex:3;min-width:160px;">
                <label class="form-label" style="font-size:11px;">Produto</label>
                <select id="vd-prod" class="form-select" onchange="LojaModule._onProdSelect()">
                  <option value="">— Selecione a loja primeiro —</option>
                </select>
              </div>
              <div style="width:70px;">
                <label class="form-label" style="font-size:11px;">Qtd</label>
                <input id="vd-qtd" class="form-input" type="number" min="1" value="1" />
              </div>
              <div style="width:110px;">
                <label class="form-label" style="font-size:11px;">Preço unit.</label>
                <input id="vd-preco" class="form-input" type="number" min="0" step="0.01" />
              </div>
              <button class="btn btn-secondary btn-sm" onclick="LojaModule._addItemVenda()">+ Item</button>
            </div>
            <table class="data-table">
              <thead><tr><th>Produto</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Unit.</th><th style="text-align:right;">Total</th><th></th></tr></thead>
              <tbody id="vd-itens-body"><tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:10px;">Nenhum item</td></tr></tbody>
              <tfoot><tr>
                <td colspan="3" style="text-align:right;font-weight:700;padding:10px 12px;">Subtotal</td>
                <td style="text-align:right;font-weight:700;padding:10px 12px;" id="vd-subtotal">R$ 0,00</td>
                <td></td>
              </tr></tfoot>
            </table>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Desconto (R$)</label>
              <input id="vd-desconto" class="form-input" type="number" min="0" step="0.01" value="0" oninput="LojaModule._atualizarTotal()" />
            </div>
            <div class="form-group">
              <label class="form-label">Forma de Pagamento <span class="required-star">*</span></label>
              <select id="vd-pag" class="form-select">${pagOpts}</select>
            </div>
          </div>
          <div style="background:var(--bg-secondary);border-radius:10px;padding:14px;text-align:right;">
            <span style="font-size:13px;color:var(--text-muted);">Total a pagar: </span>
            <span id="vd-total-display" style="font-size:22px;font-weight:800;color:var(--success);">R$ 0,00</span>
          </div>
        </div>`,
      confirmLabel: '✅ Confirmar Venda',
      onConfirm: () => this._saveVenda(),
    });
  },

  _onArenaVendaChange() {
    const sel     = document.getElementById('vd-arena');
    const arenaId = sel?.value;
    const aviso   = document.getElementById('vd-aviso-arena');
    const prodSel = document.getElementById('vd-prod');
    if (!arenaId || !prodSel) return;
    window._lojaVendaArenaId = arenaId;
    window._lojaVendaItens   = [];
    this._renderItensVenda();
    if (aviso) aviso.style.display = 'none';

    const estLojas = Storage.getAll(this.SK_EST_LOJA).filter(e => e.arenaId === arenaId);
    const produtos = Storage.getAll(this.SK_PROD).filter(p => p.status !== 'inativo');
    const disponiveis = produtos.filter(p => {
      const est = estLojas.find(e => e.produtoId === p.id);
      return (parseInt(est?.saldoAtual,10)||0) > 0;
    }).sort((a,b) => a.nome.localeCompare(b.nome));

    prodSel.innerHTML = disponiveis.length
      ? `<option value="">— Selecionar —</option>` + disponiveis.map(p => {
          const est   = estLojas.find(e => e.produtoId === p.id);
          const saldo = parseInt(est?.saldoAtual,10)||0;
          return `<option value="${p.id}" data-preco="${p.precoVenda||0}" data-saldo="${saldo}" data-custo="${p.precoCusto||0}">${UI.escape(p.nome)} — ${this._fmt(p.precoVenda||0)} (${saldo} un.)</option>`;
        }).join('')
      : `<option value="">⚠️ Nenhum produto em estoque nesta loja</option>`;
  },

  _onProdSelect() {
    const sel   = document.getElementById('vd-prod');
    const prEl  = document.getElementById('vd-preco');
    if (prEl) prEl.value = parseFloat(sel?.selectedOptions[0]?.dataset.preco||0).toFixed(2);
  },

  _addItemVenda() {
    const sel   = document.getElementById('vd-prod');
    const qtdEl = document.getElementById('vd-qtd');
    const prEl  = document.getElementById('vd-preco');
    if (!window._lojaVendaArenaId) { UI.toast('Selecione a loja primeiro.','warning'); return; }
    if (!sel?.value) { UI.toast('Selecione um produto.','warning'); return; }
    const qtd   = parseInt(qtdEl?.value,10)||1;
    const preco = parseFloat(prEl?.value)||0;
    const opt   = sel.selectedOptions[0];
    const saldo = parseInt(opt?.dataset.saldo,10)||0;
    const jaCarr = (window._lojaVendaItens||[]).filter(i=>i.produtoId===sel.value).reduce((s,i)=>s+i.qtd,0);
    if (jaCarr + qtd > saldo) { UI.toast(`Estoque insuficiente. Disponível: ${saldo-jaCarr} un.`,'warning'); return; }
    (window._lojaVendaItens=window._lojaVendaItens||[]).push({
      produtoId: sel.value,
      produtoNome: opt?.text?.split(' —')[0]||'',
      qtd, precoUnit: preco,
      precoCusto: parseFloat(opt?.dataset.custo)||0,
      total: qtd*preco,
    });
    this._renderItensVenda();
    sel.value=''; if(qtdEl) qtdEl.value='1'; if(prEl) prEl.value='';
  },

  _renderItensVenda() {
    const itens  = window._lojaVendaItens||[];
    const tbody  = document.getElementById('vd-itens-body');
    const subtEl = document.getElementById('vd-subtotal');
    if (!tbody) return;
    const subtotal = itens.reduce((s,i)=>s+(i.total||0),0);
    tbody.innerHTML = itens.length
      ? itens.map((i,idx)=>`<tr>
          <td>${UI.escape(i.produtoNome)}</td>
          <td style="text-align:center;">${i.qtd}</td>
          <td style="text-align:right;">${this._fmt(i.precoUnit)}</td>
          <td style="text-align:right;font-weight:600;">${this._fmt(i.total)}</td>
          <td><button class="btn btn-ghost btn-sm danger" onclick="LojaModule._remItemVenda(${idx})">✕</button></td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:10px;">Nenhum item</td></tr>';
    if (subtEl) subtEl.textContent = this._fmt(subtotal);
    this._atualizarTotal();
  },

  _remItemVenda(idx) { window._lojaVendaItens.splice(idx,1); this._renderItensVenda(); },

  _atualizarTotal() {
    const subtotal = (window._lojaVendaItens||[]).reduce((s,i)=>s+(i.total||0),0);
    const desconto = parseFloat(document.getElementById('vd-desconto')?.value)||0;
    const el = document.getElementById('vd-total-display');
    if (el) el.textContent = this._fmt(Math.max(0, subtotal - desconto));
  },

  _saveVenda() {
    const itens = window._lojaVendaItens||[];
    if (!itens.length) { UI.toast('Adicione pelo menos um item.','warning'); return; }
    const arenaSel = document.getElementById('vd-arena');
    if (!arenaSel?.value) { UI.toast('Selecione a loja.','warning'); return; }
    const arenaId   = arenaSel.value;
    const arenaNome = arenaSel.selectedOptions[0]?.text||'';
    const desconto  = parseFloat(document.getElementById('vd-desconto')?.value)||0;
    const subtotal  = itens.reduce((s,i)=>s+(i.total||0),0);
    const total     = Math.max(0, subtotal - desconto);
    const forma     = document.getElementById('vd-pag')?.value||'Dinheiro';
    const cliente   = document.getElementById('vd-cliente')?.value.trim()||'';
    const data      = document.getElementById('vd-data')?.value||new Date().toISOString().slice(0,10);

    const venda = Storage.create(this.SK_VEND, { data, arenaId, arenaNome, clienteNome: cliente, itens, subtotal, desconto, total, formaPagamento: forma });

    itens.forEach(item => {
      this._atualizarEstoqueLoja(item.produtoId, item.produtoNome, arenaId, arenaNome, -item.qtd);
      Storage.create(this.SK_MOV, { data, produtoId: item.produtoId, produtoNome: item.produtoNome, tipo: 'saida', quantidade: item.qtd, motivo: `Venda${cliente?' — '+cliente:''} | ${arenaNome}`, vendaId: venda?.id });
    });

    this._lancarFinanceiro(venda?.id, data, total, forma, cliente, itens, arenaNome);
    UI.toast(`Venda registrada! Total: ${this._fmt(total)}`, 'success');
    UI.closeModal(); window._lojaVendaItens=[]; window._lojaVendaArenaId=''; this.render('vendas');
  },

  _lancarFinanceiro(vendaId, data, total, forma, cliente, itens, arenaNome) {
    const descricao = `Venda Loja ${arenaNome}${cliente?' — '+cliente:''}: ${itens.map(i=>i.produtoNome).join(', ').slice(0,80)}`;
    const formaMap  = { 'Dinheiro':'dinheiro','PIX':'pix','Cartão de Crédito':'cartao_credito','Cartão de Débito':'cartao_debito','Transferência':'transferencia' };
    try {
      Storage.create('financeiro', { data, tipo:'receita', categoria:'Venda de Produtos', descricao, valor: total, formaPagamento: formaMap[forma]||'dinheiro', status:'pago', origem:'loja', origemId: vendaId });
      const totalCMV = itens.reduce((s,i)=>s+(parseFloat(i.precoCusto)||0)*(i.qtd||1),0);
      if (totalCMV > 0.01) Storage.create('financeiro', { data, tipo:'cmv', categoria:'cmv_loja', descricao: `CMV — ${descricao}`.slice(0,120), valor: totalCMV, formaPagamento:'interno', status:'pago', origem:'loja', origemId: vendaId });
    } catch(e) { console.warn('Erro financeiro:', e); }
  },

  verVenda(id) {
    const v = Storage.getById(this.SK_VEND, id);
    if (!v) return;
    UI.openModal({
      title: `Venda — ${this._fmtData(v.data)}`,
      hideFooter: true,
      content: `
        <div style="font-size:14px;">
          <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
            <div><strong>Loja:</strong> ${UI.escape(v.arenaNome||'—')}</div>
            <div><strong>Cliente:</strong> ${UI.escape(v.clienteNome||'Avulso')}</div>
            <div><strong>Pagamento:</strong> ${UI.escape(v.formaPagamento||'—')}</div>
          </div>
          <table class="data-table">
            <thead><tr><th>Produto</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Unit.</th><th style="text-align:right;">Total</th></tr></thead>
            <tbody>${(v.itens||[]).map(i=>`
              <tr>
                <td>${UI.escape(i.produtoNome)}</td>
                <td style="text-align:center;">${i.qtd}</td>
                <td style="text-align:right;">${this._fmt(i.precoUnit)}</td>
                <td style="text-align:right;font-weight:600;">${this._fmt(i.total)}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr><td colspan="3" style="text-align:right;padding:8px 12px;">Subtotal</td><td style="text-align:right;padding:8px 12px;">${this._fmt(v.subtotal||0)}</td></tr>
              ${v.desconto ? `<tr><td colspan="3" style="text-align:right;padding:4px 12px;color:var(--danger);">Desconto</td><td style="text-align:right;padding:4px 12px;color:var(--danger);">- ${this._fmt(v.desconto)}</td></tr>` : ''}
              <tr><td colspan="3" style="text-align:right;font-weight:800;padding:10px 12px;font-size:15px;">TOTAL</td><td style="text-align:right;font-weight:800;padding:10px 12px;font-size:15px;color:var(--success);">${this._fmt(v.total||0)}</td></tr>
            </tfoot>
          </table>
        </div>`,
    });
  },

  /* ------------------------------------------------------------------ */
  /*  ABA: FORNECEDORES                                                   */
  /* ------------------------------------------------------------------ */

  _tabFornecedores() {
    const forns = Storage.getAll(this.SK_FORN).sort((a,b)=>a.nome.localeCompare(b.nome));
    if (!forns.length) return `
      <div class="empty-state">
        <div class="empty-icon">🚚</div>
        <div class="empty-title">Nenhum fornecedor cadastrado</div>
        <button class="btn btn-primary mt-16" onclick="LojaModule.openModalFornecedor()">+ Cadastrar Fornecedor</button>
      </div>`;
    return `
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr><th>Fornecedor</th><th>CNPJ</th><th>Contato</th><th>Telefone</th><th>E-mail</th><th></th></tr></thead>
            <tbody>
              ${forns.map(f=>`
                <tr>
                  <td><strong>${UI.escape(f.nome)}</strong></td>
                  <td>${UI.escape(f.cnpj||'—')}</td>
                  <td>${UI.escape(f.contato||'—')}</td>
                  <td>${UI.escape(f.telefone||'—')}</td>
                  <td>${UI.escape(f.email||'—')}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="LojaModule.openModalFornecedor('${f.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm danger" onclick="LojaModule.deleteFornecedor('${f.id}')">🗑️</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  openModalFornecedor(id = null) {
    const f = id ? Storage.getById(this.SK_FORN, id) : null;
    const v = (k,fb='') => f ? UI.escape(String(f[k]??fb)) : fb;
    UI.openModal({
      title: f ? `Editar — ${f.nome}` : 'Novo Fornecedor',
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Nome / Razão Social <span class="required-star">*</span></label>
            <input id="fn-nome" class="form-input" value="${v('nome')}" />
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">CNPJ</label><input id="fn-cnpj" class="form-input" value="${v('cnpj')}" placeholder="00.000.000/0001-00" /></div>
            <div class="form-group"><label class="form-label">Contato</label><input id="fn-contato" class="form-input" value="${v('contato')}" /></div>
          </div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label">Telefone</label><input id="fn-tel" class="form-input" value="${v('telefone')}" placeholder="(00) 00000-0000" /></div>
            <div class="form-group"><label class="form-label">E-mail</label><input id="fn-email" class="form-input" type="email" value="${v('email')}" /></div>
          </div>
          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea id="fn-obs" class="form-textarea" rows="2">${f ? UI.escape(f.observacoes||'') : ''}</textarea>
          </div>
        </div>`,
      confirmLabel: f ? 'Salvar' : 'Cadastrar',
      onConfirm: () => this._saveFornecedor(id),
    });
  },

  _saveFornecedor(id) {
    const nome = document.getElementById('fn-nome');
    if (!nome?.value.trim()) { UI.toast('Informe o nome.','warning'); return; }
    const record = { nome: nome.value.trim(), cnpj: document.getElementById('fn-cnpj')?.value.trim()||'', contato: document.getElementById('fn-contato')?.value.trim()||'', telefone: document.getElementById('fn-tel')?.value.trim()||'', email: document.getElementById('fn-email')?.value.trim()||'', observacoes: document.getElementById('fn-obs')?.value.trim()||'' };
    if (id) { Storage.update(this.SK_FORN, id, record); UI.toast('Fornecedor atualizado.','success'); }
    else    { Storage.create(this.SK_FORN, record);      UI.toast('Fornecedor cadastrado.','success'); }
    UI.closeModal(); this.render('fornecedores');
  },

  async deleteFornecedor(id) {
    const f = Storage.getById(this.SK_FORN, id);
    if (!f) return;
    const ok = await UI.confirm(`Excluir fornecedor "${f.nome}"?`, 'Excluir');
    if (!ok) return;
    Storage.delete(this.SK_FORN, id);
    UI.toast('Fornecedor excluído.','success');
    this.render('fornecedores');
  },

  /* ------------------------------------------------------------------ */
  /*  ABA: RELATÓRIOS                                                     */
  /* ------------------------------------------------------------------ */

  _tabRelatorios() {
    const vendas   = Storage.getAll(this.SK_VEND);
    const produtos = Storage.getAll(this.SK_PROD);

    const rankProd = {};
    vendas.forEach(v => (v.itens||[]).forEach(i => { rankProd[i.produtoNome] = (rankProd[i.produtoNome]||0) + (i.qtd||1); }));
    const maisVendidos = Object.entries(rankProd).sort((a,b)=>b[1]-a[1]).slice(0,10);

    const fatArena = {};
    vendas.forEach(v => { const k = v.arenaNome||'Não identificado'; fatArena[k] = (fatArena[k]||0) + (parseFloat(v.total)||0); });

    const fatMes = {};
    vendas.forEach(v => { const mes=(v.data||'').slice(0,7); if(mes) fatMes[mes]=(fatMes[mes]||0)+(parseFloat(v.total)||0); });
    const meses = Object.entries(fatMes).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);

    return `
      <div class="form-grid-2" style="margin-bottom:24px;">
        <div class="card">
          <div class="card-header" style="padding:14px 18px;"><h3 style="margin:0;font-size:14px;font-weight:700;">🏆 Produtos mais vendidos</h3></div>
          <div class="card-body" style="padding:0;">
            ${maisVendidos.length ? `
              <table class="data-table">
                <thead><tr><th>#</th><th>Produto</th><th style="text-align:center;">Qtd</th></tr></thead>
                <tbody>${maisVendidos.map(([nome,qtd],i)=>`
                  <tr>
                    <td style="color:var(--text-muted);font-weight:700;">${i+1}</td>
                    <td>${UI.escape(nome)}</td>
                    <td style="text-align:center;font-weight:700;">${qtd}</td>
                  </tr>`).join('')}
                </tbody>
              </table>`
            : '<div style="padding:20px;text-align:center;color:var(--text-muted);">Sem vendas</div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header" style="padding:14px 18px;"><h3 style="margin:0;font-size:14px;font-weight:700;">🏪 Faturamento por Loja</h3></div>
          <div class="card-body" style="padding:0;">
            ${Object.keys(fatArena).length ? `
              <table class="data-table">
                <thead><tr><th>Loja</th><th style="text-align:right;">Total</th></tr></thead>
                <tbody>${Object.entries(fatArena).sort((a,b)=>b[1]-a[1]).map(([arena,val])=>`
                  <tr>
                    <td><span class="badge badge-blue">${UI.escape(arena)}</span></td>
                    <td style="text-align:right;font-weight:700;">${this._fmt(val)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>`
            : '<div style="padding:20px;text-align:center;color:var(--text-muted);">Sem dados</div>'}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header" style="padding:14px 18px;"><h3 style="margin:0;font-size:14px;font-weight:700;">📅 Faturamento mensal (últimos 6 meses)</h3></div>
        <div class="card-body" style="padding:16px 20px;">
          ${meses.length ? (() => {
            const max = Math.max(...meses.map(([,v])=>v),1);
            return meses.map(([mes,val]) => {
              const pct = Math.round((val/max)*100);
              const [y,m] = mes.split('-');
              const label = new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
              return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                <span style="width:60px;font-size:12px;color:var(--text-muted);">${label}</span>
                <div style="flex:1;background:var(--border-color);border-radius:99px;height:12px;overflow:hidden;">
                  <div style="width:${pct}%;height:100%;background:var(--primary);border-radius:99px;"></div>
                </div>
                <span style="width:90px;text-align:right;font-weight:700;font-size:13px;">${this._fmt(val)}</span>
              </div>`;
            }).join('');
          })()
          : '<div style="text-align:center;color:var(--text-muted);">Sem vendas registradas</div>'}
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _fmt(v) { return (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); },
  _fmtData(iso) { if(!iso) return '—'; const [y,m,d]=iso.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('pt-BR'); },
};
