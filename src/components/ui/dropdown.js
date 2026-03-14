// ============================================================
// LMS Platform — Dropdown Component
// Reusable dropdown builder for forms
// ============================================================

// ── Build Select Options ────────────────
export function buildSelectOptions(items, valueKey, labelKey, placeholder = 'Select...') {
  let html = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const value = typeof item === 'object' ? item[valueKey] : item;
    const label = typeof item === 'object' ? item[labelKey] : item;
    html += `<option value="${value}">${label}</option>`;
  });
  return html;
}

// ── Populate Select Element ─────────────
export function populateSelect(elementId, items, valueKey, labelKey, placeholder = 'Select...') {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = buildSelectOptions(items, valueKey, labelKey, placeholder);
  }
  return el;
}

// ── Get Selected Value ──────────────────
export function getSelectedValue(elementId) {
  const el = document.getElementById(elementId);
  return el ? el.value : null;
}
