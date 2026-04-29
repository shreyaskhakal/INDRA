/* ============================================================
   PROJECT INDRA — PHYSICS ENGINE (Einstein / Tesla Layer)
   Collision Vector Prediction via IMU + kinematics
   ============================================================ */

window.PhysicsEngine = (() => {
  const G = 9.81; // m/s²

  // Default friction table (overridden by live WeatherAPI data)
  const MU_DEFAULT = { dry: 0.75, wet: 0.55, gravel: 0.40, pothole: 0.30 };
  let liveMu = 0.75;       // updated from WeatherAPI
  let liveWeather = null;
  let speed_kmh = 0;
  let gforce = 0;
  let onAlert = null;
  let active = false;

  // Pull real weather every 5 minutes
  async function refreshWeather(lat, lng) {
    if (typeof WeatherAPI === 'undefined') return;
    const w = await WeatherAPI.fetch(lat, lng);
    if (w) { liveMu = w.mu; liveWeather = w; }
  }

  // ── Stopping Distance Formula ────────────────────────────
  // s = v² / (2 * μ * g)
  function stoppingDistance(speed_ms, mu) {
    return (speed_ms * speed_ms) / (2 * mu * G);
  }

  // ── G-Force → Estimated Braking Deceleration ─────────────
  // Returns equivalent stopping distance given current G reading
  function effectiveMu(gf) {
    // gf is fraction of G; clamp to physically meaningful range
    return Math.min(Math.max(gf, 0.1), 0.9);
  }

  // ── Check Collision Vector ───────────────────────────────
  function analyse(speedKmh, gf, surface) {
    const v = speedKmh / 3.6; // m/s
    const mu = liveMu || MU_DEFAULT[surface] || MU_DEFAULT.dry;
    const sd = stoppingDistance(v, mu);

    // Effective braking distance available given driver's current reaction
    const currentBrakingEff = effectiveMu(gf);
    const availableStop = stoppingDistance(v, currentBrakingEff);

    // Danger index: 0=safe, 1=critical
    const dangerIndex = Math.min(sd / Math.max(availableStop, 0.1), 1);

    return {
      stoppingDistance: sd.toFixed(1),
      speed_ms:         v.toFixed(1),
      mu,
      dangerIndex,
      critical:         dangerIndex > 0.85 && v > 5,
    };
  }

  // ── Real Sensor Setup (mobile) ───────────────────────────
  function attachRealSensors() {
    if (!('DeviceMotionEvent' in window)) return false;

    // iOS 13+ requires permission
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(p => { if (p === 'granted') listenMotion(); })
        .catch(() => {});
    } else {
      listenMotion();
    }
    return true;
  }

  function listenMotion() {
    window.addEventListener('devicemotion', e => {
      const ax = e.accelerationIncludingGravity?.x || 0;
      const ay = e.accelerationIncludingGravity?.y || 0;
      const az = e.accelerationIncludingGravity?.z || 0;

      const totalG = Math.sqrt(ax*ax + ay*ay + az*az) / G;
      gforce = totalG;

      // Impact detection → Dead Man's Switch
      if (totalG > 4) {
        window.DeadMansSwitch?.trigger(totalG, null);
      }

      // Pothole: Z-axis jerk
      if (Math.abs(az) > 2.5 * G) {
        window.PotholeMapper?.detect(az / G);
      }
    });
  }

  // ── Simulation-driven update ─────────────────────────────
  function updateFromSim(data) {
    speed_kmh = data.speed;
    gforce    = data.gforce;

    if (!active) return;

    const result = analyse(speed_kmh, gforce, currentSurface);

    // Collision warning
    if (result.critical && onAlert) {
      onAlert({ type: 'collision', ...result });
    }
  }

  function setSurface(surface) { currentSurface = surface; }
  function setCallback(cb)     { onAlert = cb; }

  function start() {
    active = true;
    const hasReal = attachRealSensors();
    if (!hasReal) {
      SensorSim.on('motion', updateFromSim);
    }
    // Fetch real weather on start + every 5 min
    navigator.geolocation?.getCurrentPosition(pos => {
      refreshWeather(pos.coords.latitude, pos.coords.longitude);
    }, () => refreshWeather(12.9716, 77.5946)); // default Bangalore
    setInterval(() => {
      navigator.geolocation?.getCurrentPosition(pos => {
        refreshWeather(pos.coords.latitude, pos.coords.longitude);
      });
    }, 5 * 60 * 1000);
  }
  function stop() { active = false; }
  function getWeather() { return liveWeather; }

  return { start, stop, setSurface: () => {}, setCallback, analyse, stoppingDistance, getWeather };
})();
