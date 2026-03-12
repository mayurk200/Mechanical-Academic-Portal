import { initApp } from '../core/router.js';
import { db, auth } from '../../config/firebase-config.js';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { UserService, ActivityLogService, CourseService, EnrollmentService } from '../../services/database.js';
import { showToast, showConfirm, withLoadingButton, LMSLogger, friendlyError, getRoleBadge, formatDate } from '../core/utils.js';

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const USERS_PER_PAGE = 20;

async function bootstrap() {
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
        <button class="btn btn-sm btn-outline-warning btn-reset" data-email="${u.email}" title="Send Password Reset"><i class="bi bi-key"></i></button>
        ${u.role !== 'admin' ? `<button class="btn btn-sm btn-outline-danger btn-delete ms-1" data-uid="${u.uid}" data-name="${u.name}" data-role="${u.role}"><i class="bi bi-trash"></i></button>` : ''}
      </td>
    </tr>
  `).join('');

  updatePagination();

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
          } catch(err) {
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
          } catch(err) {
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

function setupEventListeners(adminUid) {
  document.getElementById('search-input').addEventListener('input', applyFilters);
  document.getElementById('role-filter').addEventListener('change', applyFilters);

  document.getElementById('btn-prev').addEventListener('click', () => { if(currentPage > 1) { currentPage--; renderTable(); } });
  document.getElementById('btn-next').addEventListener('click', () => { 
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    if(currentPage < totalPages) { currentPage++; renderTable(); }
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
        // Create user in Auth
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        // Add to Firestore manually so we can assign role
        await setDoc(doc(db, 'users', cred.user.uid), {
          name, 
          email, 
          role,
          createdBy: adminUid,
          createdAt: serverTimestamp()
        });

        // Add log
        await ActivityLogService.log(adminUid, 'CREATE_USER', `Created new ${role}: ${name} (${email})`);
        
        showToast(`Successfully registered ${name} as a ${role}!`, 'success');
        
        // Hide Modal & reload
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        if (modal) modal.hide();
        form.reset();
        await loadUsers();

      } catch (err) {
         LMSLogger.auth('Failed to create staff user', err);
         showToast(friendlyError(err), 'error');
      }
    }, 'Create User Account');
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
