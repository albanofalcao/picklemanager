'use strict';

/**
 * inscricao.js — Página pública de inscrição em torneio.
 * Não depende de App, Auth, UI ou Router — standalone.
 */
const Inscricao = {

  ESPORTES: {
    pickleball:   { label: 'Pickleball',   icon: '🏓' },
    tenis:        { label: 'Tênis',        icon: '🎾' },
    beach_tennis: { label: 'Beach Tennis', icon: '🏖️' },
    futvolei:     { label: 'Futevolei',    icon: '⚽' },
  },

  NIVEL_LABEL: {
    kids:          'Kids',
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado',
    profissional:  'Profissional',
  },

  SEXO_LABEL: {
    masculino: 'Masculino',
    feminino:  'Feminino',
    misto:     'Misto',
    aberto:    'Aberto',
  },

  _torneioId:    null,
  _catIdFiltro:  null,
  _evento:       null,
  _cats:         [],
  _wrap:         null,

  /* ── Inicialização ────────────────────────────────────────────────── */

  async init() {
    this._wrap = document.getElementById('insc-wrap');

    const params         = new URLSearchParams(window.location.search);
    this._torneioId      = params.get('t');
    this._catIdFiltro    = params.get('c');
    const tk             = params.get('tk');

    if (!this._torneioId) {
      return this._renderErro('Link inválido — parâmetro de torneio não encontrado.');
    }

    // Inicializa DB com o tenant correto
    try {
      let tenantId = null;

      // Tenta resolver pelo parâmetro tk
      if (tk && typeof TENANTS !== 'undefined') {
        const t = Object.values(TENANTS).find(t => t.key === tk) ||
                  Object.entries(TENANTS).find(([k]) => k === tk)?.[1];
        if (t) tenantId = t.id;
      }

      // Fallback: usa o TENANT_ID padrão do supabase-config.js
      if (!tenantId && typeof TENANT_ID !== 'undefined' && TENANT_ID) {
        tenantId = TENANT_ID;
      }

      if (tenantId && typeof DB !== 'undefined') {
        await DB.init(tenantId);
      }
    } catch (e) {
      console.error('[Inscricao] Erro ao iniciar DB:', e);
    }

    // Carrega torneio
    this._evento = Storage.getById('torneios', this._torneioId);
    if (!this._evento) {
      return this._renderErro('Torneio não encontrado ou link expirado.');
    }

    // Verifica status — só aceita inscrições se aberto
    if (!['inscricoes_abertas', 'em_andamento'].includes(this._evento.status)) {
      return this._renderErro('As inscrições para este torneio não estão abertas no momento.');
    }

    // Carrega categorias do torneio (apenas configuradas)
    const todoCats = Storage.getAll('torneio_categorias')
      .filter(c => c.eventoId === this._torneioId && c.formato && c.maxParticipantes);

    this._cats = todoCats.map(cat => {
      const tipo  = Storage.getById('torneio_cat_tipos', cat.catTipoId) || {};
      const inscs = Storage.getAll('torneio_inscricoes')
        .filter(i => i.categoriaId === cat.id && i.status !== 'cancelado');
      return {
        ...cat,
        _tipo:  tipo,
        _vagas: cat.maxParticipantes - inscs.length,
      };
    });

    // Filtra por categoria específica (link direto de categoria)
    if (this._catIdFiltro) {
      this._cats = this._cats.filter(c => c.id === this._catIdFiltro);
    }

    if (!this._cats.length) {
      return this._renderErro('Nenhuma categoria disponível para inscrição neste torneio.');
    }

    this._renderForm();
  },

  /* ── Render formulário ────────────────────────────────────────────── */

  _renderForm() {
    const esp   = this.ESPORTES[this._evento.esporte] || { label: this._evento.esporte || '', icon: '🏅' };
    const dFmt  = d => {
      if (!d) return '';
      const [y, m, dd] = d.split('-');
      return `${dd}/${m}/${y}`;
    };
    const periodo = this._evento.dataFim && this._evento.dataFim !== this._evento.dataInicio
      ? `${dFmt(this._evento.dataInicio)} a ${dFmt(this._evento.dataFim)}`
      : dFmt(this._evento.dataInicio);

    this._wrap.innerHTML = `
      <!-- Cabeçalho da marca -->
      <div class="insc-header">
        <img src="img/pickleball-paddle.svg" alt="" style="width:38px;height:38px;">
        <div>
          <div class="insc-brand-name">PickleManager</div>
          <div class="insc-brand-sub">Inscrição em Torneio</div>
        </div>
      </div>

      <!-- Título do evento -->
      <h1 class="insc-evento-titulo">${esp.icon} ${this._esc(this._evento.nome)}</h1>
      <p class="insc-evento-sub">
        📅 ${periodo}
        ${this._evento.horarioInicio ? ` &nbsp;·&nbsp; ⏰ ${this._evento.horarioInicio}${this._evento.horarioFim ? ' → ' + this._evento.horarioFim : ''}` : ''}
      </p>

      <!-- Card dados pessoais -->
      <div class="card" style="padding:24px;">
        <p class="insc-section-title">📝 Seus dados</p>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Nome completo <span class="required-star">*</span></label>
            <input id="fi-nome" type="text" class="form-input"
              placeholder="Seu nome completo" autocomplete="name"
              style="height:46px;" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input id="fi-email" type="email" class="form-input"
                placeholder="seu@email.com" autocomplete="email"
                style="height:46px;" />
            </div>
            <div class="form-group">
              <label class="form-label">Telefone / WhatsApp</label>
              <input id="fi-tel" type="tel" class="form-input"
                placeholder="(11) 99999-9999" autocomplete="tel"
                style="height:46px;" />
            </div>
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label">Sexo</label>
              <select id="fi-sexo" class="form-select" style="height:46px;"
                onchange="Inscricao._atualizarCats()">
                <option value="">—</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Data de nascimento</label>
              <input id="fi-nasc" type="date" class="form-input"
                style="height:46px;"
                onchange="Inscricao._atualizarCats()" />
            </div>
            <div class="form-group">
              <label class="form-label">Nível de jogo</label>
              <select id="fi-nivel" class="form-select" style="height:46px;"
                onchange="Inscricao._atualizarCats()">
                <option value="">—</option>
                <option value="kids">Kids</option>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
                <option value="profissional">Profissional</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Card categorias -->
      <div class="card" style="padding:24px;margin-top:16px;">
        <p class="insc-section-title">📂 Categoria</p>
        <p id="fi-cat-hint" style="font-size:13px;color:var(--text-muted);margin:0 0 14px;">
          Preencha seus dados acima para ver as categorias compatíveis com o seu perfil.
        </p>
        <div id="fi-cats-lista">
          ${this._cats.map(c => this._renderCatItem(c, false)).join('')}
        </div>
      </div>

      <!-- Botão enviar -->
      <button class="btn btn-primary insc-submit" id="fi-btn-submit"
        onclick="Inscricao._submeter()">
        Confirmar Inscrição →
      </button>

      <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:14px;line-height:1.7;">
        Ao se inscrever você concorda com o regulamento do torneio.<br>
        Dúvidas? Entre em contato com a organização.
      </p>
    `;

    // Foca no primeiro campo
    setTimeout(() => document.getElementById('fi-nome')?.focus(), 100);
  },

  _renderCatItem(cat, compativel) {
    const vagas  = cat._vagas;
    const lotada = vagas <= 0;

    const taxa = cat.taxaInscricao > 0
      ? `💰 R$ ${(+cat.taxaInscricao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : '🎟️ Gratuita';

    const info = [
      cat.tipoParticipacao === 'duplas'  ? 'Duplas'  :
      cat.tipoParticipacao === 'singles' ? 'Singles' : '',
      this.SEXO_LABEL[cat._tipo?.sexo]   || '',
      this.NIVEL_LABEL[cat._tipo?.nivel] || '',
    ].filter(Boolean).join(' · ');

    const idadeStr = (() => {
      const t = cat._tipo;
      if (!t) return '';
      if (t.idadeMin && t.idadeMax) return `${t.idadeMin}–${t.idadeMax} anos`;
      if (t.idadeMin)               return `${t.idadeMin}+ anos`;
      if (t.idadeMax)               return `até ${t.idadeMax} anos`;
      return '';
    })();

    const vagasLabel = lotada
      ? `<span style="color:var(--color-danger,#ef4444);">🚫 Esgotada</span>`
      : `<span style="color:var(--color-success,#10b981);">✓ ${vagas} vaga${vagas > 1 ? 's' : ''}</span>`;

    return `
      <label class="insc-cat-item${compativel ? ' insc-cat-compat' : ''}${lotada ? ' insc-cat-lotada' : ''}">
        <input type="radio" name="fi-cat" value="${cat.id}" ${lotada ? 'disabled' : ''} />
        <div style="flex:1;min-width:0;">
          <div class="insc-cat-nome">${this._esc(cat.nome)}</div>
          ${info || idadeStr ? `<div class="insc-cat-info">${info}${info && idadeStr ? ' · ' : ''}${idadeStr}</div>` : ''}
          <div class="insc-cat-vagas" style="display:flex;gap:14px;">
            <span>${taxa}</span>
            ${vagasLabel}
          </div>
        </div>
        ${compativel ? '<span style="font-size:18px;align-self:center;">⭐</span>' : ''}
      </label>`;
  },

  /* ── Filtro inteligente de categorias ─────────────────────────────── */

  _atualizarCats() {
    const sexo  = document.getElementById('fi-sexo')?.value  || '';
    const nivel = document.getElementById('fi-nivel')?.value || '';
    const nasc  = document.getElementById('fi-nasc')?.value  || '';
    const idade = nasc ? this._calcIdade(nasc) : null;

    const lista = document.getElementById('fi-cats-lista');
    const hint  = document.getElementById('fi-cat-hint');
    if (!lista) return;

    // Sem dados suficientes — mostra tudo sem destaque
    if (!sexo && !nivel && !idade) {
      lista.innerHTML = this._cats.map(c => this._renderCatItem(c, false)).join('');
      if (hint) hint.textContent = 'Preencha seus dados acima para ver as categorias compatíveis com o seu perfil.';
      return;
    }

    const compat = this._cats.filter(c => this._ehCompativel(c, sexo, nivel, idade));
    const outros = this._cats.filter(c => !this._ehCompativel(c, sexo, nivel, idade));

    let html = '';

    if (compat.length) {
      html += `<div class="insc-secao-label">⭐ Compatíveis com o seu perfil</div>`;
      html += compat.map(c => this._renderCatItem(c, true)).join('');
    }
    if (outros.length) {
      html += `<div class="insc-secao-label" style="margin-top:${compat.length ? '16px' : '0'};">Outras categorias</div>`;
      html += outros.map(c => this._renderCatItem(c, false)).join('');
    }
    if (!compat.length && !outros.length) {
      html = `<p style="text-align:center;color:var(--text-muted);padding:20px 0;">Nenhuma categoria disponível.</p>`;
    }

    lista.innerHTML = html;

    if (hint) {
      hint.textContent = compat.length
        ? `${compat.length} categoria${compat.length > 1 ? 's' : ''} compatível${compat.length > 1 ? 's' : ''} com o seu perfil em destaque.`
        : 'Nenhuma categoria corresponde exatamente ao seu perfil — veja todas as disponíveis.';
    }
  },

  _ehCompativel(cat, sexo, nivel, idade) {
    const t = cat._tipo;
    if (!t) return true;
    if (sexo  && t.sexo  && t.sexo  !== 'aberto' && t.sexo  !== sexo)  return false;
    if (nivel && t.nivel && t.nivel !== nivel)                          return false;
    if (idade !== null) {
      if (t.idadeMin && idade < t.idadeMin) return false;
      if (t.idadeMax && idade > t.idadeMax) return false;
    }
    return true;
  },

  _calcIdade(dataNasc) {
    const hoje = new Date();
    const nasc = new Date(dataNasc + 'T00:00:00');
    let   idade = hoje.getFullYear() - nasc.getFullYear();
    const m     = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  },

  /* ── Submissão ────────────────────────────────────────────────────── */

  async _submeter() {
    const g     = id => document.getElementById(id);
    const nome  = g('fi-nome')?.value.trim()  || '';
    const email = g('fi-email')?.value.trim() || '';
    const catId = document.querySelector('input[name="fi-cat"]:checked')?.value || '';

    if (!nome)  { this._toast('Informe seu nome completo.', 'error');    return; }
    if (!catId) { this._toast('Selecione uma categoria.', 'error');       return; }

    const cat = this._cats.find(c => c.id === catId);
    if (!cat)              { this._toast('Categoria inválida.',                      'error'); return; }
    if (cat._vagas <= 0)   { this._toast('Esta categoria não tem vagas disponíveis.','error'); return; }

    // Verifica duplicidade por e-mail na mesma categoria
    if (email) {
      const partExist = Storage.getAll('torneio_participantes').find(p => p.email === email);
      if (partExist) {
        const jaInscrito = Storage.getAll('torneio_inscricoes').find(
          i => i.participanteId === partExist.id && i.categoriaId === catId && i.status !== 'cancelado'
        );
        if (jaInscrito) {
          this._toast('Este e-mail já está inscrito nesta categoria.', 'error');
          return;
        }
      }
    }

    const btn = g('fi-btn-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

    try {
      // Cria participante
      const part = Storage.create('torneio_participantes', {
        alunoId:        null,
        nome,
        email,
        telefone:       g('fi-tel')?.value.trim()   || '',
        sexo:           g('fi-sexo')?.value         || '',
        dataNascimento: g('fi-nasc')?.value         || '',
        nivel:          g('fi-nivel')?.value        || '',
      });

      // Cria inscrição
      Storage.create('torneio_inscricoes', {
        categoriaId:      catId,
        eventoId:         this._torneioId,
        participanteId:   part.id,
        nomeParticipante: nome,
        statusPagamento:  'pendente',
        status:           'pendente',
        origem:           'publica',
      });

      this._renderSucesso(nome, cat);

    } catch (e) {
      console.error('[Inscricao] Erro ao salvar:', e);
      this._toast('Erro ao enviar inscrição. Tente novamente.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Inscrição →'; }
    }
  },

  /* ── Tela de sucesso ─────────────────────────────────────────────── */

  _renderSucesso(nome, cat) {
    const esp = this.ESPORTES[this._evento.esporte] || { icon: '🏅' };
    const taxa = cat.taxaInscricao > 0
      ? `R$ ${(+cat.taxaInscricao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : null;

    this._wrap.innerHTML = `
      <div class="insc-header">
        <img src="img/pickleball-paddle.svg" alt="" style="width:38px;height:38px;">
        <div>
          <div class="insc-brand-name">PickleManager</div>
          <div class="insc-brand-sub">Inscrição em Torneio</div>
        </div>
      </div>

      <div class="insc-sucesso">
        <div style="font-size:64px;margin-bottom:16px;">🎉</div>
        <h1 style="font-size:22px;font-weight:800;color:var(--color-primary,#3b9e8f);margin:0 0 8px;">
          Inscrição Recebida!
        </h1>
        <p style="font-size:15px;color:var(--text-secondary);margin:0 0 28px;">
          Olá, <strong>${this._esc(nome)}</strong>! Sua inscrição foi registrada com sucesso.
        </p>

        <div class="card" style="text-align:left;max-width:380px;margin:0 auto 24px;">
          <div style="display:flex;flex-direction:column;gap:12px;font-size:14px;">
            <div style="display:flex;gap:8px;">
              <span style="color:var(--text-muted);min-width:80px;">Torneio</span>
              <strong>${esp.icon} ${this._esc(this._evento.nome)}</strong>
            </div>
            <div style="display:flex;gap:8px;">
              <span style="color:var(--text-muted);min-width:80px;">Categoria</span>
              <strong>${this._esc(cat.nome)}</strong>
            </div>
            <div style="display:flex;gap:8px;">
              <span style="color:var(--text-muted);min-width:80px;">Status</span>
              <span class="badge badge-warning">Aguardando confirmação</span>
            </div>
            ${taxa ? `
            <div style="display:flex;gap:8px;align-items:flex-start;">
              <span style="color:var(--text-muted);min-width:80px;">Taxa</span>
              <div>
                <strong>${taxa} por pessoa</strong><br>
                <span style="font-size:12px;color:var(--text-muted);">Pagamento a confirmar com a organização.</span>
              </div>
            </div>` : `
            <div style="display:flex;gap:8px;">
              <span style="color:var(--text-muted);min-width:80px;">Taxa</span>
              <span style="color:var(--color-success,#10b981);font-weight:700;">Gratuita ✓</span>
            </div>`}
          </div>
        </div>

        <p style="font-size:13px;color:var(--text-muted);line-height:1.7;">
          A organização entrará em contato para confirmar sua vaga.<br>
          Guarde este número de referência: <strong>${this._esc(cat.id.slice(-6).toUpperCase())}</strong>
        </p>
      </div>
    `;
  },

  /* ── Tela de erro ─────────────────────────────────────────────────── */

  _renderErro(msg) {
    if (!this._wrap) return;
    this._wrap.innerHTML = `
      <div class="insc-header">
        <img src="img/pickleball-paddle.svg" alt="" style="width:38px;height:38px;">
        <div>
          <div class="insc-brand-name">PickleManager</div>
          <div class="insc-brand-sub">Inscrição em Torneio</div>
        </div>
      </div>
      <div class="insc-erro">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h2 style="font-size:18px;font-weight:700;color:var(--text-primary);">Inscrição indisponível</h2>
        <p style="color:var(--text-muted);margin-top:8px;font-size:14px;">${this._esc(msg)}</p>
      </div>`;
  },

  /* ── Utilitários ─────────────────────────────────────────────────── */

  _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _toast(msg, type = 'info') {
    const bg  = { success:'#d1fae5', error:'#fee2e2', warning:'#fef3c7', info:'#dbeafe' }[type] || '#dbeafe';
    const col = { success:'#065f46', error:'#991b1b', warning:'#92400e', info:'#1e40af' }[type] || '#1e40af';
    // Remove toast anterior
    document.querySelectorAll('.insc-toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = 'insc-toast';
    el.style.background = bg;
    el.style.color = col;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  },
};

document.addEventListener('DOMContentLoaded', () => Inscricao.init());
