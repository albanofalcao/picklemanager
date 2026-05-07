'use strict';

/**
 * Sentry — Monitoramento de erros em tempo real.
 *
 * COMO CONFIGURAR (5 minutos):
 * ──────────────────────────────────────────────────────────────────────
 *  1. Crie uma conta gratuita em https://sentry.io  (plano Free: 5.000 erros/mês)
 *  2. Crie um novo projeto: "Browser JavaScript"
 *  3. Vá em Settings → Projects → seu projeto → Client Keys (DSN)
 *  4. Copie o DSN e cole na constante abaixo
 *  5. Faça o deploy — erros passarão a aparecer no dashboard do Sentry
 *
 * Enquanto SENTRY_DSN estiver vazio, o Sentry fica desativado
 * e o AppLogger usa apenas console + PocketBase.
 * ──────────────────────────────────────────────────────────────────────
 */
const SENTRY_DSN = ''; // ← cole aqui o DSN após criar a conta

if (window.Sentry && SENTRY_DSN) {
  Sentry.init({
    dsn:              SENTRY_DSN,
    environment:      window.location.hostname === 'localhost' ? 'development' : 'production',
    release:          'picklemanager@1.1.0',

    // Desativa performance tracing (não precisamos por enquanto)
    tracesSampleRate: 0,

    // Erros irrelevantes que geram ruído
    ignoreErrors: [
      'Script error.',           // erros cross-origin sem contexto
      'ResizeObserver loop',     // bug cosmético de browser
      'Non-Error exception',     // rejeições de Promise sem Error real
    ],
  });

  // Injeta o usuário logado no contexto de cada erro
  document.addEventListener('pm:login', evt => {
    if (evt.detail) {
      Sentry.setUser({
        username: evt.detail.login,
        tenant:   typeof getActiveTenantLabel === 'function' ? getActiveTenantLabel() : '',
      });
    }
  });

  document.addEventListener('pm:logout', () => {
    Sentry.setUser(null);
  });
}
