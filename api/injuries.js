export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport = 'nfl' } = req.query;

  const leagueMap = {
    nfl: { league: 1, season: 2024 },
    nba: { league: 12, season: 2024 },
    mlb: { league: 1, season: 2024 },
  };

  const { league, season } = leagueMap[sport] || leagueMap.nfl;

  const baseUrls = {
    nfl: 'https://v1.american-football.api-sports.io',
    nba: 'https://v2.nba.api-sports.io',
    mlb: 'https://v1.baseball.api-sports.io',
  };

  const baseUrl = baseUrls[sport] || baseUrls.nfl;

  const response = await fetch(
    `${baseUrl}/injuries?league=${league}&season=${season}`,
    {
      headers: {
        'x-apisports-key': process.env.APISPORTS_KEY,
      },
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
