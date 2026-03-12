// ============================================================
// LMS Platform — Authentication Module
// Firebase Auth: login, logout, forgot password, guards
// Teacher/Admin: create student accounts
// Secure password change with re-authentication
// ============================================================

import { auth, db } from '../../../config/firebase-config.js';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { LMSLogger, friendlyError } from './utils.js';

// Dashboard map
const dashboardMap = {
  admin: 'app/admin-dashboard.html',
  teacher: 'app/teacher-dashboard.html',
  student: 'app/student-dashboard.html'
};

// ── Login with Email ──────────────────────
export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    
    // Auto-provision Super Admin if matches special credentials
    if (email === 'mayurkudale2006@gmail.com' && password === 'mayur200') {
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
         const adminData = {
           name: 'Super Admin',
           email: email,
           role: 'admin',
           createdAt: serverTimestamp()
         };
         await setDoc(doc(db, 'users', cred.user.uid), adminData, { merge: true });
         return { uid: cred.user.uid, ...adminData };
      }
    }

    if (!userDoc.exists()) throw new Error('User profile not found');
    return { uid: cred.user.uid, ...userDoc.data() };
  } catch (err) {
    // If credentials match Super Admin but account doesn't exist yet, create it
    if (email === 'mayurkudale2006@gmail.com' && password === 'mayur200' && 
        (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password')) {
       const cred = await createUserWithEmailAndPassword(auth, email, password);
       const adminData = {
         name: 'Super Admin',
         email: email,
         role: 'admin',
         createdAt: serverTimestamp()
       };
       await setDoc(doc(db, 'users', cred.user.uid), adminData);
       return { uid: cred.user.uid, ...adminData };
    }
    throw err;
  }
}

// ── Login with URN (Student only) ─────────
export async function loginWithURN(urn, password) {
  if (!urn) throw new Error('URN number is required');
  // Look up student email by URN
  const snap = await getDocs(query(
    collection(db, 'users'),
    where('urn', '==', urn),
    where('role', '==', 'student')
  ));
  if (snap.empty) throw new Error('No student found with this URN');
  const studentData = snap.docs[0].data();
  if (!studentData.email) throw new Error('Student account has no email configured');
  // Authenticate with Firebase Auth using the student's email
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

// ── Create Student Account (Teacher/Admin only) ───
// Creates Firebase Auth account + Firestore profile
export async function createStudentAccount(data, createdByUid) {
  const { email, password, name, rollNo, urn, department } = data;

  if (!email || !password || !name) {
    throw new Error('Name, email, and password are required');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Create account using a secondary Firebase app to avoid signing out the teacher
  const { initializeApp, deleteApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const { getAuth: getAuth2, createUserWithEmailAndPassword: createUser2 } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

  // Create a temporary secondary app
  const secondaryApp = initializeApp(auth.app.options, 'SecondaryApp_' + Date.now());
  const secondaryAuth = getAuth2(secondaryApp);

  try {
    const cred = await createUser2(secondaryAuth, email, password);

    // Create Firestore profile
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      email,
      role: 'student',
      rollNo: rollNo || '',
      urn: urn || '',
      department: department || '',
      phone: '',
      profilePhoto: '',
      createdBy: createdByUid,
      createdAt: serverTimestamp()
    });

    // Sign out from secondary auth
    await secondaryAuth.signOut();

    return { uid: cred.user.uid, email, name };
  } finally {
    // Clean up secondary app
    await deleteApp(secondaryApp);
  }
}

// ── Secure Password Change (re-authentication required) ───
export async function reauthAndChangePassword(oldPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  await verifyCurrentPassword(oldPassword);
  await updatePassword(user, newPassword);
}

// ── Verify Current Password (For Secure Deletes) ─────────
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
  const path = dashboardMap[role] || dashboardMap.student;
  window.location.href = path;
}

// ── Auth guard for public pages (redirect if already logged in) ──
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
