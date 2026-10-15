import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgb,
  rgbToLab,
  calculateDeltaE,
  deltaEToProximity,
  computeCategoryOverlap,
  compareGarments,
  analyzeWardrobeOverlap,
} from '../src/wardrobe_overlap.mjs';
import {
  SAMPLE_CANDIDATES,
  SAMPLE_OWNED_WARDROBE,
} from '../fixtures/sample_data.mjs';

describe('Wardrobe Overlap Analyzer Engine', () => {
  it('correctly converts Hex to RGB', () => {
    const white = hexToRgb('#ffffff');
    assert.deepEqual(white, { r: 255, g: 255, b: 255 });

    const black = hexToRgb('#000000');
    assert.deepEqual(black, { r: 0, g: 0, b: 0 });

    const shortHex = hexToRgb('#f00');
    assert.deepEqual(shortHex, { r: 255, g: 0, b: 0 });
  });

  it('calculates Delta-E = 0 for identical colors', () => {
    const deltaE = calculateDeltaE('#1B2A4A', '#1B2A4A');
    assert.equal(deltaE, 0);

    const proximity = deltaEToProximity(deltaE);
    assert.equal(proximity, 100);
  });

  it('calculates high Delta-E for opposing colors (White vs Black)', () => {
    const deltaE = calculateDeltaE('#ffffff', '#000000');
    assert.ok(deltaE > 90, `Expected Delta-E > 90, got ${deltaE}`);

    const proximity = deltaEToProximity(deltaE);
    assert.equal(proximity, 0);
  });

  it('determines category overlap properly', () => {
    assert.equal(computeCategoryOverlap('upper_body', 'upper_body'), 100);
    assert.equal(computeCategoryOverlap('upper_body', 'outer'), 65);
    assert.equal(computeCategoryOverlap('upper_body', 'shoes'), 0);
  });

  it('identifies Redundant garment (Navy Sweater vs Owned Navy Knit)', () => {
    const navyCandidate = SAMPLE_CANDIDATES.find((c) => c.id === 'cand_navy_knit');
    const analysis = analyzeWardrobeOverlap(navyCandidate, SAMPLE_OWNED_WARDROBE);

    assert.equal(analysis.verdict, 'REDUNDANT');
    assert.ok(analysis.overallOverlapScore >= 75, `Expected score >= 75, got ${analysis.overallOverlapScore}`);
    assert.equal(analysis.closestMatch.id, 'owned_navy_jumper');
    assert.ok(analysis.metrics.estimatedAvoidedReturnCost > 0);
  });

  it('identifies Borderline garment (Heather Slate Cardigan vs Wardrobe)', () => {
    const cardiganCandidate = SAMPLE_CANDIDATES.find((c) => c.id === 'cand_heather_cardigan');
    const analysis = analyzeWardrobeOverlap(cardiganCandidate, SAMPLE_OWNED_WARDROBE);

    assert.equal(analysis.verdict, 'BORDERLINE');
    assert.ok(analysis.overallOverlapScore >= 50 && analysis.overallOverlapScore < 75);
  });

  it('identifies Distinctive garment (Sunset Ochre vs Neutral Wardrobe)', () => {
    const ochreCandidate = SAMPLE_CANDIDATES.find((c) => c.id === 'cand_ochre_overshirt');
    const analysis = analyzeWardrobeOverlap(ochreCandidate, SAMPLE_OWNED_WARDROBE);

    assert.equal(analysis.verdict, 'DISTINCTIVE');
    assert.ok(analysis.overallOverlapScore < 50, `Expected score < 50, got ${analysis.overallOverlapScore}`);
  });

  it('handles empty wardrobe gracefully', () => {
    const candidate = SAMPLE_CANDIDATES[0];
    const analysis = analyzeWardrobeOverlap(candidate, []);

    assert.equal(analysis.verdict, 'DISTINCTIVE');
    assert.equal(analysis.overallOverlapScore, 0);
    assert.equal(analysis.closestMatch, null);
  });
});
