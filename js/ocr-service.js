'use strict';

/**
 * OcrService — Leitura de documentos (RG, CNH, etc.) via Tesseract.js
 * Suporta JPG, PNG, WEBP e PDF (via PDF.js).
 * Extrai: nome, CPF, data de nascimento, RG/CNH, telefone.
 */
const OcrService = {

  _tesseractReady: false,
  _worker: null,

  /* ------------------------------------------------------------------ */
  /*  Init / Teardown                                                     */
  /* ------------------------------------------------------------------ */

  async _getWorker() {
    if (this._worker) return this._worker;
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js não carregado. Verifique sua conexão.');
    }
    // Tesseract.js v4 — português + inglês para melhor cobertura de documentos BR
    const worker = await Tesseract.createWorker(['por', 'eng'], 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          OcrService._setProgress(Math.round(m.progress * 100));
        }
      },
    });
    this._worker = worker;
    return worker;
  },

  /* ------------------------------------------------------------------ */
  /*  Entrada principal                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Lê um arquivo (imagem ou PDF) e retorna campos extraídos do documento.
   * @param {File} file
   * @returns {Promise<{nome, cpf, dataNascimento, rg, telefone, raw}>}
   */
  async readDocument(file) {
    if (!file) throw new Error('Nenhum arquivo selecionado.');

    const type = file.type.toLowerCase();
    let imageSource;

    if (type === 'application/pdf') {
      imageSource = await this._pdfToCanvas(file);
    } else if (type.startsWith('image/')) {
      imageSource = await this._fileToDataUrl(file);
    } else {
      throw new Error('Formato não suportado. Use JPG, PNG ou PDF.');
    }

    const text = await this._runOcr(imageSource);
    return this._parseDocumentText(text);
  },

  /* ------------------------------------------------------------------ */
  /*  Conversão PDF → Canvas                                             */
  /* ------------------------------------------------------------------ */

  async _pdfToCanvas(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js não carregado. Verifique sua conexão.');
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page        = await pdf.getPage(1);

    const scale    = 2.5; // resolução maior = melhor OCR
    const viewport = page.getViewport({ scale });
    const canvas   = document.createElement('canvas');
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    }).promise;

    return canvas.toDataURL('image/png');
  },

  /* ------------------------------------------------------------------ */
  /*  Imagem → DataURL                                                    */
  /* ------------------------------------------------------------------ */

  _fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  },

  /* ------------------------------------------------------------------ */
  /*  OCR                                                                 */
  /* ------------------------------------------------------------------ */

  async _runOcr(imageSource) {
    const worker = await this._getWorker();
    const { data: { text } } = await worker.recognize(imageSource);
    return text;
  },

  /* ------------------------------------------------------------------ */
  /*  Parser de texto — documentos brasileiros                            */
  /* ------------------------------------------------------------------ */

  _parseDocumentText(rawText) {
    const result = { nome: '', cpf: '', dataNascimento: '', rg: '', telefone: '', raw: rawText };

    // Normaliza: remove quebras duplicadas, mantém estrutura de linhas
    const text  = rawText.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
    const upper = text.toUpperCase();

    /* ── CPF ─────────────────────────────────────────────────────────── */
    const cpfRaw = upper.match(/\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2}/);
    if (cpfRaw) {
      const digits = cpfRaw[0].replace(/\D/g, '');
      if (digits.length === 11) {
        result.cpf = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
    }

    /* ── Data de nascimento ──────────────────────────────────────────── */
    // Procura padrão DD/MM/AAAA perto de palavras-chave
    const dtContexto = upper.match(/(?:NASC|NASCIMENTO|DATA)[^0-9]{0,20}(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
    if (dtContexto) {
      result.dataNascimento = `${dtContexto[3]}-${dtContexto[2]}-${dtContexto[1]}`;
    } else {
      // fallback: primeira data completa do documento
      const dtFallback = upper.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
      if (dtFallback) {
        const ano = parseInt(dtFallback[3]);
        if (ano >= 1930 && ano <= new Date().getFullYear() - 5) { // garante que é nasc. e não validade
          result.dataNascimento = `${dtFallback[3]}-${dtFallback[2]}-${dtFallback[1]}`;
        }
      }
    }

    /* ── Nome ────────────────────────────────────────────────────────── */
    // Estratégia 1: linha após "NOME" ou "Nome:"
    const nomeLabel = text.match(/NOME[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]{4,60}?)(?:\n|CPF|RG|FILIA|DATA|DOC|NASC|VALID)/i);
    if (nomeLabel) {
      result.nome = this._capitalizeName(nomeLabel[1].trim());
    }

    // Estratégia 2: para CNH — nome geralmente na 2ª ou 3ª linha em caixa alta
    if (!result.nome) {
      const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      for (const linha of linhas) {
        if (/^[A-ZÀ-Ú][A-ZÀ-Ú\s]{6,50}$/.test(linha) &&
            !/REPÚBLICA|MINISTERIO|SECRETARIA|DETRAN|REGISTRO|CARTEIRA|IDENTIDADE|NACIONAL|HABILITAÇÃO/i.test(linha)) {
          result.nome = this._capitalizeName(linha);
          break;
        }
      }
    }

    /* ── RG ──────────────────────────────────────────────────────────── */
    const rgMatch = upper.match(/(?:RG|IDENTIDADE|REG\.?\s*GERAL|N[Oº°]\s*\.)[\s:]+([0-9][0-9\.\-\/X]{4,14})/i)
                 || upper.match(/(\d{1,2}[\.\-]?\d{3}[\.\-]?\d{3}[\.\-]?\d{1})/);
    if (rgMatch) result.rg = rgMatch[1].trim();

    /* ── Telefone ────────────────────────────────────────────────────── */
    const telMatch = text.match(/(\(?\d{2}\)?[\s\-]?[\s]?\d{4,5}[\-\s]?\d{4})/);
    if (telMatch) {
      const digits = telMatch[1].replace(/\D/g, '');
      if (digits.length === 10) result.telefone = digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      if (digits.length === 11) result.telefone = digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    return result;
  },

  /* ── Capitaliza nome corretamente ─────────────────────────────────── */
  _capitalizeName(str) {
    const preposicoes = new Set(['de','da','do','das','dos','e','a','o']);
    return str.toLowerCase().split(' ')
      .map((w, i) => (i > 0 && preposicoes.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  },

  /* ------------------------------------------------------------------ */
  /*  Feedback visual de progresso                                        */
  /* ------------------------------------------------------------------ */

  _setProgress(pct) {
    const el = document.getElementById('ocr-progress-bar');
    if (el) el.style.width = pct + '%';
    const txt = document.getElementById('ocr-progress-txt');
    if (txt) txt.textContent = pct < 100 ? `Lendo documento… ${pct}%` : 'Processando…';
  },

  /* ------------------------------------------------------------------ */
  /*  Modal de leitura de documento                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Abre o modal de upload/OCR e preenche o form de aluno com os dados extraídos.
   * @param {Function} onFill - callback(data) chamado quando dados são confirmados
   */
  openModal(onFill) {
    const content = `
      <div style="text-align:center;padding:8px 0 16px;">
        <div style="font-size:40px;margin-bottom:8px;">📄</div>
        <p style="color:var(--text-secondary);font-size:14px;margin-bottom:20px;">
          Selecione uma foto ou PDF do documento (RG, CNH, Passaporte).<br>
          Os dados serão extraídos automaticamente.
        </p>

        <label style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;
          padding:20px 32px;border:2px dashed var(--color-primary,#3b9e8f);border-radius:12px;
          cursor:pointer;background:var(--bg-secondary);transition:background .15s;"
          id="ocr-drop-label">
          <span style="font-size:28px;">📂</span>
          <span style="font-weight:600;color:var(--color-primary);">Clique para selecionar</span>
          <span style="font-size:12px;color:var(--text-muted);">JPG · PNG · PDF</span>
          <input type="file" id="ocr-file-input" accept="image/jpeg,image/png,image/webp,application/pdf"
            style="display:none;" onchange="OcrService._onFileSelected(this)" />
        </label>

        <div id="ocr-preview" style="display:none;margin-top:16px;">
          <img id="ocr-preview-img" style="max-width:100%;max-height:220px;border-radius:8px;
            border:1px solid var(--card-border);object-fit:contain;" />
          <div id="ocr-pdf-label" style="display:none;font-size:13px;color:var(--text-muted);margin-top:4px;">📄 PDF carregado</div>
        </div>

        <div id="ocr-progress-wrap" style="display:none;margin-top:20px;">
          <div style="background:var(--bg-secondary);border-radius:99px;height:8px;overflow:hidden;margin-bottom:6px;">
            <div id="ocr-progress-bar" style="height:100%;width:0%;background:var(--color-primary,#3b9e8f);
              border-radius:99px;transition:width .2s;"></div>
          </div>
          <div id="ocr-progress-txt" style="font-size:12px;color:var(--text-muted);">Lendo documento… 0%</div>
        </div>

        <div id="ocr-result" style="display:none;margin-top:20px;text-align:left;">
          <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--text-primary);">✅ Dados extraídos — revise antes de confirmar:</div>
          <div id="ocr-result-fields" style="display:grid;gap:6px;"></div>
        </div>

        <div id="ocr-error" style="display:none;margin-top:16px;padding:10px 14px;
          background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;
          color:#b91c1c;font-size:13px;"></div>
      </div>`;

    UI.openModal({
      title: '📄 Ler Documento',
      content,
      confirmLabel: 'Usar estes dados',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        const data = OcrService._pendingData;
        if (!data) { UI.toast('Nenhum documento lido ainda.', 'warning'); return; }
        if (typeof onFill === 'function') onFill(data);
        UI.closeModal();
      },
    });

    // Esconde botão Confirmar até ter resultado
    const confirmBtn = document.getElementById('modal-confirm');
    if (confirmBtn) confirmBtn.style.display = 'none';
    this._pendingData = null;
  },

  _pendingData: null,

  async _onFileSelected(input) {
    const file = input.files[0];
    if (!file) return;

    // Preview
    const prevWrap = document.getElementById('ocr-preview');
    const prevImg  = document.getElementById('ocr-preview-img');
    const pdfLbl   = document.getElementById('ocr-pdf-label');
    const errEl    = document.getElementById('ocr-error');
    const resEl    = document.getElementById('ocr-result');
    const progWrap = document.getElementById('ocr-progress-wrap');
    const confirmBtn = document.getElementById('modal-confirm');

    errEl.style.display = 'none';
    resEl.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';

    if (file.type === 'application/pdf') {
      prevImg.style.display = 'none';
      pdfLbl.style.display  = 'block';
    } else {
      prevImg.src = URL.createObjectURL(file);
      prevImg.style.display = 'block';
      pdfLbl.style.display  = 'none';
    }
    prevWrap.style.display = 'block';
    progWrap.style.display = 'block';
    OcrService._setProgress(0);

    try {
      const data = await OcrService.readDocument(file);
      OcrService._pendingData = data;
      OcrService._showResult(data);
      progWrap.style.display = 'none';
      if (confirmBtn) confirmBtn.style.display = '';
    } catch (err) {
      progWrap.style.display = 'none';
      errEl.textContent  = '❌ ' + (err.message || 'Erro ao processar o documento.');
      errEl.style.display = 'block';
      Logger.error('OcrService._onFileSelected', err);
    }
  },

  _showResult(data) {
    const fields = [
      { label: 'Nome',         key: 'nome',           id: 'ocr-nome'         },
      { label: 'CPF',          key: 'cpf',            id: 'ocr-cpf'          },
      { label: 'Nascimento',   key: 'dataNascimento', id: 'ocr-nasc'         },
      { label: 'RG',           key: 'rg',             id: 'ocr-rg'           },
      { label: 'Telefone',     key: 'telefone',       id: 'ocr-tel'          },
    ];

    const container = document.getElementById('ocr-result-fields');
    if (!container) return;

    container.innerHTML = fields.map(f => `
      <div style="display:grid;grid-template-columns:100px 1fr;align-items:center;gap:6px;">
        <span style="font-size:12px;color:var(--text-muted);">${f.label}</span>
        <input id="${f.id}" class="form-input" style="height:34px;font-size:13px;"
          value="${UI.escape(data[f.key] || '')}" placeholder="não encontrado" />
      </div>`).join('');

    document.getElementById('ocr-result').style.display = 'block';

    // Atualiza _pendingData quando o usuário editar os campos
    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) el.addEventListener('input', () => {
        OcrService._pendingData[f.key] = el.value;
      });
    });
  },
};
