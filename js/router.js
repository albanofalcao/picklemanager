'use strict';

/**
 * Router — Simple hash-based client-side router
 */
const Router = {
  _routes: {},

  /** Page title map for each route */
  _titles: {
    dashboard:   'Dashboard',
    arenas:      'Arenas',
    alunos:      'Alunos',
    planos:      'Planos de Contratação',
    professores: 'Professores',
    turmas:      'Aulas',
    relatorios:  'Relatórios',
    eventos:     'Eventos',
    financeiro:  'Financeiro',
    manutencao:  'Manutenção',
    cadastros:   'Cadastros',
    listas:      'Listas do Sistema',
    dayuse:      'Day Use',
    admin:       'Administração',
  },

  /**
   * Register a route handler.
   * @param {string}   name    - route name (matches hash fragment)
   * @param {Function} handler - called when route is active
   * @returns {Router} for chaining
   */
  add(name, handler) {
    this._routes[name] = handler;
    return this;
  },

  /**
   * Navigate to a named route.
   * Se já estiver na rota, força re-render (hashchange não dispara).
   * @param {string} route
   */
  navigate(route) {
    if (this.current() === route) {
      this._handleRoute();
    } else {
      window.location.hash = route;
    }
  },

  /** Read the current hash and dispatch to the matching handler */
  _handleRoute() {
    const hash  = window.location.hash.replace(/^#\/?/, '').trim();
    const route = hash || 'dashboard';

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });

    // Update page title in header
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
      titleEl.textContent = this._titles[route] || route;
    }

    // Update document title
    document.title = `${this._titles[route] || route} — PickleManager`;

    // Call handler
    const handler = this._routes[route];
    if (typeof handler === 'function') {
      try {
        handler();
      } catch (err) {
        console.error('[Router] Handler error for route:', route, err);
        const area = document.getElementById('content-area');
        if (area) {
          area.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">⚠️</div>
              <div class="empty-title">Erro ao carregar módulo</div>
              <div class="empty-desc">${UI.escape(err.message)}</div>
            </div>`;
        }
      }
    } else {
      // No handler registered — show fallback
      const area = document.getElementById('content-area');
      if (area) {
        area.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-title">Página não encontrada</div>
            <div class="empty-desc">A rota "<strong>${UI.escape(route)}</strong>" não existe.</div>
          </div>`;
      }
    }
  },

  /** Initialize the router: listen to hash changes and handle initial route */
  init() {
    window.addEventListener('hashchange', () => this._handleRoute());
    this._handleRoute(); // handle the current URL on load
  },

  /** Return the current route name */
  current() {
    return window.location.hash.replace(/^#\/?/, '').trim() || 'dashboard';
  },
};
