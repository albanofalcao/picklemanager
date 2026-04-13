-- ============================================================
-- PickleManager — Tabelas da aplicação (multi-tenant)
-- Padrão: id TEXT, tenant_id UUID, data JSONB, timestamps
-- Execute no Supabase SQL Editor
-- ============================================================

-- Helper para criar tabelas app no padrão JSONB
-- Todas as tabelas usam id TEXT (compatível com o app)
-- e JSONB para os campos de negócio (zero schema drift)

-- ─────────────────────────────────────────────
-- Alunos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_alunos (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_alunos_tenant ON app_alunos(tenant_id);

-- ─────────────────────────────────────────────
-- Professores
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_professores (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_professores_tenant ON app_professores(tenant_id);

-- ─────────────────────────────────────────────
-- Planos de Contratação
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_planos (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_planos_tenant ON app_planos(tenant_id);

-- ─────────────────────────────────────────────
-- Matrículas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_matriculas (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_matriculas_tenant ON app_matriculas(tenant_id);

-- ─────────────────────────────────────────────
-- Turmas (Grades)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_turmas (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_turmas_tenant ON app_turmas(tenant_id);

-- ─────────────────────────────────────────────
-- Turma–Aluno (inscrições)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_turma_alunos (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_turma_alunos_tenant ON app_turma_alunos(tenant_id);

-- ─────────────────────────────────────────────
-- Aulas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_aulas (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_aulas_tenant ON app_aulas(tenant_id);

-- ─────────────────────────────────────────────
-- Presenças
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_presencas (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_presencas_tenant ON app_presencas(tenant_id);

-- ─────────────────────────────────────────────
-- Reposições
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_reposicoes (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_reposicoes_tenant ON app_reposicoes(tenant_id);

-- ─────────────────────────────────────────────
-- Arenas (quadras da academia)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_arenas (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_arenas_tenant ON app_arenas(tenant_id);

-- ─────────────────────────────────────────────
-- Quadras (sub-quadras dentro de arena)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_quadras (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_quadras_tenant ON app_quadras(tenant_id);

-- ─────────────────────────────────────────────
-- Eventos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_eventos (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_eventos_tenant ON app_eventos(tenant_id);

-- ─────────────────────────────────────────────
-- Financeiro (lançamentos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_financeiro (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_financeiro_tenant ON app_financeiro(tenant_id);

-- ─────────────────────────────────────────────
-- Plano de Contas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_plano_contas (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_plano_contas_tenant ON app_plano_contas(tenant_id);

-- ─────────────────────────────────────────────
-- Manutenção (chamados corretivos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_manutencao (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_manutencao_tenant ON app_manutencao(tenant_id);

-- ─────────────────────────────────────────────
-- Manutenção Preventiva
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_manutencao_prev (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_manutencao_prev_tenant ON app_manutencao_prev(tenant_id);

-- ─────────────────────────────────────────────
-- Loja — Produtos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_loja_produtos (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_loja_produtos_tenant ON app_loja_produtos(tenant_id);

-- ─────────────────────────────────────────────
-- Loja — Fornecedores
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_loja_fornecedores (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_loja_fornecedores_tenant ON app_loja_fornecedores(tenant_id);

-- ─────────────────────────────────────────────
-- Loja — Vendas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_loja_vendas (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_loja_vendas_tenant ON app_loja_vendas(tenant_id);

-- ─────────────────────────────────────────────
-- Loja — Movimentações de Estoque
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_loja_estoque_mov (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_loja_estoque_mov_tenant ON app_loja_estoque_mov(tenant_id);

-- ─────────────────────────────────────────────
-- Loja — Pedidos de Compra
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_loja_compras (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_loja_compras_tenant ON app_loja_compras(tenant_id);

-- ─────────────────────────────────────────────
-- Day Use — Entradas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_dayuse_entradas (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_dayuse_entradas_tenant ON app_dayuse_entradas(tenant_id);

-- ─────────────────────────────────────────────
-- Day Use — Planos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_dayuse_planos (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_dayuse_planos_tenant ON app_dayuse_planos(tenant_id);

-- ─────────────────────────────────────────────
-- Usuários da Arena (admin, professores, recepção...)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_usuarios (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_usuarios_tenant ON app_usuarios(tenant_id);

-- ─────────────────────────────────────────────
-- Perfis de acesso
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_perfis (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_perfis_tenant ON app_perfis(tenant_id);

-- ─────────────────────────────────────────────
-- Catálogos (categorias de receita, despesa, tipos de aula, evento, especialidades)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_catalogos (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo       TEXT        NOT NULL,   -- 'cat_receita', 'cat_despesa', 'cat_tipos_aula', etc.
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_catalogos_tenant_tipo ON app_catalogos(tenant_id, tipo);

-- ─────────────────────────────────────────────
-- Configurações da Academia
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  id         TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_app_config_tenant ON app_config(tenant_id);
