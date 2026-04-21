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
 */
const EmailJSConfig = {
  SERVICE_ID:  '',   // ex: 'service_abc123'  — mesmo para todos os templates
  PUBLIC_KEY:  '',   // ex: 'AbCdEfGhIjK...'  — chave pública da conta

  TEMPLATES: {
    tarefa:    '',   // ex: 'template_tarefa01'   — notificação de tarefa em evento
    matricula: '',   // ex: 'template_matricula01' — confirmação de matrícula
    // Adicione novos templates aqui conforme necessário:
    // cobranca:  '',
    // aniversario: '',
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
