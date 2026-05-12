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
    ncaafb: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=200',
    ncaabb: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=200',
    ncaasb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/teams?limit=200',
    ncaasoftball: 'https://site.api.espn.com/apis/site/v2/sports/softball/college-softball/teams?limit=200',
  };

  const topTeams = {
    ncaafb: ['Alabama Crimson Tide', 'Georgia Bulldogs', 'Ohio State Buckeyes', 'Michigan Wolverines', 'Texas Longhorns', 'Oklahoma Sooners', 'Notre Dame Fighting Irish', 'Clemson Tigers', 'LSU Tigers', 'Penn State Nittany Lions', 'Oregon Ducks', 'Florida State Seminoles', 'Tennessee Volunteers', 'Miami Hurricanes', 'USC Trojans', 'Auburn Tigers', 'Florida Gators', 'Texas A&M Aggies', 'Ole Miss Rebels', 'Utah Utes'],
    ncaabb: ['Duke Blue Devils', 'Kentucky Wildcats', 'Kansas Jayhawks', 'North Carolina Tar Heels', 'UCLA Bruins', 'Gonzaga Bulldogs', 'Villanova Wildcats', 'Connecticut Huskies', 'Indiana Hoosiers', 'Louisville Cardinals', 'Michigan State Spartans', 'Arizona Wildcats', 'Purdue Boilermakers', 'Houston Cougars', 'Baylor Bears', 'Tennessee Volunteers', 'Arkansas Razorbacks', 'Auburn Tigers', 'Creighton Bluejays', 'Alabama Crimson Tide'],
    ncaasb: ['LSU Tigers', 'Texas Longhorns', 'Arkansas Razorbacks', 'Florida Gators', 'Vanderbilt Commodores', 'Oregon State Beavers', 'Miami Hurricanes', 'North Carolina Tar Heels', 'Tennessee Volunteers', 'Georgia Bulldogs'],
    ncaasoftball: ['Oklahoma Sooners', 'UCLA Bruins', 'Florida Gators', 'Alabama Crimson Tide', 'Texas Longhorns', 'Arizona Wildcats', 'Oregon Ducks', 'LSU Tigers', 'Michigan Wolverines', 'Tennessee Volunteers'],
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

    // Sort college teams with top programs first
    if (topTeams[sport]) {
      const top = topTeams[sport];
      teams.sort((a, b) => {
        const aIdx = top.indexOf(a.name);
        const bIdx = top.indexOf(b.name);
        if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }

    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
