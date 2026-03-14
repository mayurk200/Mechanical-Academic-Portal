// ============================================================
// LMS Platform — Logger
// Structured logging with categories and levels
// ============================================================

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
  auth(msg, data) { this._format('AUTH', 'error', msg, data); },
  database(msg, data) { this._format('DATABASE', 'error', msg, data); },
  upload(msg, data) { this._format('UPLOAD', 'warn', msg, data); },
  permission(msg, data) { this._format('PERMISSION', 'warn', msg, data); },
  info(msg, data) { this._format('INFO', 'info', msg, data); },
  debug(msg, data) { this._format('DEBUG', 'debug', msg, data); },
  error(msg, data) { this._format('ERROR', 'error', msg, data); }
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
  if (error.code && firebaseErrorMap[error.code]) {
    return firebaseErrorMap[error.code];
  }
  if (error.message && error.message.includes('permission-denied')) {
    return firebaseErrorMap['permission-denied'];
  }
  return error.message || 'Something went wrong. Please try again.';
}
