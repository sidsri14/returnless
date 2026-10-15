/**
 * ReturnLess Wardrobe Overlap Analyzer Engine
 * Deterministic, evidence-based similarity comparison between candidate garments and owned wardrobe.
 * No speculative AI fit claims; pure perceptual color metrics, utility clustering, and return risk scoring.
 */

/**
 * Converts a hex color string (#RRGGBB or #RGB) to RGB object { r, g, b }
 */
export function hexToRgb(hex) {
  let cleaned = (hex || '').replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  if (cleaned.length !== 6) {
    return { r: 128, g: 128, b: 128 }; // Default neutral mid-gray fallback
  }
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return { r: 128, g: 128, b: 128 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts RGB to CIELAB color space (D65 illuminant).
 */
export function rgbToLab(rgb) {
  // Normalize RGB to sRGB [0, 1]
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to XYZ
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

  // Observer=2°, Illuminant=D65
  x /= 95.047;
  y /= 100.0;
  z /= 108.883;

  const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * Calculates CIE76 Delta-E between two colors.
 * Delta-E < 2.3: Just noticeable difference (JND)
 * Delta-E 2.3 - 10: Perceptually close
 * Delta-E 10 - 25: Similar tone / shade
 * Delta-E > 25: Clearly distinct colors
 */
export function calculateDeltaE(colorA, colorB) {
  const rgbA = typeof colorA === 'string' ? hexToRgb(colorA) : colorA;
  const rgbB = typeof colorB === 'string' ? hexToRgb(colorB) : colorB;

  const labA = rgbToLab(rgbA);
  const labB = rgbToLab(rgbB);

  const dL = labA.L - labB.L;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;

  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Maps Delta-E (typically 0 to 100+) to a 0 - 100% color proximity score.
 * Delta-E of 0 -> 100% identical color
 * Delta-E of 10 -> ~85% similar
 * Delta-E of 25 -> ~55% similar
 * Delta-E >= 60 -> ~0% similar
 */
export function deltaEToProximity(deltaE) {
  if (deltaE <= 0) return 100;
  if (deltaE >= 65) return 0;
  // Non-linear decay representing human perception
  const score = 100 * Math.exp(-deltaE / 22);
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Computes category compatibility and utility overlap.
 */
export function computeCategoryOverlap(categoryA, categoryB) {
  if (categoryA === categoryB) return 100; // Same category -> 100% utility redundancy
  if (
    (categoryA === 'upper_body' && categoryB === 'outer') ||
    (categoryA === 'outer' && categoryB === 'upper_body')
  ) {
    return 65; // Layering overlap
  }
  if (
    (categoryA === 'full_body' && (categoryB === 'upper_body' || categoryB === 'lower_body')) ||
    (categoryB === 'full_body' && (categoryA === 'upper_body' || categoryA === 'lower_body'))
  ) {
    return 45; // Partial coverage overlap
  }
  return 0; // Cross-category (e.g., shoes vs upper_body)
}

/**
 * Compares two apparel items and calculates their pairwise similarity.
 */
export function compareGarments(candidate, owned) {
  const categoryOverlap = computeCategoryOverlap(candidate.category, owned.category);

  // If cross-category (e.g. Shoes vs Sweater), overlap is negligible
  if (categoryOverlap === 0) {
    return {
      pairwiseScore: 0,
      colorProximity: 0,
      categoryOverlap: 0,
      minDeltaE: 100,
      closestPalettePair: { candidateColor: '#000000', ownedColor: '#FFFFFF' },
    };
  }

  // Compare palettes
  const candidatePalette = (candidate.palette && candidate.palette.length > 0)
    ? candidate.palette
    : ['#333333'];
  const ownedPalette = (owned.palette && owned.palette.length > 0)
    ? owned.palette
    : ['#333333'];

  let minDeltaE = Infinity;
  let bestCandidateColor = candidatePalette[0];
  let bestOwnedColor = ownedPalette[0];

  for (const cColor of candidatePalette) {
    for (const oColor of ownedPalette) {
      const dE = calculateDeltaE(cColor, oColor);
      if (dE < minDeltaE) {
        minDeltaE = dE;
        bestCandidateColor = cColor;
        bestOwnedColor = oColor;
      }
    }
  }

  const colorProximity = deltaEToProximity(minDeltaE);

  // Season overlap
  const seasonMatch = (candidate.season === owned.season || candidate.season === 'all_season' || owned.season === 'all_season')
    ? 100
    : 40;

  // Composite pairwise score (0-100)
  // 60% Color + 30% Category utility + 10% Season
  const pairwiseScore = Math.round(
    (colorProximity * 0.60) +
    (categoryOverlap * 0.30) +
    (seasonMatch * 0.10)
  );

  return {
    pairwiseScore: Math.min(100, Math.max(0, pairwiseScore)),
    colorProximity,
    categoryOverlap,
    minDeltaE: Math.round(minDeltaE * 10) / 10,
    closestPalettePair: {
      candidateColor: bestCandidateColor,
      ownedColor: bestOwnedColor,
    },
  };
}

/**
 * Evaluates a candidate garment against the shopper's entire owned wardrobe.
 */
export function analyzeWardrobeOverlap(candidate, ownedWardrobe = []) {
  if (!ownedWardrobe || ownedWardrobe.length === 0) {
    return {
      candidateId: candidate.id || 'candidate_unknown',
      candidateName: candidate.name || 'Candidate Garment',
      overallOverlapScore: 0,
      verdict: 'DISTINCTIVE',
      confidence: 'HIGH',
      closestMatch: null,
      topMatches: [],
      reasoning: 'Your owned wardrobe has 0 registered items. This candidate introduces an entirely new baseline.',
      metrics: {
        maxColorProximity: 0,
        lowestDeltaE: null,
        redundancyRiskIndex: 0,
        estimatedAvoidedReturnCost: 0,
        estimatedAvoidedCO2Kg: 0,
      },
    };
  }

  const comparisons = ownedWardrobe.map((ownedItem) => {
    const comparison = compareGarments(candidate, ownedItem);
    return {
      ownedItem,
      ...comparison,
    };
  });

  // Sort by highest similarity
  comparisons.sort((a, b) => b.pairwiseScore - a.pairwiseScore);

  const closest = comparisons[0];
  const maxScore = closest.pairwiseScore;

  // Determine Verdict
  let verdict = 'DISTINCTIVE';
  let reasoning = '';
  let returnRisk = 15; // Baseline minimum return risk in e-commerce

  if (maxScore >= 75) {
    verdict = 'REDUNDANT';
    returnRisk = Math.min(95, 60 + Math.round((maxScore - 75) * 1.4));
    reasoning = `High overlap (${maxScore}%). You already own '${closest.ownedItem.name}' in a ${closest.colorProximity}% matching color palette (Delta-E: ${closest.minDeltaE}). Purchasing this item carries a high risk of wardrobe duplication and subsequent return.`;
  } else if (maxScore >= 50) {
    verdict = 'BORDERLINE';
    returnRisk = Math.min(65, 35 + Math.round((maxScore - 50) * 1.2));
    reasoning = `Moderate overlap (${maxScore}%). Closely resembles '${closest.ownedItem.name}' in silhouette or seasonal utility, with moderate color variation. Check if this silhouette solves an unmet styling need before buying.`;
  } else {
    verdict = 'DISTINCTIVE';
    returnRisk = Math.max(10, Math.round(maxScore * 0.4));
    reasoning = `Distinctive purchase (${maxScore}% similarity to nearest owned item '${closest.ownedItem.name}'). Expands your closet with fresh aesthetic variety and novel color coordinates. Low redundancy risk.`;
  }

  // Calculate environmental and return savings metrics
  // Average e-commerce return processing cost is ~$15-$25 USD
  // Average carbon footprint per return logistics cycle is ~2.6 kg CO2e
  const retailPrice = typeof candidate.price === 'number' ? candidate.price : 65;
  const avoidedReturnSavings = verdict === 'REDUNDANT' ? 18.50 : (verdict === 'BORDERLINE' ? 9.25 : 0);
  const avoidedCO2 = verdict === 'REDUNDANT' ? 2.6 : (verdict === 'BORDERLINE' ? 1.3 : 0);

  return {
    candidateId: candidate.id || 'candidate_1',
    candidateName: candidate.name || 'Candidate Garment',
    candidateCategory: candidate.category,
    overallOverlapScore: maxScore,
    verdict,
    returnRiskScore: returnRisk,
    closestMatch: {
      id: closest.ownedItem.id,
      name: closest.ownedItem.name,
      category: closest.ownedItem.category,
      imageUrl: closest.ownedItem.imageUrl,
      palette: closest.ownedItem.palette,
      similarityScore: closest.pairwiseScore,
      colorProximity: closest.colorProximity,
      deltaE: closest.minDeltaE,
      matchedPair: closest.closestPalettePair,
    },
    topMatches: comparisons.slice(0, 3).map((c) => ({
      name: c.ownedItem.name,
      score: c.pairwiseScore,
      colorProximity: c.colorProximity,
      deltaE: c.minDeltaE,
    })),
    reasoning,
    metrics: {
      retailPrice,
      maxColorProximity: closest.colorProximity,
      lowestDeltaE: closest.minDeltaE,
      redundancyRiskIndex: returnRisk,
      estimatedAvoidedReturnCost: avoidedReturnSavings,
      estimatedAvoidedCO2Kg: avoidedCO2,
    },
  };
}
