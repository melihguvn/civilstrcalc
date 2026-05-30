'use strict';
/**
 * Retaining Wall ACI 318-25 — Test Runner (Node.js)
 * Runs 50 scenarios against the extracted core calculation functions.
 * Usage: node tests/retaining-wall/run.js
 */

const { scenarios } = require('./scenarios.js');

/* ── concrete unit weight (same as main page) ── */
const gc = 24;   // kN/m³

/* ═══════════════════════════════════════════════════════════
   CORE FUNCTIONS — copied verbatim from retaining-wall-aci-si.html
   ═══════════════════════════════════════════════════════════ */

function calcEP(p){
  var phi=p.phi*Math.PI/180, sp=Math.sin(phi), cphi=Math.cos(phi), Ka;
  var beta_r=(p.beta||0)*Math.PI/180;
  var cosB=Math.cos(beta_r), sinB=Math.sin(beta_r);
  if(beta_r>=phi-1e-6) beta_r=Math.max(0,phi-0.001);
  cosB=Math.cos(beta_r); sinB=Math.sin(beta_r);
  if(p.pMethod==='coulomb'){
    var dr=(p.deltaOpt==='auto')?(2/3)*phi:p.delta_m*Math.PI/180;
    var sqC=Math.sqrt(Math.max(0,Math.sin(phi+dr)*Math.sin(phi-beta_r)/(Math.cos(dr)*cosB)));
    Ka=cphi*cphi/(Math.cos(dr)*Math.pow(1+sqC,2));
  } else {
    if(beta_r<1e-6){
      Ka=(1-sp)/(1+sp);
    } else {
      var cos2B=cosB*cosB, cos2P=cphi*cphi;
      var sqR=Math.sqrt(Math.max(0,cos2B-cos2P));
      Ka=cosB*(cosB-sqR)/(cosB+sqR);
    }
  }
  var Kp=(p.kpMethod==='manual')?p.Kp_m:(1+sp)/(1-sp);
  var gw=9.81, gs=p.gs, He=p.H, H=p.H+p.tf;
  var gs_eff=p.water?(gs-gw):gs;
  var Heq=p.surch?(p.q/gs_eff):0;
  var Pt=0.5*Ka*gs_eff*H*H, Ps=Ka*gs_eff*Heq*H;
  var Pw=p.water?0.5*gw*H*H:0;
  var Pa=Pt+Ps+Pw;
  var arm=(Pa>0)?(Pt*(H/3)+Ps*(H/2)+Pw*(H/3))/Pa:(H/3);
  var Pa_h, Pa_v;
  if(p.pMethod!=='coulomb' && beta_r>1e-6){
    Pa_h=(Pt+Ps)*cosB+Pw; Pa_v=(Pt+Ps)*sinB;
  } else {
    Pa_h=Pa; Pa_v=0;
  }
  var DPAE=0, kh=0, kv=0;
  if(p.seis){
    kh=p.kh; kv=(p.kvOpt==='auto')?0.5*kh:0;
    var th=Math.atan(kh/(1-kv)), ct=Math.cos(th), cpd=Math.cos(phi-th);
    var moArg=cpd*cpd, sqMO=Math.sqrt(Math.max(0,Math.sin(phi)*Math.sin(phi-th-beta_r)/(ct*cosB)));
    var KAE=moArg/(ct*Math.pow(1+sqMO,2));
    DPAE=Math.max(0,0.5*(1-kv)*gs_eff*H*H*KAE-Pt);
  }
  return {Ka,Kp,Pa,Pa_h,Pa_v,Pt,Ps,Pw,arm,DPAE,kh,kv,He,H,beta_r};
}

function calcStability(p,ep){
  var B=p.Lt+p.ts+p.Lh;
  var ts_t=Math.min(p.ts_top||p.ts, p.ts);
  var W1, x1;
  if(!p.stType || p.stType==='prismatic'){
    W1=gc*p.ts*p.H; x1=p.Lt+p.ts/2;
  } else if(p.stType==='tapered'){
    W1=gc*(p.ts+ts_t)/2*p.H;
    x1=p.Lt+p.ts-(p.ts*p.ts+p.ts*ts_t+ts_t*ts_t)/(3*(p.ts+ts_t));
  } else {
    var W1L=gc*p.ts*(p.H/2),  x1L=p.Lt+p.ts/2;
    var W1U=gc*ts_t*(p.H/2),  x1U=p.Lt+p.ts-ts_t/2;
    W1=W1L+W1U; x1=(W1L*x1L+W1U*x1U)/W1;
  }
  var W2=gc*B*p.tf,      x2=B/2;
  var W3=p.gs*p.Lh*p.H,  x3=p.Lt+p.ts+p.Lh/2;
  var W4=(p.Lt>0&&p.htoe>p.tf)?p.gs*p.Lt*(p.htoe-p.tf):0, x4=p.Lt/2;
  var W5=p.surch?p.q*p.Lh:0, x5=p.Lt+p.ts+p.Lh/2;
  var V=W1+W2+W3+W4+W5;
  var Pv=ep.Pa_v||0, xPv=p.Lt+p.ts;
  var hp=p.htoe;
  var Fp_base=0.5*ep.Kp*p.gs*hp*hp, Fp_key=0;
  if(p.skEn && p.skd>0){
    if(p.skLoc==='toe'){
      var hp_eff=hp+p.skd;
      Fp_key=0.5*ep.Kp*p.gs*hp_eff*hp_eff - Fp_base;
    } else {
      Fp_key=ep.Kp*p.gs*p.H*p.skd + 0.5*ep.Kp*p.gs*p.skd*p.skd;
    }
  }
  var Fp=Fp_base+Fp_key;
  var Ph=ep.Pa_h;
  var Mr=W1*x1+W2*x2+W3*x3+W4*x4+W5*x5 + Pv*xPv;
  var Mo=Ph*ep.arm;
  var gw=9.81;
  var U=p.water?0.5*gw*ep.H*B:0;
  var V_eff=V+Pv-U, Mr_eff=Mr-U*(2*B/3);
  var FSot=Mr_eff/Mo, FSsl=(p.mu*V_eff+Fp)/Ph;
  var FSots=null, FSsls=null;
  if(p.seis){
    var Mos=Mo+ep.DPAE*0.6*ep.H;
    FSots=Mr_eff/Mos; FSsls=(p.mu*V_eff+Fp)/(Ph+ep.DPAE);
  }
  var xr=(V_eff>0)?(Mr_eff-Mo)/V_eff:(B/2);
  var e=B/2-xr, em=B/6, qmax, qmin;
  if(xr<=0){qmax=999999;qmin=0;}
  else if(Math.abs(e)<=em){qmax=(V_eff/B)*(1+6*Math.abs(e)/B);qmin=(V_eff/B)*(1-6*Math.abs(e)/B);}
  else{qmax=2*V_eff/(3*xr);qmin=0;}
  return {B,V,Pv,V_eff,U,W1,W2,W3,W4,W5,Mr,Mr_eff,Mo,Fp,Fp_base,Fp_key,hp,
          FSot,FSsl,FSots,FSsls,xr,e,em,qmax,qmin};
}

function calcReinf(p,st,ep){
  var fc=p.fc, fy=p.fy, pf=0.9, pv=0.75;
  function effD(h){return h-p.cover-8;}
  function fxD(Mu,h){
    var d=effD(h), MN=Math.abs(Mu)*1e6, Ru=MN/(pf*1000*d*d);
    var rho=(0.85*fc/fy)*(1-Math.sqrt(Math.max(0,1-2*Ru/(0.85*fc))));
    if(rho<0||isNaN(rho)) rho=0;
    var Ar=rho*1000*d;
    var Am=Math.max(0.25*Math.sqrt(fc)/fy*1000*d, 1.4/fy*1000*d);
    var At=0.0018*1000*h;
    return {Mu,d,Ar,Am,At,A:Math.max(Ar,Am,At)};
  }
  function vc(d){var ls=Math.min(1.0,Math.sqrt(2/(1+d/250)));return pv*0.17*ls*Math.sqrt(fc)*d;}
  var He=ep.He, Ka=ep.Ka, gs=p.gs;
  var gw=9.81, gs_eff=p.water?(gs-gw):gs;
  var LFh=1.6, LFd=1.2, LFw=1.4;
  var cosB_ri=(p.beta&&p.pMethod!=='coulomb')?Math.cos((p.beta||0)*Math.PI/180):1.0;
  var Ka_h=Ka*cosB_ri;
  var Mus=LFh*(Ka_h*gs_eff*He*He*He/6+(p.surch?Ka_h*p.q*He*He/2:0));
  if(p.water) Mus+=LFw*gw*He*He*He/6;
  if(p.seis)  Mus+=ep.DPAE*(0.6*ep.H-p.tf);
  var Vus=LFh*(Ka_h*gs_eff*He*He/2+(p.surch?Ka_h*p.q*He:0));
  if(p.water) Vus+=LFw*gw*He*He/2;
  var ts=p.ts*1000, sf=fxD(Mus,ts);
  sf.Vu=Vus; sf.Vc=vc(sf.d); sf.sok=sf.Vc>=Vus;
  var B=st.B, tf=p.tf*1000;
  var hf=null;
  if(p.Lh>0){
    var qhs=st.qmax-(st.qmax-st.qmin)*(p.Lt+p.ts)/B;
    var whn=((qhs+st.qmin)/2)-(p.gs*He+(p.surch?p.q:0)+gc*p.tf);
    hf=fxD(LFd*Math.abs(whn)*p.Lh*p.Lh/2,tf);
    hf.Vu=LFd*Math.abs(whn)*p.Lh; hf.Vc=vc(hf.d); hf.sok=hf.Vc>=hf.Vu; hf.ten=whn<0?'bottom':'top';
  }
  var tf2=null;
  if(p.Lt>0){
    var qts=st.qmax-(st.qmax-st.qmin)*p.Lt/B;
    var wtn=((st.qmax+qts)/2)-(gc*p.tf+p.gs*Math.max(0,p.htoe-p.tf));
    tf2=fxD(LFd*Math.abs(wtn)*p.Lt*p.Lt/2,tf);
    tf2.Vu=LFd*Math.abs(wtn)*p.Lt; tf2.Vc=vc(tf2.d); tf2.sok=tf2.Vc>=tf2.Vu; tf2.ten=wtn>0?'top':'bottom';
  }
  var sk_ri=null;
  if(p.skEn&&p.skd>0&&p.skw>0&&!(p.skLoc==='heel'&&p.Lh<=0)){
    var Kp_sk=ep.Kp, dk_sk=p.skd;
    var Fp_sk_uf, Msk_uf;
    if(p.skLoc==='toe'){
      Fp_sk_uf=Kp_sk*p.gs*dk_sk*(p.htoe+dk_sk/2);
      Msk_uf=Kp_sk*p.gs*(p.htoe*dk_sk*dk_sk/2+dk_sk*dk_sk*dk_sk/6);
    } else {
      Fp_sk_uf=Kp_sk*p.gs*(ep.He*dk_sk+0.5*dk_sk*dk_sk);
      Msk_uf=Kp_sk*p.gs*(ep.He*dk_sk*dk_sk/2+dk_sk*dk_sk*dk_sk/6);
    }
    sk_ri=fxD(LFh*Msk_uf,p.skw*1000);
    sk_ri.Vu=LFh*Fp_sk_uf; sk_ri.Vc=vc(sk_ri.d); sk_ri.sok=sk_ri.Vc>=sk_ri.Vu;
  }
  return {stem:sf,heel:hf,toe:tf2,key:sk_ri};
}

/* ═══════════════════════════════════════════════════════════
   RUNNER
   ═══════════════════════════════════════════════════════════ */

const FSO_STAT = 1.5, FSS_STAT = 1.5;
const FSO_SEIS = 1.1, FSS_SEIS = 1.1;

function n2(v){ return (v===null||v===undefined||!isFinite(v)) ? '—' : v.toFixed(2); }
function n1(v){ return (v===null||v===undefined||!isFinite(v)) ? '—' : v.toFixed(1); }
function hasNaN(obj){
  for(const k in obj){ const v=obj[k]; if(typeof v==='number'&&isNaN(v)) return k; }
  return false;
}

const results = [];
let runErrors = 0, designFails = 0, designPasses = 0;

for(const sc of scenarios){
  /* normalise field names: scenarios use delta → function uses delta_m */
  const p = Object.assign({ delta_m: sc.delta, ts_top: sc.ts_top||sc.ts, kpMethod: sc.kpMethod||'auto', Kp_m: 3.0 }, sc);

  let ep, st, ri, err = null;
  try {
    ep = calcEP(p);
    st = calcStability(p, ep);
    ri = calcReinf(p, st, ep);
  } catch(e) {
    err = e.message;
    runErrors++;
  }

  if(err){ results.push({sc, err}); continue; }

  /* sanity-check for NaN propagation */
  const nanKey = hasNaN(ep)||hasNaN(st);
  if(nanKey){ err='NaN in '+nanKey; runErrors++; results.push({sc,err}); continue; }

  /* stability pass/fail */
  const otOk  = st.FSot  >= FSO_STAT;
  const slOk  = st.FSsl  >= FSS_STAT;
  const bpOk  = st.qmax  <= p.qa;
  const ecOk  = Math.abs(st.e) <= st.em;
  const otSOk = sc.seis ? (st.FSots >= FSO_SEIS) : true;
  const slSOk = sc.seis ? (st.FSsls >= FSS_SEIS) : true;
  const allOk = otOk && slOk && bpOk && ecOk && otSOk && slSOk;

  if(allOk) designPasses++; else designFails++;
  results.push({sc, ep, st, ri, otOk, slOk, bpOk, ecOk, otSOk, slSOk, allOk});
}

/* ── Print summary table ── */
const W = 110;
const hr = '─'.repeat(W);
console.log('\n' + hr);
console.log('  RETAINING WALL ACI 318-25 — 50 SCENARIO TEST REPORT');
console.log(hr);
console.log(
  ' ID   H(m)  B(m)  Ka     FSot   FSsl  q_max(kPa) q_a  e/em  Stem As  SHR  OT  SL  BP  EC  Status'
);
console.log(hr);

for(const r of results){
  const sc = r.sc;
  if(r.err){
    console.log(` ${sc.id}  ${'ERROR: '+r.err}`);
    continue;
  }
  const {ep,st,ri} = r;
  const eRatio = st.em>0 ? (Math.abs(st.e)/st.em) : 0;
  const stemAs = ri.stem ? ri.stem.A.toFixed(0) : '—';
  const shrOk  = ri.stem ? (ri.stem.sok ? ' OK' : ' NG') : ' —';
  const seisLabel = sc.seis ? `  [kh=${sc.kh}]` : '';

  const otDisp  = sc.seis
    ? `${n2(st.FSot)}/${n2(st.FSots)}`
    : n2(st.FSot);
  const slDisp  = sc.seis
    ? `${n2(st.FSsl)}/${n2(st.FSsls)}`
    : n2(st.FSsl);

  const ot = (r.otOk&&r.otSOk) ? ' ✓' : ' ✗';
  const sl = (r.slOk&&r.slSOk) ? ' ✓' : ' ✗';
  const bp = r.bpOk ? ' ✓' : ' ✗';
  const ec = r.ecOk ? ' ✓' : ' ✗';
  const status = r.allOk ? 'PASS' : 'WARN';

  console.log(
    ` ${sc.id}  ${sc.H.toFixed(1).padStart(4)}  ${n2(st.B).padStart(4)}  ${ep.Ka.toFixed(3)}  ` +
    `${otDisp.padStart(11)}  ${slDisp.padStart(11)}  ${n1(st.qmax).padStart(9)}  ` +
    `${p.qa.toString().padStart(4)}  ${eRatio.toFixed(2).padStart(4)}  ` +
    `${stemAs.padStart(7)}  ${shrOk}  ${ot}  ${sl}  ${bp}  ${ec}  ${status}${seisLabel}`
  );
}

function p(o,e,s,b,c){
  /* tiny alias for the loop above — not needed outside */
}

console.log(hr);
console.log(`\n  SUMMARY`);
console.log(`  Total scenarios : ${scenarios.length}`);
console.log(`  Run errors      : ${runErrors}`);
console.log(`  All checks PASS : ${designPasses}`);
console.log(`  Design warnings : ${designFails}  (calculator ran OK; one or more stability ratios below target)`);
console.log('');

/* ── Group breakdown ── */
const groups = [
  {label:'Basic (sc01–sc10)',    ids:['sc01','sc02','sc03','sc04','sc05','sc06','sc07','sc08','sc09','sc10']},
  {label:'Surcharge (sc11–sc18)',ids:['sc11','sc12','sc13','sc14','sc15','sc16','sc17','sc18']},
  {label:'Seismic (sc19–sc26)',  ids:['sc19','sc20','sc21','sc22','sc23','sc24','sc25','sc26']},
  {label:'Saturated (sc27–sc34)',ids:['sc27','sc28','sc29','sc30','sc31','sc32','sc33','sc34']},
  {label:'Shear key (sc35–sc42)',ids:['sc35','sc36','sc37','sc38','sc39','sc40','sc41','sc42']},
  {label:'Sloped β (sc43–sc46)', ids:['sc43','sc44','sc45','sc46']},
  {label:'Coulomb (sc47–sc50)',  ids:['sc47','sc48','sc49','sc50']},
];

console.log('  Group breakdown:');
for(const g of groups){
  const grpResults = results.filter(r=>g.ids.includes(r.sc.id));
  const pass = grpResults.filter(r=>!r.err&&r.allOk).length;
  const warn = grpResults.filter(r=>!r.err&&!r.allOk).length;
  const err  = grpResults.filter(r=>r.err).length;
  console.log(`    ${g.label.padEnd(26)} pass=${pass}  warn=${warn}  err=${err}`);
}

/* ── Identify failure modes ── */
const warns = results.filter(r=>!r.err&&!r.allOk);
if(warns.length){
  console.log('\n  Design warnings detail (stability ratios below target):');
  for(const r of warns){
    const modes=[];
    if(!r.otOk)  modes.push(`FSot=${n2(r.st.FSot)}<1.5`);
    if(!r.slOk)  modes.push(`FSsl=${n2(r.st.FSsl)}<1.5`);
    if(!r.bpOk)  modes.push(`q=${n1(r.st.qmax)}>${r.sc.qa}kPa`);
    if(!r.ecOk)  modes.push(`e/em=${(Math.abs(r.st.e)/r.st.em).toFixed(2)}>1.0`);
    if(r.sc.seis&&!r.otSOk) modes.push(`FSot_s=${n2(r.st.FSots)}<1.1`);
    if(r.sc.seis&&!r.slSOk) modes.push(`FSsl_s=${n2(r.st.FSsls)}<1.1`);
    console.log(`    ${r.sc.id}: ${modes.join(', ')}  — ${r.sc.desc}`);
  }
}
console.log('');
