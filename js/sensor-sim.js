/* ============================================================
   PROJECT INDRA — SENSOR SIMULATION ENGINE
   Realistic demo data for hackathon judges on desktop
   ============================================================ */

window.SensorSim = (() => {
  const listeners = {};
  let simInterval = null;
  let scenario = 'normal';
  let tick = 0;

  // Subscribe to simulated sensor events
  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  }
  function emit(event, data) {
    (listeners[event] || []).forEach(cb => cb(data));
  }

  // Noise utility
  function noise(scale = 1) { return (Math.random() - 0.5) * 2 * scale; }
  function smoothNoise(prev, target, factor = 0.15) {
    return prev + (target - prev) * factor;
  }

  // ── State ────────────────────────────────────────────────
  const state = {
    speed: 45,          // km/h
    gforce: 0.05,       // G
    perclos: 0.1,       // 0-1
    heading: 180,       // degrees
    expectedHeading: 180,
    lat: 12.9716,       // Bangalore
    lng: 77.5946,
    zAccel: 0,
    alertActive: false,
    lastPothole: 0,
  };

  // ── Scenario Controller ──────────────────────────────────
  const SCENARIOS = ['normal', 'drowsy', 'hardbrak', 'pothole', 'wrongside'];
  let scenarioIdx = 0;

  function nextScenario() {
    scenarioIdx = (scenarioIdx + 1) % SCENARIOS.length;
    scenario = SCENARIOS[scenarioIdx];
    emit('scenario', { name: scenario });
  }

  // Auto-cycle through scenarios every 12 seconds for demo
  function startAutoCycle() {
    setInterval(nextScenario, 12000);
  }

  // ── Main Simulation Loop (runs at 30fps) ────────────────
  function start() {
    if (simInterval) return;
    startAutoCycle();

    simInterval = setInterval(() => {
      tick++;
      updateState();
      emitAll();
    }, 33);
  }

  function stop() {
    clearInterval(simInterval);
    simInterval = null;
  }

  function updateState() {
    const t = tick * 0.033; // time in seconds

    switch (scenario) {
      case 'normal':
        state.speed = 45 + Math.sin(t * 0.3) * 8 + noise(2);
        state.gforce = 0.05 + Math.abs(noise(0.04));
        state.perclos = 0.08 + Math.abs(noise(0.05));
        state.zAccel = noise(0.3);
        state.heading = smoothNoise(state.heading, state.expectedHeading + noise(5), 0.05);
        break;

      case 'drowsy':
        state.speed = 38 + noise(3);
        state.gforce = 0.04 + Math.abs(noise(0.02));
        // Eye closure builds up slowly
        state.perclos = Math.min(0.95, state.perclos + 0.012 + noise(0.005));
        state.zAccel = noise(0.2);
        state.heading = smoothNoise(state.heading, state.expectedHeading + noise(8), 0.03);
        break;

      case 'hardbrak':
        state.speed = Math.max(0, 80 - tick * 0.4 + noise(2));
        // High G during braking
        state.gforce = 0.65 + Math.abs(Math.sin(t * 8) * 0.3) + noise(0.1);
        state.perclos = 0.1 + Math.abs(noise(0.06));
        state.zAccel = noise(0.4);
        state.heading = smoothNoise(state.heading, state.expectedHeading, 0.1);
        break;

      case 'pothole':
        state.speed = 52 + noise(4);
        state.gforce = 0.1 + Math.abs(noise(0.05));
        state.perclos = 0.1 + Math.abs(noise(0.05));
        // Simulate pothole jerk every ~2 seconds
        if (tick % 60 === 0) {
          state.zAccel = (Math.random() > 0.5 ? 1 : -1) * (3.5 + Math.random() * 2);
          const now = Date.now();
          if (now - state.lastPothole > 1500) {
            state.lastPothole = now;
            emit('pothole', {
              lat: state.lat + noise(0.0005),
              lng: state.lng + noise(0.0005),
              magnitude: Math.abs(state.zAccel),
              timestamp: now,
            });
          }
        } else {
          state.zAccel = smoothNoise(state.zAccel, 0, 0.4);
        }
        state.heading = smoothNoise(state.heading, state.expectedHeading, 0.08);
        break;

      case 'wrongside':
        state.speed = 60 + noise(5);
        state.gforce = 0.08 + Math.abs(noise(0.03));
        state.perclos = 0.12 + Math.abs(noise(0.05));
        state.zAccel = noise(0.3);
        // Heading drifts wrong way (opposite of expected)
        state.heading = smoothNoise(state.heading, state.expectedHeading + 160 + noise(10), 0.04);
        break;
    }

    // Advance GPS position slightly
    const speedMs = (state.speed / 3.6) * 0.033;
    const headRad = state.heading * Math.PI / 180;
    state.lat += (speedMs / 111320) * Math.cos(headRad);
    state.lng += (speedMs / (111320 * Math.cos(state.lat * Math.PI / 180))) * Math.sin(headRad);
  }

  function emitAll() {
    emit('motion', {
      gforce:  Math.max(0, state.gforce + noise(0.02)),
      zAccel:  state.zAccel,
      speed:   Math.max(0, state.speed),
    });
    emit('gps', {
      lat:     state.lat,
      lng:     state.lng,
      heading: state.heading,
      speed:   state.speed,
    });
    emit('perclos', {
      value:   Math.max(0, Math.min(1, state.perclos)),
      alert:   state.perclos > 0.75,
    });
    // Wrong-side check
    const headingDiff = Math.abs(((state.heading - state.expectedHeading) + 180) % 360 - 180);
    emit('wrongside', {
      active:      headingDiff > 140,
      headingDiff: headingDiff,
    });
  }

  // Force a specific scenario
  function setScenario(name) {
    scenario = name;
    // Reset perclos when leaving drowsy
    if (name !== 'drowsy') state.perclos = 0.1;
    emit('scenario', { name });
  }

  // Trigger manual impact (for Dead Man's Switch demo)
  function triggerImpact(gValue = 5.2) {
    emit('impact', { gforce: gValue, lat: state.lat, lng: state.lng });
  }

  return { on, emit, start, stop, setScenario, triggerImpact, state };
})();
