/* ============================================================
   PROJECT INDRA — GEOCODING API (Nominatim OSM, no key)
   Real road name + city from GPS coordinates
   ============================================================ */

window.GeocodingAPI = (() => {
  const BASE = 'https://nominatim.openstreetmap.org/reverse';
  let cache = {};
  let lastFetch = 0;
  const RATE_LIMIT_MS = 1500; // Nominatim: max 1 req/sec

  async function reverseGeocode(lat, lng) {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (cache[key]) return cache[key];

    const now = Date.now();
    if (now - lastFetch < RATE_LIMIT_MS) return cache._last || null;

    try {
      lastFetch = now;
      const url = `${BASE}?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
      const res = await window.fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'ProjectIndra/1.0' },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const a = data.address || {};

      const result = {
        road:     a.road || a.pedestrian || a.path || 'Unknown Road',
        suburb:   a.suburb || a.neighbourhood || '',
        city:     a.city || a.town || a.village || a.county || '',
        state:    a.state || '',
        display:  data.display_name?.split(',').slice(0, 2).join(',') || '',
        postcode: a.postcode || '',
      };

      cache[key] = result;
      cache._last = result;
      return result;
    } catch (err) {
      console.warn('[GeocodingAPI]', err.message);
      return cache._last || { road: 'GPS Active', city: '', suburb: '' };
    }
  }

  return { reverseGeocode };
})();
