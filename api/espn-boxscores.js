export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport = 'nfl', season } = req.query;

  const urls = {
    nfl: 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings',
    nba: 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',
    mlb: 'https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings',
    nhl: 'https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings',
    ncaafb: 'https://site.api.espn.com/apis/v2/sports/football/college-football/standings',
    ncaabb: 'https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings',
  };

  const baseUrl = urls[sport];
  if (!baseUrl) return res.status(400).json({ error: 'Unsupported sport' });

  const params = new URLSearchParams();
  if (season) params.append('season', season);

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
