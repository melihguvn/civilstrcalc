/**
 * EC2 Punching Shear — Test Suite (E01–E12)
 * EN 1992-1-1:2004 §6.4
 *
 * Loaded via tests/run-headless-ec2.html
 * Requires: _lastEC2Results global + calcEC2PunchShear() in same window.
 *
 * Reference values computed by hand — see comments per test.
 */

var PUNCH_EC2 = (() => {

  const _sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  const _sc = (id, v) => { const e = document.getElementById(id); if (e) e.checked = v; };

  function _setup(inp) {
    // Unit/state
    if (typeof setEC2Unit      === 'function') setEC2Unit(inp.unit ?? 'knm');
    if (typeof setEC2Shape     === 'function') setEC2Shape(inp.shape ?? 'rect');
    if (typeof setEC2Type      === 'function') setEC2Type(inp.type ?? 'int');
    if (typeof setEC2EdgeFace  === 'function') setEC2EdgeFace(inp.ef ?? 'N');
    if (typeof setEC2HasReinf  === 'function') setEC2HasReinf(!!inp.hasReinf);

    // kN-m inputs (m, kN, kN·m)
    const isM = (inp.unit ?? 'knm') === 'knm';
    _sv('ec2-h',       inp.h   ?? (isM ? 0.25 : 250));
    _sv('ec2-fck',     inp.fck ?? 25);
    _sv('ec2-cv',      inp.cv  ?? (isM ? 0.025 : 25));
    _sv('ec2-db',      inp.db  ?? (isM ? 0.016 : 16));
    _sv('ec2-rho-x',   inp.rho_x ?? 1.0);   // %
    _sv('ec2-rho-y',   inp.rho_y ?? 1.0);   // %
    _sv('ec2-gammac',  inp.gammac ?? 1.5);
    _sv('ec2-sigmacp', inp.sigcp  ?? 0);
    _sv('ec2-c1',      inp.c1  ?? (isM ? 0.4 : 400));
    _sv('ec2-c2',      inp.c2  ?? (isM ? 0.4 : 400));
    _sv('ec2-dc',      inp.dc  ?? (isM ? 0.4 : 400));
    _sv('ec2-ved',     inp.VEd ?? (isM ? 500 : 500000));
    _sv('ec2-mux',     inp.Mux ?? 0);
    _sv('ec2-muy',     inp.Muy ?? 0);
    _sc('ec2-has-reinf', !!inp.hasReinf);
    if (inp.hasReinf) {
      _sv('ec2-reinf-n',  inp.n_links ?? 8);
      _sv('ec2-reinf-db', inp.db_link ?? 10);
      _sv('ec2-fywd',     inp.fywd ?? 435);
      _sv('ec2-sr',       inp.sr   ?? (isM ? 0.15 : 150));
    }
    _sc('ec2-has-op', !!inp.hasOp);
    if (inp.hasOp) {
      if (typeof setEC2OpFace === 'function') setEC2OpFace(inp.opFace ?? 'E');
      _sv('ec2-ao', inp.ao ?? (isM ? 0.3 : 300));
    }
  }

  function _run(inp) {
    _setup(inp);
    calcEC2PunchShear();
    return typeof _lastEC2Results !== 'undefined' ? _lastEC2Results : null;
  }

  // ── Pre-computed reference constants (d=209mm, fck=25, rho=1%) ──────────────
  // d = 250-25-16 = 209 mm
  // k = min(1 + sqrt(200/209), 2.0) = 1.9783
  // rho_l = min(sqrt(0.01*0.01), 0.02) = 0.01
  // CRdc = 0.18/1.5 = 0.12
  // v_min = 0.035 * 1.9783^1.5 * 25^0.5 = 0.4871 MPa
  // vRdc_raw = 0.12 * 1.9783 * (100*0.01*25)^(1/3) = 0.12*1.9783*(25)^(1/3) = 0.6938 MPa  (> v_min)
  // nu = 0.6*(1-25/250) = 0.54;  fcd = 25/1.5 = 16.667;  vRdmax = 0.4*0.54*16.667 = 3.600 MPa
  // u1_int  = 2*(400+400)+4π*209 = 1600+2625.04 = 4225.04 mm
  // u1_edge = 2*400+400+2π*209   = 1200+1312.52 = 2512.52 mm
  // u1_corn = 400+400+π*209      = 800+656.26   = 1456.26 mm
  // u1_circ = 2π*(200+2*209)     = 2π*618       = 3882.12 mm

  const D    = 209;
  const vRdc = 0.6938;   // MPa
  const vRdmax = 3.600;  // MPa
  const U1_INT  = 4225.04;
  const U1_EDGE = 2512.52;
  const U1_CORN = 1456.26;
  const U1_CIRC = 3882.12;

  // ── Test definitions ─────────────────────────────────────────────────────────

  const tests = [

    // ──────────────────────────────────────────────────────────────────────────
    // E01 — Interior rect, no reinf, kN-m, ADEQUATE
    // vEd = 1.0*500000/(4225.04*209) = 0.5663 MPa; DCR = 0.5663/0.6938 = 0.816
    {
      id:'E01', name:'Interior-NoReinf-Adequate',
      run: { type:'int', VEd:500 },
      checks: [
        { label:'u1 ~4225mm',   field:'u1',   op:'≈', val:U1_INT,  tol:0.3 },
        { label:'vEd',          field:'vEd',  op:'≈', val:0.5663,  tol:0.5 },
        { label:'vRdc',         field:'vRdc', op:'≈', val:vRdc,    tol:0.3 },
        { label:'DCR ~0.816',   field:'DCR',  op:'≈', val:0.816,   tol:0.5 },
        { label:'isOK=true',    field:'isOK', op:'=',  val:true },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E02 — Interior rect, no reinf, EXCEEDS CAPACITY
    // vEd = 1.0*900000/(4225.04*209) = 1.019 MPa; DCR = 1.019/0.6938 = 1.469
    {
      id:'E02', name:'Interior-NoReinf-Fails',
      run: { type:'int', VEd:900 },
      checks: [
        { label:'DCR > 1',     field:'DCR',  op:'>',  val:1.0 },
        { label:'isOK=false',  field:'isOK', op:'=',   val:false },
        { label:'warns > 0',   field:'warns',op:'>',  val:0 },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E03 — Edge column (face N), no reinf, kN-m, ADEQUATE
    // β=1.4; vEd = 1.4*200000/(2512.52*209) = 0.5328 MPa; DCR = 0.5328/0.6938 = 0.768
    {
      id:'E03', name:'Edge-N-NoReinf-Adequate',
      run: { type:'edge', ef:'N', VEd:200 },
      checks: [
        { label:'u1 ~2512mm',  field:'u1',   op:'≈', val:U1_EDGE, tol:0.3 },
        { label:'beta=1.4',    field:'beta', op:'≈', val:1.4,     tol:0.1 },
        { label:'DCR ~0.768',  field:'DCR',  op:'≈', val:0.768,   tol:0.5 },
        { label:'isOK=true',   field:'isOK', op:'=',  val:true },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E04 — Corner column, no reinf, ADEQUATE
    // β=1.5; vEd = 1.5*100000/(1456.26*209) = 0.4929 MPa; DCR = 0.4929/0.6938 = 0.710
    {
      id:'E04', name:'Corner-NoReinf-Adequate',
      run: { type:'corner', VEd:100 },
      checks: [
        { label:'u1 ~1456mm',  field:'u1',   op:'≈', val:U1_CORN, tol:0.3 },
        { label:'beta=1.5',    field:'beta', op:'≈', val:1.5,     tol:0.1 },
        { label:'DCR ~0.710',  field:'DCR',  op:'≈', val:0.710,   tol:0.5 },
        { label:'isOK=true',   field:'isOK', op:'=',  val:true },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E05 — Interior with reinforcement, ADEQUATE (VEd=800 kN fails without reinf)
    // n=8 links, db=12mm → Asw = 8×π/4×144 = 904.8 mm²
    // fywdEf = min(250+0.25*209, 435) = 302.25 MPa
    // vRdcs = 0.75*0.6938 + 1.5*(209/150)*904.8*302.25/(4225.04*209) ≈ 0.985 MPa
    // vEd = 800000/883033 = 0.9061 MPa; DCR ≈ 0.920
    {
      id:'E05', name:'Interior-WithReinf-Adequate',
      run: { type:'int', VEd:800, hasReinf:true, n_links:8, db_link:12, fywd:435, sr:0.15 },
      checks: [
        { label:'vRdcs > vRdc',   field:'vRdcs', op:'>', val:vRdc },
        { label:'DCR < 1',        field:'DCR',   op:'<', val:1.0 },
        { label:'isOK=true',      field:'isOK',  op:'=', val:true },
        { label:'warns=0',        field:'warns', op:'=', val:0 },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E06 — Circular interior column, no reinf
    // u1 = 2π*(200+2*209) = 2π*618 = 3882.12 mm
    // vEd = 500000/(3882.12*209) = 0.6161 MPa; DCR = 0.6161/0.6938 = 0.888
    {
      id:'E06', name:'Circular-Interior-NoReinf',
      run: { shape:'circ', type:'int', VEd:500, dc:0.4 },
      checks: [
        { label:'u1 ~3882mm',  field:'u1',   op:'≈', val:U1_CIRC, tol:0.3 },
        { label:'DCR ~0.888',  field:'DCR',  op:'≈', val:0.888,   tol:0.5 },
        { label:'isOK=true',   field:'isOK', op:'=',  val:true },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E07 — N-mm unit system gives same DCR as kN-m (E01)
    {
      id:'E07', name:'NMM-units-same-DCR',
      run: { unit:'nmm', type:'int', h:250, cv:25, db:16, c1:400, c2:400, VEd:500000 },
      checks: [
        { label:'DCR same as E01', field:'DCR', op:'≈', val:0.816, tol:0.5 },
        { label:'isOK=true',       field:'isOK', op:'=', val:true },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E08 — vmin governs (low rho=0.1%)
    // vRdc_raw = 0.12*1.9783*(100*0.001*25)^(1/3) = 0.12*1.9783*1.3572 = 0.3222 MPa
    // v_min = 0.4871 MPa → vRdc = 0.4871 MPa (vmin governs)
    {
      id:'E08', name:'vmin-governs-low-rho',
      run: { type:'int', VEd:300, rho_x:0.1, rho_y:0.1 },
      checks: [
        { label:'vRdc ~0.487 (vmin)', field:'vRdc', op:'≈', val:0.4871, tol:0.5 },
        { label:'DCR < 1',            field:'DCR',  op:'<',  val:1.0 },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E09 — Interior with moment (EC2 Eq. 6.39)
    // VEd=400kN, Muy=80kNm → eu_x=0.2m=200mm, eu_y=0
    // k_ec(c1/c2=1.0) = 0.60
    // W1x = 400²/2+400*400+4*400*209+2π*400*209+16*209² = 1797606 mm³
    // beta_x = 1+0.60*200*4225.04/1797606 = 1.282; beta_y=1.0 → beta=1.282
    // vEd = 1.282*400000/883033 = 0.5809; DCR = 0.5809/0.6938 = 0.837
    {
      id:'E09', name:'Interior-WithMoment-Beta',
      run: { type:'int', VEd:400, Muy:80 },
      checks: [
        { label:'beta > 1',     field:'beta', op:'>',  val:1.0 },
        { label:'beta ~1.282',  field:'beta', op:'≈',  val:1.282, tol:1.0 },
        { label:'DCR ~0.837',   field:'DCR',  op:'≈',  val:0.837, tol:1.0 },
        { label:'isOK=true',    field:'isOK', op:'=',   val:true },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E10 — Face crushing check: vEd0 vs vRdmax
    // u0 = 2*(400+400) = 1600mm; vEd0 = VEd/(u0*d)
    // vRdmax = 3.600 MPa; VEd must be << 3.600*1600*209 = 1203kN to pass
    // With VEd=500: vEd0 = 500000/(1600*209) = 1.495 MPa < 3.6 → face OK
    {
      id:'E10', name:'Face-crushing-OK',
      run: { type:'int', VEd:500 },
      checks: [
        { label:'vRdmax ~3.60',   field:'vRdmax', op:'≈', val:3.600, tol:0.2 },
        { label:'vEd < vRdmax',   field:'vEd',    op:'<',  val:3.600 },
        { label:'isOK=true',      field:'isOK',   op:'=',  val:true },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E11 — Spacing warning: sr > 0.75d (0.75*209 = 156.75mm)
    // sr=200mm > 156.75mm → should trigger warn
    {
      id:'E11', name:'Reinf-spacing-warning',
      run: { type:'int', VEd:500, hasReinf:true, n_links:8, db_link:10, fywd:435, sr:0.20 },
      checks: [
        { label:'warns > 0',  field:'warns', op:'>', val:0 },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E12 — Higher fck (C35) increases capacity
    // k=1.9783; rho=1%; CRdc=0.12
    // vRdc = 0.12*1.9783*(100*0.01*35)^(1/3) = 0.12*1.9783*(35)^(1/3) = 0.12*1.9783*3.271 = 0.7768 MPa
    // > 0.6938 (C25) → DCR lower
    {
      id:'E12', name:'HigherFck-increases-capacity',
      run: { type:'int', VEd:500, fck:35 },
      checks: [
        { label:'vRdc > C25 vRdc', field:'vRdc', op:'>', val:vRdc },
        { label:'DCR < E01 DCR',   field:'DCR',  op:'<', val:0.816 },
        { label:'isOK=true',       field:'isOK', op:'=', val:true },
      ]
    },

    // ──────────────────────────────────────────────────────────────────────────
    // E13 — Opening reduces u₁ → increases vEd vs same case without opening
    // VEd=500kN, ao=0.3m=300mm, face E (interior)
    // u1_nominal = 4225.04mm; u1_eff = 4225.04-300 = 3925.04mm
    // vEd = 500000/(3925.04*209) = 0.6094 MPa; DCR = 0.6094/0.6938 = 0.879
    // Compare E01 (no opening): vEd=0.5663, DCR=0.816 → opening version has higher DCR
    {
      id:'E13', name:'Opening-reduces-u1-increases-DCR',
      run: { type:'int', VEd:500, hasOp:true, opFace:'E', ao:0.3 },
      checks: [
        { label:'u1 < nominal',   field:'u1',   op:'<', val:U1_INT },
        { label:'u1 ~3925mm',     field:'u1',   op:'≈', val:3925.0, tol:0.5 },
        { label:'vEd > E01 vEd',  field:'vEd',  op:'>',  val:0.5663 },
        { label:'warns > 0',      field:'warns', op:'>',  val:0 },
        { label:'isOK=true',      field:'isOK',  op:'=',  val:true },
      ]
    },

  ];

  // ── Runner ───────────────────────────────────────────────────────────────────
  function _assert(result, chk) {
    const raw = result ? result[chk.field] : null;
    const v   = chk.val;
    let pass = false, diffPct = null;
    if (raw === null || raw === undefined) return { pass:false, actual:null, expected:v, diffPct:null };
    switch (chk.op) {
      case '=':  pass = raw === v; break;
      case '>':  pass = raw > v;   break;
      case '<':  pass = raw < v;   break;
      case '≈': {
        const tol = chk.tol ?? 1.0;
        if (v === 0) { pass = Math.abs(raw) < 1e-9; }
        else { diffPct = Math.abs((raw-v)/v*100); pass = diffPct <= tol; }
        diffPct = diffPct !== null ? +diffPct.toFixed(3) : null;
        break;
      }
    }
    return { pass, actual:raw, expected:v, diffPct };
  }

  async function run({ download = false } = {}) {
    const results = [];
    for (const t of tests) {
      const rec = { id:t.id, name:t.name, status:'PASS', error:null, checks:[] };
      try {
        const res = _run(t.run);
        if (!res) throw new Error('calcEC2PunchShear() returned no result (_lastEC2Results is null)');
        for (const chk of t.checks) {
          const a = _assert(res, chk);
          rec.checks.push({ label:chk.label, pass:a.pass, expected:a.expected, actual:a.actual, diffPct:a.diffPct });
          if (!a.pass) rec.status = 'FAIL';
        }
      } catch(e) {
        rec.status = 'ERROR'; rec.error = e.message;
      }
      results.push(rec);
    }
    return results;
  }

  return { run };
})();
