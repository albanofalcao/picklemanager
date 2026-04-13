-- ============================================================
-- PICKLEMANAGER — Schema base multi-tenant
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GRUPOS ECONÔMICOS
-- ============================================================
CREATE TABLE grupos_economicos (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome          text NOT NULL,
  cnpj          text,
  responsavel   text,
  telefone      text,
  email         text,
  observacoes   text,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- ============================================================
-- TENANTS (Arenas — cada uma é um cliente do PickleManager)
-- ============================================================
CREATE TABLE tenants (
  id                    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  grupo_id              uuid REFERENCES grupos_economicos(id) ON DELETE SET NULL,

  -- Dados básicos
  nome                  text NOT NULL,
  slug                  text UNIQUE NOT NULL, -- usado na URL: picklemanager.app/arena-centro
  status                text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','inativa','suspensa')),
  plano                 text NOT NULL DEFAULT 'basico' CHECK (plano IN ('basico','pro','premium')),

  -- Endereço
  endereco              text,
  bairro                text,
  cidade                text,
  estado                text,
  cep                   text,
  area_total_m2         numeric,

  -- Contrato
  contrato_inicio       date,
  contrato_vigencia     date,
  canal_aquisicao       text,
  data_onboarding       date,
  observacoes_internas  text,

  -- Financeiro do contrato
  responsavel_cobranca  text DEFAULT 'arena' CHECK (responsavel_cobranca IN ('arena','grupo')),

  criado_em             timestamptz DEFAULT now(),
  atualizado_em         timestamptz DEFAULT now()
);

-- ============================================================
-- RESPONSÁVEIS DA ARENA (lista dinâmica)
-- ============================================================
CREATE TABLE tenant_responsaveis (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  telefone   text,
  email      text,
  cargo      text,
  principal  boolean DEFAULT false,
  criado_em  timestamptz DEFAULT now()
);

-- ============================================================
-- DOCUMENTOS DA ARENA
-- ============================================================
CREATE TABLE tenant_documentos (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  tipo        text, -- contrato, alvara, outro
  url         text, -- storage do Supabase
  enviado_em  timestamptz DEFAULT now()
);

-- ============================================================
-- HISTÓRICO DE PAGAMENTOS DO PLANO
-- ============================================================
CREATE TABLE tenant_pagamentos (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data_vencimento date NOT NULL,
  data_pagamento  date,
  valor           numeric NOT NULL,
  status          text DEFAULT 'pendente' CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  observacoes     text,
  criado_em       timestamptz DEFAULT now()
);

-- ============================================================
-- QUADRAS (infraestrutura da arena — lista dinâmica)
-- ============================================================
CREATE TABLE quadras (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        text NOT NULL, -- ex: "Quadra 1", "Quadra A"
  dimensoes   text,          -- ex: "10m x 20m"
  cobertura   text,          -- coberta, descoberta, semi-coberta
  tipo_piso   text,          -- saibro, cimento, madeira, emborrachado
  status      text DEFAULT 'ativa' CHECK (status IN ('ativa','inativa','manutencao')),
  criado_em   timestamptz DEFAULT now()
);

-- ============================================================
-- USUÁRIOS DO SISTEMA
-- ============================================================
CREATE TABLE usuarios (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id     uuid REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = super admin
  auth_id       uuid UNIQUE, -- Supabase Auth UID
  nome          text NOT NULL,
  email         text NOT NULL,
  login         text,
  perfil        text NOT NULL CHECK (perfil IN ('superadmin','admin','gerente','recepcionista','financeiro','professor','aluno')),
  status        text DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_documentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_pagamentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quadras            ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_economicos  ENABLE ROW LEVEL SECURITY;

-- Função helper: retorna tenant_id do usuário logado
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM usuarios WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Função helper: verifica se é super admin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_id = auth.uid() AND perfil = 'superadmin'
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- ---- Policies: tenants ----
CREATE POLICY "superadmin vê todos os tenants"
  ON tenants FOR ALL USING (is_superadmin());

CREATE POLICY "admin vê seu próprio tenant"
  ON tenants FOR SELECT USING (id = auth_tenant_id());

-- ---- Policies: tenant_responsaveis ----
CREATE POLICY "superadmin acessa todos responsaveis"
  ON tenant_responsaveis FOR ALL USING (is_superadmin());

CREATE POLICY "tenant acessa seus responsaveis"
  ON tenant_responsaveis FOR ALL USING (tenant_id = auth_tenant_id());

-- ---- Policies: tenant_documentos ----
CREATE POLICY "superadmin acessa todos documentos"
  ON tenant_documentos FOR ALL USING (is_superadmin());

CREATE POLICY "tenant acessa seus documentos"
  ON tenant_documentos FOR ALL USING (tenant_id = auth_tenant_id());

-- ---- Policies: tenant_pagamentos ----
CREATE POLICY "superadmin acessa todos pagamentos"
  ON tenant_pagamentos FOR ALL USING (is_superadmin());

CREATE POLICY "tenant acessa seus pagamentos"
  ON tenant_pagamentos FOR ALL USING (tenant_id = auth_tenant_id());

-- ---- Policies: quadras ----
CREATE POLICY "superadmin acessa todas quadras"
  ON quadras FOR ALL USING (is_superadmin());

CREATE POLICY "tenant acessa suas quadras"
  ON quadras FOR ALL USING (tenant_id = auth_tenant_id());

-- ---- Policies: usuarios ----
CREATE POLICY "superadmin acessa todos usuarios"
  ON usuarios FOR ALL USING (is_superadmin());

CREATE POLICY "tenant acessa seus usuarios"
  ON usuarios FOR ALL USING (tenant_id = auth_tenant_id());

-- ---- Policies: grupos_economicos ----
CREATE POLICY "superadmin acessa grupos"
  ON grupos_economicos FOR ALL USING (is_superadmin());

-- ============================================================
-- TRIGGERS: atualiza atualizado_em automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_atualizado
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_usuarios_atualizado
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ============================================================
-- SUPER ADMIN INICIAL (ajuste o email)
-- ============================================================
-- Após criar o usuário no Supabase Auth, rode:
-- INSERT INTO usuarios (auth_id, nome, email, perfil, tenant_id)
-- VALUES ('<auth-uid-aqui>', 'Albano Falcao', 'seu@email.com', 'superadmin', NULL);
