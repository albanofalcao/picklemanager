'use strict';

const SUPABASE_URL = 'https://yvjcbvhkoukptpfnhwgt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KI5wL-O5QMqkdVKOxJwKGg_yJkXlsrx';

/**
 * TENANTS — mapa dinâmico de bases disponíveis.
 * Atualizado do Supabase no DOMContentLoaded.
 * O fallback estático garante que o app inicia sem esperar o fetch.
 *
 * As chaves são os slugs do banco. Aliases antigos ('lauro','espanhol')
 * mantidos para compatibilidade com localStorage cacheado.
 */
let TENANTS = {
  '001-H':    { id: '2e4f866c-42f2-4616-8560-ca5c0c98cd69', label: '🏛️ Rede Pickleball',         tipo: 'matriz' },
  'LAU':      { id: 'a2af3c2e-bc7a-4083-b89d-924b9dbe5670', label: '🏫 Escola Lauro de Freitas',  tipo: 'arena'  },
  // aliases antigos — garantem que pm_tenant='lauro' ainda funcione
  'lauro':    { id: 'a2af3c2e-bc7a-4083-b89d-924b9dbe5670', label: '🏫 Escola Lauro de Freitas',  tipo: 'arena'  },
  'espanhol': { id: 'f4dfd40b-5525-4392-b71e-9a0ed1c9507c', label: '🏫 Espanhol',                 tipo: 'arena'  },
};

/**
 * _resolveActiveTenantKey — slug ativo: URL param → localStorage → primeiro tenant.
 */
function _resolveActiveTenantKey() {
  const param = new URLSearchParams(window.location.search).get('tenant');
  if (param) { localStorage.setItem('pm_tenant', param); return param; }
  return localStorage.getItem('pm_tenant') || Object.keys(TENANTS)[0];
}

let _activeTenantKey = _resolveActiveTenantKey();

// TENANT_ID: slug no mapa estático → ID cacheado no localStorage → null
// O cache é gravado por setTenant(), resolvendo slugs que não estão no mapa estático
let TENANT_ID   = TENANTS[_activeTenantKey]?.id   || localStorage.getItem('pm_tenant_id')   || null;
let TENANT_TIPO = TENANTS[_activeTenantKey]?.tipo  || localStorage.getItem('pm_tenant_tipo') || 'arena';

/**
 * _loadTenantsFromDB — busca todos os tenants ativos do Supabase.
 * Chamado async no DOMContentLoaded; atualiza TENANTS e o select do login.
 */
async function _loadTenantsFromDB() {
  if (!SupabaseClient) return;
  try {
    const { data, error } = await SupabaseClient
      .from('tenants')
      .select('id, nome, slug, tipo, parent_id')
      .eq('status', 'ativa')
      .order('nome');

    if (error || !data || !data.length) return;

    // Ordena: matriz primeiro, depois arenas por nome
    const sorted = [...data].sort((a, b) => {
      const ta = a.tipo || 'arena', tb = b.tipo || 'arena';
      if (ta === 'matriz' && tb !== 'matriz') return -1;
      if (ta !== 'matriz' && tb === 'matriz') return  1;
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });

    const newTenants = {};
    sorted.forEach(t => {
      if (!t.slug) return; // ignora tenants sem slug
      const icon = (t.tipo === 'matriz') ? '🏛️ ' : '🏫 ';
      newTenants[t.slug] = {
        id:        t.id,
        label:     icon + t.nome,
        tipo:      t.tipo || 'arena',
        parent_id: t.parent_id || null,
      };
    });

    TENANTS = newTenants;

    // Localiza o tenant ativo pelo ID atual (não pelo slug, que pode ter mudado)
    // NÃO sobrescreve TENANT_ID — o DB já foi inicializado com o ID correto.
    const currentId = TENANT_ID;
    const foundEntry = Object.entries(TENANTS).find(([, t]) => t.id === currentId);
    if (foundEntry) {
      _activeTenantKey = foundEntry[0];
      TENANT_TIPO      = foundEntry[1].tipo || 'arena';
      localStorage.setItem('pm_tenant', foundEntry[0]);
    } else {
      // Tenant atual não está no banco — mantém sem trocar TENANT_ID
      _activeTenantKey = Object.keys(TENANTS)[0] || _activeTenantKey;
    }

    _populateSelect();
    _updateTenantIcon();
  } catch (e) {
    console.warn('[Tenants] Erro ao carregar lista:', e.message);
  }
}

/**
 * _populateSelect — preenche o <select id="li-tenant"> do login.
 */
function _populateSelect() {
  const sel = document.getElementById('li-tenant');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = Object.entries(TENANTS)
    .map(([k, t]) => `<option value="${k}"${k === _activeTenantKey ? ' selected' : ''}>${t.label}</option>`)
    .join('');
  // Restaura seleção manual se ainda existir
  if (prev && TENANTS[prev]) sel.value = prev;
}

/**
 * setTenant(key) — Troca o tenant ativo e recarrega a página limpa.
 * Cacheia ID e tipo para que a próxima carga funcione mesmo sem o slug no mapa estático.
 */
function setTenant(key) {
  if (!TENANTS[key]) return;
  const t = TENANTS[key];
  localStorage.setItem('pm_tenant',      key);
  localStorage.setItem('pm_tenant_id',   t.id);
  localStorage.setItem('pm_tenant_tipo', t.tipo || 'arena');
  localStorage.removeItem('pm_session');
  const url = new URL(window.location.href);
  url.searchParams.set('tenant', key);
  window.location.href = url.toString();
}

function getActiveTenantKey()   { return _activeTenantKey; }
function getActiveTenantLabel() { return (TENANTS[_activeTenantKey]?.label || '').replace(/^[\u{1F3DB}\u{1F3EB}️\s]+/u, ''); }
function getTenantTipo()        { return TENANT_TIPO; }
function isMatriz()             { return TENANT_TIPO === 'matriz'; }
function getAllTenantIds()       { return Object.values(TENANTS).map(t => t.id).filter(Boolean); }

const SupabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (!SupabaseClient) {
  console.warn('Supabase SDK não carregado — operando em modo localStorage.');
}

document.addEventListener('DOMContentLoaded', () => {
  _populateSelect();           // imediato — fallback estático
  _loadTenantsFromDB();        // async — atualiza com dados do banco (inclui novas bases)
  _updateTenantIcon();
});

function _updateTenantIcon() {
  const icon = document.getElementById('li-tenant-icon');
  if (!icon) return;
  icon.textContent = TENANT_TIPO === 'matriz' ? '🏛️' : '🏫';
}
