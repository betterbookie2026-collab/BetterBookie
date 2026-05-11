export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport = 'football' } = req.query;

  const configs = {
    football: { url: 'https://api.balldontlie.io/ncaaf/v1/games?seasons[]=2024' },
    basketball: { url: 'https://api.balldontlie.io/ncaab/v1/games?season=2024' },
  };

  const config = configs[sport] || configs.football;

  try {
    const response = await fetch(config.url, {
      headers: {
        'Authorization': process.env.BALLDONTLIE_KEY,
      },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch college data' });
  }
}
