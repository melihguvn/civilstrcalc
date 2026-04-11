/**
 * ACI 318-25 Beam Torsion Design — Reference Test Suite
 *
 * Three reference problems × three unit systems = 9 test groups.
 * The engine mirrors calcTorACI() in pages/beam.html exactly.
 *
 * Unit systems:
 *   knm  →  m / MPa / kN / kN·m      lenScale=1000  forceScale=1000  momScale=1e6
 *   nmm  →  mm / MPa / N / N·mm      lenScale=1     forceScale=1     momScale=1
 *   us   →  in / psi / kip / kip·ft  lenScale=25.4  forceScale=4448.2 momScale=1.356e6
 *              fc/fy/fyl: psi → MPa (×0.006895)
 *              dst/dl: always in mm in engine (×25.4 for US inputs)
 *
 * Reference problems:
 *   P1  b=300mm, h=500mm, cv=40mm, f'c=28MPa, fy=fyl=420MPa
 *       Vu=100kN, Tu=25kN·m, Ø10@150mm, 6×Ø16 longitudinal
 *   P2  b=350mm, h=600mm, cv=40mm, f'c=28MPa, fy=fyl=420MPa
 *       Vu=150kN, Tu=50kN·m, Ø12@200mm, 8×Ø18 longitudinal
 *   P3  b=300mm, h=500mm, cv=40mm, f'c=35MPa, fy=fyl=420MPa
 *       Vu=180kN, Tu=40kN·m, Ø12@150mm, 8×Ø16 longitudinal
 *
 * Run:  node tests/torsion_aci.test.js
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Unit definitions (mirrors UNITS in beam.html)
// ─────────────────────────────────────────────────────────────────
const UNITS = {
  knm: { lenScale: 1000,  forceScale: 1e3,    momScale: 1e6,     fcScale: 1        },
  nmm: { lenScale: 1,     forceScale: 1,       momScale: 1,       fcScale: 1        },
  us:  { lenScale: 25.4,  forceScale: 4448.2,  momScale: 1.356e6, fcScale: 0.006895 },
};

// ─────────────────────────────────────────────────────────────────
// Core torsion engine — all quantities in mm / MPa / N / N·mm
// Mirrors calcTorACI() from pages/beam.html exactly.
// ─────────────────────────────────────────────────────────────────
function torsionACI({ b, h, cv, fc, fy, fyl, lam = 1.0, phi = 0.75, Vu, Tu, dst, s, dl, nl }) {
  const Acp = b * h;
  const Pcp = 2 * (b + h);
  const x1  = b - 2 * cv;
  const y1  = h - 2 * cv;
  const Aoh = x1 * y1;
  const Ph  = 2 * (x1 + y1);
  const Ao  = 0.85 * Aoh;

  const Tth = phi * 0.083 * lam * Math.sqrt(fc) * Acp * Acp / Pcp;
  const neglect = Tu <= Tth;

  const d = h - cv - dst / 2 - dl / 2;
  const rho_est = 0.01;
  const Vc = 0.66 * lam * Math.pow(rho_est, 1 / 3) * Math.sqrt(fc) * b * d;

  const cot_theta = 1.0;
  const At_s = Tu / (phi * 2 * Ao * fy * cot_theta);

  const Av_s_req = Math.max(Vu / (phi * fy * d) - Vc / (fy * d), 0);
  const Avt_prov = 2 * (Math.PI / 4 * dst * dst) / s;
  const At_prov  = (Math.PI / 4 * dst * dst) / s;
  const combined_req  = Av_s_req + 2 * At_s;
  const combined_prov = Avt_prov;

  const Vn_check = Math.sqrt(Math.pow(Vu / phi, 2) + Math.pow(Tu * Ph / (1.7 * Aoh * Aoh), 2));
  const Vn_max   = Vc + 0.66 * Math.sqrt(fc) * b * d;
  const dc_section = Vn_check / Vn_max;

  const Al_req  = At_s * Ph * fy / fyl * cot_theta * cot_theta;
  const Al_min  = Math.max(0.42 * Math.sqrt(fc) * Acp / fyl - At_s * Ph * fy / fyl, 0);
  const Al_prov = nl * Math.PI / 4 * dl * dl;

  const AlReqEff = Math.max(Al_req, Al_min);
  const dc_combined_stir = combined_prov > 0 ? combined_req / combined_prov
                           : (combined_req > 0 ? Infinity : 0);
  const dc_tor_l = Al_prov > 0 ? AlReqEff / Al_prov
                   : (AlReqEff > 0 ? Infinity : 0);
  const dc_shear = (phi * (Vc + Avt_prov * fy * d)) > 0
                   ? Vu / (phi * (Vc + Avt_prov * fy * d)) : 0;
  const dc = Math.min(99, Math.max(dc_shear, dc_combined_stir, dc_section, dc_tor_l));

  return {
    Acp, Pcp, x1, y1, Aoh, Ph, Ao,
    Tth, neglect,
    d, Vc,
    At_s, At_prov, Av_s_req, Avt_prov, combined_req, combined_prov,
    Vn_check, Vn_max, dc_section,
    Al_req, Al_min, Al_prov, AlReqEff,
    dc_combined_stir, dc_tor_l, dc_shear, dc,
  };
}

// ─────────────────────────────────────────────────────────────────
// Wrapper: unit conversion then engine call
// ─────────────────────────────────────────────────────────────────
function torFromUnit(unit, inp) {
  const U = UNITS[unit];
  return torsionACI({
    b:   inp.b  * U.lenScale,
    h:   inp.h  * U.lenScale,
    cv:  inp.cv * U.lenScale,
    fc:  inp.fc * U.fcScale,    // psi→MPa for US, 1:1 for others
    fy:  inp.fy * U.fcScale,
    fyl: inp.fyl * U.fcScale,
    lam: inp.lam ?? 1.0,
    phi: inp.phi ?? 0.75,
    Vu:  inp.Vu  * U.forceScale,
    Tu:  inp.Tu  * U.momScale,
    dst: unit === 'us' ? inp.dst * 25.4 : inp.dst,  // always mm in engine
    s:   inp.s  * U.lenScale,
    dl:  unit === 'us' ? inp.dl  * 25.4 : inp.dl,
    nl:  inp.nl,
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
  if (!ok) console.log(`           computed=${computed.toFixed(6)}  expected=${expected.toFixed(6)}  err=${(err * 100).toFixed(3)}%`);
  ok ? passed++ : failed++;
}

function checkBool(label, computed, expected) {
  const ok = computed === expected;
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}  ${label}  (${computed})`);
  ok ? passed++ : failed++;
}

// ─────────────────────────────────────────────────────────────────
// Reference problems — SI base values (mm / MPa / N / N·mm)
// Expected values computed by the engine itself (self-consistent).
// This verifies unit-conversion correctness: all three unit systems
// must produce identical internal results (within ±1%).
// ─────────────────────────────────────────────────────────────────

// ── PROBLEM 1 ──
// b=300, h=500, cv=40, f'c=28, fy=fyl=420, λ=1.0, φ=0.75
// Vu=100000N, Tu=25e6N·mm, Ø10@150, 6×Ø16 long.
//
// Quick hand-check (SI):
//   Acp=150000, Pcp=1600, x1=220, y1=420, Aoh=92400, Ph=1280, Ao=78540
//   Tth= 0.75×0.083×1.0×√28×150000²/1600 = 0.75×0.083×5.292×14062500000/1600
//      = 0.75×0.083×5.292×8789063 = 2,893,000 N·mm = 2.89 kN·m
//   Tu=25e6 >> Tth → design required
//   d  = 500−40−5−8 = 447 mm
//   Vc = 0.66×1.0×0.01^(1/3)×5.292×300×447 = 0.66×0.2154×5.292×134100 = 101,014 N
//   At_s = 25e6/(0.75×2×78540×420×1) = 25e6/49,460,400 = 0.5055 mm²/mm per leg
//   At_prov = (π/4×100)/150 = 78.54/150 = 0.5236 mm²/mm  → OK (0.5236 > 0.5055)
//   Al_req = 0.5055×1280×1 = 647 mm²
//   Al_prov = 6×π/4×256 = 1206.4 mm²  → OK
const P1_ref = torsionACI({
  b:300, h:500, cv:40, fc:28, fy:420, fyl:420, lam:1.0, phi:0.75,
  Vu:100000, Tu:25e6, dst:10, s:150, dl:16, nl:6,
});

const P1 = {
  knm: { b:0.300, h:0.500, cv:0.040, fc:28, fy:420, fyl:420,
         Vu:100, Tu:25, dst:10, s:0.150, dl:16, nl:6 },
  nmm: { b:300, h:500, cv:40, fc:28, fy:420, fyl:420,
         Vu:100000, Tu:25e6, dst:10, s:150, dl:16, nl:6 },
  us:  { b:300/25.4, h:500/25.4, cv:40/25.4,
         fc:28/0.006895, fy:420/0.006895, fyl:420/0.006895,
         Vu:100000/4448.2, Tu:25e6/1.356e6, dst:10/25.4, s:150/25.4, dl:16/25.4, nl:6 },
};

// ── PROBLEM 2 ──
// b=350, h=600, cv=40, f'c=28, fy=fyl=420, λ=1.0, φ=0.75
// Vu=150000N, Tu=50e6N·mm, Ø12@200, 8×Ø18 long.
const P2_ref = torsionACI({
  b:350, h:600, cv:40, fc:28, fy:420, fyl:420, lam:1.0, phi:0.75,
  Vu:150000, Tu:50e6, dst:12, s:200, dl:18, nl:8,
});

const P2 = {
  knm: { b:0.350, h:0.600, cv:0.040, fc:28, fy:420, fyl:420,
         Vu:150, Tu:50, dst:12, s:0.200, dl:18, nl:8 },
  nmm: { b:350, h:600, cv:40, fc:28, fy:420, fyl:420,
         Vu:150000, Tu:50e6, dst:12, s:200, dl:18, nl:8 },
  us:  { b:350/25.4, h:600/25.4, cv:40/25.4,
         fc:28/0.006895, fy:420/0.006895, fyl:420/0.006895,
         Vu:150000/4448.2, Tu:50e6/1.356e6, dst:12/25.4, s:200/25.4, dl:18/25.4, nl:8 },
};

// ── PROBLEM 3 ──
// b=300, h=500, cv=40, f'c=35, fy=fyl=420, λ=1.0, φ=0.75
// Vu=180000N, Tu=40e6N·mm, Ø12@150, 8×Ø16 long.
const P3_ref = torsionACI({
  b:300, h:500, cv:40, fc:35, fy:420, fyl:420, lam:1.0, phi:0.75,
  Vu:180000, Tu:40e6, dst:12, s:150, dl:16, nl:8,
});

const P3 = {
  knm: { b:0.300, h:0.500, cv:0.040, fc:35, fy:420, fyl:420,
         Vu:180, Tu:40, dst:12, s:0.150, dl:16, nl:8 },
  nmm: { b:300, h:500, cv:40, fc:35, fy:420, fyl:420,
         Vu:180000, Tu:40e6, dst:12, s:150, dl:16, nl:8 },
  us:  { b:300/25.4, h:500/25.4, cv:40/25.4,
         fc:35/0.006895, fy:420/0.006895, fyl:420/0.006895,
         Vu:180000/4448.2, Tu:40e6/1.356e6, dst:12/25.4, s:150/25.4, dl:16/25.4, nl:8 },
};

// ─────────────────────────────────────────────────────────────────
// Run tests
// ─────────────────────────────────────────────────────────────────

function runProblem(label, unitInputs, ref) {
  for (const unit of ['knm', 'nmm', 'us']) {
    console.log(`\n── ${label} (${unit}) ──`);
    const r = torFromUnit(unit, unitInputs[unit]);
    check('Aoh',              r.Aoh,             ref.Aoh);
    check('Ph',               r.Ph,              ref.Ph);
    check('Ao',               r.Ao,              ref.Ao);
    check('Tth',              r.Tth,             ref.Tth);
    checkBool('neglect',      r.neglect,         ref.neglect);
    check('d',                r.d,               ref.d);
    check('Vc',               r.Vc,              ref.Vc);
    check('At_s (req/leg)',   r.At_s,            ref.At_s);
    check('At_prov (1 leg)',  r.At_prov,         ref.At_prov);
    check('combined_req',     r.combined_req,    ref.combined_req);
    check('combined_prov',    r.combined_prov,   ref.combined_prov);
    check('Vn_check',         r.Vn_check,        ref.Vn_check);
    check('Vn_max',           r.Vn_max,          ref.Vn_max);
    check('dc_section',       r.dc_section,      ref.dc_section);
    check('Al_req',           r.Al_req,          ref.Al_req);
    check('AlReqEff',         r.AlReqEff,        ref.AlReqEff);
    check('Al_prov',          r.Al_prov,         ref.Al_prov);
    check('dc',               r.dc,              ref.dc);
  }
}

runProblem('P1 b300h500 f\'c28 Tu=25kNm', P1, P1_ref);
runProblem('P2 b350h600 f\'c28 Tu=50kNm', P2, P2_ref);
runProblem('P3 b300h500 f\'c35 Tu=40kNm', P3, P3_ref);

// ── Unit conversion sanity ──
console.log('\n── Unit conversion consistency ──');
for (const prob of [
  { label: 'P1', unitInputs: P1, ref: P1_ref },
  { label: 'P2', unitInputs: P2, ref: P2_ref },
]) {
  const r_knm = torFromUnit('knm', prob.unitInputs.knm);
  const r_nmm = torFromUnit('nmm', prob.unitInputs.nmm);
  const r_us  = torFromUnit('us',  prob.unitInputs.us);
  check(`${prob.label} dc: knm==nmm`, r_knm.dc, r_nmm.dc);
  check(`${prob.label} dc: us==nmm`,  r_us.dc,  r_nmm.dc);
  check(`${prob.label} At_s: knm==nmm`, r_knm.At_s, r_nmm.At_s);
  check(`${prob.label} At_s: us==nmm`,  r_us.At_s,  r_nmm.At_s);
  check(`${prob.label} Al_req: knm==nmm`, r_knm.Al_req, r_nmm.Al_req);
  check(`${prob.label} Al_req: us==nmm`,  r_us.Al_req,  r_nmm.Al_req);
}

console.log(`\n══ Results: ${passed} passed, ${failed} failed ══`);
if (failed > 0) process.exit(1);
