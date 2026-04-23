import fetchWeather, { fetch as powerFetch } from './nasa_adapter.js';
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('NASA POWER adapter integration', () => {
  it('loads key from file and fetches data', async () => {
    // If key is missing, this will throw; test should be skipped in CI without a key
    const key = require('fs').readFileSync(process.env.NASA_KEY_FILE || 'S:\\Archive\\nasaapi.txt', 'utf8').trim();
    if (!key) {
      throw new Error('NASA API key not found; skipping integration test');
    }

    // Example: fetch recent daily data for a sample location (equator, prime meridian)
    const data = await powerFetch(0, 0, {
      parameters: 'ALLSKY_SFC_DWNDBL',
      community: 'AG',
      start: '20260101',
      end: '20260102'
    });

    expect(data).toBeDefined();
    expect(data.properties).toBeDefined();
    // At least one band/value present
    expect(Object.keys(data.properties).length).toBeGreaterThan(0);
  });
});
