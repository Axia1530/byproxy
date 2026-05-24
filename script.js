// ── TWIN ID ──────────────────────────────────────────────
function getTwinId() {
  let id = localStorage.getItem('pca_twin_id');
  if (!id) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const seg2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    id = `DT-2076-${seg1}-${seg2}`;
    localStorage.setItem('pca_twin_id', id);
  }
  return id;
}

// ── COUNTER ──────────────────────────────────────────────
const COUNTER_NAMESPACE = 'byproxy-pca';
const COUNTER_KEY = 'covenants';
const BASE_COUNT = 14382; // aesthetic starting offset

async function getCount() {
  try {
    const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}`);
    const data = await res.json();
    return (data.value || 0) + BASE_COUNT;
  } catch {
    return BASE_COUNT + parseInt(localStorage.getItem('pca_local_count') || '0');
  }
}

async function incrementCount() {
  try {
    const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}/up`);
    const data = await res.json();
    return (data.value || 0) + BASE_COUNT;
  } catch {
    const local = parseInt(localStorage.getItem('pca_local_count') || '0') + 1;
    localStorage.setItem('pca_local_count', String(local));
    return BASE_COUNT + local;
  }
}

function formatCount(n) {
  return n.toLocaleString('en-US');
}

// ── COUNTDOWN (time elapsed since "activation") ───────────
function startElapsed(startTs) {
  const el = document.getElementById('countdown-timer');
  if (!el) return;
  function tick() {
    const diff = Math.floor((Date.now() - startTs) / 1000);
    const h = String(Math.floor(diff / 3600)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ── SCROLL REVEAL (signature block) ──────────────────────
function initScrollReveal() {
  const sigBlock = document.getElementById('signature-block');
  const notice = document.getElementById('scroll-notice');
  const body = document.querySelector('.covenant-body');
  if (!sigBlock || !body) return;

  let revealed = false;

  function check() {
    if (revealed) return;
    const bodyBottom = body.getBoundingClientRect().bottom;
    const winH = window.innerHeight;
    if (bodyBottom <= winH + 20) {
      revealed = true;
      sigBlock.classList.add('visible');
      if (notice) notice.style.display = 'none';
      sigBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.addEventListener('scroll', check, { passive: true });
  check();
}

// ── PAGE INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  // Mark active nav link
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // HOME PAGE — load counter
  const counterEl = document.getElementById('counter');
  if (counterEl) {
    const count = await getCount();
    counterEl.textContent = formatCount(count);
  }

  // COVENANT PAGE — fill twin ID + scroll reveal
  const twinDisplay = document.getElementById('twin-id-display');
  if (twinDisplay) {
    const id = getTwinId();
    twinDisplay.textContent = id;

    // Pre-fill hidden field
    const hiddenTwin = document.getElementById('hidden-twin');
    if (hiddenTwin) hiddenTwin.value = id;

    initScrollReveal();

    // Sign button
    const form = document.getElementById('covenant-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('sig-name').value.trim();
        const dob = document.getElementById('sig-dob').value.trim();
        if (!name || !dob) {
          alert('Please complete all fields before submitting.');
          return;
        }

        const btn = form.querySelector('.btn-sign');
        btn.textContent = 'Processing...';
        btn.disabled = true;

        // Store activation timestamp
        const activationTs = Date.now();
        localStorage.setItem('pca_activation_ts', String(activationTs));
        localStorage.setItem('pca_signatory_name', name);

        await incrementCount();

        window.location.href = 'activated.html';
      });
    }
  }

  // ACTIVATED PAGE
  const activatedTwinEl = document.getElementById('activated-twin-id');
  if (activatedTwinEl) {
    activatedTwinEl.textContent = getTwinId();

    const ts = parseInt(localStorage.getItem('pca_activation_ts') || String(Date.now()));
    startElapsed(ts);
  }
});
