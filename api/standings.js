export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport = 'nfl', season } = req.query;

  const leagueIds = {
    nfl: 1,
    nba: 12,
    mlb: 1,
    nhl: 57,
    ncaafb: 11,
    ncaabb: 116,
  };

  const leagueId = leagueIds[sport];
  if (!leagueId) return res.status(400).json({ error: 'Unsupported sport' });

  const baseUrls = {
    nfl: 'https://v1.american-football.api-sports.io',
    ncaafb: 'https://v1.american-football.api-sports.io',
    nba: 'https://v2.nba.api-sports.io',
    mlb: 'https://v1.baseball.api-sports.io',
    nhl: 'https://v1.hockey.api-sports.io',
    ncaabb: 'https://v1.basketball.api-sports.io',
  };

  const baseUrl = baseUrls[sport];
  const url = `${baseUrl}/standings?league=${leagueId}&season=${season}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': process.env.APISPORTS_KEY,
      },
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
