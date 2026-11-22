/**
 * Smart Reward-Based Waste Management System
 * REST API Server — Bengaluru Edition
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { bins, users, trucks, societies, areas, emergencyRequests, alerts, disposals, stats, uuidv4 } = require('./db');
const { classifyWaste } = require('./aiClassifier');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FILL_ALERT_THRESHOLD = 80;   // %
const PRESORT_BONUS        = 25;   // extra pts for pre-sorted disposal
const POINTS_FOR_BADGES    = { 'Recycler': 100, 'Green Hero': 200, 'Eco Champion': 500 };

// ─────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────
function checkAndAwardBadges(user) {
  for (const [badge, threshold] of Object.entries(POINTS_FOR_BADGES)) {
    if (user.points >= threshold && !user.badges.includes(badge)) {
      user.badges.push(badge);
    }
  }
}

function triggerTruckAlert(bin) {
  if (!bin.alertSent) {
    bin.alertSent = true;
    const alert = {
      id: uuidv4(),
      binId: bin.id,
      location: bin.location,
      fillLevel: bin.fillLevel,
      type: bin.type,
      societyId: bin.societyId,
      areaId: bin.areaId,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    alerts.unshift(alert);
    const idleTruck = trucks.find(t => t.status === 'idle');
    if (idleTruck) {
      idleTruck.status = 'dispatched';
      idleTruck.currentRoute = [bin.id];
      alert.assignedTruck = idleTruck.id;
    }
    console.log(`[ALERT] Bin ${bin.id} at ${bin.location} is ${bin.fillLevel}% full → truck dispatched`);
    return alert;
  }
  return null;
}

function updateAreaPoints(areaId, pts) {
  const area = areas.find(a => a.id === areaId);
  if (area) {
    area.totalPoints += pts;
    area.cleanliness = Math.min(100, area.cleanliness + (pts > 0 ? 0.02 : 0));
    area.healthScore  = Math.min(100, area.healthScore  + (pts > 0 ? 0.015 : 0));
  }
}

function updateSocietyPoints(societyId, pts) {
  const soc = societies.find(s => s.id === societyId);
  if (soc) soc.totalPoints += pts;
}

// ─────────────────────────────────────────────
//  SENSOR SIMULATION
// ─────────────────────────────────────────────
setInterval(() => {
  bins.forEach(bin => {
    if (bin.fillLevel < 100) {
      bin.fillLevel = Math.min(100, bin.fillLevel + Math.floor(Math.random() * 4));
      if (bin.fillLevel >= FILL_ALERT_THRESHOLD) triggerTruckAlert(bin);
    }
  });
}, 8000);

// ─────────────────────────────────────────────
//  BINS
// ─────────────────────────────────────────────
app.get('/api/bins', (req, res) => res.json(bins));

app.get('/api/bins/:id', (req, res) => {
  const bin = bins.find(b => b.id === req.params.id);
  if (!bin) return res.status(404).json({ error: 'Bin not found' });
  res.json(bin);
});

app.post('/api/bins/:id/empty', (req, res) => {
  const bin = bins.find(b => b.id === req.params.id);
  if (!bin) return res.status(404).json({ error: 'Bin not found' });
  bin.fillLevel   = 0;
  bin.alertSent   = false;
  bin.lastEmptied = new Date().toISOString();
  trucks.forEach(t => {
    if (t.currentRoute.includes(bin.id)) {
      t.currentRoute = t.currentRoute.filter(r => r !== bin.id);
      if (t.currentRoute.length === 0) t.status = 'idle';
    }
  });
  // Resolve matching alert
  const alert = alerts.find(a => a.binId === bin.id && a.status === 'pending');
  if (alert) alert.status = 'resolved';
  res.json({ success: true, bin });
});

// ─────────────────────────────────────────────
//  USERS & LEADERBOARD
// ─────────────────────────────────────────────
app.get('/api/users', (req, res) => {
  res.json(
    users
      .map(u => ({ id: u.id, name: u.name, points: u.points, badges: u.badges, disposalCount: u.disposals.length, societyId: u.societyId, areaId: u.areaId, presortBonus: u.presortBonus }))
      .sort((a, b) => b.points - a.points)
  );
});

app.get('/api/users/qr/:qrCode', (req, res) => {
  const user = users.find(u => u.qrCode === req.params.qrCode);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ─────────────────────────────────────────────
//  DISPOSE (with pre-sort bonus)
// ─────────────────────────────────────────────
app.post('/api/dispose', (req, res) => {
  const { qrCode, binId, wasteDescription, weightKg = 0.5, preSorted = false } = req.body;
  if (!qrCode || !binId || !wasteDescription)
    return res.status(400).json({ error: 'qrCode, binId, and wasteDescription are required' });

  const user = users.find(u => u.qrCode === qrCode);
  if (!user) return res.status(404).json({ error: 'User not found. Please register.' });

  const bin = bins.find(b => b.id === binId);
  if (!bin) return res.status(404).json({ error: 'Bin not found.' });

  if (bin.fillLevel >= 95)
    return res.status(409).json({ error: 'Bin is full. Please use a nearby bin.' });

  const classification = classifyWaste(wasteDescription, weightKg);
  const typeMismatch   = bin.type !== 'general' && classification.wasteType !== bin.type;

  // Points: base + presort bonus + mismatch penalty
  let earnedPoints = typeMismatch ? 2 : classification.pointsEarned;
  let presortBonusAwarded = 0;
  if (preSorted && !typeMismatch) {
    presortBonusAwarded = PRESORT_BONUS;
    earnedPoints += presortBonusAwarded;
    user.presortBonus += presortBonusAwarded;
    stats.presortedDisposals += 1;
    stats.presortBonusTotal  += presortBonusAwarded;
  }

  user.points += earnedPoints;
  checkAndAwardBadges(user);

  // Update bin
  bin.fillLevel = Math.min(100, bin.fillLevel + Math.ceil(weightKg * 10));
  if (bin.fillLevel >= FILL_ALERT_THRESHOLD) triggerTruckAlert(bin);

  // Update stats
  stats.totalDisposals += 1;
  const statKey = `${classification.wasteType}Kg`;
  stats[statKey]    = parseFloat(((stats[statKey] || 0) + weightKg).toFixed(3));
  stats.co2Saved    = parseFloat((stats.co2Saved + classification.co2SavedKg).toFixed(3));

  // Propagate points to area & society
  updateAreaPoints(bin.areaId, earnedPoints);
  updateSocietyPoints(bin.societyId, earnedPoints);

  const disposal = {
    id: uuidv4(),
    userId: user.id, userName: user.name,
    binId, wasteDescription,
    classification: classification.wasteType,
    weightKg, pointsEarned: earnedPoints,
    presortBonusAwarded, co2SavedKg: classification.co2SavedKg,
    typeMismatch,
    timestamp: new Date().toISOString(),
  };
  disposals.unshift(disposal);
  user.disposals.unshift(disposal.id);

  let message = typeMismatch
    ? `⚠️ Waste type mismatch! Placed ${classification.wasteType} in a ${bin.type} bin. Only ${earnedPoints} pts awarded.`
    : presortBonusAwarded > 0
      ? `✅ Pre-sorted disposal! +${classification.pointsEarned} pts + ${presortBonusAwarded} pre-sort bonus = +${earnedPoints} pts`
      : `✅ Correct disposal! You earned ${earnedPoints} points.`;

  res.json({ success: true, message, classification, pointsEarned: earnedPoints, presortBonusAwarded, totalPoints: user.points, newBadges: user.badges, binFillLevel: bin.fillLevel, disposal });
});

// ─────────────────────────────────────────────
//  CLASSIFY
// ─────────────────────────────────────────────
app.post('/api/classify', (req, res) => {
  const { wasteDescription, weightKg = 0.5 } = req.body;
  if (!wasteDescription) return res.status(400).json({ error: 'wasteDescription is required' });
  res.json(classifyWaste(wasteDescription, weightKg));
});

// ─────────────────────────────────────────────
//  EMERGENCY COLLECTION REQUESTS (Society)
// ─────────────────────────────────────────────
app.get('/api/emergency', (req, res) => res.json(emergencyRequests.slice(0, 30)));

app.post('/api/emergency', (req, res) => {
  const { societyId, contactName, contactPhone, reason, urgency = 'high', binIds = [] } = req.body;
  if (!societyId || !contactName || !reason)
    return res.status(400).json({ error: 'societyId, contactName, and reason are required' });

  const society = societies.find(s => s.id === societyId);
  if (!society) return res.status(404).json({ error: 'Society not found' });

  const req_ = {
    id: uuidv4(),
    societyId,
    societyName: society.name,
    contactName,
    contactPhone: contactPhone || 'N/A',
    reason,
    urgency,         // 'critical' | 'high' | 'medium'
    binIds,          // specific bins, or empty = whole society
    status: 'pending',
    timestamp: new Date().toISOString(),
    assignedTruck: null,
    resolvedAt: null,
  };

  // Auto-assign truck for critical requests
  if (urgency === 'critical') {
    const idleTruck = trucks.find(t => t.status === 'idle');
    if (idleTruck) {
      idleTruck.status = 'dispatched';
      idleTruck.currentRoute = binIds.length ? binIds : [`${societyId}-SWEEP`];
      req_.assignedTruck = idleTruck.id;
    }
  }

  emergencyRequests.unshift(req_);
  console.log(`[EMERGENCY] ${society.name} — ${reason} (${urgency})`);
  res.json({ success: true, request: req_, message: urgency === 'critical' ? '🚨 Critical request! Truck dispatched immediately.' : '📋 Request logged. Truck will be dispatched within 2 hours.' });
});

app.post('/api/emergency/:id/resolve', (req, res) => {
  const er = emergencyRequests.find(r => r.id === req.params.id);
  if (!er) return res.status(404).json({ error: 'Request not found' });
  er.status     = 'resolved';
  er.resolvedAt = new Date().toISOString();
  if (er.assignedTruck) {
    const truck = trucks.find(t => t.id === er.assignedTruck);
    if (truck) { truck.status = 'idle'; truck.currentRoute = []; }
  }
  res.json({ success: true, request: er });
});

// ─────────────────────────────────────────────
//  SOCIETIES
// ─────────────────────────────────────────────
app.get('/api/societies', (req, res) => {
  const enriched = societies
    .map(s => ({
      ...s,
      binCount: bins.filter(b => b.societyId === s.id).length,
      fullBins: bins.filter(b => b.societyId === s.id && b.fillLevel >= 80).length,
      pendingEmergencies: emergencyRequests.filter(r => r.societyId === s.id && r.status === 'pending').length,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
  res.json(enriched);
});

// ─────────────────────────────────────────────
//  GOVT AREA COMPETITION LEAGUE
// ─────────────────────────────────────────────
app.get('/api/areas', (req, res) => {
  const ranked = [...areas]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((area, i) => ({
      ...area,
      rank: i + 1,
      societyCount: societies.filter(s => s.areaId === area.id).length,
      binCount:     bins.filter(b => b.areaId === area.id).length,
      fundLabel:    `₹${(area.funds / 1000).toFixed(0)}K`,
    }));
  res.json(ranked);
});

app.post('/api/areas/:id/award', (req, res) => {
  const area = areas.find(a => a.id === req.params.id);
  if (!area) return res.status(404).json({ error: 'Area not found' });
  const bonus = req.body.bonus || 25000;
  area.funds += bonus;
  res.json({ success: true, area, message: `₹${bonus.toLocaleString()} govt funds awarded to ${area.name}` });
});

// ─────────────────────────────────────────────
//  ALERTS & TRUCKS
// ─────────────────────────────────────────────
app.get('/api/alerts',    (req, res) => res.json(alerts.slice(0, 20)));
app.get('/api/trucks',    (req, res) => res.json(trucks));
app.get('/api/disposals', (req, res) => res.json(disposals.slice(0, 50)));

// ─────────────────────────────────────────────
//  STATS
// ─────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  res.json({
    ...stats,
    co2Saved: parseFloat(stats.co2Saved.toFixed(2)),
    activeBins: bins.length,
    fullBins: bins.filter(b => b.fillLevel >= FILL_ALERT_THRESHOLD).length,
    totalUsers: users.length,
    pendingAlerts: alerts.filter(a => a.status === 'pending').length,
    trucksDispatched: trucks.filter(t => t.status === 'dispatched').length,
    pendingEmergencies: emergencyRequests.filter(r => r.status === 'pending').length,
  });
});

// ─────────────────────────────────────────────
//  CHATBOT
// ─────────────────────────────────────────────
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  res.json({ reply: getChatReply(message.trim()) });
});

function getChatReply(msg) {
  const m = msg.toLowerCase();
  if (/^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening))/.test(m))
    return "👋 Hello! I'm EcoBot, your smart waste assistant for Bengaluru! Ask me about disposal, rewards, emergency requests, or the city competition. 🌱";
  if (m.includes('emergency') || m.includes('overflow') || m.includes('event') || m.includes('festival') || m.includes('urgent'))
    return "🚨 **Emergency Collection Request:**\nIf your society bin is overflowing or there's an event, go to **🏘️ Societies** tab → click **Request Emergency Collection**.\n\n**Urgency levels:**\n• 🔴 Critical — truck dispatched immediately\n• 🟠 High — within 2 hours\n• 🟡 Medium — within 4 hours\n\nThis prevents disease-breeding overflow during festivals like Ganesh Chaturthi, Diwali etc.";
  if (m.includes('competi') || m.includes('district') || m.includes('area') || m.includes('fund') || m.includes('prize') || m.includes('city'))
    return "🏆 **City Competition League:**\nAreas like Jayanagar, Koramangala, Indiranagar compete on cleanliness points.\n\n**Top areas earn:**\n• Extra govt sanitation funds (₹25K–₹1L bonus)\n• Health score improvements tracked vs Dengue/Malaria\n• Public recognition on the BBMP portal\n\nCheck the **🏆 Competition** tab to see live rankings!";
  if (m.includes('presort') || m.includes('pre-sort') || m.includes('pre sort') || m.includes('segregat') || m.includes('separate'))
    return "♻️ **Pre-Sorted Disposal Bonus (+25 pts):**\nWhen you separate your waste at home BEFORE coming to the bin, tick **'I pre-sorted this waste'** in the Dispose form.\n\n**You earn:**\n• Base points (5–20) + **+25 bonus pts**\n• Govt saves time & cost on sorting\n• Waste goes directly to right facility\n\nPre-sorted waste = faster recycling = less landfill!";
  if (m.includes('point') || m.includes('reward') || m.includes('earn'))
    return "⭐ **Earning Points:**\n• Recyclable → **+15 pts**\n• Organic → **+10 pts**\n• Hazardous → **+20 pts**\n• General → **+5 pts**\n• Pre-sorted bonus → **+25 extra pts**\n\nPoints help your area rank higher in the city competition, unlocking govt funds!";
  if (m.includes('badge') || m.includes('level') || m.includes('rank'))
    return "🏆 **Badges:**\n🌱 Recycler — 100 pts\n🦸 Green Hero — 200 pts\n🏆 Eco Champion — 500 pts";
  if (m.includes('recycl') || m.includes('plastic') || m.includes('paper') || m.includes('glass') || m.includes('metal') || m.includes('cardboard'))
    return "🔵 **Recyclable Waste:**\nPlastic, paper, glass, metal, cardboard, cans, cartons.\n📦 → Recycling Center\n⭐ **+15 pts** (or +40 with pre-sort bonus!)\n💡 Rinse containers, flatten boxes.";
  if (m.includes('organic') || m.includes('compost') || m.includes('food') || m.includes('fruit') || m.includes('vegetable'))
    return "🟢 **Organic Waste:**\nFood scraps, peels, coffee, garden waste.\n📦 → Composting Facility\n⭐ **+10 pts** (or +35 with pre-sort!)\n💡 Use compostable bags. No meat/dairy.";
  if (m.includes('medical') || m.includes('syringe') || m.includes('needle') || m.includes('bandage') || m.includes('tablet') || m.includes('capsule') || m.includes('hospital') || m.includes('expired medicine') || m.includes('blood') || m.includes('bio-medical') || m.includes('injection'))
    return "🟣 **Medical / Bio-Medical Waste — CRITICAL:**\nSyringes, needles, bandages, tablets, blood items, expired medicines, IV tubes, surgical gloves.\n📦 → **BBMP Bio-Medical Facility**\n⭐ **+30 pts** — highest reward!\n⚠️ **SEAL in RED/YELLOW bag first**\n📞 Helpline: 1800-425-0210\n🟣 Use PURPLE BIN (BIN-009 or BIN-010)";
  if (m.includes('hazard') || m.includes('battery') || m.includes('chemical') || m.includes('paint') || m.includes('electronic') || m.includes('e-waste'))
    return "🔴 **Hazardous Waste:**\nBatteries, e-waste, paints, pesticides, fluorescent bulbs.\n📦 → Hazardous Facility\n⭐ **+20 pts**\n⚠️ Never mix with regular waste.";
  if (m.includes('dengue') || m.includes('malaria') || m.includes('mosquito') || m.includes('rat') || m.includes('cockroach') || m.includes('health'))
    return "🦟 **Health Hazard Prevention:**\nOverflowing bins breed mosquitoes (Dengue/Malaria), attract rats, cockroaches, and flies.\n\n**Our system prevents this by:**\n• Dispatching trucks at 80% fill — no overflow\n• Emergency requests for immediate clearing\n• Area health scores tracked in real-time\n• Areas with better scores get more BBMP health funds";
  if (m.includes('bbmp') || m.includes('govt') || m.includes('government') || m.includes('municipal'))
    return "🏛️ **BBMP Integration:**\nBruhat Bengaluru Mahanagara Palike (BBMP) governs waste collection.\nOur system auto-reports to BBMP:\n• Bin fill levels by ward\n• Area cleanliness & health scores\n• Emergency requests\n• Leaderboard rankings for fund allocation";
  if (m.includes('how') || m.includes('work') || m.includes('system'))
    return "🔄 **How SmartWaste Works (Bengaluru):**\n1️⃣ Smart bins detect fill via sensors\n2️⃣ Citizen scans QR, describes waste\n3️⃣ AI classifies & awards points\n4️⃣ Pre-sort = bonus +25 pts\n5️⃣ Area points = city competition rank\n6️⃣ Top areas get govt funds\n7️⃣ Societies request emergency trucks\n8️⃣ No overflow = no Dengue/Malaria";
  if (m.includes('thank') || m.includes('great') || m.includes('awesome'))
    return "😊 You're welcome! Namma Bengaluru is cleaner because of citizens like you! 🌿🏙️";
  if (m.includes('bye') || m.includes('goodbye'))
    return "👋 Goodbye! Keep segregating waste — Bengaluru needs you! 🌱";

  const { classifyWaste } = require('./aiClassifier');
  const result = classifyWaste(msg, 0.5);
  if (result.wasteType !== 'general' || msg.split(' ').length <= 3)
    return `🤖 That sounds like **${result.wasteType}** waste.\n📦 Take it to: **${result.destination}**\n💡 ${result.recommendation}\n⭐ You'd earn **+${result.pointsEarned} pts** (or **+${result.pointsEarned + 25} pts** if pre-sorted!)`;

  return "🤔 Try asking:\n• *\"How do I earn more points?\"*\n• *\"How to request emergency collection?\"*\n• *\"What is the city competition?\"*\n• *\"Where do I put old batteries?\"*\n• *\"How does pre-sorting help?\"*";
}

// ─────────────────────────────────────────────
//  SERVE FRONTEND
// ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🌱 SmartWaste Bengaluru running at http://localhost:${PORT}\n`);
});
