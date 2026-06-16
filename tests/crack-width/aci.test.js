/* Crack Width — ACI 224R / Frosch (1999)  (Tests 1-7)
 * Run standalone:  cscript tests/crack-width/aci.test.js
 * Run via runner:  cscript tests/crack-width/_run.js
 *
 * All inputs in SI (mm, MPa, kN·m); wlim in mm.
 * dc = cover to bar CENTRE = clear_cover + phi/2
 */
if (typeof console === 'undefined') {
  var console = { log: function(s) { WScript.Echo(String(s)); } };
}
if (typeof process === 'undefined') {
  var process = { exit: function(c) { if (c) WScript.Quit(c); } };
}

// ── Engine (mirrors crack-width.html — SI path only) ─────────────────────────
function crackedNA(b, d, As, n) {
  var rho = As / (b * d);
  var k   = -rho * n + Math.sqrt(rho * rho * n * n + 2 * rho * n);
  return k * d;
}
function Icr_fn(b, x, d, As, n) {
  return b * x * x * x / 3 + n * As * (d - x) * (d - x);
}

/* nc=0 → singly reinforced (most common; engine supports doubly but tests use nc=0) */
function calcCW_ACI(b, h, dc, phi, s, fc, Ms_kNm, wlim, nc, phic, dcp) {
  if (nc === undefined) nc = 0;
  var d   = h - dc;
  var As  = Math.PI * phi  * phi  / 4 * (b / s);
  var Asc = (nc > 0 && phic) ? Math.PI * phic * phic / 4 * nc : 0;
  var Es  = 200000;
  var Ec  = 4700 * Math.sqrt(fc);
  var n   = Es / Ec;
  var Ms  = Ms_kNm * 1e6;

  var x, Icr;
  if (nc > 0 && Asc > 0 && dcp < d) {
    var Aq = b / 2;
    var Bq = (n - 1) * Asc + n * As;
    var Cq = -((n - 1) * Asc * dcp + n * As * d);
    x   = (-Bq + Math.sqrt(Bq * Bq - 4 * Aq * Cq)) / (2 * Aq);
    var comp_arm = Math.max(x - dcp, 0);
    Icr = b*x*x*x/3 + n*As*(d-x)*(d-x) + (n-1)*Asc*comp_arm*comp_arm;
  } else {
    x   = crackedNA(b, d, As, n);
    Icr = Icr_fn(b, x, d, As, n);
  }

  var fs     = n * Ms * (d - x) / Icr;
  var beta_s = (h - x) / (d - x);
  var dist   = Math.sqrt(dc * dc + (s / 2) * (s / 2));
  var wk     = 2 * (fs / Es) * beta_s * dist;   /* wk always in mm (SI) */
  var pass   = wk <= wlim;

  return { d:d, As:As, Ec:Ec, n:n, x:x, Icr:Icr, fs:fs,
           beta_s:beta_s, dist:dist, wk:wk, pass:pass, dcr:wk/wlim };
}

// ── Test runner ───────────────────────────────────────────────────────────────
var TOL = 0.01;
var passed = 0, failed = 0;

function check(label, got, exp, tol) {
  if (tol === undefined) tol = TOL;
  var err = (exp !== 0) ? Math.abs((got - exp) / exp) : Math.abs(got);
  var ok  = err <= tol;
  console.log('  ' + (ok ? '✓ PASS' : '✗ FAIL') + '  ' + label);
  if (!ok) console.log('           got=' + got.toFixed(5) + '  exp=' + exp.toFixed(5) + '  err=' + (err*100).toFixed(2) + '%');
  ok ? passed++ : failed++;
}
function checkBool(label, got, exp) {
  var ok = (got === exp);
  console.log('  ' + (ok ? '✓ PASS' : '✗ FAIL') + '  ' + label);
  if (!ok) console.log('           got=' + got + '  exp=' + exp);
  ok ? passed++ : failed++;
}

// ── TEST 1 — Slab 200 mm (dc=38, SI mode) ────────────────────────────────────
// b=1000 h=200 dc=38 φ16 s=150 fc=30 Ms=25 wlim=0.30
// dc=38: clear cover=30 + phi/2=8
// Pre-computed: Ec=25743 n=7.769 x=48.60 fs=127.95 beta_s=1.3351 dist=84.08 wk=0.1436
console.log('\nTEST 1 — Slab 200 mm, SI mode (PASS)');
(function() {
  var r = calcCW_ACI(1000, 200, 38, 16, 150, 30, 25, 0.30);
  check('d',       r.d,      162.0,  0);
  check('As',      r.As,     1340.41, 0.005);
  check('Ec',      r.Ec,     25743,  0.005);
  check('n',       r.n,      7.769,  0.005);
  check('x',       r.x,      48.60,  0.01);
  check('fs',      r.fs,     127.95, 0.01);
  check('beta_s',  r.beta_s, 1.3351, 0.005);
  check('dist',    r.dist,   84.08,  0.005);
  check('wk',      r.wk,     0.1436, 0.02);
  checkBool('PASS', r.pass, true);
}());

// ── TEST 2 — Higher moment → FAIL ────────────────────────────────────────────
// Ms=60: fs = 127.95*(60/25) = 307.1 MPa → wk = 0.1436*(60/25) = 0.3447 > 0.30
console.log('\nTEST 2 — Slab 200 mm, Ms=60 kN·m (FAIL)');
(function() {
  var r = calcCW_ACI(1000, 200, 38, 16, 150, 30, 60, 0.30);
  check('wk',  r.wk,  0.3447, 0.02);
  checkBool('FAIL', r.pass, false);
}());

// ── TEST 3 — wk scales linearly with fs (= proportional to Ms) ───────────────
console.log('\nTEST 3 — Linear scaling: wk proportional to Ms');
(function() {
  var r1 = calcCW_ACI(1000, 200, 38, 16, 150, 30, 25, 0.30);
  var r2 = calcCW_ACI(1000, 200, 38, 16, 150, 30, 50, 0.30);
  // wk = 2*(fs/Es)*beta_s*dist; beta_s and dist are independent of Ms
  // so wk2/wk1 should ≈ fs2/fs1 ≈ Ms2/Ms1 = 50/25 = 2
  var ratio = r2.wk / r1.wk;
  check('wk ratio ≈ Ms ratio (2.0)', ratio, 2.0, 0.01);
  checkBool('beta_s constant', Math.abs(r1.beta_s - r2.beta_s) < 1e-6, true);
  checkBool('dist constant',   Math.abs(r1.dist   - r2.dist)   < 1e-6, true);
}());

// ── TEST 4 — ACI Ec formula: 4700√fc ─────────────────────────────────────────
console.log('\nTEST 4 — Ec = 4700√fc (ACI 318 §19.2.2)');
(function() {
  var r25 = calcCW_ACI(1000, 200, 38, 16, 150, 25, 25, 0.30);
  var r40 = calcCW_ACI(1000, 200, 38, 16, 150, 40, 25, 0.30);
  check('Ec fc=25', r25.Ec, 4700*Math.sqrt(25), 0.001);
  check('Ec fc=40', r40.Ec, 4700*Math.sqrt(40), 0.001);
  // Stiffer concrete (higher fc) → smaller n → smaller x → smaller fs → smaller wk
  checkBool('wk decreases with higher fc', r40.wk < r25.wk, true);
}());

// ── TEST 5 — dc effect: larger cover → larger dist → larger wk ───────────────
// dc=38 vs dc=50 (same clear cover delta just increases dc-to-bar-center distance)
console.log('\nTEST 5 — Larger dc → larger dist → larger wk');
(function() {
  var r38 = calcCW_ACI(1000, 200, 38, 16, 150, 30, 25, 0.30);
  var r50 = calcCW_ACI(1000, 200, 50, 16, 150, 30, 25, 0.30);
  checkBool('dist larger for dc=50', r50.dist > r38.dist, true);
  checkBool('wk larger for dc=50',   r50.wk   > r38.wk,  true);
}());

// ── TEST 6 — Closer spacing reduces dist and wk ──────────────────────────────
console.log('\nTEST 6 — Closer bar spacing s=100 reduces wk');
(function() {
  var r150 = calcCW_ACI(1000, 200, 38, 16, 150, 30, 25, 0.30);
  var r100 = calcCW_ACI(1000, 200, 38, 16, 100, 30, 25, 0.30);
  checkBool('dist smaller for s=100',  r100.dist < r150.dist, true);
  // More bars → larger As → smaller fs (as well as smaller dist) → smaller wk
  checkBool('wk smaller for s=100',    r100.wk   < r150.wk,   true);
}());

// ── TEST 7 — beta_s formula: (h-x)/(d-x) = 1 + dc/(d-x) ────────────────────
// beta_s = (h-x)/(d-x) = 1 + (h-d)/(d-x) = 1 + dc/(d-x).
// For taller h with fixed dc: d grows, rho falls, x/d shrinks, (d-x) grows → dc/(d-x) shrinks → beta_s → 1.
console.log('\nTEST 7 — beta_s = (h-x)/(d-x); decreases toward 1 as h grows');
(function() {
  var r200 = calcCW_ACI(1000, 200, 38, 16, 150, 30, 25, 0.30);
  var r400 = calcCW_ACI(1000, 400, 38, 16, 150, 30, 25, 0.30);
  // Larger h (fixed dc) → larger (d-x) → smaller dc/(d-x) → beta_s closer to 1
  checkBool('beta_s decreases as h grows (with fixed dc)', r400.beta_s < r200.beta_s, true);
  checkBool('both beta_s > 1', r200.beta_s > 1 && r400.beta_s > 1, true);
  check('beta_s formula check (h=200)', r200.beta_s,
        (200 - r200.x) / (162 - r200.x), 0.001);
}());

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log('  ACI 224R Frosch  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
