export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sport = 'nfl', date, week, season, seasontype = '2' } = req.query;

  const urls = {
    nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
    ncaafb: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
    ncaabb: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
  };

  const baseUrl = urls[sport];
  if (!baseUrl) return res.status(400).json({ error: 'Unsupported sport' });

  const params = new URLSearchParams();
  if (date) params.append('dates', date);
  if (week) params.append('week', week);
  if (season) params.append('season', season);
  if (seasontype) params.append('seasontype', seasontype);
  params.append('limit', '100');

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
