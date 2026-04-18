'use strict';

/**
 * ProfessorModule — Complete CRUD module for managing pickleball instructors
 */
const ProfessorModule = {
  STORAGE_KEY: 'professores',

  _state: {
    search:           '',
    filterStatus:     '',
    filterEspecialidade: '',
  },

  STATUS: {
    ativo:    { label: 'Ativo',    badge: 'badge-success' },
    inativo:  { label: 'Inativo',  badge: 'badge-gray'    },
    ferias:   { label: 'Férias',   badge: 'badge-blue'    },
  },

  ESPECIALIDADE: {
    iniciantes:   'Iniciantes',
    intermediario:'Intermediário',
    avancado:     'Avançado',
    competicao:   'Competição',
    infantil:     'Infantil',
    fisioterapia: 'Fisioterapia / Reabilitação',
  },

  DIAS: {
    seg: 'Seg', ter: 'Ter', qua: 'Qua',
    qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom',
  },

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getAll() {
    return Storage.getAll(this.STORAGE_KEY);
  },

  getFiltered() {
    const { search, filterStatus, filterEspecialidade } = this._state;
    return this.getAll().filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.nome.toLowerCase().includes(q) ||
        (p.email    && p.email.toLowerCase().includes(q)) ||
        (p.cpf      && p.cpf.includes(q)) ||
        (p.telefone && p.telefone.includes(q));
      const matchStatus = !filterStatus || p.status === filterStatus;
      const matchEsp    = !filterEspecialidade || p.especialidade === filterEspecialidade;
      return matchSearch && matchStatus && matchEsp;
    });
  },

  getStats() {
    const all = this.getAll();
    return {
      total:   all.length,
      ativos:  all.filter(p => p.status === 'ativo').length,
      ferias:  all.filter(p => p.status === 'ferias').length,
      inativos:all.filter(p => p.status === 'inativo').length,
    };
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
          <h2>Professores</h2>
          <p>Cadastro de instrutores, horários disponíveis e especialidades</p>
        </div>
        <button class="btn btn-primary" onclick="ProfessorModule.openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Professor
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">🎓</div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total</div>
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
          <div class="stat-icon blue">🏖️</div>
          <div class="stat-info">
            <div class="stat-value">${stats.ferias}</div>
            <div class="stat-label">Férias</div>
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
            oninput="ProfessorModule.handleSearch(this.value)"
          />
        </div>
        <select class="filter-select" onchange="ProfessorModule.handleFilterStatus(this.value)">
          <option value="">Todos os status</option>
          <option value="ativo"   ${this._state.filterStatus === 'ativo'   ? 'selected' : ''}>Ativo</option>
          <option value="ferias"  ${this._state.filterStatus === 'ferias'  ? 'selected' : ''}>Férias</option>
          <option value="inativo" ${this._state.filterStatus === 'inativo' ? 'selected' : ''}>Inativo</option>
        </select>
        <select class="filter-select" onchange="ProfessorModule.handleFilterEsp(this.value)">
          <option value="">Todas as especialidades</option>
          ${CadastrosModule.getEspecialidades().map(e =>
            `<option value="${UI.escape(e.nome)}" ${this._state.filterEspecialidade === e.nome ? 'selected' : ''}>${UI.escape(e.nome)}</option>`
          ).join('')}
        </select>
        <span class="results-count">
          ${filtered.length} professor${filtered.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div class="cards-grid" id="professores-grid">
        ${filtered.length
          ? filtered.map(p => this.renderCard(p)).join('')
          : this.renderEmpty()
        }
      </div>
    `;
  },

  renderCard(p) {
    const status = this.STATUS[p.status] || { label: p.status, badge: 'badge-gray' };
    const esp    = (p.especialidade ? (this.ESPECIALIDADE[p.especialidade] || p.especialidade) : '—');
    const cadastro = UI.formatDate(p.createdAt);
    const todasArenas = Storage.getAll('arenas');
    const arenasChips = Array.isArray(p.arenas) && p.arenas.length
      ? p.arenas.map(aid => {
          const ar = todasArenas.find(a => a.id === aid);
          return ar ? `<span class="dia-chip">${UI.escape(ar.nome)}</span>` : '';
        }).join('')
      : '';

    const obsBlock = p.observacoes
      ? `<div class="arena-obs"><div class="arena-obs-text">💬 ${UI.escape(p.observacoes)}</div></div>`
      : '';

    let atestadoBadge = '';
    if (p.atestadoMedico === 'sim') {
      atestadoBadge = `<span class="badge badge-success">✅ Apto</span>`;
    } else if (p.atestadoMedico === 'vencido') {
      atestadoBadge = `<span class="badge badge-warning">⚠️ Vencido</span>`;
    } else if (p.atestadoMedico === 'nao') {
      atestadoBadge = `<span class="badge badge-gray">Sem atestado</span>`;
    }

    return `
      <div class="arena-card" data-id="${p.id}" data-status="${UI.escape(p.status)}">
        <div class="arena-card-top">
          <span class="card-status-badge">
            <span class="badge ${status.badge}">${status.label}</span>
          </span>
          <div class="arena-name">${UI.escape(p.nome)}</div>
          <span class="arena-code">${UI.escape(esp)}</span>
        </div>

        <div class="arena-details">
          <div class="detail-item">
            <div class="detail-label">E-mail</div>
            <div class="detail-value">${UI.escape(p.email || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Telefone</div>
            <div class="detail-value">${UI.escape(p.telefone || '—')}</div>
          </div>
          ${p.cnpj ? `
          <div class="detail-item">
            <div class="detail-label">CNPJ</div>
            <div class="detail-value">${UI.escape(p.cnpj)}</div>
          </div>` : ''}
          ${p.pixChave ? `
          <div class="detail-item">
            <div class="detail-label">PIX</div>
            <div class="detail-value">${UI.escape(p.pixChave)}</div>
          </div>` : ''}
          ${atestadoBadge ? `
          <div class="detail-item">
            <div class="detail-label">Atestado</div>
            <div class="detail-value">${atestadoBadge}</div>
          </div>` : ''}
          <div class="detail-item">
            <div class="detail-label">Cadastro</div>
            <div class="detail-value">${cadastro}</div>
          </div>
        </div>

        ${arenasChips ? `
        <div style="padding:6px 16px 8px;border-top:1px solid #f1f5f9;">
          <div class="detail-label" style="margin-bottom:6px;">Arenas</div>
          <div class="dias-chips">${arenasChips}</div>
        </div>` : ''}

        ${obsBlock}

        <div class="arena-actions">
          <button class="btn btn-secondary btn-sm" onclick="ProfessorModule.openModal('${p.id}')">
            ✏️ Editar
          </button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm danger" onclick="ProfessorModule.deleteProfessor('${p.id}')" title="Excluir">
            🗑️
          </button>
        </div>
      </div>`;
  },

  renderEmpty() {
    const isFiltered = this._state.search || this._state.filterStatus || this._state.filterEspecialidade;
    if (isFiltered) {
      return `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhum professor encontrado</div>
          <div class="empty-desc">Nenhum professor corresponde aos filtros aplicados.</div>
          <button class="btn btn-secondary mt-16" onclick="ProfessorModule.clearFilters()">Limpar filtros</button>
        </div>`;
    }
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎓</div>
        <div class="empty-title">Nenhum professor cadastrado</div>
        <div class="empty-desc">Comece adicionando o primeiro instrutor da academia.</div>
        <button class="btn btn-primary mt-16" onclick="ProfessorModule.openModal()">+ Cadastrar primeiro professor</button>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal / Form                                                        */
  /* ------------------------------------------------------------------ */

  openModal(id = null) {
    const prof   = id ? Storage.getById(this.STORAGE_KEY, id) : null;
    const isEdit = !!prof;
    const v      = (field, fallback = '') => prof ? UI.escape(String(prof[field] ?? fallback)) : fallback;

    const statusOptions = Object.entries(this.STATUS).map(([k, cfg]) =>
      `<option value="${k}" ${prof && prof.status === k ? 'selected' : ''}>${cfg.label}</option>`).join('');

    const espOptions = `<option value="">— Selecionar —</option>` +
      CadastrosModule.buildOptions(
        CadastrosModule.getEspecialidades(),
        prof ? (prof.especialidade || '') : ''
      );

    // Arenas checkboxes
    const arenas = Storage.getAll('arenas').filter(a => a.status === 'ativa');
    const profArenas = Array.isArray(prof?.arenas) ? prof.arenas : [];
    const arenasChecks = arenas.map(a => `
      <label class="dia-check-label">
        <input type="checkbox" name="prof-arena" value="${a.id}"
          ${profArenas.includes(a.id) ? 'checked' : ''} />
        <span>${UI.escape(a.nome)}</span>
      </label>`).join('') || '<span class="text-muted" style="font-size:12px;">Nenhuma arena cadastrada.</span>';

    // Currículo rows
    const curriculoData = Array.isArray(prof?.curriculo) && prof.curriculo.length ? prof.curriculo : [{}];
    const curriculoRows = curriculoData.map(c => this._curriculoRow(c)).join('');

    // Períodos de atuação
    const dias = ['seg','ter','qua','qui','sex','sab','dom'];
    const diaLabels = { seg:'Seg', ter:'Ter', qua:'Qua', qui:'Qui', sex:'Sex', sab:'Sáb', dom:'Dom' };
    const turnos = [
      { key: 'manha', label: 'Manhã',  desc: '06:00–12:00' },
      { key: 'tarde', label: 'Tarde',  desc: '12:00–18:00' },
      { key: 'noite', label: 'Noite',  desc: '18:00–22:00' },
    ];
    const periodos = prof?.periodos || {};

    const periodosGrid = dias.map(day => {
      const dayPeriodos = periodos[day] || {};
      const turnosHtml = turnos.map(t => {
        const horario = dayPeriodos[t.key] || '';
        const checked = !!horario;
        const inputId = `per-hor-${day}-${t.key}`;
        return `
          <div style="display:flex;align-items:center;gap:4px;flex:1;min-width:0;">
            <input type="checkbox" name="per-${day}-${t.key}"
              ${checked ? 'checked' : ''}
              onchange="ProfessorModule._togglePeriodo(this,'${inputId}')" />
            <span style="font-size:11px;white-space:nowrap;">${t.label}</span>
            <input type="text" id="${inputId}" class="form-input"
              placeholder="${t.desc}"
              value="${UI.escape(horario)}"
              style="font-size:11px;padding:2px 4px;min-width:0;width:100%;display:${checked ? '' : 'none'};" />
          </div>`;
      }).join('');
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #f1f5f9;">
          <span style="min-width:36px;font-size:12px;font-weight:600;color:#64748b;">${diaLabels[day]}</span>
          <div style="display:flex;gap:8px;flex:1;">
            ${turnosHtml}
          </div>
        </div>`;
    }).join('');

    const content = `
      <div class="form-grid">

        <!-- IDENTIFICAÇÃO -->
        <div class="aluno-secao-titulo">👤 Identificação</div>

        <div class="form-group">
          <label class="form-label" for="p-nome">Nome completo <span class="required-star">*</span></label>
          <input id="p-nome" type="text" class="form-input"
            placeholder="ex: Prof. Ricardo Alves"
            value="${v('nome')}" required autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-cpf">CPF</label>
            <input id="p-cpf" type="text" class="form-input"
              placeholder="000.000.000-00"
              value="${v('cpf')}" maxlength="14" autocomplete="off"
              oninput="ProfessorModule._maskCpf(this)" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-cnpj">CNPJ</label>
            <input id="p-cnpj" type="text" class="form-input"
              placeholder="00.000.000/0001-00"
              value="${v('cnpj')}" maxlength="18" autocomplete="off"
              oninput="ProfessorModule._maskCnpj(this)" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-status">Status</label>
            <select id="p-status" class="form-select">${statusOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="p-antecedentes">Antecedentes criminais</label>
            <select id="p-antecedentes" class="form-select">
              <option value="" ${!prof?.antecedentes ? 'selected' : ''}>— Não informado —</option>
              <option value="nao" ${prof?.antecedentes === 'nao' ? 'selected' : ''}>Não</option>
              <option value="sim" ${prof?.antecedentes === 'sim' ? 'selected' : ''}>Sim</option>
            </select>
          </div>
        </div>

        <!-- CONTATO -->
        <div class="aluno-secao-titulo">📞 Contato</div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-telefone">Telefone</label>
            <input id="p-telefone" type="text" class="form-input"
              placeholder="(00) 00000-0000"
              value="${v('telefone')}" maxlength="15" autocomplete="off"
              oninput="ProfessorModule._maskTel(this)" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-telefone2">Telefone 2</label>
            <input id="p-telefone2" type="text" class="form-input"
              placeholder="(00) 00000-0000"
              value="${v('telefone2')}" maxlength="15" autocomplete="off"
              oninput="ProfessorModule._maskTel(this)" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-email">E-mail</label>
            <input id="p-email" type="email" class="form-input"
              placeholder="professor@email.com"
              value="${v('email')}" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-email2">E-mail 2</label>
            <input id="p-email2" type="email" class="form-input"
              placeholder="professor2@email.com"
              value="${v('email2')}" autocomplete="off" />
          </div>
        </div>

        <!-- ENDEREÇO -->
        <div class="aluno-secao-titulo">📍 Endereço</div>

        <div class="form-group">
          <label class="form-label" for="p-rua">Rua / Avenida</label>
          <input id="p-rua" type="text" class="form-input"
            placeholder="ex: Rua das Flores, 123"
            value="${v('enderecoRua')}" autocomplete="off" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-cidade">Cidade</label>
            <input id="p-cidade" type="text" class="form-input"
              placeholder="ex: São Paulo"
              value="${v('enderecoCidade')}" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-cep">CEP</label>
            <input id="p-cep" type="text" class="form-input"
              placeholder="00000-000"
              value="${v('enderecoCep')}" maxlength="9" autocomplete="off"
              oninput="ProfessorModule._maskCep(this)" />
          </div>
        </div>

        <!-- CONDIÇÕES FÍSICAS -->
        <div class="aluno-secao-titulo">🏃 Condições Físicas</div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-peso">Peso (kg)</label>
            <input id="p-peso" type="number" class="form-input"
              placeholder="ex: 75"
              value="${v('peso')}" min="0" step="0.1" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-altura">Altura (cm)</label>
            <input id="p-altura" type="number" class="form-input"
              placeholder="ex: 175"
              value="${v('altura')}" min="0" step="1" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-atestado">Atestado médico</label>
            <select id="p-atestado" class="form-select">
              <option value="" ${!prof?.atestadoMedico ? 'selected' : ''}>— Não informado —</option>
              <option value="sim"     ${prof?.atestadoMedico === 'sim'     ? 'selected' : ''}>Sim — apto</option>
              <option value="nao"     ${prof?.atestadoMedico === 'nao'     ? 'selected' : ''}>Não possui</option>
              <option value="vencido" ${prof?.atestadoMedico === 'vencido' ? 'selected' : ''}>Vencido</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="p-atestado-val">Validade atestado</label>
            <input id="p-atestado-val" type="date" class="form-input"
              value="${v('atestadoValidade')}" />
          </div>
        </div>

        <!-- EQUIPAMENTOS / ROUPAS -->
        <div class="aluno-secao-titulo">👕 Equipamentos / Roupas</div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="p-roupa">Tamanho de roupa</label>
            <select id="p-roupa" class="form-select">
              <option value="">— Selecionar —</option>
              ${['PP','P','M','G','GG','XG','XXG'].map(t =>
                `<option value="${t}" ${prof?.tamanhoRoupa === t ? 'selected' : ''}>${t}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="p-sapato">Tamanho de sapato</label>
            <input id="p-sapato" type="number" class="form-input"
              placeholder="ex: 42"
              value="${v('tamanhoSapato')}" min="30" max="50" step="1" />
          </div>
        </div>

        <!-- INFORMAÇÕES FINANCEIRAS -->
        <div class="aluno-secao-titulo">💰 Informações Financeiras</div>

        <div class="form-group">
          <label class="form-label" for="p-pix">Chave PIX</label>
          <input id="p-pix" type="text" class="form-input"
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            value="${v('pixChave')}" autocomplete="off" />
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label" for="p-banco">Banco</label>
            <input id="p-banco" type="text" class="form-input"
              placeholder="ex: Nubank"
              value="${v('banco')}" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-agencia">Agência</label>
            <input id="p-agencia" type="text" class="form-input"
              placeholder="ex: 0001"
              value="${v('agencia')}" autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-conta">Conta</label>
            <input id="p-conta" type="text" class="form-input"
              placeholder="ex: 12345-6"
              value="${v('conta')}" autocomplete="off" />
          </div>
        </div>

        <!-- DADOS PROFISSIONAIS -->
        <div class="aluno-secao-titulo">🎓 Dados Profissionais</div>

        <div class="form-group">
          <label class="form-label" for="p-especialidade">Nível / Especialidade</label>
          <select id="p-especialidade" class="form-select">${espOptions}</select>
        </div>

        <div class="form-group">
          <label class="form-label">Arenas onde leciona</label>
          <div class="arenas-check-group" id="p-arenas-checks">
            ${arenasChecks}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Currículo / Certificações</label>
          <div style="display:grid;grid-template-columns:1fr 140px 120px 32px;gap:6px;margin-bottom:4px;">
            <span style="font-size:11px;color:#64748b;font-weight:600;">Curso / Certificação</span>
            <span style="font-size:11px;color:#64748b;font-weight:600;">Período</span>
            <span style="font-size:11px;color:#64748b;font-weight:600;">Validade</span>
            <span></span>
          </div>
          <div id="p-curriculo-list">
            ${curriculoRows}
          </div>
          <button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;"
            onclick="ProfessorModule._addCurriculoRow()">+ Adicionar</button>
        </div>

        <!-- PERÍODOS DE ATUAÇÃO -->
        <div class="aluno-secao-titulo">🗓️ Períodos de Atuação</div>

        <div class="form-group">
          <div style="font-size:11px;color:#64748b;margin-bottom:8px;">Marque os turnos disponíveis e informe o horário específico se necessário.</div>
          ${periodosGrid}
        </div>

        <!-- OBSERVAÇÕES -->
        <div class="form-group">
          <label class="form-label" for="p-obs">Observações</label>
          <textarea id="p-obs" class="form-textarea"
            placeholder="Informações adicionais sobre o professor…" rows="3">${prof ? UI.escape(prof.observacoes || '') : ''}</textarea>
        </div>

      </div>`;

    UI.openModal({
      title:        isEdit ? `Editar Professor — ${prof.nome}` : 'Novo Professor',
      content,
      confirmLabel: isEdit ? 'Salvar alterações' : 'Cadastrar Professor',
      onConfirm:    () => this.saveProfessor(id),
      wide:         true,
    });
  },

  /* ------------------------------------------------------------------ */
  /*  CRUD operations                                                     */
  /* ------------------------------------------------------------------ */

  saveProfessor(id = null) {
    const g = n => document.getElementById(`p-${n}`);
    const nome = g('nome');

    if (!nome || !nome.value.trim()) {
      nome && nome.classList.add('error');
      UI.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }
    nome.classList.remove('error');

    const arenaChecks = document.querySelectorAll('input[name="prof-arena"]:checked');
    const arenas = Array.from(arenaChecks).map(cb => cb.value);

    // Currículo
    const curriculoRows = document.querySelectorAll('#p-curriculo-list .curriculo-row');
    const curriculo = Array.from(curriculoRows).map(row => ({
      curso:    (row.querySelector('.cur-curso')?.value || '').trim(),
      periodo:  (row.querySelector('.cur-periodo')?.value || '').trim(),
      validade: (row.querySelector('.cur-validade')?.value || '').trim(),
    })).filter(c => c.curso !== '');

    // Períodos
    const dias = ['seg','ter','qua','qui','sex','sab','dom'];
    const turnosKeys = ['manha','tarde','noite'];
    const periodos = {};
    for (const day of dias) {
      const dayObj = {};
      for (const turno of turnosKeys) {
        const cb = document.querySelector(`[name="per-${day}-${turno}"]`);
        if (cb && cb.checked) {
          const inp = document.getElementById(`per-hor-${day}-${turno}`);
          dayObj[turno] = inp ? inp.value.trim() : '';
        }
      }
      if (Object.keys(dayObj).length > 0) {
        periodos[day] = dayObj;
      }
    }

    const data = {
      nome:            nome.value.trim(),
      cpf:             g('cpf')           ? g('cpf').value.trim()           : '',
      cnpj:            g('cnpj')          ? g('cnpj').value.trim()          : '',
      antecedentes:    g('antecedentes')  ? g('antecedentes').value         : '',
      telefone:        g('telefone')      ? g('telefone').value.trim()      : '',
      telefone2:       g('telefone2')     ? g('telefone2').value.trim()     : '',
      email:           g('email')         ? g('email').value.trim()         : '',
      email2:          g('email2')        ? g('email2').value.trim()        : '',
      especialidade:   g('especialidade') ? g('especialidade').value        : '',
      status:          g('status')        ? g('status').value               : 'ativo',
      enderecoRua:     g('rua')           ? g('rua').value.trim()           : '',
      enderecoCidade:  g('cidade')        ? g('cidade').value.trim()        : '',
      enderecoCep:     g('cep')           ? g('cep').value.trim()           : '',
      peso:            g('peso')          ? g('peso').value.trim()          : '',
      altura:          g('altura')        ? g('altura').value.trim()        : '',
      atestadoMedico:  g('atestado')      ? g('atestado').value             : '',
      atestadoValidade:g('atestado-val')  ? g('atestado-val').value         : '',
      tamanhoRoupa:    g('roupa')         ? g('roupa').value                : '',
      tamanhoSapato:   g('sapato')        ? g('sapato').value.trim()        : '',
      pixChave:        g('pix')           ? g('pix').value.trim()           : '',
      banco:           g('banco')         ? g('banco').value.trim()         : '',
      agencia:         g('agencia')       ? g('agencia').value.trim()       : '',
      conta:           g('conta')         ? g('conta').value.trim()         : '',
      arenas,
      curriculo,
      periodos,
      observacoes:     g('obs')           ? g('obs').value.trim()           : '',
    };

    if (id) {
      Storage.update(this.STORAGE_KEY, id, data);
      UI.toast(`Professor "${data.nome}" atualizado com sucesso!`, 'success');
    } else {
      Storage.create(this.STORAGE_KEY, data);
      UI.toast(`Professor "${data.nome}" cadastrado com sucesso!`, 'success');
    }

    UI.closeModal();
    this.render();
  },

  async deleteProfessor(id) {
    const prof = Storage.getById(this.STORAGE_KEY, id);
    if (!prof) return;

    const vinculos =
      Storage.getAll('turmas').filter(r => r.professorId === id).length +
      Storage.getAll('aulas').filter(r => r.professorId === id).length;

    if (vinculos > 0) {
      const inativar = await UI.confirm(
        `"${prof.nome}" possui ${vinculos} registro(s) vinculado(s) (turmas/aulas). Não é possível excluir.\n\nDeseja inativar o professor em vez disso?`,
        'Não é possível excluir',
        'Inativar'
      );
      if (!inativar) return;
      Storage.update(this.STORAGE_KEY, id, { status: 'inativo' });
      UI.toast(`Professor "${prof.nome}" inativado.`, 'success');
      this.render();
      return;
    }

    const confirmed = await UI.confirm(
      `Excluir o professor "${prof.nome}"? Esta ação não pode ser desfeita.`,
      'Excluir Professor'
    );
    if (!confirmed) return;

    Storage.delete(this.STORAGE_KEY, id);
    UI.toast(`Professor "${prof.nome}" excluído.`, 'success');
    this.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Filter handlers                                                     */
  /* ------------------------------------------------------------------ */

  handleSearch(value) {
    this._state.search = value;
    this._reRenderCards();
  },

  handleFilterStatus(value) {
    this._state.filterStatus = value;
    this._reRenderCards();
  },

  handleFilterEsp(value) {
    this._state.filterEspecialidade = value;
    this._reRenderCards();
  },

  clearFilters() {
    this._state.search              = '';
    this._state.filterStatus        = '';
    this._state.filterEspecialidade = '';
    this.render();
  },

  _reRenderCards() {
    const filtered = this.getFiltered();
    const grid = document.getElementById('professores-grid');
    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map(p => this.renderCard(p)).join('')
        : this.renderEmpty();
    }
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} professor${filtered.length !== 1 ? 'es' : ''}`;
    }
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _curriculoRow(c = {}) {
    return `
    <div class="curriculo-row" style="display:grid;grid-template-columns:1fr 140px 120px 32px;gap:6px;align-items:center;">
      <input type="text" class="form-input cur-curso" placeholder="Curso / Certificação"
        value="${UI.escape(c.curso || '')}" style="font-size:13px;" />
      <input type="text" class="form-input cur-periodo" placeholder="ex: 2023"
        value="${UI.escape(c.periodo || '')}" style="font-size:13px;" />
      <input type="text" class="form-input cur-validade" placeholder="Validade"
        value="${UI.escape(c.validade || '')}" style="font-size:13px;" />
      <button type="button" class="btn btn-ghost btn-sm danger"
        onclick="this.closest('.curriculo-row').remove()" style="padding:4px 8px;">✕</button>
    </div>`;
  },

  _addCurriculoRow() {
    const list = document.getElementById('p-curriculo-list');
    if (!list) return;
    const div = document.createElement('div');
    div.innerHTML = this._curriculoRow({});
    list.appendChild(div.firstElementChild);
  },

  _togglePeriodo(cb, inputId) {
    const inp = document.getElementById(inputId);
    if (inp) inp.style.display = cb.checked ? '' : 'none';
  },

  _maskCnpj(el) {
    let v = el.value.replace(/\D/g,'').slice(0,14);
    if (v.length > 12) v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5');
    else if (v.length > 8) v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/,'$1.$2.$3/$4');
    else if (v.length > 5) v = v.replace(/(\d{2})(\d{3})(\d{0,3})/,'$1.$2.$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,3})/,'$1.$2');
    el.value = v;
  },

  _maskCep(el) {
    let v = el.value.replace(/\D/g,'').slice(0,8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d{0,3})/,'$1-$2');
    el.value = v;
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
};
