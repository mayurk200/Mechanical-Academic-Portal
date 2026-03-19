// ============================================================
// LMS Platform — Router / Navigation (Bootstrap 5)
// Sidebar builder, auth guard, RBAC, mobile toggle
// ============================================================

import { auth, db } from '../config/firebaseConfig.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Simplified menu — role-based visibility
const menuConfig = {
  admin: [
    { icon: 'bi-speedometer2', label: 'Dashboard', href: 'admin-dashboard.html' },
    { icon: 'bi-person-gear', label: 'User Management', href: 'admin-users.html' },
    { icon: 'bi-book', label: 'My Courses', href: 'courses.html' },
    { icon: 'bi-people', label: 'Students', href: 'students.html' },
    { icon: 'bi-calendar-check', label: 'Attendance', href: 'attendance.html' },
    { icon: 'bi-pencil-square', label: 'Tests', href: 'test-page.html' },
    { icon: 'bi-graph-up', label: 'Results', href: 'result-page.html' },
    { icon: 'bi-bar-chart-line', label: 'Analytics', href: 'analytics.html' },
    { icon: 'bi-sliders', label: 'System Settings', href: 'admin-settings.html' },
    { icon: 'bi-person-circle', label: 'Profile', href: 'profile.html' },
  ],
  teacher: [
    { icon: 'bi-speedometer2', label: 'Dashboard', href: 'teacher-dashboard.html' },
    { icon: 'bi-book', label: 'My Courses', href: 'courses.html' },
    { icon: 'bi-people', label: 'Students', href: 'students.html' },
    { icon: 'bi-calendar-check', label: 'Attendance', href: 'attendance.html' },
    { icon: 'bi-pencil-square', label: 'Tests', href: 'test-page.html' },
    { icon: 'bi-graph-up', label: 'Results', href: 'result-page.html' },
    { icon: 'bi-person-circle', label: 'Profile', href: 'profile.html' },
  ],
  student: [
    { icon: 'bi-speedometer2', label: 'Dashboard', href: 'student-dashboard.html' },
    { icon: 'bi-book', label: 'My Courses', href: 'courses.html' },
    { icon: 'bi-calendar-check', label: 'Attendance', href: 'attendance.html' },
    { icon: 'bi-pencil-square', label: 'Tests', href: 'test-page.html' },
    { icon: 'bi-graph-up', label: 'Results', href: 'result-page.html' },
    { icon: 'bi-person-circle', label: 'Profile', href: 'profile.html' },
  ]
};

// Pages restricted by role
const restrictedPages = {
  'admin-dashboard.html': ['admin'],
  'admin-users.html': ['admin'],
  'admin-settings.html': ['admin'],
  'students.html': ['admin', 'teacher'],
  'analytics.html': ['admin'],
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// Build sidebar HTML
export function buildSidebar(role, userName) {
  const items = menuConfig[role] || menuConfig.student;
  const currentPage = window.location.pathname.split('/').pop();

  const navItems = items.map(item => {
    const isActive = currentPage === item.href || currentPage === item.href.split('#')[0];
    return `<a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}">
      <i class="bi ${item.icon}"></i>
      <span>${item.label}</span>
    </a>`;
  }).join('');

  return `
    <div class="sidebar-brand">
      <img src="../assets/img/logo.png" alt="ADCET" style="height:36px;object-fit:contain;">
      <div>
        <h5 style="font-size:0.85rem;line-height:1.2;">Mechanical<br>Academic Portal</h5>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${navItems}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="user-avatar">${getInitials(userName)}</div>
        <div>
          <div class="fw-semibold" style="font-size:0.85rem;">${userName || 'User'}</div>
          <small class="text-muted text-capitalize">${role}</small>
        </div>
      </div>
      <button class="btn btn-outline-secondary btn-sm w-100" id="logout-btn">
        <i class="bi bi-box-arrow-left me-1"></i>Logout
      </button>
      <div class="text-center mt-2 opacity-50">
        <small class="text-muted fw-bold" style="font-size:0.7rem;" id="sidebar-version">v...</small>
      </div>
    </div>`;
}

// Global auth state listener
onAuthStateChanged(auth, (user) => {
  if (!user && window.location.pathname.includes('/app/')) {
    window.location.href = '../login.html';
  }
});

// Initialize app — auth guard + RBAC + sidebar
export async function initApp(requiredRoles = null) {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (!user) {
        window.location.href = '../login.html';
        return reject('No user');
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          window.location.href = '../login.html';
          return reject('No user doc');
        }

        const userData = { uid: user.uid, ...userDoc.data() };
        const currentPage = window.location.pathname.split('/').pop();

        // RBAC: page-level restrictions
        if (restrictedPages[currentPage] && !restrictedPages[currentPage].includes(userData.role)) {
          const dashMap = { admin: 'admin-dashboard.html', teacher: 'teacher-dashboard.html', student: 'student-dashboard.html' };
          window.location.href = dashMap[userData.role] || 'student-dashboard.html';
          return reject('Access denied');
        }

        // Role check (explicit)
        if (requiredRoles && !requiredRoles.includes(userData.role)) {
          const dashMap = { admin: 'admin-dashboard.html', teacher: 'teacher-dashboard.html', student: 'student-dashboard.html' };
          window.location.href = dashMap[userData.role] || 'student-dashboard.html';
          return reject('Wrong role');
        }

        // Render sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          sidebar.innerHTML = buildSidebar(userData.role, userData.name);
          document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await signOut(auth);
          });

          // Inject dynamic version
          try {
            const vRes = await fetch('../config/version.json');
            if (vRes.ok) {
              const vData = await vRes.json();
              const vSpan = document.getElementById('sidebar-version');
              if (vSpan) vSpan.textContent = `v${vData.version}`;
            }
          } catch (e) {}
        }

        // Mobile toggle
        document.getElementById('menu-toggle')?.addEventListener('click', () => {
          sidebar?.classList.toggle('open');
        });

        resolve(userData);
      } catch (err) {
        console.error('Init error:', err);
        reject(err);
      }
    });
  });
}
