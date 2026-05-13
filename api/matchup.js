// Returns historical games between two teams (head-to-head) for a given sport.
// Proxies api-sports.io /games?h2h=A-B endpoints. The frontend computes record,
// streaks, averages, biggest wins, etc. from the returned games list.
//
// Query params:
//   sport (required) — nfl | nba | mlb | nhl
//   team1 (required) — api-sports team ID
//   team2 (required) — api-sports team ID
//
// Response: { games: [{ id, date, season, home: {id, name, score}, away: {id, name, score}, status }, ...] }

const PRO_HOSTS = {
  nfl: { base: 'https://v1.american-football.api-sports.io', league: '1' },
  nba: { base: 'https://v2.nba.api-sports.io',                league: 'standard' },
  mlb: { base: 'https://v1.baseball.api-sports.io',           league: '1' },
  nhl: { base: 'https://v1.hockey.api-sports.io',             league: '57' },
};
const COLLEGE_HOSTS = {
  ncaafb: { sport: 'football',   league: 'college-football',          yearsBack: 15 },
  ncaabb: { sport: 'basketball', league: 'mens-college-basketball',   yearsBack: 15 },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport, team1, team2 } = req.query;
  if (!team1 || !team2) return res.status(400).json({ error: 'team1 and team2 (team IDs) required' });

  if (PRO_HOSTS[sport]) return loadProMatchup(sport, team1, team2, res);
  if (COLLEGE_HOSTS[sport]) return loadCollegeMatchup(sport, team1, team2, res);
  return res.status(400).json({ error: 'Unsupported sport.' });
}

async function loadProMatchup(sport, team1, team2, res) {
  const cfg = PRO_HOSTS[sport];
  const url = `${cfg.base}/games?h2h=${team1}-${team2}&league=${cfg.league}`;
  try {
    const r = await fetch(url, {
      headers: { 'x-apisports-key': process.env.APISPORTS_KEY },
    });
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
    const data = await r.json();
    const games = (data?.response ?? []).map(g => normalize(g, sport));
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ games });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ESPN doesn't expose a head-to-head endpoint for college sports, so we walk each
// season's team schedule and keep games where the opponent matches team2.
async function loadCollegeMatchup(sport, team1, team2, res) {
  const cfg = COLLEGE_HOSTS[sport];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: cfg.yearsBack + 1 }, (_, i) => currentYear - i);

  try {
    const perYear = await Promise.all(years.map(async year => {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/teams/${team1}/schedule?season=${year}`;
      try {
        const r = await fetch(url);
        if (!r.ok) return [];
        const data = await r.json();
        return data?.events ?? [];
      } catch { return []; }
    }));

    const games = [];
    const t2Id = String(team2);
    for (const events of perYear) {
      for (const ev of events) {
        const comp = ev.competitions?.[0];
        const competitors = comp?.competitors ?? [];
        const opponent = competitors.find(c => String(c.id) === t2Id);
        if (!opponent) continue;
        const completed = comp?.status?.type?.completed === true;
        const home = competitors.find(c => c.homeAway === 'home') ?? competitors[0];
        const away = competitors.find(c => c.homeAway === 'away') ?? competitors[1];
        games.push({
          id: ev.id ?? null,
          date: ev.date ?? null,
          season: ev.season?.year ?? null,
          status: comp?.status?.type?.name ?? null,
          completed,
          home: {
            id: home?.id ?? null,
            name: home?.team?.displayName ?? home?.team?.name ?? null,
            score: home?.score != null ? Number(home.score) : null,
          },
          away: {
            id: away?.id ?? null,
            name: away?.team?.displayName ?? away?.team?.name ?? null,
            score: away?.score != null ? Number(away.score) : null,
          },
        });
      }
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ games, coverageYears: cfg.yearsBack + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Normalize the per-sport response shape into a consistent game record.
function normalize(g, sport) {
  if (sport === 'nfl') {
    const homeScore = g.scores?.home?.total ?? null;
    const awayScore = g.scores?.away?.total ?? null;
    return {
      id: g.game?.id ?? null,
      date: g.game?.date?.date ?? null,
      season: g.league?.season ?? null,
      status: g.game?.status?.short ?? null,
      completed: homeScore != null && awayScore != null,
      home: { id: g.teams?.home?.id ?? null, name: g.teams?.home?.name ?? null, score: homeScore },
      away: { id: g.teams?.away?.id ?? null, name: g.teams?.away?.name ?? null, score: awayScore },
    };
  }
  // NBA / MLB / NHL share a flatter shape.
  const homeScore = g.scores?.home?.total ?? g.scores?.home ?? null;
  const awayScore = g.scores?.away?.total ?? g.scores?.away ?? null;
  return {
    id: g.id ?? null,
    date: g.date ?? null,
    season: g.season ?? null,
    status: g.status?.short ?? g.status?.long ?? null,
    completed: homeScore != null && awayScore != null,
    home: { id: g.teams?.home?.id ?? null, name: g.teams?.home?.name ?? null, score: homeScore },
    away: { id: g.teams?.away?.id ?? null, name: g.teams?.away?.name ?? null, score: awayScore },
  };
}
