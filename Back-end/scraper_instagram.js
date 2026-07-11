const now = () => new Date().toLocaleTimeString('pt-BR');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Busca perfil do Instagram usando Google Custom Search API
 * Requer GOOGLE_CX (ID do mecanismo de busca) e GOOGLE_API_KEY no .env
 */
const buscarInstagramPorNome = async (nomeEmpresa, cidade) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;

  if (!apiKey || !cx || apiKey === 'SUA_GOOGLE_API_KEY_AQUI' || cx === 'SEU_GOOGLE_CX_AQUI') {
    console.log(`[${now()}] [Instagram] Google Custom Search não configurado. Pule instagram.`);
    return null;
  }

  const query = `site:instagram.com ${nomeEmpresa} ${cidade}`;
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=3`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      console.log(`[${now()}] [Instagram] Nenhum resultado para "${nomeEmpresa}"`);
      return null;
    }

    // Filtra apenas links do instagram.com (exclui stories, reels, etc.)
    const instagramLinks = data.items
      .map(item => item.link)
      .filter(link => {
        try {
          const u = new URL(link);
          return u.hostname === 'www.instagram.com' || u.hostname === 'instagram.com';
        } catch { return false; }
      })
      .filter(link => {
        const path = link.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
        // Ignora links que não são perfis (explore, reels, stories, etc.)
        return path && !path.includes('/') && !path.startsWith('?');
      });

    if (instagramLinks.length === 0) return null;

    const profileUrl = instagramLinks[0];
    const username = profileUrl.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
    console.log(`[${now()}] [Instagram] Perfil encontrado para "${nomeEmpresa}": @${username}`);

    return username;
  } catch (err) {
    console.warn(`[${now()}] [Instagram] Erro na busca de "${nomeEmpresa}": ${err.message}`);
    return null;
  }
};

/**
 * Tenta obter métricas públicas do perfil Instagram
 * Usa a rota pública que retorna dados básicos (pode ser bloqueada pelo Instagram)
 */
const buscarMetricasInstagram = async (username) => {
  if (!username) return null;

  try {
    // Tenta acessar a página pública e extrair dados do script JSON-LD
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!res.ok) {
      console.log(`[${now()}] [Instagram] Perfil @${username} retornou status ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Tenta extrair dados do JSON-LD (schema.org)
    let seguidores = null;
    let postagens = null;

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.mainEntityofPage || jsonLd.mainEntity) {
          const entity = jsonLd.mainEntityofPage || jsonLd.mainEntity;
          seguidores = entity?.interactionStatistic?.find(s => s.name === 'followers')?.userInteractionCount || null;
          postagens = entity?.interactionStatistic?.find(s => s.name === 'posts')?.userInteractionCount || null;
        }
      } catch { /* fallback */ }
    }

    // Tenta extrair do window.__INITIAL_STATE__
    if (!seguidores) {
      const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
      if (stateMatch) {
        try {
          const state = JSON.parse(stateMatch[1]);
          const profile = Object.values(state?.items?.__typename ? {} : (state?.user || {}))[0];
          if (profile) {
            seguidores = profile.follower_count || profile.edge_followed_by?.count || null;
            postagens = profile.edge_owner_to_timeline_media?.count || profile.media_count || null;
          }
        } catch { /* fallback */ }
      }
    }

    return {
      username,
      seguidores,
      postagens
    };
  } catch (err) {
    console.warn(`[${now()}] [Instagram] Erro ao buscar métricas de @${username}: ${err.message}`);
    return null;
  }
};

module.exports = {
  buscarInstagramPorNome,
  buscarMetricasInstagram
};
