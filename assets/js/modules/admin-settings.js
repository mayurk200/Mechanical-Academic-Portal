import { initApp } from '../core/router.js';
import { db } from '../../config/firebase-config.js';
import { collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ActivityLogService, CourseService, EnrollmentService } from '../../services/database.js';
import { showToast, showConfirm, withLoadingButton, LMSLogger, friendlyError } from '../core/utils.js';

let currentUserUid = null;

async function bootstrap() {
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

}

document.addEventListener('DOMContentLoaded', bootstrap);
