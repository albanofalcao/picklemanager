/**
 * SEED — Preenche turmas com alunos de teste
 * Cole no Console do navegador (F12 → Console) e pressione Enter.
 * Requer: usuário logado no PickleManager.
 */
(function seedTurmas() {
  if (typeof Storage === 'undefined') {
    console.error('❌ Execute na página do PickleManager com o usuário logado.');
    return;
  }

  const turmas = Storage.getAll('turmas').filter(t => t.status === 'ativo' || !t.status);
  if (!turmas.length) {
    console.warn('⚠️ Nenhuma turma ativa encontrada. Crie turmas antes de rodar o seed.');
    return;
  }

  // ── Nomes fictícios brasileiros ──────────────────────────────────────
  const nomesM = [
    'Carlos Eduardo','Rafael Oliveira','Bruno Souza','Lucas Ferreira','Thiago Almeida',
    'Marcos Pereira','Diego Costa','Felipe Santos','Rodrigo Lima','Anderson Gomes',
    'Gustavo Rocha','Leandro Martins','Fábio Nunes','Henrique Castro','Paulo Ribeiro',
    'Júnior Cardoso','Renato Barbosa','Sérgio Mendes','Vitor Carvalho','Eduardo Freitas',
    'Roberto Araujo','Danilo Melo','Guilherme Torres','Pedro Nascimento','Alexandre Silva',
  ];
  const nomesF = [
    'Ana Clara','Juliana Souza','Fernanda Costa','Patricia Lima','Camila Oliveira',
    'Beatriz Santos','Larissa Ferreira','Mariana Alves','Gabriela Rocha','Vanessa Pereira',
    'Aline Martins','Renata Gomes','Priscila Nunes','Leticia Cardoso','Simone Castro',
    'Tatiane Barbosa','Cristiane Mendes','Elaine Carvalho','Sandra Ribeiro','Viviane Freitas',
    'Luciana Araujo','Roberta Melo','Débora Torres','Cláudia Nascimento','Adriana Silva',
  ];

  const niveis   = ['iniciante','iniciante','iniciante','intermediario','intermediario','avancado'];
  const lados    = ['direita','esquerda','direita','direita','direita'];
  const camisas  = ['P','M','M','G','GG'];
  const now      = new Date().toISOString();

  function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function gerarNasc(idadeMin, idadeMax) {
    const hoje  = new Date();
    const idade = idadeMin + Math.floor(Math.random() * (idadeMax - idadeMin + 1));
    const nasc  = new Date(hoje);
    nasc.setFullYear(nasc.getFullYear() - idade);
    nasc.setMonth(Math.floor(Math.random() * 12));
    nasc.setDate(1 + Math.floor(Math.random() * 28));
    return nasc.toISOString().slice(0, 10);
  }

  function gerarTelefone() {
    const ddd = ['11','11','11','11','21','31','41','51','61','71','81','85'];
    return `(${rnd(ddd)}) 9${String(Math.floor(Math.random()*9e7+1e7))}`;
  }

  // ── Cria alunos de teste (se não existirem ainda) ────────────────────
  const existentes = Storage.getAll('alunos');
  const seedTag    = '(seed)';
  const jaSeed     = existentes.filter(a => (a.observacoes || '').includes(seedTag));

  let alunosCriados = [];

  if (jaSeed.length >= 30) {
    console.log(`ℹ️ Já existem ${jaSeed.length} alunos de seed — reutilizando.`);
    alunosCriados = jaSeed;
  } else {
    const faltam = 30 - jaSeed.length;
    console.log(`📝 Criando ${faltam} alunos de teste…`);

    const usadosM = [...nomesM];
    const usadosF = [...nomesF];

    for (let i = 0; i < faltam; i++) {
      const sexo = i % 2 === 0 ? 'masculino' : 'feminino';
      const listaAtual = sexo === 'masculino' ? usadosM : usadosF;
      if (!listaAtual.length) continue;
      const idx  = Math.floor(Math.random() * listaAtual.length);
      const nome = listaAtual.splice(idx, 1)[0];
      const nivel = rnd(niveis);

      const aluno = Storage.create('alunos', {
        nome,
        cpf:            '',
        telefone:       gerarTelefone(),
        email:          nome.toLowerCase().replace(/ /g,'.') + '@email.com',
        dataNascimento: gerarNasc(18, 65),
        sexo,
        nivel,
        status:         'ativo',
        ladoDominante:  rnd(lados),
        tamanhoCamisa:  rnd(camisas),
        observacoes:    `Aluno de teste ${seedTag}`,
      });
      alunosCriados.push(aluno);
    }
    alunosCriados = [...jaSeed, ...alunosCriados];
    console.log(`✅ ${alunosCriados.length} alunos disponíveis.`);
  }

  // ── Distribui alunos nas turmas ──────────────────────────────────────
  const inscricoesExist = Storage.getAll('turmaAlunos');
  let totalInscricoes   = 0;
  let turmasPreenchidas = 0;

  // Embaralha alunos para distribuição variada
  const pool = [...alunosCriados].sort(() => Math.random() - .5);
  let poolIdx = 0;

  turmas.forEach(turma => {
    const capacidade = turma.capacidade || 12;
    const jaInscritos = inscricoesExist.filter(
      i => i.turmaId === turma.id && i.status === 'ativo'
    );
    const vagas = Math.max(0, capacidade - jaInscritos.length);

    if (vagas === 0) {
      console.log(`⏭️  Turma "${turma.nome}" — já cheia (${jaInscritos.length}/${capacidade})`);
      return;
    }

    // Alunos que já estão nesta turma
    const idsNaTurma = new Set(jaInscritos.map(i => i.alunoId));

    let adicionados = 0;
    for (let v = 0; v < vagas; v++) {
      // Acha próximo aluno do pool que não esteja na turma
      let tentativas = 0;
      while (tentativas < pool.length) {
        const aluno = pool[poolIdx % pool.length];
        poolIdx++;
        tentativas++;
        if (idsNaTurma.has(aluno.id)) continue;

        Storage.create('turmaAlunos', {
          turmaId:      turma.id,
          turmaNome:    turma.nome,
          alunoId:      aluno.id,
          alunoNome:    aluno.nome,
          status:       'ativo',
          dataInscricao: now,
        });
        idsNaTurma.add(aluno.id);
        adicionados++;
        totalInscricoes++;
        break;
      }
    }

    if (adicionados > 0) {
      turmasPreenchidas++;
      const total = jaInscritos.length + adicionados;
      console.log(`✅ Turma "${turma.nome}" — ${adicionados} alunos adicionados (${total}/${capacidade})`);
    }
  });

  console.log(`\n🏆 Seed concluído!`);
  console.log(`   Turmas preenchidas: ${turmasPreenchidas}/${turmas.length}`);
  console.log(`   Inscrições criadas: ${totalInscricoes}`);
  console.log(`   Alunos disponíveis: ${alunosCriados.length}`);
  console.log(`\n💡 Para remover os alunos de seed: filtre por observação "(seed)" no módulo Alunos.`);

})();
