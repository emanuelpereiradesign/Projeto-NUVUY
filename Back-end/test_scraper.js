require('dotenv').config();
const { scrapeLeads } = require('./scraper.js');

(async () => {
  console.time('scrape');
  const leads = await scrapeLeads('padaria', 'Imperatriz', 5, ['google-maps']);
  console.timeEnd('scrape');

  console.log(`\n=== LEADS (${leads.length}) ===`);
  leads.forEach((l, i) => {
    console.log(`${i + 1}. ${l.name}`);
    if (l.phone) console.log('   Tel: ' + l.phone);
    if (l.website && l.website !== 'Não possui') console.log('   Site: ' + l.website);
    if (l.email) console.log('   Email: ' + l.email);
    console.log('   End: ' + l.address);
  });

  if (leads.length === 0) console.log('Nenhum lead encontrado');
})();
