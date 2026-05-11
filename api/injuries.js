export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport = 'nfl' } = req.query;

  const configs = {
    nfl: {
      url: 'https://v1.american-football.api-sports.io/injuries?team=1',
    },
    nba: {
      url: 'https://v2.nba.api-sports.io/injuries?team=1&season=2024-2025',
    },
    mlb: {
      url: 'https://v1.baseball.api-sports.io/injuries?team=1&season=2024',
    },
  };

  const config = configs[sport] || configs.nfl;

  try {
    const response = await fetch(config.url, {
      headers: {
        'x-apisports-key': process.env.APISPORTS_KEY,
      },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch injury data' });
  }
}
