// Returns the team list for a given sport, used by matchups.html to populate
// the two team-picker dropdowns. Proxies api-sports.io /teams endpoints.
//
// Query params:
//   sport (required) — nfl | nba | mlb | nhl
//
// Response: { teams: [{ id, name, code? }, ...] }

// Pro sports use api-sports.io; college sports use ESPN's unauthenticated teams endpoint.
const PRO_HOSTS = {
  nfl: { url: 'https://v1.american-football.api-sports.io/teams', leagueParam: 'league=1&season=2024' },
  nba: { url: 'https://v2.nba.api-sports.io/teams',                leagueParam: 'league=standard&season=2024' },
  mlb: { url: 'https://v1.baseball.api-sports.io/teams',           leagueParam: 'league=1&season=2024' },
  nhl: { url: 'https://v1.hockey.api-sports.io/teams',             leagueParam: 'league=57&season=2024' },
};
const COLLEGE_HOSTS = {
  ncaafb: { sport: 'football',   league: 'college-football' },
  ncaabb: { sport: 'basketball', league: 'mens-college-basketball' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport } = req.query;
  if (PRO_HOSTS[sport]) return loadProTeams(sport, res);
  if (COLLEGE_HOSTS[sport]) return loadCollegeTeams(sport, res);
  return res.status(400).json({ error: 'Unsupported sport. Use nfl, nba, mlb, nhl, ncaafb, or ncaabb.' });
}

async function loadProTeams(sport, res) {
  const cfg = PRO_HOSTS[sport];
  try {
    const r = await fetch(`${cfg.url}?${cfg.leagueParam}`, {
      headers: { 'x-apisports-key': process.env.APISPORTS_KEY },
    });
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
    const data = await r.json();
    const teams = (data?.response ?? []).map(t => ({
      id: t.id,
      name: t.name,
      code: t.code ?? t.abbreviation ?? null,
      logo: t.logo ?? null,
    })).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function loadCollegeTeams(sport, res) {
  const cfg = COLLEGE_HOSTS[sport];
  const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/teams?limit=400`;
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
    const data = await r.json();
    const raw = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];
    const teams = raw.map(entry => ({
      id: entry.team?.id,
      name: entry.team?.displayName ?? entry.team?.name ?? entry.team?.location,
      code: entry.team?.abbreviation ?? null,
      logo: entry.team?.logos?.[0]?.href ?? null,
    })).filter(t => t.id && t.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
