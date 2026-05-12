export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport, id } = req.query;
  if (!sport || !id) return res.status(400).json({ error: 'sport and id are required' });

  const baseUrls = {
    nfl: 'https://v1.american-football.api-sports.io',
    nba: 'https://v2.nba.api-sports.io',
    mlb: 'https://v1.baseball.api-sports.io',
    nhl: 'https://v1.hockey.api-sports.io',
  };

  const gameEndpoints = {
    nfl: `/games?id=${id}`,
    nba: `/games?id=${id}`,
    mlb: `/games?id=${id}`,
    nhl: `/games?id=${id}`,
  };

  const baseUrl = baseUrls[sport];
  if (!baseUrl) return res.status(400).json({ error: 'Unsupported sport' });

  try {
    // Fetch game details
    const gameRes = await fetch(`${baseUrl}${gameEndpoints[sport]}`, {
      headers: { 'x-apisports-key': process.env.APISPORTS_KEY },
    });
    const gameData = await gameRes.json();

    // Fetch player stats for the game
    const statsRes = await fetch(`${baseUrl}/players/statistics?game=${id}`, {
      headers: { 'x-apisports-key': process.env.APISPORTS_KEY },
    });
    const statsData = await statsRes.json();

    res.status(200).json({
      game: gameData.response?.[0] ?? null,
      players: statsData.response ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
