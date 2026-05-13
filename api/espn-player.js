// Aggregates ESPN's per-athlete endpoints (overview + gamelog) for the
// player profile page.
//
// Query params:
//   sport (required) — nfl | nba | mlb | nhl | ncaafb | ncaabb
//   id    (required) — ESPN athlete ID

const SPORT_CFG = {
  nfl:    { sport: 'football',   league: 'nfl' },
  nba:    { sport: 'basketball', league: 'nba' },
  mlb:    { sport: 'baseball',   league: 'mlb' },
  nhl:    { sport: 'hockey',     league: 'nhl' },
  ncaafb: { sport: 'football',   league: 'college-football' },
  ncaabb: { sport: 'basketball', league: 'mens-college-basketball' },
};

async function jsonOrNull(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport, id } = req.query;
  const cfg = SPORT_CFG[sport];
  if (!cfg) return res.status(400).json({ error: 'Unsupported sport' });
  if (!id) return res.status(400).json({ error: 'id required' });

  const base = `https://site.web.api.espn.com/apis/common/v3/sports/${cfg.sport}/${cfg.league}/athletes/${encodeURIComponent(id)}`;
  const [overview, gamelog] = await Promise.all([
    jsonOrNull(`${base}/overview`),
    jsonOrNull(`${base}/gamelog`),
  ]);

  if (!overview && !gamelog) {
    return res.status(502).json({ error: 'Player data unavailable from ESPN' });
  }

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.status(200).json({ overview, gamelog });
}
