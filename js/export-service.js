'use strict';

/**
 * ExportService — Exportação de dados para XLSX (SheetJS) com fallback CSV.
 * Usado por todos os módulos que precisam de relatório.
 */
const ExportService = {

  /**
   * Exporta para XLSX. Requer SheetJS (xlsx) carregado na página.
   * Faz fallback para CSV se a lib não estiver disponível.
   * @param {string}   filename  - sem extensão
   * @param {string[]} headers   - cabeçalhos das colunas
   * @param {Array[]}  rows      - array de arrays com os dados
   * @param {string}   [sheet]   - nome da aba (padrão: 'Dados')
   */
  toXLSX(filename, headers, rows, sheet = 'Dados') {
    if (typeof XLSX === 'undefined') {
      UI.toast('Biblioteca Excel não carregada — exportando CSV', 'warning');
      this.toCSV(filename, headers, rows);
      return;
    }
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Largura automática das colunas
      ws['!cols'] = headers.map((h, i) => ({
        wch: Math.min(
          60,
          Math.max(h.length + 2, ...rows.map(r => String(r[i] ?? '').length), 10)
        ),
      }));

      XLSX.utils.book_append_sheet(wb, ws, sheet);
      XLSX.writeFile(wb, `${filename}_${this._hoje()}.xlsx`);
      UI.toast('Arquivo Excel gerado!', 'success');
    } catch (err) {
      console.error('[ExportService] Erro ao gerar XLSX:', err);
      UI.toast('Erro ao gerar Excel — exportando CSV', 'error');
      this.toCSV(filename, headers, rows);
    }
  },

  /**
   * Exporta para CSV com BOM UTF-8 (compatível com Excel no Brasil).
   */
  toCSV(filename, headers, rows) {
    const bom   = '\uFEFF';
    const esc   = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.map(esc).join(';'),
      ...rows.map(r => r.map(esc).join(';')),
    ];
    const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${filename}_${this._hoje()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.toast('CSV exportado!', 'success');
  },

  /* ---- helpers ---- */

  _hoje() {
    return new Date().toISOString().slice(0, 10);
  },

  fmtData(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return String(iso); }
  },

  fmtMoeda(v) {
    return (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
};
