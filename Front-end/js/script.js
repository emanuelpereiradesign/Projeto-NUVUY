document.addEventListener('DOMContentLoaded', () => {
  // Função auxiliar para resolver URLs dinamicamente (Local vs Web/Vercel)
  const getPageUrl = (pageName) => {
    const isLocalFile = window.location.protocol === 'file:';
    if (isLocalFile) {
      if (pageName === 'dashboard') return 'index.html';
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
        if (href === 'index.html') {
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
    if (hashStr.includes('type=signup') || hashStr.includes('type=invite') || hashStr.includes('access_token=')) {
      localStorage.setItem('nuvuy_welcome_message', '🎉 Conta confirmada e ativada com sucesso! Bem-vindo ao Nuvuy.');
    } else if (hashStr.includes('type=recovery')) {
      localStorage.setItem('nuvuy_welcome_message', '🔐 Sessão iniciada para redefinição. Por favor, atualize sua senha nas configurações.');
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
  const CURRENT_STORAGE_VERSION = '2.1';
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
      el.textContent = `${storedUserName} (admin)`;
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
      window.location.href = getPageUrl('login');
    }
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
          leads = res.data;
        } catch (err) {
          console.error('Erro ao carregar leads do servidor:', err);
          leads = JSON.parse(localStorage.getItem('nuvuy_simulated_leads') || '[]');
        }
      } else {
        leads = JSON.parse(localStorage.getItem('nuvuy_simulated_leads') || '[]');
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
      // Efetuar Captação Buttons Action
      const btnCapture = e.target.closest('.btn-capture');
      if (btnCapture) {
        const leadCard = btnCapture.closest('.lead-card');
        const title = leadCard?.querySelector('.lead-title')?.textContent?.trim();
        showToast(`Captação iniciada para: ${title || 'Lead'}`, 'success');
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

  // Clear Column Action
  const clearColumnButtons = document.querySelectorAll('.btn-clear-column');
  clearColumnButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const columnType = btn.getAttribute('data-column');
      const column = document.querySelector(`.lead-column[data-column="${columnType}"]`);
      if (column) {
        const cards = column.querySelectorAll('.lead-card');
        if (cards.length > 0) {
          if (confirm(`Tem certeza de que deseja limpar todos os leads da coluna de conversão ${columnType.toUpperCase()}?`)) {
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

            // Limpeza local no localStorage
            const simLeads = JSON.parse(localStorage.getItem('nuvuy_simulated_leads') || '[]');
            const updatedSimLeads = simLeads.filter(l => l.type !== columnType);
            localStorage.setItem('nuvuy_simulated_leads', JSON.stringify(updatedSimLeads));

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
        if (confirm('Deseja limpar todos os leads do dashboard?')) {
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

          // Limpeza local no localStorage
          localStorage.setItem('nuvuy_simulated_leads', JSON.stringify([]));

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
      const activeSources = document.querySelectorAll('.btn-source.active');
      if (btn.classList.contains('active') && activeSources.length === 1) {
        // Don't allow deselecting the only active source
        showToast('Pelo menos uma fonte de busca deve estar ativa!', 'info');
        return;
      }
      btn.classList.toggle('active');
    });
  });

  // Form submission / Real or Simulated Lead Capture
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nicho = document.getElementById('input-nicho').value.trim();
      const regiao = document.getElementById('input-regiao').value.trim();
      const quantidade = parseInt(document.getElementById('input-quantidade').value) || 10;
      
      const activeSources = Array.from(document.querySelectorAll('.btn-source.active'))
        .map(btn => btn.textContent.trim());
      
      // Loading State in Button
      const submitBtn = document.getElementById('btn-submit-captura');
      const submitBtnText = submitBtn.querySelector('span');
      const submitBtnSvg = submitBtn.querySelector('svg');
      
      submitBtn.classList.add('loading');
      if (submitBtnText) submitBtnText.textContent = 'Efetuando captura...';
      
      // Replace SVG icon with spinner
      const originalSvgHTML = submitBtnSvg ? submitBtnSvg.outerHTML : '';
      submitBtn.innerHTML = `<span class="spinner"></span> <span>Efetuando captura...</span>`;
      
      // Disable inputs during processing
      const inputs = form.querySelectorAll('.modal-input, .btn-source');
      inputs.forEach(input => input.setAttribute('disabled', 'true'));
      if (closeModalBtn) closeModalBtn.style.display = 'none';

      const resetForm = () => {
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = `${originalSvgHTML} <span>Efetuar captura</span>`;
        inputs.forEach(input => input.removeAttribute('disabled'));
        if (closeModalBtn) closeModalBtn.style.display = 'flex';
        form.reset();
        closeModal();
      };

      const token = localStorage.getItem('nuvuy_access_token');
      if (token) {
        try {
          const activeSourceTypes = Array.from(document.querySelectorAll('.btn-source.active'))
            .map(btn => btn.getAttribute('data-source'));

          const res = await callBackend('/api/tarefas', 'POST', {
            nicho,
            regiao,
            quantidade,
            fontes: activeSourceTypes
          }, token);

          const leads = res.data;
          
          const existingLeads = JSON.parse(localStorage.getItem('nuvuy_simulated_leads') || '[]');
          localStorage.setItem('nuvuy_simulated_leads', JSON.stringify([...leads, ...existingLeads]));

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

          showToast(`${leads.length} leads capturados e gravados no Supabase!`, 'success');
          resetForm();
          return;
        } catch (err) {
          console.log("Erro ao salvar no banco via Back-end, rodando em modo simulação...", err.message);
        }
      }

      // Fallback local simulation if backend is offline or not authenticated
      const delay = activeSources.length > 1 ? 3000 : 1500;
      setTimeout(() => {
        const simulatedLeads = generateSimulatedLeads(nicho, regiao, quantidade);
        
        // Salva os leads simulados no localStorage para persistência
        const existingSimLeads = JSON.parse(localStorage.getItem('nuvuy_simulated_leads') || '[]');
        const updatedSimLeads = [...simulatedLeads, ...existingSimLeads];
        localStorage.setItem('nuvuy_simulated_leads', JSON.stringify(updatedSimLeads));

        let countQuente = 0;
        let countMorno = 0;
        let countFrio = 0;

        simulatedLeads.forEach(lead => {
          if (lead.type === 'quente') countQuente++;
          if (lead.type === 'morno') countMorno++;
          if (lead.type === 'frio') countFrio++;
          
          insertLeadCardIntoDOM(lead);
        });

        updateTotalStats(countQuente, countMorno, countFrio);

        if (typeof window.addLeadsToIntelligentPanel === 'function') {
          window.addLeadsToIntelligentPanel(simulatedLeads);
        }

        showToast(`[SIMULAÇÃO] ${simulatedLeads.length} leads capturados em ${activeSources.join(' e ')}!`, 'success');
        resetForm();
      }, delay);
    });
  }

  // --- Helper Functions ---

  // Sanitiza strings para prevenir XSS ao injetar via innerHTML
  function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  }

  // Generate simulated leads data
  function generateSimulatedLeads(nicho, regiao, qty) {
    const nichoFormatted = nicho.trim().toUpperCase();
    
    // Helper to format title case
    const toTitleCase = (str) => {
      return str.toLowerCase().replace(/(?:^|\s)\S/g, l => l.toUpperCase());
    };
    
    const nichoTitle = toTitleCase(nicho);
    const suffixes = ["Concept", "Prime", "Express", "VIP", "Solutions", "Premium", "Style", "Group", "Network", "Moda", "Negócios"];
    const leads = [];
    const todayStr = new Date().toLocaleDateString('pt-BR');

    for (let i = 0; i < qty; i++) {
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const leadTitle = `${nichoTitle} ${suffix} ${i + 1}`;
      
      const rand = Math.random();
      let type = 'frio';
      let percent = Math.floor(15 + Math.random() * 25); // 0-40% Frio
      let followers = 0;
      let postsCount = 0;
      let followingCount = 0;
      let website = '';
      let simulatedRating = '4.0';

      if (rand > 0.4) {
        type = 'quente';
        percent = Math.floor(71 + Math.random() * 29); // 71% - 100%
        followers = Math.floor(100 + Math.random() * 1800); // abaixo de 2000
        postsCount = Math.floor(2 + Math.random() * 15);
        followingCount = Math.floor(50 + Math.random() * 400);
        website = 'Não possui'; // Quente = Sem site (do absoluto zero!)
        simulatedRating = (3.0 + Math.random() * 1.0).toFixed(1);
      } else if (rand > 0.1) {
        type = 'morno';
        percent = Math.floor(41 + Math.random() * 29); // 41% - 70%
        followers = Math.floor(3000 + Math.random() * 4000); // 3000 a 7000
        postsCount = Math.floor(20 + Math.random() * 60);
        followingCount = Math.floor(200 + Math.random() * 800);
        website = Math.random() > 0.5 ? `www.${leadTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br` : 'Não possui';
        simulatedRating = (3.8 + Math.random() * 0.7).toFixed(1);
      } else {
        type = 'frio';
        percent = Math.floor(10 + Math.random() * 30); // 10% - 40%
        followers = Math.floor(15000 + Math.random() * 25000); // acima de 15000
        postsCount = Math.floor(120 + Math.random() * 60); // ~150 posts
        followingCount = Math.floor(500 + Math.random() * 1500);
        website = `www.${leadTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`;
        simulatedRating = (4.5 + Math.random() * 0.5).toFixed(1);
      }

      const phone = `+55 (11) 9${Math.floor(10000000 + Math.random() * 90000000)}`;

      const simulatedData = {
        justificativa: `[SIMULADO] O lead ${leadTitle} foi classificado como ${type.toUpperCase()} devido ao seu posicionamento digital com ${followers} seguidores no Instagram e nota de ${simulatedRating} no Google Maps.`,
        abordagem: type === 'quente' 
          ? `Olá Emanuel da Nuvuy aqui! Percebi que a ${leadTitle} não possui um site próprio e tem menos de 2mil seguidores. Podemos criar uma identidade visual forte e um site profissional para dobrar suas conversões locais. Aceita um bate-papo de 5 minutos?` 
          : (type === 'morno' 
            ? `Olá! Acompanhamos a ${leadTitle} no Maps e Instagram. Identificamos pontos de melhoria na velocidade de resposta e anúncios para impulsionar seus posts atuais. Gostaria de receber um roteiro gratuito?`
            : `Olá! Seu posicionamento digital com mais de 15k seguidores é muito bom. Podemos te ajudar com automações avançadas de atendimento de leads e funil de vendas integrado.`),
        maps_comentarios_positivos: parseFloat(simulatedRating) >= 4.2 ? "Bom atendimento, produtos de alta qualidade e localização acessível." : "Espaço agradável.",
        maps_comentarios_negativos: parseFloat(simulatedRating) < 4.0 ? "Demora no atendimento e falta de resposta nas redes sociais." : "Preço um pouco elevado comparado aos concorrentes.",
        maps_whatsapp: phone,
        insta_coerencia_nicho: followers < 2000 ? "Baixa (conteúdo desalinhado)" : (followers < 10000 ? "Média" : "Alta"),
        insta_qualidade_imagens: followers < 2000 ? "Material amador e sem paleta de cores" : "Profissional e bem produzidas",
        insta_impacto_postagem: followers < 2000 ? "Ruim (baixo engajamento)" : "Bom (impacto positivo)"
      };

      const source = Math.random() > 0.5 ? "Google Maps" : "Instagram";

      leads.push({
        id: 'sim-' + Math.random().toString(36).substring(2, 11),
        title: leadTitle,
        percent: percent,
        type: type,
        category: nichoFormatted,
        rating: simulatedRating,
        source: source,
        phone: phone,
        email: `contato@${leadTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
        instagram: `@${leadTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        website: website,
        address: `${regiao ? regiao : 'Av. Paulista, 1000'} - São Paulo - SP`,
        date: todayStr,
        justificativa_ia: JSON.stringify(simulatedData),
        mapsMetrics: source === "Google Maps" ? { qtd_comentarios: Math.floor(10 + Math.random() * 120), nota_avaliacao: simulatedRating, qualidade_imagens: type === 'quente' ? 'Pobre' : 'Excelente' } : null,
        instaMetrics: source === "Instagram" ? { qtd_seguidores: followers, qtd_postagem: postsCount, taxa_engajamento: parseFloat((1.2 + Math.random() * 8.5).toFixed(2)), qualidade_postagem: type === 'quente' ? 'Baixa' : 'Alta', nicho_atuacao: nichoFormatted } : null
      });
    }

    return leads;
  }

  // Insert Lead Card DOM
  function insertLeadCardIntoDOM(lead) {
    const column = document.querySelector(`.lead-column[data-column="${lead.type}"]`);
    if (!column) return;

    const placeholder = column.querySelector('.lead-card-placeholder');

    const card = document.createElement('div');
    card.className = 'lead-card new-card';
    
    // Uppercase label mapping
    const typeLabel = lead.type.toUpperCase();
    
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
          <button class="btn-action-icon" title="Ligar para lead">
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
              <path d="M8.44997 7.79136C6.98642 9.33138 3.25331 5.63167 4.72236 4.08555C5.61943 3.14137 4.60625 2.06275 4.04528 1.26891C2.99238 -0.219163 0.681877 1.83541 0.751541 3.14259C0.973364 7.26519 5.43244 12.1505 9.75035 11.7239C11.1008 11.5907 12.653 9.1511 11.1039 8.25948C10.329 7.81336 9.26515 6.93335 8.44997 7.79075" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="btn-action-icon" title="Ver website">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="7" cy="7" r="6"/>
              <line x1="1" y1="7" x2="13" y2="7"/>
              <path d="M7 1a8.5 8.5 0 0 1 2.5 6A8.5 8.5 0 0 1 7 13 8.5 8.5 0 0 1 4.5 7 8.5 8.5 0 0 1 7 1Z"/>
            </svg>
          </button>
        </div>
        <button class="btn-capture">EFETUAR CAPTAÇÃO</button>
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

  // Toast System
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let iconHTML = '';
    if (type === 'success') {
      iconHTML = `
        <div class="toast-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `;
    } else {
      iconHTML = `
        <div class="toast-icon" style="color: #8E8E93; background: rgba(142, 142, 147, 0.1);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
      `;
    }

    toast.innerHTML = `
      ${iconHTML}
      <span>${message}</span>
      <button class="toast-close">&times;</button>
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
  const btnLogout = document.querySelector('.btn-logout');
  const btnCloseLogoutModal = document.getElementById('btn-close-logout-modal');
  const btnLogoutCancel = document.querySelector('.btn-modal-cancel');
  const btnLogoutConfirm = document.querySelector('.btn-modal-danger');

  const openLogoutModal = () => {
    if (logoutModal) logoutModal.classList.add('active');
  };

  const closeLogoutModal = () => {
    if (logoutModal) logoutModal.classList.remove('active');
  };

  if (btnLogout) {
    btnLogout.addEventListener('click', openLogoutModal);
  }

  if (btnCloseLogoutModal) {
    btnCloseLogoutModal.addEventListener('click', closeLogoutModal);
  }

  if (btnLogoutCancel) {
    btnLogoutCancel.addEventListener('click', closeLogoutModal);
  }

  if (btnLogoutConfirm) {
    btnLogoutConfirm.addEventListener('click', () => {
      window.auth.signOut();
    });
  }

  // Direct logout handler for pages without modal (e.g. configuracoes.html)
  const directLogoutBtn = document.querySelector('a.btn-logout');
  if (directLogoutBtn) {
    directLogoutBtn.addEventListener('click', (e) => {
      const logoutModal = document.getElementById('modal-logout');
      if (!logoutModal) {
        e.preventDefault();
        window.auth.signOut();
      }
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

      // Detecta se o backend está online
      const backendActive = await isBackendActive();

      const redirectToUrl = window.location.origin + window.location.pathname; // login.html

      try {
        if (backendActive) {
          await callBackend('/api/auth/recover', 'POST', { email, redirectTo: redirectToUrl });
          showToast(`Instruções de recuperação enviadas para: ${email}`, 'success');
        } else if (window.isSupabaseConfigured && window.supabaseClient) {
          const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectToUrl
          });
          if (error) throw error;
          showToast(`Instruções de recuperação enviadas para: ${email}`, 'success');
        } else {
          // Modo offline/simulado
          showToast(`[SIMULAÇÃO] Instruções de recuperação enviadas para: ${email}`, 'success');
        }
      } catch (error) {
        showToast(`Erro ao recuperar senha: ${error.message || 'Falha na requisição'}`, 'info');
      } finally {
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

      try {
        // Tenta fazer login via backend ou client-side Supabase
        const data = await window.auth.login(email, password);
        
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
        const errorMsg = error.message || '';
        const isConnectionError = errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch') || errorMsg.includes('servidor') || errorMsg.includes('configurado') || errorMsg.includes('inicializado') || errorMsg.includes('NetworkError');
        
        if (isConnectionError && !window.isSupabaseConfigured) {
          // Fallback simulated login
          setTimeout(() => {
            const mockName = email.split('@')[0];
            localStorage.setItem('nuvuy_user_name', mockName);
            showToast(`[SIMULAÇÃO] Bem-vindo de volta! Redirecionando...`, 'success');
            
            setTimeout(() => {
              window.location.href = getPageUrl('dashboard');
            }, 1000);
          }, 1500);
        } else {
          showToast(`Erro ao entrar: ${error.message || 'Credenciais inválidas'}`, 'info');
          submitBtn.classList.remove('loading');
          submitBtn.innerHTML = `<span>Entrar</span>`;
          inputs.forEach(input => input.removeAttribute('disabled'));
        }
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

      try {
        // Tenta cadastrar via backend ou client-side Supabase
        const data = await window.auth.signup(email, password, name);
        
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
        const errorMsg = error.message || '';
        const isConnectionError = errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch') || errorMsg.includes('servidor') || errorMsg.includes('configurado') || errorMsg.includes('inicializado') || errorMsg.includes('NetworkError');
        
        if (isConnectionError && !window.isSupabaseConfigured) {
          // Fallback simulated signup
          setTimeout(() => {
            localStorage.setItem('nuvuy_user_name', name);
            showToast(`[SIMULAÇÃO] Conta criada com sucesso, ${name}! Redirecionando...`, 'success');
            
            setTimeout(() => {
              window.location.href = getPageUrl('dashboard');
            }, 1200);
          }, 1500);
        } else {
          showToast(`Erro ao cadastrar: ${error.message}`, 'info');
          submitBtn.classList.remove('loading');
          submitBtn.innerHTML = `<span>Criar minha conta</span>`;
          inputs.forEach(input => input.removeAttribute('disabled'));
        }
      }
    });
  }

  // --- Leads Inteligentes Page Logic ---
  const isLeadsPage = document.getElementById('chart-daily-captures') !== null;
  if (isLeadsPage) {
    const leadsDatabase = [];

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
      
      const filteredLeads = leadsDatabase.filter(lead => {
        const query = filterQuery.toLowerCase();
        return lead.title.toLowerCase().includes(query) || 
               lead.category.toLowerCase().includes(query) ||
               lead.type.toLowerCase().includes(query);
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

    // 4. Show Lead Details & approach script
    const showLeadDetails = (lead) => {
      const emptyState = document.getElementById('details-empty-state');
      const detailsContent = document.getElementById('details-content');
      if (!emptyState || !detailsContent) return;

      emptyState.classList.add('hidden');
      detailsContent.classList.remove('hidden');

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

      // Se não houver roteiro gerado pela IA no JSON, usamos o gerador local dinâmico
      if (!justData.abordagem) {
        if (lead.source.includes('Maps')) {
          if (lead.type === 'quente') {
            justData.abordagem = `Olá, tudo bem? Me chamo Emanuel.P da Nuvuy. Encontrei a **${lead.title}** no Google Maps, onde notei que vocês possuem uma excelente reputação de **${lead.rating}** estrelas! Estávamos analisando as empresas em **${lead.address.split(',')[1] || 'sua região'}** e identificamos que, com a nossa ferramenta, vocês conseguem automatizar a prospecção de novos clientes do segmento de **${lead.category}**. Teriam 10 minutos para uma conversa rápida nesta semana?`;
          } else {
            justData.abordagem = `Olá! Meu nome é Emanuel.P da Nuvuy. Estava pesquisando no Google Maps e gostei muito das avaliações da **${lead.title}** no segmento de **${lead.category}**. Desenvolvemos uma automação de vendas focada na região de **${lead.address.split(',')[1] || 'sua região'}** para acelerar captações. Se fizer sentido, posso lhe enviar uma breve apresentação demonstrativa de 3 minutos?`;
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
      if (lead.source.includes('Maps') || lead.mapsMetrics) {
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
              <span class="metric-value">${escapeHtml(lead.address.split('-')[0] || lead.address)}</span>
            </div>
            <div class="metric-block">
              <span class="metric-label">Qualidade das Imagens</span>
              <span class="metric-value">${escapeHtml(m.qualidade_imagens || 'Média')}</span>
            </div>
            <div class="metric-block">
              <span class="metric-label">Nota de Avaliação</span>
              <span class="metric-value">${escapeHtml(parseFloat(m.nota_avaliacao || lead.rating).toFixed(1))} / 5.0</span>
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
      if (lead.source.includes('Instagram') || lead.instaMetrics) {
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

      detailsContent.innerHTML = `
        <div class="details-header-block">
          <div class="details-title-row">
            <h4 class="details-lead-title">${escapeHtml(lead.title)}</h4>
            <span class="details-lead-percent ${escapeHtml(lead.type)}">${escapeHtml(lead.percent)}%</span>
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
            <span class="info-value"><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></span>
          </div>
          <div class="info-item">
            <span class="info-label">WhatsApp</span>
            <span class="info-value">
              ${justData.maps_whatsapp && justData.maps_whatsapp !== 'N/A' 
                ? `<a href="https://wa.me/${justData.maps_whatsapp.replace(/[^0-9]/g, '')}" target="_blank">${escapeHtml(justData.maps_whatsapp)}</a>` 
                : `<a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank">${escapeHtml(lead.phone)}</a>`
              }
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">E-mail</span>
            <span class="info-value"><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></span>
          </div>
          ${lead.instagram ? `
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
                : `<a href="https://${escapeHtml(lead.website)}" target="_blank">${escapeHtml(lead.website)}</a>`
              }
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Endereço</span>
            <span class="info-value">${escapeHtml(lead.address)}</span>
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
          <button class="btn-copiar-roteiro" id="btn-copy-script">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copiar Roteiro</span>
          </button>
        </div>
      `;

      // Copy Script Action
      const copyBtn = document.getElementById('btn-copy-script');
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

    // 6. Export data button
    const btnExport = document.getElementById('btn-exportar-leads');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
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
    };

    const initPage = async () => {
      const backendActive = await isBackendActive();

      const token = localStorage.getItem('nuvuy_access_token');
      let leads = [];

      if (backendActive && token) {
        try {
          const res = await callBackend('/api/leads', 'GET', null, token);
          leads = res.data;
        } catch (err) {
          console.error('Erro ao carregar leads do servidor:', err);
          leads = JSON.parse(localStorage.getItem('nuvuy_simulated_leads') || '[]');
        }
      } else {
        leads = JSON.parse(localStorage.getItem('nuvuy_simulated_leads') || '[]');
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
              el.textContent = `${user.user_metadata.full_name} (admin)`;
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
            el.textContent = `${newName} (admin)`;
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
            el.textContent = `${newName} (admin)`;
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
          el.textContent = `${newName} (admin)`;
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

    // Click Listener para upgrades
    const subscribeButtons = document.querySelectorAll('.btn-subscribe');
    subscribeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const planName = btn.getAttribute('data-plan');
        showToast(`Redirecionando para o gateway de pagamento para o plano ${planName}...`, 'info');
        
        btn.setAttribute('disabled', 'true');
        btn.textContent = 'Aguardando...';

        setTimeout(() => {
          localStorage.setItem('nuvuy_user_plan', planName);
          updatePlansUI(planName);
          showToast(`Plano ${planName} assinado com sucesso! Seus limites foram atualizados.`, 'success');
        }, 2000);
      });
    });

    // Click Listener para compra de recargas
    const buyTokenButtons = document.querySelectorAll('.btn-buy-tokens');
    buyTokenButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tokens = btn.getAttribute('data-tokens');
        const price = btn.getAttribute('data-price');
        showToast(`Abrindo PIX/Cartão para compra de +${tokens} Leads (R$ ${price})...`, 'info');

        btn.setAttribute('disabled', 'true');
        const originalText = btn.textContent;
        btn.textContent = 'Processando...';

        setTimeout(() => {
          btn.removeAttribute('disabled');
          btn.textContent = originalText;
          
          // Adiciona os créditos ao saldo
          const currentTokens = parseInt(localStorage.getItem('nuvuy_user_tokens') || '0');
          localStorage.setItem('nuvuy_user_tokens', currentTokens + parseInt(tokens));
          
          showToast(`Recarga de +${tokens} Leads aprovada! Créditos adicionados ao seu saldo.`, 'success');
        }, 2500);
      });
    });
  }
});
