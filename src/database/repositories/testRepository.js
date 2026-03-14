// ============================================================
// LMS Platform — Test Repository
// Firestore CRUD for 'tests' and 'question_bank' collections
// ============================================================

import {
  db, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, limit
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.TESTS;
const QB_COL = COLLECTIONS.QUESTION_BANK;

export const TestRepository = {
  async create(data) {
    return await addDoc(collection(db, COL), {
      courseId: data.courseId,
      sectionId: data.sectionId || '',
      title: data.title,
      description: data.description || '',
      duration: data.duration || 30,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      attemptLimit: data.attemptLimit || 1,
      negativeMarking: data.negativeMarking || false,
      negativeMarkValue: data.negativeMarkValue || 0,
      randomOrder: data.randomOrder || false,
      shuffleOptions: data.shuffleOptions || false,
      disableCopy: data.disableCopy || false,
      tabSwitchLimit: data.tabSwitchLimit || 3,
      totalMarks: data.totalMarks || 0,
      questions: data.questions || [],
      showResultToStudents: data.showResultToStudents || false,
      createdBy: data.createdBy,
      createdAt: serverTimestamp()
    });
  },

  async get(id) {
    const snap = await getDoc(doc(db, COL, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc'), limit(500)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCourse(courseId) {
    const snap = await getDocs(query(collection(db, COL), where('courseId', '==', courseId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCreator(userId) {
    const snap = await getDocs(query(collection(db, COL), where('createdBy', '==', userId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async delete(id) {
    await deleteDoc(doc(db, COL, id));
  },

  async update(id, data) {
    await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
  },

  async toggleResultVisibility(id) {
    const test = await this.get(id);
    if (!test) return;
    await this.update(id, { showResultToStudents: !test.showResultToStudents });
    return !test.showResultToStudents;
  },

  async count() {
    const snap = await getDocs(collection(db, COL));
    return snap.size;
  }
};

// ── Question Bank Repository ────────────
export const QuestionBankRepository = {
  async add(data) {
    return await addDoc(collection(db, QB_COL), {
      courseId: data.courseId || '',
      question: data.question,
      type: data.type || 'mcq',
      options: data.options || [],
      correctAnswer: data.correctAnswer,
      explanation: data.explanation || '',
      marks: data.marks || 1,
      difficulty: data.difficulty || 'medium',
      tags: data.tags || [],
      createdBy: data.createdBy,
      createdAt: serverTimestamp()
    });
  },

  async getAll(courseId) {
    const q = courseId
      ? query(collection(db, QB_COL), where('courseId', '==', courseId))
      : query(collection(db, QB_COL));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async update(id, data) {
    await updateDoc(doc(db, QB_COL, id), data);
  },

  async delete(id) {
    await deleteDoc(doc(db, QB_COL, id));
  }
};
