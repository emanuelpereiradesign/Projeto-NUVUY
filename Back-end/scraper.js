const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const now = () => new Date().toLocaleTimeString('pt-BR');

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

const buscarEstabelecimentosGoogle = async (nicho, cidade, quantidade) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'SUA_GOOGLE_MAPS_API_KEY_AQUI') {
    throw new Error('Google Maps API key nao configurada no .env');
  }

  const query = `${nicho} em ${cidade}, Brasil`;
  const allPlaces = [];

  let nextPageToken = null;
  while (allPlaces.length < quantidade) {
    let url = `${GOOGLE_PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&key=${apiKey}`;
    if (nextPageToken) {
      await sleep(2000);
      url = `${GOOGLE_PLACES_BASE}/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'REQUEST_DENIED') {
      throw new Error(`Google Places: ${data.error_message || 'Acesso negado — verifique se a Places API esta ativada no Google Cloud'}`);
    }
    if (data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('Google Places: cota excedida — aguarde ou aumente o limite');
    }
    if (data.status === 'INVALID_REQUEST') {
      throw new Error(`Google Places: requisicao invalida — ${data.error_message || ''}`);
    }
    if (data.status === 'ZERO_RESULTS') {
      break;
    }
    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status} — ${data.error_message || ''}`);
    }

    allPlaces.push(...(data.results || []));
    nextPageToken = data.next_page_token;

    if (!nextPageToken) break;
  }

  const limited = allPlaces.slice(0, quantidade);
  const results = [];

  for (const place of limited) {
    let phone = '';
    let website = '';

    try {
      const detailUrl = `${GOOGLE_PLACES_BASE}/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website&language=pt-BR&key=${apiKey}`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();
      if (detailData.status === 'OK' && detailData.result) {
        phone = detailData.result.formatted_phone_number || '';
        website = detailData.result.website || '';
      }
    } catch (err) {
      console.warn(`[${now()}] [Scraper] Erro detalhes "${place.name}": ${err.message}`);
    }

    results.push({
      name: place.name,
      rating: place.rating || null,
      website: website || 'Não possui',
      instagram: '',
      phone: phone || '',
      email: '',
      address: place.formatted_address || cidade,
      mapsMetrics: {
        qtd_comentarios: place.user_ratings_total || null,
        nota_avaliacao: place.rating || null,
        qualidade_imagens: null
      },
      instaMetrics: null
    });
  }

  console.log(`[${now()}] [Scraper] ${results.length} leads reais do Google Places para "${nicho}" em "${cidade}"`);
  return results;
};

const scrapeLeads = async (nicho, regiao, quantidade, fontes) => {
  console.log(`[${now()}] [Scraper] Captando ${quantidade} leads para "${nicho}" em "${regiao}"`);

  const cidade = regiao.replace(/\s*\/\s*[A-Z]{2}$/i, '').trim();
  let leads = [];

  try {
    leads = await buscarEstabelecimentosGoogle(nicho, cidade, quantidade);
  } catch (err) {
    console.warn(`[${now()}] [Scraper] Erro: ${err.message}`);
  }

  return leads.slice(0, quantidade);
};

module.exports = { scrapeLeads };
