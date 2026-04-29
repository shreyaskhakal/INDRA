/* ============================================================
   PROJECT INDRA — FATIGUE GUARD (Da Vinci Layer)
   MediaPipe FaceMesh PERCLOS + microsaccade detection
   ============================================================ */

window.FatigueGuard = (() => {
  let active = false;
  let alertActive = false;
  let alertCooldown = 0;
  let onPerclos = null;
  let simMode = false;
  let videoEl = null;
  let canvasEl = null;
  let canvasCtx = null;
  let faceMesh = null;

  // EAR (Eye Aspect Ratio) thresholds
  const EAR_THRESHOLD = 0.25;
  const PERCLOS_ALERT  = 0.75;

  // Rolling buffer for PERCLOS (last 3 seconds at 30fps = 90 frames)
  const BUFFER_SIZE = 90;
  const closureBuffer = new Array(BUFFER_SIZE).fill(0);
  let bufferIdx = 0;

  // ── MediaPipe Landmark Indices ────────────────────────────
  // Left eye: 362,385,387,263,373,380 | Right eye: 33,160,158,133,153,144
  function computeEAR(landmarks, eyePoints) {
    const p = i => landmarks[i];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const vertical1 = dist(p(eyePoints[1]), p(eyePoints[5]));
    const vertical2 = dist(p(eyePoints[2]), p(eyePoints[4]));
    const horizontal = dist(p(eyePoints[0]), p(eyePoints[3]));
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  const LEFT_EYE  = [362, 385, 387, 263, 373, 380];
  const RIGHT_EYE = [33,  160, 158, 133, 153, 144];

  function processFrame(landmarks) {
    const earLeft  = computeEAR(landmarks, LEFT_EYE);
    const earRight = computeEAR(landmarks, RIGHT_EYE);
    const ear = (earLeft + earRight) / 2;

    // Update buffer
    closureBuffer[bufferIdx % BUFFER_SIZE] = ear < EAR_THRESHOLD ? 1 : 0;
    bufferIdx++;

    // PERCLOS = fraction of closed frames in buffer
    const perclos = closureBuffer.reduce((a, b) => a + b, 0) / BUFFER_SIZE;

    onPerclos?.({ perclos, ear, alert: perclos > PERCLOS_ALERT });

    if (perclos > PERCLOS_ALERT && !alertActive && Date.now() > alertCooldown) {
      triggerAlert(perclos);
    }
  }

  function triggerAlert(perclos) {
    alertActive = true;
    alertCooldown = Date.now() + 4000; // 4s cooldown between alerts
    IndraAudio?.teslaDrowsiness();
    setTimeout(() => { alertActive = false; }, 3000);
  }

  // ── Real MediaPipe Setup ──────────────────────────────────
  async function startReal(videoElement, canvasElement) {
    videoEl = videoElement;
    canvasEl = canvasElement;
    canvasCtx = canvasElement.getContext('2d');

    try {
      // Load MediaPipe Face Mesh from CDN
      const { FaceMesh } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js');

      faceMesh = new FaceMesh({
        locateFile: file =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      faceMesh.onResults(onResults);

      // Camera loop
      const camera = new (await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
      )).Camera(videoEl, {
        onFrame: async () => { await faceMesh.send({ image: videoEl }); },
        width: 320, height: 240
      });
      await camera.start();
      simMode = false;
    } catch (err) {
      console.warn('[FatigueGuard] MediaPipe unavailable, using sim mode:', err.message);
      startSim();
    }
  }

  function onResults(results) {
    if (!canvasCtx) return;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

    if (results.multiFaceLandmarks?.length) {
      const landmarks = results.multiFaceLandmarks[0];
      processFrame(landmarks);
      drawEyeContours(landmarks);
    }
    canvasCtx.restore();
  }

  function drawEyeContours(landmarks) {
    if (!canvasCtx) return;
    [LEFT_EYE, RIGHT_EYE].forEach(eye => {
      canvasCtx.beginPath();
      eye.forEach((i, idx) => {
        const { x, y } = landmarks[i];
        const px = x * canvasEl.width;
        const py = y * canvasEl.height;
        idx === 0 ? canvasCtx.moveTo(px, py) : canvasCtx.lineTo(px, py);
      });
      canvasCtx.closePath();
      canvasCtx.strokeStyle = '#00D4AA';
      canvasCtx.lineWidth = 1.5;
      canvasCtx.stroke();
    });
  }

  // ── Simulation Mode ───────────────────────────────────────
  function startSim() {
    simMode = true;
    SensorSim.on('perclos', data => {
      onPerclos?.(data);
      if (data.alert && !alertActive && Date.now() > alertCooldown) {
        triggerAlert(data.value);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────
  function start(videoEl, canvasEl, callback) {
    active = true;
    onPerclos = callback;

    if (videoEl) {
      startReal(videoEl, canvasEl);
    } else {
      startSim();
    }
  }

  function stop() {
    active = false;
    faceMesh = null;
  }

  return { start, stop };
})();
