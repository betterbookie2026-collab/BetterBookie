export default async function handler(req, res) {
  const { sport = 'americanfootball_nfl' } = req.query;

  const response = await fetch(
    `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${process.env.ODDS_API_KEY}&regions=us&markets=h2h&oddsFormat=american`
  );

  const data = await response.json();
  res.status(200).json(data);
}
