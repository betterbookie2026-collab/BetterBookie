export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport = 'football' } = req.query;

  const configs = {
    football: {
      url: 'https://api.balldontlie.io/cfb/v1/games?seasons[]=2024',
      key: process.env.BALLDONTLIE_KEY,
    },
    basketball: {
      url: 'https://api.balldontlie.io/v1/games?seasons[]=2024',
      key: process.env.BALLDONTLIE_KEY,
    },
  };

  const config = configs[sport] || configs.football;

  try {
    const response = await fetch(config.url, {
      headers: {
        'Authorization': config.key,
      },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch college data' });
  }
}
