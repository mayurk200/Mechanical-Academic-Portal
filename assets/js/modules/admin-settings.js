import { initApp } from '../core/router.js';
import { db } from '../../../config/firebase-config.js';
import app from '../../../config/firebase-config.js';
import { collection, getDocs, deleteDoc, doc, writeBatch, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { ActivityLogService, CourseService, EnrollmentService, UserService } from '../../../services/database.js';
import { showToast, showConfirm, showPasswordPrompt, withLoadingButton, LMSLogger, friendlyError } from '../core/utils.js';
import { verifyCurrentPassword } from '../core/auth.js';

const functions = getFunctions(app);

let currentUserUid = null;

async function init() {
  try {
    const user = await initApp(['admin']);
    currentUserUid = user.uid;
    setupEventListeners();
  } catch (err) {
    LMSLogger.error('Settings Init Failed', err);
  }
}

// Global Wiping Utility
async function wipeCollection(collectionName) {
   const snap = await getDocs(collection(db, collectionName));
   let count = 0;
   const deletePromises = snap.docs.map(d => {
      count++;
      return deleteDoc(d.ref);
   });
   
   // We batch them in memory, firestore handles the requests concurrently
   await Promise.all(deletePromises);
   return count;
}

// Password-protected action wrapper
async function requirePassword(actionName) {
  try {
    const password = await showPasswordPrompt(
      `Authenticate to ${actionName}`,
      'This is a protected action. Enter your admin password to continue.'
    );
    await verifyCurrentPassword(password);
    return true;
  } catch (err) {
    if (err.message === 'Cancelled') {
      showToast('Action cancelled.', 'info');
    } else if (err.message === 'Incorrect password') {
      showToast('Incorrect password. Action blocked.', 'error');
    } else {
      showToast(friendlyError(err), 'error');
    }
    return false;
  }
}

// Delete Firebase Auth accounts via Cloud Function
async function deleteAuthAccounts(uids) {
  try {
    const deleteAuthUsersFn = httpsCallable(functions, 'deleteAuthUsers');
    const result = await deleteAuthUsersFn({ uids });
    const data = result.data;

    if (data.errors && data.errors.length > 0) {
      LMSLogger.info(`Auth deletion: ${data.deleted} deleted, ${data.errors.length} failed`, data.errors);
    }

    LMSLogger.info(`Deleted ${data.deleted} Firebase Auth accounts.`);
    return data;
  } catch (err) {
    // If Cloud Function is not deployed yet, warn but don't block
    if (err.code === 'functions/not-found' || err.message?.includes('not found') || err.code === 'functions/unavailable') {
      showToast('⚠ Cloud Function not deployed — Auth accounts were NOT deleted. Firestore data was removed.', 'warning');
      LMSLogger.info('Cloud Function "deleteAuthUsers" not deployed. Skipping Auth deletion.', err);
    } else {
      showToast(`Warning: Auth deletion failed — ${err.message}. Firestore data was removed.`, 'warning');
      LMSLogger.database('Failed to delete Auth accounts', err);
    }
    return { deleted: 0, errors: [] };
  }
}

function setupEventListeners() {
  
  // Clear Test Results
  const btnResults = document.getElementById('btn-clear-results');
  btnResults.addEventListener('click', async () => {
    const confirmed = await showConfirm(
       'Clear All Test Results', 
       `You are about to permanently delete <strong>EVERY test submission and grade</strong> across the entire system. Are you absolutely sure?`,
       { confirmText: 'Yes, Delete All Results', type: 'danger' }
    );

    if (confirmed) {
       // Require password verification
       const authenticated = await requirePassword('Clear Test Results');
       if (!authenticated) return;

       await withLoadingButton(btnResults, async () => {
          try {
             // Wipe 'test_results'
             const count = await wipeCollection('test_results');
             await wipeCollection('submissions'); // Just in case there are assignment submissions
             
             showToast(`Successfully deleted ${count} test results.`, 'success');
             await ActivityLogService.log(currentUserUid, 'SYSTEM_WIPE_RESULTS', `Purged ${count} test results.`);
          } catch(err) {
             LMSLogger.database('Failed to clear results', err);
             showToast(friendlyError(err), 'error');
          }
       }, 'Deleting...');
    }
  });

  // Purge Attendance
  const btnAttendance = document.getElementById('btn-purge-attendance');
  btnAttendance.addEventListener('click', async () => {
    const confirmed = await showConfirm(
       'Purge Attendance Records', 
       `You are about to obliterate <strong>ALL attendance data</strong> for all courses and students in the system.`,
       { confirmText: 'Yes, Purge Attendance', type: 'danger' }
    );

    if (confirmed) {
       // Require password verification
       const authenticated = await requirePassword('Purge Attendance');
       if (!authenticated) return;

       await withLoadingButton(btnAttendance, async () => {
          try {
             const count = await wipeCollection('attendance');
             showToast(`Successfully purged ${count} attendance records.`, 'success');
             await ActivityLogService.log(currentUserUid, 'SYSTEM_WIPE_ATTENDANCE', `Purged ${count} attendance logs.`);
          } catch(err) {
             LMSLogger.database('Failed to purge attendance', err);
             showToast(friendlyError(err), 'error');
          }
       }, 'Purging...');
    }
  });

  // Clear Courses
  const btnCourses = document.getElementById('btn-clear-courses');
  btnCourses.addEventListener('click', async () => {
    const confirmed = await showConfirm(
       'Obliterate All Courses', 
       `This action will delete EVERY course in the system. Enrollments and tests tied to them will also vanish.`,
       { confirmText: 'Yes, Obliterate Courses', type: 'danger' }
    );

    if (confirmed) {
       // Require password verification
       const authenticated = await requirePassword('Obliterate Courses');
       if (!authenticated) return;

       await withLoadingButton(btnCourses, async () => {
          try {
             const courses = await CourseService.getAll();
             let count = 0;
             for (const c of courses) {
                // Must use cascadeDelete to ensure enrollments and tests are cleaned
                await CourseService.cascadeDelete(c.id);
                count++;
             }
             showToast(`Successfully obliterated ${count} courses.`, 'success');
             await ActivityLogService.log(currentUserUid, 'SYSTEM_WIPE_COURSES', `Obliterated all ${count} courses and their nested data.`);
          } catch(err) {
             LMSLogger.database('Failed to clear courses', err);
             showToast(friendlyError(err), 'error');
          }
       }, 'Obliterating...');
    }
  });

  // Purge All Students
  const btnPurgeStudents = document.getElementById('btn-purge-students');
  if (btnPurgeStudents) {
    btnPurgeStudents.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        'Purge All Students',
        `<div class="text-danger fw-bold mb-2">⚠ DESTRUCTIVE ACTION</div>
         This will permanently delete <strong>every student account</strong> and all their associated data:
         <ul class="mt-2 mb-0 small">
           <li>Student user profiles from the database</li>
           <li>All enrollments across every course</li>
           <li>All attendance records</li>
           <li>All test results and submissions</li>
         </ul>
         <div class="mt-2 text-muted small">Admin and Teacher accounts will NOT be affected.</div>`,
        { confirmText: 'Yes, Purge All Students', type: 'danger' }
      );

      if (confirmed) {
        const authenticated = await requirePassword('Purge All Students');
        if (!authenticated) return;

        await withLoadingButton(btnPurgeStudents, async () => {
          try {
            // 1. Get all students
            const students = await UserService.getByRole('student');
            const studentUids = students.map(s => s.uid);
            let deletedCount = 0;

            for (const student of students) {
              // Delete enrollments
              const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', student.uid)));
              for (const d of enrollSnap.docs) await deleteDoc(d.ref);

              // Delete attendance records
              const attSnap = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', student.uid)));
              for (const d of attSnap.docs) await deleteDoc(d.ref);

              // Delete test results
              const resSnap = await getDocs(query(collection(db, 'test_results'), where('studentId', '==', student.uid)));
              for (const d of resSnap.docs) await deleteDoc(d.ref);

              // Delete submissions
              const subSnap = await getDocs(query(collection(db, 'submissions'), where('studentId', '==', student.uid)));
              for (const d of subSnap.docs) await deleteDoc(d.ref);

              // Delete student user document from Firestore
              await deleteDoc(doc(db, 'users', student.uid));
              deletedCount++;
            }

            // 2. Delete from Firebase Authentication via Cloud Function
            if (studentUids.length > 0) {
              await deleteAuthAccounts(studentUids);
            }

            showToast(`Purged ${deletedCount} student accounts and all their data.`, 'success');
            await ActivityLogService.log(currentUserUid, 'SYSTEM_PURGE_STUDENTS', `Purged ${deletedCount} students and all associated data (including Auth accounts) across all courses.`);
            setTimeout(() => location.reload(), 2000);
          } catch (err) {
            LMSLogger.database('Failed to purge students', err);
            showToast(friendlyError(err), 'error');
          }
        }, 'Purging Students...');
      }
    });
  }

  // Factory Reset
  const btnFactory = document.getElementById('btn-factory-reset');
  if (btnFactory) {
    btnFactory.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        'FACTORY RESET SYSTEM', 
        `<div class="text-danger fw-bold mb-2">CRITICAL WARNING!</div>
         This will wipe all Students, Courses, Attendance, and Tests. 
         Only Admin and Teacher accounts will survive. This cannot be undone.`,
        { confirmText: 'I Understand, Reset System', type: 'danger' }
      );

      if (confirmed) {
        // Require password verification for factory reset
        const authenticated = await requirePassword('Factory Reset');
        if (!authenticated) return;

        await withLoadingButton(btnFactory, async () => {
          try {
            const collectionsToWipe = ['attendance', 'test_results', 'submissions', 'enrollments', 'assignments', 'tests', 'sections'];
            for (const col of collectionsToWipe) {
              await wipeCollection(col);
            }

            const courses = await CourseService.getAll();
            for (const c of courses) {
              await CourseService.delete(c.id);
            }

            const students = await UserService.getByRole('student');
            const studentUids = students.map(s => s.uid);
            for (const s of students) {
              await UserService.delete(s.uid);
            }

            // Delete from Firebase Authentication via Cloud Function
            if (studentUids.length > 0) {
              await deleteAuthAccounts(studentUids);
            }
            
            showToast('System has been factory reset.', 'success');
            await ActivityLogService.log(currentUserUid, 'SYSTEM_FACTORY_RESET', 'Performed a full system factory reset.');
            setTimeout(() => location.reload(), 2000);
          } catch(err) {
            LMSLogger.database('Factory reset failed', err);
            showToast(friendlyError(err), 'error');
          }
        }, 'Resetting...');
      }
    });
  }

  async function fetchAllExportData() {
    return Promise.all([
      UserService.getAll(),
      CourseService.getAll(),
      getDocs(collection(db, 'attendance')),
      getDocs(collection(db, 'enrollments')),
      getDocs(collection(db, 'tests')),
      getDocs(collection(db, 'test_results')),
      getDocs(collection(db, 'assignments')),
      getDocs(collection(db, 'submissions')),
      ActivityLogService.getAll()
    ]);
  }

  const toDateStr = (ts) => ts?.toDate ? ts.toDate().toLocaleString() : '';
  const toISODateStr = (ts) => ts?.toDate ? ts.toDate().toISOString() : '';

  // Export Data Logic shared wrapper
  async function handleExport(buttonId, isJsExport = false) {
    const btnRef = document.getElementById('btn-export-dropdown'); // Use the parent button for loading state
    await withLoadingButton(btnRef, async () => {
      try {
        const [users, courses, attendanceSnap, enrollmentsSnap, testsSnap, resultsSnap, assignmentsSnap, submissionsSnap, activityLogs] = await fetchAllExportData();

        if (isJsExport) {
          // Export as JS File
          const exportObj = {
            users: users.map(u => ({ ...u, createdAt: toISODateStr(u.createdAt) })),
            courses: courses.map(c => ({ ...c, createdAt: toISODateStr(c.createdAt) })),
            enrollments: enrollmentsSnap.docs.map(d => ({ id: d.id, ...d.data(), assignedDate: toISODateStr(d.data().assignedDate) })),
            attendance: attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            tests: testsSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toISODateStr(d.data().createdAt) })),
            testResults: resultsSnap.docs.map(d => ({ id: d.id, ...d.data(), submittedAt: toISODateStr(d.data().submittedAt) })),
            assignments: assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toISODateStr(d.data().createdAt) })),
            submissions: submissionsSnap.docs.map(d => ({ id: d.id, ...d.data(), submittedAt: toISODateStr(d.data().submittedAt) })),
            activityLogs: activityLogs.map(l => ({ ...l, timestamp: toISODateStr(l.timestamp) }))
          };

          const jsContent = `/** LMS Full Backup - ${new Date().toISOString()} **/\n\nexport const LMSDataBackup = ${JSON.stringify(exportObj, null, 2)};\n\nexport default LMSDataBackup;\n`;

          const blob = new Blob([jsContent], { type: 'text/javascript' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `LMS_Full_Backup_${new Date().toISOString().split('T')[0]}.js`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          showToast('Data exported successfully as JavaScript file!', 'success');
          await ActivityLogService.log(currentUserUid, 'EXPORT_ALL_DATA_JS', 'Exported full JS backup file.');
        } else {
          // Export as Excel
          const wb = XLSX.utils.book_new();

          // 1. Users
          const usersSheet = XLSX.utils.json_to_sheet(users.map(u => ({
            Name: u.name, Email: u.email, Role: u.role, URN: u.urn || '',
            RollNo: u.rollNo || '', Department: u.department || '',
            Phone: u.phone || '', Registered: toDateStr(u.createdAt)
          })));
          XLSX.utils.book_append_sheet(wb, usersSheet, "Users");

          // 2. Courses
          const coursesSheet = XLSX.utils.json_to_sheet(courses.map(c => ({
            Title: c.title, Code: c.code, Teacher: c.teacherName,
            Category: c.category || '', Created: toDateStr(c.createdAt)
          })));
          XLSX.utils.book_append_sheet(wb, coursesSheet, "Courses");

          // 3. Enrollments
          const enrollSheet = XLSX.utils.json_to_sheet(enrollmentsSnap.docs.map(d => {
            const e = d.data();
            return { StudentId: e.studentId, CourseId: e.courseId, TeacherId: e.teacherId || '', AssignedDate: toDateStr(e.assignedDate) };
          }));
          XLSX.utils.book_append_sheet(wb, enrollSheet, "Enrollments");

          // 4. Attendance
          const attSheet = XLSX.utils.json_to_sheet(attendanceSnap.docs.map(d => {
            const a = d.data();
            return { Date: a.date, Student: a.studentName, StudentId: a.studentId, CourseId: a.courseId, Status: a.status, MarkedBy: a.markedBy || '' };
          }));
          XLSX.utils.book_append_sheet(wb, attSheet, "Attendance");

          // 5. Tests
          const testsSheet = XLSX.utils.json_to_sheet(testsSnap.docs.map(d => {
            const t = d.data();
            return { Title: t.title, CourseId: t.courseId, Duration: t.duration, TotalMarks: t.totalMarks, CreatedBy: t.createdBy || '', Created: toDateStr(t.createdAt) };
          }));
          XLSX.utils.book_append_sheet(wb, testsSheet, "Tests");

          // 6. Test Results
          const resultsSheet = XLSX.utils.json_to_sheet(resultsSnap.docs.map(d => {
            const r = d.data();
            return { StudentId: r.studentId, StudentName: r.studentName, TestId: r.testId, Score: r.score, TotalMarks: r.totalMarks, Percentage: r.percentage, Submitted: toDateStr(r.submittedAt) };
          }));
          XLSX.utils.book_append_sheet(wb, resultsSheet, "Test Results");

          // 7. Assignments
          const assignSheet = XLSX.utils.json_to_sheet(assignmentsSnap.docs.map(d => {
            const a = d.data();
            return { Title: a.title, CourseId: a.courseId, Deadline: a.deadline || '', MaxScore: a.maxScore, CreatedBy: a.createdBy || '', Created: toDateStr(a.createdAt) };
          }));
          XLSX.utils.book_append_sheet(wb, assignSheet, "Assignments");

          // 8. Submissions
          const subSheet = XLSX.utils.json_to_sheet(submissionsSnap.docs.map(d => {
            const s = d.data();
            return { AssignmentId: s.assignmentId, StudentId: s.studentId, StudentName: s.studentName, Grade: s.grade ?? '', Feedback: s.feedback || '', Submitted: toDateStr(s.submittedAt) };
          }));
          XLSX.utils.book_append_sheet(wb, subSheet, "Submissions");

          // 9. Activity Logs
          const logsSheet = XLSX.utils.json_to_sheet(activityLogs.map(l => ({
            UserId: l.userId, Action: l.action, Details: l.details || '', Timestamp: toDateStr(l.timestamp)
          })));
          XLSX.utils.book_append_sheet(wb, logsSheet, "Activity Logs");

          XLSX.writeFile(wb, `LMS_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
          showToast('All data exported successfully! (9 sheets)', 'success');
          await ActivityLogService.log(currentUserUid, 'EXPORT_ALL_DATA', 'Exported full Excel backup with 9 sheets.');
        }
      } catch (err) {
        LMSLogger.database('Export failed', err);
        showToast('Failed to export data.', 'error');
      }
    }, 'Exporting...');
  }

  // Bind Export Listeners
  const btnExportExcel = document.getElementById('btn-export-excel');
  const btnExportJs = document.getElementById('btn-export-js');

  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('btn-export-excel', false);
    });
  }

  if (btnExportJs) {
    btnExportJs.addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('btn-export-js', true);
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
