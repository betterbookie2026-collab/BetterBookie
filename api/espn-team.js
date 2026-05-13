// Aggregates ESPN's per-team endpoints (info, schedule, roster) into one
// response so the team detail page can render with a single round-trip.
// Unauthenticated public API.
//
// Query params:
//   sport (required) — nfl | nba | mlb | nhl | ncaafb | ncaabb
//   id    (required) — ESPN team ID

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

  const { sport, id, season } = req.query;
  const cfg = SPORT_CFG[sport];
  if (!cfg) return res.status(400).json({ error: 'Unsupported sport' });
  if (!id) return res.status(400).json({ error: 'id required' });

  const base = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/teams/${encodeURIComponent(id)}`;
  const scheduleUrl = season ? `${base}/schedule?season=${encodeURIComponent(season)}` : `${base}/schedule`;
  const [info, schedule, roster] = await Promise.all([
    jsonOrNull(base),
    jsonOrNull(scheduleUrl),
    jsonOrNull(`${base}/roster`),
  ]);

  if (!info && !schedule && !roster) {
    return res.status(502).json({ error: 'Team data unavailable from ESPN' });
  }

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.status(200).json({ info, schedule, roster });
}
