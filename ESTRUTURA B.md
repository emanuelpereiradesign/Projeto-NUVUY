# Estrutura do Banco de Dados (Modelo ER)

## 1. Entidades e Atributos

*(Nota: Os campos `ID` são Chaves Primárias (PK) e os campos com prefixo `Id_` são Chaves Estrangeiras (FK), conforme o padrão visual e de nomenclatura do diagrama original).*

### 🧑‍💻 `usuario`
* **ID** *(PK - uuid, ref: auth.users)*
* Nome
* Email
* Data_cadastro
* Id_plano *(FK - ref: plano)*
* Leads_utilizados
* Saldo_tokens

### 💳 `plano`
* **ID** *(PK)*
* Nome
* Valor
* Limite_mensal
* Max_leads_tarefa
* Max_tarefas_mes
* Created_at

### 📋 `Tarefas`
* **ID** *(PK)*
* Id_usuario *(FK - ref: usuario)*
* Data
* Termo_busca
* Local
* Status

### 🔗 `tarefa_fonte`
* Id_tarefa *(FK - ref: Tarefas)*
* Id_fonte *(FK - ref: Fonte)*
* *PK composta: (id_tarefa, id_fonte)*

### 🌐 `Fonte`
* **ID** *(PK)*
* Nome
* Tipo
* Ativo

### 🎯 `Lead`
* **ID** *(PK)*
* Id_tarefas *(FK - ref: Tarefas)*
* Nome
* Email
* Telefone
* Website
* Endereco
* Categoria
* Data_captura

### 📍 `Metrica_google_maps`
* **ID** *(PK)*
* Id_lead *(FK - ref: Lead, unique)*
* Qtd_comentarios
* Nota_avaliacao *(check: 1.0 a 5.0)*
* Qualidade_imagens

### 📸 `Metrica_instagram`
* **ID** *(PK)*
* Id_lead *(FK - ref: Lead, unique)*
* Qtd_seguidores
* Qtd_postagem
* Taxa_engajamento
* Qualidade_postagem
* Nicho_atuacao

### 📊 `Score`
* **ID** *(PK)*
* Id_lead *(FK - ref: Lead, unique)*
* Id_mtc_instagram *(FK - ref: Metrica_instagram)*
* Id_mtc_mps *(FK - ref: Metrica_google_maps)*
* Data_analise
* Pontuacao *(check: 0 a 100)*
* Classificacao *(check: 'quente', 'morno', 'frio')*
* Justificativa_IA
* *Constraint: classificação deve corresponder à faixa de pontuação (71-100 = quente, 41-70 = morno, 0-40 = frio)*

---

## 2. Relacionamentos

* **Assina:** `usuario` **(N) <-> (1)** `plano`
  * *Um usuário possui um plano; um plano pode ser contratado por vários usuários.*

* **Cria:** `usuario` **(1) <-> (N)** `Tarefas`
  * *Um usuário pode criar várias tarefas.*

* **Utiliza:** `Tarefas` **(N) <-> (N)** `Fonte` *(via `tarefa_fonte`)*
  * *Várias tarefas podem utilizar várias fontes (Muitos-para-Muitos).*

* **Captura:** `Tarefas` **(1) <-> (N)** `Lead`
  * *Uma tarefa é responsável pela captura de vários leads.*

* **Possui (Lead -> Score):** `Lead` **(1) <-> (1)** `Score`
  * *Um lead possui um único score/análise.*

* **Possui (Lead -> Maps):** `Lead` **(1) <-> (0..1)** `Metrica_google_maps`
  * *Um lead pode ou não possuir (0 ou 1) métricas de Google Maps.*

* **Possui (Lead -> Instagram):** `Lead` **(1) <-> (0..1)** `Metrica_instagram`
  * *Um lead pode ou não possuir (0 ou 1) métricas de Instagram.*

* **Avalia (Maps -> Score):** `Metrica_google_maps` **(1) <-> (0..1)** `Score`
  * *As métricas do Maps são utilizadas para gerar a avaliação do Score.*

* **Avalia (Instagram -> Score):** `Metrica_instagram` **(1) <-> (0..1)** `Score`
  * *As métricas do Instagram são utilizadas para gerar a avaliação do Score.*

---

## 3. Observações de Implementação

1. **Trigger `on_auth_user_created`:** Quando um novo usuário se cadastra via Supabase Auth (`auth.users`), um trigger dispara a função `handle_new_user()`, que insere automaticamente um registro em `public.usuario` vinculado ao plano **Gratuito**.

2. **Entidade `tarefa_fonte`:** Tabela intermediária que implementa o relacionamento N:N entre `Tarefas` e `Fonte`, substituindo o campo `Id_fonte` direto na tabela `Tarefas` (que não existe na implementação real).

3. **Entidade `plano`:** Armazena os planos de assinatura (Gratuito R$0, Básico R$49, Pro R$97) com seus limites. Referenciada por `usuario.id_plano`.

4. **Score - validação cruzada:** A tabela `score` possui uma constraint que garante que a `classificacao` corresponda exatamente à faixa da `pontuacao`: `quente` (71-100), `morno` (41-70), `frio` (0-40).

5. **RLS (Row Level Security):** Todas as tabelas possuem políticas de segurança garantindo que cada usuário veja e manipule apenas seus próprios dados. As políticas utilizam `auth.uid()` e joins para verificar a propriedade através da cadeia `usuario -> tarefas -> lead`.

6. **Erro de digitação:** O relacionamento entre `Tarefas` e `Lead` estava grafado como "Captuira" no diagrama original. Na implementação utiliza-se "Captura".
