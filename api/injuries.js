export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport = 'nfl' } = req.query;

  const configs = {
    nfl: { baseUrl: 'https://v1.american-football.api-sports.io', teams: [1, 2, 3, 4, 5, 6] },
    nba: { baseUrl: 'https://v2.nba.api-sports.io', teams: [1, 2, 3, 4, 5, 6] },
    mlb: { baseUrl: 'https://v1.baseball.api-sports.io', teams: [1, 2, 3, 4, 5, 6] },
  };

  const config = configs[sport] || configs.nfl;

  try {
    const requests = config.teams.map(teamId =>
      fetch(`${config.baseUrl}/injuries?team=${teamId}`, {
        headers: { 'x-apisports-key': process.env.APISPORTS_KEY },
      }).then(r => r.json())
    );

    const results = await Promise.all(requests);
    const combined = results.flatMap(r => r.response || []);

    res.status(200).json({ response: combined });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch injury data' });
  }
}
