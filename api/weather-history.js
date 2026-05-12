// NOAA NCEI Climate Data Online (CDO) proxy for historical daily weather.
// Requires env var NOAA_CDO_TOKEN (free: https://www.ncdc.noaa.gov/cdo-web/token).
//
// Query params:
//   lat (required) — latitude
//   lon (required) — longitude
//   date (required) — YYYY-MM-DD
//   radiusKm (optional, default 50) — search radius for nearest GHCN-Daily station
//
// Response: { station: { id, name, distanceKm }, date, tmax, tmin, prcp, snow, units }
// tmax/tmin in °F, prcp/snow in inches.

const BASE = 'https://www.ncei.noaa.gov/cdo-web/api/v2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.NOAA_CDO_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOAA_CDO_TOKEN not configured on the server.' });
  }

  const { lat, lon, date, radiusKm = '50' } = req.query;
  if (!lat || !lon || !date) {
    return res.status(400).json({ error: 'lat, lon, and date (YYYY-MM-DD) required' });
  }

  const latN = Number(lat);
  const lonN = Number(lon);
  const r = Number(radiusKm);
  // Build a bounding box (extent) ~radiusKm around the point.
  // 1 deg lat ~ 111km; 1 deg lon ~ 111km * cos(lat).
  const dLat = r / 111;
  const dLon = r / (111 * Math.max(0.1, Math.cos((latN * Math.PI) / 180)));
  const extent = [latN - dLat, lonN - dLon, latN + dLat, lonN + dLon].join(',');

  const headers = { token, Accept: 'application/json' };

  try {
    // 1. Find GHCN-Daily stations in the bounding box that cover the date.
    const stationsUrl =
      `${BASE}/stations?datasetid=GHCND&extent=${extent}` +
      `&startdate=${date}&enddate=${date}&limit=25`;
    const sRes = await fetch(stationsUrl, { headers });
    if (!sRes.ok) {
      return res.status(sRes.status).json({ error: `Station lookup failed (${sRes.status})` });
    }
    const sJson = await sRes.json();
    const stations = sJson?.results ?? [];
    if (stations.length === 0) {
      return res.status(404).json({ error: 'No NOAA stations within radius for that date' });
    }

    // Pick the closest station to the venue.
    const withDist = stations.map(st => {
      const dKmLat = (st.latitude - latN) * 111;
      const dKmLon = (st.longitude - lonN) * 111 * Math.cos((latN * Math.PI) / 180);
      return { ...st, distanceKm: Math.sqrt(dKmLat * dKmLat + dKmLon * dKmLon) };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
    const station = withDist[0];

    // 2. Fetch daily summary data for that station + date.
    const dataUrl =
      `${BASE}/data?datasetid=GHCND&stationid=${station.id}` +
      `&startdate=${date}&enddate=${date}&units=standard&limit=10`;
    const dRes = await fetch(dataUrl, { headers });
    if (!dRes.ok) {
      return res.status(dRes.status).json({ error: `Data fetch failed (${dRes.status})` });
    }
    const dJson = await dRes.json();
    const rows = dJson?.results ?? [];

    const byType = {};
    for (const row of rows) byType[row.datatype] = row.value;

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      station: { id: station.id, name: station.name, distanceKm: Number(station.distanceKm.toFixed(1)) },
      date,
      tmax: byType.TMAX ?? null,
      tmin: byType.TMIN ?? null,
      prcp: byType.PRCP ?? null,
      snow: byType.SNOW ?? null,
      units: { temperature: 'F', precipitation: 'in', snow: 'in' },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
