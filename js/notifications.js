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
    const todosAlunos = Storage.getAll('alunos');
    Storage.getAll('matriculas')
      .filter(m => m.status === 'ativa' || m.status === 'vencida')
      .forEach(m => {
        const aluno      = todosAlunos.find(a => a.id === m.alunoId) || {};
        const alunoEmail = aluno.email || '';

        if (m.status === 'vencida') {
          lista.push({
            tipo:        'matricula',
            nivel:       'error',
            icon:        '📝',
            titulo:      'Matrícula vencida',
            desc:        m.alunoNome || 'Aluno desconhecido',
            rota:        'matriculas',
            matriculaId: m.id,
            alunoEmail,
            dataFim:     m.dataFim || '',
            dias:        -99,
          });
          return;
        }
        if (m.dataFim) {
          const diff = Math.ceil(
            (new Date(m.dataFim + 'T00:00:00') - new Date(hoje + 'T00:00:00')) / 86400000
          );
          if (diff >= 0 && diff <= 7) {
            lista.push({
              tipo:        'matricula',
              nivel:       diff <= 2 ? 'error' : 'warning',
              icon:        '📝',
              titulo:      `Matrícula vence em ${diff === 0 ? 'hoje' : diff + (diff === 1 ? ' dia' : ' dias')}`,
              desc:        m.alunoNome || 'Aluno desconhecido',
              rota:        'matriculas',
              matriculaId: m.id,
              alunoEmail,
              dataFim:     m.dataFim,
              dias:        diff,
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

    const items = lista.map(n => {
      const temEmail   = n.matriculaId && n.alunoEmail;
      const temConfig  = typeof EmailJSConfig !== 'undefined' && EmailJSConfig.templateAtivo('cobranca');
      const lembreteBtn = n.matriculaId
        ? `<button class="notif-lembrete-btn"
            title="${temEmail ? 'Enviar lembrete por e-mail' : 'Aluno sem e-mail cadastrado'}"
            ${!temEmail ? 'disabled style="opacity:.4;cursor:not-allowed;"' : ''}
            onclick="event.stopPropagation();Notifications.enviarLembrete('${n.matriculaId}')">
            ⚡${temConfig ? '' : ''}
           </button>`
        : '';

      return `
        <div class="notif-item notif-${n.nivel}" onclick="Router.navigate('${n.rota}');Notifications._closePanel();">
          <span class="notif-item-icon">${n.icon}</span>
          <div class="notif-item-text">
            <div class="notif-item-titulo">${UI.escape(n.titulo)}</div>
            <div class="notif-item-desc">${UI.escape(n.desc)}</div>
          </div>
          ${lembreteBtn}
        </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="notif-header">
        <span>Notificações</span>
        <span class="badge badge-warning" style="font-size:11px;">${count}</span>
      </div>
      <div class="notif-list">${items}</div>
      <div class="notif-footer-hint">
        <span>⚡ = enviar lembrete por e-mail</span>
      </div>`;
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

  /**
   * Envia lembrete de cobrança/vencimento por e-mail via EmailJS.
   * @param {string} matriculaId
   */
  async enviarLembrete(matriculaId) {
    const mat = Storage.getById('matriculas', matriculaId);
    if (!mat) { UI.toast('Matrícula não encontrada.', 'error'); return; }

    const aluno = Storage.getAll('alunos').find(a => a.id === mat.alunoId) || {};
    const email = aluno.email || mat.alunoEmail || '';

    if (!email) {
      UI.toast(`${mat.alunoNome || 'Aluno'} não tem e-mail cadastrado.`, 'warning');
      return;
    }

    if (typeof EmailJSConfig === 'undefined' || !EmailJSConfig.templateAtivo('cobranca')) {
      UI.toast(
        'Template "cobranca" não configurado no EmailJS. ' +
        'Crie o template em emailjs.com e cole o ID em emailjs-config.js.',
        'warning'
      );
      return;
    }

    UI.toast('Enviando lembrete…', 'info');

    const academia = Storage.getAll('config_academia')[0] || {};
    const fmt = d => {
      if (!d) return '—';
      const [y, m, dy] = d.split('-');
      return `${dy}/${m}/${y}`;
    };

    const ok = await EmailJSConfig.enviar('cobranca', {
      to_email:        email,
      to_name:         aluno.nome || mat.alunoNome || 'Aluno',
      academia:        academia.nome || 'PickleManager Academia',
      plano:           mat.planoNome || '—',
      valor:           (parseFloat(mat.valorPago) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      data_vencimento: fmt(mat.dataFim),
      chave_pix:       academia.chavePix || '',
    });

    if (ok) {
      UI.toast(`✅ Lembrete enviado para ${email}`, 'success');
    } else {
      UI.toast('Falha ao enviar e-mail. Verifique a configuração do EmailJS.', 'error');
    }
  },
};
