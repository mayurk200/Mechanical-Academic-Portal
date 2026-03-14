// ============================================================
// LMS Platform — Notification Repository
// Firestore CRUD for 'notifications' collection
// ============================================================

import {
  db, collection, doc, addDoc, getDocs, updateDoc,
  query, where, orderBy, serverTimestamp
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.NOTIFICATIONS;

export const NotificationRepository = {
  async create(data) {
    return await addDoc(collection(db, COL), {
      userId: data.userId,
      type: data.type || 'info',
      title: data.title,
      message: data.message || '',
      read: false,
      createdAt: serverTimestamp()
    });
  },

  async getByUser(userId) {
    const snap = await getDocs(query(
      collection(db, COL),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async markRead(id) {
    await updateDoc(doc(db, COL, id), { read: true });
  },

  async markAllRead(userId) {
    const snap = await getDocs(query(
      collection(db, COL),
      where('userId', '==', userId),
      where('read', '==', false)
    ));
    await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
  },

  async getUnreadCount(userId) {
    const snap = await getDocs(query(
      collection(db, COL),
      where('userId', '==', userId),
      where('read', '==', false)
    ));
    return snap.size;
  }
};
