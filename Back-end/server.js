const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { evaluateLeadWithAI } = require('./ai');
const { scrapeLeads } = require('./scraper');

// Carrega variáveis do arquivo .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const now = () => new Date().toLocaleTimeString('pt-BR');

// Caminho para a pasta front-end (um nível acima do Back-end)
const frontEndPath = path.join(__dirname, '..', 'Front-end');

// Configuração de CORS (Habilita chamadas a partir das páginas HTML locais)
app.use(cors());
app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`[${now()}] ${req.method} ${req.url}`);
  next();
});

// Serve arquivos estáticos do front-end
app.use(express.static(frontEndPath));

// Redireciona / para /dashboard.html
app.get('/', (req, res) => {
  res.redirect('/dashboard.html');
});

// Rotas limpas (sem .html) para compatibilidade com os links do front-end
app.get('/dashboard', (req, res) => res.redirect('/dashboard.html'));
app.get('/login', (req, res) => res.redirect('/login.html'));
app.get('/configuracoes', (req, res) => res.redirect('/configuracoes.html'));
app.get('/planos', (req, res) => res.redirect('/planos.html'));
app.get('/leads-inteligentes', (req, res) => res.redirect('/leads-inteligentes.html'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let supabaseAdmin = null;

if (
  supabaseUrl && 
  supabaseUrl !== 'SUA_SUPABASE_URL_AQUI' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'SUA_SUPABASE_ANON_KEY_AQUI'
) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Tenta criar client admin com service_role key (opcional, para bypass de RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && serviceRoleKey !== 'SUA_SERVICE_ROLE_KEY_AQUI') {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('Supabase Admin configurado com service_role key.');
  } else {
    console.warn('Supabase Admin NÃO configurado (sem SUPABASE_SERVICE_ROLE_KEY). Operações em usuario podem falhar com RLS.');
    supabaseAdmin = supabase; // fallback para anon key
  }

  console.log('Supabase configurado com sucesso no Back-end.');
} else {
  console.warn('Supabase NÃO configurado no Back-end. Por favor, crie um arquivo .env com suas chaves.');
}

// Map: nome do plano → créditos mensais
const PLAN_CREDITS = {
  gratuito: 100,
  básico: 400,
  basico: 400,
  pro: 1200,
  business: 2000
};

// Map: nome do plano → regras de negócio
const PLAN_RULES = {
  gratuito: { max_leads_por_tarefa: 10, max_buscas_mes: 5, instagram: false },
  básico:  { max_leads_por_tarefa: 10, max_buscas_mes: 20, instagram: true },
  basico:  { max_leads_por_tarefa: 10, max_buscas_mes: 20, instagram: true },
  pro:     { max_leads_por_tarefa: 20, max_buscas_mes: 60, instagram: true },
  business:{ max_leads_por_tarefa: 30, max_buscas_mes: 100, instagram: true }
};

const getPlanRules = (plano) => PLAN_RULES[plano?.toLowerCase()] || PLAN_RULES.gratuito;

const countSearchesThisMonth = async (userId) => {
  if (!supabaseAdmin) return 0;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count, error } = await supabaseAdmin
    .from('tarefas')
    .select('id', { count: 'exact', head: true })
    .eq('id_usuario', userId)
    .gte('data', startOfMonth);
  if (error) return 0;
  return count || 0;
};

// Auxiliar para extrair o JWT do cabeçalho de Autorização (Bearer Token)
const getAuthToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// Cria um cliente Supabase autenticado com o token da requisição
const authedClient = (token) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

// Verifica se o período do usuário expirou e renova os créditos
const checkAndRenewCredits = async (userClient, user) => {
  if (!supabaseAdmin) return { plano: 'gratuito', creditos_restantes: 100, creditos_utilizados: 0 };

  let { data: usuario, error: queryError } = await supabaseAdmin
    .from('usuario')
    .select('plano, creditos_restantes, creditos_utilizados, periodo_inicio, proxima_renovacao')
    .eq('id', user.id)
    .single();

  if (queryError) {
    console.warn(`[${now()}] Erro ao buscar usuário: ${queryError.message}`);
  }

  // Se não achou o usuário na tabela, cria o registro
  if (!usuario) {
    const nome = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
    const email = user.email || '';
    const agora = new Date().toISOString();
    const renovacao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from('usuario')
      .insert({
        id: user.id,
        nome,
        email,
        plano: 'gratuito',
        creditos_restantes: 100,
        creditos_utilizados: 0,
        periodo_inicio: agora,
        proxima_renovacao: renovacao
      });

    if (insertError) {
      console.warn(`[${now()}] Erro ao criar registro de usuário: ${insertError.message}`);
    }

    usuario = {
      plano: 'gratuito',
      creditos_restantes: 100,
      creditos_utilizados: 0,
      periodo_inicio: agora,
      proxima_renovacao: renovacao
    };
  }

  // Se nunca foram inicializados, seta valores padrão
  if (usuario.creditos_restantes === null || usuario.creditos_restantes === undefined) {
    const creditos = PLAN_CREDITS[usuario.plano?.toLowerCase()] || 100;
    const agora = new Date();
    await supabaseAdmin
      .from('usuario')
      .update({
        creditos_restantes: creditos,
        creditos_utilizados: 0,
        periodo_inicio: agora.toISOString(),
        proxima_renovacao: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', user.id);
    return { ...usuario, creditos_restantes: creditos, creditos_utilizados: 0 };
  }

  const agora = new Date();
  const renovacao = usuario.proxima_renovacao ? new Date(usuario.proxima_renovacao) : null;

  if (!renovacao || agora >= renovacao) {
    const creditos = PLAN_CREDITS[usuario.plano?.toLowerCase()] || 100;
    await supabaseAdmin
      .from('usuario')
      .update({
        creditos_restantes: creditos,
        creditos_utilizados: 0,
        periodo_inicio: agora.toISOString(),
        proxima_renovacao: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', user.id);
    return { ...usuario, creditos_restantes: creditos, creditos_utilizados: 0 };
  }

  return usuario;
};

// Retorna erro amigável ao cliente (nunca expõe detalhes internos)
const safeError = (err) => {
  console.error(`[${now()}] Erro interno:`, err?.message || err);
  return { error: 'Ocorreu um erro interno. Tente novamente.' };
};

// Rota de status do Back-end
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    supabaseConfigured: !!supabase,
    supabaseAdminConfigured: !!supabaseAdmin && supabaseAdmin !== supabase
  });
});

// Rota de debug: verifica config (só para admin)
app.get('/api/debug/config', (req, res) => {
  res.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'SUA_SERVICE_ROLE_KEY_AQUI',
    adminSeparate: supabaseAdmin !== supabase
  });
});

// Rota: obter uso de créditos do usuário logado
app.get('/api/user/usage', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase não inicializado.' });

  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });

  try {
    const userClient = authedClient(token);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Sessão inválida.' });

    const usuario = await checkAndRenewCredits(userClient, user);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const creditos = PLAN_CREDITS[usuario.plano?.toLowerCase()] || 100;
    const leadsRestantes = Math.floor(usuario.creditos_restantes / 2);
    const leadsTotal = Math.floor(creditos / 2);
    const leadsUtilizados = usuario.creditos_utilizados
      ? Math.floor(usuario.creditos_utilizados / 2)
      : 0;

    res.json({
      success: true,
      plan: usuario.plano,
      creditos_restantes: usuario.creditos_restantes,
      creditos_utilizados: usuario.creditos_utilizados,
      leads_restantes: leadsRestantes,
      leads_total: leadsTotal,
      leads_utilizados: leadsUtilizados,
      periodo_inicio: usuario.periodo_inicio,
      proxima_renovacao: usuario.proxima_renovacao
    });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota: obter regras do plano do usuário logado
app.get('/api/user/plan-rules', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase não inicializado.' });

  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });

  try {
    const userClient = authedClient(token);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Sessão inválida.' });

    const usuario = await checkAndRenewCredits(userClient, user);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const rules = getPlanRules(usuario.plano);
    const searchesThisMonth = await countSearchesThisMonth(user.id);

    res.json({
      success: true,
      plan: usuario.plano,
      rules,
      searches_this_month: searchesThisMonth
    });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota de Cadastro de Usuário (signUp)
app.post('/api/auth/signup', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        },
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5500'}/dashboard.html`
      }
    });

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota de Login de Usuário (signInWithPassword)
app.post('/api/auth/login', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota de Recuperação de Senha (resetPasswordForEmail)
app.post('/api/auth/recover', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const { email, redirectTo } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota para Atualizar Perfil de Usuário (Metadados - requer token ativo do usuário)
app.put('/api/user/profile', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão não fornecido.' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'O novo nome é obrigatório.' });
  }

  try {
    // Cria um cliente Supabase específico usando o token de sessão do usuário logado
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data, error } = await userClient.auth.updateUser({
      data: { full_name: name }
    });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota para Atualizar Senha de Usuário (requer token ativo do usuário)
app.put('/api/user/password', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão não fornecido.' });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'A nova senha é obrigatória.' });
  }

  try {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data, error } = await userClient.auth.updateUser({
      password: password
    });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota para criar tarefa e capturar/gerar leads salvando no banco de dados
// ---------------------------------------------------------------------------
// Fila de Jobs (job_queue) para captura assíncrona de leads
// ---------------------------------------------------------------------------

// Cria o job na fila e retorna imediatamente
app.post('/api/tarefas', async (req, res) => {
  console.log(`\n[${now()}] ===== NOVA CAPTURA (async) ====`);
  console.log(`[${now()}] Body: nicho="${req.body.nicho}", regiao="${req.body.regiao}", qtd=${req.body.quantidade}, fontes=[${req.body.fontes}]`);

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão não fornecido.' });
  }

  const { nicho, regiao, quantidade, fontes } = req.body;
  if (!nicho || !regiao || !quantidade || !fontes || !Array.isArray(fontes)) {
    return res.status(400).json({ error: 'Nicho, região, quantidade e fontes são obrigatórios.' });
  }

  try {
    const userClient = authedClient(token);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    const usuario = await checkAndRenewCredits(userClient, user);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const planRules = getPlanRules(usuario.plano);
    const leadsSolicitados = Math.min(parseInt(quantidade) || 1, planRules.max_leads_por_tarefa);
    const creditosNecessarios = leadsSolicitados * 2;

    if (parseInt(quantidade) > planRules.max_leads_por_tarefa) {
      return res.status(403).json({
        error: 'Limite do plano excedido',
        message: `Seu plano ${usuario.plano} permite no máximo ${planRules.max_leads_por_tarefa} leads por tarefa.`
      });
    }

    const searchesThisMonth = await countSearchesThisMonth(user.id);
    if (searchesThisMonth >= planRules.max_buscas_mes) {
      return res.status(403).json({
        error: 'Limite de buscas mensais excedido',
        message: `Seu plano ${usuario.plano} permite apenas ${planRules.max_buscas_mes} buscas por mês. Faça um upgrade.`
      });
    }

    if (usuario.creditos_restantes < creditosNecessarios) {
      return res.status(403).json({
        error: 'Créditos insuficientes',
        leads_restantes: Math.floor(usuario.creditos_restantes / 2),
        leads_solicitados: leadsSolicitados,
        message: `Você possui apenas ${Math.floor(usuario.creditos_restantes / 2)} lead(s) disponível(is) este mês. Faça um upgrade de plano para continuar captando.`
      });
    }

    // Filtra Instagram do array se o plano não permitir
    const effectiveFontes = [...fontes];
    if (!planRules.instagram && effectiveFontes.includes('instagram')) {
      const idx = effectiveFontes.indexOf('instagram');
      if (idx > -1) effectiveFontes.splice(idx, 1);
    }

    // Insere o job na fila (status = pending)
    const { data: job, error: jobErr } = await supabaseAdmin
      .from('job_queue')
      .insert({
        user_id: user.id,
        nicho,
        regiao,
        quantidade: leadsSolicitados,
        fontes: effectiveFontes,
        status: 'pending'
      })
      .select()
      .single();

    if (jobErr) throw jobErr;

    console.log(`[${now()}] Job enfileirado: ${job.id} para usuário ${user.id}`);

    res.status(201).json({
      success: true,
      job_id: job.id,
      message: 'Captura iniciada. Acompanhe o progresso...'
    });
  } catch (error) {
    console.error(`[${now()}] ERRO ao enfileirar job: ${error.message}`);
    res.status(400).json(safeError(error));
  }
});

// Polling de status do job
app.get('/api/jobs/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase não inicializado.' });

  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });

  try {
    const userClient = authedClient(token);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Sessão inválida.' });

    const { data: job, error: jobErr } = await supabaseAdmin
      .from('job_queue')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .single();

    if (jobErr || !job) return res.status(404).json({ error: 'Job não encontrado.' });

    const response = {
      success: true,
      status: job.status,
      job_id: job.id
    };

    if (job.status === 'completed') {
      response.data = job.result;

      // Busca saldo atualizado do usuário
      const { data: usuario } = await supabaseAdmin
        .from('usuario')
        .select('creditos_restantes')
        .eq('id', user.id)
        .single();
      if (usuario) {
        response.creditos_restantes = usuario.creditos_restantes;
        response.leads_restantes = Math.floor(usuario.creditos_restantes / 2);
      }
    }

    if (job.status === 'failed') {
      response.error = job.error_message;
    }

    res.json(response);
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota para obter todos os leads do usuário logado
app.get('/api/leads', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão não fornecido.' });
  }

  try {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // 1. Obtém o usuário ativo para garantir sessão válida
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    // 2. Busca todas as tarefas do usuário para garantir filtro correto
    const { data: tarefas, error: tarefasErr } = await userClient
      .from('tarefas')
      .select('id')
      .eq('id_usuario', user.id);

    if (tarefasErr) throw tarefasErr;
    if (!tarefas || tarefas.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const tarefaIds = tarefas.map(t => t.id);

    // 3. Busca todos os leads vinculados a essas tarefas
    const { data: leads, error: leadsErr } = await userClient
      .from('lead')
      .select(`
        id,
        nome,
        email,
        telefone,
        website,
        endereco,
        categoria,
        data_captura,
        score (
          pontuacao,
          classificacao,
          justificativa_ia
        ),
        metrica_google_maps (
          nota_avaliacao,
          qtd_comentarios,
          qualidade_imagens
        ),
        metrica_instagram (
          qtd_seguidores,
          qtd_postagem,
          taxa_engajamento,
          qualidade_postagem,
          nicho_atuacao
        )
      `)
      .in('id_tarefas', tarefaIds)
      .order('data_captura', { ascending: false });

    if (leadsErr) throw leadsErr;

    // 4. Formata o retorno para a UI
    const formattedLeads = leads.map(l => {
      const score = l.score ? (Array.isArray(l.score) ? l.score[0] : l.score) : null;
      const maps = l.metrica_google_maps ? (Array.isArray(l.metrica_google_maps) ? l.metrica_google_maps[0] : l.metrica_google_maps) : null;
      const insta = l.metrica_instagram ? (Array.isArray(l.metrica_instagram) ? l.metrica_instagram[0] : l.metrica_instagram) : null;

      let source = 'Google Maps';
      if (insta && !maps) {
        source = 'Instagram';
      } else if (maps && insta) {
        source = 'Google Maps + Instagram';
      }

      return {
        id: l.id,
        title: l.nome,
        percent: score ? score.pontuacao : 0,
        type: score ? score.classificacao : 'frio',
        category: l.categoria || 'GERAL',
        rating: maps ? parseFloat(maps.nota_avaliacao || 0).toFixed(1) : '0.0',
        source: source,
        phone: l.telefone || '',
        email: l.email || '',
        website: l.website || '',
        address: l.endereco || '',
        instagram: insta ? `@${l.nome.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '',
        date: l.data_captura ? new Date(l.data_captura).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        justificativa_ia: score ? score.justificativa_ia : '',
        mapsMetrics: maps ? {
          qtd_comentarios: maps.qtd_comentarios,
          nota_avaliacao: maps.nota_avaliacao,
          qualidade_imagens: maps.qualidade_imagens
        } : null,
        instaMetrics: insta ? {
          qtd_seguidores: insta.qtd_seguidores,
          qtd_postagem: insta.qtd_postagem,
          taxa_engajamento: insta.taxa_engajamento,
          qualidade_postagem: insta.qualidade_postagem,
          nicho_atuacao: insta.nicho_atuacao
        } : null
      };
    });

    res.json({ success: true, data: formattedLeads });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota para deletar leads (tudo ou filtrado por coluna/classificação)
app.delete('/api/leads', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão não fornecido.' });
  }

  try {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // 1. Obtém o usuário ativo
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    // 2. Busca todas as tarefas do usuário logado
    const { data: tarefas, error: tarefasErr } = await userClient
      .from('tarefas')
      .select('id')
      .eq('id_usuario', user.id);

    if (tarefasErr) throw tarefasErr;
    if (!tarefas || tarefas.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const tarefaIds = tarefas.map(t => t.id);
    const type = req.query.type; // 'quente', 'morno', 'frio'

    if (type) {
      // 3. Busca IDs de leads para o tipo especificado
      const { data: scores, error: scoreErr } = await userClient
        .from('score')
        .select('id_lead')
        .eq('classificacao', type);

      if (scoreErr) throw scoreErr;
      if (!scores || scores.length === 0) {
        return res.json({ success: true, count: 0 });
      }

      const leadIdsToDelete = scores.map(s => s.id_lead);

      // 4. Deleta apenas os leads daquela classificação correspondente às tarefas do usuário
      const { error: deleteErr } = await userClient
        .from('lead')
        .delete()
        .in('id', leadIdsToDelete)
        .in('id_tarefas', tarefaIds);

      if (deleteErr) throw deleteErr;
      res.json({ success: true, message: `Leads da coluna ${type} deletados com sucesso.` });
    } else {
      // Deleta todos os leads vinculados às tarefas do usuário
      const { error: deleteErr } = await userClient
        .from('lead')
        .delete()
        .in('id_tarefas', tarefaIds);

      if (deleteErr) throw deleteErr;
      res.json({ success: true, message: 'Todos os leads foram deletados com sucesso.' });
    }
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// Rota para Logout (Sair)
app.post('/api/auth/logout', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(200).json({ success: true }); // Se não há token, já está fora
  }

  try {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    await userClient.auth.signOut();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json(safeError(error));
  }
});

// --- MisticPay Integration ---
const MISTICPAY_API_URL = 'https://api.misticpay.com';
const misticpayCi = process.env.MISTICPAY_CI;
const misticpayCs = process.env.MISTICPAY_CS;

// Rota: Criar preferência de pagamento (gera QR Code PIX)
app.post('/api/create-preference', async (req, res) => {
  try {
    const { planName, price, userId, payerName, payerDocument } = req.body;
    if (!planName || !price || !userId) {
      return res.status(400).json({ error: 'planName, price e userId são obrigatórios.' });
    }

    if (!misticpayCi || !misticpayCs || misticpayCs === 'SUA_MISTICPAY_CS') {
      return res.status(400).json({ error: 'MISTICPAY_CI ou MISTICPAY_CS não configurados no servidor. Verifique as variáveis de ambiente no Render.' });
    }

    const customId = `nuvuy_${userId}_${planName}_${Date.now()}`;

    console.log(`[${now()}] Chamando MisticPay API: ${MISTICPAY_API_URL}/api/transactions/create`);
    const response = await fetch(`${MISTICPAY_API_URL}/api/transactions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ci': misticpayCi,
        'cs': misticpayCs
      },
      body: JSON.stringify({
        amount: parseFloat(price),
        payerName: payerName || 'Cliente Nuvuy',
        payerDocument: payerDocument || '00000000000',
        transactionId: customId,
        description: `Plano ${planName} - Nuvuy`,
        projectWebhook: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhook/misticpay`
      })
    });

    const data = await response.json();
    console.log(`[${now()}] Resposta MisticPay: status=${response.status}`, JSON.stringify(data));
    if (!response.ok) throw new Error(data.message || data.error || `Erro MisticPay (${response.status})`);

    const misticpayId = String(data.data?.transactionId || '');
    if (misticpayId && supabaseAdmin) {
      await supabaseAdmin.from('payment_transaction').insert({
        user_id: userId,
        plan_name: planName,
        price: parseFloat(price),
        misticpay_transaction_id: misticpayId,
        custom_id: customId,
        status: 'PENDENTE'
      });
    }

    res.json({
      success: true,
      qrCodeBase64: data.data?.qrCodeBase64 || null,
      qrcodeUrl: data.data?.qrcodeUrl || null,
      copyPaste: data.data?.copyPaste || null,
      transactionId: misticpayId,
      externalId: customId
    });
  } catch (error) {
    console.error(`[${now()}] Erro MisticPay: ${error.message}`);
    res.status(500).json(safeError(error));
  }
});
// Rota: Webhook para confirmar pagamento
app.post('/api/webhook/misticpay', async (req, res) => {
  try {
    const payload = req.body;
    const misticpayId = String(payload.transactionId || '');

    if (!misticpayId) {
      return res.status(400).json({ error: 'transactionId é obrigatório' });
    }

    // Busca a transação no banco
    const { data: tx, error: txErr } = await supabaseAdmin
      .from('payment_transaction')
      .select('*')
      .eq('misticpay_transaction_id', misticpayId)
      .single();

    if (txErr || !tx) {
      console.warn(`[${now()}] Webhook rejeitado: transactionId ${misticpayId} não encontrado no banco`);
      return res.status(401).json({ error: 'Transação não reconhecida' });
    }

    if (tx.status !== 'PENDENTE') {
      console.warn(`[${now()}] Webhook rejeitado: transactionId ${misticpayId} já processado (${tx.status})`);
      return res.status(409).json({ error: 'Transação já processada' });
    }

    console.log(`[${now()}] Webhook MisticPay recebido:`, JSON.stringify(payload));

    if (payload.transactionType === 'DEPOSITO' && payload.status === 'COMPLETO') {
      console.log(`[${now()}] Pagamento confirmado: userId=${tx.user_id}, plan=${tx.plan_name}`);

      if (supabase) {
        const planName = tx.plan_name.toLowerCase();
        const creditos = PLAN_CREDITS[planName] || 100;
        const agora = new Date().toISOString();
        const renovacao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Atualiza plano do usuário
        await supabaseAdmin
          .from('usuario')
          .update({
            plano: planName,
            creditos_restantes: creditos,
            creditos_utilizados: 0,
            periodo_inicio: agora,
            proxima_renovacao: renovacao
          })
          .eq('id', tx.user_id);

        // Marca transação como completa
        await supabaseAdmin
          .from('payment_transaction')
          .update({ status: 'COMPLETO', updated_at: agora, completed_at: agora })
          .eq('id', tx.id);
      }
    } else {
      console.log(`[${now()}] Webhook ignorado: type=${payload.transactionType}, status=${payload.status}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`[${now()}] Erro no webhook MisticPay: ${error.message}`);
    res.status(200).json({ received: true });
  }
});

// Rota: Verificar status do pagamento (polling do frontend)
app.get('/api/check-payment/:customId', async (req, res) => {
  try {
    const { customId } = req.params;

    // Busca no banco pela primeira transação com esse customId
    if (supabaseAdmin) {
      const { data: tx } = await supabaseAdmin
        .from('payment_transaction')
        .select('status, plan_name')
        .eq('custom_id', customId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tx) {
        return res.json({ status: tx.status, planName: tx.plan_name });
      }
    }

    // Se não achou no banco, tenta checar na MisticPay
    const numericId = customId.split('_').pop();
    const checkResponse = await fetch(`${MISTICPAY_API_URL}/api/transactions/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ci': misticpayCi,
        'cs': misticpayCs
      },
      body: JSON.stringify({ transactionId: parseInt(numericId) || customId })
    });
    const checkData = await checkResponse.json();
    const txState = checkData.transaction?.transactionState || 'PENDENTE';
    res.json({ status: txState });
  } catch (error) {
    console.error(`[${now()}] Erro ao verificar pagamento: ${error.message}`);
    res.json({ status: 'PENDENTE' });
  }
});

// ---------------------------------------------------------------------------
// Worker de fila — processa jobs pendentes um por vez
// ---------------------------------------------------------------------------

let workerRunning = false;

const processNextJob = async () => {
  if (workerRunning || !supabaseAdmin) return;
  workerRunning = true;

  try {
    // Pega o job pendente mais antigo
    const { data: jobs, error } = await supabaseAdmin
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) { console.error(`[${now()}] Worker: erro ao buscar jobs: ${error.message}`); return; }
    if (!jobs || jobs.length === 0) return;

    const job = jobs[0];
    console.log(`\n[${now()}] Worker: processando job ${job.id} (${job.quantidade}x "${job.nicho}" / "${job.regiao}")`);

    // Marca como processing
    await supabaseAdmin
      .from('job_queue')
      .update({ status: 'processing', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', job.id);

    const { nicho, regiao, quantidade, fontes } = job;

    // 1. Busca dados do usuário para créditos
    const { data: usuario } = await supabaseAdmin
      .from('usuario')
      .select('*')
      .eq('id', job.user_id)
      .single();

    if (!usuario) {
      await supabaseAdmin
        .from('job_queue')
        .update({ status: 'failed', error_message: 'Usuário não encontrado.', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
        .eq('id', job.id);
      return;
    }

    // 2. Garante que as fontes existam na tabela public.fonte
    let mapsId = null;
    let instaId = null;

    const { data: fontesExistentes } = await supabaseAdmin.from('fonte').select('*');
    if (fontesExistentes) {
      const maps = fontesExistentes.find(f => f.nome === 'Google Maps');
      mapsId = maps ? maps.id : null;
      if (!mapsId) {
        const { data: newMaps } = await supabaseAdmin.from('fonte').insert({ nome: 'Google Maps', tipo: 'Maps', ativo: true }).select('id').single();
        if (newMaps) mapsId = newMaps.id;
      }
      const insta = fontesExistentes.find(f => f.nome === 'Instagram');
      instaId = insta ? insta.id : null;
      if (!instaId) {
        const { data: newInsta } = await supabaseAdmin.from('fonte').insert({ nome: 'Instagram', tipo: 'Instagram', ativo: true }).select('id').single();
        if (newInsta) instaId = newInsta.id;
      }
    }

    // 3. Cria o registro da tarefa
    const { data: tarefa, error: tarefaErr } = await supabaseAdmin
      .from('tarefas')
      .insert({
        id_usuario: job.user_id,
        termo_busca: nicho,
        local: regiao,
        status: 'completed'
      })
      .select()
      .single();

    if (tarefaErr) throw tarefaErr;

    // 4. Cria associação tarefa_fonte
    if (fontes.includes('google-maps') && mapsId) {
      await supabaseAdmin.from('tarefa_fonte').insert({ id_tarefa: tarefa.id, id_fonte: mapsId });
    }
    if (fontes.includes('instagram') && instaId) {
      await supabaseAdmin.from('tarefa_fonte').insert({ id_tarefa: tarefa.id, id_fonte: instaId });
    }

    // 5. Scraper
    console.log(`[${now()}] Worker: [2/5] Scraper com fontes: [${fontes}]...`);
    const leadsToProcess = await scrapeLeads(nicho, regiao, quantidade, fontes);
    console.log(`[${now()}] Worker: Scraper retornou ${leadsToProcess.length} leads`);

    // 6. Classificação com IA
    const qualifiedLeads = [];
    console.log(`[${now()}] Worker: [3/5] Classificando ${leadsToProcess.length} leads com IA...`);
    for (let i = 0; i < leadsToProcess.length; i++) {
      const leadData = leadsToProcess[i];
      console.log(`[${now()}] Worker: IA #${i+1}: "${leadData.name}"...`);
      const aiEval = await evaluateLeadWithAI({
        name: leadData.name,
        category: nicho.toUpperCase(),
        location: regiao,
        rating: leadData.rating,
        reviewsCount: leadData.mapsMetrics ? leadData.mapsMetrics.qtd_comentarios : 0,
        imagesQuality: leadData.mapsMetrics && leadData.mapsMetrics.qualidade_imagens ? leadData.mapsMetrics.qualidade_imagens : 'Média',
        website: leadData.website,
        instagram: leadData.instagram,
        followers: leadData.instaMetrics ? leadData.instaMetrics.qtd_seguidores : 0,
        postsCount: leadData.instaMetrics ? leadData.instaMetrics.qtd_postagem : 0,
        following: 0,
        engagementRate: leadData.instaMetrics ? leadData.instaMetrics.taxa_engajamento : 0,
        postsQuality: leadData.instaMetrics && leadData.instaMetrics.qualidade_postagem ? leadData.instaMetrics.qualidade_postagem : 'Média'
      });
      console.log(`[${now()}] Worker: IA #${i+1}: ${leadData.name} → ${aiEval.pontuacao}pts (${aiEval.classificacao})`);
      qualifiedLeads.push({ ...leadData, aiEval });
    }
    console.log(`[${now()}] Worker: Classificação: ${qualifiedLeads.filter(l=>l.aiEval.classificacao==='quente').length} quente, ${qualifiedLeads.filter(l=>l.aiEval.classificacao==='morno').length} morno, ${qualifiedLeads.filter(l=>l.aiEval.classificacao==='frio').length} frio`);

    // 7. Salva leads + métricas + scores
    const generatedLeads = [];
    console.log(`[${now()}] Worker: [4/5] Salvando ${qualifiedLeads.length} leads no banco...`);
    for (const lead of qualifiedLeads) {
      const email = lead.email || '';
      const phone = lead.phone || '';
      const websiteValue = lead.website === 'Não possui' ? '' : lead.website;
      const address = lead.address || `${regiao}, Brasil`;

      const { data: leadRow, error: leadErr } = await supabaseAdmin.from('lead').insert({
        id_tarefas: tarefa.id,
        nome: lead.name,
        email,
        telefone: phone,
        website: websiteValue,
        endereco: address,
        categoria: nicho.toUpperCase()
      }).select().single();
      if (leadErr) throw leadErr;

      let mapsMetricId = null;
      if (lead.mapsMetrics) {
        const { data: mapsMetric } = await supabaseAdmin.from('metrica_google_maps').insert({
          id_lead: leadRow.id,
          qtd_comentarios: lead.mapsMetrics.qtd_comentarios,
          nota_avaliacao: lead.mapsMetrics.nota_avaliacao,
          qualidade_imagens: lead.mapsMetrics.qualidade_imagens
        }).select().single();
        if (mapsMetric) mapsMetricId = mapsMetric.id;
      }

      let instaMetricId = null;
      if (lead.instaMetrics) {
        const { data: instaMetric } = await supabaseAdmin.from('metrica_instagram').insert({
          id_lead: leadRow.id,
          qtd_seguidores: lead.instaMetrics.qtd_seguidores,
          qtd_postagem: lead.instaMetrics.qtd_postagem,
          taxa_engajamento: lead.instaMetrics.taxa_engajamento,
          qualidade_postagem: lead.instaMetrics.qualidade_postagem,
          nicho_atuacao: lead.instaMetrics.nicho_atuacao
        }).select().single();
        if (instaMetric) instaMetricId = instaMetric.id;
      }

      await supabaseAdmin.from('score').insert({
        id_lead: leadRow.id,
        id_mtc_instagram: instaMetricId,
        id_mtc_mps: mapsMetricId,
        pontuacao: lead.aiEval.pontuacao,
        classificacao: lead.aiEval.classificacao,
        justificativa_ia: lead.aiEval.justificativa_ia
      });

      generatedLeads.push({
        id: leadRow.id,
        title: lead.name,
        percent: lead.aiEval.pontuacao,
        type: lead.aiEval.classificacao,
        category: nicho.toUpperCase(),
        rating: lead.rating,
        source: fontes.includes('google-maps') ? (fontes.includes('instagram') ? 'Google Maps + Instagram' : 'Google Maps') : 'Instagram',
        phone,
        email,
        website: websiteValue,
        address,
        instagram: lead.instagram,
        date: new Date().toLocaleDateString('pt-BR'),
        justificativa_ia: lead.aiEval.justificativa_ia,
        mapsMetrics: lead.mapsMetrics,
        instaMetrics: lead.instaMetrics
      });
    }

    // 8. Deduz créditos
    const leadsCapturados = generatedLeads.length;
    const creditosGastos = leadsCapturados * 2;
    await supabaseAdmin
      .from('usuario')
      .update({
        creditos_restantes: usuario.creditos_restantes - creditosGastos,
        creditos_utilizados: (usuario.creditos_utilizados || 0) + creditosGastos
      })
      .eq('id', job.user_id);

    console.log(`[${now()}] Worker: [5/5] ${leadsCapturados} leads, ${creditosGastos} créditos deduzidos`);

    // 9. Atualiza job como completed
    await supabaseAdmin
      .from('job_queue')
      .update({
        status: 'completed',
        result: generatedLeads,
        creditos_gastos: creditosGastos,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`[${now()}] Worker: Job ${job.id} concluído com sucesso`);
  } catch (error) {
    console.error(`[${now()}] Worker: ERRO no job ${job?.id}: ${error.message}`);
    if (job?.id) {
      await supabaseAdmin
        .from('job_queue')
        .update({
          status: 'failed',
          error_message: 'Falha no processamento da captura.',
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }
  } finally {
    workerRunning = false;
  }
};

app.listen(port, () => {
  console.log(`[${now()}] ==============================`);
  console.log(`[${now()}]  Nuvuy Backend rodando na porta ${port}`);
  console.log(`[${now()}]  Supabase: ${supabase ? 'CONECTADO' : 'DESCONECTADO'}`);
  console.log(`[${now()}] ==============================`);

  // Worker de fila a cada 3 segundos
  setInterval(processNextJob, 3000);
  console.log(`[${now()}] Worker de fila iniciado (polling a cada 3s)`);
});
