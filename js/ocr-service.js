'use strict';

/**
 * OcrService — Leitura de documentos via Tesseract.js (API simples)
 * Suporta JPG, PNG, WEBP e PDF (via PDF.js).
 */
const OcrService = {

  _libsLoaded: false,
  _pendingData: null,

  /* ------------------------------------------------------------------ */
  /*  Carregamento lazy                                                   */
  /* ------------------------------------------------------------------ */

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s   = document.createElement('script');
      s.src     = src;
      s.onload  = resolve;
      s.onerror = () => reject(new Error('Falha ao carregar: ' + src));
      document.head.appendChild(s);
    });
  },

  async _ensureLibs() {
    if (this._libsLoaded) return;
    this._setStatus('Carregando bibliotecas…');
    await this._loadScript('https://unpkg.com/tesseract.js@4.1.1/dist/tesseract.min.js');
    await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js');
    this._libsLoaded = true;
  },

  /* ------------------------------------------------------------------ */
  /*  Entrada principal                                                   */
  /* ------------------------------------------------------------------ */

  async readDocument(file) {
    if (!file) throw new Error('Nenhum arquivo selecionado.');
    await this._ensureLibs();

    let imageSource;
    const type = file.type.toLowerCase();

    if (type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
      imageSource = await this._pdfToDataUrl(file);
    } else if (type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name)) {
      imageSource = await this._fileToDataUrl(file);
    } else {
      throw new Error('Formato não suportado. Use JPG, PNG ou PDF.');
    }

    this._setStatus('Reconhecendo texto…');
    this._setProgress(10);

    const { data: { text } } = await Tesseract.recognize(imageSource, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text')
          OcrService._setProgress(10 + Math.round(m.progress * 85));
        else if (m.status === 'loading tesseract core')
          OcrService._setStatus('Carregando motor OCR…');
        else if (m.status === 'loading language traineddata')
          OcrService._setStatus('Baixando dados de idioma…');
        else if (m.status === 'initializing api')
          OcrService._setStatus('Inicializando…');
      },
    });

    this._setProgress(100);
    return this._parse(text);
  },

  /* ------------------------------------------------------------------ */
  /*  PDF → imagem                                                        */
  /* ------------------------------------------------------------------ */

  async _pdfToDataUrl(file) {
    this._setStatus('Renderizando PDF…');

    // Configura PDF.js (cloudflare CDN — versão 3.4.120)
    if (typeof pdfjsLib === 'undefined') {
      // nome global pode variar
      throw new Error('PDF.js não carregou. Tente converter o PDF para JPG antes.');
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    const buf    = await file.arrayBuffer();
    const pdf    = await pdfjsLib.getDocument({ data: buf }).promise;
    const page   = await pdf.getPage(1);

    const vp     = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width  = vp.width;
    canvas.height = vp.height;

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return canvas.toDataURL('image/png');
  },

  /* ------------------------------------------------------------------ */
  /*  Arquivo → DataURL                                                   */
  /* ------------------------------------------------------------------ */

  _fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r   = new FileReader();
      r.onload  = e => resolve(e.target.result);
      r.onerror = () => reject(new Error('Erro ao ler arquivo.'));
      r.readAsDataURL(file);
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Parser BR                                                           */
  /* ------------------------------------------------------------------ */

  _parse(raw) {
    const out   = { nome: '', cpf: '', dataNascimento: '', rg: '', telefone: '', raw };
    const text  = raw.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
    const upper = text.toUpperCase();

    // CPF
    const cpfM = upper.match(/\d{3}[\. ]?\d{3}[\. ]?\d{3}[\-\. ]?\d{2}/);
    if (cpfM) {
      const d = cpfM[0].replace(/\D/g, '');
      if (d.length === 11)
        out.cpf = d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // Data nascimento
    const dtK = upper.match(/(?:NASC|NASCIMENTO|DATA\s*NASC)[^0-9]{0,20}(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/);
    if (dtK) {
      out.dataNascimento = `${dtK[3]}-${dtK[2]}-${dtK[1]}`;
    } else {
      const dtF = upper.match(/(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/);
      if (dtF) {
        const y = parseInt(dtF[3]);
        if (y >= 1930 && y <= new Date().getFullYear() - 5)
          out.dataNascimento = `${dtF[3]}-${dtF[2]}-${dtF[1]}`;
      }
    }

    // Nome
    const nomeM = text.match(/NOME[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]{4,60}?)(?:\n|CPF|RG|FILIA|DATA|DOC|NASC|VALID)/i);
    if (nomeM) {
      out.nome = this._cap(nomeM[1].trim());
    } else {
      for (const ln of text.split('\n').map(l => l.trim())) {
        if (/^[A-ZÀ-Ú][A-ZÀ-Ú\s]{8,55}$/.test(ln) &&
            ln.split(' ').length >= 3 &&
            !/REPUBLICA|MINISTERIO|DETRAN|REGISTRO|CARTEIRA|IDENTIDADE|NACIONAL|HABILITACAO|FEDERAL|ESTADO/i.test(ln)) {
          out.nome = this._cap(ln);
          break;
        }
      }
    }

    // RG
    const rgM = upper.match(/(?:RG|IDENTIDADE|N[Oº°]\.?)[\s:]+([0-9][0-9\.\-\/X]{4,14})/i);
    if (rgM) out.rg = rgM[1].trim();

    // Telefone
    const telM = text.match(/\(?\d{2}\)?[\s\-]?\d{4,5}[\-\s]\d{4}/);
    if (telM) {
      const d = telM[0].replace(/\D/g, '');
      if (d.length === 10) out.telefone = d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      if (d.length === 11) out.telefone = d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    return out;
  },

  _cap(s) {
    const prep = new Set(['de','da','do','das','dos','e','a','o']);
    return s.toLowerCase().split(' ')
      .map((w, i) => (!i || !prep.has(w)) ? w.charAt(0).toUpperCase() + w.slice(1) : w)
      .join(' ');
  },

  /* ------------------------------------------------------------------ */
  /*  Feedback                                                            */
  /* ------------------------------------------------------------------ */

  _setProgress(p) {
    const b = document.getElementById('ocr-progress-bar');
    if (b) b.style.width = p + '%';
  },

  _setStatus(msg) {
    const t = document.getElementById('ocr-progress-txt');
    if (t) t.textContent = msg;
  },

  /* ------------------------------------------------------------------ */
  /*  Modal                                                               */
  /* ------------------------------------------------------------------ */

  openModal(onFill) {
    const html = `
      <div style="text-align:center;padding:8px 0 16px;">
        <div style="font-size:38px;margin-bottom:8px;">📄</div>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:18px;line-height:1.5;">
          Selecione uma foto ou PDF do documento.<br>
          <strong>RG · CNH · Passaporte</strong>
        </p>

        <label style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;
          padding:18px 28px;border:2px dashed var(--color-primary,#3b9e8f);border-radius:12px;
          cursor:pointer;background:var(--bg-secondary);">
          <span style="font-size:26px;">📂</span>
          <span style="font-weight:600;color:var(--color-primary,#3b9e8f);">Clique para selecionar</span>
          <span style="font-size:11px;color:var(--text-muted);">JPG · PNG · PDF</span>
          <input type="file" id="ocr-file-input" style="display:none;"
            accept="image/*,.pdf,application/pdf"
            onchange="OcrService._onFile(this)" />
        </label>

        <div id="ocr-prev" style="display:none;margin-top:14px;">
          <img id="ocr-prev-img" style="max-width:100%;max-height:180px;border-radius:8px;
            border:1px solid var(--card-border);object-fit:contain;" />
          <p id="ocr-prev-pdf" style="display:none;font-size:12px;color:var(--text-muted);margin:4px 0 0;">
            📄 PDF selecionado
          </p>
        </div>

        <div id="ocr-prog" style="display:none;margin-top:18px;">
          <div style="background:var(--bg-secondary);border-radius:99px;height:7px;overflow:hidden;margin-bottom:5px;">
            <div id="ocr-progress-bar" style="height:100%;width:0%;background:var(--color-primary,#3b9e8f);
              border-radius:99px;transition:width .3s;"></div>
          </div>
          <div id="ocr-progress-txt" style="font-size:12px;color:var(--text-muted);">Aguarde…</div>
        </div>

        <div id="ocr-res" style="display:none;margin-top:18px;text-align:left;">
          <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--color-success,#10b981);">
            ✅ Dados encontrados — revise antes de confirmar:
          </div>
          <div id="ocr-res-fields" style="display:grid;gap:7px;"></div>
        </div>

        <div id="ocr-err" style="display:none;margin-top:14px;padding:10px 14px;
          background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;
          color:#b91c1c;font-size:12px;text-align:left;line-height:1.5;"></div>
      </div>`;

    UI.openModal({
      title: '📄 Ler Documento',
      content: html,
      confirmLabel: 'Usar estes dados',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        if (!OcrService._pendingData) { UI.toast('Selecione um documento primeiro.', 'warning'); return; }
        if (typeof onFill === 'function') onFill(OcrService._pendingData);
        UI.closeModal();
      },
    });

    const btn = document.getElementById('modal-confirm');
    if (btn) btn.style.display = 'none';
    this._pendingData = null;
  },

  async _onFile(input) {
    const file = input?.files?.[0];
    if (!file) return;

    const $ = id => document.getElementById(id);
    $('ocr-err').style.display = 'none';
    $('ocr-res').style.display = 'none';
    const btn = $('modal-confirm');
    if (btn) btn.style.display = 'none';

    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      $('ocr-prev-img').style.display = 'none';
      $('ocr-prev-pdf').style.display = 'block';
    } else {
      $('ocr-prev-img').src           = URL.createObjectURL(file);
      $('ocr-prev-img').style.display = 'block';
      $('ocr-prev-pdf').style.display = 'none';
    }
    $('ocr-prev').style.display = 'block';
    $('ocr-prog').style.display = 'block';
    this._setProgress(0);
    this._setStatus('Iniciando…');

    try {
      const data = await OcrService.readDocument(file);
      OcrService._pendingData = data;
      $('ocr-prog').style.display = 'none';
      OcrService._showResult(data);
      if (btn) btn.style.display = '';
    } catch (err) {
      $('ocr-prog').style.display = 'none';
      const msg = err?.message || String(err) || 'Erro desconhecido';
      $('ocr-err').innerHTML = `❌ <strong>${UI.escape(msg)}</strong>`;
      $('ocr-err').style.display = 'block';
      console.error('[OcrService]', err);
    }
  },

  _showResult(data) {
    const fields = [
      { label: 'Nome',       key: 'nome',           id: 'f-nome' },
      { label: 'CPF',        key: 'cpf',            id: 'f-cpf'  },
      { label: 'Nascimento', key: 'dataNascimento',  id: 'f-nasc' },
      { label: 'RG',         key: 'rg',             id: 'f-rg'   },
      { label: 'Telefone',   key: 'telefone',       id: 'f-tel'  },
    ];
    const c = document.getElementById('ocr-res-fields');
    if (!c) return;
    c.innerHTML = fields.map(f => `
      <div style="display:grid;grid-template-columns:90px 1fr;align-items:center;gap:6px;">
        <span style="font-size:12px;color:var(--text-muted);">${f.label}</span>
        <input id="${f.id}" class="form-input" style="height:32px;font-size:13px;"
          value="${UI.escape(data[f.key] || '')}" placeholder="—" />
      </div>`).join('');
    document.getElementById('ocr-res').style.display = 'block';
    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) el.oninput = () => { OcrService._pendingData[f.key] = el.value; };
    });
  },
};
