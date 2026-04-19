'use strict';

/**
 * PresencaModule — Controle de presença de alunos por aula.
 * Não é uma rota própria: é acionado a partir do módulo Aulas.
 */
const PresencaModule = {
  STORAGE_KEY: 'presencas',

  /* ------------------------------------------------------------------ */
  /*  Data access                                                         */
  /* ------------------------------------------------------------------ */

  getByAula(aulaId) {
    return Storage.getAll(this.STORAGE_KEY).filter(p => p.aulaId === aulaId);
  },

  getStats(aulaId) {
    const lista = this.getByAula(aulaId);
    return {
      total:    lista.length,
      presentes: lista.filter(p => p.presente).length,
      ausentes:  lista.filter(p => !p.presente).length,
    };
  },

  /** Retorna o badge resumido de presença para exibir na tabela de aulas */
  getBadge(aulaId) {
    const lista = this.getByAula(aulaId);
    if (!lista.length) return '<span class="text-muted" style="font-size:12px;">Sem registros</span>';
    const presentes = lista.filter(p => p.presente).length;
    return `<span class="badge badge-success" style="font-size:11px;">${presentes}/${lista.length}</span>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal de presença                                                   */
  /* ------------------------------------------------------------------ */

  abrirModal(aulaId) {
    const aula = Storage.getById('aulas', aulaId);
    if (!aula) return;

    const registros  = this.getByAula(aulaId);
    const alunos     = Storage.getAll('alunos').filter(a => a.status === 'ativo');
    const matriculas = Storage.getAll('matriculas').filter(m => m.status === 'ativa');

    // Alunos matriculados (aparecem primeiro) + demais alunos ativos
    const alunosMatriculados = alunos.filter(a => matriculas.some(m => m.alunoId === a.id));
    const alunosSemMatricula = alunos.filter(a => !alunosMatriculados.some(m => m.id === a.id));
    const alunosOrdenados    = [...alunosMatriculados, ...alunosSemMatricula];

    const rows = alunosOrdenados.map(aluno => {
      const reg     = registros.find(r => r.alunoId === aluno.id);
      const checked = reg ? reg.presente : false;
      const temMat  = alunosMatriculados.some(a => a.id === aluno.id);

      return `
        <tr>
          <td>
            <label class="presenca-check-label" for="pres-${aluno.id}">
              <input type="checkbox" id="pres-${aluno.id}"
                class="presenca-checkbox" data-aluno-id="${aluno.id}"
                data-aluno-nome="${UI.escape(aluno.nome)}"
                ${checked ? 'checked' : ''} />
              <span>${UI.escape(aluno.nome)}</span>
            </label>
          </td>
          <td>
            <span class="badge ${temMat ? 'badge-success' : 'badge-gray'}" style="font-size:10px;">
              ${temMat ? 'Matriculado' : 'Avulso'}
            </span>
          </td>
          <td class="text-muted text-sm">${UI.escape(aluno.nivel ? (aluno.nivel.charAt(0).toUpperCase() + aluno.nivel.slice(1)) : '—')}</td>
        </tr>`;
    }).join('');

    const stats = this.getStats(aulaId);
    const resumo = registros.length
      ? `<span class="badge badge-success">${stats.presentes} presente${stats.presentes !== 1 ? 's' : ''}</span>
         <span class="badge badge-gray">${stats.ausentes} ausente${stats.ausentes !== 1 ? 's' : ''}</span>`
      : '<span class="text-muted" style="font-size:13px;">Nenhum registro ainda</span>';

    const content = `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">
          <strong>${UI.escape(aula.titulo)}</strong> · ${this._fmtData(aula.data)}
          ${aula.horarioInicio ? ` · ${UI.escape(aula.horarioInicio)}` : ''}
          ${aula.professorNome ? ` · Prof. ${UI.escape(aula.professorNome)}` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${resumo}</div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button class="btn btn-ghost btn-sm" onclick="PresencaModule._marcarTodos(true)">✅ Marcar todos</button>
        <button class="btn btn-ghost btn-sm" onclick="PresencaModule._marcarTodos(false)">❌ Desmarcar todos</button>
      </div>

      ${alunosOrdenados.length ? `
        <div class="table-card" style="max-height:320px;overflow-y:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Situação</th>
                <th>Nível</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state" style="padding:32px 0;">
          <div class="empty-icon">👥</div>
          <div class="empty-title">Nenhum aluno ativo</div>
          <div class="empty-desc">Cadastre alunos ativos para registrar presença.</div>
        </div>
      `}
    `;

    UI.openModal({
      title:        `Presença — ${aula.titulo}`,
      content,
      confirmLabel: 'Salvar Presença',
      onConfirm:    () => this.salvarPresenca(aulaId),
    });
  },

  _marcarTodos(estado) {
    document.querySelectorAll('.presenca-checkbox').forEach(cb => {
      cb.checked = estado;
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Salvar presença                                                     */
  /* ------------------------------------------------------------------ */

  salvarPresenca(aulaId) {
    const checkboxes = document.querySelectorAll('.presenca-checkbox');
    const agora      = new Date().toISOString();

    // Remove registros antigos desta aula
    const todos = Storage.getAll(this.STORAGE_KEY);
    todos.filter(p => p.aulaId === aulaId).forEach(p => Storage.delete(this.STORAGE_KEY, p.id));

    // Adiciona os novos
    checkboxes.forEach(cb => {
      const rec = {
        aulaId,
        alunoId:   cb.dataset.alunoId,
        alunoNome: cb.dataset.alunoNome,
        presente:  cb.checked,
        registradoEm: agora,
      };
      Storage.create(this.STORAGE_KEY, rec);
    });

    const presentes = Array.from(checkboxes).filter(cb => cb.checked).length;
    UI.toast(`Presença salva: ${presentes} de ${checkboxes.length} aluno${checkboxes.length !== 1 ? 's' : ''} presentes.`, 'success');

    // Verifica alunos avulsos com saldo esgotado após salvar
    const alunosPresentes = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.alunoId);
    const esgotados = [];
    alunosPresentes.forEach(alunoId => {
      const s = SaldoService.getSaldo(alunoId);
      if (s.avulso && s.disponivel <= 0 && s.matricula) {
        // Encerra matrícula avulsa automaticamente
        Storage.update('matriculas', s.matricula.id, { status: 'encerrada' });
        esgotados.push(s.matricula.alunoNome || alunoId);
      }
    });
    if (esgotados.length) {
      UI.toast(`Saldo esgotado — matrícula avulsa encerrada: ${esgotados.join(', ')}`, 'warning');
    }

    UI.closeModal();
    AulaModule.render();
  },

  /* ------------------------------------------------------------------ */
  /*  Helper                                                              */
  /* ------------------------------------------------------------------ */

  _fmtData(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },
};
