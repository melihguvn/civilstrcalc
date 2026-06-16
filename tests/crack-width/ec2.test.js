/* Crack Width — EC2 §7.3.4  (Tests 1-8)
 * Run standalone:  cscript tests/crack-width/ec2.test.js
 * Run via runner:  cscript tests/crack-width/_run.js
 */
if (typeof console === 'undefined') {
  var console = { log: function(s) { WScript.Echo(String(s)); } };
}
if (typeof process === 'undefined') {
  var process = { exit: function(c) { if (c) WScript.Quit(c); } };
}

// ── Engine (mirrors crack-width.html exactly) ─────────────────────────────────
function crackedNA(b, d, As, n) {
  var rho = As / (b * d);
  var k   = -rho * n + Math.sqrt(rho * rho * n * n + 2 * rho * n);
  return k * d;
}
function Icr_fn(b, x, d, As, n) {
  return b * x * x * x / 3 + n * As * (d - x) * (d - x);
}
function fctm_fn(fck) {
  var fcm = fck + 8;
  return fck <= 50 ? 0.30 * Math.pow(fck, 2/3) : 2.12 * Math.log(1 + fcm / 10);
}
function Ecm_fn(fck) {
  return 22000 * Math.pow((fck + 8) / 10, 0.3);
}

function calcCW_EC2(b, h, cnom, phi, s, fck, Ms_kNm, kt, k2, wlim) {
  var d    = h - cnom - phi / 2;
  var As   = Math.PI * phi * phi / 4 * (b / s);
  var Es   = 200000;
  var Ecm  = Ecm_fn(fck);
  var n    = Es / Ecm;
  var fctm = fctm_fn(fck);
  var Ms   = Ms_kNm * 1e6;

  var x       = crackedNA(b, d, As, n);
  var Icr     = Icr_fn(b, x, d, As, n);
  var sigma_s = n * Ms * (d - x) / Icr;

  var hcef    = Math.min(2.5 * (h - d), (h - x) / 3, h / 2);
  var Aceff   = b * hcef;
  var rho_eff = As / Aceff;

  var k1         = 0.8;
  var eps_formula = (sigma_s - kt * (fctm / rho_eff) * (1 + n * rho_eff)) / Es;
  var eps_min     = 0.6 * sigma_s / Es;
  var eps         = Math.max(eps_formula, eps_min);

  var sr_max = 3.4 * cnom + 0.425 * k1 * k2 * phi / rho_eff;
  var wk     = sr_max * eps;
  var pass   = wk <= wlim;

  return { d:d, As:As, Ecm:Ecm, n:n, fctm:fctm, x:x, Icr:Icr, sigma_s:sigma_s,
           hcef:hcef, rho_eff:rho_eff, eps_formula:eps_formula, eps_min:eps_min,
           eps:eps, sr_max:sr_max, wk:wk, pass:pass, dcr:wk/wlim };
}

// ── Test runner ───────────────────────────────────────────────────────────────
var TOL = 0.01;  // 1 % relative tolerance
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

// ── TEST 1 — Default slab inputs (min-floor eps governs) ─────────────────────
// b=1000 h=200 cnom=30 φ16 s=150 fck=30 Ms=25 kt=0.4 k2=0.5 wlim=0.30
// Pre-computed references from formula chain
console.log('\nTEST 1 — Slab 200 mm (default inputs, min-floor governs)');
(function() {
  var r = calcCW_EC2(1000, 200, 30, 16, 150, 30, 25, 0.4, 0.5, 0.30);
  check('d',       r.d,       162.0, 0);
  check('As',      r.As,      1340.41);
  check('Ecm',     r.Ecm,     32841,  0.005);
  check('n',       r.n,       6.090,  0.005);
  check('x',       r.x,       43.91,  0.005);
  check('sigma_s', r.sigma_s, 126.6,  0.01);
  check('hcef',    r.hcef,    52.03,  0.005);
  check('rho_eff', r.rho_eff, 0.025762, 0.005);
  check('sr_max',  r.sr_max,  207.6,  0.01);
  check('wk',      r.wk,      0.07882, 0.02);
  checkBool('eps min-floor governs', r.eps_min > r.eps_formula, true);
  checkBool('PASS',   r.pass, true);
}());

// ── TEST 2 — Deeper beam, formula eps governs ─────────────────────────────────
// b=300 h=600 cnom=40 φ20 s=150 fck=25 Ms=75 kt=0.4 k2=0.5 wlim=0.30
console.log('\nTEST 2 — Beam 600 mm, formula eps governs (PASS)');
(function() {
  var r = calcCW_EC2(300, 600, 40, 20, 150, 25, 75, 0.4, 0.5, 0.30);
  check('d',       r.d,       550.0, 0);
  check('As',      r.As,      628.32,  0.005);
  check('x',       r.x,       108.4,   0.01);
  check('hcef',    r.hcef,    125.0,   0.005);
  check('sr_max',  r.sr_max,  338.9,   0.01);
  check('wk',      r.wk,      0.2790,  0.02);
  checkBool('formula eps governs', r.eps_formula > r.eps_min, true);
  checkBool('PASS',   r.pass, true);
}());

// ── TEST 3 — Same beam, higher moment → FAIL ──────────────────────────────────
// Ms=80 kN·m, same section
console.log('\nTEST 3 — Beam 600 mm, Ms=80 kN·m (FAIL)');
(function() {
  var r = calcCW_EC2(300, 600, 40, 20, 150, 25, 80, 0.4, 0.5, 0.30);
  check('wk',  r.wk,  0.3052,  0.02);
  checkBool('FAIL', r.pass, false);
}());

// ── TEST 4 — Short-term loading (kt=0.6) gives smaller eps_formula ──────────────
// EC2: higher kt → more tension stiffening subtracted → SMALLER eps_formula
// kt=0.4 (long-term) → less subtracted → LARGER eps_formula
console.log('\nTEST 4 — kt effect: long-term kt=0.4 gives larger eps_formula than kt=0.6');
(function() {
  var rLT = calcCW_EC2(1000, 200, 30, 16, 150, 30, 25, 0.4, 0.5, 0.30);
  var rST = calcCW_EC2(1000, 200, 30, 16, 150, 30, 25, 0.6, 0.5, 0.30);
  // eps_formula = (sigma_s - kt*term)/Es → larger for smaller kt
  checkBool('eps_formula LT(0.4) > ST(0.6)', rLT.eps_formula > rST.eps_formula, true);
  // sigma_s is independent of kt
  checkBool('sigma_s same for both kt', Math.abs(rST.sigma_s - rLT.sigma_s) < 0.001, true);
  // eps_min floor is also the same (0.6*sigma_s/Es)
  checkBool('eps_min same for both kt', Math.abs(rST.eps_min - rLT.eps_min) < 1e-10, true);
}());

// ── TEST 5 — High fck > 50 MPa uses log branch for fctm ─────────────────────
// fck=60: fctm = 2.12×ln(1+(60+8)/10) = 2.12×ln(7.8) ≈ 4.355 MPa
// Note: at low moment, eps_min floor governs and sigma_s barely changes with fck;
//       wk comparisons across fck are only reliable when eps_formula governs (high moment).
console.log('\nTEST 5 — High strength concrete fck=60 (log branch)');
(function() {
  var r = calcCW_EC2(1000, 200, 30, 16, 150, 60, 25, 0.4, 0.5, 0.30);
  check('fctm (log branch)', r.fctm, 4.355, 0.005);
  check('Ecm fck=60',        r.Ecm,  39100, 0.01);
  // Verify the fctm log-branch gives more stiffening than low-fck power branch
  var rLow = calcCW_EC2(1000, 200, 30, 16, 150, 30, 25, 0.4, 0.5, 0.30);
  checkBool('fctm(60) > fctm(30)', r.fctm > rLow.fctm, true);
  checkBool('Ecm(60) > Ecm(30)',   r.Ecm  > rLow.Ecm,  true);
  // At high moment (formula eps governs): more fctm → more subtracted → smaller eps → smaller wk
  var rH30 = calcCW_EC2(300, 600, 40, 20, 150, 30, 100, 0.4, 0.5, 0.30);
  var rH60 = calcCW_EC2(300, 600, 40, 20, 150, 60, 100, 0.4, 0.5, 0.30);
  checkBool('formula governs for high fck beam', rH60.eps_formula > rH60.eps_min, true);
  checkBool('wk decreases with higher fck (formula branch)', rH60.wk < rH30.wk, true);
}());

// ── TEST 6 — Strict exposure class wlim=0.20 mm ──────────────────────────────
// Same slab as Test 1 but XD3/XS3 → wlim=0.20 mm
console.log('\nTEST 6 — Strict exposure wlim=0.20 mm');
(function() {
  var r = calcCW_EC2(1000, 200, 30, 16, 150, 30, 25, 0.4, 0.5, 0.20);
  check('wk unchanged',  r.wk, 0.07882, 0.02);
  checkBool('PASS wlim=0.20', r.pass, true);  // 0.079 < 0.20 → still pass
  // verify DCR is computed against 0.20
  check('DCR vs 0.20', r.dcr, r.wk / 0.20, 0.001);
}());

// ── TEST 7 — k2 = 1.0 (pure tension wall) increases sr_max ──────────────────
console.log('\nTEST 7 — Wall in pure tension k2=1.0 (sr_max increases)');
(function() {
  var rBend = calcCW_EC2(1000, 200, 30, 16, 150, 30, 25, 0.4, 0.5, 0.30);
  var rTens = calcCW_EC2(1000, 200, 30, 16, 150, 30, 25, 0.4, 1.0, 0.30);
  checkBool('sr_max larger for pure tension', rTens.sr_max > rBend.sr_max, true);
  checkBool('wk larger for pure tension',     rTens.wk    > rBend.wk,    true);
}());

// ── TEST 8 — Monotonicity: larger moment → wider crack ───────────────────────
console.log('\nTEST 8 — Monotonicity: Ms=30 < Ms=50 < Ms=80');
(function() {
  var r1 = calcCW_EC2(300, 600, 40, 20, 150, 25, 30, 0.4, 0.5, 0.30);
  var r2 = calcCW_EC2(300, 600, 40, 20, 150, 25, 50, 0.4, 0.5, 0.30);
  var r3 = calcCW_EC2(300, 600, 40, 20, 150, 25, 80, 0.4, 0.5, 0.30);
  checkBool('wk(30) < wk(50)', r1.wk < r2.wk, true);
  checkBool('wk(50) < wk(80)', r2.wk < r3.wk, true);
  checkBool('same sr_max all Ms', Math.abs(r1.sr_max - r3.sr_max) < 0.001, true);
}());

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log('  EC2 §7.3.4  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
