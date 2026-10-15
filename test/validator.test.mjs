import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImageSource,
  validateTryOnPayload,
  validateApparelItem,
  validateDecisionPayload,
  ALLOWED_GARMENT_CATEGORIES,
} from '../src/validator.mjs';

describe('Validator Module', () => {
  it('validates legitimate image URLs', () => {
    const res = validateImageSource('https://example.com/garment.jpg');
    assert.equal(res.valid, true);
    assert.equal(res.type, 'url');
  });

  it('validates SVG and data URIs', () => {
    const dataUri = 'data:image/svg+xml;utf8,<svg></svg>';
    const res = validateImageSource(dataUri);
    assert.equal(res.valid, true);
    assert.equal(res.type, 'data_uri');
  });

  it('rejects empty or invalid image sources', () => {
    assert.equal(validateImageSource('').valid, false);
    assert.equal(validateImageSource('not_a_valid_format').valid, false);
    assert.equal(validateImageSource(null).valid, false);
  });

  it('validates complete try-on payloads', () => {
    const payload = {
      userImage: 'https://example.com/user.jpg',
      garmentImage: 'https://example.com/garment.jpg',
      garmentCategory: 'upper_body',
    };
    const res = validateTryOnPayload(payload);
    assert.equal(res.valid, true);
    assert.equal(res.data.garmentCategory, 'upper_body');
  });

  it('rejects unsupported garment categories', () => {
    const payload = {
      userImage: 'https://example.com/user.jpg',
      garmentImage: 'https://example.com/garment.jpg',
      garmentCategory: 'invalid_spacesuit',
    };
    const res = validateTryOnPayload(payload);
    assert.equal(res.valid, false);
    assert.match(res.error, /garmentCategory must be one of/);
  });

  it('validates apparel items with default fallbacks', () => {
    const res = validateApparelItem({
      name: 'Navy Cashmere Knit',
      category: 'upper_body',
      palette: ['#1B2A4A'],
      price: 85,
    });
    assert.equal(res.valid, true);
    assert.equal(res.data.name, 'Navy Cashmere Knit');
    assert.equal(res.data.price, 85);
  });

  it('validates Keep and Reject decisions', () => {
    const validReject = validateDecisionPayload({
      candidateId: 'cand_1',
      decision: 'REJECT',
      rationale: '92% color overlap with my owned navy knit sweater',
      avoidedCost: 95.0,
      candidateName: 'Merino Wool Crewneck',
      overlapScore: 92,
    });
    assert.equal(validReject.valid, true);
    assert.equal(validReject.data.decision, 'REJECT');

    const invalidDecision = validateDecisionPayload({
      candidateId: 'cand_1',
      decision: 'MAYBE',
      rationale: 'Too short',
    });
    assert.equal(invalidDecision.valid, false);
  });
});
