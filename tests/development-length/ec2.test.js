/* Eurocode 2 (EN 1992-1-1) Development Length  (Tests 19-27)
 * Run standalone:  cscript tests/development-length/ec2.test.js
 * Or via runner:   cscript tests/development-length/_run_devlen.js
 */
if (typeof console === 'undefined') {
  var console = { log: function(s) { WScript.Echo(String(s)); } };
}
if (typeof process === 'undefined') {
  var process = { exit: function(c) { if (c) WScript.Quit(c); } };
}

// ── EC2 (EN 1992-1-1) Engine  §8.4 / §8.7 ───────────────────────────────────
function calcEc2SI(opts) {
  var db  = opts.db,  fck = opts.fck, fyk = opts.fyk;
  var eta1 = opts.eta1 !== undefined ? opts.eta1 : 1.0;
  var a1   = opts.a1   !== undefined ? opts.a1   : 1.0;
  var a2   = opts.a2   !== undefined ? opts.a2   : 1.0;
  var a3   = opts.a3   !== undefined ? opts.a3   : 1.0;
  var a4   = opts.a4   !== undefined ? opts.a4   : 1.0;
  var a6   = opts.a6   !== undefined ? opts.a6   : 1.0;

  var eta2   = (db <= 32) ? 1.0 : (132 - db) / 100;
  var fctm   = (fck <= 50)
    ? 0.30 * Math.pow(fck, 2/3)
    : 2.12 * Math.log(1 + (fck + 8) / 10);
  var fctd   = 0.7 * fctm / 1.5;
  var fbd    = 2.25 * eta1 * eta2 * fctd;
  var fyd    = fyk / 1.15;
  var lb_rqd = (db / 4) * (fyd / fbd);

  // Straight bar tension — alpha1=1.0 always (Table 8.2)
  var alpha_t  = Math.max(1.0 * a2 * a3 * a4, 0.7);
  var lbd_t_min = Math.max(0.3 * lb_rqd, Math.max(10 * db, 100));
  var lbd_t    = Math.max(alpha_t * lb_rqd, lbd_t_min);

  // Compression — alpha1=1.0 per §8.4.1; minimum floor 0.6×lb_rqd
  var alpha_c  = Math.max(1.0 * a2 * a3 * a4, 0.7);
  var lbd_c_min = Math.max(0.6 * lb_rqd, Math.max(10 * db, 100));
  var lbd_c    = Math.max(alpha_c * lb_rqd, lbd_c_min);

  // Hooks — a1 from input; alpha4 N/A per §8.4.4
  var alpha_h  = Math.max(a1 * a2 * a3, 0.7);
  var lbd_h    = Math.max(alpha_h * lb_rqd, Math.max(0.3 * lb_rqd, Math.max(10 * db, 100)));

  // Lap splice — alpha6 for lapping percentage
  var alpha_st = Math.max(1.0 * a2 * a3 * a4, 0.7) * a6;
  var l0_t     = Math.max(alpha_st * lb_rqd, Math.max(0.3 * a6 * lb_rqd, Math.max(15 * db, 200)));

  var alpha_sc = Math.max(1.0 * a2 * a3 * a4, 0.7) * a6;
  var l0_c     = Math.max(alpha_sc * lb_rqd, Math.max(0.3 * a6 * lb_rqd, Math.max(15 * db, 200)));

  return {
    lb_rqd: lb_rqd, lbd_t: lbd_t, lbd_c: lbd_c, lbd_h: lbd_h, l0_t: l0_t, l0_c: l0_c,
    intermediate: {
      fctm: fctm, fctd: fctd, fbd: fbd, fyd: fyd,
      eta2: eta2, alpha_t: alpha_t, alpha_c: alpha_c, alpha_h: alpha_h
    },
    minTensionGoverns: (lbd_t <= lbd_t_min + 0.001),
    minCompGoverns:    (lbd_c <= lbd_c_min + 0.001)
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
function checkExact(label, computed, expected) {
  var ok = Math.abs(computed - expected) < 1e-9;
  console.log('  ' + (ok ? '✓ PASS' : '✗ FAIL') + '  ' + label);
  if (!ok) console.log('           got=' + computed + '  exp=' + expected);
  ok ? passed++ : failed++;
}
function checkBool(label, value, expected) {
  var ok = value === expected;
  console.log('  ' + (ok ? '✓ PASS' : '✗ FAIL') + '  ' + label);
  if (!ok) console.log('           got=' + value + '  exp=' + expected);
  ok ? passed++ : failed++;
}

// ── TEST 19 — Basic straight bar, good bond, all defaults ────────────────────
// Ø16, fck=25, fyk=500
// fctm=2.565, fbd=2.693, fyd=434.783, lb_rqd=645.8, lbd_t=645.8
console.log('\nTEST 19 — Basic Straight Bar  (O16, fck=25, fyk=500)');
(function() {
  var r = calcEc2SI({ db: 16, fck: 25, fyk: 500 });
  check('lb_rqd',          r.lb_rqd,               645.79);
  check('lbd_t',           r.lbd_t,                645.79);
  check('fbd',             r.intermediate.fbd,       2.693);
  check('fyd',             r.intermediate.fyd,     434.783);
  checkExact('eta2 = 1.0', r.intermediate.eta2,      1.0);
  checkBool('min does NOT govern tension', r.minTensionGoverns, false);
}());

// ── TEST 20 — Poor bond condition (eta1=0.7) ──────────────────────────────────
// Ø20, fck=30, fyk=500, eta1=0.7
// fctm=2.897, fbd=2.131, lb_rqd=1020.2, poor/good ratio=1/0.7
console.log('\nTEST 20 — Poor Bond eta1=0.7  (O20, fck=30, fyk=500)');
(function() {
  var rGood = calcEc2SI({ db: 20, fck: 30, fyk: 500, eta1: 1.0 });
  var rPoor = calcEc2SI({ db: 20, fck: 30, fyk: 500, eta1: 0.7 });
  check('lbd_t poor bond',          rPoor.lbd_t,                  1020.16);
  check('fbd poor',                 rPoor.intermediate.fbd,          2.131);
  check('poor/good ratio ≈ 1/0.7',  rPoor.lbd_t / rGood.lbd_t,  1 / 0.7);
}());

// ── TEST 21 — Large bar: eta2 reduction factor ────────────────────────────────
// Ø40, fck=35, fyk=500
// eta2 = (132-40)/100 = 0.92
// lb_rqd = 1402.5 mm
console.log('\nTEST 21 — Large Bar eta2 Factor  (O40, fck=35, fyk=500)');
(function() {
  var r    = calcEc2SI({ db: 40, fck: 35, fyk: 500 });
  var rRef = calcEc2SI({ db: 32, fck: 35, fyk: 500 });
  check('lb_rqd O40',        r.lb_rqd,              1402.50);
  check('eta2 = 0.92',       r.intermediate.eta2,      0.92);
  checkExact('eta2 O32=1.0', rRef.intermediate.eta2,   1.0);
  checkBool('O40 longer than O32', r.lb_rqd > rRef.lb_rqd, true);
}());

// ── TEST 22 — Hook anchorage with a1=0.7 (cd > 3phi) ─────────────────────────
// Ø16, fck=25, fyk=500, a1=0.7
// lbd_h = max(0.7×645.8, max(0.3×645.8, 160, 100)) = max(452.1, 193.7) = 452.1
console.log('\nTEST 22 — Hook Anchorage a1=0.7  (O16, fck=25, fyk=500)');
(function() {
  var r    = calcEc2SI({ db: 16, fck: 25, fyk: 500, a1: 0.7 });
  var rStr = calcEc2SI({ db: 16, fck: 25, fyk: 500, a1: 1.0 });
  check('lbd_h',                r.lbd_h,              452.05);
  check('alpha_h = 0.7',        r.intermediate.alpha_h, 0.7);
  checkBool('hook shorter than straight', r.lbd_h < rStr.lbd_t, true);
}());

// ── TEST 23 — Well confined: a2=a3=0.7 (alpha product clamped to 0.7) ────────
// Ø20, fck=30, fyk=500, a2=0.7, a3=0.7
// alpha_t = max(1.0×0.7×0.7×1.0, 0.7) = max(0.49, 0.7) = 0.7 (clamped)
// lbd_t = max(0.7×714.7=500.3, max(214.4, 200, 100)) = 500.3
console.log('\nTEST 23 — Well Confined a2=a3=0.7  (O20, fck=30, fyk=500)');
(function() {
  var r       = calcEc2SI({ db: 20, fck: 30, fyk: 500, a2: 0.7, a3: 0.7 });
  var rNoConf = calcEc2SI({ db: 20, fck: 30, fyk: 500 });
  check('lbd_t',         r.lbd_t,              500.29);
  check('alpha_t = 0.7', r.intermediate.alpha_t, 0.7);
  checkBool('confined shorter', r.lbd_t < rNoConf.lbd_t, true);
}());

// ── TEST 24 — Lap splice with 50% bars lapped (a6=1.4) ───────────────────────
// Ø16, fck=25, fyk=500, a6=1.4
// l0_t = max(1.4×645.8=904.1, ...) = 904.1
console.log('\nTEST 24 — Lap Splice 50pct (a6=1.4)  (O16, fck=25, fyk=500)');
(function() {
  var r  = calcEc2SI({ db: 16, fck: 25, fyk: 500, a6: 1.4 });
  var r1 = calcEc2SI({ db: 16, fck: 25, fyk: 500, a6: 1.0 });
  check('l0_t a6=1.4',      r.l0_t,           904.11);
  check('l0 scales with a6', r.l0_t / r1.l0_t, 1.4);
}());

// ── TEST 25 — High fck > 50 MPa uses log formula ──────────────────────────────
// Ø16, fck=60, fyk=500
// fctm = 2.12×ln(1+(60+8)/10) = 2.12×ln(7.8) = 4.355 MPa
// lb_rqd ≈ 380.2 mm
console.log('\nTEST 25 — High fck > 50 MPa Formula  (O16, fck=60, fyk=500)');
(function() {
  var r    = calcEc2SI({ db: 16, fck: 60, fyk: 500 });
  var rLow = calcEc2SI({ db: 16, fck: 25, fyk: 500 });
  check('lb_rqd',           r.lb_rqd,            380.15);
  check('fctm (log branch)', r.intermediate.fctm,   4.355);
  checkBool('fck=60 shorter', r.lbd_t < rLow.lbd_t, true);
}());

// ── TEST 26 — Compression min floor (100 mm) governs ─────────────────────────
// Ø6, fck=60, fyk=400, a2=0.7, a3=0.7
// formula: 0.7×114.1=79.9 < min=max(0.6×114.1=68.5,10×6=60,100)=100 → 100 governs
console.log('\nTEST 26 — Compression Min Floor Governs  (O6, fck=60, fyk=400)');
(function() {
  var r = calcEc2SI({ db: 6, fck: 60, fyk: 400, a2: 0.7, a3: 0.7 });
  check('lbd_c = 100 (minimum)', r.lbd_c, 100);
  checkBool('minCompGoverns = true', r.minCompGoverns, true);
}());

// ── TEST 27 — Welded transverse bar: a4=0.7 ───────────────────────────────────
// Ø20, fck=30, fyk=500, a4=0.7
// alpha_t = max(1.0×1.0×1.0×0.7, 0.7) = 0.7 → lbd_t = 500.3
// Hooks ignore alpha4 per §8.4.4 → lbd_h uses a1×a2×a3 only (all 1.0) → lbd_h=714.7
console.log('\nTEST 27 — Welded Transverse Bar a4=0.7  (O20, fck=30, fyk=500)');
(function() {
  var r    = calcEc2SI({ db: 20, fck: 30, fyk: 500, a4: 0.7 });
  var rRef = calcEc2SI({ db: 20, fck: 30, fyk: 500, a4: 1.0 });
  check('lbd_t',          r.lbd_t,              500.29);
  check('alpha_t = 0.7',  r.intermediate.alpha_t, 0.7);
  checkBool('a4 reduces straight bar', r.lbd_t < rRef.lbd_t, true);
  check('lbd_h unaffected by a4', r.lbd_h, rRef.lbd_h, 0);
  checkBool('lbd_h longer than lbd_t (a4 not applied)', r.lbd_h > r.lbd_t, true);
}());

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '================================================================');
console.log('  Eurocode 2  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
