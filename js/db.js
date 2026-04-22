'use strict';

/**
 * DB — Supabase-backed Storage adapter (multi-tenant)
 *
 * Quando TENANT_ID está configurado em supabase-config.js:
 *   - Carrega todos os dados do tenant do Supabase na inicialização
 *   - Patcha Storage para ler do cache em memória (interface síncrona mantida)
 *   - Escreve no cache + Supabase em background (fire-and-forget)
 *
 * Quando TENANT_ID está vazio:
 *   - Não patcha nada → app funciona normalmente com localStorage
 */
const DB = {

  _tenantId: null,
  _cache:    {},
  _ready:    false,

  /* ───────────────────────────────────────────────────────────────────
   *  Mapeamento: chave do Storage → nome da tabela Supabase
   *  Catálogos usam app_catalogos com campo "tipo" no JSONB
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
    loja_vendas:         'app_loja_vendas',
    manutencao:        'app_manutencao',
    manutencao_prev:   'app_manutencao_prev',
    matriculas:        'app_matriculas',
    perfis:            'app_perfis',
    planoContas:       'app_plano_contas',
    planos:            'app_planos',
    presencas:         'app_presencas',
    professores:       'app_professores',
    quadras:           'app_quadras',
    reposicoes:        'app_reposicoes',
    turmaAlunos:       'app_turma_alunos',
    aulaAlunos:        'app_aula_alunos',
    turmas:            'app_turmas',
    usuarios:          'app_usuarios',
    orcamento:         'app_orcamento',
  },

  // Catálogos que compartilham a tabela app_catalogos
  CATALOG_KEYS: new Set([
    'cat_despesa','cat_especialidades','cat_receita','cat_tipos_aula','cat_tipos_evento',
  ]),

  /* ───────────────────────────────────────────────────────────────────
   *  Inicialização
   * ─────────────────────────────────────────────────────────────────── */

  async init(tenantId) {
    if (!SupabaseClient) {
      console.log('[DB] Supabase não disponível — modo localStorage.');
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
   *  Carrega todos os dados do Supabase para o cache em memória
   * ─────────────────────────────────────────────────────────────────── */

  async _loadAll() {
    const tid       = this._tenantId;
    const isMatrizMode = this._isMatriz;

    // Helper: aplica filtro de tenant (ou não, no modo Matriz)
    const withTenant = (q) => isMatrizMode ? q : q.eq('tenant_id', tid);

    // Tabelas regulares (não-catálogo) — carrega TODAS em paralelo
    const regularTables = [...new Set(
      Object.entries(this.TABLE_MAP)
        .filter(([k]) => !this.CATALOG_KEYS.has(k))
        .map(([, t]) => t)
    )];

    const [tableResults, catResult] = await Promise.all([
      // Todas as tabelas regulares em paralelo
      Promise.all(regularTables.map(table =>
        withTenant(
          SupabaseClient
            .from(table)
            .select('id, tenant_id, data, created_at, updated_at')
        ).then(({ data, error }) => ({ table, data, error }))
      )),
      // Catálogos em paralelo com as demais
      withTenant(
        SupabaseClient
          .from('app_catalogos')
          .select('id, tenant_id, tipo, data, created_at, updated_at')
      ),
    ]);

    // Processa tabelas regulares
    for (const { table, data, error } of tableResults) {
      if (error) { console.warn('[DB] Erro ao carregar', table, ':', error.message); continue; }
      const rows = (data || []).map(r => this._fromRow(r, isMatrizMode));
      for (const [sk, tbl] of Object.entries(this.TABLE_MAP)) {
        if (tbl === table && !this.CATALOG_KEYS.has(sk)) this._cache[sk] = rows;
      }
    }

    // Catálogos — carrega tudo e filtra por "tipo" no data
    const { data: catRows, error: catErr } = catResult;

    if (catErr) {
      console.warn('[DB] Erro ao carregar catálogos:', catErr.message);
    } else {
      for (const sk of this.CATALOG_KEYS) {
        this._cache[sk] = (catRows || [])
          .filter(r => r.tipo === sk)
          .map(r => this._fromRow(r, isMatrizMode));
      }
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
      self._supabaseInsert(key, record);
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
      self._supabaseUpdate(key, updated);
      return updated;
    };

    Storage.delete = (key, id) => {
      if (!(key in self._cache)) return self._lsDelete(key, id);

      const list    = self._cache[key] || [];
      const next    = list.filter(r => r.id !== id);
      const removed = next.length < list.length;
      self._cache[key] = next;
      if (removed) self._supabaseDelete(key, id);
      return removed;
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
      // Se já tem dados (localStorage ou Supabase), não re-semeia
      if (key in self._cache) {
        if ((self._cache[key] || []).length > 0) return;
        // Cache está vazio — semeia no Supabase
        const now = new Date().toISOString();
        const records = seedData.map(item => ({
          ...item,
          id:        item.id || self._newId(),
          createdAt: now,
          updatedAt: now,
        }));
        self._cache[key] = records;
        // Insere todos de uma vez
        const table = self.TABLE_MAP[key];
        if (table) {
          const rows = records.map(({ id, createdAt, updatedAt, ...rest }) => ({
            id,
            tenant_id:  self._tenantId,
            ...(self.CATALOG_KEYS.has(key) ? { tipo: key } : {}),
            data:        rest,
            created_at:  createdAt,
            updated_at:  updatedAt,
          }));
          SupabaseClient.from(table).insert(rows)
            .then(({ error }) => { if (error) console.warn('[DB.seed]', key, error.message); });
        }
        return;
      }
      // Chave não mapeada → comportamento original do localStorage
      self._lsSeed(key, seedData);
    };
  },

  /* ───────────────────────────────────────────────────────────────────
   *  Supabase async helpers (fire-and-forget)
   * ─────────────────────────────────────────────────────────────────── */

  _supabaseInsert(key, record) {
    const table = this.TABLE_MAP[key];
    if (!table) return;
    const { id, createdAt, updatedAt, ...rest } = record;
    SupabaseClient.from(table).insert({
      id,
      tenant_id:  this._tenantId,
      ...(this.CATALOG_KEYS.has(key) ? { tipo: key } : {}),
      data:        rest,
      created_at:  createdAt,
      updated_at:  updatedAt,
    }).then(({ error }) => { if (error) console.error('[DB.insert]', key, id, error.message); });
  },

  _supabaseUpdate(key, record) {
    const table = this.TABLE_MAP[key];
    if (!table) return;
    const { id, createdAt, updatedAt, ...rest } = record;
    SupabaseClient.from(table).update({
      data:        rest,
      updated_at:  updatedAt,
    }).eq('id', id)
      .then(({ error }) => { if (error) console.error('[DB.update]', key, id, error.message); });
  },

  _supabaseDelete(key, id) {
    const table = this.TABLE_MAP[key];
    if (!table) return;
    SupabaseClient.from(table).delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('[DB.delete]', key, id, error.message); });
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

  /** Converte uma row do Supabase em registro do app.
   *  Em modo Matriz, adiciona _tenantId e _tenantLabel para identificar a origem. */
  _fromRow(r, addTenantInfo = false) {
    const record = {
      ...(r.data || {}),
      id:        r.id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
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

  /** Força recarga de uma chave específica do Supabase */
  async reload(key) {
    if (!this._ready) return;
    const table = this.TABLE_MAP[key];
    if (!table) return;

    if (this.CATALOG_KEYS.has(key)) {
      const { data } = await SupabaseClient
        .from('app_catalogos')
        .select('id, tipo, data, created_at, updated_at')
        .eq('tenant_id', this._tenantId)
        .eq('tipo', key);
      this._cache[key] = (data || []).map(r => this._fromRow(r));
    } else {
      const { data } = await SupabaseClient
        .from(table)
        .select('id, data, created_at, updated_at')
        .eq('tenant_id', this._tenantId);
      this._cache[key] = (data || []).map(r => this._fromRow(r));
    }
  },
};
