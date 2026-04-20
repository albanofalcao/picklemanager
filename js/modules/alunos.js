'use strict';

/**
 * AlunoModule — Complete CRUD module for managing pickleball students
 */
const AlunoModule = {
  STORAGE_KEY: 'alunos',

  _state: {
    search:       '',
    filterStatus: '',
    filterNivel:  '',
  },

  STATUS: {
    ativo:    { label: 'Ativo',     badge: 'badge-success' },
    inativo:  { label: 'Inativo',   badge: 'badge-gray'    },
    suspenso: { label: 'Suspenso',  badge: 'badge-warning' },
  },

  NIVEL: {
    kids:          'Kids',
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    profissional:  'Profissional',
  },

  NIVEL_BADGE: {
    kids:          'badge-blue',
    iniciante:     'badge-success',
    intermediario: 'badge-warning',
    avancado:      'badge-danger',
    profissional:  'badge-danger',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterStatus, filterNivel } = this._state;
    return this.getAll().filter(aluno => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        aluno.nome.toLowerCase().includes(q) ||
        (aluno.email  && aluno.email.toLowerCase().includes(q)) ||
        (aluno.cpf    && aluno.cpf.includes(q)) ||
        (aluno.telefone && aluno.telefone.includes(q));
      const matchStatus = !filterStatus || aluno.status === filterStatus;
      const matchNivel  = !filterNivel  || aluno.nivel  === filterNivel;
      return matchSearch && matchStatus && matchNivel;
    });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:    all.length,
      ativos:   all.filter(a => a.status === 'ativo').length,
      inativos: all.filter(a => a.status === 'inativo').length,
      suspensos: all.filter(a => a.status === 'suspenso').length,
    };
  },

  /**
   * Verifica se um aluno possui matrícula ativa.
   * Usado para bloquear operações (turmas, aulas, eventos) em alunos sem matrícula.
   */
  temMatriculaAtiva(alunoId) {
    return Storage.getAll('matriculas').some(m => m.alunoId === alunoId && m.status === 'ativa');
  },

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  render() {
    const stats    = this.getStats();
    const filtered = this.getFiltered();
    const area     = document.getElementById('content-area');
    if (!area) return;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Alunos</h2>
          <p>Cadastro e gestão de alunos matriculados</p>
        </div>
        <button class="btn btn-primary" onclick="AlunoModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Aluno
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Alunos</div>
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
          <div class="stat-icon amber">⚠️</div>
          <div class="stat-info">
            <div class="stat-value">${stats.suspensos}</div>
            <div class="stat-label">Suspensos</div>
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
            placeholder="Buscar por nome, e-mail, CPF ou telefone…"
            value="${UI.escape(this._state.search)}"
            oninput="AlunoModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="AlunoModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          <option value="ativo"    ${this._state.filterStatus === 'ativo'    ? 'selected' : ''}>Ativo</option>
          <option value="suspenso" ${this._state.filterStatus === 'suspenso' ? 'selected' : ''}>Suspenso</option>
          <option value="inativo"  ${this._state.filterStatus === 'inativo'  ? 'selected' : ''}>Inativo</option>
        </select>
        <select class="filter-select" onchange="AlunoModule.handleFilterNivel(this.value)">
          <option value="">Todos os níveis</option>
          ${ListasService.opts('alunos_nivel', this._state.filterNivel)}
        </select>
        <span class="results-count">
          ${filtered.length} aluno${filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div class="alunos-table-wrap" id="alunos-list">
        ${filtered.length
          ? this.renderTable(filtered)
          : this.renderEmpty()
        }
      </div>
    `;
  },

  renderTable(alunos) {
    // Pre-load for performance
    const todasMatriculas  = Storage.getAll('matriculas');
    const todasInscricoes  = Storage.getAll('turmaAlunos');
    const todasTurmas      = Storage.getAll('turmas');

    const rows = alunos.map(a => {
      const status     = this.STATUS[a.status] || { label: a.status, badge: 'badge-gray' };
      const nivelLabel = this.NIVEL[a.nivel]   || a.nivel || '—';
      const nivelBadge = this.NIVEL_BADGE[a.nivel] || 'badge-gray';
      const idade      = a.dataNascimento ? this._calcIdade(a.dataNascimento) : '—';
      const cadastro   = UI.formatDate(a.createdAt);

      // Matrícula ativa mais recente
      const matriculaAtiva = todasMatriculas
        .filter(m => m.alunoId === a.id && m.status === 'ativa')
        .sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''))[0] || null;

      const planoHtml = matriculaAtiva
        ? `<span class="badge badge-success aluno-plano-badge" title="Plano ativo">📋 ${UI.escape(matriculaAtiva.planoNome || 'Plano')}</span>`
        : `<span class="badge badge-gray aluno-plano-badge" style="opacity:.65;">Sem matrícula</span>`;

      // Grades ativas
      const inscricoes = todasInscricoes.filter(i => i.alunoId === a.id && i.status === 'ativo');
      let gradesHtml = '';
      if (inscricoes.length) {
        gradesHtml = inscricoes.map(i => {
          const turma = todasTurmas.find(t => t.id === i.turmaId);
          const nome  = turma ? UI.escape(turma.nome) : '?';
          return `<span class="badge badge-blue aluno-grade-chip" title="${nome} · ${i.aulasAlocadas || '?'} aulas/mês">${nome}</span>`;
        }).join('');
      }

      const saldoBadge = SaldoService.badgeSaldo(a.id);
      const vinculoHtml = `
        <div class="aluno-vinculo-row">
          ${planoHtml}
          ${gradesHtml}
          ${saldoBadge}
        </div>`;

      return `
        <tr>
          <td>
            <div class="aluno-nome">${UI.escape(a.nome)}</div>
            <div class="aluno-sub">${UI.escape(a.email || '—')}</div>
            ${vinculoHtml}
          </td>
          <td>${UI.escape(a.cpf || '—')}</td>
          <td>${UI.escape(a.telefone || '—')}</td>
          <td>${idade !== '—' ? idade + ' anos' : '—'}</td>
          <td><span class="badge ${nivelBadge}">${UI.escape(nivelLabel)}</span></td>
          <td><span class="badge ${status.badge}">${status.label}</span></td>
          <td class="text-muted text-sm">${cadastro}</td>
          <td class="aluno-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="AlunoModule.openPerfilAluno('${a.id}')" title="Ver perfil">👤</button>
            <button class="btn btn-ghost btn-sm" onclick="AlunoModule.openModal('${a.id}')" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-sm danger" onclick="AlunoModule.deleteAluno('${a.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome / E-mail / Vínculo</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Idade</th>
              <th>Nível</th>
              <th>Status</th>
              <th>Cadastro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterStatus || this._state.filterNivel;
    if (isFiltered) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhum aluno encontrado</div>
          <div class="empty-desc">Nenhum aluno corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="AlunoModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">Nenhum aluno cadastrado</div>
        <div class="empty-desc">Comece adicionando o primeiro aluno da academia.</div>
        <button class="btn btn-primary mt-16" onclick="AlunoModule.openModal()">+ Cadastrar primeiro aluno</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const aluno  = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!aluno;
    const v      = (field, fallback = '') => aluno ? UI.escape(String(aluno[field] ?? fallback)) : fallback;

    const nivelOptions  = ListasService.opts('alunos_nivel', aluno?.nivel || '');
    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${aluno && aluno.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const ladoOpts = [
      { v:'',       l:'— Selecionar —' },
      { v:'destro',  l:'Destro' },
      { v:'canhoto', l:'Canhoto' },
      { v:'ambos',   l:'Ambidestro' },
    ].map(o => `<option value="${o.v}" ${aluno?.ladoDominante===o.v?'selected':''}>${o.l}</option>`).join('');

    const idade = aluno?.dataNascimento ? this._calcIdade(aluno.dataNascimento) : '';

    const content = `
  <div class="form-grid">

    <div class="aluno-secao-titulo">👤 Dados Pessoais</div>

    <div class="form-group">
      <label class="form-label" for="a-nome">Nome completo <span class="required-star">*</span></label>
      <input id="a-nome" type="text" class="form-input" placeholder="ex: João da Silva"
        value="${v('nome')}" required autocomplete="off" />
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-telefone">Telefone</label>
        <input id="a-telefone" type="text" class="form-input" placeholder="(00) 00000-0000"
          value="${v('telefone')}" maxlength="15" oninput="AlunoModule._maskTel(this)" />
      </div>
      <div class="form-group">
        <label class="form-label" for="a-email">E-mail</label>
        <input id="a-email" type="email" class="form-input" placeholder="aluno@email.com"
          value="${v('email')}" autocomplete="off" />
      </div>
    </div>

    <div class="aluno-secao-titulo" style="font-size:12px;margin-top:4px;">📱 Redes Sociais</div>
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-rs-instagram">
          <span style="color:#E1306C;">●</span> Instagram
        </label>
        <input id="a-rs-instagram" type="text" class="form-input" placeholder="@usuario"
          value="${v('rsInstagram')}" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label" for="a-rs-facebook">
          <span style="color:#1877F2;">●</span> Facebook
        </label>
        <input id="a-rs-facebook" type="text" class="form-input" placeholder="nome ou link"
          value="${v('rsFacebook')}" autocomplete="off" />
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-rs-tiktok">
          <span style="color:#000;">●</span> TikTok
        </label>
        <input id="a-rs-tiktok" type="text" class="form-input" placeholder="@usuario"
          value="${v('rsTikTok')}" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label" for="a-rs-youtube">
          <span style="color:#FF0000;">●</span> YouTube
        </label>
        <input id="a-rs-youtube" type="text" class="form-input" placeholder="canal"
          value="${v('rsYouTube')}" autocomplete="off" />
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-rs-twitter">
          <span style="color:#1DA1F2;">●</span> X / Twitter
        </label>
        <input id="a-rs-twitter" type="text" class="form-input" placeholder="@usuario"
          value="${v('rsTwitter')}" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label" for="a-rs-linkedin">
          <span style="color:#0A66C2;">●</span> LinkedIn
        </label>
        <input id="a-rs-linkedin" type="text" class="form-input" placeholder="perfil"
          value="${v('rsLinkedIn')}" autocomplete="off" />
      </div>
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-cpf">CPF</label>
        <input id="a-cpf" type="text" class="form-input" placeholder="000.000.000-00"
          value="${v('cpf')}" maxlength="14" oninput="AlunoModule._maskCpf(this)" />
      </div>
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-nascimento">Data de nascimento</label>
        <input id="a-nascimento" type="date" class="form-input"
          value="${v('dataNascimento')}"
          oninput="AlunoModule._showIdade(this)" />
      </div>
      <div class="form-group">
        <label class="form-label">Idade</label>
        <div id="a-idade-display" class="form-input" style="background:var(--bg-secondary);display:flex;align-items:center;color:var(--text-secondary);">
          ${idade ? `<strong>${idade} anos</strong>` : '<span style="color:var(--text-muted);">— preencha o nascimento</span>'}
        </div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="a-rua">Endereço — Rua</label>
      <input id="a-rua" type="text" class="form-input" placeholder="ex: Rua das Flores, 123"
        value="${v('enderecoRua')}" autocomplete="off" />
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-bairro">Bairro</label>
        <input id="a-bairro" type="text" class="form-input" placeholder="ex: Centro"
          value="${v('enderecoBairro')}" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label" for="a-cidade">Cidade</label>
        <input id="a-cidade" type="text" class="form-input" placeholder="ex: São Paulo"
          value="${v('enderecoCidade')}" autocomplete="off" />
      </div>
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-cep">CEP</label>
        <input id="a-cep" type="text" class="form-input" placeholder="00000-000"
          value="${v('enderecoCep')}" maxlength="9" oninput="AlunoModule._maskCep(this)" />
      </div>
      <div></div>
    </div>

    <div class="aluno-secao-titulo">🏓 Dados do Esporte</div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-peso">Peso (kg)</label>
        <input id="a-peso" type="number" class="form-input" placeholder="ex: 75" min="20" max="200" step="0.1"
          value="${v('peso')}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="a-altura">Altura (cm)</label>
        <input id="a-altura" type="number" class="form-input" placeholder="ex: 175" min="100" max="230"
          value="${v('altura')}" />
      </div>
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" for="a-lado">Lado dominante</label>
        <select id="a-lado" class="form-select">${ladoOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="a-nivel">Nível no esporte</label>
        <select id="a-nivel" class="form-select">${nivelOptions}</select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="a-raquete">Raquete que usa</label>
      <input id="a-raquete" type="text" list="raquete-suggestions" class="form-input"
        placeholder="Digite ou selecione o modelo"
        value="${v('raquete')}" autocomplete="off" />
      <datalist id="raquete-suggestions">
        <option value="Selkirk Vanguard 2.0">
        <option value="Selkirk SLK Halo">
        <option value="JOOLA Ben Johns Hyperion">
        <option value="JOOLA Perseus">
        <option value="Paddletek Tempest Wave Pro">
        <option value="Paddletek Phoenix Pro">
        <option value="Engage Poach Advantage">
        <option value="Engage Encore Pro">
        <option value="Franklin Ben Johns Signature">
        <option value="Head Radical Pro">
        <option value="Wilson Juice">
        <option value="ProXR Palladium">
        <option value="Vulcan V530">
        <option value="Babolat Touch Lite">
      </datalist>
    </div>

    <div class="aluno-secao-titulo">⚙️ Configurações</div>

    <div class="form-group">
      <label class="form-label" for="a-status">Status</label>
      <select id="a-status" class="form-select">${statusOptions}</select>
    </div>

    <div class="aluno-secao-titulo">👕 Vestuário</div>
    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label" for="a-camisa">Camiseta</label>
        <select id="a-camisa" class="form-select">
          <option value="">—</option>
          ${['PP','P','M','G','GG','XG','XXG'].map(s =>
            `<option value="${s}" ${v('tamanhoCamisa')===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="a-short">Short</label>
        <select id="a-short" class="form-select">
          <option value="">—</option>
          ${['PP','P','M','G','GG','XG','XXG'].map(s =>
            `<option value="${s}" ${v('tamanhoShort')===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="a-sapato">Calçado (nº)</label>
        <input id="a-sapato" type="number" class="form-input" placeholder="ex: 42" min="28" max="48"
          value="${v('tamanhoSapato')}" />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="a-obs">Observações</label>
      <textarea id="a-obs" class="form-textarea" placeholder="Informações adicionais…" rows="2">${aluno ? UI.escape(aluno.observacoes || '') : ''}</textarea>
    </div>

    ${isEdit ? (() => {
      const mats = Storage.getAll('matriculas')
        .filter(m => m.alunoId === id)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      const fmtD = s => { if (!s) return '—'; const [y,mm,d] = s.split('-'); return `${d}/${mm}/${y}`; };
      const ST = {
        ativa:     '<span class="badge badge-success" style="font-size:10px;">Ativa</span>',
        expirada:  '<span class="badge badge-gray"    style="font-size:10px;">Expirada</span>',
        cancelada: '<span class="badge badge-danger"  style="font-size:10px;">Cancelada</span>',
        suspensa:  '<span class="badge badge-warning" style="font-size:10px;">Suspensa</span>',
      };
      const linhas = mats.length
        ? mats.map(m => `
            <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--card-border);font-size:13px;flex-wrap:wrap;">
              ${ST[m.status] || `<span class="badge badge-gray" style="font-size:10px;">${m.status}</span>`}
              <span style="flex:1;font-weight:600;">${UI.escape(m.planoNome || '—')}</span>
              <span class="text-muted">${fmtD(m.dataInicio)} → ${fmtD(m.dataFim)}</span>
              <button class="btn btn-ghost btn-sm" onclick="UI.closeModal();setTimeout(()=>MatriculaModule.openModal('${m.id}'),300);" style="font-size:11px;padding:2px 8px;">✏️ Editar</button>
            </div>`).join('')
        : `<p class="text-muted" style="font-style:italic;font-size:13px;margin:6px 0;">Nenhuma matrícula registrada.</p>`;
      return `
        <div class="aluno-secao-titulo">🎫 Matrículas</div>
        <div style="border:1px solid var(--card-border);border-radius:var(--radius-sm);padding:4px 12px 4px;margin-bottom:8px;">
          ${linhas}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="UI.closeModal();setTimeout(()=>MatriculaModule.openModal(),300);" style="font-size:12px;margin-bottom:8px;">+ Nova matrícula</button>`;
    })() : ''}

  </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Aluno — ${aluno.nome}` : 'Novo Aluno',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Cadastrar Aluno',
      onConfirm:    () => this.saveAluno(id),
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  async saveAluno(id = null) {
    const g     = n => document.getElementById(`a-${n}`);
    const nome  = g('nome');

    let valid = true;
    if (!nome || !nome.value.trim()) {
      nome && nome.classList.add('error');
      valid = false;
    } else {
      nome && nome.classList.remove('error');
    }

    if (!valid) {
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    // ── CPF: validação de dígitos e duplicata ────────────────────────
    const cpfEl  = g('cpf');
    const cpfRaw = cpfEl ? cpfEl.value.trim() : '';
    if (cpfRaw) {
      const cpfDigits = cpfRaw.replace(/\D/g, '');
      if (cpfDigits.length === 11 && !this._validarCPF(cpfDigits)) {
        cpfEl.classList.add('error');
        UI.toast('CPF inválido — verifique os dígitos verificadores.', 'error');
        return;
      }
      if (cpfDigits.length === 11) {
        const dupCPF = Storage.getAll(this.STORAGE_KEY).find(a =>
          a.id !== id && a.cpf && a.cpf.replace(/\D/g, '') === cpfDigits
        );
        if (dupCPF) {
          cpfEl.classList.add('error');
          UI.toast(`CPF já cadastrado para o aluno "${dupCPF.nome}".`, 'error');
          return;
        }
      }
      cpfEl.classList.remove('error');
    }

    // ── Nome duplicado ───────────────────────────────────────────────
    const nomeTrimmed = nome.value.trim();
    const dupNome = Storage.getAll(this.STORAGE_KEY).find(a =>
      a.id !== id && a.nome.trim().toLowerCase() === nomeTrimmed.toLowerCase()
    );
    if (dupNome) {
      const cont = await UI.confirm(
        `Já existe um aluno com o nome "${dupNome.nome}". Deseja cadastrar mesmo assim?`,
        'Nome duplicado',
        'Cadastrar mesmo assim'
      );
      if (!cont) return;
    }

    const data = {
      nome:           nome.value.trim(),
      cpf:            g('cpf')        ? g('cpf').value.trim()        : '',
      telefone:       g('telefone')   ? g('telefone').value.trim()   : '',
      email:          g('email')      ? g('email').value.trim()      : '',
      dataNascimento: g('nascimento') ? g('nascimento').value        : '',
      nivel:          g('nivel')      ? g('nivel').value             : 'iniciante',
      status:         g('status')     ? g('status').value            : 'ativo',
      observacoes:    g('obs')        ? g('obs').value.trim()        : '',
      tamanhoCamisa:  g('camisa')     ? g('camisa').value            : '',
      tamanhoShort:   g('short')      ? g('short').value             : '',
      tamanhoSapato:  g('sapato')     ? g('sapato').value            : '',
      rsInstagram:    g('rs-instagram') ? g('rs-instagram').value.trim() : '',
      rsFacebook:     g('rs-facebook')  ? g('rs-facebook').value.trim()  : '',
      rsTikTok:       g('rs-tiktok')    ? g('rs-tiktok').value.trim()    : '',
      rsYouTube:      g('rs-youtube')   ? g('rs-youtube').value.trim()   : '',
      rsTwitter:      g('rs-twitter')   ? g('rs-twitter').value.trim()   : '',
      rsLinkedIn:     g('rs-linkedin')  ? g('rs-linkedin').value.trim()  : '',
      enderecoRua:    g('rua')        ? g('rua').value.trim()        : '',
      enderecoBairro: g('bairro')     ? g('bairro').value.trim()     : '',
      enderecoCidade: g('cidade')     ? g('cidade').value.trim()     : '',
      enderecoCep:    g('cep')        ? g('cep').value.trim()        : '',
      peso:           g('peso')       ? g('peso').value              : '',
      altura:         g('altura')     ? g('altura').value            : '',
      ladoDominante:  g('lado')       ? g('lado').value              : '',
      raquete:        g('raquete')    ? g('raquete').value.trim()    : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      UI.toast(`Aluno "${data.nome}" atualizado com sucesso!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, data);
      UI.toast(`Aluno "${data.nome}" cadastrado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteAluno(id) {
    const aluno = Storage.getById(this.STORAGE_KEY, id);
    if (!aluno) return;

    // Verifica registros vinculados
    const vinculos = [
      Storage.getAll('matriculas').filter(r => r.alunoId === id).length,
      Storage.getAll('presencas').filter(r => r.alunoId === id).length,
      Storage.getAll('turmaAlunos').filter(r => r.alunoId === id).length,
      Storage.getAll('reposicoes').filter(r => r.alunoId === id).length,
    ].reduce((a, b) => a + b, 0);

    if (vinculos > 0) {
      const inativar = await UI.confirm(
        `"${aluno.nome}" possui ${vinculos} registro(s) vinculado(s) no sistema (matrículas, presenças, inscrições). Não é possível excluir.\n\nDeseja inativar o aluno em vez disso?`,
        'Não é possível excluir',
        'Inativar'
      );
      if (!inativar) return;
      Storage.update(this.STORAGE_KEY, id, { status: 'inativo' });
      UI.toast(`Aluno "${aluno.nome}" inativado.`, 'success');
      this.render();
      return;
    }

    const confirmed = await UI.confirm(
      `Excluir o aluno "${aluno.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Aluno'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Aluno "${aluno.nome}" excluído.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Filter handlers                                                     */
  /* ------------------------------------------------------------------ */

  handleSearch(value) {
    this._state.search = value;
    this._reRender();
  },

  handleFilterStatus(value) {
    this._state.filterStatus = value;
    this._reRender();
  },

  handleFilterNivel(value) {
    this._state.filterNivel = value;
    this._reRender();
  },

  clearFilters() {
    this._state.search       = '';
    this._state.filterStatus = '';
    this._state.filterNivel  = '';
    this.render();
  },

  _reRender() {
    const filtered = this.getFiltered();
    const list = document.getElementById('alunos-list');
    if (list) {
      list.innerHTML = filtered.length ? this.renderTable(filtered) : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} aluno${filtered.length !== 1 ? 's' : ''}`;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Perfil do Aluno                                                    */
  /* ------------------------------------------------------------------ */

  openPerfilAluno(id) {
    const aluno = Storage.getById(this.STORAGE_KEY, id);
    if (!aluno) return;

    const status     = this.STATUS[aluno.status] || { label: aluno.status, badge: 'badge-gray' };
    const nivelLabel = this.NIVEL[aluno.nivel]   || aluno.nivel || '—';
    const nivelBadge = this.NIVEL_BADGE[aluno.nivel] || 'badge-gray';
    const idade      = aluno.dataNascimento ? this._calcIdade(aluno.dataNascimento) : '—';

    // Turmas em que o aluno está inscrito (ativas)
    const inscricoes = Storage.getAll('turmaAlunos').filter(i => i.alunoId === id && i.status === 'ativo');
    const turmaIds   = inscricoes.map(i => i.turmaId);

    // Monta seção de turmas
    let turmasHtml;
    if (!inscricoes.length) {
      turmasHtml = `<p class="text-muted" style="font-style:italic;margin:4px 0;">Nenhuma turma.</p>`;
    } else {
      turmasHtml = inscricoes.map(insc => {
        const turma = Storage.getById('turmas', insc.turmaId);
        if (!turma) return '';

        const diasMap700 = { dom:'Dom',seg:'Seg',ter:'Ter',qua:'Qua',qui:'Qui',sex:'Sex',sab:'Sáb' };
        const dias   = (turma.diasSemana || []).map(d => typeof d === 'object' ? d.dia : d).map(d => diasMap700[d] || d).join(', ');
        const hora   = [turma.horarioInicio, turma.horarioFim].filter(Boolean).join(' – ') || '—';
        const stBadge = ({ ativa:'badge-success', suspensa:'badge-warning', encerrada:'badge-gray' }[turma.status] || 'badge-gray');

        // Frequência nesta turma
        const aulasDaTurma = Storage.getAll('aulas').filter(a => a.turmaId === turma.id && a.status !== 'cancelada');
        const presencas    = Storage.getAll('presencas').filter(p => p.alunoId === id && aulasDaTurma.some(a => a.id === p.aulaId));
        const totalReg     = presencas.length;
        const presentes    = presencas.filter(p => p.presente).length;
        const pct          = totalReg > 0 ? Math.round((presentes / totalReg) * 100) : null;
        const pctLabel     = pct !== null ? `${presentes}/${totalReg} (${pct}%)` : '—';
        const pctClass     = pct === null ? 'text-muted' : pct >= 75 ? 'freq-pct-ok' : pct >= 50 ? 'freq-pct-med' : 'freq-pct-ruim';

        return `
          <div class="info-box" style="margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <strong style="font-size:0.95rem;">${UI.escape(turma.nome)}</strong>
              <span class="badge ${stBadge}" style="font-size:0.7rem;">${turma.status || '—'}</span>
            </div>
            <div class="info-grid" style="grid-template-columns:repeat(2,1fr);gap:6px 16px;font-size:0.82rem;">
              <div><span class="text-muted">Professor:</span> ${UI.escape(turma.professorNome || '—')}</div>
              <div><span class="text-muted">Arena:</span> ${UI.escape(turma.arenaNome || '—')}</div>
              <div><span class="text-muted">Dias:</span> ${UI.escape(dias || '—')}</div>
              <div><span class="text-muted">Horário:</span> ${UI.escape(hora)}</div>
              <div><span class="text-muted">Nível:</span> ${UI.escape(turma.nivel || '—')}</div>
              <div><span class="text-muted">Tipo:</span> ${UI.escape(turma.tipo || '—')}</div>
              <div><span class="text-muted">Total de aulas:</span> ${aulasDaTurma.length}</div>
              <div><span class="text-muted">Frequência:</span> <span class="${pctClass}">${pctLabel}</span></div>
            </div>
          </div>`;
      }).join('');
    }

    // Próximas aulas (turmas inscritas, status agendada/em_andamento, data >= hoje)
    const hoje       = new Date().toISOString().slice(0, 10);
    const proxAulas  = Storage.getAll('aulas')
      .filter(a => turmaIds.includes(a.turmaId) && a.data >= hoje && ['agendada','em_andamento'].includes(a.status))
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 8);

    let proxHtml;
    if (!proxAulas.length) {
      proxHtml = `<p class="text-muted" style="font-style:italic;margin:4px 0;">Nenhuma aula agendada.</p>`;
    } else {
      proxHtml = `
        <table class="data-table" style="font-size:0.82rem;">
          <thead><tr>
            <th>Data</th><th>Turma</th><th>Professor</th><th>Horário</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${proxAulas.map(a => {
              const [ano, mes, dia] = (a.data || '').split('-');
              const dataFmt = a.data ? `${dia}/${mes}/${ano}` : '—';
              const hora    = [a.horarioInicio, a.horarioFim].filter(Boolean).join(' – ') || '—';
              const stLabel = ({ agendada:'Agendada', em_andamento:'Em andamento', concluida:'Concluída', cancelada:'Cancelada' }[a.status] || a.status);
              const stBadge = ({ agendada:'badge-blue', em_andamento:'badge-warning', concluida:'badge-success', cancelada:'badge-danger' }[a.status] || 'badge-gray');
              return `<tr>
                <td>${UI.escape(dataFmt)}</td>
                <td>${UI.escape(a.turmaNome || '—')}</td>
                <td>${UI.escape(a.professorNome || '—')}</td>
                <td>${UI.escape(hora)}</td>
                <td><span class="badge ${stBadge}" style="font-size:0.7rem;">${UI.escape(stLabel)}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    }

    // Últimas aulas concluídas
    const aulasConc = Storage.getAll('aulas')
      .filter(a => turmaIds.includes(a.turmaId) && a.status === 'concluida')
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 6);

    let concHtml;
    if (!aulasConc.length) {
      concHtml = `<p class="text-muted" style="font-style:italic;margin:4px 0;">Nenhuma aula concluída registrada.</p>`;
    } else {
      const presencas = Storage.getAll('presencas');
      concHtml = `
        <table class="data-table" style="font-size:0.82rem;">
          <thead><tr>
            <th>Data</th><th>Turma</th><th>Professor</th><th>Presença</th>
          </tr></thead>
          <tbody>
            ${aulasConc.map(a => {
              const [ano, mes, dia] = (a.data || '').split('-');
              const dataFmt = a.data ? `${dia}/${mes}/${ano}` : '—';
              const reg     = presencas.find(p => p.aulaId === a.id && p.alunoId === id);
              const presLabel = reg ? (reg.presente ? '✅ Presente' : '❌ Ausente') : '— Não registrado';
              return `<tr>
                <td>${UI.escape(dataFmt)}</td>
                <td>${UI.escape(a.turmaNome || '—')}</td>
                <td>${UI.escape(a.professorNome || '—')}</td>
                <td>${presLabel}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    }

    const mesAtual = new Date().toISOString().slice(0, 7);
    const saldoHtml = SaldoService.barSaldo(id, mesAtual);

    // ── Matrículas (ativa + histórico) ───────────────────────────────
    const todasMatriculasAluno = Storage.getAll('matriculas')
      .filter(m => m.alunoId === id)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const matriculaAtiva = todasMatriculasAluno.find(m => m.status === 'ativa') || null;

    // Estatísticas de uso do plano (mês atual)
    const mesAtual2 = new Date().toISOString().slice(0, 7);
    const plano = matriculaAtiva ? Storage.getById('planos', matriculaAtiva.planoId) : null;
    const aulasContratadas = plano ? (parseInt(plano.aulasIncluidas, 10) || 0) : 0;

    const aulasDoMes = Storage.getAll('aulas').filter(a =>
      turmaIds.includes(a.turmaId) && (a.data || '').startsWith(mesAtual2) && a.status === 'concluida'
    );
    const presencasDoMes = Storage.getAll('presencas').filter(p =>
      p.alunoId === id && p.presente && aulasDoMes.some(a => a.id === p.aulaId)
    );
    const aulasRealizadas = presencasDoMes.length;
    const pctUso = aulasContratadas > 0 ? Math.round((aulasRealizadas / aulasContratadas) * 100) : 0;

    const maxRepos = Math.floor(aulasContratadas * 0.5);
    const reposUsadas2 = Storage.getAll('aulas').filter(a =>
      a.tipo === 'reposicao' && (a.alunoReposicaoId === id || a.alunoId === id) && a.status === 'concluida'
    ).length;
    const reposDisponiveis = Math.max(0, maxRepos - reposUsadas2);

    const TIPO_PLANO = { mensal:'Mensal', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual' };
    const fmtD = s => { if (!s) return '—'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };

    const STATUS_MAT = {
      ativa:     { label:'Ativa',     badge:'badge-success' },
      expirada:  { label:'Expirada',  badge:'badge-gray'    },
      cancelada: { label:'Cancelada', badge:'badge-danger'  },
      suspensa:  { label:'Suspensa',  badge:'badge-warning' },
    };

    // Bloco da matrícula ativa
    let planoHtml;
    if (!matriculaAtiva) {
      planoHtml = `<p class="text-muted" style="font-style:italic;margin:4px 0 12px;">
        Sem matrícula ativa.
        <button class="btn btn-ghost btn-sm" onclick="UI.closeModal();setTimeout(()=>MatriculaModule.openModal(),300);" style="font-size:12px;">+ Nova matrícula</button>
      </p>`;
    } else {
      const tipoLabel = plano ? (TIPO_PLANO[plano.tipo] || plano.tipo || '—') : '—';
      const pctClass  = pctUso >= 75 ? 'color:var(--success)' : pctUso >= 50 ? 'color:var(--warning,#d97706)' : 'color:var(--danger)';

      const gradesDias = inscricoes.map(i => {
        const t = Storage.getById('turmas', i.turmaId);
        if (!t) return null;
        const diasSemMap = { dom:'Dom', seg:'Seg', ter:'Ter', qua:'Qua', qui:'Qui', sex:'Sex', sab:'Sáb' };
        const dias = (t.diasSemana || []).map(d => typeof d === 'object' ? d.dia : d).map(d => diasSemMap[d] || d).join(', ');
        return `<span class="aluno-grade-chip">${UI.escape(t.nome)}</span>${dias ? `<span class="text-muted" style="font-size:11px;">(${dias})</span>` : ''}`;
      }).filter(Boolean);

      planoHtml = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span class="badge badge-success">✅ Matrícula Ativa</span>
          <button class="btn btn-ghost btn-sm" onclick="MatriculaModule.openModal('${matriculaAtiva.id}');UI.closeModal();" style="font-size:11px;">✏️ Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="UI.closeModal();setTimeout(()=>MatriculaModule.openModal(),300);" style="font-size:11px;">+ Nova</button>
        </div>
        <div class="info-grid" style="grid-template-columns:repeat(2,1fr);gap:8px 16px;font-size:0.85rem;margin-bottom:12px;">
          <div><span class="text-muted">Plano:</span> <strong>${UI.escape(matriculaAtiva.planoNome || '—')}</strong></div>
          <div><span class="text-muted">Tipo:</span> ${tipoLabel}</div>
          <div><span class="text-muted">Início:</span> ${fmtD(matriculaAtiva.dataInicio)}</div>
        </div>
        <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px;">
          <div class="stat-card" style="padding:10px 12px;">
            <div style="font-size:1.4rem;font-weight:800;text-align:center;">${aulasContratadas}</div>
            <div class="stat-label" style="text-align:center;">Aulas / mês</div>
          </div>
          <div class="stat-card" style="padding:10px 12px;">
            <div style="font-size:1.4rem;font-weight:800;text-align:center;${pctClass}">${aulasRealizadas}</div>
            <div class="stat-label" style="text-align:center;">Realizadas (${pctUso}%)</div>
          </div>
          <div class="stat-card" style="padding:10px 12px;">
            <div style="font-size:1.4rem;font-weight:800;text-align:center;color:${reposDisponiveis > 0 ? 'var(--success)' : 'var(--text-muted)'};">${reposDisponiveis}</div>
            <div class="stat-label" style="text-align:center;">Reposições disp.</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
          ℹ️ Direito a até <strong>${maxRepos}</strong> reposições · ${reposUsadas2} utilizadas
        </div>
        ${gradesDias.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px;">${gradesDias.join('')}</div>` : ''}`;
    }

    // Histórico de matrículas (todas exceto a ativa já exibida acima)
    const historico = todasMatriculasAluno.filter(m => m.id !== (matriculaAtiva?.id));
    const historicoHtml = historico.length
      ? `<div style="margin-top:12px;border-top:1px solid var(--card-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;">HISTÓRICO</div>
          ${historico.map(m => {
            const st = STATUS_MAT[m.status] || { label: m.status, badge: 'badge-gray' };
            return `<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--card-border);">
              <span class="badge ${st.badge}" style="font-size:10px;">${st.label}</span>
              <span style="flex:1;">${UI.escape(m.planoNome || '—')}</span>
              <span class="text-muted">${fmtD(m.dataInicio)} → ${fmtD(m.dataFim)}</span>
              <button class="btn btn-ghost btn-sm" onclick="UI.closeModal();setTimeout(()=>MatriculaModule.openModal('${m.id}'),300);" title="Editar" style="font-size:11px;padding:2px 6px;">✏️</button>
            </div>`;
          }).join('')}
        </div>`
      : '';

    // ── Reposições ────────────────────────────────────────────────────
    const todasAulas = Storage.getAll('aulas');
    const reposSolic = todasAulas.filter(a =>
      a.tipo === 'reposicao' && (a.alunoReposicaoId === id || a.alunoId === id));
    const reposFeitas = reposSolic.filter(a => a.status === 'concluida').length;
    const reposPend   = reposSolic.filter(a => ['agendada','em_andamento'].includes(a.status)).length;

    const reposHtml = `
      <div class="info-grid" style="grid-template-columns:repeat(3,1fr);gap:8px;font-size:0.85rem;">
        <div class="info-box" style="text-align:center;">
          <div style="font-size:1.4rem;font-weight:700;">${reposSolic.length}</div>
          <div class="text-muted">Solicitadas</div>
        </div>
        <div class="info-box" style="text-align:center;">
          <div style="font-size:1.4rem;font-weight:700;color:#16a34a;">${reposFeitas}</div>
          <div class="text-muted">Realizadas</div>
        </div>
        <div class="info-box" style="text-align:center;">
          <div style="font-size:1.4rem;font-weight:700;color:#d97706;">${reposPend}</div>
          <div class="text-muted">Pendentes</div>
        </div>
      </div>`;

    // ── Vestuário ─────────────────────────────────────────────────────
    const vestuarioHtml = (aluno.tamanhoCamisa || aluno.tamanhoShort || aluno.tamanhoSapato)
      ? `<div class="info-grid" style="grid-template-columns:repeat(3,1fr);gap:8px;font-size:0.85rem;">
          <div><span class="text-muted">Camiseta:</span> <strong>${UI.escape(aluno.tamanhoCamisa || '—')}</strong></div>
          <div><span class="text-muted">Short:</span> <strong>${UI.escape(aluno.tamanhoShort || '—')}</strong></div>
          <div><span class="text-muted">Calçado:</span> <strong>${aluno.tamanhoSapato ? aluno.tamanhoSapato + ' BR' : '—'}</strong></div>
        </div>`
      : `<p class="text-muted" style="font-style:italic;margin:4px 0;">Não informado.</p>`;

    const content = `
      <div class="detalhe-section">
        <div class="detalhe-section-title">👤 Dados Pessoais</div>
        <div class="info-grid" style="grid-template-columns:repeat(2,1fr);">
          <div><span class="text-muted">Nome:</span> <strong>${UI.escape(aluno.nome)}</strong></div>
          <div><span class="text-muted">Status:</span> <span class="badge ${status.badge}">${status.label}</span></div>
          <div><span class="text-muted">CPF:</span> ${UI.escape(aluno.cpf || '—')}</div>
          <div><span class="text-muted">Telefone:</span> ${UI.escape(aluno.telefone || '—')}</div>
          <div><span class="text-muted">E-mail:</span> ${UI.escape(aluno.email || '—')}</div>
          ${[
            aluno.rsInstagram ? `<span style="color:#E1306C;">●</span> <strong>Instagram:</strong> ${UI.escape(aluno.rsInstagram)}` : '',
            aluno.rsFacebook  ? `<span style="color:#1877F2;">●</span> <strong>Facebook:</strong> ${UI.escape(aluno.rsFacebook)}`   : '',
            aluno.rsTikTok    ? `<span style="color:#000;">●</span> <strong>TikTok:</strong> ${UI.escape(aluno.rsTikTok)}`           : '',
            aluno.rsYouTube   ? `<span style="color:#FF0000;">●</span> <strong>YouTube:</strong> ${UI.escape(aluno.rsYouTube)}`     : '',
            aluno.rsTwitter   ? `<span style="color:#1DA1F2;">●</span> <strong>X/Twitter:</strong> ${UI.escape(aluno.rsTwitter)}`  : '',
            aluno.rsLinkedIn  ? `<span style="color:#0A66C2;">●</span> <strong>LinkedIn:</strong> ${UI.escape(aluno.rsLinkedIn)}`  : '',
          ].filter(Boolean).map(rs => `<div style="grid-column:1/-1;font-size:13px;">${rs}</div>`).join('') || '<div style="grid-column:1/-1;"><span class="text-muted">Redes sociais:</span> —</div>'}
          <div><span class="text-muted">Data de Nasc.:</span> ${aluno.dataNascimento ? UI.formatDate(aluno.dataNascimento) : '—'}</div>
          <div><span class="text-muted">Idade:</span> ${idade !== '—' ? `<strong>${idade} anos</strong>` : '—'}</div>
          ${(aluno.enderecoRua || aluno.enderecoBairro || aluno.enderecoCidade) ? `
          <div style="grid-column:1/-1;">
            <span class="text-muted">Endereço:</span>
            ${[aluno.enderecoRua, aluno.enderecoBairro, aluno.enderecoCidade, aluno.enderecoCep].filter(Boolean).map(s => UI.escape(s)).join(' · ')}
          </div>` : ''}
          ${aluno.observacoes ? `<div style="grid-column:1/-1;"><span class="text-muted">Obs:</span> ${UI.escape(aluno.observacoes)}</div>` : ''}
        </div>
      </div>

      <div class="detalhe-section">
        <div class="detalhe-section-title">🏓 Dados do Esporte</div>
        <div class="info-grid" style="grid-template-columns:repeat(2,1fr);">
          <div><span class="text-muted">Nível:</span> <span class="badge ${nivelBadge}">${UI.escape(nivelLabel)}</span></div>
          <div><span class="text-muted">Lado dominante:</span> ${ {'destro':'Destro','canhoto':'Canhoto','ambos':'Ambidestro'}[aluno.ladoDominante] || '—'}</div>
          <div><span class="text-muted">Peso:</span> ${aluno.peso ? aluno.peso + ' kg' : '—'}</div>
          <div><span class="text-muted">Altura:</span> ${aluno.altura ? aluno.altura + ' cm' : '—'}</div>
          ${aluno.raquete ? `<div style="grid-column:1/-1;"><span class="text-muted">Raquete:</span> <strong>${UI.escape(aluno.raquete)}</strong></div>` : ''}
        </div>
      </div>

      <div class="detalhe-section">
        <div class="detalhe-section-title">👕 Vestuário</div>
        ${vestuarioHtml}
      </div>

      <div class="detalhe-section">
        <div class="detalhe-section-title">🎫 Matrículas</div>
        ${planoHtml}
        ${historicoHtml}
      </div>

      <div class="detalhe-section">
        <div class="detalhe-section-title">📊 Saldo de Aulas — ${mesAtual}</div>
        ${saldoHtml}
      </div>

      <div class="detalhe-section">
        <div class="detalhe-section-title">🔄 Reposições</div>
        ${reposHtml}
      </div>

      <div class="detalhe-section">
        <div class="detalhe-section-title">Turmas inscritas (${inscricoes.length})</div>
        ${turmasHtml}
      </div>

      <div class="detalhe-section">
        <div class="detalhe-section-title">Próximas aulas</div>
        ${proxHtml}
      </div>

      <div class="detalhe-section">
        <div class="detalhe-section-title">Últimas aulas concluídas</div>
        ${concHtml}
      </div>`;

    UI.openModal({
      title:        `Perfil — ${aluno.nome}`,
      content,
      confirmLabel: 'Editar aluno',
      cancelLabel:  'Fechar',
      onConfirm:    () => { UI.closeModal(); this.openModal(id); },
      wide:         true,
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _calcIdade(dataNascimento) {
    if (!dataNascimento) return '—';
    const hoje   = new Date();
    const nasc   = new Date(dataNascimento);
    let idade    = hoje.getFullYear() - nasc.getFullYear();
    const m      = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return isNaN(idade) || idade < 0 ? '—' : String(idade);
  },

  _maskCpf(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    el.value = v;
  },

  _maskTel(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    el.value = v;
  },

  _showIdade(input) {
    const age = this._calcIdade(input.value);
    const el = document.getElementById('a-idade-display');
    if (el) el.innerHTML = age && age !== '—'
      ? `<strong>${age} anos</strong>`
      : '<span style="color:var(--text-muted);">— preencha o nascimento</span>';
  },

  _maskCep(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    el.value = v;
  },

  /**
   * Valida dígitos verificadores do CPF (mod 11).
   * @param {string} digits — 11 dígitos numéricos sem máscara
   */
  _validarCPF(digits) {
    if (/^(\d)\1{10}$/.test(digits)) return false; // todos os dígitos iguais
    const calc = (n, len) => {
      let s = 0;
      for (let i = 0; i < len; i++) s += parseInt(n[i]) * (len + 1 - i);
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(digits, 9)  === parseInt(digits[9]) &&
           calc(digits, 10) === parseInt(digits[10]);
  },
};
