# Guia do Agente Nuvuy

## Essenciais
- **Idioma**: Português (pt-BR) para UI, nomes e este arquivo.
- **Modo híbrido**: 
  - **Conectado**: Frontend comunica com backend Node.js/Express na porta 3000 (`Back-end/`), que se comunica com Supabase e OpenRouter LLM.
  - **Simulação**: Se o backend estiver offline, o frontend roda totalmente estático, persistindo leads no `localStorage` (`nuvuy_simulated_leads`).

## Início Rápido
- **Apenas frontend**: abra `Front-end/dashboard.html` no navegador (`start Front-end/dashboard.html` no Windows).
- **Backend**:
  ```bash
  cd Back-end
  npm install
  npm run dev   # inicia servidor na :3000
  ```
- Requer arquivo `.env` em `Back-end/` com chaves do Supabase, OpenRouter e **Google Maps API**.

## Deploy
- **Vercel** → serve arquivos estáticos do front-end (HTML/CSS/JS).
- **Render** → hospeda a API Node.js/Express backend.
- **UptimeRobot** → mantém o Render acordado (ping a cada 5 min) para evitar cold start.
- `vercel.json` na raiz do repositório define as rotas amigáveis.

## Estrutura do Projeto
```
PROJETO-NUVUY/
├─ Front-end/
│   ├─ dashboard.html              # Kanban dashboard
│   ├ leads-inteligentes.html      # métricas, lista de leads, roteiro IA
│   ├ login.html                   # login/cadastro (glassmorphism, sem sidebar)
│   ├ configuracoes.html           # perfil, senha, predefinições do agente
│   ├ planos.html                  # planos (Free, Básico, Pro, Business) + modal PIX
│   ├ css/style.css                # estilos globais (grid, variáveis, dark/glass)
│   ├ js/script.js                 # JS vanilla compartilhado (sessão, verificação, toast, captura)
│   ├ js/supabase.js               # inicialização do cliente Supabase + BACKEND_API_URL
│   └─ assets/                     # logos, backgrounds
├─ Back-end/
│   ├ server.js                    # API Express + Supabase
│   ├ ai.js                        # inteligência SDR (OpenRouter LLM + fallback)
│   ├ scraper.js                   # Google Places API (dados reais) — SEM OSM/fallback
│   ├ scraper_instagram.js         # Google Custom Search + fetch público para Instagram
│   ├ .env                         # chaves de API e URL do banco
│   ├ .env.example                 # template das variáveis de ambiente
│   └─ package.json                # scripts npm e dependências
├─ DOCUMENTO.md                    # documentação completa do projeto
├─ ESTRUTURA B.md                  # diagrama ER e relacionamentos
└─ AGENTS.md                       # este arquivo
```

## Convenções Principais
- **Apenas CDNs** (sem npm no frontend):
  - Google Fonts (Inter, Poppins) via `<link>` em todas as páginas.
  - Chart.js via CDN apenas em `leads-inteligentes.html`.
  - Supabase JS client via CDN em todas as páginas.
- **JS**: Vanilla JS (`DOMContentLoaded`, `querySelector`, `addEventListener`), fallbacks consistentes.
- **CSS**: CSS Grid (`stats-grid`, `leads-grid`), variáveis CSS no `:root`, tema escuro, glassmorphism.
- **Leads UI**: 
  - `quente` = `#00A6FF` (azul)
  - `morno` = `#D900FF` (roxo)
  - `frio` = `#8E8E93` (cinza)
- **Toast**: `showToast(message, type)` fecha automaticamente após 4s.
- **Senha mínima**: 6 caracteres (verificado na UI de configurações).

## Arquitetura e Fluxo de Dados
- **Detecção do servidor**: Frontend chama `fetch('/api/status')` ao carregar; se acessível, usa API do backend, senão cai no `localStorage` + cliente Supabase direto.
- **Gerenciamento de sessão**: `checkSession()` procura `nuvuy_access_token` no `localStorage` (modo backend) ou sessão Supabase (fallback). Redireciona para `login.html` se não logado, senão para `dashboard.html`.
- **Logout**: 
  1. Clique em "Sair" → modal de confirmação.
  2. Chama `signOut()` no Supabase (se configurado).
  3. Remove `nuvuy_user_name`, `nuvuy_access_token`, `nuvuy_refresh_token`, `nuvuy_user_plan` do `localStorage`.
  4. Redireciona para `login.html`.
  *Importante*: Se esses tokens não forem limpos, `checkSession()` redirecionará de volta ao dashboard, bloqueando o logout.
- **Web scraper** (`scraper.js`): usa **Google Places API** (textsearch + details) para dados reais de empresas. Sem OSM ou fallback fictício. Retorna nome, telefone, website, avaliação e endereço reais.
- **Instagram** (`scraper_instagram.js`): usa **Google Custom Search API** para encontrar perfis do Instagram pelo nome da empresa, depois tenta extrair seguidores e postagens da página pública. Requer `GOOGLE_API_KEY` e `GOOGLE_CX` no `.env`.
- **Fluxo de captura (assíncrono via fila)**:
  1. Usuário preenche modal → envia.
  2. Backend **verifica créditos** e regras do plano. Se ok, insere job na tabela `job_queue` com `status: 'pending'` e retorna `{ job_id }` imediatamente.
  3. Frontend fecha o modal e faz **polling** a cada 2.5s em `GET /api/jobs/:id` até o job ficar `completed` ou `failed`.
  4. Worker interno (`processNextJob` executado a cada 3s) pega o job mais antigo, marca como `processing`, executa scraping + AI + persistência, deduz créditos e marca como `completed`.
  5. Ao receber `completed`, frontend renderiza os leads e dispara notificação.
- **Tabela `job_queue`**: UUID, user_id, nicho, regiao, quantidade, fontes JSONB, status (pending/processing/completed/failed), result JSONB, error_message, timestamps. RLS ativo (usuários veem só os próprios jobs). Worker usa `supabaseAdmin` para bypass de RSL. SQL de criação em `Back-end/sql/job_queue.sql`.
- **Sistema de créditos**: Cada lead capturado consome 2 créditos. O backend expõe `GET /api/user/usage` para o frontend exibir leads restantes. Se o período (`proxima_renovacao`) expirar, os créditos são automaticamente renovados na próxima requisição. Ao confirmar pagamento via webhook MisticPay, os créditos do novo plano são creditados.
- **Supabase Admin**: O backend usa `supabaseAdmin` (client com `SUPABASE_SERVICE_ROLE_KEY`) para operações na tabela `usuario`, bypassando RLS. Se a env var não existir, cai para anon key. 
- **Debug**: `GET /api/debug/config` retorna o estado das chaves (sem expor valores).
- **Ponte entre páginas**: `window.addLeadsToIntelligentPanel()` atualiza o painel de leads inteligentes e gráficos Chart.js após uma captura finalizar no dashboard.
- **Sistema de notificações**: Sino na top-bar com badge de não lidas. Popup com lista de notificações com ícones por tipo (success/warning/error/info). Persistência via `localStorage` (`nuvuy_notifications`). Funções: `addNotification(title, desc, iconType)` adiciona e renderiza automaticamente; `renderNotifications()` e `updateNotifBadge()` gerenciam a UI. Capturas bem-sucedidas e erro de créditos insuficientes disparam notificações automaticamente. "Marcar todas como lidas" no rodapé do popup.
- **Normalização WhatsApp**: `normalizeWaNumber(raw)` no `script.js` garante que números brasileiros sem `+55` recebam o código de país antes de montar o link `wa.me/`. Números com 10 ou 11 dígitos sem `55` recebem o prefixo automaticamente. Aplicado nos dois pontos que geram link de WhatsApp nos detalhes do lead.
- **Justificativa/Abordagem**: Armazenada como string JSON em `score.justificativa_ia`; frontend faz parse e renderiza justificativa, roteiro de abordagem, comentários do Maps separadamente.
- **URLs dinâmicas**: `getPageUrl()` em `script.js` retorna `dashboard.html` para protocolo `file:` (local) e `/dashboard` para HTTP(S) (Vercel). Links da sidebar são reescritos no `DOMContentLoaded` quando rodando no Vercel.

## Banco de Dados (Supabase / PostgreSQL)
- Veja `ESTRUTURA B.md` para schema ER completo.
- Tabelas principais: `usuario`, `plano`, `tarefas`, `fonte`, `tarefa_fonte`, `lead`, `metrica_google_maps`, `metrica_instagram`, `score`, `job_queue`, `payment_transaction`.
- **Trigger**: `on_auth_user_created` cria linha em `public.usuario` com plano gratuito no cadastro via Supabase Auth.
- **RLS**: Todas as tabelas têm políticas de segurança restringindo linhas a `auth.uid()`. A tabela `usuario` é acessada via `supabaseAdmin` (service_role key) para bypass de RLS.

## Pontuação e Temperatura de Leads (imposto pelo banco)
- Pontuação 0‑100 reflete probabilidade de fechamento.
  - **Frio (0‑40)**: Presença digital forte, avaliação alta no Maps, Instagram >15k seguidores → baixa chance.
  - **Morno (41‑70)**: Presença moderada, Instagram 3k‑7k seguidores, avaliação no Maps crescendo devagar.
  - **Quente (71‑100)**: Sem site, sem identidade visual, Instagram <2k seguidores → maior prioridade.
- Constraint `check_classificacao_faixa` garante que a classificação corresponda à pontuação.

## Testes / Lint / Build
- Sem etapa de build para frontend (HTML/CSS/JS puro).
- Backend: 
  - Servidor dev: `npm run dev`
  - Lint: `npm run lint` (se configurado)
  - Teste: `npm test` (se definido)

## Dicas para Agentes
- O scraper atualmente usa **apenas Google Places API** — requer `GOOGLE_MAPS_API_KEY` válida no `.env`. Sem ela, retorna 0 leads.
- Para debug local sem backend, use a chave `nuvuy_simulated_leads` no `localStorage`.
- Lembre-se de limpar os três tokens `nuvuy_*` do `localStorage` no logout para evitar redirecionamentos silenciosos.
- Todo estilo do frontend está em `css/style.css`; evite estilos inline.
- Qualquer nova página deve importar `js/supabase.js` e `js/script.js` para gerenciamento de sessão.
- Ao adicionar uma nova rota no backend, atualize `server.js` e lembre-se de protegê-la com autenticação Supabase (verificar `req.user`).
- O Render plano gratuito hiberna após 15 min ocioso → use UptimeRobot para mantê-lo ativo.
- `BACKEND_API_URL` em `supabase.js` aponta para localhost:3000 localmente e para URL do Render no Vercel.
- **Tabela `usuario`**: usa `supabaseAdmin` (service_role key) para bypass de RLS nas operações de crédito. Configure `SUPABASE_SERVICE_ROLE_KEY` no Render como environment variable.
- **Colunas essenciais da `usuario`**: `id` (uuid FK auth.users), `plano` (text), `creditos_restantes`, `creditos_utilizados`, `periodo_inicio`, `proxima_renovacao`.