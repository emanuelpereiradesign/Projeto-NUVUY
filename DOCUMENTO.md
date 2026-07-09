# Nuvuy — Documento do Projeto

## 1. O que é o Nuvuy?

O Nuvuy (captura de leads) é uma ferramenta própria de web scraping e classificação de leads, criada para prestadores de serviços digitais (designers, desenvolvedores, agências de marketing) que precisam prospectar clientes de forma automatizada e inteligente. O sistema coleta dados do Google Maps via Google Places API, armazena no Supabase, classifica cada lead através de um algoritmo próprio de pontuação inteligente e exibe os resultados em um dashboard visual.

## 2. Objetivos

- Capturar informações relevantes de diferentes fontes online
- Classificar leads automaticamente com base em critérios definidos
- Pontuar leads como **Frio** (0–40), **Morno** (41–70) ou **Quente** (71–100)
- Apresentar os dados em um layout moderno, responsivo e interativo
- Servir como ferramenta própria de prospecção

## 3. Público-Alvo

- Microempreendedores individuais (MEIs) que vendem serviços digitais
- Freelancers de design, desenvolvimento web, sistemas e automação
- Agências de marketing digital de pequeno porte (1–10 funcionários)
- Profissionais que precisam prospectar ativamente novos clientes

## 4. Atores do Sistema

| Ator | Descrição |
|------|-----------|
| **Usuário (Assinante)** | Ator principal. Representa os profissionais que utilizam o dashboard web. Inicia as campanhas de busca, consome os créditos do plano e acessa os dados dos leads. |
| **Sistemas Externos (Atores Não-Humanos)** | Representam as plataformas das quais o sistema extrai os dados (Google Maps via Places API) e a API de IA (OpenRouter), responsável por processar e classificar as informações capturadas de forma automatizada. |

## 5. Minimundo do Projeto

O Nuvuy é um sistema SaaS de prospecção digital projetado para prestadores de serviços. O sistema permite que o usuário configure tarefas de busca por nicho e localidade, acionando o scraper que extrai informações de empresas no Google Maps via Google Places API. O Instagram não é mais utilizado como fonte de dados reais (apenas como indicador no card).

O grande diferencial do sistema é o seu motor interno de qualificação, alimentado por Modelos de Linguagem de Larga Escala (LLMs) integrados via OpenRouter. Após o scraper capturar os dados brutos (nome, contato, website, endereço, avaliação), o sistema envia essas informações para a IA, que analisa a presença digital do potencial cliente. Com base nessa análise, o sistema atribui um "Score" para o lead, classificando-o automaticamente em três níveis de temperatura: **Frio** (0–40), **Morno** (41–70) ou **Quente** (71–100).

Toda a interface de gestão ocorre em um dashboard web responsivo com tema futurista/dark, utilizando um layout **Kanban** com três colunas (Quente, Morno, Frio) onde os leads são organizados por prioridade de fechamento.

A infraestrutura do projeto roda majoritariamente em nuvem (front-end no Vercel, API no Render, banco no Supabase). O Render free hiberna após 15 minutos sem uso; o UptimeRobot é usado para manter o serviço ativo.

### 5.1 Fluxo Funcional Situacional

1. Usuário preenche o modal de captura com nicho, região, quantidade e fontes (apenas Google Maps funcional).
2. Front-end envia requisição `POST /api/tarefas` para o backend Express (Render ou localhost:3000).
3. Back-end verifica o token JWT do usuário e cria o registro da tarefa no Supabase.
4. Back-end executa o **scraper via Google Places API** imediatamente (de forma síncrona):
   - Busca estabelecimentos na região com o termo informado
   - Para cada resultado, busca detalhes (telefone, website) via Place Details
5. Para cada lead capturado, o sistema envia os dados para o **OpenRouter LLM**, que analisa a presença digital e retorna pontuação (0–100), classificação (quente/morno/frio) e justificativa com roteiro de abordagem.
6. Caso a IA falhe ou não esteja configurada, um **fallback simulado** classifica com base em regras fixas (site, seguidores, avaliação).
7. Tudo é salvo no Supabase: `lead`, `metrica_google_maps` e `score`.
8. Back-end retorna os leads formatados → Front-end insere os cards nas colunas do Kanban.
9. Se a busca demorar mais de 4 segundos, o front-end exibe toast "Estamos efetuando sua busca, aguarde apenas um momento...".
10. Modal de captura fecha automaticamente ao finalizar (sucesso ou erro).

## 6. Modelo Canvas

### 6.1 Proposta de Valor — Fazer o que deve ser feito

Ajudar clientes a obter serviços que favoreçam seus negócios ou facilitem sua vida. A ferramenta traz uma facilidade enorme na vida do prestador de serviços digitais na parte de prospecção (busca por serviços ou busca por possíveis clientes). O Nuvuy é responsável por efetuar esta busca de uma forma mais prática e rápida.

### 6.2 Proposta de Valor — Performance (Desempenho)

Melhoria de desempenho de um produto ou serviço. A ferramenta possui motor interno de qualificação alimentado por LLMs. Em vez do freelancer entrar no Google Maps, abrir site por site, ver se tem Instagram e tentar adivinhar se o cliente precisa do serviço, a IA faz isso e já pontua (Score: Frio, Morno, Quente). Isso aumenta a performance da prospecção do usuário, permitindo que ele foque apenas nos leads com maior chance de fechamento (71–100).

### 6.3 Tabela do Canvas

| Componente | Descrição |
|------------|-----------|
| **Proposta de Valor** | Ferramenta de prospecção digital: scraping via Google Places + classificação via LLM + dashboard visual |
| **Segmento de Clientes** | MEIs, freelancers e agências de serviços digitais (design, dev, marketing) |
| **Canais** | Instagram, grupos WhatsApp/Telegram, indicação, Discord |
| **Relacionamento** | Suporte por WhatsApp, comunidade de usuários |
| **Fontes de Receita** | Assinatura SaaS mensal/anual |
| **Atividades-Chave** | Manutenção do scraper, refinamento dos prompts de IA, evolução do dashboard |
| **Estrutura de Custos** | R$ 0/mês (infraestrutura gratuita) |
| **Vantagem Competitiva** | Nicho específico, classificação inteligente, tema visual único, custo zero de operação |

## 7. Análise de Requisitos

### 7.1 Requisitos Funcionais

#### Módulo de Scraping e Coleta de Dados

| ID | Descrição | Prioridade |
|----|-----------|------------|
| RF01 | Scraping de dados do Google Maps via Google Places API (nome, endereço, telefone, avaliação, website) | Alta |
| RF02 | Instagram não é mais scrapperado; mantido apenas como indicador visual no card | Baixa |
| RF03 | Fontes de dados configuráveis (ativa/desativa via toggle no modal) | Alta |

#### Módulo de Classificação de Leads

| ID | Descrição | Prioridade |
|----|-----------|------------|
| RF06 | Processamento e estruturação de dados utilizando LLMs via API do OpenRouter | Alta |
| RF07 | Classificação em Frio (0–40), Morno (41–70), Quente (71–100) baseada no retorno da IA | Alta |
| RF08 | Exibição dos fatores que influenciaram a classificação | Alta |
| RF09 | Retreino do modelo com novos dados rotulados | Média |
| RF10 | Cálculo de confiança da classificação | Média |
| RF11 | Modo híbrido: operação com backend online ou fallback para simulação estática com localStorage | Alta |

#### Módulo de Dashboard

| ID | Descrição | Prioridade |
|----|-----------|------------|
| RF12 | Exibição de Leads em formato Kanban com colunas Quente/Morno/Frio, cards com score, avaliação e ações | Alta |
| RF13 | Modal de captura com inputs de nicho, região, quantidade e seleção de fontes | Alta |
| RF14 | Painel "Leads Inteligentes" com gráficos (Chart.js), lista de leads, detalhes com justificativa da IA e roteiro de abordagem | Alta |
| RF15 | Botão "Não possui site" destacado em vermelho nos cards do Kanban | Alta |
| RF16 | Sistema de toast notifications com auto-dismiss (4s) e indicador de progresso | Média |
| RF17 | Toast de espera "Estamos efetuando sua busca..." exibido após 4s se a busca demorar | Média |
| RF18 | Modal de captura fecha automaticamente ao finalizar a busca (sucesso ou erro) | Alta |
| RF19 | Layout responsivo (desktop, tablet, mobile) | Alta |
| RF20 | Tema visual futurista/dark com glassmorphism | Alta |

### 7.2 Requisitos Não Funcionais

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RNF01 | Usabilidade | A interface do dashboard deve ser intuitiva, fácil de usar e totalmente responsiva |
| RNF02 | Disponibilidade | O sistema deve operar em nuvem (Vercel + Render + Supabase); Render free hiberna após 15 min, mitigado por UptimeRobot |
| RNF03 | Segurança | Comunicação criptografada (HTTPS), dados seguros no banco, autenticação via Supabase |
| RNF04 | Desempenho | A captura é síncrona com timeout de 90s. Toast de espera exibido após 4s. Modal fecha automaticamente |
| RNF05 | Conformidade | Coleta foca em informações públicas de empresas (B2B), respeitando diretrizes da LGPD |

### 7.3 Estrutura de Banco de Dados

O banco possui **8 tabelas** no schema `public` do Supabase, mais uma trigger de integração com `auth.users`. Todos os nomes de tabelas e colunas estão em **português** conforme a implementação.

#### `usuario`
Estende `auth.users` com dados de plano e consumo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Referencia `auth.users(id)` via FK |
| nome | text | Nome do usuário |
| email | text | Email |
| data_cadastro | timestamptz | Data de cadastro (default `now()`) |
| id_plano | UUID (FK → `plano.id`) | Plano contratado |
| leads_utilizados | integer | Leads consumidos no mês |
| saldo_tokens | integer | Saldo de tokens extras |

#### `plano`
Planos de assinatura.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Chave primária |
| nome | text | Nome do plano (Gratuito, Básico, Pro) |
| valor | numeric | Valor mensal (0, 49, 97) |
| limite_mensal | integer | Limite mensal de leads |
| max_leads_tarefa | integer | Máx. leads por tarefa (10) |
| max_tarefas_mes | integer | Máx. tarefas por mês |
| created_at | timestamptz | Data de criação |

#### `tarefas`
Tarefas de captura iniciadas pelo usuário.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Chave primária |
| id_usuario | UUID (FK → `usuario.id`) | Usuário que criou |
| data | timestamptz | Data de criação |
| termo_busca | text | Nicho/palavra-chave |
| local | text | Região de busca |
| status | text | `completed` (processamento síncrono) |

#### `fonte`
Fontes de captura disponíveis.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Chave primária |
| nome | text | "Google Maps" ou "Instagram" |
| tipo | text | "Maps" ou "Instagram" |
| ativo | boolean | Se está ativo |

#### `tarefa_fonte`
Tabela associativa N:N entre tarefas e fontes.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id_tarefa | UUID (FK → `tarefas.id`) | Tarefa |
| id_fonte | UUID (FK → `fonte.id`) | Fonte |
| PK composta | (id_tarefa, id_fonte) | |

#### `lead`
Leads capturados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Chave primária |
| id_tarefas | UUID (FK → `tarefas.id`) | Tarefa de origem |
| nome | text | Nome da empresa |
| email | text | Email de contato |
| telefone | text | Telefone/WhatsApp |
| website | text | URL do site (ou vazio se não possui) |
| endereco | text | Endereço completo |
| categoria | text | Nicho em maiúsculas |
| data_captura | timestamptz | Data da captura |

#### `metrica_google_maps`
Métricas do Google Maps para cada lead.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Chave primária |
| id_lead | UUID (FK → `lead.id`, unique) | Lead vinculado |
| qtd_comentarios | integer | Número de avaliações |
| nota_avaliacao | numeric | Nota (1.0 a 5.0) |
| qualidade_imagens | text | null (não fornecido pela Places API) |

#### `metrica_instagram`
Métricas do Instagram para cada lead.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Chave primária |
| id_lead | UUID (FK → `lead.id`, unique) | Lead vinculado |
| qtd_seguidores | integer | null (não scrapperado) |
| qtd_postagem | integer | null |
| taxa_engajamento | numeric | null |
| qualidade_postagem | text | null |
| nicho_atuacao | text | null |

#### `score`
Classificação e pontuação do lead gerada pela IA.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Chave primária |
| id_lead | UUID (FK → `lead.id`, unique) | Lead vinculado |
| id_mtc_instagram | UUID (FK → `metrica_instagram.id`) | null (sem dados reais) |
| id_mtc_mps | UUID (FK → `metrica_google_maps.id`) | Métricas Maps usadas |
| data_analise | timestamptz | Data da análise |
| pontuacao | integer | 0 a 100 (check constraint) |
| classificacao | text | "quente", "morno" ou "frio" |
| justificativa_ia | text | JSON com justificativa, abordagem, comentários Maps, análise |
| **Constraint** | `check_classificacao_faixa` | Garante: quente=71-100, morno=41-70, frio=0-40 |

#### Trigger: `on_auth_user_created`

Quando um novo usuário se cadastra via Supabase Auth, o trigger dispara a função `handle_new_user()`, que insere automaticamente uma linha em `public.usuario` vinculada ao plano **Gratuito**.

#### RLS (Row Level Security)

Todas as tabelas possuem políticas de segurança que restringem o acesso a `auth.uid()`, garantindo que cada usuário veja e manipule apenas seus próprios dados através da cadeia `usuario → tarefas → lead`.

## 8. Sistema de Classificação

### 8.1 Critérios de Avaliação

| Critério | Peso | Descrição |
|----------|------|-----------|
| Presença digital | Alto | Possui site? Redes sociais ativas? |
| Engajamento | Médio | Interação em posts, avaliações no Maps |
| Segmento | Alto | Compatibilidade com serviços digitais oferecidos |
| Indícios de necessidade | Alto | Ausência de site, baixa presença digital |

### 8.2 Pontuação

| Faixa | Classificação | Ação Recomendada |
|-------|---------------|------------------|
| 0–40 | Frio | Nutrir com conteúdo, educar |
| 41–70 | Morno | Abordagem com proposta de valor |
| 71–100 | Quente | Contato imediato, proposta comercial |

## 9. Modelo de Monetização

### 9.1 Planos de Assinatura

| Plano | Valor | Leads/mês | Leads por tarefa | Tarefas/mês |
|-------|-------|-----------|-----------------|-------------|
| **Gratuito** | R$ 0 | 50 | Até 10 | Máx. 5 |
| **Básico** | R$ 49/mês | 200 | Até 10 | Máx. 20 |
| **Pro** | R$ 97/mês | 600 | Até 10 | Máx. 60 |

**Recarga de tokens:** saldo extra de leads, funcionando como crédito de operadora (valores a definir).

## 10. Análise de Custos

### 10.1 Custo Operacional Mensal (Validação Inicial)

| Item | Fornecedor | Custo | Observação |
|------|-----------|-------|------------|
| Front-end | Vercel | Free | Hospedagem estática HTML/CSS/JS |
| API Backend (Node.js/Express) | Render | Free | API REST, scraper e IA rodam aqui |
| Banco de dados | Supabase | Free | 500 MB, 50k linhas |
| Scraping | Google Places API | Free (200 req/dia) | Textsearch + Details |
| Monitoramento | UptimeRobot | Free | Mantém Render acordado a cada 5 min |
| Domínio | Subdomínio grátis | Free | nuvuy.vercel.app ou similar |
| Marketing | Orgânico | Free | Instagram, grupos |
| LLM (Classificação IA) | OpenRouter | Free | LLMs gratuitas disponíveis |
| **Total** | | **R$ 0** | Sem custo inicial |

### 10.2 Investimento Inicial (Único)

| Item | Valor | Quando |
|------|-------|--------|
| Domínio .com.br (opcional) | R$ 40–60 | Após validar o projeto |

### 10.3 Projeção de Lucro (Ano 1)

| Período | Clientes Pagantes | Receita | Custo | Lucro |
|---------|------------------|---------|-------|-------|
| Mês 1–2 | 0 (beta) | R$ 0 | R$ 0 | R$ 0 |
| Mês 3 | 3–5 | R$ 147–245 | R$ 0 | R$ 147–245 |
| Mês 4 | 5–8 | R$ 300–500 | R$ 0 | R$ 300–500 |
| Mês 5 | 8–12 | R$ 500–800 | R$ 0 | R$ 500–800 |
| Mês 6 | 12–18 | R$ 800–1.300 | R$ 0 | R$ 800–1.300 |
| Mês 7–9 | 18–25 | R$ 1.300–2.000 | R$ 0 | R$ 1.300–2.000 |
| Mês 10–12 | 25–35 | R$ 2.000–3.000 | R$ 0 | R$ 2.000–3.000 |
| **Total** | **35 clientes** | **R$ 18.000** | **R$ 0** | **R$ 18.000** |

> Supondo que todos os 35 clientes adquiram o plano Básico e renovem a mensalidade.

### 10.4 Escalabilidade

**Cenário inicial:** até 1.400 leads/mês (exemplo: 4 usuários no plano Básico e 1 no plano Pro).

**Execução atual:** O backend Express no Render processa esse volume com chamadas síncronas. O limite é a cota diária da Google Places API (200 textsearch + 100 details/dia).

**Limitação:** Google Places tem cota gratuita de 200 requisições/dia. Cada busca usa 1 textsearch + N details. Para escalar, é necessário ativar faturamento no Google Cloud (pagamento por uso, ~$0.01/req após cota).

**Crescimento futuro:** Para escalar, implementar fila de tarefas assíncrona e aumentar cota do Google Places.

## 11. Estratégia de Aquisição de Clientes

### 11.1 Canais Orgânicos (Custo Zero)

| Canal | Ação | Tempo/Dia | Clientes/mês |
|-------|------|-----------|--------------|
| Grupos WhatsApp/Telegram | Posts com prints do dashboard e resultados | 15 min | 3–5 |
| Instagram Reels | Vídeos mostrando o dashboard e funcionalidades | 20 min (1x/semana) | 5–7 |
| Programa de Indicação | 1 mês grátis por indicação convertida | Configurar 1x | 2–5 |
| Comunidades Dev | Posts pedindo feedback e divulgando | 10 min | 1–2 |

## 12. Análise de Mercado

### 12.1 Concorrência

| Concorrente | Pontos Fortes | Ponto Fraco | Diferencial do Nuvuy |
|-------------|---------------|-------------|----------------------|
| **Apify** | Poderoso, muitos integradores | Caro, complexo, inglês | Nuvuy é nacional, mais simples e nichado |
| **Leadster** | Chat/MQLs, bem estabelecido | Não faz scraping, caro | Nuvuy captura leads ativamente |
| **Octoparse** | No-code, visual | Caro (~$75/mês), genérico | Nuvuy tem classificação via IA + custo zero |
| **Scrapinghub** | Enterprise-grade | Muito caro, complexo | Nuvuy é acessível e nichado |

## 13. Objetivo da Arquitetura

Validar a plataforma Nuvuy sem custo inicial, usando:

- **Vercel** → hospedagem do front-end (HTML/CSS/JS estático)
- **Render** → hospedagem da API Node.js/Express (backend)
- **Supabase** → banco de dados PostgreSQL + autenticação
- **OpenRouter** → classificação inteligente de leads via LLM
- **Google Places API** → scraper de dados reais de estabelecimentos
- **UptimeRobot** → mantém Render acordado (ping a cada 5 min)
- **Planos e tokens** → monetização clara e escalável

### Diagrama de Arquitetura (Resumido)

```
Usuário (Navegador)
    │
    ├── Vercel ── Front-end (HTML/CSS/JS estático)
    │                 │
    │                 ├── Modo conectado: fetch('/api/status') → Render (API)
    │                 └── Modo simulado: localStorage (nuvuy_simulated_leads)
    │
    └── Render ── API Express
                      │
                      ├── scraper.js (Google Places API → leads reais)
                      ├── ai.js (OpenRouter LLM → classificação)
                      └── Supabase (persistência + auth)

UptimeRobot ── ping a cada 5 min → https://nuvuy-api.onrender.com/api/status
```