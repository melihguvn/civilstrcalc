// Retaining Wall ACI 318-25 — WSH/JScript (ES5) Test Runner
// Run: cscript //nologo tests\retaining-wall\run-wsh.js

var gc = 24;

/* ─── scenarios (inline, ES5 compatible) ─── */
var scenarios = [
  {id:'sc01',desc:'Residential garden wall H=2m',H:2.0,ts:0.25,stType:'prismatic',tf:0.30,Lt:0.40,Lh:1.20,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.50,qa:150,cover:75,kpMethod:'auto'},
  {id:'sc02',desc:'Highway shoulder wall H=3m',H:3.0,ts:0.30,stType:'prismatic',tf:0.35,Lt:0.60,Lh:1.80,fc:25,fy:420,gs:18,phi:32,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.35,mu:0.50,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc03',desc:'Basement perimeter wall H=3.5m',H:3.5,ts:0.30,stType:'prismatic',tf:0.40,Lt:0.70,Lh:2.00,fc:28,fy:420,gs:19,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.40,mu:0.50,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc04',desc:'Standard 4m cantilever silty sand',H:4.0,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.80,Lh:2.30,fc:25,fy:420,gs:17,phi:28,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.40,mu:0.45,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc05',desc:'4.5m wall gravel-sand',H:4.5,ts:0.35,stType:'prismatic',tf:0.45,Lt:1.00,Lh:2.50,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.50,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc06',desc:'5m bridge abutment dense gravel',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.00,fc:28,fy:420,gs:20,phi:35,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.55,qa:250,cover:75,kpMethod:'auto'},
  {id:'sc07',desc:'6m highway wall Lt=0',H:6.0,ts:0.45,stType:'prismatic',tf:0.55,Lt:0.00,Lh:3.80,fc:28,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'heel',skd:0.40,skw:0.30,htoe:0,mu:0.50,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc08',desc:'7m wall crushed stone fy500',H:7.0,ts:0.55,stType:'prismatic',tf:0.60,Lt:1.20,Lh:4.00,fc:30,fy:500,gs:20,phi:38,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.60,mu:0.60,qa:300,cover:75,kpMethod:'auto'},
  {id:'sc09',desc:'8m infrastructure wall dense gravel',H:8.0,ts:0.60,stType:'prismatic',tf:0.65,Lt:1.40,Lh:4.80,fc:32,fy:500,gs:21,phi:38,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.65,mu:0.60,qa:350,cover:75,kpMethod:'auto'},
  {id:'sc10',desc:'5m narrow base Lt=0',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:0.00,Lh:3.20,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.50,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc11',desc:'q=5 kN/m2 foot-traffic 3m wall',H:3.0,ts:0.30,stType:'prismatic',tf:0.35,Lt:0.60,Lh:1.80,fc:25,fy:420,gs:18,phi:30,c:0,surch:true,q:5,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.35,mu:0.50,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc12',desc:'q=10 parking lot 4m wall',H:4.0,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.80,Lh:2.40,fc:25,fy:420,gs:18,phi:30,c:0,surch:true,q:10,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.40,mu:0.50,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc13',desc:'q=12 highway LL 4.5m wall',H:4.5,ts:0.35,stType:'prismatic',tf:0.45,Lt:1.00,Lh:2.80,fc:28,fy:420,gs:19,phi:30,c:0,surch:true,q:12,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.50,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc14',desc:'q=20 heavy vehicle 5m wall',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.00,fc:28,fy:420,gs:19,phi:32,c:0,surch:true,q:20,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.52,qa:250,cover:75,kpMethod:'auto'},
  {id:'sc15',desc:'q=30 crane rail 5m industrial',H:5.0,ts:0.45,stType:'prismatic',tf:0.50,Lt:1.10,Lh:3.20,fc:30,fy:420,gs:20,phi:35,c:0,surch:true,q:30,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.55,qa:280,cover:75,kpMethod:'auto'},
  {id:'sc16',desc:'q=25 rail yard 6m silty gravel',H:6.0,ts:0.50,stType:'prismatic',tf:0.55,Lt:1.10,Lh:3.60,fc:28,fy:420,gs:19,phi:32,c:0,surch:true,q:25,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.52,qa:250,cover:75,kpMethod:'auto'},
  {id:'sc17',desc:'q=15 storage yard 3.5m dense sand',H:3.5,ts:0.30,stType:'prismatic',tf:0.35,Lt:0.70,Lh:2.10,fc:25,fy:420,gs:19,phi:33,c:0,surch:true,q:15,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.35,mu:0.52,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc18',desc:'q=20 high surcharge 7m gravelly sand',H:7.0,ts:0.55,stType:'prismatic',tf:0.60,Lt:1.20,Lh:4.20,fc:30,fy:500,gs:20,phi:35,c:0,surch:true,q:20,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.60,mu:0.56,qa:300,cover:75,kpMethod:'auto'},
  {id:'sc19',desc:'Seismic kh=0.10 4m sand Zone1',H:4.0,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.80,Lh:2.50,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.10,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.40,mu:0.50,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc20',desc:'Seismic kh=0.15 kv=auto 4.5m+q=10',H:4.5,ts:0.40,stType:'prismatic',tf:0.45,Lt:1.00,Lh:2.80,fc:28,fy:420,gs:18,phi:30,c:0,surch:true,q:10,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.15,kvOpt:'auto',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.50,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc21',desc:'Seismic kh=0.20 kv=auto 5m wall',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.00,fc:28,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.20,kvOpt:'auto',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.50,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc22',desc:'Seismic kh=0.25 4m larger footing',H:4.0,ts:0.35,stType:'prismatic',tf:0.45,Lt:0.90,Lh:2.80,fc:28,fy:420,gs:18,phi:32,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.25,kvOpt:'auto',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.45,mu:0.52,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc23',desc:'Seismic kh=0.30 5m widened heel',H:5.0,ts:0.45,stType:'prismatic',tf:0.50,Lt:1.10,Lh:3.50,fc:30,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.30,kvOpt:'auto',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.52,qa:250,cover:75,kpMethod:'auto'},
  {id:'sc24',desc:'Seismic kh=0.20+q=10 4.5m dense sand',H:4.5,ts:0.40,stType:'prismatic',tf:0.45,Lt:1.00,Lh:2.80,fc:28,fy:420,gs:19,phi:33,c:0,surch:true,q:10,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.20,kvOpt:'auto',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.52,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc25',desc:'Seismic kh=0.20+heel key 5m',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.00,fc:28,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.20,kvOpt:'auto',skEn:true,skLoc:'heel',skd:0.40,skw:0.30,htoe:0.50,mu:0.50,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc26',desc:'Seismic kh=0.12 kv=0 3.5m',H:3.5,ts:0.30,stType:'prismatic',tf:0.35,Lt:0.70,Lh:2.10,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.12,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.35,mu:0.50,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc27',desc:'Saturated sand H=3m water table top',H:3.0,ts:0.30,stType:'prismatic',tf:0.35,Lt:0.60,Lh:2.00,fc:25,fy:420,gs:20,phi:28,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.35,mu:0.45,qa:160,cover:75,kpMethod:'auto'},
  {id:'sc28',desc:'Saturated silty sand H=4m wider footing',H:4.0,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.80,Lh:2.80,fc:25,fy:420,gs:20,phi:28,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.40,mu:0.45,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc29',desc:'Saturated+q=10 H=4m combined',H:4.0,ts:0.40,stType:'prismatic',tf:0.40,Lt:0.90,Lh:2.80,fc:28,fy:420,gs:20,phi:28,c:0,surch:true,q:10,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.45,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc30',desc:'Saturated gravel H=5m phi=32',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.50,fc:28,fy:420,gs:21,phi:32,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.48,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc31',desc:'Saturated+seismic kh=0.15 H=4m',H:4.0,ts:0.40,stType:'prismatic',tf:0.45,Lt:0.90,Lh:2.80,fc:28,fy:420,gs:20,phi:28,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:true,kh:0.15,kvOpt:'auto',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.45,mu:0.45,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc32',desc:'Saturated Lt=0 H=5m heel-heavy+key',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:0.00,Lh:3.80,fc:28,fy:420,gs:20,phi:28,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:false,kh:0,kvOpt:'none',skEn:true,skLoc:'heel',skd:0.40,skw:0.30,htoe:0,mu:0.45,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc33',desc:'Saturated H=6m tall max hydraulic',H:6.0,ts:0.50,stType:'prismatic',tf:0.55,Lt:1.10,Lh:4.00,fc:30,fy:420,gs:20,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.55,mu:0.47,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc34',desc:'Saturated loose sand H=3.5m low phi',H:3.5,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.70,Lh:2.40,fc:25,fy:420,gs:19,phi:28,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.40,mu:0.44,qa:160,cover:75,kpMethod:'auto'},
  {id:'sc35',desc:'Toe key dk=0.30 H=4m mu=0.48',H:4.0,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.80,Lh:2.40,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:true,skLoc:'toe',skd:0.30,skw:0.25,htoe:0,mu:0.48,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc36',desc:'Toe key dk=0.40 H=5m soft mu=0.40',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.00,fc:28,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:true,skLoc:'toe',skd:0.40,skw:0.30,htoe:0,mu:0.40,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc37',desc:'Toe key dk=0.30 H=3.5m htoe=0.40',H:3.5,ts:0.30,stType:'prismatic',tf:0.35,Lt:0.70,Lh:2.00,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:true,skLoc:'toe',skd:0.30,skw:0.25,htoe:0.40,mu:0.45,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc38',desc:'Toe key dk=0.50 H=6m q=10',H:6.0,ts:0.50,stType:'prismatic',tf:0.55,Lt:1.00,Lh:3.60,fc:28,fy:420,gs:18,phi:30,c:0,surch:true,q:10,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:true,skLoc:'toe',skd:0.50,skw:0.35,htoe:0.55,mu:0.45,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc39',desc:'Heel key dk=0.35 H=4.5m',H:4.5,ts:0.35,stType:'prismatic',tf:0.45,Lt:1.00,Lh:2.60,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:true,skLoc:'heel',skd:0.35,skw:0.25,htoe:0,mu:0.45,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc40',desc:'Heel key dk=0.50 H=5m q=15',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.00,fc:28,fy:420,gs:19,phi:32,c:0,surch:true,q:15,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:true,skLoc:'heel',skd:0.50,skw:0.30,htoe:0,mu:0.42,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc41',desc:'Toe key saturated H=4m mu=0.40',H:4.0,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.80,Lh:2.60,fc:25,fy:420,gs:20,phi:28,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:true,seis:false,kh:0,kvOpt:'none',skEn:true,skLoc:'toe',skd:0.40,skw:0.30,htoe:0.40,mu:0.40,qa:180,cover:75,kpMethod:'auto'},
  {id:'sc42',desc:'Heel key seismic kh=0.20 H=5m',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.20,fc:28,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:0,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.20,kvOpt:'auto',skEn:true,skLoc:'heel',skd:0.45,skw:0.30,htoe:0.50,mu:0.47,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc43',desc:'Sloped beta=5 H=4m embankment',H:4.0,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.80,Lh:2.50,fc:25,fy:420,gs:18,phi:30,c:0,surch:false,q:0,beta:5,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.40,mu:0.50,qa:200,cover:75,kpMethod:'auto'},
  {id:'sc44',desc:'Sloped beta=10 H=5m hillside cut',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.20,fc:28,fy:420,gs:18,phi:32,c:0,surch:false,q:0,beta:10,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.52,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc45',desc:'Sloped beta=15 H=4.5m Ka elevated',H:4.5,ts:0.40,stType:'prismatic',tf:0.45,Lt:1.00,Lh:2.90,fc:28,fy:420,gs:19,phi:35,c:0,surch:false,q:0,beta:15,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.55,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc46',desc:'Sloped beta=20 H=5m dense gravel phi=38',H:5.0,ts:0.45,stType:'prismatic',tf:0.50,Lt:1.10,Lh:3.40,fc:28,fy:420,gs:20,phi:38,c:0,surch:false,q:0,beta:20,pMethod:'rankine',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.58,qa:250,cover:75,kpMethod:'auto'},
  {id:'sc47',desc:'Coulomb auto-delta H=4m phi=33',H:4.0,ts:0.35,stType:'prismatic',tf:0.40,Lt:0.80,Lh:2.40,fc:25,fy:420,gs:19,phi:33,c:0,surch:false,q:0,beta:0,pMethod:'coulomb',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.40,mu:0.52,qa:220,cover:75,kpMethod:'auto'},
  {id:'sc48',desc:'Coulomb delta=20 H=5m coarse gravel',H:5.0,ts:0.40,stType:'prismatic',tf:0.50,Lt:1.00,Lh:3.00,fc:28,fy:420,gs:20,phi:35,c:0,surch:false,q:0,beta:0,pMethod:'coulomb',deltaOpt:'manual',delta:20,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.55,qa:250,cover:75,kpMethod:'auto'},
  {id:'sc49',desc:'Coulomb+q=12 H=4.5m gravelly sand',H:4.5,ts:0.35,stType:'prismatic',tf:0.45,Lt:0.90,Lh:2.80,fc:28,fy:420,gs:19,phi:35,c:0,surch:true,q:12,beta:0,pMethod:'coulomb',deltaOpt:'auto',delta:0,water:false,seis:false,kh:0,kvOpt:'none',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0,mu:0.55,qa:240,cover:75,kpMethod:'auto'},
  {id:'sc50',desc:'Coulomb+beta=10+seismic kh=0.20 H=5m',H:5.0,ts:0.45,stType:'prismatic',tf:0.50,Lt:1.10,Lh:3.40,fc:30,fy:420,gs:20,phi:35,c:0,surch:false,q:0,beta:10,pMethod:'coulomb',deltaOpt:'auto',delta:0,water:false,seis:true,kh:0.20,kvOpt:'auto',skEn:false,skLoc:'toe',skd:0,skw:0.25,htoe:0.50,mu:0.55,qa:260,cover:75,kpMethod:'auto'}
];

/* ─── calc functions (identical to retaining-wall-aci-si.html) ─── */
function calcEP(p){
  var phi=p.phi*Math.PI/180,sp=Math.sin(phi),cphi=Math.cos(phi),Ka;
  var beta_r=(p.beta||0)*Math.PI/180,cosB=Math.cos(beta_r),sinB=Math.sin(beta_r);
  if(beta_r>=phi-1e-6){beta_r=Math.max(0,phi-0.001);cosB=Math.cos(beta_r);sinB=Math.sin(beta_r);}
  if(p.pMethod==='coulomb'){
    var dr=(p.deltaOpt==='auto')?(2/3)*phi:p.delta*Math.PI/180;
    var sqC=Math.sqrt(Math.max(0,Math.sin(phi+dr)*Math.sin(phi-beta_r)/(Math.cos(dr)*cosB)));
    Ka=cphi*cphi/(Math.cos(dr)*Math.pow(1+sqC,2));
  }else{
    if(beta_r<1e-6){Ka=(1-sp)/(1+sp);}
    else{var cos2B=cosB*cosB,cos2P=cphi*cphi,sqR=Math.sqrt(Math.max(0,cos2B-cos2P));Ka=cosB*(cosB-sqR)/(cosB+sqR);}
  }
  var Kp=(1+sp)/(1-sp),gw=9.81,gs=p.gs,He=p.H,H=p.H+p.tf,gs_eff=p.water?(gs-gw):gs;
  var Heq=p.surch?(p.q/gs_eff):0,Pt=0.5*Ka*gs_eff*H*H,Ps=Ka*gs_eff*Heq*H,Pw=p.water?0.5*gw*H*H:0;
  var Pa=Pt+Ps+Pw,arm=(Pa>0)?(Pt*(H/3)+Ps*(H/2)+Pw*(H/3))/Pa:(H/3);
  var Pa_h,Pa_v;
  if(p.pMethod!=='coulomb'&&beta_r>1e-6){Pa_h=(Pt+Ps)*cosB+Pw;Pa_v=(Pt+Ps)*sinB;}
  else{Pa_h=Pa;Pa_v=0;}
  var DPAE=0,kh=0,kv=0;
  if(p.seis){
    kh=p.kh;kv=(p.kvOpt==='auto')?0.5*kh:0;
    var th=Math.atan(kh/(1-kv)),ct=Math.cos(th),cpd=Math.cos(phi-th);
    var sqMO=Math.sqrt(Math.max(0,Math.sin(phi)*Math.sin(phi-th-beta_r)/(ct*cosB)));
    var KAE=cpd*cpd/(ct*Math.pow(1+sqMO,2));
    DPAE=Math.max(0,0.5*(1-kv)*gs_eff*H*H*KAE-Pt);
  }
  return {Ka:Ka,Kp:Kp,Pa:Pa,Pa_h:Pa_h,Pa_v:Pa_v,Pt:Pt,Ps:Ps,Pw:Pw,arm:arm,DPAE:DPAE,kh:kh,kv:kv,He:He,H:H,beta_r:beta_r};
}
function calcStability(p,ep){
  var B=p.Lt+p.ts+p.Lh,ts_t=p.ts,W1=gc*p.ts*p.H,x1=p.Lt+p.ts/2;
  var W2=gc*B*p.tf,x2=B/2,W3=p.gs*p.Lh*p.H,x3=p.Lt+p.ts+p.Lh/2;
  var W4=(p.Lt>0&&p.htoe>p.tf)?p.gs*p.Lt*(p.htoe-p.tf):0,x4=p.Lt/2;
  var W5=p.surch?p.q*p.Lh:0,x5=p.Lt+p.ts+p.Lh/2;
  var V=W1+W2+W3+W4+W5,Pv=ep.Pa_v||0,xPv=p.Lt+p.ts;
  var hp=p.htoe,Fp_base=0.5*ep.Kp*p.gs*hp*hp,Fp_key=0;
  if(p.skEn&&p.skd>0){
    if(p.skLoc==='toe'){var hp_eff=hp+p.skd;Fp_key=0.5*ep.Kp*p.gs*hp_eff*hp_eff-Fp_base;}
    else{Fp_key=ep.Kp*p.gs*p.H*p.skd+0.5*ep.Kp*p.gs*p.skd*p.skd;}
  }
  var Fp=Fp_base+Fp_key,Ph=ep.Pa_h;
  var Mr=W1*x1+W2*x2+W3*x3+W4*x4+W5*x5+Pv*xPv,Mo=Ph*ep.arm;
  var gw=9.81,U=p.water?0.5*gw*ep.He*B:0;
  var V_eff=V+Pv-U,Mr_eff=Mr-U*(2*B/3);
  var FSot=Mr_eff/Mo,FSsl=(p.mu*V_eff+Fp)/Ph;
  var FSots=null,FSsls=null;
  if(p.seis){var Mos=Mo+ep.DPAE*0.6*ep.H;FSots=Mr_eff/Mos;FSsls=(p.mu*V_eff+Fp)/(Ph+ep.DPAE);}
  var xr=(V_eff>0)?(Mr_eff-Mo)/V_eff:(B/2),e=B/2-xr,em=B/6,qmax,qmin;
  if(xr<=0){qmax=999999;qmin=0;}
  else if(Math.abs(e)<=em){qmax=(V_eff/B)*(1+6*Math.abs(e)/B);qmin=(V_eff/B)*(1-6*Math.abs(e)/B);}
  else{qmax=2*V_eff/(3*xr);qmin=0;}
  return {B:B,V:V,Pv:Pv,V_eff:V_eff,U:U,Mr:Mr,Mr_eff:Mr_eff,Mo:Mo,Fp:Fp,Fp_base:Fp_base,Fp_key:Fp_key,hp:hp,FSot:FSot,FSsl:FSsl,FSots:FSots,FSsls:FSsls,xr:xr,e:e,em:em,qmax:qmax,qmin:qmin};
}
function calcReinf(p,st,ep){
  var fc=p.fc,fy=p.fy,pf=0.9,pv=0.75;
  function effD(h){return h-p.cover-8;}
  function fxD(Mu,h){
    var d=effD(h),MN=Math.abs(Mu)*1e6,Ru=MN/(pf*1000*d*d);
    var rho=(0.85*fc/fy)*(1-Math.sqrt(Math.max(0,1-2*Ru/(0.85*fc))));
    if(rho<0||isNaN(rho))rho=0;
    var Ar=rho*1000*d,Am=Math.max(0.25*Math.sqrt(fc)/fy*1000*d,1.4/fy*1000*d),At=0.0018*1000*h;
    return {Mu:Mu,d:d,Ar:Ar,Am:Am,At:At,A:Math.max(Ar,Am,At)};
  }
  function vc(d){var ls=Math.min(1.0,Math.sqrt(2/(1+d/250)));return pv*0.17*ls*Math.sqrt(fc)*d;}
  var He=ep.He,Ka=ep.Ka,gs=p.gs,gw=9.81,gs_eff=p.water?(gs-gw):gs;
  var LFh=1.6,LFd=1.2,LFw=1.4;
  var cosB_ri=(p.beta&&p.pMethod!=='coulomb')?Math.cos(p.beta*Math.PI/180):1.0,Ka_h=Ka*cosB_ri;
  var Mus=LFh*(Ka_h*gs_eff*He*He*He/6+(p.surch?Ka_h*p.q*He*He/2:0));
  if(p.water)Mus+=LFw*gw*He*He*He/6;
  if(p.seis)Mus+=ep.DPAE*(0.6*ep.H-p.tf);
  var Vus=LFh*(Ka_h*gs_eff*He*He/2+(p.surch?Ka_h*p.q*He:0));
  if(p.water)Vus+=LFw*gw*He*He/2;
  var ts=p.ts*1000,sf=fxD(Mus,ts);
  sf.Vu=Vus;sf.Vc=vc(sf.d);sf.sok=sf.Vc>=Vus;
  var B=st.B,tf=p.tf*1000,hf=null;
  if(p.Lh>0){
    var qhs=st.qmax-(st.qmax-st.qmin)*(p.Lt+p.ts)/B;
    var whn=((qhs+st.qmin)/2)-(p.gs*He+(p.surch?p.q:0)+gc*p.tf);
    hf=fxD(LFd*Math.abs(whn)*p.Lh*p.Lh/2,tf);
    hf.Vu=LFd*Math.abs(whn)*p.Lh;hf.Vc=vc(hf.d);hf.sok=hf.Vc>=hf.Vu;hf.ten=whn<0?'bottom':'top';
  }
  var tf2=null;
  if(p.Lt>0){
    var qts=st.qmax-(st.qmax-st.qmin)*p.Lt/B;
    var wtn=((st.qmax+qts)/2)-(gc*p.tf+p.gs*Math.max(0,p.htoe-p.tf));
    tf2=fxD(LFd*Math.abs(wtn)*p.Lt*p.Lt/2,tf);
    tf2.Vu=LFd*Math.abs(wtn)*p.Lt;tf2.Vc=vc(tf2.d);tf2.sok=tf2.Vc>=tf2.Vu;tf2.ten=wtn>0?'top':'bottom';
  }
  var sk_ri=null;
  if(p.skEn&&p.skd>0&&p.skw>0&&!(p.skLoc==='heel'&&p.Lh<=0)){
    var Kp_sk=ep.Kp,dk_sk=p.skd,Fp_sk_uf,Msk_uf;
    if(p.skLoc==='toe'){Fp_sk_uf=Kp_sk*p.gs*dk_sk*(p.htoe+dk_sk/2);Msk_uf=Kp_sk*p.gs*(p.htoe*dk_sk*dk_sk/2+dk_sk*dk_sk*dk_sk/6);}
    else{Fp_sk_uf=Kp_sk*p.gs*(ep.He*dk_sk+0.5*dk_sk*dk_sk);Msk_uf=Kp_sk*p.gs*(ep.He*dk_sk*dk_sk/2+dk_sk*dk_sk*dk_sk/6);}
    sk_ri=fxD(LFh*Msk_uf,p.skw*1000);
    sk_ri.Vu=LFh*Fp_sk_uf;sk_ri.Vc=vc(sk_ri.d);sk_ri.sok=sk_ri.Vc>=sk_ri.Vu;
  }
  return {stem:sf,heel:hf,toe:tf2,key:sk_ri};
}

/* ─── runner ─── */
function f2(v){return (v===null||v===undefined||isNaN(v)||!isFinite(v))?"---":v.toFixed(2);}
function f1(v){return (v===null||v===undefined||isNaN(v)||!isFinite(v))?"---":v.toFixed(1);}
function pad(s,n){s=String(s);while(s.length<n)s=" "+s;return s;}

var results=[],runErrors=0,designPasses=0,designFails=0;
for(var i=0;i<scenarios.length;i++){
  var sc=scenarios[i],p=sc,ep,st,ri,err=null;
  try{ep=calcEP(p);st=calcStability(p,ep);ri=calcReinf(p,st,ep);}
  catch(e){err=e.message;runErrors++;}
  if(err){results.push({sc:sc,err:err});continue;}
  var hasNaN=false;
  var checkObj=[ep,st];
  for(var oi=0;oi<checkObj.length;oi++){for(var k in checkObj[oi]){if(typeof checkObj[oi][k]==='number'&&isNaN(checkObj[oi][k])){hasNaN=true;err='NaN:'+k;break;}}}
  if(hasNaN){runErrors++;results.push({sc:sc,err:err});continue;}
  var otOk=st.FSot>=1.5,slOk=st.FSsl>=1.5,bpOk=st.qmax<=p.qa,ecOk=Math.abs(st.e)<=st.em;
  var otSOk=sc.seis?(st.FSots>=1.1):true,slSOk=sc.seis?(st.FSsls>=1.1):true;
  var allOk=otOk&&slOk&&bpOk&&ecOk&&otSOk&&slSOk;
  if(allOk)designPasses++;else designFails++;
  results.push({sc:sc,ep:ep,st:st,ri:ri,otOk:otOk,slOk:slOk,bpOk:bpOk,ecOk:ecOk,otSOk:otSOk,slSOk:slSOk,allOk:allOk});
}

WScript.Echo("");
WScript.Echo("══════════════════════════════════════════════════════════════════════════════════════════════════════");
WScript.Echo("  RETAINING WALL ACI 318-25 — 50 SCENARIO TEST REPORT");
WScript.Echo("══════════════════════════════════════════════════════════════════════════════════════════════════════");
WScript.Echo(" ID    H   B(m)  Ka     FSot    FSsl   qmax(kPa)  qa   e/em  StemAs  SHR  OT  SL  BP  EC  Status");
WScript.Echo("──────────────────────────────────────────────────────────────────────────────────────────────────────");
for(var i=0;i<results.length;i++){
  var r=results[i],sc=r.sc;
  if(r.err){WScript.Echo(" "+sc.id+"  ERROR: "+r.err);continue;}
  var ep=r.ep,st=r.st,ri=r.ri;
  var eRatio=(st.em>0)?(Math.abs(st.e)/st.em):0;
  var stemAs=ri.stem?ri.stem.A.toFixed(0):"---";
  var shrOk=ri.stem?(ri.stem.sok?"OK":"NG"):"--";
  var otDisp=sc.seis?f2(st.FSot)+"/"+f2(st.FSots):pad(f2(st.FSot),5);
  var slDisp=sc.seis?f2(st.FSsl)+"/"+f2(st.FSsls):pad(f2(st.FSsl),5);
  var ot=(r.otOk&&r.otSOk)?"V":"X",sl=(r.slOk&&r.slSOk)?"V":"X",bp=r.bpOk?"V":"X",ec=r.ecOk?"V":"X";
  var seis=sc.seis?"[kh="+sc.kh+"]":"";
  var status=r.allOk?"PASS":"WARN";
  WScript.Echo(" "+sc.id+"  "+pad(sc.H.toFixed(1),4)+"  "+pad(f2(st.B),4)+"  "+ep.Ka.toFixed(3)+"  "+pad(otDisp,11)+"  "+pad(slDisp,11)+"  "+pad(f1(st.qmax),9)+"  "+pad(String(sc.qa),4)+"  "+eRatio.toFixed(2)+"  "+pad(stemAs,6)+"  "+pad(shrOk,3)+"  "+ot+"  "+sl+"  "+bp+"  "+ec+"  "+status+" "+seis);
}
WScript.Echo("──────────────────────────────────────────────────────────────────────────────────────────────────────");
WScript.Echo("  SUMMARY  |  Total: "+scenarios.length+"  |  Run errors: "+runErrors+"  |  All checks PASS: "+designPasses+"  |  Design WARN: "+designFails);
WScript.Echo("");
WScript.Echo("  Group breakdown:");
var groups=[
  {label:"Basic      (sc01-10)",ids:"sc01,sc02,sc03,sc04,sc05,sc06,sc07,sc08,sc09,sc10"},
  {label:"Surcharge  (sc11-18)",ids:"sc11,sc12,sc13,sc14,sc15,sc16,sc17,sc18"},
  {label:"Seismic    (sc19-26)",ids:"sc19,sc20,sc21,sc22,sc23,sc24,sc25,sc26"},
  {label:"Saturated  (sc27-34)",ids:"sc27,sc28,sc29,sc30,sc31,sc32,sc33,sc34"},
  {label:"Shear key  (sc35-42)",ids:"sc35,sc36,sc37,sc38,sc39,sc40,sc41,sc42"},
  {label:"Sloped b   (sc43-46)",ids:"sc43,sc44,sc45,sc46"},
  {label:"Coulomb    (sc47-50)",ids:"sc47,sc48,sc49,sc50"}
];
for(var gi=0;gi<groups.length;gi++){
  var g=groups[gi],gids=g.ids.split(","),pass=0,warn=0,err=0;
  for(var ri2=0;ri2<results.length;ri2++){var rv=results[ri2];if(gids.indexOf(rv.sc.id)>=0){if(rv.err)err++;else if(rv.allOk)pass++;else warn++;}}
  WScript.Echo("    "+g.label+"  pass="+pass+"  warn="+warn+"  err="+err);
}
WScript.Echo("");
WScript.Echo("  Design WARNs (stability below target — calculator ran correctly):");
for(var i=0;i<results.length;i++){
  var r=results[i];
  if(r.err||r.allOk)continue;
  var modes=[];
  if(!r.otOk)modes.push("FSot="+f2(r.st.FSot)+"<1.5");
  if(!r.slOk)modes.push("FSsl="+f2(r.st.FSsl)+"<1.5");
  if(!r.bpOk)modes.push("q="+f1(r.st.qmax)+">"+r.sc.qa+"kPa");
  if(!r.ecOk)modes.push("e/em="+( Math.abs(r.st.e)/r.st.em).toFixed(2)+">1.0");
  if(r.sc.seis&&!r.otSOk)modes.push("FSot_s="+f2(r.st.FSots)+"<1.1");
  if(r.sc.seis&&!r.slSOk)modes.push("FSsl_s="+f2(r.st.FSsls)+"<1.1");
  WScript.Echo("    "+r.sc.id+": "+modes.join(", ")+" | "+r.sc.desc);
}
WScript.Echo("");
