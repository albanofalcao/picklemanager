# Especificação — Módulo de Fornecedores (Gestão ISO 15189)

## Ciclo em duas fases

### FASE 1 — QUALIFICAÇÃO INICIAL
- Fornecedor cadastrado
- Define-se quais produtos/serviços quer fornecer
- Sistema exige requisitos por categoria (ex: Reagente exige: ANVISA, INMETRO, ISO, Amostra aprovada)
- Fornecedor atende requisito por requisito (com documento)
- Quando todos obrigatórios atendidos → QUALIFICADO para aquele produto
- Só aí aparece como opção no pedido de compra

### FASE 2 — AVALIAÇÃO CONTÍNUA
- Após cada fornecimento (ou periodicamente)
- Avaliação por critérios com peso
- Nota ponderada → define novo status

## Status e escala de notas

| Status            | Nota      | Efeito                                        |
|-------------------|-----------|-----------------------------------------------|
| 🔴 Suspenso        | 0 – 3,9   | Bloqueado — não aparece em pedidos            |
| 🟡 Semi-qualificado| 4,0 – 5,9 | Permitido com alerta de risco                 |
| 🟢 Qualificado     | 6,0 – 7,9 | Aprovado normalmente                          |
| ⭐ Super Qualificado| 8,0 – 10 | Preferencial — destacado no pedido            |

## Modelo de dados

### fornecedores
- Cadastro geral + status_geral calculado

### requisitos_qualificacao
- Por categoria de produto (REAGENTE, MATERIAL, SERVIÇO...)
- Tipo: DOCUMENTO | CERTIFICAÇÃO | AMOSTRA | VISITA_TÉCNICA
- obrigatorio: true/false

### fornecedor_qualificacao
- Fornecedor × categoria de produto/serviço
- Status: PENDENTE | EM_ANÁLISE | QUALIFICADO | REPROVADO
- data_qualificacao, data_validade

### qualificacao_requisito
- Quais requisitos foram atendidos + documento + data

### criterios_avaliacao
- Nome, peso (soma = 100%)
- Ex: Prazo 25% | Qualidade 40% | Preço 20% | Atendimento 15%

### avaliacao_fornecedor
- Por período ou por pedido de compra
- nota_total ponderada → status_resultante automático

### avaliacao_criterio
- Nota 0-10 por critério + observação

## Regras de negócio

1. Pedido de compra filtra só fornecedores Qualificados ou Super Qualificados para aquela categoria
2. Fornecedor Suspenso → bloqueado em todos os pedidos, alerta no dashboard
3. Qualificação tem validade (ex: 12 meses) → vence → volta a Semi-qualificado
4. Avaliação pode ser disparada automaticamente após recebimento de pedido

## Ordem de construção

1. Fornecedores + Requisitos de Qualificação
2. Processo de Qualificação por produto
3. Critérios de Avaliação + Avaliação periódica
4. Integração com Pedidos de Compra
