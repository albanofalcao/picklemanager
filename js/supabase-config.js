'use strict';

const SUPABASE_URL = 'https://yvjcbvhkoukptpfnhwgt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KI5wL-O5QMqkdVKOxJwKGg_yJkXlsrx';

const SupabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (!SupabaseClient) {
  console.warn('Supabase SDK não carregado — operando em modo localStorage.');
}
