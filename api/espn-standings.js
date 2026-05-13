// Proxies ESPN's public standings endpoints. Unauthenticated.
// Query params:
//   sport (required) — nfl | nba | mlb | nhl | ncaafb | ncaabb
//   season (optional) — start year of the season; if omitted, ESPN returns the current/most-recent season

const URLS = {
  nfl:    'https://site.web.api.espn.com/apis/v2/sports/football/nfl/standings',
  nba:    'https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings',
  mlb:    'https://site.web.api.espn.com/apis/v2/sports/baseball/mlb/standings',
  nhl:    'https://site.web.api.espn.com/apis/v2/sports/hockey/nhl/standings',
  ncaafb: 'https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings',
  ncaabb: 'https://site.web.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport = 'nfl', season, group } = req.query;
  const baseUrl = URLS[sport];
  if (!baseUrl) return res.status(400).json({ error: 'Unsupported sport' });

  const params = new URLSearchParams();
  if (season) params.append('season', season);
  if (group)  params.append('group', group); // NCAA: 80 = FBS, 50 = D1 basketball
  const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
