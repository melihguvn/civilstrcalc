/* ============================================================
   Civil Structural Calculations — Shared Navigation & Utilities
   ============================================================ */

// ── ACTIVE SIDEBAR LINK ──
// Call on each page: setActiveNav('beam')
function setActiveNav(pageId) {
  document.querySelectorAll('.sb-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
}

// ── SUB TABS ──
function stab(btn, prefix, id) {
  const pg = btn.closest('.sub-tabs').parentElement;
  pg.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  pg.querySelectorAll('.sub-pane').forEach(s => s.classList.remove('active'));
  document.getElementById(prefix + '-' + id).classList.add('active');
}

// ── HELPERS ──
const ri = id => parseFloat(document.getElementById(id).value) || 0;

function renderResults(containerId, groups) {
  let html = '';
  groups.forEach(g => {
    if (g.lbl) html += `<div class="res-sec">${g.lbl}</div>`;
    if (g.rows) {
      html += '<table class="res-table">';
      g.rows.forEach(r => {
        html += `<tr><td>${r[0]}</td><td><span class="${r[2] || ''}">${r[1]}</span></td></tr>`;
      });
      html += '</table>';
    }
  });
  document.getElementById(containerId).innerHTML = html;
}

function addBanner(containerId, type, msg) {
  const icons = { ok: '✅', warn: '⚠️', err: '❌' };
  document.getElementById(containerId).innerHTML +=
    `<div class="status-banner ${type}"><span>${icons[type]}</span>${msg}</div>`;
}

// ── ACCESSIBILITY UTILITIES ──

// Auto-link <label> to adjacent <input>/<select> inside .form-group
// Runs after DOM is ready; skips labels that already have a `for` attribute
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.form-group').forEach(function (fg) {
    var label = fg.querySelector('label');
    var ctrl  = fg.querySelector('input, select, textarea');
    if (label && ctrl && ctrl.id && !label.getAttribute('for')) {
      label.setAttribute('for', ctrl.id);
    }
  });

  // Mark report-card / result containers as live regions
  document.querySelectorAll('.report-card').forEach(function (card) {
    if (!card.getAttribute('role')) card.setAttribute('role', 'region');
    if (!card.getAttribute('aria-live')) card.setAttribute('aria-live', 'polite');
    if (!card.getAttribute('aria-label')) card.setAttribute('aria-label', 'Calculation results');
  });

  // Make decorative SVGs inside buttons invisible to screen readers
  document.querySelectorAll('button svg, .shape-opt svg, .std-btn svg').forEach(function (s) {
    if (!s.getAttribute('aria-hidden')) s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
  });
});
