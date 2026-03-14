// ============================================================
// LMS Platform — Upload Service
// CSV/Excel parsing, validation, preview, and error reporting
// ============================================================

import { ERROR_CODES } from '../config/constants.js';
import { UPLOAD_LIMITS } from '../config/appConfig.js';

// ── Standardized Upload Error ─────────
export class UploadError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// ── Validate File Type ──────────────────
export function validateFileType(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!UPLOAD_LIMITS.ALLOWED_EXTENSIONS.includes(ext)) {
    throw new UploadError(
      ERROR_CODES.INVALID_FILE_TYPE,
      `Invalid file type: ${ext}. Allowed: ${UPLOAD_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`
    );
  }
  return ext;
}

// ── Validate File Size ──────────────────
export function validateFileSize(file) {
  const maxBytes = UPLOAD_LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new UploadError(
      ERROR_CODES.FILE_TOO_LARGE,
      `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${UPLOAD_LIMITS.MAX_FILE_SIZE_MB} MB`
    );
  }
}

// ── Parse CSV Text ──────────────────────
export function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new UploadError(ERROR_CODES.INVALID_CSV_STRUCTURE, 'CSV must have a header row and at least one data row');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      errors.push({ row: i + 1, error: `Expected ${headers.length} columns, got ${values.length}` });
      continue;
    }
    const row = {};
    headers.forEach((h, j) => { row[h] = values[j]; });
    rows.push(row);
  }

  return { headers, rows, errors };
}

// ── Validate Required Headers ───────────
export function validateHeaders(headers, requiredHeaders) {
  const normalized = headers.map(h => h.toLowerCase().trim());
  const missing = requiredHeaders.filter(h => !normalized.includes(h.toLowerCase()));
  if (missing.length > 0) {
    throw new UploadError(
      ERROR_CODES.MISSING_REQUIRED_COLUMNS,
      `Missing required columns: ${missing.join(', ')}`
    );
  }
}

// ── Preview Data (first N rows) ─────────
export function previewData(rows, count = 5) {
  return {
    preview: rows.slice(0, count),
    totalRows: rows.length,
    hasMore: rows.length > count
  };
}

// ── Generate Upload Report ──────────────
export function generateUploadReport(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  return {
    total: results.length,
    successCount: successful.length,
    failureCount: failed.length,
    successRate: results.length > 0 ? Math.round((successful.length / results.length) * 100) : 0,
    failures: failed.map(f => ({ row: f.row, error: f.error })),
    timestamp: new Date().toISOString()
  };
}
