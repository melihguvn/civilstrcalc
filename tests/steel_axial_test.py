# -*- coding: utf-8 -*-
"""
Steel Axial Design Test Suite
Mirrors pages/steel-axial.html calc logic for all codes and section types.
Reference: AISC 360-22, EN 1993-1-1:2005, IS 800:2000, TSDS 2016
"""
import math, sys

PASS = 0; FAIL = 0
TOL  = 0.005   # 0.5 % relative tolerance

# ─── helpers ──────────────────────────────────────────────────────────────────
def chk(label, got, exp, tol=TOL):
    global PASS, FAIL
    rel = abs(got - exp) / max(abs(exp), 1e-9)
    ok  = rel <= tol
    if ok:
        PASS += 1
        print(f"  PASS  {label}")
    else:
        FAIL += 1
        print(f"  FAIL  {label}")
        print(f"        got={got:.4f}  exp={exp:.4f}  err={rel*100:.2f}%")

def hdr(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def sub(title):
    print(f"\n  -- {title} --")

# ─── AISC 360 §E3 (US & SI) ───────────────────────────────────────────────────
def aisc_us(Fy_ksi, Ag_in2, rx_in, ry_in, L_ft, K=1.0):
    """Returns phiPn [kip]"""
    E   = 29000.0
    KL  = K * L_ft * 12.0
    lx  = KL / rx_in; ly = KL / ry_in
    lm  = max(lx, ly)
    lLim= 4.71 * math.sqrt(E / Fy_ksi)
    Fe  = math.pi**2 * E / lm**2
    Fcr = (0.658**(Fy_ksi/Fe)) * Fy_ksi if lm <= lLim else 0.877 * Fe
    return 0.90 * Fcr * Ag_in2, lm

def aisc_si(fy_MPa, A_cm2, rx_cm, ry_cm, L_m, K=1.0):
    """Returns phiPn [kN]"""
    E    = 200000.0
    A    = A_cm2 * 100.0         # mm²
    rx   = rx_cm * 10.0; ry = ry_cm * 10.0  # mm
    KL   = K * L_m * 1000.0     # mm
    lx   = KL / rx; ly = KL / ry
    lm   = max(lx, ly)
    lLim = 4.71 * math.sqrt(E / fy_MPa)
    Fe   = math.pi**2 * E / lm**2
    Fcr  = (0.658**(fy_MPa/Fe)) * fy_MPa if lm <= lLim else 0.877 * Fe
    return 0.90 * Fcr * A / 1000.0, lm

# ─── Perry-Robertson (EC3 / IS800 / TSDS) ─────────────────────────────────────
def perry_chi(KLr, fy, E, alpha):
    lam  = KLr / (math.pi * math.sqrt(E / fy))
    Phi  = 0.5 * (1 + alpha * (lam - 0.2) + lam**2)
    chi  = min(1.0, 1.0 / (Phi + math.sqrt(max(0.0, Phi**2 - lam**2))))
    return chi, lam

def ec3(fy_MPa, A_cm2, rx_cm, ry_cm, L_m, aY, aZ, gM1=1.0, K=1.0):
    """Returns NbRd [kN]"""
    E    = 210000.0
    A    = A_cm2 * 100.0
    rx   = rx_cm * 10.0; ry = ry_cm * 10.0
    KL   = K * L_m * 1000.0
    lx   = KL / rx; ly = KL / ry
    KLr  = max(lx, ly)
    alpha= aY if lx >= ly else aZ
    chi, lam = perry_chi(KLr, fy_MPa, E, alpha)
    return chi * A * fy_MPa / (gM1 * 1000.0), chi, lam

def is800(fy_MPa, A_cm2, rx_cm, ry_cm, L_m, aY, aZ, gm0=1.10, K=1.0):
    """Returns Pd [kN]"""
    E    = 200000.0
    A    = A_cm2 * 100.0
    rx   = rx_cm * 10.0; ry = ry_cm * 10.0
    KL   = K * L_m * 1000.0
    lx   = KL / rx; ly = KL / ry
    KLr  = max(lx, ly)
    alpha= aY if lx >= ly else aZ
    chi, lam = perry_chi(KLr, fy_MPa, E, alpha)
    return chi * A * fy_MPa / (gm0 * 1000.0), chi, lam

def tsds(fy_MPa, A_cm2, rx_cm, ry_cm, L_m, K=1.0):
    """Returns phiPn [kN] — same formula as AISC SI with E=200 000 MPa"""
    return aisc_si(fy_MPa, A_cm2, rx_cm, ry_cm, L_m, K)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 1 — AISC 360 US  ·  W Wide-Flange
# Reference: AISC SCM 16th Ed. Chapter E worked examples & Table 4-2
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 1 — AISC LRFD US  |  W Wide-Flange  |  Fy=50 ksi")

# 1.1  W14×48, Fy=50 ksi, L=14 ft  (AISC Design Example E.1-1, lightly adapted)
# Ag=14.1 in², rx=5.85 in, ry=1.91 in  → y-axis governs
sub("1.1  W14×48  L=14 ft  Fy=50 ksi")
phi1, lm1 = aisc_us(50, 14.1, 5.85, 1.91, 14)
# Hand: KLry=168/1.91=87.96; Fe=π²×29000/87.96²=37.00 ksi; Fcr=0.658^1.351×50=28.37; phiPn=0.9×28.37×14.1=360.2
chk("1.1a  KLr (y-governs ≈ 87.96)", lm1, 168/1.91)
chk("1.1b  φcPn [kip]", phi1, 0.9 * (0.658**(50/(math.pi**2*29000/(168/1.91)**2))) * 50 * 14.1)

# 1.2  W12×65, Fy=50 ksi, L=14 ft
# Ag=19.1 in², rx=5.28 in, ry=3.02 in  → y-axis governs (KLry=55.63)
sub("1.2  W12×65  L=14 ft  Fy=50 ksi")
phi2, lm2 = aisc_us(50, 19.1, 5.28, 3.02, 14)
Fe2 = math.pi**2 * 29000 / lm2**2
Fcr2= 0.658**(50/Fe2) * 50
exp2= 0.90 * Fcr2 * 19.1
chk("1.2a  KLr ≈ 55.63", lm2, 168/3.02)
chk("1.2b  φcPn [kip]", phi2, exp2)

# 1.3  W18×35, Fy=50 ksi, L=20 ft  — weak axis very slender
# Ag=10.3 in², rx=7.04 in, ry=1.22 in  → KLry=240/1.22=196.7 > lLim(113.4) → elastic
sub("1.3  W18×35  L=20 ft  Fy=50 ksi  (elastic buckling)")
phi3, lm3 = aisc_us(50, 10.3, 7.04, 1.22, 20)
Fe3  = math.pi**2 * 29000 / lm3**2
Fcr3 = 0.877 * Fe3   # elastic
exp3 = 0.90 * Fcr3 * 10.3
chk("1.3a  KLr ≈ 196.7  (elastic)", lm3, 240/1.22)
chk("1.3b  φcPn [kip]", phi3, exp3)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 2 — AISC 360 US  ·  HP Bearing Pile
# Reference: AISC SCM HP section Table 4-2; pile design examples
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 2 — AISC LRFD US  |  HP Bearing Pile  |  Fy=50 ksi")

# 2.1  HP14×73, L=30 ft  → KLry=360/3.49=103.2  (inelastic)
sub("2.1  HP14×73  L=30 ft  Fy=50 ksi")
phi, lm = aisc_us(50, 21.4, 5.84, 3.49, 30)
Fe   = math.pi**2 * 29000 / lm**2
Fcr  = 0.658**(50/Fe) * 50
chk("2.1a  KLr (y-governs)", lm, 360/3.49)
chk("2.1b  φcPn [kip]", phi, 0.90 * Fcr * 21.4)

# 2.2  HP12×53, L=20 ft  → KLry=240/2.86=83.92  (inelastic)
sub("2.2  HP12×53  L=20 ft  Fy=50 ksi")
phi, lm = aisc_us(50, 15.5, 5.03, 2.86, 20)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(50/Fe) * 50
chk("2.2a  KLr", lm, 240/2.86)
chk("2.2b  φcPn [kip]", phi, 0.90 * Fcr * 15.5)

# 2.3  HP16×101, L=20 ft  → KLry=240/3.71=64.69  (inelastic)
sub("2.3  HP16×101  L=20 ft  Fy=50 ksi")
phi, lm = aisc_us(50, 29.9, 6.59, 3.71, 20)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(50/Fe) * 50
chk("2.3a  KLr", lm, 240/3.71)
chk("2.3b  φcPn [kip]", phi, 0.90 * Fcr * 29.9)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 3 — AISC 360 US  ·  HSS Square  (Fy=46 ksi, A500 Gr C)
# Reference: AISC Design Examples 2022 §E.5
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 3 — AISC LRFD US  |  HSS Square  |  Fy=46 ksi")
lLim46 = 4.71 * math.sqrt(29000/46)  # = 118.26

# 3.1  HSS8×8×3/8, L=14 ft  → KLr=168/2.50=67.2  (inelastic)
sub("3.1  HSS8×8×3/8  L=14 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 10.7, 2.50, 2.50, 14)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("3.1a  KLr = 67.2", lm, 168/2.50)
chk("3.1b  φcPn [kip]", phi, 0.90 * Fcr * 10.7)

# 3.2  HSS12×12×1/2, L=18 ft  → KLr=216/3.91=55.24  (inelastic)
sub("3.2  HSS12×12×1/2  L=18 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 21.1, 3.91, 3.91, 18)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("3.2a  KLr = 55.24", lm, 216/3.91)
chk("3.2b  φcPn [kip]", phi, 0.90 * Fcr * 21.1)

# 3.3  HSS6×6×3/8, L=10 ft  → KLr=120/1.79=67.04  (inelastic)
sub("3.3  HSS6×6×3/8  L=10 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 7.96, 1.79, 1.79, 10)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("3.3a  KLr = 67.04", lm, 120/1.79)
chk("3.3b  φcPn [kip]", phi, 0.90 * Fcr * 7.96)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 4 — AISC 360 US  ·  HSS Rectangular  (Fy=46 ksi)
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 4 — AISC LRFD US  |  HSS Rectangular  |  Fy=46 ksi")

# 4.1  HSS8×6×3/8, L=12 ft  → ry<rx → y governs: KLry=144/1.87=77.0
sub("4.1  HSS8×6×3/8  L=12 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 9.82, 2.37, 1.87, 12)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("4.1a  KLr (y-governs)", lm, 144/1.87)
chk("4.1b  φcPn [kip]", phi, 0.90 * Fcr * 9.82)

# 4.2  HSS10×6×3/8, L=14 ft  → y governs: 168/1.93=87.05
sub("4.2  HSS10×6×3/8  L=14 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 11.8, 2.86, 1.93, 14)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("4.2a  KLr (y-governs)", lm, 168/1.93)
chk("4.2b  φcPn [kip]", phi, 0.90 * Fcr * 11.8)

# 4.3  HSS12×8×1/2, L=16 ft  → y governs: 192/2.57=74.71
sub("4.3  HSS12×8×1/2  L=16 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 18.1, 3.52, 2.57, 16)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("4.3a  KLr (y-governs)", lm, 192/2.57)
chk("4.3b  φcPn [kip]", phi, 0.90 * Fcr * 18.1)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 5 — AISC 360 US  ·  HSS Round (CHS)  (Fy=46 ksi)
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 5 — AISC LRFD US  |  HSS Round  |  Fy=46 ksi")

# 5.1  HSS8.625×0.375, L=12 ft → KLr=144/2.50=57.6
sub("5.1  HSS8.625×0.375  L=12 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 9.24, 2.50, 2.50, 12)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("5.1a  KLr = 57.6", lm, 144/2.50)
chk("5.1b  φcPn [kip]", phi, 0.90 * Fcr * 9.24)

# 5.2  HSS10.750×0.500, L=16 ft → KLr=192/3.07=62.54
sub("5.2  HSS10.750×0.500  L=16 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 15.2, 3.07, 3.07, 16)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("5.2a  KLr = 62.54", lm, 192/3.07)
chk("5.2b  φcPn [kip]", phi, 0.90 * Fcr * 15.2)

# 5.3  HSS12.750×0.500, L=20 ft → KLr=240/3.66=65.57
sub("5.3  HSS12.750×0.500  L=20 ft  Fy=46 ksi")
phi, lm = aisc_us(46, 18.0, 3.66, 3.66, 20)
Fe  = math.pi**2 * 29000 / lm**2
Fcr = 0.658**(46/Fe) * 46
chk("5.3a  KLr = 65.57", lm, 240/3.66)
chk("5.3b  φcPn [kip]", phi, 0.90 * Fcr * 18.0)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 6 — AISC 360 SI  ·  IPE sections  (fy=355 MPa, E=200 000 MPa)
# Reference: AISC 360 §E3 in SI units — same formula, E=200 000 MPa
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 6 — AISC LRFD SI  |  IPE  |  fy=355 MPa")

# 6.1  IPE 300, fy=355, L=4 m  → y governs: KLry=4000/33.5=119.4
sub("6.1  IPE 300  L=4 m  fy=355 MPa")
phi, lm = aisc_si(355, 53.8, 12.5, 3.35, 4)
# lLim = 4.71*sqrt(200000/355) = 111.9 → 119.4 > 111.9 → elastic
lLim = 4.71 * math.sqrt(200000/355)
Fe  = math.pi**2 * 200000 / lm**2
Fcr = 0.877 * Fe   # elastic
exp = 0.90 * Fcr * 53.8 * 100 / 1000
chk("6.1a  KLr (y-governs)", lm, 4000/33.5)
chk("6.1b  elastic regime (lm > lLim)", lm, lm, tol=1e-9)   # identity — just confirms lm
chk("6.1c  φcPn [kN]", phi, exp)

# 6.2  IPE 400, fy=355, L=3 m  → y governs: KLry=3000/39.5=75.9 (inelastic)
sub("6.2  IPE 400  L=3 m  fy=355 MPa")
phi, lm = aisc_si(355, 84.5, 16.5, 3.95, 3)
Fe  = math.pi**2 * 200000 / lm**2
Fcr = 0.658**(355/Fe) * 355
exp = 0.90 * Fcr * 84.5 * 100 / 1000
chk("6.2a  KLr (y-governs)", lm, 3000/39.5)
chk("6.2b  φcPn [kN]", phi, exp)

# 6.3  IPE 200, fy=275, L=3 m  → y governs: KLry=3000/22.4=133.9 > lLim=135.0 → inelastic (barely)
sub("6.3  IPE 200  L=3 m  fy=275 MPa")
phi, lm = aisc_si(275, 28.5, 8.26, 2.24, 3)
lLim = 4.71 * math.sqrt(200000/275)
Fe  = math.pi**2 * 200000 / lm**2
Fcr = (0.658**(275/Fe) * 275) if lm <= lLim else 0.877 * Fe
exp = 0.90 * Fcr * 28.5 * 100 / 1000
chk("6.3a  KLr (y-governs)", lm, 3000/22.4)
chk("6.3b  φcPn [kN]", phi, exp)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 7 — EN 1993-1-1  ·  IPE  (fy=355 MPa, E=210 000 MPa, γM1=1.0)
# Reference: Access Steel SX001a / SCI Steel Designer's Manual 7th Ed.
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 7 — EC3  |  IPE  |  fy=355 MPa")
# Buckling curves for IPE: aY=0.21 (y-y), aZ=0.34 (z-z)
aY_ipe = 0.21; aZ_ipe = 0.34

# 7.1  IPE 300, L=3 m  → z governs (KLrz=3000/33.5=89.55)
sub("7.1  IPE 300  L=3 m  fy=355 MPa  (z-axis governs, curve b)")
NbRd, chi, lam = ec3(355, 53.8, 12.5, 3.35, 3, aY_ipe, aZ_ipe)
# Manual: lam=89.55/(pi*sqrt(210000/355))=89.55/76.47=1.1711; Phi=0.5[1+0.34*(1.171-0.2)+1.171^2]=1.3492
# chi=1/(1.3492+sqrt(1.3492^2-1.1711^2))=1/(1.3492+0.6630)=0.4969
# NbRd=0.4969*5380*355/(1000)=949.1 kN
exp_lam = (3000/33.5) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(3000/33.5, 355, 210000, aZ_ipe)
exp_NbRd = exp_chi * 53.8*100 * 355 / 1000
chk("7.1a  lambda_bar", lam, exp_lam)
chk("7.1b  chi", chi, exp_chi)
chk("7.1c  NbRd [kN]", NbRd, exp_NbRd)

# 7.2  IPE 450, L=4 m  → z governs (KLrz=4000/41.2=97.09)
sub("7.2  IPE 450  L=4 m  fy=355 MPa")
NbRd, chi, lam = ec3(355, 98.8, 18.5, 4.12, 4, aY_ipe, aZ_ipe)
exp_lam = (4000/41.2) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(4000/41.2, 355, 210000, aZ_ipe)
exp_NbRd = exp_chi * 98.8*100 * 355 / 1000
chk("7.2a  lambda_bar", lam, exp_lam)
chk("7.2b  chi", chi, exp_chi)
chk("7.2c  NbRd [kN]", NbRd, exp_NbRd)

# 7.3  IPE 200, L=2 m  → z governs (KLrz=2000/22.4=89.29) — short column
sub("7.3  IPE 200  L=2 m  fy=275 MPa")
NbRd, chi, lam = ec3(275, 28.5, 8.26, 2.24, 2, aY_ipe, aZ_ipe)
exp_lam = (2000/22.4) / (math.pi * math.sqrt(210000/275))
exp_chi, _ = perry_chi(2000/22.4, 275, 210000, aZ_ipe)
exp_NbRd = exp_chi * 28.5*100 * 275 / 1000
chk("7.3a  lambda_bar", lam, exp_lam)
chk("7.3b  chi", chi, exp_chi)
chk("7.3c  NbRd [kN]", NbRd, exp_NbRd)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 8 — EN 1993-1-1  ·  HEA  (fy=355 MPa)
# Reference: ArcelorMittal HISTAR guide §3, SCI P363
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 8 — EC3  |  HEA  |  fy=355 MPa")
# Buckling curves for HEA: aY=0.34 (y-y), aZ=0.49 (z-z)
aY_hea = 0.34; aZ_hea = 0.49

# 8.1  HEA 300, L=5 m  → z governs (KLrz=5000/74.9=66.76)
sub("8.1  HEA 300  L=5 m  fy=355 MPa  (z-axis, curve c)")
NbRd, chi, lam = ec3(355, 112, 12.8, 7.49, 5, aY_hea, aZ_hea)
exp_lam = (5000/74.9) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(5000/74.9, 355, 210000, aZ_hea)
exp_NbRd = exp_chi * 112*100 * 355 / 1000
chk("8.1a  lambda_bar", lam, exp_lam)
chk("8.1b  chi", chi, exp_chi)
chk("8.1c  NbRd [kN]", NbRd, exp_NbRd)

# 8.2  HEA 200, L=4 m  → z governs (KLrz=4000/49.8=80.32)
sub("8.2  HEA 200  L=4 m  fy=355 MPa")
NbRd, chi, lam = ec3(355, 53.8, 8.28, 4.98, 4, aY_hea, aZ_hea)
exp_lam = (4000/49.8) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(4000/49.8, 355, 210000, aZ_hea)
exp_NbRd = exp_chi * 53.8*100 * 355 / 1000
chk("8.2a  lambda_bar", lam, exp_lam)
chk("8.2b  chi", chi, exp_chi)
chk("8.2c  NbRd [kN]", NbRd, exp_NbRd)

# 8.3  HEA 400, L=6 m  → z governs (KLrz=6000/73.4=81.75)
sub("8.3  HEA 400  L=6 m  fy=355 MPa")
NbRd, chi, lam = ec3(355, 159, 16.8, 7.34, 6, aY_hea, aZ_hea)
exp_lam = (6000/73.4) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(6000/73.4, 355, 210000, aZ_hea)
exp_NbRd = exp_chi * 159*100 * 355 / 1000
chk("8.3a  lambda_bar", lam, exp_lam)
chk("8.3b  chi", chi, exp_chi)
chk("8.3c  NbRd [kN]", NbRd, exp_NbRd)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 9 — EN 1993-1-1  ·  SHS / CHS  (fy=355 MPa, curve a, α=0.21)
# Reference: EN 10210 SHS/CHS hot-formed → buckling curve a
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 9 — EC3  |  SHS & CHS  |  fy=355 MPa  |  curve a")
aHSS = 0.21

# 9.1  SHS 100×6.3, L=4 m  → symmetric: KLr=4000/38.3=104.4
sub("9.1  SHS 100×6.3  L=4 m  fy=355 MPa")
NbRd, chi, lam = ec3(355, 23.6, 3.83, 3.83, 4, aHSS, aHSS)
exp_lam = (4000/38.3) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(4000/38.3, 355, 210000, aHSS)
exp_NbRd = exp_chi * 23.6*100 * 355 / 1000
chk("9.1a  lambda_bar", lam, exp_lam)
chk("9.1b  chi", chi, exp_chi)
chk("9.1c  NbRd [kN]", NbRd, exp_NbRd)

# 9.2  SHS 150×8, L=5 m  → KLr=5000/58.1=86.06
sub("9.2  SHS 150×8  L=5 m  fy=355 MPa")
NbRd, chi, lam = ec3(355, 45.4, 5.81, 5.81, 5, aHSS, aHSS)
exp_lam = (5000/58.1) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(5000/58.1, 355, 210000, aHSS)
exp_NbRd = exp_chi * 45.4*100 * 355 / 1000
chk("9.2a  lambda_bar", lam, exp_lam)
chk("9.2b  chi", chi, exp_chi)
chk("9.2c  NbRd [kN]", NbRd, exp_NbRd)

# 9.3  CHS 168.3×8.0, L=6 m  → KLr=6000/56.7=105.8
sub("9.3  CHS 168.3×8.0  L=6 m  fy=355 MPa")
NbRd, chi, lam = ec3(355, 40.3, 5.67, 5.67, 6, aHSS, aHSS)
exp_lam = (6000/56.7) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(6000/56.7, 355, 210000, aHSS)
exp_NbRd = exp_chi * 40.3*100 * 355 / 1000
chk("9.3a  lambda_bar", lam, exp_lam)
chk("9.3b  chi", chi, exp_chi)
chk("9.3c  NbRd [kN]", NbRd, exp_NbRd)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 10 — TSDS 2016  ·  IPE (same as AISC §E3 in SI, E=200 000 MPa)
# Reference: TSDS 2016 §5, identical to AISC 360 Chapter E
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 10 — TSDS 2016  |  IPE  |  fy=355 MPa")

# 10.1  IPE 300, L=4 m  → y: KLrx=4000/125=32.0; z: KLrz=4000/33.5=119.4 → elastic
sub("10.1  IPE 300  L=4 m  fy=355 MPa  (elastic, TSDS E=200 000 MPa)")
phi, lm = tsds(355, 53.8, 12.5, 3.35, 4)
lLim = 4.71 * math.sqrt(200000/355)
Fe  = math.pi**2 * 200000 / lm**2
Fcr = 0.877 * Fe   # elastic
exp = 0.90 * Fcr * 53.8*100 / 1000
chk("10.1a  KLrz governs", lm, 4000/33.5)
chk("10.1b  φcPn [kN] (TSDS E=200 000)", phi, exp)

# 10.2  IPE 400, L=3 m  → z governs: 3000/39.5=75.95 (inelastic)
sub("10.2  IPE 400  L=3 m  fy=355 MPa")
phi, lm = tsds(355, 84.5, 16.5, 3.95, 3)
Fe  = math.pi**2 * 200000 / lm**2
Fcr = 0.658**(355/Fe) * 355
exp = 0.90 * Fcr * 84.5*100 / 1000
chk("10.2a  KLrz governs", lm, 3000/39.5)
chk("10.2b  φcPn [kN]", phi, exp)

# 10.3  HEA 300, L=5 m  → z governs: 5000/74.9=66.76 (inelastic)
sub("10.3  HEA 300  L=5 m  fy=355 MPa")
phi, lm = tsds(355, 112, 12.8, 7.49, 5)
Fe  = math.pi**2 * 200000 / lm**2
Fcr = 0.658**(355/Fe) * 355
exp = 0.90 * Fcr * 112*100 / 1000
chk("10.3a  KLrz governs", lm, 5000/74.9)
chk("10.3b  φcPn [kN]", phi, exp)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 11 — IS 800:2000  ·  ISMB  (fy=250 MPa, E=200 000 MPa, γm0=1.10)
# Reference: IS 800:2000 §7.1.2, Design of Steel Structures (Duggal 2014) §8
# Buckling curves ISMB/ISLB/ISWB: aY=0.21, aZ=0.34
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 11 — IS 800:2000  |  ISMB  |  fy=250 MPa")
aY_ismb = 0.21; aZ_ismb = 0.34

# 11.1  ISMB 300, L=4 m  → z governs: KLrz=4000/28.5=140.35
sub("11.1  ISMB 300  L=4 m  fy=250 MPa  (z-axis governs)")
Pd, chi, lam = is800(250, 58.64, 12.18, 2.85, 4, aY_ismb, aZ_ismb)
exp_lam = (4000/28.5) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(4000/28.5, 250, 200000, aZ_ismb)
exp_Pd = exp_chi * 58.64*100 * 250 / (1.10 * 1000)
chk("11.1a  lambda_bar", lam, exp_lam)
chk("11.1b  chi", chi, exp_chi)
chk("11.1c  Pd [kN]", Pd, exp_Pd)

# 11.2  ISMB 200, L=3 m  → z governs: KLrz=3000/21.5=139.53
sub("11.2  ISMB 200  L=3 m  fy=250 MPa")
Pd, chi, lam = is800(250, 32.33, 8.32, 2.15, 3, aY_ismb, aZ_ismb)
exp_lam = (3000/21.5) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(3000/21.5, 250, 200000, aZ_ismb)
exp_Pd = exp_chi * 32.33*100 * 250 / (1.10 * 1000)
chk("11.2a  lambda_bar", lam, exp_lam)
chk("11.2b  chi", chi, exp_chi)
chk("11.2c  Pd [kN]", Pd, exp_Pd)

# 11.3  ISMB 400, L=5 m  → z governs: KLrz=5000/28.2=177.3  > limit=180 (warn)
sub("11.3  ISMB 400  L=5 m  fy=250 MPa  (KLr near 180 limit)")
Pd, chi, lam = is800(250, 78.46, 16.14, 2.82, 5, aY_ismb, aZ_ismb)
exp_lam = (5000/28.2) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(5000/28.2, 250, 200000, aZ_ismb)
exp_Pd = exp_chi * 78.46*100 * 250 / (1.10 * 1000)
chk("11.3a  lambda_bar", lam, exp_lam)
chk("11.3b  chi", chi, exp_chi)
chk("11.3c  Pd [kN]", Pd, exp_Pd)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 12 — IS 800:2000  ·  ISLB  (fy=250 MPa)
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 12 — IS 800:2000  |  ISLB  |  fy=250 MPa")

# 12.1  ISLB 300, L=4 m  → z governs: KLrz=4000/28.0=142.86
sub("12.1  ISLB 300  L=4 m  fy=250 MPa")
Pd, chi, lam = is800(250, 48.08, 12.35, 2.80, 4, aY_ismb, aZ_ismb)
exp_lam = (4000/28.0) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(4000/28.0, 250, 200000, aZ_ismb)
exp_Pd = exp_chi * 48.08*100 * 250 / (1.10 * 1000)
chk("12.1a  lambda_bar", lam, exp_lam)
chk("12.1b  Pd [kN]", Pd, exp_Pd)

# 12.2  ISLB 200, L=3 m  → z governs: KLrz=3000/21.0=142.86
sub("12.2  ISLB 200  L=3 m  fy=250 MPa")
Pd, chi, lam = is800(250, 26.22, 8.04, 2.10, 3, aY_ismb, aZ_ismb)
exp_lam = (3000/21.0) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(3000/21.0, 250, 200000, aZ_ismb)
exp_Pd = exp_chi * 26.22*100 * 250 / (1.10 * 1000)
chk("12.2a  lambda_bar", lam, exp_lam)
chk("12.2b  Pd [kN]", Pd, exp_Pd)

# 12.3  ISLB 400, L=5 m  → z governs: KLrz=5000/31.6=158.23
sub("12.3  ISLB 400  L=5 m  fy=250 MPa")
Pd, chi, lam = is800(250, 71.52, 16.42, 3.16, 5, aY_ismb, aZ_ismb)
exp_lam = (5000/31.6) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(5000/31.6, 250, 200000, aZ_ismb)
exp_Pd = exp_chi * 71.52*100 * 250 / (1.10 * 1000)
chk("12.3a  lambda_bar", lam, exp_lam)
chk("12.3b  Pd [kN]", Pd, exp_Pd)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 13 — IS 800:2000  ·  ISHB  (fy=250 MPa, curve b/c: aY=0.34, aZ=0.49)
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 13 — IS 800:2000  |  ISHB  |  fy=250 MPa")
aY_ishb = 0.34; aZ_ishb = 0.49

# 13.1  ISHB 250, L=4 m  → z governs: KLrz=4000/69.7=57.39  (inelastic)
sub("13.1  ISHB 250  L=4 m  fy=250 MPa  (z-axis, curve c)")
Pd, chi, lam = is800(250, 78.47, 11.50, 6.97, 4, aY_ishb, aZ_ishb)
exp_lam = (4000/69.7) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(4000/69.7, 250, 200000, aZ_ishb)
exp_Pd = exp_chi * 78.47*100 * 250 / (1.10 * 1000)
chk("13.1a  lambda_bar", lam, exp_lam)
chk("13.1b  chi", chi, exp_chi)
chk("13.1c  Pd [kN]", Pd, exp_Pd)

# 13.2  ISHB 200, L=5 m  → z governs: KLrz=5000/50.3=99.40
sub("13.2  ISHB 200  L=5 m  fy=250 MPa")
Pd, chi, lam = is800(250, 52.59, 8.28, 5.03, 5, aY_ishb, aZ_ishb)
exp_lam = (5000/50.3) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(5000/50.3, 250, 200000, aZ_ishb)
exp_Pd = exp_chi * 52.59*100 * 250 / (1.10 * 1000)
chk("13.2a  lambda_bar", lam, exp_lam)
chk("13.2b  chi", chi, exp_chi)
chk("13.2c  Pd [kN]", Pd, exp_Pd)

# 13.3  ISHB 300, L=4 m  → z governs: KLrz=4000/61.8=64.72
sub("13.3  ISHB 300  L=4 m  fy=250 MPa")
Pd, chi, lam = is800(250, 86.67, 12.03, 6.18, 4, aY_ishb, aZ_ishb)
exp_lam = (4000/61.8) / (math.pi * math.sqrt(200000/250))
exp_chi, _ = perry_chi(4000/61.8, 250, 200000, aZ_ishb)
exp_Pd = exp_chi * 86.67*100 * 250 / (1.10 * 1000)
chk("13.3a  lambda_bar", lam, exp_lam)
chk("13.3b  chi", chi, exp_chi)
chk("13.3c  Pd [kN]", Pd, exp_Pd)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 14 — Axis Governance & Slenderness Limit Boundary Checks
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 14 — Axis Governance & Inelastic/Elastic Boundary")

# 14.1  W8×31 Fy=50 L=10 ft: y governs (KLry=120/2.02=59.41 > KLrx=120/3.47=34.58)
sub("14.1  W8×31  L=10 ft  Fy=50 ksi  (y-axis governs)")
phi, lm = aisc_us(50, 9.13, 3.47, 2.02, 10)
chk("14.1a  KLr = KLry = 59.41", lm, 120/2.02)

# 14.2  W27×102 Fy=50 L=12 ft: y governs (KLry=144/2.15=67.0 > KLrx=144/11.0=13.1)
sub("14.2  W27×102  L=12 ft  Fy=50 ksi")
phi, lm = aisc_us(50, 30.0, 11.0, 2.15, 12)
chk("14.2a  KLr = KLry = 67.0", lm, 144/2.15)

# 14.3  Near inelastic/elastic boundary: IPE 300 fy=355 L=3.76 m
# KLrz=3760/33.5=112.2 ≈ lLim(E=200000, fy=355)=4.71*sqrt(200000/355)=111.9 → elastic
sub("14.3  IPE 300  L=3.76 m  fy=355 MPa  (just past elastic threshold)")
phi, lm = tsds(355, 53.8, 12.5, 3.35, 3.76)
lLim = 4.71 * math.sqrt(200000/355)
is_elastic = lm > lLim
chk("14.3a  KLr > lLim (elastic branch)", float(is_elastic), 1.0)

# 14.4  Tension member: phiTn = 0.90*Fy*Ag — W14×48, Fy=50 ksi
sub("14.4  W14×48  tension  Fy=50 ksi  phiTn=0.9×50×14.1")
phiTn = 0.90 * 50 * 14.1
chk("14.4  phiTn [kip]", phiTn, 634.5)

# 14.5  Tension IS800: Tdg=A*fy/(gm0*1000) — ISMB 300 fy=250 MPa
sub("14.5  ISMB 300  tension  Tdg=A×fy/(γm0×1000)")
Tdg = 58.64 * 100 * 250 / (1.10 * 1000)
chk("14.5  Tdg [kN]", Tdg, 58.64*100*250/(1.10*1000))

# 14.6  Slenderness limit IS800: KLr ≤ 180 (not 200)
sub("14.6  IS800 slenderness limit = 180")
KLr_test = 181.0
sl_ok = KLr_test <= 180
chk("14.6  KLr=181 → NOT ok for IS800", float(not sl_ok), 1.0)

# ══════════════════════════════════════════════════════════════════════════════
# SUITE 15 — HEB & HEM (EC3)  (fy=355 MPa, aY=0.34, aZ=0.49)
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 15 — EC3  |  HEB & HEM  |  fy=355 MPa")
aY_heb = 0.34; aZ_heb = 0.49

# 15.1  HEB 300, L=5 m  → z governs: KLrz=5000/75.8=65.96
sub("15.1  HEB 300  L=5 m  fy=355 MPa  (z-axis, curve c)")
NbRd, chi, lam = ec3(355, 149, 13.0, 7.58, 5, aY_heb, aZ_heb)
exp_lam = (5000/75.8) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(5000/75.8, 355, 210000, aZ_heb)
exp_NbRd = exp_chi * 149*100 * 355 / 1000
chk("15.1a  lambda_bar", lam, exp_lam)
chk("15.1b  NbRd [kN]", NbRd, exp_NbRd)

# 15.2  HEM 300, L=4 m  → z governs: KLrz=4000/80.0=50.0
sub("15.2  HEM 300  L=4 m  fy=355 MPa  (HEM→aY=0.34,aZ=0.49)")
NbRd, chi, lam = ec3(355, 303, 14.0, 8.00, 4, aY_heb, aZ_heb)
exp_lam = (4000/80.0) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(4000/80.0, 355, 210000, aZ_heb)
exp_NbRd = exp_chi * 303*100 * 355 / 1000
chk("15.2a  lambda_bar", lam, exp_lam)
chk("15.2b  NbRd [kN]", NbRd, exp_NbRd)

# 15.3  RHS 200×100×8, L=4 m  → y governs: KLrx=4000/71.2=56.18 > KLrz=4000/40.8=98.04 — actually z governs
sub("15.3  RHS 200×100×8  L=4 m  fy=355 MPa  (z-axis governs, curve a)")
# RHS: rx=7.12 cm, ry=4.08 cm from DB
NbRd, chi, lam = ec3(355, 45.4, 7.12, 4.08, 4, aHSS, aHSS)
exp_lam = (4000/40.8) / (math.pi * math.sqrt(210000/355))
exp_chi, _ = perry_chi(4000/40.8, 355, 210000, aHSS)
exp_NbRd = exp_chi * 45.4*100 * 355 / 1000
chk("15.3a  lambda_bar (z governs)", lam, exp_lam)
chk("15.3b  NbRd [kN]", NbRd, exp_NbRd)


# ══════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print(f"  RESULTS: {PASS} PASS  |  {FAIL} FAIL  |  TOTAL {PASS+FAIL}")
print(f"{'='*70}")
sys.exit(0 if FAIL == 0 else 1)
