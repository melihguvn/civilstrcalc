/* TS 500:2000 Development Length  (Tests 37-45)
 * Run standalone:  cscript tests/development-length/ts500.test.js
 * Or via runner:   cscript tests/development-length/_run_devlen.js
 */
if (typeof console === 'undefined') {
  var console = { log: function(s) { WScript.Echo(String(s)); } };
}
if (typeof process === 'undefined') {
  var process = { exit: function(c) { if (c) WScript.Quit(c); } };
}

// ── TS 500:2000 Engine  §7.1 ─────────────────────────────────────────────────
// posFac  : 1.0 Position II (good bond) | 1.4 Position I (poor bond, ×1.4)
// confComp: true → lb_c_raw × 0.75 (adequate transverse reinforcement in compression)
// alpha1  : splice factor α₁ = 1 + 0.5r  |  1.8 for full-tension section
function calcTs500SI(opts) {
  var db       = opts.db;
  var fck      = opts.fck;
  var fyk      = opts.fyk;
  var posFac   = opts.posFac   !== undefined ? opts.posFac   : 1.0;
  var confComp = opts.confComp !== undefined ? opts.confComp : false;
  var alpha1   = opts.alpha1   !== undefined ? opts.alpha1   : 1.17;

  var sqFck = Math.sqrt(fck);
  var fsd   = fyk / 1.15;

  var fbd_t = 0.40 * sqFck;           // tension bond stress, Position II base
  var fbd_c = 0.50 * sqFck;           // compression bond stress

  // Tension development length — posFac multiplies lb for Position I
  var lb_t_raw = (db / 4) * (fsd / fbd_t) * posFac;
  var lb_t_min = Math.max(10 * db, 100);
  var lb_t     = Math.max(lb_t_raw, lb_t_min);

  // Compression development length
  var lb_c_raw = (db / 4) * (fsd / fbd_c);
  if (confComp) lb_c_raw = lb_c_raw * 0.75;   // §7.1.2: transverse reinforcement
  var lb_c_min = Math.max(10 * db, 100);
  var lb_c     = Math.max(lb_c_raw, lb_c_min);

  // Hook anchorage: 5φ equivalent credit (§7.1.4), hooks effective in tension only
  var hookEq      = 5 * db;
  var hookMin     = Math.max(5 * db, 100);
  var hook90_emb  = Math.max(lb_t - hookEq, hookMin);
  var hook180_emb = Math.max(lb_t - hookEq, hookMin);

  // Lap splices (§7.2 / §9.2): ℓ₀ = α₁ × ℓb ≥ max(15φ, 200 mm)
  var l0_t = Math.max(alpha1 * lb_t, Math.max(15 * db, 200));
  var l0_c = Math.max(lb_c, 200);     // compression: no α factor

  return {
    lb_t: lb_t, lb_c: lb_c,
    fbd_t: fbd_t, fbd_c: fbd_c,
    hook90_emb: hook90_emb, hook180_emb: hook180_emb,
    l0_t: l0_t, l0_c: l0_c,
    lb_t_min: lb_t_min, lb_c_min: lb_c_min,
    minTensionGoverns: (lb_t <= lb_t_min + 0.001),
    minCompGoverns:    (lb_c <= lb_c_min + 0.001)
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

// ── TEST 37 — Straight bar, Position II: Ø16, C25, B420 ──────────────────────
// fsd = 420/1.15 = 365.22 MPa | fbd_t = 0.40×√25 = 2.000 MPa | fbd_c = 2.500 MPa
// lb_t = (16/4)×(365.22/2.000) = 730.43 mm
// lb_c = (16/4)×(365.22/2.500) = 584.35 mm
console.log('\nTEST 37 — Straight Bar, Position II  (C25, B420, Ø16)');
(function() {
  var r = calcTs500SI({ db: 16, fck: 25, fyk: 420 });
  check('lb_t',                   r.lb_t,  730.43);
  check('lb_c',                   r.lb_c,  584.35);
  check('fbd_t = 2.000 MPa',      r.fbd_t,   2.000, 0.001);
  check('fbd_c = 2.500 MPa',      r.fbd_c,   2.500, 0.001);
  checkBool('minimum does not govern', r.minTensionGoverns, false);
}());

// ── TEST 38 — Position I (top bar): Ø20, C30, B420 ───────────────────────────
// lb_t_base = (20/4)×(365.22/2.1909) = 833.49 mm | ×1.4 = 1166.89 mm
// Position I / Position II ratio = exactly 1.4
console.log('\nTEST 38 — Position I Top Bar  (C30, B420, Ø20)');
(function() {
  var rI  = calcTs500SI({ db: 20, fck: 30, fyk: 420, posFac: 1.4 });
  var rII = calcTs500SI({ db: 20, fck: 30, fyk: 420, posFac: 1.0 });
  check('lb_t Position I',          rI.lb_t,  1166.89);
  check('lb_t Position II',         rII.lb_t,  833.49);
  check('Position I / II = 1.4',    rI.lb_t / rII.lb_t, 1.4, 0.001);
  checkBool('Position I longer than II', rI.lb_t > rII.lb_t, true);
}());

// ── TEST 39 — Confined compression: Ø16, C25, B420 ───────────────────────────
// lb_c_base = 584.35 mm | confined = 584.35×0.75 = 438.26 mm
console.log('\nTEST 39 — Confined Compression  (C25, B420, Ø16)');
(function() {
  var rConf = calcTs500SI({ db: 16, fck: 25, fyk: 420, confComp: true });
  var rBase = calcTs500SI({ db: 16, fck: 25, fyk: 420, confComp: false });
  check('lb_c confined',                  rConf.lb_c, 438.26);
  check('lb_c unconfined',                rBase.lb_c, 584.35);
  check('confined / unconfined = 0.75',   rConf.lb_c / rBase.lb_c, 0.75, 0.001);
  checkBool('confined shorter than unconfined', rConf.lb_c < rBase.lb_c, true);
}());

// ── TEST 40 — 90° Hook: Ø16, C25, B420, Position II ─────────────────────────
// hookEq = 5×16 = 80 mm | hookMin = max(80,100) = 100 mm
// hook90_emb = max(730.43 − 80, 100) = 650.43 mm
console.log('\nTEST 40 — 90° Hook  (C25, B420, Ø16, Position II)');
(function() {
  var r = calcTs500SI({ db: 16, fck: 25, fyk: 420 });
  check('hook90_emb',               r.hook90_emb,         650.43);
  check('hook90_emb = lb_t − 5φ',   r.hook90_emb, r.lb_t - 5 * 16, 0.001);
  checkBool('hook90_emb < lb_t',    r.hook90_emb < r.lb_t, true);
}());

// ── TEST 41 — 180° Hook: Ø12, C30, B420, Position II ────────────────────────
// lb_t = (12/4)×(365.22/2.1909) = 500.09 mm
// hook180_emb = max(500.09 − 60, max(60,100)) = 440.09 mm
console.log('\nTEST 41 — 180° U-Hook  (C30, B420, Ø12, Position II)');
(function() {
  var r = calcTs500SI({ db: 12, fck: 30, fyk: 420 });
  check('lb_t',                      r.lb_t,        500.09);
  check('hook180_emb',               r.hook180_emb,  440.09);
  check('hook180_emb = lb_t − 5φ',   r.hook180_emb, r.lb_t - 5 * 12, 0.001);
}());

// ── TEST 42 — Tension splice, r=50%: Ø16, C25, B420 ─────────────────────────
// α₁ = 1 + 0.5×0.50 = 1.25 | l0_t = 1.25×730.43 = 913.04 mm
console.log('\nTEST 42 — Tension Lap Splice  r=50%  (C25, B420, Ø16)');
(function() {
  var r = calcTs500SI({ db: 16, fck: 25, fyk: 420, alpha1: 1.25 });
  check('l0_t',            r.l0_t,          913.04);
  check('l0_t / lb_t',     r.l0_t / r.lb_t, 1.25);
  checkBool('l0_t > lb_t', r.l0_t > r.lb_t, true);
}());

// ── TEST 43 — Compression splice: Ø20, C30, B420, Position II ────────────────
// fbd_c = 0.50×√30 = 2.739 MPa | lb_c = (20/4)×(365.22/2.739) = 666.79 mm
// l0_c = lb_c (no α factor for compression)
console.log('\nTEST 43 — Compression Lap Splice  (C30, B420, Ø20)');
(function() {
  var r = calcTs500SI({ db: 20, fck: 30, fyk: 420 });
  check('lb_c',                   r.lb_c,  666.79);
  check('l0_c',                   r.l0_c,  666.79);
  check('l0_c = lb_c (no α)',     r.l0_c,  r.lb_c, 0);
  checkBool('compression splice < tension splice', r.l0_c < r.l0_t, true);
}());

// ── TEST 44 — High-strength concrete: Ø16, C40, B420 ─────────────────────────
// fbd_t = 0.40×√40 = 2.530 MPa | lb_t = (16/4)×(365.22/2.530) = 577.46 mm
// Higher fck → shorter development length than C25 (730.43 mm) ✓
console.log('\nTEST 44 — High-Strength Concrete C40  (B420, Ø16)');
(function() {
  var r40 = calcTs500SI({ db: 16, fck: 40, fyk: 420 });
  var r25 = calcTs500SI({ db: 16, fck: 25, fyk: 420 });
  check('lb_t C40',               r40.lb_t,  577.46);
  check('fbd_t C40 = 2.530 MPa',  r40.fbd_t,   2.530, 0.005);
  checkBool('C40 shorter than C25', r40.lb_t < r25.lb_t, true);
}());

// ── TEST 45 — Minimum floor check: Ø10, C35, B220 ────────────────────────────
// fsd = 220/1.15 = 191.30 MPa | fbd_t = 2.366 MPa | lb_t = 2.5×80.84 = 202.10 mm
// fbd_c = 2.958 MPa | lb_c = 2.5×64.67 = 161.68 mm
// min floor = max(10×10, 100) = 100 mm — does NOT govern either case
console.log('\nTEST 45 — Minimum Floor Check  (C35, B220, Ø10)');
(function() {
  var r = calcTs500SI({ db: 10, fck: 35, fyk: 220 });
  check('lb_t',                         r.lb_t,     202.10);
  check('lb_c',                         r.lb_c,     161.68);
  check('lb_t_min = 100 mm',            r.lb_t_min, 100, 0);
  checkBool('minimum does not govern tension', r.minTensionGoverns, false);
  checkBool('minimum does not govern comp',    r.minCompGoverns,    false);
}());

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '================================================================');
console.log('  TS 500:2000  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
