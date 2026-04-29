/* ============================================================
   PROJECT INDRA — WEATHER API (Open-Meteo, no key required)
   Real precipitation + wind → adjusts road friction coefficient
   ============================================================ */

window.WeatherAPI = (() => {
  // WMO weather codes → friction penalty
  const FRICTION_MAP = {
    0:  { mu: 0.75, label: 'Clear',          icon: '☀️'  },  // Clear sky
    1:  { mu: 0.72, label: 'Mostly Clear',   icon: '🌤️' },
    2:  { mu: 0.68, label: 'Partly Cloudy',  icon: '⛅'  },
    3:  { mu: 0.65, label: 'Overcast',       icon: '☁️'  },
    45: { mu: 0.50, label: 'Foggy',          icon: '🌫️' },
    48: { mu: 0.48, label: 'Icy Fog',        icon: '🌫️' },
    51: { mu: 0.55, label: 'Light Drizzle',  icon: '🌦️' },
    53: { mu: 0.50, label: 'Drizzle',        icon: '🌧️' },
    55: { mu: 0.45, label: 'Heavy Drizzle',  icon: '🌧️' },
    61: { mu: 0.52, label: 'Light Rain',     icon: '🌧️' },
    63: { mu: 0.45, label: 'Rain',           icon: '🌧️' },
    65: { mu: 0.38, label: 'Heavy Rain',     icon: '⛈️'  },
    71: { mu: 0.30, label: 'Light Snow',     icon: '🌨️' },
    73: { mu: 0.25, label: 'Snow',           icon: '❄️'  },
    80: { mu: 0.50, label: 'Rain Showers',   icon: '🌦️' },
    81: { mu: 0.44, label: 'Rain Showers',   icon: '🌧️' },
    82: { mu: 0.36, label: 'Heavy Showers',  icon: '⛈️'  },
    95: { mu: 0.35, label: 'Thunderstorm',   icon: '⛈️'  },
    99: { mu: 0.30, label: 'Thunderstorm',   icon: '⛈️'  },
  };

  let cache = null;
  let lastFetch = 0;
  const CACHE_MS = 5 * 60 * 1000; // 5 minutes

  async function fetch_(lat, lng) {
    const now = Date.now();
    if (cache && now - lastFetch < CACHE_MS) return cache;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
        `&current=temperature_2m,precipitation,rain,weathercode,windspeed_10m,visibility` +
        `&timezone=auto&forecast_days=1`;

      const res = await window.fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const c = data.current;

      const code = c.weathercode ?? 0;
      const friction = FRICTION_MAP[code] || FRICTION_MAP[0];

      // Extra penalty for high winds (>40 km/h)
      const windPenalty = c.windspeed_10m > 40 ? 0.05 : 0;

      cache = {
        mu:          Math.max(0.20, friction.mu - windPenalty),
        label:       friction.label,
        icon:        friction.icon,
        temp:        c.temperature_2m,
        rain:        c.rain ?? c.precipitation ?? 0,
        windspeed:   c.windspeed_10m,
        visibility:  c.visibility,
        weathercode: code,
        raw:         c,
      };
      lastFetch = now;
      console.log('[WeatherAPI] fetched:', cache.label, 'μ=', cache.mu);
      return cache;
    } catch (err) {
      console.warn('[WeatherAPI] failed, using dry default:', err.message);
      return cache || { mu: 0.75, label: 'Unknown', icon: '❓', rain: 0, windspeed: 0 };
    }
  }

  function getCached() { return cache; }

  return { fetch: fetch_, getCached };
})();
