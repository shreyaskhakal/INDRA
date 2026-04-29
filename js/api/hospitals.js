/* ============================================================
   PROJECT INDRA — HOSPITALS API (OSM Overpass, no key)
   Real trauma centres within radius of current GPS position
   ============================================================ */

window.HospitalsAPI = (() => {
  const OVERPASS = 'https://overpass-api.de/api/interpreter';
  const RADIUS_M = 15000; // 15km radius
  const MAX_RESULTS = 5;

  let cache = null;
  let lastPos = null;
  const CACHE_DIST_M = 2000; // re-fetch if moved > 2km

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  async function fetchNear(lat, lng) {
    // Use cache if position hasn't moved much
    if (cache && lastPos && haversine(lat, lng, lastPos.lat, lastPos.lng) < CACHE_DIST_M) {
      return cache;
    }

    const query = `
      [out:json][timeout:10];
      (
        node["amenity"="hospital"](around:${RADIUS_M},${lat},${lng});
        way["amenity"="hospital"](around:${RADIUS_M},${lat},${lng});
        node["amenity"="clinic"]["healthcare"="hospital"](around:${RADIUS_M},${lat},${lng});
        node["healthcare"="hospital"](around:${RADIUS_M},${lat},${lng});
        node["emergency"="yes"](around:${RADIUS_M},${lat},${lng});
      );
      out center ${MAX_RESULTS};
    `;

    try {
      const res = await window.fetch(OVERPASS, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      const hospitals = data.elements
        .filter(el => el.tags)
        .map(el => {
          const eLat = el.lat ?? el.center?.lat ?? lat;
          const eLng = el.lon ?? el.center?.lon ?? lng;
          const dist = haversine(lat, lng, eLat, eLng);
          return {
            name:    el.tags.name || el.tags['name:en'] || 'Hospital',
            phone:   el.tags.phone || el.tags['contact:phone'] || 'Call 112',
            addr:    el.tags['addr:street']
                       ? `${el.tags['addr:street']}, ${el.tags['addr:city'] || ''}`
                       : el.tags['addr:city'] || el.tags.city || '',
            lat:     eLat,
            lng:     eLng,
            dist_km: (dist / 1000).toFixed(1),
            mapsUrl: `https://maps.google.com/?q=${eLat},${eLng}`,
            emergency: el.tags.emergency === 'yes' || !!el.tags['emergency:phone'],
          };
        })
        .sort((a, b) => parseFloat(a.dist_km) - parseFloat(b.dist_km))
        .slice(0, 3);

      if (hospitals.length === 0) throw new Error('No hospitals found');

      cache = hospitals;
      lastPos = { lat, lng };
      console.log('[HospitalsAPI] found:', hospitals.length, 'hospitals');
      return hospitals;
    } catch (err) {
      console.warn('[HospitalsAPI] Overpass failed:', err.message);
      // Fallback: AIIMS emergency numbers
      return [
        { name: 'AIIMS Emergency (112)', phone: '112', addr: 'National Emergency', dist_km: '?', mapsUrl: `https://maps.google.com/search?q=hospital+near+${lat},${lng}` },
        { name: 'Nearest Hospital',      phone: '108', addr: 'Ambulance Service',  dist_km: '?', mapsUrl: `https://maps.google.com/?q=${lat},${lng}` },
      ];
    }
  }

  function getCached() { return cache; }

  return { fetchNear, getCached };
})();
