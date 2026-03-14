// ============================================================
// LMS Platform — Session Manager
// Auth state management and session persistence
// ============================================================

import { auth } from '../config/firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let _currentUser = null;
const _listeners = [];

// ── Initialize Session Tracking ─────────
export function initSessionManager() {
  onAuthStateChanged(auth, (user) => {
    _currentUser = user;
    _listeners.forEach(fn => fn(user));
  });
}

// ── Get Current Firebase User ───────────
export function getCurrentFirebaseUser() {
  return auth.currentUser;
}

// ── Wait for Auth Ready ─────────────────
export function waitForAuth() {
  return new Promise((resolve) => {
    if (_currentUser !== null) {
      resolve(_currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      _currentUser = user;
      resolve(user);
    });
  });
}

// ── Add Auth State Listener ─────────────
export function onAuthChange(callback) {
  _listeners.push(callback);
  // Immediately fire if already known
  if (_currentUser !== undefined) callback(_currentUser);
  return () => {
    const idx = _listeners.indexOf(callback);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

// ── Check if Logged In ──────────────────
export function isLoggedIn() {
  return !!auth.currentUser;
}
