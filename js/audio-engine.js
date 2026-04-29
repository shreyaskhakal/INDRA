/* ============================================================
   PROJECT INDRA — AUDIO ENGINE
   Web Audio API synthetic alert sounds (no file dependencies)
   ============================================================ */

window.IndraAudio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ── Tesla-Coil Drowsiness Alert (high-freq oscillating) ──
  function teslaDrowsiness() {
    const ac = getCtx();
    const now = ac.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now + i * 0.25);
      osc.frequency.exponentialRampToValueAtTime(440, now + i * 0.25 + 0.2);
      gain.gain.setValueAtTime(0.4, now + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.22);
      osc.start(now + i * 0.25);
      osc.stop(now + i * 0.25 + 0.25);
    }
  }

  // ── Collision Warning (urgent beep sequence) ──
  function collisionWarning() {
    const ac = getCtx();
    const now = ac.currentTime;
    [0, 0.15, 0.30, 0.45, 0.6].forEach((t, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'square';
      osc.frequency.value = 1200 + i * 80;
      gain.gain.setValueAtTime(0.3, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.12);
      osc.start(now + t);
      osc.stop(now + t + 0.14);
    });
  }

  // ── SOS / Dead Man's Switch (low urgent tone) ──
  function sosAlert() {
    const ac = getCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gain.gain.setValueAtTime(0.5, now + 0.8);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);
    osc.start(now); osc.stop(now + 1.1);
  }

  // ── Pothole Detected (subtle thud) ──
  function potholeDetected() {
    const ac = getCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.start(now); osc.stop(now + 0.2);
  }

  // ── Wrong-Side Alert (warbling siren) ──
  function wrongSideAlert() {
    const ac = getCtx();
    const now = ac.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now + i * 0.4);
      osc.frequency.linearRampToValueAtTime(800, now + i * 0.4 + 0.2);
      osc.frequency.linearRampToValueAtTime(400, now + i * 0.4 + 0.4);
      gain.gain.setValueAtTime(0.35, now + i * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.4 + 0.38);
      osc.start(now + i * 0.4);
      osc.stop(now + i * 0.4 + 0.4);
    }
  }

  // ── Countdown Tick ──
  function tick() {
    const ac = getCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now); osc.stop(now + 0.07);
  }

  return { teslaDrowsiness, collisionWarning, sosAlert, potholeDetected, wrongSideAlert, tick };
})();
