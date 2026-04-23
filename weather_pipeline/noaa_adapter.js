/**
 * NOAA Climate Data Online (CDO) adapter for FreeAgent weather pipeline
 * Reads API key from KEY_FILE (env var) or default path.
 */
import { readFileSync } from 'fs';

const KEY_FILE = process.env.NOAA_KEY_FILE || 'S:\\Archive\\nasaapi.txt';

let cachedKey = null;

function getApiKey() {
  if (!cachedKey) {
    cachedKey = readFileSync(KEY_FILE, 'utf8')
      .split('\n')
      .find(l => l.startsWith('Token:'))
      ?.split('Token:')[1]?.trim();
    if (!cachedKey) throw new Error('NOAA API key not found in ' + KEY_FILE);
  }
  return cachedKey;
}

const BASE = 'https://www.ncdc.noaa.gov/cdo-web/api/v2';

export async function fetchClimate(stationid, datasetid = 'GHCND', options = {}) {
  const key = getApiKey();
  const limit = options.limit || 1000;
  const url = `${BASE}/data?datasetid=${datasetid}&stationid=${stationid}&limit=${limit}&units=metric`;
  const res = await fetch(url, {
    headers: { token: key }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOAA request failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function findNearestStation(lat, lon) {
  const key = getApiKey();
  const url = `${BASE}/stations?locationid=ZIP:${lat},${lon}&limit=1`;
  const res = await fetch(url, {
    headers: { token: key }
  });
  if (!res.ok) throw new Error('Station search failed: ' + res.status);
  const data = await res.json();
  return data.results?.[0] || null;
}

export default { fetchClimate, findNearestStation };