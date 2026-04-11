/**
 * ACI 318-25 Beam Flexural Design — Reference Test Suite
 *
 * Three reference problems × three unit systems = 9 test groups.
 * Each problem is defined once in SI (mm / MPa / N·mm) and then
 * re-expressed in all three input unit formats used by beam.html:
 *
 *   knm  →  m / MPa / kN·m      lenScale=1000  momScale=1e6
 *   nmm  →  mm / MPa / N·mm     lenScale=1     momScale=1
 *   us   →  in / psi / kip·ft   lenScale=25.4  momScale=1.356e6  fc×0.006895
 *
 * The unit-conversion layer is tested by verifying that all three input
 * formats produce the same core results (As, a, c, εt) within ±1 %.
 *
 * Reference problems (McCormac & Brown, Design of RC, 9th ed. style):
 *   P1  Singly reinforced — ρreq governs  (b300×h500, f'c28, fy420, Mu200kN·m)
 *   P2  ρmin governs — low moment         (b350×h600, f'c25, fy420, Mu80kN·m)
 *   P3  Higher-strength concrete β₁=0.80  (b300×h600, f'c35, fy420, Mu450kN·m)
 *
 * Run:  node tests/aci_flexural_design.test.js
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Unit-system definitions (mirrors UNITS in beam.html)
// ─────────────────────────────────────────────────────────────────
const UNITS = {
  knm: { lenScale: 1000,  momScale: 1e6,      fcScale: 1,       dbar: 0.020 },
  nmm: { lenScale: 1,     momScale: 1,         fcScale: 1,       dbar: 20    },
  us:  { lenScale: 25.4,  momScale: 1.356e6,   fcScale: 0.006895, dbar: 0.75  },
};

function toMM(v, unit)  { return v * UNITS[unit].lenScale; }
function toNmm(v, unit) { return v * UNITS[unit].momScale; }
function toMPa(v, unit) { return v * UNITS[unit].fcScale;  }  // fc/fy: psi→MPa for US, 1:1 otherwise

// ─────────────────────────────────────────────────────────────────
// Core design engine — all quantities in mm / MPa / N·mm
// Mirrors calcACI() from pages/beam.html exactly.
// ─────────────────────────────────────────────────────────────────
function designACI({ b, h, cv, fc, fy, Mu, phi = 0.90, dbar = 20 }) {
  const d  = h - cv - dbar / 2;
  const b1 = fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 28) / 7);
  const rbal = 0.85 * b1 * (fc / fy) * (600 / (600 + fy));
  const rmax = 0.75 * rbal;
  const rmin = Math.max(1.4 / fy, 0.25 * Math.sqrt(fc) / fy);
  const Asmin = rmin * b * d;

  const Rn   = Mu / (phi * b * d * d);
  const disc = 1 - 2 * Rn / (0.85 * fc);
  if (disc < 0) throw new Error('Section too small — concrete over-stressed.');

  const rreq = (0.85 * fc / fy) * (1 - Math.sqrt(disc));
  const ruse = Math.max(rreq, rmin);
  const As   = ruse * b * d;
  const a    = As * fy / (0.85 * fc * b);
  const c    = a / b1;
  const et   = 0.003 * (d - c) / c;
  const over = rreq > rmax;
  const minGov = rreq < rmin;

  return { d, b1, rbal, rmax, rmin, rreq, ruse, As, a, c, et, over, minGov };
}

// ─────────────────────────────────────────────────────────────────
// Wrapper: accepts inputs in any unit system, converts, then designs
// ─────────────────────────────────────────────────────────────────
function designFromUnit(unit, { b, h, cv, fc, fy, Mu, phi = 0.90 }) {
  return designACI({
    b:    toMM(b,  unit),
    h:    toMM(h,  unit),
    cv:   toMM(cv, unit),
    fc:   toMPa(fc, unit),
    fy:   toMPa(fy, unit),
    Mu:   toNmm(Mu, unit),
    phi,
    dbar: UNITS[unit].dbar * UNITS[unit].lenScale,  // dbar already in that unit → mm
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
// Reference problems in SI (mm / MPa / N·mm)
// and their equivalent values in kN-m / US units
// ─────────────────────────────────────────────────────────────────

/**
 * PROBLEM 1 — Singly reinforced, ρreq governs
 * b=300 mm, h=500 mm, cv=40 mm, f'c=28 MPa, fy=420 MPa, Mu=200 kN·m
 *
 * Hand calc (SI):
 *   d    = 500 − 40 − 10 = 450 mm
 *   β₁   = 0.85
 *   Rn   = 200e6/(0.90×300×450²) = 3.6580 MPa
 *   ρreq = (0.85×28/420)×[1−√(1−2×3.6580/23.8)] = 0.009507
 *   As   = 0.009507×300×450 = 1283.4 mm²
 *   a    = 1283.4×420/(0.85×28×300) = 75.49 mm
 *   c    = 75.49/0.85 = 88.81 mm
 *   εt   = 0.003×(450−88.81)/88.81 = 0.01220
 *
 * US equivalents:
 *   b=11.811 in, h=19.685 in, cv=1.5748 in
 *   f'c=4061 psi, fy=60945 psi, Mu=147.51 kip·ft
 */
const P1 = {
  knm: { b: 0.300, h: 0.500, cv: 0.040, fc: 28,    fy: 420,    Mu: 200     },
  nmm: { b: 300,   h: 500,   cv: 40,    fc: 28,    fy: 420,    Mu: 200e6   },
  us:  { b: 300/25.4, h: 500/25.4, cv: 40/25.4,
         fc: 28/0.006895, fy: 420/0.006895, Mu: 200e6/1.356e6 },
  // Expected results in mm / mm² (SI)
  exp: { d: 450.0, b1: 0.85, rreq: 0.009507, As: 1283.4, a: 75.49, c: 88.81, et: 0.01220,
         rmax: 0.021239, rmin: 0.003333, minGov: false, over: false }
};

/**
 * PROBLEM 2 — ρmin governs (low moment / large section)
 * b=350 mm, h=600 mm, cv=40 mm, f'c=25 MPa, fy=420 MPa, Mu=80 kN·m
 *
 * Hand calc (SI):
 *   d    = 600 − 40 − 10 = 550 mm
 *   β₁   = 0.85
 *   Rn   = 80e6/(0.90×350×550²) = 0.8395 MPa
 *   ρreq = (0.85×25/420)×[1−√(1−2×0.8395/21.25)] = 0.002040
 *   ρmin = max(1.4/420, 0.25√25/420) = 0.003333  ← governs
 *   As   = 0.003333×350×550 = 641.7 mm²
 *   a    = 641.7×420/(0.85×25×350) = 36.21 mm
 *   c    = 36.21/0.85 = 42.60 mm
 *   εt   = 0.003×(550−42.60)/42.60 = 0.03573
 */
const P2 = {
  knm: { b: 0.350, h: 0.600, cv: 0.040, fc: 25,    fy: 420,    Mu: 80      },
  nmm: { b: 350,   h: 600,   cv: 40,    fc: 25,    fy: 420,    Mu: 80e6    },
  us:  { b: 350/25.4, h: 600/25.4, cv: 40/25.4,
         fc: 25/0.006895, fy: 420/0.006895, Mu: 80e6/1.356e6 },
  exp: { d: 550.0, b1: 0.85, rreq: 0.002040, As: 641.7, a: 36.21, c: 42.60, et: 0.03573,
         rmin: 0.003333, minGov: true, over: false }
};

/**
 * PROBLEM 3 — Higher-strength concrete, β₁ reduced
 * b=300 mm, h=600 mm, cv=40 mm, f'c=35 MPa, fy=420 MPa, Mu=450 kN·m
 *
 * Hand calc (SI):
 *   d    = 600 − 40 − 10 = 550 mm
 *   β₁   = 0.85 − 0.05×(35−28)/7 = 0.80
 *   Rn   = 450e6/(0.90×300×550²) = 5.5102 MPa
 *   ρreq = (0.85×35/420)×[1−√(1−2×5.5102/29.75)] = 0.014629
 *   ρbal = 0.85×0.80×(35/420)×(600/1020) = 0.033333
 *   ρmax = 0.025000
 *   As   = 0.014629×300×550 = 2413.8 mm²
 *   a    = 2413.8×420/(0.85×35×300) = 113.60 mm
 *   c    = 113.60/0.80 = 142.00 mm
 *   εt   = 0.003×(550−142)/142 = 0.008620
 */
const P3 = {
  knm: { b: 0.300, h: 0.600, cv: 0.040, fc: 35,    fy: 420,    Mu: 450     },
  nmm: { b: 300,   h: 600,   cv: 40,    fc: 35,    fy: 420,    Mu: 450e6   },
  us:  { b: 300/25.4, h: 600/25.4, cv: 40/25.4,
         fc: 35/0.006895, fy: 420/0.006895, Mu: 450e6/1.356e6 },
  exp: { d: 550.0, b1: 0.80, rreq: 0.014629, As: 2413.8, a: 113.60, c: 142.00, et: 0.008620,
         rbal: 0.033333, rmax: 0.025000, rmin: 0.003527, minGov: false, over: false }
};

// ─────────────────────────────────────────────────────────────────
// Run all problems × all unit systems
// ─────────────────────────────────────────────────────────────────
function runProblem(label, problem) {
  for (const unit of ['knm', 'nmm', 'us']) {
    console.log(`\n  ── ${label} [${unit}] ──`);
    const r = designFromUnit(unit, problem[unit]);
    const e = problem.exp;

    // Results are always compared in mm / mm² regardless of input unit
    check(`d (mm)`,   r.d,     e.d);
    check(`β₁`,       r.b1,    e.b1);
    check(`ρreq`,     r.rreq,  e.rreq);
    check(`As (mm²)`, r.As,    e.As);
    check(`a (mm)`,   r.a,     e.a);
    check(`c (mm)`,   r.c,     e.c);
    check(`εt`,       r.et,    e.et);
    if (e.rbal  !== undefined) check(`ρbal`,  r.rbal,  e.rbal);
    if (e.rmax  !== undefined) check(`ρmax`,  r.rmax,  e.rmax);
    if (e.rmin  !== undefined) check(`ρmin`,  r.rmin,  e.rmin);
    checkBool(`minGov`, r.minGov, e.minGov);
    checkBool(`over`,   r.over,   e.over);
  }
}

// ─────────────────────────────────────────────────────────────────
// Unit-conversion sanity checks (independent of design calc)
// ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  Unit Conversion Sanity Checks');
console.log('══════════════════════════════════════════════════════');
check('toMM knm: 0.300 m → 300 mm',        toMM(0.300, 'knm'), 300.0);
check('toMM nmm: 300 mm → 300 mm',         toMM(300,   'nmm'), 300.0);
check('toMM us:  11.811 in → 300 mm',      toMM(300/25.4, 'us'), 300.0);
check('toNmm knm: 200 kN·m → 200e6 N·mm',  toNmm(200,   'knm'), 200e6);
check('toNmm nmm: 200e6 N·mm → 200e6',     toNmm(200e6, 'nmm'), 200e6);
check('toNmm us: 147.49 kip·ft → 200e6',   toNmm(200e6/1.356e6, 'us'), 200e6);
check('toMPa us: 4061 psi → 28 MPa',       toMPa(28/0.006895, 'us'), 28.0);
check('toMPa knm: 28 MPa → 28 MPa',        toMPa(28, 'knm'), 28.0);

// ─────────────────────────────────────────────────────────────────
// Design problems
// ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('  Problem 1 — Singly reinforced, ρreq governs');
console.log('  b=300mm, h=500mm, cv=40mm, f\'c=28MPa, fy=420MPa, Mu=200kN·m');
console.log('══════════════════════════════════════════════════════');
runProblem('P1', P1);

console.log('\n══════════════════════════════════════════════════════');
console.log('  Problem 2 — ρmin governs (low moment)');
console.log('  b=350mm, h=600mm, cv=40mm, f\'c=25MPa, fy=420MPa, Mu=80kN·m');
console.log('══════════════════════════════════════════════════════');
runProblem('P2', P2);

console.log('\n══════════════════════════════════════════════════════');
console.log('  Problem 3 — Higher-strength concrete (f\'c=35 MPa, β₁=0.80)');
console.log('  b=300mm, h=600mm, cv=40mm, f\'c=35MPa, fy=420MPa, Mu=450kN·m');
console.log('══════════════════════════════════════════════════════');
runProblem('P3', P3);

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(54));
console.log(`  Total: ${passed + failed}   Passed: ${passed}   Failed: ${failed}`);
console.log('═'.repeat(54));
if (failed > 0) process.exit(1);
