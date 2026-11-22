/**
 * AI Waste Classification Module
 * Supports: recyclable, organic, hazardous, medical, general
 */

const WASTE_RULES = {
  recyclable: {
    keywords: ['bottle', 'plastic', 'can', 'cardboard', 'paper', 'glass', 'metal', 'aluminum', 'carton', 'newspaper', 'magazine', 'tin', 'jar', 'box', 'wrapper', 'packaging'],
    points: 15,
    destination: 'Recycling Center',
    co2PerKg: 2.5,
    color: '#1d6fce',
    icon: '🔵',
  },
  organic: {
    keywords: ['food', 'vegetable', 'fruit', 'peel', 'leaves', 'grass', 'coffee', 'tea', 'eggshell', 'bread', 'rice', 'wood', 'garden', 'compost', 'rotten', 'leftover', 'cooked'],
    points: 10,
    destination: 'Composting Facility',
    co2PerKg: 1.2,
    color: '#16a34a',
    icon: '🟢',
  },
  hazardous: {
    keywords: ['battery', 'chemical', 'paint', 'solvent', 'electronic', 'bulb', 'fluorescent', 'oil', 'pesticide', 'acid', 'bleach', 'aerosol', 'e-waste', 'circuit'],
    points: 20,
    destination: 'Hazardous Waste Facility',
    co2PerKg: 0,
    color: '#dc2626',
    icon: '🔴',
  },
  medical: {
    keywords: [
      'medicine', 'tablet', 'capsule', 'syrup', 'injection', 'syringe', 'needle', 'iv', 'drip',
      'bandage', 'dressing', 'gauze', 'cotton', 'glove', 'surgical', 'mask', 'ppe',
      'hospital', 'clinic', 'blood', 'urine', 'stool', 'sample', 'test kit', 'covid',
      'expired drug', 'pill', 'strip', 'blister pack', 'saline', 'antiseptic', 'scalpel',
      'catheter', 'tube', 'medical', 'vaccine', 'vial', 'ampule', 'thermometer', 'bp',
    ],
    points: 30,
    destination: 'Bio-Medical Waste Facility (BBMP Authorised)',
    co2PerKg: 0,
    color: '#7c3aed',
    icon: '🟣',
  },
  general: {
    keywords: [],
    points: 5,
    destination: 'General Landfill',
    co2PerKg: 0,
    color: '#6b7280',
    icon: '⚫',
  },
};

function classifyWaste(description, weightKg = 0.5) {
  const lower = description.toLowerCase();
  let matched = 'general';
  let highestScore = 0;

  for (const [type, rule] of Object.entries(WASTE_RULES)) {
    if (type === 'general') continue;
    const score = rule.keywords.filter(kw => lower.includes(kw)).length;
    if (score > highestScore) {
      highestScore = score;
      matched = type;
    }
  }

  const rule = WASTE_RULES[matched];
  const co2Saved = rule.co2PerKg * weightKg;
  const confidence = matched === 'general' ? 60 : Math.min(97, 65 + highestScore * 10);

  return {
    wasteType: matched,
    destination: rule.destination,
    pointsEarned: rule.points,
    co2SavedKg: parseFloat(co2Saved.toFixed(3)),
    confidence,
    color: rule.color,
    icon: rule.icon,
    recommendation: getRecommendation(matched),
  };
}

function getRecommendation(type) {
  const map = {
    recyclable: 'Rinse bottles before disposal. Remove caps and lids. Flatten cardboard boxes.',
    organic:    'Use a compostable bag if available. No meat, dairy, or cooked oil in compost.',
    hazardous:  'Seal tightly. NEVER mix with other waste. Use only the RED hazardous bin.',
    medical:    '⚠️ DANGER: Seal in a puncture-proof RED BAG. Do NOT mix with household waste. Use the PURPLE medical bin or call BBMP Bio-Medical helpline: 1800-425-0210.',
    general:    'Check if any part can be recycled before throwing. Reduce waste at source.',
  };
  return map[type];
}

module.exports = { classifyWaste, WASTE_RULES };
