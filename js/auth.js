'use strict';

/**
 * PERFIS — Dynamic global, populated from localStorage by Auth.loadPerfis().
 * Use var so it becomes window.PERFIS and stays visible to all modules.
 */
var PERFIS = {};

/**
 * ALL_MODULES — Full list of app modules available for permission assignment.
 */
const ALL_MODULES = [
  { key: 'dashboard',   label: 'Dashboard',             required: true  },
  { key: 'arenas',      label: 'Arenas',                required: false },
  { key: 'alunos',      label: 'Alunos',                required: false },
  { key: 'matriculas',  label: 'Matrículas',            required: false },
  { key: 'planos',      label: 'Planos de Contratação', required: false },
  { key: 'professores', label: 'Professores',           required: false },
  { key: 'turmas',      label: 'Turmas',                required: false },
  { key: 'eventos',     label: 'Eventos',               required: false },
  { key: 'loja',        label: 'Loja',                  required: false },
  { key: 'financeiro',  label: 'Financeiro',            required: false },
  { key: 'manutencao',  label: 'Manutenção',            required: false },
  { key: 'relatorios',  label: 'Relatórios',            required: false },
  { key: 'cadastros',   label: 'Cadastros',             required: false },
  { key: 'admin',       label: 'Administração',         required: false },
];

/**
 * BADGE_CORES — Available badge color options for profiles.
 */
const BADGE_CORES = [
  { value: 'badge-danger',  label: 'Vermelho'  },
  { value: 'badge-warning', label: 'Âmbar'     },
  { value: 'badge-success', label: 'Verde'     },
  { value: 'badge-blue',    label: 'Azul'      },
  { value: 'badge-gray',    label: 'Cinza'     },
];

/**
 * Auth — Session management and authentication
 */
const Auth = {
  SESSION_KEY: 'pm_session',

  /**
   * Load all profiles from localStorage into the global PERFIS object.
   * Must be called after Storage is available and after seeding perfis.
   */
  loadPerfis() {
    const stored = Storage.getAll('perfis');
    PERFIS = {};
    stored.forEach(p => {
      PERFIS[p.key] = {
        id:       p.id,
        label:    p.label,
        descricao:p.descricao || '',
        cor:      p.cor || 'badge-gray',
        modulos:  Array.isArray(p.modulos) ? p.modulos : ['dashboard'],
      };
    });
  },

  getSession() {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  setSession(user) {
    const nome = user.nome || user.login || '?';
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      id:          user.id,
      nome,
      login:       user.login,
      perfil:      user.perfil,
      professorId: user.professorId || null,
      alunoId:     user.alunoId     || null,
      avatar:      nome.trim().charAt(0).toUpperCase(),
    }));
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  getCurrentUser() {
    return this.getSession();
  },

  hasPermission(route) {
    const session = this.getSession();
    if (!session) return false;
    const perfil = PERFIS[session.perfil];
    return perfil ? perfil.modulos.includes(route) : false;
  },

  tryLogin(loginStr, senha) {
    const users = Storage.getAll('usuarios');
    const hash  = btoa(senha);
    const lc    = loginStr.trim().toLowerCase();
    // Aceita login OU e-mail (case-insensitive)
    const user  = users.find(u =>
      (u.login?.toLowerCase() === lc || u.email?.toLowerCase() === lc) &&
      u.senha  === hash &&
      u.status === 'ativo'
    );
    if (!user) return false;
    this.setSession(user);
    return true;
  },

  logout() {
    InactivityLock.stop();
    this.clearSession();
    window.location.reload();
  },

  async confirmLogout() {
    const ok = await UI.confirm('Deseja realmente sair do sistema?', 'Sair');
    if (ok) this.logout();
  },

  showEsqueciSenha() {
    // Mostra mensagem inline no próprio box de login (evita z-index do overlay)
    let box = document.getElementById('li-esqueci-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'li-esqueci-box';
      box.style.cssText = `
        background:var(--bg-secondary,#f0ede6);border:1.5px solid var(--card-border);
        border-radius:12px;padding:16px;margin-top:12px;font-size:13px;
        color:var(--text-secondary);line-height:1.6;`;
      document.getElementById('login-form')?.after(box);
    }
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-weight:700;margin-bottom:6px;">🔑 Esqueci minha senha</div>
          <div>As senhas são gerenciadas pelo administrador.</div>
          <div style="margin-top:6px;"><strong>Para redefinir:</strong></div>
          <div>⚙️ Administração → Usuários → 🔑 Redefinir senha</div>
          <div style="margin-top:6px;color:var(--text-muted);font-size:11px;">
            Ou acesse a <strong>Área Administrativa</strong> (botão abaixo) para criar um novo usuário.
          </div>
        </div>
        <button onclick="document.getElementById('li-esqueci-box').remove()"
          style="background:none;border:none;cursor:pointer;font-size:16px;padding:0 0 0 8px;color:var(--text-muted);">✕</button>
      </div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  populateTenantSelect() {
    const sel = document.getElementById('li-tenant');
    if (!sel || typeof TENANTS === 'undefined') return;
    sel.innerHTML = Object.entries(TENANTS)
      .map(([k, t]) =>
        `<option value="${k}"${k === getActiveTenantKey() ? ' selected' : ''}>${t.label}</option>`)
      .join('');
  },

  showLogin() {
    this.populateTenantSelect();
    // Mostra nome da base ativa no brand
    const sub = document.getElementById('brand-sub');
    if (sub && typeof getActiveTenantLabel === 'function') sub.textContent = getActiveTenantLabel();
    const el = document.getElementById('login-overlay');
    if (el) { el.classList.add('open'); el.removeAttribute('aria-hidden'); }
  },

  hideLogin() {
    const el = document.getElementById('login-overlay');
    if (el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); }
    // Atualiza brand name após login
    const sub = document.getElementById('brand-sub');
    if (sub && typeof getActiveTenantLabel === 'function') sub.textContent = getActiveTenantLabel();
  },

  bindLockForm() {
    const form = document.getElementById('lock-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const senha = document.getElementById('lock-senha')?.value || '';
      const errEl = document.getElementById('lock-error');
      if (InactivityLock.tryUnlock(senha)) {
        if (errEl) errEl.style.display = 'none';
      } else {
        if (errEl) { errEl.textContent = '✕ Senha incorreta.'; errEl.style.display = 'flex'; }
        const el = document.getElementById('lock-senha');
        if (el) { el.value = ''; el.focus(); }
      }
    });
  },

  bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const loginVal = document.getElementById('li-login')?.value || '';
      const senhaVal = document.getElementById('li-senha')?.value || '';
      const errEl    = document.getElementById('login-error');
      const btnEl    = form.querySelector('button[type="submit"]');

      // ── 1. Tenta login local (app_usuarios do tenant) ──────────────
      if (this.tryLogin(loginVal, senhaVal)) {
        this.hideLogin(); App.initUI(); Notifications.init(); return;
      }

      // ── 2. Fallback Supabase Auth (para superadmin sem usuário local) ──
      if (SupabaseClient) {
        if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Verificando…'; }
        try {
          const { data, error } = await SupabaseClient.auth.signInWithPassword({
            email: loginVal.trim(), password: senhaVal,
          });
          if (!error && data?.user) {
            // Cria sessão sintética de admin para esse usuário Supabase
            const u = data.user;
            const nomeDisplay = (u.user_metadata?.nome || u.email.split('@')[0]);
            this.setSession({
              id:     'sa_' + u.id.slice(0, 8),
              nome:   nomeDisplay,
              login:  u.email,
              email:  u.email,
              perfil: 'admin',
              status: 'ativo',
              senha:  '',
            });
            this.hideLogin(); App.initUI(); Notifications.init(); return;
          }
        } catch (_) { /* silencioso */ } finally {
          if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Entrar →'; }
        }
      }

      // ── 3. Falhou em tudo ──────────────────────────────────────────
      if (errEl) { errEl.textContent = '✕ Login ou senha incorretos.'; errEl.style.display = 'flex'; }
      const senhaEl = document.getElementById('li-senha');
      if (senhaEl) { senhaEl.value = ''; senhaEl.focus(); }
    });
  },
};
