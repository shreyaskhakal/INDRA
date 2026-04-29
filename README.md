# Project Indra ⚡

> **Hackathon Build** — IITM × MoRTH Road Safety Challenge

AI-powered road safety co-pilot reducing fatalities on Indian roads. A dual-interface PWA: a Driver's HUD and an Authority Dashboard.

---

## 🚀 Live Demo

Open `index.html` via any local server — no build step required.

```bash
npx serve . -p 5500
# → http://localhost:5500
```

---

## 📱 Pages

| Page | Description |
|---|---|
| `/index.html` | Landing page with animated particle network |
| `/pages/hud.html` | Driver Co-Pilot HUD |
| `/pages/dashboard.html` | NHAI Authority Dashboard |

---

## 🧠 Feature Modules (`/js`)

| Module | PRD Layer | What it does |
|---|---|---|
| `physics-engine.js` | Einstein/Tesla | Collision vector — stopping distance via IMU G-force |
| `fatigue-guard.js` | Da Vinci | MediaPipe FaceMesh PERCLOS + microsaccade detection |
| `pothole-mapper.js` | Indian Engineer | Z-axis jerk → GPS tag → offline queue → sync |
| `dead-mans-switch.js` | Torvalds | 4G impact → 10-sec countdown → SOS to trauma centres |
| `wrong-side.js` | Indian Edge Case | Compass + GPS heading vs road direction |
| `sensor-sim.js` | Demo | Cycles through 5 real-world scenarios for judges |
| `audio-engine.js` | — | Synthetic Web Audio API alerts (no MP3 files) |
| `mock-data.js` | — | 180 pre-seeded potholes across Bangalore corridors |

---

## 🎬 Demo Scenarios (HUD)

Click the buttons at the bottom of the HUD:

- 🟢 **Normal** — steady driving
- 😴 **Drowsy** — PERCLOS climbs → Tesla-coil audio alert
- 🛑 **Hard Brake** — G-force spikes → collision warning overlay
- 🕳️ **Pothole Zone** — Z-jerk events → live map updates
- 🔄 **Wrong Side** — heading deviation → siren alert
- 💥 **4G Impact** — Dead Man's Switch 10-sec countdown modal

---

## 🏗️ Architecture

```
PWA (Progressive Web App)
├── On-device AI (MediaPipe Face Mesh)
├── Browser Sensor APIs (DeviceMotion, DeviceOrientation, Geolocation)
├── Leaflet + OpenStreetMap (free, no API key)
├── Web Audio API (synthetic alerts)
└── localStorage → offline pothole queue → sync on reconnect
```

**Latency target:** < 150ms for all safety-critical alerts  
**Hardware cost:** ₹0 (uses existing smartphone)  
**Offline:** Full PWA cache + background sync via Service Worker

---

## 📊 Success Metrics

| Metric | Target |
|---|---|
| Pothole Detection Accuracy | > 92% |
| Drowsiness Detection Accuracy | > 95% |
| Alert Latency | < 200ms |
| Hardware Cost | ₹0 |

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — zero build toolchain
- **AI:** MediaPipe Face Mesh (CDN, on-device)
- **Maps:** Leaflet.js + CartoDB Dark Matter tiles
- **Storage:** localStorage (offline) → Firebase Firestore (production)
- **Alerts:** Web Audio API (procedural synthesis)
- **PWA:** Service Worker + Web App Manifest

---

*Built for the IITM × MoRTH Road Safety Hackathon*
