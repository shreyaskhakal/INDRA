/* ============================================================
   PROJECT INDRA — POTHOLE MAPPER (Indian Engineer Layer)
   Z-axis jerk detection + GPS tagging + offline queue
   ============================================================ */

window.PotholeMapper = (() => {
  const JERK_THRESHOLD = 2.5;   // G equivalent
  const MIN_INTERVAL_MS = 1500; // Debounce between detections

  let lastDetection = 0;
  let currentPos = { lat: 12.9716, lng: 77.5946 };
  let onDetect = null;
  let tripData = [];

  // ── GPS Tracking ─────────────────────────────────────────
  function startGPS() {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        pos => { currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {},
        { enableHighAccuracy: true, maximumAge: 2000 }
      );
    }
  }

  // ── Jerk Detection ────────────────────────────────────────
  function detect(zAccelG) {
    const now = Date.now();
    if (Math.abs(zAccelG) < JERK_THRESHOLD) return;
    if (now - lastDetection < MIN_INTERVAL_MS) return;

    lastDetection = now;
    const event = {
      id:        now,
      lat:       currentPos.lat + (Math.random() - 0.5) * 0.0002,
      lng:       currentPos.lng + (Math.random() - 0.5) * 0.0002,
      magnitude: Math.abs(zAccelG),
      severity:  Math.abs(zAccelG) > 4 ? 'severe' : Math.abs(zAccelG) > 3 ? 'moderate' : 'minor',
      timestamp: new Date().toISOString(),
      synced:    false,
    };

    tripData.push(event);
    saveToQueue(event);
    onDetect?.(event);
    IndraAudio?.potholeDetected();
    attemptSync();
  }

  // ── Offline Queue (localStorage) ─────────────────────────
  function saveToQueue(event) {
    const queue = JSON.parse(localStorage.getItem('indra_potholes') || '[]');
    queue.push(event);
    localStorage.setItem('indra_potholes', JSON.stringify(queue));
  }

  function getQueue() {
    return JSON.parse(localStorage.getItem('indra_potholes') || '[]');
  }

  function attemptSync() {
    if (!navigator.onLine) return;
    const queue = getQueue().filter(p => !p.synced);
    if (!queue.length) return;

    // Production: POST to Firebase / backend
    // Demo: mark as synced
    const all = getQueue().map(p => ({ ...p, synced: true }));
    localStorage.setItem('indra_potholes', JSON.stringify(all));
  }

  // ── Attach to SensorSim ───────────────────────────────────
  function startSim() {
    SensorSim.on('pothole', event => {
      currentPos = { lat: event.lat, lng: event.lng };
      detect(event.magnitude);
    });
    SensorSim.on('gps', pos => { currentPos = pos; });
  }

  // ── Road Health Scoring ───────────────────────────────────
  function roadHealthScore(potholes, segmentLengthKm = 1) {
    const count = potholes.length;
    const severePenalty = potholes.filter(p => p.severity === 'severe').length * 2;
    const total = count + severePenalty;
    if (total === 0) return { score: 100, color: 'green', label: 'Good' };
    if (total <= 2) return { score: 70,  color: 'yellow', label: 'Fair' };
    if (total <= 5) return { score: 40,  color: 'orange', label: 'Poor' };
    return             { score: 10,  color: 'red',    label: 'Critical' };
  }

  // ── Trip Summary ──────────────────────────────────────────
  function getTripSummary() {
    return {
      count: tripData.length,
      severe:   tripData.filter(p => p.severity === 'severe').length,
      moderate: tripData.filter(p => p.severity === 'moderate').length,
      minor:    tripData.filter(p => p.severity === 'minor').length,
    };
  }

  function start(callback) {
    onDetect = callback;
    startGPS();
    startSim();

    // React to connectivity restore
    window.addEventListener('online', attemptSync);
  }

  return { start, detect, getQueue, roadHealthScore, getTripSummary };
})();
