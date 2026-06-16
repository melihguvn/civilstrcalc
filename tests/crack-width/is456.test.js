/* Crack Width — IS 456:2000 Annex F  (Tests 1-7)
 * Run standalone:  cscript tests/crack-width/is456.test.js
 * Run via runner:  cscript tests/crack-width/_run.js
 */
if (typeof console === 'undefined') {
  var console = { log: function(s) { WScript.Echo(String(s)); } };
}
if (typeof process === 'undefined') {
  var process = { exit: function(c) { if (c) WScript.Quit(c); } };
}

// ── Engine (mirrors crack-width.html exactly) ─────────────────────────────────
function crackedNA(b, d, As, m) {
  var rho = As / (b * d);
  var k   = -rho * m + Math.sqrt(rho * rho * m * m + 2 * rho * m);
  return k * d;
}
function Icr_fn(b, x, d, As, m) {
  return b * x * x * x / 3 + m * As * (d - x) * (d - x);
}

function calcCW_IS456(b, h, cnom, phi, s, fck, Ms_kNm, wlim) {
  var d   = h - cnom - phi / 2;
  var As  = Math.PI * phi * phi / 4 * (b / s);
  var Es  = 200000;
  var Ec  = 5000 * Math.sqrt(fck);
  var m   = Es / Ec;
  var Ms  = Ms_kNm * 1e6;

  var x   = crackedNA(b, d, As, m);
  var Icr = Icr_fn(b, x, d, As, m);
  var fs  = m * Ms * (d - x) / Icr;

  var eps1  = fs * (h - x) / (Es * (d - x));
  var eps2  = b * Math.pow(h - x, 2) / (3 * Es * As * (d - x));  /* fixed: ^2 not ^3 */
  var eps_m = Math.max(eps1 - eps2, 0);

  var acr = Math.sqrt(cnom * cnom + (s / 2) * (s / 2));
  var den = 1 + 2 * (acr - cnom) / (h - x);
  var wk  = 3 * acr * eps_m / den;
  var pass = wk <= wlim;

  return { d:d, As:As, Ec:Ec, m:m, x:x, Icr:Icr, fs:fs,
           eps1:eps1, eps2:eps2, eps_m:eps_m,
           acr:acr, den:den, wk:wk, pass:pass, dcr:wk/wlim };
}

// ── Test runner ───────────────────────────────────────────────────────────────
var TOL = 0.01;
var passed = 0, failed = 0;

function check(label, got, exp, tol) {
  if (tol === undefined) tol = TOL;
  var err = (exp !== 0) ? Math.abs((got - exp) / exp) : Math.abs(got);
  var ok  = err <= tol;
  console.log('  ' + (ok ? '✓ PASS' : '✗ FAIL') + '  ' + label);
  if (!ok) console.log('           got=' + got.toFixed(6) + '  exp=' + exp.toFixed(6) + '  err=' + (err*100).toFixed(2) + '%');
  ok ? passed++ : failed++;
}
function checkBool(label, got, exp) {
  var ok = (got === exp);
  console.log('  ' + (ok ? '✓ PASS' : '✗ FAIL') + '  ' + label);
  if (!ok) console.log('           got=' + got + '  exp=' + exp);
  ok ? passed++ : failed++;
}

// ── TEST 1 — Default slab, verify chain ──────────────────────────────────────
// b=1000 h=200 cnom=30 φ16 s=150 fck=25 Ms=25 wlim=0.30
// Ec=25000 m=8.0 x=49.19 fs=128.1 eps1=8.565e-4 eps2=2.507e-4 wk≈0.0878
console.log('\nTEST 1 — Slab 200 mm (default-like inputs, PASS)');
(function() {
  var r = calcCW_IS456(1000, 200, 30, 16, 150, 25, 25, 0.30);
  check('d',       r.d,   162.0,    0);
  check('As',      r.As,  1340.41,  0.005);
  check('Ec',      r.Ec,  25000.0,  0);
  check('m',       r.m,   8.0,      0.001);
  check('x',       r.x,   49.19,    0.005);
  check('fs',      r.fs,  128.1,    0.01);
  check('eps1',    r.eps1, 8.565e-4, 0.01);
  check('eps2',    r.eps2, 2.507e-4, 0.01);
  check('acr',     r.acr,  80.78,    0.005);
  check('wk',      r.wk,   0.08778,  0.02);
  checkBool('PASS', r.pass, true);
}());

// ── TEST 2 — Bug-fix verification: eps2 uses (h-x)^2, not (h-x)^3 ───────────
// With the old ^3 bug, eps2 >> eps1 → eps_m = 0 → wk = 0 (DCR always 0)
// After fix: eps2 should be significantly LESS than eps1
console.log('\nTEST 2 — IS456 bug-fix: eps2 uses (h-x)^2, eps_m > 0');
(function() {
  var r = calcCW_IS456(1000, 200, 30, 16, 150, 25, 25, 0.30);
  // Bug check: eps2 must be LESS than eps1 (not greater)
  checkBool('eps2 < eps1 (bug fix confirmed)', r.eps2 < r.eps1, true);
  // eps_m must be positive
  checkBool('eps_m > 0',                       r.eps_m > 0,    true);
  // verify eps2 is roughly 29% of eps1 (for this case), not 15× eps1 as it would be with ^3
  checkBool('eps2/eps1 < 0.5 (correct scale)', r.eps2 / r.eps1 < 0.5, true);
  // With ^3 bug: eps2_wrong = b*(h-x)^3 / ... = eps2 * (h-x) ≈ eps2 * 150.8 → huge
  var eps2_wrong = r.eps2 * (200 - r.x);  // approximate buggy value
  checkBool('buggy eps2 >> eps1 (confirms fix needed)', eps2_wrong > r.eps1, true);
  check('wk non-zero', r.wk, 0.08778, 0.02);
}());

// ── TEST 3 — Beam 500 mm, Ms=40 (PASS) ───────────────────────────────────────
// b=300 h=500 cnom=40 φ16 s=150 fck=25 Ms=40
console.log('\nTEST 3 — Beam 500 mm, Ms=40 kN·m (PASS)');
(function() {
  var r = calcCW_IS456(300, 500, 40, 16, 150, 25, 40, 0.30);
  check('d',  r.d,   452.0, 0);
  check('As', r.As,  402.12, 0.005);
  check('Ec', r.Ec,  25000.0, 0);
  check('m',  r.m,   8.0, 0.001);
  check('x',  r.x,   88.32, 0.01);
  check('acr', r.acr, 85.00, 0.005);
  check('wk',  r.wk,  0.1575, 0.02);
  checkBool('PASS', r.pass, true);
}());

// ── TEST 4 — Same beam, Ms=80 → FAIL ─────────────────────────────────────────
// eps2 is independent of Ms; eps1 and wk scale linearly with Ms
console.log('\nTEST 4 — Beam 500 mm, Ms=80 kN·m (FAIL)');
(function() {
  var r3 = calcCW_IS456(300, 500, 40, 16, 150, 25, 40, 0.30);
  var r4 = calcCW_IS456(300, 500, 40, 16, 150, 25, 80, 0.30);
  // eps2 is independent of Ms
  checkBool('eps2 same for both moments', Math.abs(r3.eps2 - r4.eps2) < 1e-10, true);
  // wk roughly doubles (linear in eps_m which grows with Ms)
  checkBool('wk(80) > wk(40)', r4.wk > r3.wk, true);
  checkBool('FAIL', r4.pass, false);
}());

// ── TEST 5 — Higher fck reduces crack width ───────────────────────────────────
// fck=25 → Ec=25000; fck=40 → Ec=31623 MPa (stiffer → less fs)
console.log('\nTEST 5 — Higher fck → smaller crack width');
(function() {
  var r25 = calcCW_IS456(1000, 200, 30, 16, 150, 25, 25, 0.30);
  var r40 = calcCW_IS456(1000, 200, 30, 16, 150, 40, 25, 0.30);
  check('Ec fck=40', r40.Ec, 31623.0, 0.005);
  checkBool('wk decreases with higher fck', r40.wk < r25.wk, true);
}());

// ── TEST 6 — Closer bar spacing reduces acr and wk ───────────────────────────
console.log('\nTEST 6 — Closer spacing s=100 reduces acr and wk');
(function() {
  var r150 = calcCW_IS456(1000, 200, 30, 16, 150, 25, 25, 0.30);
  var r100 = calcCW_IS456(1000, 200, 30, 16, 100, 25, 25, 0.30);
  checkBool('acr smaller for s=100', r100.acr < r150.acr, true);
  checkBool('wk smaller for s=100',  r100.wk  < r150.wk,  true);
}());

// ── TEST 7 — Monotonicity: larger Ms → wider crack ───────────────────────────
console.log('\nTEST 7 — Monotonicity: wk increases with Ms');
(function() {
  var r1 = calcCW_IS456(300, 500, 40, 16, 150, 25, 20, 0.30);
  var r2 = calcCW_IS456(300, 500, 40, 16, 150, 25, 40, 0.30);
  var r3 = calcCW_IS456(300, 500, 40, 16, 150, 25, 60, 0.30);
  checkBool('wk(20) < wk(40)', r1.wk < r2.wk, true);
  checkBool('wk(40) < wk(60)', r2.wk < r3.wk, true);
  // acr and den do not change with Ms
  checkBool('acr constant', Math.abs(r1.acr - r3.acr) < 1e-6, true);
  checkBool('den constant', Math.abs(r1.den - r3.den) < 1e-6, true);
}());

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log('  IS 456:2000  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
