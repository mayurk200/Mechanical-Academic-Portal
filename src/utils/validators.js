// ============================================================
// LMS Platform — Validators
// Input validation utilities
// ============================================================

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequired(fields) {
  const errors = [];
  for (const [name, value] of Object.entries(fields)) {
    if (!value || (typeof value === 'string' && !value.trim())) {
      errors.push(`${name} is required`);
    }
  }
  return errors;
}

export function validateExcelHeaders(jsonData, requiredHeaders) {
  if (!jsonData || jsonData.length === 0) return ['File is empty'];
  const fileHeaders = Object.keys(jsonData[0]).map(h => h.trim().toLowerCase());
  const missing = requiredHeaders.filter(h => !fileHeaders.includes(h.toLowerCase()));
  if (missing.length > 0) {
    return [`Missing required columns: ${missing.join(', ')}`];
  }
  return [];
}

export function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}

export function validateURN(urn) {
  if (!urn || !urn.trim()) {
    return 'URN is required';
  }
  return null;
}
