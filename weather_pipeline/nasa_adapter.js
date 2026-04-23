/**
 * NASA POWER adapter for FreeAgent weather pipeline
 * Reads API key from a local file (path configured via env var NASA_KEY_FILE).
 * Usage:
 *   1) Place your NASA API key in the file referenced by NASA_KEY_FILE (default: S:\Archive\nasaapi.txt)
 *   2) Ensure process.env.NASA_KEY_FILE points to that file or update the default path in this file.
 *   3) Call fetchWeather(lat, lon, params) to retrieve POWER data.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const KEY_FILE = process.env.NASA_KEY_FILE || 'S:\\Archive\\nasaapi.txt';

let cachedKey = null;

function getApiKey() {
  if (!cachedKey) {
    cachedKey = readFileSync(KEY_FILE, 'utf8').trim();
  }
  return cachedKey;
}

const BASE = 'https://power.larc.nasa.gov/api';

export async function fetchWeather(lat, lon, params = {}) {
  const key = getApiKey();
  const query = new URLSearchParams({
    USERKEY: key,
    lat,
    lon,
    format: 'JSON',
    ...params
  });
  const url = `${BASE}/temporal/daily/point?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NASA POWER request failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export default fetchWeather;
