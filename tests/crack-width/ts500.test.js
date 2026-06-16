/* Crack Width — TS 500:2000 §11.5  (Tests 1-8)
 * Run standalone:  cscript tests/crack-width/ts500.test.js
 * Run via runner:  cscript tests/crack-width/_run.js
 */
if (typeof console === 'undefined') {
  var console = { log: function(s) { WScript.Echo(String(s)); } };
}
if (typeof process === 'undefined') {
  var process = { exit: function(c) { if (c) WScript.Quit(c); } };
}

// ── Engine (mirrors crack-width.html exactly after formula fix) ───────────────
function crackedNA(b, d, As, n) {
  var rho = As / (b * d);
  var k   = -rho * n + Math.sqrt(rho * rho * n * n + 2 * rho * n);
  return k * d;
}
function Icr_fn(b, x, d, As, n) {
  return b * x * x * x / 3 + n * As * (d - x) * (d - x);
}

/* k2: 0.5=bending, 1.0=pure tension
 * beta2: 0.5=long-term sustained, 1.0=short-term/instantaneous */
function calcCW_TS500(b, h, cnom, phi, s, fck, Ms_kNm, k2, beta2, wlim) {
  var d    = h - cnom - phi / 2;
  var As   = Math.PI * phi * phi / 4 * (b / s);
  var Es   = 200000;
  var Ecm  = 3250 * Math.sqrt(fck) + 14000;   /* TS 500:2000 Table 2.2 */
  var n    = Es / Ecm;
  var fctm = 0.35 * Math.sqrt(fck);            /* TS 500:2000 Table 2.2 */
  var Ms   = Ms_kNm * 1e6;

  var x        = crackedNA(b, d, As, n);
  var Icr      = Icr_fn(b, x, d, As, n);
  var sigma_s  = n * Ms * (d - x) / Icr;

  var hcef     = Math.min(2.5 * (h - d), (h - x) / 3, h / 2);
  var Aceff    = b * hcef;
  var rho_eff  = As / Aceff;
  var sigma_sr = fctm * (1 + n * rho_eff) / rho_eff;

  var k1        = 0.8;
  var beta1     = 1.0;
  var sm        = 50 + 0.25 * k1 * k2 * phi / rho_eff;
  var ratio_sq  = (sigma_s > 0) ? Math.pow(sigma_sr / sigma_s, 2) : 0;
  var eps_raw   = (sigma_s / Es) * (1 - beta1 * beta2 * ratio_sq);
  var eps_min   = 0.4 * sigma_s / Es;
  var eps_sm    = Math.max(eps_raw, eps_min);

  var beta_coef = 1.7;
  var wk        = beta_coef * sm * eps_sm;
  var pass      = wk <= wlim;

  return { d:d, As:As, Ecm:Ecm, n:n, fctm:fctm, x:x, sigma_s:sigma_s,
           hcef:hcef, rho_eff:rho_eff, sigma_sr:sigma_sr,
           sm:sm, eps_raw:eps_raw, eps_min:eps_min, eps_sm:eps_sm,
           wk:wk, pass:pass, dcr:wk/wlim };
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

// ── TEST 1 — TS 500 Ec and fctm formulas (not EC2) ───────────────────────────
// Verify the fix: TS 500 uses Ec=3250√fck+14000 and fctm=0.35√fck
// EC2 would give Ecm=32841 MPa and fctm=2.897 MPa for fck=30
// TS 500 gives Ec=31801 MPa and fctm=1.917 MPa — both different
console.log('\nTEST 1 — TS 500 formulas: Ec and fctm distinct from EC2');
(function() {
  var r = calcCW_TS500(1000, 200, 30, 16, 150, 30, 25, 0.5, 0.5, 0.30);
  // Ec = 3250*√30 + 14000
  check('Ec TS500 fck=30', r.Ecm, 3250*Math.sqrt(30)+14000, 0.001);
  // fctm = 0.35*√30
  check('fctm TS500 fck=30', r.fctm, 0.35*Math.sqrt(30), 0.001);
  // Both should differ from EC2 values
  var Ecm_ec2  = 22000 * Math.pow((30+8)/10, 0.3);   // ≈ 32841
  var fctm_ec2 = 0.30 * Math.pow(30, 2/3);            // ≈ 2.897
  checkBool('Ec TS500 ≠ Ecm EC2', Math.abs(r.Ecm - Ecm_ec2) > 500, true);
  checkBool('fctm TS500 < fctm EC2', r.fctm < fctm_ec2, true);
}());

// ── TEST 2 — Slab 200 mm, bending, long-term (PASS) ─────────────────────────
// b=1000 h=200 cnom=30 φ16 s=150 fck=30 Ms=25 k2=0.5 beta2=0.5 wlim=0.30
// Pre-computed: Ec=31801 n=6.289 fctm=1.917 x=44.51 sigma_s=126.8 sm=111.9 wk≈0.0927
console.log('\nTEST 2 — Slab 200 mm, long-term, k2=0.5 (PASS)');
(function() {
  var r = calcCW_TS500(1000, 200, 30, 16, 150, 30, 25, 0.5, 0.5, 0.30);
  check('d',        r.d,        162.0,   0);
  check('Ecm',      r.Ecm,      31801,   0.005);
  check('n',        r.n,        6.289,   0.005);
  check('fctm',     r.fctm,     1.917,   0.005);
  check('x',        r.x,        44.51,   0.01);
  check('sigma_s',  r.sigma_s,  126.8,   0.01);
  check('hcef',     r.hcef,     51.83,   0.01);
  check('sm',       r.sm,       111.9,   0.01);
  check('wk',       r.wk,       0.09267, 0.02);
  checkBool('PASS', r.pass, true);
}());

// ── TEST 3 — Short-term load (beta2=1.0) increases wk ────────────────────────
console.log('\nTEST 3 — Short-term beta2=1.0 vs long-term beta2=0.5');
(function() {
  var rLT = calcCW_TS500(1000, 200, 30, 16, 150, 30, 25, 0.5, 0.5, 0.30);
  var rST = calcCW_TS500(1000, 200, 30, 16, 150, 30, 25, 0.5, 1.0, 0.30);
  // More tension stiffening for short-term (beta2=1.0) → LOWER eps_raw
  // But eps_min floor = 0.4*σs/Es (same for both) may govern
  checkBool('eps_raw lower for ST (more stiffening)', rST.eps_raw <= rLT.eps_raw, true);
  // sigma_s identical (independent of beta2)
  checkBool('sigma_s same both cases', Math.abs(rST.sigma_s - rLT.sigma_s) < 0.001, true);
}());

// ── TEST 4 — Pure tension wall k2=1.0 increases sm ──────────────────────────
console.log('\nTEST 4 — Wall k2=1.0 (pure tension) vs bending k2=0.5');
(function() {
  var rBend = calcCW_TS500(1000, 200, 30, 16, 150, 30, 25, 0.5, 0.5, 0.30);
  var rTens = calcCW_TS500(1000, 200, 30, 16, 150, 30, 25, 1.0, 0.5, 0.30);
  checkBool('sm larger for k2=1.0', rTens.sm > rBend.sm, true);
  checkBool('wk larger for k2=1.0', rTens.wk > rBend.wk, true);
  // sm = 50 + 0.25*0.8*k2*phi/rho_eff → doubles with k2
  check('sm ratio ≈ (50 + k2=1.0 term)/(50 + k2=0.5 term)',
        rTens.sm / rBend.sm,
        (50 + 0.25*0.8*1.0*16/rBend.rho_eff) / (50 + 0.25*0.8*0.5*16/rBend.rho_eff), 0.001);
}());

// ── TEST 5 — FAIL case (Ms=60 kN·m, wlim=0.20) ───────────────────────────────
// wk ≈ 0.278 mm > 0.20 mm → FAIL
console.log('\nTEST 5 — Ms=60 kN·m, wlim=0.20 (FAIL)');
(function() {
  var r = calcCW_TS500(1000, 200, 30, 16, 150, 30, 60, 0.5, 0.5, 0.20);
  checkBool('FAIL', r.pass, false);
  checkBool('wk > 0.20', r.wk > 0.20, true);
}());

// ── TEST 6 — Higher fck increases Ec and fctm, reduces wk ───────────────────
console.log('\nTEST 6 — fck=30 vs fck=40 (higher fck → smaller wk)');
(function() {
  var r30 = calcCW_TS500(1000, 200, 30, 16, 150, 30, 25, 0.5, 0.5, 0.30);
  var r40 = calcCW_TS500(1000, 200, 30, 16, 150, 40, 25, 0.5, 0.5, 0.30);
  check('Ec fck=40', r40.Ecm, 3250*Math.sqrt(40)+14000, 0.001);
  check('fctm fck=40', r40.fctm, 0.35*Math.sqrt(40), 0.001);
  checkBool('Ec(40) > Ec(30)', r40.Ecm > r30.Ecm, true);
  checkBool('fctm(40) > fctm(30)', r40.fctm > r30.fctm, true);
  checkBool('wk decreases with fck', r40.wk < r30.wk, true);
}());

// ── TEST 7 — sigma_sr > sigma_s → ratio_sq > 1 → eps_raw can be negative → floored ──
// Lightly loaded section where cracking stress exceeds current steel stress
console.log('\nTEST 7 — Lightly loaded: sigma_s < sigma_sr, eps_min governs');
(function() {
  var r = calcCW_TS500(1000, 200, 30, 16, 150, 30, 5, 0.5, 0.5, 0.30);
  // With very low Ms, sigma_s is small and sigma_sr can exceed it
  // eps_raw may be negative → eps_sm should be clamped to eps_min
  checkBool('eps_sm >= eps_min', r.eps_sm >= r.eps_min - 1e-10, true);
  checkBool('wk positive', r.wk > 0, true);
}());

// ── TEST 8 — Monotonicity: wk increases with Ms ──────────────────────────────
console.log('\nTEST 8 — Monotonicity: wk increases with Ms');
(function() {
  var r1 = calcCW_TS500(1000, 200, 30, 16, 150, 30, 20, 0.5, 0.5, 0.30);
  var r2 = calcCW_TS500(1000, 200, 30, 16, 150, 30, 40, 0.5, 0.5, 0.30);
  var r3 = calcCW_TS500(1000, 200, 30, 16, 150, 30, 60, 0.5, 0.5, 0.30);
  checkBool('wk(20) < wk(40)', r1.wk < r2.wk, true);
  checkBool('wk(40) < wk(60)', r2.wk < r3.wk, true);
  // sm is independent of Ms
  checkBool('sm constant across Ms', Math.abs(r1.sm - r3.sm) < 1e-6, true);
}());

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log('  TS 500:2000  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
