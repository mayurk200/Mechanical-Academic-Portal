// ============================================================
// LMS Platform — Firebase Configuration
// Replace these values with YOUR Firebase project credentials
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDnG85fj3Ln_7Y1rF84Jhg4_huvPpjRdu4",
  authDomain: "minner-dashbord.firebaseapp.com",
  projectId: "minner-dashbord",
  storageBucket: "minner-dashbord.firebasestorage.app",
  messagingSenderId: "465981542786",
  appId: "1:465981542786:web:08f57ea9cee02da536ff9b",
  measurementId: "G-8L6X8HGTXW"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Auto-logout when browser is closed (session-only persistence)
setPersistence(auth, browserSessionPersistence).catch(console.error);

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
