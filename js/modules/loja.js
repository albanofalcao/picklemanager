'use strict';

/**
 * LojaModule — Loja de materiais de pickleball
 * Abas: Produtos | Estoque | Vendas | Fornecedores | Relatórios
 */
const LojaModule = {
  SK_PROD: 'loja_produtos',
  SK_FORN: 'loja_fornecedores',
  SK_VEND: 'loja_vendas',
  SK_MOV:  'loja_estoque_mov',

  _tab: 'produtos',

  CATEGORIAS: ['Raquetes', 'Bolas', 'Roupas', 'Calçados', 'Acessórios', 'Outros'],

  FORMA_PAG: ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'],

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
          <p>Gestão de produtos, estoque, vendas e fornecedores</p>
        </div>
        ${this._tab === 'produtos'    ? `<button class="btn btn-primary" onclick="LojaModule.openModalProduto()">+ Novo Produto</button>` : ''}
        ${this._tab === 'fornecedores'? `<button class="btn btn-primary" onclick="LojaModule.openModalFornecedor()">+ Novo Fornecedor</button>` : ''}
        ${this._tab === 'vendas'      ? `<button class="btn btn-primary" onclick="LojaModule.openModalVenda()">🛍️ Nova Venda</button>` : ''}
        ${this._tab === 'estoque'     ? `<button class="btn btn-secondary" onclick="LojaModule.openModalMovEstoque()">📥 Entrada de Mercadoria</button>` : ''}
      </div>

      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-icon blue">📦</div>
          <div class="stat-info">
            <div class="stat-value">${stats.totalProdutos}</div>
            <div class="stat-label">Produtos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">⚠️</div>
          <div class="stat-info">
            <div class="stat-value">${stats.estoqueCritico}</div>
            <div class="stat-label">Estoque crítico</div>
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

      <div class="tabs-bar" style="margin-bottom:24px;">
        <button class="tab-btn ${this._tab==='produtos'     ?'active':''}" onclick="LojaModule.render('produtos')">📦 Produtos</button>
        <button class="tab-btn ${this._tab==='estoque'      ?'active':''}" onclick="LojaModule.render('estoque')">🗃️ Estoque</button>
        <button class="tab-btn ${this._tab==='vendas'       ?'active':''}" onclick="LojaModule.render('vendas')">🛍️ Vendas</button>
        <button class="tab-btn ${this._tab==='fornecedores' ?'active':''}" onclick="LojaModule.render('fornecedores')">🚚 Fornecedores</button>
        <button class="tab-btn ${this._tab==='relatorios'   ?'active':''}" onclick="LojaModule.render('relatorios')">📊 Relatórios</button>
      </div>

      <div id="loja-tab-content">
        ${this._tab === 'produtos'     ? this._tabProdutos()     : ''}
        ${this._tab === 'estoque'      ? this._tabEstoque()      : ''}
        ${this._tab === 'vendas'       ? this._tabVendas()       : ''}
        ${this._tab === 'fornecedores' ? this._tabFornecedores() : ''}
        ${this._tab === 'relatorios'   ? this._tabRelatorios()   : ''}
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Stats                                                               */
  /* ------------------------------------------------------------------ */

  _getStats() {
    const produtos = Storage.getAll(this.SK_PROD);
    const vendas   = Storage.getAll(this.SK_VEND);
    const hoje     = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;

    const vendasMes = vendas.filter(v => (v.data || '').startsWith(mesAtual));
    return {
      totalProdutos:   produtos.filter(p => p.status !== 'inativo').length,
      estoqueCritico:  produtos.filter(p => p.status !== 'inativo' && (parseInt(p.estoqueAtual,10)||0) <= (parseInt(p.estoqueMinimo,10)||0)).length,
      vendasMes:       vendasMes.length,
      faturamentoMes:  vendasMes.reduce((s,v) => s + (parseFloat(v.total)||0), 0),
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
        <div class="empty-desc">Cadastre os produtos da loja para começar.</div>
        <button class="btn btn-primary mt-16" onclick="LojaModule.openModalProduto()">+ Cadastrar primeiro produto</button>
      </div>`;

    const catAlert = p => (parseInt(p.estoqueAtual,10)||0) <= (parseInt(p.estoqueMinimo,10)||0)
      ? `<span class="badge badge-danger" title="Estoque crítico">⚠️ Crítico</span>`
      : `<span class="badge badge-success">✓ OK</span>`;

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
              <th style="text-align:center;">Estoque</th>
              <th style="text-align:center;">Status</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${produtos.map(p => `
                <tr>
                  <td><strong>${UI.escape(p.nome)}</strong>${p.sku ? `<br><small style="color:var(--text-muted);">SKU: ${UI.escape(p.sku)}</small>` : ''}</td>
                  <td><span class="badge badge-blue">${UI.escape(p.categoria||'—')}</span></td>
                  <td>${UI.escape(p.marca||'—')}</td>
                  <td style="text-align:right;">${this._fmt(p.precoCusto||0)}</td>
                  <td style="text-align:right;font-weight:600;">${this._fmt(p.precoVenda||0)}</td>
                  <td style="text-align:center;"><strong>${p.estoqueAtual||0}</strong> / mín ${p.estoqueMinimo||0}</td>
                  <td style="text-align:center;">${catAlert(p)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="LojaModule.openModalProduto('${p.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm danger" onclick="LojaModule.inativarProduto('${p.id}')">🗑️</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  openModalProduto(id = null) {
    const p    = id ? Storage.getById(this.SK_PROD, id) : null;
    const isEdit = !!p;
    const v    = (f, fb='') => p ? UI.escape(String(p[f]??fb)) : fb;

    const fornOpts = `<option value="">— Selecionar —</option>` +
      Storage.getAll(this.SK_FORN).map(f =>
        `<option value="${f.id}" ${p?.fornecedorId===f.id?'selected':''}>${UI.escape(f.nome)}</option>`
      ).join('');

    const catOpts = this.CATEGORIAS.map(c =>
      `<option ${(p?.categoria||''===c)?'selected':''}>${c}</option>`
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
              <label class="form-label">Estoque Atual</label>
              <input id="lp-estoque" class="form-input" type="number" min="0" value="${v('estoqueAtual','0')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Estoque Mínimo (alerta)</label>
              <input id="lp-minimo" class="form-input" type="number" min="0" value="${v('estoqueMinimo','2')}" />
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
    const nome  = document.getElementById('lp-nome');
    const venda = document.getElementById('lp-venda');
    if (!nome?.value.trim()) { UI.toast('Informe o nome do produto.','warning'); nome?.classList.add('error'); return; }

    const record = {
      nome:         nome.value.trim(),
      categoria:    document.getElementById('lp-cat')?.value    || '',
      marca:        document.getElementById('lp-marca')?.value.trim() || '',
      sku:          document.getElementById('lp-sku')?.value.trim()   || '',
      fornecedorId: document.getElementById('lp-forn')?.value   || '',
      precoCusto:   parseFloat(document.getElementById('lp-custo')?.value)  || 0,
      precoVenda:   parseFloat(document.getElementById('lp-venda')?.value)  || 0,
      estoqueAtual: parseInt(document.getElementById('lp-estoque')?.value,10) || 0,
      estoqueMinimo:parseInt(document.getElementById('lp-minimo')?.value,10)  || 0,
      descricao:    document.getElementById('lp-desc')?.value.trim() || '',
      status:       'ativo',
    };

    if (id) {
      Storage.update(this.SK_PROD, id, record);
      UI.toast('Produto atualizado.', 'success');
    } else {
      Storage.create(this.SK_PROD, record);
      UI.toast('Produto cadastrado.', 'success');
    }
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
    const produtos = Storage.getAll(this.SK_PROD).filter(p => p.status !== 'inativo');
    const movs     = Storage.getAll(this.SK_MOV).slice().sort((a,b) => (b.data||'').localeCompare(a.data||'')).slice(0,50);

    const criticos = produtos.filter(p => (parseInt(p.estoqueAtual,10)||0) <= (parseInt(p.estoqueMinimo,10)||0));

    return `
      ${criticos.length ? `
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
          <strong style="color:#991b1b;">⚠️ ${criticos.length} produto(s) com estoque crítico:</strong>
          <ul style="margin:8px 0 0 18px;color:#991b1b;font-size:13px;">
            ${criticos.map(p => `<li>${UI.escape(p.nome)} — ${p.estoqueAtual||0} un. (mín: ${p.estoqueMinimo||0})</li>`).join('')}
          </ul>
        </div>` : ''}

      <div class="form-grid-2" style="margin-bottom:24px;">
        <!-- Saldo atual -->
        <div class="card">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="margin:0;font-size:14px;font-weight:700;">📦 Saldo por Produto</h3>
          </div>
          <div class="card-body" style="padding:0;">
            <table class="data-table">
              <thead><tr>
                <th>Produto</th>
                <th style="text-align:center;">Qtd</th>
                <th style="text-align:center;">Mín</th>
                <th style="text-align:center;">Status</th>
              </tr></thead>
              <tbody>
                ${produtos.length ? produtos.sort((a,b)=>a.nome.localeCompare(b.nome)).map(p => {
                  const qtd  = parseInt(p.estoqueAtual,10)||0;
                  const min  = parseInt(p.estoqueMinimo,10)||0;
                  const crit = qtd <= min;
                  return `<tr>
                    <td>${UI.escape(p.nome)}</td>
                    <td style="text-align:center;font-weight:700;color:${crit?'var(--danger)':'inherit'};">${qtd}</td>
                    <td style="text-align:center;color:var(--text-muted);">${min}</td>
                    <td style="text-align:center;">${crit
                      ? '<span class="badge badge-danger">Crítico</span>'
                      : '<span class="badge badge-success">OK</span>'}</td>
                  </tr>`;
                }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">Nenhum produto</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Últimas movimentações -->
        <div class="card">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="margin:0;font-size:14px;font-weight:700;">🔄 Últimas Movimentações</h3>
          </div>
          <div class="card-body" style="padding:0;">
            <table class="data-table">
              <thead><tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th style="text-align:center;">Qtd</th>
              </tr></thead>
              <tbody>
                ${movs.length ? movs.map(m => `
                  <tr>
                    <td style="white-space:nowrap;">${this._fmtData(m.data)}</td>
                    <td>${UI.escape(m.produtoNome||'—')}</td>
                    <td><span class="badge ${m.tipo==='entrada'?'badge-success':m.tipo==='saida'?'badge-danger':'badge-blue'}">${
                      m.tipo==='entrada'?'Entrada':m.tipo==='saida'?'Saída':'Ajuste'
                    }</span></td>
                    <td style="text-align:center;font-weight:600;">${m.tipo==='saida'?'-':'+'} ${m.quantidade}</td>
                  </tr>`).join('')
                : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">Nenhuma movimentação</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  openModalMovEstoque() {
    const prodOpts = `<option value="">— Selecionar produto —</option>` +
      Storage.getAll(this.SK_PROD).filter(p=>p.status!=='inativo').sort((a,b)=>a.nome.localeCompare(b.nome)).map(p =>
        `<option value="${p.id}">${UI.escape(p.nome)} (estoque: ${p.estoqueAtual||0})</option>`
      ).join('');

    UI.openModal({
      title: '📥 Entrada de Mercadoria',
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Produto <span class="required-star">*</span></label>
            <select id="mov-prod" class="form-select">${prodOpts}</select>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Quantidade <span class="required-star">*</span></label>
              <input id="mov-qtd" class="form-input" type="number" min="1" value="1" />
            </div>
            <div class="form-group">
              <label class="form-label">Data</label>
              <input id="mov-data" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observação</label>
            <input id="mov-obs" class="form-input" placeholder="ex: Compra NF 1234" />
          </div>
        </div>`,
      confirmLabel: 'Registrar Entrada',
      onConfirm: () => this._saveMovEstoque(),
    });
  },

  _saveMovEstoque() {
    const prodSel = document.getElementById('mov-prod');
    const qtdEl   = document.getElementById('mov-qtd');
    if (!prodSel?.value) { UI.toast('Selecione o produto.','warning'); return; }
    const qtd = parseInt(qtdEl?.value,10)||0;
    if (qtd <= 0) { UI.toast('Informe a quantidade.','warning'); return; }

    const produto = Storage.getById(this.SK_PROD, prodSel.value);
    if (!produto) return;

    const novoEstoque = (parseInt(produto.estoqueAtual,10)||0) + qtd;
    Storage.update(this.SK_PROD, produto.id, { estoqueAtual: novoEstoque });

    Storage.create(this.SK_MOV, {
      data:        document.getElementById('mov-data')?.value || new Date().toISOString().slice(0,10),
      produtoId:   produto.id,
      produtoNome: produto.nome,
      tipo:        'entrada',
      quantidade:  qtd,
      motivo:      document.getElementById('mov-obs')?.value.trim() || 'Entrada manual',
    });

    UI.toast(`Entrada de ${qtd} un. registrada. Novo estoque: ${novoEstoque}.`, 'success');
    UI.closeModal();
    this.render('estoque');
  },

  /* ------------------------------------------------------------------ */
  /*  ABA: VENDAS                                                         */
  /* ------------------------------------------------------------------ */

  _tabVendas() {
    const vendas = Storage.getAll(this.SK_VEND)
      .slice().sort((a,b)=>(b.data||'').localeCompare(a.data||''));

    if (!vendas.length) return `
      <div class="empty-state">
        <div class="empty-icon">🛍️</div>
        <div class="empty-title">Nenhuma venda registrada</div>
        <div class="empty-desc">Registre a primeira venda da loja.</div>
        <button class="btn btn-primary mt-16" onclick="LojaModule.openModalVenda()">🛍️ Registrar Venda</button>
      </div>`;

    return `
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Pagamento</th>
              <th style="text-align:right;">Total</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${vendas.map(v => `
                <tr>
                  <td style="white-space:nowrap;">${this._fmtData(v.data)}</td>
                  <td>${UI.escape(v.clienteNome||'Avulso')}</td>
                  <td style="color:var(--text-muted);font-size:13px;">${(v.itens||[]).map(i=>UI.escape(i.produtoNome)).join(', ').slice(0,60)||'—'}</td>
                  <td><span class="badge badge-blue">${UI.escape(v.formaPagamento||'—')}</span></td>
                  <td style="text-align:right;font-weight:700;">${this._fmt(v.total||0)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="LojaModule.verVenda('${v.id}')" title="Detalhes">👁️</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  openModalVenda() {
    const produtos = Storage.getAll(this.SK_PROD).filter(p=>p.status!=='inativo' && (parseInt(p.estoqueAtual,10)||0) > 0);
    const prodOpts = `<option value="">— Selecionar —</option>` +
      produtos.sort((a,b)=>a.nome.localeCompare(b.nome)).map(p =>
        `<option value="${p.id}" data-preco="${p.precoVenda||0}">${UI.escape(p.nome)} — ${this._fmt(p.precoVenda||0)} (${p.estoqueAtual} un.)</option>`
      ).join('');
    const pagOpts = this.FORMA_PAG.map(f=>`<option>${f}</option>`).join('');

    UI.openModal({
      title: '🛍️ Registrar Venda',
      content: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Cliente (opcional)</label>
            <input id="vd-cliente" class="form-input" placeholder="Nome do cliente ou deixe em branco" />
          </div>

          <!-- Adicionar itens -->
          <div class="card" style="border:1px solid var(--border-color);border-radius:10px;padding:14px;margin-bottom:4px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:10px;">Itens da venda</div>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px;">
              <div style="flex:3;min-width:160px;">
                <label class="form-label" style="font-size:11px;">Produto</label>
                <select id="vd-prod" class="form-select" style="height:34px;"
                  onchange="LojaModule._onProdSelect()">${prodOpts}</select>
              </div>
              <div style="width:70px;">
                <label class="form-label" style="font-size:11px;">Qtd</label>
                <input id="vd-qtd" class="form-input" style="height:34px;" type="number" min="1" value="1" />
              </div>
              <div style="width:110px;">
                <label class="form-label" style="font-size:11px;">Preço unit.</label>
                <input id="vd-preco" class="form-input" style="height:34px;" type="number" min="0" step="0.01" />
              </div>
              <button class="btn btn-secondary btn-sm" style="height:34px;" onclick="LojaModule._addItemVenda()">+ Item</button>
            </div>
            <table class="data-table" id="vd-itens-table">
              <thead><tr><th>Produto</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Unit.</th><th style="text-align:right;">Total</th><th></th></tr></thead>
              <tbody id="vd-itens-body"><tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:10px;">Nenhum item adicionado</td></tr></tbody>
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
              <input id="vd-desconto" class="form-input" type="number" min="0" step="0.01" value="0"
                oninput="LojaModule._atualizarTotal()" />
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

    // carrega itens temporários
    window._lojaVendaItens = [];
  },

  _onProdSelect() {
    const sel = document.getElementById('vd-prod');
    const opt = sel?.selectedOptions[0];
    const preco = opt?.dataset.preco || '0';
    const precoEl = document.getElementById('vd-preco');
    if (precoEl) precoEl.value = parseFloat(preco).toFixed(2);
  },

  _addItemVenda() {
    const sel   = document.getElementById('vd-prod');
    const qtdEl = document.getElementById('vd-qtd');
    const prEl  = document.getElementById('vd-preco');

    if (!sel?.value) { UI.toast('Selecione um produto.','warning'); return; }
    const qtd   = parseInt(qtdEl?.value,10)||1;
    const preco = parseFloat(prEl?.value)||0;
    if (qtd <= 0 || preco < 0) { UI.toast('Informe quantidade e preço válidos.','warning'); return; }

    const produto = Storage.getById(this.SK_PROD, sel.value);
    if (!produto) return;

    // Verifica estoque disponível
    const jaNoCarrinho = (window._lojaVendaItens||[]).filter(i=>i.produtoId===produto.id).reduce((s,i)=>s+i.qtd,0);
    if (jaNoCarrinho + qtd > (parseInt(produto.estoqueAtual,10)||0)) {
      UI.toast(`Estoque insuficiente. Disponível: ${(parseInt(produto.estoqueAtual,10)||0) - jaNoCarrinho} un.`,'warning');
      return;
    }

    window._lojaVendaItens = window._lojaVendaItens || [];
    window._lojaVendaItens.push({ produtoId: produto.id, produtoNome: produto.nome, qtd, precoUnit: preco, total: qtd * preco });

    this._renderItensVenda();
    sel.value = '';
    if (qtdEl) qtdEl.value = '1';
    if (prEl)  prEl.value  = '';
  },

  _renderItensVenda() {
    const itens = window._lojaVendaItens || [];
    const tbody = document.getElementById('vd-itens-body');
    const subtEl = document.getElementById('vd-subtotal');
    if (!tbody) return;

    const subtotal = itens.reduce((s,i)=>s+(i.total||0),0);
    tbody.innerHTML = itens.length
      ? itens.map((i,idx) => `
          <tr>
            <td>${UI.escape(i.produtoNome)}</td>
            <td style="text-align:center;">${i.qtd}</td>
            <td style="text-align:right;">${this._fmt(i.precoUnit)}</td>
            <td style="text-align:right;font-weight:600;">${this._fmt(i.total)}</td>
            <td style="text-align:center;">
              <button class="btn btn-ghost btn-sm danger" style="padding:2px 6px;"
                onclick="LojaModule._remItemVenda(${idx})">✕</button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:10px;">Nenhum item</td></tr>';

    if (subtEl) subtEl.textContent = this._fmt(subtotal);
    this._atualizarTotal();
  },

  _remItemVenda(idx) {
    window._lojaVendaItens.splice(idx, 1);
    this._renderItensVenda();
  },

  _atualizarTotal() {
    const itens    = window._lojaVendaItens || [];
    const subtotal = itens.reduce((s,i)=>s+(i.total||0),0);
    const desconto = parseFloat(document.getElementById('vd-desconto')?.value)||0;
    const total    = Math.max(0, subtotal - desconto);
    const el = document.getElementById('vd-total-display');
    if (el) el.textContent = this._fmt(total);
  },

  _saveVenda() {
    const itens = window._lojaVendaItens || [];
    if (!itens.length) { UI.toast('Adicione pelo menos um item.','warning'); return; }

    const desconto = parseFloat(document.getElementById('vd-desconto')?.value)||0;
    const subtotal = itens.reduce((s,i)=>s+(i.total||0),0);
    const total    = Math.max(0, subtotal - desconto);
    const forma    = document.getElementById('vd-pag')?.value || 'Dinheiro';
    const cliente  = document.getElementById('vd-cliente')?.value.trim() || '';
    const hoje     = new Date().toISOString().slice(0,10);

    // Registra a venda
    const venda = Storage.create(this.SK_VEND, {
      data:           hoje,
      clienteNome:    cliente,
      itens,
      subtotal,
      desconto,
      total,
      formaPagamento: forma,
    });

    // Baixa estoque e registra movimentações
    itens.forEach(item => {
      const prod = Storage.getById(this.SK_PROD, item.produtoId);
      if (prod) {
        const novoEst = Math.max(0, (parseInt(prod.estoqueAtual,10)||0) - item.qtd);
        Storage.update(this.SK_PROD, item.produtoId, { estoqueAtual: novoEst });
        Storage.create(this.SK_MOV, {
          data: hoje, produtoId: item.produtoId, produtoNome: item.produtoNome,
          tipo: 'saida', quantidade: item.qtd, motivo: 'Venda', vendaId: venda?.id,
        });
      }
    });

    // Integração com Financeiro
    this._lancarFinanceiro(venda?.id, hoje, total, forma, cliente, itens);

    UI.toast(`Venda registrada! Total: ${this._fmt(total)}`, 'success');
    UI.closeModal();
    window._lojaVendaItens = [];
    this.render('vendas');
  },

  _lancarFinanceiro(vendaId, data, total, forma, cliente, itens) {
    const descricao = `Venda Loja${cliente ? ' — ' + cliente : ''}: ${itens.map(i=>i.produtoNome).join(', ').slice(0,80)}`;
    const formaMap  = { 'Dinheiro':'dinheiro','PIX':'pix','Cartão de Crédito':'cartao_credito','Cartão de Débito':'cartao_debito','Transferência':'transferencia' };

    try {
      Storage.create('financeiro', {
        data,
        tipo:           'receita',
        categoria:      'Venda de Produtos',
        descricao,
        valor:          total,
        formaPagamento: formaMap[forma] || 'dinheiro',
        status:         'recebido',
        origem:         'loja',
        origemId:       vendaId,
      });
    } catch(e) {
      console.warn('Erro ao lançar no financeiro:', e);
    }
  },

  verVenda(id) {
    const v = Storage.getById(this.SK_VEND, id);
    if (!v) return;
    UI.openModal({
      title: `Venda — ${this._fmtData(v.data)}`,
      content: `
        <div style="font-size:14px;">
          <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
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
      confirmLabel: null,
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
            <thead><tr>
              <th>Fornecedor</th>
              <th>CNPJ</th>
              <th>Contato</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${forns.map(f => `
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
            <div class="form-group">
              <label class="form-label">CNPJ</label>
              <input id="fn-cnpj" class="form-input" value="${v('cnpj')}" placeholder="00.000.000/0001-00" />
            </div>
            <div class="form-group">
              <label class="form-label">Nome do Contato</label>
              <input id="fn-contato" class="form-input" value="${v('contato')}" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Telefone</label>
              <input id="fn-tel" class="form-input" value="${v('telefone')}" placeholder="(00) 00000-0000" />
            </div>
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input id="fn-email" class="form-input" type="email" value="${v('email')}" />
            </div>
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
    const record = {
      nome:        nome.value.trim(),
      cnpj:        document.getElementById('fn-cnpj')?.value.trim()    || '',
      contato:     document.getElementById('fn-contato')?.value.trim() || '',
      telefone:    document.getElementById('fn-tel')?.value.trim()     || '',
      email:       document.getElementById('fn-email')?.value.trim()   || '',
      observacoes: document.getElementById('fn-obs')?.value.trim()     || '',
    };
    if (id) { Storage.update(this.SK_FORN, id, record); UI.toast('Fornecedor atualizado.','success'); }
    else    { Storage.create(this.SK_FORN, record);      UI.toast('Fornecedor cadastrado.','success'); }
    UI.closeModal();
    this.render('fornecedores');
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

    // Mais vendidos
    const rankProd = {};
    vendas.forEach(v => (v.itens||[]).forEach(i => {
      rankProd[i.produtoNome] = (rankProd[i.produtoNome]||0) + (i.qtd||1);
    }));
    const maisVendidos = Object.entries(rankProd).sort((a,b)=>b[1]-a[1]).slice(0,10);

    // Faturamento por mês (últimos 6)
    const fatMes = {};
    vendas.forEach(v => {
      const mes = (v.data||'').slice(0,7);
      if (mes) fatMes[mes] = (fatMes[mes]||0) + (parseFloat(v.total)||0);
    });
    const meses = Object.entries(fatMes).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);

    // Faturamento por categoria
    const fatCat = {};
    vendas.forEach(v => (v.itens||[]).forEach(i => {
      const prod = produtos.find(p=>p.id===i.produtoId);
      const cat  = prod?.categoria || 'Outros';
      fatCat[cat] = (fatCat[cat]||0) + (i.total||0);
    }));

    return `
      <div class="form-grid-2" style="margin-bottom:24px;">
        <!-- Mais vendidos -->
        <div class="card">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="margin:0;font-size:14px;font-weight:700;">🏆 Produtos mais vendidos</h3>
          </div>
          <div class="card-body" style="padding:0;">
            ${maisVendidos.length ? `
              <table class="data-table">
                <thead><tr><th>#</th><th>Produto</th><th style="text-align:center;">Qtd vendida</th></tr></thead>
                <tbody>
                  ${maisVendidos.map(([nome, qtd], i) => `
                    <tr>
                      <td style="color:var(--text-muted);font-weight:700;">${i+1}</td>
                      <td>${UI.escape(nome)}</td>
                      <td style="text-align:center;font-weight:700;">${qtd}</td>
                    </tr>`).join('')}
                </tbody>
              </table>`
            : '<div style="padding:20px;text-align:center;color:var(--text-muted);">Sem dados de vendas</div>'}
          </div>
        </div>

        <!-- Faturamento por categoria -->
        <div class="card">
          <div class="card-header" style="padding:14px 18px;">
            <h3 style="margin:0;font-size:14px;font-weight:700;">📦 Faturamento por Categoria</h3>
          </div>
          <div class="card-body" style="padding:0;">
            ${Object.keys(fatCat).length ? `
              <table class="data-table">
                <thead><tr><th>Categoria</th><th style="text-align:right;">Valor</th></tr></thead>
                <tbody>
                  ${Object.entries(fatCat).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => `
                    <tr>
                      <td><span class="badge badge-blue">${UI.escape(cat)}</span></td>
                      <td style="text-align:right;font-weight:700;">${this._fmt(val)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>`
            : '<div style="padding:20px;text-align:center;color:var(--text-muted);">Sem dados</div>'}
          </div>
        </div>
      </div>

      <!-- Faturamento por mês -->
      <div class="card">
        <div class="card-header" style="padding:14px 18px;">
          <h3 style="margin:0;font-size:14px;font-weight:700;">📅 Faturamento mensal (últimos 6 meses)</h3>
        </div>
        <div class="card-body" style="padding:16px 20px;">
          ${meses.length ? (() => {
            const max = Math.max(...meses.map(([,v])=>v), 1);
            return meses.map(([mes, val]) => {
              const pct = Math.round((val/max)*100);
              const [y,m] = mes.split('-');
              const label = new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
              return `
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                  <span style="width:60px;font-size:12px;color:var(--text-muted);">${label}</span>
                  <div style="flex:1;background:var(--border-color);border-radius:99px;height:12px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:var(--primary);border-radius:99px;"></div>
                  </div>
                  <span style="width:90px;text-align:right;font-weight:700;font-size:13px;">${this._fmt(val)}</span>
                </div>`;
            }).join('');
          })()
          : '<div style="text-align:center;color:var(--text-muted);">Sem dados de vendas</div>'}
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _fmt(v) {
    return (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  },

  _fmtData(iso) {
    if (!iso) return '—';
    const [y,m,d] = iso.split('-');
    return new Date(+y,+m-1,+d).toLocaleDateString('pt-BR');
  },
};
