// ============================================================
// LMS Platform — Activity Log Repository
// Firestore CRUD for 'activity_logs' collection
// ============================================================

import {
  db, collection, addDoc, getDocs, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.ACTIVITY_LOGS;

export const ActivityLogRepository = {
  async log(userId, action, details = '') {
    return await addDoc(collection(db, COL), {
      userId,
      action,
      details,
      timestamp: serverTimestamp()
    });
  },

  async getRecent(limitCount = 20) {
    const snap = await getDocs(query(
      collection(db, COL),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getAll() {
    const snap = await getDocs(query(
      collection(db, COL),
      orderBy('timestamp', 'desc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async deleteOlderThan(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTimestamp = Timestamp.fromDate(cutoff);

    const snap = await getDocs(query(
      collection(db, COL),
      where('timestamp', '<', cutoffTimestamp)
    ));

    if (snap.empty) return 0;
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    return snap.size;
  }
};
