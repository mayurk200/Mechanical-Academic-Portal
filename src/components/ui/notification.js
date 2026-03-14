// ============================================================
// LMS Platform — Notification Component
// Toast notifications with auto-dismiss and progress bar
// ============================================================

let _toastCounter = 0;

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container-custom';
    document.body.appendChild(container);
  }

  const id = `lms-toast-${++_toastCounter}`;
  const bgMap = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-warning text-dark',
    info: 'bg-primary'
  };
  const iconMap = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  };

  const toastEl = document.createElement('div');
  toastEl.id = id;
  toastEl.className = `toast show align-items-center text-white ${bgMap[type] || bgMap.info} border-0 mb-2 lms-toast-enter`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2" style="flex:1;">
        <i class="bi ${iconMap[type] || iconMap.info}" style="font-size:1.1rem;"></i>
        <span>${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
    </div>
    <div class="lms-toast-progress" style="animation-duration:4s;"></div>`;

  container.appendChild(toastEl);
  toastEl.querySelector('.btn-close').addEventListener('click', () => dismissToast(toastEl));
  setTimeout(() => dismissToast(toastEl), 4000);
}

function dismissToast(el) {
  if (!el || el._dismissing) return;
  el._dismissing = true;
  el.classList.add('lms-toast-exit');
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
}
