# 🌱 Smart Reward-Based Waste Management System

A full-stack prototype that solves urban waste overflow with IoT sensors, AI classification, gamified rewards, and intelligent truck dispatch.

## Quick Start

```bash
cd smart-waste
npm install
npm start          # → http://localhost:3000
# or use a custom port:
PORT=3001 node server.js
```

---

## Project Structure

```
smart-waste/
├── server.js          # Express REST API + sensor simulation
├── aiClassifier.js    # AI waste classification engine
├── db.js              # In-memory data store (bins, users, trucks)
├── package.json
└── public/
    └── index.html     # Full SPA dashboard (Citizen + Admin)
```

---

## Features

### 🗑️ Smart Bin Sensor Simulation
- 6 smart bins across city locations (general, recyclable, organic, hazardous)
- Fill levels auto-increment every 8 seconds (simulating IoT sensors)
- Real-time fill percentage tracked per bin

### 📱 Citizen QR Code Disposal
- Citizens identify via QR code scan
- Test QR codes: `QR-ALICE-001`, `QR-BOB-002`, `QR-CAROL-003`
- Waste description submitted through the portal

### 🤖 AI Waste Classification
- Keyword-pattern NLP classifier (upgradeable to TensorFlow/ML model)
- Classifies waste into: **recyclable, organic, hazardous, general**
- Returns confidence score, destination facility, and eco recommendations

### ⭐ Reward Points System
| Waste Type  | Points | Destination              |
|-------------|--------|--------------------------|
| Recyclable  | +15    | Recycling Center         |
| Organic     | +10    | Composting Facility      |
| Hazardous   | +20    | Hazardous Waste Facility |
| General     | +5     | General Landfill         |
| Mismatch    | +2     | (Penalty for wrong bin)  |

**Badges earned automatically:**
- 🌱 Recycler → 100 points
- 🦸 Green Hero → 200 points
- 🏆 Eco Champion → 500 points

### 🚛 Intelligent Truck Dispatch
- Alerts triggered when any bin reaches **80% fill level**
- Nearest idle truck auto-assigned to the route
- Trucks set back to `idle` once bin is emptied
- Eliminates unnecessary collection trips

### ♻️ Environmental Tracking
- CO₂ saved calculated per kg of waste type
- Waste breakdown by category
- Total compost and recyclable material tracked

---

## REST API Reference

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| GET    | `/api/bins`               | All bins with current fill levels  |
| GET    | `/api/bins/:id`           | Single bin details                 |
| POST   | `/api/bins/:id/empty`     | Mark bin as emptied (truck action) |
| POST   | `/api/dispose`            | Citizen waste disposal             |
| POST   | `/api/classify`           | AI classify without disposal       |
| GET    | `/api/users`              | Leaderboard (sorted by points)     |
| GET    | `/api/users/qr/:qrCode`   | Lookup user by QR code             |
| GET    | `/api/alerts`             | Truck dispatch alerts              |
| GET    | `/api/trucks`             | Truck fleet status                 |
| GET    | `/api/disposals`          | Recent disposal log                |
| GET    | `/api/stats`              | System-wide statistics             |

### Example: Dispose Waste
```bash
curl -X POST http://localhost:3000/api/dispose \
  -H "Content-Type: application/json" \
  -d '{
    "qrCode": "QR-ALICE-001",
    "binId": "BIN-002",
    "wasteDescription": "empty plastic bottle",
    "weightKg": 0.3
  }'
```

### Example: AI Classify Only
```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"wasteDescription": "old car battery", "weightKg": 2.0}'
```

---

## Production Upgrades

| Component        | Current (Prototype)     | Production Upgrade           |
|-----------------|-------------------------|------------------------------|
| Database        | In-memory JS objects    | MongoDB / PostgreSQL         |
| AI Classifier   | Keyword NLP             | TensorFlow.js / PyTorch API  |
| Sensor data     | setInterval simulation  | MQTT / IoT broker (HiveMQ)   |
| QR Codes        | Static strings          | Dynamic UUID generation      |
| Notifications   | In-memory alerts        | Firebase / Twilio SMS        |
| Maps            | Location text only      | Google Maps / Leaflet.js     |
| Auth            | QR only                 | JWT + OAuth2                 |

---

## Dashboard Pages

1. **Dashboard** — Live stats, CO₂ saved, waste breakdown chart
2. **Smart Bins** — All bin fill levels, empty button for trucks
3. **Dispose Waste** — Citizen QR scan portal with AI result
4. **Leaderboard** — Points ranking + badges
5. **Alerts** — Truck dispatch log + fleet status
6. **How It Works** — System flow + architecture overview
