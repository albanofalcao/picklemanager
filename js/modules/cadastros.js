'use strict';

/**
 * CadastrosModule — Dynamic lookup tables used across the application.
 * Manages: especialidades, categorias financeiras, tipos de aula, tipos de evento.
 */
const CadastrosModule = {

  _tab: 'especialidades',

  TABS: [
    {
      key:        'especialidades',
      storageKey: 'cat_especialidades',
      label:      'Especialidades',
      icon:       '🎓',
      desc:       'Especialidades disponíveis para cadastro de professores.',
      usedIn:     'Professores',
      placeholder:'ex: Competição Adulto',
    },
    {
      key:        'cat_receita',
      storageKey: 'cat_receita',
      label:      'Categorias de Receita',
      icon:       '💰',
      desc:       'Categorias para classificar lançamentos de receita.',
      usedIn:     'Financeiro',
      placeholder:'ex: Taxa de Quadra',
    },
    {
      key:        'cat_despesa',
      storageKey: 'cat_despesa',
      label:      'Categorias de Despesa',
      icon:       '💸',
      desc:       'Categorias para classificar lançamentos de despesa.',
      usedIn:     'Financeiro',
      placeholder:'ex: Seguro',
    },
    {
      key:        'tipos_aula',
      storageKey: 'cat_tipos_aula',
      label:      'Tipos de Aula',
      icon:       '🏸',
      desc:       'Tipos de aula disponíveis para agendamento.',
      usedIn:     'Aulas',
      placeholder:'ex: Semi-individual',
    },
    {
      key:        'tipos_evento',
      storageKey: 'cat_tipos_evento',
      label:      'Tipos de Evento',
      icon:       '🏆',
      desc:       'Tipos de evento para organização de torneios e encontros.',
      usedIn:     'Eventos',
      placeholder:'ex: Festa de Confraternização',
    },
  ],

  /* ------------------------------------------------------------------ */
  /*  Public getters — called by other modules                           */
  /* ------------------------------------------------------------------ */

  getEspecialidades()    { return Storage.getAll('cat_especialidades'); },
  getCategoriasReceita() { return Storage.getAll('cat_receita'); },
  getCategoriasDespesa() { return Storage.getAll('cat_despesa'); },
  getTiposAula()         { return Storage.getAll('cat_tipos_aula'); },
  getTiposEvento()       { return Storage.getAll('cat_tipos_evento'); },

  /**
   * Build <option> tags for a select element from a cadastro list.
   * If the record's stored value doesn't match any item it's shown as a
   * legacy option so the user can still see/change it.
   *
   * @param {Array}  items        - cadastro records [{id, nome}]
   * @param {string} currentValue - currently stored value (may be a legacy key)
   * @returns {string} HTML option tags
   */
  buildOptions(items, currentValue) {
    const nomes    = items.map(i => i.nome);
    const hasMatch = !currentValue || nomes.includes(currentValue);
    const opts     = items.map(i =>
      `<option value="${UI.escape(i.nome)}" ${currentValue === i.nome ? 'selected' : ''}>${UI.escape(i.nome)}</option>`
    ).join('');
    if (!hasMatch && currentValue) {
      return `<option value="${UI.escape(currentValue)}" selected>${UI.escape(currentValue)} (legado)</option>${opts}`;
    }
    return opts;
  },

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;

    const tab   = this.TABS.find(t => t.key === this._tab) || this.TABS[0];
    const items = Storage.getAll(tab.storageKey);

    const tabButtons = this.TABS.map(t => `
      <button class="admin-tab ${t.key === this._tab ? 'active' : ''}"
        onclick="CadastrosModule.switchTab('${t.key}')">
        ${t.icon} ${t.label}
      </button>`).join('');

    const rows = items.map(item => `
      <tr>
        <td><strong>${UI.escape(item.nome)}</strong></td>
        <td class="text-muted text-sm">${UI.formatDate(item.createdAt)}</td>
        <td class="aluno-row-actions">
          <button class="btn btn-ghost btn-sm"
            onclick="CadastrosModule.openModal('${tab.storageKey}', '${item.id}')"
            title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm danger"
            onclick="CadastrosModule.deleteItem('${tab.storageKey}', '${item.id}')"
            title="Excluir">🗑️</button>
        </td>
      </tr>`).join('');

    const tableHtml = items.length ? `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : `
      <div class="empty-state">
        <div class="empty-icon">${tab.icon}</div>
        <div class="empty-title">Nenhum item cadastrado</div>
        <div class="empty-desc">Adicione o primeiro item em <strong>${tab.label}</strong>.</div>
        <button class="btn btn-primary mt-16"
          onclick="CadastrosModule.openModal('${tab.storageKey}')">
          + Adicionar
        </button>
      </div>`;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Cadastros</h2>
          <p>Tabelas de apoio utilizadas nos módulos do sistema</p>
        </div>
        <button class="btn btn-primary" onclick="CadastrosModule.openModal('${tab.storageKey}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Item
        </button>
      </div>

      <div class="admin-tabs" style="flex-wrap:wrap;">
        ${tabButtons}
      </div>

      <div class="cadastro-tab-info">
        <span>${tab.icon} <strong>${tab.label}</strong> — ${tab.desc}</span>
        <span class="badge badge-blue" style="font-size:11px;white-space:nowrap;">
          Usado em: ${tab.usedIn}
        </span>
      </div>

      <div class="alunos-table-wrap">
        ${tableHtml}
      </div>
    `;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal                                                               */
  /* ------------------------------------------------------------------ */

  openModal(storageKey, id = null) {
    const item   = id ? Storage.getById(storageKey, id) : null;
    const isEdit = !!item;
    const tab    = this.TABS.find(t => t.storageKey === storageKey) || this.TABS[0];

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="cad-nome">
            Nome <span class="required-star">*</span>
          </label>
          <input id="cad-nome" type="text" class="form-input"
            placeholder="${UI.escape(tab.placeholder)}"
            value="${item ? UI.escape(item.nome) : ''}"
            required autocomplete="off" />
          <div class="form-hint" style="margin-top:4px;">
            Será exibido nos filtros e formulários do módulo <strong>${tab.usedIn}</strong>.
          </div>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar — ${item.nome}` : `Novo item: ${tab.label}`,
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Adicionar',
      onConfirm:    () => this.saveItem(storageKey, id),
    });

    requestAnimationFrame(() => {
      const el = document.getElementById('cad-nome');
      if (el) el.focus();
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD                                                                */
  /* ------------------------------------------------------------------ */

  saveItem(storageKey, id = null) {
    const nomeEl = document.getElementById('cad-nome');
    if (!nomeEl || !nomeEl.value.trim()) {
      if (nomeEl) nomeEl.classList.add('error');
      UI.toast('Preencha o nome.', 'warning');
      return;
    }
    nomeEl.classList.remove('error');

    const nome = nomeEl.value.trim();

    // Uniqueness check
    const duplicate = Storage.getAll(storageKey).find(
      r => r.nome.toLowerCase() === nome.toLowerCase() && r.id !== id
    );
    if (duplicate) {
      nomeEl.classList.add('error');
      UI.toast(`"${nome}" já está cadastrado nesta lista.`, 'warning');
      return;
    }

    if (id) {
      Storage.update(storageKey, id, { nome });
      UI.toast(`"${nome}" atualizado com sucesso!`, 'success');
    } else {
      Storage.create(storageKey, { nome });
      UI.toast(`"${nome}" adicionado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteItem(storageKey, id) {
    const item = Storage.getById(storageKey, id);
    if (!item) return;

    const confirmed = await UI.confirm(
      `Deseja excluir "${item.nome}"?\nItens já cadastrados nos módulos não serão afetados.`,
      'Excluir item'
    );
    if (!confirmed) return;

    Storage.delete(storageKey, id);
    UI.toast(`"${item.nome}" excluído.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Tab handler                                                         */
  /* ------------------------------------------------------------------ */

  switchTab(key) {
    this._tab = key;
    this.render();
  },
};
