'use strict';

/**
 * AdminModule — User management and role/permission administration
 */
const AdminModule = {
  STORAGE_KEY: 'usuarios',

  _tab: 'usuarios', // 'usuarios' | 'perfis' | 'listas'

  _state: {
    search:       '',
    filterPerfil: '',
    filterStatus: '',
  },

  STATUS: {
    ativo:   { label: 'Ativo',   badge: 'badge-success' },
    inativo: { label: 'Inativo', badge: 'badge-gray'    },
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterPerfil, filterStatus } = this._state;
    return this.getAll().filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        u.nome.toLowerCase().includes(q) ||
        u.login.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q));
      const matchPerfil = !filterPerfil || u.perfil === filterPerfil;
      const matchStatus = !filterStatus || u.status === filterStatus;
      return matchSearch && matchPerfil && matchStatus;
    });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:   all.length,
      ativos:  all.filter(u => u.status === 'ativo').length,
      inativos:all.filter(u => u.status === 'inativo').length,
    };
  },

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;
    const stats    = this.getStats();
    const filtered = this.getFiltered();
    const session  = Auth.getCurrentUser();

    const perfilFilterOptions = Object.entries(PERFIS).map(([k, v]) =>
      `<option value="${k}" ${this._state.filterPerfil === k ? 'selected' : ''}>${v.label}</option>`
    ).join('');

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Administração</h2>
          <p>Gestão de usuários, perfis e permissões de acesso</p>
        </div>
        ${this._tab === 'usuarios' ? `
        <button class="btn btn-primary" onclick="AdminModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Usuário
        </button>` : ''}
      </div>

      <!-- Tabs -->
      <div class="admin-tabs">
        <button class="admin-tab ${this._tab === 'usuarios' ? 'active' : ''}"
          onclick="AdminModule.switchTab('usuarios')">👤 Usuários</button>
        <button class="admin-tab ${this._tab === 'perfis' ? 'active' : ''}"
          onclick="AdminModule.switchTab('perfis')">🔐 Perfis e Permissões</button>
        <button class="admin-tab ${this._tab === 'listas' ? 'active' : ''}"
          onclick="AdminModule.switchTab('listas')">📝 Listas do Sistema</button>
        <button class="admin-tab ${this._tab === 'config' ? 'active' : ''}"
          onclick="AdminModule.switchTab('config')">⚙️ Configurações</button>
      </div>

      ${this._tab === 'usuarios' ? this._renderUsuarios(stats, filtered, session, perfilFilterOptions) : ''}
      ${this._tab === 'perfis'   ? this._renderPerfis()   : ''}
      ${this._tab === 'listas'   ? ListasModule.renderContent() : ''}
      ${this._tab === 'config'   ? this._renderConfig()   : ''}
    `;
  },

  _renderUsuarios(stats, filtered, session, perfilFilterOptions) {
    return `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card">
          <div class="stat-icon blue">👤</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Usuários</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="stat-value">${stats.ativos}</div>
            <div class="stat-label">Ativos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gray">⚪</div>
          <div class="stat-info">
            <div class="stat-value">${stats.inativos}</div>
            <div class="stat-label">Inativos</div>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar por nome, login ou e-mail…"
            value="${UI.escape(this._state.search)}"
            oninput="AdminModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="AdminModule.handleFilterPerfil(this.value)">
          <option value="">Todos os perfis</option>
          ${perfilFilterOptions}
        </select>
        <select class="filter-select" onchange="AdminModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          <option value="ativo"   ${this._state.filterStatus === 'ativo'   ? 'selected' : ''}>Ativo</option>
          <option value="inativo" ${this._state.filterStatus === 'inativo' ? 'selected' : ''}>Inativo</option>
        </select>
        <span class="results-count">
          ${filtered.length} usuário${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div class="alunos-table-wrap">
        ${filtered.length ? this._renderTable(filtered, session) : this._renderEmpty()}
      </div>`;
  },

  _renderTable(usuarios, session) {
    const rows = usuarios.map(u => {
      const perfil  = PERFIS[u.perfil]     || { label: u.perfil, cor: 'badge-gray' };
      const status  = this.STATUS[u.status] || { label: u.status, badge: 'badge-gray' };
      const isMe    = session && session.id === u.id;
      const cadastro= UI.formatDate(u.createdAt);

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="user-avatar-sm">${u.nome.trim().charAt(0).toUpperCase()}</div>
              <div>
                <div class="aluno-nome">${UI.escape(u.nome)} ${isMe ? '<span class="badge badge-blue" style="font-size:10px;">você</span>' : ''}</div>
                <div class="aluno-sub">${UI.escape(u.email || '—')}</div>
              </div>
            </div>
          </td>
          <td><code class="login-code">${UI.escape(u.login)}</code></td>
          <td><span class="badge ${perfil.cor}">${perfil.label}</span></td>
          <td><span class="badge ${status.badge}">${status.label}</span></td>
          <td class="text-muted text-sm">${cadastro}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="AdminModule.abrirRedefinirSenha('${u.id}')" title="Redefinir senha">🔑</button>
            <button class="btn btn-ghost btn-sm" onclick="AdminModule.openModal('${u.id}')" title="Editar">✏️</button>
            ${!isMe ? `<button class="btn btn-ghost btn-sm danger" onclick="AdminModule.deleteUsuario('${u.id}')" title="Excluir">🗑️</button>` : ''}
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome / E-mail</th>
              <th>Login</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Cadastro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _renderEmpty() {
    return `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-title">Nenhum usuário encontrado</div>
        <div class="empty-desc">Nenhum usuário corresponde aos filtros aplicados.</div>
        <button class="btn btn-secondary mt-16" onclick="AdminModule.clearFilters()">Limpar filtros</button>
      </div>`;
  },

  _renderPerfis() {
    const perfisArr = Object.entries(PERFIS);

    const headerCols = perfisArr.map(([, v]) =>
      `<th class="text-center" style="min-width:100px;">${v.label}</th>`
    ).join('');

    const rows = ALL_MODULES.map(mod => {
      const cells = perfisArr.map(([, v]) => {
        const has = v.modulos.includes(mod.key);
        return `<td class="text-center">
          ${has ? '<span class="perm-check yes">✓</span>' : '<span class="perm-check no">—</span>'}
        </td>`;
      }).join('');
      return `<tr>
        <td class="perm-mod-label">${mod.label}${mod.required ? ' <span class="text-muted text-sm">(fixo)</span>' : ''}</td>
        ${cells}
      </tr>`;
    }).join('');

    const cards = perfisArr.map(([k, v]) => `
      <div class="perfil-card">
        <div class="perfil-card-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span class="badge ${v.cor}">${UI.escape(v.label)}</span>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-sm" onclick="AdminModule.openPerfilModal('${k}')" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-sm danger" onclick="AdminModule.deletePerfil('${k}')" title="Excluir">🗑️</button>
          </div>
        </div>
        <div class="perfil-desc">${UI.escape(v.descricao || '—')}</div>
        <div class="perfil-mods">
          ${v.modulos.filter(m => m !== 'dashboard').map(m => {
            const mod = ALL_MODULES.find(a => a.key === m);
            return `<span class="dia-chip">${mod ? mod.label : m}</span>`;
          }).join('')}
        </div>
      </div>`).join('');

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <p class="section-title" style="margin:0;">Perfis cadastrados (${perfisArr.length})</p>
        <button class="btn btn-primary" onclick="AdminModule.openPerfilModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Perfil
        </button>
      </div>
      <div class="perfis-cards-grid">${cards}</div>

      <p class="section-title" style="margin:28px 0 16px;">Matriz de Permissões</p>
      <div class="alunos-table-wrap">
        <div class="table-card">
          <table class="data-table perm-table">
            <thead>
              <tr><th>Módulo</th>${headerCols}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ------------------------------------------------------------------ */
  /*  Profile Modal / CRUD                                                */
  /* ------------------------------------------------------------------ */

  openPerfilModal(key = null) {
    const isEdit  = !!key;
    const perfil  = isEdit ? PERFIS[key] : null;
    const v       = (field, fallback = '') => perfil ? UI.escape(String(perfil[field] ?? fallback)) : fallback;
    const modulos = perfil ? perfil.modulos : ['dashboard'];

    const corOptions = BADGE_CORES.map(c =>
      `<option value="${c.value}" ${(perfil?.cor || 'badge-gray') === c.value ? 'selected' : ''}>${c.label}</option>`
    ).join('');

    const moduloChecks = ALL_MODULES.map(mod => {
      const checked  = modulos.includes(mod.key);
      const disabled = mod.required ? 'disabled checked' : (checked ? 'checked' : '');
      return `
        <label class="dia-check-label" style="${mod.required ? 'opacity:.6;cursor:default;' : ''}">
          <input type="checkbox" name="mod" value="${mod.key}" ${disabled} />
          <span>${mod.label}</span>
        </label>`;
    }).join('');

    const content = `
      <div class="form-grid">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pf-label">Nome do perfil <span class="required-star">*</span></label>
            <input id="pf-label" type="text" class="form-input"
              placeholder="ex: Coordenador"
              value="${v('label')}" required autocomplete="off"
              oninput="AdminModule._autoKey(this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-key">
              Chave <span class="required-star">*</span>
              <span class="form-hint">(identificador único, sem espaços)</span>
            </label>
            <input id="pf-key" type="text" class="form-input"
              placeholder="ex: coordenador"
              value="${isEdit ? UI.escape(key) : ''}"
              ${isEdit ? 'readonly style="background:#f1f5f9;color:#64748b;"' : ''}
              required autocomplete="off" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pf-cor">Cor do badge</label>
            <select id="pf-cor" class="form-select">${corOptions}</select>
          </div>
          <div class="form-group" style="justify-content:flex-end;padding-top:22px;">
            <span id="pf-preview" class="badge ${perfil?.cor || 'badge-gray'}"
              style="font-size:13px;padding:5px 14px;">
              ${v('label', 'Prévia')}
            </span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-desc">Descrição</label>
          <input id="pf-desc" type="text" class="form-input"
            placeholder="ex: Coordenação de turmas e alunos"
            value="${v('descricao')}" autocomplete="off" />
        </div>

        <div class="form-group">
          <label class="form-label">Módulos permitidos</label>
          <div class="dias-check-group">${moduloChecks}</div>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Perfil — ${perfil.label}` : 'Novo Perfil',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Criar Perfil',
      onConfirm:    () => this.savePerfil(isEdit ? key : null),
    });

    // Live preview
    requestAnimationFrame(() => {
      const labelEl = document.getElementById('pf-label');
      const corEl   = document.getElementById('pf-cor');
      const preview = document.getElementById('pf-preview');
      if (labelEl && preview) {
        labelEl.addEventListener('input', () => { preview.textContent = labelEl.value || 'Prévia'; });
      }
      if (corEl && preview) {
        corEl.addEventListener('change', () => {
          preview.className = `badge ${corEl.value}`;
          preview.style.cssText = 'font-size:13px;padding:5px 14px;';
        });
      }
    });
  },

  _autoKey(label) {
    const keyEl = document.getElementById('pf-key');
    if (!keyEl || keyEl.readOnly) return;
    keyEl.value = label
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  },

  savePerfil(existingKey = null) {
    const g     = id => document.getElementById(id);
    const label = g('pf-label');
    const keyEl = g('pf-key');

    let valid = true;
    [label, keyEl].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    if (!valid) { UI.toast('Preencha os campos obrigatórios.', 'warning'); return; }

    const newKey = keyEl.value.trim().toLowerCase().replace(/\s+/g, '_');

    // Check key uniqueness (only for new profiles)
    if (!existingKey && PERFIS[newKey]) {
      keyEl.classList.add('error');
      UI.toast(`A chave "${newKey}" já está em uso.`, 'warning');
      return;
    }

    const modulos = ['dashboard', // always included
      ...[...document.querySelectorAll('input[name="mod"]:checked')]
        .map(el => el.value)
        .filter(v => v !== 'dashboard'),
    ];

    const data = {
      key:      newKey,
      label:    label.value.trim(),
      descricao:g('pf-desc') ? g('pf-desc').value.trim() : '',
      cor:      g('pf-cor')  ? g('pf-cor').value         : 'badge-gray',
      modulos,
    };

    if (existingKey) {
      // Find record by key and update
      const records = Storage.getAll('perfis');
      const rec     = records.find(r => r.key === existingKey);
      if (rec) Storage.update('perfis', rec.id, data);
      UI.toast(`Perfil "${data.label}" atualizado!`, 'success');
    } else {
      Storage.create('perfis', data);
      UI.toast(`Perfil "${data.label}" criado com sucesso!`, 'success');
    }

    Auth.loadPerfis();
    App.renderSidebar();
    UI.closeModal();
    this.render();
  },

  async deletePerfil(key) {
    const perfil = PERFIS[key];
    if (!perfil) return;

    // Check if users are assigned to this profile
    const usersWithPerfil = Storage.getAll('usuarios').filter(u => u.perfil === key);
    if (usersWithPerfil.length > 0) {
      UI.toast(`Não é possível excluir: ${usersWithPerfil.length} usuário(s) usam este perfil.`, 'warning');
      return;
    }

    // Prevent deleting the last profile with 'admin' permission
    const adminPerfis = Object.entries(PERFIS)
      .filter(([k, v]) => k !== key && v.modulos.includes('admin'));
    if (adminPerfis.length === 0 && perfil.modulos.includes('admin')) {
      UI.toast('Não é possível excluir o único perfil com acesso à Administração.', 'warning');
      return;
    }

    const confirmed = await UI.confirm(
      `Deseja realmente excluir o perfil "${perfil.label}"?`,
      'Excluir Perfil'
    );
    if (!confirmed) return;

    const rec = Storage.getAll('perfis').find(r => r.key === key);
    if (rec) Storage.delete('perfis', rec.id);

    Auth.loadPerfis();
    App.renderSidebar();
    UI.toast(`Perfil "${perfil.label}" excluído.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const user   = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!user;
    const v      = (field, fallback = '') => user ? UI.escape(String(user[field] ?? fallback)) : fallback;
    const session= Auth.getCurrentUser();
    const isMe   = session && user && session.id === user.id;

    const perfilOptions = Object.entries(PERFIS).map(([k, p]) =>
      `<option value="${k}" ${user && user.perfil === k ? 'selected' : ''}>${p.label}</option>`
    ).join('');

    const statusOptions = Object.entries(this.STATUS).map(([k, s]) =>
      `<option value="${k}" ${user && user.status === k ? 'selected' : ''}>${s.label}</option>`
    ).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="us-nome">Nome completo <span class="required-star">*</span></label>
          <input id="us-nome" type="text" class="form-input"
            placeholder="ex: João da Silva"
            value="${v('nome')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="us-login">Login <span class="required-star">*</span></label>
            <input id="us-login" type="text" class="form-input"
              placeholder="ex: joao.silva"
              value="${v('login')}" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="us-email">E-mail</label>
            <input id="us-email" type="email" class="form-input"
              placeholder="usuario@email.com"
              value="${v('email')}" autocomplete="off" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="us-senha">
            Senha ${isEdit ? '<span class="form-hint">(deixe em branco para manter a atual)</span>' : '<span class="required-star">*</span>'}
          </label>
          <input id="us-senha" type="password" class="form-input"
            placeholder="${isEdit ? '••••••••' : 'mínimo 6 caracteres'}"
            autocomplete="new-password" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="us-perfil">Perfil <span class="required-star">*</span></label>
            <select id="us-perfil" class="form-select"
              ${isMe ? 'disabled title="Você não pode alterar seu próprio perfil"' : ''}
              onchange="AdminModule._toggleVinculoField(this.value)">
              ${perfilOptions}
            </select>
            ${isMe ? '<div class="form-hint" style="margin-top:4px;">Você não pode alterar seu próprio perfil.</div>' : ''}
          </div>
          <div class="form-group">
            <label class="form-label" for="us-status">Status</label>
            <select id="us-status" class="form-select" ${isMe ? 'disabled' : ''}>
              ${statusOptions}
            </select>
          </div>
        </div>

        <div class="form-group" id="us-professor-field" style="display:${user?.perfil === 'professor' ? 'block' : 'none'};">
          <label class="form-label" for="us-professor">Professor vinculado</label>
          <select id="us-professor" class="form-select">
            <option value="">— Selecionar professor —</option>
            ${Storage.getAll('professores').filter(p => p.status === 'ativo').sort((a,b) => a.nome.localeCompare(b.nome)).map(p =>
              `<option value="${p.id}" ${user?.professorId === p.id ? 'selected' : ''}>${UI.escape(p.nome)}</option>`
            ).join('')}
          </select>
          <div class="form-hint" style="margin-top:4px;">Vincula o login ao professor para filtrar automaticamente as grades e aulas dele.</div>
        </div>

        <div class="form-group" id="us-aluno-field" style="display:${user?.perfil === 'aluno' ? 'block' : 'none'};">
          <label class="form-label" for="us-aluno">Aluno vinculado</label>
          <select id="us-aluno" class="form-select">
            <option value="">— Selecionar aluno —</option>
            ${Storage.getAll('alunos').filter(a => a.status === 'ativo').sort((a,b) => a.nome.localeCompare(b.nome)).map(a =>
              `<option value="${a.id}" ${user?.alunoId === a.id ? 'selected' : ''}>${UI.escape(a.nome)}</option>`
            ).join('')}
          </select>
          <div class="form-hint" style="margin-top:4px;">Vincula o login ao aluno para filtrar automaticamente as grades em que está inscrito.</div>
        </div>

        <div class="form-group" id="us-arenas-field"
          style="display:${(user?.perfil === 'professor' || user?.perfil === 'aluno') ? 'block' : 'none'};">
          <label class="form-label">🏟️ Arenas vinculadas <span class="form-hint">(interbase)</span></label>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;padding:10px 12px;
            background:var(--bg-secondary);border-radius:var(--radius);border:1px solid var(--card-border);">
            ${Object.entries(TENANTS)
              .filter(([, t]) => t.tipo !== 'matriz' && t.id)
              .filter(([, t], i, arr) => arr.findIndex(([, x]) => x.id === t.id) === i)
              .map(([key, t]) => {
                const vinculadas = user?.arenasVinculadas || [];
                const checked = vinculadas.some(a => a.key === key) ? 'checked' : '';
                return `<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                  <input type="checkbox" class="us-arena-check" value="${key}"
                    data-label="${UI.escape(t.label)}" ${checked} />
                  ${UI.escape(t.label)}
                </label>`;
              }).join('')}
          </div>
          <div class="form-hint" style="margin-top:4px;">O portal mostrará um seletor de arena para este usuário.</div>
        </div>
      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Usuário — ${user.nome}` : 'Novo Usuário',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Criar Usuário',
      onConfirm:    () => this.saveUsuario(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  saveUsuario(id = null) {
    const g     = n => document.getElementById(`us-${n}`);
    const nome  = g('nome');
    const login = g('login');
    const senha = g('senha');
    const session = Auth.getCurrentUser();

    // Validate required
    let valid = true;
    [nome, login].forEach(el => {
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      if (empty) valid = false;
    });

    // Password required for new users
    if (!id && (!senha || senha.value.length < 6)) {
      if (senha) senha.classList.add('error');
      UI.toast('A senha deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    // Check login uniqueness
    const existing = this.getAll().find(u => u.login === login.value.trim() && u.id !== id);
    if (existing) {
      login.classList.add('error');
      UI.toast(`O login "${login.value.trim()}" já está em uso.`, 'warning');
      return;
    }

    const isMe = session && id === session.id;
    const old  = id ? Storage.getById(this.STORAGE_KEY, id) : null;

    const perfilVal = (!isMe && g('perfil')) ? g('perfil').value : (old ? old.perfil : 'recepcionista');

    // Coleta arenas vinculadas (interbase)
    const arenasVinculadas = [];
    document.querySelectorAll('.us-arena-check:checked').forEach(cb => {
      arenasVinculadas.push({ key: cb.value, label: cb.dataset.label || cb.value });
    });

    const data = {
      nome:             nome.value.trim(),
      login:            login.value.trim().toLowerCase(),
      email:            g('email')     ? g('email').value.trim()     : '',
      perfil:           perfilVal,
      status:           (!isMe && g('status')) ? g('status').value : (old ? old.status : 'ativo'),
      professorId:      perfilVal === 'professor' && g('professor') ? (g('professor').value || null) : null,
      alunoId:          perfilVal === 'aluno'     && g('aluno')     ? (g('aluno').value     || null) : null,
      arenasVinculadas: (perfilVal === 'professor' || perfilVal === 'aluno') ? arenasVinculadas : [],
    };

    // Only update password if a new one was provided
    if (senha && senha.value.trim()) {
      if (senha.value.length < 6) {
        senha.classList.add('error');
        UI.toast('A senha deve ter pelo menos 6 caracteres.', 'warning');
        return;
      }
      data.senha = btoa(senha.value);
    } else if (!id) {
      UI.toast('A senha é obrigatória para novos usuários.', 'warning');
      return;
    }

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      UI.toast(`Usuário "${data.nome}" atualizado com sucesso!`, 'success');

      // Update session if editing own account
      if (isMe) {
        const updated = Storage.getById(this.STORAGE_KEY, id);
        if (updated) Auth.setSession(updated);
        App.updateHeaderUser();
      }
    } else {
      Storage.create(this.STORAGE_KEY, data);
      UI.toast(`Usuário "${data.nome}" criado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteUsuario(id) {
    const user = Storage.getById(this.STORAGE_KEY, id);
    if (!user) return;

    const confirmed = await UI.confirm(
      `Deseja realmente excluir o usuário "${user.nome}"?`,
      'Excluir Usuário'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Usuário "${user.nome}" excluído.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Tab + Filter handlers                                               */
  /* ------------------------------------------------------------------ */

  switchTab(tab) {
    this._tab = tab;
    this.render();
  },

  handleSearch(value) {
    this._state.search = value;
    this.render();
  },

  handleFilterPerfil(value) {
    this._state.filterPerfil = value;
    this.render();
  },

  handleFilterStatus(value) {
    this._state.filterStatus = value;
    this.render();
  },

  clearFilters() {
    this._state.search       = '';
    this._state.filterPerfil = '';
    this._state.filterStatus = '';
    this.render();
  },

  _toggleVinculoField(perfil) {
    const profField   = document.getElementById('us-professor-field');
    const alunoField  = document.getElementById('us-aluno-field');
    const arenasField = document.getElementById('us-arenas-field');
    const isInterbase = perfil === 'professor' || perfil === 'aluno';
    if (profField)   profField.style.display   = perfil === 'professor' ? 'block' : 'none';
    if (alunoField)  alunoField.style.display  = perfil === 'aluno'     ? 'block' : 'none';
    if (arenasField) arenasField.style.display = isInterbase            ? 'block' : 'none';
  },

  /* Redefinir senha de um usuário */
  abrirRedefinirSenha(id) {
    const user = Storage.getById(this.STORAGE_KEY, id);
    if (!user) return;

    const content = `
      <div class="form-grid">
        <div class="info-box">
          <strong>${UI.escape(user.nome)}</strong>
          <span class="text-muted" style="margin-left:8px;">@${UI.escape(user.login)}</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="rs-nova">Nova senha <span class="required-star">*</span></label>
          <input id="rs-nova" type="password" class="form-input"
            placeholder="mínimo 6 caracteres" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label class="form-label" for="rs-conf">Confirmar senha <span class="required-star">*</span></label>
          <input id="rs-conf" type="password" class="form-input"
            placeholder="repita a senha" autocomplete="new-password" />
        </div>
      </div>`;

    UI.openModal({
      title:        `Redefinir Senha — ${user.nome}`,
      content,
      confirmLabel: 'Salvar nova senha',
      onConfirm:    () => this._salvarNovaSenha(id),
    });
  },

  _salvarNovaSenha(id) {
    const nova = document.getElementById('rs-nova');
    const conf = document.getElementById('rs-conf');

    if (!nova || nova.value.length < 6) {
      if (nova) nova.classList.add('error');
      UI.toast('A senha deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }
    if (!conf || conf.value !== nova.value) {
      if (conf) conf.classList.add('error');
      UI.toast('As senhas não coincidem.', 'warning');
      return;
    }

    Storage.update(this.STORAGE_KEY, id, { senha: btoa(nova.value) });
    UI.closeModal();
    UI.toast('Senha redefinida com sucesso!', 'success');
  },

  /* ------------------------------------------------------------------ */
  /*  Aba Configurações                                                   */
  /* ------------------------------------------------------------------ */

  _renderConfig() {
    const minAtual = InactivityLock.getTimeoutMin();
    const opcoes   = [5, 10, 15, 20, 30, 60];
    return `
      <div class="config-section">
        <h3 class="config-section-title">🔒 Bloqueio por Inatividade</h3>
        <p class="config-section-desc">
          A tela será bloqueada automaticamente após o tempo definido sem interação.
          O usuário precisará digitar a senha para retomar.
        </p>
        <div class="config-row">
          <label class="config-label" for="cfg-inatividade">Tempo até bloquear</label>
          <div style="display:flex;align-items:center;gap:12px;">
            <select id="cfg-inatividade" class="form-select" style="width:180px;">
              ${opcoes.map(m =>
                `<option value="${m}" ${minAtual === m ? 'selected' : ''}>${m} minuto${m !== 1 ? 's' : ''}</option>`
              ).join('')}
              <option value="0" ${minAtual === 0 ? 'selected' : ''}>Nunca bloquear</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="AdminModule.salvarConfig()">
              💾 Salvar
            </button>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
            Atual: <strong>${minAtual === 0 ? 'Desativado' : `${minAtual} minuto${minAtual !== 1 ? 's' : ''}`}</strong>
            — Um aviso aparece 60 segundos antes do bloqueio.
          </div>
        </div>
      </div>`;
  },

  salvarConfig() {
    const el  = document.getElementById('cfg-inatividade');
    if (!el) return;
    const min = parseInt(el.value, 10);
    if (min === 0) {
      InactivityLock.stop();
      InactivityLock.setTimeoutMin(0);
      UI.toast('Bloqueio por inatividade desativado.', 'success');
    } else {
      InactivityLock.setTimeoutMin(min);
      InactivityLock.stop();
      InactivityLock.start();
      UI.toast(`Bloqueio definido para ${min} minuto${min !== 1 ? 's' : ''}.`, 'success');
    }
    this.render();
  },
};
