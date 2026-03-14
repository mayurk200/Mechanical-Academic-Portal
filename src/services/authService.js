// ============================================================
// LMS Platform — Auth Service
// Firebase Auth: login, logout, register, guards
// ============================================================

import { auth, db } from '../config/firebaseConfig.js';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { LMSLogger, friendlyError } from '../utils/logger.js';
import { DASHBOARD_ROUTES } from '../config/appConfig.js';

// ── Login with Email ──────────────────────
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
  if (!userDoc.exists()) throw new Error('User profile not found');
  return { uid: cred.user.uid, ...userDoc.data() };
}

// ── Register User (Public) ────────────────
export async function registerUser(data) {
  const { email, password, name, role, urn, rollNo } = data;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const userData = {
    name: name || '',
    email: email,
    role: role || 'student',
    urn: urn || '',
    rollNo: rollNo || '',
    createdAt: serverTimestamp()
  };
  await setDoc(doc(db, 'users', cred.user.uid), userData);
  return { uid: cred.user.uid, ...userData };
}

// ── Login with URN (Student only) ─────────
export async function loginWithURN(urn, password) {
  if (!urn) throw new Error('URN number is required');
  const snap = await getDocs(query(
    collection(db, 'users'),
    where('urn', '==', urn),
    where('role', '==', 'student')
  ));
  if (snap.empty) throw new Error('No student found with this URN');
  const studentData = snap.docs[0].data();
  if (!studentData.email) throw new Error('Student account has no email configured');
  const cred = await signInWithEmailAndPassword(auth, studentData.email, password);
  return { uid: cred.user.uid, ...studentData };
}

// ── Logout ────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
}

// ── Forgot Password ───────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Helper to Get or Create Secondary App ────
async function getSecondaryAuth() {
  const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const { getAuth: getAuth2 } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const appName = 'SecondaryApp';
  let secondaryApp;
  if (getApps().some(a => a.name === appName)) {
    secondaryApp = getApp(appName);
  } else {
    secondaryApp = initializeApp(auth.app.options, appName);
  }
  return getAuth2(secondaryApp);
}

// ── Create Staff Account (Admin only) ──
export async function createStaffAccount(data, adminUid) {
  const { email, password, name, role } = data;
  const secondaryAuth = await getSecondaryAuth();
  const { createUserWithEmailAndPassword: createUser2, signOut: signOut2 } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const cred = await createUser2(secondaryAuth, email, password);
  const userData = {
    name,
    email,
    role: role || 'teacher',
    createdBy: adminUid,
    createdAt: serverTimestamp()
  };
  await setDoc(doc(db, 'users', cred.user.uid), userData);
  await signOut2(secondaryAuth);
  return { uid: cred.user.uid, ...userData };
}

// ── Create Student Account ──
export async function createStudentAccount(data, creatorUid) {
  const { email, password, name, rollNo, urn, department } = data;
  const secondaryAuth = await getSecondaryAuth();
  const { createUserWithEmailAndPassword: createUser2, signOut: signOut2 } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const cred = await createUser2(secondaryAuth, email, password);
  const userData = {
    name: name || '',
    email,
    role: 'student',
    rollNo: rollNo || '',
    urn: urn || '',
    department: department || '',
    createdBy: creatorUid,
    createdAt: serverTimestamp()
  };
  await setDoc(doc(db, 'users', cred.user.uid), userData);
  await signOut2(secondaryAuth);
  return { uid: cred.user.uid, ...userData };
}

// ── Bulk Student Creation Helper ──
export async function createBulkStudentHelper(creatorUid) {
  const { initializeApp, getApps, getApp, deleteApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const { getAuth: getAuth2, createUserWithEmailAndPassword: createUser2 } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const appName = 'BulkUploadApp';
  let secondaryApp;
  if (getApps().some(a => a.name === appName)) {
    secondaryApp = getApp(appName);
  } else {
    secondaryApp = initializeApp(auth.app.options, appName);
  }
  const secondaryAuth = getAuth2(secondaryApp);

  return {
    async createOne(data) {
      const { email, password, name, rollNo, urn, department } = data;
      try {
        const cred = await createUser2(secondaryAuth, email, password);
        const userData = {
          name: name || '',
          email,
          role: 'student',
          rollNo: rollNo || '',
          urn: urn || '',
          department: department || '',
          createdBy: creatorUid,
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', cred.user.uid), userData);
        await new Promise(r => setTimeout(r, 150));
        return { uid: cred.user.uid, ...userData };
      } catch (err) {
        console.error("Firebase auth creation error:", err);
        throw err;
      }
    },
    async cleanup() {
      try { await deleteApp(secondaryApp); } catch (e) {
        console.error("Cleanup error in Bulk Upload:", e);
      }
    }
  };
}

// ── Secure Password Change ───
export async function reauthAndChangePassword(oldPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');
  await verifyCurrentPassword(oldPassword);
  await updatePassword(user, newPassword);
}

// ── Verify Current Password ─────────
export async function verifyCurrentPassword(password) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  const credential = EmailAuthProvider.credential(user.email, password);
  try {
    await reauthenticateWithCredential(user, credential);
    return true;
  } catch (e) {
    throw new Error('Incorrect password');
  }
}

// ── Redirect to dashboard based on role ───
export function redirectToDashboard(role) {
  const path = DASHBOARD_ROUTES[role] || DASHBOARD_ROUTES.student;
  window.location.href = path;
}

// ── Auth guard for public pages ──
export function guardPublicPage() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        redirectToDashboard(userDoc.data().role);
      }
    }
  });
}

// ── Get current user ──────────────────────
export function getCurrentUser() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => resolve(user));
  });
}
