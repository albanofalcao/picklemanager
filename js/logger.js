'use strict';

/**
 * AppLogger — Monitoramento centralizado de erros e eventos.
 *
 * Fluxo para cada log:
 *   1. Espelha no console do browser (sempre)
 *   2. Envia ao Sentry se o DSN estiver configurado (sentry-config.js)
 *   3. Persiste na tabela app_error_logs do Supabase (fire-and-forget)
 *
 * PRÉ-REQUISITO — criar a tabela no Supabase SQL Editor:
 * ─────────────────────────────────────────────────────────────────────
 *   CREATE TABLE IF NOT EXISTS app_error_logs (
 *     id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
 *     tenant_id   uuid        REFERENCES tenants(id) ON DELETE SET NULL,
 *     level       text        NOT NULL DEFAULT 'error'
 *                               CHECK (level IN ('error','warn','info')),
 *     module      text        NOT NULL DEFAULT 'unknown',
 *     message     text        NOT NULL,
 *     stack       text,
 *     context     jsonb       DEFAULT '{}',
 *     user_login  text,
 *     url         text,
 *     created_at  timestamptz DEFAULT now() NOT NULL
 *   );
 *
 *   CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_created
 *     ON app_error_logs (tenant_id, created_at DESC);
 *
 *   ALTER TABLE app_error_logs ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "error_logs_insert" ON app_error_logs
 *     FOR INSERT TO anon WITH CHECK (true);
 *
 *   CREATE POLICY "error_logs_select" ON app_error_logs
 *     FOR SELECT TO anon USING (true);
 * ─────────────────────────────────────────────────────────────────────
 */
const AppLogger = {

  /** false = suprime gravação no Supabase (útil em testes locais) */
  enabled: true,

  /* ------------------------------------------------------------------ */
  /*  API pública                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Registra um erro crítico (falha de operação, exceção não tratada).
   * @param {string}     module  — nome do módulo, ex: 'AlunoModule'
   * @param {string}     message — descrição legível do erro
   * @param {Error|null} err     — objeto Error (para stack trace)
   * @param {object}     context — dados extras (ids, valores, etc.)
   */
  error(module, message, err = null, context = {}) {
    this._log('error', module, message, err, context);
  },

  /**
   * Registra um aviso (situação inesperada mas não fatal).
   */
  warn(module, message, context = {}) {
    this._log('warn', module, message, null, context);
  },

  /**
   * Registra um evento informativo relevante.
   */
  info(module, message, context = {}) {
    this._log('info', module, message, null, context);
  },

  /* ------------------------------------------------------------------ */
  /*  Handlers globais                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Registra os handlers globais de erros JS e promises não tratadas.
   * Deve ser chamado UMA vez em App.initUI().
   */
  initGlobalHandlers() {
    // Erros JS síncronos não capturados
    window.addEventListener('error', evt => {
      // Ignora erros cross-origin sem contexto útil
      if (!evt.message || evt.message === 'Script error.') return;
      this.error('window', evt.message, evt.error ?? null, {
        source: evt.filename,
        line:   evt.lineno,
        col:    evt.colno,
      });
    });

    // Promises rejeitadas sem .catch()
    window.addEventListener('unhandledrejection', evt => {
      const err = evt.reason instanceof Error ? evt.reason : null;
      const msg = err?.message ?? String(evt.reason ?? 'Promise rejection sem tratamento');
      this.error('promise', msg, err);
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Implementação interna                                               */
  /* ------------------------------------------------------------------ */

  _log(level, module, message, err, context) {
    // 1. Console do browser
    const fn = level === 'error' ? console.error
             : level === 'warn'  ? console.warn
             : console.info;
    fn(`[${level.toUpperCase()}][${module}]`, message, err ?? '', context);

    // 2. Sentry
    if (window.Sentry) {
      if (err instanceof Error) {
        Sentry.withScope(scope => {
          scope.setTag('module', module);
          scope.setExtras({ ...context });
          Sentry.captureException(err);
        });
      } else if (level === 'error') {
        Sentry.captureMessage(`[${module}] ${message}`, {
          level: 'error',
          extra: context,
        });
      }
    }

    // 3. Supabase — fire-and-forget
    this._persist(level, module, message, err, context);
  },

  _persist(level, module, message, err, context) {
    if (!this.enabled || !window.SupabaseClient) return;

    // Contexto do usuário logado (lê pm_session sem depender do módulo Auth)
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('pm_session') || 'null'); }
      catch { return null; }
    })();

    const entry = {
      tenant_id:  (typeof TENANT_ID !== 'undefined' ? TENANT_ID : null),
      level,
      module,
      message:    String(message).slice(0, 500),
      stack:      err?.stack ? String(err.stack).slice(0, 2000) : null,
      context:    context ?? {},
      user_login: session?.login ?? null,
      url:        window.location.pathname + window.location.search,
      created_at: new Date().toISOString(),
    };

    SupabaseClient
      .from('app_error_logs')
      .insert(entry)
      .then(({ error: dbErr }) => {
        if (dbErr) {
          // Evita loop: usa console diretamente
          console.warn('[AppLogger] Falha ao persistir log:', dbErr.message);
        }
      })
      .catch(() => {}); // rede indisponível — silencioso
  },
};
