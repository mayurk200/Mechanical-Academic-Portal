// ============================================================
// LMS Platform — Result Repository
// Firestore CRUD for 'test_results' collection
// ============================================================

import {
  db, collection, addDoc, getDocs,
  query, where, serverTimestamp
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.TEST_RESULTS;

export const ResultRepository = {
  async submit(data) {
    return await addDoc(collection(db, COL), {
      testId: data.testId,
      courseId: data.courseId || '',
      studentId: data.studentId,
      studentName: data.studentName || '',
      answers: data.answers || [],
      score: data.score || 0,
      totalMarks: data.totalMarks || 0,
      percentage: data.percentage || 0,
      correctCount: data.correctCount || 0,
      wrongCount: data.wrongCount || 0,
      // Violation tracking
      copyAttempts: data.copyAttempts || 0,
      tabSwitches: data.tabSwitches || 0,
      fullscreenExits: data.fullscreenExits || 0,
      devtoolsAttempts: data.devtoolsAttempts || 0,
      autoSubmitted: data.autoSubmitted || false,
      submissionType: data.submissionType || 'manual',  // 'manual' | 'auto_copy' | 'auto_tab' | 'auto_fullscreen' | 'auto_devtools' | 'auto_timeout'
      submittedAt: serverTimestamp()
    });
  },

  async getByTest(testId) {
    try {
      const snap = await getDocs(query(collection(db, COL), where('testId', '==', testId)));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (err) {
      console.error('ResultRepository.getByTest error:', err);
      return [];
    }
  },

  async getByStudent(studentId) {
    try {
      const snap = await getDocs(query(collection(db, COL), where('studentId', '==', studentId)));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('ResultRepository.getByStudent error:', err);
      return [];
    }
  },

  async getByCourse(courseId) {
    try {
      const snap = await getDocs(query(collection(db, COL), where('courseId', '==', courseId)));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('ResultRepository.getByCourse error:', err);
      return [];
    }
  },

  async hasAttempted(testId, studentId) {
    const snap = await getDocs(query(
      collection(db, COL),
      where('testId', '==', testId),
      where('studentId', '==', studentId)
    ));
    return snap.size;
  }
};
