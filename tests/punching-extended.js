/**
 * Punching Shear — Extended Test Suite (T16–T35)
 * 22 scenarios: moment transfer, opening gradients, extreme geometries,
 * code variations, multi-run comparisons, and SVG visual checks.
 *
 * Load via tests/test-extended.html
 * Requires: _lastPunchResults global + calcPunchShear() available.
 */

const PUNCH_TEST_EXTENDED = (() => {

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const _sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  const _sc = (id, v) => { const e = document.getElementById(id); if (e) e.checked = v; };

  function _setup(inp) {
    if (typeof _punchCode      !== 'undefined') window._punchCode      = inp.code      ?? 'aci';
    if (typeof _punchShape     !== 'undefined') window._punchShape     = inp.shape     ?? 'rect';
    if (typeof _punchType      !== 'undefined') window._punchType      = inp.type      ?? 'int';
    if (typeof _punchUnit      !== 'undefined') window._punchUnit      = inp.units     ?? 'knm';
    if (typeof _punchReinfType !== 'undefined') window._punchReinfType = inp.reinfType ?? 'stud';
    if (typeof _punchEdgeFace  !== 'undefined') window._punchEdgeFace  = inp.edgeFace  ?? 'N';
    if (typeof _punchCornerPos !== 'undefined') window._punchCornerPos = inp.cornerPos ?? 'NE';

    _sv('punch-h',  inp.h  ?? 250);
    _sv('punch-cv', inp.cv ?? 25);
    _sv('punch-db', inp.db ?? 16);
    _sv('punch-fc', inp.fc ?? 28);
    _sv('punch-c1', inp.c1 ?? 400);
    _sv('punch-c2', inp.c2 ?? 400);
    _sv('punch-dc', inp.Dc ?? 500);
    _sv('punch-vu', inp.Vu ?? 500);
    _sv('punch-mux', inp.Mux ?? 0);
    _sv('punch-muy', inp.Muy ?? 0);

    _sc('punch-has-reinf', !!inp.hasReinf);
    _sv('punch-reinf-nr',    inp.nr    ?? 4);
    _sv('punch-reinf-nlegs', inp.nLegs ?? 1);
    _sv('punch-reinf-db',    inp.rdb   ?? 12);
    _sv('punch-reinf-s',     inp.s     ?? 150);
    _sv('punch-fyt',         inp.fyt   ?? 420);

    _sc('punch-has-op1', !!inp.hasOpening);
    _sv('punch-ao1', inp.ao ?? 0);
    if (inp.openingDir && typeof _punchOpFace !== 'undefined') window._punchOpFace[1] = inp.openingDir;
  }

  function _run(inp) {
    _setup(inp);
    calcPunchShear();
    return typeof _lastPunchResults !== 'undefined' ? _lastPunchResults : null;
  }

  // ─── Constants ─────────────────────────────────────────────────────────────
  const D  = 217;           // d = 250 - 25 - 8
  const C  = 400;
  const FC = 28;
  const phi = 0.75;
  const bo_int    = 2*(C+D) + 2*(C+D);   // 2474 mm
  const bo_edge_N = C + 2*(C+D);         // 1634 mm  (c1 + 2*(c2+d), c1 parallel to free edge)
  const bo_corn   = C + C + D;           // 1017 mm

  // ─── Single-run test cases ──────────────────────────────────────────────────
  const cases = [

    // T17a — Small opening ao=150 (< 0.6×400=240 → SMALL)
    {
      name: 'T17a-Opening-Gradient-SMALL-150',
      desc: 'Interior + opening N ao=150mm (SMALL <240) → bo = 2474 - 150 = 2324mm',
      inputs: { type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:150 },
      expected: { bo_inner: { approx: bo_int - 150, tol: 1 } },
      tol: 0.01,
    },

    // T17b — Small opening ao=200 (< 240 → SMALL)
    {
      name: 'T17b-Opening-Gradient-SMALL-200',
      desc: 'Interior + opening N ao=200mm (SMALL <240) → bo = 2474 - 200 = 2274mm',
      inputs: { type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:200 },
      expected: { bo_inner: { approx: bo_int - 200, tol: 1 } },
      tol: 0.01,
    },

    // T17c — Large opening ao=250 (≥ 240 → LARGE)
    {
      name: 'T17c-Opening-Gradient-LARGE-250',
      desc: 'Interior + opening N ao=250mm (LARGE ≥240) → bo = 2474 - 250 = 2224mm',
      inputs: { type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:250 },
      expected: { bo_inner: { approx: bo_int - 250, tol: 1 } },
      tol: 0.01,
    },

    // T18 — Minimum rail length ≥ 2d (ACI 318-25 §22.6.6.1)
    {
      name: 'T18-RailLen-Min2d',
      desc: 'Interior + studs → rail_len_target ≥ 2d = 434mm (ACI 318-25 §22.6.6)',
      inputs: { type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:100, fyt:420 },
      expected: { rail_len_target: { gt: 2*D - 1 } },
      tol: 0.01,
    },

    // T19 — Spacing warning when s > 0.75d = 162.75mm
    {
      name: 'T19-SpacingWarn-s200',
      desc: 'Stud spacing s=200 > 0.75×217=162.75mm → warns count > 0',
      inputs: { type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:200, fyt:420 },
      expected: { warns: { gt: 0 } },
      tol: 0.01,
    },

    // T20 — Non-square column c1=300×c2=600
    {
      name: 'T20-NonSquareColumn-300x600',
      desc: 'Interior c1=300×c2=600, d=217 → bo = 2*(517)+2*(817) = 2668mm',
      inputs: { type:'int', Vu:500, hasReinf:false, c1:300, c2:600 },
      expected: { bo_inner: { approx: 2*(300+D) + 2*(600+D), tol: 1 } },
      tol: 0.01,
    },

    // T21 — Thin slab h=150, d=125 → DCR>1 at Vu=500kN
    {
      name: 'T21-ThinSlab-h150',
      desc: 'h=150 cv=20 db=10 → d=125, bo=2100, vu>φvc → FAIL',
      inputs: { type:'int', Vu:500, hasReinf:false, h:150, cv:20, db:10 },
      expected: {
        bo_inner: { approx: 2*(C+125) + 2*(C+125), tol: 1 },  // 2100
        DCR:      { gt: 1.0 },
        isOK:     false,
      },
      tol: 0.05,
    },

    // T22 — Deep slab h=400, d=350 → DCR<1 at Vu=500kN
    {
      name: 'T22-DeepSlab-h400',
      desc: 'h=400 cv=40 db=20 → d=350, bo=3000, well below capacity',
      inputs: { type:'int', Vu:500, hasReinf:false, h:400, cv:40, db:20 },
      expected: {
        bo_inner: { approx: 2*(C+350) + 2*(C+350), tol: 1 },  // 3000
        DCR:      { lt: 0.5 },
        isOK:     true,
      },
      tol: 0.05,
    },

    // T23 — Low fc=20MPa → vc3 = 0.33×√20 ≈ 1.476MPa
    {
      name: 'T23-LowFc-20MPa',
      desc: 'fc=20MPa → vc = 0.33×√20 ≈ 1.476MPa (vc3 governs interior 400×400)',
      inputs: { type:'int', Vu:500, hasReinf:false, fc:20 },
      expected: {
        vc:       0.33 * Math.sqrt(20),   // 1.476
        bo_inner: bo_int,
      },
      tol: 0.02,
    },

    // T24 — High fc=40MPa → vc3 = 0.33×√40 ≈ 2.087MPa
    {
      name: 'T24-HighFc-40MPa',
      desc: 'fc=40MPa → vc = 0.33×√40 ≈ 2.087MPa (vc3 governs interior 400×400)',
      inputs: { type:'int', Vu:500, hasReinf:false, fc:40 },
      expected: {
        vc:       0.33 * Math.sqrt(40),   // 2.087
        bo_inner: bo_int,
      },
      tol: 0.02,
    },

    // T26 — Corner NE + opening N ao=200 (SMALL <240) → bo = 1017-200 = 817mm
    {
      name: 'T26-CornerNE-OpeningN-ao200',
      desc: 'Corner NE + opening N ao=200mm (SMALL) → bo = 1017 - 200 = 817mm',
      inputs: { type:'corner', cornerPos:'NE', Vu:200, hasReinf:false, hasOpening:true, openingDir:'N', ao:200 },
      expected: { bo_inner: { approx: bo_corn - 200, tol: 1 } },
      tol: 0.01,
    },

    // T27 — Edge N + opening N ao=200 (SMALL <240) → bo = 1634-200 = 1434mm
    {
      name: 'T27-EdgeN-OpeningN-ao200',
      desc: 'Edge N + opening N ao=200mm (SMALL) → bo = 1634 - 200 = 1434mm',
      inputs: { type:'edge', edgeFace:'N', Vu:300, hasReinf:false, hasOpening:true, openingDir:'N', ao:200 },
      expected: { bo_inner: { approx: bo_edge_N - 200, tol: 1 } },
      tol: 0.01,
    },

    // T28 — EC2 code → not implemented, _lastPunchResults stays null
    {
      name: 'T28-EC2-NotImplemented',
      desc: 'EC2 code → calc returns early (not yet implemented), result is null',
      inputs: { code:'ec2', type:'int', Vu:500 },
      expected: { _null: true },
      tol: 0.01,
    },

    // T29 — IS 456 code → not implemented, _lastPunchResults stays null
    {
      name: 'T29-IS456-NotImplemented',
      desc: 'IS 456 code → calc returns early (not yet implemented), result is null',
      inputs: { code:'is456', type:'int', Vu:500 },
      expected: { _null: true },
      tol: 0.01,
    },

    // T30 — Vmax cap: φVn ≤ φ×0.66×√fc = 2.619 MPa
    {
      name: 'T30-VmaxCap-Enforced',
      desc: 'Heavy stud reinforcement → phiVn capped at φ×0.66×√fc ≈ 2.619 MPa',
      inputs: { type:'int', Vu:1500, hasReinf:true, reinfType:'stud', nr:8, nLegs:1, rdb:16, s:75, fyt:420 },
      expected: {
        phiVn:    { lt: 0.75 * 0.66 * Math.sqrt(FC) + 0.01 },  // ≤ ~2.630
        hasReinf: true,
      },
      tol: 0.02,
    },

    // T31 — Circular column Dc=500 → bo = π×(500+217) ≈ 2252mm
    {
      name: 'T31-CircularColumn-Dc500',
      desc: 'Circular column Dc=500mm → bo = π×(500+217) = π×717 ≈ 2252mm',
      inputs: { shape:'circ', type:'int', Vu:500, hasReinf:false, Dc:500 },
      expected: {
        bo_inner: { approx: Math.PI * (500 + D), tol: 2 },
      },
      tol: 0.02,
    },

    // T34 — SVG plan view: no stud circles when no reinforcement
    {
      name: 'T34-SVG-NoStuds-NoReinf',
      desc: 'Rect column + no reinforcement → SVG must not contain stud dot circles',
      inputs: { type:'int', Vu:500, hasReinf:false },
      expected: { _svgNoStuds: true },
      tol: 0.01,
    },

    // T35 — SVG plan view: "Slab edge" label present for edge column
    {
      name: 'T35-SVG-SlabEdgeLabel-EdgeN',
      desc: 'Edge N column → SVG must include "Slab edge" boundary annotation',
      inputs: { type:'edge', edgeFace:'N', Vu:300, hasReinf:false },
      expected: { _svgHasEdge: true },
      tol: 0.01,
    },

  ];

  // ─── Check function ─────────────────────────────────────────────────────────
  function _check(field, expected, actual, res, tol) {
    if (expected === null || expected === undefined) return { status:'SKIP' };

    // Custom: expect calc returned null (e.g. EC2/IS456 early return)
    if (field === '_null') {
      return { status: res === null ? 'PASS' : 'FAIL',
        expected:'null result', actual: res === null ? 'null' : 'has result' };
    }

    // Custom: rect no-reinf column → no stud circles (r="3.5") in SVG
    if (field === '_svgNoStuds') {
      const svg = res?.svgContent ?? '';
      const hasStudDots = svg.includes('r="3.5"') || svg.includes("r='3.5'");
      return { status: !hasStudDots ? 'PASS' : 'FAIL',
        expected:'no stud dots (r=3.5)', actual: hasStudDots ? 'stud dots found' : 'none' };
    }

    // Custom: edge/corner column → SVG contains "Slab edge" text
    if (field === '_svgHasEdge') {
      const svg = res?.svgContent ?? '';
      const hasEdge = svg.includes('Slab edge');
      return { status: hasEdge ? 'PASS' : 'FAIL',
        expected:'"Slab edge" in SVG', actual: hasEdge ? 'found' : 'not found' };
    }

    if (typeof expected === 'boolean') {
      return { status: actual === expected ? 'PASS' : 'FAIL', expected, actual };
    }
    if (typeof expected === 'object') {
      if ('approx' in expected) {
        const diff = Math.abs(actual - expected.approx);
        return { status: diff <= expected.tol ? 'PASS' : 'FAIL',
          expected: expected.approx, actual,
          diffPct: +(diff / (Math.abs(expected.approx) || 1) * 100).toFixed(2) };
      }
      if ('gt' in expected) return { status: actual > expected.gt ? 'PASS' : 'FAIL',
        expected:`>${expected.gt}`, actual };
      if ('lt' in expected) return { status: actual < expected.lt ? 'PASS' : 'FAIL',
        expected:`<${+expected.lt.toFixed(4)}`, actual };
    }
    if (typeof expected === 'number') {
      const diff = Math.abs((actual - expected) / (Math.abs(expected) || 1));
      return { status: diff <= tol ? 'PASS' : 'FAIL',
        expected, actual, diffPct: +(diff * 100).toFixed(2) };
    }
    return { status:'SKIP' };
  }

  // ─── Multi-run comparison tests ─────────────────────────────────────────────
  function _runCompareTests() {
    const results = [];

    // T16 — Moment transfer: vu increases when Mux ≠ 0
    {
      const a = _run({ type:'int', Vu:800, hasReinf:false, Mux:0,   Muy:0 });
      const b = _run({ type:'int', Vu:800, hasReinf:false, Mux:100, Muy:0 });
      const checks = [];
      if (!a || !b) {
        checks.push({ field:'calc_ran', status:'FAIL', expected:'results for both runs', actual:'null' });
      } else {
        const vuIncr = b.vu > a.vu;
        checks.push({ field:'vu_Mux=0',   status:'PASS', expected:null, actual:+a.vu.toFixed(4) });
        checks.push({ field:'vu_Mux=100', status:'PASS', expected:null, actual:+b.vu.toFixed(4) });
        checks.push({ field:'vu_increases_with_Mux', status: vuIncr ? 'PASS' : 'FAIL',
          expected:`>${+a.vu.toFixed(4)}`, actual:+b.vu.toFixed(4) });
      }
      results.push({ name:'T16-MomentTransfer-Eccentric',
        desc:'Mux=0 vs Mux=100kN·m → vu must increase with unbalanced moment',
        status: checks.every(c => c.status !== 'FAIL') ? 'PASS' : 'FAIL', checks });
    }

    // T25 — Stirrup leg count: vs doubles from 2-leg to 4-leg
    {
      const a = _run({ type:'int', Vu:800, hasReinf:true, reinfType:'stirrup', nr:4, nLegs:2, rdb:12, s:100, fyt:420 });
      const b = _run({ type:'int', Vu:800, hasReinf:true, reinfType:'stirrup', nr:4, nLegs:4, rdb:12, s:100, fyt:420 });
      const checks = [];
      if (!a || !b) {
        checks.push({ field:'calc_ran', status:'FAIL', expected:'results for both runs', actual:'null' });
      } else {
        checks.push({ field:'vs_2leg', status:'PASS', expected:null, actual:+a.vs.toFixed(4) });
        checks.push({ field:'vs_4leg', status:'PASS', expected:null, actual:+b.vs.toFixed(4) });
        const ratio = b.vs / a.vs;
        const ratioOK = Math.abs(ratio - 2.0) < 0.05;
        checks.push({ field:'vs_ratio_4leg/2leg≈2.0', status: ratioOK ? 'PASS' : 'FAIL',
          expected:'2.0', actual:+ratio.toFixed(3) });
      }
      results.push({ name:'T25-Stirrup-2leg-vs-4leg',
        desc:'4-leg stirrups vs 2-leg with same db/s/fyt: vs must double (ratio ≈ 2.0)',
        status: checks.every(c => c.status !== 'FAIL') ? 'PASS' : 'FAIL', checks });
    }

    // T32 — Biaxial moment vs no moment
    {
      const a = _run({ type:'int', Vu:800, hasReinf:false, Mux:0,   Muy:0 });
      const b = _run({ type:'int', Vu:800, hasReinf:false, Mux:100, Muy:100 });
      const checks = [];
      if (!a || !b) {
        checks.push({ field:'calc_ran', status:'FAIL', expected:'results for both runs', actual:'null' });
      } else {
        const vuIncr = b.vu > a.vu;
        checks.push({ field:'vu_no_moment',      status:'PASS', expected:null, actual:+a.vu.toFixed(4) });
        checks.push({ field:'vu_biaxial_Mux=Muy=100', status:'PASS', expected:null, actual:+b.vu.toFixed(4) });
        checks.push({ field:'vu_biaxial>vu_none', status: vuIncr ? 'PASS' : 'FAIL',
          expected:`>${+a.vu.toFixed(4)}`, actual:+b.vu.toFixed(4) });
      }
      results.push({ name:'T32-BiaxialMoment-vs-NoMoment',
        desc:'Mux=Muy=100kN·m biaxial transfer → vu must exceed concentric case',
        status: checks.every(c => c.status !== 'FAIL') ? 'PASS' : 'FAIL', checks });
    }

    // T33 — Bar size gradient: vs ∝ db² (ratio Ø16/Ø10 ≈ 2.56)
    {
      const r10 = _run({ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:10, s:100, fyt:420 });
      const r12 = _run({ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:100, fyt:420 });
      const r16 = _run({ type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:16, s:100, fyt:420 });
      const checks = [];
      if (!r10 || !r12 || !r16) {
        checks.push({ field:'calc_ran', status:'FAIL', expected:'results for all 3 runs', actual:'null' });
      } else {
        checks.push({ field:'vs_Ø10', status:'PASS', expected:null, actual:+r10.vs.toFixed(4) });
        checks.push({ field:'vs_Ø12', status:'PASS', expected:null, actual:+r12.vs.toFixed(4) });
        checks.push({ field:'vs_Ø16', status:'PASS', expected:null, actual:+r16.vs.toFixed(4) });
        checks.push({ field:'vs_Ø10 < vs_Ø12', status: r10.vs < r12.vs ? 'PASS' : 'FAIL',
          expected:`<${+r12.vs.toFixed(4)}`, actual:+r10.vs.toFixed(4) });
        checks.push({ field:'vs_Ø12 < vs_Ø16', status: r12.vs < r16.vs ? 'PASS' : 'FAIL',
          expected:`<${+r16.vs.toFixed(4)}`, actual:+r12.vs.toFixed(4) });
        const ratio = r16.vs / r10.vs;
        const ratioOK = Math.abs(ratio - 2.56) < 0.12;   // (16/10)² = 2.56
        checks.push({ field:'vs_ratio_Ø16/Ø10≈2.56', status: ratioOK ? 'PASS' : 'FAIL',
          expected:'~2.56', actual:+ratio.toFixed(3) });
      }
      results.push({ name:'T33-BarSize-Gradient-Ø10-12-16',
        desc:'vs ∝ db²: Ø10→Ø12→Ø16 gradient, ratio Ø16/Ø10 ≈ (16/10)² = 2.56',
        status: checks.every(c => c.status !== 'FAIL') ? 'PASS' : 'FAIL', checks });
    }

    return results;
  }

  // ─── Runner ─────────────────────────────────────────────────────────────────
  async function runAll() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  Punching Shear — Extended Test Suite (T16–T35)         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const allResults = [];

    for (const tc of cases) {
      _setup(tc.inputs);
      let actual = null;
      try {
        calcPunchShear();
        actual = typeof _lastPunchResults !== 'undefined' ? _lastPunchResults : null;
      } catch(e) {
        allResults.push({ name:tc.name, desc:tc.desc, status:'ERROR', error:e.message, checks:[] });
        console.error(`❌ ${tc.name}: EXCEPTION — ${e.message}`);
        continue;
      }

      const checks = [];
      let tcFail = false;

      for (const [field, expVal] of Object.entries(tc.expected)) {
        const actVal = actual?.[field];
        const chk = _check(field, expVal, actVal, actual, tc.tol ?? 0.05);
        chk.field = field;
        checks.push(chk);
        if (chk.status === 'FAIL') tcFail = true;
      }

      const tcStatus = tcFail ? 'FAIL' : 'PASS';
      allResults.push({ name:tc.name, desc:tc.desc, status:tcStatus, checks, actual });

      const icon = tcFail ? '❌' : '✅';
      console.log(`${icon} ${tc.name}`);
      if (tcFail) {
        checks.filter(c => c.status === 'FAIL').forEach(c =>
          console.log(`     └─ ${c.field}: expected ${JSON.stringify(c.expected)} got ${JSON.stringify(c.actual)}${c.diffPct != null ? ' (' + c.diffPct + '%)' : ''}`));
      }
    }

    // Multi-run comparison tests
    let compareResults;
    try {
      compareResults = _runCompareTests();
    } catch(e) {
      compareResults = [{ name:'compare-tests', desc:'multi-run', status:'ERROR', error:e.message, checks:[] }];
      console.error('❌ Compare tests ERROR: ' + e.message);
    }
    for (const r of compareResults) {
      allResults.push(r);
      const icon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${r.name}`);
      if (r.status !== 'PASS') {
        (r.checks || []).filter(c => c.status === 'FAIL').forEach(c =>
          console.log(`     └─ ${c.field}: expected ${c.expected} got ${c.actual}`));
      }
    }

    const total  = allResults.length;
    const passed = allResults.filter(r => r.status === 'PASS').length;
    const failed = total - passed;
    console.log(`\n══════════════════════════════════════════════`);
    console.log(`Results: ${passed}/${total} scenarios passed`);
    if (failed) console.log(`         ${failed} scenario(s) FAILED`);
    console.log(`══════════════════════════════════════════════\n`);

    return allResults;
  }

  // ─── HTML Report ─────────────────────────────────────────────────────────────
  function buildReport(results) {
    const rows = results.flatMap(r => {
      const icon = r.status === 'PASS' ? '✅' : '❌';
      const base = `<tr class="tc-row ${r.status.toLowerCase()}">
        <td>${icon}</td><td><b>${r.name}</b></td><td colspan="4">${r.desc}</td></tr>`;
      const chkRows = (r.checks || []).map(c => `<tr class="chk-row ${c.status.toLowerCase()}">
        <td></td><td></td><td>${c.field}</td><td>${c.status}</td>
        <td>${c.expected !== undefined ? c.expected : ''}</td>
        <td>${c.actual !== undefined ? (typeof c.actual === 'number' ? c.actual.toFixed(4) : c.actual) : ''}</td>
      </tr>`).join('');
      return base + chkRows;
    });

    const passed = results.filter(r => r.status === 'PASS').length;
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Punching Shear Extended Report</title>
<style>
  body { font-family: monospace; font-size: 13px; padding: 20px; background: #f8fafc; }
  h1 { font-size: 18px; margin-bottom: 8px; }
  .summary { background: #e0f2fe; padding: 10px 16px; border-radius: 6px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #334155; color: white; padding: 6px 10px; text-align: left; }
  td { padding: 4px 10px; border-bottom: 1px solid #e2e8f0; }
  .tc-row.pass td { background: #dcfce7; font-weight: 600; }
  .tc-row.fail td { background: #fee2e2; font-weight: 600; }
  .tc-row.error td { background: #fff3cd; font-weight: 600; }
  .chk-row.pass td { background: #f0fdf4; }
  .chk-row.fail td { background: #fef2f2; }
  .chk-row.skip td { color: #94a3b8; }
  .chk-row { font-size: 12px; }
</style></head><body>
<h1>Punching Shear — Extended Test Report (T16–T35)</h1>
<div class="summary"><b>${passed}/${results.length}</b> scenarios passed &nbsp;·&nbsp; ${new Date().toLocaleString()}</div>
<table>
  <tr><th>✓</th><th>Test</th><th>Field</th><th>Status</th><th>Expected</th><th>Actual</th></tr>
  ${rows.join('\n')}
</table></body></html>`;
  }

  function downloadReport(results) {
    const html = buildReport(results);
    const blob = new Blob([html], { type:'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `punch-extended-report-${new Date().toISOString().slice(0,10)}.html`;
    a.click();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  return {
    cases,
    run: async function(opts = {}) {
      const results = await runAll();
      if (opts.download !== false) downloadReport(results);
      return results;
    },
    report: buildReport,
    download: downloadReport,
  };
})();

console.log('Extended test suite loaded (22 scenarios). Run: PUNCH_TEST_EXTENDED.run()');
