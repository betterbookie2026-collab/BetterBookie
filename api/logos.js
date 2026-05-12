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
    ncaafb: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=500',
    ncaabb: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=500',
    ncaasb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/teams?limit=500',
    ncaasoftball: 'https://site.api.espn.com/apis/site/v2/sports/softball/college-softball/teams?limit=500',
  };

  const topTeams = {
    ncaafb: ['Alabama Crimson Tide', 'Georgia Bulldogs', 'Ohio State Buckeyes', 'Michigan Wolverines', 'Texas Longhorns', 'Oklahoma Sooners', 'Notre Dame Fighting Irish', 'Clemson Tigers', 'LSU Tigers', 'Penn State Nittany Lions', 'Oregon Ducks', 'Florida State Seminoles', 'Tennessee Volunteers', 'Miami Hurricanes', 'USC Trojans', 'Auburn Tigers', 'Florida Gators', 'Texas A&M Aggies', 'Ole Miss Rebels', 'Utah Utes', 'Wisconsin Badgers', 'Michigan State Spartans', 'Iowa Hawkeyes', 'Arkansas Razorbacks', 'Oklahoma State Cowboys', 'Baylor Bears', 'TCU Horned Frogs', 'Kansas State Wildcats', 'Washington Huskies', 'Oregon State Beavers'],
    ncaabb: ['Duke Blue Devils', 'Kentucky Wildcats', 'Kansas Jayhawks', 'North Carolina Tar Heels', 'UCLA Bruins', 'Gonzaga Bulldogs', 'Villanova Wildcats', 'Connecticut Huskies', 'Indiana Hoosiers', 'Louisville Cardinals', 'Michigan State Spartans', 'Arizona Wildcats', 'Purdue Boilermakers', 'Houston Cougars', 'Baylor Bears', 'Tennessee Volunteers', 'Arkansas Razorbacks', 'Auburn Tigers', 'Creighton Bluejays', 'Alabama Crimson Tide', 'Texas Longhorns', 'Ohio State Buckeyes', 'Illinois Fighting Illini', 'Iowa Hawkeyes', 'Wisconsin Badgers', 'Virginia Cavaliers', 'Florida Gators', 'Miami Hurricanes', 'San Diego State Aztecs', 'Memphis Tigers'],
    ncaasb: ['LSU Tigers', 'Texas Longhorns', 'Arkansas Razorbacks', 'Florida Gators', 'Vanderbilt Commodores', 'Oregon State Beavers', 'Miami Hurricanes', 'North Carolina Tar Heels', 'Tennessee Volunteers', 'Georgia Bulldogs', 'TCU Horned Frogs', 'Texas A&M Aggies', 'Oklahoma Sooners', 'Stanford Cardinal', 'Virginia Cavaliers', 'Arizona Wildcats', 'Southern Miss Golden Eagles', 'Dallas Baptist Patriots', 'Florida State Seminoles', 'Ole Miss Rebels', 'South Carolina Gamecocks', 'Kentucky Wildcats', 'Coastal Carolina Chanticleers', 'Indiana Hoosiers', 'Campbell Fighting Camels', 'UC Santa Barbara Gauchos', 'Connecticut Huskies', 'Oregon Ducks', 'Auburn Tigers', 'Mississippi State Bulldogs'],
    ncaasoftball: ['Oklahoma Sooners', 'UCLA Bruins', 'Florida Gators', 'Alabama Crimson Tide', 'Texas Longhorns', 'Arizona Wildcats', 'Oregon Ducks', 'LSU Tigers', 'Michigan Wolverines', 'Tennessee Volunteers', 'Georgia Bulldogs', 'Arkansas Razorbacks', 'Florida State Seminoles', 'Texas A&M Aggies', 'Ole Miss Rebels', 'South Carolina Gamecocks', 'Stanford Cardinal', 'Arizona State Sun Devils', 'Ohio State Buckeyes', 'Kentucky Wildcats', 'James Madison Dukes', 'Oklahoma State Cowgirls', 'Missouri Tigers', 'Utah Utes', 'Washington Huskies', 'Clemson Tigers', 'Auburn Tigers', 'Baylor Bears', 'North Carolina Tar Heels', 'Virginia Tech Hokies'],
  };

  const url = urls[sport] || urls.nfl;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const teams = data.sports[0].leagues[0].teams.map(t => ({
      name: t.team.displayName,
      logo: t.team.logos?.[0]?.href ?? '',
      abbreviation: t.team.abbreviation,
      conference: t.team.groups?.parent?.name ?? t.team.groups?.name ?? null,
    }));

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
