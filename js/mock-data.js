/* ============================================================
   PROJECT INDRA — MOCK DATA GENERATOR
   Pre-seeded pothole / incident data for dashboard demo
   ============================================================ */

window.MockData = (() => {

  // Bangalore road corridors
  const CORRIDORS = [
    { name: 'NH-44 (Hosur Rd)',  lat: 12.920, lng: 77.610, bearing: 160 },
    { name: 'Outer Ring Rd',     lat: 12.960, lng: 77.660, bearing: 90  },
    { name: 'Mysuru Rd',         lat: 12.960, lng: 77.530, bearing: 270 },
    { name: 'Bellary Rd',        lat: 13.020, lng: 77.597, bearing: 0   },
    { name: 'Old Airport Rd',    lat: 12.958, lng: 77.647, bearing: 45  },
    { name: 'Tumkur Rd',         lat: 13.005, lng: 77.530, bearing: 315 },
    { name: 'Electronic City',   lat: 12.850, lng: 77.660, bearing: 180 },
    { name: 'Whitefield Rd',     lat: 12.972, lng: 77.750, bearing: 90  },
  ];

  function rnd(min, max) { return min + Math.random() * (max - min); }

  function genPothole(corridor, offsetKm = 0) {
    const latOff = offsetKm / 111.32;
    const lngOff = offsetKm / (111.32 * Math.cos(corridor.lat * Math.PI / 180));
    const severity = Math.random();
    return {
      id:        Math.floor(Math.random() * 1e9),
      lat:       corridor.lat + latOff * (Math.random() - 0.5) * 2 + rnd(-0.008, 0.008),
      lng:       corridor.lng + lngOff * (Math.random() - 0.5) * 2 + rnd(-0.008, 0.008),
      magnitude: rnd(2.5, 6.5),
      severity:  severity > 0.7 ? 'severe' : severity > 0.4 ? 'moderate' : 'minor',
      road:      corridor.name,
      timestamp: new Date(Date.now() - rnd(0, 86400000 * 7)).toISOString(),
      synced:    true,
      upvotes:   Math.floor(rnd(0, 24)),
    };
  }

  function generatePotholes(count = 180) {
    const potholes = [];
    CORRIDORS.forEach(corridor => {
      const perCorridor = Math.floor(count / CORRIDORS.length);
      for (let i = 0; i < perCorridor; i++) {
        potholes.push(genPothole(corridor, rnd(-5, 5)));
      }
    });
    return potholes;
  }

  function generateSOSEvents(count = 8) {
    return Array.from({ length: count }, (_, i) => ({
      id:        Date.now() - i * 3600000,
      lat:       rnd(12.85, 13.08),
      lng:       rnd(77.48, 77.78),
      timestamp: new Date(Date.now() - i * 3600000 * rnd(0.5, 3)).toISOString(),
      gforce:    rnd(4.1, 8.5).toFixed(1),
      status:    i === 0 ? 'active' : 'resolved',
      road:      CORRIDORS[i % CORRIDORS.length].name,
    }));
  }

  function generateIncidentFeed(count = 15) {
    const types = ['Pothole Reported', 'Hard Braking Zone', 'SOS Event', 'Wrong-Way Alert', 'Fog Zone'];
    const icons = ['🕳️', '⚠️', '🚨', '🔄', '🌫️'];
    return Array.from({ length: count }, (_, i) => {
      const typeIdx = Math.floor(Math.random() * types.length);
      return {
        id:       i,
        type:     types[typeIdx],
        icon:     icons[typeIdx],
        road:     CORRIDORS[i % CORRIDORS.length].name,
        ago:      Math.floor(rnd(1, 120)),
        severity: Math.random() > 0.6 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      };
    }).sort((a, b) => a.ago - b.ago);
  }

  function roadHealthStats() {
    return CORRIDORS.map(c => {
      const score = Math.floor(rnd(15, 90));
      return {
        name: c.name,
        score,
        color: score > 70 ? '#00D4AA' : score > 40 ? '#F5A623' : '#E94560',
        label: score > 70 ? 'Good' : score > 40 ? 'Fair' : 'Critical',
        potholes: Math.floor(rnd(3, 45)),
        sos: Math.floor(rnd(0, 5)),
      };
    });
  }

  // Seed localStorage if empty
  function seed() {
    if (!localStorage.getItem('indra_potholes')) {
      localStorage.setItem('indra_potholes', JSON.stringify(generatePotholes(180)));
    }
    if (!localStorage.getItem('indra_sos')) {
      localStorage.setItem('indra_sos', JSON.stringify(generateSOSEvents(8)));
    }
  }

  return { generatePotholes, generateSOSEvents, generateIncidentFeed, roadHealthStats, seed, CORRIDORS };
})();
