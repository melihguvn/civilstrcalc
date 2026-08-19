/* TSC 2019 §16.12 retaining-wall seismic — verification of revised formulas.
 * Run:  cscript //Nologo tests\tbdy_retaining_seismic_test.js
 */
function tbdyKaTotal(phi, delta, beta, psi){
  var num = Math.pow(Math.cos(phi - psi), 2);
  var cpsi = Math.cos(psi);
  var sAmpd = Math.cos(psi + delta);
  if (sAmpd <= 1e-6 || cpsi <= 1e-6) return NaN;
  if (beta > (phi - psi)) return num / (cpsi * sAmpd);
  var sq = Math.sqrt(Math.max(0,
    Math.sin(phi + delta) * Math.sin(phi - psi - beta) / (sAmpd * Math.cos(beta))));
  return num / (cpsi * sAmpd * Math.pow(1 + sq, 2));
}
if (!Math.max) { Math.max = function(a,b){return a>b?a:b;}; }

var pass=0, fail=0;
function ok(name, cond, got, exp){
  if(cond){ pass++; WScript.Echo('  PASS  '+name); }
  else { fail++; WScript.Echo('  FAIL  '+name+'   got='+got+'  exp='+exp); }
}
function near(a,b,tol){ return Math.abs(a-b) <= (tol||1e-4); }

var d2r = Math.PI/180;

/* 1) ψ=0, δ=0, β=0 must equal Rankine Ka = (1-sinφ)/(1+sinφ) */
(function(){
  var phis=[20,30,35,40];
  for(var i=0;i<phis.length;i++){
    var phi=phis[i]*d2r;
    var rank=(1-Math.sin(phi))/(1+Math.sin(phi));
    var k=tbdyKaTotal(phi,0,0,0);
    ok('static Ka == Rankine (phi='+phis[i]+')', near(k,rank,1e-6), k.toFixed(6), rank.toFixed(6));
  }
})();

/* 2) kh = 0.4·r·SDS, kv = 0.5·kh */
(function(){
  var SDS=0.78, r=1.0;            // Fs=1.3 (ZC,Ss=0.6) -> SDS=0.78
  var kh=0.4*r*SDS, kv=0.5*kh;
  ok('kh = 0.4*r*SDS', near(kh,0.312,1e-9), kh, 0.312);
  ok('kv = 0.5*kh',    near(kv,0.156,1e-9), kv, 0.156);
  ok('kh scales with r=2', near(0.4*2.0*SDS,0.624,1e-9), 0.4*2.0*SDS, 0.624);
})();

/* 3) seismic increment dKae = KaTot(1-kv) - KaStat must be > 0 and grow with kh */
(function(){
  var phi=30*d2r, beta=0, delta=0;
  function dKae(kh){
    var kv=0.5*kh, psi=Math.atan(kh/(1-kv));
    var tot=tbdyKaTotal(phi,delta,beta,psi);
    var st =tbdyKaTotal(phi,delta,beta,0);
    return tot*(1-kv)-st;
  }
  var d1=dKae(0.10), d2=dKae(0.30);
  ok('dKae > 0 (kh=0.30)', d2>0, d2.toFixed(4), '>0');
  ok('dKae increases with kh', d2>d1, d2.toFixed(4)+' > '+d1.toFixed(4), 'increasing');
})();

/* 4) submerged psi amplification: gamma factor increases psi -> larger total coeff */
(function(){
  var phi=30*d2r, kh=0.25, kv=0.5*kh, gs=20, gw=9.81;
  var psiDry=Math.atan(kh/(1-kv));
  var psiSub=Math.atan((gs/(gs-gw))*(kh/(1-kv)));
  ok('submerged psi > dry psi', psiSub>psiDry, psiSub.toFixed(4)+' > '+psiDry.toFixed(4), 'larger');
  var totDry=tbdyKaTotal(phi,0,0,psiDry), totSub=tbdyKaTotal(phi,0,0,psiSub);
  ok('submerged KaTot > dry KaTot', totSub>totDry, totSub.toFixed(4)+' > '+totDry.toFixed(4), 'larger');
})();

WScript.Echo('');
WScript.Echo('TSC 2019 §16.12 retaining seismic  --  '+pass+' passed, '+fail+' failed  ('+(pass+fail)+' total)');
if(fail>0) WScript.Quit(1);
