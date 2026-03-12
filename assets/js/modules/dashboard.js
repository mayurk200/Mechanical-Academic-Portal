// ============================================================
// LMS Platform — Dashboard Module (Optimized)
// Data loaders for admin, teacher, and student dashboard stats
// Uses targeted queries, avoids full collection scans
// ============================================================

import { db } from '../../../config/firebase-config.js';
import {
  collection, getDocs, getCountFromServer, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadAdminStats() {
  try {
    // Phase 2: Massive Performance Optimization.
    // Replace fetching thousands of documents with getCountFromServer()
    const [
      usersCountSnap,
      coursesCountSnap,
      testsCountSnap,
      enrollmentsCountSnap,
      recentUsersSnap,
      recentCoursesSnap,
      studentCountSnap,
      teacherCountSnap,
      attendanceCountSnap,
      attendanceSnap
    ] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'courses')),
      getCountFromServer(collection(db, 'tests')),
      getCountFromServer(collection(db, 'enrollments')),
      getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(10))),
      getDocs(query(collection(db, 'courses'), orderBy('createdAt', 'desc'), limit(10))),
      getCountFromServer(query(collection(db, 'users'), where('role', '==', 'student'))),
      getCountFromServer(query(collection(db, 'users'), where('role', '==', 'teacher'))),
      getCountFromServer(collection(db, 'attendance')),
      getDocs(collection(db, 'attendance')) // Need records to calculate < 75%
    ]);

    // Calculate students below 75% attendance globally
    const attendanceRecords = attendanceSnap.docs.map(d => d.data());
    const studentStats = {};
    
    attendanceRecords.forEach(record => {
       if (record.records) {
          Object.entries(record.records).forEach(([studentId, status]) => {
             if (!studentStats[studentId]) studentStats[studentId] = { present: 0, total: 0 };
             studentStats[studentId].total++;
             if (status === 'Present') studentStats[studentId].present++;
          });
       }
    });

    let lowAttendanceCount = 0;
    Object.values(studentStats).forEach(stat => {
       const percentage = (stat.present / stat.total) * 100;
       if (percentage < 75) lowAttendanceCount++;
    });

    return {
      totalStudents: studentCountSnap.data().count,
      totalTeachers: teacherCountSnap.data().count,
      totalCourses: coursesCountSnap.data().count,
      totalTests: testsCountSnap.data().count,
      totalEnrollments: enrollmentsCountSnap.data().count,
      totalUsers: usersCountSnap.data().count,
      totalLectures: attendanceCountSnap.data().count,
      lowAttendanceCount: lowAttendanceCount,
      users: recentUsersSnap.docs.map(d => ({ uid: d.id, ...d.data() })),
      courses: recentCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  } catch (err) {
    console.error('loadAdminStats error:', err);
    return { totalStudents: 0, totalTeachers: 0, totalCourses: 0, totalTests: 0, totalEnrollments: 0, totalUsers: 0, users: [], courses: [] };
  }
}

// Phase 4: Full System Backup Snapshot
export async function exportDatabaseSnapshot() {
  const [users, courses, enrollments, attendance, tests] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'courses')),
    getDocs(collection(db, 'enrollments')),
    getDocs(collection(db, 'attendance')),
    getDocs(collection(db, 'tests'))
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    users: users.docs.map(d => ({ id: d.id, ...d.data() })),
    courses: courses.docs.map(d => ({ id: d.id, ...d.data() })),
    enrollments: enrollments.docs.map(d => ({ id: d.id, ...d.data() })),
    attendance: attendance.docs.map(d => ({ id: d.id, ...d.data() })),
    tests: tests.docs.map(d => ({ id: d.id, ...d.data() }))
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lms_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadTeacherStats(teacherId) {
  try {
    // Only fetch teacher's own data — not all enrollments
    const courses = await getDocs(query(collection(db, 'courses'), where('teacherId', '==', teacherId)));
    const courseIds = courses.docs.map(d => d.id);

    // Parallel: tests + assignments + enrollments for teacher's courses only
    const [tests, assignments] = await Promise.all([
      getDocs(query(collection(db, 'tests'), where('createdBy', '==', teacherId))),
      getDocs(query(collection(db, 'assignments'), where('createdBy', '==', teacherId)))
    ]);

    // Count students enrolled in teacher's courses (targeted queries)
    let totalStudentIds = new Set();
    for (const cid of courseIds) {
      const enr = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', cid)));
      enr.docs.forEach(d => totalStudentIds.add(d.data().studentId));
    }

    return {
      totalCourses: courses.size,
      totalTests: tests.size,
      totalAssignments: assignments.size,
      totalStudents: totalStudentIds.size,
      courses: courses.docs.map(d => ({ id: d.id, ...d.data() })),
      tests: tests.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  } catch (err) {
    console.error('loadTeacherStats error:', err);
    return { totalCourses: 0, totalTests: 0, totalAssignments: 0, totalStudents: 0, courses: [], tests: [] };
  }
}

export async function loadStudentStats(studentId) {
  try {
    const [enrollments, results, submissions] = await Promise.all([
      getDocs(query(collection(db, 'enrollments'), where('studentId', '==', studentId))),
      getDocs(query(collection(db, 'test_results'), where('studentId', '==', studentId))),
      getDocs(query(collection(db, 'submissions'), where('studentId', '==', studentId)))
    ]);

    const enrolledCourseIds = enrollments.docs.map(d => d.data().courseId);

    // Only fetch enrolled courses — not all courses
    let courses = [];
    if (enrolledCourseIds.length > 0) {
      const courseDocs = await getDocs(collection(db, 'courses'));
      courses = courseDocs.docs
        .filter(d => enrolledCourseIds.includes(d.id))
        .map(d => ({ id: d.id, ...d.data() }));
    }

    // Count available tests only for enrolled courses
    let availableTests = 0;
    for (const cid of enrolledCourseIds) {
      const t = await getDocs(query(collection(db, 'tests'), where('courseId', '==', cid)));
      availableTests += t.size;
    }

    return {
      enrolledCourses: enrollments.size,
      completedTests: results.size,
      submittedAssignments: submissions.size,
      availableTests,
      courses,
      results: results.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  } catch (err) {
    console.error('loadStudentStats error:', err);
    return { enrolledCourses: 0, completedTests: 0, submittedAssignments: 0, availableTests: 0, courses: [], results: [] };
  }
}
