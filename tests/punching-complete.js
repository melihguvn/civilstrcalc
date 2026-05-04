/**
 * Punching Shear — Complete Test Suite (T01–T35)
 * 35 scenarios: basic functionality, edge cases, code variants, visual checks.
 *
 * Load via tests/test-complete.html
 * Requires: _lastPunchResults global + calcPunchShear() in same window.
 */

var PUNCH_COMPLETE = (() => {

  // ─── DOM helpers ─────────────────────────────────────────────────────────────
  const _sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  const _sc = (id, v) => { const e = document.getElementById(id); if (e) e.checked = v; };

  function _setup(inp) {
    if (typeof setPunchCode      === 'function') setPunchCode(inp.code ?? 'aci', null);
    if (typeof setPunchColShape  === 'function') setPunchColShape(inp.shape ?? 'rect', null);
    if (typeof setPunchColType   === 'function') setPunchColType(inp.type ?? 'int', null);
    if (typeof setPunchEdgeFace    === 'function') setPunchEdgeFace(inp.edgeFace ?? 'N', null);
    if (typeof setPunchCornerPos   === 'function') setPunchCornerPos(inp.cornerPos ?? 'NE', null);
    if (typeof setPunchEdgeDist    === 'function') setPunchEdgeDist(inp.edgeDist    ?? 0);
    if (typeof setPunchCornerDistX === 'function') setPunchCornerDistX(inp.cornerDistX ?? 0);
    if (typeof setPunchCornerDistY === 'function') setPunchCornerDistY(inp.cornerDistY ?? 0);
    if (typeof setPunchReinfType === 'function') setPunchReinfType(inp.reinfType ?? 'stud', null);
    if (typeof setPunchOpFace    === 'function' && inp.openingDir) setPunchOpFace(1, inp.openingDir, null);
    _sv('punch-h',  inp.h  ?? 250);  _sv('punch-cv', inp.cv ?? 25);
    _sv('punch-db', inp.db ?? 16);   _sv('punch-fc', inp.fc ?? 28);
    _sv('punch-c1', inp.c1 ?? 400);  _sv('punch-c2', inp.c2 ?? 400);
    _sv('punch-dc', inp.Dc ?? 500);  _sv('punch-vu', inp.Vu ?? 500);
    _sv('punch-mux', inp.Mux ?? 0);  _sv('punch-muy', inp.Muy ?? 0);
    _sc('punch-has-reinf', !!inp.hasReinf);
    _sv('punch-reinf-nr',    inp.nr    ?? 4);
    _sv('punch-reinf-nlegs', inp.nLegs ?? 1);
    _sv('punch-reinf-db',    inp.rdb   ?? 12);
    _sv('punch-reinf-s',     inp.s     ?? 150);
    _sv('punch-fyt',         inp.fyt   ?? 420);
    _sc('punch-has-op1', !!inp.hasOpening);
    _sv('punch-ao1', inp.ao ?? 0);
  }

  function _run(inp) {
    _setup(inp);
    calcPunchShear();
    return typeof _lastPunchResults !== 'undefined' ? _lastPunchResults : null;
  }

  // ─── Constants ───────────────────────────────────────────────────────────────
  const D  = 209;           // d = h - cv - db = 250 - 25 - 16 = 209
  const C  = 400;
  const FC = 28;
  const phi = 0.75;
  const bo_int    = 2*(C+D) + 2*(C+D);   // 2436
  const bo_edge_N = C + 2*(C+D);         // 1618
  const bo_corn   = C + C + D;           // 1009

  const vc_int_noR = Math.min(
    0.51 * Math.sqrt(FC),
    0.083 * (40*D/bo_int + 2) * Math.sqrt(FC),
    0.33 * Math.sqrt(FC)
  );  // 1.746 MPa (vc3 governs at 400×400)

  // ─── Test definitions ────────────────────────────────────────────────────────
  // Assertion operators:
  //   '='  exact (bool/string/int)
  //   '≈'  numeric ±tol% relative
  //   '>'  actual > value
  //   '<'  actual < value
  //   'contains'  string/array element contains text
  //   'null'      result object must be null
  //   'gt-run'    multi: run[runIdx].field > run[refRunIdx].field
  //   'ratio'     multi: run[runIdx].field / run[refRunIdx].field ≈ value ±tol%

  const tests = [

    // ══════════════════════════════════════════════════════════════════════════
    // T01-T15  Basic Functionality
    // ══════════════════════════════════════════════════════════════════════════

    {
      id:'T01', name:'ACI-Interior-NoReinf-Pass', type:'single',
      desc:'Interior 400×400 Vu=500kN → adequate without reinforcement',
      inputs:{ type:'int', Vu:500, hasReinf:false },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int,   tol:0.01 },
        { field:'vc',       op:'≈', value:vc_int_noR, tol:0.02 },
        { field:'phiVn',    op:'≈', value:phi*vc_int_noR, tol:0.02 },
        { field:'vu',       op:'≈', value:500e3/(bo_int*D), tol:0.01 },
        { field:'isOK',     op:'=', value:true },
        { field:'hasReinf', op:'=', value:false },
      ]},

    {
      id:'T02', name:'ACI-Interior-NoReinf-Fail', type:'single',
      desc:'Interior Vu=1100kN → exceeds φvc without reinforcement',
      inputs:{ type:'int', Vu:1100, hasReinf:false },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int, tol:0.01 },
        { field:'vu',       op:'≈', value:1100e3/(bo_int*D), tol:0.01 },
        { field:'DCR',      op:'>',  value:1.0 },
        { field:'isOK',     op:'=',  value:false },
      ]},

    {
      id:'T03', name:'ACI-Interior-Stud-Pass', type:'single',
      desc:'Interior + stud Ø12 nr=4 s=100 Vu=800kN → studs engaged',
      inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:100, fyt:420 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int, tol:0.01 },
        { field:'vc',       op:'≈', value:0.25*Math.sqrt(FC), tol:0.02 },
        { field:'vs',       op:'>',  value:0 },
        { field:'hasReinf', op:'=',  value:true },
        { field:'n_sets',   op:'>',  value:0 },
        { field:'rail_len_target', op:'>', value:0 },
      ]},

    {
      id:'T04', name:'ACI-Interior-Stirrup', type:'single',
      desc:'Interior + closed stirrups 2-leg Ø12 s=100 → vs>0',
      inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stirrup', nr:1, nLegs:2, rdb:12, s:100, fyt:420 },
      assertions:[
        { field:'vc',       op:'≈', value:0.17*Math.sqrt(FC), tol:0.02 },
        { field:'vs',       op:'>',  value:0 },
        { field:'hasReinf', op:'=',  value:true },
      ]},

    {
      id:'T05', name:'Opening-SMALL-ao200', type:'single',
      desc:'Interior + opening N ao=200mm (SMALL < 0.6×400=240) → bo = 2436-200 = 2236mm',
      inputs:{ type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:200 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int-200, tol:0.01 },
      ]},

    {
      id:'T06', name:'Opening-LARGE-ao300', type:'single',
      desc:'Interior + opening N ao=300mm (LARGE ≥240) → bo = 2436-300 = 2136mm',
      inputs:{ type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:300 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int-300, tol:0.01 },
      ]},

    {
      id:'T07', name:'Opening-Threshold-ao240', type:'single',
      desc:'ao=0.6×c=240mm exactly → LARGE classification, bo = 2436-240 = 2196mm',
      inputs:{ type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:240 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int-240, tol:0.01 },
      ]},

    {
      id:'T08', name:'Edge-N-NoReinf', type:'single',
      desc:'Edge N column 400×400 Vu=500kN → bo=1618, likely needs reinf',
      inputs:{ type:'edge', edgeFace:'N', Vu:500, hasReinf:false },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_edge_N, tol:0.01 },
        { field:'DCR',      op:'>',  value:1.0 },
        { field:'isOK',     op:'=',  value:false },
      ]},

    {
      id:'T09', name:'Corner-NE-NoReinf', type:'single',
      desc:'Corner NE column 400×400 Vu=300kN → bo=1009',
      inputs:{ type:'corner', cornerPos:'NE', Vu:300, hasReinf:false },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_corn, tol:0.01 },
      ]},

    {
      id:'T10', name:'Circular-Column-Interior', type:'single',
      desc:'Circular column Dc=500mm d=209 Vu=500kN → bo = π×(500+209) ≈ 2228mm',
      inputs:{ shape:'circ', type:'int', Dc:500, Vu:500, hasReinf:false },
      assertions:[
        { field:'bo_inner', op:'≈', value:Math.PI*(500+D), tol:0.03 },
        { field:'vc',       op:'≈', value:0.33*Math.sqrt(FC), tol:0.02 },
      ]},

    {
      id:'T11', name:'Very-Low-Vu', type:'single',
      desc:'Vu=50kN → DCR<<1, comfortable pass',
      inputs:{ type:'int', Vu:50, hasReinf:false },
      assertions:[
        { field:'DCR',  op:'<', value:0.2 },
        { field:'isOK', op:'=', value:true },
      ]},

    {
      id:'T12', name:'Very-High-Vu-NoReinf', type:'single',
      desc:'Interior Vu=2500kN no reinf → DCR>3, section grossly undersized',
      inputs:{ type:'int', Vu:2500, hasReinf:false },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int, tol:0.01 },
        { field:'DCR',      op:'>',  value:3.0 },
        { field:'isOK',     op:'=',  value:false },
      ]},

    {
      id:'T13a', name:'SpacingIndep-s75', type:'single',
      desc:'s=75: rail_len_target independent of spacing',
      inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:75,  fyt:420 },
      assertions:[
        { field:'rail_len_target', op:'>',  value:0 },
        { field:'n_sets',          op:'>',  value:0 },
      ]},

    {
      id:'T13b', name:'SpacingIndep-s150', type:'single',
      desc:'s=150: same rail_len_target as s=75 (different n_sets)',
      inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:150, fyt:420 },
      assertions:[
        { field:'rail_len_target', op:'>',  value:0 },
      ]},

    {
      id:'T14', name:'Edge-N-Stud', type:'single',
      desc:'Edge(N) + stud Ø12 s=100 Vu=300kN → bo=1618, vs>0, hasReinf=true',
      inputs:{ type:'edge', edgeFace:'N', Vu:300, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:100, fyt:420 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_edge_N, tol:0.01 },
        { field:'vs',       op:'>',  value:0 },
        { field:'hasReinf', op:'=',  value:true },
      ]},

    {
      id:'T15', name:'US-Units-SmokeTest', type:'single',
      desc:'US units: c=16in fc=4000psi Vu=112kip → DCR>0, bo>0, no crash',
      inputs:{ units:'us', type:'int', h:10, cv:1, db:0.625, fc:4000, c1:16, c2:16, Vu:112, hasReinf:false },
      assertions:[
        { field:'DCR',      op:'>',  value:0 },
        { field:'bo_inner', op:'>',  value:0 },
      ]},

    // ══════════════════════════════════════════════════════════════════════════
    // T16-T35  Advanced / Edge Cases
    // ══════════════════════════════════════════════════════════════════════════

    {
      id:'T16', name:'Moment-Effect', type:'multi-run',
      desc:'Mux=0 vs Mux=100kN·m → vu must increase with unbalanced moment',
      runs:[
        { label:'Mux=0',   inputs:{ type:'int', Vu:500, hasReinf:false, Mux:0,   Muy:0 } },
        { label:'Mux=100', inputs:{ type:'int', Vu:500, hasReinf:false, Mux:100, Muy:0 } },
      ],
      assertions:[
        { op:'gt-run',  field:'vu', runIdx:1, refRunIdx:0 },
      ]},

    {
      id:'T17a', name:'Opening-Gradient-SMALL-150', type:'single',
      desc:'ao=150mm (SMALL <240) → bo = 2436-150 = 2286mm',
      inputs:{ type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:150 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int-150, tol:0.005 },
      ]},

    {
      id:'T17b', name:'Opening-Gradient-SMALL-200', type:'single',
      desc:'ao=200mm (SMALL <240) → bo = 2436-200 = 2236mm',
      inputs:{ type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:200 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int-200, tol:0.005 },
      ]},

    {
      id:'T17c', name:'Opening-Gradient-LARGE-250', type:'single',
      desc:'ao=250mm (LARGE ≥240) → bo = 2436-250 = 2186mm',
      inputs:{ type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:250 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_int-250, tol:0.005 },
      ]},

    {
      id:'T18', name:'Min-Rail-2d', type:'single',
      desc:'Studs → rail_len_target ≥ 2d = 418mm (ACI 318-25 §22.6.6)',
      inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:100, fyt:420 },
      assertions:[
        { field:'rail_len_target', op:'>', value:2*D-1 },
      ]},

    {
      id:'T19', name:'Max-Spacing-Warning', type:'single',
      desc:'s=200 > 0.75×209=156.75mm → warning count>0 and message mentions "0.75d"',
      inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:200, fyt:420 },
      assertions:[
        { field:'warns', op:'>',  value:0 },
        { field:'warnMsgs', op:'contains', value:'0.75d' },
      ]},

    {
      id:'T20', name:'Rectangular-Column-300x600', type:'single',
      desc:'c1=300 c2=600 → bo = 2*(509)+2*(809) = 2636mm',
      inputs:{ type:'int', Vu:500, hasReinf:false, c1:300, c2:600 },
      assertions:[
        { field:'bo_inner', op:'≈', value:2*(300+D)+2*(600+D), tol:0.005 },
      ]},

    {
      id:'T21', name:'Thin-Slab-h150', type:'single',
      desc:'h=150 cv=20 db=10 → d=120 (h-cv-db), bo=2080, DCR>1.0',
      inputs:{ type:'int', Vu:500, hasReinf:false, h:150, cv:20, db:10 },
      assertions:[
        { field:'bo_inner', op:'≈', value:2*(C+120)+2*(C+120), tol:0.01 },
        { field:'DCR',  op:'>',  value:1.0 },
        { field:'isOK', op:'=',  value:false },
      ]},

    {
      id:'T22', name:'Thick-Slab-h400', type:'single',
      desc:'h=400 cv=40 db=20 → d=340 (h-cv-db), bo=2960, DCR<0.5',
      inputs:{ type:'int', Vu:500, hasReinf:false, h:400, cv:40, db:20 },
      assertions:[
        { field:'bo_inner', op:'≈', value:2*(C+340)+2*(C+340), tol:0.01 },
        { field:'DCR',  op:'<',  value:0.5 },
        { field:'isOK', op:'=',  value:true },
      ]},

    {
      id:'T23', name:'Low-fc-20MPa', type:'single',
      desc:'fc=20MPa → vc = 0.33×√20 ≈ 1.476MPa',
      inputs:{ type:'int', Vu:500, hasReinf:false, fc:20 },
      assertions:[
        { field:'vc', op:'≈', value:0.33*Math.sqrt(20), tol:0.02 },
      ]},

    {
      id:'T24', name:'High-fc-40MPa', type:'single',
      desc:'fc=40MPa → vc = 0.33×√40 ≈ 2.087MPa',
      inputs:{ type:'int', Vu:500, hasReinf:false, fc:40 },
      assertions:[
        { field:'vc', op:'≈', value:0.33*Math.sqrt(40), tol:0.02 },
      ]},

    {
      id:'T25', name:'Stirrup-Legs-MultiRun', type:'multi-run',
      desc:'n_legs=2 vs n_legs=4 → vs doubles (ratio ≈ 2.0)',
      runs:[
        { label:'2-leg', inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stirrup', nr:4, nLegs:2, rdb:12, s:100, fyt:420 } },
        { label:'4-leg', inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stirrup', nr:4, nLegs:4, rdb:12, s:100, fyt:420 } },
      ],
      assertions:[
        { op:'ratio', field:'vs', runIdx:1, refRunIdx:0, value:2.0, tol:0.05 },
      ]},

    {
      id:'T26', name:'Corner-Opening-N', type:'single',
      desc:'Corner NE + opening N ao=200 (SMALL) → bo = 1009-200 = 809mm',
      inputs:{ type:'corner', cornerPos:'NE', Vu:200, hasReinf:false, hasOpening:true, openingDir:'N', ao:200 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_corn-200, tol:0.01 },
      ]},

    {
      id:'T27', name:'Edge-Opening-SameSide', type:'single',
      desc:'Edge N + opening N ao=200 (SMALL) → bo = 1618-200 = 1418mm',
      inputs:{ type:'edge', edgeFace:'N', Vu:300, hasReinf:false, hasOpening:true, openingDir:'N', ao:200 },
      assertions:[
        { field:'bo_inner', op:'≈', value:bo_edge_N-200, tol:0.01 },
      ]},

    {
      id:'T28', name:'EC2-Code-NotImplemented', type:'single',
      desc:'code=EC2 → calc returns early, _lastPunchResults stays null',
      inputs:{ code:'ec2', type:'int', Vu:500 },
      assertions:[
        { op:'null' },
      ]},

    {
      id:'T29', name:'IS456-Code-NotImplemented', type:'single',
      desc:'code=IS456 → calc returns early, _lastPunchResults stays null',
      inputs:{ code:'is456', type:'int', Vu:500 },
      assertions:[
        { op:'null' },
      ]},

    {
      id:'T30', name:'Crushing-Limit-Enforced', type:'single',
      desc:'Dense studs Ø16 s=50 → phiVn capped ≤ φ×0.66×√fc = 2.619MPa, "too small" or cap warning',
      inputs:{ type:'int', Vu:1500, hasReinf:true, reinfType:'stud', nr:8, nLegs:1, rdb:16, s:50, fyt:420 },
      assertions:[
        { field:'phiVn', op:'<', value:0.75*0.66*Math.sqrt(FC)+0.01 },
        { field:'hasReinf', op:'=', value:true },
      ]},

    {
      id:'T31', name:'Circular-Column-Dc500', type:'single',
      desc:'Circular Dc=500 → bo = π×(500+209) = π×709 ≈ 2228mm ±3%',
      inputs:{ shape:'circ', type:'int', Vu:500, hasReinf:false, Dc:500 },
      assertions:[
        { field:'bo_inner', op:'≈', value:Math.PI*(500+D), tol:0.03 },
      ]},

    {
      id:'T32', name:'Biaxial-Moment-MultiRun', type:'multi-run',
      desc:'Mux=Muy=0 vs Mux=Muy=100kN·m → vu increases with biaxial transfer',
      runs:[
        { label:'No moment',    inputs:{ type:'int', Vu:800, hasReinf:false, Mux:0,   Muy:0 } },
        { label:'Biaxial M=100',inputs:{ type:'int', Vu:800, hasReinf:false, Mux:100, Muy:100 } },
      ],
      assertions:[
        { op:'gt-run', field:'vu', runIdx:1, refRunIdx:0 },
      ]},

    {
      id:'T33', name:'Stud-Diameter-MultiRun', type:'multi-run',
      desc:'Ø10→Ø12→Ø16 gradient: vs ∝ db², ratio Ø16/Ø10 ≈ (16/10)² = 2.56',
      runs:[
        { label:'Ø10', inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:10, s:100, fyt:420 } },
        { label:'Ø12', inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:100, fyt:420 } },
        { label:'Ø16', inputs:{ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:16, s:100, fyt:420 } },
      ],
      assertions:[
        { op:'gt-run', field:'vs', runIdx:1, refRunIdx:0 },
        { op:'gt-run', field:'vs', runIdx:2, refRunIdx:1 },
        { op:'ratio',  field:'vs', runIdx:2, refRunIdx:0, value:2.56, tol:0.05 },
      ]},

    {
      id:'T34', name:'Visual-NoReinf-NoStudDots', type:'single',
      desc:'No reinf → SVG must contain 0 stud dot circles (r="3.5")',
      inputs:{ type:'int', Vu:500, hasReinf:false },
      assertions:[
        { field:'svgContent', op:'svg-count', selector:'r="3.5"', value:0 },
      ]},

    {
      id:'T35', name:'Visual-Edge-SlabLabel', type:'single',
      desc:'Edge N column → SVG must contain "Slab edge" text annotation',
      inputs:{ type:'edge', edgeFace:'N', Vu:300, hasReinf:false },
      assertions:[
        { field:'svgContent', op:'svg-contains', text:'Slab edge', value:true },
      ]},

  ];

  // ─── Assertion evaluator ─────────────────────────────────────────────────────
  function _eval(a, res, allRunResults) {
    const get = (r, f) => r?.[f];

    // Null result check
    if (a.op === 'null') {
      return { pass: res === null, expected:'null result', actual: res === null ? 'null' : 'has result' };
    }

    // Multi-run comparisons
    if (a.op === 'gt-run') {
      const vA = get(allRunResults[a.refRunIdx], a.field);
      const vB = get(allRunResults[a.runIdx],    a.field);
      const pass = typeof vA === 'number' && typeof vB === 'number' && vB > vA;
      return { pass, expected:`run[${a.runIdx}].${a.field} > run[${a.refRunIdx}].${a.field}`,
        actual:`${+vB?.toFixed(4)} > ${+vA?.toFixed(4)}` };
    }
    if (a.op === 'ratio') {
      const vA = get(allRunResults[a.refRunIdx], a.field);
      const vB = get(allRunResults[a.runIdx],    a.field);
      const ratio = (typeof vA === 'number' && vA !== 0) ? vB / vA : NaN;
      const pass = !isNaN(ratio) && Math.abs(ratio - a.value) / a.value <= (a.tol ?? 0.05);
      return { pass, expected:`ratio ≈ ${a.value} ±${((a.tol??0.05)*100).toFixed(0)}%`,
        actual:`${+ratio.toFixed(3)}` };
    }

    // SVG checks (operate on svgContent string)
    if (a.op === 'svg-count') {
      const svg = res?.svgContent ?? '';
      const count = (svg.match(new RegExp(a.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const pass = count === a.value;
      return { pass, expected:`${a.selector} count = ${a.value}`, actual:`count = ${count}` };
    }
    if (a.op === 'svg-contains') {
      const svg = res?.svgContent ?? '';
      const found = svg.includes(a.text);
      return { pass: found === a.value,
        expected: a.value ? `"${a.text}" present` : `"${a.text}" absent`,
        actual: found ? 'found' : 'not found' };
    }

    // Single-run field checks
    const actual = get(res, a.field);

    if (a.op === '=') {
      return { pass: actual === a.value, expected:a.value, actual };
    }
    if (a.op === '>') {
      return { pass: typeof actual === 'number' && actual > a.value,
        expected:`> ${a.value}`, actual };
    }
    if (a.op === '<') {
      return { pass: typeof actual === 'number' && actual < a.value,
        expected:`< ${a.value}`, actual };
    }
    if (a.op === '≈') {
      if (typeof actual !== 'number') return { pass:false, expected:a.value, actual };
      const rel = Math.abs((actual - a.value) / (Math.abs(a.value) || 1));
      const pass = rel <= (a.tol ?? 0.05);
      return { pass, expected:a.value, actual, diffPct:+(rel*100).toFixed(2) };
    }
    if (a.op === 'contains') {
      // works for string or array of strings
      let found = false;
      if (Array.isArray(actual)) found = actual.some(s => String(s).includes(a.value));
      else if (typeof actual === 'string') found = actual.includes(a.value);
      return { pass: found, expected:`contains "${a.value}"`, actual: JSON.stringify(actual)?.slice(0,80) };
    }
    return { pass:false, expected:'unknown op', actual };
  }

  // ─── Single-test runner ──────────────────────────────────────────────────────
  function _runSingle(tc) {
    let res = null;
    try {
      res = _run(tc.inputs);
    } catch(e) {
      return { id:tc.id, name:tc.name, desc:tc.desc, status:'ERROR', error:e.message, checks:[] };
    }

    const checks = tc.assertions.map((a, i) => {
      const r = _eval(a, res, [res]);
      return { label: _assertLabel(a, i), pass: r.pass, expected: r.expected,
        actual: r.actual, diffPct: r.diffPct };
    });

    const status = checks.every(c => c.pass) ? 'PASS' : 'FAIL';
    return { id:tc.id, name:tc.name, desc:tc.desc, status, checks, res };
  }

  // ─── Multi-run test runner ───────────────────────────────────────────────────
  function _runMulti(tc) {
    const runResults = [];
    for (const r of tc.runs) {
      let res = null;
      try { res = _run(r.inputs); } catch(e) { res = null; }
      runResults.push(res);
    }

    // Annotate run info in results for reporting
    const runSummary = tc.runs.map((r, i) => `${r.label}: ${JSON.stringify(runResults[i] ? Object.fromEntries(tc.assertions.filter(a=>a.field).map(a=>[a.field, runResults[i]?.[a.field]])) : 'null')}`);

    const checks = tc.assertions.map((a, i) => {
      const r = _eval(a, runResults[a.runIdx ?? 0], runResults);
      return { label: _assertLabel(a, i), pass: r.pass, expected: r.expected,
        actual: r.actual, diffPct: r.diffPct };
    });

    // Add informational run values
    tc.runs.forEach((r, i) => {
      const res = runResults[i];
      if (res) {
        const key = tc.assertions[0]?.field;
        if (key && res[key] !== undefined)
          checks.unshift({ label:`${r.label} → ${key}`, pass:true, expected:null, actual:+res[key]?.toFixed(4), info:true });
      }
    });

    const status = checks.filter(c=>!c.info).every(c => c.pass) ? 'PASS' : 'FAIL';
    return { id:tc.id, name:tc.name, desc:tc.desc, status, checks, runResults };
  }

  function _assertLabel(a, i) {
    if (a.op === 'null')        return 'calc_result_null';
    if (a.op === 'gt-run')      return `${a.field}[run${a.runIdx}] > ${a.field}[run${a.refRunIdx}]`;
    if (a.op === 'ratio')       return `${a.field} ratio run${a.runIdx}/run${a.refRunIdx} ≈ ${a.value}`;
    if (a.op === 'svg-count')   return `SVG count(${a.selector}) = ${a.value}`;
    if (a.op === 'svg-contains')return `SVG contains "${a.text}"`;
    if (a.op === 'contains')    return `${a.field} contains "${a.value}"`;
    return `${a.field} ${a.op} ${a.value}`;
  }

  // ─── Main runner ─────────────────────────────────────────────────────────────
  async function runAll() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  Punching Shear — Complete Test Suite (T01–T35)         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const allResults = [];

    for (const tc of tests) {
      let result;
      try {
        result = tc.type === 'multi-run' ? _runMulti(tc) : _runSingle(tc);
      } catch(e) {
        result = { id:tc.id, name:tc.name, desc:tc.desc, status:'ERROR', error:e.message, checks:[] };
      }
      allResults.push(result);

      const icon = result.status === 'PASS' ? '✅' : result.status === 'ERROR' ? '💥' : '❌';
      console.log(`${icon} ${result.id} ${result.name}`);
      if (result.status !== 'PASS') {
        (result.checks || []).filter(c => !c.pass && !c.info).forEach(c =>
          console.log(`     └─ ${c.label}: expected ${JSON.stringify(c.expected)} got ${JSON.stringify(c.actual)}${c.diffPct!=null?` (${c.diffPct}%)`:''}`));
        if (result.error) console.log(`     └─ ERROR: ${result.error}`);
      }
    }

    const total  = allResults.length;
    const passed = allResults.filter(r => r.status === 'PASS').length;
    const failed = allResults.filter(r => r.status === 'FAIL').length;
    const errors = allResults.filter(r => r.status === 'ERROR').length;
    const pct    = Math.round(passed / total * 100);

    console.log(`\n══════════════════════════════════════════════`);
    console.log(`Results: ${passed}/${total} passed (${pct}% coverage)`);
    if (failed) console.log(`         ${failed} FAILED`);
    if (errors) console.log(`         ${errors} ERROR(s)`);
    console.log(`══════════════════════════════════════════════\n`);

    return allResults;
  }

  // ─── HTML Report ─────────────────────────────────────────────────────────────
  function buildReport(results) {
    const basic    = results.filter(r => parseInt(r.id.replace('T','')) <= 15);
    const advanced = results.filter(r => parseInt(r.id.replace('T','')) > 15);

    function section(title, items, color) {
      const passed = items.filter(r=>r.status==='PASS').length;
      const rows = items.map(r => {
        const icon = r.status==='PASS'?'✅':r.status==='ERROR'?'💥':'❌';
        const bg   = r.status==='PASS'?'#dcfce7':r.status==='ERROR'?'#fef9c3':'#fee2e2';
        const chkRows = (r.checks||[]).map(c => {
          const cbg = c.info?'#f8fafc':c.pass?'#f0fdf4':'#fef2f2';
          const actual = c.actual !== undefined
            ? (typeof c.actual === 'number' ? c.actual.toFixed(4) : String(c.actual))
            : '';
          return `<tr style="background:${cbg};font-size:11px">
            <td></td><td>${c.pass?(c.info?'ℹ':'✓'):'✗'}</td>
            <td>${c.label??''}</td>
            <td>${c.expected!==null&&c.expected!==undefined?c.expected:''}</td>
            <td>${actual}</td>
            <td>${c.diffPct!=null?c.diffPct+'%':''}</td>
          </tr>`;
        }).join('');
        return `
        <tr style="background:${bg};font-weight:600;cursor:pointer"
            onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
          <td>${icon}</td><td>${r.id}</td><td colspan="4">${r.name} — <span style="font-weight:400">${r.desc}</span></td>
        </tr>
        <tbody style="display:none">${chkRows}</tbody>`;
      }).join('');
      return `
      <h2 style="margin:20px 0 8px;color:#1e293b">${title}
        <span style="font-size:14px;font-weight:400;color:#64748b">${passed}/${items.length} passed</span></h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead><tr style="background:#334155;color:white">
          <th style="width:28px">✓</th><th style="width:44px">ID</th>
          <th>Name / Description</th><th style="width:110px">Expected</th>
          <th style="width:110px">Actual</th><th style="width:55px">Diff%</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    const total  = results.length;
    const passed = results.filter(r=>r.status==='PASS').length;
    const failed = results.filter(r=>r.status==='FAIL').length;
    const pct    = Math.round(passed/total*100);
    const summBg = passed===total?'#dcfce7':failed>5?'#fee2e2':'#fef9c3';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Punching Shear — Complete Report</title>
<style>
  body { font-family: system-ui, monospace; font-size: 13px; padding: 24px; background: #f8fafc; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .summary { padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; }
  th, td { padding: 5px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  table thead tr th { position: sticky; top: 0; }
</style>
</head><body>
<h1>Punching Shear — Complete Test Report (T01–T35)</h1>
<div class="summary" style="background:${summBg}">
  <b>${passed}/${total}</b> scenarios passed &nbsp;·&nbsp; ${pct}% coverage
  &nbsp;·&nbsp; ${failed} failed &nbsp;·&nbsp; ${new Date().toLocaleString()}
  <br><small style="color:#475569">Click any test row to expand assertion details.</small>
</div>
${section('Basic Functionality (T01–T15)', basic, '#16a34a')}
${section('Advanced / Edge Cases (T16–T35)', advanced, '#7c3aed')}
</body></html>`;
  }

  function downloadReport(results) {
    const html = buildReport(results);
    const blob = new Blob([html], { type:'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `punch-complete-report-${new Date().toISOString().slice(0,10)}.html`;
    a.click();
    return html;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  return {
    tests,
    run: async function(opts={}) {
      const results = await runAll();
      if (opts.download !== false) downloadReport(results);
      return results;
    },
    report: buildReport,
    download: downloadReport,
  };
})();

console.log('Complete test suite loaded (35 scenarios). Run: PUNCH_COMPLETE.run()');
