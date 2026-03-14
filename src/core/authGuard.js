// ============================================================
// LMS Platform — Auth Guard
// Page-level access control and role checking
// ============================================================

import { auth, db } from '../config/firebaseConfig.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { DASHBOARD_ROUTES } from '../config/appConfig.js';
import { ROLES } from '../config/constants.js';

// ── Check if user has required role ─────
export function hasRole(userData, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(userData.role);
}

// ── Check if user is admin ──────────────
export function isAdmin(userData) {
  return userData && userData.role === ROLES.ADMIN;
}

// ── Check if user is teacher ────────────
export function isTeacher(userData) {
  return userData && userData.role === ROLES.TEACHER;
}

// ── Check if user is student ────────────
export function isStudent(userData) {
  return userData && userData.role === ROLES.STUDENT;
}

// ── Check if user is admin or teacher ───
export function isStaff(userData) {
  return userData && (userData.role === ROLES.ADMIN || userData.role === ROLES.TEACHER);
}

// ── Redirect unauthorized users ─────────
export function redirectUnauthorized(userData) {
  const route = DASHBOARD_ROUTES[userData?.role] || DASHBOARD_ROUTES.student;
  window.location.href = route;
}

// ── Guard route with auth check ─────────
export function requireAuth(callback) {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        window.location.href = '../login.html';
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          window.location.href = '../login.html';
          return;
        }
        const userData = { uid: user.uid, ...userDoc.data() };
        if (callback) callback(userData);
        resolve(userData);
      } catch (err) {
        console.error('Auth guard error:', err);
        window.location.href = '../login.html';
      }
    });
  });
}
