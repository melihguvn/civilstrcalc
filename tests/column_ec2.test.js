/**
 * EC2 (EN 1992-1-1) Column Design (P-M Interaction) — Reference Test Suite
 *
 * Five reference problems × three unit systems = 15 test groups.
 * The engine mirrors calcCol('ec2') in pages/column.html exactly.
 *
 * Unit systems (mirrors UNITS in column.html):
 *   knm  →  m / kN / kN·m      lenS=1000  forceS=1000  momS=1e6
 *   nmm  →  mm / N / N·mm      lenS=1     forceS=1     momS=1
 *   us   →  in / kip / kip·ft  lenS=25.4  forceS=4448.2 momS=1.356e6
 *
 * IMPORTANT: fck, fyk, gc, gs are always in MPa/dimensionless for all unit
 * systems in column.html — no unit conversion applied to material properties.
 * dbar is always in mm (no lenS applied).
 *
 * Reference problems:
 *   P1  400×400, 8Ø20 (nb=3,nh=3), fck=25, fyk=500, γc=1.5, γs=1.15
 *       NEd=1200kN, Mx=120kN·m, My=0  — uniaxial x
 *   P2  400×400, 12Ø22 (nb=4,nh=4), fck=25, fyk=500, γc=1.5, γs=1.15
 *       NEd=1500kN, Mx=100kN·m, My=80kN·m  — biaxial
 *   P3  400×600, 12Ø25 (nb=4,nh=4), fck=35, fyk=500, γc=1.5, γs=1.15
 *       NEd=2000kN, Mx=200kN·m, My=80kN·m  — non-square, higher strength
 *   P4  500×500, 16Ø25 (nb=5,nh=5), fck=30, fyk=500, γc=1.5, γs=1.15
 *       NEd=4500kN, Mx=150kN·m, My=150kN·m  — high axial load
 *   P5  300×500, 8Ø20 (nb=3,nh=3), fck=25, fyk=500, γc=1.5, γs=1.15
 *       NEd=600kN, Mx=80kN·m, My=60kN·m  — slender, biaxial
 *
 * Run:  node tests/column_ec2.test.js
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Unit definitions (mirrors UNITS in column.html)
// ─────────────────────────────────────────────────────────────────
const UNITS = {
  knm: { lenS: 1000,  forceS: 1000,   momS: 1e6      },
  nmm: { lenS: 1,     forceS: 1,      momS: 1        },
  us:  { lenS: 25.4,  forceS: 4448.2, momS: 1.356e6  },
};

// ─────────────────────────────────────────────────────────────────
// BAR POSITIONS — exact copy of getBars() from column.html
// ─────────────────────────────────────────────────────────────────
function getBars(b, h, cover, dbar, nb, nh) {
  const bars = []; const seen = new Set();
  const add = (dx, dy) => {
    const k = dx.toFixed(2) + ',' + dy.toFixed(2);
    if (!seen.has(k)) { seen.add(k); bars.push({ dx, dy, A: Math.PI * dbar * dbar / 4 }); }
  };
  const Rh = h / 2 - cover, Rb = b / 2 - cover;
  for (let i = 0; i < nb; i++) {
    const dy = (nb > 1) ? -Rb + i * (2 * Rb / (nb - 1)) : 0;
    add(+Rh, dy);
    add(-Rh, dy);
  }
  for (let j = 0; j < nh; j++) {
    const dx = (nh > 1) ? -Rh + j * (2 * Rh / (nh - 1)) : 0;
    add(dx, +Rb);
    add(dx, -Rb);
  }
  return bars;
}

// ─────────────────────────────────────────────────────────────────
// P-M CURVE ENGINE — exact copy of buildCurve() from column.html
// ─────────────────────────────────────────────────────────────────
function buildCurve(b, h, cover, dbar, nb, nh, fc, fy, Es, isEC2, fcd, fyd, phi_min, axis) {
  const ecu    = isEC2 ? 0.0035 : 0.003;
  const fy_use = isEC2 ? fyd : fy;
  let lam, fc_eff;
  if (isEC2) {
    lam    = fc <= 50 ? 0.80 : Math.max(0.40, 0.80 - (fc - 50) / 400);
    const eta = fc <= 50 ? 1.00 : Math.max(0.60, 1.00 - (fc - 50) / 200);
    fc_eff = eta * fcd;
  } else {
    lam    = fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 28) / 7);
    fc_eff = 0.85 * fc;
  }

  const D  = axis === 'x' ? h : b;
  const Bw = axis === 'x' ? b : h;
  const allBars = getBars(b, h, cover, dbar, nb, nh);
  const barD = allBars.map(bar => ({ d: axis === 'x' ? bar.dx : bar.dy, A: bar.A }));

  const Ast   = barD.reduce((s, b) => s + b.A, 0);
  const Ag    = b * h;
  const d_min = Math.min(...barD.map(b => b.d));
  const dt    = D / 2 - d_min;

  let P0_cap;
  if (isEC2) {
    P0_cap = fc_eff * (Ag - Ast) + fy_use * Ast;
  } else {
    P0_cap = phi_min * 0.80 * (0.85 * fc * (Ag - Ast) + fy * Ast);
  }
  const points = [{ P: P0_cap, M: 0 }];

  const c_start = (D - 0.001) / lam;
  const c_end   = 0.5;
  const NSTEPS  = 300;

  for (let i = 1; i <= NSTEPS; i++) {
    const t = i / NSTEPS;
    const c = c_start * Math.pow(c_end / c_start, t);
    const a = lam * c;

    const Cc = fc_eff * Bw * a;
    const yC = D / 2 - a / 2;

    let Fs_sum = 0, Ms_sum = 0;
    barD.forEach(bar => {
      const dist_from_comp = D / 2 - bar.d;
      const eps_bar = ecu * (1 - dist_from_comp / c);
      const fs = Math.max(-fy_use, Math.min(fy_use, eps_bar * Es));
      const fc_sub = (dist_from_comp >= 0 && dist_from_comp <= a) ? fc_eff : 0;
      const Fbar = (fs - fc_sub) * bar.A;
      Fs_sum += Fbar;
      Ms_sum += Fbar * bar.d;
    });

    const P_nom = Cc + Fs_sum;
    const M_nom = Cc * yC + Ms_sum;

    let P_des, M_des;
    if (isEC2) {
      P_des = P_nom; M_des = M_nom;
    } else {
      const et  = dt > 0 ? ecu * (dt / c - 1) : 0.01;
      let phi;
      if (et >= 0.005)      phi = 0.90;
      else if (et <= 0.002) phi = phi_min;
      else                  phi = phi_min + (et - 0.002) * (0.90 - phi_min) / 0.003;
      P_des = phi * P_nom;
      M_des = phi * M_nom;
    }

    if (P_des > P0_cap) continue;
    points.push({ P: P_des, M: M_des });
  }

  const phi_t = isEC2 ? 1.0 : 0.90;
  points.push({ P: -phi_t * fy_use * Ast, M: 0 });
  points.sort((a, b) => b.P - a.P);
  return points;
}

// ─────────────────────────────────────────────────────────────────
// INTERPOLATE M at given P — exact copy of getM0() from column.html
// ─────────────────────────────────────────────────────────────────
function getM0(P, curve) {
  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].P >= P && curve[i + 1].P <= P) {
      const t = (P - curve[i].P) / (curve[i + 1].P - curve[i].P);
      return curve[i].M + t * (curve[i + 1].M - curve[i].M);
    }
  }
  if (P > curve[0].P) return 0;
  return 0;
}

// ─────────────────────────────────────────────────────────────────
// Main column engine — mirrors calcCol('ec2') in column.html
// All inputs in mm / MPa / N / N·mm
// ─────────────────────────────────────────────────────────────────
function columnEC2({ b, h, cv, dbar, nb, nh, fck, fyk, gc = 1.5, gs = 1.15, Es = 200000, NEd, Mx, My }) {
  nb = Math.max(2, Math.round(nb));
  nh = Math.max(2, Math.round(nh));

  const fcd = fck / gc;
  const fyd = fyk / gs;

  const bars = getBars(b, h, cv, dbar, nb, nh);
  const Ast  = bars.reduce((s, b) => s + b.A, 0);
  const Ag   = b * h;
  const rho  = Ast / Ag;

  const cx       = buildCurve(b, h, cv, dbar, nb, nh, fck, fyk, Es, true, fcd, fyd, 1.0, 'x');
  const cy_curve = buildCurve(b, h, cv, dbar, nb, nh, fck, fyk, Es, true, fcd, fyd, 1.0, 'y');

  const P0  = cx[0].P;
  const M0x = getM0(NEd, cx);
  const M0y = getM0(NEd, cy_curve);

  const dcr_x = M0x > 0 ? Math.abs(Mx) / M0x : (Math.abs(Mx) > 0 ? 999 : 0);
  const dcr_y = M0y > 0 ? Math.abs(My) / M0y : (Math.abs(My) > 0 ? 999 : 0);

  let dcr_bi = 0;
  if (M0x > 0 && M0y > 0) {
    const pRatio = Math.max(0, Math.min(1, NEd / P0));
    const alpha  = 1 + pRatio;
    dcr_bi = Math.pow(Math.abs(Mx / M0x), alpha) + Math.pow(Math.abs(My / M0y), alpha);
  } else if (M0x > 0) { dcr_bi = Math.abs(Mx / M0x); }
  else if (M0y > 0)   { dcr_bi = Math.abs(My / M0y); }

  const dcr_gov = Math.max(dcr_x, dcr_y, dcr_bi);

  return { Ast, Ag, rho, fcd, fyd, P0, M0x, M0y, dcr_x, dcr_y, dcr_bi, dcr_gov };
}

// ─────────────────────────────────────────────────────────────────
// Wrapper: unit conversion then engine call
// fck/fyk/gc/gs: always MPa/dimensionless — no scaling
// dbar: always mm
// ─────────────────────────────────────────────────────────────────
function colFromUnit(unit, inp) {
  const U = UNITS[unit];
  return columnEC2({
    b:    inp.b  * U.lenS,
    h:    inp.h  * U.lenS,
    cv:   inp.cv * U.lenS,
    dbar: inp.dbar,           // always mm
    nb:   inp.nb,
    nh:   inp.nh,
    fck:  inp.fck,            // always MPa
    fyk:  inp.fyk,            // always MPa
    gc:   inp.gc  ?? 1.5,
    gs:   inp.gs  ?? 1.15,
    Es:   inp.Es  ?? 200000,
    NEd:  inp.NEd * U.forceS,
    Mx:   inp.Mx  * U.momS,
    My:   inp.My  * U.momS,
  });
}

// ─────────────────────────────────────────────────────────────────
// Test runner
// ─────────────────────────────────────────────────────────────────
const TOL = 0.015;  // 1.5% — P-M curve is numerically approximated (300 steps)
let passed = 0, failed = 0;

function check(label, computed, expected, tol = TOL) {
  const err = Math.abs((computed - expected) / (Math.abs(expected) < 1e-9 ? 1 : expected));
  const ok  = err <= tol;
  console.log(`  ${ok ? '✓ PASS' : '✗ FAIL'}  ${label}`);
  if (!ok) console.log(`           computed=${computed.toFixed(5)}  expected=${expected.toFixed(5)}  err=${(err * 100).toFixed(3)}%`);
  ok ? passed++ : failed++;
}

// ─────────────────────────────────────────────────────────────────
// Reference problems — SI base (mm, MPa, N, N·mm)
//
// Hand-check for P1:
//   b=h=400, cv=50, dbar=20, nb=nh=3 → 8 bars
//   Ast = 8×π/4×400 = 2513.27 mm²,  Ag=160000,  ρ=1.57%
//   fcd = 25/1.5 = 16.667 MPa,  fyd = 500/1.15 = 434.783 MPa
//   λ=0.80 (fck=25≤50),  η=1.0 → fc_eff = 16.667 MPa
//   P0 (EC2) = 16.667×(160000−2513) + 434.783×2513
//            = 16.667×157487 + 434.783×2513
//            = 2,624,817 + 1,092,930 = 3,717,747 N ≈ 3718 kN
// ─────────────────────────────────────────────────────────────────

// ── P1: 400×400, 8Ø20, fck=25, fyk=500, NEd=1200kN, Mx=120kNm, My=0 ──
const P1_ref = columnEC2({ b:400, h:400, cv:50, dbar:20, nb:3, nh:3,
                            fck:25, fyk:500, gc:1.5, gs:1.15,
                            NEd:1200000, Mx:120e6, My:0 });

const P1 = {
  knm: { b:0.400, h:0.400, cv:0.050, dbar:20, nb:3, nh:3, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:1200, Mx:120, My:0 },
  nmm: { b:400, h:400, cv:50, dbar:20, nb:3, nh:3, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:1200000, Mx:120e6, My:0 },
  us:  { b:400/25.4, h:400/25.4, cv:50/25.4, dbar:20, nb:3, nh:3, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:1200000/4448.2, Mx:120e6/1.356e6, My:0 },
};

// ── P2: 400×400, 12Ø22, fck=25, fyk=500, biaxial ──
const P2_ref = columnEC2({ b:400, h:400, cv:50, dbar:22, nb:4, nh:4,
                            fck:25, fyk:500, gc:1.5, gs:1.15,
                            NEd:1500000, Mx:100e6, My:80e6 });

const P2 = {
  knm: { b:0.400, h:0.400, cv:0.050, dbar:22, nb:4, nh:4, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:1500, Mx:100, My:80 },
  nmm: { b:400, h:400, cv:50, dbar:22, nb:4, nh:4, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:1500000, Mx:100e6, My:80e6 },
  us:  { b:400/25.4, h:400/25.4, cv:50/25.4, dbar:22, nb:4, nh:4, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:1500000/4448.2, Mx:100e6/1.356e6, My:80e6/1.356e6 },
};

// ── P3: 400×600, 12Ø25, fck=35, fyk=500, biaxial ──
const P3_ref = columnEC2({ b:400, h:600, cv:50, dbar:25, nb:4, nh:4,
                            fck:35, fyk:500, gc:1.5, gs:1.15,
                            NEd:2000000, Mx:200e6, My:80e6 });

const P3 = {
  knm: { b:0.400, h:0.600, cv:0.050, dbar:25, nb:4, nh:4, fck:35, fyk:500, gc:1.5, gs:1.15,
         NEd:2000, Mx:200, My:80 },
  nmm: { b:400, h:600, cv:50, dbar:25, nb:4, nh:4, fck:35, fyk:500, gc:1.5, gs:1.15,
         NEd:2000000, Mx:200e6, My:80e6 },
  us:  { b:400/25.4, h:600/25.4, cv:50/25.4, dbar:25, nb:4, nh:4, fck:35, fyk:500, gc:1.5, gs:1.15,
         NEd:2000000/4448.2, Mx:200e6/1.356e6, My:80e6/1.356e6 },
};

// ── P4: 500×500, 16Ø25, fck=30, fyk=500, high axial ──
const P4_ref = columnEC2({ b:500, h:500, cv:50, dbar:25, nb:5, nh:5,
                            fck:30, fyk:500, gc:1.5, gs:1.15,
                            NEd:4500000, Mx:150e6, My:150e6 });

const P4 = {
  knm: { b:0.500, h:0.500, cv:0.050, dbar:25, nb:5, nh:5, fck:30, fyk:500, gc:1.5, gs:1.15,
         NEd:4500, Mx:150, My:150 },
  nmm: { b:500, h:500, cv:50, dbar:25, nb:5, nh:5, fck:30, fyk:500, gc:1.5, gs:1.15,
         NEd:4500000, Mx:150e6, My:150e6 },
  us:  { b:500/25.4, h:500/25.4, cv:50/25.4, dbar:25, nb:5, nh:5, fck:30, fyk:500, gc:1.5, gs:1.15,
         NEd:4500000/4448.2, Mx:150e6/1.356e6, My:150e6/1.356e6 },
};

// ── P5: 300×500, 8Ø20, fck=25, fyk=500, slender biaxial ──
const P5_ref = columnEC2({ b:300, h:500, cv:50, dbar:20, nb:3, nh:3,
                            fck:25, fyk:500, gc:1.5, gs:1.15,
                            NEd:600000, Mx:80e6, My:60e6 });

const P5 = {
  knm: { b:0.300, h:0.500, cv:0.050, dbar:20, nb:3, nh:3, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:600, Mx:80, My:60 },
  nmm: { b:300, h:500, cv:50, dbar:20, nb:3, nh:3, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:600000, Mx:80e6, My:60e6 },
  us:  { b:300/25.4, h:500/25.4, cv:50/25.4, dbar:20, nb:3, nh:3, fck:25, fyk:500, gc:1.5, gs:1.15,
         NEd:600000/4448.2, Mx:80e6/1.356e6, My:60e6/1.356e6 },
};

// ─────────────────────────────────────────────────────────────────
// Run tests
// ─────────────────────────────────────────────────────────────────

function runProblem(label, unitInputs, ref) {
  for (const unit of ['knm', 'nmm', 'us']) {
    console.log(`\n── ${label} (${unit}) ──`);
    const r = colFromUnit(unit, unitInputs[unit]);
    check('Ast',     r.Ast,     ref.Ast);
    check('P0',      r.P0,      ref.P0);
    check('M0x',     r.M0x,     ref.M0x);
    check('M0y',     r.M0y,     ref.M0y);
    check('dcr_x',   r.dcr_x,   ref.dcr_x);
    check('dcr_y',   r.dcr_y,   ref.dcr_y);
    check('dcr_bi',  r.dcr_bi,  ref.dcr_bi);
    check('dcr_gov', r.dcr_gov, ref.dcr_gov);
  }
}

runProblem('P1 400×400 8Ø20 fck25 uniaxial',  P1, P1_ref);
runProblem('P2 400×400 12Ø22 fck25 biaxial',  P2, P2_ref);
runProblem('P3 400×600 12Ø25 fck35 biaxial',  P3, P3_ref);
runProblem('P4 500×500 16Ø25 fck30 high-P',   P4, P4_ref);
runProblem('P5 300×500 8Ø20 fck25 slender',   P5, P5_ref);

// ── Unit conversion sanity ──
console.log('\n── Unit conversion consistency ──');
for (const { label, ui, ref } of [
  { label: 'P1', ui: P1, ref: P1_ref },
  { label: 'P2', ui: P2, ref: P2_ref },
  { label: 'P3', ui: P3, ref: P3_ref },
  { label: 'P4', ui: P4, ref: P4_ref },
]) {
  const r_knm = colFromUnit('knm', ui.knm);
  const r_nmm = colFromUnit('nmm', ui.nmm);
  const r_us  = colFromUnit('us',  ui.us);
  check(`${label} P0: knm==nmm`,      r_knm.P0,      r_nmm.P0);
  check(`${label} P0: us==nmm`,       r_us.P0,       r_nmm.P0);
  check(`${label} M0x: knm==nmm`,     r_knm.M0x,     r_nmm.M0x);
  check(`${label} M0x: us==nmm`,      r_us.M0x,      r_nmm.M0x);
  check(`${label} dcr_gov: knm==nmm`, r_knm.dcr_gov, r_nmm.dcr_gov);
  check(`${label} dcr_gov: us==nmm`,  r_us.dcr_gov,  r_nmm.dcr_gov);
}

// ── P0 hand-check for P1 ──
// 400×400, 8Ø20, fck=25, fyk=500, gc=1.5, gs=1.15
// fcd = 16.667 MPa,  fyd = 434.783 MPa,  η=1.0 → fc_eff=16.667
// Ast = 8 × π/4 × 400 = 2513.27 mm²,  Ag = 160000 mm²
// P0 = 16.667×(160000−2513.27) + 434.783×2513.27
//    = 16.667×157486.73 + 1,092,947 = 2,624,789 + 1,092,947 = 3,717,736 N ≈ 3718 kN
console.log('\n── P1 hand-check: Ast, fcd, P0 ──');
{
  const r = colFromUnit('nmm', P1.nmm);
  const Ast_exp = 8 * Math.PI / 4 * 400;   // 2513.27
  const fcd_exp = 25 / 1.5;                // 16.667
  const fyd_exp = 500 / 1.15;              // 434.783
  const P0_exp  = fcd_exp * (160000 - Ast_exp) + fyd_exp * Ast_exp;
  check('Ast (hand)', r.Ast, Ast_exp, 0.001);
  check('fcd (hand)', r.fcd, fcd_exp, 0.001);
  check('P0 (hand)',  r.P0,  P0_exp,  0.005);
}

// ── fcd/fyd independence from unit system ──
// Same MPa values regardless of lenS/forceS/momS
console.log('\n── Material properties unit-independent ──');
{
  const r_knm = colFromUnit('knm', P1.knm);
  const r_us  = colFromUnit('us',  P1.us);
  check('fcd: knm==us', r_knm.fcd, r_us.fcd, 0.001);
  check('fyd: knm==us', r_knm.fyd, r_us.fyd, 0.001);
}

console.log(`\n══ Results: ${passed} passed, ${failed} failed ══`);
if (failed > 0) process.exit(1);
