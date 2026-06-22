// Motor de inteligência SDR do Nuvuy via OpenRouter LLM

/**
 * Avalia e qualifica um lead utilizando a API do OpenRouter.
 * Caso a API não esteja configurada ou ocorra uma falha, utiliza o fallback simulado.
 * 
 * @param {Object} leadData - Dados do lead para análise.
 * @returns {Promise<Object>} Resultado da qualificação { pontuacao, classificacao, justificativa_ia }
 */
const evaluateLeadWithAI = async (leadData) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

  if (!apiKey || apiKey === 'SEU_OPENROUTER_API_KEY_AQUI') {
    console.log('[AI] OpenRouter não configurado. Utilizando classificação simulada.');
    return getSimulatedEvaluation(leadData);
  }

  const prompt = `Você é o cérebro e motor de inteligência artificial SDR do Nuvuy, uma plataforma de prospecção digital para prestadores de serviços de tecnologia (desenvolvedores, designers, marketing digital).
Analise as informações do possível lead/empresa coletadas pelo web scraper descritas abaixo e gere a qualificação de vendas, análise detalhada dos canais e a sugestão de abordagem.

DADOS DE ENTRADA DO LEAD (WEB SCRAPER):
- Nome do Lead: ${leadData.name}
- Nicho/Categoria: ${leadData.category}
- Localidade (Google Maps): ${leadData.location}
- Avaliação (Google Maps): ${leadData.rating || '0.0'} estrelas (com ${leadData.reviewsCount || 0} avaliações/comentários)
- Qualidade das Imagens no Maps: ${leadData.imagesQuality || 'Média'}
- Link do Site: ${leadData.website || 'Não possui'}
- Instagram do Lead: ${leadData.instagram || 'Não possui'}
- Métricas do Instagram (se houver): ${leadData.followers || 0} seguidores, ${leadData.postsCount || 0} postagens, seguindo ${leadData.following || 0} contas, taxa de engajamento: ${leadData.engagementRate || 0}%
- Qualidade das Postagens no Instagram: ${leadData.postsQuality || 'Média'}

CRITÉRIOS DE AVALIAÇÃO DA IA:
1. Google Maps: Analise a localidade da empresa no maps, a qualidade das imagens se houver, avaliações, comentários positivos e negativos. Verifique a presença de site e contatos (telefone, e-mail, WhatsApp, Instagram).
   - REGRA CRÍTICA DO SITE: Se o lead não possui site (Link do Site é nulo, vazio ou explicitamente 'Não possui'), gere o rótulo "não possui site" para ser entregue no card do dashboard, e destaque essa falha crítica na abordagem.
2. Instagram: Analise o nome do perfil do lead, quantidade de seguidores, postagens, contas que segue, curtidas e comentários nas postagens, qualidade das fotos, coerência temática com o nicho do negócio, e o tipo de impacto (bom ou ruim) das publicações no perfil.
3. Classificação de Temperatura (Alinhamento obrigatório com o Score e chance de fechamento):
   - LEAD FRIO (Pontuação: 0 a 40 / Chance de fechamento: 0% a 40%): Possui posicionamento digital muito bem estruturado, avaliações muito boas no Maps, e perfil no Instagram consolidado (acima de 15.000 seguidores e em média 150 posts). Baixa probabilidade de fechar serviços rápidos, necessitando de melhorias pontuais avançadas.
   - LEAD MORNO (Pontuação: 41 a 70 / Chance de fechamento: 41% a 70%): Presença digital mediana, em estruturação lenta (poucos seguidores, média de 3.000 a 7.000 seguidores), avaliações no Maps crescendo devagar. Abordagem focada em otimizar e melhorar o que já está funcionando.
   - LEAD QUENTE (Pontuação: 71 a 100 / Chance de fechamento: 71% a 100%): Presença digital quase nula (começando do absoluto zero), sem material gráfico, sem identidade visual, sem posicionamento e Instagram abaixo de 2.000 seguidores (e sem site). Alta chance de fechamento para pacotes completos de design, landing pages e tráfego.

INSTRUÇÕES DE RETORNO DO JSON:
- 'pontuacao': Número inteiro alinhado com a classificação (Frio: 0-40, Morno: 41-70, Quente: 71-100).
- 'classificacao': Texto exato 'quente', 'morno' ou 'frio'.
- 'justificativa_ia': Deve ser obrigatoriamente um sub-objeto JSON contendo:
  * 'justificativa': Explicação técnica e profissional da nota de classificação (2 a 3 frases).
  * 'abordagem': Um roteiro/esquema comercial de abordagem de prospecção direcionado ao lead com base nas dores identificadas.
  * 'maps_comentarios_positivos': Resumo dos pontos fortes citados nos comentários do Maps.
  * 'maps_comentarios_negativos': Resumo dos pontos fracos/reclamações citadas no Maps.
  * 'maps_whatsapp': Telefone de contato/WhatsApp identificado para prospecção direta (ou "N/A" se não identificado).
  * 'insta_coerencia_nicho': Avaliação se o conteúdo do Instagram é coerente com o nicho (Ex: "Alta", "Média", "Baixa").
  * 'insta_qualidade_imagens': Nota crítica sobre a qualidade visual das publicações (Ex: "Imagens escuras", "Profissional", "Material amador").
  * 'insta_impacto_postagem': Se o impacto geral do perfil é positivo ou negativo (Ex: "Bom (impacto positivo)", "Ruim (baixo engajamento)").

Responda EXCLUSIVAMENTE em formato JSON puro, sem marcações markdown extra ou blocos de código (não use \`\`\`json). O JSON deve conter a seguinte estrutura:
{
  "pontuacao": 85,
  "classificacao": "quente",
  "justificativa_ia": {
    "justificativa": "...",
    "abordagem": "...",
    "maps_comentarios_positivos": "...",
    "maps_comentarios_negativos": "...",
    "maps_whatsapp": "...",
    "insta_coerencia_nicho": "...",
    "insta_qualidade_imagens": "...",
    "insta_impacto_postagem": "..."
  }
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Nuvuy',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Erro na requisição ao OpenRouter');
    }

    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Retorno vazio do OpenRouter');

    // Tenta limpar possíveis marcações de código markdown do JSON
    const cleanJsonStr = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const evaluation = JSON.parse(cleanJsonStr);

    // Valida e força os limites rígidos em caso de desalinhamento do LLM
    let pontuacao = parseInt(evaluation.pontuacao) || 50;
    let classificacao = (evaluation.classificacao || 'morno').toLowerCase();
    if (!['quente', 'morno', 'frio'].includes(classificacao)) {
      classificacao = 'morno';
    }

    if (classificacao === 'quente' && (pontuacao < 71 || pontuacao > 100)) {
      pontuacao = 85;
    } else if (classificacao === 'morno' && (pontuacao < 41 || pontuacao > 70)) {
      pontuacao = 55;
    } else if (classificacao === 'frio' && (pontuacao < 0 || pontuacao > 40)) {
      pontuacao = 25;
    }

    let justificativa_ia_str = '';
    if (evaluation.justificativa_ia) {
      if (typeof evaluation.justificativa_ia === 'object') {
        justificativa_ia_str = JSON.stringify(evaluation.justificativa_ia);
      } else {
        justificativa_ia_str = JSON.stringify({
          justificativa: evaluation.justificativa_ia,
          abordagem: '',
          maps_comentarios_positivos: 'N/A',
          maps_comentarios_negativos: 'N/A',
          maps_whatsapp: leadData.phone || 'N/A',
          insta_coerencia_nicho: 'Média',
          insta_qualidade_imagens: 'Média',
          insta_impacto_postagem: 'Neutro'
        });
      }
    } else {
      justificativa_ia_str = JSON.stringify({
        justificativa: `Análise realizada para o lead ${leadData.name}.`,
        abordagem: '',
        maps_comentarios_positivos: 'N/A',
        maps_comentarios_negativos: 'N/A',
        maps_whatsapp: leadData.phone || 'N/A',
        insta_coerencia_nicho: 'Média',
        insta_qualidade_imagens: 'Média',
        insta_impacto_postagem: 'Neutro'
      });
    }

    return {
      pontuacao,
      classificacao,
      justificativa_ia: justificativa_ia_str
    };
  } catch (error) {
    console.error('[AI] Erro ao qualificar com OpenRouter. Usando fallback:', error.message);
    return getSimulatedEvaluation(leadData);
  }
};

/**
 * Fallback de avaliação simulada com os novos critérios estruturados
 */
const getSimulatedEvaluation = (leadData) => {
  const rating = parseFloat(leadData.rating || 3.5);
  const followers = parseInt(leadData.followers || 0);
  const postsCount = parseInt(leadData.postsCount || 0);
  const hasSite = leadData.website && leadData.website !== 'Não possui' && leadData.website.trim() !== '';

  let type = 'morno';
  let percent = 55;

  // Lógica de classificação rígida baseada nas métricas informadas pelo scraper
  if (!hasSite && followers < 2000) {
    type = 'quente';
    percent = Math.floor(71 + Math.random() * 29); // 71% - 100%
  } else if (followers > 15000 && postsCount >= 100 && rating >= 4.5) {
    type = 'frio';
    percent = Math.floor(10 + Math.random() * 30); // 10% - 40%
  } else {
    type = 'morno';
    percent = Math.floor(41 + Math.random() * 29); // 41% - 70%
  }

  const simulatedData = {
    justificativa: `[SIMULADO] O lead ${leadData.name} foi classificado como ${type.toUpperCase()} devido ao seu posicionamento digital com ${followers ? followers + ' seguidores no Instagram' : 'presença digital nula'} e nota de ${rating} no Google Maps.`,
    abordagem: type === 'quente' 
      ? `Olá Emanuel da Nuvuy aqui! Percebi que a ${leadData.name} não possui um site próprio e tem menos de 2mil seguidores. Podemos criar uma identidade visual forte e um site profissional para dobrar suas conversões locais. Aceita um bate-papo de 5 minutos?` 
      : (type === 'morno' 
        ? `Olá! Acompanhamos a ${leadData.name} no Maps e Instagram. Identificamos pontos de melhoria na velocidade de resposta e anúncios para impulsionar seus posts atuais. Gostaria de receber um roteiro gratuito?`
        : `Olá! Seu posicionamento digital com mais de 15k seguidores é muito bom. Podemos te ajudar com automações avançadas de atendimento de leads e funil de vendas integrado.`),
    maps_comentarios_positivos: rating >= 4.2 ? "Bom atendimento, produtos de alta qualidade e localização acessível." : "Espaço agradável.",
    maps_comentarios_negativos: rating < 4.0 ? "Demora no atendimento e falta de resposta nas redes sociais." : "Preço um pouco elevado comparado aos concorrentes.",
    maps_whatsapp: leadData.phone || `+55 (11) 9${Math.floor(10000000 + Math.random() * 90000000)}`,
    insta_coerencia_nicho: followers < 2000 ? "Baixa (conteúdo desalinhado)" : (followers < 10000 ? "Média" : "Alta"),
    insta_qualidade_imagens: followers < 2000 ? "Material amador e sem paleta de cores" : "Profissional e bem produzidas",
    insta_impacto_postagem: followers < 2000 ? "Ruim (baixo engajamento)" : "Bom (impacto positivo)"
  };

  return {
    pontuacao: percent,
    classificacao: type,
    justificativa_ia: JSON.stringify(simulatedData)
  };
};

module.exports = {
  evaluateLeadWithAI
};
