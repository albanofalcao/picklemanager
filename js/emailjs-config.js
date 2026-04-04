'use strict';

/**
 * EmailJS — configuração centralizada
 *
 * Para ativar:
 *  1. Crie conta gratuita em https://emailjs.com
 *  2. Adicione um serviço de e-mail (ex: Gmail)
 *  3. Crie um template com as variáveis abaixo
 *  4. Preencha SERVICE_ID, TEMPLATE_ID e PUBLIC_KEY
 *
 * Variáveis usadas no template EmailJS:
 *   {{to_email}}     — e-mail do destinatário
 *   {{to_name}}      — nome do responsável
 *   {{evento_nome}}  — nome do evento
 *   {{tarefa}}       — descrição da tarefa
 *   {{data_inicio}}  — data de início (ou vazio)
 *   {{prazo}}        — prazo (ou vazio)
 */
const EmailJSConfig = {
  SERVICE_ID:  '',   // ex: 'service_abc123'
  TEMPLATE_ID: '',   // ex: 'template_xyz789'
  PUBLIC_KEY:  '',   // ex: 'user_AbCdEf...'

  get ativo() {
    return !!(this.SERVICE_ID && this.TEMPLATE_ID && this.PUBLIC_KEY);
  },

  init() {
    if (this.ativo) {
      emailjs.init(this.PUBLIC_KEY);
    }
  },

  /**
   * Envia e-mail via EmailJS.
   * Retorna Promise<boolean> — true se enviou, false se não configurado ou erro.
   */
  async enviar(params) {
    if (!this.ativo) return false;
    try {
      await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ID, params);
      return true;
    } catch (err) {
      console.warn('EmailJS erro:', err);
      return false;
    }
  },
};

// Inicializa ao carregar
document.addEventListener('DOMContentLoaded', () => EmailJSConfig.init());
