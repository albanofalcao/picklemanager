'use strict';

/**
 * RelatoriosModule — Exportações gerenciais.
 * Os relatórios de Alunos, Financeiro, Aulas e Matrículas foram movidos
 * para dentro de cada módulo (botão "⬇ Excel" na barra de filtros).
 * Aqui fica o relatório de Presença (cross-module: join presencas + aulas).
 */
const RelatoriosModule = {

  render() {
    const area = document.getElementById('content-area');
    if (!area) return;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h2>Relatórios</h2>
          <p>Exportações gerenciais e histórico de presenças</p>
        </div>
      </div>

      <!-- Atalhos para os módulos -->
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="padding:16px 20px 0;">
          <h3 class="card-title" style="font-size:14px;font-weight:700;text-transform:uppercase;
            letter-spacing:.5px;color:var(--text-muted);">📂 Relatórios por Módulo</h3>
        </div>
        <div style="padding:16px 20px 20px;display:flex;flex-wrap:wrap;gap:10px;">
          <button class="btn btn-secondary" onclick="App.navigate('alunos')">
            👥 Alunos — exportar via filtros
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('financeiro')">
            💰 Financeiro — exportar via filtros
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('aulas')">
            🏸 Aulas — exportar via filtros
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('matriculas')">
            📝 Matrículas — exportar via filtros
          </button>
        </div>
      </div>

      <!-- Presença -->
      <div class="card">
        <div class="card-header" style="padding:16px 20px 0;display:flex;align-items:center;justify-content:space-between;">
          <h3 class="card-title" style="font-size:14px;font-weight:700;text-transform:uppercase;
            letter-spacing:.5px;color:var(--text-muted);">✅ Histórico de Presenças</h3>
          <button class="btn btn-primary btn-sm" onclick="RelatoriosModule._exportPresenca()">
            ⬇ Exportar Excel
          </button>
        </div>
        <div style="padding:16px 20px 20px;">
          ${this._renderPresenca()}
        </div>
      </div>
    `;
  },

  /* ------------------------------------------------------------------ */
  /*  Presença                                                            */
  /* ------------------------------------------------------------------ */

  _renderPresenca() {
    const presencas = Storage.getAll('presencas');
    const aulaMap   = {};
    Storage.getAll('aulas').forEach(a => { aulaMap[a.id] = a; });

    const rows = presencas
      .slice()
      .sort((a, b) => {
        const da = aulaMap[a.aulaId]?.data || '';
        const db = aulaMap[b.aulaId]?.data || '';
        return db.localeCompare(da);
      });

    if (!rows.length) {
      return `<div class="empty-state" style="padding:40px 0;">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Nenhuma presença registrada</div>
      </div>`;
    }

    const ths = ['Aula', 'Data', 'Professor', 'Aluno', 'Presença', 'Registrado em']
      .map(h => `<th>${h}</th>`).join('');

    const trs = rows.map(p => {
      const aula = aulaMap[p.aulaId] || {};
      return `<tr>
        <td>${UI.escape(aula.titulo || '—')}</td>
        <td>${UI.escape(aula.data ? new Date(aula.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—')}</td>
        <td>${UI.escape(aula.professorNome || '—')}</td>
        <td>${UI.escape(p.alunoNome || '—')}</td>
        <td><span class="badge ${p.presente ? 'badge-success' : 'badge-error'}">${p.presente ? 'Presente' : 'Ausente'}</span></td>
        <td>${UI.escape(p.registradoEm ? new Date(p.registradoEm).toLocaleDateString('pt-BR') : '—')}</td>
      </tr>`;
    }).join('');

    return `
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">${rows.length} registro${rows.length !== 1 ? 's' : ''}</p>
      <div style="overflow-x:auto;max-height:500px;overflow-y:auto;">
        <table class="data-table">
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>`;
  },

  _exportPresenca() {
    const presencas = Storage.getAll('presencas');
    if (!presencas.length) { UI.toast('Nenhuma presença para exportar', 'warning'); return; }

    const aulaMap = {};
    Storage.getAll('aulas').forEach(a => { aulaMap[a.id] = a; });

    const headers = ['Aula', 'Data', 'Professor', 'Aluno', 'Presença', 'Registrado em'];
    const rows = presencas
      .slice()
      .sort((a, b) => {
        const da = aulaMap[a.aulaId]?.data || '';
        const db = aulaMap[b.aulaId]?.data || '';
        return db.localeCompare(da);
      })
      .map(p => {
        const aula = aulaMap[p.aulaId] || {};
        return [
          aula.titulo        || '',
          ExportService.fmtData(aula.data),
          aula.professorNome || '',
          p.alunoNome        || '',
          p.presente ? 'Presente' : 'Ausente',
          ExportService.fmtData(p.registradoEm),
        ];
      });

    ExportService.toXLSX('picklemanager_presencas', headers, rows, 'Presenças');
  },
};
