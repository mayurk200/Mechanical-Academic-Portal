// ============================================================
// LMS Platform — Utils Bridge (Backward Compatibility)
// Re-exports from new src/ locations
// ============================================================

// Logger
export { LMSLogger, friendlyError } from '../../../src/utils/logger.js';

// UI Components
export { showToast } from '../../../src/components/ui/notification.js';
export { showConfirm, showPasswordPrompt, openModal, closeModal } from '../../../src/components/ui/modal.js';
export { withLoadingButton, withRetry, guardDuplicate, releaseDuplicate } from '../../../src/components/ui/loader.js';

// Date Utils
export { formatDate, formatDateTime, formatTime, timeAgo } from '../../../src/utils/dateUtils.js';

// Validators
export { validateEmail, validateRequired, validateExcelHeaders } from '../../../src/utils/validators.js';

// HTML Helpers (kept inline for simplicity)
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getRoleBadge(role) {
  const cls = { admin: 'bg-danger', teacher: 'bg-primary', student: 'bg-success' };
  return `<span class="badge ${cls[role] || 'bg-secondary'}">${role || 'user'}</span>`;
}

export function initModals() {
  // Bootstrap handles modals natively
}
