'use strict';

/* ============================================================
   SaldoService — Saldo de aulas por plano/mês
   ============================================================ */
const SaldoService = {
  /** Retorna saldo do aluno no mês informado (YYYY-MM). Se mesAno omitido, usa mês atual. */
  getSaldo(alunoId, mesAno) {
    if (!mesAno) mesAno = new Date().toISOString().slice(0, 7);

    // Matrícula ativa
    const matricula = Storage.getAll('matriculas')
      .filter(m => m.alunoId === alunoId && m.status === 'ativa')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];

    if (!matricula) return { total: 0, usado: 0, disponivel: 0, matricula: null, plano: null, avulso: false };

    const plano = Storage.getById('planos', matricula.planoId);
    const total = plano ? (parseInt(plano.aulasIncluidas) || 0) : 0;

    // Planos avulso/pacote: saldo total acumulado (não reseta por mês)
    const isAvulso = plano && (plano.tipo === 'avulso' || plano.tipo === 'pacote');

    const aulaIds = isAvulso
      ? Storage.getAll('aulas').map(a => a.id)                                    // todas as aulas ever
      : Storage.getAll('aulas').filter(a => a.data && a.data.slice(0, 7) === mesAno).map(a => a.id); // só do mês

    const usado = Storage.getAll('presencas')
      .filter(p => p.alunoId === alunoId && p.presente === true && aulaIds.includes(p.aulaId))
      .length;

    return { total, usado, disponivel: Math.max(0, total - usado), matricula, plano, avulso: isAvulso };
  },

  /** Renderiza badge compacto de saldo */
  badgeSaldo(alunoId, mesAno) {
    const s = this.getSaldo(alunoId, mesAno);
    if (!s.total) return `<span class="badge badge-gray saldo-badge">Sem plano</span>`;
    const pct = s.total > 0 ? (s.usado / s.total) : 0;
    const cls = pct >= 1 ? 'badge-danger' : pct >= 0.75 ? 'badge-warning' : 'badge-success';
    const label = s.avulso ? `${s.disponivel}/${s.total} avulsas` : `${s.disponivel}/${s.total} aulas`;
    return `<span class="badge ${cls} saldo-badge" title="${s.avulso ? 'Saldo total de aulas avulsas' : 'Saldo de aulas — ' + mesAno}">${label}</span>`;
  },

  /** Renderiza barra de progresso de saldo */
  barSaldo(alunoId, mesAno) {
    const s = this.getSaldo(alunoId, mesAno);
    if (!s.total) return `<div class="saldo-vazio">Sem plano ativo</div>`;
    const pct  = Math.min(100, Math.round((s.usado / s.total) * 100));
    const cor  = pct >= 100 ? '#dc2626' : pct >= 75 ? '#d97706' : '#16a34a';
    const mes  = mesAno || new Date().toISOString().slice(0, 7);
    const [y, m] = mes.split('-');
    const mesLabel = new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const tituloLabel = s.avulso ? 'Aulas avulsas — saldo total' : `Aulas — ${mesLabel}`;
    return `
      <div class="saldo-bar-wrap">
        <div class="saldo-bar-header">
          <span class="saldo-bar-label">${tituloLabel}</span>
          <span class="saldo-bar-nums" style="color:${cor}">${s.usado} usada${s.usado !== 1 ? 's' : ''} de ${s.total}</span>
        </div>
        <div class="saldo-bar-track">
          <div class="saldo-bar-fill" style="width:${pct}%;background:${cor};"></div>
        </div>
        <div class="saldo-bar-plano">${s.plano ? s.plano.nome : ''}</div>
        ${s.avulso && s.disponivel === 0 ? `<div style="font-size:11px;color:#dc2626;margin-top:4px;">⚠️ Saldo esgotado — matrícula será encerrada</div>` : ''}
      </div>`;
  },
};

/**
 * App — Bootstrap: seed data, sidebar, date, route registration, init
 */
const App = {

  NAV_ITEMS: [
    { route: 'dashboard',   icon: '📊', label: 'Dashboard'            },
    { route: 'alunos',      icon: '👥', label: 'Alunos'              },
    { route: 'matriculas',  icon: '🎫', label: 'Matrículas'          },
    { route: 'planos',      icon: '📋', label: 'Planos de Contratação'},
    { route: 'professores', icon: '🎓', label: 'Professores'         },
    { route: 'turmas',      icon: '🏸', label: 'Aulas'               },
    { route: 'eventos',     icon: '🏆', label: 'Eventos'             },
    { route: 'loja',        icon: '🛒', label: 'Loja'                },
    { route: 'dayuse',      icon: '🚪', label: 'Day Use'             },
    { route: 'financeiro',  icon: '💰', label: 'Financeiro'          },
    { route: 'manutencao',  icon: '🔧', label: 'Manutenção'          },
    { route: 'relatorios',  icon: '📈', label: 'Relatórios'          },
    { route: 'cadastros',   icon: '🗂️', label: 'Cadastros'           },
    { route: 'admin',       icon: '⚙️', label: 'Administração'       },
  ],

  // Nav específico para o tenant Matriz (visão consolidada)
  NAV_ITEMS_MATRIZ: [
    { route: 'dashboard',   icon: '📊', label: 'Dashboard'            },
    { route: 'arenas',      icon: '🏫', label: 'Arenas'               },
    { route: 'alunos',      icon: '👥', label: 'Alunos (rede)'        },
    { route: 'financeiro',  icon: '💰', label: 'Financeiro'           },
    { route: 'loja',        icon: '🛒', label: 'Loja Central'         },
    { route: 'relatorios',  icon: '📈', label: 'Relatórios'           },
    { route: 'admin',       icon: '⚙️', label: 'Administração'        },
  ],

  SEED_PERFIS: [
    { key: 'admin',         label: 'Administrador',    descricao: 'Acesso total ao sistema, incluindo gestão de usuários',    cor: 'badge-danger',  modulos: ['dashboard','arenas','alunos','matriculas','planos','professores','turmas','eventos','loja','dayuse','financeiro','manutencao','relatorios','cadastros','admin'] },
    { key: 'gerente',       label: 'Gerente',          descricao: 'Acesso a todos os módulos operacionais',                   cor: 'badge-warning', modulos: ['dashboard','arenas','alunos','matriculas','planos','professores','turmas','eventos','loja','dayuse','financeiro','manutencao','relatorios','cadastros'] },
    { key: 'recepcionista', label: 'Recepcionista',    descricao: 'Atendimento ao aluno, matrículas e turmas',               cor: 'badge-blue',    modulos: ['dashboard','alunos','matriculas','turmas','eventos','loja','dayuse','manutencao'] },
    { key: 'financeiro',    label: 'Financeiro',       descricao: 'Controle financeiro e planos de contratação',              cor: 'badge-success', modulos: ['dashboard','financeiro','planos','alunos','loja','dayuse','relatorios','manutencao'] },
    { key: 'manutencao',    label: 'Manutenção',       descricao: 'Gestão de arenas e chamados de manutenção',               cor: 'badge-gray',    modulos: ['dashboard','arenas','manutencao'] },
    { key: 'professor',     label: 'Professor',        descricao: 'Acesso às grades e aulas do próprio professor',            cor: 'badge-blue',    modulos: ['turmas','manutencao'] },
    { key: 'aluno',         label: 'Aluno',            descricao: 'Acesso às grades e aulas em que está inscrito',             cor: 'badge-success', modulos: ['turmas','manutencao'] },
  ],

  SEED_USUARIOS: [
    { nome: 'Administrador',    login: 'admin',       email: 'admin@pickle.com',    perfil: 'admin',         status: 'ativo',   senha: 'YWRtaW4xMjM=' },
    { nome: 'João Gerente',     login: 'gerente',     email: 'gerente@pickle.com',  perfil: 'gerente',       status: 'ativo',   senha: 'MTIzNDU2'     },
    { nome: 'Maria Recepção',   login: 'recepcao',    email: 'recepcao@pickle.com', perfil: 'recepcionista', status: 'ativo',   senha: 'MTIzNDU2'     },
    { nome: 'Pedro Financeiro', login: 'financ',      email: 'fin@pickle.com',      perfil: 'financeiro',    status: 'ativo',   senha: 'MTIzNDU2'     },
    { nome: 'Carlos Manutenção',login: 'manut',       email: 'manut@pickle.com',    perfil: 'manutencao',    status: 'inativo', senha: 'MTIzNDU2'     },
    { nome: 'Ricardo Alves',    login: 'prof.ricardo',email: 'prof@pickle.com',     perfil: 'professor',     status: 'ativo',   senha: 'cHJvZjEyMw==' },
    { nome: 'Ana Paula Ferreira',login: 'ana.paula',  email: 'aluno@pickle.com',    perfil: 'aluno',         status: 'ativo',   senha: 'YWx1bm8xMjM=' },
  ],

  SEED_ARENAS: [
    { nome: 'Arena Central', codigo: 'AC', tipo: 'indoor',   capacidade: 4, dimensoes: '6.10m × 13.72m', piso: 'sintetico', status: 'ativa',      iluminacao: true,  observacoes: 'Arena principal da academia.' },
    { nome: 'Arena Norte',   codigo: 'AN', tipo: 'indoor',   capacidade: 4, dimensoes: '6.10m × 13.72m', piso: 'madeira',   status: 'ativa',      iluminacao: true,  observacoes: 'Piso de madeira especial para competições.' },
    { nome: 'Arena Sul',     codigo: 'AS', tipo: 'outdoor',  capacidade: 4, dimensoes: '6.10m × 13.72m', piso: 'concreto',  status: 'manutencao', iluminacao: false, observacoes: 'Em reforma — previsão de conclusão: 30/04/2025.' },
    { nome: 'Arena VIP',     codigo: 'AV', tipo: 'indoor',   capacidade: 4, dimensoes: '8.00m × 16.00m', piso: 'sintetico', status: 'inativa',    iluminacao: true,  observacoes: 'Reservada para eventos especiais e torneios.' },
  ],

  SEED_ALUNOS: [
    { nome: 'Ana Paula Ferreira',  cpf: '123.456.789-00', email: 'ana@email.com',      telefone: '(11) 98765-4321', dataNascimento: '1990-03-15', nivel: 'intermediario', status: 'ativo',    observacoes: 'Aluna dedicada, pratica 3x por semana.' },
    { nome: 'Carlos Eduardo Lima', cpf: '987.654.321-00', email: 'carlos@email.com',   telefone: '(11) 91234-5678', dataNascimento: '1985-07-22', nivel: 'avancado',      status: 'ativo',    observacoes: 'Participa de torneios regionais.' },
    { nome: 'Mariana Costa',       cpf: '456.789.123-00', email: 'mari@email.com',     telefone: '(11) 99988-7766', dataNascimento: '1998-11-05', nivel: 'iniciante',     status: 'ativo',    observacoes: '' },
    { nome: 'Roberto Souza',       cpf: '321.654.987-00', email: 'roberto@email.com',  telefone: '(11) 97755-3344', dataNascimento: '1975-01-30', nivel: 'intermediario', status: 'suspenso', observacoes: 'Suspensão por inadimplência.' },
    { nome: 'Fernanda Oliveira',   cpf: '654.321.098-00', email: 'fe@email.com',       telefone: '(11) 96644-2211', dataNascimento: '2000-06-18', nivel: 'iniciante',     status: 'inativo',  observacoes: 'Mudou de cidade.' },
    { nome: 'Luciana Barbosa',     cpf: '111.333.555-77', email: 'lu@email.com',       telefone: '(11) 98800-1122', dataNascimento: '1993-04-10', nivel: 'intermediario', status: 'ativo',    observacoes: '' },
    { nome: 'Rafael Mendes',       cpf: '222.444.666-88', email: 'rafa@email.com',     telefone: '(11) 97711-2233', dataNascimento: '1988-09-25', nivel: 'avancado',      status: 'ativo',    observacoes: 'Jogador competitivo — 3 torneios em 2025.' },
    { nome: 'Patrícia Santos',     cpf: '333.555.777-99', email: 'pati@email.com',     telefone: '(11) 96622-3344', dataNascimento: '1995-02-14', nivel: 'iniciante',     status: 'ativo',    observacoes: '' },
    { nome: 'Diego Carvalho',      cpf: '444.666.888-00', email: 'diego@email.com',    telefone: '(11) 95533-4455', dataNascimento: '1982-12-03', nivel: 'intermediario', status: 'ativo',    observacoes: 'Preferência por aulas no período da manhã.' },
    { nome: 'Vanessa Lima',        cpf: '555.777.999-11', email: 'vane@email.com',     telefone: '(11) 94444-5566', dataNascimento: '2001-07-30', nivel: 'iniciante',     status: 'ativo',    observacoes: '' },
    { nome: 'Eduardo Machado',     cpf: '666.888.000-22', email: 'edu@email.com',      telefone: '(11) 93355-6677', dataNascimento: '1979-11-18', nivel: 'avancado',      status: 'ativo',    observacoes: 'Ex-tenista adaptando técnica para pickleball.' },
    { nome: 'Camila Ferreira',     cpf: '777.999.111-33', email: 'cami@email.com',     telefone: '(11) 92266-7788', dataNascimento: '1997-05-22', nivel: 'iniciante',     status: 'ativo',    observacoes: '' },
    { nome: 'Bruno Nascimento',    cpf: '888.000.222-44', email: 'bruno@email.com',    telefone: '(11) 91177-8899', dataNascimento: '1991-08-07', nivel: 'intermediario', status: 'ativo',    observacoes: '' },
    { nome: 'Juliana Rodrigues',   cpf: '999.111.333-55', email: 'juju@email.com',     telefone: '(11) 99088-9900', dataNascimento: '1986-03-19', nivel: 'avancado',      status: 'ativo',    observacoes: 'Treina para o Open Nacional.' },
    { nome: 'Thiago Alves',        cpf: '000.222.444-66', email: 'thi@email.com',      telefone: '(11) 98199-0011', dataNascimento: '1994-10-11', nivel: 'intermediario', status: 'ativo',    observacoes: '' },
    { nome: 'Amanda Gomes',        cpf: '111.444.777-00', email: 'amanda@email.com',   telefone: '(11) 97200-1122', dataNascimento: '2002-01-28', nivel: 'iniciante',     status: 'ativo',    observacoes: 'Primeira academia de esporte.' },
    { nome: 'Marcelo Oliveira',    cpf: '222.555.888-11', email: 'marce@email.com',    telefone: '(11) 96311-2233', dataNascimento: '1977-06-15', nivel: 'intermediario', status: 'ativo',    observacoes: '' },
    { nome: 'Renata Costa',        cpf: '333.666.999-22', email: 'rena@email.com',     telefone: '(11) 95422-3344', dataNascimento: '1989-09-02', nivel: 'avancado',      status: 'ativo',    observacoes: 'Capitã da equipe feminina nos torneios.' },
    { nome: 'André Souza',         cpf: '444.777.000-33', email: 'andre@email.com',    telefone: '(11) 94533-4455', dataNascimento: '1983-04-27', nivel: 'iniciante',     status: 'suspenso', observacoes: 'Suspensão temporária — aguardando regularização.' },
    { nome: 'Bianca Martins',      cpf: '555.888.111-44', email: 'bi@email.com',       telefone: '(11) 93644-5566', dataNascimento: '2003-12-09', nivel: 'iniciante',     status: 'ativo',    observacoes: '' },
  ],

  SEED_PROFESSORES: [
    { nome: 'Ricardo Alves',     cpf: '111.222.333-44', email: 'ricardo@pickle.com',  telefone: '(11) 97000-1111', especialidade: 'avancado',      status: 'ativo',   horarioInicio: '07:00', horarioFim: '12:00', diasDisponiveis: ['seg','ter','qua','qui','sex'],         observacoes: 'Ex-atleta profissional.' },
    { nome: 'Juliana Matos',     cpf: '555.666.777-88', email: 'ju@pickle.com',       telefone: '(11) 96000-2222', especialidade: 'iniciantes',    status: 'ativo',   horarioInicio: '13:00', horarioFim: '18:00', diasDisponiveis: ['seg','qua','sex'],                     observacoes: 'Especialista em turmas iniciantes.' },
    { nome: 'Paulo Henrique',    cpf: '999.000.111-22', email: 'paulo@pickle.com',    telefone: '(11) 95000-3333', especialidade: 'infantil',      status: 'ativo',   horarioInicio: '08:00', horarioFim: '13:00', diasDisponiveis: ['ter','qui','sab'],                     observacoes: '' },
    { nome: 'Sandra Rocha',      cpf: '333.444.555-66', email: 'sandra@pickle.com',   telefone: '(11) 94000-4444', especialidade: 'competicao',    status: 'ferias',  horarioInicio: '06:00', horarioFim: '11:00', diasDisponiveis: ['seg','ter','qua','qui','sex','sab'],   observacoes: 'Retorna em 15/04.' },
    { nome: 'Thiago Cardoso',    cpf: '777.888.999-00', email: 'thiago@pickle.com',   telefone: '(11) 93000-5555', especialidade: 'fisioterapia',  status: 'inativo', horarioInicio: '',      horarioFim: '',      diasDisponiveis: [],                                     observacoes: 'Licença médica.' },
    { nome: 'Fernanda Lima',     cpf: '112.233.344-55', email: 'fernandalima@pickle.com', telefone: '(11) 92100-6666', especialidade: 'intermediario', status: 'ativo', horarioInicio: '14:00', horarioFim: '20:00', diasDisponiveis: ['seg','ter','qua','qui','sex'],     observacoes: '' },
    { nome: 'Carlos Nunes',      cpf: '223.344.455-66', email: 'carlosnunes@pickle.com',  telefone: '(11) 91200-7777', especialidade: 'avancado',      status: 'ativo', horarioInicio: '06:00', horarioFim: '12:00', diasDisponiveis: ['seg','qua','sex'],             observacoes: 'Treinador de alto rendimento.' },
    { nome: 'Beatriz Tavares',   cpf: '334.455.566-77', email: 'bea@pickle.com',          telefone: '(11) 90300-8888', especialidade: 'iniciantes',    status: 'ativo', horarioInicio: '07:00', horarioFim: '13:00', diasDisponiveis: ['ter','qui','sab'],             observacoes: '' },
    { nome: 'Rodrigo Fonseca',   cpf: '445.566.677-88', email: 'rodrigo@pickle.com',      telefone: '(11) 99400-9999', especialidade: 'competicao',    status: 'ativo', horarioInicio: '05:30', horarioFim: '10:00', diasDisponiveis: ['seg','ter','qua','qui','sex'], observacoes: 'Treinador da seleção estadual.' },
    { nome: 'Isabela Campos',    cpf: '556.677.788-99', email: 'isa@pickle.com',           telefone: '(11) 98500-0000', especialidade: 'intermediario', status: 'ativo', horarioInicio: '15:00', horarioFim: '20:00', diasDisponiveis: ['qua','qui','sex','sab'],       observacoes: '' },
    { nome: 'Marcos Vieira',     cpf: '667.788.899-00', email: 'marcos@pickle.com',        telefone: '(11) 97600-1111', especialidade: 'avancado',      status: 'ativo', horarioInicio: '07:00', horarioFim: '13:00', diasDisponiveis: ['seg','ter','qua'],             observacoes: '' },
    { nome: 'Larissa Pinto',     cpf: '778.899.900-11', email: 'larissa@pickle.com',       telefone: '(11) 96700-2222', especialidade: 'iniciantes',    status: 'ativo', horarioInicio: '09:00', horarioFim: '15:00', diasDisponiveis: ['seg','qua','sex'],             observacoes: 'Certificada pela USAPA.' },
    { nome: 'Anderson Costa',    cpf: '889.900.011-22', email: 'anderson@pickle.com',      telefone: '(11) 95800-3333', especialidade: 'fisioterapia',  status: 'ativo', horarioInicio: '08:00', horarioFim: '12:00', diasDisponiveis: ['ter','qui'],                   observacoes: 'Fisioterapeuta esportivo.' },
    { nome: 'Priscila Mendes',   cpf: '900.011.122-33', email: 'pri@pickle.com',           telefone: '(11) 94900-4444', especialidade: 'infantil',      status: 'ativo', horarioInicio: '13:00', horarioFim: '17:00', diasDisponiveis: ['seg','ter','qua','qui','sex'], observacoes: '' },
    { nome: 'Gabriel Santos',    cpf: '011.122.233-44', email: 'gabriel@pickle.com',       telefone: '(11) 93000-5555', especialidade: 'competicao',    status: 'ativo', horarioInicio: '06:00', horarioFim: '12:00', diasDisponiveis: ['seg','ter','qua','qui','sex','sab'], observacoes: 'Campeão estadual 2025.' },
    { nome: 'Natalia Ramos',     cpf: '122.233.344-55', email: 'nat@pickle.com',           telefone: '(11) 92100-6666', especialidade: 'intermediario', status: 'ferias', horarioInicio: '14:00', horarioFim: '19:00', diasDisponiveis: ['ter','qui','sex'],           observacoes: 'Retorna em 01/05.' },
    { nome: 'Felipe Moraes',     cpf: '233.344.455-66', email: 'felipe@pickle.com',        telefone: '(11) 91200-7777', especialidade: 'avancado',      status: 'ativo', horarioInicio: '07:00', horarioFim: '14:00', diasDisponiveis: ['seg','qua','qui','sex'],       observacoes: '' },
    { nome: 'Viviane Correia',   cpf: '344.455.566-77', email: 'vivi@pickle.com',          telefone: '(11) 90300-8888', especialidade: 'iniciantes',    status: 'ativo', horarioInicio: '16:00', horarioFim: '20:00', diasDisponiveis: ['seg','ter','qua','qui','sex'], observacoes: '' },
    { nome: 'Leonardo Barros',   cpf: '455.566.677-88', email: 'leo@pickle.com',           telefone: '(11) 99400-9999', especialidade: 'competicao',    status: 'inativo', horarioInicio: '', horarioFim: '', diasDisponiveis: [],                                     observacoes: 'Afastado para preparação de equipe.' },
    { nome: 'Cristiane Freitas', cpf: '566.677.788-99', email: 'cris@pickle.com',          telefone: '(11) 98500-0000', especialidade: 'infantil',      status: 'ativo', horarioInicio: '08:00', horarioFim: '14:00', diasDisponiveis: ['seg','qua','sex','sab'],       observacoes: 'Especialidade em metodologia lúdica.' },
  ],

  SEED_PLANOS: [
    { nome: 'Mensalidade Iniciante',     tipo: 'mensal',  modalidade: 'grupo',      valor: 249.90,  aulasIncluidas: 8,  status: 'ativo',   beneficios: 'Acesso a todas as arenas\n8 aulas em grupo por mês\nAvaliação inicial gratuita',                       descricao: 'Plano ideal para quem está começando.' },
    { nome: 'Mensalidade Intermediário', tipo: 'mensal',  modalidade: 'dupla',      valor: 389.90,  aulasIncluidas: 12, status: 'ativo',   beneficios: 'Acesso a todas as arenas\n12 aulas em dupla por mês\nFeedback mensal de evolução',                     descricao: 'Para alunos com base consolidada.' },
    { nome: 'Mensalidade Avançado',      tipo: 'mensal',  modalidade: 'individual', valor: 589.90,  aulasIncluidas: 16, status: 'ativo',   beneficios: 'Acesso VIP às arenas\n16 aulas individuais por mês\nPreparação para torneios\nVídeo-análise de jogos', descricao: 'Treino personalizado para alto rendimento.' },
    { nome: 'Pacote 10 Aulas',           tipo: 'pacote',  modalidade: 'individual', valor: 450.00,  aulasIncluidas: 10, status: 'ativo',   beneficios: '10 aulas individuais\nValidade de 60 dias\nFlexibilidade de horário',                                   descricao: 'Pacote flexível sem mensalidade.' },
    { nome: 'Aula Avulsa',               tipo: 'avulso',  modalidade: 'individual', valor: 60.00,   aulasIncluidas: 1,  status: 'ativo',   beneficios: 'Aula individual\nSem compromisso de continuidade',                                                      descricao: 'Para experimentar sem compromisso.' },
    { nome: 'Plano Anual VIP',           tipo: 'anual',   modalidade: 'livre',      valor: 3599.90, aulasIncluidas: 0,  status: 'pausado', beneficios: 'Acesso ilimitado a todas as arenas\nParticipação em todos os eventos\nKit de equipamentos incluso',      descricao: 'Plano temporariamente suspenso para revisão de preços.' },
  ],

  SEED_AULAS: [
    { titulo: 'Fundamentos do Saque',           tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Juliana Matos',   arenaId: '', arenaNome: 'Arena Central', data: '2026-04-21', horarioInicio: '08:00', horarioFim: '09:00', vagas: 6,  status: 'agendada',  observacoes: '' },
    { titulo: 'Táticas de Duplas',              tipo: 'dupla',      nivel: 'intermediario', professorId: '', professorNome: 'Ricardo Alves',   arenaId: '', arenaNome: 'Arena Norte',   data: '2026-04-22', horarioInicio: '10:00', horarioFim: '11:30', vagas: 4,  status: 'agendada',  observacoes: 'Focar em posicionamento na rede.' },
    { titulo: 'Treino Individual Avançado',     tipo: 'individual', nivel: 'avancado',      professorId: '', professorNome: 'Ricardo Alves',   arenaId: '', arenaNome: 'Arena Norte',   data: '2026-04-18', horarioInicio: '07:00', horarioFim: '08:00', vagas: 1,  status: 'concluida', observacoes: '' },
    { titulo: 'Turma Infantil — Iniciação',     tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Paulo Henrique',  arenaId: '', arenaNome: 'Arena Central', data: '2026-04-17', horarioInicio: '09:00', horarioFim: '10:00', vagas: 8,  status: 'concluida', observacoes: '' },
    { titulo: 'Preparação para Torneio',        tipo: 'grupo',      nivel: 'avancado',      professorId: '', professorNome: 'Ricardo Alves',   arenaId: '', arenaNome: 'Arena VIP',     data: '2026-04-15', horarioInicio: '06:00', horarioFim: '08:00', vagas: 4,  status: 'concluida', observacoes: 'Simulação de set completo.' },
    { titulo: 'Aula de Reposição — Grupo B',    tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Juliana Matos',   arenaId: '', arenaNome: 'Arena Central', data: '2026-04-14', horarioInicio: '14:00', horarioFim: '15:00', vagas: 6,  status: 'cancelada', observacoes: 'Cancelada por falta de quórum.' },
    { titulo: 'Fundamentos do Dink',            tipo: 'dupla',      nivel: 'iniciante',     professorId: '', professorNome: 'Juliana Matos',   arenaId: '', arenaNome: 'Arena Central', data: '2026-04-23', horarioInicio: '13:00', horarioFim: '14:00', vagas: 4,  status: 'agendada',  observacoes: '' },
    { titulo: 'Treino Físico + Técnica',        tipo: 'grupo',      nivel: 'profissional',  professorId: '', professorNome: 'Ricardo Alves',   arenaId: '', arenaNome: 'Arena Norte',   data: '2026-04-24', horarioInicio: '06:30', horarioFim: '08:30', vagas: 4,  status: 'agendada',  observacoes: 'Trazer roupas de treino físico.' },
    { titulo: 'Posicionamento na Quadra',       tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Fernanda Lima',   arenaId: '', arenaNome: 'Arena Norte',   data: '2026-04-21', horarioInicio: '09:30', horarioFim: '10:30', vagas: 6,  status: 'agendada',  observacoes: '' },
    { titulo: 'Técnica de Voleio',              tipo: 'dupla',      nivel: 'intermediario', professorId: '', professorNome: 'Carlos Nunes',    arenaId: '', arenaNome: 'Arena Central', data: '2026-04-22', horarioInicio: '19:00', horarioFim: '20:30', vagas: 4,  status: 'agendada',  observacoes: '' },
    { titulo: 'Turma Sênior 60+ — Mobilidade', tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Priscila Mendes', arenaId: '', arenaNome: 'Arena Central', data: '2026-04-17', horarioInicio: '10:00', horarioFim: '11:00', vagas: 8,  status: 'concluida', observacoes: '' },
    { titulo: 'Clínica de Saque Avançado',      tipo: 'grupo',      nivel: 'avancado',      professorId: '', professorNome: 'Rodrigo Fonseca', arenaId: '', arenaNome: 'Arena VIP',     data: '2026-04-19', horarioInicio: '07:00', horarioFim: '09:00', vagas: 6,  status: 'concluida', observacoes: '' },
    { titulo: 'Duplas Mistas — Estratégia',     tipo: 'dupla',      nivel: 'intermediario', professorId: '', professorNome: 'Carlos Nunes',    arenaId: '', arenaNome: 'Arena Norte',   data: '2026-04-25', horarioInicio: '10:00', horarioFim: '12:00', vagas: 8,  status: 'agendada',  observacoes: '' },
    { titulo: 'Turma Open — Jogo Livre',        tipo: 'grupo',      nivel: 'aberto',        professorId: '', professorNome: 'Gabriel Santos',  arenaId: '', arenaNome: 'Arena Central', data: '2026-04-26', horarioInicio: '14:00', horarioFim: '16:00', vagas: 12, status: 'agendada',  observacoes: '' },
    { titulo: 'Reabilitação com Bola',          tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Anderson Costa',  arenaId: '', arenaNome: 'Arena Central', data: '2026-04-21', horarioInicio: '11:00', horarioFim: '12:00', vagas: 4,  status: 'agendada',  observacoes: 'Protocolo adaptado.' },
    { titulo: 'Juvenil — Fundamentos',         tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Paulo Henrique',  arenaId: '', arenaNome: 'Arena Central', data: '2026-04-26', horarioInicio: '09:00', horarioFim: '10:00', vagas: 10, status: 'agendada',  observacoes: '' },
    { titulo: 'Feminino — Potência de Saque',  tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Larissa Pinto',   arenaId: '', arenaNome: 'Arena Norte',   data: '2026-04-22', horarioInicio: '18:00', horarioFim: '19:00', vagas: 6,  status: 'agendada',  observacoes: '' },
    { titulo: 'Competição — Simulado',         tipo: 'grupo',      nivel: 'profissional',  professorId: '', professorNome: 'Rodrigo Fonseca', arenaId: '', arenaNome: 'Arena VIP',     data: '2026-04-23', horarioInicio: '07:00', horarioFim: '09:00', vagas: 6,  status: 'agendada',  observacoes: 'Formato de torneio real.' },
    { titulo: 'Treino VIP Individual',          tipo: 'individual', nivel: 'avancado',      professorId: '', professorNome: 'Felipe Moraes',   arenaId: '', arenaNome: 'Arena VIP',     data: '2026-04-25', horarioInicio: '17:00', horarioFim: '18:00', vagas: 1,  status: 'agendada',  observacoes: '' },
    { titulo: 'Iniciante Noite — Turma A',      tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Viviane Correia', arenaId: '', arenaNome: 'Arena Central', data: '2026-04-20', horarioInicio: '20:00', horarioFim: '21:00', vagas: 8,  status: 'concluida', observacoes: '' },
  ],

  SEED_EVENTOS: [
    { nome: '1º Torneio Open da Academia',          tipo: 'torneio',    nivel: 'aberto',        data: '2026-05-09', dataFim: '2026-05-10', horarioInicio: '08:00', horarioFim: '18:00', arenaNome: 'Arena Norte',   arenaId: '', vagas: 32, valorInscricao: 120, status: 'aberto',    descricao: 'Torneio de duplas mistas. Premiação para os 3 primeiros colocados.' },
    { nome: 'Clínica de Saque com Ricardo Alves',   tipo: 'clinica',    nivel: 'intermediario', data: '2026-05-02', dataFim: '',           horarioInicio: '09:00', horarioFim: '12:00', arenaNome: 'Arena Central', arenaId: '', vagas: 12, valorInscricao: 80,  status: 'aberto',    descricao: 'Workshop focado em técnicas avançadas de saque e devolução.' },
    { nome: 'Jogo Social de Sábado',                tipo: 'social',     nivel: 'aberto',        data: '2026-04-26', dataFim: '',           horarioInicio: '14:00', horarioFim: '18:00', arenaNome: 'Arena Central', arenaId: '', vagas: 20, valorInscricao: 0,   status: 'planejado', descricao: 'Jogo social aberto a todos os alunos.' },
    { nome: '2º Campeonato Interno',                tipo: 'campeonato', nivel: 'avancado',      data: '2026-03-15', dataFim: '2026-03-16', horarioInicio: '08:00', horarioFim: '20:00', arenaNome: 'Arena VIP',     arenaId: '', vagas: 16, valorInscricao: 150, status: 'concluido', descricao: 'Campeonato interno para alunos de nível avançado. Campeão: Carlos Eduardo.' },
    { nome: 'Amistoso com Academia Rival',          tipo: 'amistoso',   nivel: 'profissional',  data: '2026-03-10', dataFim: '',           horarioInicio: '10:00', horarioFim: '14:00', arenaNome: 'Arena Norte',   arenaId: '', vagas: 8,  valorInscricao: 0,   status: 'concluido', descricao: 'Amistoso entre academias da região.' },
    { nome: 'Torneio de Verão — Cancelado',         tipo: 'torneio',    nivel: 'aberto',        data: '2026-02-20', dataFim: '2026-02-21', horarioInicio: '08:00', horarioFim: '18:00', arenaNome: 'Arena Sul',     arenaId: '', vagas: 24, valorInscricao: 100, status: 'cancelado', descricao: 'Cancelado devido à reforma da Arena Sul.' },
    { nome: 'Clínica de Voleio — Duplas',           tipo: 'clinica',    nivel: 'intermediario', data: '2026-05-17', dataFim: '',           horarioInicio: '09:00', horarioFim: '13:00', arenaNome: 'Arena Central', arenaId: '', vagas: 16, valorInscricao: 70,  status: 'planejado', descricao: 'Técnicas de voleio e posicionamento para duplas.' },
    { nome: 'Torneio Feminino',                     tipo: 'torneio',    nivel: 'aberto',        data: '2026-05-23', dataFim: '',           horarioInicio: '08:00', horarioFim: '17:00', arenaNome: 'Arena Norte',   arenaId: '', vagas: 24, valorInscricao: 90,  status: 'aberto',    descricao: 'Torneio exclusivo para alunas. Duplas femininas.' },
    { nome: 'Jogo Social — Dia das Mães',           tipo: 'social',     nivel: 'aberto',        data: '2026-05-10', dataFim: '',           horarioInicio: '10:00', horarioFim: '16:00', arenaNome: 'Arena Central', arenaId: '', vagas: 30, valorInscricao: 0,   status: 'planejado', descricao: 'Evento comemorativo com mães e filhos.' },
    { nome: 'Workshop — Mentalidade Esportiva',     tipo: 'clinica',    nivel: 'aberto',        data: '2026-06-06', dataFim: '',           horarioInicio: '09:00', horarioFim: '12:00', arenaNome: 'Arena VIP',     arenaId: '', vagas: 20, valorInscricao: 60,  status: 'planejado', descricao: 'Palestra e dinâmica com psicólogo esportivo.' },
    { nome: '3º Torneio Open — Nível Intermediário',tipo: 'torneio',    nivel: 'intermediario', data: '2026-06-20', dataFim: '2026-06-21', horarioInicio: '08:00', horarioFim: '18:00', arenaNome: 'Arena Norte',   arenaId: '', vagas: 32, valorInscricao: 110, status: 'planejado', descricao: 'Torneio para intermediários — duplas e simples.' },
    { nome: 'Clínica Infantil — Férias de Julho',   tipo: 'clinica',    nivel: 'iniciante',     data: '2026-07-07', dataFim: '2026-07-11', horarioInicio: '09:00', horarioFim: '12:00', arenaNome: 'Arena Central', arenaId: '', vagas: 20, valorInscricao: 200, status: 'planejado', descricao: 'Semana intensiva para crianças de 8 a 14 anos.' },
    { nome: 'Jogo Social Mensal — Março',           tipo: 'social',     nivel: 'aberto',        data: '2026-03-28', dataFim: '',           horarioInicio: '14:00', horarioFim: '18:00', arenaNome: 'Arena Central', arenaId: '', vagas: 24, valorInscricao: 0,   status: 'concluido', descricao: 'Jogo social mensal de março.' },
    { nome: 'Campeonato por Equipes',               tipo: 'campeonato', nivel: 'avancado',      data: '2026-07-25', dataFim: '2026-07-26', horarioInicio: '08:00', horarioFim: '20:00', arenaNome: 'Arena VIP',     arenaId: '', vagas: 40, valorInscricao: 50,  status: 'planejado', descricao: 'Competição em equipes de 4 jogadores.' },
    { nome: 'Amistoso Interacademias — Junho',      tipo: 'amistoso',   nivel: 'avancado',      data: '2026-06-14', dataFim: '',           horarioInicio: '10:00', horarioFim: '16:00', arenaNome: 'Arena Norte',   arenaId: '', vagas: 12, valorInscricao: 0,   status: 'planejado', descricao: 'Partida amistosa com Academia Paulista de Pickleball.' },
    { nome: 'Semana do Pickleball',                 tipo: 'clinica',    nivel: 'aberto',        data: '2026-08-10', dataFim: '2026-08-14', horarioInicio: '07:00', horarioFim: '20:00', arenaNome: 'Arena Central', arenaId: '', vagas: 60, valorInscricao: 150, status: 'planejado', descricao: 'Semana de imersão com clinics, torneios e confraternização.' },
    { nome: 'Clínica com Rodrigo Fonseca',          tipo: 'clinica',    nivel: 'avancado',      data: '2026-04-19', dataFim: '',           horarioInicio: '08:00', horarioFim: '11:00', arenaNome: 'Arena VIP',     arenaId: '', vagas: 10, valorInscricao: 120, status: 'aberto',    descricao: 'Clínica exclusiva com treinador da seleção estadual.' },
    { nome: '1º Campeonato Juvenil',                tipo: 'campeonato', nivel: 'iniciante',     data: '2026-05-30', dataFim: '',           horarioInicio: '08:00', horarioFim: '15:00', arenaNome: 'Arena Central', arenaId: '', vagas: 20, valorInscricao: 30,  status: 'planejado', descricao: 'Para alunos até 18 anos.' },
    { nome: 'Jogo Social — Abertura de Inverno',    tipo: 'social',     nivel: 'aberto',        data: '2026-06-21', dataFim: '',           horarioInicio: '15:00', horarioFim: '20:00', arenaNome: 'Arena Central', arenaId: '', vagas: 40, valorInscricao: 0,   status: 'planejado', descricao: 'Confraternização com drinks quentes e jogos amistosos.' },
    { nome: 'Torneio Beneficente',                  tipo: 'torneio',    nivel: 'aberto',        data: '2026-04-12', dataFim: '',           horarioInicio: '08:00', horarioFim: '18:00', arenaNome: 'Arena Norte',   arenaId: '', vagas: 32, valorInscricao: 80,  status: 'concluido', descricao: 'Renda revertida para ONG local. Grande sucesso de participação.' },
    { nome: 'Clínica de Dink e Kitchen',            tipo: 'clinica',    nivel: 'iniciante',     data: '2026-04-27', dataFim: '',           horarioInicio: '10:00', horarioFim: '13:00', arenaNome: 'Arena Central', arenaId: '', vagas: 14, valorInscricao: 65,  status: 'aberto',    descricao: 'Técnicas de jogo na zona não-de-voleio (kitchen).' },
  ],

  SEED_FINANCEIRO: [
    { tipo: 'receita', data: '2026-04-01', descricao: 'Mensalidade — Ana Paula Ferreira',   categoria: 'mensalidade',      valor: 389.90,  formaPagamento: 'pix',            status: 'pago',     referencia: 'Ana Paula Ferreira',  observacoes: '' },
    { tipo: 'receita', data: '2026-04-01', descricao: 'Mensalidade — Carlos Eduardo Lima',  categoria: 'mensalidade',      valor: 589.90,  formaPagamento: 'cartao_credito', status: 'pago',     referencia: 'Carlos Eduardo Lima', observacoes: '' },
    { tipo: 'receita', data: '2026-04-01', descricao: 'Mensalidade — Mariana Costa',        categoria: 'mensalidade',      valor: 249.90,  formaPagamento: 'pix',            status: 'pendente', referencia: 'Mariana Costa',       observacoes: '' },
    { tipo: 'receita', data: '2026-04-01', descricao: 'Mensalidade — Luciana Barbosa',      categoria: 'mensalidade',      valor: 389.90,  formaPagamento: 'pix',            status: 'pago',     referencia: 'Luciana Barbosa',     observacoes: '' },
    { tipo: 'receita', data: '2026-04-01', descricao: 'Mensalidade — Rafael Mendes',        categoria: 'mensalidade',      valor: 589.90,  formaPagamento: 'pix',            status: 'pago',     referencia: 'Rafael Mendes',       observacoes: '' },
    { tipo: 'receita', data: '2026-04-05', descricao: 'Aula Avulsa — Amanda Gomes',         categoria: 'aula_avulsa',      valor: 60.00,   formaPagamento: 'dinheiro',       status: 'pago',     referencia: 'Amanda Gomes',        observacoes: '' },
    { tipo: 'receita', data: '2026-04-10', descricao: 'Pacote 10 Aulas — Camila Ferreira',  categoria: 'pacote',           valor: 450.00,  formaPagamento: 'pix',            status: 'pago',     referencia: 'Camila Ferreira',     observacoes: '' },
    { tipo: 'receita', data: '2026-04-12', descricao: 'Inscrição — Torneio Beneficente',   categoria: 'inscricao_evento', valor: 2560.00, formaPagamento: 'pix',            status: 'pago',     referencia: 'Torneio Beneficente', observacoes: '32 inscrições × R$ 80' },
    { tipo: 'receita', data: '2026-04-15', descricao: 'Inscrição — Clínica Rodrigo Fonseca',categoria: 'inscricao_evento', valor: 1200.00, formaPagamento: 'pix',            status: 'pago',     referencia: 'Clínica Rodrigo',     observacoes: '10 inscrições × R$ 120' },
    { tipo: 'receita', data: '2026-04-18', descricao: 'Day Use — Arena Central',            categoria: 'day_use',          valor: 480.00,  formaPagamento: 'pix',            status: 'pago',     referencia: '',                    observacoes: '8 entradas no dia' },
    { tipo: 'despesa', data: '2026-04-05', descricao: 'Salário — Ricardo Alves',            categoria: 'salarios',         valor: 3200.00, formaPagamento: 'transferencia',  status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-04-05', descricao: 'Salário — Juliana Matos',            categoria: 'salarios',         valor: 2800.00, formaPagamento: 'transferencia',  status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-04-05', descricao: 'Salários — demais professores',      categoria: 'salarios',         valor: 9800.00, formaPagamento: 'transferencia',  status: 'pago',     referencia: '',                    observacoes: '7 professores' },
    { tipo: 'despesa', data: '2026-04-10', descricao: 'Conta de Luz — abril',               categoria: 'utilities',        valor: 435.00,  formaPagamento: 'boleto',         status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-04-10', descricao: 'Internet + Telefone — abril',        categoria: 'utilities',        valor: 280.00,  formaPagamento: 'cartao_debito',  status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-04-01', descricao: 'Aluguel das instalações — abril',    categoria: 'aluguel',          valor: 4500.00, formaPagamento: 'transferencia',  status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-04-15', descricao: 'Compra de bolas (50 un.)',           categoria: 'equipamentos',     valor: 450.00,  formaPagamento: 'cartao_credito', status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-04-15', descricao: 'Raquetes — reposição estoque loja',  categoria: 'equipamentos',     valor: 1240.00, formaPagamento: 'cartao_credito', status: 'pago',     referencia: '',                    observacoes: '8 raquetes' },
    { tipo: 'despesa', data: '2026-04-20', descricao: 'Manutenção — rede Arena Norte',      categoria: 'manutencao',       valor: 280.00,  formaPagamento: 'dinheiro',       status: 'pago',     referencia: 'Arena Norte',         observacoes: '' },
    { tipo: 'despesa', data: '2026-04-25', descricao: 'Material de marketing — banners',    categoria: 'marketing',        valor: 360.00,  formaPagamento: 'pix',            status: 'pendente', referencia: '',                    observacoes: 'Banners para o Open de maio.' },
  ],

  SEED_MANUTENCAO: [
    { titulo: 'Troca de lâmpadas — Arena Norte',       tipo: 'eletrica',    prioridade: 'alta',    arenaNome: 'Arena Norte',   arenaId: '', status: 'aberto',       dataAbertura: '2026-04-10', dataConclusao: '',           responsavel: 'Elétrica Rápida Ltda',   custo: 280,   descricao: 'Três luminárias do teto apagadas.' },
    { titulo: 'Reforma do piso — Arena Sul',            tipo: 'piso',        prioridade: 'urgente', arenaNome: 'Arena Sul',     arenaId: '', status: 'em_andamento', dataAbertura: '2026-03-01', dataConclusao: '',           responsavel: 'Construtora Piso & Cia', custo: 8500,  descricao: 'Piso com rachaduras. Arena fora de uso.' },
    { titulo: 'Vazamento hidráulico — vestiário',       tipo: 'hidraulica',  prioridade: 'alta',    arenaNome: 'Arena Central', arenaId: '', status: 'concluido',    dataAbertura: '2026-03-18', dataConclusao: '2026-04-02', responsavel: 'Hidro Fix',              custo: 450,   descricao: 'Torneira com vazamento constante.' },
    { titulo: 'Pintura da fachada',                     tipo: 'pintura',     prioridade: 'baixa',   arenaNome: 'Arena Central', arenaId: '', status: 'aberto',       dataAbertura: '2026-04-01', dataConclusao: '',           responsavel: '',                       custo: 1200,  descricao: 'Pintura desgastada. Aguardando agenda.' },
    { titulo: 'Substituição da rede — quadra 2',        tipo: 'equipamento', prioridade: 'media',   arenaNome: 'Arena Norte',   arenaId: '', status: 'concluido',    dataAbertura: '2026-03-05', dataConclusao: '2026-03-12', responsavel: 'Manutenção Interna',     custo: 180,   descricao: 'Rede com furo no centro.' },
    { titulo: 'Limpeza geral — Arena VIP',              tipo: 'limpeza',     prioridade: 'media',   arenaNome: 'Arena VIP',     arenaId: '', status: 'concluido',    dataAbertura: '2026-03-28', dataConclusao: '2026-03-30', responsavel: 'Equipe Interna',         custo: 0,     descricao: 'Limpeza pré-evento torneio beneficente.' },
    { titulo: 'Revisão sistema elétrico geral',         tipo: 'eletrica',    prioridade: 'alta',    arenaNome: 'Arena Central', arenaId: '', status: 'em_andamento', dataAbertura: '2026-04-05', dataConclusao: '',           responsavel: 'Elétrica Rápida Ltda',   custo: 600,   descricao: 'Disjuntores disparando com frequência.' },
    { titulo: 'Reparo no ar-condicionado — VIP',        tipo: 'climatizacao',prioridade: 'alta',    arenaNome: 'Arena VIP',     arenaId: '', status: 'aberto',       dataAbertura: '2026-04-12', dataConclusao: '',           responsavel: 'Frio & Cia',             custo: 900,   descricao: 'Ar-condicionado desligando sozinho.' },
    { titulo: 'Troca de piso — Quadra 1 Arena Central', tipo: 'piso',        prioridade: 'media',   arenaNome: 'Arena Central', arenaId: '', status: 'aberto',       dataAbertura: '2026-04-15', dataConclusao: '',           responsavel: '',                       custo: 3200,  descricao: 'Piso mostrando desgaste acelerado.' },
    { titulo: 'Revisão de redes — todas as arenas',     tipo: 'equipamento', prioridade: 'media',   arenaNome: 'Arena Central', arenaId: '', status: 'concluido',    dataAbertura: '2026-04-01', dataConclusao: '2026-04-08', responsavel: 'Manutenção Interna',     custo: 240,   descricao: 'Revisão preventiva trimestral.' },
    { titulo: 'Reparo do portão automático',            tipo: 'outros',      prioridade: 'media',   arenaNome: 'Arena Central', arenaId: '', status: 'concluido',    dataAbertura: '2026-03-25', dataConclusao: '2026-03-28', responsavel: 'Segurança Total Ltda',   custo: 380,   descricao: 'Motor do portão com folga excessiva.' },
    { titulo: 'Pintura interna — Arena Norte',          tipo: 'pintura',     prioridade: 'baixa',   arenaNome: 'Arena Norte',   arenaId: '', status: 'planejado',    dataAbertura: '2026-04-18', dataConclusao: '',           responsavel: '',                       custo: 2400,  descricao: 'Renovação visual — programado para maio.' },
    { titulo: 'Troca de luminárias LED — Arena Sul',    tipo: 'eletrica',    prioridade: 'media',   arenaNome: 'Arena Sul',     arenaId: '', status: 'planejado',    dataAbertura: '2026-04-20', dataConclusao: '',           responsavel: 'Elétrica Rápida Ltda',   custo: 1800,  descricao: 'Substituição durante reforma do piso.' },
    { titulo: 'Instalação de bebedouros filtrantes',    tipo: 'hidraulica',  prioridade: 'baixa',   arenaNome: 'Arena Norte',   arenaId: '', status: 'planejado',    dataAbertura: '2026-04-22', dataConclusao: '',           responsavel: '',                       custo: 1100,  descricao: '2 bebedouros novos — demanda dos alunos.' },
    { titulo: 'Limpeza de calhas — temporada chuvas',   tipo: 'limpeza',     prioridade: 'media',   arenaNome: 'Arena Central', arenaId: '', status: 'aberto',       dataAbertura: '2026-04-14', dataConclusao: '',           responsavel: 'Equipe Interna',         custo: 0,     descricao: 'Preventivo antes da estação de chuvas.' },
    { titulo: 'Câmera de segurança — área estacionam.', tipo: 'outros',      prioridade: 'baixa',   arenaNome: 'Arena Central', arenaId: '', status: 'planejado',    dataAbertura: '2026-04-25', dataConclusao: '',           responsavel: 'Segurança Total Ltda',   custo: 650,   descricao: 'Nova câmera no estacionamento.' },
    { titulo: 'Reparo do piso — Arena Norte Quadra 2',  tipo: 'piso',        prioridade: 'alta',    arenaNome: 'Arena Norte',   arenaId: '', status: 'em_andamento', dataAbertura: '2026-04-16', dataConclusao: '',           responsavel: 'Construtora Piso & Cia', custo: 1600,  descricao: 'Bolha no piso sintético.' },
    { titulo: 'Manutenção de equipamentos de som',      tipo: 'eletrica',    prioridade: 'baixa',   arenaNome: 'Arena VIP',     arenaId: '', status: 'concluido',    dataAbertura: '2026-04-06', dataConclusao: '2026-04-10', responsavel: 'AudioTech',              custo: 290,   descricao: 'Sistema de som para eventos.' },
    { titulo: 'Revisão hidrosanitária geral',           tipo: 'hidraulica',  prioridade: 'media',   arenaNome: 'Arena Central', arenaId: '', status: 'concluido',    dataAbertura: '2026-03-20', dataConclusao: '2026-04-03', responsavel: 'Hidro Fix',              custo: 520,   descricao: 'Revisão preventiva semestral.' },
    { titulo: 'Impermeabilização do telhado — VIP',     tipo: 'outros',      prioridade: 'urgente', arenaNome: 'Arena VIP',     arenaId: '', status: 'aberto',       dataAbertura: '2026-04-17', dataConclusao: '',           responsavel: '',                       custo: 4200,  descricao: 'Infiltração detectada após chuvas fortes.' },
  ],

  SEED_CAT_ESPECIALIDADES: [
    { nome: 'Iniciantes' },
    { nome: 'Intermediário' },
    { nome: 'Avançado' },
    { nome: 'Competição' },
    { nome: 'Infantil' },
    { nome: 'Fisioterapia / Reabilitação' },
  ],

  SEED_CAT_RECEITA: [
    { nome: 'Mensalidade' },
    { nome: 'Inscrição em Evento' },
    { nome: 'Aula Avulsa' },
    { nome: 'Pacote de Aulas' },
    { nome: 'Taxa de Quadra' },
    { nome: 'Venda de Equipamentos' },
    { nome: 'Outro' },
  ],

  SEED_CAT_DESPESA: [
    { nome: 'Manutenção' },
    { nome: 'Equipamentos' },
    { nome: 'Salários' },
    { nome: 'Aluguel' },
    { nome: 'Água / Luz / Internet' },
    { nome: 'Marketing' },
    { nome: 'Seguro' },
    { nome: 'Outro' },
  ],

  SEED_CAT_TIPOS_AULA: [
    { nome: 'Individual' },
    { nome: 'Dupla' },
    { nome: 'Grupo' },
    { nome: 'Semi-individual' },
  ],

  SEED_MATRICULAS: [
    { alunoNome: 'Ana Paula Ferreira',  alunoId: '', planoNome: 'Mensalidade Intermediário', planoId: '', dataInicio: '2026-04-01', valorPago: 389.90, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Carlos Eduardo Lima', alunoId: '', planoNome: 'Mensalidade Avançado',      planoId: '', dataInicio: '2026-04-01', valorPago: 589.90, formaPagamento: 'cartao_credito', status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Mariana Costa',       alunoId: '', planoNome: 'Mensalidade Iniciante',     planoId: '', dataInicio: '2026-04-01', valorPago: 249.90, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: false, observacoes: '' },
    { alunoNome: 'Roberto Souza',       alunoId: '', planoNome: 'Pacote 10 Aulas',           planoId: '', dataInicio: '2026-02-01', valorPago: 450.00, formaPagamento: 'transferencia',  status: 'inadimplente', numeroParcelas: 1, pagamentoConfirmado: false, observacoes: '' },
    { alunoNome: 'Fernanda Oliveira',   alunoId: '', planoNome: 'Mensalidade Iniciante',     planoId: '', dataInicio: '2025-12-01', valorPago: 249.90, formaPagamento: 'pix',            status: 'encerrada',    numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: 'Mudou de cidade.' },
    { alunoNome: 'Luciana Barbosa',     alunoId: '', planoNome: 'Mensalidade Intermediário', planoId: '', dataInicio: '2026-04-01', valorPago: 389.90, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Rafael Mendes',       alunoId: '', planoNome: 'Mensalidade Avançado',      planoId: '', dataInicio: '2026-04-01', valorPago: 589.90, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Patrícia Santos',     alunoId: '', planoNome: 'Mensalidade Iniciante',     planoId: '', dataInicio: '2026-04-01', valorPago: 249.90, formaPagamento: 'dinheiro',       status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Diego Carvalho',      alunoId: '', planoNome: 'Mensalidade Intermediário', planoId: '', dataInicio: '2026-03-01', valorPago: 389.90, formaPagamento: 'cartao_credito', status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Vanessa Lima',        alunoId: '', planoNome: 'Mensalidade Iniciante',     planoId: '', dataInicio: '2026-04-01', valorPago: 249.90, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Eduardo Machado',     alunoId: '', planoNome: 'Mensalidade Avançado',      planoId: '', dataInicio: '2026-02-01', valorPago: 589.90, formaPagamento: 'transferencia',  status: 'ativa',        numeroParcelas: 3, pagamentoConfirmado: true,  observacoes: 'Parcelado em 3x.' },
    { alunoNome: 'Camila Ferreira',     alunoId: '', planoNome: 'Pacote 10 Aulas',           planoId: '', dataInicio: '2026-04-01', valorPago: 450.00, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Bruno Nascimento',    alunoId: '', planoNome: 'Mensalidade Intermediário', planoId: '', dataInicio: '2026-03-01', valorPago: 389.90, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Juliana Rodrigues',   alunoId: '', planoNome: 'Mensalidade Avançado',      planoId: '', dataInicio: '2026-01-01', valorPago: 589.90, formaPagamento: 'cartao_credito', status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Thiago Alves',        alunoId: '', planoNome: 'Mensalidade Intermediário', planoId: '', dataInicio: '2026-04-01', valorPago: 389.90, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Amanda Gomes',        alunoId: '', planoNome: 'Aula Avulsa',               planoId: '', dataInicio: '2026-04-18', valorPago: 60.00,  formaPagamento: 'dinheiro',       status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Marcelo Oliveira',    alunoId: '', planoNome: 'Mensalidade Intermediário', planoId: '', dataInicio: '2026-02-01', valorPago: 389.90, formaPagamento: 'pix',            status: 'inadimplente', numeroParcelas: 1, pagamentoConfirmado: false, observacoes: 'Março em atraso.' },
    { alunoNome: 'Renata Costa',        alunoId: '', planoNome: 'Mensalidade Avançado',      planoId: '', dataInicio: '2026-01-01', valorPago: 589.90, formaPagamento: 'cartao_credito', status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'Bianca Martins',      alunoId: '', planoNome: 'Mensalidade Iniciante',     planoId: '', dataInicio: '2026-04-15', valorPago: 249.90, formaPagamento: 'pix',            status: 'ativa',        numeroParcelas: 1, pagamentoConfirmado: true,  observacoes: '' },
    { alunoNome: 'André Souza',         alunoId: '', planoNome: 'Mensalidade Iniciante',     planoId: '', dataInicio: '2026-02-01', valorPago: 249.90, formaPagamento: 'boleto',         status: 'suspensa',     numeroParcelas: 1, pagamentoConfirmado: false, observacoes: 'Suspensão por inadimplência.' },
  ],

  SEED_LOJA_PRODUTOS: [
    { nome: 'Raquete Selkirk Amped Omni',      categoria: 'Raquetes',    precoCusto: 280.00, precoVenda: 449.90, estoqueAtual: 8,  estoqueMinimo: 2, status: 'ativo' },
    { nome: 'Raquete Paddletek Bantam',         categoria: 'Raquetes',    precoCusto: 320.00, precoVenda: 519.90, estoqueAtual: 5,  estoqueMinimo: 2, status: 'ativo' },
    { nome: 'Raquete Onix Z5',                 categoria: 'Raquetes',    precoCusto: 150.00, precoVenda: 239.90, estoqueAtual: 10, estoqueMinimo: 3, status: 'ativo' },
    { nome: 'Raquete Iniciante Pro',            categoria: 'Raquetes',    precoCusto: 80.00,  precoVenda: 129.90, estoqueAtual: 15, estoqueMinimo: 5, status: 'ativo' },
    { nome: 'Raquete HEAD Radical',             categoria: 'Raquetes',    precoCusto: 260.00, precoVenda: 399.90, estoqueAtual: 6,  estoqueMinimo: 2, status: 'ativo' },
    { nome: 'Bola Dura Outdoor (tubo 3 un.)',   categoria: 'Bolas',       precoCusto: 18.00,  precoVenda: 34.90,  estoqueAtual: 40, estoqueMinimo: 10, status: 'ativo' },
    { nome: 'Bola Suave Indoor (tubo 3 un.)',   categoria: 'Bolas',       precoCusto: 15.00,  precoVenda: 28.90,  estoqueAtual: 35, estoqueMinimo: 10, status: 'ativo' },
    { nome: 'Bola de Treinamento (dúzia)',      categoria: 'Bolas',       precoCusto: 45.00,  precoVenda: 79.90,  estoqueAtual: 20, estoqueMinimo: 5,  status: 'ativo' },
    { nome: 'Bolsa de Raquete Simples',         categoria: 'Bolsas',      precoCusto: 55.00,  precoVenda: 99.90,  estoqueAtual: 12, estoqueMinimo: 3,  status: 'ativo' },
    { nome: 'Mochila Esportiva Pickleball',     categoria: 'Bolsas',      precoCusto: 120.00, precoVenda: 199.90, estoqueAtual: 7,  estoqueMinimo: 2,  status: 'ativo' },
    { nome: 'Overgrip (pacote 3 un.)',          categoria: 'Acessórios',  precoCusto: 12.00,  precoVenda: 24.90,  estoqueAtual: 50, estoqueMinimo: 10, status: 'ativo' },
    { nome: 'Protetor de Borda para Raquete',   categoria: 'Acessórios',  precoCusto: 8.00,   precoVenda: 19.90,  estoqueAtual: 30, estoqueMinimo: 10, status: 'ativo' },
    { nome: 'Munhequeira (par)',                categoria: 'Acessórios',  precoCusto: 14.00,  precoVenda: 29.90,  estoqueAtual: 25, estoqueMinimo: 5,  status: 'ativo' },
    { nome: 'Viseira Esportiva',                categoria: 'Vestuário',   precoCusto: 22.00,  precoVenda: 44.90,  estoqueAtual: 18, estoqueMinimo: 5,  status: 'ativo' },
    { nome: 'Camiseta Dry-Fit Academia',        categoria: 'Vestuário',   precoCusto: 35.00,  precoVenda: 69.90,  estoqueAtual: 22, estoqueMinimo: 5,  status: 'ativo' },
    { nome: 'Shorts Esportivo',                 categoria: 'Vestuário',   precoCusto: 40.00,  precoVenda: 79.90,  estoqueAtual: 15, estoqueMinimo: 5,  status: 'ativo' },
    { nome: 'Tênis Específico Pickleball',      categoria: 'Calçados',    precoCusto: 180.00, precoVenda: 299.90, estoqueAtual: 10, estoqueMinimo: 3,  status: 'ativo' },
    { nome: 'Palmilha Gel para Quadra',         categoria: 'Calçados',    precoCusto: 28.00,  precoVenda: 54.90,  estoqueAtual: 20, estoqueMinimo: 5,  status: 'ativo' },
    { nome: 'Suporte para Raquete (parede)',    categoria: 'Acessórios',  precoCusto: 18.00,  precoVenda: 34.90,  estoqueAtual: 3,  estoqueMinimo: 2,  status: 'ativo' },
    { nome: 'Corda de Rede Completa',          categoria: 'Equipamentos', precoCusto: 95.00,  precoVenda: 159.90, estoqueAtual: 0,  estoqueMinimo: 1,  status: 'ativo' },
  ],

  SEED_DAYUSE_PLANOS: [
    { nome: 'Day Use Avulso',            descricao: 'Acesso por 1 dia, 1 arena',       valor: 60.00,  status: 'ativo',   observacoes: '' },
    { nome: 'Day Use Dupla',             descricao: '2 pessoas, 1 arena por 1 dia',     valor: 100.00, status: 'ativo',   observacoes: '' },
    { nome: 'Day Use Tarde (Especial)',  descricao: 'Acesso a partir das 14h',          valor: 45.00,  status: 'ativo',   observacoes: 'Válido seg-sex, exceto feriados.' },
    { nome: 'Pacote 5 Day Uses',         descricao: '5 acessos individuais avulsos',    valor: 250.00, status: 'ativo',   observacoes: 'Compartilhável com outra pessoa.' },
    { nome: 'Day Use VIP — Arena VIP',  descricao: 'Acesso exclusivo à Arena VIP',     valor: 120.00, status: 'ativo',   observacoes: 'Inclui uso de raquete e bolas.' },
  ],

  SEED_DAYUSE_ENTRADAS: [
    { clienteNome: 'Lucas Andrade',    clienteCpf: '100.200.300-40', clienteTel: '(11) 91111-2222', clienteEmail: 'lucas@email.com',   data: '2026-04-18', hora: '09:00', planoId: '', planoNome: 'Day Use Avulso',           arenaNome: 'Arena Central', arenaId: '', valor: 60.00,  formaPagamento: 'pix',            observacoes: '' },
    { clienteNome: 'Tatiane Rocha',    clienteCpf: '200.300.400-50', clienteTel: '(11) 92222-3333', clienteEmail: 'tati@email.com',    data: '2026-04-18', hora: '10:00', planoId: '', planoNome: 'Day Use Avulso',           arenaNome: 'Arena Norte',   arenaId: '', valor: 60.00,  formaPagamento: 'dinheiro',       observacoes: '' },
    { clienteNome: 'Sérgio Batista',   clienteCpf: '300.400.500-60', clienteTel: '(11) 93333-4444', clienteEmail: '',                  data: '2026-04-17', hora: '08:30', planoId: '', planoNome: 'Day Use Dupla',            arenaNome: 'Arena Central', arenaId: '', valor: 100.00, formaPagamento: 'pix',            observacoes: 'Veio com esposa.' },
    { clienteNome: 'Paula Drummond',   clienteCpf: '400.500.600-70', clienteTel: '(11) 94444-5555', clienteEmail: 'paula@email.com',   data: '2026-04-17', hora: '14:00', planoId: '', planoNome: 'Day Use Tarde (Especial)', arenaNome: 'Arena Central', arenaId: '', valor: 45.00,  formaPagamento: 'cartao_debito',  observacoes: '' },
    { clienteNome: 'Rodrigo Neves',    clienteCpf: '500.600.700-80', clienteTel: '(11) 95555-6666', clienteEmail: 'rod@email.com',     data: '2026-04-16', hora: '07:00', planoId: '', planoNome: 'Day Use VIP — Arena VIP', arenaNome: 'Arena VIP',     arenaId: '', valor: 120.00, formaPagamento: 'pix',            observacoes: '' },
    { clienteNome: 'Camila Siqueira',  clienteCpf: '600.700.800-90', clienteTel: '(11) 96666-7777', clienteEmail: 'cami2@email.com',   data: '2026-04-15', hora: '09:00', planoId: '', planoNome: 'Day Use Avulso',           arenaNome: 'Arena Norte',   arenaId: '', valor: 60.00,  formaPagamento: 'dinheiro',       observacoes: '' },
    { clienteNome: 'Fernando Torres',  clienteCpf: '700.800.900-01', clienteTel: '(11) 97777-8888', clienteEmail: '',                  data: '2026-04-14', hora: '10:30', planoId: '', planoNome: 'Day Use Avulso',           arenaNome: 'Arena Central', arenaId: '', valor: 60.00,  formaPagamento: 'pix',            observacoes: '' },
    { clienteNome: 'Aline Figueiredo', clienteCpf: '800.900.001-12', clienteTel: '(11) 98888-9999', clienteEmail: 'aline@email.com',   data: '2026-04-12', hora: '14:00', planoId: '', planoNome: 'Day Use Tarde (Especial)', arenaNome: 'Arena Norte',   arenaId: '', valor: 45.00,  formaPagamento: 'cartao_credito', observacoes: '' },
    { clienteNome: 'Gustavo Prado',    clienteCpf: '900.001.112-23', clienteTel: '(11) 99999-0000', clienteEmail: 'gus@email.com',     data: '2026-04-11', hora: '08:00', planoId: '', planoNome: 'Day Use Dupla',            arenaNome: 'Arena Central', arenaId: '', valor: 100.00, formaPagamento: 'pix',            observacoes: 'Parceria com empresa.' },
    { clienteNome: 'Marina Silveira',  clienteCpf: '001.112.223-34', clienteTel: '(11) 90000-1111', clienteEmail: 'marina@email.com',  data: '2026-04-10', hora: '09:30', planoId: '', planoNome: 'Day Use Avulso',           arenaNome: 'Arena Central', arenaId: '', valor: 60.00,  formaPagamento: 'dinheiro',       observacoes: '' },
    { clienteNome: 'Breno Cavalcante', clienteCpf: '112.223.334-45', clienteTel: '(11) 91111-2222', clienteEmail: '',                  data: '2026-04-09', hora: '11:00', planoId: '', planoNome: 'Day Use VIP — Arena VIP', arenaNome: 'Arena VIP',     arenaId: '', valor: 120.00, formaPagamento: 'pix',            observacoes: '' },
    { clienteNome: 'Elisa Monteiro',   clienteCpf: '223.334.445-56', clienteTel: '(11) 92222-3333', clienteEmail: 'eli@email.com',     data: '2026-04-08', hora: '14:30', planoId: '', planoNome: 'Day Use Tarde (Especial)', arenaNome: 'Arena Norte',   arenaId: '', valor: 45.00,  formaPagamento: 'cartao_debito',  observacoes: '' },
    { clienteNome: 'José Henrique',    clienteCpf: '334.445.556-67', clienteTel: '(11) 93333-4444', clienteEmail: 'ze@email.com',      data: '2026-04-07', hora: '08:00', planoId: '', planoNome: 'Day Use Avulso',           arenaNome: 'Arena Norte',   arenaId: '', valor: 60.00,  formaPagamento: 'pix',            observacoes: '' },
    { clienteNome: 'Daniela Ribeiro',  clienteCpf: '445.556.667-78', clienteTel: '(11) 94444-5555', clienteEmail: 'dani@email.com',    data: '2026-04-05', hora: '10:00', planoId: '', planoNome: 'Day Use Dupla',            arenaNome: 'Arena Central', arenaId: '', valor: 100.00, formaPagamento: 'pix',            observacoes: 'Marido e esposa.' },
    { clienteNome: 'Alexandre Costa',  clienteCpf: '556.667.778-89', clienteTel: '(11) 95555-6666', clienteEmail: 'alex@email.com',    data: '2026-04-04', hora: '07:30', planoId: '', planoNome: 'Day Use Avulso',           arenaNome: 'Arena VIP',     arenaId: '', valor: 60.00,  formaPagamento: 'dinheiro',       observacoes: '' },
  ],

  SEED_PLANO_CONTAS: [
    // 1 - RECEITA OPERACIONAL BRUTA
    { codigo:'1',     descricao:'RECEITA OPERACIONAL BRUTA',       codigoPai:null,  nivel:1, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.1',   descricao:'Mensalidades',                    codigoPai:'1',   nivel:2, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.1.1', descricao:'Mensalidade — Plano Mensal',      codigoPai:'1.1', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.1.2', descricao:'Mensalidade — Plano Trimestral',  codigoPai:'1.1', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.1.3', descricao:'Mensalidade — Plano Semestral',   codigoPai:'1.1', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.1.4', descricao:'Mensalidade — Plano Anual',       codigoPai:'1.1', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.2',   descricao:'Aulas',                           codigoPai:'1',   nivel:2, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.2.1', descricao:'Aula Avulsa',                     codigoPai:'1.2', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.2.2', descricao:'Pacote de Aulas',                 codigoPai:'1.2', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.3',   descricao:'Eventos e Torneios',              codigoPai:'1',   nivel:2, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.3.1', descricao:'Inscrição em Torneio',            codigoPai:'1.3', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.3.2', descricao:'Inscrição em Evento',             codigoPai:'1.3', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.4',   descricao:'Locação de Quadras',              codigoPai:'1',   nivel:2, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.4.1', descricao:'Day Use',                         codigoPai:'1.4', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.4.2', descricao:'Locação Avulsa',                  codigoPai:'1.4', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.5',   descricao:'Venda de Produtos',               codigoPai:'1',   nivel:2, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.5.1', descricao:'Equipamentos',                    codigoPai:'1.5', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.5.2', descricao:'Acessórios',                      codigoPai:'1.5', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.9',   descricao:'Outras Receitas Operacionais',    codigoPai:'1',   nivel:2, tipo:'receita',    natureza:'credito', ativo:true },
    { codigo:'1.9.1', descricao:'Receita Diversa',                 codigoPai:'1.9', nivel:3, tipo:'receita',    natureza:'credito', ativo:true },
    // 2 - DEDUÇÕES DA RECEITA BRUTA
    { codigo:'2',     descricao:'DEDUÇÕES DA RECEITA BRUTA',       codigoPai:null,  nivel:1, tipo:'deducao',    natureza:'debito',  ativo:true },
    { codigo:'2.1',   descricao:'Impostos sobre Receita',          codigoPai:'2',   nivel:2, tipo:'deducao',    natureza:'debito',  ativo:true },
    { codigo:'2.1.1', descricao:'Simples Nacional / ISS',          codigoPai:'2.1', nivel:3, tipo:'deducao',    natureza:'debito',  ativo:true },
    { codigo:'2.1.2', descricao:'PIS / COFINS',                    codigoPai:'2.1', nivel:3, tipo:'deducao',    natureza:'debito',  ativo:true },
    { codigo:'2.2',   descricao:'Devoluções e Cancelamentos',      codigoPai:'2',   nivel:2, tipo:'deducao',    natureza:'debito',  ativo:true },
    { codigo:'2.2.1', descricao:'Estornos de Mensalidades',        codigoPai:'2.2', nivel:3, tipo:'deducao',    natureza:'debito',  ativo:true },
    { codigo:'2.2.2', descricao:'Cancelamentos Diversos',          codigoPai:'2.2', nivel:3, tipo:'deducao',    natureza:'debito',  ativo:true },
    // 3 - CUSTO DOS SERVIÇOS PRESTADOS
    { codigo:'3',     descricao:'CUSTO DOS SERVIÇOS PRESTADOS',    codigoPai:null,  nivel:1, tipo:'custo',      natureza:'debito',  ativo:true },
    { codigo:'3.1',   descricao:'Custo com Professores',           codigoPai:'3',   nivel:2, tipo:'custo',      natureza:'debito',  ativo:true },
    { codigo:'3.1.1', descricao:'Salários de Professores',         codigoPai:'3.1', nivel:3, tipo:'custo',      natureza:'debito',  ativo:true },
    { codigo:'3.1.2', descricao:'Comissões de Professores',        codigoPai:'3.1', nivel:3, tipo:'custo',      natureza:'debito',  ativo:true },
    { codigo:'3.2',   descricao:'Custo com Instalações',           codigoPai:'3',   nivel:2, tipo:'custo',      natureza:'debito',  ativo:true },
    { codigo:'3.2.1', descricao:'Aluguel de Quadras / Arenas',     codigoPai:'3.2', nivel:3, tipo:'custo',      natureza:'debito',  ativo:true },
    { codigo:'3.3',   descricao:'Material Esportivo',              codigoPai:'3',   nivel:2, tipo:'custo',      natureza:'debito',  ativo:true },
    { codigo:'3.3.1', descricao:'Bolas e Consumíveis',             codigoPai:'3.3', nivel:3, tipo:'custo',      natureza:'debito',  ativo:true },
    { codigo:'3.3.2', descricao:'Redes e Equipamentos de Quadra',  codigoPai:'3.3', nivel:3, tipo:'custo',      natureza:'debito',  ativo:true },
    // 4 - DESPESAS OPERACIONAIS
    { codigo:'4',     descricao:'DESPESAS OPERACIONAIS',           codigoPai:null,  nivel:1, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.1',   descricao:'Pessoal Administrativo',          codigoPai:'4',   nivel:2, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.1.1', descricao:'Salários Administrativos',        codigoPai:'4.1', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.1.2', descricao:'Encargos Sociais (FGTS/INSS)',    codigoPai:'4.1', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.1.3', descricao:'Pró-labore',                      codigoPai:'4.1', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.1.4', descricao:'Benefícios',                      codigoPai:'4.1', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.2',   descricao:'Instalações',                     codigoPai:'4',   nivel:2, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.2.1', descricao:'Aluguel / Sede Administrativa',   codigoPai:'4.2', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.2.2', descricao:'Condomínio',                      codigoPai:'4.2', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.2.3', descricao:'IPTU',                            codigoPai:'4.2', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.3',   descricao:'Utilidades',                      codigoPai:'4',   nivel:2, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.3.1', descricao:'Energia Elétrica',                codigoPai:'4.3', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.3.2', descricao:'Água e Esgoto',                   codigoPai:'4.3', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.3.3', descricao:'Internet / Telefone',             codigoPai:'4.3', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.4',   descricao:'Manutenção',                      codigoPai:'4',   nivel:2, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.4.1', descricao:'Manutenção de Quadras',           codigoPai:'4.4', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.4.2', descricao:'Manutenção de Equipamentos',      codigoPai:'4.4', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.4.3', descricao:'Limpeza e Conservação',           codigoPai:'4.4', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.5',   descricao:'Marketing e Vendas',              codigoPai:'4',   nivel:2, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.5.1', descricao:'Publicidade e Anúncios',          codigoPai:'4.5', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.5.2', descricao:'Material Gráfico',                codigoPai:'4.5', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.5.3', descricao:'Patrocínios',                     codigoPai:'4.5', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.6',   descricao:'Administrativo',                  codigoPai:'4',   nivel:2, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.6.1', descricao:'Material de Escritório',          codigoPai:'4.6', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.6.2', descricao:'Honorários Contábeis',            codigoPai:'4.6', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.6.3', descricao:'Sistemas e Software',             codigoPai:'4.6', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    { codigo:'4.6.4', descricao:'Depreciação e Amortização',       codigoPai:'4.6', nivel:3, tipo:'despesa',    natureza:'debito',  ativo:true },
    // 5 - RESULTADO FINANCEIRO
    { codigo:'5',     descricao:'RESULTADO FINANCEIRO',            codigoPai:null,  nivel:1, tipo:'financeiro', natureza:'credito', ativo:true },
    { codigo:'5.1',   descricao:'Receitas Financeiras',            codigoPai:'5',   nivel:2, tipo:'financeiro', natureza:'credito', ativo:true },
    { codigo:'5.1.1', descricao:'Rendimentos de Aplicações',       codigoPai:'5.1', nivel:3, tipo:'financeiro', natureza:'credito', ativo:true },
    { codigo:'5.1.2', descricao:'Juros Recebidos',                 codigoPai:'5.1', nivel:3, tipo:'financeiro', natureza:'credito', ativo:true },
    { codigo:'5.2',   descricao:'Despesas Financeiras',            codigoPai:'5',   nivel:2, tipo:'financeiro', natureza:'debito',  ativo:true },
    { codigo:'5.2.1', descricao:'Taxas Bancárias',                 codigoPai:'5.2', nivel:3, tipo:'financeiro', natureza:'debito',  ativo:true },
    { codigo:'5.2.2', descricao:'Juros de Empréstimos',            codigoPai:'5.2', nivel:3, tipo:'financeiro', natureza:'debito',  ativo:true },
    { codigo:'5.2.3', descricao:'IOF / Encargos Financeiros',      codigoPai:'5.2', nivel:3, tipo:'financeiro', natureza:'debito',  ativo:true },
    // 6 - IMPOSTOS SOBRE O LUCRO
    { codigo:'6',     descricao:'IMPOSTOS SOBRE O LUCRO',          codigoPai:null,  nivel:1, tipo:'imposto',    natureza:'debito',  ativo:true },
    { codigo:'6.1',   descricao:'Impostos sobre o Resultado',      codigoPai:'6',   nivel:2, tipo:'imposto',    natureza:'debito',  ativo:true },
    { codigo:'6.1.1', descricao:'Imposto de Renda (IRPJ)',         codigoPai:'6.1', nivel:3, tipo:'imposto',    natureza:'debito',  ativo:true },
    { codigo:'6.1.2', descricao:'Contribuição Social (CSLL)',      codigoPai:'6.1', nivel:3, tipo:'imposto',    natureza:'debito',  ativo:true },
  ],

  SEED_TURMAS: [
    // Horário uniforme: todos os dias iguais
    { nome: 'Turma Iniciante Manhã',       tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Juliana Matos',   arenaId: '', arenaNome: 'Arena Central',
      diasSemana: [{dia:'seg',inicio:'08:00',fim:'09:00'},{dia:'qua',inicio:'08:00',fim:'09:00'},{dia:'sex',inicio:'08:00',fim:'09:00'}],
      horarioInicio: '08:00', horarioFim: '09:00', vagas: 6,  status: 'ativa',    observacoes: '' },
    { nome: 'Turma Intermediário Tarde',   tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Ricardo Alves',   arenaId: '', arenaNome: 'Arena Norte',
      diasSemana: [{dia:'ter',inicio:'17:00',fim:'18:00'},{dia:'qui',inicio:'17:00',fim:'18:00'}],
      horarioInicio: '17:00', horarioFim: '18:00', vagas: 4,  status: 'ativa',    observacoes: '' },
    { nome: 'Turma Avançado VIP',          tipo: 'grupo',      nivel: 'avancado',      professorId: '', professorNome: 'Carlos Nunes',    arenaId: '', arenaNome: 'Arena Central',
      diasSemana: [{dia:'seg',inicio:'19:00',fim:'20:30'},{dia:'qua',inicio:'19:00',fim:'20:30'}],
      horarioInicio: '19:00', horarioFim: '20:30', vagas: 4,  status: 'ativa',    observacoes: '' },
    { nome: 'Aula Individual — Saque',     tipo: 'individual', nivel: 'intermediario', professorId: '', professorNome: 'Juliana Matos',   arenaId: '', arenaNome: 'Arena Norte',
      diasSemana: [{dia:'sex',inicio:'10:00',fim:'11:00'}],
      horarioInicio: '10:00', horarioFim: '11:00', vagas: 1,  status: 'suspensa', observacoes: '' },
    { nome: 'Turma Iniciante Tarde',       tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Beatriz Tavares', arenaId: '', arenaNome: 'Arena Central',
      diasSemana: [{dia:'ter',inicio:'14:00',fim:'15:00'},{dia:'qui',inicio:'14:00',fim:'15:00'}],
      horarioInicio: '14:00', horarioFim: '15:00', vagas: 8,  status: 'ativa',    observacoes: '' },
    { nome: 'Turma Iniciante Noite',       tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Viviane Correia', arenaId: '', arenaNome: 'Arena Central',
      diasSemana: [{dia:'seg',inicio:'20:00',fim:'21:00'},{dia:'qua',inicio:'20:00',fim:'21:00'}],
      horarioInicio: '20:00', horarioFim: '21:00', vagas: 8,  status: 'ativa',    observacoes: '' },
    // Horário variado por dia (demonstração da nova funcionalidade)
    { nome: 'Turma Intermediário Manhã',   tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Fernanda Lima',   arenaId: '', arenaNome: 'Arena Norte',
      diasSemana: [{dia:'seg',inicio:'09:30',fim:'10:30'},{dia:'qua',inicio:'10:00',fim:'11:00'},{dia:'sex',inicio:'10:00',fim:'11:00'}],
      horarioInicio: '09:30', horarioFim: '10:30', vagas: 6,  status: 'ativa',    observacoes: 'Seg: 09h30 · Qua/Sex: 10h00' },
    { nome: 'Turma Intermediário Noite',   tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Isabela Campos',  arenaId: '', arenaNome: 'Arena Norte',
      diasSemana: [{dia:'ter',inicio:'19:00',fim:'20:00'},{dia:'qui',inicio:'19:30',fim:'20:30'}],
      horarioInicio: '19:00', horarioFim: '20:00', vagas: 6,  status: 'ativa',    observacoes: 'Ter: 19h00 · Qui: 19h30' },
    { nome: 'Turma Avançado Manhã',        tipo: 'grupo',      nivel: 'avancado',      professorId: '', professorNome: 'Ricardo Alves',   arenaId: '', arenaNome: 'Arena VIP',
      diasSemana: [{dia:'seg',inicio:'07:00',fim:'08:30'},{dia:'qua',inicio:'07:00',fim:'08:30'}],
      horarioInicio: '07:00', horarioFim: '08:30', vagas: 4,  status: 'ativa',    observacoes: '' },
    { nome: 'Turma Avançado Tarde',        tipo: 'grupo',      nivel: 'avancado',      professorId: '', professorNome: 'Marcos Vieira',   arenaId: '', arenaNome: 'Arena Norte',
      diasSemana: [{dia:'ter',inicio:'16:00',fim:'17:30'},{dia:'qui',inicio:'16:00',fim:'17:30'}],
      horarioInicio: '16:00', horarioFim: '17:30', vagas: 4,  status: 'ativa',    observacoes: '' },
    { nome: 'Turma Juvenil',               tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Paulo Henrique',  arenaId: '', arenaNome: 'Arena Central',
      diasSemana: [{dia:'sab',inicio:'09:00',fim:'10:00'}],
      horarioInicio: '09:00', horarioFim: '10:00', vagas: 10, status: 'ativa',    observacoes: 'Para alunos até 18 anos.' },
    { nome: 'Turma Sênior 60+',            tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Priscila Mendes', arenaId: '', arenaNome: 'Arena Central',
      diasSemana: [{dia:'ter',inicio:'10:00',fim:'11:00'},{dia:'qui',inicio:'10:00',fim:'11:00'}],
      horarioInicio: '10:00', horarioFim: '11:00', vagas: 8,  status: 'ativa',    observacoes: 'Turma exclusiva 60+.' },
    { nome: 'Turma Feminina',              tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Larissa Pinto',   arenaId: '', arenaNome: 'Arena Norte',
      diasSemana: [{dia:'qua',inicio:'18:00',fim:'19:00'},{dia:'sex',inicio:'18:30',fim:'19:30'}],
      horarioInicio: '18:00', horarioFim: '19:00', vagas: 6,  status: 'ativa',    observacoes: 'Qua: 18h00 · Sex: 18h30' },
    // Treino de Competição com horários diferentes por dia
    { nome: 'Treino de Competição',        tipo: 'grupo',      nivel: 'profissional',  professorId: '', professorNome: 'Rodrigo Fonseca', arenaId: '', arenaNome: 'Arena VIP',
      diasSemana: [{dia:'seg',inicio:'07:00',fim:'09:00'},{dia:'ter',inicio:'06:30',fim:'08:00'},{dia:'qua',inicio:'07:00',fim:'09:00'},{dia:'qui',inicio:'06:30',fim:'08:00'},{dia:'sex',inicio:'07:00',fim:'09:00'}],
      horarioInicio: '07:00', horarioFim: '09:00', vagas: 6,  status: 'ativa',    observacoes: 'Seg/Qua/Sex: 07h · Ter/Qui: 06h30 — Exclusivo para competidores.' },
    { nome: 'Turma Duplas Mistas',         tipo: 'dupla',      nivel: 'intermediario', professorId: '', professorNome: 'Carlos Nunes',    arenaId: '', arenaNome: 'Arena Norte',
      diasSemana: [{dia:'sab',inicio:'10:00',fim:'12:00'}],
      horarioInicio: '10:00', horarioFim: '12:00', vagas: 8,  status: 'ativa',    observacoes: '' },
    { nome: 'Turma Open Sábado',           tipo: 'grupo',      nivel: 'aberto',        professorId: '', professorNome: 'Gabriel Santos',  arenaId: '', arenaNome: 'Arena Central',
      diasSemana: [{dia:'sab',inicio:'14:00',fim:'16:00'}],
      horarioInicio: '14:00', horarioFim: '16:00', vagas: 12, status: 'ativa',    observacoes: 'Todos os níveis, formato de jogos.' },
    { nome: 'Turma Reabilitação',          tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Anderson Costa',  arenaId: '', arenaNome: 'Arena Central',
      diasSemana: [{dia:'seg',inicio:'11:00',fim:'12:00'},{dia:'qua',inicio:'11:00',fim:'12:00'}],
      horarioInicio: '11:00', horarioFim: '12:00', vagas: 4,  status: 'ativa',    observacoes: 'Com acompanhamento fisioterapêutico.' },
    { nome: 'Clínica Individual',          tipo: 'individual', nivel: 'avancado',      professorId: '', professorNome: 'Ricardo Alves',   arenaId: '', arenaNome: 'Arena VIP',
      diasSemana: [{dia:'sex',inicio:'09:00',fim:'10:00'}],
      horarioInicio: '09:00', horarioFim: '10:00', vagas: 1,  status: 'ativa',    observacoes: '' },
    // VIP Individual com horário diferente por dia
    { nome: 'Turma VIP Individual',        tipo: 'individual', nivel: 'avancado',      professorId: '', professorNome: 'Felipe Moraes',   arenaId: '', arenaNome: 'Arena VIP',
      diasSemana: [{dia:'seg',inicio:'17:00',fim:'18:00'},{dia:'qua',inicio:'18:00',fim:'19:00'},{dia:'sex',inicio:'16:00',fim:'17:00'}],
      horarioInicio: '17:00', horarioFim: '18:00', vagas: 1,  status: 'ativa',    observacoes: 'Seg: 17h · Qua: 18h · Sex: 16h' },
    { nome: 'Turma Meia Temporada',        tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Natalia Ramos',   arenaId: '', arenaNome: 'Arena Norte',
      diasSemana: [{dia:'ter',inicio:'15:00',fim:'16:00'},{dia:'qui',inicio:'15:00',fim:'16:00'}],
      horarioInicio: '15:00', horarioFim: '16:00', vagas: 6,  status: 'suspensa', observacoes: 'Aguardando retorno da professora.' },
  ],

  SEED_CAT_TIPOS_EVENTO: [
    { nome: 'Torneio' },
    { nome: 'Campeonato' },
    { nome: 'Clínica / Workshop' },
    { nome: 'Jogo Social' },
    { nome: 'Amistoso' },
    { nome: 'Outro' },
  ],

  /**
   * Migração de perfis: garante que módulos novos sejam adicionados
   * aos perfis existentes no localStorage, sem apagar dados do usuário.
   */
  _migratePerfis() {
    const novosPorPerfil = {
      admin:         ['relatorios', 'turmas', 'dayuse', 'loja', 'matriculas', 'manutencao'],
      gerente:       ['relatorios', 'turmas', 'dayuse', 'loja', 'matriculas', 'manutencao'],
      recepcionista: ['turmas', 'dayuse', 'loja', 'matriculas', 'manutencao'],
      financeiro:    ['relatorios', 'dayuse', 'loja', 'manutencao'],
      manutencao:    ['manutencao'],
      professor:     ['turmas', 'manutencao'],
      aluno:         ['turmas', 'manutencao'],
    };

    // Remove dashboard de professor e aluno (eles usam o portal dedicado)
    const modulosBloqueados = { professor: ['dashboard'], aluno: ['dashboard'] };

    const perfis = Storage.getAll('perfis');
    perfis.forEach(p => {
      const novos      = novosPorPerfil[p.key] || [];
      const bloqueados = modulosBloqueados[p.key] || [];
      let modulosAtualizados = Array.from(new Set([...(p.modulos || []), ...novos]));
      modulosAtualizados = modulosAtualizados.filter(m => !bloqueados.includes(m));
      if (JSON.stringify(modulosAtualizados) !== JSON.stringify(p.modulos || [])) {
        Storage.update('perfis', p.id, { modulos: modulosAtualizados });
      }
    });

    // Garante que os perfis professor e aluno existam
    const perfisFaltantes = [
      { key: 'professor', label: 'Professor',  descricao: 'Acesso às grades e aulas do próprio professor', cor: 'badge-blue',    modulos: ['turmas','manutencao'] },
      { key: 'aluno',     label: 'Aluno',      descricao: 'Acesso às grades e aulas em que está inscrito',  cor: 'badge-success', modulos: ['turmas','manutencao'] },
    ];
    const now = new Date().toISOString();
    perfisFaltantes.forEach(p => {
      const existe = Storage.getAll('perfis').find(x => x.key === p.key);
      if (!existe) Storage.create('perfis', p);
    });

    // Garante que os usuários professor e aluno de demonstração existam
    const usuariosFaltantes = [
      { nome: 'Ricardo Alves',      login: 'prof.ricardo', email: 'prof@pickle.com',  perfil: 'professor', status: 'ativo', senha: 'cHJvZjEyMw==' },
      { nome: 'Ana Paula Ferreira', login: 'ana.paula',    email: 'aluno@pickle.com', perfil: 'aluno',     status: 'ativo', senha: 'YWx1bm8xMjM=' },
    ];
    usuariosFaltantes.forEach(u => {
      const existe = Storage.getAll('usuarios').find(x => x.login === u.login);
      if (!existe) Storage.create('usuarios', u);
    });

    // Vincula alunoId / professorId nos usuários que ainda não têm o vínculo
    Storage.getAll('usuarios').forEach(u => {
      if (u.perfil === 'aluno' && !u.alunoId) {
        const aluno = Storage.getAll('alunos').find(a => a.nome === u.nome);
        if (aluno) Storage.update('usuarios', u.id, { alunoId: aluno.id });
      }
      if (u.perfil === 'professor' && !u.professorId) {
        const prof = Storage.getAll('professores').find(p => p.nome === u.nome);
        if (prof) Storage.update('usuarios', u.id, { professorId: prof.id });
      }
    });

    // Recarrega os perfis na memória
    Auth.loadPerfis();
  },

  /** Seed all demo data — runs before UI init, safe to call multiple times */
  seedData() {
    Storage.seed('perfis',              this.SEED_PERFIS);
    Storage.seed('usuarios',            this.SEED_USUARIOS);
    Storage.seed('arenas',              this.SEED_ARENAS);
    Storage.seed('alunos',              this.SEED_ALUNOS);
    Storage.seed('professores',         this.SEED_PROFESSORES);
    Storage.seed('planos',              this.SEED_PLANOS);
    Storage.seed('aulas',               this.SEED_AULAS);
    Storage.seed('turmas',              this.SEED_TURMAS);
    Storage.seed('eventos',             this.SEED_EVENTOS);
    Storage.seed('financeiro',          this.SEED_FINANCEIRO);
    Storage.seed('manutencao',          this.SEED_MANUTENCAO);
    Storage.seed('matriculas',          this.SEED_MATRICULAS);
    Storage.seed('loja_produtos',       this.SEED_LOJA_PRODUTOS);
    Storage.seed('dayuse_planos',       this.SEED_DAYUSE_PLANOS);
    Storage.seed('dayuse_entradas',     this.SEED_DAYUSE_ENTRADAS);
    Storage.seed('cat_especialidades',  this.SEED_CAT_ESPECIALIDADES);
    Storage.seed('cat_receita',         this.SEED_CAT_RECEITA);
    Storage.seed('cat_despesa',         this.SEED_CAT_DESPESA);
    Storage.seed('cat_tipos_aula',      this.SEED_CAT_TIPOS_AULA);
    Storage.seed('cat_tipos_evento',    this.SEED_CAT_TIPOS_EVENTO);
    Storage.seed('planoContas',         this.SEED_PLANO_CONTAS);

    // Criar quadra padrão para arenas que ainda não tenham quadras
    Storage.getAll('arenas').forEach(arena => {
      const temQuadras = Storage.getAll('quadras').some(q => q.arenaId === arena.id);
      if (!temQuadras) {
        Storage.create('quadras', {
          arenaId:    arena.id,
          arenaNome:  arena.nome,
          nome:       'Quadra 1',
          tipo:       'descoberta',
          piso:       'sintetico',
          capacidade: 4,
          status:     'disponivel',
          observacoes:'',
        });
        Storage.create('quadras', {
          arenaId:    arena.id,
          arenaNome:  arena.nome,
          nome:       'Quadra 2',
          tipo:       'coberta',
          piso:       'sintetico',
          capacidade: 4,
          status:     'disponivel',
          observacoes:'',
        });
      }
    });
  },

  /** Initialize the full UI — called after successful authentication */
  initUI() {
    UI.initModal();
    Auth.bindLockForm();
    InactivityLock.start();

    // Portal dedicado para professor e aluno
    if (PortalModule.init()) return;

    this.renderSidebar();
    this.updateHeaderUser();
    this.updateDate();
    this.loadTenantName();
    setInterval(() => this.updateDate(), 60000);

    Router
      .add('dashboard',   () => Auth.hasPermission('dashboard')   ? renderStub('dashboard')          : this._forbidden())
      .add('arenas',      () => Auth.hasPermission('arenas')      ? ArenaModule.render()             : this._forbidden())
      .add('alunos',      () => Auth.hasPermission('alunos')      ? AlunoModule.render()             : this._forbidden())
      .add('matriculas',  () => Auth.hasPermission('matriculas')  ? MatriculaModule.render()         : this._forbidden())
      .add('planos',      () => Auth.hasPermission('planos')      ? PlanoModule.render()             : this._forbidden())
      .add('professores', () => Auth.hasPermission('professores') ? ProfessorModule.render()         : this._forbidden())
      .add('turmas',      () => Auth.hasPermission('turmas')      ? TurmasModule.render()            : this._forbidden())
      .add('eventos',     () => Auth.hasPermission('eventos')     ? EventoModule.render()            : this._forbidden())
      .add('loja',        () => Auth.hasPermission('loja')        ? LojaModule.render()              : this._forbidden())
      .add('financeiro',  () => Auth.hasPermission('financeiro')  ? FinanceiroModule.render()        : this._forbidden())
      .add('manutencao',  () => Auth.hasPermission('manutencao')  ? ManutencaoModule.render()        : this._forbidden())
      .add('relatorios',  () => Auth.hasPermission('relatorios')  ? RelatoriosModule.render()        : this._forbidden())
      .add('cadastros',   () => Auth.hasPermission('cadastros')   ? CadastrosModule.render()         : this._forbidden())
      .add('dayuse',      () => Auth.hasPermission('dayuse')      ? DayUseModule.render()            : this._forbidden())
      .add('admin',       () => Auth.hasPermission('admin')       ? AdminModule.render()             : this._forbidden());

    Router.init();
  },

  _forbidden() {
    const area = document.getElementById('content-area');
    if (!area) return;
    area.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <div class="empty-title">Acesso não autorizado</div>
        <div class="empty-desc">Você não tem permissão para acessar este módulo.<br>Fale com o administrador do sistema.</div>
        <button class="btn btn-secondary mt-16" onclick="Router.navigate('dashboard')">Voltar ao Dashboard</button>
      </div>`;
  },

  /** Carrega nome do tenant do Supabase e atualiza sidebar */
  async loadTenantName() {
    if (!SupabaseClient || !TENANT_ID) return;
    try {
      const { data } = await SupabaseClient
        .from('tenants')
        .select('nome')
        .eq('id', TENANT_ID)
        .single();
      if (data?.nome) {
        const el = document.getElementById('brand-sub');
        if (el) el.textContent = data.nome;
        // Atualiza também no portal e login
        document.querySelectorAll('.login-brand-sub, .portal-brand-sub, .brand-sub')
          .forEach(e => e.textContent = data.nome);
      }
    } catch (e) { /* silencioso */ }
  },

  /** Rebuild sidebar filtering by current user permissions */
  renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    // Matriz usa nav próprio, arenas usam o nav completo
    const items = (typeof isMatriz === 'function' && isMatriz())
      ? this.NAV_ITEMS_MATRIZ
      : this.NAV_ITEMS;

    nav.innerHTML = items
      .filter(item => Auth.hasPermission(item.route))
      .map(item => `
        <button
          class="nav-item"
          data-route="${item.route}"
          onclick="Router.navigate('${item.route}')"
          title="${UI.escape(item.label)}"
        >
          <span class="nav-icon">${item.icon}</span>
          <span>${UI.escape(item.label)}</span>
        </button>
      `).join('');
  },

  /** Update header and sidebar footer with current user info */
  updateHeaderUser() {
    const session = Auth.getCurrentUser();
    if (!session) return;

    const perfil  = PERFIS[session.perfil];
    const perfilLabel = perfil ? perfil.label : session.perfil;
    const cor     = perfil ? perfil.cor : 'badge-gray';

    // Header right
    const headerInfo = document.getElementById('header-user-info');
    if (headerInfo) {
      headerInfo.innerHTML = `
        <div class="header-user-wrap">
          <div class="header-user-text">
            <span class="header-user-name">${UI.escape(session.nome)}</span>
            <span class="badge ${cor}" style="font-size:10px;">${UI.escape(perfilLabel)}</span>
          </div>
          <div class="header-avatar" title="${UI.escape(session.nome)}">${session.avatar}</div>
        </div>`;
    }

    // Sidebar footer user
    const sidebarUser = document.getElementById('sidebar-user');
    if (sidebarUser) {
      sidebarUser.innerHTML = `
        <div class="sidebar-user-info">
          <div class="sidebar-user-avatar">${session.avatar}</div>
          <div class="sidebar-user-text">
            <div class="sidebar-user-name">${UI.escape(session.nome)}</div>
            <div class="sidebar-user-perfil">${UI.escape(perfilLabel)}</div>
          </div>
          <button class="btn btn-ghost btn-sm sidebar-logout" onclick="Auth.confirmLogout()" title="Sair">⏻</button>
        </div>`;
    }
  },

  updateDate() {
    const el = document.getElementById('current-date');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  },
};

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  Theme.init();

  // Inicializa banco Supabase se TENANT_ID configurado,
  // caso contrário o app roda em modo localStorage normalmente.
  await DB.init(typeof TENANT_ID !== 'undefined' ? TENANT_ID : '');

  App.seedData();
  App._migratePerfis();
  Auth.loadPerfis();
  Auth.bindLoginForm();

  if (Auth.getSession()) {
    App.initUI();
    Notifications.init();
  } else {
    Auth.showLogin();
  }
});
