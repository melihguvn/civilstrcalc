/**
 * Development Length Calculation Engines
 * Extracted from pages/development-length.html — DOM-free, pure math.
 *
 * All internal quantities in SI: mm / MPa / N.
 * ACI imperial inputs are converted via the provided US wrapper.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// ACI 318-25 ENGINE  (§25.4.2 / §25.4.3 / §25.4.9 / §25.5)
// Inputs: db mm | fc MPa | fy MPa | factors dimensionless | cb/Ktr mm
// ─────────────────────────────────────────────────────────────────────────────
function calcAciSI({
  db,
  fc,
  fy,
  psi_t      = 1.0,
  psi_e      = 1.0,
  psi_r      = 1.0,   // §25.4.3 — confinement (90° hook only)
  psi_o      = 1.0,   // §25.4.3 — hook location
  lam        = 1.0,
  spliceClass = 'B',  // 'A' or 'B'
  detail      = false, // use explicit cb/Ktr when true
  cb          = 0,    // mm
  Ktr         = 0,    // mm
}) {
  // Auto-computed modification factors
  const psi_s   = (db <= 19) ? 0.8 : 1.0;                          // bar size
  const psi_g   = (fy <= 420) ? 1.0 : (fy <= 550 ? 1.15 : 1.3);   // steel grade
  const psi_te  = Math.min(psi_t * psi_e, 1.7);                     // top×coat cap

  // Confinement term (cb+Ktr)/db — capped at 2.5; conservative = 1.5
  let conf = detail ? Math.min(2.5, (cb + Ktr) / db) : 1.5;
  if (conf <= 0) conf = 1.5;

  const sqFc = Math.sqrt(fc);

  // ── Straight bar — tension (§25.4.2) ──
  const num_t = fy * psi_te * psi_s * psi_g * db;
  const den_t = 1.1 * lam * sqFc * conf;
  const ld_t  = Math.max(num_t / den_t, Math.max(300, 8 * db));

  // ── Straight bar — compression (§25.4.9.2, same formula all fy) ──
  const cf1  = (0.24 * fy * db) / (lam * sqFc);
  const cf2  = 0.043 * fy * db;
  const ld_c = Math.max(Math.max(cf1, cf2), 200);

  // ── Standard hooks (§25.4.3) — psi_r N/A for 180° ──
  const ldh90  = Math.max((fy * psi_e * psi_r * psi_o * db) / (4.57 * lam * sqFc),
                          Math.max(8 * db, 150));
  const ldh180 = Math.max((fy * psi_e * 1.0  * psi_o * db) / (4.57 * lam * sqFc),
                          Math.max(8 * db, 150));

  // ── Lap splices (§25.5) ──
  const sp_factor = (spliceClass === 'A') ? 1.0 : 1.3;
  const sp_t = Math.max(sp_factor * ld_t, Math.max(300, 8 * db));
  const sp_c = Math.max(ld_c, 300);

  // ── Bend geometry (§25.3.1) ──
  const r_int  = (db <= 25) ? 3 * db : 4 * db;
  const ext90  = 12 * db;
  const ext180 = Math.max(4 * db, 65);

  return {
    ld_t, ld_c, ldh90, ldh180, sp_t, sp_c,
    r_int, ext90, ext180,
    factors: { psi_s, psi_g, psi_te, conf, sqFc },
    minTensionGoverns:     (ld_t <= Math.max(300, 8 * db) + 0.001),
    minHookGoverns90:  (ldh90  <= Math.max(8 * db, 150) + 0.001),
    minHookGoverns180: (ldh180 <= Math.max(8 * db, 150) + 0.001),
  };
}

/**
 * ACI wrapper for US-customary inputs.
 * fc in psi, fy in psi, cb/Ktr in inches — all converted to SI before engine call.
 * db is always in mm (ACI bar size select stores mm regardless of display unit).
 */
function calcAciUS({ db, fc_psi, fy_psi, cb_in = 0, Ktr_in = 0, ...rest }) {
  return calcAciSI({
    db,
    fc:  fc_psi  / 145.038,
    fy:  fy_psi  / 145.038,
    cb:  cb_in   * 25.4,
    Ktr: Ktr_in  * 25.4,
    ...rest,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EC2 (EN 1992-1-1) ENGINE  (§8.4 / §8.7)
// Inputs: db mm | fck MPa | fyk MPa | alpha/eta factors dimensionless
// ─────────────────────────────────────────────────────────────────────────────
function calcEc2SI({
  db,
  fck,
  fyk,
  eta1 = 1.0,   // bond condition (1.0 good / 0.7 poor)
  a1   = 1.0,   // bar shape — hooks only (0.7 if cd>3φ)
  a2   = 1.0,   // concrete cover
  a3   = 1.0,   // transverse reinforcement
  a4   = 1.0,   // welded transverse bar (0.7 if present)
  a6   = 1.0,   // % bars lapped (splice)
}) {
  const eta2   = (db <= 32) ? 1.0 : (132 - db) / 100;            // bar diameter factor
  const fctm   = (fck <= 50)
    ? 0.30 * Math.pow(fck, 2 / 3)
    : 2.12 * Math.log(1 + (fck + 8) / 10);
  const fctd   = 0.7 * fctm / 1.5;
  const fbd    = 2.25 * eta1 * eta2 * fctd;
  const fyd    = fyk / 1.15;
  const lb_rqd = (db / 4) * (fyd / fbd);

  // Straight bar tension — α1=1.0 always (Table 8.2)
  const alpha_t = Math.max(1.0 * a2 * a3 * a4, 0.7);
  const lbd_t   = Math.max(alpha_t * lb_rqd,
                            Math.max(0.3 * lb_rqd, 10 * db, 100));

  // Compression — α1=1.0 per §8.4.1; minimum floor 0.6×lb,rqd
  const alpha_c = Math.max(1.0 * a2 * a3 * a4, 0.7);
  const lbd_c   = Math.max(alpha_c * lb_rqd,
                            Math.max(0.6 * lb_rqd, 10 * db, 100));

  // Hooks — α1 from input; α4 N/A per §8.4.4
  const alpha_h = Math.max(a1 * a2 * a3, 0.7);
  const lbd_h   = Math.max(alpha_h * lb_rqd,
                            Math.max(0.3 * lb_rqd, 10 * db, 100));

  // Lap splice — straight bar α1=1.0; α6 for lapping percentage
  const alpha_st = Math.max(1.0 * a2 * a3 * a4, 0.7) * a6;
  const l0_t     = Math.max(alpha_st * lb_rqd,
                             Math.max(0.3 * a6 * lb_rqd, 15 * db, 200));
  const alpha_sc = Math.max(1.0 * a2 * a3 * a4, 0.7) * a6;
  const l0_c     = Math.max(alpha_sc * lb_rqd,
                             Math.max(0.3 * a6 * lb_rqd, 15 * db, 200));

  // Mandrel geometry (Table 8.1n)
  const dm_min = (db <= 16) ? 4 * db : 7 * db;
  const r_int  = dm_min / 2;
  const ext    = Math.max(5 * db, 50);

  const lbd_t_min = Math.max(0.3 * lb_rqd, 10 * db, 100);
  const lbd_c_min = Math.max(0.6 * lb_rqd, 10 * db, 100);

  return {
    lb_rqd, lbd_t, lbd_c, lbd_h, l0_t, l0_c,
    r_int, ext,
    intermediate: { fctm, fctd, fbd, fyd, eta2, alpha_t, alpha_c, alpha_h },
    minTensionGoverns:     (lbd_t <= lbd_t_min + 0.001),
    minCompGoverns:        (lbd_c <= lbd_c_min + 0.001),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IS 456:2000 ENGINE  (§26.2)
// Inputs: db mm | tau_bd0 MPa (plain bar in tension, Table 21) | fy MPa |
//         barFac: 1.6 deformed / 1.0 plain round
// ─────────────────────────────────────────────────────────────────────────────
function calcIs456SI({ db, tau_bd0, fy, barFac = 1.6 }) {
  const tau_t = tau_bd0 * barFac;
  const Ld_t  = Math.max((db * 0.87 * fy) / (4 * tau_t),  200);

  const tau_c = tau_t * 1.25;
  const Ld_c  = Math.max((db * 0.87 * fy) / (4 * tau_c),  200);

  // Hook straight embedment = Ld_tension − hook_equivalent (§26.2.2)
  const hook90_emb  = Math.max(Ld_t -  8 * db, 200);
  const hook180_emb = Math.max(Ld_t - 16 * db, 200);

  const sp_t = Math.max(1.3 * Ld_t, 300);
  const sp_c = Math.max(Ld_c, 300);

  // Hook geometry (§26.1.2.4): internal radius = 2db for HYSD
  const r_int = 2 * db;
  const ext   = 4 * db;

  return {
    Ld_t, Ld_c,
    hook90_emb, hook180_emb,
    sp_t, sp_c,
    r_int, ext,
    minTensionGoverns: (Ld_t <= 200.001),
    minCompGoverns:    (Ld_c <= 200.001),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TS 500:2000 ENGINE  (§7.1 / §7.2 / §9.2)
// Inputs: db mm | fck MPa | fyk MPa
//   posFac  : 1.0 Position II (good bond) | 1.4 Position I (poor bond)
//   confComp: true → lb_c_raw × 0.75 (transverse reinforcement in compression)
//   alpha1  : splice factor α₁ = 1 + 0.5r  |  1.8 for full-tension section
// ─────────────────────────────────────────────────────────────────────────────
function calcTs500SI({
  db,
  fck,
  fyk,
  posFac   = 1.0,
  confComp = false,
  alpha1   = 1.17,
}) {
  const sqFck = Math.sqrt(fck);
  const fsd   = fyk / 1.15;

  const fbd_t = 0.40 * sqFck;
  const fbd_c = 0.50 * sqFck;

  const lb_t_raw_base = (db / 4) * (fsd / fbd_t);
  const lb_t_raw  = lb_t_raw_base * posFac;
  const lb_t_min  = Math.max(10 * db, 100);
  const lb_t      = Math.max(lb_t_raw, lb_t_min);

  let lb_c_raw  = (db / 4) * (fsd / fbd_c);
  if (confComp) lb_c_raw *= 0.75;
  const lb_c_min = Math.max(10 * db, 100);
  const lb_c     = Math.max(lb_c_raw, lb_c_min);

  const hookEq      = 5 * db;
  const hookMin     = Math.max(5 * db, 100);
  const hook90_emb  = Math.max(lb_t - hookEq, hookMin);
  const hook180_emb = Math.max(lb_t - hookEq, hookMin);

  const l0_t = Math.max(alpha1 * lb_t, Math.max(15 * db, 200));
  const l0_c = Math.max(lb_c, 200);

  return {
    lb_t, lb_c,
    fbd_t, fbd_c,
    hook90_emb, hook180_emb,
    l0_t, l0_c,
    lb_t_min, lb_c_min,
    minTensionGoverns: (lb_t <= lb_t_min + 0.001),
    minCompGoverns:    (lb_c <= lb_c_min + 0.001),
  };
}

module.exports = { calcAciSI, calcAciUS, calcEc2SI, calcIs456SI, calcTs500SI };
