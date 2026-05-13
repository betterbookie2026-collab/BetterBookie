// Proxies ESPN's public news endpoints. Unauthenticated.
// Query params:
//   sport (required) — nfl | nba | mlb | nhl | ncaafb | ncaabb
//   limit (optional, default 20)

const URLS = {
  nfl:    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news',
  nba:    'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news',
  mlb:    'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news',
  nhl:    'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news',
  ncaafb: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/news',
  ncaabb: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/news',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport = 'nfl', limit = '20' } = req.query;
  const baseUrl = URLS[sport];
  if (!baseUrl) return res.status(400).json({ error: 'Unsupported sport' });

  const url = `${baseUrl}?limit=${encodeURIComponent(limit)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
