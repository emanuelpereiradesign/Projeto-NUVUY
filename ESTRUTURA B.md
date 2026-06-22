# Estrutura do Banco de Dados (Modelo ER)

## 1. Entidades e Atributos

*(Nota: Assumi os campos `ID` como Chaves Primárias (PK) e os campos com prefixo `Id_` como Chaves Estrangeiras (FK), conforme o padrão visual e de nomenclatura do diagrama).*

### 🧑‍💻 `usuário`
* **ID** *(PK)*
* Nome
* Email
* Data_cadastro
* Plano
* Créditos

### 📋 `Tarefas`
* **ID** *(PK)*
* Id_usuario *(FK - ref: usuário)*
* Id_fonte *(FK - ref: Fonte)*
* Data
* Termo_busca
* Local
* Status

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
* id_lead *(FK - ref: Lead)*
* Qtd_comentarios
* Nota_avaliacao
* Qualidade_imagens

### 📸 `Metrica_instagram`
*(Nota: Os atributos Qualidade_postagem, ID_lead e Nicho_atuacao foram extraídos da Página 2, pois as linhas de conexão indicam que pertencem a esta entidade).*
* **ID** *(PK)*
* ID_lead *(FK - ref: Lead)*
* Qtd_seguidores
* Qtd_postagem
* Taxa_engajamento
* Qualidade_postagem
* Nicho_atuacao

### 📊 `Score`
* **ID** *(PK)*
* Id_lead *(FK - ref: Lead)*
* Id_mtc_instagram *(FK - ref: Metrica_instagram)*
* Id_mtc_mps *(FK - ref: Metrica_google_maps)*
* Data_analise
* Pontuacao
* Classificacao
* Justificativa_IA

---

## 2. Relacionamentos

Abaixo estão as relações entre as entidades e suas respectivas cardinalidades (conforme indicado pelos números `1`, `N`, `0` nos losangos do diagrama):

* **Cria:** `usuário` **(1) <-> (N)** `Tarefas`
  * *Um usuário pode criar várias tarefas.*

* **Utiliza:** `Tarefas` **(N) <-> (N)** `Fonte`
  * *Várias tarefas podem utilizar várias fontes (Relação de Muitos-para-Muitos).*

* **Captura:** *(escrito como "Captuira" no diagrama)* `Tarefas` **(1) <-> (N)** `Lead`
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
## ⚠️ Observações de Implementação
1. **Erro de digitação:** O relacionamento entre `Tarefas` e `Lead` está grafado como "Captuira". Recomenda-se corrigir para "Captura" na implementação.
2. **Entidade Score:** O `Score` centraliza as chaves estrangeiras (`Id_mtc_instagram`, `Id_mtc_mps`, `Id_lead`), alinhando-se corretamente aos relacionamentos "Avalia" e "Possui".
3. **Tabela Intermediária (N:N):** A relação entre `Tarefas` e `Fonte` é `N:N` (Muitos para Muitos). Na conversão para o banco de dados físico (SQL), será necessária a criação de uma tabela intermediária (ex: `Tarefa_Fonte`).