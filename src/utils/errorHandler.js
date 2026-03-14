// ============================================================
// LMS Platform — Error Handler
// Centralized error format with error codes
// ============================================================

import { ERROR_CODES } from '../config/constants.js';
import { LMSLogger } from './logger.js';

// ── Standardized Error Class ────────────
export class LMSError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// ── Error Factory ───────────────────────
export function createError(code, message, details = null) {
  return new LMSError(code, message, details);
}

// ── Global Error Handler ────────────────
export function handleError(error, context = '') {
  const errorInfo = {
    code: error.code || ERROR_CODES.SERVICE_UNAVAILABLE,
    message: error.message || 'An unexpected error occurred',
    context,
    stack: error.stack
  };

  LMSLogger.error(`[${context}] ${errorInfo.message}`, errorInfo);
  return errorInfo;
}

// ── User-Friendly Error Messages ────────
const USER_MESSAGES = {
  [ERROR_CODES.AUTH_FAILED]: 'Authentication failed. Please try again.',
  [ERROR_CODES.USER_NOT_FOUND]: 'User not found.',
  [ERROR_CODES.PERMISSION_DENIED]: 'You do not have permission for this action.',
  [ERROR_CODES.UPLOAD_ERROR]: 'File upload failed. Please check the file and try again.',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Invalid file type. Please use a supported format.',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File is too large. Please reduce the file size.',
  [ERROR_CODES.INVALID_CSV_STRUCTURE]: 'The CSV file structure is invalid.',
  [ERROR_CODES.MISSING_REQUIRED_COLUMNS]: 'The file is missing required columns.',
  [ERROR_CODES.DUPLICATE_ENTRY]: 'A duplicate entry was found.',
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.VALIDATION_FAILED]: 'Validation failed. Please check your input.',
  [ERROR_CODES.TEST_ALREADY_SUBMITTED]: 'This test has already been submitted.',
  [ERROR_CODES.MAX_ATTEMPTS_REACHED]: 'Maximum attempts reached for this test.',
  [ERROR_CODES.CHEAT_DETECTED]: 'Suspicious activity detected. Test auto-submitted.',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Check your internet connection.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again.'
};

export function getUserMessage(code) {
  return USER_MESSAGES[code] || 'Something went wrong. Please try again.';
}
