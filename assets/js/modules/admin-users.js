import { initApp } from '../core/router.js';
import { db, auth } from '../../../config/firebase-config.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { UserService, ActivityLogService, CourseService, EnrollmentService } from '../../../services/database.js';
import { createStaffAccount } from '../core/auth.js';
import { showToast, showConfirm, withLoadingButton, LMSLogger, friendlyError, getRoleBadge, formatDate } from '../core/utils.js';

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const USERS_PER_PAGE = 20;

async function init() {
  try {
    const currentUser = await initApp(['admin']);
    await loadUsers();
    setupEventListeners(currentUser.uid);
  } catch (err) {
    LMSLogger.error('User management Init Failed', err);
  }
}

async function loadUsers() {
  try {
    allUsers = await UserService.getAll();
    applyFilters();
  } catch (err) {
    LMSLogger.database('Failed to load users', err);
    showToast('Could not load users.', 'error');
  }
}

function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const roleFilter = document.getElementById('role-filter').value;

  filteredUsers = allUsers.filter(u => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(searchTerm)) ||
      (u.email && u.email.toLowerCase().includes(searchTerm)) ||
      (u.urn && u.urn.toLowerCase().includes(searchTerm));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  document.getElementById('total-users-count').textContent = filteredUsers.length;
  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('users-tbody');

  if (filteredUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No users found matching current filters.</td></tr>';
    updatePagination();
    return;
  }

  const start = (currentPage - 1) * USERS_PER_PAGE;
  const end = start + USERS_PER_PAGE;
  const pageUsers = filteredUsers.slice(start, end);

  tbody.innerHTML = pageUsers.map(u => `
    <tr>
      <td style="padding-left:1.5rem;">
        <div class="fw-bold">${u.name || '—'}</div>
        <div class="small text-muted">${u.email || '—'}</div>
      </td>
      <td>${getRoleBadge(u.role)}</td>
      <td>
        <div class="small">
          ${u.role === 'student' ? `<strong>URN:</strong> ${u.urn || '—'}<br><strong>Dept:</strong> ${u.department || '—'}` : 'Staff'}
        </div>
      </td>
      <td class="small text-muted">${u.createdAt ? formatDate(u.createdAt) : '—'}</td>
      <td class="text-end" style="padding-right:1.5rem;">
        <button class="btn btn-sm btn-outline-info btn-view" data-uid="${u.uid}" title="View Details"><i class="bi bi-eye"></i></button>
        <button class="btn btn-sm btn-outline-primary btn-edit ms-1" 
                data-uid="${u.uid}" 
                data-name="${u.name || ''}" 
                data-email="${u.email || ''}" 
                data-role="${u.role || ''}" 
                title="Edit User"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-warning btn-reset ms-1" data-email="${u.email}" title="Send Password Reset"><i class="bi bi-key"></i></button>
        ${u.role !== 'admin' ? `<button class="btn btn-sm btn-outline-danger btn-delete ms-1" data-uid="${u.uid}" data-name="${u.name}" data-role="${u.role}"><i class="bi bi-trash"></i></button>` : ''}
      </td>
    </tr>
  `).join('');

  updatePagination();

  // Attach View Listeners
  tbody.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', () => openViewUserModal(btn.dataset.uid));
  });

  // Attach Edit Listeners — use window.bootstrap to avoid shadowing
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset;
      document.getElementById('edit-uid').value = d.uid;
      document.getElementById('edit-name').value = d.name;
      document.getElementById('edit-email').value = d.email;
      document.getElementById('edit-role').value = d.role;
      const modal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById('editUserModal'));
      modal.show();
    });
  });

  // Attach Reset Listeners
  tbody.querySelectorAll('.btn-reset').forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      const confirmed = await showConfirm('Reset Password', `Send a password reset email to ${email}?`, { confirmText: 'Send Email' });
      if (confirmed) {
        try {
          await sendPasswordResetEmail(auth, email);
          showToast('Password reset email sent!', 'success');
          ActivityLogService.log('Admin', 'PASSWORD_RESET', `Triggered password reset for ${email}`);
        } catch (err) {
          LMSLogger.auth('Failed to send reset email', err);
          showToast(friendlyError(err), 'error');
        }
      }
    });
  });

  // Attach Delete Listeners
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.uid;
      const name = btn.dataset.name;
      const role = btn.dataset.role;

      const msg = role === 'teacher'
        ? `WARNING: Deleting Teacher <strong>${name}</strong> will NOT delete their courses. You must manually reassign or delete their courses first.`
        : `Are you sure you want to delete Student <strong>${name}</strong>?`;

      const confirmed = await showConfirm(`Delete ${role}`, msg, { confirmText: 'Obliterate User', type: 'danger' });
      if (confirmed) {
        try {
          const originalHtml = btn.innerHTML;
          btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
          btn.disabled = true;

          await UserService.delete(uid);
          showToast(`${name} has been deleted.`, 'success');
          await ActivityLogService.log('Admin', 'DELETE_USER', `Deleted ${role} ${name} (${uid})`);
          await loadUsers();
        } catch (err) {
          LMSLogger.database('Failed to delete user', err);
          showToast(friendlyError(err), 'error');
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-trash"></i>';
        }
      }
    });
  });
}

function updatePagination() {
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
  document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('btn-prev').disabled = currentPage === 1;
  document.getElementById('btn-next').disabled = currentPage === totalPages;
}

function openAddUserModal(role = 'teacher') {
  const roleSelect = document.getElementById('add-role');
  if (roleSelect) roleSelect.value = role;

  const modalEl = document.getElementById('addUserModal');
  if (modalEl) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

async function openViewUserModal(uid) {
  const body = document.getElementById('view-user-body');
  body.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
  
  const modal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById('viewUserModal'));
  modal.show();

  try {
    const user = allUsers.find(u => u.uid === uid) || await UserService.get(uid);
    if (!user) throw new Error('User not found');

    let extraInfo = '';
    if (user.role === 'student') {
      const enrollments = await EnrollmentService.getByStudent(uid);
      extraInfo = `
        <div class="mt-3 pt-3 border-top">
          <h6 class="fw-bold mb-2">Academic Standing</h6>
          <div class="d-flex justify-content-between mb-1"><span>Enrolled Courses:</span><span class="badge bg-light text-dark">${enrollments.length}</span></div>
          <div class="d-flex justify-content-between mb-1"><span>Total Attendance:</span><span class="badge bg-info">${user.aggTotalClasses || 0} Lectures</span></div>
          <div class="d-flex justify-content-between"><span>Present:</span><span class="badge bg-success">${user.aggTotalPresent || 0}</span></div>
        </div>`;
    } else if (user.role === 'teacher') {
      const courses = await CourseService.getByTeacher(uid);
      extraInfo = `
        <div class="mt-3 pt-3 border-top">
          <h6 class="fw-bold mb-2">Teaching Activity</h6>
          <div class="d-flex justify-content-between mb-1"><span>Assigned Courses:</span><span class="badge bg-light text-dark">${courses.length}</span></div>
          <div class="list-group list-group-flush mt-2">
            ${courses.slice(0, 5).map(c => `<div class="list-group-item px-0 py-1 small border-0"><i class="bi bi-book me-2"></i>${c.title}</div>`).join('')}
            ${courses.length > 5 ? `<div class="text-muted small">+ ${courses.length - 5} more</div>` : ''}
          </div>
        </div>`;
    }

    body.innerHTML = `
      <div class="text-center mb-4">
        <div class="avatar-lg bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width:64px;height:64px;font-size:1.5rem;font-weight:bold;">
          ${user.name ? user.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '?'}
        </div>
        <h5 class="mb-1">${user.name || 'Unknown'}</h5>
        <div class="text-muted small">${user.email}</div>
        <div class="mt-2 text-capitalize">${getRoleBadge(user.role)}</div>
      </div>
      <div class="row g-2 small">
        <div class="col-6"><span class="text-muted">URN:</span><br><strong>${user.urn || '—'}</strong></div>
        <div class="col-6"><span class="text-muted">Register Date:</span><br><strong>${formatDate(user.createdAt)}</strong></div>
        <div class="col-12 mt-2"><span class="text-muted">Department:</span><br><strong>${user.department || 'Not assigned'}</strong></div>
      </div>
      ${extraInfo}
    `;
  } catch (err) {
    body.innerHTML = `<div class="alert alert-danger">${friendlyError(err)}</div>`;
  }
}

function setupEventListeners(adminUid) {
  document.getElementById('search-input').addEventListener('input', applyFilters);
  document.getElementById('role-filter').addEventListener('change', applyFilters);

  document.getElementById('btn-prev').addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  document.getElementById('btn-next').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    if (currentPage < totalPages) { currentPage++; renderTable(); }
  });

  const form = document.getElementById('addUserForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-user');

    await withLoadingButton(btn, async () => {
      const name = document.getElementById('add-name').value.trim();
      const email = document.getElementById('add-email').value.trim();
      const pass = document.getElementById('add-password').value;
      const role = document.getElementById('add-role').value;

      try {
        // Create user using secure staff account creator (avoids admin logout)
        await createStaffAccount({ name, email, password: pass, role }, adminUid);

        // Add log
        await ActivityLogService.log(adminUid, 'CREATE_USER', `Created new ${role}: ${name} (${email})`);

        showToast(`Successfully registered ${name} as a ${role}!`, 'success');

        // Hide Modal & reload
        const modal = window.bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        if (modal) modal.hide();
        form.reset();
        await loadUsers();

      } catch (err) {
        LMSLogger.auth('Failed to create staff user', err);
        showToast(friendlyError(err), 'error');
      }
    }, 'Creating Account...');
  });

  // Handle "Register Admin" direct button
  const btnAddAdminDirect = document.getElementById('btn-add-admin-direct');
  if (btnAddAdminDirect) {
    btnAddAdminDirect.addEventListener('click', () => openAddUserModal('admin'));
  }

  // Handle Query Params (e.g. from Dashboard or Login)
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'add-admin') {
    // Clean up URL so refresh doesn't keep opening modal
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => openAddUserModal('admin'), 300);
  }

  // Handle Edit User Form
  const editForm = document.getElementById('editUserForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-update-user');
      const uid = document.getElementById('edit-uid').value;
      
      await withLoadingButton(btn, async () => {
        try {
          const name = document.getElementById('edit-name').value.trim();
          const email = document.getElementById('edit-email').value.trim();
          const role = document.getElementById('edit-role').value;

          await UserService.update(uid, { name, email, role });
          await ActivityLogService.log(adminUid, 'UPDATE_USER', `Updated profile for ${name} (${role})`);
          
          showToast('User profile updated successfully!', 'success');
          window.bootstrap.Modal.getInstance(document.getElementById('editUserModal'))?.hide();
          await loadUsers();
        } catch (err) {
          LMSLogger.database('Update user failed', err);
          showToast(friendlyError(err), 'error');
        }
      }, 'Updating...');
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
