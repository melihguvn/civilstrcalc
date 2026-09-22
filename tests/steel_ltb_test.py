"""
steel_ltb_test.py — Tests for AISC 360-22 §F2 LTB Control (pages/steel-ltb.html)

Verifies:
  Suite 1: US W sections — Lp, Lr, φbMn for all three zones
  Suite 2: US LTB boundary conditions (Lb=Lp and Lb=Lr transitions)
  Suite 3: SI IPE / HEA sections in kN·m
  Suite 4: AISC Design Manual verification (F.1-1b, F.1-2b, F.1-3b examples)
  Suite 5: Cb effect, edge cases

All tolerances 1% unless noted.
"""

import math
import sys

PASS = 0; FAIL = 0

def check(label, got, exp, tol=0.01):
    global PASS, FAIL
    if exp == 0:
        ok = abs(got) < 1e-6
    else:
        ok = abs(got - exp) / abs(exp) <= tol
    if ok:
        PASS += 1
    else:
        FAIL += 1
        pct = abs(got - exp) / abs(exp) * 100 if exp != 0 else float('inf')
        print(f"  FAIL {label}: got={got:.6g}, exp={exp:.6g}, err={pct:.2f}%")

# ── CORE FORMULAE (mirror of JS) ─────────────────────────────────────────────

def ltb_us(Fy, E, d, tf, Sx, Zx, ry, Iy, J, Cw, Lb_ft, Cb=1.0):
    """AISC §F2 — US units. Returns (phiMn, Mn, Mp, Lp, Lr, mode)."""
    lf = 12
    ho = d - tf
    Mp  = Fy * Zx / lf
    M07 = 0.7 * Fy * Sx / lf
    Lp  = 1.76 * ry * math.sqrt(E / Fy) / lf
    tv  = J / (Sx * ho)
    rts = math.sqrt(math.sqrt(Iy * Cw) / Sx)
    Lr  = 1.95 * rts * (E / (0.7 * Fy)) * math.sqrt(tv + math.sqrt(tv**2 + 6.76 * (0.7*Fy/E)**2)) / lf
    Lb  = Lb_ft
    if Lb <= Lp:
        Mn = Mp; mode = 'Plastic'
    elif Lb <= Lr:
        Mn = min(Cb * (Mp - (Mp - M07) * (Lb - Lp) / (Lr - Lp)), Mp)
        mode = 'Inelastic'
    else:
        LbIn = Lb * lf
        Fcr = math.pi**2 * E / (LbIn / rts)**2 * math.sqrt(1 + 0.078 * tv * (LbIn / rts)**2)
        Mn  = min(Cb * Fcr * Sx / lf, Mp)
        mode = 'Elastic'
    return 0.9 * Mn, Mn, Mp, Lp, Lr, mode, rts, tv

def ltb_si(Fy, E, d, tf, Sx, Zx, ry, Iy, J, Cw, Lb_m, Cb=1.0):
    """AISC §F2 — SI units (mm, MPa, kN·m). Returns (phiMn, Mn, Mp, Lp, Lr, mode)."""
    lf  = 1000  # mm/m
    ho  = d - tf
    Mp  = Fy * Zx / 1e6
    M07 = 0.7 * Fy * Sx / 1e6
    Lp  = 1.76 * ry * math.sqrt(E / Fy) / lf
    tv  = J / (Sx * ho)
    rts = math.sqrt(math.sqrt(Iy * Cw) / Sx)
    Lr  = 1.95 * rts * (E / (0.7 * Fy)) * math.sqrt(tv + math.sqrt(tv**2 + 6.76 * (0.7*Fy/E)**2)) / lf
    Lb  = Lb_m
    if Lb <= Lp:
        Mn = Mp; mode = 'Plastic'
    elif Lb <= Lr:
        Mn = min(Cb * (Mp - (Mp - M07) * (Lb - Lp) / (Lr - Lp)), Mp)
        mode = 'Inelastic'
    else:
        LbMm = Lb * lf
        Fcr  = math.pi**2 * E / (LbMm / rts)**2 * math.sqrt(1 + 0.078 * tv * (LbMm / rts)**2)
        Mn   = min(Cb * Fcr * Sx / 1e6, Mp)
        mode = 'Elastic'
    return 0.9 * Mn, Mn, Mp, Lp, Lr, mode, rts, tv


# ── SECTION DICTIONARIES (US — AISC 15th Ed) ─────────────────────────────────
# Keys: d, bf, tf, tw, A, Ix, Sx, Zx, rx, Iy, Sy, Zy, ry, J, Cw (all inches/in units)

W14x48 = dict(d=13.8, bf=8.031, tf=0.595, tw=0.340, A=14.1, Ix=484,  Sx=70.2, Zx=78.4, rx=5.85, Iy=51.4, Sy=12.8, Zy=19.6, ry=1.91, J=1.45,  Cw=2170)
W14x90 = dict(d=14.0, bf=14.520,tf=0.710, tw=0.440, A=26.5, Ix=999,  Sx=143,  Zx=157,  rx=6.14, Iy=362,  Sy=49.9, Zy=75.6, ry=3.70, J=4.06,  Cw=16000)
W18x35 = dict(d=17.7, bf=6.000, tf=0.425, tw=0.300, A=10.3, Ix=510,  Sx=57.6, Zx=66.5, rx=7.04, Iy=15.3, Sy=5.12, Zy=8.06, ry=1.22, J=0.506, Cw=846)
W18x50 = dict(d=18.0, bf=7.495, tf=0.570, tw=0.355, A=14.7, Ix=800,  Sx=88.9, Zx=101,  rx=7.38, Iy=40.1, Sy=10.7, Zy=16.6, ry=1.65, J=1.24,  Cw=3040)
W21x68 = dict(d=21.1, bf=8.270, tf=0.685, tw=0.430, A=20.0, Ix=1480, Sx=140,  Zx=160,  rx=8.60, Iy=64.7, Sy=15.7, Zy=24.4, ry=1.80, J=2.45,  Cw=6890)
W10x33 = dict(d=9.73, bf=7.960, tf=0.435, tw=0.290, A=9.71, Ix=171,  Sx=35.0, Zx=38.8, rx=4.20, Iy=36.6, Sy=9.20, Zy=14.0, ry=1.94, J=0.583, Cw=789)
W12x65 = dict(d=12.1, bf=12.000,tf=0.605, tw=0.390, A=19.1, Ix=533,  Sx=87.9, Zx=96.8, rx=5.28, Iy=174,  Sy=29.1, Zy=44.1, ry=3.02, J=2.18,  Cw=41100)
W14x132= dict(d=14.7, bf=14.725,tf=1.030, tw=0.645, A=38.8, Ix=1530, Sx=209,  Zx=234,  rx=6.28, Iy=548,  Sy=74.5, Zy=113,  ry=3.76, J=12.3,  Cw=28200)
W24x76 = dict(d=23.9, bf=8.990, tf=0.680, tw=0.440, A=22.4, Ix=2100, Sx=176,  Zx=200,  rx=9.69, Iy=82.5, Sy=18.4, Zy=28.6, ry=1.92, J=2.68,  Cw=13700)
W30x90 = dict(d=29.5, bf=10.400,tf=0.610, tw=0.470, A=26.4, Ix=3610, Sx=245,  Zx=283,  rx=11.7, Iy=115,  Sy=22.1, Zy=34.7, ry=2.09, J=2.84,  Cw=27600)

# SI sections (Arcelor-Mittal) — mm, mm², mm⁴, mm³, mm⁶
IPE240 = dict(d=240, bf=120, tf=9.8,  tw=6.2,  A=3910,   Ix=3.89e7, Sx=324000, Zx=367000, rx=99.7, Iy=2.84e6, Sy=47300, Zy=73900, ry=26.9, J=127000,   Cw=1.20e11)
IPE300 = dict(d=300, bf=150, tf=10.7, tw=7.1,  A=5380,   Ix=8.36e7, Sx=557000, Zx=628000, rx=124,  Iy=6.04e6, Sy=80500, Zy=125000,ry=33.5, J=201000,   Cw=3.38e11)
IPE400 = dict(d=400, bf=180, tf=13.5, tw=8.6,  A=8450,   Ix=2.31e8, Sx=1.16e6, Zx=1.31e6, rx=165,  Iy=1.32e7, Sy=146000,Zy=229000,ry=39.5, J=511000,   Cw=1.26e12)
HEA200 = dict(d=190, bf=200, tf=10.0, tw=6.5,  A=5380,   Ix=3.69e7, Sx=389000, Zx=429000, rx=82.7, Iy=1.34e7, Sy=134000,Zy=202000,ry=49.9, J=148000,   Cw=2.06e11)
HEB300 = dict(d=300, bf=300, tf=19.0, tw=11.0, A=14900,  Ix=2.51e8, Sx=1.68e6, Zx=1.869e6,rx=130,  Iy=8.56e7, Sy=571000,Zy=870000,ry=75.8, J=6990000,  Cw=2.19e12)

# ── SUITE 1: US W SECTIONS — ZONE CLASSIFICATION AND φbMn ───────────────────
print("Suite 1: US W sections — zone checks")
# W18x35, Fy=50: Lp≈4.31 ft, Lr≈11.49 ft

# W18x35, A992 Fy=50, Lb=3 ft → Plastic (Lb < Lp≈4.31)
s = W18x35; Fy, E = 50, 29000
phi, Mn, Mp, Lp, Lr, mode, rts, tv = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 3.0)
check("1.1a W18x35 Lb=3 mode=Plastic", 1 if mode=='Plastic' else 0, 1, tol=0)
check("1.1b W18x35 Lb=3 phiMn=0.9*Mp", phi, 0.9*Mp)

# W18x35, Lb=8 ft → inelastic zone (Lp≈4.31 < 8 < Lr≈11.49)
phi2, Mn2, Mp2, Lp2, Lr2, mode2, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 8.0)
check("1.2a W18x35 Lb=8 mode=Inelastic", 1 if mode2=='Inelastic' else 0, 1, tol=0)
check("1.2b W18x35 Lb=8 phi_<_phiMp", 1 if phi2 < 0.9*Mp2 else 0, 1, tol=0)

# W18x35, Lb=60 ft → elastic zone
phi3, Mn3, Mp3, Lp3, Lr3, mode3, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 60.0)
check("1.3a W18x35 Lb=60 mode=Elastic", 1 if mode3=='Elastic' else 0, 1, tol=0)
check("1.3b W18x35 Lb=60 phi_<_inelastic", 1 if phi3 < phi2 else 0, 1, tol=0)

# W14x48, A992 Fy=50 — compute and verify Lp
s2 = W14x48
phi4, Mn4, Mp4, Lp4, Lr4, mode4, rts4, tv4 = ltb_us(50, 29000, s2['d'], s2['tf'], s2['Sx'], s2['Zx'], s2['ry'], s2['Iy'], s2['J'], s2['Cw'], 5.0)
Lp_exp = 1.76 * s2['ry'] * math.sqrt(29000/50) / 12
check("1.4a W14x48 Lp", Lp4, Lp_exp)
check("1.4b W14x48 Lb=5 Plastic", 1 if mode4=='Plastic' else 0, 1, tol=0)

# W14x90 (wide flange, large Iy) — Lp should be large
s3 = W14x90
_, _, _, Lp5, Lr5, _, _, _ = ltb_us(50, 29000, s3['d'], s3['tf'], s3['Sx'], s3['Zx'], s3['ry'], s3['Iy'], s3['J'], s3['Cw'], 10.0)
Lp_exp5 = 1.76 * s3['ry'] * math.sqrt(29000/50) / 12
check("1.5a W14x90 Lp", Lp5, Lp_exp5)
check("1.5b W14x90 Lb=10 Plastic (Lp>10?)", 1 if Lp_exp5 > 10 else 0, 1, tol=0)

# W24x76, Fy=50, Lb=30 ft — inelastic, check Mn formula explicitly
s4 = W24x76
phi6, Mn6, Mp6, Lp6, Lr6, mode6, rts6, tv6 = ltb_us(50, 29000, s4['d'], s4['tf'], s4['Sx'], s4['Zx'], s4['ry'], s4['Iy'], s4['J'], s4['Cw'], 30.0)
if mode6 == 'Inelastic':
    Mn_exp6 = Mp6 - (Mp6 - 0.7*50*s4['Sx']/12) * (30 - Lp6) / (Lr6 - Lp6)
    Mn_exp6 = min(Mn_exp6, Mp6)
    check("1.6a W24x76 Lb=30 Mn (inelastic)", Mn6, Mn_exp6)
check("1.6b W24x76 Lb=30 phiMn=0.9Mn", phi6, 0.9*Mn6)

print(f"  Suite 1 done.")

# ── SUITE 2: BOUNDARY CONDITIONS (Lb=Lp and Lb=Lr) ───────────────────────────
print("Suite 2: Boundary conditions Lb=Lp and Lb=Lr")

s = W18x50; Fy, E = 50, 29000
_, _, Mp_b, Lp_b, Lr_b, _, _, _ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], Lp_b if 'Lp_b' in dir() else 5.0)
_, _, _, Lp_b, Lr_b, _, _, _ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 5.0)

# At Lb=Lp exactly → Plastic
phi_a, Mn_a, Mp_a, Lp_a, Lr_a, mode_a, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], Lp_b)
check("2.1a W18x50 Lb=Lp mode=Plastic", 1 if mode_a=='Plastic' else 0, 1, tol=0)
check("2.1b W18x50 Lb=Lp phiMn=0.9Mp", phi_a, 0.9*Mp_a)

# At Lb=Lr exactly → Inelastic (upper bound = 0.7*Fy*Sx/12)
phi_c, Mn_c, Mp_c, Lp_c, Lr_c, mode_c, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], Lr_a)
check("2.2a W18x50 Lb=Lr mode=Inelastic", 1 if mode_c=='Inelastic' else 0, 1, tol=0)
check("2.2b W18x50 Lb=Lr Mn=0.7*Fy*Sx/12", Mn_c, 0.7*Fy*s['Sx']/12)

# Just past Lr → Elastic
eps = 0.01
phi_d, Mn_d, Mp_d, _, _, mode_d, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], Lr_a + eps)
check("2.3 W18x50 Lb=Lr+ε mode=Elastic", 1 if mode_d=='Elastic' else 0, 1, tol=0)

print(f"  Suite 2 done.")

# ── SUITE 3: SI SECTIONS ─────────────────────────────────────────────────────
print("Suite 3: SI sections (kN·m)")

# IPE300, S355: Lp≈1.40m, Lr≈5.46m
s = IPE300; Fy, E = 355, 200000
phi3s, Mn3s, Mp3s, Lp3s, Lr3s, mode3s, rts3s, tv3s = ltb_si(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 1.0)
Mp_exp3 = Fy * s['Zx'] / 1e6
Lp_exp3 = 1.76 * s['ry'] * math.sqrt(E/Fy) / 1000
check("3.1a IPE300 S355 Mp", Mp3s, Mp_exp3)
check("3.1b IPE300 S355 Lp", Lp3s, Lp_exp3)
check("3.1c IPE300 S355 Lb=1m phiMn=0.9*Mp (plastic)", phi3s, 0.9*Mp_exp3)

# IPE300, S355, Lb=4m → inelastic (Lp≈1.40 < 4 < Lr≈5.46)
phi3i, Mn3i, Mp3i, Lp3i, Lr3i, mode3i, *_ = ltb_si(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 4.0)
check("3.2a IPE300 S355 Lb=4m inelastic", 1 if mode3i=='Inelastic' else 0, 1, tol=0)
check("3.2b IPE300 S355 Lb=4m phi<phiMp", 1 if phi3i < 0.9*Mp3i else 0, 1, tol=0)

# IPE300, S355, Lb=8m → elastic (8 > Lr≈5.46)
phi3e, Mn3e, Mp3e, _, _, mode3e, *_ = ltb_si(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 8.0)
check("3.3a IPE300 S355 Lb=8m elastic", 1 if mode3e=='Elastic' else 0, 1, tol=0)
check("3.3b IPE300 S355 Lb=8m phi<inelastic", 1 if phi3e < phi3i else 0, 1, tol=0)

# IPE240, S275: Lp≈1.27m — use Lb=1.0m for Plastic
s2 = IPE240; Fy2, E2 = 275, 200000
phi4s, Mn4s, Mp4s, Lp4s, *_ = ltb_si(Fy2, E2, s2['d'], s2['tf'], s2['Sx'], s2['Zx'], s2['ry'], s2['Iy'], s2['J'], s2['Cw'], 1.0)
Mp_exp4 = Fy2 * s2['Zx'] / 1e6
check("3.4a IPE240 S275 Mp", Mp4s, Mp_exp4)
check("3.4b IPE240 S275 Lb=1m Plastic", phi4s, 0.9*Mp_exp4)

# HEA200, S355: Lp≈2.09m — use Lb=1.5m for Plastic
sH = HEA200; FyH, EH = 355, 200000
_, _, MpH, LpH, LrH, modeH, *_ = ltb_si(FyH, EH, sH['d'], sH['tf'], sH['Sx'], sH['Zx'], sH['ry'], sH['Iy'], sH['J'], sH['Cw'], 1.5)
MpH_exp = FyH * sH['Zx'] / 1e6
check("3.5a HEA200 S355 Mp", MpH, MpH_exp)
LpH_exp = 1.76 * sH['ry'] * math.sqrt(EH/FyH) / 1000
check("3.5b HEA200 S355 Lp", LpH, LpH_exp)
check("3.5c HEA200 S355 Lb=1.5m Plastic", 1 if modeH=='Plastic' else 0, 1, tol=0)

# HEB300, S235: Lp≈3.89m — use Lb=3.0m for Plastic
sB = HEB300; FyB, EB = 235, 200000
phi_B, Mn_B, Mp_B, Lp_B, Lr_B, mode_B, *_ = ltb_si(FyB, EB, sB['d'], sB['tf'], sB['Sx'], sB['Zx'], sB['ry'], sB['Iy'], sB['J'], sB['Cw'], 3.0)
MpB_exp = FyB * sB['Zx'] / 1e6
check("3.6a HEB300 S235 Mp", Mp_B, MpB_exp)
LpB_exp = 1.76 * sB['ry'] * math.sqrt(EB/FyB) / 1000
check("3.6b HEB300 S235 Lp", Lp_B, LpB_exp)
check("3.6c HEB300 S235 Lb=3m Plastic", 1 if mode_B=='Plastic' else 0, 1, tol=0)

print(f"  Suite 3 done.")

# ── SUITE 4: AISC DESIGN MANUAL EXAMPLES ────────────────────────────────────
print("Suite 4: AISC Design Manual v15 verification")

# Example F.1-1b: W18x50, Fy=50, Lb=0 ft (no LTB)
# φbMn = φbMp = 0.9*50*101/12 = 378.75 kip·ft
s = W18x50; Fy, E = 50, 29000
phi_f1, Mn_f1, Mp_f1, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 0.001)
Mp_f1_exp = 50 * 101 / 12
check("4.1a F.1-1b W18x50 Mp", Mp_f1, Mp_f1_exp, tol=0.005)
check("4.1b F.1-1b W18x50 phiMp=378.75", phi_f1, 0.9*Mp_f1_exp, tol=0.005)

# W18x50 Fy=50: Lp≈5.83 ft, Lr≈17.0 ft, φbMp=378.75 kip·ft
# F.1-2b: Lb=5.0 ft (< Lp=5.83) → Plastic, Cb=1.01
phi_f2, Mn_f2, Mp_f2, Lp_f2, Lr_f2, mode_f2, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 5.0, Cb=1.01)
check("4.2a W18x50 Lb=5 mode Plastic", 1 if mode_f2=='Plastic' else 0, 1, tol=0)
check("4.2b W18x50 Lb=5 phiMn=378.75", phi_f2, 378.75, tol=0.01)
check("4.2c W18x50 Lp≈5.83 ft", Lp_f2, 5.83, tol=0.02)

# F.1-3b: Lb=17.0 ft (≈Lr) → verify Lr≈17 ft and mode Inelastic (at boundary)
phi_f3, Mn_f3, Mp_f3, Lp_f3, Lr_f3, mode_f3, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 17.0, Cb=1.30)
check("4.3a W18x50 Lr≈17.0 ft", Lr_f3, 17.0, tol=0.03)
# Lb=17 ≈ Lr; Cb amplifies capacity (elastic or inelastic boundary), capped at Mp
check("4.3b W18x50 Lb≈Lr Cb=1.3 phiMn<phiMp", 1 if phi_f3 < 0.9*Mp_f3 else 0, 1, tol=0)
check("4.3c W18x50 Lb≈Lr Cb=1.3 phiMn in range", 1 if 300 < phi_f3 < 380 else 0, 1, tol=0)

# W10x33, Fy=50, Lb=8 ft — verify Lp and Lr hand-calc
s5 = W10x33; Fy5, E5 = 50, 29000
phi_5, Mn_5, Mp_5, Lp_5, Lr_5, mode_5, rts_5, tv_5 = ltb_us(Fy5, E5, s5['d'], s5['tf'], s5['Sx'], s5['Zx'], s5['ry'], s5['Iy'], s5['J'], s5['Cw'], 8.0)
Lp5_exp = 1.76 * s5['ry'] * math.sqrt(E5/Fy5) / 12
ho5 = s5['d'] - s5['tf']
tv5_exp = s5['J'] / (s5['Sx'] * ho5)
rts5_exp = math.sqrt(math.sqrt(s5['Iy'] * s5['Cw']) / s5['Sx'])
check("4.4a W10x33 Lp", Lp_5, Lp5_exp)
check("4.4b W10x33 tv", tv_5, tv5_exp)
check("4.4c W10x33 rts", rts_5, rts5_exp)
Lr5_exp = 1.95 * rts5_exp * (E5/(0.7*Fy5)) * math.sqrt(tv5_exp + math.sqrt(tv5_exp**2 + 6.76*(0.7*Fy5/E5)**2)) / 12
check("4.4d W10x33 Lr", Lr_5, Lr5_exp)

print(f"  Suite 4 done.")

# ── SUITE 5: Cb EFFECT AND EDGE CASES ────────────────────────────────────────
print("Suite 5: Cb effect and edge cases")

# Cb>1 raises phiMn but caps at phiMp
s = W18x35; Fy, E = 50, 29000
phi_cb1, _, Mp_cb, Lp_cb, Lr_cb, mode_cb1, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 20.0, Cb=1.0)
phi_cb2, _, _, _, _, mode_cb2, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 20.0, Cb=1.5)
check("5.1a Cb=1.5 raises phiMn vs Cb=1.0", 1 if phi_cb2 > phi_cb1 else 0, 1, tol=0)
# Cap: Lb just past Lp, Cb=100 → phiMn = phiMp
phi_cbmax, _, _, _, _, _, *_ = ltb_us(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], Lp_cb + 0.1, Cb=100.0)
check("5.1b Cb=100 capped at phiMp", phi_cbmax, 0.9*Mp_cb, tol=0.001)

# Very short Lb (near 0) → Plastic
phi_sh, _, Mp_sh, *_ = ltb_us(50, 29000, W21x68['d'], W21x68['tf'], W21x68['Sx'], W21x68['Zx'], W21x68['ry'], W21x68['Iy'], W21x68['J'], W21x68['Cw'], 0.001)
check("5.2 W21x68 Lb≈0 phiMn=phiMp", phi_sh, 0.9*Mp_sh)

# Very long Lb → elastic, phiMn → 0
phi_vl, *_ = ltb_us(50, 29000, W18x35['d'], W18x35['tf'], W18x35['Sx'], W18x35['Zx'], W18x35['ry'], W18x35['Iy'], W18x35['J'], W18x35['Cw'], 500.0)
check("5.3 W18x35 Lb=500 phiMn small", 1 if phi_vl < 20 else 0, 1, tol=0)

# A36 vs A992 — same section, shorter Lp for higher Fy
s = W18x50
_, _, _, Lp_a36, _, _, *_ = ltb_us(36, 29000, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 5.0)
_, _, _, Lp_a992, _, _, *_ = ltb_us(50, 29000, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], 5.0)
check("5.4 A36 Lp > A992 Lp (lower Fy)", 1 if Lp_a36 > Lp_a992 else 0, 1, tol=0)

# D/C check: phiMn>Mu → D/C<1
phi_ok, *_ = ltb_us(50, 29000, W14x90['d'], W14x90['tf'], W14x90['Sx'], W14x90['Zx'], W14x90['ry'], W14x90['Iy'], W14x90['J'], W14x90['Cw'], 10.0)
Mu_test = phi_ok * 0.8
DCR = Mu_test / phi_ok
check("5.5 D/C=0.8 when Mu=0.8*phiMn", DCR, 0.80)

# SI: Cb effect in inelastic zone
s = IPE400; Fy, E = 355, 200000
phi_si1, _, _, Lp_si, Lr_si, mode_si1, *_ = ltb_si(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], (Lp_si := 1.76*s['ry']*math.sqrt(E/Fy)/1000) + 2.0, Cb=1.0)
phi_si2, *_ = ltb_si(Fy, E, s['d'], s['tf'], s['Sx'], s['Zx'], s['ry'], s['Iy'], s['J'], s['Cw'], lp_si_val := 1.76*s['ry']*math.sqrt(E/Fy)/1000 + 2.0, Cb=1.3)
check("5.6 IPE400 Cb=1.3 > Cb=1.0", 1 if phi_si2 > phi_si1 else 0, 1, tol=0)

print(f"  Suite 5 done.")

# ── SUMMARY ──────────────────────────────────────────────────────────────────
TOTAL = PASS + FAIL
print(f"\n{'='*50}")
print(f"Results: {PASS}/{TOTAL} passed, {FAIL} failed")
if FAIL == 0:
    print("ALL TESTS PASSED")
else:
    sys.exit(1)
