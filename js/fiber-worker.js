/* Fiber P-M calculation — runs in a Web Worker, no DOM access */
self.onmessage = function(e){
  var d=e.data;
  var pts=fiberPM(d.lw,d.bw,d.fc,d.fy,d.rhov,d.rhobe,d.lbe,d.cc,d.std);
  self.postMessage({pts:pts,std:d.std,tok:d.tok});
};

function fiberPM(lw,bw,fc,fy,rhov_web,rhov_be,lbe,cc,codeType){
  var Es=200000,pts=[],N=100;
  var beta1=codeType==='aci'?Math.max(0.65,0.85-0.05*(fc-28)/7):0.80;
  var eps_cu=(codeType==='en'||codeType==='tbdy'||codeType==='is')?0.0035:0.003;
  var fcd,fyd;
  if(codeType==='aci'){fcd=0.85*fc;fyd=fy;}
  else if(codeType==='en'){fcd=fc/1.5;fyd=fy/1.15;}
  else if(codeType==='is'){fcd=0.447*fc;fyd=0.87*fy;}
  else{fcd=fc/1.5;fyd=fy/1.15;}

  var Ast_web=rhov_web*lw*bw;
  var Ast_be=lbe>0?2*rhov_be*lbe*bw:0;
  var Pn0=(fcd*lw*bw+fyd*(Ast_web+Ast_be));
  var Pn_max=codeType==='aci'?0.80*Pn0:Pn0;
  pts.push({Pn:Pn_max,Mn:0,phiPn:codeType==='aci'?0.65*Pn_max:Pn_max,phiMn:0});

  var cMax=2*lw,cMin=Math.max(lw*0.005,1);
  for(var i=1;i<=N;i++){
    var c=cMax+(cMin-cMax)*(i-1)/(N-1);
    var a=Math.min(beta1*c,lw);
    var Pn=0,Mn=0;
    var centroid=lw/2;
    var Cc=fcd*a*bw;
    Pn+=Cc; Mn+=Cc*(centroid-a/2);
    var nS=80,dS=lw/nS;
    for(var j=0;j<nS;j++){
      var xi=(j+0.5)*dS;
      var eps_si=(c-xi)/c*eps_cu;
      var fs=Math.max(-fyd,Math.min(fyd,Es*eps_si));
      var As_s=rhov_web*bw*dS;
      var cc_disp=(xi<a)?fcd*As_s:0;
      var F=As_s*fs-cc_disp;
      Pn+=F; Mn+=F*(centroid-xi);
    }
    if(lbe>0){
      var xbe_L=lbe/2,xbe_R=lw-lbe/2;
      [xbe_L,xbe_R].forEach(function(xbe){
        var eps_be=(c-xbe)/c*eps_cu;
        var fs_be=Math.max(-fyd,Math.min(fyd,Es*eps_be));
        var Abe=rhov_be*bw*lbe;
        var cc_be=(xbe<a)?fcd*Abe:0;
        var F_be=Abe*fs_be-cc_be;
        Pn+=F_be; Mn+=F_be*(centroid-xbe);
      });
    }
    var eps_t=(lw-c)/c*eps_cu;
    var phi=1.0;
    if(codeType==='aci'){
      var eps_y=fy/Es;
      phi=eps_t>=0.005?0.90:eps_t<=eps_y?0.65:0.65+(0.90-0.65)*(eps_t-eps_y)/(0.005-eps_y);
    }
    pts.push({Pn:Pn,Mn:Math.abs(Mn),phiPn:phi*Pn,phiMn:phi*Math.abs(Mn)});
  }
  var Ast_tot=Ast_web+Ast_be;
  var Tn=fyd*Ast_tot;
  pts.push({Pn:-Tn,Mn:0,phiPn:(codeType==='aci'?0.90:1.0)*(-Tn),phiMn:0});
  return pts;
}
