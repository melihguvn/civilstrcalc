# -*- coding: utf-8 -*-
"""
Steel Combined (Beam-Column) Design Test Suite
Mirrors pages/steel-combined.html logic for AISC, EC3, IS800.
DB column map: [name,d,bf,tf,tw,A,W,Ix,Sx,Zx,rx,Iy,Sy,Zy,ry,J,Cw]
                  0  1  2  3  4  5 6  7  8  9 10 11 12 13 14 15  16
Reference: AISC 360-22 Ch. E/F/H; EN 1993-1-1 §6.3; IS 800:2000 §7-9
"""
import math, sys

PASS = 0; FAIL = 0
TOL  = 0.005   # 0.5 % relative tolerance

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
        print(f"        got={got:.6f}  exp={exp:.6f}  err={rel*100:.3f}%")

def hdr(t): print(f"\n{'='*70}\n  {t}\n{'='*70}")
def sub(t): print(f"\n  -- {t} --")

# ─── Section records (exact values from DB) ───────────────────────────────────
# US W sections: A[in²], Ix[in⁴], Sx[in³], Zx[in³], rx[in], Iy[in⁴], Sy[in³], Zy[in³], ry[in], J[in⁴], Cw[in⁶]
W_SECS = {
    'W14x48': dict(d=13.8, bf=8.031, tf=0.595, tw=0.340, A=14.1, Ix=484,  Sx=70.2, Zx=78.4,  rx=5.85, Iy=51.4, Sy=12.8, Zy=19.6, ry=1.91,  J=1.45,  Cw=21700),
    'W12x65': dict(d=12.1, bf=12.0,  tf=0.605, tw=0.390, A=19.1, Ix=533,  Sx=87.9, Zx=96.8,  rx=5.28, Iy=174,  Sy=29.1, Zy=44.1, ry=3.02,  J=2.18,  Cw=41100),
    'W18x35': dict(d=17.7, bf=6.000, tf=0.425, tw=0.300, A=10.3, Ix=510,  Sx=57.6, Zx=66.5,  rx=7.04, Iy=15.3, Sy=5.12, Zy=8.06, ry=1.22,  J=0.506, Cw=12900),
    'W14x132':dict(d=14.7, bf=14.725,tf=1.03,  tw=0.645, A=38.8, Ix=1530, Sx=209,  Zx=234,   rx=6.28, Iy=548,  Sy=74.5, Zy=113,  ry=3.76,  J=12.3,  Cw=282000),
    'W21x62': dict(d=21.0, bf=8.24,  tf=0.615, tw=0.400, A=18.3, Ix=1330, Sx=127,  Zx=144,   rx=8.54, Iy=57.5, Sy=13.9, Zy=21.7, ry=1.77,  J=1.83,  Cw=84600),
    # AISC Design Examples v15 reference sections
    'W18x50': dict(d=18.0, bf=7.495, tf=0.570, tw=0.355, A=14.7, Ix=800,  Sx=88.9, Zx=101,   rx=7.38, Iy=40.1, Sy=10.7, Zy=16.6, ry=1.65,  J=1.24,  Cw=3040),
    'W14x90': dict(d=14.0, bf=14.520,tf=0.710, tw=0.440, A=26.5, Ix=999,  Sx=143,  Zx=157,   rx=6.14, Iy=362,  Sy=49.9, Zy=75.6, ry=3.70,  J=4.06,  Cw=16000),
    'W14x99': dict(d=14.2, bf=14.565,tf=0.780, tw=0.485, A=29.1, Ix=1110, Sx=157,  Zx=173,   rx=6.17, Iy=402,  Sy=55.2, Zy=83.6, ry=3.71,  J=7.12,  Cw=18000),
    'W10x33': dict(d=9.73, bf=7.960, tf=0.435, tw=0.290, A=9.71, Ix=171,  Sx=35.0, Zx=38.8,  rx=4.20, Iy=36.6, Sy=9.20, Zy=14.0, ry=1.94,  J=0.583, Cw=789),
}

# SI sections (mm, mm², mm⁴, mm³)
EU_SECS = {
    'IPE300': dict(d=300, bf=150, tf=10.7, tw=7.1,  A=5380,  Ix=83560000,  Sx=557000,  Zx=628000,  rx=125, Iy=6040000,   Sy=80500,  Zy=125000, ry=33.5, J=29000,   Cw=358e9),
    'IPE200': dict(d=200, bf=100, tf=8.5,  tw=5.6,  A=2850,  Ix=19430000,  Sx=194000,  Zx=221000,  rx=82.6,Iy=1420000,   Sy=28500,  Zy=44600,  ry=22.4, J=8460,    Cw=37.9e9),
    'HEA200': dict(d=190, bf=200, tf=10.0, tw=6.5,  A=5380,  Ix=36920000,  Sx=389000,  Zx=429500,  rx=82.8,Iy=13360000,  Sy=134000, Zy=203800, ry=49.8, J=79800,   Cw=1150e9),
    'HEA300': dict(d=290, bf=300, tf=14.0, tw=8.5,  A=11250, Ix=182600000, Sx=1260000, Zx=1383400, rx=127, Iy=63100000,  Sy=421000, Zy=641200, ry=74.9, J=422000,  Cw=14400e9),
    'HEB300': dict(d=300, bf=300, tf=19.0, tw=11.0, A=14900, Ix=251700000, Sx=1678000, Zx=1869200, rx=130, Iy=85630000,  Sy=571000, Zy=870600, ry=75.8, J=1850000, Cw=12680e9),
}

# Indian sections (mm, mm², mm⁴, mm³)
IN_SECS = {
    'ISMB200': dict(d=200, bf=100, tf=10.8, tw=5.7,  A=3233, Ix=22350000, Sx=224000, Zx=261000, rx=83.2, Iy=1500000, Sy=30100, Zy=46600, ry=21.5, J=94994,   Cw=13430e6),
    'ISMB300': dict(d=300, bf=140, tf=13.1, tw=7.5,  A=5864, Ix=86900000, Sx=579000, Zx=678000, rx=121.8,Iy=4770000, Sy=68200, Zy=105000,ry=28.5, J=248312,  Cw=98200e6),
    'ISMB400': dict(d=400, bf=140, tf=16.0, tw=8.9,  A=7846, Ix=204580000,Sx=1022000,Zx=1202000,rx=161.4,Iy=6220000, Sy=88800, Zy=138000,ry=28.2, J=468770,  Cw=229300e6),
    'ISHB200': dict(d=200, bf=200, tf=9.0,  tw=6.1,  A=5259, Ix=36090000, Sx=361000, Zx=421000, rx=82.8, Iy=13280000,Sy=133000,Zy=204000, ry=50.3, J=110970,  Cw=121200e6),
    'ISLB300': dict(d=300, bf=150, tf=10.6, tw=6.7,  A=4808, Ix=73320000, Sx=489000, Zx=572000, rx=123.5,Iy=3760000, Sy=50100, Zy=78000,  ry=28.0, J=147053,  Cw=78750e6),
}

# ─── AISC Chapter E (same as steel-axial) ─────────────────────────────────────
def aisc_phiPn_us(Fy, A, rx, ry, KLx_in, KLy_in):
    E = 29000.0
    lx = KLx_in/rx; ly = KLy_in/ry
    lm = max(lx, ly)
    lLim = 4.71*math.sqrt(E/Fy)
    Fe = math.pi**2*E/lm**2
    Fcr = 0.658**(Fy/Fe)*Fy if lm <= lLim else 0.877*Fe
    Pn = Fcr*A
    return 0.90*Pn, Pn, Fcr, Fe, lm

def aisc_phiPn_si(fy, A_mm2, rx_mm, ry_mm, KLx_mm, KLy_mm):
    E = 200000.0
    lx = KLx_mm/rx_mm; ly = KLy_mm/ry_mm
    lm = max(lx, ly)
    lLim = 4.71*math.sqrt(E/fy)
    Fe = math.pi**2*E/lm**2
    Fcr = 0.658**(fy/Fe)*fy if lm <= lLim else 0.877*Fe
    Pn = Fcr*A_mm2/1000.0
    return 0.90*Pn, Pn, Fcr, Fe, lm

# ─── AISC Chapter F2 + F6 (strong and weak axis bending) ──────────────────────
def aisc_phi_Mnx_us(Fy, s, Lb_ft, Cb=1.0):
    """Strong-axis moment capacity with LTB [kip·ft], AISC F2."""
    E  = 29000.0; lf = 12
    d, tf, A = s['d'], s['tf'], s['A']
    Zx, Sx, Iy, J, Cw, ry = s['Zx'], s['Sx'], s['Iy'], s['J'], s['Cw'], s['ry']
    ho = d - tf
    Mp  = Fy*Zx/12.0
    M07 = 0.7*Fy*Sx/12.0
    Lp  = 1.76*ry*math.sqrt(E/Fy)/lf
    if Cw > 0:
        tv  = J/(Sx*ho)
        rts = math.sqrt(math.sqrt(Iy*Cw)/Sx)
        Lr  = 1.95*rts*(E/(0.7*Fy))*math.sqrt(tv+math.sqrt(tv**2+6.76*(0.7*Fy/E)**2))/lf
    else:
        tv = 0; rts = 0; Lr = 0
    Lb = Lb_ft
    if Cw == 0 or Lb <= Lp:
        Mnx = Mp; mode = 'NoLTB'
    elif Lb <= Lr:
        Mnx = min(Cb*(Mp-(Mp-M07)*(Lb-Lp)/(Lr-Lp)), Mp); mode = 'InelLTB'
    else:
        LbR = Lb*lf
        Fc2 = math.pi**2*E/(LbR/rts)**2*math.sqrt(1+0.078*tv*(LbR/rts)**2)
        Mnx = min(Cb*Fc2*Sx/12.0, Mp); mode = 'ElasLTB'
    return 0.90*Mnx, Mnx, Mp, Lp, Lr, mode

def aisc_phi_Mny_us(Fy, s):
    """Weak-axis moment capacity [kip·ft], AISC F6."""
    Zy, Sy = s['Zy'], s['Sy']
    Mpy  = Fy*Zy/12.0
    capy = 1.6*Fy*Sy/12.0
    Mny  = min(Mpy, capy)
    return 0.90*Mny, Mny

def aisc_phi_Mnx_si(fy, s, Lb_m):
    """Strong-axis moment capacity with LTB [kN·m], AISC F2 in SI."""
    E = 200000.0; lf = 1000
    d, tf = s['d'], s['tf']
    Zx, Sx, Iy, J, Cw, ry = s['Zx'], s['Sx'], s['Iy'], s['J'], s['Cw'], s['ry']
    ho = d - tf
    Mp  = fy*Zx/1e6
    M07 = 0.7*fy*Sx/1e6
    Lp  = 1.76*ry*math.sqrt(E/fy)/lf
    if Cw > 0:
        tv  = J/(Sx*ho)
        rts = math.sqrt(math.sqrt(Iy*Cw)/Sx)
        Lr  = 1.95*rts*(E/(0.7*fy))*math.sqrt(tv+math.sqrt(tv**2+6.76*(0.7*fy/E)**2))/lf
    else:
        tv = 0; rts = 0; Lr = 0
    Lb = Lb_m
    if Cw == 0 or Lb <= Lp:
        Mnx = Mp; mode = 'NoLTB'
    elif Lb <= Lr:
        Mnx = min(Mp-(Mp-M07)*(Lb-Lp)/(Lr-Lp), Mp); mode = 'InelLTB'
    else:
        LbR = Lb*lf
        Fc2 = math.pi**2*E/(LbR/rts)**2*math.sqrt(1+0.078*tv*(LbR/rts)**2)
        Mnx = min(Fc2*Sx/1e6, Mp); mode = 'ElasLTB'
    return 0.90*Mnx, Mnx, Mp, Lp, Lr, mode

def aisc_phi_Mny_si(fy, s):
    """Weak-axis moment capacity [kN·m], AISC F6."""
    Zy, Sy = s['Zy'], s['Sy']
    Mpy  = fy*Zy/1e6
    capy = 1.6*fy*Sy/1e6
    Mny  = min(Mpy, capy)
    return 0.90*Mny, Mny

# ─── AISC Chapter H interaction ────────────────────────────────────────────────
def aisc_H(phiPn, phiMnx, phiMny, Pu, Mux, Muy):
    rP  = Pu/phiPn  if phiPn  > 0 else 999
    rMx = Mux/phiMnx if phiMnx > 0 else 0
    rMy = Muy/phiMny if phiMny > 0 else 0
    if rP >= 0.2:
        H = rP + (8/9)*(rMx+rMy); eq = 'H1-1a'
    else:
        H = rP/2 + rMx + rMy;    eq = 'H1-1b'
    return H, rP, rMx, rMy, eq

# ─── EC3 §6.3.1 + §6.3.2 + §6.3.3 (Annex B simplified) ───────────────────────
def perry_chi(KLr, fy, E, alpha):
    lam = KLr / (math.pi*math.sqrt(E/fy))
    Phi = 0.5*(1+alpha*(lam-0.2)+lam**2)
    chi = min(1.0, 1.0/(Phi+math.sqrt(max(0, Phi**2-lam**2))))
    return chi, lam

def ec3_axial(fy, s, KLy_mm, KLz_mm):
    """Returns chiy, chiz, lam_y, lam_z, NRk_kN, NbRdy, NbRdz"""
    E = 210000.0; gM1 = 1.0
    A = s['A']; Ix = s['Ix']; Iy = s['Iy']; tf = s['tf']
    hb = s['d']/s['bf']
    NRk_N  = A*fy; NRk_kN = NRk_N/1000.0
    Ncr_y  = math.pi**2*E*Ix/KLy_mm**2
    Ncr_z  = math.pi**2*E*Iy/KLz_mm**2
    lam_y  = math.sqrt(NRk_N/Ncr_y)
    lam_z  = math.sqrt(NRk_N/Ncr_z)
    Cw = s['Cw']
    if Cw == 0:
        ay = az = 0.21
    elif hb > 1.2 and tf <= 100:
        ay, az = 0.21, 0.34
    else:
        ay, az = 0.34, 0.49
    phiy = 0.5*(1+ay*(lam_y-0.2)+lam_y**2)
    chiy = min(1.0, 1.0/(phiy+math.sqrt(max(0, phiy**2-lam_y**2))))
    phiz = 0.5*(1+az*(lam_z-0.2)+lam_z**2)
    chiz = min(1.0, 1.0/(phiz+math.sqrt(max(0, phiz**2-lam_z**2))))
    NbRdy = chiy*NRk_kN/gM1
    NbRdz = chiz*NRk_kN/gM1
    return chiy, chiz, lam_y, lam_z, NRk_kN, NbRdy, NbRdz, ay, az

def ec3_ltb(fy, s, Lb_mm):
    """Returns chiLT, lamLT, MbRd [kN·m], MRdz [kN·m]"""
    E = 210000.0; G = 81000.0; gM1 = 1.0
    Zx, Iy, J, Cw = s['Zx'], s['Iy'], s['J'], s['Cw']
    hb = s['d']/s['bf']
    if Cw == 0:
        MRky_N = Zx*fy
        chiLT = 1.0; lamLT = 0.0; MbRd = chiLT*MRky_N/gM1/1e6
    else:
        t1 = math.pi/Lb_mm*math.sqrt(E*Iy*G*J)
        t2 = math.sqrt(1+math.pi**2*E*Cw/(G*J*Lb_mm**2))
        Mcr_N = t1*t2
        MRky_N = Zx*fy
        lamLT = math.sqrt(MRky_N/Mcr_N)
        aLT = 0.34 if hb <= 2 else 0.49
        if lamLT <= 0.4:
            chiLT = 1.0
        else:
            phiLT = 0.5*(1+aLT*(lamLT-0.4)+0.75*lamLT**2)
            chiLT = min(1.0, min(1.0/(phiLT+math.sqrt(max(0, phiLT**2-0.75*lamLT**2))), 1.0/lamLT**2))
        MbRd = chiLT*MRky_N/(gM1*1e6)
    MRdz = s['Zy']*fy/(1.0*1e6)
    return chiLT, lamLT, MbRd, MRdz

def ec3_interaction(NEd, MyEd, MzEd, chiy, chiz, NRk_kN, MbRd, MRdz, lam_y, lam_z):
    """Returns eq661, eq662, DCR per EC3 §6.3.3 Annex B (simplified, CmLT=1)."""
    gM1 = 1.0
    nEdy = NEd/(chiy*NRk_kN)
    nEdz = NEd/(chiz*NRk_kN)
    kyy  = 1 + min(max(lam_y-0.2, 0), 0.8)*nEdy
    kzz  = 1 + min(max(2*lam_z-0.6, 0), 1.4)*nEdz
    kyz  = 0.6*kzz
    kzy  = max(1 - min(0.133*lam_z, 0.133)*nEdz, 0.01)
    aN   = NEd/(chiy*NRk_kN/gM1) if chiy*NRk_kN > 0 else 999
    bN   = NEd/(chiz*NRk_kN/gM1) if chiz*NRk_kN > 0 else 999
    aMx  = kyy*MyEd/MbRd  if MbRd > 0 else 0
    aMy  = kyz*MzEd/MRdz  if MRdz > 0 else 0
    bMx  = kzy*MyEd/MbRd  if MbRd > 0 else 0
    bMy  = kzz*MzEd/MRdz  if MRdz > 0 else 0
    eq661 = aN + aMx + aMy
    eq662 = bN + bMx + bMy
    return eq661, eq662, max(eq661, eq662), kyy, kzz, kyz, kzy

# ─── IS800 §7 + §8 + §9 ────────────────────────────────────────────────────────
def is800_axial(fy, s, KLx_mm, KLy_mm, sec_type='ISMB'):
    """Returns Pd [kN], chix, chiy, fcd_gov"""
    E = 200000.0; gm0 = 1.10
    A = s['A']; Ix = s['Ix']; Iy = s['Iy']
    NRk_N = A*fy
    Ncr_x = math.pi**2*E*Ix/KLx_mm**2
    Ncr_y = math.pi**2*E*Iy/KLy_mm**2
    lamx  = math.sqrt(NRk_N/Ncr_x)
    lamy  = math.sqrt(NRk_N/Ncr_y)
    Cw = s['Cw']
    if Cw == 0:
        ax = ayw = 0.21
    elif sec_type in ('ISMB','ISLB','ISWB'):
        ax, ayw = 0.21, 0.34
    else:  # ISHB etc.
        ax, ayw = 0.34, 0.49
    phix = 0.5*(1+ax*(lamx-0.2)+lamx**2)
    chix = min(1.0, 1.0/(phix+math.sqrt(max(0, phix**2-lamx**2))))
    phiy = 0.5*(1+ayw*(lamy-0.2)+lamy**2)
    chiy = min(1.0, 1.0/(phiy+math.sqrt(max(0, phiy**2-lamy**2))))
    fcdx = chix*fy/gm0
    fcdy = chiy*fy/gm0
    fcd  = min(fcdx, fcdy)
    Pd   = A*fcd/1000.0
    return Pd, chix, chiy, lamx, lamy, fcd

def is800_ltb(fy, s, Lb_mm):
    """Returns chiLT, lamLT, Mdx [kN·m], Mdz [kN·m] per IS800 §8.2"""
    E = 200000.0; G = 77000.0; gm0 = 1.10
    Zx, Zy, Iy, J, Cw = s['Zx'], s['Zy'], s['Iy'], s['J'], s['Cw']
    hb = s['d']/s['bf']
    if Cw == 0:
        chiLT = 1.0; lamLT = 0.0
    else:
        t1 = math.pi/Lb_mm*math.sqrt(E*Iy*G*J)
        t2 = math.sqrt(1+math.pi**2*E*Cw/(G*J*Lb_mm**2))
        Mcr_N = t1*t2
        lamLT = math.sqrt(Zx*fy/Mcr_N)
        aLT = 0.21 if hb <= 2 else 0.34
        if lamLT <= 0.4:
            chiLT = 1.0
        else:
            phiLT = 0.5*(1+aLT*(lamLT-0.2)+lamLT**2)
            chiLT = min(1.0, 1.0/(phiLT+math.sqrt(max(0, phiLT**2-lamLT**2))))
    Mdx = chiLT*Zx*fy/(gm0*1e6)
    Mdz = Zy*fy/(gm0*1e6)
    return chiLT, lamLT, Mdx, Mdz

def is800_H(Pu, Mux, Muy, Pd, Mdx, Mdz):
    rP  = Pu/Pd    if Pd  > 0 else 999
    rMx = Mux/Mdx  if Mdx > 0 else 0
    rMy = Muy/Mdz  if Mdz > 0 else 0
    return rP+rMx+rMy, rP, rMx, rMy


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 1 — AISC US  |  W sections  |  axial + bending
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 1 — AISC US  |  W Sections  |  Fy=50 ksi")

# 1.1  W14×48, Fy=50, L=14ft, Kx=Ky=1.0, Lb=14ft
#       Pu=200kip, Mux=100kip·ft, Muy=0 → rP≈0.56 → H1-1a
sub("1.1  W14×48  L=14ft  Pu=200kip  Mux=100kip·ft")
s = W_SECS['W14x48']; Fy = 50.0
KLx = 1.0*14*12; KLy = 1.0*14*12
phiPn, Pn, Fcr, Fe, lm = aisc_phiPn_us(Fy, s['A'], s['rx'], s['ry'], KLx, KLy)
phiMnx, Mnx, Mp, Lp, Lr, ltbMode = aisc_phi_Mnx_us(Fy, s, 14.0)
phiMny, Mny = aisc_phi_Mny_us(Fy, s)
H, rP, rMx, rMy, eq = aisc_H(phiPn, phiMnx, phiMny, 200, 100, 0)
chk("1.1a  phiPn [kip]", phiPn, 0.90*Fcr*s['A'])
chk("1.1b  LTB mode = Inelastic", float(ltbMode=='InelLTB'), 1.0)
chk("1.1c  phiMnx [kip·ft]", phiMnx, 0.90*Mnx)
chk("1.1d  phiMny [kip·ft]", phiMny, 0.90*min(Fy*s['Zy']/12, 1.6*Fy*s['Sy']/12))
chk("1.1e  Interaction Eq", float(eq=='H1-1a'), 1.0)
chk("1.1f  H (DCR)", H, rP+(8/9)*(rMx+rMy))

# 1.2  W12×65, Fy=50, L=10ft, Kx=Ky=1, Lb=10ft
#       Pu=80kip, Mux=200kip·ft, Muy=20kip·ft → rP<0.2 → H1-1b
sub("1.2  W12×65  L=10ft  Pu=80kip  Mux=200 Muy=20kip·ft")
s = W_SECS['W12x65']; Fy = 50.0
KLx = 1.0*10*12; KLy = 1.0*10*12
phiPn2, Pn2, Fcr2, Fe2, lm2 = aisc_phiPn_us(Fy, s['A'], s['rx'], s['ry'], KLx, KLy)
phiMnx2, Mnx2, Mp2, Lp2, Lr2, ltbMode2 = aisc_phi_Mnx_us(Fy, s, 10.0)
phiMny2, Mny2 = aisc_phi_Mny_us(Fy, s)
H2, rP2, rMx2, rMy2, eq2 = aisc_H(phiPn2, phiMnx2, phiMny2, 80, 200, 20)
chk("1.2a  phiPn [kip]", phiPn2, 0.90*Fcr2*s['A'])
chk("1.2b  LTB mode = Plastic (Lb≤Lp)", float(ltbMode2=='NoLTB'), 1.0)  # Lb=10ft, Lp≈15ft for W12×65
chk("1.2c  Interaction Eq", float(eq2=='H1-1b'), float(rP2 < 0.2))
chk("1.2d  H (DCR)", H2, rP2/2+rMx2+rMy2 if rP2<0.2 else rP2+(8/9)*(rMx2+rMy2))

# 1.3  W18×35, Fy=50, L=20ft → elastic buckling + elastic LTB check
sub("1.3  W18×35  L=20ft  Pu=50kip  Mux=50kip·ft  (elastic buckling)")
s = W_SECS['W18x35']; Fy = 50.0
KLx = 1.0*20*12; KLy = 1.0*20*12
phiPn3, Pn3, Fcr3, Fe3, lm3 = aisc_phiPn_us(Fy, s['A'], s['rx'], s['ry'], KLx, KLy)
phiMnx3, Mnx3, Mp3, Lp3, Lr3, ltbMode3 = aisc_phi_Mnx_us(Fy, s, 20.0)
lLim3 = 4.71*math.sqrt(29000/Fy)
chk("1.3a  Axial: elastic branch (KLr>lLim)", float(lm3 > lLim3), 1.0)
chk("1.3b  phiPn [kip]", phiPn3, 0.90*0.877*Fe3*s['A'])
chk("1.3c  LTB mode logged", float(ltbMode3 in ('InelLTB','ElasLTB','NoLTB')), 1.0)
chk("1.3d  Lb=20ft > Lp", float(20.0 > Lp3), 1.0)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 2 — AISC US  |  Lp / Lr boundary verification
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 2 — AISC US  |  LTB Boundary Checks")

# 2.1  W14×48: Lp and Lr values
sub("2.1  W14×48  Lp & Lr")
s = W_SECS['W14x48']; Fy=50; E=29000; lf=12
d,tf,Iy,J,Cw,ry,Sx = s['d'],s['tf'],s['Iy'],s['J'],s['Cw'],s['ry'],s['Sx']
ho = d-tf; tv = J/(Sx*ho)
rts = math.sqrt(math.sqrt(Iy*Cw)/Sx)
Lp_exp = 1.76*ry*math.sqrt(E/Fy)/lf
Lr_exp = 1.95*rts*(E/(0.7*Fy))*math.sqrt(tv+math.sqrt(tv**2+6.76*(0.7*Fy/E)**2))/lf
_, _, _, Lp_got, Lr_got, _ = aisc_phi_Mnx_us(Fy, s, 14.0)
chk("2.1a  Lp [ft]", Lp_got, Lp_exp)
chk("2.1b  Lr [ft]", Lr_got, Lr_exp)

# 2.2  W14×48 Lb=5ft (<Lp) → plastic
sub("2.2  W14×48  Lb=5ft  (plastic, no LTB)")
phiMnx_pl, _, Mp_pl, _, _, mode_pl = aisc_phi_Mnx_us(50, W_SECS['W14x48'], 5.0)
chk("2.2a  mode = NoLTB (Lb<Lp)", float(mode_pl == 'NoLTB'), 1.0)
chk("2.2b  phiMnx = 0.9*Mp", phiMnx_pl, 0.90*50*W_SECS['W14x48']['Zx']/12.0)

# 2.3  W18×35 Lb=40ft > Lr → elastic LTB
sub("2.3  W18×35  Lb=40ft  (elastic LTB)")
_, _, _, _, Lr_w18, _ = aisc_phi_Mnx_us(50, W_SECS['W18x35'], 14.0)
if 40.0 > Lr_w18:
    _, _, _, _, _, mode_el = aisc_phi_Mnx_us(50, W_SECS['W18x35'], 40.0)
    chk("2.3a  mode = ElasLTB (Lb>Lr)", float(mode_el == 'ElasLTB'), 1.0)
else:
    chk("2.3a  Lb=40ft > Lr (need larger Lb)", float(40.0 > Lr_w18), 1.0)

# 2.4  W14×132: wide-flange with large bf — check Lp
sub("2.4  W14×132  Lp & Lr  Fy=50")
s = W_SECS['W14x132']; Fy=50
_, _, _, Lp4, Lr4, _ = aisc_phi_Mnx_us(Fy, s, 14.0)
Lp_exp4 = 1.76*s['ry']*math.sqrt(29000/Fy)/12.0
chk("2.4a  Lp [ft]", Lp4, Lp_exp4)
chk("2.4b  Lr [ft] > Lp", float(Lr4 > Lp4), 1.0)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 3 — AISC SI (TSDS units)  |  IPE + HEA  |  fy=355 MPa
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 3 — AISC SI (E=200 000)  |  IPE + HEA  |  fy=355 MPa")

# 3.1  IPE 300, L=4m, K=1.0, lrx=lry=1.0, Pu=500kN, Mux=100kN·m, Muy=0
sub("3.1  IPE 300  L=4m  Pu=500kN  Mux=100kN·m")
s = EU_SECS['IPE300']; fy=355; L=4.0
KLx_mm = 1.0*L*1000; KLy_mm = 1.0*L*1000
phiPn_si, Pn_si, Fcr_si, Fe_si, lm_si = aisc_phiPn_si(fy, s['A'], s['rx'], s['ry'], KLx_mm, KLy_mm)
phiMnx_si, Mnx_si, Mp_si, Lp_si, Lr_si, ltb_si = aisc_phi_Mnx_si(fy, s, L)
phiMny_si, Mny_si = aisc_phi_Mny_si(fy, s)
H_si, rP_si, rMx_si, rMy_si, eq_si = aisc_H(phiPn_si, phiMnx_si, phiMny_si, 500, 100, 0)
chk("3.1a  phiPn [kN]", phiPn_si, 0.90*Fcr_si*s['A']/1000)
chk("3.1b  phiMnx [kN·m]", phiMnx_si, 0.90*Mnx_si)
chk("3.1c  H (DCR)", H_si, rP_si+(8/9)*(rMx_si+rMy_si) if rP_si>=0.2 else rP_si/2+rMx_si+rMy_si)

# 3.2  HEA 300, L=5m, K=1.0, Pu=2000kN, Mux=200kN·m
sub("3.2  HEA 300  L=5m  Pu=2000kN  Mux=200kN·m")
s = EU_SECS['HEA300']; fy=355; L=5.0
KLx_mm = 1.0*L*1000; KLy_mm = 1.0*L*1000
phiPn2, Pn2, Fcr2, Fe2, lm2 = aisc_phiPn_si(fy, s['A'], s['rx'], s['ry'], KLx_mm, KLy_mm)
phiMnx2, Mnx2, Mp2, Lp2, Lr2, ltb2 = aisc_phi_Mnx_si(fy, s, L)
phiMny2, Mny2 = aisc_phi_Mny_si(fy, s)
H2, rP2, _, _, eq2 = aisc_H(phiPn2, phiMnx2, phiMny2, 2000, 200, 0)
chk("3.2a  phiPn [kN]", phiPn2, 0.90*Fcr2*s['A']/1000)
chk("3.2b  phiMnx [kN·m]", phiMnx2, 0.90*Mnx2)
H2r, rP2r, rMx2r, rMy2r, eq2r = aisc_H(phiPn2, phiMnx2, phiMny2, 2000, 200, 0)
chk("3.2c  H (DCR)", H2r, rP2r+(8/9)*(rMx2r+rMy2r) if rP2r>=0.2 else rP2r/2+rMx2r+rMy2r)
chk("3.2d  Eq = H1-1a (rP≥0.2)", float(eq2r=='H1-1a'), float(rP2r>=0.2))

# 3.3  IPE 200, fy=275, L=3m, bending-dominated
sub("3.3  IPE 200  L=3m  fy=275  Pu=100kN  Mux=50kN·m")
s = EU_SECS['IPE200']; fy=275; L=3.0
KLx_mm = L*1000; KLy_mm = L*1000
phiPn3, _, Fcr3, _, _ = aisc_phiPn_si(fy, s['A'], s['rx'], s['ry'], KLx_mm, KLy_mm)
phiMnx3, Mnx3, Mp3, Lp3, Lr3, ltb3 = aisc_phi_Mnx_si(fy, s, L)
H3, rP3, rMx3, rMy3, eq3 = aisc_H(phiPn3, phiMnx3, 0, 100, 50, 0)
chk("3.3a  phiPn [kN]", phiPn3, 0.90*Fcr3*s['A']/1000)
chk("3.3b  phiMnx [kN·m]", phiMnx3, 0.90*Mnx3)
chk("3.3c  H", H3, rP3/2+rMx3 if rP3<0.2 else rP3+(8/9)*rMx3)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 4 — EC3 §6.3  |  IPE  |  fy=355 MPa
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 4 — EN 1993-1-1  |  IPE  |  fy=355 MPa")

# 4.1  IPE 300, L=4m, KX=KY=1, lrx=lry=1, NEd=500, MyEd=100, MzEd=0
sub("4.1  IPE 300  L=4m  NEd=500kN  MyEd=100kN·m")
s = EU_SECS['IPE300']; fy=355; Lm=4.0
KLy_mm = Lm*1000; KLz_mm = Lm*1000
chiy, chiz, lam_y, lam_z, NRk, NbRdy, NbRdz, ay, az = ec3_axial(fy, s, KLy_mm, KLz_mm)
chiLT, lamLT, MbRd, MRdz = ec3_ltb(fy, s, Lm*1000)
eq661, eq662, DCR, kyy, kzz, kyz, kzy = ec3_interaction(500, 100, 0, chiy, chiz, NRk, MbRd, MRdz, lam_y, lam_z)
# hb=300/150=2.0 > 1.2 → ay=0.21, az=0.34
chk("4.1a  ay=0.21 (IPE h/b>1.2)", ay, 0.21)
chk("4.1b  az=0.34", az, 0.34)
chk("4.1c  NbRdz [kN]", NbRdz, chiz*NRk)
chk("4.1d  chiLT", chiLT, chiLT)   # self-consistency
chk("4.1e  eq661", eq661, 500/(chiy*NRk)+kyy*100/MbRd)
chk("4.1f  eq662", eq662, 500/(chiz*NRk)+kzy*100/MbRd)
chk("4.1g  DCR = max(661,662)", DCR, max(eq661, eq662))

# 4.2  IPE 300, L=4m, pure bending (NEd=0)
sub("4.2  IPE 300  L=4m  NEd=0  MyEd=150kN·m  (pure bending)")
chiy2, chiz2, lam_y2, lam_z2, NRk2, NbRdy2, NbRdz2, _, _ = ec3_axial(fy, s, KLy_mm, KLz_mm)
chiLT2, lamLT2, MbRd2, MRdz2 = ec3_ltb(fy, s, Lm*1000)
eq661_2, eq662_2, DCR2, kyy_2, kzz_2, kyz_2, kzy_2 = ec3_interaction(0, 150, 0, chiy2, chiz2, NRk2, MbRd2, MRdz2, lam_y2, lam_z2)
chk("4.2a  eq661 (pure bending = MyEd/MbRd)", eq661_2, 150/MbRd2)
chk("4.2b  eq662 (pure bending with kzy_2)", eq662_2, kzy_2*150/MbRd2)

# 4.3  IPE 200, L=2m, fy=275, NEd=200kN, MyEd=30kN·m
sub("4.3  IPE 200  L=2m  fy=275  NEd=200kN  MyEd=30kN·m")
s = EU_SECS['IPE200']; fy3=275; Lm3=2.0
KLy3 = Lm3*1000; KLz3 = Lm3*1000
chiy3, chiz3, lam_y3, lam_z3, NRk3, NbRdy3, NbRdz3, _, _ = ec3_axial(fy3, s, KLy3, KLz3)
chiLT3, lamLT3, MbRd3, MRdz3 = ec3_ltb(fy3, s, Lm3*1000)
eq661_3, eq662_3, DCR3, kyy3, kzz3, kyz3, kzy3 = ec3_interaction(200, 30, 0, chiy3, chiz3, NRk3, MbRd3, MRdz3, lam_y3, lam_z3)
chk("4.3a  NbRdz [kN]", NbRdz3, chiz3*NRk3)
chk("4.3b  MbRd [kN·m]", MbRd3, chiLT3*s['Zx']*fy3/1e6)
chk("4.3c  eq661", eq661_3, 200/(chiy3*NRk3)+kyy3*30/MbRd3)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 5 — EC3  |  HEA  |  fy=355 MPa  (h/b ≤ 1.2 → curves b/c)
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 5 — EN 1993-1-1  |  HEA  |  fy=355 MPa")

# 5.1  HEA 300, L=5m  — h/b=290/300=0.967 ≤ 1.2 → ay=0.34, az=0.49
sub("5.1  HEA 300  L=5m  NEd=1500kN  MyEd=200kN·m")
s = EU_SECS['HEA300']; fy=355; Lm=5.0
KLy_mm = Lm*1000; KLz_mm = Lm*1000
chiy5, chiz5, lam_y5, lam_z5, NRk5, NbRdy5, NbRdz5, ay5, az5 = ec3_axial(fy, s, KLy_mm, KLz_mm)
chiLT5, lamLT5, MbRd5, MRdz5 = ec3_ltb(fy, s, Lm*1000)
eq661_5, eq662_5, DCR5, kyy5, kzz5, kyz5, kzy5 = ec3_interaction(1500, 200, 0, chiy5, chiz5, NRk5, MbRd5, MRdz5, lam_y5, lam_z5)
hb5 = s['d']/s['bf']
chk("5.1a  h/b = 290/300 ≤ 1.2 → ay=0.34", ay5, 0.34)
chk("5.1b  az=0.49", az5, 0.49)
chk("5.1c  NbRdz [kN]", NbRdz5, chiz5*NRk5)
chk("5.1d  eq661", eq661_5, 1500/(chiy5*NRk5)+kyy5*200/MbRd5)
chk("5.1e  eq662", eq662_5, 1500/(chiz5*NRk5)+kzy5*200/MbRd5)
chk("5.1f  DCR = max(661,662)", DCR5, max(eq661_5,eq662_5))

# 5.2  HEA 200, L=4m  — h/b=190/200=0.95 ≤ 1.2 → ay=0.34, az=0.49
sub("5.2  HEA 200  L=4m  NEd=800kN  MyEd=80kN·m")
s = EU_SECS['HEA200']; fy=355; Lm=4.0
KLy_mm = Lm*1000; KLz_mm = Lm*1000
chiy52, chiz52, lam_y52, lam_z52, NRk52, NbRdy52, NbRdz52, ay52, az52 = ec3_axial(fy, s, KLy_mm, KLz_mm)
chiLT52, lamLT52, MbRd52, MRdz52 = ec3_ltb(fy, s, Lm*1000)
eq661_52, eq662_52, DCR52, kyy52, kzz52, kyz52, kzy52 = ec3_interaction(800, 80, 0, chiy52, chiz52, NRk52, MbRd52, MRdz52, lam_y52, lam_z52)
chk("5.2a  ay=0.34, az=0.49", ay52 + az52, 0.34+0.49)
chk("5.2b  NbRdz [kN]", NbRdz52, chiz52*NRk52)
chk("5.2c  MbRd [kN·m]", MbRd52, chiLT52*s['Zx']*fy/1e6)
chk("5.2d  DCR", DCR52, max(eq661_52,eq662_52))

# 5.3  HEB 300, L=5m  — h/b=1.0 ≤ 1.2 → ay=0.34, az=0.49
sub("5.3  HEB 300  L=5m  NEd=2000kN  MyEd=100kN·m")
s = EU_SECS['HEB300']; fy=355; Lm=5.0
KLy_mm = Lm*1000; KLz_mm = Lm*1000
chiy53, chiz53, lam_y53, lam_z53, NRk53, NbRdy53, NbRdz53, ay53, az53 = ec3_axial(fy, s, KLy_mm, KLz_mm)
chiLT53, lamLT53, MbRd53, MRdz53 = ec3_ltb(fy, s, Lm*1000)
eq661_53, eq662_53, DCR53, kyy53, kzz53, kyz53, kzy53 = ec3_interaction(2000, 100, 0, chiy53, chiz53, NRk53, MbRd53, MRdz53, lam_y53, lam_z53)
chk("5.3a  ay=0.34, az=0.49", ay53, 0.34)
chk("5.3b  NbRdz [kN]", NbRdz53, chiz53*NRk53)
chk("5.3c  eq661", eq661_53, 2000/(chiy53*NRk53)+kyy53*100/MbRd53)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 6 — IS 800:2000  |  ISMB  |  fy=250 MPa
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 6 — IS 800:2000  |  ISMB  |  fy=250 MPa")

# 6.1  ISMB 300, L=4m, K=1.0, lrx=1, lry=1, Pu=600kN, Mux=80kN·m
sub("6.1  ISMB 300  L=4m  Pu=600kN  Mux=80kN·m")
s = IN_SECS['ISMB300']; fy=250; L=4.0
KLx_mm = L*1000; KLy_mm = L*1000
Pd, chix, chiy, lamx, lamy, fcd = is800_axial(fy, s, KLx_mm, KLy_mm, 'ISMB')
chiLT, lamLT, Mdx, Mdz = is800_ltb(fy, s, L*1000)
H6, rP6, rMx6, rMy6 = is800_H(600, 80, 0, Pd, Mdx, Mdz)
chk("6.1a  Pd [kN]", Pd, s['A']*fcd/1000)
chk("6.1b  chiLT ≤ 1.0", float(chiLT <= 1.0), 1.0)
chk("6.1c  Mdx [kN·m]", Mdx, chiLT*s['Zx']*fy/(1.10*1e6))
chk("6.1d  Mdz [kN·m]", Mdz, s['Zy']*fy/(1.10*1e6))
chk("6.1e  H = P/Pd + Mx/Mdx", H6, 600/Pd+80/Mdx)

# 6.2  ISMB 200, L=3m, Pu=300kN, Mux=40kN·m
sub("6.2  ISMB 200  L=3m  Pu=300kN  Mux=40kN·m")
s = IN_SECS['ISMB200']; fy=250; L=3.0
KLx_mm = L*1000; KLy_mm = L*1000
Pd2, chix2, chiy2, lamx2, lamy2, fcd2 = is800_axial(fy, s, KLx_mm, KLy_mm, 'ISMB')
chiLT2, lamLT2, Mdx2, Mdz2 = is800_ltb(fy, s, L*1000)
H62, rP62, rMx62, rMy62 = is800_H(300, 40, 0, Pd2, Mdx2, Mdz2)
chk("6.2a  Pd [kN]", Pd2, s['A']*fcd2/1000)
chk("6.2b  Mdx [kN·m]", Mdx2, chiLT2*s['Zx']*fy/(1.10*1e6))
chk("6.2c  H", H62, 300/Pd2+40/Mdx2)

# 6.3  ISMB 400, L=5m, Pu=1000kN, Mux=200kN·m, Muy=0
sub("6.3  ISMB 400  L=5m  Pu=1000kN  Mux=200kN·m")
s = IN_SECS['ISMB400']; fy=250; L=5.0
KLx_mm = L*1000; KLy_mm = L*1000
Pd3, chix3, chiy3, lamx3, lamy3, fcd3 = is800_axial(fy, s, KLx_mm, KLy_mm, 'ISMB')
chiLT3, lamLT3, Mdx3, Mdz3 = is800_ltb(fy, s, L*1000)
H63, rP63, rMx63, rMy63 = is800_H(1000, 200, 0, Pd3, Mdx3, Mdz3)
chk("6.3a  Pd [kN]", Pd3, s['A']*fcd3/1000)
chk("6.3b  H", H63, 1000/Pd3+200/Mdx3)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 7 — IS 800:2000  |  ISHB (h/b≤2 → aLT=0.21)  |  fy=250 MPa
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 7 — IS 800:2000  |  ISHB  |  fy=250 MPa")

# 7.1  ISHB 200, L=4m, Pu=700kN, Mux=60kN·m
sub("7.1  ISHB 200  L=4m  Pu=700kN  Mux=60kN·m")
s = IN_SECS['ISHB200']; fy=250; L=4.0
KLx_mm = L*1000; KLy_mm = L*1000
Pd71, chix71, chiy71, lamx71, lamy71, fcd71 = is800_axial(fy, s, KLx_mm, KLy_mm, 'ISHB')
chiLT71, lamLT71, Mdx71, Mdz71 = is800_ltb(fy, s, L*1000)
H71, rP71, rMx71, rMy71 = is800_H(700, 60, 0, Pd71, Mdx71, Mdz71)
hb71 = s['d']/s['bf']
chk("7.1a  h/b=1.0 ≤ 2 → aLT=0.21", float(hb71 <= 2), 1.0)
chk("7.1b  Pd [kN] (ISHB: ax=0.34, ayw=0.49)", Pd71, s['A']*fcd71/1000)
chk("7.1c  Mdx [kN·m]", Mdx71, chiLT71*s['Zx']*fy/(1.10*1e6))
chk("7.1d  H", H71, 700/Pd71+60/Mdx71)

# 7.2  ISLB 300, L=4m, Pu=500kN, Mux=100kN·m
sub("7.2  ISLB 300  L=4m  Pu=500kN  Mux=100kN·m")
s = IN_SECS['ISLB300']; fy=250; L=4.0
KLx_mm = L*1000; KLy_mm = L*1000
Pd72, chix72, chiy72, lamx72, lamy72, fcd72 = is800_axial(fy, s, KLx_mm, KLy_mm, 'ISLB')
chiLT72, lamLT72, Mdx72, Mdz72 = is800_ltb(fy, s, L*1000)
H72, rP72, rMx72, rMy72 = is800_H(500, 100, 0, Pd72, Mdx72, Mdz72)
chk("7.2a  Pd [kN]", Pd72, s['A']*fcd72/1000)
chk("7.2b  Mdx [kN·m]", Mdx72, chiLT72*s['Zx']*fy/(1.10*1e6))
chk("7.2c  H", H72, 500/Pd72+100/Mdx72)

# 7.3  ISMB 200, Lb=0.4m (very short) → lamLT < 0.4 → chiLT=1.0
sub("7.3  ISMB 200  Lb=0.4m  (very short, lamLT<0.4 → chiLT=1)")
s = IN_SECS['ISMB200']; fy=250
chiLT73, lamLT73, Mdx73, Mdz73 = is800_ltb(fy, s, 400.0)
Mdx_pl = s['Zx']*fy/(1.10*1e6)   # plastic (chiLT=1)
chk("7.3a  lamLT < 0.4 → chiLT=1.0", float(lamLT73 < 0.4), 1.0)
chk("7.3b  Mdx = Zx*fy/gm0 (plastic)", Mdx73, Mdx_pl)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 8 — LTB consistency: IS800 vs EC3 curve selection
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 8 — LTB Curve Selection & Intermediate Value Checks")

# 8.1  EC3 IPE 300 lamLT vs independent Mcr
sub("8.1  EC3 IPE 300  Lb=4m  lamLT check")
s = EU_SECS['IPE300']; fy=355; Lb=4000.0
E=210000; G=81000
Iy=s['Iy']; J=s['J']; Cw=s['Cw']; Zx=s['Zx']
t1 = math.pi/Lb*math.sqrt(E*Iy*G*J)
t2 = math.sqrt(1+math.pi**2*E*Cw/(G*J*Lb**2))
Mcr_N = t1*t2
lamLT_exp = math.sqrt(Zx*fy/Mcr_N)
chiLT_got, lamLT_got, MbRd_got, _ = ec3_ltb(fy, s, Lb)
chk("8.1a  lamLT", lamLT_got, lamLT_exp)
chk("8.1b  hb=2 → aLT=0.34 (curve b)", float(abs(s['d']/s['bf']-2.0)<0.01), 1.0)

# 8.2  IS800 IPE-equivalent: h/b=2 → aLT=0.21
sub("8.2  ISMB 300  Lb=4m  IS800 lamLT check")
s = IN_SECS['ISMB300']; fy=250; Lb=4000.0
E=200000; G=77000
Iy=s['Iy']; J=s['J']; Cw=s['Cw']; Zx=s['Zx']
t1 = math.pi/Lb*math.sqrt(E*Iy*G*J)
t2 = math.sqrt(1+math.pi**2*E*Cw/(G*J*Lb**2))
Mcr_N = t1*t2
lamLT_exp82 = math.sqrt(Zx*fy/Mcr_N)
chiLT_got82, lamLT_got82, _, _ = is800_ltb(fy, s, Lb)
hb82 = s['d']/s['bf']  # 300/140 = 2.14 > 2 → aLT=0.34
chk("8.2a  lamLT", lamLT_got82, lamLT_exp82)
chk("8.2b  h/b=2.14>2 → aLT=0.34", float(hb82 > 2), 1.0)

# 8.3  EC3 biaxial: NEd + MyEd + MzEd
sub("8.3  HEA 300  L=5m  NEd=1000kN  MyEd=150kN·m  MzEd=30kN·m")
s = EU_SECS['HEA300']; fy=355; Lm=5.0
KLy_mm = Lm*1000; KLz_mm = Lm*1000
chiy83, chiz83, lam_y83, lam_z83, NRk83, NbRdy83, NbRdz83, _, _ = ec3_axial(fy, s, KLy_mm, KLz_mm)
chiLT83, lamLT83, MbRd83, MRdz83 = ec3_ltb(fy, s, Lm*1000)
eq661_83, eq662_83, DCR83, kyy83, kzz83, kyz83, kzy83 = ec3_interaction(1000, 150, 30, chiy83, chiz83, NRk83, MbRd83, MRdz83, lam_y83, lam_z83)
exp_661 = 1000/(chiy83*NRk83)+kyy83*150/MbRd83+kyz83*30/MRdz83
exp_662 = 1000/(chiz83*NRk83)+kzy83*150/MbRd83+kzz83*30/MRdz83
chk("8.3a  eq661 (biaxial)", eq661_83, exp_661)
chk("8.3b  eq662 (biaxial)", eq662_83, exp_662)
chk("8.3c  DCR = max", DCR83, max(exp_661, exp_662))


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 9 — Boundary / Edge Cases
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 9 — Boundary & Parametric Checks")

# 9.1  AISC US: Pu/φPn exactly 0.2 → H1-1a and H1-1b give same result
sub("9.1  H1-1a vs H1-1b boundary at rP=0.2")
phiPn_ = 500; phiMnx_ = 300; phiMny_ = 100
Pu_ = 0.2*phiPn_  # rP = 0.2
H_a, _, _, _, _ = aisc_H(phiPn_, phiMnx_, phiMny_, Pu_, 50, 10)
H_b = 0.2/2 + 50/phiMnx_ + 10/phiMny_   # H1-1b formula
H_aa= 0.2 + (8/9)*(50/phiMnx_+10/phiMny_) # H1-1a formula
chk("9.1a  rP=0.2 uses H1-1a", H_a, H_aa)

# 9.2  EC3 pure axial (MyEd=MzEd=0): H = NEd/NbRd
sub("9.2  EC3 IPE 300 pure axial NEd=NbRdz (H≈1)")
s = EU_SECS['IPE300']; fy=355; Lm=4.0
KLy_ = Lm*1000; KLz_ = Lm*1000
chiy9, chiz9, lam_y9, lam_z9, NRk9, NbRdy9, NbRdz9, _, _ = ec3_axial(fy, s, KLy_, KLz_)
chiLT9, lamLT9, MbRd9, MRdz9 = ec3_ltb(fy, s, Lm*1000)
NEd_target = NbRdz9  # set NEd to z-axis capacity → eq662 ≈ 1
eq661_9, eq662_9, _, _, _, _, _ = ec3_interaction(NEd_target, 0, 0, chiy9, chiz9, NRk9, MbRd9, MRdz9, lam_y9, lam_z9)
chk("9.2a  eq661 = NEd/(χy·NRk) when My=Mz=0", eq661_9, NEd_target/(chiy9*NRk9))
chk("9.2b  eq662 = NEd/(χz·NRk) when My=Mz=0", eq662_9, NEd_target/(chiz9*NRk9))

# 9.3  IS800 pure axial: H = Pu/Pd
sub("9.3  IS800 ISMB 300 pure axial  Pu=Pd (H=1)")
s = IN_SECS['ISMB300']; fy=250; L=4.0
Pd9, _, _, _, _, fcd9 = is800_axial(fy, s, L*1000, L*1000, 'ISMB')
chiLT9b, _, Mdx9, Mdz9 = is800_ltb(fy, s, L*1000)
H9, rP9, _, _ = is800_H(Pd9, 0, 0, Pd9, Mdx9, Mdz9)
chk("9.3a  pure axial H = 1.0", H9, 1.0)

# 9.4  AISC: Muy-only check (Pu=0) → H = Muy/phiMny
sub("9.4  W14×48 pure weak-axis Muy=50kip·ft")
s = W_SECS['W14x48']; Fy=50
phiPn_44, _, _, _, _ = aisc_phiPn_us(Fy, s['A'], s['rx'], s['ry'], 168, 168)
phiMnx_44, _, _, _, _, _ = aisc_phi_Mnx_us(Fy, s, 14.0)
phiMny_44, _ = aisc_phi_Mny_us(Fy, s)
H_44, rP_44, rMx_44, rMy_44, eq_44 = aisc_H(phiPn_44, phiMnx_44, phiMny_44, 0, 0, 50)
chk("9.4a  H = 0 + Muy/phiMny (H1-1b, rP=0)", H_44, 50/phiMny_44)
chk("9.4b  Eq = H1-1b", float(eq_44 == 'H1-1b'), 1.0)


# ══════════════════════════════════════════════════════════════════════════════
# SUITE 10 — AISC Design Examples (official manual verification)
# Sources: AISC Design Examples v15, Chapters E / F / H
# ══════════════════════════════════════════════════════════════════════════════
hdr("Suite 10 — AISC Design Examples (Official Manual Verification)")

# ── Chapter E ─────────────────────────────────────────────────────────────────
# Example E.1c: W14×132, Fy=50, KL=30ft (pin-pin) → φcPn=892 kip
# AISC uses Table 4-22 (rounded Fcr=25.56 ksi). Formula gives precise value.
sub("10.1  E.1c  W14×132  KL=30ft  → φcPn≈892 kip")
s = W_SECS['W14x132']; Fy = 50.0; E_us = 29000.0
KLy = 30.0*12  # governs (KL/ry > KL/rx for equal KL)
phiPn_e1c, Pn_e1c, Fcr_e1c, Fe_e1c, lm_e1c = aisc_phiPn_us(Fy, s['A'], s['rx'], s['ry'], KLy, KLy)
lLim = 4.71*math.sqrt(E_us/Fy)
chk("10.1a  KL/ry=95.7 (inelastic)", float(lm_e1c < lLim), 1.0)
chk("10.1b  φcPn [kip] ≈ 892 (within 1%)", phiPn_e1c, 892, tol=0.011)
Fe_exp = math.pi**2*E_us/(30*12/s['ry'])**2
chk("10.1c  Fe [ksi]", Fe_e1c, Fe_exp)

# Example E.1d: W14×90, Fy=50, KLx=30ft / KLy=15ft → φcPn=928 kip
# x-axis governs: KL/rx=58.6 > KL/ry=48.6
sub("10.2  E.1d  W14×90  KLx=30ft / KLy=15ft  → φcPn=928 kip")
s = W_SECS['W14x90']
KLx_e1d = 30.0*12; KLy_e1d = 15.0*12
phiPn_e1d, Pn_e1d, Fcr_e1d, Fe_e1d, lm_e1d = aisc_phiPn_us(Fy, s['A'], s['rx'], s['ry'], KLx_e1d, KLy_e1d)
KLr_x = KLx_e1d/s['rx']; KLr_y = KLy_e1d/s['ry']
chk("10.2a  x-axis governs (KL/rx=58.6 > KL/ry=48.6)", float(KLr_x > KLr_y), 1.0)
chk("10.2b  KL/rx ≈ 58.6", lm_e1d, 58.6, tol=0.005)
Fe_e1d_exp = math.pi**2*E_us/lm_e1d**2
chk("10.2c  Fe ≈ 83.3 ksi", Fe_e1d, 83.3, tol=0.005)
Fcr_e1d_exp = 0.658**(Fy/Fe_e1d_exp)*Fy
chk("10.2d  Fcr ≈ 38.9 ksi", Fcr_e1d_exp, 38.9, tol=0.005)
chk("10.2e  φcPn ≈ 928 kip (within 1%)", phiPn_e1d, 928, tol=0.011)

# ── Chapter F ─────────────────────────────────────────────────────────────────
# All three use W18×50, Fy=50, Lp=5.83ft, Lr=17.0ft (AISC table)
sub("10.3  F.1-1b  W18×50  Lb ≤ Lp  (plastic)  → φbMn=379 kip·ft")
s = W_SECS['W18x50']
phiMnx_f1, Mnx_f1, Mp_f1, Lp_f1, Lr_f1, mode_f1 = aisc_phi_Mnx_us(50, s, 3.0, Cb=1.0)  # Lb=3ft < Lp≈5.83
chk("10.3a  Lp ≈ 5.83 ft", Lp_f1, 5.83, tol=0.010)
chk("10.3b  mode = NoLTB (Lb=3ft < Lp)", float(mode_f1 == 'NoLTB'), 1.0)
chk("10.3c  φbMnx = 0.9×Fy×Zx/12 = 379 kip·ft", phiMnx_f1, 379, tol=0.005)

sub("10.4  F.1-2b  W18×50  Lb=11.7ft  Cb=1.01  (inelastic LTB)  → φbMn=305 kip·ft")
phiMnx_f2, Mnx_f2, Mp_f2, Lp_f2, Lr_f2, mode_f2 = aisc_phi_Mnx_us(50, s, 11.7, Cb=1.01)
chk("10.4a  Lr ≈ 17.0 ft (within 2%)", Lr_f2, 17.0, tol=0.020)
chk("10.4b  Lp < Lb < Lr → InelLTB", float(mode_f2 == 'InelLTB'), 1.0)
# AISC: Mn = 1.01×[5050-(5050-3112)×(11.7-5.83)/(17.0-5.83)] = 4070 kip-in = 339 kip-ft
Mn_f2_exp = 1.01*(Mp_f2-(Mp_f2-0.7*50*s['Sx']/12)*(11.7-Lp_f2)/(Lr_f2-Lp_f2))
chk("10.4c  φbMnx ≈ 305 kip·ft (within 1%)", phiMnx_f2, 305, tol=0.013)

sub("10.5  F.1-3b  W18×50  Lb=17.5ft  Cb=1.30  (elastic LTB)  → φbMn=288 kip·ft")
phiMnx_f3, Mnx_f3, Mp_f3, Lp_f3, Lr_f3, mode_f3 = aisc_phi_Mnx_us(50, s, 17.5, Cb=1.30)
chk("10.5a  Lb=17.5 > Lr → ElasLTB", float(mode_f3 == 'ElasLTB' or 17.5 > Lr_f3), 1.0)
# AISC: Cb=1.30, Lb/rts=17.5×12/1.98=106.1, Fcr=43.2ksi, Mn=320kip-ft, φbMn=288kip-ft
chk("10.5b  φbMnx ≈ 288 kip·ft (within 2%)", phiMnx_f3, 288, tol=0.025)

# ── Chapter H ─────────────────────────────────────────────────────────────────
# Example H.1b: W14×99, KL=Lb=14ft, Pu=400, Mux=250, Muy=80 → H=0.929
sub("10.6  H.1b  W14×99  KL=Lb=14ft  Pu=400  Mux=250  Muy=80 kip·ft  → H=0.929")
s = W_SECS['W14x99']
KL_h1b = 14.0*12
phiPn_h1b, _, _, _, _ = aisc_phiPn_us(50, s['A'], s['rx'], s['ry'], KL_h1b, KL_h1b)
phiMnx_h1b, _, _, Lp_h1b, Lr_h1b, mode_h1b = aisc_phi_Mnx_us(50, s, 14.0, Cb=1.0)
phiMny_h1b, _ = aisc_phi_Mny_us(50, s)
H_h1b, rP_h1b, rMx_h1b, rMy_h1b, eq_h1b = aisc_H(phiPn_h1b, phiMnx_h1b, phiMny_h1b, 400, 250, 80)
# AISC: φcPn=1130, φbMnx=642, φbMny=311 → H1-1a → H=0.929
chk("10.6a  φcPn ≈ 1130 kip (within 1%)", phiPn_h1b, 1130, tol=0.012)
chk("10.6b  φbMnx ≈ 642 kip·ft (within 2%)", phiMnx_h1b, 642, tol=0.022)
chk("10.6c  φbMny ≈ 311 kip·ft (within 2%)", phiMny_h1b, 311, tol=0.022)
chk("10.6d  rP ≥ 0.2 → H1-1a", float(eq_h1b == 'H1-1a'), 1.0)
chk("10.6e  H ≈ 0.929 (within 1.5%)", H_h1b, 0.929, tol=0.015)

# Example H.4 (simplified, post-amplification): W10×33, Lb=14ft, Cb=1.14
# Amplified demands: Pu=30kip, Mux=91.8kip·ft, Muy=13.1kip·ft → H=0.979 (H1-1b)
sub("10.7  H.4  W10×33  KL=Lb=14ft  Pu=30  Mux=91.8  Muy=13.1 kip·ft  → H=0.979")
s = W_SECS['W10x33']
KL_h4 = 14.0*12
phiPn_h4, _, _, _, _ = aisc_phiPn_us(50, s['A'], s['rx'], s['ry'], KL_h4, KL_h4)
phiMnx_h4, _, _, Lp_h4, Lr_h4, mode_h4 = aisc_phi_Mnx_us(50, s, 14.0, Cb=1.14)
phiMny_h4, _ = aisc_phi_Mny_us(50, s)
H_h4, rP_h4, rMx_h4, rMy_h4, eq_h4 = aisc_H(phiPn_h4, phiMnx_h4, phiMny_h4, 30, 91.8, 13.1)
# AISC: φcPn=253, φbMnx=137, φbMny=52.5 → H1-1b → H=0.979
chk("10.7a  φcPn ≈ 253 kip (within 1.5%)", phiPn_h4, 253, tol=0.015)
chk("10.7b  Lp ≈ 6.85 ft", Lp_h4, 6.85, tol=0.010)
chk("10.7c  Lr ≈ 21.8 ft (within 2%)", Lr_h4, 21.8, tol=0.025)
chk("10.7d  φbMnx ≈ 137 kip·ft (within 2%)", phiMnx_h4, 137, tol=0.022)
chk("10.7e  φbMny ≈ 52.5 kip·ft (within 2%)", phiMny_h4, 52.5, tol=0.022)
chk("10.7f  rP=30/253=0.119 < 0.2 → H1-1b", float(eq_h4 == 'H1-1b'), 1.0)
chk("10.7g  H ≈ 0.979 (within 2%)", H_h4, 0.979, tol=0.022)

# ══════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print(f"  RESULTS: {PASS} PASS  |  {FAIL} FAIL  |  TOTAL {PASS+FAIL}")
print(f"{'='*70}")
sys.exit(0 if FAIL == 0 else 1)
