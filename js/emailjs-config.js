'use strict';

/**
 * EmailJS — configuração centralizada
 *
 * Para ativar:
 *  1. Crie conta gratuita em https://emailjs.com
 *  2. Adicione um serviço de e-mail (ex: Gmail)
 *  3. Crie um template para cada finalidade abaixo
 *  4. Preencha SERVICE_ID, PUBLIC_KEY e os TEMPLATE_IDs
 *
 * Variáveis por template:
 *
 *  tarefa:
 *    {{to_email}} {{to_name}} {{evento_nome}} {{tarefa}}
 *    {{data_inicio}} {{prazo}} {{observacao}}
 *
 *  matricula:
 *    {{to_email}} {{to_name}} {{academia}} {{plano}}
 *    {{data_inicio}} {{data_fim}}
 *
 *  cobranca:
 *    {{to_email}} {{to_name}} {{academia}} {{plano}}
 *    {{valor}} {{data_vencimento}} {{chave_pix}}
 */
const EmailJSConfig = {
  SERVICE_ID:  'service_dil9kl8',
  PUBLIC_KEY:  'a6B9_YV5dSn2nxRiW',

  TEMPLATES: {
    tarefa:    'template_lv9zkfw',   // notificação de tarefa em evento
    matricula: 'template_6uq8x6b',   // confirmação de matrícula
    cobranca:  '',                    // lembrete de cobrança — crie em emailjs.com e cole o ID aqui
  },

  get ativo() {
    return !!(this.SERVICE_ID && this.PUBLIC_KEY);
  },

  templateAtivo(chave) {
    return this.ativo && !!(this.TEMPLATES[chave]);
  },

  init() {
    if (this.ativo) {
      emailjs.init(this.PUBLIC_KEY);
      console.log('EmailJS inicializado.');
    }
  },

  /**
   * Envia e-mail via EmailJS.
   * @param {string} chave  — chave do template em TEMPLATES (ex: 'tarefa')
   * @param {object} params — variáveis do template
   * @returns {Promise<boolean>} true se enviou com sucesso
   */
  async enviar(chave, params) {
    if (!this.templateAtivo(chave)) return false;
    try {
      await emailjs.send(this.SERVICE_ID, this.TEMPLATES[chave], params);
      return true;
    } catch (err) {
      console.warn(`EmailJS [${chave}] erro:`, err);
      return false;
    }
  },
};

// Inicializa ao carregar
document.addEventListener('DOMContentLoaded', () => EmailJSConfig.init());
