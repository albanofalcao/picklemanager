'use strict';

/**
 * RelatoriosModule — Geração e exportação de relatórios em CSV.
 */
const RelatoriosModule = {

  _tab: 'alunos', // 'alunos' | 'financeiro' | 'aulas' | 'matriculas' | 'presenca'

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Relatórios</h2>
          <p>Visualize e exporte dados do sistema em CSV</p>
        </div>
      </div>

      <div class="tabs-bar">
        ${this._tabBtn('alunos',     '👥 Alunos')}
        ${this._tabBtn('financeiro', '💰 Financeiro')}
        ${this._tabBtn('aulas',      '🏸 Aulas')}
        ${this._tabBtn('matriculas', '📝 Matrículas')}
        ${this._tabBtn('presenca',   '✅ Presença')}
      </div>

      <div id="relatorio-conteudo">
        ${this._renderTab(this._tab)}
      </div>
    `;
  },

  switchTab(tab) {
    this._tab = tab;
    const conteudo = document.getElementById('relatorio-conteudo');
    if (conteudo) conteudo.innerHTML = this._renderTab(tab);
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
  },

  _tabBtn(key, label) {
    return `<button class="tab-btn ${this._tab === key ? 'active' : ''}"
      data-tab="${key}" onclick="RelatoriosModule.switchTab('${key}')">${label}</button>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Tabs de conteúdo                                                    */
  /* ------------------------------------------------------------------ */

  _renderTab(tab) {
    const map = {
      alunos:     () => this._tabAlunos(),
      financeiro: () => this._tabFinanceiro(),
      aulas:      () => this._tabAulas(),
      matriculas: () => this._tabMatriculas(),
      presenca:   () => this._tabPresenca(),
    };
    return (map[tab] || map.alunos)();
  },

  _tabAlunos() {
    const dados = Storage.getAll('alunos');
    const rows  = dados.map(a => [
      a.nome, a.cpf || '', a.email || '', a.telefone || '',
      a.dataNascimento || '', a.nivel || '', a.status,
      this._fmtDate(a.createdAt),
    ]);

    return this._renderTabela(
      'Alunos',
      ['Nome', 'CPF', 'E-mail', 'Telefone', 'Nascimento', 'Nível', 'Status', 'Cadastro'],
      rows,
      'alunos'
    );
  },

  _tabFinanceiro() {
    const dados = Storage.getAll('financeiro').slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const rows  = dados.map(f => [
      f.tipo, f.data || '', f.descricao || '', f.categoria || '',
      this._fmtMoeda(f.valor), f.formaPagamento || '', f.status,
      f.referencia || '', f.observacoes || '',
    ]);

    return this._renderTabela(
      'Financeiro',
      ['Tipo', 'Data', 'Descrição', 'Categoria', 'Valor', 'Forma Pgto.', 'Status', 'Referência', 'Observações'],
      rows,
      'financeiro'
    );
  },

  _tabAulas() {
    const dados = Storage.getAll('aulas').slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const rows  = dados.map(a => [
      a.titulo, a.data || '', a.horarioInicio || '', a.horarioFim || '',
      a.tipo || '', a.nivel || '', a.professorNome || '', a.arenaNome || '',
      a.vagas || '', a.status,
    ]);

    return this._renderTabela(
      'Aulas',
      ['Título', 'Data', 'Início', 'Fim', 'Tipo', 'Nível', 'Professor', 'Arena', 'Vagas', 'Status'],
      rows,
      'aulas'
    );
  },

  _tabMatriculas() {
    const dados = Storage.getAll('matriculas').slice().sort((a, b) => (b.dataInicio || '').localeCompare(a.dataInicio || ''));
    const rows  = dados.map(m => [
      m.alunoNome || '', m.planoNome || '',
      m.dataInicio || '', m.dataFim || '',
      this._fmtMoeda(m.valorPago), m.formaPagamento || '',
      m.status, m.observacoes || '',
    ]);

    return this._renderTabela(
      'Matrículas',
      ['Aluno', 'Plano', 'Início', 'Vencimento', 'Valor Pago', 'Forma Pgto.', 'Status', 'Observações'],
      rows,
      'matriculas'
    );
  },

  _tabPresenca() {
    const presencas = Storage.getAll('presencas');
    const aulas     = Storage.getAll('aulas');
    const aulaMap   = {};
    aulas.forEach(a => { aulaMap[a.id] = a; });

    const dados = presencas.slice().sort((a, b) => {
      const da = aulaMap[a.aulaId]?.data || '';
      const db = aulaMap[b.aulaId]?.data || '';
      return db.localeCompare(da);
    });

    const rows = dados.map(p => {
      const aula = aulaMap[p.aulaId] || {};
      return [
        aula.titulo || '', aula.data || '', aula.professorNome || '',
        p.alunoNome || '',
        p.presente ? 'Presente' : 'Ausente',
        this._fmtDate(p.registradoEm),
      ];
    });

    return this._renderTabela(
      'Presença',
      ['Aula', 'Data', 'Professor', 'Aluno', 'Presença', 'Registrado em'],
      rows,
      'presencas'
    );
  },

  /* ------------------------------------------------------------------ */
  /*  Renderizador genérico de tabela                                     */
  /* ------------------------------------------------------------------ */

  _renderTabela(titulo, colunas, rows, csvKey) {
    if (!rows.length) {
      return `
        <div class="relatorio-section">
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <div class="empty-title">Sem dados para exibir</div>
            <div class="empty-desc">Ainda não há registros de ${titulo.toLowerCase()} no sistema.</div>
          </div>
        </div>`;
    }

    const ths   = colunas.map(c => `<th>${UI.escape(c)}</th>`).join('');
    const tbody = rows.map(row =>
      `<tr>${row.map(cell => `<td>${UI.escape(String(cell ?? ''))}</td>`).join('')}</tr>`
    ).join('');

    return `
      <div class="relatorio-section">
        <div class="relatorio-toolbar">
          <span class="results-count">${rows.length} registro${rows.length !== 1 ? 's' : ''}</span>
          <button class="btn btn-secondary btn-sm" onclick="RelatoriosModule.exportCSV('${csvKey}')">
            ⬇ Exportar CSV
          </button>
        </div>
        <div class="table-card" style="overflow-x:auto;max-height:480px;overflow-y:auto;">
          <table class="data-table">
            <thead><tr>${ths}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ------------------------------------------------------------------ */
  /*  Exportar CSV                                                        */
  /* ------------------------------------------------------------------ */

  exportCSV(key) {
    const colMap = {
      alunos:     { colunas: ['nome','cpf','email','telefone','dataNascimento','nivel','status','createdAt'],
                    headers: ['Nome','CPF','E-mail','Telefone','Nascimento','Nível','Status','Cadastro'] },
      financeiro: { colunas: ['tipo','data','descricao','categoria','valor','formaPagamento','status','referencia','observacoes'],
                    headers: ['Tipo','Data','Descrição','Categoria','Valor','Forma Pgto.','Status','Referência','Observações'] },
      aulas:      { colunas: ['titulo','data','horarioInicio','horarioFim','tipo','nivel','professorNome','arenaNome','vagas','status'],
                    headers: ['Título','Data','Início','Fim','Tipo','Nível','Professor','Arena','Vagas','Status'] },
      matriculas: { colunas: ['alunoNome','planoNome','dataInicio','dataFim','valorPago','formaPagamento','status','observacoes'],
                    headers: ['Aluno','Plano','Início','Vencimento','Valor Pago','Forma Pgto.','Status','Observações'] },
      presencas:  { colunas: ['alunoNome','presente','registradoEm'],
                    headers: ['Aluno','Presente','Registrado em'] },
    };

    const cfg  = colMap[key];
    if (!cfg) return;

    const dados = Storage.getAll(key);
    const lines = [cfg.headers.join(';')];

    dados.forEach(rec => {
      const row = cfg.colunas.map(col => {
        let val = rec[col] ?? '';
        if (col === 'presente') val = val ? 'Sim' : 'Não';
        if (col === 'createdAt' || col === 'registradoEm') val = this._fmtDate(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      lines.push(row.join(';'));
    });

    const bom     = '\uFEFF';
    const content = bom + lines.join('\r\n');
    const blob    = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `picklemanager_${key}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    UI.toast(`Relatório de ${key} exportado com sucesso!`, 'success');
  },

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */

  _fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
  },

  _fmtMoeda(v) {
    return (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },
};
