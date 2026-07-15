document.addEventListener('DOMContentLoaded', () => {
  // Função auxiliar para resolver URLs dinamicamente (Local vs Web/Vercel)
  const getPageUrl = (pageName) => {
    const isLocalFile = window.location.protocol === 'file:';
    if (isLocalFile) {
      if (pageName === 'dashboard') return 'dashboard.html';
      return `${pageName}.html`;
    }
    return `/${pageName}`;
  };

  // Ajusta dinamicamente os links para URLs amigáveis se estiver rodando via HTTP/HTTPS (Vercel)
  const isLocalFile = window.location.protocol === 'file:';
  if (!isLocalFile) {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        if (href === 'dashboard.html') {
          link.setAttribute('href', '/dashboard');
        } else if (href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('//')) {
          const cleanPath = '/' + href.replace('.html', '');
          link.setAttribute('href', cleanPath);
        }
      }
    });
  }

  // Captura hash do Supabase de confirmação de e-mail ou reset de senha
  if (window.location.hash) {
    const hashStr = window.location.hash.substring(1);
    const params = new URLSearchParams(hashStr);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (accessToken) {
      localStorage.setItem('nuvuy_access_token', accessToken);
      if (refreshToken) localStorage.setItem('nuvuy_refresh_token', refreshToken);
    }

    if (type === 'signup' || type === 'invite' || hashStr.includes('type=signup')) {
      localStorage.setItem('nuvuy_welcome_message', 'Conta confirmada e ativada com sucesso! Bem-vindo ao Nuvuy.');
      localStorage.setItem('nuvuy_user_plan', 'Gratuito');
    } else if (type === 'recovery') {
      localStorage.setItem('nuvuy_welcome_message', 'Sessão iniciada para redefinição. Por favor, atualize sua senha nas configurações.');
    }

    // Limpa o hash da URL sem recarregar a página
    if (accessToken) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  // Variável para conter o banco de dados de leads na página de leads inteligentes
  let leadsDatabase = [];

  // Inicialização de leads simulados caso não existam no localStorage (para o primeiro acesso offline/simulação)
  const initialMockLeads = [
    {
      id: 'sim-1',
      title: "Lumière Boutique",
      percent: 85,
      type: "quente",
      category: "VESTUÁRIO",
      rating: "4.8",
      source: "Instagram",
      phone: "+55 (11) 98765-4321",
      email: "contato@lumiereboutique.com.br",
      instagram: "@lumiere.boutique",
      website: "Não possui",
      address: "Rua Oscar Freire, 1000 - Cerqueira César, São Paulo - SP",
      date: "11/06/2026",
      justificativa_ia: JSON.stringify({
        justificativa: "A Lumière Boutique não possui website ativo e conta com apenas 1.250 seguidores no Instagram, carecendo de um posicionamento online profissional.",
        abordagem: "Olá! Notei que a Lumière Boutique não possui site para vendas online e conta com poucos seguidores. Podemos criar uma identidade visual forte e um site profissional integrado com botões de contato rápido para aumentar as vendas.",
        maps_comentarios_positivos: "Excelente atendimento presencial e ótima variedade de roupas.",
        maps_comentarios_negativos: "Não atende WhatsApp aos finais de semana e não possui catálogo de preços online.",
        maps_whatsapp: "+55 (11) 98765-4321",
        insta_coerencia_nicho: "Média (poucas postagens, sem padrão visual)",
        insta_qualidade_imagens: "Imagens com iluminação inadequada",
        insta_impacto_postagem: "Neutro para ruim (baixo engajamento)"
      }),
      mapsMetrics: { qtd_comentarios: 12, nota_avaliacao: "4.8", qualidade_imagens: "Pobre" },
      instaMetrics: { qtd_seguidores: 1250, qtd_postagem: 8, taxa_engajamento: 1.5, qualidade_postagem: "Baixa", nicho_atuacao: "VESTUÁRIO" }
    },
    {
      id: 'sim-2',
      title: "Supermercado Progresso",
      percent: 55,
      type: "morno",
      category: "SUPERMERCADOS",
      rating: "4.2",
      source: "Google Maps",
      phone: "+55 (11) 3456-7890",
      email: "suporte@superprogresso.com.br",
      instagram: "@supermercado.progresso",
      website: "www.superprogresso.com.br",
      address: "Av. Celso Garcia, 2500 - Tatuapé, São Paulo - SP",
      date: "10/06/2026",
      justificativa_ia: JSON.stringify({
        justificativa: "O Supermercado Progresso tem presença mediana, com site funcional e Instagram de 5.400 seguidores, necessitando de otimizações de conteúdo.",
        abordagem: "Olá! Acompanho a página do Supermercado Progresso no Instagram e Maps. Identificamos oportunidades de melhoria no tráfego local do Maps e na criação de posts semanais de ofertas para engajar mais a sua comunidade local.",
        maps_comentarios_positivos: "Variedade de produtos e açougue limpo.",
        maps_comentarios_negativos: "Filas grandes nos horários de pico e falta de estacionamento.",
        maps_whatsapp: "+55 (11) 3456-7890",
        insta_coerencia_nicho: "Alta (conteúdo alinhado com ofertas)",
        insta_qualidade_imagens: "Média (designs regulares)",
        insta_impacto_postagem: "Bom (impacto positivo e comentários frequentes)"
      }),
      mapsMetrics: { qtd_comentarios: 142, nota_avaliacao: "4.2", qualidade_imagens: "Média" },
      instaMetrics: { qtd_seguidores: 5400, qtd_postagem: 48, taxa_engajamento: 3.2, qualidade_postagem: "Média", nicho_atuacao: "SUPERMERCADOS" }
    },
    {
      id: 'sim-3',
      title: "Drogaria FarmaVida",
      percent: 25,
      type: "frio",
      category: "FARMÁCIAS",
      rating: "3.8",
      source: "Google Maps",
      phone: "+55 (11) 2233-4455",
      email: "farma.vida@gmail.com",
      instagram: "@farmavida.sp",
      website: "www.farmavida.com.br",
      address: "Rua das Palmeiras, 150 - Santa Cecília, São Paulo - SP",
      date: "09/06/2026",
      justificativa_ia: JSON.stringify({
        justificativa: "A Drogaria FarmaVida possui presença digital altamente consolidada, site institucional completo e Instagram com mais de 18.000 seguidores.",
        abordagem: "Olá! Seu posicionamento digital no segmento de farmácias é excelente. Apresentamos uma automação avançada de atendimento via WhatsApp e CRM integrado para otimizar suas entregas domiciliares e gerenciar os contatos automaticamente.",
        maps_comentarios_positivos: "Atendimento rápido no balcão e entrega no prazo.",
        maps_comentarios_negativos: "Falta de medicamentos específicos de alto custo em algumas ocasiões.",
        maps_whatsapp: "+55 (11) 2233-4455",
        insta_coerencia_nicho: "Alta (dicas de saúde e promoções)",
        insta_qualidade_imagens: "Excelente (imagens profissionais)",
        insta_impacto_postagem: "Excelente (alta interação e engajamento)"
      }),
      mapsMetrics: { qtd_comentarios: 215, nota_avaliacao: "3.8", qualidade_imagens: "Excelente" },
      instaMetrics: { qtd_seguidores: 18200, qtd_postagem: 160, taxa_engajamento: 5.6, qualidade_postagem: "Alta", nicho_atuacao: "FARMÁCIAS" }
    },
    {
      id: 'sim-4',
      title: "Bella Fit Academia",
      percent: 92,
      type: "quente",
      category: "ACADEMIAS",
      rating: "4.9",
      source: "Instagram",
      phone: "+55 (11) 99887-7665",
      email: "atendimento@bellafit.com.br",
      instagram: "@bellafit.oficial",
      website: "Não possui",
      address: "Av. Paulista, 1500 - Bela Vista, São Paulo - SP",
      date: "11/06/2026",
      justificativa_ia: JSON.stringify({
        justificativa: "A Bella Fit Academia está começando do zero no meio digital, sem site e com apenas 890 seguidores no Instagram, carecendo de posicionamento.",
        abordagem: "Olá! Vi seu perfil no Instagram e percebi que vocês não possuem uma Landing Page para captação de planos mensais. Podemos criar um site completo com tour virtual 3D e checkout PIX integrado. O que acha de agendarmos uma conversa de 5 min?",
        maps_comentarios_positivos: "Aparelhos modernos e professores muito atenciosos.",
        maps_comentarios_negativos: "Horários de pico muito cheios e vestiário pequeno.",
        maps_whatsapp: "+55 (11) 99887-7665",
        insta_coerencia_nicho: "Média (poucas postagens)",
        insta_qualidade_imagens: "Amadora (fotos tiradas de celular com pouca luz)",
        insta_impacto_postagem: "Ruim (poucas curtidas)"
      }),
      mapsMetrics: { qtd_comentarios: 8, nota_avaliacao: "4.9", qualidade_imagens: "Pobre" },
      instaMetrics: { qtd_seguidores: 890, qtd_postagem: 4, taxa_engajamento: 1.2, qualidade_postagem: "Baixa", nicho_atuacao: "ACADEMIAS" }
    },
    {
      id: 'sim-5',
      title: "Hambúrguer Gourmet Co.",
      percent: 68,
      type: "morno",
      category: "RESTAURANTES",
      rating: "4.5",
      source: "Instagram",
      phone: "+55 (11) 91234-5678",
      email: "pedidos@gourmetburger.com",
      instagram: "@gourmet.burger",
      website: "www.gourmetburger.com",
      address: "Rua Augusta, 800 - Consolação, São Paulo - SP",
      date: "11/06/2026",
      justificativa_ia: JSON.stringify({
        justificativa: "O Hambúrguer Gourmet Co. possui site de pedidos ativo e Instagram com 6.200 seguidores, necessitando otimizar o design e engajamento das publicações.",
        abordagem: "Olá! Adoramos as fotos de hambúrgueres no seu Instagram! Notamos que o seu site de pedidos poderia ser mais rápido no celular. Desenvolvemos soluções de cardápio digital de alta performance que carregam em 1 segundo. Quer conhecer?",
        maps_comentarios_positivos: "Hambúrguer muito saboroso e batata frita sequinha.",
        maps_comentarios_negativos: "Demora na entrega em dias chuvosos e embalagem amassada.",
        maps_whatsapp: "+55 (11) 91234-5678",
        insta_coerencia_nicho: "Alta (fotos de comida)",
        insta_qualidade_imagens: "Média (imagens boas mas repetitivas)",
        insta_impacto_postagem: "Bom (impacto positivo, boa interação)"
      }),
      mapsMetrics: { qtd_comentarios: 67, nota_avaliacao: "4.5", qualidade_imagens: "Média" },
      instaMetrics: { qtd_seguidores: 6200, qtd_postagem: 54, taxa_engajamento: 4.1, qualidade_postagem: "Média", nicho_atuacao: "RESTAURANTES" }
    }
  ];

  // Limpa dados antigos de testes que ficaram persistidos no localStorage
  const STORAGE_VERSION_KEY = 'nuvuy_storage_version';
  const CURRENT_STORAGE_VERSION = '2.2';
  if (localStorage.getItem(STORAGE_VERSION_KEY) !== CURRENT_STORAGE_VERSION) {
    localStorage.removeItem('nuvuy_simulated_leads');
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  }

  // Configuração do Helper de Chamada da API do Back-end Express
  const callBackend = async (endpoint, method, body = null, token = null) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const config = {
      method,
      headers
    };
    if (body) {
      config.body = JSON.stringify(body);
    }
    const response = await fetch(`${window.BACKEND_API_URL}${endpoint}`, config);
    if (response.status === 401) {
      console.warn('[Auth] Sessão expirada ou inválida. Redirecionando para login...');
      localStorage.removeItem('nuvuy_access_token');
      localStorage.removeItem('nuvuy_refresh_token');
      localStorage.removeItem('nuvuy_user_name');
      window.location.href = getPageUrl('login');
      return null;
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição ao servidor.');
    }
    return data;
  };

  // Helper unificado para verificar se o back-end está ativo
  const isBackendActive = async () => {
    try {
      const res = await fetch(`${window.BACKEND_API_URL}/api/status`);
      const statusData = await res.json();
      return statusData.status === 'online';
    } catch (e) {
      return false;
    }
  };

  // Session check and redirect (Back-end or direct Supabase client fallback)
  const checkSession = async () => {
    const isLoginPage = window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/login');
    
    // Se estiver na página de login, limpa tokens inválidos para evitar loop
    if (isLoginPage) {
      localStorage.removeItem('nuvuy_access_token');
      localStorage.removeItem('nuvuy_refresh_token');
      localStorage.removeItem('nuvuy_user_name');
    }
    
    // 1. Tenta verificar se o Back-end está ativo e responde online
    const backendActive = await isBackendActive();

    if (backendActive) {
      const token = localStorage.getItem('nuvuy_access_token');
      if (!token && !isLoginPage) {
        window.location.href = getPageUrl('login');
      } else if (token && isLoginPage) {
        window.location.href = getPageUrl('dashboard');
      }
      return;
    }

    // 2. Fallback: Cliente Supabase direto
    if (window.isSupabaseConfigured && window.supabaseClient) {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (!session && !isLoginPage) {
        window.location.href = getPageUrl('login');
      } else if (session && isLoginPage) {
        window.location.href = getPageUrl('dashboard');
      }
    }
  };
  checkSession();

  // Load User Name from localStorage
  const storedUserName = localStorage.getItem('nuvuy_user_name');
  if (storedUserName) {
    document.querySelectorAll('.user-name').forEach(el => {
      el.textContent = storedUserName;
    });
  }

  // Auth Functions (Globais, compatíveis com modo Back-end ou Direct client)
  window.auth = {
    login: async (email, password) => {
      try {
        const res = await callBackend('/api/auth/login', 'POST', { email, password });
        return res.data;
      } catch (err) {
        if (window.isSupabaseConfigured && window.supabaseClient) {
          const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
          if (error) throw error;
          return data;
        }
        throw err;
      }
    },
    signup: async (email, password, name) => {
      try {
        const res = await callBackend('/api/auth/signup', 'POST', { name, email, password });
        return res.data;
      } catch (err) {
        if (window.isSupabaseConfigured && window.supabaseClient) {
          const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name
              }
            }
          });
          if (error) throw error;
          return data;
        }
        throw err;
      }
    },
    signOut: async () => {
      const token = localStorage.getItem('nuvuy_access_token');
      if (token) {
        try {
          await callBackend('/api/auth/logout', 'POST', null, token);
        } catch (err) {
          console.error(err);
        }
      }
      if (window.isSupabaseConfigured && window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
      }
      localStorage.removeItem('nuvuy_user_name');
      localStorage.removeItem('nuvuy_access_token');
      localStorage.removeItem('nuvuy_refresh_token');
      localStorage.removeItem('nuvuy_user_plan');
      localStorage.removeItem('nuvuy_simulated_leads');
      window.location.href = getPageUrl('login');
    }
  };

  // Helper to escape HTML values
  const escapeHtml = (str) => {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  };

  // Normaliza número brasileiro para link do WhatsApp (wa.me)
  const normalizeWaNumber = (raw) => {
    if (!raw) return '';
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.startsWith('55')) return digits;
    // Números BR sem código de país: 10 dígitos (fixo) ou 11 (móvel)
    if (digits.length === 10 || digits.length === 11) return '55' + digits;
    return digits;
  };

  // Helper to generate lead details HTML structure
  const generateLeadDetailsHTML = (lead) => {
    let justData = {
      justificativa: lead.justificativa_ia || '',
      abordagem: '',
      maps_comentarios_positivos: 'N/A',
      maps_comentarios_negativos: 'N/A',
      maps_whatsapp: lead.phone || 'N/A',
      insta_coerencia_nicho: 'Média',
      insta_qualidade_imagens: 'Média',
      insta_impacto_postagem: 'Neutro'
    };

    if (lead.justificativa_ia) {
      try {
        const parsed = JSON.parse(lead.justificativa_ia);
        if (parsed && typeof parsed === 'object') {
          justData = { ...justData, ...parsed };
        }
      } catch (e) {
        justData.justificativa = lead.justificativa_ia;
      }
    }

    if (!justData.abordagem) {
      if (lead.source && lead.source.includes('Maps')) {
        if (lead.type === 'quente') {
          justData.abordagem = `Olá, tudo bem? Me chamo Emanuel.P da Nuvuy. Encontrei a **${lead.title}** no Google Maps, onde notei que vocês possuem uma excelente reputação de **${lead.rating}** estrelas! Estávamos analisando as empresas em **${lead.address ? (lead.address.split(',')[1] || 'sua região') : 'sua região'}** e identificamos que, com a nossa ferramenta, vocês conseguem automatizar a prospecção de novos clientes do segmento de **${lead.category}**. Teriam 10 minutos para uma conversa rápida nesta semana?`;
        } else {
          justData.abordagem = `Olá! Meu nome é Emanuel.P da Nuvuy. Estava pesquisando no Google Maps e gostei muito das avaliações da **${lead.title}** no segmento de **${lead.category}**. Desenvolvemos uma automação de vendas focada na região de **${lead.address ? (lead.address.split(',')[1] || 'sua região') : 'sua região'}** para acelerar captações. Se fizer sentido, posso lhe enviar uma breve apresentação demonstrativa de 3 minutos?`;
        }
      } else { // Instagram
        if (lead.type === 'quente') {
          justData.abordagem = `Olá pessoal da **${lead.title}**, tudo bem? Adorei a presença de vocês no Instagram! Vocês estão de parabéns pelo conteúdo na área de **${lead.category}**. Nós ajudamos negócios parecidos a automatizar a captação de novos clientes qualificados via DMs e tráfego orgânico no Instagram. O que acham de batermos um papo rápido de 10 minutos para eu te mostrar como funciona na prática?`;
        } else {
          justData.abordagem = `Olá! Tudo bem? Acompanho a página da **${lead.title}** no Instagram. Nós ajudamos a impulsionar e otimizar abordagens comerciais para empresas do nicho de **${lead.category}** e preparamos um roteiro gratuito de conversão de leads. Posso enviar o material por este canal ou pelo WhatsApp no telefone **${lead.phone}**?`;
        }
      }
    }

    let mapsHtml = '';
    if ((lead.source && lead.source.includes('Maps')) || lead.mapsMetrics) {
      const m = lead.mapsMetrics || { qtd_comentarios: 24, nota_avaliacao: lead.rating, qualidade_imagens: 'Média' };
      mapsHtml = `
        <div class="metrics-section-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>Métricas do Google Maps (Web Scraper)</span>
        </div>
        <div class="metrics-grid">
          <div class="metric-block">
            <span class="metric-label">Localidade no Maps</span>
            <span class="metric-value">${escapeHtml(lead.address ? (lead.address.split('-')[0] || lead.address) : '-')}</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Qualidade das Imagens</span>
            <span class="metric-value">${escapeHtml(m.qualidade_imagens || 'Média')}</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Nota de Avaliação</span>
            <span class="metric-value">${escapeHtml(parseFloat(m.nota_avaliacao || lead.rating || 0).toFixed(1))} / 5.0</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Total de Comentários</span>
            <span class="metric-value">${escapeHtml(m.qtd_comentarios || 0)} avaliações</span>
          </div>
        </div>
        <div class="comments-container">
          <div class="comment-row">
            <div class="comment-tag-header">
              <span class="comment-tag positive">Comentário Positivo Destaque</span>
            </div>
            <span class="comment-text">"${escapeHtml(justData.maps_comentarios_positivos || 'N/A')}"</span>
          </div>
          <div class="comment-row">
            <div class="comment-tag-header">
              <span class="comment-tag negative">Comentário Negativo Destaque</span>
            </div>
            <span class="comment-text">"${escapeHtml(justData.maps_comentarios_negativos || 'N/A')}"</span>
          </div>
        </div>
      `;
    }

    let instaHtml = '';
    if ((lead.source && lead.source.includes('Instagram')) || lead.instaMetrics) {
      const i = lead.instaMetrics || { qtd_seguidores: 1200, qtd_postagem: 15, taxa_engajamento: 2.5, qualidade_postagem: 'Média', nicho_atuacao: lead.category };
      instaHtml = `
        <div class="metrics-section-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          <span>Métricas do Instagram (Web Scraper)</span>
        </div>
        <div class="metrics-grid">
          <div class="metric-block">
            <span class="metric-label">Nome do Perfil</span>
            <span class="metric-value">${escapeHtml(lead.instagram || '@' + lead.title.toLowerCase().replace(/[^a-z0-9]/g, ''))}</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Seguidores / Posts</span>
            <span class="metric-value">${escapeHtml(i.qtd_seguidores?.toLocaleString('pt-BR') || 0)} seg. / ${escapeHtml(i.qtd_postagem || 0)} posts</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Coerência com Nicho</span>
            <span class="metric-value">${escapeHtml(justData.insta_coerencia_nicho || 'Média')}</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Qualidade Visual</span>
            <span class="metric-value">${escapeHtml(justData.insta_qualidade_imagens || i.qualidade_postagem || 'Média')}</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Engajamento Médio</span>
            <span class="metric-value">${escapeHtml(parseFloat(i.taxa_engajamento || 0).toFixed(2))}% (Curtidas/Coment.)</span>
          </div>
          <div class="metric-block">
            <span class="metric-label">Impacto de Postagem</span>
            <span class="metric-value">${escapeHtml(justData.insta_impacto_postagem || 'Neutro')}</span>
          </div>
        </div>
      `;
    }

    const html = `
      <div class="details-header-block">
        <div class="details-title-row" style="display: flex; align-items: center; justify-content: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 4px;">
          <h4 class="details-lead-title" style="margin: 0;">${escapeHtml(lead.title)}</h4>
          <span class="details-lead-percent ${escapeHtml(lead.type)}" style="font-size: 18px; font-weight: 700; line-height: 1;">${escapeHtml(lead.percent)}%</span>
        </div>
        <div class="details-badges">
          <span class="lead-tag tag-${escapeHtml(lead.type)}">${escapeHtml(lead.type.toUpperCase())}</span>
          <span class="lead-tag tag-category">${escapeHtml(lead.category)}</span>
          <div class="details-rating">
            <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
              <path d="M5.53271 0.690984C5.83206 -0.230327 7.13547 -0.230328 7.43482 0.690983L8.27988 3.2918C8.41375 3.70382 8.79771 3.98278 9.23093 3.98278H11.9656C12.9343 3.98278 13.3371 5.22239 12.5534 5.7918L10.341 7.39919C9.9905 7.65383 9.84385 8.1052 9.97772 8.51722L10.8228 11.118C11.1221 12.0393 10.0676 12.8055 9.28393 12.2361L7.07155 10.6287C6.72106 10.374 6.24647 10.374 5.89598 10.6287L3.6836 12.2361C2.89988 12.8055 1.8454 12.0393 2.14475 11.118L2.98981 8.51722C3.12368 8.1052 2.97703 7.65383 2.62654 7.39919L0.414156 5.7918C-0.369558 5.22239 0.033217 3.98278 1.00194 3.98278H3.7366C4.16982 3.98278 4.55378 3.70382 4.68765 3.2918L5.53271 0.690984Z" fill="#FBFF00"/>
            </svg>
            <span>${escapeHtml(lead.rating)}</span>
          </div>
          <span style="font-size: 10px; color: var(--text-secondary); font-family: 'Poppins', sans-serif;">via ${escapeHtml(lead.source)}</span>
        </div>
      </div>

      <div class="details-info-grid">
        <div class="info-item">
          <span class="info-label">Telefone / Celular</span>
          <span class="info-value">
            ${lead.phone && lead.phone.trim() !== '' && lead.phone !== 'Não possui'
              ? `<a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a>`
              : `<span style="color: var(--text-secondary); font-style: italic;">Não identificado</span>`
            }
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">WhatsApp</span>
          <span class="info-value">
            ${justData.maps_whatsapp && justData.maps_whatsapp !== 'N/A' && justData.maps_whatsapp.trim() !== ''
              ? `<a href="https://wa.me/${normalizeWaNumber(justData.maps_whatsapp)}" target="_blank">${escapeHtml(justData.maps_whatsapp)}</a>` 
              : (lead.phone && lead.phone.trim() !== '' && lead.phone !== 'Não possui'
                ? `<a href="https://wa.me/${normalizeWaNumber(lead.phone)}" target="_blank">${escapeHtml(lead.phone)}</a>`
                : `<span style="color: var(--text-secondary); font-style: italic;">Não identificado</span>`
              )
            }
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">E-mail</span>
          <span class="info-value">
            ${lead.email && lead.email.trim() !== '' && lead.email !== 'Não possui'
              ? `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`
              : `<span style="color: var(--text-secondary); font-style: italic;">Não identificado</span>`
            }
          </span>
        </div>
        ${lead.instagram && lead.instagram !== 'Não possui' ? `
        <div class="info-item">
          <span class="info-label">Instagram</span>
          <span class="info-value"><a href="https://instagram.com/${escapeHtml(lead.instagram.replace('@', ''))}" target="_blank">${escapeHtml(lead.instagram)}</a></span>
        </div>
        ` : ''}
        <div class="info-item">
          <span class="info-label">Website</span>
          <span class="info-value">
            ${(!lead.website || lead.website === 'Não possui' || lead.website.trim() === '') 
              ? '<span style="color: #FF453A; font-weight: 600;">NÃO POSSUI SITE</span>' 
              : `<a href="https://${escapeHtml(lead.website.replace(/^https?:\/\//i, ''))}" target="_blank">${escapeHtml(lead.website)}</a>`
            }
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Endereço</span>
          <span class="info-value">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.title + ' ' + lead.address)}" target="_blank" style="text-decoration: underline; color: #00A6FF;" title="Ver no Google Maps">
              ${escapeHtml(lead.address)} (Abrir no Google Maps 🗺️)
            </a>
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Data da Captura</span>
          <span class="info-value">${escapeHtml(lead.date)}</span>
        </div>
      </div>

      ${mapsHtml}

      ${instaHtml}

      <div class="approach-script-card">
        <div class="script-header-row">
          <span class="script-title">ROTEIRO DE ABORDAGEM SUGERIDO</span>
        </div>
        <div class="script-body">
          "${escapeHtml(justData.abordagem.replace(/\*\*/g, ''))}"
        </div>
        <button class="btn-copiar-roteiro" id="btn-copy-script-modal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copiar Roteiro</span>
        </button>
      </div>
    `;

    return { html, justData };
  };

  // --- Dashboard Leads Initialization ---
  const isDashboard = document.querySelector('.leads-grid') !== null && !document.getElementById('chart-daily-captures');
  if (isDashboard) {
    const loadDashboardLeads = async () => {
      const backendActive = await isBackendActive();

      const token = localStorage.getItem('nuvuy_access_token');
      let leads = [];

      if (backendActive && token) {
        try {
          const res = await callBackend('/api/leads', 'GET', null, token);
          leads = res.data || [];
        } catch (err) {
          console.error('Erro ao carregar leads do servidor:', err);
        }
      }

      // Limpa os cards hardcoded na inicialização
      const cards = document.querySelectorAll('.lead-column .lead-card');
      cards.forEach(card => card.remove());

      // Reseta as estatísticas do topo para 0
      const totalEl = document.getElementById('stat-total-leads');
      const quenteEl = document.getElementById('stat-quente-leads');
      const mornoEl = document.getElementById('stat-morno-leads');
      const frioEl = document.getElementById('stat-frio-leads');
      if (totalEl) totalEl.textContent = '0';
      if (quenteEl) quenteEl.textContent = '0';
      if (mornoEl) mornoEl.textContent = '0';
      if (frioEl) frioEl.textContent = '0';

      let countQuente = 0;
      let countMorno = 0;
      let countFrio = 0;

      // Inverte para manter a ordem cronológica
      const reversedLeads = [...leads].reverse();

      reversedLeads.forEach(lead => {
        if (lead.type === 'quente') countQuente++;
        if (lead.type === 'morno') countMorno++;
        if (lead.type === 'frio') countFrio++;
        insertLeadCardIntoDOM(lead);
      });

      updateTotalStats(countQuente, countMorno, countFrio);
    };

    loadDashboardLeads();
  }

  fetchUsageInfo();

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      if (href === '#' || !href) {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active'); 
      }
    });
  }); 

  // Filter Tabs Navigation
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filterText = tab.textContent.trim();
      const columns = document.querySelectorAll('.lead-column');

      columns.forEach(col => col.style.display = 'flex');

      const allCards = document.querySelectorAll('.lead-card');
      if (filterText === 'TODOS') {
        allCards.forEach(card => card.style.display = '');
      } else if (filterText.includes('ALTO') || filterText.includes('QUENTE')) {
        allCards.forEach(card => {
          const col = card.closest('.lead-column');
          if (col && col.dataset.column === 'quente') {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      } else if (filterText.includes('MÉDIA') || filterText.includes('MORNO')) {
        allCards.forEach(card => {
          const col = card.closest('.lead-column');
          if (col && col.dataset.column === 'morno') {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      } else if (filterText.includes('BAIXO') || filterText.includes('FRIO')) {
        allCards.forEach(card => {
          const col = card.closest('.lead-column');
          if (col && col.dataset.column === 'frio') {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      }
    });
  });

  // Search Input Handler
  const searchInput = document.querySelector('.search-bar input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          console.log('Searching for leads:', query);
          showToast(`Buscando por: "${query}"`, 'info');
        }
      }
    });
  }

  // Event Delegation for dynamically added lead cards
  const leadsGrid = document.querySelector('.leads-grid');
  if (leadsGrid) {
    leadsGrid.addEventListener('click', (e) => {
      // Efetuar Captação / Abrir Abordagem IA Buttons Action
      const btnCapture = e.target.closest('.btn-capture');
      if (btnCapture) {
        const leadCard = btnCapture.closest('.lead-card');
        if (leadCard && leadCard._lead) {
          const lead = leadCard._lead;
          const modalDetails = document.getElementById('modal-lead-details');
          const detailsContent = document.getElementById('details-modal-content');
          
          if (modalDetails && detailsContent) {
            const { html, justData } = generateLeadDetailsHTML(lead);
            detailsContent.innerHTML = html;
            modalDetails.classList.add('active');
            
            // Vincular evento de copiar roteiro dentro do modal
            const copyBtn = document.getElementById('btn-copy-script-modal');
            if (copyBtn) {
              copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(justData.abordagem.replace(/\*\*/g, '')).then(() => {
                  showToast('Roteiro de abordagem copiado!', 'success');
                  const btnText = copyBtn.querySelector('span');
                  if (btnText) btnText.textContent = 'Copiado!';
                  setTimeout(() => {
                    if (btnText) btnText.textContent = 'Copiar Roteiro';
                  }, 2000);
                });
              });
            }
          }
        }
      }

      // Action Icons (Phone, Website) Click Handlers
      const actionIcon = e.target.closest('.btn-action-icon');
      if (actionIcon) {
        const leadCard = actionIcon.closest('.lead-card');
        const title = leadCard?.querySelector('.lead-title')?.textContent?.trim();
        const actionType = actionIcon.getAttribute('title');
        
        if (actionType === 'Ligar para lead') {
          showToast(`Iniciando ligação para o lead: ${title || 'Lead'}`, 'info');
        } else if (actionType === 'Ver website') {
          showToast(`Abrindo website do lead: ${title || 'Lead'}`, 'info');
        }
      }
    });
  }

  // Modal de Detalhes do Lead no Dashboard
  const leadDetailsModal = document.getElementById('modal-lead-details');
  const closeDetailsBtn = document.getElementById('btn-close-details');
  if (closeDetailsBtn && leadDetailsModal) {
    const closeLeadDetailsModal = () => {
      leadDetailsModal.classList.remove('active');
    };
    closeDetailsBtn.addEventListener('click', closeLeadDetailsModal);
    leadDetailsModal.addEventListener('click', (e) => {
      if (e.target === leadDetailsModal) closeLeadDetailsModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && leadDetailsModal.classList.contains('active')) {
        closeLeadDetailsModal();
      }
    });
  }

  // Clear Column Action
  const clearColumnButtons = document.querySelectorAll('.btn-clear-column');
  clearColumnButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const columnType = btn.getAttribute('data-column');
      const column = document.querySelector(`.lead-column[data-column="${columnType}"]`);
      if (column) {
        const cards = column.querySelectorAll('.lead-card');
        if (cards.length > 0) {
          const confirmed = await showConfirmModal(
            "Limpar Coluna",
            `Tem certeza de que deseja limpar todos os leads da coluna de conversão ${columnType.toUpperCase()}? Esta ação não poderá ser desfeita.`,
            "Limpar",
            "Cancelar"
          );
          if (confirmed) {
            // Deleção no Backend se logado
            const token = localStorage.getItem('nuvuy_access_token');
            let deletedOnBackend = false;
            if (token) {
              try {
                await callBackend(`/api/leads?type=${columnType}`, 'DELETE', null, token);
                deletedOnBackend = true;
              } catch (err) {
                console.error("Erro ao limpar coluna no backend:", err);
              }
            }

            // Calculate how many were removed to update stats
            const countRemoved = cards.length;
            cards.forEach(card => card.remove());
            
            // Update stats
            if (columnType === 'quente') updateTotalStats(-countRemoved, 0, 0);
            else if (columnType === 'morno') updateTotalStats(0, -countRemoved, 0);
            else if (columnType === 'frio') updateTotalStats(0, 0, -countRemoved);

            if (deletedOnBackend) {
              showToast(`Coluna ${columnType.toUpperCase()} limpa no banco de dados!`, 'success');
            } else {
              showToast(`Coluna ${columnType.toUpperCase()} limpa com sucesso!`, 'success');
            }
          }
        } else {
          showToast(`A coluna ${columnType.toUpperCase()} já está vazia.`, 'info');
        }
      }
    });
  });

  // Clear All Leads Action
  const clearAllBtn = document.getElementById('btn-clear-all');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      const cards = document.querySelectorAll('.lead-column .lead-card');
      if (cards.length > 0) {
        const confirmed = await showConfirmModal(
          "Limpar Dashboard",
          "Tem certeza de que deseja limpar todos os leads do dashboard? Esta ação removerá permanentemente todos os registros.",
          "Limpar Tudo",
          "Cancelar"
        );
        if (confirmed) {
          // Deleção no Backend se logado
          const token = localStorage.getItem('nuvuy_access_token');
          let deletedOnBackend = false;
          if (token) {
            try {
              await callBackend('/api/leads', 'DELETE', null, token);
              deletedOnBackend = true;
            } catch (err) {
              console.error("Erro ao limpar tudo no backend:", err);
            }
          }

          // Remove cards from DOM
          const countQuente = document.querySelectorAll('.lead-column[data-column="quente"] .lead-card').length;
          const countMorno = document.querySelectorAll('.lead-column[data-column="morno"] .lead-card').length;
          const countFrio = document.querySelectorAll('.lead-column[data-column="frio"] .lead-card').length;
          
          cards.forEach(card => card.remove());
          
          // Reset stats to 0
          updateTotalStats(-countQuente, -countMorno, -countFrio);
          
          if (deletedOnBackend) {
            showToast('Todos os leads foram limpos do banco de dados!', 'success');
          } else {
            showToast('Todos os leads foram limpos!', 'success');
          }
        }
      } else {
        showToast('O dashboard já não possui leads para limpar.', 'info');
      }
    });
  }

  // Refresh Dashboard Action
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showToast('Atualizando dados do dashboard...', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    });
  }

  // --- Modal Nova Captura Logic ---
  const modal = document.getElementById('modal-captura');
  const openModalBtns = document.querySelectorAll('.btn-new-capture');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const form = document.getElementById('form-captura');
  const sourceButtons = document.querySelectorAll('.btn-source');

  // Open modal
  if (openModalBtns.length > 0 && modal) {
    openModalBtns.forEach(btn => {
      if (btn.id === 'btn-exportar-leads') return;
      btn.addEventListener('click', () => {
        modal.classList.add('active');
        
        // Pre-fill fields from settings predefinitions
        const defaultNicho = localStorage.getItem('nuvuy_default_nicho') || '';
        const defaultRegiao = localStorage.getItem('nuvuy_default_regiao') || '';
        const nichoInput = document.getElementById('input-nicho');
        const regiaoInput = document.getElementById('input-regiao');
        
        if (nichoInput && !nichoInput.value) nichoInput.value = defaultNicho;
        if (regiaoInput && !regiaoInput.value) regiaoInput.value = defaultRegiao;
        
        // Focus first input
        setTimeout(() => {
          nichoInput?.focus();
        }, 100);

        // Check plan and lock Instagram button if not included
        const instagramBtn = document.querySelector('.btn-source[data-source="instagram"]');
        if (instagramBtn) {
          if (!planRules.instagram) {
            instagramBtn.classList.add('btn-source-locked');
            instagramBtn.classList.remove('active');
          } else {
            instagramBtn.classList.remove('btn-source-locked');
          }
        }
      });
    });
  }

  // Close modal helper
  const closeModal = () => {
    if (modal) {
      modal.classList.remove('active');
      // If form is not submitting, reset it
      const submitBtn = document.getElementById('btn-submit-captura');
      if (submitBtn && !submitBtn.classList.contains('loading')) {
        form.reset();
        // Reset active state for sources (default: maps active, instagram inactive)
        sourceButtons.forEach(btn => {
          if (btn.getAttribute('data-source') === 'google-maps') {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    }
  };

  // Close triggers
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // ESC key to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Source selection toggle (Multi-select: toggle active, but ensure at least one remains active)
  sourceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('btn-source-locked')) {
        // Open upgrade modal
        const upgradeModal = document.getElementById('modal-upgrade');
        if (upgradeModal) upgradeModal.classList.add('active');
        return;
      }
      const activeSources = document.querySelectorAll('.btn-source.active');
      if (btn.classList.contains('active') && activeSources.length === 1) {
        // Don't allow deselecting the only active source
        showToast('Pelo menos uma fonte de busca deve estar ativa!', 'info');
        return;
      }
      btn.classList.toggle('active');
    });
  });

  // Upgrade modal logic (Instagram locked for free plan)
  const upgradeModal = document.getElementById('modal-upgrade');
  const closeUpgradeBtn = document.getElementById('btn-close-upgrade-modal');
  const btnUpgradeOk = document.getElementById('btn-upgrade-ok');
  const btnUpgradeAdquirir = document.getElementById('btn-upgrade-adquirir');

  const closeUpgradeModal = () => {
    if (upgradeModal) upgradeModal.classList.remove('active');
  };

  if (closeUpgradeBtn) closeUpgradeBtn.addEventListener('click', closeUpgradeModal);
  if (btnUpgradeOk) btnUpgradeOk.addEventListener('click', closeUpgradeModal);
  if (btnUpgradeAdquirir) {
    btnUpgradeAdquirir.addEventListener('click', () => {
      closeUpgradeModal();
      window.location.href = 'planos.html';
    });
  }
  if (upgradeModal) {
    upgradeModal.addEventListener('click', (e) => {
      if (e.target === upgradeModal) closeUpgradeModal();
    });
  }

  // Toggle popup do anel de leads
  const ringWrapper = document.getElementById('leads-ring-wrapper');
  if (ringWrapper) {
    ringWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      ringWrapper.classList.toggle('show-popup');
    });
    document.addEventListener('click', () => {
      ringWrapper.classList.remove('show-popup');
    });
  }

  // Toggle popup de notificações
  const notifBtn = document.getElementById('btn-notification');
  const notifWrapper = document.getElementById('notification-wrapper');
  if (notifBtn && notifWrapper) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifWrapper.classList.toggle('show-popup');
    });
    document.addEventListener('click', () => {
      notifWrapper.classList.remove('show-popup');
    });
  }

  // Form submission / Real or Simulated Lead Capture
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nicho = document.getElementById('input-nicho').value.trim();
      const regiao = document.getElementById('input-regiao').value.trim();
      const quantidade = Math.max(1, Math.min(parseInt(document.getElementById('input-quantidade').value) || 1, planRules.max_leads_por_tarefa));
      
      const activeSources = Array.from(document.querySelectorAll('.btn-source.active'))
        .map(btn => btn.textContent.trim());
      
      // Loading State in Button
      const submitBtn = document.getElementById('btn-submit-captura');
      const submitBtnText = submitBtn.querySelector('span');
      const submitBtnSvg = submitBtn.querySelector('svg');
      
      submitBtn.classList.add('loading');
      
      // Replace SVG icon with spinner
      const originalSvg = submitBtnSvg ? submitBtnSvg.outerHTML : '';
      submitBtn.innerHTML = `<span class="spinner"></span> <span>Efetuando captura...</span>`;
      
      // Disable inputs during processing
      const inputs = form.querySelectorAll('.modal-input, .btn-source');
      inputs.forEach(input => input.setAttribute('disabled', 'true'));
      if (closeModalBtn) closeModalBtn.style.display = 'none';
      
      // Waiting toast after 4s (e.g. Render waking up)
      let waitingToastTimer = setTimeout(() => {
        showToast('Estamos efetuando sua busca, aguarde apenas um momento...', 'info');
      }, 4000);

      const resetForm = () => {
        clearTimeout(waitingToastTimer);
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = `${originalSvg} <span>Efetuar captura</span>`;
        inputs.forEach(input => input.removeAttribute('disabled'));
        if (closeModalBtn) closeModalBtn.style.display = 'flex';
        form.reset();
        closeModal();
      };

      let resData;

      const token = localStorage.getItem('nuvuy_access_token');
      console.log('[DEBUG] Token encontrado?', !!token);
      console.log('[DEBUG] BACKEND_API_URL:', window.BACKEND_API_URL);
      if (token) {
        try {
          const activeSourceTypes = Array.from(document.querySelectorAll('.btn-source.active'))
            .map(btn => btn.getAttribute('data-source'));
          console.log('[DEBUG] Chamando API /api/tarefas...');

          resData = await callBackend('/api/tarefas', 'POST', {
            nicho,
            regiao,
            quantidade,
            fontes: activeSourceTypes
          }, token);

          if (!resData) {
            resetForm();
            return;
          }

          const leads = resData.data;

          if (!leads || leads.length === 0) {
            showToast('Nenhum lead real encontrado para esta busca. Tente outro nicho ou região.', 'warning');
            resetForm();
            return;
          }

          let countQuente = 0;
          let countMorno = 0;
          let countFrio = 0;

          leads.forEach(lead => {
            if (lead.type === 'quente') countQuente++;
            if (lead.type === 'morno') countMorno++;
            if (lead.type === 'frio') countFrio++;
            
            insertLeadCardIntoDOM(lead);
          });

          updateTotalStats(countQuente, countMorno, countFrio);

          if (typeof window.addLeadsToIntelligentPanel === 'function') {
            window.addLeadsToIntelligentPanel(leads);
          }

          // Atualiza card de leads disponíveis
          if (resData.creditos_restantes !== undefined) {
            updateUsageAfterCapture(resData.creditos_restantes, resData.leads_restantes);
          }

          showToast(`${leads.length} leads reais capturados!`, 'success');
          addNotification('Leads capturados', `${leads.length} novos leads para ${nicho} em ${regiao}`, 'success');
          resetForm();
          return;
        } catch (err) {
          console.error('[Captura] Erro:', err.message);
          // Trata erro específico de créditos insuficientes
          if (err.message && err.message.includes('Créditos insuficientes')) {
            showToast('Créditos insuficientes! Faça um upgrade de plano para continuar captando.', 'error');
            addNotification('Créditos insuficientes', 'Seu plano atual não tem créditos suficientes. Faça um upgrade.', 'error');
            resetForm();
            // Após fechar o toast, redireciona para planos
            setTimeout(() => {
              window.location.href = getPageUrl('planos');
            }, 3000);
            return;
          }
          showToast(`Erro na captura: ${err.message}`, 'error');
          resetForm();
          return;
        }
      } else {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        localStorage.removeItem('nuvuy_access_token');
        localStorage.removeItem('nuvuy_refresh_token');
        localStorage.removeItem('nuvuy_user_name');
        window.location.href = getPageUrl('login');
        return;
      }
    });
  }

  // Insert Lead Card DOM
  function insertLeadCardIntoDOM(lead) {
    const column = document.querySelector(`.lead-column[data-column="${lead.type}"]`);
    if (!column) return;

    const placeholder = column.querySelector('.lead-card-placeholder');

    const card = document.createElement('div');
    card.className = 'lead-card new-card';
    card._lead = lead;
    
    // Uppercase label mapping
    const typeLabel = lead.type.toUpperCase();
    
    const hasPhone = lead.phone && lead.phone.trim() !== '' && lead.phone !== 'Não possui';
    const hasSite = lead.website && lead.website.trim() !== '' && lead.website !== 'Não possui';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.title + ' ' + lead.address)}`;

    card.innerHTML = `
      <div class="lead-card-header">
        <span class="lead-title">${escapeHtml(lead.title)}</span>
        <span class="lead-percent">${escapeHtml(lead.percent)}%</span>
      </div>
      <div class="lead-tags">
        <span class="lead-tag tag-${escapeHtml(lead.type)}">${escapeHtml(typeLabel)}</span>
        <span class="lead-tag tag-category">${escapeHtml(lead.category)}</span>
        ${(!lead.website || lead.website === 'Não possui' || lead.website.trim() === '' || lead.website.toLowerCase().includes('não possui') || lead.website.toLowerCase().includes('não tem') || lead.website.toLowerCase().includes('no-website')) ? '<span class="lead-tag tag-no-site">NÃO POSSUI SITE</span>' : ''}
      </div>
      <div class="lead-rating-container">
        <span class="rating-label">AVALIAÇÃO(MAPS)</span>
        <div class="rating-value">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M5.53271 0.690984C5.83206 -0.230327 7.13547 -0.230328 7.43482 0.690983L8.27988 3.2918C8.41375 3.70382 8.79771 3.98278 9.23093 3.98278H11.9656C12.9343 3.98278 13.3371 5.22239 12.5534 5.7918L10.341 7.39919C9.9905 7.65383 9.84385 8.1052 9.97772 8.51722L10.8228 11.118C11.1221 12.0393 10.0676 12.8055 9.28393 12.2361L7.07155 10.6287C6.72106 10.374 6.24647 10.374 5.89598 10.6287L3.6836 12.2361C2.89988 12.8055 1.8454 12.0393 2.14475 11.118L2.98981 8.51722C3.12368 8.1052 2.97703 7.65383 2.62654 7.39919L0.414156 5.7918C-0.369558 5.22239 0.033217 3.98278 1.00194 3.98278H3.7366C4.16982 3.98278 4.55378 3.70382 4.68765 3.2918L5.53271 0.690984Z" fill="#FBFF00"/>
          </svg>
          <span class="rating-number">${escapeHtml(lead.rating)}</span>
        </div>
      </div>
      <div class="lead-card-actions">
        <div class="action-icons">
          ${hasPhone ? `
            <a href="tel:${escapeHtml(lead.phone)}" class="btn-action-icon" title="Ligar para lead: ${escapeHtml(lead.phone)}">
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                <path d="M8.44997 7.79136C6.98642 9.33138 3.25331 5.63167 4.72236 4.08555C5.61943 3.14137 4.60625 2.06275 4.04528 1.26891C2.99238 -0.219163 0.681877 1.83541 0.751541 3.14259C0.973364 7.26519 5.43244 12.1505 9.75035 11.7239C11.1008 11.5907 12.653 9.1511 11.1039 8.25948C10.329 7.81336 9.26515 6.93335 8.44997 7.79075" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          ` : `
            <button class="btn-action-icon disabled" title="Sem telefone de contato" style="opacity: 0.35; cursor: not-allowed;" disabled>
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                <path d="M8.44997 7.79136C6.98642 9.33138 3.25331 5.63167 4.72236 4.08555C5.61943 3.14137 4.60625 2.06275 4.04528 1.26891C2.99238 -0.219163 0.681877 1.83541 0.751541 3.14259C0.973364 7.26519 5.43244 12.1505 9.75035 11.7239C11.1008 11.5907 12.653 9.1511 11.1039 8.25948C10.329 7.81336 9.26515 6.93335 8.44997 7.79075" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          `}
          ${hasSite ? `
            <a href="https://${escapeHtml(lead.website.replace(/^https?:\/\//i, ''))}" target="_blank" class="btn-action-icon" title="Ver website: ${escapeHtml(lead.website)}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="7" cy="7" r="6"/>
                <line x1="1" y1="7" x2="13" y2="7"/>
                <path d="M7 1a8.5 8.5 0 0 1 2.5 6A8.5 8.5 0 0 1 7 13 8.5 8.5 0 0 1 4.5 7 8.5 8.5 0 0 1 7 1Z"/>
              </svg>
            </a>
          ` : `
            <button class="btn-action-icon disabled" title="Sem website" style="opacity: 0.35; cursor: not-allowed;" disabled>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="7" cy="7" r="6"/>
                <line x1="1" y1="7" x2="13" y2="7"/>
                <path d="M7 1a8.5 8.5 0 0 1 2.5 6A8.5 8.5 0 0 1 7 13 8.5 8.5 0 0 1 4.5 7 8.5 8.5 0 0 1 7 1Z"/>
              </svg>
            </button>
          `}
          <a href="${escapeHtml(mapsUrl)}" target="_blank" class="btn-action-icon" title="Ver no Google Maps">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </a>
        </div>
        <button class="btn-capture">ABRIR ABORDAGEM IA</button>
      </div>
    `;

    if (placeholder) {
      column.insertBefore(card, placeholder);
    } else {
      column.appendChild(card);
    }
  }

  // Update Stats Cards
  function updateTotalStats(quenteDiff, mornoDiff, frioDiff) {
    const totalEl = document.getElementById('stat-total-leads');
    const quenteEl = document.getElementById('stat-quente-leads');
    const mornoEl = document.getElementById('stat-morno-leads');
    const frioEl = document.getElementById('stat-frio-leads');
    
    if (quenteEl) {
      const current = parseInt(quenteEl.textContent) || 0;
      quenteEl.textContent = Math.max(0, current + quenteDiff);
    }
    if (mornoEl) {
      const current = parseInt(mornoEl.textContent) || 0;
      mornoEl.textContent = Math.max(0, current + mornoDiff);
    }
    if (frioEl) {
      const current = parseInt(frioEl.textContent) || 0;
      frioEl.textContent = Math.max(0, current + frioDiff);
    }
    if (totalEl) {
      const current = parseInt(totalEl.textContent) || 0;
      totalEl.textContent = Math.max(0, current + quenteDiff + mornoDiff + frioDiff);
    }
  }

  // Atualiza o anel circular de leads na navbar
  function updateLeadsRing(disponiveis, total, planLabel) {
    const numberEl = document.getElementById('leads-ring-number');
    const circleEl = document.querySelector('.leads-ring-fill');
    if (!numberEl || !circleEl) return;

    const d = Math.max(0, disponiveis);
    const t = Math.max(1, total);
    const ratio = d / t;

    // Cor: verde ≥ 60%, amarelo 25-60%, vermelho < 25%
    let color;
    if (ratio >= 0.6) color = '#00E676';
    else if (ratio >= 0.25) color = '#FFB300';
    else color = '#FF5252';

    numberEl.textContent = d;
    circleEl.style.stroke = color;

    // Circunferência = 2 * π * 15.5 ≈ 97.4
    const circumference = 97.4;
    const offset = circumference * (1 - ratio);
    circleEl.style.strokeDashoffset = offset;
  }

  // Busca dados de créditos/leads restantes do backend
  async function fetchUsageInfo() {
    const backendActive = await isBackendActive();
    const token = localStorage.getItem('nuvuy_access_token');

    let disponiveis = '?';
    let total = 100;
    let planLabel = localStorage.getItem('nuvuy_user_plan') || 'Gratuito';

    if (backendActive && token) {
      try {
        const res = await callBackend('/api/user/usage', 'GET', null, token);
        if (res && res.success) {
          disponiveis = res.leads_restantes;
          total = res.leads_total;
          planLabel = res.plan.charAt(0).toUpperCase() + res.plan.slice(1);

          document.getElementById('popup-disponiveis') && (document.getElementById('popup-disponiveis').textContent = disponiveis);
          document.getElementById('popup-total') && (document.getElementById('popup-total').textContent = total);
          document.getElementById('popup-plano') && (document.getElementById('popup-plano').textContent = planLabel);

          updateLeadsRing(disponiveis, total, planLabel);
          return;
        }
      } catch (err) {
        console.error('Erro ao buscar uso:', err);
      }
    }

    document.getElementById('popup-disponiveis') && (document.getElementById('popup-disponiveis').textContent = disponiveis);
    document.getElementById('popup-total') && (document.getElementById('popup-total').textContent = total);
    document.getElementById('popup-plano') && (document.getElementById('popup-plano').textContent = planLabel);
    updateLeadsRing(0, 1, planLabel);
  };

  // Atualiza o anel após uma captura
  const updateUsageAfterCapture = (creditosRestantes, leadsRestantes) => {
    fetchUsageInfo();
  };

  // Armazena regras do plano para uso no modal de captura
  let planRules = { max_leads_por_tarefa: 10, max_buscas_mes: 5, instagram: false };

  async function fetchPlanRules() {
    const backendActive = await isBackendActive();
    const token = localStorage.getItem('nuvuy_access_token');
    if (!backendActive || !token) return;

    try {
      const res = await callBackend('/api/user/plan-rules', 'GET', null, token);
      if (res && res.success) {
        planRules = res.rules;

        // Atualiza input quantidade
        const qtdInput = document.getElementById('input-quantidade');
        if (qtdInput) {
          qtdInput.max = planRules.max_leads_por_tarefa;
          qtdInput.placeholder = `Máx: ${planRules.max_leads_por_tarefa}`;
        }

        // Atualiza botão Instagram
        const instaBtn = document.querySelector('.btn-source[data-source="instagram"]');
        if (instaBtn) {
          if (planRules.instagram) {
            instaBtn.disabled = false;
            instaBtn.title = '';
          } else {
            instaBtn.disabled = true;
            instaBtn.title = 'Disponível nos planos Básico+';
            instaBtn.classList.remove('active');
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar regras do plano:', err);
    }
  }

  // Notification System
  function getNotifications() {
    try { return JSON.parse(localStorage.getItem('nuvuy_notifications')) || []; }
    catch { return []; }
  }
  function saveNotifications(list) {
    localStorage.setItem('nuvuy_notifications', JSON.stringify(list));
  }
  function addNotification(title, desc, iconType = 'info', timeAgo = null) {
    const list = getNotifications();
    const now = new Date();
    const timeStr = timeAgo || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    list.unshift({ id: Date.now(), title, desc, iconType, time: timeStr, read: false });
    if (list.length > 50) list.length = 50;
    saveNotifications(list);
    renderNotifications();
    updateNotifBadge();
  }
  function renderNotifications() {
    const list = getNotifications();
    const container = document.getElementById('notification-list');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<div class="notification-empty">Nenhuma notificação</div>';
      return;
    }
    container.innerHTML = list.map(n => {
      let iconSvg = '';
      if (n.iconType === 'success') iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      else if (n.iconType === 'warning') iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      else if (n.iconType === 'error') iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      else iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      return `<div class="notification-item">
        <div class="notification-item-icon ${n.iconType}">${iconSvg}</div>
        <div class="notification-item-text">
          <div class="notification-item-title">${n.title}</div>
          ${n.desc ? `<div class="notification-item-desc">${n.desc}</div>` : ''}
        </div>
        <div class="notification-item-time">${n.time}</div>
      </div>`;
    }).join('') + '<button class="notification-mark-read" id="btn-mark-read">Marcar todas como lidas</button>';
    document.getElementById('btn-mark-read')?.addEventListener('click', markAllReadNotifications);
  }
  function updateNotifBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    const unread = getNotifications().filter(n => !n.read).length;
    badge.textContent = unread > 99 ? '99+' : unread;
    badge.classList.toggle('hidden', unread === 0);
  }
  function markAllReadNotifications() {
    const list = getNotifications();
    list.forEach(n => n.read = true);
    saveNotifications(list);
    updateNotifBadge();
  }

  // Initial render of notifications
  renderNotifications();
  updateNotifBadge();

  // Toast System
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconHTML = '';
    if (type === 'success') {
      iconHTML = `
        <div class="toast-icon toast-icon-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `;
    } else if (type === 'info') {
      iconHTML = `
        <div class="toast-icon toast-icon-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
      `;
    } else if (type === 'warning') {
      iconHTML = `
        <div class="toast-icon toast-icon-warning">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      `;
    } else if (type === 'error') {
      iconHTML = `
        <div class="toast-icon toast-icon-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
      `;
    } else {
      iconHTML = `
        <div class="toast-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
      `;
    }

    toast.innerHTML = `
      ${iconHTML}
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Fechar">&times;</button>
      <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    // Fade-in trigger
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Auto-remove
    const autoRemoveTimeout = setTimeout(() => {
      removeToast(toast);
    }, 4000);

    // Close click trigger
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(autoRemoveTimeout);
      removeToast(toast);
    });
  }

  function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  // Custom premium modal confirm utility instead of native browser confirm() popup
  function showConfirmModal(title, message, confirmText = "Confirmar", cancelText = "Cancelar") {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '9999';

      const container = document.createElement('div');
      container.className = 'modal-container';
      container.style.maxWidth = '400px';
      container.style.padding = '32px 24px';
      container.style.textAlign = 'center';

      // Trash bin danger styled icon
      const iconWrapper = document.createElement('div');
      iconWrapper.style.width = '56px';
      iconWrapper.style.height = '56px';
      iconWrapper.style.borderRadius = '50%';
      iconWrapper.style.background = 'rgba(255, 59, 48, 0.1)';
      iconWrapper.style.display = 'flex';
      iconWrapper.style.alignItems = 'center';
      iconWrapper.style.justifyContent = 'center';
      iconWrapper.style.margin = '0 auto 16px auto';
      iconWrapper.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      `;

      const titleEl = document.createElement('h3');
      titleEl.style.fontSize = '20px';
      titleEl.style.fontWeight = '700';
      titleEl.style.color = 'var(--text-primary)';
      titleEl.style.marginBottom = '10px';
      titleEl.style.fontFamily = "'Poppins', sans-serif";
      titleEl.innerText = title;

      const msgEl = document.createElement('p');
      msgEl.style.fontSize = '14px';
      msgEl.style.color = 'var(--text-secondary)';
      msgEl.style.marginBottom = '24px';
      msgEl.style.lineHeight = '1.5';
      msgEl.innerText = message;

      const btnsRow = document.createElement('div');
      btnsRow.style.display = 'flex';
      btnsRow.style.gap = '12px';
      btnsRow.style.justifyContent = 'center';

      const btnCancel = document.createElement('button');
      btnCancel.style.flex = '1';
      btnCancel.style.padding = '12px';
      btnCancel.style.borderRadius = '12px';
      btnCancel.style.border = '1px solid var(--border-color)';
      btnCancel.style.background = 'transparent';
      btnCancel.style.color = 'var(--text-secondary)';
      btnCancel.style.fontWeight = '600';
      btnCancel.style.fontSize = '14px';
      btnCancel.style.cursor = 'pointer';
      btnCancel.style.transition = 'all 0.2s';
      btnCancel.innerText = cancelText;
      btnCancel.onmouseover = () => {
        btnCancel.style.background = 'rgba(255, 255, 255, 0.05)';
        btnCancel.style.color = 'var(--text-primary)';
      };
      btnCancel.onmouseout = () => {
        btnCancel.style.background = 'transparent';
        btnCancel.style.color = 'var(--text-secondary)';
      };

      const btnConfirm = document.createElement('button');
      btnConfirm.style.flex = '1';
      btnConfirm.style.padding = '12px';
      btnConfirm.style.borderRadius = '12px';
      btnConfirm.style.border = 'none';
      btnConfirm.style.background = '#FF3B30';
      btnConfirm.style.color = '#fff';
      btnConfirm.style.fontWeight = '600';
      btnConfirm.style.fontSize = '14px';
      btnConfirm.style.cursor = 'pointer';
      btnConfirm.style.transition = 'all 0.2s';
      btnConfirm.innerText = confirmText;
      btnConfirm.onmouseover = () => {
        btnConfirm.style.background = '#E03028';
        btnConfirm.style.boxShadow = '0 0 12px rgba(255, 59, 48, 0.3)';
      };
      btnConfirm.onmouseout = () => {
        btnConfirm.style.background = '#FF3B30';
        btnConfirm.style.boxShadow = 'none';
      };

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 300);
      };

      btnCancel.addEventListener('click', () => close(false));
      btnConfirm.addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });

      btnsRow.appendChild(btnCancel);
      btnsRow.appendChild(btnConfirm);
      container.appendChild(iconWrapper);
      container.appendChild(titleEl);
      container.appendChild(msgEl);
      container.appendChild(btnsRow);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      // Trigger transition via standard CSS active class
      setTimeout(() => {
        overlay.classList.add('active');
      }, 10);
    });
  }

  // Verifica se há alguma mensagem de boas-vindas pendente no localStorage
  const isLoginPage = window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/login');
  if (!isLoginPage) {
    const pendingMessage = localStorage.getItem('nuvuy_welcome_message');
    if (pendingMessage) {
      localStorage.removeItem('nuvuy_welcome_message');
      setTimeout(() => {
        showToast(pendingMessage, 'success');
      }, 1500);
    }
  }

  // --- Modal Logout Logic ---
  const logoutModal = document.getElementById('modal-logout');
  const sidebarLogout = document.getElementById('sidebar-logout');
  const btnLogoutCancel = document.getElementById('btn-logout-cancel');
  const btnLogoutConfirm = document.getElementById('btn-logout-confirm');

  const openLogoutModal = () => {
    if (logoutModal) logoutModal.classList.add('active');
  };

  const closeLogoutModal = () => {
    if (logoutModal) logoutModal.classList.remove('active');
  };

  if (sidebarLogout) {
    sidebarLogout.addEventListener('click', openLogoutModal);
  }

  if (btnLogoutCancel) {
    btnLogoutCancel.addEventListener('click', closeLogoutModal);
  }

  if (btnLogoutConfirm) {
    btnLogoutConfirm.addEventListener('click', () => {
      window.auth.signOut();
    });
  }

  if (logoutModal) {
    logoutModal.addEventListener('click', (e) => {
      if (e.target === logoutModal) closeLogoutModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && logoutModal && logoutModal.classList.contains('active')) {
      closeLogoutModal();
    }
  });

  // --- Hamburger Sidebar Toggle ---
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  };

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      if (sidebar) sidebar.classList.toggle('open');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  // Fecha sidebar ao clicar em um link dentro dela
  if (sidebar) {
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', closeSidebar);
    });
  }

  // Fecha sidebar com Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  // Fecha sidebar se redimensionar acima do breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeSidebar();
  });

  // --- Login & Cadastro Logic ---
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const btnShowSignup = document.getElementById('btn-show-signup');
  const btnShowLogin = document.getElementById('btn-show-login');
  const btnForgotPassword = document.getElementById('btn-forgot-password');

  // Show Sign Up Form
  if (btnShowSignup && formLogin && formSignup) {
    btnShowSignup.addEventListener('click', (e) => {
      e.preventDefault();
      formLogin.classList.add('hidden');
      formSignup.classList.remove('hidden');
      // Update header text
      const loginTitle = document.querySelector('.login-title');
      const loginSubtitle = document.querySelector('.login-subtitle');
      if (loginTitle) loginTitle.textContent = 'Criar conta';
      if (loginSubtitle) loginSubtitle.textContent = 'Preencha os dados abaixo para se cadastrar';
    });
  }

  // Show Login Form
  if (btnShowLogin && formLogin && formSignup) {
    btnShowLogin.addEventListener('click', (e) => {
      e.preventDefault();
      formSignup.classList.add('hidden');
      formLogin.classList.remove('hidden');
      // Update header text
      const loginTitle = document.querySelector('.login-title');
      const loginSubtitle = document.querySelector('.login-subtitle');
      if (loginTitle) loginTitle.textContent = 'Acessar sua conta';
      if (loginSubtitle) loginSubtitle.textContent = 'É muito bom ter você de volta';
    });
  }

  // Forgot Password Action
  if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email')?.value?.trim();
      if (!email) {
        showToast('Insira seu e-mail no campo de login acima para recuperar a senha!', 'info');
        document.getElementById('login-email')?.focus();
        return;
      }

      const submitBtn = document.getElementById('btn-submit-login');
      const originalHTML = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.innerHTML = `<span class="spinner"></span> <span>Enviando...</span>`;
      }

      const wakeupTimer = setTimeout(() => {
        showToast('Estamos carregando seus dados e inicializando o servidor. Aguarde um momento...', 'info');
      }, 2500);

      // Detecta se o backend está online
      const backendActive = await isBackendActive();

      const redirectToUrl = window.location.origin + window.location.pathname; // login.html

      try {
        if (backendActive) {
          await callBackend('/api/auth/recover', 'POST', { email, redirectTo: redirectToUrl });
          clearTimeout(wakeupTimer);
          showToast(`Instruções de recuperação enviadas para: ${email}`, 'success');
        } else if (window.isSupabaseConfigured && window.supabaseClient) {
          const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectToUrl
          });
          clearTimeout(wakeupTimer);
          if (error) throw error;
          showToast(`Instruções de recuperação enviadas para: ${email}`, 'success');
        } else {
          clearTimeout(wakeupTimer);
          // Modo offline/simulado
          showToast(`[SIMULAÇÃO] Instruções de recuperação enviadas para: ${email}`, 'success');
        }
      } catch (error) {
        clearTimeout(wakeupTimer);
        showToast(`Erro ao recuperar senha: ${error.message || 'Falha na requisição'}`, 'info');
      } finally {
        clearTimeout(wakeupTimer);
        if (submitBtn) {
          submitBtn.removeAttribute('disabled');
          submitBtn.innerHTML = originalHTML;
        }
      }
    });
  }

  // Submit Login Form (Supabase and fallback)
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-senha').value;
      const submitBtn = document.getElementById('btn-submit-login');
      
      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = `<span class="spinner"></span> <span>Entrando...</span>`;
      }
      
      const inputs = formLogin.querySelectorAll('input, button');
      inputs.forEach(input => input.setAttribute('disabled', 'true'));

      const wakeupTimer = setTimeout(() => {
        showToast('Estamos carregando seus dados e inicializando o servidor. Aguarde um momento...', 'info');
      }, 2500);

      try {
        // Tenta fazer login via backend ou client-side Supabase
        const data = await window.auth.login(email, password);
        clearTimeout(wakeupTimer);
        
        const fullName = data.user?.user_metadata?.full_name || email.split('@')[0];
        localStorage.setItem('nuvuy_user_name', fullName);
        
        if (data.session) {
          localStorage.setItem('nuvuy_access_token', data.session.access_token);
          localStorage.setItem('nuvuy_refresh_token', data.session.refresh_token);
        }
        
        showToast(`Bem-vindo de volta, ${fullName}! Redirecionando...`, 'success');
        
        setTimeout(() => {
          window.location.href = getPageUrl('dashboard');
        }, 1000);
      } catch (error) {
        clearTimeout(wakeupTimer);
        showToast(`Erro ao entrar: ${error.message || 'Credenciais inválidas'}`, 'error');
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = `<span>Entrar</span>`;
        inputs.forEach(input => input.removeAttribute('disabled'));
      }
    });
  }

  // Submit Sign Up Form (Supabase and fallback)
  if (formSignup) {
    formSignup.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-senha').value;
      const submitBtn = document.getElementById('btn-submit-signup');
      
      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = `<span class="spinner"></span> <span>Criando conta...</span>`;
      }
      
      const inputs = formSignup.querySelectorAll('input, button');
      inputs.forEach(input => input.setAttribute('disabled', 'true'));

      const wakeupTimer = setTimeout(() => {
        showToast('Estamos carregando seus dados e inicializando o servidor. Aguarde um momento...', 'info');
      }, 2500);

      try {
        // Tenta cadastrar via backend ou client-side Supabase
        const data = await window.auth.signup(email, password, name);
        clearTimeout(wakeupTimer);
        
        localStorage.setItem('nuvuy_user_name', name);
        
        if (data.session) {
          localStorage.setItem('nuvuy_access_token', data.session.access_token);
          localStorage.setItem('nuvuy_refresh_token', data.session.refresh_token);
          showToast(`Conta criada com sucesso, ${name}! Redirecionando...`, 'success');
          setTimeout(() => {
            window.location.href = getPageUrl('dashboard');
          }, 1200);
        } else {
          showToast(`Cadastro efetuado! Verifique seu e-mail para confirmar a conta.`, 'success');
          submitBtn.classList.remove('loading');
          submitBtn.innerHTML = `<span>Criar minha conta</span>`;
          inputs.forEach(input => input.removeAttribute('disabled'));
          formSignup.reset();
          
          setTimeout(() => {
            const btnShowLogin = document.getElementById('btn-show-login');
            btnShowLogin?.click();
          }, 3000);
        }
      } catch (error) {
        clearTimeout(wakeupTimer);
        showToast(`Erro ao cadastrar: ${error.message}`, 'error');
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = `<span>Criar minha conta</span>`;
        inputs.forEach(input => input.removeAttribute('disabled'));
      }
    });
  }

  // --- Leads Inteligentes Page Logic ---
  const isLeadsPage = document.getElementById('chart-daily-captures') !== null;
  if (isLeadsPage) {
    const leadsDatabase = [];
    let activeFilter = 'all';

    let captureChart, distributionChart;

    // 2. Initialize Chart.js
    const initCharts = () => {
      const counts = { quente: 0, morno: 0, frio: 0 };
      leadsDatabase.forEach(l => counts[l.type]++);

      if (captureChart) {
        captureChart.destroy();
        captureChart = null;
      }
      if (distributionChart) {
        distributionChart.destroy();
        distributionChart = null;
      }

      const ctxDaily = document.getElementById('chart-daily-captures')?.getContext('2d');
      if (ctxDaily) {

        const dateCounts = {};
        leadsDatabase.forEach(l => {
          const d = l.date || new Date().toLocaleDateString('pt-BR');
          dateCounts[d] = (dateCounts[d] || 0) + 1;
        });
        const sortedDates = Object.keys(dateCounts).sort((a, b) => {
          const [da, ma, ya] = a.split('/').map(Number);
          const [db, mb, yb] = b.split('/').map(Number);
          return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
        });
        const last7 = sortedDates.slice(-7);
        const labels = last7.length > 0 ? last7 : ['Sem dados'];
        const dataPoints = last7.length > 0 ? last7.map(d => dateCounts[d]) : [0];
        
        captureChart = new Chart(ctxDaily, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Leads Capturados',
              data: dataPoints,
              borderColor: '#00A6FF',
              backgroundColor: 'rgba(0, 166, 255, 0.08)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#8e8e93', font: { family: 'Poppins', size: 10 } } },
              x: { grid: { display: false }, ticks: { color: '#8e8e93', font: { family: 'Poppins', size: 10 } } }
            }
          }
        });
      }

      // Distribution chart (Doughnut)
      const ctxDist = document.getElementById('chart-lead-distribution')?.getContext('2d');
      if (ctxDist) {
        distributionChart = new Chart(ctxDist, {
          type: 'doughnut',
          data: {
            labels: ['Quente', 'Morno', 'Frio'],
            datasets: [{
              data: [counts.quente, counts.morno, counts.frio],
              backgroundColor: ['#00A6FF', '#D900FF', '#8E8E93'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#ffffff', boxWidth: 10, font: { family: 'Poppins', size: 10 } }
              }
            },
            cutout: '72%'
          }
        });
      }
    };

    // 3. Render leads list
    const renderLeadsList = (filterQuery = '') => {
      const listContainer = document.getElementById('leads-db-list');
      if (!listContainer) return;

      listContainer.innerHTML = '';
      
      const query = filterQuery.toLowerCase();
      const filteredLeads = leadsDatabase.filter(lead => {
        // Filtro 1: Barra de Pesquisa
        const matchesSearch = lead.title.toLowerCase().includes(query) || 
                              lead.category.toLowerCase().includes(query) ||
                              lead.type.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;

        // Filtro 2: Pílula Ativa
        if (activeFilter === 'all') return true;
        if (activeFilter === 'quente') return lead.type === 'quente';
        if (activeFilter === 'morno') return lead.type === 'morno';
        if (activeFilter === 'frio') return lead.type === 'frio';
        if (activeFilter === 'no-website') {
          return !lead.website || lead.website === 'Não possui' || lead.website.trim() === '';
        }
        return true;
      });

      if (filteredLeads.length === 0) {
        listContainer.innerHTML = `<p style="text-align: center; color: var(--text-secondary); font-size: 12px; margin-top: 20px;">Nenhum lead encontrado</p>`;
        return;
      }

      filteredLeads.forEach(lead => {
        const item = document.createElement('div');
        item.className = 'db-lead-item';
        item.setAttribute('data-id', lead.id);

        item.innerHTML = `
          <div class="db-lead-header">
            <span class="db-lead-title">${escapeHtml(lead.title)}</span>
            <span class="db-lead-percent">${escapeHtml(lead.percent)}%</span>
          </div>
          <div class="db-lead-meta">
            <div class="db-lead-tags">
              <span class="lead-tag tag-${escapeHtml(lead.type)}" style="padding: 2px 6px; font-size: 8px;">${escapeHtml(lead.type.toUpperCase())}</span>
              <span class="lead-tag tag-category" style="padding: 2px 6px; font-size: 8px;">${escapeHtml(lead.category)}</span>
            </div>
            <span class="db-lead-source">${escapeHtml(lead.source)}</span>
          </div>
        `;

        item.addEventListener('click', () => {
          document.querySelectorAll('.db-lead-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          showLeadDetails(lead);
        });

        listContainer.appendChild(item);
      });
    };

    // 3.5. Update AI Insights Card dynamically
    const updateAIInsights = () => {
      const insightsContainer = document.getElementById('ai-insights-content');
      if (!insightsContainer) return;

      if (leadsDatabase.length === 0) {
        insightsContainer.innerHTML = `
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <span style="color: #D900FF; font-weight: bold;">💡</span>
            <span>Nenhum lead capturado ainda. Efetue uma busca por nicho/região para ver os insights comerciais da IA Nuvuy.</span>
          </div>
        `;
        return;
      }

      const total = leadsDatabase.length;
      const quentes = leadsDatabase.filter(l => l.type === 'quente').length;
      const semSite = leadsDatabase.filter(l => !l.website || l.website === 'Não possui' || l.website.trim() === '').length;

      // Encontrar o nicho mais comum
      const categories = {};
      leadsDatabase.forEach(l => {
        if (l.category) {
          categories[l.category] = (categories[l.category] || 0) + 1;
        }
      });
      let topCategory = '';
      let topCount = 0;
      for (const cat in categories) {
        if (categories[cat] > topCount) {
          topCount = categories[cat];
          topCategory = cat;
        }
      }

      let insightsHtml = '';

      // Insight 1: Leads Quentes
      if (quentes > 0) {
        insightsHtml += `
          <div style="display: flex; gap: 8px; align-items: flex-start; background: rgba(0, 166, 255, 0.03); padding: 8px; border-radius: 8px; border-left: 3px solid #00A6FF;">
            <span style="font-size: 14px;">🔥</span>
            <div>
              <strong style="color: #fff; font-size: 11px;">Foco Comercial Prioritário</strong><br>
              Você possui <strong style="color: #00A6FF;">${quentes} lead(s) quente(s)</strong> pronto(s) para abordagem. Eles têm altíssima probabilidade de fechamento por apresentarem baixa maturidade digital.
            </div>
          </div>
        `;
      } else {
        insightsHtml += `
          <div style="display: flex; gap: 8px; align-items: flex-start; background: rgba(255, 255, 255, 0.02); padding: 8px; border-radius: 8px; border-left: 3px solid #8e8e93;">
            <span style="font-size: 14px;">❄️</span>
            <div>
              <strong style="color: #fff; font-size: 11px;">Mapeamento de Funil</strong><br>
              Seu banco atual não possui leads quentes (alta prioridade). Tente buscar em outras regiões ou nichos para encontrar empresas com maior dor digital.
            </div>
          </div>
        `;
      }

      // Insight 2: Sem Website
      if (semSite > 0) {
        insightsHtml += `
          <div style="display: flex; gap: 8px; align-items: flex-start; background: rgba(255, 69, 58, 0.03); padding: 8px; border-radius: 8px; border-left: 3px solid #FF453A;">
            <span style="font-size: 14px;">🎯</span>
            <div>
              <strong style="color: #fff; font-size: 11px;">Oportunidade de Venda de Site</strong><br>
              Detectamos que <strong style="color: #FF453A;">${semSite} lead(s) não possui(em) site</strong>. Esta é a melhor brecha para oferecer o desenvolvimento de Landing Page ou Site Institucional.
            </div>
          </div>
        `;
      }

      // Insight 3: Nicho Forte
      if (topCategory) {
        insightsHtml += `
          <div style="display: flex; gap: 8px; align-items: flex-start; background: rgba(217, 0, 255, 0.03); padding: 8px; border-radius: 8px; border-left: 3px solid #D900FF;">
            <span style="font-size: 14px;">📊</span>
            <div>
              <strong style="color: #fff; font-size: 11px;">Segmento Dominante</strong><br>
              O nicho de <strong style="color: #D900FF;">${topCategory}</strong> concentra a maior parte de suas captações (${topCount} leads). Crie uma apresentação padrão focada nessa área.
            </div>
          </div>
        `;
      }

      insightsContainer.innerHTML = insightsHtml;
    };

    // 4. Show Lead Details & approach script
    const showLeadDetails = (lead) => {
      const emptyState = document.getElementById('details-empty-state');
      const detailsContent = document.getElementById('details-content');
      if (!emptyState || !detailsContent) return;

      emptyState.classList.add('hidden');
      detailsContent.classList.remove('hidden');

      const { html, justData } = generateLeadDetailsHTML(lead);
      detailsContent.innerHTML = html;

      // Copy Script Action
      const copyBtn = detailsContent.querySelector('.btn-copiar-roteiro');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(justData.abordagem.replace(/\*\*/g, '')).then(() => {
            showToast('Roteiro de abordagem copiado para a área de transferência!', 'success');
            const btnText = copyBtn.querySelector('span');
            if (btnText) btnText.textContent = 'Copiado!';
            setTimeout(() => {
              if (btnText) btnText.textContent = 'Copiar Roteiro';
            }, 2000);
          }).catch(err => {
            console.error('Falha ao copiar:', err);
          });
        });
      }
    };

    // 5. Search filtering
    const searchDbInput = document.getElementById('db-search-input');
    if (searchDbInput) {
      searchDbInput.addEventListener('input', () => {
        renderLeadsList(searchDbInput.value);
      });
    }

    // 5.2. Segmentation pills filter logic
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilter = pill.getAttribute('data-filter');
        renderLeadsList(searchDbInput ? searchDbInput.value : '');
      });
    });

    // 5.5. PDF Export Logic
    const exportLeadsToPDF = () => {
      try {
        const jsPDF = window.jsPDF || window.jspdf?.jsPDF;
        if (!jsPDF) {
          showToast("Erro: Biblioteca PDF não carregada.", "error");
          return;
        }

        const total = leadsDatabase.length;
        if (total === 0) {
          showToast("Não há leads para exportar.", "warning");
          return;
        }

        // Brand SVG Logo (Blue lightning bolt and white wordmark)
        const logoSvg = `<svg width="179" height="82" viewBox="0 0 179 82" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.9557 41.7907C22.5492 41.7907 23.4742 43.5938 22.5447 44.8881L20.4288 47.8344C20.0613 48.3462 19.4699 48.6496 18.8398 48.6496H1.95966C0.381484 48.6496 -0.547116 46.877 0.351369 45.5796L31.3294 0.846207C32.4212 -0.730403 34.894 0.0422063 34.894 1.95995V29.0159C34.894 29.4704 34.7357 29.9107 34.4464 30.2612L31.7914 33.4776C30.6238 34.8922 28.3264 34.0665 28.3264 32.2323V22.8826C28.3264 20.9584 25.84 20.1903 24.7547 21.7793L13.1765 38.731C12.2896 40.0295 13.2195 41.7907 14.7919 41.7907H20.9557Z" fill="#00A6FF"/><path d="M25.6568 48.1237C26.8074 46.6692 29.1474 47.4828 29.1474 49.3374V58.5296C29.1474 60.4515 31.6289 61.2213 32.7166 59.6367L44.5581 42.3848C45.4491 41.0867 44.5197 39.3215 42.9452 39.3215H36.4685C34.8339 39.3215 33.9202 37.4357 34.9331 36.1529L37.043 33.4809C37.414 33.011 37.9797 32.7369 38.5783 32.7369H55.7878C57.366 32.7369 58.2946 34.5095 57.3961 35.807L26.4181 80.5403C25.3263 82.1169 22.8535 81.3443 22.8535 79.4266V52.3477C22.8535 51.9072 23.0022 51.4795 23.2755 51.134L25.6568 48.1237Z" fill="#00A6FF"/><path d="M42.0495 27.2498C40.9691 27.2498 40.0932 26.374 40.0932 25.2935V21.1017C40.0932 20.482 40.3869 19.8989 40.8848 19.53L52.0252 11.2744C53.6998 10.0334 55.8953 11.9229 54.9176 13.7638L48.307 26.2111C47.9675 26.8503 47.3029 27.2498 46.5792 27.2498H42.0495Z" fill="#00A6FF"/><path d="M79.2295 29.2747C75.8693 29.1646 74.2718 40.457 73.721 44.5884C73.1701 49.1054 72.8947 53.7876 71.7379 58.1393C71.6828 58.3596 71.5727 58.4698 71.4074 58.58C70.8015 61.5546 64.5769 61.3893 64.5769 58.1393C64.5218 48.5545 64.5769 38.9697 64.4116 29.3849C64.3015 25.9696 71.1871 25.9696 71.2422 29.3849C71.3523 33.2409 71.3523 37.0968 71.4074 40.9528C72.0134 37.0417 72.6193 32.2493 75.2634 29.0544C76.31 27.7875 77.5219 26.7959 79.1744 26.5756C81.1575 26.3552 83.1956 27.0163 84.5727 28.3934C88.0431 31.9188 88.4287 36.8214 88.8143 41.5036C89.1999 47.0672 89.1448 52.6308 89.0346 58.1944C88.9796 61.6097 82.0388 61.6097 82.149 58.1944C82.2041 52.4105 82.3143 46.6265 81.8736 40.8977C81.7634 39.6307 81.2676 29.2747 79.2295 29.2747Z" fill="white"/><path d="M111.361 47.7833C111.361 51.3088 111.471 54.7791 111.251 58.3046C111.085 61.6648 104.751 61.6097 104.53 58.3046C104.53 57.6986 104.475 57.0927 104.475 56.4868C103.539 58.4698 101.831 60.508 98.5811 60.6732C95.4964 60.7834 93.6786 59.5164 92.6319 57.3681C91.8057 55.7707 91.5302 53.9528 91.3099 52.1901C90.704 47.2325 90.9243 42.1096 91.0345 37.0968C91.1446 33.6265 98.0303 33.6265 97.9201 37.0968C97.8099 41.7791 97.6447 46.5164 98.1405 51.1986C98.3057 52.9613 98.8015 57.5334 100.729 57.1478C101.996 56.9274 102.657 52.9613 102.988 51.0884C103.869 46.4062 103.759 41.6138 104.42 36.9316C104.42 36.9316 104.42 36.7663 104.475 36.6561C104.861 33.5163 111.361 33.6265 111.361 36.9316C111.361 40.5672 111.361 44.2028 111.361 47.7833Z" fill="white"/><path d="M134.286 35.6646C134.396 40.3468 133.79 45.1392 132.689 49.7113C131.973 52.6859 130.32 60.508 123.82 60.7283C118.807 60.8936 115.888 54.3384 114.951 51.0333C113.739 46.4613 113.189 41.6689 112.858 36.9316C112.693 35.2239 114.896 34.3426 116.273 34.3426C117.816 34.3426 119.634 35.2239 119.744 36.9316C120.019 41.3935 120.515 45.8553 121.782 50.152C122.223 51.6393 123.875 57.2579 125.913 57.313C128.282 57.4232 129.824 49.6562 130.375 46.6816C131.036 43.046 131.312 39.3553 131.532 35.6646C131.642 34.3426 134.286 34.2875 134.286 35.6646Z" fill="white"/><path d="M156.117 47.7833C156.117 51.3088 156.228 54.7791 156.007 58.3046C155.842 61.6648 149.507 61.6097 149.287 58.3046C149.287 57.6986 149.232 57.0927 149.232 56.4868C148.295 58.4698 146.588 60.508 143.338 60.6732C140.253 60.7834 138.435 59.5164 137.389 57.3681C136.562 55.7707 136.287 53.9528 136.066 52.1901C135.461 47.2325 135.681 42.1096 135.791 37.0968C135.901 33.6265 142.787 33.6265 142.677 37.0968C142.567 41.7791 142.401 46.5164 142.897 51.1986C143.062 52.9613 143.558 57.5334 145.486 57.1478C146.753 56.9274 147.414 52.9613 147.745 51.0884C148.626 46.4062 148.516 41.6138 149.177 36.9316C149.177 36.8214 149.177 36.7663 149.232 36.6561C149.617 33.5163 156.117 33.6265 156.117 36.9316C156.117 40.5672 156.117 44.2028 156.117 47.7833Z" fill="white"/><path d="M178.988 51.9147C179.043 55.6054 178.933 59.241 178.272 62.8215C177.666 65.9063 175.022 73.2326 165.877 71.9657C161.966 71.4699 158.937 68.1648 159.598 64.1436C159.873 62.7665 162.627 62.6563 162.572 64.1436C162.462 65.9063 162.903 67.9444 164.445 68.9911C165.051 69.3767 165.712 69.4868 166.428 69.4317C171.331 69.1012 171.882 59.5715 171.937 58.8554C171.992 57.8639 172.047 56.8173 172.102 55.7707C171.221 57.9741 169.513 60.508 165.877 60.6732C162.793 60.7834 160.975 59.5164 159.928 57.3681C159.102 55.7707 158.827 53.9528 158.606 52.1901C158 47.2325 158.221 42.1096 158.331 37.0968C158.441 33.6265 165.327 33.6265 165.216 37.0968C165.106 41.7791 164.941 46.5164 165.437 51.1986C165.602 52.9613 166.098 57.5334 168.026 57.1478C169.293 56.9274 169.954 52.9613 170.284 51.0884C171.166 46.4062 171.055 41.6138 171.716 36.9316C171.716 36.8214 171.716 36.7663 171.771 36.6561C171.771 36.546 171.771 36.4909 171.771 36.3807C172.542 33.8468 177.334 34.0671 178.16 36.3807C178.656 37.7578 178.491 39.4655 178.546 40.8977C178.601 42.1646 178.656 43.4316 178.711 44.7536C178.821 47.1223 178.932 49.546 178.932 51.9147Z" fill="white"/></svg>`;

        // Convert SVG to base64 PNG using a temporary Image and Canvas to avoid CORS/PDF failures
        const img = new Image();
        const svgBlob = new Blob([logoSvg], { type: 'image/svg+xml;charset=utf-8' });
        const reader = new FileReader();

        reader.onloadend = () => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 358;
              canvas.height = 164;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, 358, 164);
              const pngDataUrl = canvas.toDataURL('image/png');
              generatePDFWithLogo(pngDataUrl);
            } catch (err) {
              console.error("Erro na renderização do canvas:", err);
              generatePDFWithLogo(null);
            }
          };
          img.onerror = (e) => {
            console.error("Erro ao carregar imagem SVG:", e);
            generatePDFWithLogo(null);
          };
          img.src = reader.result;
        };

        reader.readAsDataURL(svgBlob);
      } catch (err) {
        console.error("Erro na exportação de PDF:", err);
        showToast("Erro inesperado ao exportar PDF.", "error");
      }
    };

    // Sub-helper that builds and saves the PDF once PNG logo is ready
    const generatePDFWithLogo = (logoPngDataUrl) => {
      try {
        const jsPDF = window.jsPDF || window.jspdf?.jsPDF;
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const total = leadsDatabase.length;
        const quente = leadsDatabase.filter(l => l.type === 'quente').length;
        const morno = leadsDatabase.filter(l => l.type === 'morno').length;
        const frio = leadsDatabase.filter(l => l.type === 'frio').length;

        // Helper to draw stat box
        const drawStatBox = (x, y, w, h, title, val, color) => {
          doc.setFillColor(23, 23, 25);
          doc.setDrawColor(40, 40, 45);
          doc.rect(x, y, w, h, 'FD');

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(142, 142, 147);
          doc.text(title.toUpperCase(), x + 4, y + 6);

          doc.setFontSize(14);
          doc.setTextColor(color[0], color[1], color[2]);
          doc.text(val.toString(), x + 4, y + 14);
        };

        const columns = [
          { header: "NOME / EMPRESA", dataKey: "title" },
          { header: "TEMP", dataKey: "type" },
          { header: "% FECHAMENTO", dataKey: "percent" },
          { header: "NICHO / CATEGORIA", dataKey: "category" },
          { header: "FONTE", dataKey: "source" },
          { header: "TELEFONE", dataKey: "phone" },
          { header: "E-MAIL", dataKey: "email" },
          { header: "INSTAGRAM", dataKey: "instagram" }
        ];

        const rows = leadsDatabase.map(l => ({
          title: l.title || '-',
          type: l.type ? l.type.toUpperCase() : '-',
          percent: l.percent ? `${l.percent}%` : '-',
          category: l.category || '-',
          source: l.source || '-',
          phone: l.phone || '-',
          email: l.email || '-',
          instagram: l.instagram || '-'
        }));

        doc.autoTable({
          columns: columns,
          body: rows,
          startY: 40,
          margin: { left: 15, right: 15, bottom: 15, top: 22 },
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 3,
            font: 'Helvetica',
            textColor: [225, 225, 230],
            fillColor: [15, 15, 19],
            lineColor: [35, 35, 40],
            lineWidth: 0.15
          },
          headStyles: {
            fillColor: [23, 23, 25],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5
          },
          alternateRowStyles: {
            fillColor: [18, 18, 23]
          },
          columnStyles: {
            title: { cellWidth: 42, fontStyle: 'bold' },
            type: { cellWidth: 18, halign: 'center' },
            percent: { cellWidth: 24, halign: 'center' },
            category: { cellWidth: 32 },
            source: { cellWidth: 22, halign: 'center' },
            phone: { cellWidth: 32 },
            email: { cellWidth: 46 },
            instagram: { cellWidth: 32 }
          },
          willDrawPage: function(data) {
            const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            doc.setFillColor(8, 8, 10);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            if (data.pageNumber === 1) {
              if (logoPngDataUrl) {
                try {
                  // Render converted PNG Logo instead of raw SVG to prevent CORS and rendering errors
                  doc.addImage(logoPngDataUrl, 'PNG', 15, 9, 21.8, 10);
                } catch (e) {
                  console.error("Erro ao renderizar logo PNG no PDF:", e);
                  doc.setFont('Helvetica', 'bold');
                  doc.setFontSize(22);
                  doc.setTextColor(255, 255, 255);
                  doc.text('NUVUY', 15, 20);
                }
              } else {
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(22);
                doc.setTextColor(255, 255, 255);
                doc.text('NUVUY', 15, 20);
              }

              doc.setFontSize(13);
              doc.setTextColor(0, 166, 255);
              doc.text('RELATÓRIO DE PROSPECÇÃO DE LEADS INTELIGENTES', 15, 27);

              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(8);
              doc.setTextColor(142, 142, 147);
              doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 15, 32);

              drawStatBox(165, 13, 28, 20, 'Total Leads', total, [255, 255, 255]);
              drawStatBox(196, 13, 28, 20, 'Quentes', quente, [0, 166, 255]);
              drawStatBox(227, 13, 28, 20, 'Mornos', morno, [217, 0, 255]);
              drawStatBox(258, 13, 28, 20, 'Frios', frio, [142, 142, 147]);
            } else {
              doc.setFont('Helvetica', 'bold');
              doc.setFontSize(10);
              doc.setTextColor(255, 255, 255);
              doc.text('NUVUY - RELATÓRIO DE LEADS', 15, 12);
              
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(8);
              doc.setTextColor(142, 142, 147);
              doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 15, 16);
            }
          },
          didDrawPage: function(data) {
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(142, 142, 147);
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            doc.text(`Nuvuy - Relatório de Leads Inteligentes | Página ${data.pageNumber}`, 15, pageHeight - 8);
          },
          didParseCell: function(data) {
            if (data.column.dataKey === 'type' && data.cell.section === 'body') {
              const val = data.cell.raw;
              if (val === 'QUENTE') {
                data.cell.styles.textColor = [0, 166, 255];
                data.cell.styles.fontStyle = 'bold';
              } else if (val === 'MORNO') {
                data.cell.styles.textColor = [217, 0, 255];
                data.cell.styles.fontStyle = 'bold';
              } else if (val === 'FRIO') {
                data.cell.styles.textColor = [142, 142, 147];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });

        doc.save(`nuvuy_relatorio_leads_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast("Relatório PDF exportado com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao exportar PDF:", error);
        showToast("Erro ao gerar PDF: " + error.message, "error");
      }
    };

    // 6. Export data button with PDF / CSV Dropdown
    const btnExport = document.getElementById('btn-exportar-leads');
    const exportDropdown = document.getElementById('export-dropdown');
    
    if (btnExport && exportDropdown) {
      btnExport.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = exportDropdown.style.display === 'none';
        exportDropdown.style.display = isHidden ? 'block' : 'none';
      });

      document.addEventListener('click', (e) => {
        if (!btnExport.contains(e.target) && !exportDropdown.contains(e.target)) {
          exportDropdown.style.display = 'none';
        }
      });

      // Export as PDF
      const btnExportPdf = document.getElementById('export-pdf');
      if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
          exportDropdown.style.display = 'none';
          exportLeadsToPDF();
        });
      }

      // Export as CSV
      const btnExportCsv = document.getElementById('export-csv');
      if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
          exportDropdown.style.display = 'none';
          const headers = "Nome,Conversao,Tipo,Categoria,Avaliacao,Fonte,Telefone,Email,Data\n";
          const rows = leadsDatabase.map(l => 
            `"${l.title}",${l.percent}%,${l.type},"${l.category}",${l.rating},"${l.source}","${l.phone}","${l.email}","${l.date}"`
          ).join("\n");
          
          const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", "leads_nuvuy_capturados.csv");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast("Exportação realizada com sucesso! (CSV)", "success");
        });
      }
    }

    // 7. Hook into capture submit
    window.addLeadsToIntelligentPanel = (newLeads) => {
      newLeads.forEach(l => {
        const id = leadsDatabase.length + 1;
        const todayStr = new Date().toLocaleDateString('pt-BR');
        
        leadsDatabase.unshift({
          id: id,
          title: l.title,
          percent: l.percent,
          type: l.type,
          category: l.category,
          rating: l.rating,
          source: l.source || (Math.random() > 0.5 ? "Google Maps" : "Instagram"),
          phone: l.phone || `+55 (11) 9${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: l.email || `contato@${l.title.toLowerCase().replace(/\s+/g, '')}.com.br`,
          instagram: l.instagram || `@${l.title.toLowerCase().replace(/\s+/g, '')}`,
          website: l.website || '',
          address: l.address || `Av. Paulista, ${Math.floor(100 + Math.random() * 2000)} - São Paulo - SP`,
          date: todayStr,
          justificativa_ia: l.justificativa_ia || '',
          mapsMetrics: l.mapsMetrics || null,
          instaMetrics: l.instaMetrics || null
        });
      });

      // Update counters in database panel
      const counts = { quente: 0, morno: 0, frio: 0 };
      leadsDatabase.forEach(l => counts[l.type]++);

      const totalEl = document.getElementById('stat-total-leads');
      const quenteEl = document.getElementById('stat-quente-leads');
      const mornoEl = document.getElementById('stat-morno-leads');
      const frioEl = document.getElementById('stat-frio-leads');
      if (totalEl) totalEl.textContent = leadsDatabase.length;
      if (quenteEl) quenteEl.textContent = counts.quente;
      if (mornoEl) mornoEl.textContent = counts.morno;
      if (frioEl) frioEl.textContent = counts.frio;

      // Re-render list and charts
      renderLeadsList(searchDbInput?.value || '');
      initCharts();
      updateAIInsights();
    };

    const initPage = async () => {
      const backendActive = await isBackendActive();

      const token = localStorage.getItem('nuvuy_access_token');
      let leads = [];

      if (backendActive && token) {
        try {
          const res = await callBackend('/api/leads', 'GET', null, token);
          leads = res.data || [];
        } catch (err) {
          console.error('Erro ao carregar leads do servidor:', err);
        }
      }

      leadsDatabase.length = 0;
      leads.forEach((l, index) => {
        leadsDatabase.push({
          id: l.id || (index + 1),
          title: l.title,
          percent: l.percent,
          type: l.type,
          category: l.category,
          rating: l.rating,
          source: l.source,
          phone: l.phone,
          email: l.email,
          instagram: l.instagram,
          website: l.website,
          address: l.address,
          date: l.date,
          justificativa_ia: l.justificativa_ia,
          mapsMetrics: l.mapsMetrics,
          instaMetrics: l.instaMetrics
        });
      });

      const counts = { quente: 0, morno: 0, frio: 0 };
      leadsDatabase.forEach(l => counts[l.type]++);

      const totalEl = document.getElementById('stat-total-leads');
      const quenteEl = document.getElementById('stat-quente-leads');
      const mornoEl = document.getElementById('stat-morno-leads');
      const frioEl = document.getElementById('stat-frio-leads');
      if (totalEl) totalEl.textContent = leadsDatabase.length;
      if (quenteEl) quenteEl.textContent = counts.quente;
      if (mornoEl) mornoEl.textContent = counts.morno;
      if (frioEl) frioEl.textContent = counts.frio;

      initCharts();
      renderLeadsList();
      updateAIInsights();
    };

    initPage();
  }

  // --- Settings Page Forms Logic ---
  const formProfile = document.getElementById('form-settings-profile');
  if (formProfile) {
    // Load initial name (or fetch from Supabase if configured)
    const loadProfileData = async () => {
      // Tenta buscar as informações do usuário atual pelo token de sessão
      const token = localStorage.getItem('nuvuy_access_token');
      if (token) {
        // Se temos token, o usuário está no modo Back-end. Preenchemos com o cache local por enquanto.
        document.getElementById('config-user-name').value = localStorage.getItem('nuvuy_user_name') || 'Emanuel.P';
        return;
      }
      
      if (window.isSupabaseConfigured && window.supabaseClient) {
        try {
          const { data: { user } } = await window.supabaseClient.auth.getUser();
          if (user && user.user_metadata && user.user_metadata.full_name) {
            localStorage.setItem('nuvuy_user_name', user.user_metadata.full_name);
            document.getElementById('config-user-name').value = user.user_metadata.full_name;
            document.getElementById('config-user-email').value = user.email;
            document.querySelectorAll('.user-name').forEach(el => {
              el.textContent = user.user_metadata.full_name;
            });
            return;
          }
        } catch (err) {
          console.error('Erro ao buscar perfil do Supabase:', err);
        }
      }
      document.getElementById('config-user-name').value = localStorage.getItem('nuvuy_user_name') || 'Emanuel.P';
    };
    loadProfileData();
    
    formProfile.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = document.getElementById('config-user-name').value.trim();
      if (!newName) return;
      
      const submitBtn = formProfile.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.setAttribute('disabled', 'true');

      const token = localStorage.getItem('nuvuy_access_token');

      // 1. Efetua alteração via Back-end
      if (token) {
        try {
          await callBackend('/api/user/profile', 'PUT', { name: newName }, token);
          localStorage.setItem('nuvuy_user_name', newName);
          document.querySelectorAll('.user-name').forEach(el => {
            el.textContent = newName;
          });
          showToast('Perfil atualizado com sucesso via Back-end!', 'success');
          return;
        } catch (err) {
          console.log('Falha ao atualizar via Back-end, tentando fallback...', err.message);
        } finally {
          if (submitBtn) submitBtn.removeAttribute('disabled');
        }
      }

      // 2. Fallback: Cliente Supabase direto
      if (window.isSupabaseConfigured && window.supabaseClient) {
        try {
          const { data, error } = await window.supabaseClient.auth.updateUser({
            data: { full_name: newName }
          });
          if (error) throw error;
          
          localStorage.setItem('nuvuy_user_name', newName);
          document.querySelectorAll('.user-name').forEach(el => {
            el.textContent = newName;
          });
          showToast('Perfil atualizado com sucesso no Supabase!', 'success');
        } catch (error) {
          showToast(`Erro ao atualizar perfil: ${error.message}`, 'info');
        } finally {
          if (submitBtn) submitBtn.removeAttribute('disabled');
        }
      } else {
        localStorage.setItem('nuvuy_user_name', newName);
        document.querySelectorAll('.user-name').forEach(el => {
          el.textContent = newName;
        });
        showToast('[SIMULAÇÃO] Perfil atualizado com sucesso!', 'success');
        if (submitBtn) submitBtn.removeAttribute('disabled');
      }
    });
  }

  const formSecurity = document.getElementById('form-settings-security');
  if (formSecurity) {
    formSecurity.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldPass = document.getElementById('config-old-password').value;
      const newPass = document.getElementById('config-new-password').value;
      const confirmPass = document.getElementById('config-confirm-password').value;
      
      if (newPass.length < 6) {
        showToast('A nova senha deve ter pelo menos 6 caracteres!', 'info');
        return;
      }
      if (newPass !== confirmPass) {
        showToast('A confirmação da nova senha não confere!', 'info');
        return;
      }

      const submitBtn = formSecurity.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.setAttribute('disabled', 'true');

      const token = localStorage.getItem('nuvuy_access_token');
      
      // 1. Efetua alteração via Back-end
      if (token) {
        try {
          await callBackend('/api/user/password', 'PUT', { password: newPass }, token);
          showToast('Senha atualizada com sucesso via Back-end!', 'success');
          formSecurity.reset();
          return;
        } catch (err) {
          console.log('Falha ao atualizar senha via Back-end, tentando fallback...', err.message);
        } finally {
          if (submitBtn) submitBtn.removeAttribute('disabled');
        }
      }
      
      // 2. Fallback: Cliente Supabase direto
      if (window.isSupabaseConfigured && window.supabaseClient) {
        try {
          const { data, error } = await window.supabaseClient.auth.updateUser({
            password: newPass
          });
          
          if (error) throw error;
          showToast('Senha atualizada com sucesso no Supabase!', 'success');
          formSecurity.reset();
        } catch (error) {
          showToast(`Erro ao atualizar senha: ${error.message}`, 'info');
        } finally {
          if (submitBtn) submitBtn.removeAttribute('disabled');
        }
      } else {
        showToast('[SIMULAÇÃO] Senha atualizada com sucesso!', 'success');
        formSecurity.reset();
        if (submitBtn) submitBtn.removeAttribute('disabled');
      }
    });
  }

  const formAgent = document.getElementById('form-settings-agent');
  if (formAgent) {
    // Load initial values
    document.getElementById('config-default-niche').value = localStorage.getItem('nuvuy_default_nicho') || '';
    document.getElementById('config-default-region').value = localStorage.getItem('nuvuy_default_regiao') || '';
    
    formAgent.addEventListener('submit', (e) => {
      e.preventDefault();
      const defaultNicho = document.getElementById('config-default-niche').value.trim();
      const defaultRegiao = document.getElementById('config-default-region').value.trim();
      
      localStorage.setItem('nuvuy_default_nicho', defaultNicho);
      localStorage.setItem('nuvuy_default_regiao', defaultRegiao);
      
      showToast('Preferências do agente salvas com sucesso!', 'success');
    });
  }

  // --- Plans Page Logic ---
  const isPlansPage = document.getElementById('plan-gratuito') !== null;
  if (isPlansPage) {
    const updatePlansUI = (planName) => {
      // Remove a classe 'current' de todos os cards
      document.querySelectorAll('.plan-card').forEach(card => {
        card.classList.remove('current');
        const btn = card.querySelector('.btn-plan-action');
        if (btn) {
          btn.removeAttribute('disabled');
          btn.textContent = 'Fazer Upgrade';
        }
      });

      // Adiciona 'current' no plano ativo
      let activeCardId = 'plan-gratuito';
      if (planName === 'Básico') activeCardId = 'plan-basico';
      else if (planName === 'Pro') activeCardId = 'plan-pro';

      const activeCard = document.getElementById(activeCardId);
      if (activeCard) {
        activeCard.classList.add('current');
        const btn = activeCard.querySelector('.btn-plan-action');
        if (btn) {
          btn.setAttribute('disabled', 'true');
          btn.textContent = 'Plano Atual';
        }
      }
    };

    // Inicializa a UI com o plano atual
    const userPlan = localStorage.getItem('nuvuy_user_plan') || 'Gratuito';
    updatePlansUI(userPlan);

    // Modal PIX
    const pixModal = document.getElementById('modal-pix-payment');
    const closePixBtn = document.getElementById('btn-close-pix-modal');
    const pixQrContainer = document.getElementById('pix-qr-container');
    const pixCodeContainer = document.getElementById('pix-code-container');
    const pixCodeInput = document.getElementById('pix-code-input');
    const copyPixBtn = document.getElementById('btn-copy-pix');

    const closePixModal = () => {
      if (pixModal) pixModal.classList.remove('active');
      subscribeButtons.forEach(b => {
        b.removeAttribute('disabled');
        const plan = b.getAttribute('data-plan');
        const isCurrent = localStorage.getItem('nuvuy_user_plan') === plan;
        b.textContent = isCurrent ? 'Plano Atual' : 'Fazer Upgrade';
        if (isCurrent) b.setAttribute('disabled', 'true');
      });
    };

    if (closePixBtn) closePixBtn.addEventListener('click', closePixModal);
    if (pixModal) {
      pixModal.addEventListener('click', (e) => {
        if (e.target === pixModal) closePixModal();
      });
    }
    if (copyPixBtn && pixCodeInput) {
      copyPixBtn.addEventListener('click', () => {
        pixCodeInput.select();
        navigator.clipboard.writeText(pixCodeInput.value);
        showToast('Código PIX copiado!', 'success');
      });
    }

    const openPixModal = (planName) => {
      pixQrContainer.innerHTML = '<div class="spinner" style="width: 32px; height: 32px; border-width: 3px;"></div>';
      pixCodeContainer.style.display = 'none';
      if (pixModal) pixModal.classList.add('active');
    };

    // Click Listener para upgrades
    const subscribeButtons = document.querySelectorAll('.btn-subscribe');
    subscribeButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const planName = btn.getAttribute('data-plan');
        const planPrices = { 'Gratuito': 0, 'Básico': 49, 'Pro': 97, 'Business': 149 };
        const price = planPrices[planName];
        const userId = localStorage.getItem('nuvuy_user_id') || 'guest';

        btn.setAttribute('disabled', 'true');
        btn.textContent = 'Gerando PIX...';

        // Tenta gerar PIX via backend
        const token = localStorage.getItem('nuvuy_access_token');
        if (token) {
          try {
            const res = await callBackend('/api/create-preference', 'POST', {
              planName,
              price,
              userId
            }, token);

            if (res && (res.qrCodeBase64 || res.qrcodeUrl)) {
              openPixModal(planName);
              pixQrContainer.innerHTML = `<img src="${res.qrCodeBase64 || res.qrcodeUrl}" alt="QR Code PIX" style="width:220px;height:220px;border-radius:12px;" />`;
              if (res.copyPaste) {
                pixCodeInput.value = res.copyPaste;
                pixCodeContainer.style.display = 'block';
              }
              showToast(`Pagamento PIX gerado para o plano ${planName}!`, 'info');

              // Polling: verifica a cada 5s se o pagamento foi confirmado
              const pollInterval = setInterval(async () => {
                try {
                  const pollRes = await callBackend(`/api/check-payment/${res.externalId}`, 'GET', null, token);
                  if (pollRes && pollRes.status === 'COMPLETO') {
                    clearInterval(pollInterval);
                    localStorage.setItem('nuvuy_user_plan', planName);
                    updatePlansUI(planName);
                    showToast(`Pagamento confirmado! Plano ${planName} ativado.`, 'success');
                    closePixModal();
  fetchUsageInfo();
  fetchPlanRules();
                  }
                } catch (e) {
                  console.log('Polling error:', e.message);
                }
              }, 5000);
              return;
            }
          } catch (err) {
            console.log('Backend offline, usando simulação:', err.message);
          }
        }

        // Fallback: backend offline, mostra toast de erro
        showToast('Servidor de pagamento indisponível. Tente novamente mais tarde.', 'error');
        btn.removeAttribute('disabled');
        btn.textContent = 'Fazer Upgrade';
      });
    });
  }
});
