// ============================================================
// LMS Platform — Course Repository
// Firestore CRUD for 'courses' and 'sections' collections
// ============================================================

import {
  db, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.COURSES;
const SEC_COL = COLLECTIONS.SECTIONS;

// ── In-Memory Cache ─────────────────────
const _cache = new Map();

export const CourseRepository = {
  async create(data) {
    const docRef = await addDoc(collection(db, COL), {
      title: data.title,
      description: data.description || '',
      code: data.code || '',
      teacherId: data.teacherId,
      teacherName: data.teacherName || '',
      category: data.category || '',
      createdAt: serverTimestamp()
    });
    return docRef;
  },

  async get(id) {
    if (_cache.has(id)) return _cache.get(id);
    const snap = await getDoc(doc(db, COL, id));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      _cache.set(id, data);
      return data;
    }
    return null;
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByTeacher(teacherId) {
    const snap = await getDocs(query(collection(db, COL), where('teacherId', '==', teacherId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async update(id, data) {
    await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
    _cache.delete(id);
  },

  async delete(id) {
    await deleteDoc(doc(db, COL, id));
    _cache.delete(id);
  },

  async cascadeDelete(id) {
    // Delete all enrollments for this course
    const enrollSnap = await getDocs(query(collection(db, COLLECTIONS.ENROLLMENTS), where('courseId', '==', id)));
    for (const d of enrollSnap.docs) await deleteDoc(doc(db, COLLECTIONS.ENROLLMENTS, d.id));

    // Delete all sections for this course
    const secSnap = await getDocs(query(collection(db, SEC_COL), where('courseId', '==', id)));
    for (const d of secSnap.docs) await deleteDoc(doc(db, SEC_COL, d.id));

    // Delete all tests for this course and their results
    const testSnap = await getDocs(query(collection(db, COLLECTIONS.TESTS), where('courseId', '==', id)));
    for (const t of testSnap.docs) {
      const resSnap = await getDocs(query(collection(db, COLLECTIONS.TEST_RESULTS), where('testId', '==', t.id)));
      for (const r of resSnap.docs) await deleteDoc(doc(db, COLLECTIONS.TEST_RESULTS, r.id));
      await deleteDoc(doc(db, COLLECTIONS.TESTS, t.id));
    }

    // Delete the course itself
    await deleteDoc(doc(db, COL, id));
    _cache.delete(id);
  },

  async count() {
    const snap = await getDocs(collection(db, COL));
    return snap.size;
  },

  clearCache(id = null) {
    if (id) _cache.delete(id);
    else _cache.clear();
  }
};

// ── Section Repository ──────────────────
export const SectionRepository = {
  async create(data) {
    return await addDoc(collection(db, SEC_COL), {
      courseId: data.courseId,
      title: data.title,
      description: data.description || '',
      order: data.order || 0,
      materials: [],
      createdAt: serverTimestamp()
    });
  },

  async getByCourse(courseId) {
    const snap = await getDocs(query(
      collection(db, SEC_COL),
      where('courseId', '==', courseId),
      orderBy('order', 'asc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async update(id, data) {
    await updateDoc(doc(db, SEC_COL, id), data);
  },

  async delete(id) {
    await deleteDoc(doc(db, SEC_COL, id));
  },

  async addMaterial(sectionId, material) {
    const snap = await getDoc(doc(db, SEC_COL, sectionId));
    if (snap.exists()) {
      const materials = snap.data().materials || [];
      materials.push({ ...material, addedAt: new Date().toISOString() });
      await updateDoc(doc(db, SEC_COL, sectionId), { materials });
    }
  }
};
