# Nuvuy — Documento do Projeto

## 1. O que é o Nuvuy?

O Nuvuy (captura de leads) é uma ferramenta própria de web scraping e classificação de leads, criada para prestadores de serviços digitais (designers, desenvolvedores, agências de marketing) que precisam prospectar clientes de forma automatizada e inteligente. O sistema coleta dados de fontes como Google Maps e Instagram, armazena no Supabase, classifica cada lead através de um algoritmo próprio de pontuação inteligente e exibe os resultados em um dashboard visual.

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
| **Administrador** | Ator secundário. Tem acesso ao painel de controle para gerenciar planos e monitorar o status dos agentes de coleta de dados. |
| **Sistemas Externos (Atores Não-Humanos)** | Representam as plataformas das quais o sistema extrai os dados (Google Maps e Instagram) e a API de IA (OpenRouter), responsável por processar e classificar as informações capturadas de forma automatizada. |

## 5. Minimundo do Projeto

O Nuvuy é um sistema SaaS de prospecção digital projetado para prestadores de serviços. O sistema permite que o usuário configure Jobs de busca por nicho e localidade, acionando robôs de coleta automatizada (scrapers) que extraem informações de empresas em fontes públicas, como Google Maps e Instagram.

O grande diferencial do sistema é o seu motor interno de qualificação, alimentado por Modelos de Linguagem de Larga Escala (LLMs) integrados via OpenRouter. Após os scrapers capturarem os dados brutos (nome, contato, website, endereço, categoria), o sistema envia essas informações para a IA, que analisa a presença digital do potencial cliente. Com base nessa análise, o sistema atribui um "Score" exclusivo para o lead, classificando-o automaticamente em três níveis de temperatura: **Frio** (0–40), **Morno** (41–70) ou **Quente** (71–100).

Toda a interface de gestão ocorre em um dashboard web responsivo com tema futurista/dark, onde os leads são listados de forma clara em formato de tabelas/listas interativas, priorizando aqueles com maior chance de fechamento. A infraestrutura do projeto roda 100% em nuvem, com persistência no Supabase (PostgreSQL), garantindo que as coletas e análises ocorram em segundo plano 24 horas por dia, sem depender do computador local do usuário.

### 5.1 Fluxo Funcional Situacional

1. Usuário cria uma tarefa solicitando X leads (máx. 10 por tarefa).
2. Sistema verifica se o usuário ainda tem saldo disponível (plano + tokens).
3. Se ok, tarefa é registrada no banco (Supabase) com status `pending`.
4. GitHub Actions roda periodicamente, busca tarefas pendentes e processa:
   - Divide a coleta entre Google Maps (via API oficial) e Instagram (via scraper).
   - Executa o scraping sem limite de tempo curto, em lote.
5. Salva os resultados no Supabase e atualiza status para `completed`.
6. Front-end (HTML, CSS, JS hospedado no Vercel) mostra os leads captados ao usuário.

## 6. Modelo Canvas

### 6.1 Proposta de Valor — Fazer o que deve ser feito

Ajudar clientes a obter serviços que favoreçam seus negócios ou facilitem sua vida. A ferramenta traz uma facilidade enorme na vida do prestador de serviços digitais na parte de prospecção (busca por serviços ou busca por possíveis clientes). O Nuvuy é responsável por efetuar esta busca de uma forma mais prática e rápida.

### 6.2 Proposta de Valor — Performance (Desempenho)

Melhoria de desempenho de um produto ou serviço. A ferramenta possui motor interno de qualificação alimentado por LLMs. Em vez do freelancer entrar no Google Maps, abrir site por site, ver se tem Instagram e tentar adivinhar se o cliente precisa do serviço, a IA faz isso e já pontua (Score: Frio, Morno, Quente). Isso aumenta a performance da prospecção do usuário, permitindo que ele foque apenas nos leads com maior chance de fechamento (71–100).

### 6.3 Tabela do Canvas

| Componente | Descrição |
|------------|-----------|
| **Proposta de Valor** | Ferramenta de prospecção digital: scraping inteligente + classificação via LLM + dashboard visual |
| **Segmento de Clientes** | MEIs, freelancers e agências de serviços digitais (design, dev, marketing) |
| **Canais** | Instagram, grupos WhatsApp/Telegram, indicação, Discord |
| **Relacionamento** | Suporte por WhatsApp, comunidade de usuários |
| **Fontes de Receita** | Assinatura SaaS mensal/anual |
| **Atividades-Chave** | Manutenção dos scrapers, refinamento dos prompts de IA, evolução do dashboard |
| **Estrutura de Custos** | R$ 0/mês (infraestrutura gratuita) |
| **Vantagem Competitiva** | Nicho específico, classificação inteligente, tema visual único, custo zero de operação |

## 7. Análise de Requisitos

### 7.1 Requisitos Funcionais

#### Módulo de Scraping e Coleta de Dados

| ID | Descrição | Prioridade |
|----|-----------|------------|
| RF01 | Scraping de dados do Google Maps (nome, endereço, telefone, avaliação, website) | Alta |
| RF02 | Scraping de dados do Instagram (perfil, seguidores, engajamento) | Alta |
| RF03 | Scraping de dados do Google Search via API | Alta |
| RF04 | Gerenciamento de filas de scraping jobs com status | Alta |
| RF05 | Fontes de dados configuráveis (ativa/desativa) | Alta |

#### Módulo de Classificação de Leads

| ID | Descrição | Prioridade |
|----|-----------|------------|
| RF06 | Processamento e estruturação de dados utilizando LLMs via API do OpenRouter | Alta |
| RF07 | Classificação em Frio (0–40), Morno (41–70), Quente (71–100) baseada no retorno da IA | Alta |
| RF08 | Exibição dos fatores que influenciaram a classificação | Alta |
| RF09 | Retreino do modelo com novos dados rotulados | Média |
| RF10 | Cálculo de confiança da classificação | Média |

#### Módulo de Dashboard

| ID | Descrição | Prioridade |
|----|-----------|------------|
| RF11 | Exibição de Leads em formato de tabela/DataGrid interativa, com filtros de classificação | Alta |
| RF12 | Timeline de evolução e status dos leads | Média |
| RF13 | Layout responsivo (desktop, tablet, mobile) | Alta |
| RF14 | Tema visual futurista/dark | Alta |

### 7.2 Requisitos Não Funcionais

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RNF01 | Usabilidade | A interface do dashboard deve ser intuitiva, fácil de usar e totalmente responsiva (adaptável para desktop e dispositivos móveis) |
| RNF02 | Disponibilidade | O sistema deve operar 100% em nuvem, permitindo que as buscas rodem em segundo plano sem depender do computador local do usuário |
| RNF03 | Segurança | A comunicação deve ser criptografada (HTTPS) e os dados dos usuários e leads devem ser armazenados de forma segura no banco de dados |
| RNF04 | Desempenho | O sistema deve processar a fila de captura e classificação de leads de forma assíncrona, sem travar a interface do usuário |
| RNF05 | Conformidade | A coleta de dados deve focar exclusivamente em informações públicas de empresas (B2B), respeitando as diretrizes gerais da LGPD |

### 7.3 Estrutura de Banco de Dados

#### Tabela `users`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| name | String | Nome do usuário |
| email | String | Email do usuário |
| plan_id | FK → plans | Plano contratado |
| leads_used | Int | Leads consumidos no mês |
| tokens_balance | Int | Saldo de tokens (recarga) |

#### Tabela `plans`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| name | String | Nome do plano |
| monthly_limit | Int | Limite mensal de leads |
| max_task_leads | Int | Máx. leads por tarefa |
| max_tasks | Int | Máx. tarefas por mês |

#### Tabela `tasks`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| user_id | FK → users | Usuário que criou a tarefa |
| quantity | Int | Quantidade solicitada |
| source | Enum | Fonte: `maps` / `instagram` |
| status | String | `pending` / `completed` |
| created_at | Timestamp | Data de criação |
| results | JSON | Resultados do scraping |

## 8. Sistema de Classificação

### 8.1 Critérios de Avaliação

| Critério | Peso | Descrição |
|----------|------|-----------|
| Presença digital | Alto | Possui site? Redes sociais ativas? |
| Engajamento | Médio | Interação em posts, frequência de publicações |
| Segmento | Alto | Compatibilidade com serviços digitais oferecidos |
| Indícios de necessidade | Alto | Ausência de site, cardápio digital, sistema de agendamento |

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
| Hospedagem (Front-end + API) | Vercel | Free (plano base) | Hospedagem do front-end e API serverless |
| Banco de dados | Supabase | Free (plano base) | 500 MB, 50k linhas |
| Motor de scraping | GitHub Actions | Free | Minutos gratuitos para execução assíncrona |
| Proxy | Código próprio | Free | Delays + User-Agent rotation |
| Domínio | Subdomínio grátis | Free | nuvuy.vercel.app ou similar |
| Marketing | Orgânico | Free | Instagram, grupos |
| LLM (Agentes IA) | OpenRouter | Free (LLMs gratuitas) | Coleta de dados para treinamento |
| **Total** | | **R$ 0** | Sem custo inicial |

### 10.2 Investimento Inicial (Único)

| Item | Valor | Quando |
|------|-------|--------|
| Domínio .com.br (opcional) | R$ 40–60 | Só depois de validar o projeto |

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

**Execução:** GitHub Actions consegue processar esse volume dentro dos minutos gratuitos.

**Crescimento:** se chegar a milhares de leads/dia, pode migrar para workers dedicados (Heroku, Railway, Render).

**Distribuição de carga:** dividir tarefas em lotes e manter contador de leads por usuário garante estabilidade.

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

- **Vercel** → hospedagem do front-end e API
- **Supabase** → banco de dados fixo para persistência
- **GitHub Actions** → motor assíncrono para scraping
- **Planos e tokens** → monetização clara e escalável
