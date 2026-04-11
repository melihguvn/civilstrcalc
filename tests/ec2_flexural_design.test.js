/**
 * EC2 (EN 1992-1-1) Beam Flexural Design — Reference Test Suite
 *
 * Three reference problems × three unit systems = 9 test groups.
 * Problems defined once in SI (mm / MPa / N·mm); re-expressed for
 * all three input unit formats used by beam.html:
 *
 *   knm  →  m / MPa / kN·m       lenScale=1000  momScale=1e6
 *   nmm  →  mm / MPa / N·mm      lenScale=1     momScale=1
 *   us   →  in / psi / kip·ft    lenScale=25.4  momScale=1.356e6  (fc/fy stay MPa — EC2 is always SI)
 *
 * EC2 concrete/steel strengths are always in MPa regardless of the
 * length/moment unit system — only geometry and moment are scaled.
 *
 * Reference problems (Mosley, Bungey & Hulse "RC Design to EC2" style):
 *   P1  Singly reinforced, K ≪ K' (normal case)
 *       b=300, h=500, cnom=30, fck=25, fyk=500, γc=1.5, γs=1.15, MEd=120kN·m
 *   P2  ρmin governs (low moment)
 *       b=350, h=600, cnom=30, fck=25, fyk=500, γc=1.5, γs=1.15, MEd=60kN·m
 *   P3  Higher-strength concrete (fck=40, λ=0.8, η=1.0)
 *       b=300, h=600, cnom=30, fck=40, fyk=500, γc=1.5, γs=1.15, MEd=400kN·m
 *
 * Run:  node tests/ec2_flexural_design.test.js
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Unit-system definitions (mirrors UNITS in beam.html)
// Note: EC2 fc/fy inputs are always MPa, so fcScale=1 for all units.
// Only geometry (lenScale) and moment (momScale) vary.
// ─────────────────────────────────────────────────────────────────
const UNITS = {
  knm: { lenScale: 1000,  momScale: 1e6,     dbar: 0.020 },
  nmm: { lenScale: 1,     momScale: 1,        dbar: 20    },
  us:  { lenScale: 25.4,  momScale: 1.356e6,  dbar: 0.75  },
};

function toMM(v, unit)  { return v * UNITS[unit].lenScale; }
function toNmm(v, unit) { return v * UNITS[unit].momScale; }

// ─────────────────────────────────────────────────────────────────
// Core EC2 singly-reinforced design engine
// All quantities in mm / MPa / N·mm — mirrors calcEC2() in beam.html
// ─────────────────────────────────────────────────────────────────
function designEC2Singly({ b, h, cv, fck, fyk, gc, gs, MEd, dbar = 20 }) {
  const fcd  = fck / gc;
  const fyd  = fyk / gs;
  const lam  = fck <= 50 ? 0.8 : 0.8 - (fck - 50) / 400;
  const eta  = fck <= 50 ? 1.0 : 1.0 - (fck - 50) / 200;
  const fctm = fck <= 50
    ? 0.30 * Math.pow(fck, 2 / 3)
    : 2.12 * Math.log(1 + (fck + 8) / 10);

  const d     = h - cv - dbar / 2;
  const K     = MEd / (b * d * d * fcd);
  const Kl    = 0.167;
  const Asmin = Math.max(0.26 * fctm / fyk, 0.0013) * b * d;

  const z      = Math.min(d * (0.5 + Math.sqrt(Math.max(0, 0.25 - K / 1.134))), 0.95 * d);
  const xu     = (d - z) / 0.4;
  const As_req = MEd / (fyd * z);
  const Asdes  = Math.max(As_req, Asmin);
  const minGov = As_req < Asmin;
  const over   = K > Kl;

  return { d, fcd, fyd, fctm, lam, eta, K, z, xu, xud: xu / d, As_req, Asmin, Asdes, minGov, over };
}

// ─────────────────────────────────────────────────────────────────
// Core EC2 doubly-reinforced design engine
// ─────────────────────────────────────────────────────────────────
function designEC2Doubly({ b, h, cv, fck, fyk, gc, gs, MEd, dprime, Asp, dbar = 20 }) {
  const fcd  = fck / gc;
  const fyd  = fyk / gs;
  const eta  = fck <= 50 ? 1.0 : 1.0 - (fck - 50) / 200;
  const fctm = fck <= 50
    ? 0.30 * Math.pow(fck, 2 / 3)
    : 2.12 * Math.log(1 + (fck + 8) / 10);
  const Es  = 200000;
  const ecu = 0.0035;
  const Kl  = 0.167;

  const d     = h - cv - dbar / 2;
  const Asmin = Math.max(0.26 * fctm / fyk, 0.0013) * b * d;

  // Lever arm and neutral axis at K' limit
  const z_lim  = Math.min(d * (0.5 + Math.sqrt(Math.max(0, 0.25 - Kl / 1.134))), 0.95 * d);
  const xu_lim = (d - z_lim) / 0.4;

  // Compression steel stress
  const eps_sc = ecu * (xu_lim - dprime) / xu_lim;
  const fsc    = Math.min(fyd, Math.max(0, Es * eps_sc));
  const fsc_eff = fsc - eta * fcd;

  // Extra moment beyond K'
  const deltaM   = MEd - Kl * b * d * d * fcd;
  const Asp_req  = fsc_eff > 0.001 ? deltaM / (fsc_eff * (d - dprime)) : Infinity;
  const compOK   = Asp >= Asp_req;

  // Tension steel
  const As1    = Kl * b * d * d * fcd / (fyd * z_lim);
  const deltaAs = Asp * Math.max(fsc_eff, 0) / fyd;
  const As_req  = As1 + deltaAs;
  const Asdes   = Math.max(As_req, Asmin);
  const minGov  = As_req < Asmin;

  return { d, fcd, fyd, z_lim, xu_lim, eps_sc, fsc, fsc_eff,
           deltaM, Asp_req, compOK, As1, deltaAs, As_req, Asdes, Asmin, minGov };
}

// ─────────────────────────────────────────────────────────────────
// Wrapper: accepts inputs in any unit system, converts, then designs
// Note: fck, fyk, gc, gs are always in MPa/dimensionless (no scaling)
// ─────────────────────────────────────────────────────────────────
function designFromUnit(unit, { b, h, cv, fck, fyk, gc, gs, MEd }, singly = true, doublyExtra = {}) {
  const params = {
    b:    toMM(b,  unit),
    h:    toMM(h,  unit),
    cv:   toMM(cv, unit),
    fck, fyk, gc, gs,
    MEd:  toNmm(MEd, unit),
    dbar: UNITS[unit].dbar * UNITS[unit].lenScale,  // → mm
  };
  if (singly) return designEC2Singly(params);
  return designEC2Doubly({
    ...params,
    dprime: toMM(doublyExtra.dprime, unit),
    Asp:    doublyExtra.Asp,  // already mm² (computed from bar sizes, unit-independent)
  });
}

// ─────────────────────────────────────────────────────────────────
// Test runner
// ─────────────────────────────────────────────────────────────────
const TOL = 0.01;
let passed = 0, failed = 0;

function check(label, computed, expected, tol = TOL) {
  const err = Math.abs((computed - expected) / expected);
  const ok  = err <= tol;
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}  ${label}`);
  if (!ok) console.log(`           computed=${computed.toFixed(5)}  expected=${expected.toFixed(5)}  err=${(err * 100).toFixed(3)}%`);
  ok ? passed++ : failed++;
}

function checkBool(label, computed, expected) {
  const ok = computed === expected;
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}  ${label}  (${computed})`);
  ok ? passed++ : failed++;
}

// ─────────────────────────────────────────────────────────────────
// Reference problems defined in SI input units
// (geometry in m for knm — engine receives mm after conversion)
// ─────────────────────────────────────────────────────────────────

/**
 * PROBLEM 1 — Singly reinforced, K < K'
 * b=300mm, h=500mm, cnom=30mm, fck=25MPa, fyk=500MPa, γc=1.5, γs=1.15, MEd=120kN·m
 *
 * Hand calc (SI):
 *   dbar  = 20 mm (assumed)
 *   d     = 500 − 30 − 10 = 460 mm
 *   fcd   = 25/1.5 = 16.667 MPa
 *   fyd   = 500/1.15 = 434.783 MPa
 *   fctm  = 0.30×25^(2/3) = 2.565 MPa
 *   K     = 120e6 / (300×460²×16.667) = 120e6 / 1,058,064,000 = 0.11341
 *   K'    = 0.167  → K ≤ K' ✓
 *   z_raw = 460×[0.5+√(0.25−0.11341/1.134)] = 460×[0.5+√0.14999] = 460×0.88728 = 408.1 mm
 *   z     = min(408.1, 0.95×460=437.0) = 408.1 mm   (NOT capped)
 *   As_req= 120e6 / (434.783×408.1) = 676.3 mm²
 *   Asmin = max(0.26×2.565/500, 0.0013)×300×460 = 0.001334×138000 = 184.1 mm²
 *   As governs (676.3 > 184.1), minGov=false
 */
const P1 = {
  knm: { b: 0.300, h: 0.500, cv: 0.030, fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 120     },
  nmm: { b: 300,   h: 500,   cv: 30,    fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 120e6   },
  us:  { b: 300/25.4, h: 500/25.4, cv: 30/25.4, fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 120e6/1.356e6 },
  exp: {
    d:      460.0,
    fcd:    16.667,
    fyd:    434.783,
    fctm:   2.565,
    K:      0.11341,
    z:      408.1,
    As_req: 676.3,
    Asmin:  184.1,
    minGov: false,
    over:   false,
  }
};

/**
 * PROBLEM 2 — ρmin governs (low moment)
 * b=350mm, h=600mm, cnom=30mm, fck=25MPa, fyk=500MPa, γc=1.5, γs=1.15, MEd=60kN·m
 *
 * Hand calc (SI):
 *   d     = 600 − 30 − 10 = 560 mm
 *   fcd   = 16.667 MPa
 *   fyd   = 434.783 MPa
 *   fctm  = 2.565 MPa
 *   K     = 60e6 / (350×560²×16.667) = 60e6 / 1,829,312,000 = 0.03279
 *   z_raw = 560×[0.5+√(0.25−0.03279/1.134)] = 560×[0.5+√0.22109] = 560×0.97020 = 543.3 mm
 *   z     = min(543.3, 0.95×560=532.0) = 532.0 mm   (capped at 0.95d)
 *   As_req= 60e6 / (434.783×532.0) = 259.4 mm²
 *   Asmin = max(0.001334,0.0013)×350×560 = 261.3 mm²   ← governs
 *   Asdes = 261.3 mm², minGov=true
 */
const P2 = {
  knm: { b: 0.350, h: 0.600, cv: 0.030, fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 60      },
  nmm: { b: 350,   h: 600,   cv: 30,    fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 60e6    },
  us:  { b: 350/25.4, h: 600/25.4, cv: 30/25.4, fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 60e6/1.356e6 },
  exp: {
    d:      560.0,
    K:      0.03279,
    z:      532.0,       // capped at 0.95d
    As_req: 259.4,
    Asmin:  261.3,
    Asdes:  261.3,
    minGov: true,
    over:   false,
  }
};

/**
 * PROBLEM 3 — Doubly reinforced (K > K')
 * b=250mm, h=450mm, cnom=30mm, fck=25MPa, fyk=500MPa, γc=1.5, γs=1.15
 * MEd=200kN·m, A's provided=2×Ø16=402.1mm², d'=50mm
 *
 * Hand calc (SI):
 *   d     = 450 − 30 − 10 = 410 mm
 *   fcd   = 16.667 MPa,  fyd = 434.783 MPa,  η=1.0,  εcu=0.0035
 *   K     = 200e6 / (250×410²×16.667) = 0.28488  > K'=0.167 → doubly reinforced
 *   z_lim = 410×[0.5+√(0.25−0.167/1.134)] = 410×0.82066 = 336.47 mm
 *   xu_lim= (410−336.47)/0.4 = 183.83 mm
 *   ε'_s  = 0.0035×(183.83−50)/183.83 = 0.002548
 *   f'_s  = min(434.783, 200000×0.002548) = min(434.783, 509.6) = 434.783 MPa  (yields)
 *   f'_s,eff = 434.783 − 1.0×16.667 = 418.116 MPa
 *   ΔM    = 200e6 − 0.167×250×410²×16.667 = 200e6 − 117.01e6 = 82.99e6 N·mm
 *   A'_req= 82.99e6 / (418.116×(410−50)) = 82.99e6 / 150522 = 551.3 mm²
 *   Asp   = 2×π/4×16² = 402.1 mm²   → insufficient (compOK=false)
 *   As1   = 0.167×250×410²×16.667 / (434.783×336.47) = 117.01e6/146313 = 799.7 mm²
 *   ΔAs   = 402.1×418.116/434.783 = 386.7 mm²
 *   As_req= 799.7+386.7 = 1186.4 mm²
 */
const P3_dprime_mm  = 50;   // mm — always, used in engine directly
const P3_Asp_mm2    = 2 * Math.PI / 4 * 16 * 16;  // 402.1 mm²

const P3 = {
  knm: { b: 0.250, h: 0.450, cv: 0.030, fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 200     },
  nmm: { b: 250,   h: 450,   cv: 30,    fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 200e6   },
  us:  { b: 250/25.4, h: 450/25.4, cv: 30/25.4, fck: 25, fyk: 500, gc: 1.5, gs: 1.15, MEd: 200e6/1.356e6 },
  doubly: {
    dprime_knm: P3_dprime_mm / 1000,
    dprime_nmm: P3_dprime_mm,
    dprime_us:  P3_dprime_mm / 25.4,
    Asp:        P3_Asp_mm2,
  },
  exp: {
    d:       410.0,
    K:       0.28488,
    z_lim:   336.47,
    xu_lim:  183.83,
    eps_sc:  0.002548,
    fsc:     434.783,    // yields
    fsc_eff: 418.116,
    deltaM:  82.99e6,
    Asp_req: 551.3,
    compOK:  false,      // provided 402.1 < required 551.3
    As1:     799.7,
    deltaAs: 386.7,
    As_req:  1186.4,
  }
};

// ─────────────────────────────────────────────────────────────────
// Unit-conversion sanity checks (EC2-specific)
// ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  Unit Conversion Sanity Checks (EC2)');
console.log('══════════════════════════════════════════════════════');
check('toMM knm: 0.300 m → 300 mm',         toMM(0.300, 'knm'), 300.0);
check('toMM us:  11.811 in → 300 mm',        toMM(300/25.4, 'us'), 300.0);
check('toNmm knm: 120 kN·m → 120e6 N·mm',   toNmm(120, 'knm'), 120e6);
check('toNmm us: kip·ft → 120e6 N·mm',       toNmm(120e6/1.356e6, 'us'), 120e6);
check('dbar knm: 0.020m × 1000 = 20 mm',     UNITS['knm'].dbar * UNITS['knm'].lenScale, 20.0);
check('dbar us:  0.75in × 25.4 = 19.05 mm',  UNITS['us'].dbar  * UNITS['us'].lenScale,  19.05);

// ─────────────────────────────────────────────────────────────────
// Run singly-reinforced problems
// ─────────────────────────────────────────────────────────────────
function runSingly(label, problem) {
  for (const unit of ['knm', 'nmm', 'us']) {
    console.log(`\n  ── ${label} [${unit}] ──`);
    const r = designFromUnit(unit, problem[unit], true);
    const e = problem.exp;

    check('d (mm)',       r.d,      e.d);
    if (e.fcd)   check('fcd (MPa)', r.fcd,    e.fcd);
    if (e.fyd)   check('fyd (MPa)', r.fyd,    e.fyd);
    if (e.fctm)  check('fctm (MPa)',r.fctm,   e.fctm);
    check('K',            r.K,      e.K);
    check('z (mm)',        r.z,      e.z);
    check('As_req (mm²)', r.As_req, e.As_req);
    check('Asmin (mm²)',  r.Asmin,  e.Asmin);
    if (e.Asdes) check('Asdes (mm²)', r.Asdes, e.Asdes);
    checkBool('minGov',   r.minGov, e.minGov);
    checkBool('over',     r.over,   e.over);
  }
}

// ─────────────────────────────────────────────────────────────────
// Run doubly-reinforced problem
// ─────────────────────────────────────────────────────────────────
function runDoubly(label, problem) {
  const dprimeKey = { knm: 'dprime_knm', nmm: 'dprime_nmm', us: 'dprime_us' };
  for (const unit of ['knm', 'nmm', 'us']) {
    console.log(`\n  ── ${label} [${unit}] ──`);
    const r = designFromUnit(unit, problem[unit], false, {
      dprime: problem.doubly[dprimeKey[unit]],
      Asp:    problem.doubly.Asp,
    });
    const e = problem.exp;

    check('d (mm)',        r.d,       e.d);
    check('K',             r.K,       e.K);
    check('z_lim (mm)',    r.z_lim,   e.z_lim);
    check('xu_lim (mm)',   r.xu_lim,  e.xu_lim);
    check("ε'_s",          r.eps_sc,  e.eps_sc);
    check("f'_s (MPa)",    r.fsc,     e.fsc);
    check("f'_s,eff (MPa)",r.fsc_eff, e.fsc_eff);
    check('ΔM (N·mm)',     r.deltaM,  e.deltaM);
    check("A's_req (mm²)", r.Asp_req, e.Asp_req);
    check('As1 (mm²)',     r.As1,     e.As1);
    check('ΔAs (mm²)',     r.deltaAs, e.deltaAs);
    check('As_req (mm²)',  r.As_req,  e.As_req);
    checkBool('compOK',    r.compOK,  e.compOK);
  }
}

// ─────────────────────────────────────────────────────────────────
// Execute
// ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  Problem 1 — Singly reinforced, K ≪ K\'');
console.log('  b=300mm h=500mm cnom=30mm fck=25 fyk=500 MEd=120kN·m');
console.log('══════════════════════════════════════════════════════');
runSingly('P1', P1);

console.log('\n══════════════════════════════════════════════════════');
console.log('  Problem 2 — ρmin governs (low moment)');
console.log('  b=350mm h=600mm cnom=30mm fck=25 fyk=500 MEd=60kN·m');
console.log('══════════════════════════════════════════════════════');
runSingly('P2', P2);

console.log('\n══════════════════════════════════════════════════════');
console.log('  Problem 3 — Doubly reinforced (K > K\')');
console.log('  b=250mm h=450mm cnom=30mm fck=25 fyk=500 MEd=200kN·m');
console.log('  A\'s=2×Ø16=402mm² d\'=50mm (compression steel insufficient)');
console.log('══════════════════════════════════════════════════════');
runDoubly('P3', P3);

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(54));
console.log(`  Total: ${passed + failed}   Passed: ${passed}   Failed: ${failed}`);
console.log('═'.repeat(54));
if (failed > 0) process.exit(1);
