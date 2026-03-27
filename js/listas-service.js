'use strict';

/**
 * ListasService — Gerenciamento centralizado de listas configuráveis.
 * Carregado antes dos módulos. Cada lista pode ser sobrescrita via admin.
 */
const ListasService = {
  _STORAGE_KEY: 'listas_config',

  /* ------------------------------------------------------------------
   * Defaults — usados quando o usuário não personalizou a lista
   * Cada item: { v: 'valor_chave', l: 'Label exibido' }
   * ------------------------------------------------------------------ */
  DEFAULTS: {
    arenas_tipo: {
      label:  'Tipo de Arena',
      modulo: 'Arenas',
      itens:  [
        { v: 'indoor',  l: 'Indoor (Coberta)'     },
        { v: 'outdoor', l: 'Outdoor (Descoberta)' },
      ],
    },
    arenas_piso: {
      label:  'Tipo de Piso',
      modulo: 'Arenas',
      itens:  [
        { v: 'sintetico', l: 'Sintético' },
        { v: 'madeira',   l: 'Madeira'   },
        { v: 'concreto',  l: 'Concreto'  },
        { v: 'outro',     l: 'Outro'     },
      ],
    },
    alunos_nivel: {
      label:  'Nível do Aluno',
      modulo: 'Alunos',
      itens:  [
        { v: 'iniciante',     l: 'Iniciante'     },
        { v: 'intermediario', l: 'Intermediário' },
        { v: 'avancado',      l: 'Avançado'      },
        { v: 'profissional',  l: 'Profissional'  },
      ],
    },
    manutencao_tipo: {
      label:  'Tipo de Manutenção',
      modulo: 'Manutenção',
      itens:  [
        { v: 'eletrica',    l: 'Elétrica'     },
        { v: 'hidraulica',  l: 'Hidráulica'   },
        { v: 'piso',        l: 'Piso / Quadra'},
        { v: 'equipamento', l: 'Equipamento'  },
        { v: 'pintura',     l: 'Pintura'      },
        { v: 'limpeza',     l: 'Limpeza'      },
        { v: 'estrutural',  l: 'Estrutural'   },
        { v: 'outro',       l: 'Outro'        },
      ],
    },
    manutencao_prioridade: {
      label:  'Prioridade',
      modulo: 'Manutenção',
      itens:  [
        { v: 'baixa',   l: 'Baixa'   },
        { v: 'media',   l: 'Média'   },
        { v: 'alta',    l: 'Alta'    },
        { v: 'urgente', l: 'Urgente' },
      ],
    },
    manutencao_frequencia: {
      label:  'Frequência Preventiva',
      modulo: 'Manutenção',
      itens:  [
        { v: 'semanal',    l: 'Semanal',    dias: 7   },
        { v: 'quinzenal',  l: 'Quinzenal',  dias: 14  },
        { v: 'mensal',     l: 'Mensal',     dias: 30  },
        { v: 'trimestral', l: 'Trimestral', dias: 90  },
        { v: 'semestral',  l: 'Semestral',  dias: 180 },
        { v: 'anual',      l: 'Anual',      dias: 365 },
      ],
    },
    planos_tipo: {
      label:  'Tipo de Plano',
      modulo: 'Planos',
      itens:  [
        { v: 'mensal',     l: 'Mensal'       },
        { v: 'trimestral', l: 'Trimestral'   },
        { v: 'semestral',  l: 'Semestral'    },
        { v: 'anual',      l: 'Anual'        },
        { v: 'avulso',     l: 'Aula Avulsa'  },
      ],
    },
    planos_modalidade: {
      label:  'Modalidade',
      modulo: 'Planos',
      itens:  [
        { v: 'individual', l: 'Individual'    },
        { v: 'dupla',      l: 'Dupla'         },
        { v: 'grupo',      l: 'Grupo'         },
        { v: 'livre',      l: 'Acesso Livre'  },
      ],
    },
    financeiro_cat_receita: {
      label:  'Categoria de Receita',
      modulo: 'Financeiro',
      itens:  [
        { v: 'mensalidade',       l: 'Mensalidade'         },
        { v: 'inscricao_evento',  l: 'Inscrição em Evento' },
        { v: 'aula_avulsa',       l: 'Aula Avulsa'         },
        { v: 'pacote',            l: 'Pacote de Aulas'     },
        { v: 'outro_r',           l: 'Outro'               },
      ],
    },
    financeiro_cat_despesa: {
      label:  'Categoria de Despesa',
      modulo: 'Financeiro',
      itens:  [
        { v: 'manutencao',   l: 'Manutenção'            },
        { v: 'equipamentos', l: 'Equipamentos'           },
        { v: 'salarios',     l: 'Salários'               },
        { v: 'aluguel',      l: 'Aluguel'                },
        { v: 'utilities',    l: 'Água / Luz / Internet'  },
        { v: 'outro_d',      l: 'Outro'                  },
      ],
    },
    eventos_tipo: {
      label:  'Tipo de Evento',
      modulo: 'Eventos',
      itens:  [
        { v: 'torneio',    l: 'Torneio'           },
        { v: 'campeonato', l: 'Campeonato'         },
        { v: 'clinica',    l: 'Clínica / Workshop' },
        { v: 'social',     l: 'Jogo Social'        },
        { v: 'amistoso',   l: 'Amistoso'           },
      ],
    },
    eventos_nivel: {
      label:  'Nível do Evento',
      modulo: 'Eventos',
      itens:  [
        { v: 'aberto',        l: 'Aberto a todos' },
        { v: 'iniciante',     l: 'Iniciante'      },
        { v: 'intermediario', l: 'Intermediário'  },
        { v: 'avancado',      l: 'Avançado'       },
        { v: 'profissional',  l: 'Profissional'   },
      ],
    },
    aulas_tipo: {
      label:  'Tipo de Aula',
      modulo: 'Aulas',
      itens:  [
        { v: 'individual', l: 'Individual' },
        { v: 'dupla',      l: 'Dupla'      },
        { v: 'grupo',      l: 'Grupo'      },
      ],
    },
    aulas_nivel: {
      label:  'Nível da Aula',
      modulo: 'Aulas',
      itens:  [
        { v: 'iniciante',     l: 'Iniciante'     },
        { v: 'intermediario', l: 'Intermediário' },
        { v: 'avancado',      l: 'Avançado'      },
        { v: 'profissional',  l: 'Profissional'  },
      ],
    },
    professores_especialidade: {
      label:  'Especialidade do Professor',
      modulo: 'Professores',
      itens:  [
        { v: 'iniciante',     l: 'Iniciante'     },
        { v: 'intermediario', l: 'Intermediário' },
        { v: 'avancado',      l: 'Avançado'      },
        { v: 'todos',         l: 'Todos os níveis' },
      ],
    },
  },

  /* ------------------------------------------------------------------
   * Leitura
   * ------------------------------------------------------------------ */

  /** Retorna itens da lista (config personalizada OU default) */
  get(chave) {
    const config = this._loadConfig();
    const base   = this.DEFAULTS[chave];
    if (!base) return [];
    if (config[chave]) return config[chave];
    return base.itens;
  },

  /** Retorna itens como objeto { valor: label } para compatibilidade */
  getAsObj(chave) {
    return Object.fromEntries(this.get(chave).map(i => [i.v, i.l]));
  },

  /** Gera <option> tags para um <select>
   *  @param {string} chave - ex: 'arenas_tipo'
   *  @param {string} [selected] - valor selecionado
   *  @param {string} [placeholder] - texto da opção vazia (omite se null)
   */
  opts(chave, selected = '', placeholder = null) {
    const itens = this.get(chave);
    const blank = placeholder !== null
      ? `<option value="">${placeholder}</option>` : '';
    return blank + itens.map(i =>
      `<option value="${i.v}" ${selected === i.v ? 'selected' : ''}>${i.l}</option>`
    ).join('');
  },

  /** Retorna label de um valor */
  label(chave, valor) {
    const item = this.get(chave).find(i => i.v === valor);
    return item ? item.l : valor || '—';
  },

  /* ------------------------------------------------------------------
   * Escrita
   * ------------------------------------------------------------------ */

  /** Salva lista personalizada */
  set(chave, itens) {
    const config = this._loadConfig();
    config[chave] = itens;
    this._saveConfig(config);
  },

  /** Reseta lista para o default */
  reset(chave) {
    const config = this._loadConfig();
    delete config[chave];
    this._saveConfig(config);
  },

  isCustomized(chave) {
    const config = this._loadConfig();
    return !!config[chave];
  },

  /* ------------------------------------------------------------------
   * Internos
   * ------------------------------------------------------------------ */

  _loadConfig() {
    try {
      const raw = localStorage.getItem('pm_listas_config');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  },

  _saveConfig(data) {
    localStorage.setItem('pm_listas_config', JSON.stringify(data));
  },
};
