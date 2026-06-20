'use strict';

const PB_URL = 'https://picklemanager.fly.dev';

/**
 * TENANTS — mapa dinâmico de bases disponíveis.
 * Atualizado do PocketBase no DOMContentLoaded.
 * O fallback estático garante que o app inicia sem esperar o fetch.
 *
 * As chaves são os slugs do banco. Aliases antigos ('lauro','espanhol')
 * mantidos para compatibilidade com localStorage cacheado.
 */
let TENANTS = {
  '001-H':    { id: '2e4f866c-42f2-4616-8560-ca5c0c98cd69', label: '🏛️ Rede Pickleball',        tipo: 'matriz' },
  'LAU':      { id: 'a2af3c2e-bc7a-4083-b89d-924b9dbe5670', label: '🏫 Escola Lauro de Freitas', tipo: 'arena'  },
  'espanhol': { id: 'f4dfd40b-5525-4392-b71e-9a0ed1c9507c', label: '🏫 Espanhol',                tipo: 'arena'  },
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
 * _loadTenantsFromDB — busca todos os tenants ativos do PocketBase.
 * Chamado async no DOMContentLoaded; atualiza TENANTS e o select do login.
 */
async function _loadTenantsFromDB() {
  if (!window.PocketBaseClient) return;
  // Snapshot do mapa estático — preserva UUIDs usados como tenant_id nos registros de dados
  const originalTenants = { ...TENANTS };
  try {
    const records = await window.PocketBaseClient
      .collection('tenants')
      .getFullList({ filter: 'status="ativa"', requestKey: null });

    if (!records || !records.length) return;

    // Ordena: matriz primeiro, depois arenas por nome
    const sorted = [...records].sort((a, b) => {
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
        // Preserva o UUID do mapa estático — os registros de dados (app_usuarios, etc.)
        // usam esse UUID como tenant_id. O id do PocketBase é um ID gerado diferente.
        id:        originalTenants[t.slug]?.id || t.id,
        label:     icon + t.nome,
        tipo:      t.tipo || 'arena',
        parent_id: t.parent_id || null,
      };
    });

    TENANTS = newTenants;

    // Localiza o tenant ativo pelo slug (estável), não pelo ID (UUID ≠ PocketBase ID)
    if (TENANTS[_activeTenantKey]) {
      TENANT_TIPO = TENANTS[_activeTenantKey].tipo || 'arena';
      localStorage.setItem('pm_tenant', _activeTenantKey);
    } else {
      // Slug não existe mais no banco — vai para o primeiro disponível
      _activeTenantKey = Object.keys(TENANTS)[0] || _activeTenantKey;
      TENANT_TIPO      = TENANTS[_activeTenantKey]?.tipo || 'arena';
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
  // Se não há sessão ativa, marca para voltar ao login (e não ao HomeKiosk) após reload
  if (!localStorage.getItem('pm_session')) {
    sessionStorage.setItem('pm_return_login', '1');
  }
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

/**
 * switchArenaPortal(key) — Troca o tenant ativo SEM deslogar o usuário.
 * Usado pelo portal de professor/aluno que tem acesso a múltiplas arenas.
 */
function switchArenaPortal(key) {
  if (!TENANTS[key]) return;
  const t = TENANTS[key];
  localStorage.setItem('pm_tenant',      key);
  localStorage.setItem('pm_tenant_id',   t.id);
  localStorage.setItem('pm_tenant_tipo', t.tipo || 'arena');
  // NÃO remove pm_session — o usuário continua logado na nova arena
  const url = new URL(window.location.href);
  url.searchParams.set('tenant', key);
  window.location.href = url.toString();
}

// Cria o client PocketBase global
window.PocketBaseClient = (typeof PocketBase !== 'undefined')
  ? new PocketBase(PB_URL)
  : null;

if (!window.PocketBaseClient) {
  console.warn('PocketBase SDK não carregado — operando em modo localStorage.');
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
