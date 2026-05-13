// Returns a flat, search-ready index of every team across all six sports,
// pulled from ESPN's public team list endpoints. Each entry has the ESPN
// team ID, so consumers can deep-link to team.html?sport=X&id=Y.
// Heavily CDN-cached: teams change rarely.

const SOURCES = [
  { sport: 'nfl',    url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=50' },
  { sport: 'nba',    url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=50' },
  { sport: 'mlb',    url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams?limit=50' },
  { sport: 'nhl',    url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams?limit=50' },
  { sport: 'ncaafb', url: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=400' },
  { sport: 'ncaabb', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=400' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const allLists = await Promise.all(SOURCES.map(async src => {
      try {
        const r = await fetch(src.url);
        if (!r.ok) return [];
        const data = await r.json();
        const raw = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];
        return raw.map(entry => {
          const t = entry.team ?? entry;
          return {
            sport: src.sport,
            id: t.id,
            name: t.displayName ?? t.name ?? t.location ?? null,
            short: t.shortDisplayName ?? t.nickname ?? null,
            abbreviation: t.abbreviation ?? null,
            logo: t.logos?.[0]?.href ?? null,
          };
        }).filter(t => t.id && t.name);
      } catch { return []; }
    }));
    const teams = allLists.flat();

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
