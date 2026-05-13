// Proxies ESPN's public leaders endpoints (statistical leaders per category).
// Unauthenticated.
// Query params:
//   sport (required) — nfl | nba | mlb | nhl | ncaafb | ncaabb
//   season (optional) — start year of the season

const URLS = {
  nfl:    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/leaders',
  nba:    'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/leaders',
  mlb:    'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/leaders',
  nhl:    'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/leaders',
  ncaafb: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/leaders',
  ncaabb: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/leaders',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport = 'nfl', season } = req.query;
  const baseUrl = URLS[sport];
  if (!baseUrl) return res.status(400).json({ error: 'Unsupported sport' });

  const url = season ? `${baseUrl}?season=${season}` : baseUrl;
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=7200');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
