// Computes "as-of" standings: each team's W/L/T record for the selected season
// counting only games completed on or before a cutoff (week for football, date
// for everything else). Fans out to ESPN per-team schedules.
//
// Query params:
//   sport (required) — nfl | nba | mlb | nhl | ncaafb | ncaabb
//   season (required) — start year of the season
//   through_week (optional) — integer; weekly sports only
//   through_date (optional) — YYYY-MM-DD; everything else (and a fallback for weekly)

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

  const { sport, season, through_week, through_date } = req.query;
  const cfg = SPORT_CFG[sport];
  if (!cfg) return res.status(400).json({ error: 'Unsupported sport' });
  if (!season) return res.status(400).json({ error: 'season required' });
  if (!through_week && !through_date) return res.status(400).json({ error: 'through_week or through_date required' });

  const baseTeams = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/teams?limit=400`;
  const teamsData = await jsonOrNull(baseTeams);
  const teamEntries = teamsData?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  const teams = teamEntries.map(e => e.team).filter(t => t?.id);
  if (teams.length === 0) return res.status(502).json({ error: 'No teams returned from ESPN' });

  const cutoffTs = through_date ? new Date(through_date + 'T23:59:59Z').getTime() : null;
  const weekCutoff = through_week ? parseInt(through_week, 10) : null;

  // Fetch each team's schedule in parallel.
  const schedules = await Promise.all(teams.map(async t => {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/teams/${t.id}/schedule?season=${encodeURIComponent(season)}`;
    return { team: t, data: await jsonOrNull(url) };
  }));

  const standings = schedules.map(({ team, data }) => {
    let wins = 0, losses = 0, ties = 0;
    for (const ev of (data?.events ?? [])) {
      const comp = ev.competitions?.[0];
      const completed = comp?.status?.type?.completed === true;
      if (!completed) continue;
      if (weekCutoff != null) {
        const w = ev.week?.number ?? null;
        if (w == null || w > weekCutoff) continue;
      } else if (cutoffTs != null) {
        const t = new Date(ev.date).getTime();
        if (!Number.isFinite(t) || t > cutoffTs) continue;
      }
      const us = (comp?.competitors ?? []).find(c => String(c.id) === String(team.id));
      const them = (comp?.competitors ?? []).find(c => String(c.id) !== String(team.id));
      const usScore = Number(us?.score);
      const themScore = Number(them?.score);
      if (Number.isNaN(usScore) || Number.isNaN(themScore)) continue;
      if (usScore > themScore) wins++;
      else if (usScore < themScore) losses++;
      else ties++;
    }
    const total = wins + losses + ties;
    return {
      id: team.id,
      name: team.displayName ?? team.name,
      abbreviation: team.abbreviation ?? null,
      logo: team.logos?.[0]?.href ?? null,
      wins, losses, ties,
      gamesPlayed: total,
      winPct: total ? wins / total : 0,
    };
  });

  standings.sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.status(200).json({ standings, sport, season, through_week: weekCutoff, through_date: through_date ?? null });
}
