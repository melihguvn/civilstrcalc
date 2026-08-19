/* ACI 318-25 Development Length — SI Units  (Tests 1-9)
 * Run standalone:  cscript tests/development-length/aci-si.test.js
 * Or via runner:   cscript tests/development-length/_run_devlen.js
 */
if (typeof console === 'undefined') {
  var console = { log: function(s) { WScript.Echo(String(s)); } };
}
if (typeof process === 'undefined') {
  var process = { exit: function(c) { if (c) WScript.Quit(c); } };
}

// ── ACI 318-25 Engine (SI: mm / MPa) ──────────────────────────────────────
function calcAciSI(opts) {
  var db = opts.db, fc = opts.fc, fy = opts.fy;
  var psi_t = opts.psi_t !== undefined ? opts.psi_t : 1.0;
  var psi_e = opts.psi_e !== undefined ? opts.psi_e : 1.0;
  var psi_r = opts.psi_r !== undefined ? opts.psi_r : 1.0;
  var psi_o = opts.psi_o !== undefined ? opts.psi_o : 1.0;
  var lam   = opts.lam   !== undefined ? opts.lam   : 1.0;
  var spliceClass = opts.spliceClass !== undefined ? opts.spliceClass : 'B';
  var detail = !!opts.detail;
  var cb = opts.cb || 0, Ktr = opts.Ktr || 0;

  var psi_s  = (db <= 19) ? 0.8 : 1.0;
  var psi_g  = (fy <= 420) ? 1.0 : (fy <= 550 ? 1.15 : 1.3);
  var psi_te = Math.min(psi_t * psi_e, 1.7);
  var conf   = detail ? Math.min(2.5, (cb + Ktr) / db) : 1.5;
  if (conf <= 0) conf = 1.5;
  var sqFc = Math.sqrt(fc);

  var ld_t_min = Math.max(300, 8 * db);
  var ld_t = Math.max(fy * psi_te * psi_s * psi_g * db / (1.1 * lam * sqFc * conf), ld_t_min);
  var ld_c = Math.max(Math.max((0.24*fy*db)/(lam*sqFc), 0.043*fy*db), 200);
  var ldh90  = Math.max((fy*psi_e*psi_r*psi_o*db)/(4.57*lam*sqFc), Math.max(8*db, 150));
  var ldh180 = Math.max((fy*psi_e*psi_o*db)      /(4.57*lam*sqFc), Math.max(8*db, 150));
  var sp_t = Math.max(((spliceClass==='A')?1.0:1.3)*ld_t, Math.max(300, 8*db));
  var sp_c = Math.max(ld_c, 300);

  return {
    ld_t: ld_t, ld_c: ld_c, ldh90: ldh90, ldh180: ldh180, sp_t: sp_t, sp_c: sp_c,
    factors: { psi_s: psi_s, psi_g: psi_g, psi_te: psi_te, conf: conf },
    minTensionGoverns: (ld_t <= ld_t_min + 0.001)
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

// ── TEST 1 — Straight bar, basic tension ─────────────────────────────────────
// O16, fc=25, fy=420, all defaults
// psi_s=0.8, psi_te=1.0, conf=1.5, sqFc=5.0
// ld_t = 420*1.0*0.8*1.0*16 / (1.1*5.0*1.5) = 5376/8.25 = 651.6 mm
console.log('\nTEST 1 — Straight Bar Basic Tension  (O16, fc=25, fy=420)');
(function() {
  var r = calcAciSI({ db:16, fc:25, fy:420 });
  check('ld_t',        r.ld_t,           651.636);
  check('ld_c',        r.ld_c,           322.56);
  checkExact('psi_s',  r.factors.psi_s,  0.8);
  checkExact('psi_g',  r.factors.psi_g,  1.0);
  checkExact('psi_te', r.factors.psi_te, 1.0);
  checkExact('conf',   r.factors.conf,   1.5);
  checkBool('min NOT governs tension', r.minTensionGoverns, false);
}());

// ── TEST 2 — Top bar + epoxy, psi_te cap at 1.7 ──────────────────────────────
// O25, fc=20, fy=420, psi_t=1.3, psi_e=1.5  => psi_te=min(1.95,1.7)=1.7
// ld_t = 420*1.7*1.0*1.0*25 / (1.1*4.4721*1.5) = 17850/7.379 = 2418.4 mm
console.log('\nTEST 2 — Top Bar + Epoxy Cap 1.7  (O25, fc=20, fy=420)');
(function() {
  var r = calcAciSI({ db:25, fc:20, fy:420, psi_t:1.3, psi_e:1.5 });
  check('ld_t',          r.ld_t,           2418.42);
  checkExact('psi_te=1.7 (capped)', r.factors.psi_te, 1.7);
}());

// ── TEST 3 — Confined: best-case conf=2.5 ────────────────────────────────────
// O20, fc=30, fy=420, detail, cb=60, Ktr=50
// conf = min(2.5, (60+50)/20) = 2.5
// ld_t = 420*1.0*1.0*1.0*20 / (1.1*5.477*2.5) = 8400/15.062 = 557.7 mm
console.log('\nTEST 3 — Best-Case Confinement  (O20, fc=30, cb=60, Ktr=50)');
(function() {
  var r = calcAciSI({ db:20, fc:30, fy:420, detail:true, cb:60, Ktr:50 });
  check('ld_t',      r.ld_t,         557.71);
  checkExact('conf=2.5 (capped)', r.factors.conf, 2.5);
}());

// ── TEST 4 — 90° hook, no confinement (psi_r=1.6) ───────────────────────────
// O16, fc=25, fy=420
// ldh90 = 420*1.0*1.6*1.0*16 / (4.57*5.0) = 10752/22.85 = 470.5 mm
console.log('\nTEST 4 — 90 deg Hook psi_r=1.6  (O16, fc=25, fy=420)');
(function() {
  var r = calcAciSI({ db:16, fc:25, fy:420, psi_r:1.6 });
  check('ldh90', r.ldh90, 470.54);
}());

// ── TEST 5 — 180° hook: psi_r never applies ──────────────────────────────────
// O20, fc=28, fy=420
// ldh180 = 420*1.0*1.0*20 / (4.57*5.292) = 8400/24.182 = 347.4 mm
console.log('\nTEST 5 — 180 deg Hook psi_r Ignored  (O20, fc=28, fy=420)');
(function() {
  var r1 = calcAciSI({ db:20, fc:28, fy:420, psi_r:1.0 });
  var r2 = calcAciSI({ db:20, fc:28, fy:420, psi_r:1.6 });
  check('ldh180', r1.ldh180, 347.36);
  check('ldh180 same regardless of psi_r', r2.ldh180/r1.ldh180, 1.0, 0);
}());

// ── TEST 6 — Class A vs Class B splice ────────────────────────────────────────
// O16, fc=25, fy=420
// Class A: sp_t = 1.0*651.6 = 651.6 mm
// Class B: sp_t = 1.3*651.6 = 847.1 mm
console.log('\nTEST 6 — Splice Class A vs B  (O16, fc=25, fy=420)');
(function() {
  var rA = calcAciSI({ db:16, fc:25, fy:420, spliceClass:'A' });
  var rB = calcAciSI({ db:16, fc:25, fy:420, spliceClass:'B' });
  check('sp_t Class A', rA.sp_t, 651.636);
  check('sp_t Class B', rB.sp_t, 847.127);
  check('B/A ratio = 1.3', rB.sp_t / rA.sp_t, 1.3);
}());

// ── TEST 7 — Class B splice + top bar ────────────────────────────────────────
// O25, fc=25, fy=420, psi_t=1.3
// ld_t = 420*1.3*1.0*1.0*25 / (1.1*5.0*1.5) = 13650/8.25 = 1654.5 mm
// sp_t = 1.3*1654.5 = 2150.9 mm
console.log('\nTEST 7 — Class B + Top Bar  (O25, fc=25, psi_t=1.3)');
(function() {
  var r = calcAciSI({ db:25, fc:25, fy:420, psi_t:1.3, spliceClass:'B' });
  check('ld_t', r.ld_t, 1654.545);
  check('sp_t', r.sp_t, 2150.909);
}());

// ── TEST 8 — Compression development ─────────────────────────────────────────
// O20, fc=28, fy=420
// cf1 = 0.24*420*20/5.292 = 381.0 mm (governs)
console.log('\nTEST 8 — Compression Development  (O20, fc=28, fy=420)');
(function() {
  var r = calcAciSI({ db:20, fc:28, fy:420 });
  check('ld_c', r.ld_c, 381.00);
  var cf1 = (0.24*420*20)/Math.sqrt(28), cf2 = 0.043*420*20;
  checkBool('cf1 governs over cf2', cf1 > cf2, true);
}());

// ── TEST 9 — Tension minimum 300 mm governs ──────────────────────────────────
// O8, fc=30, fy=420
// ld_t_raw = 420*0.8*8/(1.1*5.477*1.5) = 2688/9.037 = 297.5 < 300
console.log('\nTEST 9 — Tension Minimum Governs  (O8, fc=30, fy=420)');
(function() {
  var r = calcAciSI({ db:8, fc:30, fy:420 });
  check('ld_t = 300', r.ld_t, 300);
  checkBool('minTensionGoverns', r.minTensionGoverns, true);
  checkExact('psi_s=0.8 for O8', r.factors.psi_s, 0.8);
}());

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '================================================================');
console.log('  ACI 318-25 SI  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
