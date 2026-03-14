// ============================================================
// LMS Platform — Loader Component
// Button loading states and spinner utilities
// ============================================================

// ── Button Loading State Helper ─────────
export async function withLoadingButton(btn, asyncFn, options = {}) {
  if (!btn || btn.disabled) return;

  if (typeof options === 'string') {
    options = { loadingText: options };
  }
  const { loadingText = 'Processing...', icon = '' } = options;

  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${loadingText}`;

  try {
    return await asyncFn();
  } finally {
    btn.disabled = false;
    btn.innerHTML = icon ? `<i class="bi ${icon} me-1"></i>${originalHTML.replace(/<[^>]*>/g, '').trim()}` : originalHTML;
  }
}

// ── Retry Wrapper ───────────────────────
export async function withRetry(asyncFn, { retries = 2, delay = 1000 } = {}) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await asyncFn();
    } catch (err) {
      if (i === retries) throw err;
      console.info(`Retrying operation (${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ── Duplicate Submission Guard ──────────
const _activeOps = new Set();

export function guardDuplicate(key) {
  if (_activeOps.has(key)) return false;
  _activeOps.add(key);
  return true;
}

export function releaseDuplicate(key) {
  _activeOps.delete(key);
}

// ── Show/Hide Page Loader ───────────────
export function showPageLoader(message = 'Loading...') {
  let loader = document.getElementById('lms-page-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'lms-page-loader';
    loader.className = 'd-flex justify-content-center align-items-center';
    loader.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;';
    loader.innerHTML = `
      <div class="text-center text-white">
        <div class="spinner-border mb-2"></div>
        <div id="lms-loader-text">${message}</div>
      </div>`;
    document.body.appendChild(loader);
  } else {
    loader.querySelector('#lms-loader-text').textContent = message;
    loader.style.display = 'flex';
  }
}

export function hidePageLoader() {
  const loader = document.getElementById('lms-page-loader');
  if (loader) loader.remove();
}
