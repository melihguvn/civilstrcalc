/* IS 456:2000 Development Length  (Tests 28-36)
 * Run standalone:  cscript tests/development-length/is456.test.js
 * Or via runner:   cscript tests/development-length/_run_devlen.js
 */
if (typeof console === 'undefined') {
  var console = { log: function(s) { WScript.Echo(String(s)); } };
}
if (typeof process === 'undefined') {
  var process = { exit: function(c) { if (c) WScript.Quit(c); } };
}

// ── IS 456:2000 Engine  §26.2 ────────────────────────────────────────────────
// tau_bd0: Table 21 plain bar in tension (M20=1.2, M25=1.4, M30=1.5 …)
// barFac: 1.6 deformed/HYSD; 1.0 plain round
function calcIs456SI(opts) {
  var db      = opts.db;
  var tau_bd0 = opts.tau_bd0;
  var fy      = opts.fy;
  var barFac  = opts.barFac !== undefined ? opts.barFac : 1.6;

  var tau_t = tau_bd0 * barFac;
  var Ld_t  = Math.max((db * 0.87 * fy) / (4 * tau_t),  200);

  var tau_c = tau_t * 1.25;
  var Ld_c  = Math.max((db * 0.87 * fy) / (4 * tau_c),  200);

  // Hook straight embedment = Ld_t − hook_equivalent (§26.2.2)
  var hook90_emb  = Math.max(Ld_t -  8 * db, 200);
  var hook180_emb = Math.max(Ld_t - 16 * db, 200);

  var sp_t = Math.max(1.3 * Ld_t, 300);
  var sp_c = Math.max(Ld_c, 300);

  return {
    Ld_t: Ld_t, Ld_c: Ld_c,
    hook90_emb: hook90_emb, hook180_emb: hook180_emb,
    sp_t: sp_t, sp_c: sp_c,
    minTensionGoverns: (Ld_t <= 200.001),
    minCompGoverns:    (Ld_c <= 200.001)
  };
}

// ── Test runner ──────────────────────────────────────────────────────────────
var TOL = 0.01;
var passed = 0, failed = 0;

function check(label, computed, expected, tol) {
  if (tol === undefined) tol = TOL;
  var err = Math.abs((computed - expected) / expected);
  var ok  = err <= tol;
  console.log('  ' + (ok ? '✓ PASS' : '✗ FAIL') + '  ' + label);
  if (!ok) console.log('           got=' + computed.toFixed(4) + '  exp=' + expected.toFixed(4) + '  err=' + (err*100).toFixed(3) + '%');
  ok ? passed++ : failed++;
}
function checkBool(label, value, expected) {
  var ok = value === expected;
  console.log('  ' + (ok ? '✓ PASS' : '✗ FAIL') + '  ' + label);
  if (!ok) console.log('           got=' + value + '  exp=' + expected);
  ok ? passed++ : failed++;
}

// ── TEST 28 — Deformed bar, M25, Fe 415, Ø16 ─────────────────────────────────
// tau_bd = 1.4×1.6 = 2.24 MPa
// Ld_t = 16×0.87×415 / (4×2.24) ≈ 645.5 mm
// Ld_c = 16×0.87×415 / (4×2.80) ≈ 516.4 mm
console.log('\nTEST 28 — M25, Fe 415, O16, Deformed');
(function() {
  var r = calcIs456SI({ db: 16, tau_bd0: 1.4, fy: 415, barFac: 1.6 });
  check('Ld_t',  r.Ld_t,   645.46);
  check('Ld_c',  r.Ld_c,   516.36);
  checkBool('min does NOT govern tension',     r.minTensionGoverns, false);
  checkBool('min does NOT govern compression', r.minCompGoverns,    false);
}());

// ── TEST 29 — Deformed bar, M30, Fe 500, Ø20 ─────────────────────────────────
// tau_bd = 1.5×1.6 = 2.40 MPa
// Ld_t = 20×0.87×500 / (4×2.40) = 906.25 mm
// Ld_c = 20×0.87×500 / (4×3.00) = 725.0 mm
console.log('\nTEST 29 — M30, Fe 500, O20, Deformed');
(function() {
  var r = calcIs456SI({ db: 20, tau_bd0: 1.5, fy: 500, barFac: 1.6 });
  check('Ld_t',             r.Ld_t,  906.25);
  check('Ld_c',             r.Ld_c,  725.00);
  check('Ld_c / Ld_t ratio', r.Ld_c / r.Ld_t, 1 / 1.25);
}());

// ── TEST 30 — Plain round bar, M20, Fe 250, Ø12 ──────────────────────────────
// tau_bd = 1.2×1.0 = 1.2 MPa (no 1.6× for plain bars)
// Ld_t = 12×0.87×250 / (4×1.2) = 543.75 mm
console.log('\nTEST 30 — M20, Fe 250, O12, Plain Round Bar');
(function() {
  var rPlain  = calcIs456SI({ db: 12, tau_bd0: 1.2, fy: 250, barFac: 1.0 });
  var rDeform = calcIs456SI({ db: 12, tau_bd0: 1.2, fy: 250, barFac: 1.6 });
  check('Ld_t plain',          rPlain.Ld_t,  543.75);
  check('Ld_c plain',          rPlain.Ld_c,  435.00);
  checkBool('deformed shorter than plain (better bond)', rDeform.Ld_t < rPlain.Ld_t, true);
  check('plain/deformed ratio = 1.6', rPlain.Ld_t / rDeform.Ld_t, 1.6);
}());

// ── TEST 31 — 90° Hook straight embedment, M25, Fe 415, Ø16 ──────────────────
// hook90_emb = max(645.5 − 8×16, 200) = max(517.5, 200) = 517.5 mm
console.log('\nTEST 31 — 90 deg Hook Straight Embedment  (M25, Fe 415, O16)');
(function() {
  var r = calcIs456SI({ db: 16, tau_bd0: 1.4, fy: 415, barFac: 1.6 });
  check('hook90_emb',     r.hook90_emb,   517.46);
  check('Ld_t - 8db',    r.hook90_emb,   r.Ld_t - 8 * 16, 0);
  checkBool('90 deg hook shorter than full Ld_t', r.hook90_emb < r.Ld_t, true);
}());

// ── TEST 32 — 180° U-Hook straight embedment, M30, Fe 500, Ø20 ───────────────
// Ld_t = 906.25 mm
// hook180_emb = max(906.25 − 16×20, 200) = max(586.25, 200) = 586.25 mm
console.log('\nTEST 32 — 180 deg U-Hook Straight Embedment  (M30, Fe 500, O20)');
(function() {
  var r = calcIs456SI({ db: 20, tau_bd0: 1.5, fy: 500, barFac: 1.6 });
  check('hook180_emb',    r.hook180_emb,  586.25);
  check('Ld_t - 16db',   r.hook180_emb,  r.Ld_t - 16 * 20, 0);
  checkBool('180 deg hook emb < 90 deg hook emb', r.hook180_emb < r.hook90_emb, true);
}());

// ── TEST 33 — Tension lap splice (×1.3), M25, Fe 415, Ø16 ───────────────────
// sp_t = max(1.3×645.5, 300) = 839.1 mm
console.log('\nTEST 33 — Tension Lap Splice  (M25, Fe 415, O16)');
(function() {
  var r = calcIs456SI({ db: 16, tau_bd0: 1.4, fy: 415, barFac: 1.6 });
  check('sp_t',        r.sp_t,           839.09);
  check('sp_t / Ld_t', r.sp_t / r.Ld_t,   1.3);
}());

// ── TEST 34 — Compression splice, M30, Fe 415, Ø20 ───────────────────────────
// tau_bd = 1.5×1.6 = 2.40 MPa
// Ld_c = 20×0.87×415 / (4×3.00) = 601.75 mm
// sp_c = max(601.75, 300) = 601.75 mm
console.log('\nTEST 34 — Compression Lap Splice  (M30, Fe 415, O20)');
(function() {
  var r = calcIs456SI({ db: 20, tau_bd0: 1.5, fy: 415, barFac: 1.6 });
  check('Ld_c',   r.Ld_c,  601.75);
  check('sp_c',   r.sp_c,  601.75);
  checkBool('comp splice < tension splice', r.sp_c < r.sp_t, true);
}());

// ── TEST 35 — High strength steel, M40, Fe 550, Ø25 ──────────────────────────
// tau_bd = 1.9×1.6 = 3.04 MPa
// Ld_t = 25×0.87×550 / (4×3.04) = 983.6 mm
// Ld_c = 25×0.87×550 / (4×3.80) = 787.0 mm
console.log('\nTEST 35 — High Strength M40, Fe 550, O25');
(function() {
  var r = calcIs456SI({ db: 25, tau_bd0: 1.9, fy: 550, barFac: 1.6 });
  check('Ld_t',  r.Ld_t,   983.59);
  check('Ld_c',  r.Ld_c,   786.87);
  check('sp_t',  r.sp_t,  1278.67);
}());

// ── TEST 36 — Minimum 200 mm governs: M50, Fe 250, Ø6, plain round ───────────
// tau_bd = 2.2×1.0 = 2.2 MPa
// Ld_t_raw = 6×0.87×250 / (4×2.2) = 148.3 mm < 200 mm → minimum governs
console.log('\nTEST 36 — Minimum 200 mm Governs  (M50, Fe 250, O6, Plain Round)');
(function() {
  var r = calcIs456SI({ db: 6, tau_bd0: 2.2, fy: 250, barFac: 1.0 });
  check('Ld_t = 200 (minimum)', r.Ld_t, 200);
  check('Ld_c = 200 (minimum)', r.Ld_c, 200);
  checkBool('minTensionGoverns = true', r.minTensionGoverns, true);
  checkBool('minCompGoverns = true',    r.minCompGoverns,    true);
}());

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '================================================================');
console.log('  IS 456:2000  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
