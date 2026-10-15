/**
 * ReturnLess Validation Module
 * Enforces bounded inputs, privacy constraints, and strict schema compliance.
 */

export const ALLOWED_GARMENT_CATEGORIES = [
  'upper_body',
  'lower_body',
  'full_body',
  'outer',
  'shoes',
  'auto',
];

export const ALLOWED_DECISIONS = ['KEEP', 'REJECT'];

export const MAX_IMAGE_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates an image source (URL or data URI).
 */
export function validateImageSource(source, fieldName = 'image') {
  if (!source || typeof source !== 'string') {
    return { valid: false, error: `${fieldName} is required and must be a string` };
  }

  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  // Safe HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed);
      return { valid: true, value: trimmed, type: 'url' };
    } catch {
      return { valid: false, error: `${fieldName} has an invalid URL format` };
    }
  }

  // Data URI (base64 or SVG)
  if (trimmed.startsWith('data:image/')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) {
      return { valid: false, error: `${fieldName} data URI is malformed` };
    }
    const dataPart = trimmed.slice(commaIndex + 1);
    const approxBytes = Math.ceil((dataPart.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_PAYLOAD_BYTES) {
      return {
        valid: false,
        error: `${fieldName} exceeds maximum allowed size of ${MAX_IMAGE_PAYLOAD_BYTES / 1024 / 1024} MB`,
      };
    }
    return { valid: true, value: trimmed, type: 'data_uri' };
  }

  // Relative path (for test fixtures / assets)
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.webp') || trimmed.endsWith('.svg')) {
    return { valid: true, value: trimmed, type: 'path' };
  }

  return {
    valid: false,
    error: `${fieldName} must be a valid HTTP(S) URL, data URI, or recognized image path`,
  };
}

/**
 * Validates a Try-On request payload.
 */
export function validateTryOnPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const userImageValidation = validateImageSource(payload.userImage, 'userImage');
  if (!userImageValidation.valid) return userImageValidation;

  const garmentImageValidation = validateImageSource(payload.garmentImage, 'garmentImage');
  if (!garmentImageValidation.valid) return garmentImageValidation;

  const category = payload.garmentCategory || 'upper_body';
  if (!ALLOWED_GARMENT_CATEGORIES.includes(category)) {
    return {
      valid: false,
      error: `garmentCategory must be one of: ${ALLOWED_GARMENT_CATEGORIES.join(', ')}`,
    };
  }

  return {
    valid: true,
    data: {
      userImage: userImageValidation.value,
      garmentImage: garmentImageValidation.value,
      garmentCategory: category,
      candidateId: typeof payload.candidateId === 'string' ? payload.candidateId.trim() : undefined,
      changeShoes: Boolean(payload.changeShoes),
    },
  };
}

/**
 * Validates an apparel item for wardrobe overlap analysis.
 */
export function validateApparelItem(item, label = 'item') {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: `${label} must be a valid object` };
  }

  if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
    return { valid: false, error: `${label}.name is required` };
  }

  const category = item.category || 'upper_body';
  if (!ALLOWED_GARMENT_CATEGORIES.includes(category)) {
    return {
      valid: false,
      error: `${label}.category must be one of: ${ALLOWED_GARMENT_CATEGORIES.join(', ')}`,
    };
  }

  // Palette validation: array of hex colors or color names
  let palette = ['#222222'];
  if (Array.isArray(item.palette) && item.palette.length > 0) {
    palette = item.palette.filter((c) => typeof c === 'string' && c.trim().length > 0);
    if (palette.length === 0) palette = ['#222222'];
  }

  const price = typeof item.price === 'number' && item.price >= 0 ? item.price : 0;

  return {
    valid: true,
    data: {
      id: item.id || `item_${Math.random().toString(36).slice(2, 9)}`,
      name: item.name.trim(),
      category,
      palette,
      imageUrl: item.imageUrl || '',
      price,
      brand: item.brand || 'Unspecified',
      season: item.season || 'all_season',
      material: item.material || 'blend',
    },
  };
}

/**
 * Validates a shopper purchase decision record.
 */
export function validateDecisionPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Decision payload must be a JSON object' };
  }

  if (!payload.candidateId || typeof payload.candidateId !== 'string') {
    return { valid: false, error: 'candidateId is required' };
  }

  if (!ALLOWED_DECISIONS.includes(payload.decision)) {
    return { valid: false, error: `decision must be one of: ${ALLOWED_DECISIONS.join(', ')}` };
  }

  if (!payload.rationale || typeof payload.rationale !== 'string' || payload.rationale.trim().length < 3) {
    return { valid: false, error: 'rationale must be at least 3 characters long explaining the reason' };
  }

  return {
    valid: true,
    data: {
      candidateId: payload.candidateId.trim(),
      decision: payload.decision,
      rationale: payload.rationale.trim(),
      avoidedCost: typeof payload.avoidedCost === 'number' && payload.avoidedCost >= 0 ? payload.avoidedCost : 0,
      candidateName: typeof payload.candidateName === 'string' ? payload.candidateName.trim() : 'Candidate Item',
      overlapScore: typeof payload.overlapScore === 'number' ? payload.overlapScore : 0,
    },
  };
}
