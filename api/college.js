export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport = 'football' } = req.query;

  const configs = {
    football: { url: `https://api.balldontlie.io/ncaaf/v1/games?seasons[]=2024&api_key=${process.env.BALLDONTLIE_KEY}` },
    basketball: { url: `https://api.balldontlie.io/ncaab/v1/games?season=2024&api_key=${process.env.BALLDONTLIE_KEY}` },
  };

  const config = configs[sport] || configs.football;

  try {
    const response = await fetch(config.url);
    const text = await response.text();
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
