/**
 * SEED — Dados financeiros de 2025 para teste do PickleManager
 * Cole este script no Console do navegador (F12 → Console) e pressione Enter.
 * Para remover: localStorage.clear() ou use o próprio sistema.
 */
(function seedFinanceiro2025() {
  if (typeof Storage === 'undefined' || typeof FinanceiroModule === 'undefined') {
    console.error('❌ Execute na página do PickleManager com o usuário logado.');
    return;
  }

  const SK  = FinanceiroModule.STORAGE_KEY;
  const now = new Date().toISOString();

  const add = (data, tipo, categoria, descricao, valor, forma='pix', status='pago', ref='') =>
    Storage.create(SK, { tipo, data, descricao, categoria, valor,
      formaPagamento: forma, status, referencia: ref,
      observacoes: 'Seed 2025 — dados de teste' });

  // ── FATOR SAZONAL por mês (índice 0=jan … 11=dez)
  // Pico em set/out (campeonatos), baixa em jan/fev (férias/carnaval)
  const fRec  = [0.75, 0.78, 0.95, 1.00, 1.05, 0.90, 0.85, 1.00, 1.12, 1.18, 1.05, 0.82];
  const fDesp = [0.95, 0.95, 1.00, 1.00, 1.00, 1.00, 0.98, 1.00, 1.05, 1.05, 1.00, 0.95];

  // ── BASES MENSAIS
  const bMens  = 10500;   // mensalidades
  const bAvul  = 2200;    // aulas avulsas / pacotes
  const bDU    = 1400;    // day use
  const bLoja  = 1800;    // vendas loja
  const bSal   = 7200;    // salários (+ encargos)
  const bAluq  = 3800;    // aluguel (fixo)
  const bUtil  = 1400;    // luz/água/internet
  const bMkt   = 750;     // marketing

  const r = v => Math.round(v);

  for (let m = 0; m < 12; m++) {
    const mm   = String(m + 1).padStart(2, '0');
    const fr   = fRec[m];
    const fd   = fDesp[m];

    // ── RECEITAS
    add(`2025-${mm}-05`, 'receita', 'Mensalidade',        `Mensalidades — ${mm}/2025`,           r(bMens * fr));
    add(`2025-${mm}-10`, 'receita', 'Aula Avulsa',        `Aulas avulsas / pacotes — ${mm}/2025`, r(bAvul * fr));
    add(`2025-${mm}-15`, 'receita', 'Day Use',             `Day Use — ${mm}/2025`,                r(bDU   * fr));
    add(`2025-${mm}-18`, 'receita', 'Venda de Produtos',  `Loja — Vendas ${mm}/2025`,             r(bLoja * fr), 'cartao_credito');

    // ── EVENTOS: março (abertura), maio (torneio), setembro (campeonato), outubro (finals)
    if ([3, 5, 9, 10].includes(m + 1)) {
      const evVal = m === 8 ? 4800 : m === 9 ? 6200 : 2800; // set e out maiores
      add(`2025-${mm}-22`, 'receita', 'Inscrição em Evento', `Torneio / Evento — ${mm}/2025`, evVal, 'pix');
    }

    // ── CMV (≈ 42% das vendas da loja)
    add(`2025-${mm}-28`, 'cmv', 'cmv_loja', `CMV Loja — ${mm}/2025`, r(bLoja * fr * 0.42), 'transferencia');

    // ── DESPESAS FIXAS
    add(`2025-${mm}-01`, 'despesa', 'Salários',             `Folha salarial — ${mm}/2025`,        r(bSal  * fd), 'transferencia');
    add(`2025-${mm}-05`, 'despesa', 'Aluguel',              `Aluguel quadras — ${mm}/2025`,       bAluq,         'boleto');
    add(`2025-${mm}-10`, 'despesa', 'Água / Luz / Internet',`Utilidades — ${mm}/2025`,            r(bUtil * fd), 'boleto');

    // ── MARKETING (mais alto em meses de baixa para aquecer demanda)
    const mktVal = fr < 0.90 ? r(bMkt * 1.4) : r(bMkt * fd);
    add(`2025-${mm}-12`, 'despesa', 'Marketing', `Marketing / Redes — ${mm}/2025`, mktVal, 'cartao_credito');

    // ── MANUTENÇÃO (variável, pico em dez/jan — revisão)
    const manutVal = [0, 11].includes(m) ? 1200 : [4, 8].includes(m) ? 900 : 320;
    add(`2025-${mm}-20`, 'despesa', 'Manutenção', `Manutenção — ${mm}/2025`, manutVal, 'pix');

    // ── EQUIPAMENTOS: fev (bolas), jun (redes), ago (novos paddles), nov (uniforme)
    if ([2, 6, 8, 11].includes(m + 1)) {
      const eqVal = m === 8 ? 3200 : 1100;
      add(`2025-${mm}-25`, 'despesa', 'Equipamentos', `Equipamentos — ${mm}/2025`, eqVal, 'cartao_credito');
    }
  }

  // ── Resumo no console
  const total = Storage.getAll(SK).filter(l => l.data?.startsWith('2025'));
  const rec   = total.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const desp  = total.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  const cmv   = total.filter(l => l.tipo === 'cmv')    .reduce((s, l) => s + l.valor, 0);

  console.log(`✅ Seed 2025 concluído!`);
  console.log(`   Lançamentos criados : ${total.length}`);
  console.log(`   Receitas 2025       : R$ ${rec.toLocaleString('pt-BR', {minimumFractionDigits:2})}`);
  console.log(`   CMV 2025            : R$ ${cmv.toLocaleString('pt-BR', {minimumFractionDigits:2})}`);
  console.log(`   Despesas 2025       : R$ ${desp.toLocaleString('pt-BR', {minimumFractionDigits:2})}`);
  console.log(`   Resultado bruto     : R$ ${(rec - cmv - desp).toLocaleString('pt-BR', {minimumFractionDigits:2})}`);

  // Recarrega a tela
  if (typeof FinanceiroModule !== 'undefined') {
    FinanceiroModule._state.filterMes = '2025-01';
    FinanceiroModule.switchTab('lancamentos');
  }
})();
