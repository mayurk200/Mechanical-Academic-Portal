// ============================================================
// LMS Platform — Utilities (Bootstrap 5 compatible)
// Toast notifications, confirmation modals, formatters, helpers,
// structured logging, button state management
// ============================================================

// ── Structured Logger ──────────────────
export const LMSLogger = {
  _format(category, level, msg, data) {
    const ts = new Date().toISOString().slice(11, 19);
    const prefix = `[LMS:${category}] ${ts}`;
    if (data) {
      console[level](`${prefix} ${msg}`, data);
    } else {
      console[level](`${prefix} ${msg}`);
    }
  },
  auth(msg, data)       { this._format('AUTH', 'error', msg, data); },
  database(msg, data)   { this._format('DATABASE', 'error', msg, data); },
  upload(msg, data)     { this._format('UPLOAD', 'warn', msg, data); },
  permission(msg, data) { this._format('PERMISSION', 'warn', msg, data); },
  info(msg, data)       { this._format('INFO', 'info', msg, data); },
  debug(msg, data)      { this._format('DEBUG', 'debug', msg, data); }
};

// ── Firebase Error Translator ──────────
const firebaseErrorMap = {
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a moment.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/network-request-failed': 'Network error. Check your internet connection.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed.',
  'permission-denied': 'You do not have permission for this action.',
  'unavailable': 'Service temporarily unavailable. Please try again.',
  'not-found': 'The requested data was not found.'
};

export function friendlyError(error) {
  if (!error) return 'An unknown error occurred.';
  // Firebase errors have a .code property
  if (error.code && firebaseErrorMap[error.code]) {
    return firebaseErrorMap[error.code];
  }
  // Firestore errors
  if (error.message && error.message.includes('permission-denied')) {
    return firebaseErrorMap['permission-denied'];
  }
  // Return message or fallback
  return error.message || 'Something went wrong. Please try again.';
}

// ── Toast Notification (Enhanced) ──────
let _toastCounter = 0;

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container-custom';
    document.body.appendChild(container);
  }

  const id = `lms-toast-${++_toastCounter}`;
  const bgMap = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-warning text-dark',
    info: 'bg-primary'
  };
  const iconMap = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  };

  const toastEl = document.createElement('div');
  toastEl.id = id;
  toastEl.className = `toast show align-items-center text-white ${bgMap[type] || bgMap.info} border-0 mb-2 lms-toast-enter`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2" style="flex:1;">
        <i class="bi ${iconMap[type] || iconMap.info}" style="font-size:1.1rem;"></i>
        <span>${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
    </div>
    <div class="lms-toast-progress" style="animation-duration:4s;"></div>`;

  container.appendChild(toastEl);

  // Close button
  toastEl.querySelector('.btn-close').addEventListener('click', () => dismissToast(toastEl));

  // Auto-dismiss after 4 seconds
  setTimeout(() => dismissToast(toastEl), 4000);
}

function dismissToast(el) {
  if (!el || el._dismissing) return;
  el._dismissing = true;
  el.classList.add('lms-toast-exit');
  el.addEventListener('animationend', () => el.remove(), { once: true });
  // Fallback removal
  setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
}

// ── Confirmation Modal (replaces window.confirm) ──────
export function showConfirm(title, message, { confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' } = {}) {
  return new Promise((resolve) => {
    // Remove any existing confirmation modal
    document.getElementById('lms-confirm-modal')?.remove();

    const btnClass = type === 'danger' ? 'btn-danger' : type === 'warning' ? 'btn-warning' : 'btn-primary';

    const overlay = document.createElement('div');
    overlay.id = 'lms-confirm-modal';
    overlay.className = 'lms-confirm-overlay lms-confirm-enter';
    overlay.innerHTML = `
      <div class="lms-confirm-box">
        <div class="lms-confirm-header">
          <h5 class="mb-0">${title}</h5>
        </div>
        <div class="lms-confirm-body">
          <p class="mb-0">${message}</p>
        </div>
        <div class="lms-confirm-footer">
          <button class="btn btn-light btn-sm" id="lms-confirm-cancel">${cancelText}</button>
          <button class="btn ${btnClass} btn-sm" id="lms-confirm-ok">${confirmText}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const close = (result) => {
      overlay.classList.add('lms-confirm-exit');
      setTimeout(() => { overlay.remove(); resolve(result); }, 250);
    };

    overlay.querySelector('#lms-confirm-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('#lms-confirm-ok').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}

// ── Button Loading State Helper ─────────
export async function withLoadingButton(btn, asyncFn, { loadingText = 'Processing...', icon = '' } = {}) {
  if (!btn || btn.disabled) return;

  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${loadingText}`;

  try {
    return await asyncFn();
  } finally {
    btn.disabled = false;
    btn.innerHTML = icon ? `<i class="bi ${icon} me-1"></i>${originalHTML.replace(/<[^>]*>/g, '').trim()}` : originalHTML;
  }
}

// ── Retry Wrapper ─────────────────────
export async function withRetry(asyncFn, { retries = 2, delay = 1000 } = {}) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await asyncFn();
    } catch (err) {
      if (i === retries) throw err;
      LMSLogger.info(`Retrying operation (${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ── Duplicate Submission Guard ─────────
const _activeOps = new Set();

export function guardDuplicate(key) {
  if (_activeOps.has(key)) return false;
  _activeOps.add(key);
  return true;
}

export function releaseDuplicate(key) {
  _activeOps.delete(key);
}

// ── Date Formatting ────────────────────
export function formatDate(timestamp) {
  if (!timestamp) return '—';
  let date;
  if (timestamp.toDate) date = timestamp.toDate();
  else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
  else date = new Date(timestamp);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '—';
  if (typeof date === 'string') date = new Date(date);
  if (date.toDate) date = date.toDate();
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function timeAgo(timestamp) {
  if (!timestamp) return '';
  let date;
  if (timestamp.toDate) date = timestamp.toDate();
  else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
  else date = new Date(timestamp);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── HTML Helpers ───────────────────────
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

// ── Modal Helpers (Bootstrap) ─────────
export function openModal(id) {
  const el = document.getElementById(id);
  if (el) new bootstrap.Modal(el).show();
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) bootstrap.Modal.getInstance(el)?.hide();
}

export function initModals() {
  // Bootstrap handles modals natively — no extra init needed
}

// ── Input Validation Helpers ──────────
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
