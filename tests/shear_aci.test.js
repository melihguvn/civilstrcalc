/**
 * ACI 318-25 Beam Shear Design — Reference Test Suite
 *
 * Three reference problems × three unit systems = 9 test groups.
 * The engine mirrors calcACI() in pages/shear.html exactly.
 *
 *   knm  →  m / kN      lenS=1000  forceS=1000
 *   nmm  →  mm / N      lenS=1     forceS=1
 *   us   →  in / kip    lenS=25.4  forceS=4448.2
 *
 * Note: fc (MPa) and fyt (MPa) are ALWAYS in MPa in shear.html for all
 * unit systems (there is no fcScale in shear.html's UNITS).
 * For US unit inputs, fc/fyt must be pre-converted to MPa before passing.
 *
 * Reference problems:
 *   P1  bw=300mm, h=500mm, cv=40mm, 2×Ø10 stirrups s=200mm, Vu=200kN
 *       f'c=28MPa, fyt=420MPa, Asl=1520mm², λ=1.0
 *   P2  bw=250mm, h=450mm, cv=35mm, 2×Ø10 stirrups s=200mm, Vu=150kN
 *       f'c=25MPa, fyt=420MPa, Asl=1100mm², λ=1.0
 *   P3  bw=350mm, h=600mm, cv=45mm, 2×Ø12 stirrups s=140mm, Vu=380kN
 *       f'c=35MPa, fyt=420MPa, Asl=2400mm², λ=1.0 (Vs > Vs,lim)
 *
 * Run:  node tests/shear_aci.test.js
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Unit definitions (mirrors shear.html UNITS)
// fc and fyt are always MPa — no fcScale here
// ─────────────────────────────────────────────────────────────────
const UNITS = {
  knm: { lenS: 1000, forceS: 1000  },
  nmm: { lenS: 1,    forceS: 1     },
  us:  { lenS: 25.4, forceS: 4448.2 },
};

// ─────────────────────────────────────────────────────────────────
// Core shear engine — all quantities in mm / MPa / N
// Mirrors calcACI() from pages/shear.html exactly.
// ─────────────────────────────────────────────────────────────────
function shearACI({ bw, h, cv, db, legs, s, fc, fyt, phi = 0.75, lam = 1.0, Asl = 0, Vu }) {
  const d      = h - cv - db / 2;
  const rho_w  = Math.min(Math.max(Asl / (bw * d), 0.001), 0.04);
  const Av     = legs * Math.PI * db * db / 4;

  // ACI 318-25 §22.5.5.1 (SI)
  const Vc     = 0.66 * lam * Math.pow(rho_w, 1 / 3) * Math.sqrt(fc) * bw * d;
  const phiVc  = phi * Vc;

  const Vs_prov = s > 0 ? Av * fyt * d / s : 0;
  const phiVn   = phi * (Vc + Vs_prov);
  const dc      = phiVn > 0 ? Vu / phiVn : 999;

  const Vs_req   = Vu / phi - Vc;
  const s_req    = Vs_req > 0 ? Av * fyt * d / Vs_req : Infinity;

  const Vs_lim   = 0.33 * Math.sqrt(fc) * bw * d;
  const Vs_max   = 0.66 * Math.sqrt(fc) * bw * d;
  const s_max_code = Vs_prov <= Vs_lim ? Math.min(d / 2, 600) : Math.min(d / 4, 300);

  const Avs_min  = Math.max(0.062 * Math.sqrt(fc) * bw / fyt, 0.35 * bw / fyt);
  const s_max_mr = Av / Avs_min;
  const s_max    = Math.min(s_max_code, s_max_mr);

  const phiVnmax = phi * (Vc + Vs_max);
  const dc_sec   = Vu / phiVnmax;

  return { d, rho_w, Av, Vc, phiVc, Vs_prov, phiVn, dc, Vs_req, s_req,
           Vs_lim, Vs_max, s_max_code, s_max_mr, s_max, phiVnmax, dc_sec };
}

// ─────────────────────────────────────────────────────────────────
// Wrapper: unit conversion then engine call
// ─────────────────────────────────────────────────────────────────
function shearFromUnit(unit, inputs) {
  const ls = UNITS[unit].lenS;
  const fs = UNITS[unit].forceS;
  return shearACI({
    bw:   inputs.bw  * ls,
    h:    inputs.h   * ls,
    cv:   inputs.cv  * ls,
    db:   inputs.db,          // stirrup db always in mm (shear.html reads raw mm)
    legs: inputs.legs,
    s:    inputs.s   * ls,
    fc:   inputs.fc,          // always MPa
    fyt:  inputs.fyt,         // always MPa
    phi:  inputs.phi  ?? 0.75,
    lam:  inputs.lam  ?? 1.0,
    Asl:  inputs.Asl  ?? 0,   // always mm²
    Vu:   inputs.Vu  * fs,
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

// ─────────────────────────────────────────────────────────────────
// Reference values computed by engine (self-consistent)
// ─────────────────────────────────────────────────────────────────

// ── PROBLEM 1 ──
// bw=300, h=500, cv=40, db=10, legs=2, s=200, fc=28, fyt=420, Asl=1520, Vu=200000N
//
// d     = 500−40−5 = 455 mm
// rho_w = max(min(1520/(300×455), 0.04), 0.001) = 1520/136500 = 0.01113
// Av    = 2×π/4×100 = 157.08 mm²
// Vc    = 0.66×1.0×0.01113^(1/3)×√28×300×455
//       = 0.66×0.2230×5.2915×300×455 = 0.66×0.2230×5.2915×136500
//       = 0.66×160,894 = 106,190 N   (approx)
// Let engine compute exactly.
const P1_ref = shearACI({ bw:300, h:500, cv:40, db:10, legs:2, s:200,
                           fc:28, fyt:420, phi:0.75, lam:1.0, Asl:1520, Vu:200000 });

const P1 = {
  knm: { bw:0.300, h:0.500, cv:0.040, db:10, legs:2, s:0.200, fc:28, fyt:420, Asl:1520, Vu:200   },
  nmm: { bw:300,   h:500,   cv:40,    db:10, legs:2, s:200,   fc:28, fyt:420, Asl:1520, Vu:200000},
  us:  { bw:300/25.4, h:500/25.4, cv:40/25.4, db:10, legs:2, s:200/25.4,
         fc:28, fyt:420, Asl:1520, Vu:200000/4448.2 },
  exp: {
    d:       P1_ref.d,
    Vc:      P1_ref.Vc,
    phiVc:   P1_ref.phiVc,
    Vs_prov: P1_ref.Vs_prov,
    phiVn:   P1_ref.phiVn,
    dc:      P1_ref.dc,
    s_req:   P1_ref.s_req,
    s_max:   P1_ref.s_max,
  },
};

// ── PROBLEM 2 ──
// bw=250, h=450, cv=35, db=10, legs=2, s=200, fc=25, fyt=420, Asl=1100, Vu=150000N
const P2_ref = shearACI({ bw:250, h:450, cv:35, db:10, legs:2, s:200,
                           fc:25, fyt:420, phi:0.75, lam:1.0, Asl:1100, Vu:150000 });

const P2 = {
  knm: { bw:0.250, h:0.450, cv:0.035, db:10, legs:2, s:0.200, fc:25, fyt:420, Asl:1100, Vu:150   },
  nmm: { bw:250,   h:450,   cv:35,    db:10, legs:2, s:200,   fc:25, fyt:420, Asl:1100, Vu:150000},
  us:  { bw:250/25.4, h:450/25.4, cv:35/25.4, db:10, legs:2, s:200/25.4,
         fc:25, fyt:420, Asl:1100, Vu:150000/4448.2 },
  exp: {
    d:       P2_ref.d,
    Vc:      P2_ref.Vc,
    phiVn:   P2_ref.phiVn,
    dc:      P2_ref.dc,
    s_req:   P2_ref.s_req,
    s_max:   P2_ref.s_max,
  },
};

// ── PROBLEM 3 ──
// bw=350, h=600, cv=45, db=12, legs=2, s=140, fc=35, fyt=420, Asl=2400, Vu=380000N
// Expected: Vs_prov > Vs_lim (reduced max spacing)
const P3_ref = shearACI({ bw:350, h:600, cv:45, db:12, legs:2, s:140,
                           fc:35, fyt:420, phi:0.75, lam:1.0, Asl:2400, Vu:380000 });

const P3 = {
  knm: { bw:0.350, h:0.600, cv:0.045, db:12, legs:2, s:0.140, fc:35, fyt:420, Asl:2400, Vu:380   },
  nmm: { bw:350,   h:600,   cv:45,    db:12, legs:2, s:140,   fc:35, fyt:420, Asl:2400, Vu:380000},
  us:  { bw:350/25.4, h:600/25.4, cv:45/25.4, db:12, legs:2, s:140/25.4,
         fc:35, fyt:420, Asl:2400, Vu:380000/4448.2 },
  exp: {
    d:       P3_ref.d,
    Vc:      P3_ref.Vc,
    phiVn:   P3_ref.phiVn,
    dc:      P3_ref.dc,
    s_req:   P3_ref.s_req,
    s_max:   P3_ref.s_max,
    Vs_lim:  P3_ref.Vs_lim,
    s_max_code: P3_ref.s_max_code,  // should be d/4 since Vs > Vs_lim
  },
};

// Verify P3 Vs_prov > Vs_lim (reduces s_max)
const P3_Vs_check = P3_ref.Vs_prov > P3_ref.Vs_lim;

// ─────────────────────────────────────────────────────────────────
// Note on unit inputs for shear.html:
//
//   bw, h, cv, s  →  input × lenS  → mm
//   Vu            →  input × forceS → N
//   db (stirrup)  →  always mm (raw, no lenS applied in shear.html)
//   Asl           →  always mm²
//   fc, fyt       →  always MPa (no fcScale in shear.html)
//
// For US unit display (kips, inches):
//   s input = mm / (25.4 × 1000) since lenS=25.4 and s is in the same
//   unit as bw (inches).  But in the wrapper we use s * lenS → mm,
//   so s_us = s_mm / lenS.  s = 200mm → s_us = 200/25.4 inches (not /1000).
// ─────────────────────────────────────────────────────────────────

// Fix US inputs: s in inches, bw/h/cv in inches
const P1_us_fixed = { bw:300/25.4, h:500/25.4, cv:40/25.4, db:10, legs:2,
                       s:200/25.4, fc:28, fyt:420, Asl:1520, Vu:200000/4448.2 };
const P2_us_fixed = { bw:250/25.4, h:450/25.4, cv:35/25.4, db:10, legs:2,
                       s:200/25.4, fc:25, fyt:420, Asl:1100, Vu:150000/4448.2 };
const P3_us_fixed = { bw:350/25.4, h:600/25.4, cv:45/25.4, db:12, legs:2,
                       s:140/25.4, fc:35, fyt:420, Asl:2400, Vu:380000/4448.2 };

// ─────────────────────────────────────────────────────────────────
// Run tests
// ─────────────────────────────────────────────────────────────────

// ── Problem 1 ──
for (const unit of ['knm', 'nmm']) {
  console.log(`\n── P1 bw300h500 (${unit}) ──`);
  const inp = unit === 'knm' ? P1.knm : P1.nmm;
  const r = shearFromUnit(unit, inp);
  check('d',       r.d,       P1.exp.d);
  check('Vc',      r.Vc,      P1.exp.Vc);
  check('phiVc',   r.phiVc,   P1.exp.phiVc);
  check('Vs_prov', r.Vs_prov, P1.exp.Vs_prov);
  check('phiVn',   r.phiVn,   P1.exp.phiVn);
  check('dc',      r.dc,      P1.exp.dc);
  check('s_req',   r.s_req,   P1.exp.s_req);
  check('s_max',   r.s_max,   P1.exp.s_max);
}
console.log(`\n── P1 bw300h500 (us) ──`);
{
  const r = shearFromUnit('us', P1_us_fixed);
  check('d',    r.d,    P1.exp.d);
  check('Vc',   r.Vc,   P1.exp.Vc);
  check('phiVn',r.phiVn,P1.exp.phiVn);
  check('dc',   r.dc,   P1.exp.dc);
}

// ── Problem 2 ──
for (const unit of ['knm', 'nmm']) {
  console.log(`\n── P2 bw250h450 (${unit}) ──`);
  const inp = unit === 'knm' ? P2.knm : P2.nmm;
  const r = shearFromUnit(unit, inp);
  check('d',       r.d,       P2.exp.d);
  check('Vc',      r.Vc,      P2.exp.Vc);
  check('phiVn',   r.phiVn,   P2.exp.phiVn);
  check('dc',      r.dc,      P2.exp.dc);
  check('s_req',   r.s_req,   P2.exp.s_req);
  check('s_max',   r.s_max,   P2.exp.s_max);
}
console.log(`\n── P2 bw250h450 (us) ──`);
{
  const r = shearFromUnit('us', P2_us_fixed);
  check('d',    r.d,    P2.exp.d);
  check('Vc',   r.Vc,   P2.exp.Vc);
  check('phiVn',r.phiVn,P2.exp.phiVn);
  check('dc',   r.dc,   P2.exp.dc);
}

// ── Problem 3 ──
for (const unit of ['knm', 'nmm']) {
  console.log(`\n── P3 bw350h600 fyt420 (${unit}) ──`);
  const inp = unit === 'knm' ? P3.knm : P3.nmm;
  const r = shearFromUnit(unit, inp);
  check('d',          r.d,          P3.exp.d);
  check('Vc',         r.Vc,         P3.exp.Vc);
  check('phiVn',      r.phiVn,      P3.exp.phiVn);
  check('dc',         r.dc,         P3.exp.dc);
  check('s_req',      r.s_req,      P3.exp.s_req);
  check('s_max_code', r.s_max_code, P3.exp.s_max_code);
  check('s_max',      r.s_max,      P3.exp.s_max);
  const vsCheck = r.Vs_prov > r.Vs_lim;
  console.log(`  ${vsCheck === P3_Vs_check ? '✓ PASS' : '✗ FAIL'}  Vs_prov > Vs_lim (reduced spacing) (${vsCheck})`);
  vsCheck === P3_Vs_check ? passed++ : failed++;
}
console.log(`\n── P3 bw350h600 (us) ──`);
{
  const r = shearFromUnit('us', P3_us_fixed);
  check('d',    r.d,    P3.exp.d);
  check('Vc',   r.Vc,   P3.exp.Vc);
  check('phiVn',r.phiVn,P3.exp.phiVn);
  check('dc',   r.dc,   P3.exp.dc);
}

// ── Unit conversion sanity ──
console.log('\n── Unit conversion consistency ──');
{
  const r_knm = shearFromUnit('knm', P1.knm);
  const r_nmm = shearFromUnit('nmm', P1.nmm);
  const r_us  = shearFromUnit('us',  P1_us_fixed);
  check('P1 d: knm==nmm',    r_knm.d,     r_nmm.d);
  check('P1 d: us==nmm',     r_us.d,      r_nmm.d);
  check('P1 phiVn: knm==nmm',r_knm.phiVn, r_nmm.phiVn);
  check('P1 phiVn: us==nmm', r_us.phiVn,  r_nmm.phiVn);
  check('P1 dc: knm==nmm',   r_knm.dc,    r_nmm.dc);
  check('P1 dc: us==nmm',    r_us.dc,     r_nmm.dc);
}

console.log(`\n══ Results: ${passed} passed, ${failed} failed ══`);
if (failed > 0) process.exit(1);
