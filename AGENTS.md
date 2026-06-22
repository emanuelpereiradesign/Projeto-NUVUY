# Nuvuy

**Idioma:** Português (pt-BR) — todo texto de UI, nomes e este arquivo.

## Essência

Dashboard de gestão de leads com suporte a dois modos de operação (Híbrido):
1. **Modo Conectado (Back-end Ativo):** Comunica-se com o servidor Node.js/Express na porta `3000` (`Back-end/`), que gerencia dados no Supabase e integra a inteligência SDR via OpenRouter LLM.
2. **Modo Simulação (Fallback / Local):** Se o back-end estiver inativo, o front-end opera de forma 100% estática localmente, gerando e persistindo leads no `localStorage` (`nuvuy_simulated_leads`).

## Como visualizar

```
# Executar o Front-end diretamente no navegador
start Front-end/index.html

# Para rodar o Back-end (opcional, requer .env configurado)
cd Back-end
npm install
npm run dev
```

## Estrutura do Projeto

```
PROJETO-NUVUY/
├── Front-end/
│   ├── index.html                    # dashboard (Kanban de leads)
│   ├── leads-inteligentes.html       # métricas Chart.js, listagem de leads, detalhamento e Roteiro de Abordagem IA
│   ├── login.html                    # login/cadastro (glassmorphism, sem sidebar)
│   ├── configuracoes.html            # perfil, senha, predefinições do agente
│   ├── planos.html                   # assinatura e compra de recarga de créditos
│   ├── css/style.css                 # folha única com estilização detalhada de métricas
│   ├── js/script.js                  # JS puro compartilhado e unificado entre TODAS as páginas
│   ├── js/supabase.js                # URL e chaves cliente do Supabase
│   └── assets/                       # logos e fundos
└── Back-end/
    ├── server.js                     # servidor Express, rotas da API e persistência Supabase
    ├── ai.js                         # módulo de inteligência SDR com OpenRouter LLM e simulação estruturada
    ├── scraper.js                    # módulo Web Scraper integrado consultando a API B2B OpenStreetMap Nominatim
    ├── .env                          # chaves de API e URLs de banco de dados
    └── package.json                  # scripts e dependências do back-end
```

## CDNs (sem npm no front-end)

- **Google Fonts** (Inter, Poppins) — via `<link>` em todas as páginas
- **Chart.js** — `<script src="https://cdn.jsdelivr.net/npm/chart.js">` só em `leads-inteligentes.html`
- **Supabase JS Client** — `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` em todas as páginas para controle de sessão local

## Arquitetura e Fluxo de Dados

- **Detecção de Estado do Servidor:** O front-end faz um ping em `fetch('/api/status')` na inicialização para decidir se chamará as APIs do Express ou se usará o simulador do `localStorage` e o cliente direto do Supabase.
- **Integração do Web Scraper:** A captação real de leads de Google Maps no back-end ocorre através do módulo `scraper.js`, que faz requisições assíncronas para a API aberta de busca geográfica e B2B do OpenStreetMap (Nominatim API), trazendo estabelecimentos locais, endereços e contatos reais sem depender de chaves pagas. Se a quantidade retornada for menor do que o limite solicitado, a lista é automaticamente completada por uma geração estruturada realista local.
- **Ponte entre páginas:** `window.addLeadsToIntelligentPanel()` — atualiza a listagem de leads inteligentes e gráficos do Chart.js imediatamente após a finalização de uma captação no dashboard.
- **Estrutura de Justificativa/Abordagem:** O campo `justificativa_ia` no banco de dados (tabela `score`) armazena um objeto JSON stringificado. O front-end realiza o parse para renderizar de forma separada a justificativa, o roteiro de abordagem, os comentários do maps e as tags do Instagram.

## Web Scraper e Inteligência SDR (Métricas Coletadas)

O sistema analisa e entrega as seguintes informações dos leads capturados:
1. **Google Maps:** Localidade no Maps, qualidade de imagens (Excelente/Média/Pobre), avaliação (nota e contagem), comentário positivo destaque, comentário negativo destaque, telefone, e-mail, WhatsApp (com link direto de clique `wa.me`) e site.
   - *Regra Crítica do Site:* Se o lead não possuir website, recebe a tag vermelha **"NÃO POSSUI SITE"** no card do dashboard e no painel de detalhamento.
2. **Instagram:** Nome do perfil, seguidores, postagens, contas que segue, média de curtidas e comentários (taxa de engajamento), qualidade visual das imagens do feed, coerência temática com o nicho e impacto das publicações (bom/ruim).

## Classificação de Temperatura (Rígida via DB e AI)

A pontuação (Score de 0 a 100) reflete rigidamente a chance de fechamento:
- **Lead Frio (0% a 40%):** Presença digital muito bem estruturada, avaliações excelentes no Maps, Instagram consolidado com mais de 15.000 seguidores e ~150 posts. Baixo potencial de fechamento rápido.
- **Lead Morno (41% a 70%):** Presença digital mediana (Instagram entre 3.000 e 7.000 seguidores), avaliações no Maps crescendo lentamente. Foco em otimizar e corrigir o que já funciona.
- **Lead Quente (71% a 100%):** Sem site, sem identidade visual, começando do absoluto zero e Instagram abaixo de 2.000 seguidores. Máxima prioridade para venda de pacotes completos.

## Convenções do código

- **CSS:** Grid layout (`stats-grid`, `leads-grid`), variáveis no `:root`, temas escuros e glassmorphism.
- **JS:** Vanilla JS puro — `DOMContentLoaded`, `querySelector`, `addEventListener` e tratamento de erros com fallbacks consistentes.
- **Leads:** Três níveis visuais: `quente` (azul `#00A6FF`), `morno` (roxo `#D900FF`), `frio` (cinza `#8E8E93`).
- **Toast:** `showToast(msg, type)` com fechamento automático em **4s**.
- **Segurança da Senha:** Validação mínima de 6 caracteres na interface de configurações.

