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

    if (!matricula) return { total: 0, usado: 0, disponivel: 0, matricula: null, plano: null };

    const plano = Storage.getById('planos', matricula.planoId);
    const total = plano ? (parseInt(plano.aulasIncluidas) || 0) : 0;

    // Aulas do mês com presença confirmada
    const aulasDoMes = Storage.getAll('aulas')
      .filter(a => a.data && a.data.slice(0, 7) === mesAno)
      .map(a => a.id);

    const usado = Storage.getAll('presencas')
      .filter(p => p.alunoId === alunoId && p.presente === true && aulasDoMes.includes(p.aulaId))
      .length;

    return { total, usado, disponivel: Math.max(0, total - usado), matricula, plano };
  },

  /** Renderiza badge compacto de saldo */
  badgeSaldo(alunoId, mesAno) {
    const s = this.getSaldo(alunoId, mesAno);
    if (!s.total) return `<span class="badge badge-gray saldo-badge">Sem plano</span>`;
    const pct = s.total > 0 ? (s.usado / s.total) : 0;
    const cls = pct >= 1 ? 'badge-danger' : pct >= 0.75 ? 'badge-warning' : 'badge-success';
    return `<span class="badge ${cls} saldo-badge" title="Saldo de aulas — ${mesAno}">${s.disponivel}/${s.total} aulas</span>`;
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
    return `
      <div class="saldo-bar-wrap">
        <div class="saldo-bar-header">
          <span class="saldo-bar-label">Aulas — ${mesLabel}</span>
          <span class="saldo-bar-nums" style="color:${cor}">${s.usado} usada${s.usado !== 1 ? 's' : ''} de ${s.total}</span>
        </div>
        <div class="saldo-bar-track">
          <div class="saldo-bar-fill" style="width:${pct}%;background:${cor};"></div>
        </div>
        <div class="saldo-bar-plano">${s.plano ? s.plano.nome : ''}</div>
      </div>`;
  },
};

/**
 * App — Bootstrap: seed data, sidebar, date, route registration, init
 */
const App = {

  NAV_ITEMS: [
    { route: 'dashboard',   icon: '📊', label: 'Dashboard'            },
    { route: 'arenas',      icon: '🏟️', label: 'Arenas'              },
    { route: 'alunos',      icon: '👥', label: 'Alunos'              },
    { route: 'planos',      icon: '📋', label: 'Planos de Contratação'},
    { route: 'professores', icon: '🎓', label: 'Professores'         },
    { route: 'turmas',      icon: '🏸', label: 'Grades'              },
    { route: 'eventos',     icon: '🏆', label: 'Eventos'             },
    { route: 'dayuse',      icon: '🚪', label: 'Day Use'             },
    { route: 'financeiro',  icon: '💰', label: 'Financeiro'          },
    { route: 'manutencao',  icon: '🔧', label: 'Manutenção'          },
    { route: 'relatorios',  icon: '📈', label: 'Relatórios'          },
    { route: 'cadastros',   icon: '🗂️', label: 'Cadastros'           },
    { route: 'admin',       icon: '⚙️', label: 'Administração'       },
  ],

  SEED_PERFIS: [
    { key: 'admin',         label: 'Administrador',    descricao: 'Acesso total ao sistema, incluindo gestão de usuários',    cor: 'badge-danger',  modulos: ['dashboard','arenas','alunos','planos','professores','turmas','eventos','dayuse','financeiro','manutencao','relatorios','cadastros','admin'] },
    { key: 'gerente',       label: 'Gerente',          descricao: 'Acesso a todos os módulos operacionais',                   cor: 'badge-warning', modulos: ['dashboard','arenas','alunos','planos','professores','turmas','eventos','dayuse','financeiro','manutencao','relatorios','cadastros'] },
    { key: 'recepcionista', label: 'Recepcionista',    descricao: 'Atendimento ao aluno, matrículas e turmas',               cor: 'badge-blue',    modulos: ['dashboard','alunos','turmas','eventos','dayuse'] },
    { key: 'financeiro',    label: 'Financeiro',       descricao: 'Controle financeiro e planos de contratação',              cor: 'badge-success', modulos: ['dashboard','financeiro','planos','alunos','dayuse','relatorios'] },
    { key: 'manutencao',    label: 'Manutenção',       descricao: 'Gestão de arenas e chamados de manutenção',               cor: 'badge-gray',    modulos: ['dashboard','arenas','manutencao'] },
    { key: 'professor',     label: 'Professor',        descricao: 'Acesso às grades e aulas do próprio professor',            cor: 'badge-blue',    modulos: ['turmas'] },
    { key: 'aluno',         label: 'Aluno',            descricao: 'Acesso às grades e aulas em que está inscrito',             cor: 'badge-success', modulos: ['turmas'] },
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
    { nome: 'Ana Paula Ferreira',  cpf: '123.456.789-00', email: 'ana@email.com',     telefone: '(11) 98765-4321', dataNascimento: '1990-03-15', nivel: 'intermediario', status: 'ativo',    observacoes: 'Aluna dedicada, pratica 3x por semana.' },
    { nome: 'Carlos Eduardo Lima', cpf: '987.654.321-00', email: 'carlos@email.com',  telefone: '(11) 91234-5678', dataNascimento: '1985-07-22', nivel: 'avancado',      status: 'ativo',    observacoes: 'Participa de torneios regionais.' },
    { nome: 'Mariana Costa',       cpf: '456.789.123-00', email: 'mari@email.com',    telefone: '(11) 99988-7766', dataNascimento: '1998-11-05', nivel: 'iniciante',     status: 'ativo',    observacoes: '' },
    { nome: 'Roberto Souza',       cpf: '321.654.987-00', email: 'roberto@email.com', telefone: '(11) 97755-3344', dataNascimento: '1975-01-30', nivel: 'intermediario', status: 'suspenso', observacoes: 'Suspensão por inadimplência.' },
    { nome: 'Fernanda Oliveira',   cpf: '654.321.098-00', email: 'fe@email.com',      telefone: '(11) 96644-2211', dataNascimento: '2000-06-18', nivel: 'iniciante',     status: 'inativo',  observacoes: 'Mudou de cidade.' },
  ],

  SEED_PROFESSORES: [
    { nome: 'Ricardo Alves',  cpf: '111.222.333-44', email: 'ricardo@pickle.com', telefone: '(11) 97000-1111', especialidade: 'avancado',     status: 'ativo',   horarioInicio: '07:00', horarioFim: '12:00', diasDisponiveis: ['seg','ter','qua','qui','sex'],         observacoes: 'Ex-atleta profissional.' },
    { nome: 'Juliana Matos',  cpf: '555.666.777-88', email: 'ju@pickle.com',      telefone: '(11) 96000-2222', especialidade: 'iniciantes',   status: 'ativo',   horarioInicio: '13:00', horarioFim: '18:00', diasDisponiveis: ['seg','qua','sex'],                     observacoes: 'Especialista em turmas iniciantes.' },
    { nome: 'Paulo Henrique', cpf: '999.000.111-22', email: 'paulo@pickle.com',   telefone: '(11) 95000-3333', especialidade: 'infantil',     status: 'ativo',   horarioInicio: '08:00', horarioFim: '13:00', diasDisponiveis: ['ter','qui','sab'],                     observacoes: '' },
    { nome: 'Sandra Rocha',   cpf: '333.444.555-66', email: 'sandra@pickle.com',  telefone: '(11) 94000-4444', especialidade: 'competicao',   status: 'ferias',  horarioInicio: '06:00', horarioFim: '11:00', diasDisponiveis: ['seg','ter','qua','qui','sex','sab'],   observacoes: 'Retorna em 15/04.' },
    { nome: 'Thiago Cardoso', cpf: '777.888.999-00', email: 'thiago@pickle.com',  telefone: '(11) 93000-5555', especialidade: 'fisioterapia', status: 'inativo', horarioInicio: '',      horarioFim: '',      diasDisponiveis: [],                                     observacoes: 'Licença médica.' },
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
    { titulo: 'Fundamentos do Saque',        tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Juliana Matos',  arenaId: '', arenaNome: 'Arena Central', data: '2026-03-25', horarioInicio: '08:00', horarioFim: '09:00', vagas: 6, status: 'agendada',  observacoes: '' },
    { titulo: 'Táticas de Duplas',           tipo: 'dupla',      nivel: 'intermediario', professorId: '', professorNome: 'Ricardo Alves',  arenaId: '', arenaNome: 'Arena Norte',   data: '2026-03-25', horarioInicio: '10:00', horarioFim: '11:30', vagas: 4, status: 'agendada',  observacoes: 'Focar em posicionamento na rede.' },
    { titulo: 'Treino Individual Avançado',  tipo: 'individual', nivel: 'avancado',      professorId: '', professorNome: 'Ricardo Alves',  arenaId: '', arenaNome: 'Arena Norte',   data: '2026-03-24', horarioInicio: '07:00', horarioFim: '08:00', vagas: 1, status: 'concluida', observacoes: '' },
    { titulo: 'Turma Infantil — Iniciação',  tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Paulo Henrique', arenaId: '', arenaNome: 'Arena Central', data: '2026-03-22', horarioInicio: '09:00', horarioFim: '10:00', vagas: 8, status: 'concluida', observacoes: '' },
    { titulo: 'Preparação para Torneio',     tipo: 'grupo',      nivel: 'avancado',      professorId: '', professorNome: 'Ricardo Alves',  arenaId: '', arenaNome: 'Arena VIP',     data: '2026-03-20', horarioInicio: '06:00', horarioFim: '08:00', vagas: 4, status: 'concluida', observacoes: 'Simulação de set completo.' },
    { titulo: 'Aula de Reposição — Grupo B', tipo: 'grupo',      nivel: 'intermediario', professorId: '', professorNome: 'Juliana Matos',  arenaId: '', arenaNome: 'Arena Central', data: '2026-03-18', horarioInicio: '14:00', horarioFim: '15:00', vagas: 6, status: 'cancelada', observacoes: 'Cancelada por falta de quórum.' },
    { titulo: 'Fundamentos do Dink',         tipo: 'dupla',      nivel: 'iniciante',     professorId: '', professorNome: 'Juliana Matos',  arenaId: '', arenaNome: 'Arena Central', data: '2026-03-27', horarioInicio: '13:00', horarioFim: '14:00', vagas: 4, status: 'agendada',  observacoes: '' },
    { titulo: 'Treino Físico + Técnica',     tipo: 'grupo',      nivel: 'profissional',  professorId: '', professorNome: 'Ricardo Alves',  arenaId: '', arenaNome: 'Arena Norte',   data: '2026-03-28', horarioInicio: '06:30', horarioFim: '08:30', vagas: 4, status: 'agendada',  observacoes: 'Trazer roupas de treino físico.' },
  ],

  SEED_EVENTOS: [
    { nome: '1º Torneio Open da Academia',        tipo: 'torneio',    nivel: 'aberto',        data: '2026-04-12', dataFim: '2026-04-13', horarioInicio: '08:00', horarioFim: '18:00', arenaNome: 'Arena Norte',   arenaId: '', vagas: 32, valorInscricao: 120, status: 'aberto',    descricao: 'Torneio de duplas mistas. Premiação para os 3 primeiros colocados.' },
    { nome: 'Clínica de Saque com Ricardo Alves', tipo: 'clinica',    nivel: 'intermediario', data: '2026-04-05', dataFim: '',           horarioInicio: '09:00', horarioFim: '12:00', arenaNome: 'Arena Central', arenaId: '', vagas: 12, valorInscricao: 80,  status: 'aberto',    descricao: 'Workshop focado em técnicas avançadas de saque e devolução.' },
    { nome: 'Jogo Social de Sábado',              tipo: 'social',     nivel: 'aberto',        data: '2026-03-29', dataFim: '',           horarioInicio: '14:00', horarioFim: '18:00', arenaNome: 'Arena Central', arenaId: '', vagas: 20, valorInscricao: 0,   status: 'planejado', descricao: 'Jogo social aberto a todos os alunos.' },
    { nome: '2º Campeonato Interno',              tipo: 'campeonato', nivel: 'avancado',      data: '2026-03-15', dataFim: '2026-03-16', horarioInicio: '08:00', horarioFim: '20:00', arenaNome: 'Arena VIP',     arenaId: '', vagas: 16, valorInscricao: 150, status: 'concluido', descricao: 'Campeonato interno para alunos de nível avançado. Campeão: Carlos Eduardo.' },
    { nome: 'Amistoso com Academia Rival',        tipo: 'amistoso',   nivel: 'profissional',  data: '2026-03-10', dataFim: '',           horarioInicio: '10:00', horarioFim: '14:00', arenaNome: 'Arena Norte',   arenaId: '', vagas: 8,  valorInscricao: 0,   status: 'concluido', descricao: 'Amistoso entre academias da região.' },
    { nome: 'Torneio de Verão — Cancelado',       tipo: 'torneio',    nivel: 'aberto',        data: '2026-02-20', dataFim: '2026-02-21', horarioInicio: '08:00', horarioFim: '18:00', arenaNome: 'Arena Sul',     arenaId: '', vagas: 24, valorInscricao: 100, status: 'cancelado', descricao: 'Cancelado devido à reforma da Arena Sul.' },
  ],

  SEED_FINANCEIRO: [
    { tipo: 'receita', data: '2026-03-01', descricao: 'Mensalidade — Ana Paula Ferreira',   categoria: 'mensalidade',      valor: 389.90,  formaPagamento: 'pix',            status: 'pago',     referencia: 'Ana Paula Ferreira',  observacoes: '' },
    { tipo: 'receita', data: '2026-03-01', descricao: 'Mensalidade — Carlos Eduardo Lima',  categoria: 'mensalidade',      valor: 589.90,  formaPagamento: 'cartao_credito', status: 'pago',     referencia: 'Carlos Eduardo Lima', observacoes: '' },
    { tipo: 'receita', data: '2026-03-01', descricao: 'Mensalidade — Mariana Costa',        categoria: 'mensalidade',      valor: 249.90,  formaPagamento: 'pix',            status: 'pendente', referencia: 'Mariana Costa',       observacoes: '' },
    { tipo: 'receita', data: '2026-03-05', descricao: 'Aula Avulsa — visitante',            categoria: 'aula_avulsa',      valor: 60.00,   formaPagamento: 'dinheiro',       status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'receita', data: '2026-03-10', descricao: 'Pacote 10 Aulas — Roberto Souza',   categoria: 'pacote',           valor: 450.00,  formaPagamento: 'transferencia',  status: 'pago',     referencia: 'Roberto Souza',       observacoes: '' },
    { tipo: 'receita', data: '2026-03-15', descricao: 'Inscrição — 2º Campeonato Interno', categoria: 'inscricao_evento', valor: 600.00,  formaPagamento: 'pix',            status: 'pago',     referencia: '2º Campeonato',       observacoes: '4 inscrições × R$ 150' },
    { tipo: 'despesa', data: '2026-03-05', descricao: 'Salário — Ricardo Alves',            categoria: 'salarios',         valor: 3200.00, formaPagamento: 'transferencia',  status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-03-05', descricao: 'Salário — Juliana Matos',            categoria: 'salarios',         valor: 2800.00, formaPagamento: 'transferencia',  status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-03-10', descricao: 'Conta de Luz — março',               categoria: 'utilities',        valor: 420.50,  formaPagamento: 'boleto',         status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-03-10', descricao: 'Internet — março',                   categoria: 'utilities',        valor: 180.00,  formaPagamento: 'cartao_debito',  status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-03-15', descricao: 'Manutenção — rede da Arena Sul',     categoria: 'manutencao',       valor: 350.00,  formaPagamento: 'dinheiro',       status: 'pago',     referencia: 'Arena Sul',           observacoes: '' },
    { tipo: 'despesa', data: '2026-03-20', descricao: 'Compra de bolas e raquetes',         categoria: 'equipamentos',     valor: 780.00,  formaPagamento: 'cartao_credito', status: 'pendente', referencia: '',                    observacoes: 'Aguardando entrega.' },
    { tipo: 'receita', data: '2026-02-01', descricao: 'Mensalidades — fevereiro',           categoria: 'mensalidade',      valor: 1850.00, formaPagamento: 'pix',            status: 'pago',     referencia: '',                    observacoes: '5 alunos' },
    { tipo: 'despesa', data: '2026-02-05', descricao: 'Salários — fevereiro',               categoria: 'salarios',         valor: 6000.00, formaPagamento: 'transferencia',  status: 'pago',     referencia: '',                    observacoes: '' },
    { tipo: 'despesa', data: '2026-02-10', descricao: 'Aluguel das instalações',            categoria: 'aluguel',          valor: 4500.00, formaPagamento: 'transferencia',  status: 'pago',     referencia: '',                    observacoes: '' },
  ],

  SEED_MANUTENCAO: [
    { titulo: 'Troca de lâmpadas — Arena Norte',  tipo: 'eletrica',    prioridade: 'alta',    arenaNome: 'Arena Norte',   arenaId: '', status: 'aberto',       dataAbertura: '2026-03-20', dataConclusao: '',           responsavel: 'Elétrica Rápida Ltda',  custo: 280,  descricao: 'Três luminárias do teto apagadas.' },
    { titulo: 'Reforma do piso — Arena Sul',      tipo: 'piso',        prioridade: 'urgente', arenaNome: 'Arena Sul',     arenaId: '', status: 'em_andamento', dataAbertura: '2026-03-01', dataConclusao: '',           responsavel: 'Construtora Piso & Cia', custo: 8500, descricao: 'Piso com rachaduras. Arena fora de uso.' },
    { titulo: 'Vazamento hidráulico — vestiário', tipo: 'hidraulica',  prioridade: 'alta',    arenaNome: 'Arena Central', arenaId: '', status: 'em_andamento', dataAbertura: '2026-03-18', dataConclusao: '',           responsavel: 'Hidro Fix',             custo: 450,  descricao: 'Torneira com vazamento constante.' },
    { titulo: 'Pintura da fachada',               tipo: 'pintura',     prioridade: 'baixa',   arenaNome: 'Arena Central', arenaId: '', status: 'aberto',       dataAbertura: '2026-03-10', dataConclusao: '',           responsavel: '',                      custo: 1200, descricao: 'Pintura desgastada. Aguardando agenda.' },
    { titulo: 'Substituição da rede — quadra 2',  tipo: 'equipamento', prioridade: 'media',   arenaNome: 'Arena Norte',   arenaId: '', status: 'concluido',    dataAbertura: '2026-03-05', dataConclusao: '2026-03-12', responsavel: 'Manutenção Interna',    custo: 180,  descricao: 'Rede com furo no centro.' },
    { titulo: 'Limpeza geral — Arena VIP',        tipo: 'limpeza',     prioridade: 'media',   arenaNome: 'Arena VIP',     arenaId: '', status: 'concluido',    dataAbertura: '2026-02-28', dataConclusao: '2026-03-01', responsavel: 'Equipe Interna',        custo: 0,    descricao: 'Limpeza pré-evento campeonato.' },
    { titulo: 'Revisão sistema elétrico geral',   tipo: 'eletrica',    prioridade: 'alta',    arenaNome: 'Arena Central', arenaId: '', status: 'aberto',       dataAbertura: '2026-03-22', dataConclusao: '',           responsavel: '',                      custo: 600,  descricao: 'Disjuntores disparando com frequência.' },
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
    { alunoNome: 'Ana Paula Ferreira',  alunoId: '', planoNome: 'Mensalidade Intermediário', planoId: '', dataInicio: '2026-03-01', dataFim: '2026-03-31', valorPago: 389.90, formaPagamento: 'pix',           status: 'ativa',     observacoes: '' },
    { alunoNome: 'Carlos Eduardo Lima', alunoId: '', planoNome: 'Mensalidade Avançado',      planoId: '', dataInicio: '2026-03-01', dataFim: '2026-03-31', valorPago: 589.90, formaPagamento: 'cartao_credito', status: 'ativa',     observacoes: '' },
    { alunoNome: 'Mariana Costa',       alunoId: '', planoNome: 'Mensalidade Iniciante',     planoId: '', dataInicio: '2026-03-01', dataFim: '2026-03-31', valorPago: 249.90, formaPagamento: 'pix',           status: 'ativa',     observacoes: '' },
    { alunoNome: 'Roberto Souza',       alunoId: '', planoNome: 'Pacote 10 Aulas',           planoId: '', dataInicio: '2026-02-01', dataFim: '2026-04-01', valorPago: 450.00, formaPagamento: 'transferencia',  status: 'ativa',     observacoes: '' },
    { alunoNome: 'Fernanda Oliveira',   alunoId: '', planoNome: 'Mensalidade Iniciante',     planoId: '', dataInicio: '2025-12-01', dataFim: '2025-12-31', valorPago: 249.90, formaPagamento: 'pix',           status: 'encerrada', observacoes: 'Mudou de cidade.' },
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
    { nome: 'Turma Iniciante Manhã',    tipo: 'grupo',      nivel: 'iniciante',     professorId: '', professorNome: 'Juliana Matos', arenaId: '', arenaNome: 'Arena Central', diasSemana: ['seg','qua','sex'], horarioInicio: '08:00', horarioFim: '09:00', vagas: 6, status: 'ativa',     observacoes: '' },
    { nome: 'Turma Intermediário Tarde', tipo: 'grupo',     nivel: 'intermediario', professorId: '', professorNome: 'Ricardo Alves', arenaId: '', arenaNome: 'Arena Norte',   diasSemana: ['ter','qui'],       horarioInicio: '17:00', horarioFim: '18:00', vagas: 4, status: 'ativa',     observacoes: '' },
    { nome: 'Turma Avançado VIP',        tipo: 'grupo',     nivel: 'avancado',      professorId: '', professorNome: 'Carlos Nunes',  arenaId: '', arenaNome: 'Arena Central', diasSemana: ['seg','qua'],       horarioInicio: '19:00', horarioFim: '20:30', vagas: 4, status: 'ativa',     observacoes: '' },
    { nome: 'Aula Individual — Saque',   tipo: 'individual',nivel: 'intermediario', professorId: '', professorNome: 'Juliana Matos', arenaId: '', arenaNome: 'Arena Norte',   diasSemana: ['sex'],             horarioInicio: '10:00', horarioFim: '11:00', vagas: 1, status: 'suspensa',  observacoes: '' },
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
      admin:         ['relatorios', 'turmas', 'dayuse'],
      gerente:       ['relatorios', 'turmas', 'dayuse'],
      recepcionista: ['turmas', 'dayuse'],
      financeiro:    ['relatorios', 'dayuse'],
      professor:     ['turmas'],
      aluno:         ['turmas'],
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
      { key: 'professor', label: 'Professor',  descricao: 'Acesso às grades e aulas do próprio professor', cor: 'badge-blue',    modulos: ['turmas'] },
      { key: 'aluno',     label: 'Aluno',      descricao: 'Acesso às grades e aulas em que está inscrito',  cor: 'badge-success', modulos: ['turmas'] },
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
    setInterval(() => this.updateDate(), 60000);

    Router
      .add('dashboard',   () => Auth.hasPermission('dashboard')   ? renderStub('dashboard')          : this._forbidden())
      .add('arenas',      () => Auth.hasPermission('arenas')      ? ArenaModule.render()             : this._forbidden())
      .add('alunos',      () => Auth.hasPermission('alunos')      ? AlunoModule.render()             : this._forbidden())
      .add('planos',      () => Auth.hasPermission('planos')      ? PlanoModule.render()             : this._forbidden())
      .add('professores', () => Auth.hasPermission('professores') ? ProfessorModule.render()         : this._forbidden())
      .add('turmas',      () => Auth.hasPermission('turmas')      ? TurmasModule.render()            : this._forbidden())
      .add('eventos',     () => Auth.hasPermission('eventos')     ? EventoModule.render()            : this._forbidden())
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

  /** Rebuild sidebar filtering by current user permissions */
  renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    nav.innerHTML = this.NAV_ITEMS
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
          <button class="btn btn-ghost btn-sm" onclick="Auth.confirmLogout()" title="Sair">⏻</button>
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
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  App.seedData();
  App._migratePerfis();
  Auth.loadPerfis();   // populate global PERFIS from localStorage
  Auth.bindLoginForm();

  if (Auth.getSession()) {
    App.initUI();
    Notifications.init();
  } else {
    Auth.showLogin();
  }
});
