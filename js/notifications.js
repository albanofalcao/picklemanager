'use strict';

/**
 * Notifications — Sistema de alertas em tempo real no header.
 * Verifica: pagamentos pendentes, manutenções abertas/urgentes,
 * matrículas vencidas ou prestes a vencer (≤ 7 dias).
 */
const Notifications = {
  _open: false,

  /** Retorna a lista de notificações calculadas */
  getAll() {
    const lista = [];
    const hoje  = new Date().toISOString().slice(0, 10);

    /* -- Financeiro: lançamentos pendentes -- */
    Storage.getAll('financeiro')
      .filter(f => f.status === 'pendente')
      .forEach(f => {
        lista.push({
          tipo:   'financeiro',
          nivel:  'warning',
          icon:   '💰',
          titulo: 'Pagamento pendente',
          desc:   f.descricao || 'Sem descrição',
          rota:   'financeiro',
        });
      });

    /* -- Manutenção: chamados abertos ou urgentes -- */
    Storage.getAll('manutencao')
      .filter(m => ['aberto', 'em_andamento'].includes(m.status))
      .forEach(m => {
        lista.push({
          tipo:   'manutencao',
          nivel:  m.prioridade === 'urgente' ? 'error' : 'warning',
          icon:   '🔧',
          titulo: m.prioridade === 'urgente' ? 'Manutenção urgente' : 'Manutenção aberta',
          desc:   m.titulo || 'Chamado sem título',
          rota:   'manutencao',
        });
      });

    /* -- Aulas experimentais com avaliação pendente -- */
    Storage.getAll('aulas')
      .filter(a => a.experimental && a.avaliacaoStatus === 'pendente' && a.status !== 'cancelada')
      .forEach(a => {
        lista.push({
          tipo:   'experimental',
          nivel:  'warning',
          icon:   '🧪',
          titulo: 'Avaliação experimental pendente',
          desc:   `${a.titulo}${a.alunoExperimentalNome ? ' — ' + a.alunoExperimentalNome : ''}`,
          rota:   'turmas',
        });
      });

    /* -- Matrículas: vencidas ou vencendo em ≤ 7 dias -- */
    Storage.getAll('matriculas')
      .filter(m => m.status === 'ativa' || m.status === 'vencida')
      .forEach(m => {
        if (m.status === 'vencida') {
          lista.push({
            tipo:   'matricula',
            nivel:  'error',
            icon:   '📝',
            titulo: 'Matrícula vencida',
            desc:   m.alunoNome || 'Aluno desconhecido',
            rota:   'matriculas',
          });
          return;
        }
        if (m.dataFim) {
          const diff = Math.ceil((new Date(m.dataFim + 'T00:00:00') - new Date(hoje + 'T00:00:00')) / 86400000);
          if (diff >= 0 && diff <= 7) {
            lista.push({
              tipo:   'matricula',
              nivel:  'warning',
              icon:   '📝',
              titulo: `Matrícula vence em ${diff === 0 ? 'hoje' : diff + (diff === 1 ? ' dia' : ' dias')}`,
              desc:   m.alunoNome || 'Aluno desconhecido',
              rota:   'matriculas',
            });
          }
        }
      });

    return lista;
  },

  /** Inicializa o sino no header — chame após Auth.login / App.initUI */
  init() {
    this._render();
    // Atualiza a cada 60 segundos
    setInterval(() => this._render(), 60000);

    // Fecha dropdown ao clicar fora
    document.addEventListener('click', e => {
      if (this._open && !e.target.closest('#notif-wrapper')) {
        this._closePanel();
      }
    });
  },

  /** Re-renderiza o badge e o conteúdo do painel */
  _render() {
    const wrapper = document.getElementById('notif-wrapper');
    if (!wrapper) return;

    const lista  = this.getAll();
    const count  = lista.length;
    const badge  = count > 0
      ? `<span class="notif-badge">${count > 99 ? '99+' : count}</span>`
      : '';

    const btn = wrapper.querySelector('#notif-btn');
    if (btn) btn.innerHTML = `🔔${badge}`;

    const panel = wrapper.querySelector('#notif-panel');
    if (!panel) return;

    if (!count) {
      panel.innerHTML = `
        <div class="notif-header"><span>Notificações</span></div>
        <div class="notif-empty">
          <span style="font-size:24px;">✅</span>
          <p>Tudo em dia!</p>
        </div>`;
      return;
    }

    const items = lista.map(n => `
      <div class="notif-item notif-${n.nivel}" onclick="Router.navigate('${n.rota}');Notifications._closePanel();">
        <span class="notif-item-icon">${n.icon}</span>
        <div class="notif-item-text">
          <div class="notif-item-titulo">${UI.escape(n.titulo)}</div>
          <div class="notif-item-desc">${UI.escape(n.desc)}</div>
        </div>
      </div>`).join('');

    panel.innerHTML = `
      <div class="notif-header">
        <span>Notificações</span>
        <span class="badge badge-warning" style="font-size:11px;">${count}</span>
      </div>
      <div class="notif-list">${items}</div>`;
  },

  toggle() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    this._open = !this._open;
    panel.classList.toggle('open', this._open);
  },

  _closePanel() {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.remove('open');
    this._open = false;
  },
};
