'use strict';

/**
 * DB — PocketBase-backed Storage adapter (multi-tenant)
 *
 * Quando TENANT_ID está configurado em pocketbase-config.js:
 *   - Carrega todos os dados do tenant do PocketBase na inicialização
 *   - Patcha Storage para ler do cache em memória (interface síncrona mantida)
 *   - Escreve no cache + PocketBase em background (fire-and-forget)
 *
 * Quando TENANT_ID está vazio:
 *   - Não patcha nada → app funciona normalmente com localStorage
 */
const DB = {

  _tenantId: null,
  _cache:    {},
  _rawCount: {},   // total de linhas no PocketBase por chave (inclui soft-deleted)
  _ready:    false,

  /* ───────────────────────────────────────────────────────────────────
   *  Mapeamento: chave do Storage → nome da tabela/coleção PocketBase
   *  Catálogos usam app_catalogos com campo "tipo" no data
   * ─────────────────────────────────────────────────────────────────── */
  TABLE_MAP: {
    alunos:            'app_alunos',
    arenas:            'app_arenas',
    aulas:             'app_aulas',
    cat_despesa:       'app_catalogos',
    cat_especialidades:'app_catalogos',
    cat_receita:       'app_catalogos',
    cat_tipos_aula:    'app_catalogos',
    cat_tipos_evento:  'app_catalogos',
    config_academia:   'app_config',
    dayuse_entradas:     'app_dayuse_entradas',
    dayuse_planos:       'app_dayuse_planos',
    dayuse_recorrentes:  'app_dayuse_recorrentes',
    eventos:           'app_eventos',
    financeiro:        'app_financeiro',
    loja_compras:        'app_loja_compras',
    loja_estoque_loja:   'app_loja_estoque_loja',
    loja_estoque_mov:    'app_loja_estoque_mov',
    loja_fornecedores:   'app_loja_fornecedores',
    loja_produtos:       'app_loja_produtos',
    loja_transferencias: 'app_loja_transferencias',
    loja_vendas:         'app_loja',
    manutencao:        'app_manutencao',
    manutencao_prev:   'app_manutencao_prev',
    matriculas:        'app_matriculas',
    perfis:            'app_perfis',
    planoContas:       'app_plano_contas',
    planos:            'app_planos',
    presencas:         'app_presenca',
    professores:       'app_professores',
    quadras:           'app_quadras',
    reposicoes:        'app_reposicoes',
    turmaAlunos:       'app_turma_alunos',
    aulaAlunos:        'app_aula_alunos',
    turmas:            'app_turmas',
    usuarios:          'app_usuarios',
    orcamento:         'app_orcamento',
    // ── Módulo de Torneios ──────────────────────────────────────────
    torneios:               'app_torneios',
    torneio_cat_tipos:      'app_torneio_cat_tipos',
    torneio_categorias:     'app_torneio_categorias',
    torneio_participantes:  'app_torneio_participantes',
    torneio_inscricoes:     'app_torneio_inscricoes',
    torneio_duplas:         'app_torneio_duplas',
    torneio_fases:          'app_torneio_fases',
    torneio_grupos:         'app_torneio_grupos',
    torneio_partidas:       'app_torneio_partidas',
    torneio_sets:           'app_torneio_sets',
    torneio_pagamentos:     'app_torneio_pagamentos',
  },

  // Catálogos que compartilham a coleção app_catalogos
  CATALOG_KEYS: new Set([
    'cat_despesa','cat_especialidades','cat_receita','cat_tipos_aula','cat_tipos_evento',
  ]),

  /* ───────────────────────────────────────────────────────────────────
   *  Inicialização
   * ─────────────────────────────────────────────────────────────────── */

  async init(tenantId) {
    if (!window.PocketBaseClient) {
      console.log('[DB] PocketBase não disponível — modo localStorage.');
      return;
    }
    if (!tenantId) {
      console.log('[DB] TENANT_ID não configurado — modo localStorage.');
      return;
    }

    this._tenantId = tenantId;
    this._isMatriz = (typeof isMatriz === 'function') ? isMatriz() : false;

    if (this._isMatriz) {
      console.log('[DB] Modo MATRIZ — carregando dados de todos os tenants.');
    } else {
      console.log('[DB] Carregando dados do tenant…', tenantId);
    }

    await this._loadAll();
    this._patchStorage();
    this._ready = true;
    console.log('[DB] Pronto. Tabelas carregadas:', Object.keys(this._cache).join(', '));
  },

  /* ───────────────────────────────────────────────────────────────────
   *  Carrega todos os dados do PocketBase para o cache em memória
   * ─────────────────────────────────────────────────────────────────── */

  async _loadAll() {
    const tid          = this._tenantId;
    const isMatrizMode = this._isMatriz;
    const pb           = window.PocketBaseClient;

    // Helper: filtro de tenant (ou vazio no modo Matriz)
    const tenantFilter = (extra) => {
      if (isMatrizMode) return extra || '';
      const base = `tenant_id="${tid}"`;
      return extra ? `${base} && ${extra}` : base;
    };

    // Tabelas regulares (não-catálogo) — carrega TODAS em paralelo
    const regularTables = [...new Set(
      Object.entries(this.TABLE_MAP)
        .filter(([k]) => !this.CATALOG_KEYS.has(k))
        .map(([, t]) => t)
    )];

    const [tableResults, catRows] = await Promise.all([
      // Todas as tabelas regulares em paralelo
      Promise.all(regularTables.map(table =>
        pb.collection(table)
          .getFullList({ filter: tenantFilter(), requestKey: null })
          .then(data => ({ table, data, error: null }))
          .catch(err => ({ table, data: [], error: err }))
      )),
      // Catálogos em paralelo com as demais
      pb.collection('app_catalogos')
        .getFullList({ filter: tenantFilter(), requestKey: null })
        .catch(() => []),
    ]);

    // Processa tabelas regulares
    for (const { table, data, error } of tableResults) {
      if (error) { console.warn('[DB] Erro ao carregar', table, ':', error.message); continue; }
      const allRows = data || [];
      // Filtra soft-deletes: registros com data._deleted === true são ignorados
      const rows = allRows.filter(r => !r.data?._deleted).map(r => this._fromRow(r, isMatrizMode));
      for (const [sk, tbl] of Object.entries(this.TABLE_MAP)) {
        if (tbl === table && !this.CATALOG_KEYS.has(sk)) {
          this._cache[sk]    = rows;
          this._rawCount[sk] = allRows.length; // total bruto (inclui soft-deleted)
        }
      }
    }

    // Catálogos — carrega tudo e filtra por "tipo"
    const allCatRows = catRows || [];
    for (const sk of this.CATALOG_KEYS) {
      const filtered = allCatRows.filter(r => r.tipo === sk);
      this._cache[sk]    = filtered.filter(r => !r.data?._deleted).map(r => this._fromRow(r, isMatrizMode));
      this._rawCount[sk] = filtered.length; // total bruto (inclui soft-deleted)
    }
  },

  /* ───────────────────────────────────────────────────────────────────
   *  Patcha os métodos do Storage (substituição em tempo de execução)
   * ─────────────────────────────────────────────────────────────────── */

  _patchStorage() {
    const self = this;

    Storage.getAll = (key) => {
      if (key in self._cache) return self._cache[key] || [];
      return self._lsGetAll(key);
    };

    Storage.getById = (key, id) => {
      if (key in self._cache) return (self._cache[key] || []).find(r => r.id === id) || null;
      return self._lsGetById(key, id);
    };

    Storage.create = (key, data) => {
      if (!(key in self._cache)) return self._lsCreate(key, data);

      const id  = self._newId();
      const now = new Date().toISOString();
      const record = { ...data, id, createdAt: now, updatedAt: now };
      if (!self._cache[key]) self._cache[key] = [];
      self._cache[key].push(record);
      self._pbInsert(key, record);
      return record;
    };

    Storage.update = (key, id, changes) => {
      if (!(key in self._cache)) return self._lsUpdate(key, id, changes);

      const list = self._cache[key] || [];
      const idx  = list.findIndex(r => r.id === id);
      if (idx === -1) return null;

      const now     = new Date().toISOString();
      const updated = { ...list[idx], ...changes, id, createdAt: list[idx].createdAt, updatedAt: now };
      list[idx]     = updated;
      self._pbUpdate(key, updated);
      return updated;
    };

    Storage.delete = (key, id) => {
      if (!(key in self._cache)) return self._lsDelete(key, id);

      const list    = self._cache[key] || [];
      const next    = list.filter(r => r.id !== id);
      const removed = next.length < list.length;
      if (!removed) return false;

      self._cache[key] = next;
      // Passa a lista original para rollback caso o PocketBase rejeite o delete
      self._pbDelete(key, id, list);
      return true;
    };

    Storage.count = (key) => {
      if (key in self._cache) return (self._cache[key] || []).length;
      return self._lsGetAll(key).length;
    };

    Storage.countWhere = (key, pred) => {
      if (key in self._cache) return (self._cache[key] || []).filter(pred).length;
      return self._lsGetAll(key).filter(pred).length;
    };

    Storage.generateId = () => self._newId();

    Storage.seed = (key, seedData) => {
      // Se já tem dados (localStorage ou PocketBase), não re-semeia
      if (key in self._cache) {
        if ((self._cache[key] || []).length > 0) return;
        // Cache vazio após filtro — verifica se há linhas no PocketBase
        // (inclusive soft-deletadas). Se houver, o usuário deletou tudo
        // intencionalmente: não re-semeia para evitar duplicatas.
        if ((self._rawCount[key] || 0) > 0) return;
        // Genuinamente vazio (tenant novo) — semeia no PocketBase
        const now = new Date().toISOString();
        const records = seedData.map(item => ({
          ...item,
          id:        item.id || self._newId(),
          createdAt: now,
          updatedAt: now,
        }));
        self._cache[key] = records;
        // Insere todos de uma vez (em sequência para não sobrecarregar)
        const table = self.TABLE_MAP[key];
        if (table) {
          records.forEach(({ id, createdAt, updatedAt, ...rest }) => {
            window.PocketBaseClient.collection(table).create({
              id,
              tenant_id:  self._tenantId,
              ...(self.CATALOG_KEYS.has(key) ? { tipo: key } : {}),
              data:        rest,
            }).catch(err => console.warn('[DB.seed]', key, err.message));
          });
        }
        return;
      }
      // Chave não mapeada → comportamento original do localStorage
      self._lsSeed(key, seedData);
    };
  },

  /* ───────────────────────────────────────────────────────────────────
   *  PocketBase async helpers (fire-and-forget)
   * ─────────────────────────────────────────────────────────────────── */

  _pbInsert(key, record) {
    const table = this.TABLE_MAP[key];
    if (!table) return;
    const { id, createdAt, updatedAt, ...rest } = record;
    window.PocketBaseClient.collection(table).create({
      id,
      tenant_id:  this._tenantId,
      ...(this.CATALOG_KEYS.has(key) ? { tipo: key } : {}),
      data:        rest,
    }).catch(err => console.error('[DB.insert]', key, id, err.message));
  },

  _pbUpdate(key, record) {
    const table = this.TABLE_MAP[key];
    if (!table) return;
    const { id, createdAt, updatedAt, ...rest } = record;
    window.PocketBaseClient.collection(table).update(id, {
      data: rest,
    }).catch(err => console.error('[DB.update]', key, id, err.message));
  },

  _pbDelete(key, id, originalList) {
    const table = this.TABLE_MAP[key];
    if (!table) return;

    // ─── Soft-delete via UPDATE ────────────────────────────────────────────
    // Mantém o registro no banco marcado com _deleted:true.
    // Na carga seguinte, linhas com _deleted são ignoradas.
    const record = (originalList || []).find(r => r.id === id);
    if (!record) return;

    // Remove campos de sistema antes de regravar o payload
    const { id: _id, createdAt, updatedAt, _tenantId, _tenantLabel, ...payload } = record;
    const softData = { ...payload, _deleted: true };

    console.log('[DB.softDelete] tentando:', table, id, softData);
    window.PocketBaseClient.collection(table).update(id, { data: softData })
      .then(() => {
        console.log('[DB.softDelete] OK — soft-delete gravado para:', table, id);
      })
      .catch(err => {
        console.error('[DB.softDelete] FALHOU:', key, id, err.message);
        // Reverte cache e avisa o usuário
        if (originalList) this._cache[key] = originalList;
        if (typeof UI !== 'undefined') {
          UI.toast(`Não foi possível excluir: ${err.message}`, 'error');
        }
      });
  },

  /* ───────────────────────────────────────────────────────────────────
   *  Fallback localStorage (usados quando DB não está ativo)
   * ─────────────────────────────────────────────────────────────────── */

  _lsGetAll(key) {
    try { const r = localStorage.getItem('pm_' + key); return r ? JSON.parse(r) : []; }
    catch { return []; }
  },
  _lsGetById(key, id) { return this._lsGetAll(key).find(r => r.id === id) || null; },
  _lsCreate(key, data) {
    const list = this._lsGetAll(key);
    const now  = new Date().toISOString();
    const rec  = { ...data, id: this._newId(), createdAt: now, updatedAt: now };
    list.push(rec);
    try { localStorage.setItem('pm_' + key, JSON.stringify(list)); } catch {}
    return rec;
  },
  _lsUpdate(key, id, changes) {
    const list = this._lsGetAll(key);
    const idx  = list.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const now     = new Date().toISOString();
    const updated = { ...list[idx], ...changes, id, createdAt: list[idx].createdAt, updatedAt: now };
    list[idx] = updated;
    try { localStorage.setItem('pm_' + key, JSON.stringify(list)); } catch {}
    return updated;
  },
  _lsDelete(key, id) {
    const list = this._lsGetAll(key);
    const next = list.filter(r => r.id !== id);
    try { localStorage.setItem('pm_' + key, JSON.stringify(next)); } catch {}
    return next.length < list.length;
  },
  _lsSeed(key, seedData) {
    const existing = localStorage.getItem('pm_' + key);
    if (existing !== null) return;
    const now = new Date().toISOString();
    const records = seedData.map(item => ({
      ...item, id: item.id || this._newId(), createdAt: now, updatedAt: now,
    }));
    try { localStorage.setItem('pm_' + key, JSON.stringify(records)); } catch {}
  },

  /* ───────────────────────────────────────────────────────────────────
   *  Utilitários
   * ─────────────────────────────────────────────────────────────────── */

  /** Converte uma row do PocketBase em registro do app.
   *  PocketBase usa `created`/`updated` em vez de `created_at`/`updated_at`.
   *  Em modo Matriz, adiciona _tenantId e _tenantLabel para identificar a origem. */
  _fromRow(r, addTenantInfo = false) {
    const record = {
      ...(r.data || {}),
      id:        r.id,
      createdAt: r.created,
      updatedAt: r.updated,
    };
    if (addTenantInfo && r.tenant_id) {
      record._tenantId = r.tenant_id;
      if (typeof TENANTS !== 'undefined') {
        const t = Object.values(TENANTS).find(t => t.id === r.tenant_id);
        if (t) record._tenantLabel = (t.label || '').replace(/^[\u{1F3DB}\u{1F3EB}️\s]+/u, '');
      }
    }
    return record;
  },

  /** Gera ID compatível com o padrão atual do Storage */
  _newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /** Força recarga de uma chave específica do PocketBase */
  async reload(key) {
    if (!this._ready) return;
    const table = this.TABLE_MAP[key];
    if (!table) return;
    const pb = window.PocketBaseClient;

    if (this.CATALOG_KEYS.has(key)) {
      const data = await pb.collection('app_catalogos')
        .getFullList({ filter: `tenant_id="${this._tenantId}" && tipo="${key}"`, requestKey: null })
        .catch(() => []);
      this._cache[key] = data.filter(r => !r.data?._deleted).map(r => this._fromRow(r));
    } else {
      const data = await pb.collection(table)
        .getFullList({ filter: `tenant_id="${this._tenantId}"`, requestKey: null })
        .catch(() => []);
      this._cache[key] = data.filter(r => !r.data?._deleted).map(r => this._fromRow(r));
    }
  },
};
