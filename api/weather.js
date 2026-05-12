// NWS (api.weather.gov) forecast proxy. No API key required.
// NWS asks for a descriptive User-Agent on every request.
//
// Query params:
//   lat (required) — latitude, e.g. 39.0489
//   lon (required) — longitude, e.g. -94.4839
//   at  (optional) — ISO timestamp of the game; returns the period that contains it.
//                    If omitted, returns the current/next period.
//
// Response: { period: { name, startTime, endTime, isDaytime, temperature, temperatureUnit,
//                       windSpeed, windDirection, shortForecast, icon } }

const UA = 'BetterBookie/1.0 (https://better-bookie-five.vercel.app)';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lon, at } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

  // NWS wants 4-decimal precision max.
  const latR = Number(lat).toFixed(4);
  const lonR = Number(lon).toFixed(4);

  try {
    const pointsRes = await fetch(`https://api.weather.gov/points/${latR},${lonR}`, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    });
    if (!pointsRes.ok) {
      return res.status(pointsRes.status).json({ error: `NWS points lookup failed (${pointsRes.status})` });
    }
    const points = await pointsRes.json();
    const forecastUrl = points?.properties?.forecast;
    if (!forecastUrl) return res.status(502).json({ error: 'No forecast URL from NWS' });

    const fcRes = await fetch(forecastUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    });
    if (!fcRes.ok) {
      return res.status(fcRes.status).json({ error: `NWS forecast fetch failed (${fcRes.status})` });
    }
    const fc = await fcRes.json();
    const periods = fc?.properties?.periods ?? [];
    if (periods.length === 0) return res.status(502).json({ error: 'No forecast periods' });

    let period = periods[0];
    if (at) {
      const target = new Date(at).getTime();
      if (!Number.isNaN(target)) {
        const match = periods.find(p => {
          const s = new Date(p.startTime).getTime();
          const e = new Date(p.endTime).getTime();
          return target >= s && target < e;
        });
        if (match) period = match;
      }
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(200).json({
      period: {
        name: period.name,
        startTime: period.startTime,
        endTime: period.endTime,
        isDaytime: period.isDaytime,
        temperature: period.temperature,
        temperatureUnit: period.temperatureUnit,
        windSpeed: period.windSpeed,
        windDirection: period.windDirection,
        shortForecast: period.shortForecast,
        icon: period.icon,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
