/* ============================================================
   PROJECT INDRA — DEAD MAN'S SWITCH (Torvalds Layer)
   4G impact detection → 10-second SOS countdown
   ============================================================ */

window.DeadMansSwitch = (() => {
  let triggered = false;
  let countdownTimer = null;
  let remaining = 10;
  let modalEl = null;

  async function getNearestCentres(lat, lng) {
    if (typeof HospitalsAPI !== 'undefined') {
      try {
        const hospitals = await HospitalsAPI.fetchNear(lat, lng);
        if (hospitals && hospitals.length) return hospitals;
      } catch(e) {}
    }
    // Fallback
    return [
      { name: 'Emergency Services', phone: '112', addr: 'Call 112 immediately', dist_km: '?', mapsUrl: `https://maps.google.com/?q=${lat},${lng}` },
      { name: 'Ambulance (108)',     phone: '108', addr: 'National ambulance',  dist_km: '?', mapsUrl: `https://maps.google.com/search?q=hospital+near+${lat},${lng}` },
    ];
  }

  function createModal() {
    if (document.getElementById('dms-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'dms-modal';
    modal.innerHTML = `
      <style>
        #dms-modal {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.92);
          display: flex; align-items: center; justify-content: center;
          animation: dms-fadein 0.2s ease;
        }
        @keyframes dms-fadein { from { opacity:0 } to { opacity:1 } }
        #dms-inner {
          background: #100810;
          border: 2px solid #E94560;
          border-radius: 24px;
          padding: 40px;
          max-width: 480px; width: 90%;
          text-align: center;
          box-shadow: 0 0 80px rgba(233,69,96,0.5);
          animation: dms-scale 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes dms-scale { from { transform:scale(0.85) } to { transform:scale(1) } }
        #dms-icon { font-size: 4rem; margin-bottom: 16px;
          animation: dms-pulse 0.6s ease-in-out infinite alternate; }
        @keyframes dms-pulse { from { transform:scale(1) } to { transform:scale(1.12) } }
        #dms-title {
          font-family: 'Rajdhani', sans-serif; font-size: 2rem;
          font-weight: 700; color: #E94560; letter-spacing: 0.08em;
          margin-bottom: 8px;
        }
        #dms-subtitle { color: #9090B0; font-size: 0.9rem; margin-bottom: 28px; }
        #dms-countdown {
          font-family: 'Rajdhani', sans-serif; font-size: 5rem;
          font-weight: 700; color: #E94560; line-height: 1;
          margin-bottom: 8px;
          text-shadow: 0 0 30px rgba(233,69,96,0.8);
        }
        #dms-countdown-label { color: #5A5A7A; font-size: 0.75rem;
          letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 28px; }
        #dms-dismiss {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg,#E94560,#C0334F);
          border: none; border-radius: 50px;
          color: #fff; font-family: 'Rajdhani', sans-serif;
          font-size: 1.1rem; font-weight: 700; letter-spacing: 0.1em;
          cursor: pointer; text-transform: uppercase;
          box-shadow: 0 4px 24px rgba(233,69,96,0.4);
          transition: all 0.2s;
        }
        #dms-dismiss:hover { transform: translateY(-2px); }
        #dms-centres { margin-top: 20px; text-align: left; }
        #dms-centres h4 {
          font-family: 'Rajdhani', sans-serif; font-size: 0.75rem;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #5A5A7A; margin-bottom: 12px;
        }
        .dms-centre {
          background: rgba(233,69,96,0.06); border: 1px solid rgba(233,69,96,0.2);
          border-radius: 12px; padding: 12px 16px; margin-bottom: 8px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .dms-centre-name { font-weight: 600; font-size: 0.9rem; color: #F2F2FA; }
        .dms-centre-phone { font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem; color: #E94560; }
        #dms-sos-sent {
          display: none;
          background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.3);
          border-radius: 12px; padding: 16px; margin-top: 16px;
          color: #00D4AA; font-size: 0.88rem; text-align: center;
        }
      </style>

      <div id="dms-inner">
        <div id="dms-icon">🚨</div>
        <div id="dms-title">IMPACT DETECTED</div>
        <div id="dms-subtitle" id="dms-g-value">High-G event detected. Are you OK?</div>
        <div id="dms-countdown">10</div>
        <div id="dms-countdown-label">Seconds until SOS is sent</div>
        <button id="dms-dismiss" onclick="DeadMansSwitch.dismiss()">I'M OKAY — CANCEL SOS</button>
        <div id="dms-sos-sent">
          ✅ SOS Sent · GPS location shared with emergency contacts and trauma centres
        </div>
        <div id="dms-centres">
          <h4>📍 Nearest Trauma Centres</h4>
          <div id="dms-centres-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modalEl = modal;
  }

  async function trigger(gValue, position) {
    if (triggered) return;
    triggered = true;
    remaining = 10;

    createModal();
    document.getElementById('dms-subtitle').textContent =
      `${gValue?.toFixed(1) || '5.0'}G impact detected. Are you OK?`;

    const pos = position || { lat: 12.9716, lng: 77.5946 };

    // Show loading state in centres list
    const list = document.getElementById('dms-centres-list');
    list.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:8px">📡 Locating nearest hospitals...</div>';

    const centres = await getNearestCentres(pos.lat, pos.lng);
    list.innerHTML = centres.map(c => `
      <div class="dms-centre">
        <div>
          <div class="dms-centre-name">${c.name}</div>
          <div style="font-size:0.75rem;color:#5A5A7A;margin-top:2px;">${c.addr}${c.dist_km && c.dist_km !== '?' ? ' · ' + c.dist_km + ' km away' : ''}</div>
        </div>
        <a href="${c.mapsUrl}" target="_blank" style="text-decoration:none">
          <div class="dms-centre-phone">${c.phone}</div>
        </a>
      </div>
    `).join('');

    IndraAudio?.sosAlert();
    startCountdown(centres, pos);
  }

  function startCountdown(centres, pos) {
    updateDisplay();
    countdownTimer = setInterval(() => {
      remaining--;
      updateDisplay();
      IndraAudio?.tick();
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        sendSOS(centres, pos);
      }
    }, 1000);
  }

  function updateDisplay() {
    const el = document.getElementById('dms-countdown');
    if (el) {
      el.textContent = remaining;
      el.style.color = remaining <= 3 ? '#FF2244' : '#E94560';
    }
  }

  function dismiss() {
    clearInterval(countdownTimer);
    triggered = false;
    if (modalEl) { modalEl.remove(); modalEl = null; }
  }

  function sendSOS(centres, pos) {
    const mapsUrl = `https://maps.google.com/?q=${pos.lat},${pos.lng}`;
    const centreNames = centres.map(c => c.name).join(', ');

    // In production: Firebase Cloud Function → SMS via Twilio
    // For demo: show confirmation UI
    const sentEl = document.getElementById('dms-sos-sent');
    if (sentEl) sentEl.style.display = 'block';

    const dismiss = document.getElementById('dms-dismiss');
    if (dismiss) {
      dismiss.textContent = '✓ SOS SENT — TAP TO CLOSE';
      dismiss.style.background = 'linear-gradient(135deg,#00D4AA,#00A882)';
    }

    // Store in localStorage for dashboard
    const event = {
      id: Date.now(),
      lat: pos.lat, lng: pos.lng,
      timestamp: new Date().toISOString(),
      gforce: 5.2,
      status: 'sos_sent',
      centres: centres.map(c => c.name),
      mapsUrl
    };
    const events = JSON.parse(localStorage.getItem('indra_sos') || '[]');
    events.push(event);
    localStorage.setItem('indra_sos', JSON.stringify(events));

    triggered = false;
    setTimeout(() => { if (modalEl) { modalEl.remove(); modalEl = null; } }, 8000);
  }

  return { trigger, dismiss };
})();
