export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport = 'nfl', team, mode = 'injuries' } = req.query;

  const baseUrls = {
    nfl: 'https://v1.american-football.api-sports.io',
    nba: 'https://v2.nba.api-sports.io',
    mlb: 'https://v1.baseball.api-sports.io',
  };

  const baseUrl = baseUrls[sport] || baseUrls.nfl;

  try {
    let url;
    if (mode === 'teams') {
      url = `${baseUrl}/teams`;
    } else {
      url = `${baseUrl}/injuries?team=${team}`;
    }

    const response = await fetch(url, {
      headers: { 'x-apisports-key': process.env.APISPORTS_KEY },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
