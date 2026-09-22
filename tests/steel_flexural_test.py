"""
Steel Flexural Design Calculator — Verification Test Suite
============================================================
Tests pages/steel-flexural.html calculation logic against reference examples.

Calculator assumption: compact section, full lateral bracing (Lb <= Lp assumed).
All section data extracted verbatim from the HTML DB const.

Codes:
  1. AISC LRFD  US  (kip, ft, in)  — W sections
  2. EC3         SI  (kN, m, mm)   — IPE, HEA sections
  3. IS 800:2000 SI                 — ISMB sections
  4. TSDS 2016   SI                 — IPE, HEA sections (same phi as AISC)
  5. AISC LRFD  SI                 — IPE sections

References cited per test.
"""
import math, sys

PASS, FAIL = "PASS", "FAIL"
results = []

def check(name, computed, expected, tol_pct=1.0, ref="", note=""):
    if expected == 0:
        ok = abs(computed) < 0.001
    else:
        err = abs(computed - expected) / abs(expected) * 100
        ok = err <= tol_pct
    results.append(dict(name=name, computed=computed, expected=expected,
                        err=0 if expected==0 else abs(computed-expected)/abs(expected)*100,
                        status=PASS if ok else FAIL, ref=ref, note=note))
    return ok


# ═══════════════════════════════════════════════════════════════════════════════
# RAW SECTION DATA  — verbatim from HTML DB; col[0] = name (mirrors JS row[0])
# Column indices match SEC_COLS exactly.
# ═══════════════════════════════════════════════════════════════════════════════

# W sections — SEC_COLS.W: {wt:6, I:7, Sx:8, Z:9, Zy:13}
# ['name', d, bf, tf, tw, A(in²), W(lb/ft), Ix(in⁴), Sx(in³), Zx(in³), rx, Iy, Sy, Zy, ry, J, Cw]
#  col:  0  1   2   3   4   5        6         7        8        9        10 11  12  13  14 15  16
W_DB = {
    'W18x35': ['W18x35',17.7,6.000,0.425,0.300,10.3, 35, 510, 57.6, 66.5,7.04,15.3, 5.12, 8.06,1.22,0.506,12900],
    'W14x48': ['W14x48',13.8,8.031,0.595,0.340,14.1, 48, 484, 70.2, 78.4,5.85,51.4,12.8, 19.6, 1.91,1.45,28000],
    'W24x62': ['W24x62',23.7,7.040,0.590,0.430,18.2, 62,1550,131,   153, 9.23,34.5, 9.80, 15.7,1.38,1.71,82800],
    'W16x31': ['W16x31',15.9,5.525,0.440,0.275, 9.12,31, 375, 47.2, 54.0,6.41,12.4, 4.49,  7.03,1.17,0.461,7650],
    'W10x33': ['W10x33', 9.73,7.96,0.435,0.290, 9.71,33, 171, 35.0, 38.8,4.19,36.6, 9.20, 13.9,1.94,0.583,942],
    'W21x44': ['W21x44',20.7,6.500,0.450,0.350,13.0, 44, 843, 81.6, 95.4,8.06,20.7, 6.36, 10.2,1.26,0.770,29700],
}
def w_wt(s):  return W_DB[s][6]    # lb/ft
def w_Ix(s):  return W_DB[s][7]    # in⁴
def w_Zx(s):  return W_DB[s][9]    # in³  (Z:9)
def w_Zy(s):  return W_DB[s][13]   # in³  (Zy:13)

# IPE sections — SEC_COLS.IPE: {wt:7, I:8, Wply:10}; fdGetWely uses row[9]
# ['name', h, b, tw, tf, r, A(cm²), G(kg/m), Iy(cm⁴), Wely(cm³), Wply(cm³), iy, Iz, Welz, Wplz, iz, J, Iw]
#  col:  0  1  2   3   4  5    6      7         8         9           10       11  12   13    14    15 16  17
IPE_DB = {
    'IPE 200': ['IPE 200',200,100, 5.6, 8.5,12,28.5,22.4, 1943, 194, 221, 8.26, 142, 28.5, 44.6,2.24, 6.846,12.99],
    'IPE 300': ['IPE 300',300,150, 7.1,10.7,15,53.8,42.2, 8356, 557, 628,12.5,  604, 80.5,  125,3.35,19.75,  126],
    'IPE 400': ['IPE 400',400,180, 8.6,13.5,21,84.5,66.3,23130,1156,1307,16.5, 1318, 146,   229,3.95,50.41,  490],
    'IPE 450': ['IPE 450',450,190, 9.4,14.6,21,98.8,77.6,33740,1500,1702,18.5, 1676, 176,   276,4.12,66.05,  791],
    'IPE 550': ['IPE 550',550,210,11.1,17.2,24, 134, 106,67120,2441,2787,22.3, 2668, 254,   401,4.45,121.7, 1926],
}
def ipe_wt(s):   return IPE_DB[s][7]    # kg/m
def ipe_Iy(s):   return IPE_DB[s][8]    # cm⁴
def ipe_Wely(s): return IPE_DB[s][9]    # cm³
def ipe_Wply(s): return IPE_DB[s][10]   # cm³
def ipe_h(s):    return IPE_DB[s][1]
def ipe_b(s):    return IPE_DB[s][2]
def ipe_tw(s):   return IPE_DB[s][3]
def ipe_tf(s):   return IPE_DB[s][4]
def ipe_r(s):    return IPE_DB[s][5]

# HEA sections — same column layout as IPE
HEA_DB = {
    'HEA 140': ['HEA 140',133,140, 5.5, 8.5,12,31.4,24.7, 1033, 155, 173, 5.73,  389, 55.6, 84.9,3.52,  8.13,  17.7],
    'HEA 200': ['HEA 200',190,200, 6.5,10.0,18,53.8,42.3, 3692, 389, 429, 8.28, 1336, 134,  204, 4.98, 20.6,   105],
    'HEA 240': ['HEA 240',230,240, 7.5,12.0,21,76.8,60.3, 7763, 675, 744,10.1,  2769, 231,  351, 6.00, 41.6,   312],
    'HEA 300': ['HEA 300',290,300, 8.5,14.0,27, 112,88.3,18260,1260,1383,12.8,  6310, 421,  641, 7.49, 96.2,  1199],
    'HEA 400': ['HEA 400',390,300,11.0,19.0,27, 159, 125,45070,2311,2562,16.8,  8564, 571,  868, 7.34, 196,   2726],
}
def hea_wt(s):   return HEA_DB[s][7]
def hea_Iy(s):   return HEA_DB[s][8]
def hea_Wely(s): return HEA_DB[s][9]
def hea_Wply(s): return HEA_DB[s][10]
def hea_h(s):    return HEA_DB[s][1]
def hea_b(s):    return HEA_DB[s][2]
def hea_tw(s):   return HEA_DB[s][3]
def hea_tf(s):   return HEA_DB[s][4]
def hea_r(s):    return HEA_DB[s][5]

# ISMB sections — SEC_COLS.ISMB: {wt:7, I:8, Wely:9, Wply:10}
# ['name', h, b, tw, tf, r, A(cm²), G(kg/m), Iy(cm⁴), Wely(cm³), Wply(cm³), iy, Iz, Welz, Wplz, iz]
#  col:  0  1  2   3   4  5    6       7         8         9           10       11  12   13    14   15
ISMB_DB = {
    'ISMB 200': ['ISMB 200',200,100, 5.7,10.8,11.0, 32.33,25.4, 2235, 224, 261, 8.32, 150, 30.1, 46.6,2.15],
    'ISMB 250': ['ISMB 250',250,125, 6.9,12.5,13.0, 47.55,37.3, 5132, 411, 480,10.39, 334, 53.4, 82.7,2.65],
    'ISMB 300': ['ISMB 300',300,140, 7.5,13.1,14.0, 58.64,46.1, 8690, 579, 678,12.18, 477, 68.2, 105, 2.85],
    'ISMB 400': ['ISMB 400',400,140, 8.9,16.0,14.0, 78.46,61.6,20458,1022,1202,16.14, 622, 88.8, 138, 2.82],
    'ISMB 500': ['ISMB 500',500,180,10.2,17.2,17.0,110.74,86.9,45218,1809,2115,20.21,1370, 152,  235, 3.52],
}
def ismb_wt(s):   return ISMB_DB[s][7]
def ismb_Iy(s):   return ISMB_DB[s][8]
def ismb_Wely(s): return ISMB_DB[s][9]
def ismb_Wply(s): return ISMB_DB[s][10]
def ismb_h(s):    return ISMB_DB[s][1]
def ismb_b(s):    return ISMB_DB[s][2]
def ismb_tw(s):   return ISMB_DB[s][3]
def ismb_tf(s):   return ISMB_DB[s][4]


# ═══════════════════════════════════════════════════════════════════════════════
# CALCULATOR LOGIC  — Python translation of JS (steel-flexural.html)
# ═══════════════════════════════════════════════════════════════════════════════

def aisc_phi_Mn_us(Fy_ksi, Zx_in3):
    """AISC 360-22 §F2: phiMn = 0.90 * Fy * Zx / 12  [kip·ft]"""
    return 0.9 * Fy_ksi * Zx_in3 / 12.0

def aisc_phi_Mn_si(Fy_MPa, Wply_cm3):
    """AISC 360-22 §F2 SI: phiMn = 0.90 * Fy * Wply / 1000  [kN·m]"""
    return 0.9 * Fy_MPa * Wply_cm3 / 1000.0

def ec3_class_I(h, b, tw, tf, r, fy):
    """EN 1993-1-1 Table 5.2 — I/H cross-section class.
    Returns (secClass, flangeClass, webClass, eps).
    cf = (b - tw - 2r)/2,  d = h - 2tf - 2r
    """
    eps = math.sqrt(235.0 / fy)
    cf  = (b - tw - 2*r) / 2.0;  cf_tf = cf / tf
    d   = h - 2*tf - 2*r;        d_tw  = d  / tw
    fc  = 1 if cf_tf <= 9*eps  else (2 if cf_tf <= 10*eps else (3 if cf_tf <= 14*eps  else 4))
    wc  = 1 if d_tw  <= 72*eps else (2 if d_tw  <= 83*eps else (3 if d_tw  <= 124*eps else 4))
    return max(fc, wc), fc, wc, eps, cf_tf, d_tw

def ec3_McRd(Wply, Wely, fy, gM0, sec_class):
    """EN 1993-1-1 §6.2.5: McRd [kN·m]. Class 1/2 -> Wply; Class 3 -> Wely."""
    W = Wply if sec_class <= 2 else Wely
    return W * fy / (gM0 * 1000.0)

def tsds_phi_Mn(Wply, Wely, fy, sec_class):
    """TSDS 2016 §11.1 (AISC phi=0.90): phiMn [kN·m]. Class 1/2 -> Wply."""
    W = Wply if sec_class <= 2 else Wely
    return 0.90 * W * fy / 1000.0

def is800_class_I(h, b, tw, tf, fy):
    """IS 800:2000 Table 2 — I section class.
    bf = (b - tw)/2,  d = h - 2tf
    Returns (secClass, flangeClass, webClass, eps).
    """
    eps = math.sqrt(250.0 / fy)
    bf  = (b - tw) / 2.0;  bf_tf = bf / tf
    d   = h - 2*tf;        d_tw  = d  / tw
    fc  = 1 if bf_tf <= 9.4*eps  else (2 if bf_tf <= 10.5*eps else (3 if bf_tf <= 15.7*eps else 4))
    wc  = 1 if d_tw  <= 84*eps   else (2 if d_tw  <= 105*eps  else (3 if d_tw  <= 126*eps  else 4))
    return max(fc, wc), fc, wc, eps

def is800_Md(Wply, Wely, fy, gm0, sec_class, bc='pp'):
    """IS 800:2000 §8.2.1.2: Design moment [kN·m].
    Class 1/2: Md = min(Wply*fyd, capFac*Wely*fyd) / 1000
    capFac = 1.5 (cantilever) or 1.2 (all others).
    """
    fyd = fy / gm0
    cap = 1.5 if bc == 'cant' else 1.2
    if sec_class <= 2:
        return min(Wply * fyd / 1000.0, cap * Wely * fyd / 1000.0)
    else:
        return (Wely or Wply) * fyd / 1000.0

def sw_us(wt_lbft):  return wt_lbft / 1000.0          # lb/ft -> kip/ft
def sw_si(G_kgm):    return G_kgm * 9.81 / 1000.0     # kg/m  -> kN/m

def asce7_combos(D, wL, wLr=0, wS=0, wW=0):
    """ASCE 7-22 §2.3.1 LRFD (D already includes self-weight)."""
    mx = max(wLr, wS)
    return max([1.4*D,
                1.2*D + 1.6*wL + 0.5*mx,
                1.2*D + 1.6*mx + max(wL, 0.5*wW),
                1.2*D + wW + wL + 0.5*mx,
                0.9*D + wW])

def en1990_combos(G, QL, QS=0, QW=0):
    """EN 1990 Eq. 6.10 ULS (G already includes self-weight)."""
    return max([1.35*G + 1.5*QL,
                1.35*G + 1.5*QL + 0.75*QS,
                1.35*G + 1.5*QL + 0.9*QW,
                1.35*G + 1.05*QL + 1.5*QS,
                1.35*G + 1.05*QL + 1.5*QW,
                0.9*G  + 1.5*QW])

def is875_combos(DL, IL, SL=0, WL=0):
    """IS 875 / IS 800 Table 4 ULS (DL already includes self-weight)."""
    return max([1.5*DL + 1.5*IL,
                1.5*DL + 1.5*SL,
                1.5*DL + 1.5*WL,
                1.2*DL + 1.2*IL + 1.2*WL,
                1.2*DL + 1.2*SL + 1.2*WL,
                0.9*DL + 1.5*WL])

def tsds_combos(G, Q, S=0, W=0):
    """TSDS 2016 LRFD (same as AISC; G already includes self-weight)."""
    return max([1.4*G,
                1.2*G + 1.6*Q + 0.5*S,
                1.2*G + 1.6*S + Q,
                1.2*G + 1.6*S + 0.5*W,
                1.2*G + W + Q + 0.5*S,
                0.9*G + W])

def Mu_pp(wu, L):   return wu * L * L / 8.0   # pin-pin: wL²/8
def Mu_ff(wu, L):   return wu * L * L / 12.0  # fixed-fixed: wL²/12
def Mu_cant(wu, L): return wu * L * L / 2.0   # cantilever: wL²/2
def Mu_fp(wu, L):   return 9 * wu * L * L / 128.0  # pin-fixed max +ve: 9wL²/128

def defl_pp_si(w_kNm, L_m, Iy_cm4):
    """Pin-pin deflection [mm]. w in kN/m (=N/mm), L in m, Iy in cm4. E=210 GPa."""
    L4 = (L_m * 1000) ** 4          # mm^4
    I  = Iy_cm4 * 1e4               # mm^4
    return 5 * w_kNm * L4 / (384 * 210000 * I)  # mm

def defl_pp_us(w_kipft, L_ft, Ix_in4):
    """Pin-pin deflection [in]. w in kip/ft, L in ft, Ix in in4. E=29000 ksi."""
    w = w_kipft / 12.0              # kip/in
    L = L_ft * 12.0                 # in
    return 5 * w * L**4 / (384 * 29000 * Ix_in4)


# ═══════════════════════════════════════════════════════════════════════════════
# ─────────────────── TEST SUITE 1: AISC LRFD — US (W sections) ───────────────
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*72)
print("TEST SUITE 1: AISC LRFD — US units  (W sections, Fy=50 ksi)")
print("="*72)

# ── 1.1  W18×35  Fy=50 ────────────────────────────────────────────────────────
# AISC SCM 16th Ed. Table 3-2: phiMpx = 249 kip·ft  (Zx=66.5 in³)
# Exact: 0.90 * 50 * 66.5 / 12 = 249.375 kip·ft
s='W18x35';Fy=50.0
v = aisc_phi_Mn_us(Fy, w_Zx(s))
check("1.1 AISC US W18×35 Fy=50 phiMn", v, 249.375, tol_pct=0.1,
      ref="AISC SCM 16th Ed. Table 3-2 phiMpx=249 kip·ft, Zx=66.5 in³")
print(f"  W18×35  phiMn = {v:.3f} kip·ft  (ref 249.375)")

# ── 1.2  W14×48  Fy=50 ────────────────────────────────────────────────────────
# AISC SCM 16th Ed. Table 3-2: phiMpx = 294 kip·ft  (Zx=78.4 in³)
s='W14x48';Fy=50.0
v = aisc_phi_Mn_us(Fy, w_Zx(s))
check("1.2 AISC US W14×48 Fy=50 phiMn", v, 294.0, tol_pct=0.1,
      ref="AISC SCM 16th Ed. Table 3-2 phiMpx=294 kip·ft, Zx=78.4 in³")
print(f"  W14×48  phiMn = {v:.3f} kip·ft  (ref 294.0)")

# ── 1.3  W24×62  Fy=50 ────────────────────────────────────────────────────────
# AISC SCM 16th Ed. Table 3-2: phiMpx = 574 kip·ft  (Zx=153 in³)
s='W24x62';Fy=50.0
v = aisc_phi_Mn_us(Fy, w_Zx(s))
check("1.3 AISC US W24×62 Fy=50 phiMn", v, 573.75, tol_pct=0.1,
      ref="AISC SCM 16th Ed. Table 3-2 phiMpx=574 kip·ft, Zx=153 in³")
print(f"  W24×62  phiMn = {v:.3f} kip·ft  (ref 573.75)")

# ── 1.4  W16×31  Fy=36 (A36) ─────────────────────────────────────────────────
# Segui "Steel Design" 6th Ed. Example 5.2: phiMn = 145.8 kip·ft
# Exact: 0.90 * 36 * 54.0 / 12 = 145.8 kip·ft  (Zx=54.0 in³)
s='W16x31';Fy=36.0
v = aisc_phi_Mn_us(Fy, w_Zx(s))
check("1.4 AISC US W16×31 Fy=36 (A36) phiMn", v, 145.8, tol_pct=0.1,
      ref="Segui 'Steel Design' 6th Ed. Example 5.2, phiMn=145.8 kip·ft")
print(f"  W16×31  phiMn = {v:.3f} kip·ft  (ref 145.8)")

# ── 1.5  W21×44  Fy=50, L=25 ft pin-pin: Mu, DCR ────────────────────────────
# wD=1.5 kip/ft, wL=2.5 kip/ft, sw=0.044 kip/ft
# D=1.544, wu=1.2*1.544+1.6*2.5=1.853+4=5.853 kip/ft (combo 2 governs)
# Mu=5.853*25^2/8=457.3 kip·ft
# phiMn=0.9*50*95.4/12=357.75 kip·ft → DCR=1.278 (overstressed, deliberate)
s='W21x44';Fy=50.0;L=25.0;wD=1.5;wL=2.5
sw = sw_us(w_wt(s))  # 0.044 kip/ft
D = wD + sw
wu = asce7_combos(D, wL)
Mu = Mu_pp(wu, L)
phi_Mn = aisc_phi_Mn_us(Fy, w_Zx(s))
DCR = Mu / phi_Mn
combo2 = 1.2*D + 1.6*wL
exp_DCR = Mu_pp(combo2, L) / phi_Mn
check("1.5a AISC US W21×44 ASCE 7-22 governing combo", wu, combo2, tol_pct=0.05,
      ref="ASCE 7-22 §2.3.1 combo 2=1.2D+1.6L governs for wL/wD>0.75")
check("1.5b AISC US W21×44 DCR (L=25ft, wD=1.5, wL=2.5)", DCR, exp_DCR, tol_pct=0.01,
      ref="AISC 360-22 §F2 interaction: DCR=Mu/phiMn")
print(f"  W21×44  sw={sw:.4f} kip/ft, wu={wu:.4f}, Mu={Mu:.2f} kip·ft, phiMn={phi_Mn:.2f}, DCR={DCR:.4f}")

# ── 1.6  Self-weight W18×35 ──────────────────────────────────────────────────
sw = sw_us(w_wt('W18x35'))
check("1.6 AISC US W18×35 self-weight", sw, 0.035, tol_pct=0.1,
      ref="W=35 lb/ft from AISC DB → 0.035 kip/ft")
print(f"  W18×35  self-weight = {sw:.4f} kip/ft  (ref 0.035)")

# ── 1.7  Deflection W18×35 ────────────────────────────────────────────────────
# wL=2 kip/ft, L=20 ft, Ix=510 in4, E=29000 ksi
# delta_L = 5*(2/12)*240^4/(384*29000*510) = 0.488 in; L/360=0.667 in → OK
delta_L = defl_pp_us(2.0, 20.0, w_Ix('W18x35'))
lim_L = 20 * 12 / 360
check("1.7 AISC US W18×35 live deflection L/360", delta_L, 0.488, tol_pct=1.0,
      ref="Classical: delta=5wL^4/384EI; w=2 kip/ft, L=20ft, Ix=510 in4, E=29000 ksi")
print(f"  W18×35  delta_L={delta_L:.3f} in,  L/360={lim_L:.3f} in  -> {'OK' if delta_L<=lim_L else 'NG'}")

# ── 1.8  Weak-axis Zy (for inclined beam) ─────────────────────────────────────
# W10×33 Zy=13.9 in³; phiMnz=0.9*50*13.9/12=52.125 kip·ft
s='W10x33';Zy=w_Zy(s)
phiMnz = aisc_phi_Mn_us(50.0, Zy)
check("1.8 AISC US W10×33 phiMnz weak axis", phiMnz, 52.125, tol_pct=0.1,
      ref="AISC SCM 16th Ed. Zy=13.9 in³ for W10x33")
print(f"  W10×33  Zy={Zy},  phiMnz={phiMnz:.3f} kip·ft  (ref 52.125)")


# ═══════════════════════════════════════════════════════════════════════════════
# ─────────────────── TEST SUITE 2: EC3 — IPE sections ────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*72)
print("TEST SUITE 2: EC3 EN 1993-1-1 — IPE sections (SI)")
print("="*72)
# All section properties from EN 10365 / ArcelorMittal 'Hot Rolled Products' (2023)
# at: https://sections.arcelormittal.com/
# McRd = Wpl,y * fy / gM0 / 1000 [kN·m] for Class 1/2

# ── 2.1  IPE 300, S355, gM0=1.0 ──────────────────────────────────────────────
# McRd = 628 * 355 / 1000 = 222.94 kN·m
# Ref: ArcelorMittal online table "Hot Rolled Products" IPE 300 row
s='IPE 300';fy=355.0;gM0=1.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(ipe_h(s),ipe_b(s),ipe_tw(s),ipe_tf(s),ipe_r(s),fy)
McRd = ec3_McRd(ipe_Wply(s), ipe_Wely(s), fy, gM0, sc)
exp = 628*355/1000.0
check("2.1 EC3 IPE 300 S355 gM0=1.0 McRd", McRd, exp, tol_pct=0.1,
      ref="EN 1993-1-1 §6.2.5, Wply=628 cm³; ArcelorMittal Hot Rolled table")
print(f"  IPE 300 S355: Class={sc}(fc={fc}/wc={wc}), McRd={McRd:.3f} kN·m  (ref {exp:.3f})")

# ── 2.2  IPE 450, S275, gM0=1.0 ──────────────────────────────────────────────
# McRd = 1702 * 275 / 1000 = 468.05 kN·m
s='IPE 450';fy=275.0;gM0=1.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(ipe_h(s),ipe_b(s),ipe_tw(s),ipe_tf(s),ipe_r(s),fy)
McRd = ec3_McRd(ipe_Wply(s), ipe_Wely(s), fy, gM0, sc)
exp = 1702*275/1000.0
check("2.2 EC3 IPE 450 S275 gM0=1.0 McRd", McRd, exp, tol_pct=0.1,
      ref="SCI P363 'Steel Designers Manual' 7th Ed §12, Wply=1702 cm³")
print(f"  IPE 450 S275: Class={sc}, McRd={McRd:.3f} kN·m  (ref {exp:.3f})")

# ── 2.3  IPE 200, S235, gM0=1.0 ──────────────────────────────────────────────
# McRd = 221 * 235 / 1000 = 51.935 kN·m
s='IPE 200';fy=235.0;gM0=1.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(ipe_h(s),ipe_b(s),ipe_tw(s),ipe_tf(s),ipe_r(s),fy)
McRd = ec3_McRd(ipe_Wply(s), ipe_Wely(s), fy, gM0, sc)
exp = 221*235/1000.0
check("2.3 EC3 IPE 200 S235 gM0=1.0 McRd", McRd, exp, tol_pct=0.1,
      ref="EN 1993-1-1 §6.2.5, Wply=221 cm³; EN 10365 table")
print(f"  IPE 200 S235: Class={sc}, McRd={McRd:.3f} kN·m  (ref {exp:.3f})")

# ── 2.4  IPE 300 classification detail ───────────────────────────────────────
# S355 eps=0.8136; cf=(150-7.1-2*15)/2=56.45; cf/tf=56.45/10.7=5.28 <= 9*0.814=7.32 → fc=1
# d=300-2*10.7-2*15=248.6; d/tw=248.6/7.1=35.0 <= 72*0.814=58.6 → wc=1
s='IPE 300';fy=355.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(ipe_h(s),ipe_b(s),ipe_tw(s),ipe_tf(s),ipe_r(s),fy)
check("2.4a EC3 IPE 300 S355 eps=sqrt(235/355)", eps, math.sqrt(235/355), tol_pct=0.01,
      ref="EN 1993-1-1 §5.5")
check("2.4b EC3 IPE 300 S355 flange Class 1", fc, 1, tol_pct=0,
      ref=f"cf/tf={cf_tf:.2f} <= 9*eps={9*eps:.2f}")
check("2.4c EC3 IPE 300 S355 web Class 1", wc, 1, tol_pct=0,
      ref=f"d/tw={d_tw:.1f} <= 72*eps={72*eps:.1f}")
print(f"  IPE 300 S355: eps={eps:.4f}, cf/tf={cf_tf:.2f}, d/tw={d_tw:.1f} -> Class {sc}")

# ── 2.5  IPE 400, S355, gM0=1.05 (Norwegian NDP) ────────────────────────────
# McRd = 1307 * 355 / (1.05 * 1000) = 441.89 kN·m
s='IPE 400';fy=355.0;gM0=1.05
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(ipe_h(s),ipe_b(s),ipe_tw(s),ipe_tf(s),ipe_r(s),fy)
McRd = ec3_McRd(ipe_Wply(s), ipe_Wely(s), fy, gM0, sc)
exp = 1307*355/(1.05*1000.0)
check("2.5 EC3 IPE 400 S355 gM0=1.05 McRd", McRd, exp, tol_pct=0.1,
      ref="EN 1993-1-1 §6.2.5, Wply=1307 cm³; gM0=1.05 per Norwegian NA")
print(f"  IPE 400 S355 gM0=1.05: Class={sc}, McRd={McRd:.3f} kN·m  (ref {exp:.3f})")

# ── 2.6  EN 1990 load combos ─────────────────────────────────────────────────
# G=20+sw kN/m, QL=30 kN/m; combo 1 = 1.35*G+1.5*QL (governs)
sw_i300 = sw_si(ipe_wt('IPE 300'))   # 42.2*9.81/1000 = 0.4140 kN/m
G = 20.0 + sw_i300;  QL = 30.0
wu = en1990_combos(G, QL)
exp_c1 = 1.35*G + 1.5*QL
check("2.6 EN 1990 combo 1 governs (G=20+sw, QL=30)", wu, exp_c1, tol_pct=0.01,
      ref="EN 1990 Eq. 6.10 combo 1 = 1.35G + 1.5QL")
print(f"  EN 1990 wu={wu:.4f} kN/m  (combo 1 = {exp_c1:.4f})")

# ── 2.7  IPE 300 deflection (SI) ─────────────────────────────────────────────
# wL=30 kN/m, L=6 m, Iy=8356 cm4 → delta=5*30*6000^4/(384*210000*83560000)
# = 5*30*1.2960e15/(384*210000*8.356e7) = 1.944e17 / 6.735e12 = 28.87 mm
# L/360 = 6000/360 = 16.67 mm → delta > limit (NG)
s='IPE 300';L=6.0;wL=30.0
dl = defl_pp_si(wL, L, ipe_Iy(s))
lim = L*1000/360
check("2.7 EC3 IPE 300 live deflection formula", dl,
      5*wL*(L*1000)**4/(384*210000*ipe_Iy(s)*1e4), tol_pct=0.01,
      note=f"delta_L={dl:.2f}mm, L/360={lim:.1f}mm -> {'OK' if dl<=lim else 'NG'}")
print(f"  IPE 300  delta_L={dl:.2f} mm,  L/360={lim:.1f} mm -> {'OK' if dl<=lim else 'NG'}")

# ── 2.8  Self-weight IPE 300 ─────────────────────────────────────────────────
sw = sw_si(ipe_wt('IPE 300'))   # 42.2 kg/m * 9.81/1000
check("2.8 EC3 IPE 300 self-weight (kN/m)", sw, round(42.2*9.81/1000,4), tol_pct=0.01,
      ref="G=42.2 kg/m from EN 10365 -> 0.4140 kN/m")
print(f"  IPE 300  sw={sw:.4f} kN/m  (ref 0.4140)")


# ═══════════════════════════════════════════════════════════════════════════════
# ─────────────────── TEST SUITE 3: EC3 — HEA sections ────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*72)
print("TEST SUITE 3: EC3 EN 1993-1-1 — HEA sections (SI)")
print("="*72)
# Ref: ECCS Technical Committee 8 "Worked Examples" N°119; EN 10365

# ── 3.1  HEA 200, S275, gM0=1.0 ──────────────────────────────────────────────
# McRd = 429 * 275 / 1000 = 117.975 kN·m (Class 1 confirmed below)
s='HEA 200';fy=275.0;gM0=1.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(hea_h(s),hea_b(s),hea_tw(s),hea_tf(s),hea_r(s),fy)
McRd = ec3_McRd(hea_Wply(s), hea_Wely(s), fy, gM0, sc)
exp = 429*275/1000.0   # Wply=429 assumed; Class 1 -> uses Wply
check("3.1 EC3 HEA 200 S275 gM0=1.0 McRd", McRd, exp, tol_pct=0.5,
      ref="ECCS N°119 example; Wply=429 cm³ from EN 10365")
print(f"  HEA 200 S275: Class={sc}(fc={fc}/wc={wc}), McRd={McRd:.3f} kN·m  (ref {exp:.3f})")

# ── 3.2  HEA 300, S355, gM0=1.0 ──────────────────────────────────────────────
# HEA 300: h=290, b=300, tw=8.5, tf=14.0, r=27, S355 eps=0.8136
# cf=(300-8.5-54)/2=118.75; cf/tf=118.75/14=8.48; 9eps=7.32 -> NOT C1; 10eps=8.14 -> NOT C2
# 14eps=11.39 -> C3  (flange governs)  --> uses Wely=1260 cm³
# McRd = 1260 * 355 / 1000 = 447.3 kN·m
s='HEA 300';fy=355.0;gM0=1.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(hea_h(s),hea_b(s),hea_tw(s),hea_tf(s),hea_r(s),fy)
McRd = ec3_McRd(hea_Wply(s), hea_Wely(s), fy, gM0, sc)
exp = hea_Wely(s)*fy/1000.0  # Class 3 -> Wely=1260
check("3.2 EC3 HEA 300 S355 gM0=1.0 McRd (Class 3, uses Wely)", McRd, exp, tol_pct=0.1,
      ref="EN 1993-1-1 §6.2.5 Class 3; Wely=1260 cm³, Wply=1383 cm³ from EN 10365")
print(f"  HEA 300 S355: Class={sc}(fc={fc}/wc={wc}), Wely={hea_Wely(s)}, McRd={McRd:.3f} kN·m  (ref {exp:.3f})")

# ── 3.3  HEA 300, S235, gM0=1.0 (same section, lower steel) ─────────────────
# S235 eps=1.0; cf/tf=8.48 <= 9*1=9 -> fc=1; d/tw=24.5 <= 72 -> wc=1 -> Class 1
# McRd = 1383 * 235 / 1000 = 325.005 kN·m  (uses Wply)
s='HEA 300';fy=235.0;gM0=1.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(hea_h(s),hea_b(s),hea_tw(s),hea_tf(s),hea_r(s),fy)
McRd = ec3_McRd(hea_Wply(s), hea_Wely(s), fy, gM0, sc)
exp = hea_Wply(s)*fy/1000.0   # Class 1 -> Wply=1383
check("3.3 EC3 HEA 300 S235 gM0=1.0 McRd (Class 1, uses Wply)", McRd, exp, tol_pct=0.1,
      ref="EN 1993-1-1 §6.2.5 Class 1; Wply=1383 cm³, fy=235 MPa")
print(f"  HEA 300 S235: Class={sc}(fc={fc}/wc={wc}), McRd={McRd:.3f} kN·m  (ref {exp:.3f})")

# ── 3.4  HEA 140, S235, gM0=1.0 ─────────────────────────────────────────────
# McRd = 173 * 235 / 1000 = 40.655 kN·m
s='HEA 140';fy=235.0;gM0=1.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(hea_h(s),hea_b(s),hea_tw(s),hea_tf(s),hea_r(s),fy)
McRd = ec3_McRd(hea_Wply(s), hea_Wely(s), fy, gM0, sc)
exp = hea_Wply(s)*fy/1000.0
check("3.4 EC3 HEA 140 S235 gM0=1.0 McRd", McRd, exp, tol_pct=0.1,
      ref="EN 1993-1-1 §6.2.5; Wply=173 cm³")
print(f"  HEA 140 S235: Class={sc}, McRd={McRd:.3f} kN·m  (ref {exp:.3f})")

# ── 3.5  HEA 240, S355 — Class 2 flange ──────────────────────────────────────
# cf=(240-7.5-42)/2=95.25; cf/tf=95.25/12=7.94; 9eps=7.32<7.94<=10eps=8.14 -> fc=2
# still uses Wply for Class 2
s='HEA 240';fy=355.0;gM0=1.0
sc,fc,wc,eps,cf_tf,d_tw = ec3_class_I(hea_h(s),hea_b(s),hea_tw(s),hea_tf(s),hea_r(s),fy)
McRd = ec3_McRd(hea_Wply(s), hea_Wely(s), fy, gM0, sc)
check("3.5 EC3 HEA 240 S355 section class = 2 (flange governs)", fc, 2, tol_pct=0,
      ref=f"cf/tf={cf_tf:.2f}: 9eps={9*eps:.2f}<cf/tf<=10eps={10*eps:.2f} -> Class 2")
print(f"  HEA 240 S355: fc={fc}, wc={wc} -> Class {sc}, cf/tf={cf_tf:.2f}, McRd={McRd:.3f} kN·m")


# ═══════════════════════════════════════════════════════════════════════════════
# ─────────────────── TEST SUITE 4: IS 800:2000 — ISMB sections ───────────────
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*72)
print("TEST SUITE 4: IS 800:2000 — ISMB sections (SI, gm0=1.10)")
print("="*72)
# References:
#   IS 800:2000 §8.2.1.2 design moment formula
#   IS 808:1989 section properties
#   Arya & Ajmani "Design of Steel Structures" (Nem Chand & Bros)

def is800_ref(Wply, Wely, fy, gm0, bc='pp'):
    """Hand-calculated reference Md for IS800."""
    fyd = fy / gm0
    cap = 1.5 if bc == 'cant' else 1.2
    return round(min(Wply*fyd/1000, cap*Wely*fyd/1000), 4)

# ── 4.1  ISMB 200, E250A (Fy=250), gm0=1.10, pin-pin ────────────────────────
# fyd=227.27; Md_pl=261*227.27/1000=59.32; Md_cap=1.2*224*227.27/1000=61.07 -> Md=59.32
s='ISMB 200';Fy=250.0;gm0=1.10
sc,fc,wc,eps = is800_class_I(ismb_h(s),ismb_b(s),ismb_tw(s),ismb_tf(s),Fy)
Md = is800_Md(ismb_Wply(s), ismb_Wely(s), Fy, gm0, sc, bc='pp')
exp = is800_ref(ismb_Wply(s), ismb_Wely(s), Fy, gm0)
check("4.1 IS800 ISMB 200 E250A Md", Md, exp, tol_pct=0.1,
      ref="IS 800:2000 §8.2.1.2; Wply=261, Wely=224 cm³ from IS 808:1989")
print(f"  ISMB 200 E250A: Class={sc}, Md={Md:.3f} kN·m  (ref {exp:.4f})")

# ── 4.2  ISMB 300, E250A, gm0=1.10 ──────────────────────────────────────────
# fyd=227.27; Md_pl=678*227.27/1000=154.09; Md_cap=1.2*579*227.27/1000=157.99 -> 154.09
s='ISMB 300';Fy=250.0;gm0=1.10
sc,fc,wc,eps = is800_class_I(ismb_h(s),ismb_b(s),ismb_tw(s),ismb_tf(s),Fy)
Md = is800_Md(ismb_Wply(s), ismb_Wely(s), Fy, gm0, sc, bc='pp')
exp = is800_ref(ismb_Wply(s), ismb_Wely(s), Fy, gm0)
check("4.2 IS800 ISMB 300 E250A Md", Md, exp, tol_pct=0.1,
      ref="IS 800:2000 §8.2.1.2; Wply=678, Wely=579 cm³ from IS 808:1989")
print(f"  ISMB 300 E250A: Class={sc}, Md={Md:.3f} kN·m  (ref {exp:.4f})")

# ── 4.3  ISMB 500, E250A, gm0=1.10 ──────────────────────────────────────────
# fyd=227.27; Md_pl=2115*227.27/1000=480.68; Md_cap=1.2*1809*227.27/1000=493.19 -> 480.68
s='ISMB 500';Fy=250.0;gm0=1.10
sc,fc,wc,eps = is800_class_I(ismb_h(s),ismb_b(s),ismb_tw(s),ismb_tf(s),Fy)
Md = is800_Md(ismb_Wply(s), ismb_Wely(s), Fy, gm0, sc, bc='pp')
exp = is800_ref(ismb_Wply(s), ismb_Wely(s), Fy, gm0)
check("4.3 IS800 ISMB 500 E250A Md", Md, exp, tol_pct=0.1,
      ref="IS 800:2000 §8.2.1.2; Wply=2115, Wely=1809 cm³ from IS 808:1989")
print(f"  ISMB 500 E250A: Class={sc}, Md={Md:.3f} kN·m  (ref {exp:.4f})")

# ── 4.4  ISMB 250, E350 (Fy=350), gm0=1.10 ───────────────────────────────────
# eps=sqrt(250/350)=0.845; bf=(125-6.9)/2=59.05; bf/tf=59.05/12.5=4.72<=9.4*0.845=7.94 -> fc=1
# d=250-2*12.5=225; d/tw=225/6.9=32.6<=84*0.845=71.0 -> wc=1 -> Class 1
# fyd=318.18; Md_pl=480*318.18/1000=152.73; Md_cap=1.2*411*318.18/1000=156.90 -> 152.73
s='ISMB 250';Fy=350.0;gm0=1.10
sc,fc,wc,eps = is800_class_I(ismb_h(s),ismb_b(s),ismb_tw(s),ismb_tf(s),Fy)
Md = is800_Md(ismb_Wply(s), ismb_Wely(s), Fy, gm0, sc, bc='pp')
exp = is800_ref(ismb_Wply(s), ismb_Wely(s), Fy, gm0)
check("4.4 IS800 ISMB 250 E350 Md", Md, exp, tol_pct=0.1,
      ref="IS 800:2000 §8.2.1.2; E350 (IS 2062); Wply=480, Wely=411 cm³")
print(f"  ISMB 250 E350: Class={sc} (eps={eps:.3f}), Md={Md:.3f} kN·m  (ref {exp:.4f})")

# ── 4.5  IS 875 load combos ──────────────────────────────────────────────────
# DL=20+sw kN/m, IL=25 kN/m; sw=46.1*9.81/1000=0.452 kN/m
sw_i300 = sw_si(ismb_wt('ISMB 300'))
DL = 20.0 + sw_i300;  IL = 25.0
wu = is875_combos(DL, IL)
exp_c1 = 1.5*DL + 1.5*IL
check("4.5 IS 875 combo 1 = 1.5DL + 1.5IL governs", wu, exp_c1, tol_pct=0.01,
      ref="IS 800:2000 Table 4 combo 1 = 1.5DL+1.5IL (no wind)")
print(f"  IS 875 wu={wu:.4f} kN/m  (combo 1 = {exp_c1:.4f})")

# ── 4.6  ISMB 400, E350, gm0=1.10 ────────────────────────────────────────────
# fyd=318.18; Md_pl=1202*318.18/1000=382.47; Md_cap=1.2*1022*318.18/1000=390.05 -> 382.47
s='ISMB 400';Fy=350.0;gm0=1.10
sc,fc,wc,eps = is800_class_I(ismb_h(s),ismb_b(s),ismb_tw(s),ismb_tf(s),Fy)
Md = is800_Md(ismb_Wply(s), ismb_Wely(s), Fy, gm0, sc, bc='pp')
exp = is800_ref(ismb_Wply(s), ismb_Wely(s), Fy, gm0)
check("4.6 IS800 ISMB 400 E350 Md", Md, exp, tol_pct=0.1,
      ref="IS 800:2000 §8.2.1.2; Wply=1202, Wely=1022 cm³ from IS 808:1989")
print(f"  ISMB 400 E350: Class={sc}, Md={Md:.3f} kN·m  (ref {exp:.4f})")


# ═══════════════════════════════════════════════════════════════════════════════
# ─────────────────── TEST SUITE 5: TSDS 2016 — SI ────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*72)
print("TEST SUITE 5: TSDS 2016 — IPE / HEA sections (SI)")
print("="*72)
# TSDS 2016 §11.1: phi=0.90, same section classes as EC3, load combos same as AISC.
# phiMn = 0.90 * Wply * Fy / 1000  [kN·m] for Class 1/2.

# ── 5.1  IPE 300, S355 ───────────────────────────────────────────────────────
# phiMn = 0.90 * 628 * 355 / 1000 = 200.646 kN·m
s='IPE 300';fy=355.0
sc,*_ = ec3_class_I(ipe_h(s),ipe_b(s),ipe_tw(s),ipe_tf(s),ipe_r(s),fy)
v = tsds_phi_Mn(ipe_Wply(s), ipe_Wely(s), fy, sc)
exp = 0.9*628*355/1000.0
check("5.1 TSDS IPE 300 S355 phiMn", v, exp, tol_pct=0.1,
      ref="TSDS 2016 §11.1 phi=0.90; Wply=628 cm³")
print(f"  IPE 300 S355: Class={sc}, phiMn={v:.3f} kN·m  (ref {exp:.3f})")

# ── 5.2  HEA 200, S355 ───────────────────────────────────────────────────────
# phiMn = 0.90 * 429 * 355 / 1000 = 137.065 kN·m
s='HEA 200';fy=355.0
sc,*_ = ec3_class_I(hea_h(s),hea_b(s),hea_tw(s),hea_tf(s),hea_r(s),fy)
v = tsds_phi_Mn(hea_Wply(s), hea_Wely(s), fy, sc)
exp = 0.9*429*355/1000.0
check("5.2 TSDS HEA 200 S355 phiMn", v, exp, tol_pct=0.1,
      ref="TSDS 2016 §11.1 phi=0.90; Wply=429 cm³")
print(f"  HEA 200 S355: Class={sc}, phiMn={v:.3f} kN·m  (ref {exp:.3f})")

# ── 5.3  IPE 450, S275 ───────────────────────────────────────────────────────
# phiMn = 0.90 * 1702 * 275 / 1000 = 421.245 kN·m
s='IPE 450';fy=275.0
sc,*_ = ec3_class_I(ipe_h(s),ipe_b(s),ipe_tw(s),ipe_tf(s),ipe_r(s),fy)
v = tsds_phi_Mn(ipe_Wply(s), ipe_Wely(s), fy, sc)
exp = 0.9*1702*275/1000.0
check("5.3 TSDS IPE 450 S275 phiMn", v, exp, tol_pct=0.1,
      ref="TSDS 2016 §11.1 phi=0.90; Wply=1702 cm³")
print(f"  IPE 450 S275: Class={sc}, phiMn={v:.3f} kN·m  (ref {exp:.3f})")

# ── 5.4  TSDS == AISC SI (same phi) ──────────────────────────────────────────
tsds_v = tsds_phi_Mn(ipe_Wply('IPE 300'), ipe_Wely('IPE 300'), 355.0, 1)
aisc_v  = aisc_phi_Mn_si(355.0, ipe_Wply('IPE 300'))
check("5.4 TSDS == AISC SI (phi=0.90, Class 1)", tsds_v, aisc_v, tol_pct=0.01,
      ref="Both use phi=0.90 * Wply * Fy / 1000")
print(f"  TSDS={tsds_v:.3f}, AISC SI={aisc_v:.3f} -> {'same' if abs(tsds_v-aisc_v)<0.001 else 'DIFFER'}")

# ── 5.5  TSDS load combos ────────────────────────────────────────────────────
# G=15, Q=20 -> combo2=1.2*15+1.6*20=18+32=50 kN/m governs
wu = tsds_combos(15.0, 20.0)
check("5.5 TSDS combo 2 = 1.2G+1.6Q governs (G=15, Q=20)", wu, 1.2*15+1.6*20, tol_pct=0.01,
      ref="TSDS 2016 LRFD combo 2")
print(f"  TSDS wu={wu:.3f} kN/m  (combo 2 = {1.2*15+1.6*20:.3f})")

# ── 5.6  IPE 550, S235 ───────────────────────────────────────────────────────
# phiMn = 0.90 * 2787 * 235 / 1000 = 589.34 kN·m (Wply=2787)
s='IPE 550';fy=235.0
sc,*_ = ec3_class_I(ipe_h(s),ipe_b(s),ipe_tw(s),ipe_tf(s),ipe_r(s),fy)
v = tsds_phi_Mn(ipe_Wply(s), ipe_Wely(s), fy, sc)
exp = 0.9*2787*235/1000.0
check("5.6 TSDS IPE 550 S235 phiMn", v, exp, tol_pct=0.1,
      ref="TSDS 2016 §11.1; Wply=2787 cm³")
print(f"  IPE 550 S235: Class={sc}, phiMn={v:.3f} kN·m  (ref {exp:.3f})")


# ═══════════════════════════════════════════════════════════════════════════════
# ─────────────────── TEST SUITE 6: AISC LRFD — SI (IPE) ─────────────────────
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*72)
print("TEST SUITE 6: AISC LRFD — SI units (IPE sections)")
print("="*72)

# ── 6.1  IPE 300, S355 ───────────────────────────────────────────────────────
v = aisc_phi_Mn_si(355.0, ipe_Wply('IPE 300'))
exp = 0.9*628*355/1000.0
check("6.1 AISC SI IPE 300 S355 phiMn", v, exp, tol_pct=0.1,
      ref="AISC 360-22 §F2 SI; phiMn=0.9*Fy*Wply/1000, Wply=628 cm³")
print(f"  IPE 300 S355: phiMn={v:.3f} kN·m  (ref {exp:.3f})")

# ── 6.2  IPE 200, S275 ───────────────────────────────────────────────────────
v = aisc_phi_Mn_si(275.0, ipe_Wply('IPE 200'))
exp = 0.9*221*275/1000.0
check("6.2 AISC SI IPE 200 S275 phiMn", v, exp, tol_pct=0.1,
      ref="AISC 360-22 §F2 SI; Wply=221 cm³")
print(f"  IPE 200 S275: phiMn={v:.3f} kN·m  (ref {exp:.3f})")

# ── 6.3  IPE 450, S355 ───────────────────────────────────────────────────────
v = aisc_phi_Mn_si(355.0, ipe_Wply('IPE 450'))
exp = 0.9*1702*355/1000.0
check("6.3 AISC SI IPE 450 S355 phiMn", v, exp, tol_pct=0.1,
      ref="AISC 360-22 §F2 SI; Wply=1702 cm³")
print(f"  IPE 450 S355: phiMn={v:.3f} kN·m  (ref {exp:.3f})")

# ── 6.4  Self-weight SI ───────────────────────────────────────────────────────
sw = sw_si(ipe_wt('IPE 300'))
check("6.4 AISC SI IPE 300 self-weight (kN/m)", sw, round(42.2*9.81/1000,4), tol_pct=0.01,
      ref="G=42.2 kg/m * 9.81/1000 = 0.4140 kN/m")
print(f"  IPE 300 sw={sw:.4f} kN/m  (ref 0.4140)")

# ── 6.5  IPE 300 deflection ──────────────────────────────────────────────────
# wL=20 kN/m, L=5 m -> delta=5*20*5000^4/(384*210000*8356e4)=5.0mm; L/360=13.9mm -> OK
dl = defl_pp_si(20.0, 5.0, ipe_Iy('IPE 300'))
lim = 5.0*1000/360
check("6.5 AISC SI IPE 300 live deflection", dl,
      5*20*(5000)**4/(384*210000*ipe_Iy('IPE 300')*1e4), tol_pct=0.01,
      note=f"delta_L={dl:.2f}mm, L/360={lim:.1f}mm -> {'OK' if dl<=lim else 'NG'}")
print(f"  IPE 300  delta_L={dl:.2f} mm,  L/360={lim:.1f} mm -> {'OK' if dl<=lim else 'NG'}")


# ═══════════════════════════════════════════════════════════════════════════════
# ─────────────────── TEST SUITE 7: Moment coefficients & boundary conditions ──
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*72)
print("TEST SUITE 7: Moment and deflection coefficients (all codes)")
print("="*72)

wu=10.0; L=8.0
check("7.1 Pin-pin    Mu = wL²/8",     Mu_pp(wu,L),   80.0,  tol_pct=0.01, ref="Classical structural mechanics")
check("7.2 Fixed-fixed Mu = wL²/12",   Mu_ff(wu,L),   wu*L*L/12, tol_pct=0.01, ref="Classical structural mechanics")
check("7.3 Cantilever  Mu = wL²/2",    Mu_cant(wu,L), 320.0, tol_pct=0.01, ref="Classical structural mechanics")
check("7.4 Pin-fixed   Mu = 9wL²/128", Mu_fp(wu,L),   9*640/128, tol_pct=0.01, ref="Max +ve moment at 3L/8")
print(f"  Mu: pp={Mu_pp(wu,L):.2f}, ff={Mu_ff(wu,L):.3f}, cant={Mu_cant(wu,L):.2f}, fp={Mu_fp(wu,L):.3f}")

check("7.5 Cd pin-pin    = 5/384",  5/384,   5/384,   tol_pct=0.01, ref="delta=5wL^4/384EI")
check("7.6 Cd fixed-fixed = 1/384", 1/384,   1/384,   tol_pct=0.01, ref="delta=wL^4/384EI")
check("7.7 Cd cantilever = 1/8",    1/8,     1/8,     tol_pct=0.01, ref="delta=wL^4/8EI at free end")
print(f"  Cd: pp={5/384:.5f}, ff={1/384:.5f}, cant={1/8:.5f}")


# ═══════════════════════════════════════════════════════════════════════════════
# RESULTS SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*72)
print("RESULTS SUMMARY")
print("="*72)
n_pass = sum(1 for r in results if r['status']==PASS)
n_fail = sum(1 for r in results if r['status']==FAIL)
n_total = len(results)

print(f"\n{'Test':<52} {'Status':<7} {'Computed':>11} {'Expected':>11} {'Err%':>7}")
print("-"*94)
for r in results:
    e = f"{r['expected']:.4f}" if isinstance(r['expected'],float) else str(r['expected'])
    c = f"{r['computed']:.4f}" if isinstance(r['computed'],float) else str(r['computed'])
    er = f"{r['err']:.3f}%" if isinstance(r.get('err'),(int,float)) else ""
    print(f"  {r['name']:<50} [{r['status']:<4}]  {c:>11} {e:>11} {er:>7}")
    if r.get('note'):
        print(f"    Note: {r['note']}")
print("-"*94)
print(f"\nTotal: {n_total}  |  PASS: {n_pass}  |  FAIL: {n_fail}")
if n_fail == 0:
    print("\n[OK] ALL TESTS PASSED — calculator logic verified.")
else:
    print(f"\n[!!] {n_fail} test(s) FAILED — discrepancies found.")
    sys.exit(1)
