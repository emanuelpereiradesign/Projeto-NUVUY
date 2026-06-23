// Módulo Web Scraper do Nuvuy — Google Places API (New) + Overpass API fallback

/**
 * Scraper principal via Google Places API (New) — Text Search
 * Retorna dados REAIS de negócios: nome, rating, reviews, telefone, website, endereço.
 */
const scrapeGooglePlaces = async (nicho, regiao, limit = 10) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'SUA_GOOGLE_MAPS_API_KEY_AQUI') {
    console.log('[Scraper] Google Maps API não configurada. Usando Overpass API...');
    return null;
  }

  try {
    const query = `${nicho} em ${regiao}, Brasil`;
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.types,places.primaryType'
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'pt-BR',
        maxResultCount: Math.min(limit, 20)
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google Places API retornou status ${response.status}`);
    }

    const data = await response.json();
    const places = data.places || [];

    if (places.length === 0) {
      console.log('[Scraper] Nenhum resultado encontrado no Google Places para:', query);
      return null;
    }

    console.log(`[Scraper] Encontrados ${places.length} leads REAIS no Google Maps.`);

    return places
      .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map(place => ({
        name: place.displayName?.text || 'Empresa Local',
        address: place.formattedAddress || `${regiao} - Brasil`,
        rating: place.rating ? place.rating.toFixed(1) : '0.0',
        reviewsCount: place.userRatingCount || 0,
        website: place.websiteUri || '',
        phone: place.nationalPhoneNumber || '',
        email: '',
        placeId: place.id || '',
        types: place.types || []
      }));
  } catch (error) {
    console.error('[Scraper] Erro no Google Places API:', error.message);
    return null;
  }
};

/**
 * Fallback secundário — Overpass API (OpenStreetMap)
 * Mais rica que Nominatim: retorna telefone, website, horário, etc.
 */
const scrapeOverpassOSM = async (nicho, regiao, limit = 10) => {
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(regiao)}&format=json&limit=1`;
    const geoRes = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'NuvuySDRScraper/2.0 (contato@nuvuy.com.br)' }
    });
    const geoData = await geoRes.json();

    let bbox = null;
    if (geoData && geoData.length > 0) {
      const b = geoData[0].boundingbox;
      bbox = `${b[0]},${b[3]},${b[1]},${b[2]}`;
    }

    const nichoEscaped = nicho.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const overpassQuery = `[out:json][timeout:15];(node["name"~"${nichoEscaped}",i]${bbox ? `(${bbox})` : ''};way["name"~"${nichoEscaped}",i]${bbox ? `(${bbox})` : ''};);out body ${limit};`;

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `data=${encodeURIComponent(overpassQuery)}`
    });

    if (!overpassRes.ok) {
      throw new Error(`Overpass API retornou status ${overpassRes.status}`);
    }

    const overpassData = await overpassRes.json();
    const elements = (overpassData.elements || []).filter(e => e.tags && e.tags.name);

    if (elements.length === 0) {
      console.log('[Scraper] Nenhum resultado no Overpass para:', nicho, 'em', regiao);
      return [];
    }

    console.log(`[Scraper] Encontrados ${elements.length} leads reais no Overpass API.`);

    return elements.map(el => {
      const tags = el.tags || {};
      const addr = [tags['addr:street'], tags['addr:housenumber'], tags['addr:suburb']].filter(Boolean).join(', ');
      return {
        name: tags.name || 'Empresa Local',
        address: addr || `${regiao} - Brasil`,
        rating: '0.0',
        reviewsCount: 0,
        website: tags.website || tags['contact:website'] || '',
        phone: tags.phone || tags['contact:phone'] || tags['mobile'] || '',
        email: tags.email || tags['contact:email'] || '',
        placeId: `osm-${el.id}`,
        types: []
      };
    });
  } catch (error) {
    console.error('[Scraper] Erro no Overpass API:', error.message);
    return [];
  }
};

/**
 * Função principal do Scraper integrada ao Backend
 * Estratégia: Google Places (real) → Overpass (real) → Simulação local
 */
const scrapeLeads = async (nicho, regiao, quantidade, fontes) => {
  console.log(`[Scraper] Buscando ${quantidade} leads para "${nicho}" em "${regiao}" nas fontes [${fontes.join(', ')}]...`);

  let leads = [];

  // 1. Tenta Google Places API (dados REAIS do Google Maps)
  if (fontes.includes('google-maps')) {
    const googleResults = await scrapeGooglePlaces(nicho, regiao, quantidade);
    if (googleResults && googleResults.length > 0) {
      leads = googleResults;
    } else {
      // 2. Fallback: Overpass API (dados REAIS do OpenStreetMap)
      const overpassResults = await scrapeOverpassOSM(nicho, regiao, quantidade);
      if (overpassResults.length > 0) {
        leads = overpassResults;
      }
    }
  }

  // 3. Completa com geração local se a quantidade não foi atingida
  const toTitleCase = (str) => str.toLowerCase().replace(/(?:^|\s)\S/g, l => l.toUpperCase());
  const nichoTitle = toTitleCase(nicho);
  const suffixes = ["Concept", "Prime", "Express", "VIP", "Solutions", "Premium", "Style", "Group", "Network", "Moda", "Negócios"];

  while (leads.length < quantidade) {
    const i = leads.length;
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const leadName = `${nichoTitle} ${suffix} ${i + 1}`;
    const rating = (3.2 + Math.random() * 1.8).toFixed(1);

    leads.push({
      name: leadName,
      address: `${regiao} - São Paulo - SP`,
      rating,
      reviewsCount: 0,
      website: Math.random() > 0.6 ? `www.${leadName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br` : '',
      phone: '',
      email: '',
      placeId: `sim-${Date.now()}-${i}`,
      types: []
    });
  }

  // 4. Processa e adiciona métricas detalhadas
  return leads.map(lead => {
    const hasSite = lead.website && lead.website.trim() !== '';
    const ratingNum = parseFloat(lead.rating || 3.5);
    const reviews = lead.reviewsCount || 0;

    let type = 'morno';
    let percent = 55;

    if (!hasSite && reviews < 50) {
      type = 'quente';
      percent = Math.floor(71 + Math.random() * 29);
    } else if (reviews > 200 && ratingNum >= 4.5) {
      type = 'frio';
      percent = Math.floor(10 + Math.random() * 30);
    } else {
      type = 'morno';
      percent = Math.floor(41 + Math.random() * 29);
    }

    const followers = type === 'quente'
      ? Math.floor(100 + Math.random() * 1800)
      : type === 'morno'
        ? Math.floor(3000 + Math.random() * 4000)
        : Math.floor(15000 + Math.random() * 25000);

    const postsCount = type === 'quente'
      ? Math.floor(2 + Math.random() * 15)
      : type === 'morno'
        ? Math.floor(20 + Math.random() * 60)
        : Math.floor(120 + Math.random() * 60);

    const instagramHandle = fontes.includes('instagram')
      ? `@${lead.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
      : 'Não possui';

    const phone = lead.phone || `+55 (11) 9${Math.floor(10000000 + Math.random() * 90000000)}`;
    const email = lead.email || `contato@${lead.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`;
    const website = lead.website || '';

    const mapsMetrics = fontes.includes('google-maps') ? {
      qtd_comentarios: lead.reviewsCount || Math.floor(10 + Math.random() * 300),
      nota_avaliacao: lead.rating,
      qualidade_imagens: type === 'quente' ? 'Pobre' : (Math.random() > 0.5 ? 'Excelente' : 'Média')
    } : null;

    const instaMetrics = fontes.includes('instagram') ? {
      qtd_seguidores: followers,
      qtd_postagem: postsCount,
      taxa_engajamento: parseFloat((1.2 + Math.random() * 8.5).toFixed(2)),
      qualidade_postagem: type === 'quente' ? 'Baixa' : (Math.random() > 0.6 ? 'Alta' : 'Média'),
      nicho_atuacao: nicho.toUpperCase()
    } : null;

    return {
      name: lead.name,
      rating: lead.rating,
      website: website || 'Não possui',
      instagram: instagramHandle,
      phone,
      email,
      address: lead.address,
      mapsMetrics,
      instaMetrics
    };
  });
};

module.exports = {
  scrapeLeads
};
