/**
 * Cantilever Retaining Wall — ACI 318-25 SI Units
 * 50 Reference Test Scenarios
 *
 * Units: kN, m, MPa, kN/m², degrees
 *
 * Field mapping → readRWInputs() keys:
 *   H        — stem height He (m), rw-H
 *   ts       — stem base thickness (m), rw-ts
 *   ts_top   — stem top thickness (m, only tapered/stepped), rw-ts-top
 *   stType   — "prismatic" | "tapered" | "stepped", rw-stType
 *   tf       — footing thickness (m), rw-tf
 *   Lt       — toe length (m), rw-Lt
 *   Lh       — heel length (m), rw-Lh
 *   fc       — concrete f'c (MPa), rw-fc
 *   fy       — rebar fy (MPa), rw-fy
 *   gs       — soil unit weight (kN/m³), rw-gamma
 *   phi      — soil friction angle (degrees), rw-phi
 *   c        — soil cohesion (kPa), rw-c  [0 for cohesionless]
 *   q        — surcharge (kN/m²), rw-q
 *   surch    — surcharge active, rw-inclSurcharge
 *   beta     — backfill slope angle (degrees), rw-beta
 *   pMethod  — "rankine" | "coulomb", rw-pMethod
 *   deltaOpt — "auto" | "manual", rw-deltaOpt
 *   delta    — manual wall-soil friction angle (degrees), rw-delta
 *   water    — saturated backfill (water table at top), rw-inclWater
 *   seis     — seismic active, rw-inclSeismic
 *   kh       — horizontal seismic coefficient, rw-kh
 *   kvOpt    — "none" | "auto" (kv = 0.5·kh), rw-kvOpt
 *   skEn     — shear key enabled, rw-sk-en
 *   skLoc    — "toe" | "heel", rw-sk-loc
 *   skd      — shear key depth (m), rw-sk-d
 *   skw      — shear key width (m), rw-sk-w
 *   htoe     — toe fill height (m), rw-htoe
 *   mu       — base-soil friction coefficient, rw-mu
 *   qa       — allowable bearing pressure (kN/m²), rw-qa
 *   cover    — clear cover (mm), rw-cover
 *   kpMethod — "auto" | "manual", rw-kpMethod
 *
 * Categories:
 *   sc01–sc10  Basic prismatic walls, H = 2–8 m
 *   sc11–sc18  Surcharge loading
 *   sc19–sc26  Seismic (Mononobe-Okabe)
 *   sc27–sc34  Saturated backfill / high water table
 *   sc35–sc42  Shear key (toe and heel)
 *   sc43–sc46  Sloped backfill (beta = 5–20°)
 *   sc47–sc50  Coulomb with wall friction
 */

'use strict';

const scenarios = [

  /* ═══════════════════════════════════════════════════════════
     GROUP 1 — Basic prismatic walls  (sc01–sc10)
     Standard Rankine, flat backfill, no surcharge, no seismic.
     ═══════════════════════════════════════════════════════════ */

  {
    id:'sc01', desc:'Minimal residential garden wall — H=2m, narrow footing, standard sand backfill',
    H:2.0, ts:0.25, stType:'prismatic',
    tf:0.30, Lt:0.40, Lh:1.20,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.50, qa:150, cover:75, kpMethod:'auto'
  },

  {
    id:'sc02', desc:'Light highway shoulder wall — H=3m, medium gravel, standard proportions',
    H:3.0, ts:0.30, stType:'prismatic',
    tf:0.35, Lt:0.60, Lh:1.80,
    fc:25, fy:420,
    gs:18, phi:32, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.35, mu:0.50, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc03', desc:'Typical basement perimeter wall — H=3.5m, dense sand, moderate toe',
    H:3.5, ts:0.30, stType:'prismatic',
    tf:0.40, Lt:0.70, Lh:2.00,
    fc:28, fy:420,
    gs:19, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.40, mu:0.50, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc04', desc:'Standard 4m cantilever — textbook proportions, silty sand',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.80, Lh:2.30,
    fc:25, fy:420,
    gs:17, phi:28, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.40, mu:0.45, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc05', desc:'4.5m wall — default calculator example, well-graded gravel-sand',
    H:4.5, ts:0.35, stType:'prismatic',
    tf:0.45, Lt:1.00, Lh:2.50,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.50, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc06', desc:'5m bridge abutment wall — high-friction dense gravel, wide heel',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.00,
    fc:28, fy:420,
    gs:20, phi:35, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.55, qa:250, cover:75, kpMethod:'auto'
  },

  {
    id:'sc07', desc:'6m tall highway cut wall — normal sand, property-line toe=0',
    H:6.0, ts:0.45, stType:'prismatic',
    tf:0.55, Lt:0.00, Lh:3.80,
    fc:28, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'heel', skd:0.40, skw:0.30,
    htoe:0, mu:0.50, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc08', desc:'7m tall retaining wall — angular crushed stone, high bearing capacity',
    H:7.0, ts:0.55, stType:'prismatic',
    tf:0.60, Lt:1.20, Lh:4.00,
    fc:30, fy:500,
    gs:20, phi:38, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.60, mu:0.60, qa:300, cover:75, kpMethod:'auto'
  },

  {
    id:'sc09', desc:'8m tall heavy infrastructure wall — dense gravel, high f\'c, large footing',
    H:8.0, ts:0.60, stType:'prismatic',
    tf:0.65, Lt:1.40, Lh:4.80,
    fc:32, fy:500,
    gs:21, phi:38, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.65, mu:0.60, qa:350, cover:75, kpMethod:'auto'
  },

  {
    id:'sc10', desc:'Narrow-base wall at property line — H=5m, Lt=0, relies on heel weight',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:0.00, Lh:3.20,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.50, qa:200, cover:75, kpMethod:'auto'
  },

  /* ═══════════════════════════════════════════════════════════
     GROUP 2 — Surcharge loading  (sc11–sc18)
     Uniform surcharge on retained soil surface.
     ═══════════════════════════════════════════════════════════ */

  {
    id:'sc11', desc:'Light foot-traffic surcharge — q=5 kN/m² on 3m residential wall',
    H:3.0, ts:0.30, stType:'prismatic',
    tf:0.35, Lt:0.60, Lh:1.80,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:true, q:5, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.35, mu:0.50, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc12', desc:'Parking lot surcharge — q=10 kN/m² on 4m wall, standard design case',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.80, Lh:2.40,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:true, q:10, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.40, mu:0.50, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc13', desc:'Highway live load surcharge — q=12 kN/m² equivalent on 4.5m wall',
    H:4.5, ts:0.35, stType:'prismatic',
    tf:0.45, Lt:1.00, Lh:2.80,
    fc:28, fy:420,
    gs:19, phi:30, c:0,
    surch:true, q:12, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.50, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc14', desc:'Heavy vehicle loading — q=20 kN/m² on 5m wall, industrial facility',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.00,
    fc:28, fy:420,
    gs:19, phi:32, c:0,
    surch:true, q:20, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.52, qa:250, cover:75, kpMethod:'auto'
  },

  {
    id:'sc15', desc:'Crane rail surcharge — q=30 kN/m² on 5m industrial wall',
    H:5.0, ts:0.45, stType:'prismatic',
    tf:0.50, Lt:1.10, Lh:3.20,
    fc:30, fy:420,
    gs:20, phi:35, c:0,
    surch:true, q:30, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.55, qa:280, cover:75, kpMethod:'auto'
  },

  {
    id:'sc16', desc:'Rail yard / heavy equipment — q=25 kN/m² on 6m wall, silty gravel',
    H:6.0, ts:0.50, stType:'prismatic',
    tf:0.55, Lt:1.10, Lh:3.60,
    fc:28, fy:420,
    gs:19, phi:32, c:0,
    surch:true, q:25, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.52, qa:250, cover:75, kpMethod:'auto'
  },

  {
    id:'sc17', desc:'Storage yard loading — q=15 kN/m² on 3.5m wall, dense sand',
    H:3.5, ts:0.30, stType:'prismatic',
    tf:0.35, Lt:0.70, Lh:2.10,
    fc:25, fy:420,
    gs:19, phi:33, c:0,
    surch:true, q:15, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.35, mu:0.52, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc18', desc:'High surcharge on tall wall — q=20 kN/m² on 7m wall, gravelly sand',
    H:7.0, ts:0.55, stType:'prismatic',
    tf:0.60, Lt:1.20, Lh:4.20,
    fc:30, fy:500,
    gs:20, phi:35, c:0,
    surch:true, q:20, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.60, mu:0.56, qa:300, cover:75, kpMethod:'auto'
  },

  /* ═══════════════════════════════════════════════════════════
     GROUP 3 — Seismic cases  (sc19–sc26)
     Mononobe-Okabe incremental dynamic earth pressure.
     kv = auto (0.5·kh) unless noted.
     ═══════════════════════════════════════════════════════════ */

  {
    id:'sc19', desc:'Low seismicity zone — kh=0.10, 4m wall, standard sand (Zone 1 equivalent)',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.80, Lh:2.50,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.10, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.40, mu:0.50, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc20', desc:'Moderate seismicity — kh=0.15, kv=auto, 4.5m wall with surcharge',
    H:4.5, ts:0.40, stType:'prismatic',
    tf:0.45, Lt:1.00, Lh:2.80,
    fc:28, fy:420,
    gs:18, phi:30, c:0,
    surch:true, q:10, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.15, kvOpt:'auto',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.50, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc21', desc:'Moderate seismicity — kh=0.20, kv=auto, 5m standard wall',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.00,
    fc:28, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.20, kvOpt:'auto',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.50, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc22', desc:'High seismicity — kh=0.25, kv=auto, 4m wall with larger footing',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.45, Lt:0.90, Lh:2.80,
    fc:28, fy:420,
    gs:18, phi:32, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.25, kvOpt:'auto',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.45, mu:0.52, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc23', desc:'High seismicity — kh=0.30, kv=auto, 5m wall, widened heel for overturning',
    H:5.0, ts:0.45, stType:'prismatic',
    tf:0.50, Lt:1.10, Lh:3.50,
    fc:30, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.30, kvOpt:'auto',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.52, qa:250, cover:75, kpMethod:'auto'
  },

  {
    id:'sc24', desc:'Seismic + surcharge combination — kh=0.20, q=10 kN/m², 4.5m dense sand wall',
    H:4.5, ts:0.40, stType:'prismatic',
    tf:0.45, Lt:1.00, Lh:2.80,
    fc:28, fy:420,
    gs:19, phi:33, c:0,
    surch:true, q:10, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.20, kvOpt:'auto',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.52, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc25', desc:'Seismic + shear key combo — kh=0.20, heel key on 5m wall to meet sliding FS',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.00,
    fc:28, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.20, kvOpt:'auto',
    skEn:true, skLoc:'heel', skd:0.40, skw:0.30,
    htoe:0.50, mu:0.50, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc26', desc:'Low seismicity, kv=none — kh=0.12, kv=0, 3.5m wall (vertical component ignored)',
    H:3.5, ts:0.30, stType:'prismatic',
    tf:0.35, Lt:0.70, Lh:2.10,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.12, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.35, mu:0.50, qa:200, cover:75, kpMethod:'auto'
  },

  /* ═══════════════════════════════════════════════════════════
     GROUP 4 — Saturated backfill / high water table  (sc27–sc34)
     Effective unit weight = γs − γw = γs − 9.81 kN/m³.
     Hydrostatic uplift on footing base included.
     ═══════════════════════════════════════════════════════════ */

  {
    id:'sc27', desc:'Saturated sand — H=3m, water table at top of backfill, flat',
    H:3.0, ts:0.30, stType:'prismatic',
    tf:0.35, Lt:0.60, Lh:2.00,
    fc:25, fy:420,
    gs:20, phi:28, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.35, mu:0.45, qa:160, cover:75, kpMethod:'auto'
  },

  {
    id:'sc28', desc:'Saturated silty sand — H=4m, high water table, wider footing needed',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.80, Lh:2.80,
    fc:25, fy:420,
    gs:20, phi:28, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.40, mu:0.45, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc29', desc:'Saturated backfill + surcharge — H=4m, q=10 kN/m², combined pressure',
    H:4.0, ts:0.40, stType:'prismatic',
    tf:0.40, Lt:0.90, Lh:2.80,
    fc:28, fy:420,
    gs:20, phi:28, c:0,
    surch:true, q:10, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.45, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc30', desc:'Saturated gravel — H=5m, higher φ partially offsets water pressure',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.50,
    fc:28, fy:420,
    gs:21, phi:32, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.48, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc31', desc:'Saturated sand + seismic — H=4m, kh=0.15, worst-case combination',
    H:4.0, ts:0.40, stType:'prismatic',
    tf:0.45, Lt:0.90, Lh:2.80,
    fc:28, fy:420,
    gs:20, phi:28, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:true, kh:0.15, kvOpt:'auto',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.45, mu:0.45, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc32', desc:'Saturated backfill at property line — H=5m, Lt=0, heel-heavy design',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:0.00, Lh:3.80,
    fc:28, fy:420,
    gs:20, phi:28, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:false, kh:0, kvOpt:'none',
    skEn:true, skLoc:'heel', skd:0.40, skw:0.30,
    htoe:0, mu:0.45, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc33', desc:'Saturated backfill — H=6m, tall wall with maximum hydraulic head',
    H:6.0, ts:0.50, stType:'prismatic',
    tf:0.55, Lt:1.10, Lh:4.00,
    fc:30, fy:420,
    gs:20, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.55, mu:0.47, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc34', desc:'Saturated loose sand — H=3.5m, low φ=28°, tight bearing capacity',
    H:3.5, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.70, Lh:2.40,
    fc:25, fy:420,
    gs:19, phi:28, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.40, mu:0.44, qa:160, cover:75, kpMethod:'auto'
  },

  /* ═══════════════════════════════════════════════════════════
     GROUP 5 — Shear key cases  (sc35–sc42)
     Toe keys improve passive resistance in front zone.
     Heel keys intercept retained-side passive pressure.
     ═══════════════════════════════════════════════════════════ */

  {
    id:'sc35', desc:'Toe shear key — H=4m, shallow key dk=0.30m to boost sliding FS',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.80, Lh:2.40,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:true, skLoc:'toe', skd:0.30, skw:0.25,
    htoe:0, mu:0.48, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc36', desc:'Toe shear key — H=5m, dk=0.40m, soft base soil (μ=0.40)',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.00,
    fc:28, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:true, skLoc:'toe', skd:0.40, skw:0.30,
    htoe:0, mu:0.40, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc37', desc:'Toe shear key — H=3.5m, htoe=0.40m, key+passive toe fill combined',
    H:3.5, ts:0.30, stType:'prismatic',
    tf:0.35, Lt:0.70, Lh:2.00,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:true, skLoc:'toe', skd:0.30, skw:0.25,
    htoe:0.40, mu:0.45, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc38', desc:'Toe shear key — H=6m, property-line adjacent, large key dk=0.50m',
    H:6.0, ts:0.50, stType:'prismatic',
    tf:0.55, Lt:1.00, Lh:3.60,
    fc:28, fy:420,
    gs:18, phi:30, c:0,
    surch:true, q:10, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:true, skLoc:'toe', skd:0.50, skw:0.35,
    htoe:0.55, mu:0.45, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc39', desc:'Heel shear key — H=4.5m, dk=0.35m engaging retained passive zone',
    H:4.5, ts:0.35, stType:'prismatic',
    tf:0.45, Lt:1.00, Lh:2.60,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:true, skLoc:'heel', skd:0.35, skw:0.25,
    htoe:0, mu:0.45, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc40', desc:'Heel shear key — H=5m, large dk=0.50m, high surcharge q=15 kN/m²',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.00,
    fc:28, fy:420,
    gs:19, phi:32, c:0,
    surch:true, q:15, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:true, skLoc:'heel', skd:0.50, skw:0.30,
    htoe:0, mu:0.42, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc41', desc:'Toe key + saturated backfill — H=4m, low μ=0.40, key essential for sliding',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.80, Lh:2.60,
    fc:25, fy:420,
    gs:20, phi:28, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:true, seis:false, kh:0, kvOpt:'none',
    skEn:true, skLoc:'toe', skd:0.40, skw:0.30,
    htoe:0.40, mu:0.40, qa:180, cover:75, kpMethod:'auto'
  },

  {
    id:'sc42', desc:'Heel key + seismic — H=5m, kh=0.20, heel key to meet seismic sliding FS',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.20,
    fc:28, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:0,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.20, kvOpt:'auto',
    skEn:true, skLoc:'heel', skd:0.45, skw:0.30,
    htoe:0.50, mu:0.47, qa:220, cover:75, kpMethod:'auto'
  },

  /* ═══════════════════════════════════════════════════════════
     GROUP 6 — Sloped backfill  (sc43–sc46)
     Rankine with inclined backfill (β > 0°).
     Note: β must be < φ for Rankine to remain valid.
     ═══════════════════════════════════════════════════════════ */

  {
    id:'sc43', desc:'Gentle slope β=5° — H=4m, embankment fill, minor slope effect',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.80, Lh:2.50,
    fc:25, fy:420,
    gs:18, phi:30, c:0,
    surch:false, q:0, beta:5,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.40, mu:0.50, qa:200, cover:75, kpMethod:'auto'
  },

  {
    id:'sc44', desc:'Moderate slope β=10° — H=5m, hillside cut wall with rising backfill',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.20,
    fc:28, fy:420,
    gs:18, phi:32, c:0,
    surch:false, q:0, beta:10,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.52, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc45', desc:'Steep slope β=15° — H=4.5m, gravel fill, Ka noticeably elevated',
    H:4.5, ts:0.40, stType:'prismatic',
    tf:0.45, Lt:1.00, Lh:2.90,
    fc:28, fy:420,
    gs:19, phi:35, c:0,
    surch:false, q:0, beta:15,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.55, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc46', desc:'Maximum practical slope β=20° — H=5m, dense gravel (φ=38°), β < φ by margin',
    H:5.0, ts:0.45, stType:'prismatic',
    tf:0.50, Lt:1.10, Lh:3.40,
    fc:28, fy:420,
    gs:20, phi:38, c:0,
    surch:false, q:0, beta:20,
    pMethod:'rankine', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.58, qa:250, cover:75, kpMethod:'auto'
  },

  /* ═══════════════════════════════════════════════════════════
     GROUP 7 — Coulomb method with wall friction  (sc47–sc50)
     δ = 2φ/3 (auto) unless manual noted.
     Coulomb Ka < Rankine Ka when δ > 0 → lower active force.
     ═══════════════════════════════════════════════════════════ */

  {
    id:'sc47', desc:'Coulomb auto-δ — H=4m, rough concrete face, dense sand φ=33°',
    H:4.0, ts:0.35, stType:'prismatic',
    tf:0.40, Lt:0.80, Lh:2.40,
    fc:25, fy:420,
    gs:19, phi:33, c:0,
    surch:false, q:0, beta:0,
    pMethod:'coulomb', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.40, mu:0.52, qa:220, cover:75, kpMethod:'auto'
  },

  {
    id:'sc48', desc:'Coulomb manual δ=20° — H=5m, coarse gravel against rough concrete',
    H:5.0, ts:0.40, stType:'prismatic',
    tf:0.50, Lt:1.00, Lh:3.00,
    fc:28, fy:420,
    gs:20, phi:35, c:0,
    surch:false, q:0, beta:0,
    pMethod:'coulomb', deltaOpt:'manual', delta:20,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.55, qa:250, cover:75, kpMethod:'auto'
  },

  {
    id:'sc49', desc:'Coulomb + surcharge — H=4.5m, auto-δ, q=12 kN/m², gravelly sand',
    H:4.5, ts:0.35, stType:'prismatic',
    tf:0.45, Lt:0.90, Lh:2.80,
    fc:28, fy:420,
    gs:19, phi:35, c:0,
    surch:true, q:12, beta:0,
    pMethod:'coulomb', deltaOpt:'auto', delta:0,
    water:false, seis:false, kh:0, kvOpt:'none',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0, mu:0.55, qa:240, cover:75, kpMethod:'auto'
  },

  {
    id:'sc50', desc:'Coulomb + slope + seismic — H=5m, β=10°, kh=0.20, δ=2φ/3, worst combo',
    H:5.0, ts:0.45, stType:'prismatic',
    tf:0.50, Lt:1.10, Lh:3.40,
    fc:30, fy:420,
    gs:20, phi:35, c:0,
    surch:false, q:0, beta:10,
    pMethod:'coulomb', deltaOpt:'auto', delta:0,
    water:false, seis:true, kh:0.20, kvOpt:'auto',
    skEn:false, skLoc:'toe', skd:0, skw:0.25,
    htoe:0.50, mu:0.55, qa:260, cover:75, kpMethod:'auto'
  }

];

/* Export for Node.js test runner */
if (typeof module !== 'undefined') module.exports = { scenarios };
