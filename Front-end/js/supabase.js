// Configuração do Banco de Dados Supabase e Endereço do Servidor
// Substitua pelas credenciais de seu projeto Supabase:
const SUPABASE_URL = 'SUA_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_SUPABASE_ANON_KEY_AQUI';

// Endereço padrão da API do servidor Back-end Node.js (Express)
const BACKEND_API_URL = 'http://localhost:3000';

let supabaseClient = null;
let isSupabaseConfigured = false;

// Verifica se as credenciais padrão foram alteradas para conexão direta client-side
if (
  SUPABASE_URL && 
  SUPABASE_URL !== 'SUA_SUPABASE_URL_AQUI' && 
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY !== 'SUA_SUPABASE_ANON_KEY_AQUI'
) {
  isSupabaseConfigured = true;
}

if (isSupabaseConfigured && typeof supabase !== 'undefined') {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase configurado para conexão direta client-side.');
  } catch (err) {
    console.error('Erro ao instanciar o Supabase Client no Front-end:', err);
    isSupabaseConfigured = false;
  }
}

// Expõe globalmente
window.supabaseClient = supabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
window.BACKEND_API_URL = BACKEND_API_URL;
