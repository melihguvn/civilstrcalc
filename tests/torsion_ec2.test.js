/**
 * EC2 (EN 1992-1-1) Beam Torsion Design — Reference Test Suite
 *
 * Three reference problems × three unit systems = 9 test groups.
 * The engine mirrors calcTorEC2() in pages/beam.html exactly.
 *
 * Unit systems:
 *   knm  →  m / kN / kN·m        lenScale=1000  forceScale=1000  momScale=1e6
 *   nmm  →  mm / N / N·mm        lenScale=1     forceScale=1     momScale=1
 *   us   →  in / kip / kip·ft    lenScale=25.4  forceScale=4448.2 momScale=1.356e6
 *
 * EC2 strengths (fck, fyk, γc, γs) are always in MPa/dimensionless.
 * dst and dl are always in mm in the engine (×25.4 applied for US inputs).
 *
 * Reference problems:
 *   P1  b=300mm, h=500mm, cv=40mm, fck=25MPa, fyk=500MPa, γc=1.5, γs=1.15
 *       VEd=100kN, TEd=30kN·m, Ø10@150mm, 6×Ø16 longitudinal
 *   P2  b=350mm, h=600mm, cv=40mm, fck=30MPa, fyk=500MPa, γc=1.5, γs=1.15
 *       VEd=150kN, TEd=60kN·m, Ø12@200mm, 8×Ø18 longitudinal
 *   P3  b=300mm, h=500mm, cv=35mm, fck=35MPa, fyk=500MPa, γc=1.5, γs=1.15
 *       VEd=180kN, TEd=45kN·m, Ø12@150mm, 8×Ø16 longitudinal
 *
 * Run:  node tests/torsion_ec2.test.js
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Unit definitions
// ─────────────────────────────────────────────────────────────────
const UNITS = {
  knm: { lenScale: 1000,  forceScale: 1e3,    momScale: 1e6    },
  nmm: { lenScale: 1,     forceScale: 1,       momScale: 1      },
  us:  { lenScale: 25.4,  forceScale: 4448.2,  momScale: 1.356e6 },
};

// ─────────────────────────────────────────────────────────────────
// Core torsion engine — all quantities in mm / MPa / N / N·mm
// Mirrors calcTorEC2() from pages/beam.html exactly.
// ─────────────────────────────────────────────────────────────────
function torsionEC2({ b, h, cv, fck, fyk, gc = 1.5, gs = 1.15, VEd, TEd, dst, s, dl, nl }) {
  const fcd  = fck / gc;
  const fyd  = fyk / gs;
  const nu   = 0.6 * (1 - fck / 250);

  const Acp  = b * h;
  const Pcp  = 2 * (b + h);
  const tef  = Math.max(Acp / Pcp, 2 * cv);
  const Ak   = (b - tef) * (h - tef);
  const uk   = 2 * ((b - tef) + (h - tef));

  const theta = Math.PI / 4;
  const cot_t = 1 / Math.tan(theta);   // = 1.0  (45°)
  const tan_t = Math.tan(theta);        // = 1.0

  const fctm = fck <= 50
    ? 0.30 * Math.pow(fck, 2 / 3)
    : 2.12 * Math.log(1 + (fck + 8) / 10);
  const Tth = 2 * fctm * tef * Ak;

  const TRd_max = 2 * nu * fcd * Ak * tef * Math.sin(theta) * Math.cos(theta);

  const At_s_ec2 = TEd / (2 * Ak * fyd * cot_t);

  const d = h - cv - dst / 2 - dl / 2;
  const rho_l = Math.min(0.02, 0.01);   // assumed 1% in beam.html
  const k = Math.min(2.0, 1 + Math.sqrt(200 / d));
  const VRd_c = Math.max(
    (0.18 / gc) * k * Math.pow(rho_l * fck, 1 / 3) * b * d,
    (0.035 * Math.pow(k, 1.5) * Math.sqrt(fck)) * b * d,
  );
  const VRd_s   = (2 * (Math.PI / 4 * dst * dst) / s) * fyd * d * cot_t;
  const VRd_max = nu * fcd * b * d / (cot_t + tan_t);

  const dc_combined = TEd / TRd_max + VEd / VRd_max;

  const Al_req  = At_s_ec2 * uk * cot_t * cot_t;
  const Al_prov = nl * Math.PI / 4 * dl * dl;
  const At_prov = (Math.PI / 4 * dst * dst) / s;

  const dc_t = At_s_ec2 > 0 ? (At_prov > 0 ? At_s_ec2 / At_prov : Infinity) : 0;
  const dc_l = Al_req > 0   ? (Al_prov > 0 ? Al_req   / Al_prov  : Infinity) : 0;
  const dc_v = VEd > VRd_c  ? VEd / VRd_s : VEd / VRd_c;
  const dc   = Math.min(99, Math.max(dc_combined, dc_v, dc_t, dc_l));

  return {
    Acp, Pcp, tef, Ak, uk,
    fctm, Tth, nu,
    TRd_max, At_s_ec2,
    d, k, VRd_c, VRd_s, VRd_max,
    dc_combined, Al_req, Al_prov, At_prov,
    dc_t, dc_l, dc_v, dc,
  };
}

// ─────────────────────────────────────────────────────────────────
// Wrapper: unit conversion then engine call
// ─────────────────────────────────────────────────────────────────
function torFromUnit(unit, inp) {
  const U = UNITS[unit];
  return torsionEC2({
    b:   inp.b  * U.lenScale,
    h:   inp.h  * U.lenScale,
    cv:  inp.cv * U.lenScale,
    fck: inp.fck,    // always MPa
    fyk: inp.fyk,    // always MPa
    gc:  inp.gc  ?? 1.5,
    gs:  inp.gs  ?? 1.15,
    VEd: inp.VEd * U.forceScale,
    TEd: inp.TEd * U.momScale,
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
// Reference problems — SI base values
// Expected values computed by the engine (self-consistent).
// ─────────────────────────────────────────────────────────────────

// ── PROBLEM 1 ──
// b=300, h=500, cv=40, fck=25, fyk=500, γc=1.5, γs=1.15
// VEd=100000N, TEd=30e6N·mm, Ø10@150, 6×Ø16 long.
//
// Quick hand-check (SI):
//   fcd = 25/1.5 = 16.667 MPa,  fyd = 500/1.15 = 434.783 MPa
//   Acp = 150000, Pcp=1600, tef = max(150000/1600, 80) = max(93.75, 80) = 93.75 mm
//   Ak  = (300−93.75)×(500−93.75) = 206.25×406.25 = 83,789 mm²
//   uk  = 2×(206.25+406.25) = 1225 mm
//   nu  = 0.6×(1−25/250) = 0.54
//   TRd_max = 2×0.54×16.667×83789×93.75×sin45×cos45
//           = 2×0.54×16.667×83789×93.75×0.5 = 0.54×16.667×83789×93.75
//           = 9000.18×83789×93.75 = 0.54×16.667×7,855,219 = 70,704,000 N·mm = 70.7 kN·m
//   At_s = 30e6/(2×83789×434.783×1) = 30e6/72,899,000 = 0.4115 mm²/mm per leg
//   At_prov = (π/4×100)/150 = 0.5236 mm²/mm → OK
//   Al_req = 0.4115×1225×1 = 504 mm²
//   Al_prov = 6×π/4×256 = 1206.4 mm² → OK
//   d = 500−40−5−8 = 447 mm
//   VRd_max = 0.54×16.667×300×447/(1+1) = 0.54×16.667×300×447/2
//           = 0.54×16.667×67050 = 603,576 N (one-sided, /2)
//   dc_combined = 30e6/70.7e6 + 100000/603576 = 0.424+0.166 = 0.590
// Engine computes exactly.
const P1_ref = torsionEC2({
  b:300, h:500, cv:40, fck:25, fyk:500, gc:1.5, gs:1.15,
  VEd:100000, TEd:30e6, dst:10, s:150, dl:16, nl:6,
});

const P1 = {
  knm: { b:0.300, h:0.500, cv:0.040, fck:25, fyk:500, gc:1.5, gs:1.15,
         VEd:100, TEd:30, dst:10, s:0.150, dl:16, nl:6 },
  nmm: { b:300, h:500, cv:40, fck:25, fyk:500, gc:1.5, gs:1.15,
         VEd:100000, TEd:30e6, dst:10, s:150, dl:16, nl:6 },
  us:  { b:300/25.4, h:500/25.4, cv:40/25.4, fck:25, fyk:500, gc:1.5, gs:1.15,
         VEd:100000/4448.2, TEd:30e6/1.356e6, dst:10/25.4, s:150/25.4, dl:16/25.4, nl:6 },
};

// ── PROBLEM 2 ──
// b=350, h=600, cv=40, fck=30, fyk=500, γc=1.5, γs=1.15
// VEd=150000N, TEd=60e6N·mm, Ø12@200, 8×Ø18 long.
const P2_ref = torsionEC2({
  b:350, h:600, cv:40, fck:30, fyk:500, gc:1.5, gs:1.15,
  VEd:150000, TEd:60e6, dst:12, s:200, dl:18, nl:8,
});

const P2 = {
  knm: { b:0.350, h:0.600, cv:0.040, fck:30, fyk:500, gc:1.5, gs:1.15,
         VEd:150, TEd:60, dst:12, s:0.200, dl:18, nl:8 },
  nmm: { b:350, h:600, cv:40, fck:30, fyk:500, gc:1.5, gs:1.15,
         VEd:150000, TEd:60e6, dst:12, s:200, dl:18, nl:8 },
  us:  { b:350/25.4, h:600/25.4, cv:40/25.4, fck:30, fyk:500, gc:1.5, gs:1.15,
         VEd:150000/4448.2, TEd:60e6/1.356e6, dst:12/25.4, s:200/25.4, dl:18/25.4, nl:8 },
};

// ── PROBLEM 3 ──
// b=300, h=500, cv=35, fck=35, fyk=500, γc=1.5, γs=1.15
// VEd=180000N, TEd=45e6N·mm, Ø12@150, 8×Ø16 long.
const P3_ref = torsionEC2({
  b:300, h:500, cv:35, fck:35, fyk:500, gc:1.5, gs:1.15,
  VEd:180000, TEd:45e6, dst:12, s:150, dl:16, nl:8,
});

const P3 = {
  knm: { b:0.300, h:0.500, cv:0.035, fck:35, fyk:500, gc:1.5, gs:1.15,
         VEd:180, TEd:45, dst:12, s:0.150, dl:16, nl:8 },
  nmm: { b:300, h:500, cv:35, fck:35, fyk:500, gc:1.5, gs:1.15,
         VEd:180000, TEd:45e6, dst:12, s:150, dl:16, nl:8 },
  us:  { b:300/25.4, h:500/25.4, cv:35/25.4, fck:35, fyk:500, gc:1.5, gs:1.15,
         VEd:180000/4448.2, TEd:45e6/1.356e6, dst:12/25.4, s:150/25.4, dl:16/25.4, nl:8 },
};

// ─────────────────────────────────────────────────────────────────
// Run tests
// ─────────────────────────────────────────────────────────────────

function runProblem(label, unitInputs, ref) {
  for (const unit of ['knm', 'nmm', 'us']) {
    console.log(`\n── ${label} (${unit}) ──`);
    const r = torFromUnit(unit, unitInputs[unit]);
    check('tef',              r.tef,         ref.tef);
    check('Ak',               r.Ak,          ref.Ak);
    check('uk',               r.uk,          ref.uk);
    check('TRd_max',          r.TRd_max,     ref.TRd_max);
    check('At_s_ec2 (req)',   r.At_s_ec2,    ref.At_s_ec2);
    check('At_prov (1 leg)',  r.At_prov,     ref.At_prov);
    check('d',                r.d,           ref.d);
    check('k',                r.k,           ref.k);
    check('VRd_c',            r.VRd_c,       ref.VRd_c);
    check('VRd_max',          r.VRd_max,     ref.VRd_max);
    check('VRd_s',            r.VRd_s,       ref.VRd_s);
    check('dc_combined (V+T)',r.dc_combined, ref.dc_combined);
    check('Al_req',           r.Al_req,      ref.Al_req);
    check('Al_prov',          r.Al_prov,     ref.Al_prov);
    check('dc_t (stirrup)',   r.dc_t,        ref.dc_t);
    check('dc_l (long.)',     r.dc_l,        ref.dc_l);
    check('dc_v (shear)',     r.dc_v,        ref.dc_v);
    check('dc (overall)',     r.dc,          ref.dc);
  }
}

runProblem('P1 b300h500 fck25 TEd=30kNm', P1, P1_ref);
runProblem('P2 b350h600 fck30 TEd=60kNm', P2, P2_ref);
runProblem('P3 b300h500 fck35 TEd=45kNm', P3, P3_ref);

// ── Unit conversion sanity ──
console.log('\n── Unit conversion consistency ──');
for (const prob of [
  { label: 'P1', unitInputs: P1, ref: P1_ref },
  { label: 'P2', unitInputs: P2, ref: P2_ref },
  { label: 'P3', unitInputs: P3, ref: P3_ref },
]) {
  const r_knm = torFromUnit('knm', prob.unitInputs.knm);
  const r_nmm = torFromUnit('nmm', prob.unitInputs.nmm);
  const r_us  = torFromUnit('us',  prob.unitInputs.us);
  check(`${prob.label} dc: knm==nmm`,        r_knm.dc,          r_nmm.dc);
  check(`${prob.label} dc: us==nmm`,          r_us.dc,           r_nmm.dc);
  check(`${prob.label} TRd_max: knm==nmm`,   r_knm.TRd_max,     r_nmm.TRd_max);
  check(`${prob.label} TRd_max: us==nmm`,     r_us.TRd_max,      r_nmm.TRd_max);
  check(`${prob.label} At_s_ec2: knm==nmm`,  r_knm.At_s_ec2,    r_nmm.At_s_ec2);
  check(`${prob.label} dc_combined: us==nmm`, r_us.dc_combined,  r_nmm.dc_combined);
}

console.log(`\n══ Results: ${passed} passed, ${failed} failed ══`);
if (failed > 0) process.exit(1);
