// ============================================================
// LMS Platform — Attendance Repository
// Firestore CRUD for 'attendance' collection
// ============================================================

import {
  db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  query, where, serverTimestamp, increment
} from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.ATTENDANCE;

export const AttendanceRepository = {
  async mark(data) {
    // 1. Fetch existing attendance to check for state transitions
    const existing = await getDocs(query(
      collection(db, COL),
      where('courseId', '==', data.courseId),
      where('studentId', '==', data.studentId),
      where('date', '==', data.date)
    ));

    let previousStatus = null;
    let oldDocsCount = 0;

    // 2. Clean up any accidental duplicates for the same day
    for (const d of existing.docs) {
      previousStatus = d.data().status;
      await deleteDoc(d.ref);
      oldDocsCount++;
    }

    // 3. Insert new official record
    const result = await addDoc(collection(db, COL), {
      courseId: data.courseId,
      studentId: data.studentId,
      studentName: data.studentName || '',
      date: data.date,
      status: data.status,
      markedBy: data.markedBy,
      createdAt: serverTimestamp()
    });

    // 4. Update Student aggregate counters
    try {
      const userRef = doc(db, COLLECTIONS.USERS, data.studentId);
      let classIncrement = 0;
      let presentIncrement = 0;

      if (oldDocsCount === 0) {
        classIncrement = 1;
        if (data.status === 'present') presentIncrement = 1;
      } else {
        if (previousStatus === 'absent' && data.status === 'present') presentIncrement = 1;
        if (previousStatus === 'present' && data.status === 'absent') presentIncrement = -1;
      }

      if (classIncrement !== 0 || presentIncrement !== 0) {
        const updates = {};
        if (classIncrement !== 0) updates.aggTotalClasses = increment(classIncrement);
        if (presentIncrement !== 0) updates.aggTotalPresent = increment(presentIncrement);
        await updateDoc(userRef, updates);
      }
    } catch (e) {
      console.error("Failed to update student aggregate logic:", e);
    }

    return result;
  },

  async unmark(courseId, studentId, date) {
    const existing = await getDocs(query(
      collection(db, COL),
      where('courseId', '==', courseId),
      where('studentId', '==', studentId),
      where('date', '==', date)
    ));

    let previousStatus = null;
    let oldDocsCount = 0;

    for (const d of existing.docs) {
      previousStatus = d.data().status;
      await deleteDoc(d.ref);
      oldDocsCount++;
    }

    if (oldDocsCount > 0) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, studentId);
        const presentDecrement = previousStatus === 'present' ? -1 : 0;
        await updateDoc(userRef, {
          aggTotalClasses: increment(-1),
          aggTotalPresent: increment(presentDecrement)
        });
      } catch (e) {
        console.error("Failed to update student aggregate on unmark:", e);
      }
    }
    return true;
  },

  async getByCourse(courseId) {
    try {
      const snap = await getDocs(query(collection(db, COL), where('courseId', '==', courseId)));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        return (b.date || '').localeCompare(a.date || '');
      });
    } catch (err) {
      console.error('AttendanceRepository.getByCourse error:', err);
      return [];
    }
  },

  async getByStudent(studentId) {
    const snap = await getDocs(query(collection(db, COL), where('studentId', '==', studentId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByDate(courseId, date) {
    const snap = await getDocs(query(
      collection(db, COL),
      where('courseId', '==', courseId),
      where('date', '==', date)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getStudentPercentage(studentId, courseId = null) {
    if (courseId) {
      const q = query(collection(db, COL), where('studentId', '==', studentId), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      if (snap.empty) return { percentage: 0, present: 0, total: 0 };
      const records = snap.docs.map(d => d.data());
      const present = records.filter(r => r.status === 'present').length;
      const total = records.length;
      return { percentage: Math.round((present / total) * 100), present, total };
    }

    // Global — use aggregate counters from user document
    const { UserRepository } = await import('./userRepository.js');
    const student = await UserRepository.get(studentId);
    if (student && typeof student.aggTotalClasses === 'number') {
      const total = student.aggTotalClasses;
      const present = student.aggTotalPresent || 0;
      return {
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        present,
        total
      };
    }

    // Fallback for legacy students
    const q = query(collection(db, COL), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    if (snap.empty) return { percentage: 0, present: 0, total: 0 };
    const records = snap.docs.map(d => d.data());
    const present = records.filter(r => r.status === 'present').length;
    const total = records.length;
    return { percentage: Math.round((present / total) * 100), present, total };
  },

  async getCourseStudentPercentages(courseId) {
    const records = await this.getByCourse(courseId);
    const studentMap = {};
    records.forEach(r => {
      if (!studentMap[r.studentId]) {
        studentMap[r.studentId] = { name: r.studentName, present: 0, total: 0 };
      }
      studentMap[r.studentId].total++;
      if (r.status === 'present') studentMap[r.studentId].present++;
    });
    return Object.entries(studentMap).map(([studentId, data]) => ({
      studentId,
      studentName: data.name,
      present: data.present,
      total: data.total,
      percentage: Math.round((data.present / data.total) * 100)
    }));
  },

  async getMonthlyByCourse(courseId, yearMonth) {
    const records = await this.getByCourse(courseId);
    if (!yearMonth) return records;
    return records.filter(r => r.date && r.date.startsWith(yearMonth));
  },

  async getAll() {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};
