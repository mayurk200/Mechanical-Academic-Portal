// ============================================================
// LMS Platform — Application Configuration
// Centralized app-wide settings, routes, and feature flags
// ============================================================

export const APP_NAME = 'Mechanical Academic Portal';
export const APP_SHORT_NAME = 'MAP';

// ── Dashboard Route Map ─────────────────
export const DASHBOARD_ROUTES = {
  admin: 'admin-dashboard.html',
  teacher: 'teacher-dashboard.html',
  student: 'student-dashboard.html'
};

// ── Pagination Defaults ─────────────────
export const PAGINATION = {
  USERS_PER_PAGE: 20,
  STUDENTS_PER_PAGE: 25,
  RESULTS_PER_PAGE: 50,
  ACTIVITY_LOGS_LIMIT: 20
};

// ── Feature Flags ───────────────────────
export const FEATURES = {
  ENABLE_NEGATIVE_MARKING: true,
  ENABLE_QUESTION_SHUFFLE: true,
  ENABLE_TAB_SWITCH_DETECTION: true,
  ENABLE_COPY_DETECTION: true,
  ENABLE_AUTO_SUBMIT_ON_CHEAT: true,
  ENABLE_BULK_UPLOAD: true,
  ENABLE_EXCEL_EXPORT: true,
  ENABLE_ACTIVITY_LOGGING: true,
  ENABLE_AGGREGATE_ATTENDANCE: true
};

// ── Upload Limits ───────────────────────
export const UPLOAD_LIMITS = {
  MAX_BULK_STUDENTS: 500,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_EXTENSIONS: ['.csv', '.xlsx', '.xls'],
  BULK_CREATE_DELAY_MS: 150
};

// ── Attendance Thresholds ───────────────
export const ATTENDANCE = {
  LOW_THRESHOLD_PERCENT: 75,
  CRITICAL_THRESHOLD_PERCENT: 50,
  DEFAULTER_THRESHOLD_PERCENT: 75
};

// ── Test Security Defaults ──────────────
export const TEST_SECURITY = {
  DEFAULT_TAB_SWITCH_LIMIT: 3,
  DEFAULT_DURATION_MINUTES: 30,
  DEFAULT_ATTEMPT_LIMIT: 1,
  MIN_PASSWORD_LENGTH: 6
};

// ── Firebase SDK Version ────────────────
export const FIREBASE_CDN_VERSION = '10.12.0';
export const FIREBASE_CDN_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}`;
