// ============================================================
// LMS Platform — Enrollment Repository
// Firestore CRUD for 'enrollments' collection
// ============================================================

import {
  db, collection, doc, addDoc, getDocs, deleteDoc,
  query, where, serverTimestamp
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.ENROLLMENTS;

// ── In-Memory Cache ─────────────────────
const _enrollmentCache = new Map();
const _enrollCourseCache = new Map();

export const EnrollmentRepository = {
  async assignCourse(studentId, courseId, teacherId) {
    const existing = await getDocs(query(
      collection(db, COL),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    ));
    if (!existing.empty) throw new Error('Student already assigned to this course');

    const result = await addDoc(collection(db, COL), {
      studentId,
      courseId,
      teacherId,
      assignedDate: serverTimestamp()
    });

    _enrollmentCache.delete(courseId);
    _enrollCourseCache.delete(studentId);
    return result;
  },

  async bulkAssign(studentIds, courseId, teacherId) {
    const results = [];
    for (const studentId of studentIds) {
      try {
        await this.assignCourse(studentId, courseId, teacherId);
        results.push({ studentId, success: true });
      } catch (err) {
        results.push({ studentId, success: false, error: err.message });
      }
    }
    return results;
  },

  async unenroll(studentId, courseId) {
    const snap = await getDocs(query(
      collection(db, COL),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    ));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    _enrollmentCache.delete(courseId);
    _enrollCourseCache.delete(studentId);
  },

  async getByStudent(studentId) {
    if (_enrollCourseCache.has(studentId)) return _enrollCourseCache.get(studentId);
    const snap = await getDocs(query(collection(db, COL), where('studentId', '==', studentId)));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _enrollCourseCache.set(studentId, data);
    return data;
  },

  async getEnrolledCourses(studentId) {
    const { CourseRepository } = await import('./courseRepository.js');
    const enrollments = await this.getByStudent(studentId);
    if (enrollments.length === 0) return [];
    const courseIds = enrollments.map(e => e.courseId);
    const allCourses = await getDocs(collection(db, COLLECTIONS.COURSES));
    return allCourses.docs
      .filter(d => courseIds.includes(d.id))
      .map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCourse(courseId) {
    if (_enrollmentCache.has(courseId)) return _enrollmentCache.get(courseId);
    const snap = await getDocs(query(collection(db, COL), where('courseId', '==', courseId)));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _enrollmentCache.set(courseId, data);
    return data;
  },

  async isEnrolled(studentId, courseId) {
    const snap = await getDocs(query(
      collection(db, COL),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    ));
    return !snap.empty;
  },

  async countByCourse(courseId) {
    const snap = await getDocs(query(collection(db, COL), where('courseId', '==', courseId)));
    return snap.size;
  },

  async getAll() {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  clearCache() {
    _enrollmentCache.clear();
    _enrollCourseCache.clear();
  }
};
