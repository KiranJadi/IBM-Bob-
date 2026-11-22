/**
 * In-memory database (replace with MongoDB/PostgreSQL in production)
 * City: Bengaluru, Karnataka, India
 */

const { v4: uuidv4 } = require('uuid');

// --- BINS (Bengaluru locations) ---
const bins = [
  { id: 'BIN-001', location: 'MG Road, Brigade Road Junction', lat: 12.9752, lng: 77.6069, fillLevel: 0, type: 'general',    lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-001', areaId: 'AREA-MG' },
  { id: 'BIN-002', location: 'Koramangala 5th Block Park',      lat: 12.9352, lng: 77.6245, fillLevel: 0, type: 'recyclable', lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-002', areaId: 'AREA-KOR' },
  { id: 'BIN-003', location: 'Indiranagar 100 Feet Road',       lat: 12.9784, lng: 77.6408, fillLevel: 0, type: 'organic',    lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-003', areaId: 'AREA-IND' },
  { id: 'BIN-004', location: 'Whitefield ITPL Main Gate',       lat: 12.9850, lng: 77.7501, fillLevel: 0, type: 'hazardous',  lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-004', areaId: 'AREA-WHI' },
  { id: 'BIN-005', location: 'Jayanagar 4th Block Bus Stop',    lat: 12.9305, lng: 77.5832, fillLevel: 0, type: 'recyclable', lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-005', areaId: 'AREA-JAY' },
  { id: 'BIN-006', location: 'HSR Layout Sector 1',             lat: 12.9116, lng: 77.6473, fillLevel: 0, type: 'organic',    lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-006', areaId: 'AREA-HSR' },
  { id: 'BIN-007', location: 'Electronic City Phase 1',         lat: 12.8445, lng: 77.6600, fillLevel: 0, type: 'general',    lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-007', areaId: 'AREA-EC' },
  { id: 'BIN-008', location: 'Malleshwaram 8th Cross',          lat: 13.0025, lng: 77.5699, fillLevel: 0, type: 'recyclable', lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-001', areaId: 'AREA-MAL' },
  { id: 'BIN-009', location: 'Victoria Hospital, K.R. Market',  lat: 12.9680, lng: 77.5760, fillLevel: 0, type: 'medical',    lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-001', areaId: 'AREA-MG' },
  { id: 'BIN-010', location: 'Bowring Hospital, Shivajinagar',  lat: 12.9793, lng: 77.6069, fillLevel: 0, type: 'medical',    lastEmptied: new Date().toISOString(), alertSent: false, societyId: 'SOC-003', areaId: 'AREA-IND' },
];

// --- USERS ---
const users = [
  { id: 'USR-001', name: 'Priya Sharma',   email: 'priya@eco.in',   qrCode: 'QR-PRIYA-001',  points: 120, disposals: [], badges: ['Early Adopter'], societyId: 'SOC-001', areaId: 'AREA-MG',  presortBonus: 0 },
  { id: 'USR-002', name: 'Rahul Kumar',    email: 'rahul@eco.in',   qrCode: 'QR-RAHUL-002',  points: 85,  disposals: [], badges: [],                societyId: 'SOC-002', areaId: 'AREA-KOR', presortBonus: 0 },
  { id: 'USR-003', name: 'Ananya Singh',   email: 'ananya@eco.in',  qrCode: 'QR-ANANYA-003', points: 240, disposals: [], badges: ['Green Hero','Recycler'], societyId: 'SOC-003', areaId: 'AREA-IND', presortBonus: 0 },
  { id: 'USR-004', name: 'Vikram Nair',    email: 'vikram@eco.in',  qrCode: 'QR-VIKRAM-004', points: 55,  disposals: [], badges: [],                societyId: 'SOC-004', areaId: 'AREA-WHI', presortBonus: 0 },
  { id: 'USR-005', name: 'Deepika Rao',    email: 'deepika@eco.in', qrCode: 'QR-DEEPIKA-005',points: 310, disposals: [], badges: ['Eco Champion','Green Hero','Recycler'], societyId: 'SOC-005', areaId: 'AREA-JAY', presortBonus: 0 },
];

// --- TRUCKS ---
const trucks = [
  { id: 'TRK-001', driver: 'Suresh Babu',   status: 'idle',  currentRoute: [], lat: 12.9700, lng: 77.6100 },
  { id: 'TRK-002', driver: 'Manjunath K.',  status: 'idle',  currentRoute: [], lat: 12.9400, lng: 77.6300 },
  { id: 'TRK-003', driver: 'Ravi Shankar',  status: 'idle',  currentRoute: [], lat: 12.9600, lng: 77.6500 },
];

// --- SOCIETIES (Resident Welfare Associations) ---
const societies = [
  { id: 'SOC-001', name: 'MG Road RWA',          areaId: 'AREA-MG',  contact: 'mg.rwa@bbmp.in',   members: 240, totalPoints: 1850 },
  { id: 'SOC-002', name: 'Koramangala Residents', areaId: 'AREA-KOR', contact: 'kor.rwa@bbmp.in',  members: 380, totalPoints: 2200 },
  { id: 'SOC-003', name: 'Indiranagar RWA',       areaId: 'AREA-IND', contact: 'ind.rwa@bbmp.in',  members: 310, totalPoints: 3100 },
  { id: 'SOC-004', name: 'Whitefield IT Residents',areaId:'AREA-WHI', contact: 'whi.rwa@bbmp.in',  members: 520, totalPoints: 1600 },
  { id: 'SOC-005', name: 'Jayanagar Block 4 RWA', areaId: 'AREA-JAY', contact: 'jay.rwa@bbmp.in',  members: 290, totalPoints: 4200 },
  { id: 'SOC-006', name: 'HSR Layout Association',areaId: 'AREA-HSR', contact: 'hsr.rwa@bbmp.in',  members: 460, totalPoints: 2900 },
  { id: 'SOC-007', name: 'Electronics City RWA',  areaId: 'AREA-EC',  contact: 'ec.rwa@bbmp.in',   members: 680, totalPoints: 1200 },
];

// --- GOVT AREAS / DISTRICTS ---
const areas = [
  { id: 'AREA-MG',  name: 'MG Road & Brigade',    district: 'Central Bengaluru', totalPoints: 1850,  cleanliness: 72, healthScore: 68, funds: 50000,  population: 45000  },
  { id: 'AREA-KOR', name: 'Koramangala',           district: 'South Bengaluru',   totalPoints: 2200,  cleanliness: 78, healthScore: 75, funds: 60000,  population: 72000  },
  { id: 'AREA-IND', name: 'Indiranagar',           district: 'East Bengaluru',    totalPoints: 3100,  cleanliness: 85, healthScore: 82, funds: 75000,  population: 56000  },
  { id: 'AREA-WHI', name: 'Whitefield',            district: 'East Bengaluru',    totalPoints: 1600,  cleanliness: 65, healthScore: 60, funds: 40000,  population: 110000 },
  { id: 'AREA-JAY', name: 'Jayanagar',             district: 'South Bengaluru',   totalPoints: 4200,  cleanliness: 91, healthScore: 89, funds: 95000,  population: 68000  },
  { id: 'AREA-HSR', name: 'HSR Layout',            district: 'South Bengaluru',   totalPoints: 2900,  cleanliness: 80, healthScore: 76, funds: 65000,  population: 95000  },
  { id: 'AREA-EC',  name: 'Electronic City',       district: 'South Bengaluru',   totalPoints: 1200,  cleanliness: 58, healthScore: 54, funds: 30000,  population: 150000 },
  { id: 'AREA-MAL', name: 'Malleshwaram',          district: 'North Bengaluru',   totalPoints: 2650,  cleanliness: 83, healthScore: 80, funds: 70000,  population: 48000  },
];

// --- EMERGENCY COLLECTION REQUESTS ---
const emergencyRequests = [];

// --- ALERTS ---
const alerts = [];

// --- DISPOSALS LOG ---
const disposals = [];

// --- COMPOST / RECYCLE STATS ---
const stats = {
  totalDisposals: 0,
  recyclableKg: 0,
  organicKg: 0,
  hazardousKg: 0,
  medicalKg: 0,
  generalKg: 0,
  co2Saved: 0,
  presortedDisposals: 0,
  presortBonusTotal: 0,
};

module.exports = { bins, users, trucks, societies, areas, emergencyRequests, alerts, disposals, stats, uuidv4 };
