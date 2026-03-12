// ============================================================
// LMS Platform — Database Service Layer (Firestore DAL)
// All Firestore CRUD operations organized into service classes
// ============================================================

import { db } from '../config/firebase-config.js';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
  setDoc, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Memory Cache for Frequent UI Reads ────
const _userCache = new Map();
const _courseCache = new Map();
const _enrollmentCache = new Map();
const _enrollCourseCache = new Map();

// ── UserService ──────────────────────────
export const UserService = {
  async create(uid, data) {
    await setDoc(doc(db, 'users', uid), {
      name: data.name || '',
      email: data.email || '',
      role: data.role || 'student',
      urn: data.urn || '',
      rollNo: data.rollNo || '',
      department: data.department || '',
      phone: data.phone || '',
      profilePhoto: '',
      createdAt: serverTimestamp()
    });
  },

  async get(uid) {
    if (_userCache.has(uid)) return _userCache.get(uid);
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = { uid: snap.id, ...snap.data() };
      _userCache.set(uid, data);
      return data;
    }
    return null;
  },

  async update(uid, data) {
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
    _userCache.delete(uid);
  },

  async delete(uid) {
    const userDoc = await this.get(uid);
    if (!userDoc) return;

    // If student, cascade delete their academic footprint
    if (userDoc.role === 'student') {
      // 1. Delete enrollments
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', uid)));
      for (const d of enrollSnap.docs) await deleteDoc(d.ref);

      // 2. Delete test results
      const resSnap = await getDocs(query(collection(db, 'test_results'), where('studentId', '==', uid)));
      for (const d of resSnap.docs) await deleteDoc(d.ref);

      // 3. Delete attendance
      const attSnap = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', uid)));
      for (const d of attSnap.docs) await deleteDoc(d.ref);
    }

    await deleteDoc(doc(db, 'users', uid));
    _userCache.delete(uid);
    
    ActivityLogService.log('System', 'DELETE_USER', `Deleted ${userDoc.role}: ${userDoc.name || uid}`).catch(console.error);
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  },

  async getByRole(role) {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', role)));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  },

  async count() {
    const snap = await getDocs(collection(db, 'users'));
    return snap.size;
  },

  async countByRole(role) {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', role)));
    return snap.size;
  },

  // Get all students created by a specific teacher/admin
  async getByCreator(creatorUid) {
    const snap = await getDocs(query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('createdBy', '==', creatorUid)
    ));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  },

  // Check if URN is unique (returns true if available)
  async isUrnUnique(urn) {
    const snap = await getDocs(query(
      collection(db, 'users'),
      where('urn', '==', urn)
    ));
    return snap.empty;
  }
};

// ── CourseService ─────────────────────────
export const CourseService = {
  async create(data) {
    const docRef = await addDoc(collection(db, 'courses'), {
      title: data.title,
      description: data.description || '',
      code: data.code || '',
      teacherId: data.teacherId,
      teacherName: data.teacherName || '',
      category: data.category || '',
      createdAt: serverTimestamp()
    });
    ActivityLogService.log(data.teacherId || 'System', 'CREATE_COURSE', `Created course: ${data.title}`).catch(console.error);
    return docRef;
  },

  async get(id) {
    if (_courseCache.has(id)) return _courseCache.get(id);
    const snap = await getDoc(doc(db, 'courses', id));
    if (snap.exists()) {
       const data = { id: snap.id, ...snap.data() };
       _courseCache.set(id, data);
       return data;
    }
    return null;
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, 'courses'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByTeacher(teacherId) {
    const snap = await getDocs(query(collection(db, 'courses'), where('teacherId', '==', teacherId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async update(id, data) {
    await updateDoc(doc(db, 'courses', id), { ...data, updatedAt: serverTimestamp() });
    _courseCache.delete(id);
  },

  async delete(id) {
    const courseDoc = await this.get(id);
    await deleteDoc(doc(db, 'courses', id));
    _courseCache.delete(id);
    if (courseDoc) {
      ActivityLogService.log('System', 'DELETE_COURSE', `Deleted course: ${courseDoc.title}`).catch(console.error);
    }
  },

  // Cascade delete: course + enrollments + tests + results + attendance + assignments + question bank
  async cascadeDelete(id) {
    const courseDoc = await this.get(id);
    
    // 1. Delete enrollments for this course
    const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', id)));
    for (const d of enrollSnap.docs) await deleteDoc(d.ref);
    
    // 2. Delete tests and results
    const testSnap = await getDocs(query(collection(db, 'tests'), where('courseId', '==', id)));
    for (const d of testSnap.docs) {
      const resSnap = await getDocs(query(collection(db, 'test_results'), where('testId', '==', d.id)));
      for (const r of resSnap.docs) await deleteDoc(r.ref);
      await deleteDoc(d.ref);
    }

    // 3. Delete attendance records
    const attSnap = await getDocs(query(collection(db, 'attendance'), where('courseId', '==', id)));
    for (const d of attSnap.docs) await deleteDoc(d.ref);

    // 4. Delete assignments and submissions
    const assignSnap = await getDocs(query(collection(db, 'assignments'), where('courseId', '==', id)));
    for (const d of assignSnap.docs) {
       const subSnap = await getDocs(query(collection(db, 'submissions'), where('assignmentId', '==', d.id)));
       for (const s of subSnap.docs) await deleteDoc(s.ref);
       await deleteDoc(d.ref);
    }

    // 5. Delete question bank items
    const qSnap = await getDocs(query(collection(db, 'question_bank'), where('courseId', '==', id)));
    for (const d of qSnap.docs) await deleteDoc(d.ref);
    
    // 6. Delete sections
    const secSnap = await getDocs(query(collection(db, 'sections'), where('courseId', '==', id)));
    for (const d of secSnap.docs) await deleteDoc(d.ref);
    
    // 7. Delete course
    await deleteDoc(doc(db, 'courses', id));
    _courseCache.delete(id);
    
    if (courseDoc) {
      ActivityLogService.log('System', 'CASCADE_DELETE_COURSE', `Deleted course and all dependencies: ${courseDoc.title}`).catch(console.error);
    }
  },

  async count() {
    const snap = await getDocs(collection(db, 'courses'));
    return snap.size;
  }
};

// ── SectionService ────────────────────────
export const SectionService = {
  async create(data) {
    return await addDoc(collection(db, 'sections'), {
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
      collection(db, 'sections'),
      where('courseId', '==', courseId),
      orderBy('order', 'asc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async update(id, data) {
    await updateDoc(doc(db, 'sections', id), data);
  },

  async delete(id) {
    await deleteDoc(doc(db, 'sections', id));
  },

  async addMaterial(sectionId, material) {
    const snap = await getDoc(doc(db, 'sections', sectionId));
    if (snap.exists()) {
      const materials = snap.data().materials || [];
      materials.push({ ...material, addedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'sections', sectionId), { materials });
    }
  }
};

// ── EnrollmentService (Teacher-Assigned) ──
export const EnrollmentService = {
  // Teacher assigns a course to a student
  async assignCourse(studentId, courseId, teacherId) {
    // Check duplicate
    const existing = await getDocs(query(
      collection(db, 'enrollments'),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    ));
    if (!existing.empty) throw new Error('Student already assigned to this course');

    const result = await addDoc(collection(db, 'enrollments'), {
      studentId,
      courseId,
      teacherId,
      assignedDate: serverTimestamp()
    });
    
    // Invalidate enrollment caches
    _enrollmentCache.delete(courseId);
    _enrollCourseCache.delete(studentId);
    
    return result;
  },

  // Assign multiple students to a course at once
  async bulkAssign(studentIds, courseId, teacherId) {
    const results = [];
    for (const studentId of studentIds) {
      try {
        const r = await this.assignCourse(studentId, courseId, teacherId);
        results.push({ studentId, success: true });
      } catch (err) {
        results.push({ studentId, success: false, error: err.message });
      }
    }
    return results;
  },

  async unenroll(studentId, courseId) {
    const snap = await getDocs(query(
      collection(db, 'enrollments'),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    ));
    const promises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(promises);
    
    _enrollmentCache.delete(courseId);
    _enrollCourseCache.delete(studentId);
  },

  async getByStudent(studentId) {
    if (_enrollCourseCache.has(studentId)) return _enrollCourseCache.get(studentId);
    const snap = await getDocs(query(
      collection(db, 'enrollments'),
      where('studentId', '==', studentId)
    ));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _enrollCourseCache.set(studentId, data);
    return data;
  },

  // Get full course objects for a student (enrolled courses only)
  async getEnrolledCourses(studentId) {
    const enrollments = await this.getByStudent(studentId);
    if (enrollments.length === 0) return [];
    const courseIds = enrollments.map(e => e.courseId);
    const allCourses = await getDocs(collection(db, 'courses'));
    return allCourses.docs
      .filter(d => courseIds.includes(d.id))
      .map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCourse(courseId) {
    if (_enrollmentCache.has(courseId)) return _enrollmentCache.get(courseId);
    const snap = await getDocs(query(
      collection(db, 'enrollments'),
      where('courseId', '==', courseId)
    ));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _enrollmentCache.set(courseId, data);
    return data;
  },

  async isEnrolled(studentId, courseId) {
    const snap = await getDocs(query(
      collection(db, 'enrollments'),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    ));
    return !snap.empty;
  },

  async countByCourse(courseId) {
    const snap = await getDocs(query(
      collection(db, 'enrollments'),
      where('courseId', '==', courseId)
    ));
    return snap.size;
  },

  async getAll() {
    const snap = await getDocs(collection(db, 'enrollments'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};

// ── TestService ───────────────────────────
export const TestService = {
  async create(data) {
    return await addDoc(collection(db, 'tests'), {
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
      totalMarks: data.totalMarks || 0,
      questions: data.questions || [],
      showResultToStudents: data.showResultToStudents || false,
      createdBy: data.createdBy,
      createdAt: serverTimestamp()
    });
  },

  async get(id) {
    const snap = await getDoc(doc(db, 'tests', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, 'tests'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCourse(courseId) {
    const snap = await getDocs(query(
      collection(db, 'tests'),
      where('courseId', '==', courseId)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCreator(userId) {
    const snap = await getDocs(query(
      collection(db, 'tests'),
      where('createdBy', '==', userId)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async delete(id) {
    await deleteDoc(doc(db, 'tests', id));
  },

  async update(id, data) {
    await updateDoc(doc(db, 'tests', id), { ...data, updatedAt: serverTimestamp() });
  },

  async toggleResultVisibility(id) {
    const test = await this.get(id);
    if (!test) return;
    await this.update(id, { showResultToStudents: !test.showResultToStudents });
    return !test.showResultToStudents;
  },

  async count() {
    const snap = await getDocs(collection(db, 'tests'));
    return snap.size;
  }
};

// ── QuestionBankService ───────────────────
export const QuestionBankService = {
  async add(data) {
    return await addDoc(collection(db, 'question_bank'), {
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
      ? query(collection(db, 'question_bank'), where('courseId', '==', courseId))
      : query(collection(db, 'question_bank'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async update(id, data) {
    await updateDoc(doc(db, 'question_bank', id), data);
  },

  async delete(id) {
    await deleteDoc(doc(db, 'question_bank', id));
  }
};

// ── ResultService ─────────────────────────
export const ResultService = {
  async submit(data) {
    return await addDoc(collection(db, 'test_results'), {
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
      submittedAt: serverTimestamp()
    });
  },

  // Fixed: removed orderBy to avoid requiring composite index
  // Sort client-side instead
  async getByTest(testId) {
    try {
      const snap = await getDocs(query(
        collection(db, 'test_results'),
        where('testId', '==', testId)
      ));
      console.log(`ResultService.getByTest(${testId}): found ${snap.size} results`);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (err) {
      console.error('ResultService.getByTest error:', err);
      return [];
    }
  },

  async getByStudent(studentId) {
    try {
      const snap = await getDocs(query(
        collection(db, 'test_results'),
        where('studentId', '==', studentId)
      ));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('ResultService.getByStudent error:', err);
      return [];
    }
  },

  async getByCourse(courseId) {
    try {
      const snap = await getDocs(query(
        collection(db, 'test_results'),
        where('courseId', '==', courseId)
      ));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('ResultService.getByCourse error:', err);
      return [];
    }
  },

  async hasAttempted(testId, studentId) {
    const snap = await getDocs(query(
      collection(db, 'test_results'),
      where('testId', '==', testId),
      where('studentId', '==', studentId)
    ));
    return snap.size;
  }
};

// ── AssignmentService ─────────────────────
export const AssignmentService = {
  async create(data) {
    return await addDoc(collection(db, 'assignments'), {
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
    const snap = await getDocs(query(collection(db, 'assignments'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCourse(courseId) {
    const snap = await getDocs(query(
      collection(db, 'assignments'),
      where('courseId', '==', courseId)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCreator(userId) {
    const snap = await getDocs(query(
      collection(db, 'assignments'),
      where('createdBy', '==', userId)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async delete(id) {
    await deleteDoc(doc(db, 'assignments', id));
  }
};

// ── SubmissionService ─────────────────────
export const SubmissionService = {
  async submit(data) {
    return await addDoc(collection(db, 'submissions'), {
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
    const snap = await getDocs(query(
      collection(db, 'submissions'),
      where('assignmentId', '==', assignmentId)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByStudent(studentId) {
    const snap = await getDocs(query(
      collection(db, 'submissions'),
      where('studentId', '==', studentId)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async grade(id, grade, feedback) {
    await updateDoc(doc(db, 'submissions', id), { grade, feedback, gradedAt: serverTimestamp() });
  }
};

// ── AttendanceService ─────────────────────
export const AttendanceService = {
  async mark(data) {
    // 1. Fetch existing attendance to check for state transitions
    const existing = await getDocs(query(
      collection(db, 'attendance'),
      where('courseId', '==', data.courseId),
      where('studentId', '==', data.studentId),
      where('date', '==', data.date)
    ));
    
    let previousStatus = null;
    let oldDocsCount = 0;
    
    // 2. Clean up any accidental duplicates for the same day (should be 1)
    for (const d of existing.docs) { 
       previousStatus = d.data().status;
       await deleteDoc(d.ref); 
       oldDocsCount++;
    }

    // 3. Insert new official record
    const result = await addDoc(collection(db, 'attendance'), {
      courseId: data.courseId,
      studentId: data.studentId,
      studentName: data.studentName || '',
      date: data.date,
      status: data.status,
      markedBy: data.markedBy,
      createdAt: serverTimestamp()
    });
    
    // 4. Update the Student Document with Fast-Aggregate Counters
    // By keeping a running tally on the student object, we never have to query 1000s of attendance documents again just to calc a percentage.
    try {
       const userRef = doc(db, 'users', data.studentId);
       let classIncrement = 0;
       let presentIncrement = 0;
       
       if(oldDocsCount === 0) {
          // New entirely
          classIncrement = 1;
          if(data.status === 'present') presentIncrement = 1;
       } else {
          // Updating an existing record
          if(previousStatus === 'absent' && data.status === 'present') presentIncrement = 1;
          if(previousStatus === 'present' && data.status === 'absent') presentIncrement = -1;
       }
       
       if(classIncrement !== 0 || presentIncrement !== 0) {
          const updates = {};
          if(classIncrement !== 0) updates.aggTotalClasses = increment(classIncrement);
          if(presentIncrement !== 0) updates.aggTotalPresent = increment(presentIncrement);
          await updateDoc(userRef, updates);
          _userCache.delete(data.studentId); // flush cache
       }
    } catch(e) {
       console.error("Failed to update student aggregate logic:", e);
    }
    
    return result;
  },

  // Fixed: removed orderBy to avoid requiring composite index — sort client-side
  async getByCourse(courseId) {
    try {
      const snap = await getDocs(query(
        collection(db, 'attendance'),
        where('courseId', '==', courseId)
      ));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        const da = a.date || ''; const db2 = b.date || '';
        return db2.localeCompare(da);
      });
    } catch (err) {
      console.error('AttendanceService.getByCourse error:', err);
      return [];
    }
  },

  async getByStudent(studentId) {
    const snap = await getDocs(query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByDate(courseId, date) {
    const snap = await getDocs(query(
      collection(db, 'attendance'),
      where('courseId', '==', courseId),
      where('date', '==', date)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Fast global student attendance lookup
  async getStudentPercentage(studentId, courseId = null) {
    // If asking for a specific course, we still count it manually (or map it later)
    if (courseId) {
      const q = query(collection(db, 'attendance'), where('studentId', '==', studentId), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      if (snap.empty) return { percentage: 0, present: 0, total: 0 };
      const records = snap.docs.map(d => d.data());
      const present = records.filter(r => r.status === 'present').length;
      const total = records.length;
      return { percentage: Math.round((present / total) * 100), present, total };
    }
    
    // Global percentage lookup: O(1) read using the new aggregate counters
    const student = await UserService.get(studentId);
    if(student && typeof student.aggTotalClasses === 'number') {
       const total = student.aggTotalClasses;
       const present = student.aggTotalPresent || 0;
       return { 
          percentage: total > 0 ? Math.round((present / total) * 100) : 0, 
          present, 
          total 
       };
    }
    
    // Fallback: If legacy student from before optimizations
    const q = query(collection(db, 'attendance'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    if (snap.empty) return { percentage: 0, present: 0, total: 0 };
    const records = snap.docs.map(d => d.data());
    const present = records.filter(r => r.status === 'present').length;
    const total = records.length;
    return { percentage: Math.round((present / total) * 100), present, total };
  },

  // Get attendance percentages for all students in a course
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

  // Get attendance records for a specific course filtered by month (YYYY-MM)
  async getMonthlyByCourse(courseId, yearMonth) {
    const records = await this.getByCourse(courseId);
    if (!yearMonth) return records;
    return records.filter(r => r.date && r.date.startsWith(yearMonth));
  },

  async getAll() {
    const snap = await getDocs(collection(db, 'attendance'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};

// ── NotificationService ───────────────────
export const NotificationService = {
  async create(data) {
    return await addDoc(collection(db, 'notifications'), {
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
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async markRead(id) {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  },

  async markAllRead(userId) {
    const snap = await getDocs(query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    ));
    const promises = snap.docs.map(d => updateDoc(d.ref, { read: true }));
    await Promise.all(promises);
  },

  async getUnreadCount(userId) {
    const snap = await getDocs(query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    ));
    return snap.size;
  }
};

// ── ActivityLogService ────────────────────
export const ActivityLogService = {
  async log(userId, action, details = '') {
    return await addDoc(collection(db, 'activity_logs'), {
      userId,
      action,
      details,
      timestamp: serverTimestamp()
    });
  },

  async getRecent(limitCount = 20) {
    const snap = await getDocs(query(
      collection(db, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};
