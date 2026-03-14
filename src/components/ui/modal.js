// ============================================================
// LMS Platform — Modal Component
// Confirmation modals and password prompts
// ============================================================

// ── Confirmation Modal ──────────────────
export function showConfirm(title, message, { confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' } = {}) {
  return new Promise((resolve) => {
    document.getElementById('lms-confirm-modal')?.remove();
    const btnClass = type === 'danger' ? 'btn-danger' : type === 'warning' ? 'btn-warning' : 'btn-primary';
    const overlay = document.createElement('div');
    overlay.id = 'lms-confirm-modal';
    overlay.className = 'lms-confirm-overlay lms-confirm-enter';
    overlay.innerHTML = `
      <div class="lms-confirm-box">
        <div class="lms-confirm-header"><h5 class="mb-0">${title}</h5></div>
        <div class="lms-confirm-body"><p class="mb-0">${message}</p></div>
        <div class="lms-confirm-footer">
          <button class="btn btn-light btn-sm" id="lms-confirm-cancel">${cancelText}</button>
          <button class="btn ${btnClass} btn-sm" id="lms-confirm-ok">${confirmText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = (result) => {
      overlay.classList.add('lms-confirm-exit');
      setTimeout(() => { overlay.remove(); resolve(result); }, 250);
    };
    overlay.querySelector('#lms-confirm-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('#lms-confirm-ok').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}

// ── Password Prompt Modal ───────────────
export function showPasswordPrompt(title = 'Enter Admin Password', message = 'Please enter your password to confirm this action.') {
  return new Promise((resolve, reject) => {
    document.getElementById('lms-password-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'lms-password-modal';
    overlay.className = 'lms-confirm-overlay lms-confirm-enter';
    overlay.innerHTML = `
      <div class="lms-confirm-box">
        <div class="lms-confirm-header">
          <h5 class="mb-0"><i class="bi bi-shield-lock text-danger me-2"></i>${title}</h5>
        </div>
        <div class="lms-confirm-body">
          <p class="mb-3 text-muted small">${message}</p>
          <div class="input-group">
            <span class="input-group-text bg-white"><i class="bi bi-key"></i></span>
            <input type="password" class="form-control" id="lms-password-input" placeholder="Enter your password" autocomplete="current-password">
          </div>
          <div class="text-danger small mt-2 d-none" id="lms-password-error"></div>
        </div>
        <div class="lms-confirm-footer">
          <button class="btn btn-light btn-sm" id="lms-password-cancel">Cancel</button>
          <button class="btn btn-danger btn-sm" id="lms-password-ok">
            <i class="bi bi-shield-check me-1"></i>Verify & Proceed
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#lms-password-input');
    const errorDiv = overlay.querySelector('#lms-password-error');
    setTimeout(() => input.focus(), 100);
    const close = (result) => {
      overlay.classList.add('lms-confirm-exit');
      setTimeout(() => {
        overlay.remove();
        if (result) resolve(result);
        else reject(new Error('Cancelled'));
      }, 250);
    };
    const submit = () => {
      const password = input.value.trim();
      if (!password) {
        errorDiv.textContent = 'Password is required.';
        errorDiv.classList.remove('d-none');
        input.focus();
        return;
      }
      close(password);
    };
    overlay.querySelector('#lms-password-cancel').addEventListener('click', () => close(null));
    overlay.querySelector('#lms-password-ok').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
  });
}

// ── Bootstrap Modal Helpers ─────────────
export function openModal(id) {
  const el = document.getElementById(id);
  if (el) new bootstrap.Modal(el).show();
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) bootstrap.Modal.getInstance(el)?.hide();
}
