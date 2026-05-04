'use strict';

/**
 * OcrService — Leitura de documentos (RG, CNH, etc.) via Tesseract.js
 * Suporta JPG, PNG, WEBP e PDF (via PDF.js).
 * Extrai: nome, CPF, data de nascimento, RG/CNH, telefone.
 */
const OcrService = {

  _worker:     null,
  _libsLoaded: false,

  /* ------------------------------------------------------------------ */
  /*  Carregamento lazy das bibliotecas                                   */
  /* ------------------------------------------------------------------ */

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s    = document.createElement('script');
      s.src      = src;
      s.onload   = resolve;
      s.onerror  = () => reject(new Error('Falha ao carregar biblioteca: ' + src));
      document.head.appendChild(s);
    });
  },

  async _ensureLibs() {
    if (this._libsLoaded) return;
    this._setStatus('Carregando bibliotecas de OCR…');
    // Carrega sequencialmente para evitar race conditions
    await this._loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js');
    await this._loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
    this._libsLoaded = true;
  },

  /* ------------------------------------------------------------------ */
  /*  Worker Tesseract                                                    */
  /* ------------------------------------------------------------------ */

  async _getWorker() {
    if (this._worker) return this._worker;
    this._setStatus('Iniciando motor de OCR…');
    // Usa apenas inglês — mais leve e confiável; documentos BR usam alfabeto latino
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          OcrService._setProgress(Math.round(m.progress * 100));
        } else if (m.status === 'loading tesseract core') {
          OcrService._setStatus('Carregando motor…');
        } else if (m.status === 'loading language traineddata') {
          OcrService._setStatus('Carregando dados de idioma…');
        }
      },
    });
    this._worker = worker;
    return worker;
  },

  /* ------------------------------------------------------------------ */
  /*  Entrada principal                                                   */
  /* ------------------------------------------------------------------ */

  async readDocument(file) {
    if (!file) throw new Error('Nenhum arquivo selecionado.');

    await this._ensureLibs();

    const type = file.type.toLowerCase();
    let imageSource;

    if (type === 'application/pdf') {
      imageSource = await this._pdfToCanvas(file);
    } else if (type.startsWith('image/')) {
      imageSource = await this._fileToDataUrl(file);
    } else {
      throw new Error('Formato não suportado. Use JPG, PNG ou PDF.');
    }

    this._setStatus('Reconhecendo texto…');
    const text = await this._runOcr(imageSource);
    return this._parseDocumentText(text);
  },

  /* ------------------------------------------------------------------ */
  /*  PDF → Canvas (sem worker externo para evitar CORS)                 */
  /* ------------------------------------------------------------------ */

  async _pdfToCanvas(file) {
    this._setStatus('Renderizando PDF…');

    // Usa fake worker (processamento síncrono) para evitar CORS em static hosting
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const arrayBuffer = await file.arrayBuffer();

    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({
        data:             arrayBuffer,
        useWorkerFetch:   false,
        isEvalSupported:  false,
        useSystemFonts:   true,
      }).promise;
    } catch (e) {
      // Fallback: tenta com worker CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    }

    const page     = await pdf.getPage(1);
    const scale    = 2.5;
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
      const reader   = new FileReader();
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
  /*  Parser — documentos brasileiros                                     */
  /* ------------------------------------------------------------------ */

  _parseDocumentText(rawText) {
    const result = { nome: '', cpf: '', dataNascimento: '', rg: '', telefone: '', raw: rawText };

    const text  = rawText.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
    const upper = text.toUpperCase();

    /* CPF */
    const cpfRaw = upper.match(/\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2}/);
    if (cpfRaw) {
      const digits = cpfRaw[0].replace(/\D/g, '');
      if (digits.length === 11)
        result.cpf = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    /* Data de nascimento */
    const dtCtx = upper.match(/(?:NASC|NASCIMENTO|DATA)[^0-9]{0,20}(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
    if (dtCtx) {
      result.dataNascimento = `${dtCtx[3]}-${dtCtx[2]}-${dtCtx[1]}`;
    } else {
      const dtFb = upper.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
      if (dtFb) {
        const ano = parseInt(dtFb[3]);
        if (ano >= 1930 && ano <= new Date().getFullYear() - 5)
          result.dataNascimento = `${dtFb[3]}-${dtFb[2]}-${dtFb[1]}`;
      }
    }

    /* Nome — linha após label "NOME" */
    const nomeLabel = text.match(/NOME[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]{4,60}?)(?:\n|CPF|RG|FILIA|DATA|DOC|NASC|VALID)/i);
    if (nomeLabel) {
      result.nome = this._capitalizeName(nomeLabel[1].trim());
    } else {
      // Fallback: linha em caixa alta com 3+ palavras que parece nome
      const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      for (const linha of linhas) {
        if (/^[A-ZÀ-Ú][A-ZÀ-Ú\s]{8,50}$/.test(linha) &&
            !/REPUBLICA|MINISTERIO|SECRETARIA|DETRAN|REGISTRO|CARTEIRA|IDENTIDADE|NACIONAL|HABILITACAO|FEDERAL|ESTADO/i.test(linha) &&
            linha.trim().split(' ').length >= 3) {
          result.nome = this._capitalizeName(linha);
          break;
        }
      }
    }

    /* RG */
    const rgMatch = upper.match(/(?:RG|IDENTIDADE|REG\.?\s*GERAL|N[Oº°]\s*\.)[\s:]+([0-9][0-9\.\-\/X]{4,14})/i);
    if (rgMatch) result.rg = rgMatch[1].trim();

    /* Telefone */
    const telMatch = text.match(/(\(?\d{2}\)?[\s\-]?[\s]?\d{4,5}[\-\s]?\d{4})/);
    if (telMatch) {
      const digits = telMatch[1].replace(/\D/g, '');
      if (digits.length === 10) result.telefone = digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      if (digits.length === 11) result.telefone = digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    return result;
  },

  _capitalizeName(str) {
    const prep = new Set(['de','da','do','das','dos','e','a','o']);
    return str.toLowerCase().split(' ')
      .map((w, i) => (i > 0 && prep.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  },

  /* ------------------------------------------------------------------ */
  /*  Feedback visual                                                     */
  /* ------------------------------------------------------------------ */

  _setProgress(pct) {
    const bar = document.getElementById('ocr-progress-bar');
    if (bar) bar.style.width = pct + '%';
    if (pct > 0) this._setStatus(`Reconhecendo texto… ${pct}%`);
  },

  _setStatus(msg) {
    const txt = document.getElementById('ocr-progress-txt');
    if (txt) txt.textContent = msg;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal                                                               */
  /* ------------------------------------------------------------------ */

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
          cursor:pointer;background:var(--bg-secondary);transition:background .15s;">
          <span style="font-size:28px;">📂</span>
          <span style="font-weight:600;color:var(--color-primary);">Clique para selecionar</span>
          <span style="font-size:12px;color:var(--text-muted);">JPG · PNG · PDF</span>
          <input type="file" id="ocr-file-input"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style="display:none;"
            onchange="OcrService._onFileSelected(this)" />
        </label>

        <div id="ocr-preview" style="display:none;margin-top:16px;">
          <img id="ocr-preview-img"
            style="max-width:100%;max-height:200px;border-radius:8px;
                   border:1px solid var(--card-border);object-fit:contain;" />
          <div id="ocr-pdf-label"
            style="display:none;font-size:13px;color:var(--text-muted);margin-top:4px;">
            📄 PDF selecionado — renderizando…
          </div>
        </div>

        <div id="ocr-progress-wrap" style="display:none;margin-top:20px;">
          <div style="background:var(--bg-secondary);border-radius:99px;height:8px;
                      overflow:hidden;margin-bottom:6px;">
            <div id="ocr-progress-bar"
              style="height:100%;width:0%;background:var(--color-primary,#3b9e8f);
                     border-radius:99px;transition:width .3s;"></div>
          </div>
          <div id="ocr-progress-txt"
            style="font-size:12px;color:var(--text-muted);">Iniciando…</div>
        </div>

        <div id="ocr-result" style="display:none;margin-top:20px;text-align:left;">
          <div style="font-weight:700;font-size:13px;margin-bottom:10px;">
            ✅ Dados encontrados — revise e confirme:
          </div>
          <div id="ocr-result-fields" style="display:grid;gap:6px;"></div>
        </div>

        <div id="ocr-error"
          style="display:none;margin-top:16px;padding:10px 14px;
                 background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;
                 color:#b91c1c;font-size:13px;text-align:left;"></div>
      </div>`;

    UI.openModal({
      title:        '📄 Ler Documento',
      content,
      confirmLabel: 'Usar estes dados',
      cancelLabel:  'Cancelar',
      onConfirm: () => {
        const data = OcrService._pendingData;
        if (!data) { UI.toast('Nenhum documento lido ainda.', 'warning'); return; }
        if (typeof onFill === 'function') onFill(data);
        UI.closeModal();
      },
    });

    // Oculta botão Confirmar até ter resultado
    const btn = document.getElementById('modal-confirm');
    if (btn) btn.style.display = 'none';
    this._pendingData = null;
  },

  _pendingData: null,

  async _onFileSelected(input) {
    const file = input.files[0];
    if (!file) return;

    const get = id => document.getElementById(id);
    get('ocr-error').style.display  = 'none';
    get('ocr-result').style.display = 'none';
    const confirmBtn = get('modal-confirm');
    if (confirmBtn) confirmBtn.style.display = 'none';

    // Preview
    if (file.type === 'application/pdf') {
      get('ocr-preview-img').style.display = 'none';
      get('ocr-pdf-label').style.display   = 'block';
    } else {
      get('ocr-preview-img').src            = URL.createObjectURL(file);
      get('ocr-preview-img').style.display  = 'block';
      get('ocr-pdf-label').style.display    = 'none';
    }
    get('ocr-preview').style.display      = 'block';
    get('ocr-progress-wrap').style.display = 'block';
    this._setProgress(0);

    try {
      const data = await OcrService.readDocument(file);
      OcrService._pendingData = data;
      OcrService._showResult(data);
      get('ocr-progress-wrap').style.display = 'none';
      if (confirmBtn) confirmBtn.style.display = '';
    } catch (err) {
      get('ocr-progress-wrap').style.display = 'none';
      // Mostra o erro real para facilitar diagnóstico
      const msg = err?.message || err?.toString() || 'Erro desconhecido';
      get('ocr-error').innerHTML = `❌ <strong>Erro:</strong> ${UI.escape(msg)}`;
      get('ocr-error').style.display = 'block';
      console.error('[OcrService]', err);
    }
  },

  _showResult(data) {
    const fields = [
      { label: 'Nome',       key: 'nome',           id: 'ocr-nome' },
      { label: 'CPF',        key: 'cpf',            id: 'ocr-cpf'  },
      { label: 'Nascimento', key: 'dataNascimento',  id: 'ocr-nasc' },
      { label: 'RG',         key: 'rg',             id: 'ocr-rg'   },
      { label: 'Telefone',   key: 'telefone',       id: 'ocr-tel'  },
    ];

    const container = document.getElementById('ocr-result-fields');
    if (!container) return;

    container.innerHTML = fields.map(f => `
      <div style="display:grid;grid-template-columns:100px 1fr;align-items:center;gap:6px;">
        <span style="font-size:12px;color:var(--text-muted);">${f.label}</span>
        <input id="${f.id}" class="form-input" style="height:34px;font-size:13px;"
          value="${UI.escape(data[f.key] || '')}"
          placeholder="não encontrado" />
      </div>`).join('');

    document.getElementById('ocr-result').style.display = 'block';

    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) el.addEventListener('input', () => { OcrService._pendingData[f.key] = el.value; });
    });
  },
};
