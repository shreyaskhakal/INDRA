/* ============================================================
   PROJECT INDRA — WRONG-SIDE DETECTOR (Indian Edge Case)
   Compass + GPS trajectory anti-collision detection
   ============================================================ */

window.WrongSideDetector = (() => {
  let active = false;
  let onAlert = null;
  let alertActive = false;
  let alertCooldown = 0;

  // Road bearing is set per road segment; default: southbound (180°)
  let expectedBearing = 180;

  // Angle difference threshold for wrong-side detection
  const WRONG_SIDE_THRESHOLD = 130; // degrees

  // ── Bearing Calculation ──────────────────────────────────
  function bearingBetween(lat1, lng1, lat2, lng2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  // Angular difference (handles wrap-around)
  function angleDiff(a, b) {
    return Math.abs(((a - b) + 180) % 360 - 180);
  }

  // ── GPS-based trajectory analysis ────────────────────────
  const gpsHistory = [];
  function updateGPS(lat, lng) {
    gpsHistory.push({ lat, lng, t: Date.now() });
    if (gpsHistory.length > 5) gpsHistory.shift();

    if (gpsHistory.length >= 2) {
      const prev = gpsHistory[gpsHistory.length - 2];
      const curr = gpsHistory[gpsHistory.length - 1];
      const movingBearing = bearingBetween(prev.lat, prev.lng, curr.lat, curr.lng);
      check(movingBearing);
    }
  }

  function check(currentHeading) {
    const diff = angleDiff(currentHeading, expectedBearing);
    const isWrongSide = diff > WRONG_SIDE_THRESHOLD;

    onAlert?.({ active: isWrongSide, headingDiff: diff, currentHeading, expectedBearing });

    if (isWrongSide && !alertActive && Date.now() > alertCooldown) {
      triggerAlert();
    } else if (!isWrongSide) {
      alertActive = false;
    }
  }

  function triggerAlert() {
    alertActive = true;
    alertCooldown = Date.now() + 5000;
    IndraAudio?.wrongSideAlert();
    setTimeout(() => { alertActive = false; }, 4000);
  }

  // ── Real Device Orientation (compass) ────────────────────
  function startReal() {
    let prevPos = null;

    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientationabsolute', e => {
        if (e.alpha !== null) check(e.alpha);
      });
    }

    navigator.geolocation?.watchPosition(pos => {
      if (prevPos) {
        updateGPS(pos.coords.latitude, pos.coords.longitude);
      }
      prevPos = pos;
    }, () => {}, { enableHighAccuracy: true });
  }

  // ── Sim Mode ──────────────────────────────────────────────
  function startSim() {
    SensorSim.on('wrongside', data => {
      onAlert?.(data);
      if (data.active && !alertActive && Date.now() > alertCooldown) {
        triggerAlert();
      } else if (!data.active) {
        alertActive = false;
      }
    });
  }

  function start(callback) {
    active = true;
    onAlert = callback;
    const hasGeo = 'geolocation' in navigator;
    if (hasGeo) startReal();
    startSim(); // Always also attach sim for demo overlay
  }

  function setExpectedBearing(bearing) { expectedBearing = bearing; }
  function stop() { active = false; }

  return { start, stop, setExpectedBearing };
})();
