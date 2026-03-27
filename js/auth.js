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
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      id:     user.id,
      nome:   user.nome,
      login:  user.login,
      perfil: user.perfil,
      avatar: user.nome.trim().charAt(0).toUpperCase(),
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
    const user  = users.find(u =>
      u.login  === loginStr.trim() &&
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

  showLogin() {
    const el = document.getElementById('login-overlay');
    if (el) { el.classList.add('open'); el.removeAttribute('aria-hidden'); }
  },

  hideLogin() {
    const el = document.getElementById('login-overlay');
    if (el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); }
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
    form.addEventListener('submit', e => {
      e.preventDefault();
      const loginVal = document.getElementById('li-login')?.value || '';
      const senhaVal = document.getElementById('li-senha')?.value || '';
      const errEl    = document.getElementById('login-error');

      if (this.tryLogin(loginVal, senhaVal)) {
        this.hideLogin();
        App.initUI();
        Notifications.init();
      } else {
        if (errEl) { errEl.textContent = '✕ Login ou senha incorretos.'; errEl.style.display = 'flex'; }
        const senhaEl = document.getElementById('li-senha');
        if (senhaEl) { senhaEl.value = ''; senhaEl.focus(); }
      }
    });
  },
};
