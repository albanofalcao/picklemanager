'use strict';

/**
 * ListasModule — Administração de listas configuráveis por módulo.
 */
const ListasModule = {

  _state: {
    moduloAtivo: '',   // '' = todos
    chaveAtiva:  null, // chave sendo editada
    _itensTemp:  [],   // itens em edição
  },

  /* ------------------------------------------------------------------ */
  /*  Render principal                                                    */
  /* ------------------------------------------------------------------ */

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;
    area.innerHTML = this.renderContent();
  },

  /** Retorna apenas o HTML do conteúdo (usado pelo AdminModule como aba) */
  renderContent() {
    const porModulo = {};
    Object.entries(ListasService.DEFAULTS).forEach(([chave, def]) => {
      if (!porModulo[def.modulo]) porModulo[def.modulo] = [];
      porModulo[def.modulo].push({ chave, ...def });
    });

    const modulos    = Object.keys(porModulo).sort();
    const filtro     = this._state.moduloAtivo;
    const exibir     = filtro ? { [filtro]: porModulo[filtro] } : porModulo;
    const totalCustom= Object.keys(ListasService._loadConfig()).length;
    const total      = Object.values(exibir).flat().length;

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div class="filters-bar" style="margin:0;">
          <select class="filter-select" onchange="ListasModule.filtrarModulo(this.value)" style="min-width:180px;">
            <option value="">Todos os módulos</option>
            ${modulos.map(m => `<option value="${m}" ${filtro===m?'selected':''}>${m}</option>`).join('')}
          </select>
          <span class="results-count">${total} lista${total!==1?'s':''}</span>
        </div>
        ${totalCustom > 0 ? `
        <button class="btn btn-ghost btn-sm danger" onclick="ListasModule.resetarTudo()">
          ↺ Restaurar todos os padrões
        </button>` : ''}
      </div>

      ${Object.entries(exibir).map(([modulo, listas]) => `
        <div class="listas-group">
          <div class="listas-group-header">
            <span class="listas-group-title">${modulo}</span>
            <span class="listas-group-count">${listas.length} lista${listas.length!==1?'s':''}</span>
          </div>
          <div class="listas-grid">
            ${listas.map(lista => this._renderListaCard(lista)).join('')}
          </div>
        </div>`).join('')}
    `;
  },

  _renderListaCard(lista) {
    const itens      = ListasService.get(lista.chave);
    const custom     = ListasService.isCustomized(lista.chave);
    const editando   = this._state.chaveAtiva === lista.chave;

    const itemsHtml = editando
      ? this._renderEditor(lista.chave)
      : `<div class="lista-items-view">
          ${itens.map(it => `
            <span class="lista-chip">${it.l}</span>`).join('')}
        </div>
        <div class="lista-card-footer">
          ${custom ? `<span class="badge badge-blue" style="font-size:10px;">Personalizada</span>` : `<span style="font-size:11px;color:var(--text-muted);">Padrão do sistema</span>`}
          <div style="display:flex;gap:6px;margin-left:auto;">
            ${custom ? `<button class="btn btn-ghost btn-sm" onclick="ListasModule.resetarLista('${lista.chave}')" title="Restaurar padrão">↺</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="ListasModule.abrirEditor('${lista.chave}')">✏️ Editar</button>
          </div>
        </div>`;

    return `
      <div class="lista-card ${editando?'lista-card-editing':''}" data-chave="${lista.chave}">
        <div class="lista-card-header">
          <span class="lista-card-title">${lista.label}</span>
          <span class="lista-card-count">${itens.length} item${itens.length!==1?'s':''}</span>
        </div>
        ${itemsHtml}
      </div>`;
  },

  _renderEditor(chave) {
    const itens = this._state._itensTemp;
    return `
      <div class="lista-editor">
        <div id="lista-items-${chave}" class="lista-editor-items">
          ${itens.length
            ? itens.map((it, idx) => this._itemRow(chave, it, idx)).join('')
            : `<div class="cl-empty">Nenhum item. Adicione abaixo.</div>`}
        </div>
        <div class="lista-editor-add">
          <input id="lista-new-val-${chave}" type="text" class="form-input"
            style="width:120px;font-size:12px;" placeholder="chave (sem espaço)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();ListasModule.adicionarItem('${chave}');}" />
          <input id="lista-new-lbl-${chave}" type="text" class="form-input"
            style="flex:1;font-size:12px;" placeholder="Label exibido"
            onkeydown="if(event.key==='Enter'){event.preventDefault();ListasModule.adicionarItem('${chave}');}" />
          <button class="btn btn-secondary btn-sm" onclick="ListasModule.adicionarItem('${chave}')">+ Adicionar</button>
        </div>
        <div class="lista-editor-actions">
          <button class="btn btn-ghost btn-sm" onclick="ListasModule.cancelarEditor()">Cancelar</button>
          <button class="btn btn-primary btn-sm" onclick="ListasModule.salvarEditor('${chave}')">💾 Salvar</button>
        </div>
      </div>`;
  },

  _itemRow(chave, it, idx) {
    return `
      <div class="lista-item-row" data-idx="${idx}">
        <span class="lista-item-val" title="Valor interno">${it.v}</span>
        <input class="form-input" style="flex:1;font-size:13px;" value="${UI.escape(it.l)}"
          oninput="ListasModule.atualizarLabel('${chave}',${idx},this.value)" />
        <button class="btn btn-ghost btn-sm danger" style="padding:4px 8px;"
          onclick="ListasModule.removerItem('${chave}',${idx})">✕</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Ações                                                               */
  /* ------------------------------------------------------------------ */

  _reRender() {
    // Renderiza dentro do AdminModule se for a aba ativa, senão re-renderiza standalone
    if (typeof AdminModule !== 'undefined' && AdminModule._tab === 'listas') {
      AdminModule.render();
    } else {
      this.render();
    }
  },

  filtrarModulo(modulo) {
    this._state.moduloAtivo  = modulo;
    this._state.chaveAtiva   = null;
    this._state._itensTemp   = [];
    this._reRender();
  },

  abrirEditor(chave) {
    const itens = ListasService.get(chave);
    this._state._itensTemp = itens.map(i => ({ ...i }));
    this._state.chaveAtiva = chave;
    this._reRender();
    setTimeout(() => {
      const el = document.querySelector(`[data-chave="${chave}"] .lista-editor`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  },

  cancelarEditor() {
    this._state.chaveAtiva  = null;
    this._state._itensTemp  = [];
    this._reRender();
  },

  salvarEditor(chave) {
    const itens = this._state._itensTemp.filter(i => i.v && i.l);
    if (!itens.length) {
      UI.toast('Adicione ao menos um item antes de salvar.', 'warning');
      return;
    }
    const vals = itens.map(i => i.v);
    if (new Set(vals).size !== vals.length) {
      UI.toast('Existem valores (chaves) duplicados. Corrija antes de salvar.', 'warning');
      return;
    }
    ListasService.set(chave, itens);
    this._state.chaveAtiva = null;
    this._state._itensTemp = [];
    UI.toast(`Lista "${ListasService.DEFAULTS[chave]?.label}" salva com sucesso!`, 'success');
    this._reRender();
  },

  adicionarItem(chave) {
    const valEl = document.getElementById(`lista-new-val-${chave}`);
    const lblEl = document.getElementById(`lista-new-lbl-${chave}`);
    if (!valEl || !lblEl) return;

    const v = valEl.value.trim().toLowerCase().replace(/\s+/g, '_');
    const l = lblEl.value.trim();

    if (!v || !l) { UI.toast('Preencha a chave e o label.', 'warning'); return; }
    if (this._state._itensTemp.find(i => i.v === v)) {
      UI.toast('Já existe um item com essa chave.', 'warning'); return;
    }

    // Preserva campos extras (ex: dias em frequencia)
    const defaultItem = ListasService.DEFAULTS[chave]?.itens.find(i => i.v === v) || {};
    this._state._itensTemp.push({ ...defaultItem, v, l });
    valEl.value = '';
    lblEl.value = '';
    this._refreshEditor(chave);
  },

  removerItem(chave, idx) {
    this._state._itensTemp.splice(idx, 1);
    this._refreshEditor(chave);
  },

  atualizarLabel(chave, idx, value) {
    if (this._state._itensTemp[idx]) this._state._itensTemp[idx].l = value;
  },

  _refreshEditor(chave) {
    const el = document.getElementById(`lista-items-${chave}`);
    if (!el) return;
    const itens = this._state._itensTemp;
    el.innerHTML = itens.length
      ? itens.map((it, idx) => this._itemRow(chave, it, idx)).join('')
      : `<div class="cl-empty">Nenhum item. Adicione abaixo.</div>`;
  },

  async resetarLista(chave) {
    const nome = ListasService.DEFAULTS[chave]?.label || chave;
    if (!await UI.confirm(`Restaurar "${nome}" para o padrão do sistema?`, 'Restaurar Padrão')) return;
    ListasService.reset(chave);
    UI.toast(`"${nome}" restaurada para o padrão.`, 'success');
    this._reRender();
  },

  async resetarTudo() {
    if (!await UI.confirm('Restaurar TODAS as listas para o padrão do sistema?', 'Restaurar Tudo')) return;
    localStorage.removeItem('pm_listas_config');
    UI.toast('Todas as listas restauradas para o padrão.', 'success');
    this._reRender();
  },
};
