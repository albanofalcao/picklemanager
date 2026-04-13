'use strict';

const SUPABASE_URL = 'https://yvjcbvhkoukptpfnhwgt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KI5wL-O5QMqkdVKOxJwKGg_yJkXlsrx';

/**
 * TENANT_ID — ID da arena no Supabase.
 * Deixe vazio ('') para rodar em modo localStorage (demo local).
 * Preencha com o UUID da arena criada no Painel Administrativo.
 *
 * Exemplo: const TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
 */
const TENANT_ID = '';

const SupabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (!SupabaseClient) {
  console.warn('Supabase SDK não carregado — operando em modo localStorage.');
}
