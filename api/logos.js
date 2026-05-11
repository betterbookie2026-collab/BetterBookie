export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport = 'nfl' } = req.query;

  const urls = {
    nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams',
    nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams',
    mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams',
    nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams',
  };

  const url = urls[sport] || urls.nfl;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const teams = data.sports[0].leagues[0].teams.map(t => ({
      name: t.team.displayName,
      logo: t.team.logos?.[0]?.href ?? '',
      abbreviation: t.team.abbreviation,
    }));
    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
