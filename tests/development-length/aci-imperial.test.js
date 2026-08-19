/* ACI 318-25 Development Length — US Customary Units  (Tests 10-18)
 * Run standalone:  cscript tests/development-length/aci-imperial.test.js
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

// ── ACI US-customary wrapper ───────────────────────────────────────────────
// fc in psi, fy in psi → convert to MPa; db always in mm
function calcAciUS(opts) {
  return calcAciSI({
    db:          opts.db,
    fc:          opts.fc_psi  / 145.038,
    fy:          opts.fy_psi  / 145.038,
    cb:          (opts.cb_in  || 0) * 25.4,
    Ktr:         (opts.Ktr_in || 0) * 25.4,
    psi_t:       opts.psi_t,
    psi_e:       opts.psi_e,
    psi_r:       opts.psi_r,
    psi_o:       opts.psi_o,
    lam:         opts.lam,
    spliceClass: opts.spliceClass,
    detail:      opts.detail
  });
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

// ── TEST 10 — #5 bar, basic tension ──────────────────────────────────────────
// db=15.875 mm, fc=4000 psi→27.581 MPa, fy=60000 psi→413.711 MPa
// psi_s=0.8 (15.875≤19), conf=1.5
// ld_t = 413.711×0.8×15.875 / (1.1×5.252×1.5) ≈ 606.6 mm
console.log('\nTEST 10 — #5 Bar, Basic Tension  (fc=4000 psi, fy=60000 psi)');
(function() {
  var r = calcAciUS({ db: 15.875, fc_psi: 4000, fy_psi: 60000 });
  check('ld_t mm',    r.ld_t,           606.60);
  check('ld_t in',    r.ld_t / 25.4,     23.88);
  checkExact('psi_s', r.factors.psi_s,   0.8);
  checkExact('psi_g', r.factors.psi_g,   1.0);
  checkBool('min does NOT govern', r.minTensionGoverns, false);
}());

// ── TEST 11 — #8 bar, tension ─────────────────────────────────────────────────
// db=25.4 mm, fc=5000 psi→34.476 MPa, fy=60000 psi→413.711 MPa
// psi_s=1.0 (db>19), conf=1.5
// ld_t = 413.711×1.0×25.4 / (1.1×5.871×1.5) ≈ 1084.7 mm
console.log('\nTEST 11 — #8 Bar, Tension  (fc=5000 psi, fy=60000 psi)');
(function() {
  var r = calcAciUS({ db: 25.4, fc_psi: 5000, fy_psi: 60000 });
  check('ld_t mm',    r.ld_t,          1084.70);
  checkExact('psi_s', r.factors.psi_s,    1.0);
}());

// ── TEST 12 — #9 bar, top bar + epoxy cap ─────────────────────────────────────
// db=28.65 mm, fc=4000 psi, fy=60000 psi, psi_t=1.3, psi_e=1.5 → psi_te=1.7
// ld_t = 413.711×1.7×28.65 / (1.1×5.252×1.5) ≈ 2322.5 mm
console.log('\nTEST 12 — #9 Bar, Top + Epoxy Cap  (fc=4000 psi, fy=60000 psi)');
(function() {
  var r = calcAciUS({ db: 28.65, fc_psi: 4000, fy_psi: 60000, psi_t: 1.3, psi_e: 1.5 });
  check('ld_t mm',         r.ld_t,           2322.50);
  checkExact('psi_te cap', r.factors.psi_te,    1.7);
}());

// ── TEST 13 — #6 bar, 90° hook, no confinement (psi_r=1.6) ──────────────────
// db=19.05 mm, fc=4000 psi, fy=60000 psi
// ldh90 = 413.711×1.6×19.05 / (4.57×5.252) ≈ 524.8 mm
console.log('\nTEST 13 — #6 Bar, 90 deg Hook (psi_r=1.6)  (fc=4000 psi)');
(function() {
  var r = calcAciUS({ db: 19.05, fc_psi: 4000, fy_psi: 60000, psi_r: 1.6 });
  check('ldh90 mm', r.ldh90, 524.80);
  check('ldh90 in', r.ldh90 / 25.4, 20.66);
}());

// ── TEST 14 — #7 bar, 180° hook (psi_r ignored) ──────────────────────────────
// db=22.225 mm, fc=5000 psi, fy=60000 psi
// ldh180 = 413.711×22.225 / (4.57×5.871) ≈ 342.7 mm
console.log('\nTEST 14 — #7 Bar, 180 deg Hook  (fc=5000 psi, fy=60000 psi)');
(function() {
  var r    = calcAciUS({ db: 22.225, fc_psi: 5000, fy_psi: 60000 });
  var rPsiR = calcAciUS({ db: 22.225, fc_psi: 5000, fy_psi: 60000, psi_r: 1.6 });
  check('ldh180 mm', r.ldh180, 342.70);
  check('ldh180 independent of psi_r', rPsiR.ldh180 / r.ldh180, 1.0, 0);
}());

// ── TEST 15 — #5 bar, tension splice Class A ─────────────────────────────────
// db=15.875 mm, fc=4000 psi, fy=60000 psi
// sp_t(A) = 1.0 × ld_t ≈ 606.6 mm
console.log('\nTEST 15 — #5 Bar, Class A Splice  (fc=4000 psi)');
(function() {
  var rA = calcAciUS({ db: 15.875, fc_psi: 4000, fy_psi: 60000, spliceClass: 'A' });
  check('sp_t Class A = ld_t', rA.sp_t, rA.ld_t, 0);
  check('sp_t mm',             rA.sp_t, 606.60);
}());

// ── TEST 16 — #6 bar, tension splice Class B ─────────────────────────────────
// db=19.05 mm (>19 → psi_s=1.0), fc=4000 psi, fy=60000 psi
// ld_t = 413.711×1.0×19.05 / (1.1×5.252×1.5) ≈ 909.6 mm
// sp_t = 1.3×909.6 ≈ 1182.5 mm
console.log('\nTEST 16 — #6 Bar, Class B Splice  (fc=4000 psi)');
(function() {
  var r = calcAciUS({ db: 19.05, fc_psi: 4000, fy_psi: 60000, spliceClass: 'B' });
  check('ld_t mm',  r.ld_t,   909.60);
  check('sp_t mm',  r.sp_t,  1182.48);
  checkExact('psi_s = 1.0 for #6', r.factors.psi_s, 1.0);
}());

// ── TEST 17 — #8 bar, compression ────────────────────────────────────────────
// db=25.4 mm, fc=4000 psi→27.581 MPa, fy=60000 psi→413.711 MPa
// cf1 = 0.24×413.711×25.4/5.252 ≈ 479.7 mm (governs over cf2≈451.4)
console.log('\nTEST 17 — #8 Bar, Compression  (fc=4000 psi, fy=60000 psi)');
(function() {
  var r = calcAciUS({ db: 25.4, fc_psi: 4000, fy_psi: 60000 });
  check('ld_c mm',  r.ld_c, 479.70);
  check('ld_c in',  r.ld_c / 25.4, 18.89);
}());

// ── TEST 18 — #3 bar, tension minimum governs ────────────────────────────────
// db=9.525 mm, fc=5000 psi→34.476 MPa, fy=40000 psi→275.808 MPa
// ld_t_raw ≈ 216.9 mm < min=max(300,8×9.525=76.2)=300 mm
console.log('\nTEST 18 — #3 Bar, Tension Minimum Governs  (fc=5000 psi, fy=40000 psi)');
(function() {
  var r = calcAciUS({ db: 9.525, fc_psi: 5000, fy_psi: 40000 });
  check('ld_t = 300 mm (minimum)', r.ld_t, 300);
  checkBool('minTensionGoverns = true', r.minTensionGoverns, true);
}());

// ── Consistency — equivalent SI and US calls must agree ──────────────────────
console.log('\nTEST — Unit Conversion Consistency  (SI vs US equivalent inputs)');
(function() {
  var fc_psi = 4000, fy_psi = 60000, db = 16;
  var rUS = calcAciUS({ db: db, fc_psi: fc_psi, fy_psi: fy_psi });
  var rSI = calcAciSI({ db: db, fc: fc_psi / 145.038, fy: fy_psi / 145.038 });
  check('ld_t SI≡US',   rUS.ld_t,   rSI.ld_t,   0);
  check('ld_c SI≡US',   rUS.ld_c,   rSI.ld_c,   0);
  check('ldh90 SI≡US',  rUS.ldh90,  rSI.ldh90,  0);
  check('ldh180 SI≡US', rUS.ldh180, rSI.ldh180, 0);
}());

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '================================================================');
console.log('  ACI 318-25 Imperial  --  ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
console.log('================================================================');
if (failed > 0) process.exit(1);
