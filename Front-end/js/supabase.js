// Configuração do Banco de Dados Supabase e Endereço do Servidor
// Substitua pelas credenciais de seu projeto Supabase:
const SUPABASE_URL = 'SUA_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_SUPABASE_ANON_KEY_AQUI';

// Detecta automaticamente se está rodando localmente ou em produção
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname === '' || 
                window.location.protocol === 'file:';
const BACKEND_API_URL = isLocal ? 'http://localhost:3000' : 'https://nuvuy-api.onrender.com';

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
