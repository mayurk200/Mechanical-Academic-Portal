// ============================================================
// LMS Platform — Firestore Shared Helpers
// Common Firestore imports, batch utilities, and pagination
// ============================================================

import { db } from '../config/firebaseConfig.js';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp, Timestamp,
  setDoc, increment, writeBatch, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Re-export everything for convenience
export {
  db, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp, Timestamp,
  setDoc, increment, writeBatch, getCountFromServer
};

// ── Batch Delete Utility ────────────────
// Deletes all documents in a query result using batched writes (max 500 per batch)
export async function batchDelete(querySnapshot) {
  const BATCH_SIZE = 500;
  const docs = querySnapshot.docs;
  let deleted = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

// ── Batch Write Utility ─────────────────
// Writes multiple documents in batched writes
export async function batchSet(collectionName, dataArray, idField = null) {
  const BATCH_SIZE = 500;
  let written = 0;

  for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = dataArray.slice(i, i + BATCH_SIZE);

    chunk.forEach(data => {
      const ref = idField && data[idField]
        ? doc(db, collectionName, data[idField])
        : doc(collection(db, collectionName));
      batch.set(ref, { ...data, createdAt: serverTimestamp() });
    });

    await batch.commit();
    written += chunk.length;
  }

  return written;
}

// ── Paginated Query Helper ──────────────
export async function paginatedQuery(collectionName, constraints = [], pageSize = 25, lastDoc = null) {
  let q = query(collection(db, collectionName), ...constraints, limit(pageSize));

  if (lastDoc) {
    q = query(collection(db, collectionName), ...constraints, startAfter(lastDoc), limit(pageSize));
  }

  const snap = await getDocs(q);
  return {
    docs: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize
  };
}

// ── Wipe Collection Utility ─────────────
export async function wipeCollection(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  if (snap.empty) return 0;
  return await batchDelete(snap);
}

// ── Count Documents ─────────────────────
export async function countDocuments(collectionName, constraints = []) {
  const q = constraints.length > 0
    ? query(collection(db, collectionName), ...constraints)
    : collection(db, collectionName);
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
