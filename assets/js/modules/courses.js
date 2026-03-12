// ============================================================
// LMS Platform — Courses Module
// Course CRUD + section management + teacher-assigned enrollment
// ============================================================

import { db, auth } from '../../../config/firebase-config.js';
import { CourseService, SectionService, EnrollmentService } from '../../../services/database.js';
import { showToast, openModal, closeModal, formatDate, escapeHtml, showConfirm, LMSLogger } from '../core/utils.js';

let currentUser = null;
let allCourses = [];

export function init(user) {
  currentUser = user;
  loadCourses();
  setupEventListeners();
}

async function loadCourses() {
  const grid = document.getElementById('courses-grid');
  if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;"><span class="spinner-border text-primary"></span><p class="mt-3 text-muted">Loading courses...</p></div>';

  try {
    if (currentUser.role === 'student') {
      allCourses = await EnrollmentService.getEnrolledCourses(currentUser.uid);
    } else if (currentUser.role === 'teacher') {
      allCourses = await CourseService.getByTeacher(currentUser.uid);
    } else {
      allCourses = await CourseService.getAll();
    }
    renderCourses(allCourses);
  } catch (err) {
    LMSLogger.database('Failed to load courses', err);
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">⚠️</div><h3>Failed to load courses</h3><p>Something went wrong. Please try again.</p><button class="btn btn-primary btn-sm" onclick="location.reload()"><i class="bi bi-arrow-clockwise me-1"></i>Retry</button></div>`;
    showToast('Failed to load courses', 'error');
  }
}

async function renderCourses(courses) {
  const grid = document.getElementById('courses-grid');
  if (!grid) return;

  if (courses.length === 0) {
    if (currentUser.role === 'student') {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📚</div><h3>No courses assigned</h3><p>Your teacher hasn't assigned any courses to you yet.</p></div>`;
    } else {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📚</div><h3>No courses found</h3><p>Create your first course to get started.</p></div>`;
    }
    return;
  }

  const enriched = await Promise.all(courses.map(async (c) => {
    const count = await EnrollmentService.countByCourse(c.id);
    return { ...c, studentCount: count };
  }));

  grid.innerHTML = enriched.map(c => `
    <div class="course-card">
      <div class="course-banner" style="background:linear-gradient(135deg, hsl(${hashStr(c.title) % 360},60%,30%), var(--bg-tertiary));">
        📚
      </div>
      <div class="course-info">
        <div class="course-title">${escapeHtml(c.title)}</div>
        <div class="course-desc">${escapeHtml(c.description || 'No description')}</div>
        <div class="course-meta">
          <span>👨‍🎓 ${c.studentCount} students</span>
          <span>${c.code ? '🏷️ ' + c.code : ''}</span>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <a href="course-detail.html?id=${c.id}" class="btn btn-primary btn-sm" style="flex:1;">View Details</a>
          ${(currentUser.role === 'admin' || (currentUser.role === 'teacher' && c.teacherId === currentUser.uid))
            ? `<button class="btn btn-danger btn-sm delete-course-btn" data-id="${c.id}">🗑️</button>`
            : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function setupEventListeners() {
  // Create course form
  const form = document.getElementById('create-course-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('course-title').value.trim();
      const description = document.getElementById('course-desc').value.trim();
      const code = document.getElementById('course-code').value.trim();

      if (!title) { showToast('Course title is required', 'error'); return; }

      try {
        await CourseService.create({
          title, description, code,
          teacherId: currentUser.uid,
          teacherName: currentUser.name
        });
        showToast('Course created!', 'success');
        closeModal('create-course-modal');
        form.reset();
        loadCourses();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Delegated click events
  document.addEventListener('click', async (e) => {
    // Delete button
    if (e.target.classList.contains('delete-course-btn')) {
      const courseId = e.target.dataset.id;
      const confirmed = await showConfirm('Delete Course', 'Are you sure you want to delete this course? This action cannot be undone.', { confirmText: 'Delete', type: 'danger' });
      if (confirmed) {
        try {
          await CourseService.delete(courseId);
          showToast('Course deleted successfully', 'success');
          loadCourses();
        } catch (err) {
          LMSLogger.database('Course deletion failed', err);
          showToast('Course deletion failed: ' + err.message, 'error');
        }
      }
    }
  });

  // Search
  const searchInput = document.getElementById('course-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = allCourses.filter(c =>
        c.title.toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q)
      );
      renderCourses(filtered);
    });
  }
}

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}
