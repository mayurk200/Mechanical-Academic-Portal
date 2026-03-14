// ============================================================
// LMS Platform — Firebase Configuration
// Imports credentials from the gitignored firebase-credentials.js
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig } from './firebase-credentials.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Auto-logout when browser is closed (session-only persistence)
setPersistence(auth, browserSessionPersistence).catch(console.error);

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
