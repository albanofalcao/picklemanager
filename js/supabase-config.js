'use strict';

const SUPABASE_URL = 'https://yvjcbvhkoukptpfnhwgt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KI5wL-O5QMqkdVKOxJwKGg_yJkXlsrx';

/**
 * TENANTS — Mapa de bases disponíveis.
 * key   = slug curto (aparece na URL como ?tenant=key)
 * id    = UUID do tenant no Supabase
 * label = Nome exibido na tela de login
 */
const TENANTS = {
  lauro:    { id: 'a2af3c2e-bc7a-4083-b89d-924b9dbe5670', label: 'Escola Lauro de Freitas' },
  espanhol: { id: 'f4dfd40b-5525-4392-b71e-9a0ed1c9507c', label: 'Demo / Espanhol'         },
};

/**
 * _resolveActiveTenant — determina o tenant ativo na ordem:
 *   1. Parâmetro ?tenant= da URL
 *   2. Valor salvo no localStorage
 *   3. Primeiro entry do TENANTS
 */
function _resolveActiveTenant() {
  const param = new URLSearchParams(window.location.search).get('tenant');
  if (param && TENANTS[param]) {
    localStorage.setItem('pm_tenant', param);
    return param;
  }
  const saved = localStorage.getItem('pm_tenant');
  if (saved && TENANTS[saved]) return saved;
  return Object.keys(TENANTS)[0];
}

let _activeTenantKey = _resolveActiveTenant();

/** TENANT_ID — ID ativo (usado por db.js / storage.js em todas as queries). */
let TENANT_ID = TENANTS[_activeTenantKey].id;

/**
 * setTenant(key) — Muda para outro tenant e recarrega a página limpa.
 * A troca garante que todos os módulos inicializem com a base correta.
 */
function setTenant(key) {
  if (!TENANTS[key]) return;
  localStorage.setItem('pm_tenant', key);
  const url = new URL(window.location.href);
  url.searchParams.set('tenant', key);
  // limpa sessão anterior para evitar cross-tenant
  localStorage.removeItem('pm_session');
  window.location.href = url.toString();
}

function getActiveTenantKey()   { return _activeTenantKey; }
function getActiveTenantLabel() { return (TENANTS[_activeTenantKey] || {}).label || ''; }

const SupabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (!SupabaseClient) {
  console.warn('Supabase SDK não carregado — operando em modo localStorage.');
}

/** Popula o select de tenant assim que o DOM estiver pronto. */
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('li-tenant');
  if (!sel) return;
  sel.innerHTML = Object.entries(TENANTS)
    .map(([k, t]) =>
      `<option value="${k}"${k === _activeTenantKey ? ' selected' : ''}>${t.label}</option>`)
    .join('');
});
