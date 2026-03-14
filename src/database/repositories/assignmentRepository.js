// ============================================================
// LMS Platform — Assignment Repository
// Firestore CRUD for 'assignments' and 'submissions' collections
// ============================================================

import {
  db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const ASSIGN_COL = COLLECTIONS.ASSIGNMENTS;
const SUB_COL = COLLECTIONS.SUBMISSIONS;

export const AssignmentRepository = {
  async create(data) {
    return await addDoc(collection(db, ASSIGN_COL), {
      courseId: data.courseId,
      title: data.title,
      description: data.description || '',
      deadline: data.deadline || null,
      maxScore: data.maxScore || 100,
      createdBy: data.createdBy,
      createdAt: serverTimestamp()
    });
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, ASSIGN_COL), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCourse(courseId) {
    const snap = await getDocs(query(collection(db, ASSIGN_COL), where('courseId', '==', courseId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCreator(userId) {
    const snap = await getDocs(query(collection(db, ASSIGN_COL), where('createdBy', '==', userId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async delete(id) {
    await deleteDoc(doc(db, ASSIGN_COL, id));
  }
};

export const SubmissionRepository = {
  async submit(data) {
    return await addDoc(collection(db, SUB_COL), {
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      studentName: data.studentName || '',
      content: data.content || '',
      fileUrl: data.fileUrl || '',
      submittedAt: serverTimestamp(),
      grade: null,
      feedback: ''
    });
  },

  async getByAssignment(assignmentId) {
    const snap = await getDocs(query(collection(db, SUB_COL), where('assignmentId', '==', assignmentId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByStudent(studentId) {
    const snap = await getDocs(query(collection(db, SUB_COL), where('studentId', '==', studentId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async grade(id, grade, feedback) {
    await updateDoc(doc(db, SUB_COL, id), { grade, feedback, gradedAt: serverTimestamp() });
  }
};
