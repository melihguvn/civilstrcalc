/**
 * Punching Shear — Automated Test Suite
 * Run via tests/test.html (open in browser on the slab.html page)
 * or inject into browser console: copy-paste this file content.
 *
 * Requires: _lastPunchResults global + slab.html loaded in same page.
 *
 * 15 critical scenarios covering:
 *   geometry types, opening classifications, unit systems, boundary values,
 *   spacing independence, and regression checks.
 */

const PUNCH_TEST_SUITE = (() => {

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const _sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  const _sc = (id, v) => { const e = document.getElementById(id); if (e) e.checked = v; };

  function _setup(inp) {
    // Global state
    if (typeof _punchCode  !== 'undefined') window._punchCode  = inp.code  ?? 'aci';
    if (typeof _punchShape !== 'undefined') window._punchShape = inp.shape ?? 'rect';
    if (typeof _punchType  !== 'undefined') window._punchType  = inp.type  ?? 'int';
    if (typeof _punchUnit  !== 'undefined') window._punchUnit  = inp.units ?? 'knm';
    if (typeof _punchReinfType !== 'undefined') window._punchReinfType = inp.reinfType ?? 'stud';
    if (typeof _punchEdgeFace  !== 'undefined') window._punchEdgeFace  = inp.edgeFace  ?? 'N';
    if (typeof _punchCornerPos !== 'undefined') window._punchCornerPos = inp.cornerPos ?? 'NE';
    if (typeof _punchOpFace !== 'undefined' && inp.openingDir) window._punchOpFace[1] = inp.openingDir;

    // Geometry
    _sv('punch-h',  inp.h  ?? 250);
    _sv('punch-cv', inp.cv ?? 25);
    _sv('punch-db', inp.db ?? 16);
    _sv('punch-fc', inp.fc ?? 28);
    _sv('punch-c1', inp.c1 ?? 400);
    _sv('punch-c2', inp.c2 ?? 400);
    _sv('punch-dc', inp.Dc ?? 500);
    _sv('punch-vu', inp.Vu ?? 500);
    _sv('punch-mux', 0);
    _sv('punch-muy', 0);

    // Reinforcement
    _sc('punch-has-reinf', !!inp.hasReinf);
    _sv('punch-reinf-nr',    inp.nr     ?? 4);
    _sv('punch-reinf-nlegs', inp.nLegs  ?? 1);
    _sv('punch-reinf-db',    inp.rdb    ?? 12);
    _sv('punch-reinf-s',     inp.s      ?? 150);
    _sv('punch-fyt',         inp.fyt    ?? 420);

    // Opening
    _sc('punch-has-op1', !!inp.hasOpening);
    _sv('punch-ao1', inp.ao ?? 0);
    if (inp.openingDir && typeof _punchOpFace !== 'undefined') window._punchOpFace[1] = inp.openingDir;
  }

  // ─── Test cases ──────────────────────────────────────────────────────────────
  // Inputs use SI/knm defaults (h mm, c mm, fc MPa, Vu kN, stress MPa)
  // cv=25, db=16 → d = 250-25-8 = 217mm ... but user uses cv=25, db=16, h=250:
  // d = h - cv - db/2 = 250 - 25 - 8 = 217mm. Adjust expected accordingly.
  // We let the code compute d and verify bo via formula.
  //
  // bo formulas (ACI 318-25, rect):
  //   Interior: 2*(c1+d) + 2*(c2+d)
  //   Edge(N/S): c1 + 2*c2 + 2*d    Edge(E/W): 2*c1 + c2 + 2*d
  //   Corner: c1 + c2 + d
  // With c1=c2=400, d=217: Int=2474, Edge-N=1634, Corner=1017

  const D = 217;   // d computed from h=250, cv=25, db=16: 250-25-8=217
  const C = 400;
  const FC = 28;
  const bo_int    = 2*(C+D)+2*(C+D);      // 2474 mm
  const bo_edge_N = C + 2*C + 2*D;        // 1634 mm
  const bo_corner = C + C + D;            // 1017 mm
  const bo_circ   = Math.PI*(500+D);      // π*717 ≈ 2252 mm

  // ACI vc no-reinf: min(vc1, vc2, vc3) with lambda=1
  const _vc_noReinf = (bo, alphaS, fc) => {
    const sqrtFc = Math.sqrt(fc);
    return Math.min(
      0.17*(1+2/1)*sqrtFc,
      0.083*(alphaS*D/bo+2)*sqrtFc,
      0.33*sqrtFc
    );
  };
  const phi = 0.75;

  const cases = [

    // ── T01: Interior no-reinf, passes ───────────────────────────────────────
    {
      name: 'T01-ACI-Interior-NoReinf-Pass',
      desc: 'Interior 400×400 d≈217 Vu=500kN → adequate without reinforcement',
      inputs: { type:'int', Vu:500, hasReinf:false },
      expected: {
        bo_inner: bo_int,                              // 2474 mm
        vc:       _vc_noReinf(bo_int, 40, FC),         // 1.65 MPa (vc3 governs)
        phiVn:    phi * _vc_noReinf(bo_int, 40, FC),  // 1.2375 MPa
        vu:       500e3 / (bo_int * D),                // 0.931 MPa
        DCR:      (500e3/(bo_int*D)) / (phi*_vc_noReinf(bo_int,40,FC)),
        isOK:     true,
        hasReinf: false,
      },
      tol: 0.02,
    },

    // ── T02: Interior no-reinf, fails ────────────────────────────────────────
    {
      name: 'T02-ACI-Interior-NoReinf-Fail',
      desc: 'Interior 400×400 Vu=1100kN → exceeds φvc without reinf',
      inputs: { type:'int', Vu:1100, hasReinf:false },
      expected: {
        bo_inner: bo_int,
        vu:       1100e3 / (bo_int * D),
        DCR:      (1100e3/(bo_int*D)) / (phi*_vc_noReinf(bo_int,40,FC)),
        isOK:     false,
      },
      tol: 0.02,
    },

    // ── T03: Interior stud reinforcement, passes ─────────────────────────────
    {
      name: 'T03-ACI-Interior-Stud-Pass',
      desc: 'Interior + stud Ø12 s=100 nr=4, Vu=800kN → adequate with studs',
      inputs: { type:'int', Vu:800, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:100, fyt:420 },
      expected: {
        bo_inner: bo_int,
        vc:       0.25 * Math.sqrt(FC),        // 1.3229 MPa (stud vc)
        vs:       4*1*(Math.PI/4*144)*420 / (bo_int*100),  // ≈0.759 MPa
        isOK:     null,  // depends on outer CP; just verify calc completes
        hasReinf: true,
        n_sets:   { gt: 0 },   // must have ≥1 set
        rail_len_target: { gt: 0 },
      },
      tol: 0.03,
    },

    // ── T04: Interior stirrup, produces non-zero vs ──────────────────────────
    {
      name: 'T04-ACI-Interior-Stirrup',
      desc: 'Interior + closed stirrups 2-leg Ø12 s=100 fyt=420 → vs > 0',
      inputs: { type:'int', Vu:800, hasReinf:true, reinfType:'stirrup', nr:1, nLegs:2, rdb:12, s:100, fyt:420 },
      expected: {
        bo_inner: bo_int,
        vc:       0.17 * Math.sqrt(FC),        // 0.8994 MPa (stirrup vc)
        vs:       { gt: 0 },
        hasReinf: true,
      },
      tol: 0.03,
    },

    // ── T05: Small opening (ao < 0.6c = 240mm) — bo reduced, reinf both sides
    {
      name: 'T05-Opening-SMALL',
      desc: 'Interior + opening N ao=200mm (0.6×400=240 → SMALL) → bo reduced by 200',
      inputs: { type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:200 },
      expected: {
        bo_inner: { approx: bo_int - 200, tol: 1 },  // 2474-200=2274
        isOK:     null,
      },
      tol: 0.01,
    },

    // ── T06: Large opening (ao ≥ 0.6c = 240mm) — bo + Av reduced ────────────
    {
      name: 'T06-Opening-LARGE',
      desc: 'Interior + opening N ao=300mm (≥0.6×400=240 → LARGE) → bo reduced by 300',
      inputs: { type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:300 },
      expected: {
        bo_inner: { approx: bo_int - 300, tol: 1 },  // 2474-300=2174
      },
      tol: 0.01,
    },

    // ── T07: Opening exactly at threshold ao=0.6×c=240mm → LARGE classification
    {
      name: 'T07-Opening-Threshold',
      desc: 'ao = 0.6×c = 240mm exactly → LARGE (≥ boundary), bo reduced by 240',
      inputs: { type:'int', Vu:500, hasReinf:false, hasOpening:true, openingDir:'N', ao:240 },
      expected: {
        bo_inner: { approx: bo_int - 240, tol: 1 },  // 2474-240=2234
      },
      tol: 0.01,
    },

    // ── T08: Edge column N, no reinf ─────────────────────────────────────────
    {
      name: 'T08-ACI-EdgeN-NoReinf',
      desc: 'Edge(N) 400×400 d≈217 Vu=300kN → asymmetric bo = c1+2c2+2d',
      inputs: { type:'edge', edgeFace:'N', Vu:300, hasReinf:false },
      expected: {
        bo_inner: bo_edge_N,   // 1634 mm
        vc:       _vc_noReinf(bo_edge_N, 30, FC),
        phiVn:    phi * _vc_noReinf(bo_edge_N, 30, FC),
        vu:       300e3 / (bo_edge_N * D),
        DCR:      (300e3/(bo_edge_N*D)) / (phi*_vc_noReinf(bo_edge_N,30,FC)),
      },
      tol: 0.02,
    },

    // ── T09: Corner column NE, no reinf ──────────────────────────────────────
    {
      name: 'T09-ACI-CornerNE-NoReinf',
      desc: 'Corner(NE) 400×400 d≈217 Vu=150kN → bo = c1+c2+d',
      inputs: { type:'corner', cornerPos:'NE', Vu:150, hasReinf:false },
      expected: {
        bo_inner: bo_corner,   // 1017 mm
        vc:       _vc_noReinf(bo_corner, 20, FC),
        vu:       150e3 / (bo_corner * D),
        DCR:      (150e3/(bo_corner*D)) / (phi*_vc_noReinf(bo_corner,20,FC)),
      },
      tol: 0.02,
    },

    // ── T10: Circular column ─────────────────────────────────────────────────
    {
      name: 'T10-ACI-Circular-NoReinf',
      desc: 'Circular column Dc=500 d≈217 Vu=500kN → bo = π(Dc+d)',
      inputs: { type:'int', shape:'circ', Dc:500, Vu:500, hasReinf:false },
      expected: {
        bo_inner: { approx: Math.PI*(500+D), tol: 5 },  // ≈2252 mm
        vc:       0.33 * Math.sqrt(FC),   // vc3 governs for circ int (β=1)
      },
      tol: 0.02,
    },

    // ── T11: Very low Vu → always OK ─────────────────────────────────────────
    {
      name: 'T11-Boundary-LowVu',
      desc: 'Interior Vu=50kN → DCR ≪ 1, always adequate',
      inputs: { type:'int', Vu:50, hasReinf:false },
      expected: {
        bo_inner: bo_int,
        DCR:      { lt: 0.15 },
        isOK:     true,
      },
      tol: 0.05,
    },

    // ── T12: Very high Vu → DCR >> 1, warning triggered ──────────────────────
    {
      name: 'T12-Boundary-HighVu',
      desc: 'Interior Vu=2500kN → DCR > 3, section grossly undersized',
      inputs: { type:'int', Vu:2500, hasReinf:false },
      expected: {
        bo_inner: bo_int,
        DCR:      { gt: 3.0 },
        isOK:     false,
        warns:    { gt: 0 },
      },
      tol: 0.05,
    },

    // ── T13: Spacing independence — rail_len_target must equal for s=75 & s=150
    // Two separate sub-cases; the runner will verify rail_len is consistent.
    {
      name: 'T13a-SpacingIndep-s75',
      desc: 'Interior stud s=75mm → rail_len_target spacing-independent',
      inputs: { type:'int', Vu:900, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:75, fyt:420 },
      expected: {
        bo_inner: bo_int,
        n_sets:   { gt: 0 },
        rail_len_target: { gt: 0 },
      },
      tol: 0.05,
      tag: 'spacing-indep',
    },
    {
      name: 'T13b-SpacingIndep-s150',
      desc: 'Interior stud s=150mm → same rail_len_target as T13a, fewer sets',
      inputs: { type:'int', Vu:900, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:150, fyt:420 },
      expected: {
        bo_inner: bo_int,
        n_sets:   { gt: 0 },
        rail_len_target: { gt: 0 },
      },
      tol: 0.05,
      tag: 'spacing-indep',
    },

    // ── T14: Edge column + stud reinforcement ────────────────────────────────
    {
      name: 'T14-ACI-EdgeN-Stud',
      desc: 'Edge(N) + stud Ø12 s=100 Vu=300kN → completes, bo=1634, vs>0',
      inputs: { type:'edge', edgeFace:'N', Vu:300, hasReinf:true, reinfType:'stud', nr:4, nLegs:1, rdb:12, s:100, fyt:420 },
      expected: {
        bo_inner: bo_edge_N,   // 1634
        vs:       { gt: 0 },
        hasReinf: true,
      },
      tol: 0.02,
    },

    // ── T15: US units smoke test ──────────────────────────────────────────────
    {
      name: 'T15-US-Units-SmokeTest',
      desc: 'US units: c=16in Vu=112kip → DCR > 0, no crash',
      inputs: {
        units: 'us', type:'int',
        h:10, cv:1, db:0.625, fc:4000, c1:16, c2:16, Vu:112,
        hasReinf:false
      },
      expected: {
        DCR:     { gt: 0 },
        bo_inner:{ gt: 0 },
        isOK:    null,  // don't check pass/fail in unit-conversion smoke test
      },
      tol: 0.10,
    },
  ];

  // ─── Runner ─────────────────────────────────────────────────────────────────
  function _check(field, expected, actual, tol) {
    if (expected === null || expected === undefined) return { status:'SKIP' };
    if (typeof expected === 'boolean') {
      return { status: actual === expected ? 'PASS' : 'FAIL', expected, actual };
    }
    if (typeof expected === 'object') {
      if ('approx' in expected) {
        const diff = Math.abs(actual - expected.approx);
        return { status: diff <= expected.tol ? 'PASS' : 'FAIL', expected: expected.approx, actual, diff };
      }
      if ('gt' in expected) return { status: actual > expected.gt ? 'PASS' : 'FAIL', expected: `>${expected.gt}`, actual };
      if ('lt' in expected) return { status: actual < expected.lt ? 'PASS' : 'FAIL', expected: `<${expected.lt}`, actual };
    }
    if (typeof expected === 'number') {
      const diff = Math.abs((actual - expected) / (Math.abs(expected) || 1));
      return { status: diff <= tol ? 'PASS' : 'FAIL', expected, actual, diffPct: +(diff*100).toFixed(2) };
    }
    return { status: 'SKIP' };
  }

  async function runAll() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  Punching Shear — Automated Test Suite                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const allResults = [];
    let passCount = 0, failCount = 0, skipCount = 0;

    // Save current state so we can restore after tests
    const _savedUnit = typeof _punchUnit !== 'undefined' ? _punchUnit : 'knm';

    for (const tc of cases) {
      // Setup inputs
      _setup(tc.inputs);
      // Run calculation
      try {
        calcPunchShear();
      } catch(e) {
        allResults.push({ name: tc.name, desc: tc.desc, status:'ERROR', error: e.message, checks:[] });
        failCount++;
        console.error(`❌ ${tc.name}: EXCEPTION — ${e.message}`);
        continue;
      }

      const actual = typeof _lastPunchResults !== 'undefined' ? _lastPunchResults : null;
      const checks = [];
      let tcFail = false;

      if (!actual) {
        // calc returned early (e.g. EC2 / bad input)
        if (Object.keys(tc.expected).every(k => tc.expected[k] === null)) {
          checks.push({ field:'calc_ran', status:'SKIP' });
        } else {
          checks.push({ field:'calc_ran', status:'FAIL', expected:'result object', actual:'null' });
          tcFail = true;
        }
      } else {
        for (const [field, expVal] of Object.entries(tc.expected)) {
          const actVal = actual[field];
          const chk = _check(field, expVal, actVal, tc.tol ?? 0.05);
          chk.field = field;
          checks.push(chk);
          if (chk.status === 'FAIL') tcFail = true;
          if (chk.status === 'PASS') passCount++;
          if (chk.status === 'FAIL') failCount++;
          if (chk.status === 'SKIP') skipCount++;
        }
      }

      const tcStatus = tcFail ? 'FAIL' : 'PASS';
      allResults.push({ name: tc.name, desc: tc.desc, status: tcStatus, checks, actual });

      const icon = tcFail ? '❌' : '✅';
      console.log(`${icon} ${tc.name}`);
      if (tcFail) {
        checks.filter(c=>c.status==='FAIL').forEach(c => {
          console.log(`     └─ ${c.field}: expected ${JSON.stringify(c.expected)} got ${JSON.stringify(c.actual)}${c.diffPct!=null?' ('+c.diffPct+'%)':''}`);
        });
      }
    }

    // ── Spacing independence cross-check ────────────────────────────────────
    const t13a = allResults.find(r=>r.name==='T13a-SpacingIndep-s75');
    const t13b = allResults.find(r=>r.name==='T13b-SpacingIndep-s150');
    if (t13a?.actual && t13b?.actual) {
      const rl_a = t13a.actual.rail_len_target;
      const rl_b = t13b.actual.rail_len_target;
      const ns_a = t13a.actual.n_sets;
      const ns_b = t13b.actual.n_sets;
      const same_rail = Math.abs(rl_a - rl_b) < 1;
      const diff_sets = ns_a !== ns_b;
      console.log(`\n── Spacing Independence (T13) ───────────────────────────`);
      console.log(`  s=75:  rail_len=${rl_a?.toFixed(0)}mm  n_sets=${ns_a}`);
      console.log(`  s=150: rail_len=${rl_b?.toFixed(0)}mm  n_sets=${ns_b}`);
      console.log(`  rail_len same: ${same_rail?'✅ YES':'❌ NO'}`);
      console.log(`  n_sets differ: ${diff_sets?'✅ YES':'⚠ SAME (check spacing)'}`);
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    const total = cases.length;
    const passed = allResults.filter(r=>r.status==='PASS').length;
    const failed = allResults.filter(r=>r.status==='FAIL'||r.status==='ERROR').length;
    console.log(`\n══════════════════════════════════════════════`);
    console.log(`Results: ${passed}/${total} scenarios passed`);
    if (failed) console.log(`         ${failed} scenario(s) FAILED`);
    console.log(`══════════════════════════════════════════════\n`);

    // Restore unit system
    if (typeof setPunchUnit === 'function') setPunchUnit(_savedUnit);

    return allResults;
  }

  // ── HTML Report ─────────────────────────────────────────────────────────────
  function buildReport(results) {
    const rows = results.flatMap(r => {
      const baseRow = `<tr class="tc-row ${r.status.toLowerCase()}">
        <td>${r.status==='PASS'?'✅':'❌'}</td>
        <td><b>${r.name}</b></td>
        <td colspan="4">${r.desc}</td>
      </tr>`;
      const checkRows = (r.checks||[]).map(c => `<tr class="chk-row ${c.status.toLowerCase()}">
        <td></td><td></td>
        <td>${c.field}</td>
        <td>${c.status}</td>
        <td>${c.expected!==undefined?c.expected:''}</td>
        <td>${c.actual!==undefined?(typeof c.actual==='number'?c.actual.toFixed(4):c.actual):''}</td>
      </tr>`).join('');
      return baseRow + checkRows;
    });

    const passed = results.filter(r=>r.status==='PASS').length;
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Punching Shear Test Report</title>
<style>
  body { font-family: monospace; font-size: 13px; padding: 20px; background:#f8fafc; }
  h1 { font-size:18px; }
  .summary { background:#e0f2fe; padding:10px; border-radius:6px; margin-bottom:16px; }
  table { border-collapse:collapse; width:100%; }
  th { background:#334155; color:white; padding:6px 10px; text-align:left; }
  td { padding:4px 10px; border-bottom:1px solid #e2e8f0; }
  .pass td { background:#f0fdf4; }
  .fail td { background:#fef2f2; }
  .skip td { background:#fafafa; color:#94a3b8; }
  .tc-row.pass td { background:#dcfce7; font-weight:600; }
  .tc-row.fail td { background:#fee2e2; font-weight:600; }
  .chk-row { font-size:12px; }
</style></head><body>
<h1>Punching Shear — Test Report</h1>
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
    a.download = `punch-test-report-${new Date().toISOString().slice(0,10)}.html`;
    a.click();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  return {
    cases,
    run: async function(opts={}) {
      const results = await runAll();
      if (opts.download !== false) downloadReport(results);
      return results;
    },
    report: buildReport,
    download: downloadReport,
  };
})();

// ── Auto-run banner ──────────────────────────────────────────────────────────
console.log('Punching test suite loaded. Run: PUNCH_TEST_SUITE.run()');
