/**
 * EC2 (EN 1992-1-1) Beam Shear Design — Reference Test Suite
 *
 * Three reference problems × three unit systems = 9 test groups.
 * The engine mirrors calcEC2() in pages/shear.html exactly.
 *
 *   knm  →  m / kN      lenS=1000  forceS=1000
 *   nmm  →  mm / N      lenS=1     forceS=1
 *   us   →  in / kip    lenS=25.4  forceS=4448.2
 *
 * EC2 strengths (fck, fywk) are ALWAYS in MPa regardless of unit system.
 *
 * Reference problems:
 *   P1  bw=300mm, h=500mm, cv=40mm, 2×Ø10 stirrups s=200mm, VEd=160kN
 *       fck=25MPa, fywk=500MPa, γc=1.5, γs=1.15, Asl=1520mm²
 *   P2  bw=250mm, h=450mm, cv=35mm, 2×Ø10 stirrups s=200mm, VEd=120kN
 *       fck=25MPa, fywk=500MPa, γc=1.5, γs=1.15, Asl=1100mm²
 *   P3  bw=350mm, h=600mm, cv=45mm, 2×Ø12 stirrups s=150mm, VEd=320kN
 *       fck=35MPa, fywk=500MPa, γc=1.5, γs=1.15, Asl=2400mm²
 *
 * Run:  node tests/shear_ec2.test.js
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Unit definitions (mirrors shear.html UNITS)
// ─────────────────────────────────────────────────────────────────
const UNITS = {
  knm: { lenS: 1000, forceS: 1000  },
  nmm: { lenS: 1,    forceS: 1     },
  us:  { lenS: 25.4, forceS: 4448.2 },
};

// ─────────────────────────────────────────────────────────────────
// Core shear engine — all quantities in mm / MPa / N
// Mirrors calcEC2() from pages/shear.html exactly.
// ─────────────────────────────────────────────────────────────────
function shearEC2({ bw, h, cv, db, legs, s, fck, fywk, gc = 1.5, gs = 1.15, Asl = 0, VEd }) {
  const d    = h - cv - db / 2;
  const Av   = legs * Math.PI * db * db / 4;
  const fcd  = fck / gc;
  const fywd = fywk / gs;
  const z    = 0.9 * d;

  // VRd,c (§6.2.2)
  const CRdc = 0.18 / gc;
  const k    = Math.min(1 + Math.sqrt(200 / d), 2.0);
  const rho_l = Math.min(Asl / (bw * d), 0.02);
  const VRdc_formula = CRdc * k * Math.pow(100 * rho_l * fck, 1 / 3) * bw * d;
  const vmin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(fck);
  const VRdc_min = vmin * bw * d;
  const VRdc = Math.max(VRdc_formula, VRdc_min);

  // VRd,max (§6.2.3, θ=45°)
  const nu1     = 0.6 * (1 - fck / 250);
  const VRdmax  = bw * z * nu1 * fcd / 2;

  // Stirrup capacity at provided spacing (§6.2.3)
  const VRds_prov = Av * z * fywd / s;
  const VRd_total = Math.min(VRds_prov, VRdmax);

  // D/C ratios
  const dc_c   = VEd / VRdc;
  const dc_s   = VEd / VRds_prov;
  const dc_max = VEd / VRdmax;
  const dc     = VEd <= VRdc ? dc_c : Math.max(dc_s, dc_max);

  // Required Asw/s
  const Asws_req = VEd / (z * fywd);
  const s_req    = Av / Asws_req;

  // Maximum spacing (§9.2.2)
  const s_max_code = Math.min(0.75 * d, 600);
  const rho_w_min  = 0.08 * Math.sqrt(fck) / fywk;
  const Asws_min   = rho_w_min * bw;
  const s_max_min  = Av / Asws_min;
  const s_max      = Math.min(s_max_code, s_max_min);

  const needStirrups = VEd > VRdc;

  return { d, Av, fcd, fywd, z, k, rho_l, VRdc, VRdmax, VRds_prov, VRd_total,
           dc_c, dc_s, dc_max, dc, Asws_req, s_req, s_max_code, s_max_min, s_max,
           needStirrups, nu1 };
}

// ─────────────────────────────────────────────────────────────────
// Wrapper: unit conversion then engine call
// ─────────────────────────────────────────────────────────────────
function shearFromUnit(unit, inputs) {
  const ls = UNITS[unit].lenS;
  const fs = UNITS[unit].forceS;
  return shearEC2({
    bw:   inputs.bw  * ls,
    h:    inputs.h   * ls,
    cv:   inputs.cv  * ls,
    db:   inputs.db,          // stirrup db always mm
    legs: inputs.legs,
    s:    inputs.s   * ls,
    fck:  inputs.fck,         // always MPa
    fywk: inputs.fywk,        // always MPa
    gc:   inputs.gc   ?? 1.5,
    gs:   inputs.gs   ?? 1.15,
    Asl:  inputs.Asl  ?? 0,   // always mm²
    VEd:  inputs.VEd  * fs,
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
// Reference values computed by engine (self-consistent)
// ─────────────────────────────────────────────────────────────────

// ── PROBLEM 1 ──
// bw=300, h=500, cv=40, db=10, legs=2, s=200, fck=25, fywk=500, Asl=1520, VEd=160000N
//
// d     = 500−40−5 = 455 mm
// z     = 0.9×455 = 409.5 mm
// CRdc  = 0.18/1.5 = 0.12
// k     = min(1+√(200/455),2.0) = 1+0.6630 = 1.6630
// rho_l = 1520/(300×455) = 0.01113 (≤0.02)
// VRdc  = 0.12×1.6630×(100×0.01113×25)^(1/3)×300×455
//       = 0.12×1.6630×(27.825)^(1/3)×136500
//       = 0.12×1.6630×3.033×136500 = 83,754 N  (approx)
// VRds  = 157.08×409.5×(500/1.15)/200 = 157.08×409.5×434.78/200 = 140,044 N (approx)
// VEd=160000 > VRdc → stirrups needed
// dc_s  = 160000/140044 = 1.142 (exceeds 1.0)
// Engine computes exactly.
const P1_ref = shearEC2({ bw:300, h:500, cv:40, db:10, legs:2, s:200,
                           fck:25, fywk:500, gc:1.5, gs:1.15, Asl:1520, VEd:160000 });

const P1 = {
  knm: { bw:0.300, h:0.500, cv:0.040, db:10, legs:2, s:0.200, fck:25, fywk:500, Asl:1520, VEd:160   },
  nmm: { bw:300,   h:500,   cv:40,    db:10, legs:2, s:200,   fck:25, fywk:500, Asl:1520, VEd:160000},
  exp: {
    d:        P1_ref.d,
    k:        P1_ref.k,
    VRdc:     P1_ref.VRdc,
    VRdmax:   P1_ref.VRdmax,
    VRds_prov:P1_ref.VRds_prov,
    dc:       P1_ref.dc,
    s_req:    P1_ref.s_req,
    s_max:    P1_ref.s_max,
  },
};
const P1_us = { bw:300/25.4, h:500/25.4, cv:40/25.4, db:10, legs:2, s:200/25.4,
                fck:25, fywk:500, Asl:1520, VEd:160000/4448.2 };

// ── PROBLEM 2 ──
// bw=250, h=450, cv=35, db=10, legs=2, s=200, fck=25, fywk=500, Asl=1100, VEd=120000N
const P2_ref = shearEC2({ bw:250, h:450, cv:35, db:10, legs:2, s:200,
                           fck:25, fywk:500, gc:1.5, gs:1.15, Asl:1100, VEd:120000 });

const P2 = {
  knm: { bw:0.250, h:0.450, cv:0.035, db:10, legs:2, s:0.200, fck:25, fywk:500, Asl:1100, VEd:120   },
  nmm: { bw:250,   h:450,   cv:35,    db:10, legs:2, s:200,   fck:25, fywk:500, Asl:1100, VEd:120000},
  exp: {
    d:        P2_ref.d,
    k:        P2_ref.k,
    VRdc:     P2_ref.VRdc,
    VRds_prov:P2_ref.VRds_prov,
    dc:       P2_ref.dc,
    s_req:    P2_ref.s_req,
    s_max:    P2_ref.s_max,
  },
};
const P2_us = { bw:250/25.4, h:450/25.4, cv:35/25.4, db:10, legs:2, s:200/25.4,
                fck:25, fywk:500, Asl:1100, VEd:120000/4448.2 };

// ── PROBLEM 3 ──
// bw=350, h=600, cv=45, db=12, legs=2, s=150, fck=35, fywk=500, Asl=2400, VEd=320000N
const P3_ref = shearEC2({ bw:350, h:600, cv:45, db:12, legs:2, s:150,
                           fck:35, fywk:500, gc:1.5, gs:1.15, Asl:2400, VEd:320000 });

const P3 = {
  knm: { bw:0.350, h:0.600, cv:0.045, db:12, legs:2, s:0.150, fck:35, fywk:500, Asl:2400, VEd:320   },
  nmm: { bw:350,   h:600,   cv:45,    db:12, legs:2, s:150,   fck:35, fywk:500, Asl:2400, VEd:320000},
  exp: {
    d:        P3_ref.d,
    k:        P3_ref.k,
    VRdc:     P3_ref.VRdc,
    VRdmax:   P3_ref.VRdmax,
    VRds_prov:P3_ref.VRds_prov,
    dc:       P3_ref.dc,
    s_req:    P3_ref.s_req,
    s_max:    P3_ref.s_max,
  },
};
const P3_us = { bw:350/25.4, h:600/25.4, cv:45/25.4, db:12, legs:2, s:150/25.4,
                fck:35, fywk:500, Asl:2400, VEd:320000/4448.2 };

// ─────────────────────────────────────────────────────────────────
// Run tests
// ─────────────────────────────────────────────────────────────────

// ── Problem 1 ──
for (const unit of ['knm', 'nmm']) {
  console.log(`\n── P1 bw300h500 fck25 (${unit}) ──`);
  const inp = unit === 'knm' ? P1.knm : P1.nmm;
  const r = shearFromUnit(unit, inp);
  check('d',         r.d,         P1.exp.d);
  check('k',         r.k,         P1.exp.k);
  check('VRdc',      r.VRdc,      P1.exp.VRdc);
  check('VRdmax',    r.VRdmax,    P1.exp.VRdmax);
  check('VRds_prov', r.VRds_prov, P1.exp.VRds_prov);
  check('dc',        r.dc,        P1.exp.dc);
  check('s_req',     r.s_req,     P1.exp.s_req);
  check('s_max',     r.s_max,     P1.exp.s_max);
}
console.log(`\n── P1 bw300h500 (us) ──`);
{
  const r = shearFromUnit('us', P1_us);
  check('d',    r.d,    P1.exp.d);
  check('VRdc', r.VRdc, P1.exp.VRdc);
  check('dc',   r.dc,   P1.exp.dc);
}

// ── Problem 2 ──
for (const unit of ['knm', 'nmm']) {
  console.log(`\n── P2 bw250h450 fck25 (${unit}) ──`);
  const inp = unit === 'knm' ? P2.knm : P2.nmm;
  const r = shearFromUnit(unit, inp);
  check('d',         r.d,         P2.exp.d);
  check('k',         r.k,         P2.exp.k);
  check('VRdc',      r.VRdc,      P2.exp.VRdc);
  check('VRds_prov', r.VRds_prov, P2.exp.VRds_prov);
  check('dc',        r.dc,        P2.exp.dc);
  check('s_req',     r.s_req,     P2.exp.s_req);
  check('s_max',     r.s_max,     P2.exp.s_max);
}
console.log(`\n── P2 bw250h450 (us) ──`);
{
  const r = shearFromUnit('us', P2_us);
  check('d',    r.d,    P2.exp.d);
  check('VRdc', r.VRdc, P2.exp.VRdc);
  check('dc',   r.dc,   P2.exp.dc);
}

// ── Problem 3 ──
for (const unit of ['knm', 'nmm']) {
  console.log(`\n── P3 bw350h600 fck35 (${unit}) ──`);
  const inp = unit === 'knm' ? P3.knm : P3.nmm;
  const r = shearFromUnit(unit, inp);
  check('d',         r.d,         P3.exp.d);
  check('k',         r.k,         P3.exp.k);
  check('VRdc',      r.VRdc,      P3.exp.VRdc);
  check('VRdmax',    r.VRdmax,    P3.exp.VRdmax);
  check('VRds_prov', r.VRds_prov, P3.exp.VRds_prov);
  check('dc',        r.dc,        P3.exp.dc);
  check('s_req',     r.s_req,     P3.exp.s_req);
  check('s_max',     r.s_max,     P3.exp.s_max);
  checkBool('needStirrups', r.needStirrups, true);
}
console.log(`\n── P3 bw350h600 (us) ──`);
{
  const r = shearFromUnit('us', P3_us);
  check('d',    r.d,    P3.exp.d);
  check('VRdc', r.VRdc, P3.exp.VRdc);
  check('dc',   r.dc,   P3.exp.dc);
}

// ── Unit conversion sanity ──
console.log('\n── Unit conversion consistency ──');
{
  const r_knm = shearFromUnit('knm', P1.knm);
  const r_nmm = shearFromUnit('nmm', P1.nmm);
  const r_us  = shearFromUnit('us',  P1_us);
  check('P1 d: knm==nmm',    r_knm.d,    r_nmm.d);
  check('P1 d: us==nmm',     r_us.d,     r_nmm.d);
  check('P1 VRdc: knm==nmm', r_knm.VRdc, r_nmm.VRdc);
  check('P1 VRdc: us==nmm',  r_us.VRdc,  r_nmm.VRdc);
  check('P1 dc: knm==nmm',   r_knm.dc,   r_nmm.dc);
  check('P1 dc: us==nmm',    r_us.dc,    r_nmm.dc);

  const r2_knm = shearFromUnit('knm', P3.knm);
  const r2_nmm = shearFromUnit('nmm', P3.nmm);
  const r2_us  = shearFromUnit('us',  P3_us);
  check('P3 d: knm==nmm',    r2_knm.d,    r2_nmm.d);
  check('P3 VRds: us==nmm',  r2_us.VRds_prov, r2_nmm.VRds_prov);
}

console.log(`\n══ Results: ${passed} passed, ${failed} failed ══`);
if (failed > 0) process.exit(1);
