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

// ESPN's score field is sometimes a number string, sometimes an object like
// { value: 27, displayValue: '27' }. Normalize to a plain number (or null).
function extractScore(s) {
  if (s == null) return null;
  if (typeof s === 'number') return s;
  if (typeof s === 'string') {
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof s === 'object') {
    if (typeof s.value === 'number') return s.value;
    const raw = s.value ?? s.displayValue;
    const n = raw != null ? Number(raw) : NaN;
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// Walks back in time chunk-by-chunk fetching seasons in parallel within each
// chunk; stops as soon as a full chunk returns zero games. This lets us claim
// "100 seasons back" without burning API quota on years that have no data.
async function fetchSeasonsUntilEmpty(fetchOneSeason, currentYear, maxYearsBack = 100, chunkSize = 5) {
  const allGames = [];
  for (let offset = 0; offset < maxYearsBack; offset += chunkSize) {
    const seasons = Array.from({ length: chunkSize }, (_, j) => currentYear - offset - j)
      .filter(y => y > currentYear - maxYearsBack);
    if (!seasons.length) break;
    const chunks = await Promise.all(seasons.map(fetchOneSeason));
    const chunkGames = chunks.flat();
    allGames.push(...chunkGames);
    if (chunkGames.length === 0) break;
  }
  return allGames;
}

async function loadProMatchup(sport, team1, team2, res) {
  const cfg = PRO_HOSTS[sport];
  const currentYear = new Date().getFullYear();
  const fetchSeason = (year) => {
    const url = `${cfg.base}/games?h2h=${team1}-${team2}&league=${cfg.league}&season=${year}`;
    return fetch(url, { headers: { 'x-apisports-key': process.env.APISPORTS_KEY } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.response ?? [])
      .catch(() => []);
  };
  try {
    const raw = await fetchSeasonsUntilEmpty(fetchSeason, currentYear, 100, 5);
    const games = raw.map(g => normalize(g, sport));
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ games });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ESPN doesn't expose a head-to-head endpoint for college sports, so we walk
// each season's team schedule. Like the pro path, we walk back in chunks and
// stop once a chunk returns zero events for team1 — that signals ESPN doesn't
// have schedule data that far back for this team.
async function loadCollegeMatchup(sport, team1, team2, res) {
  const cfg = COLLEGE_HOSTS[sport];
  const currentYear = new Date().getFullYear();
  const t2Id = String(team2);

  const fetchSeason = async (year) => {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/teams/${team1}/schedule?season=${year}`;
    try {
      const r = await fetch(url);
      if (!r.ok) return null; // null distinguishes "no schedule for this year" from "team1 played 0 games vs team2"
      const data = await r.json();
      return data?.events ?? [];
    } catch { return null; }
  };

  try {
    const allEvents = [];
    const chunkSize = 5;
    const maxYearsBack = 100;
    let consecutiveEmptyChunks = 0;
    for (let offset = 0; offset < maxYearsBack; offset += chunkSize) {
      const seasons = Array.from({ length: chunkSize }, (_, j) => currentYear - offset - j);
      const chunks = await Promise.all(seasons.map(fetchSeason));
      // If every season in the chunk returned null (404 / no schedule data),
      // we've walked past ESPN's coverage for this team — stop.
      const allNull = chunks.every(c => c === null);
      if (allNull) break;
      // Pull non-null events out (a year with empty events[] is still a valid
      // "team didn't play team2 that year" result, not a coverage boundary).
      chunks.forEach(c => { if (Array.isArray(c)) allEvents.push(...c); });
      // Secondary safety: stop after 2 consecutive chunks with zero events.
      const chunkEventCount = chunks.reduce((s, c) => s + (Array.isArray(c) ? c.length : 0), 0);
      consecutiveEmptyChunks = chunkEventCount === 0 ? consecutiveEmptyChunks + 1 : 0;
      if (consecutiveEmptyChunks >= 2) break;
    }

    const games = [];
    for (const ev of allEvents) {
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
          score: extractScore(home?.score),
        },
        away: {
          id: away?.id ?? null,
          name: away?.team?.displayName ?? away?.team?.name ?? null,
          score: extractScore(away?.score),
        },
      });
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ games });
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
