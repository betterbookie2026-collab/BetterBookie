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
    ncaafb: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=500&groups=80',
    ncaabb: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=500&groups=50',
    ncaasb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/teams?limit=500',
    ncaasoftball: 'https://site.api.espn.com/apis/site/v2/sports/softball/college-softball/teams?limit=500',
  };

  const conferenceMap = {
    ncaafb: {
      'Alabama Crimson Tide': 'SEC', 'Georgia Bulldogs': 'SEC', 'Tennessee Volunteers': 'SEC',
      'LSU Tigers': 'SEC', 'Florida Gators': 'SEC', 'Auburn Tigers': 'SEC',
      'Texas A&M Aggies': 'SEC', 'Ole Miss Rebels': 'SEC', 'Arkansas Razorbacks': 'SEC',
      'Mississippi State Bulldogs': 'SEC', 'South Carolina Gamecocks': 'SEC',
      'Missouri Tigers': 'SEC', 'Kentucky Wildcats': 'SEC', 'Vanderbilt Commodores': 'SEC',
      'Texas Longhorns': 'SEC', 'Oklahoma Sooners': 'SEC',
      'Ohio State Buckeyes': 'Big Ten', 'Michigan Wolverines': 'Big Ten',
      'Penn State Nittany Lions': 'Big Ten', 'Wisconsin Badgers': 'Big Ten',
      'Iowa Hawkeyes': 'Big Ten', 'Michigan State Spartans': 'Big Ten',
      'Minnesota Golden Gophers': 'Big Ten', 'Nebraska Cornhuskers': 'Big Ten',
      'Illinois Fighting Illini': 'Big Ten', 'Northwestern Wildcats': 'Big Ten',
      'Indiana Hoosiers': 'Big Ten', 'Purdue Boilermakers': 'Big Ten',
      'Maryland Terrapins': 'Big Ten', 'Rutgers Scarlet Knights': 'Big Ten',
      'UCLA Bruins': 'Big Ten', 'USC Trojans': 'Big Ten',
      'Oregon Ducks': 'Big Ten', 'Washington Huskies': 'Big Ten',
      'Clemson Tigers': 'ACC', 'Florida State Seminoles': 'ACC',
      'Miami Hurricanes': 'ACC', 'North Carolina Tar Heels': 'ACC',
      'NC State Wolfpack': 'ACC', 'Virginia Cavaliers': 'ACC',
      'Virginia Tech Hokies': 'ACC', 'Pittsburgh Panthers': 'ACC',
      'Boston College Eagles': 'ACC', 'Wake Forest Demon Deacons': 'ACC',
      'Duke Blue Devils': 'ACC', 'Georgia Tech Yellow Jackets': 'ACC',
      'Louisville Cardinals': 'ACC', 'Syracuse Orange': 'ACC',
      'Notre Dame Fighting Irish': 'Ind',
      'Kansas State Wildcats': 'Big 12', 'Baylor Bears': 'Big 12',
      'TCU Horned Frogs': 'Big 12', 'Oklahoma State Cowboys': 'Big 12',
      'West Virginia Mountaineers': 'Big 12', 'Kansas Jayhawks': 'Big 12',
      'Iowa State Cyclones': 'Big 12', 'Texas Tech Red Raiders': 'Big 12',
      'Cincinnati Bearcats': 'Big 12', 'UCF Knights': 'Big 12',
      'Houston Cougars': 'Big 12', 'BYU Cougars': 'Big 12',
      'Utah Utes': 'Pac-12', 'Oregon State Beavers': 'Pac-12',
      'Washington State Cougars': 'Pac-12',
    },
    ncaabb: {
      'Duke Blue Devils': 'ACC', 'North Carolina Tar Heels': 'ACC',
      'Virginia Cavaliers': 'ACC', 'Louisville Cardinals': 'ACC',
      'Miami Hurricanes': 'ACC', 'Florida State Seminoles': 'ACC',
      'Pittsburgh Panthers': 'ACC', 'NC State Wolfpack': 'ACC',
      'Wake Forest Demon Deacons': 'ACC', 'Clemson Tigers': 'ACC',
      'Boston College Eagles': 'ACC', 'Georgia Tech Yellow Jackets': 'ACC',
      'Syracuse Orange': 'ACC', 'Notre Dame Fighting Irish': 'ACC',
      'Virginia Tech Hokies': 'ACC',
      'Kentucky Wildcats': 'SEC', 'Tennessee Volunteers': 'SEC',
      'Alabama Crimson Tide': 'SEC', 'Auburn Tigers': 'SEC',
      'Florida Gators': 'SEC', 'Arkansas Razorbacks': 'SEC',
      'Mississippi State Bulldogs': 'SEC', 'Ole Miss Rebels': 'SEC',
      'LSU Tigers': 'SEC', 'Texas A&M Aggies': 'SEC',
      'Georgia Bulldogs': 'SEC', 'Missouri Tigers': 'SEC',
      'South Carolina Gamecocks': 'SEC', 'Vanderbilt Commodores': 'SEC',
      'Texas Longhorns': 'SEC', 'Oklahoma Sooners': 'SEC',
      'Kansas Jayhawks': 'Big 12', 'Baylor Bears': 'Big 12',
      'Texas Tech Red Raiders': 'Big 12', 'Iowa State Cyclones': 'Big 12',
      'Kansas State Wildcats': 'Big 12', 'Oklahoma State Cowboys': 'Big 12',
      'TCU Horned Frogs': 'Big 12', 'West Virginia Mountaineers': 'Big 12',
      'Cincinnati Bearcats': 'Big 12', 'UCF Knights': 'Big 12',
      'Houston Cougars': 'Big 12', 'BYU Cougars': 'Big 12',
      'Michigan State Spartans': 'Big Ten', 'Ohio State Buckeyes': 'Big Ten',
      'Michigan Wolverines': 'Big Ten', 'Illinois Fighting Illini': 'Big Ten',
      'Iowa Hawkeyes': 'Big Ten', 'Indiana Hoosiers': 'Big Ten',
      'Purdue Boilermakers': 'Big Ten', 'Wisconsin Badgers': 'Big Ten',
      'Minnesota Golden Gophers': 'Big Ten', 'Nebraska Cornhuskers': 'Big Ten',
      'Northwestern Wildcats': 'Big Ten', 'Penn State Nittany Lions': 'Big Ten',
      'Maryland Terrapins': 'Big Ten', 'Rutgers Scarlet Knights': 'Big Ten',
      'UCLA Bruins': 'Big Ten', 'USC Trojans': 'Big Ten',
      'Oregon Ducks': 'Big Ten', 'Washington Huskies': 'Big Ten',
      'Gonzaga Bulldogs': 'WCC', 'Connecticut Huskies': 'Big East',
      'Villanova Wildcats': 'Big East', 'Creighton Bluejays': 'Big East',
      'Marquette Golden Eagles': 'Big East', 'Xavier Musketeers': 'Big East',
      'Seton Hall Pirates': 'Big East', 'Providence Friars': 'Big East',
      'Arizona Wildcats': 'Big 12', 'Houston Cougars': 'Big 12',
      'San Diego State Aztecs': 'Mountain West', 'Memphis Tigers': 'AAC',
    },
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
      conference: conferenceMap[sport]?.[t.team.displayName] ?? 'Other',
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
