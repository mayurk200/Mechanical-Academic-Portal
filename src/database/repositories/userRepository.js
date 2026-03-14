// ============================================================
// LMS Platform — User Repository
// Pure Firestore CRUD operations for the 'users' collection
// ============================================================

import {
  db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.USERS;

// ── In-Memory Cache ─────────────────────
const _cache = new Map();

export const UserRepository = {
  async create(uid, data) {
    await setDoc(doc(db, COL, uid), {
      name: data.name || '',
      email: data.email || '',
      role: data.role || 'student',
      urn: data.urn || '',
      rollNo: data.rollNo || '',
      department: data.department || '',
      phone: data.phone || '',
      profilePhoto: '',
      createdBy: data.createdBy || '',
      createdAt: serverTimestamp()
    });
  },

  async get(uid) {
    if (_cache.has(uid)) return _cache.get(uid);
    const snap = await getDoc(doc(db, COL, uid));
    if (snap.exists()) {
      const data = { uid: snap.id, ...snap.data() };
      _cache.set(uid, data);
      return data;
    }
    return null;
  },

  async update(uid, data) {
    await updateDoc(doc(db, COL, uid), { ...data, updatedAt: serverTimestamp() });
    _cache.delete(uid);
  },

  async delete(uid) {
    await deleteDoc(doc(db, COL, uid));
    _cache.delete(uid);
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  },

  async getByRole(role) {
    const snap = await getDocs(query(collection(db, COL), where('role', '==', role)));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  },

  async count() {
    const snap = await getDocs(collection(db, COL));
    return snap.size;
  },

  async countByRole(role) {
    const snap = await getDocs(query(collection(db, COL), where('role', '==', role)));
    return snap.size;
  },

  async getByCreator(creatorUid) {
    const snap = await getDocs(query(
      collection(db, COL),
      where('role', '==', 'student'),
      where('createdBy', '==', creatorUid)
    ));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  },

  async isUrnUnique(urn) {
    const snap = await getDocs(query(collection(db, COL), where('urn', '==', urn)));
    return snap.empty;
  },

  clearCache(uid = null) {
    if (uid) _cache.delete(uid);
    else _cache.clear();
  }
};
