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

if (
  supabaseUrl && 
  supabaseUrl !== 'SUA_SUPABASE_URL_AQUI' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'SUA_SUPABASE_ANON_KEY_AQUI'
) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
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

// Cria um cliente Supabase com service_role se disponível, senão usa anon key
const adminClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  return createClient(supabaseUrl, key);
};

// Verifica se o período do usuário expirou e renova os créditos
const checkAndRenewCredits = async (userClient, user) => {
  let { data: usuario, error: queryError } = await userClient
    .from('usuario')
    .select('plano, creditos_restantes, creditos_utilizados, periodo_inicio, proxima_renovacao')
    .eq('id', user.id)
    .single();

  // Se não achou o usuário na tabela (pré-migração ou trigger falhou), cria o registro
  if (!usuario) {
    const nome = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
    const email = user.email || '';
    const agora = new Date().toISOString();
    const renovacao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Tenta inserir com o client autenticado do usuário
    const { error: insertError } = await userClient
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
      // Se falhou (ex: RLS), tenta com client admin
      try {
        const admin = adminClient();
        await admin.from('usuario').upsert({
          id: user.id,
          nome,
          email,
          plano: 'gratuito',
          creditos_restantes: 100,
          creditos_utilizados: 0,
          periodo_inicio: agora,
          proxima_renovacao: renovacao
        }, { onConflict: 'id' });
      } catch (adminErr) {
        console.warn(`[${now()}] Não foi possível criar registro de usuário: ${adminErr.message}`);
        // Retorna dados default para não bloquear a captura
        return { plano: 'gratuito', creditos_restantes: 100, creditos_utilizados: 0 };
      }
    }

    usuario = {
      plano: 'gratuito',
      creditos_restantes: 100,
      creditos_utilizados: 0,
      periodo_inicio: agora,
      proxima_renovacao: renovacao
    };
  }

  // Se nunca foram inicializados (pré-migração), seta valores padrão
  if (usuario.creditos_restantes === null || usuario.creditos_restantes === undefined) {
    const creditos = PLAN_CREDITS[usuario.plano?.toLowerCase()] || 100;
    const agora = new Date();
    await userClient
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
    await userClient
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



// Rota de status do Back-end
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    supabaseConfigured: !!supabase
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
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
  }
});

// Rota para criar tarefa e capturar/gerar leads salvando no banco de dados
app.post('/api/tarefas', async (req, res) => {
  console.log(`\n[${now()}] ===== NOVA CAPTURA ====`);
  console.log(`[${now()}] Body: nicho="${req.body.nicho}", regiao="${req.body.regiao}", qtd=${req.body.quantidade}, fontes=[${req.body.fontes}]`);

  if (!supabase) {
    console.warn(`[${now()}] Supabase não inicializado`);
    return res.status(500).json({ error: 'Supabase não inicializado no Back-end.' });
  }

  const token = getAuthToken(req);
  if (!token) {
    console.warn(`[${now()}] Token não fornecido`);
    return res.status(401).json({ error: 'Não autorizado. Token de sessão não fornecido.' });
  }

  const { nicho, regiao, quantidade, fontes } = req.body;
  if (!nicho || !regiao || !quantidade || !fontes || !Array.isArray(fontes)) {
    console.warn(`[${now()}] Campos obrigatórios faltando`);
    return res.status(400).json({ error: 'Nicho, região, quantidade e fontes são obrigatórios.' });
  }

  console.log(`[${now()}] Iniciando captura: ${quantidade}x "${nicho}" em "${regiao}"`);

  try {
    const userClient = authedClient(token);

    // 1. Autentica e obtém o usuário atual
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    // 1b. Verifica créditos do usuário
    const usuario = await checkAndRenewCredits(userClient, user);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const leadsSolicitados = parseInt(quantidade) || 1;
    const creditosNecessarios = leadsSolicitados * 2;
    if (usuario.creditos_restantes < creditosNecessarios) {
      return res.status(403).json({
        error: 'Créditos insuficientes',
        leads_restantes: Math.floor(usuario.creditos_restantes / 2),
        leads_solicitados: leadsSolicitados,
        message: `Você possui apenas ${Math.floor(usuario.creditos_restantes / 2)} lead(s) disponível(is) este mês. Faça um upgrade de plano para continuar captando.`
      });
    }

    // 2. Garante que as fontes "Google Maps" e "Instagram" existam na tabela public.fonte
    let mapsId = null;
    let instaId = null;

    const { data: fontesExistentes, error: errorFontes } = await userClient.from('fonte').select('*');
    if (!errorFontes) {
      const maps = fontesExistentes.find(f => f.nome === 'Google Maps');
      if (maps) {
        mapsId = maps.id;
      } else {
        const { data: newMaps } = await userClient.from('fonte').insert({ nome: 'Google Maps', tipo: 'Maps', ativo: true }).select('id').single();
        if (newMaps) mapsId = newMaps.id;
      }

      const insta = fontesExistentes.find(f => f.nome === 'Instagram');
      if (insta) {
        instaId = insta.id;
      } else {
        const { data: newInsta } = await userClient.from('fonte').insert({ nome: 'Instagram', tipo: 'Instagram', ativo: true }).select('id').single();
        if (newInsta) instaId = newInsta.id;
      }
    }

    // 3. Cria o registro da tarefa
    const { data: tarefa, error: errorTarefa } = await userClient
      .from('tarefas')
      .insert({
        id_usuario: user.id,
        termo_busca: nicho,
        local: regiao,
        status: 'completed' // Inserimos como finalizada, pois a simulação roda imediatamente
      })
      .select()
      .single();

    if (errorTarefa) throw errorTarefa;

    // 4. Cria a associação da tarefa com as fontes selecionadas
    if (fontes.includes('google-maps') && mapsId) {
      await userClient.from('tarefa_fonte').insert({ id_tarefa: tarefa.id, id_fonte: mapsId });
    }
    if (fontes.includes('instagram') && instaId) {
      await userClient.from('tarefa_fonte').insert({ id_tarefa: tarefa.id, id_fonte: instaId });
    }

    // 5. Executa a captação de leads via Web Scraper
    console.log(`[${now()}] [2/5] Scraper: captando leads...`);
    const leadsToProcess = await scrapeLeads(nicho, regiao, quantidade, fontes);
    console.log(`[${now()}] [2/5] Scraper retornou ${leadsToProcess.length} leads`);

    // Qualifica os leads utilizando a IA (OpenRouter) sequencialmente para evitar rate limit
    const qualifiedLeads = [];
    console.log(`[${now()}] [3/5] Classificando ${leadsToProcess.length} leads com IA...`);
    for (let i = 0; i < leadsToProcess.length; i++) {
      const leadData = leadsToProcess[i];
      console.log(`[${now()}]   IA #${i+1}: "${leadData.name}"...`);
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
      console.log(`[${now()}]   IA #${i+1}: ${leadData.name} → ${aiEval.pontuacao}pts (${aiEval.classificacao})`);
      qualifiedLeads.push({ ...leadData, aiEval });
    }
    console.log(`[${now()}] [3/5] Classificação concluída: ${qualifiedLeads.filter(l=>l.aiEval.classificacao==='quente').length} quente, ${qualifiedLeads.filter(l=>l.aiEval.classificacao==='morno').length} morno, ${qualifiedLeads.filter(l=>l.aiEval.classificacao==='frio').length} frio`);

    const generatedLeads = [];

    // Salva os leads qualificados no banco de dados
    console.log(`[${now()}] [4/5] Salvando ${qualifiedLeads.length} leads no banco...`);
    for (const lead of qualifiedLeads) {
      const email = lead.email || '';
      const phone = lead.phone || '';
      const websiteValue = lead.website === 'Não possui' ? '' : lead.website;
      const address = lead.address || `${regiao}, Brasil`;

      // 5.1 Salva na tabela public.lead
      const { data: leadRow, error: leadErr } = await userClient.from('lead').insert({
        id_tarefas: tarefa.id,
        nome: lead.name,
        email: email,
        telefone: phone,
        website: websiteValue,
        endereco: address,
        categoria: nicho.toUpperCase()
      }).select().single();

      console.log(`[${now()}]   Salvo: "${lead.name}" (ID ${leadRow.id})`);
      if (leadErr) throw leadErr;

      // 5.2 Salva métricas de Google Maps se selecionada
      let mapsMetricId = null;
      if (lead.mapsMetrics) {
        const { data: mapsMetric } = await userClient.from('metrica_google_maps').insert({
          id_lead: leadRow.id,
          qtd_comentarios: lead.mapsMetrics.qtd_comentarios,
          nota_avaliacao: lead.mapsMetrics.nota_avaliacao,
          qualidade_imagens: lead.mapsMetrics.qualidade_imagens
        }).select().single();
        if (mapsMetric) mapsMetricId = mapsMetric.id;
      }

      // 5.3 Salva métricas de Instagram se selecionada
      let instaMetricId = null;
      if (lead.instaMetrics) {
        const { data: instaMetric } = await userClient.from('metrica_instagram').insert({
          id_lead: leadRow.id,
          qtd_seguidores: lead.instaMetrics.qtd_seguidores,
          qtd_postagem: lead.instaMetrics.qtd_postagem,
          taxa_engajamento: lead.instaMetrics.taxa_engajamento,
          qualidade_postagem: lead.instaMetrics.qualidade_postagem,
          nicho_atuacao: lead.instaMetrics.nicho_atuacao
        }).select().single();
        if (instaMetric) instaMetricId = instaMetric.id;
      }

      // 5.4 Salva pontuação (Score) do lead vinda da IA
      await userClient.from('score').insert({
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
        phone: phone,
        email: email,
        website: websiteValue,
        address: address,
        instagram: lead.instagram,
        date: new Date().toLocaleDateString('pt-BR'),
        justificativa_ia: lead.aiEval.justificativa_ia,
        mapsMetrics: lead.mapsMetrics,
        instaMetrics: lead.instaMetrics
      });
    }

    // 6. Deduz créditos do usuário
    const leadsCapturados = generatedLeads.length;
    const creditosGastos = leadsCapturados * 2;
    await userClient
      .from('usuario')
      .update({
        creditos_restantes: usuario.creditos_restantes - creditosGastos,
        creditos_utilizados: (usuario.creditos_utilizados || 0) + creditosGastos
      })
      .eq('id', user.id);
    console.log(`[${now()}] [5/5] Captura concluída: ${leadsCapturados} leads retornados, ${creditosGastos} créditos deduzidos`);

    res.status(201).json({
      success: true,
      data: generatedLeads,
      creditos_restantes: usuario.creditos_restantes - creditosGastos,
      leads_restantes: Math.floor((usuario.creditos_restantes - creditosGastos) / 2)
    });
  } catch (error) {
    console.error(`[${now()}] ERRO na captura: ${error.message}`);
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
  }
});

// --- MisticPay Integration ---
const MISTICPAY_API_URL = 'https://api.misticpay.com';
const misticpayCi = process.env.MISTICPAY_CI;
const misticpayCs = process.env.MISTICPAY_CS;

/** Mapa em memória: chave = misticpayTransactionId, valor = { userId, planName, status } */
const paymentMap = new Map();

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
    if (misticpayId) {
      paymentMap.set(misticpayId, { userId, planName, customId, status: 'PENDENTE' });
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
    res.status(500).json({ error: error.message });
  }
});

// Rota: Webhook para confirmar pagamento
app.post('/api/webhook/misticpay', async (req, res) => {
  try {
    const payload = req.body;
    console.log(`[${now()}] Webhook MisticPay recebido:`, JSON.stringify(payload));

    if (payload.transactionType === 'DEPOSITO' && payload.status === 'COMPLETO') {
      const misticpayId = String(payload.transactionId);
      const payment = paymentMap.get(misticpayId);

      if (payment) {
        payment.status = 'COMPLETO';
        console.log(`[${now()}] Pagamento confirmado: userId=${payment.userId}, plan=${payment.planName}`);

        if (supabase) {
          const planName = payment.planName.toLowerCase();
          const creditos = PLAN_CREDITS[planName] || 100;
          const agora = new Date().toISOString();
          const renovacao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const { error } = await supabase
            .from('usuario')
            .update({
              plano: planName,
              creditos_restantes: creditos,
              creditos_utilizados: 0,
              periodo_inicio: agora,
              proxima_renovacao: renovacao
            })
            .eq('id', payment.userId);
          if (error) console.error(`[${now()}] Erro ao atualizar plano no Supabase:`, error.message);
        }
      } else {
        console.log(`[${now()}] Webhook recebido para transação não mapeada: ${misticpayId}`);
      }
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

    for (const [misticpayId, payment] of paymentMap.entries()) {
      if (payment.customId === customId) {
        return res.json({ status: payment.status, planName: payment.planName });
      }
    }

    // Se não achou no mapa, tenta checar na MisticPay
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

app.listen(port, () => {
  console.log(`[${now()}] ==============================`);
  console.log(`[${now()}]  Nuvuy Backend rodando na porta ${port}`);
  console.log(`[${now()}]  Supabase: ${supabase ? 'CONECTADO' : 'DESCONECTADO'}`);
  console.log(`[${now()}] ==============================`);
});
