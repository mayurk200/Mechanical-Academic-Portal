// ============================================================
// LMS Platform — Exam Activity Log Repository
// Firestore CRUD for 'exam_activity_logs' collection
// Tracks per-test security violations (copy, tab-switch, etc.)
// ============================================================

import {
  db, collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.EXAM_ACTIVITY_LOGS;

export const ExamActivityLogRepository = {
  /**
   * Log a security violation or exam event
   * @param {{ testId, studentId, studentName, type, message }} data
   */
  async log(data) {
    return await addDoc(collection(db, COL), {
      testId: data.testId,
      studentId: data.studentId,
      studentName: data.studentName || '',
      type: data.type,       // 'copy_attempt' | 'tab_switch' | 'fullscreen_exit' | 'devtools' | 'shortcut_blocked' | 'auto_submit' | 'test_start' | 'test_submit'
      message: data.message || '',
      timestamp: serverTimestamp()
    });
  },

  /** Get all logs for a specific test */
  async getByTest(testId) {
    try {
      const snap = await getDocs(query(
        collection(db, COL),
        where('testId', '==', testId),
        orderBy('timestamp', 'asc')
      ));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('ExamActivityLogRepository.getByTest error:', err);
      return [];
    }
  },

  /** Get all logs for a specific student in a specific test */
  async getByTestAndStudent(testId, studentId) {
    try {
      const snap = await getDocs(query(
        collection(db, COL),
        where('testId', '==', testId),
        where('studentId', '==', studentId),
        orderBy('timestamp', 'asc')
      ));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('ExamActivityLogRepository.getByTestAndStudent error:', err);
      return [];
    }
  }
};
