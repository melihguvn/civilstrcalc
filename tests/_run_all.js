// WSH/JScript test runner shim
// Polyfills Node.js globals, then inlines each test file and collects results.

var console = { log: function(s){ WScript.Echo(String(s)); } };
var process = { exit: function(c){} };  // don't exit mid-run; capture all

// ─── aggregator ───────────────────────────────────────────────────
var SUITE_RESULTS = [];  // [{name, passed, failed}]
var _suiteName = '';
var _passed = 0, _failed = 0;

function _resetSuite(name){
  _suiteName = name;
  _passed = 0; _failed = 0;
}
function _finishSuite(){
  SUITE_RESULTS.push({name: _suiteName, passed: _passed, failed: _failed});
}

// ─── override check/checkBool per-file ────────────────────────────
// Each test file uses module-level `passed` and `failed` vars.
// We patch them after each file.

// ─────────────────────────────────────────────────────────────────
// Helper to read a file
// ─────────────────────────────────────────────────────────────────
function readFile(path){
  var fso = new ActiveXObject("Scripting.FileSystemObject");
  var f = fso.OpenTextFile(path, 1, false);
  var txt = f.ReadAll();
  f.Close();
  return txt;
}

// ─────────────────────────────────────────────────────────────────
// Run one test file by eval-ing it, then read its passed/failed counts
// ─────────────────────────────────────────────────────────────────
function runFile(path, displayName){
  WScript.Echo("\n════════════════════════════════════════");
  WScript.Echo("FILE: " + displayName);
  WScript.Echo("════════════════════════════════════════");

  // Reset global counters (each file declares `var passed=0,failed=0`)
  // We eval the file; its top-level `passed` and `failed` will be local
  // to the eval scope in JScript. We capture via a wrapper.
  var src = readFile(path);

  // Strip 'use strict' (JScript doesn't support it in eval context cleanly)
  src = src.replace(/"use strict";/g, '').replace(/'use strict';/g, '');

  // Replace process.exit(1) calls with nothing (already a no-op via shim)
  // console.log is already shimmed

  // Wrap to capture passed/failed
  var wrapper = src + "\n_capturedPassed = passed; _capturedFailed = failed;";

  var _capturedPassed = 0, _capturedFailed = 0;
  try {
    eval(wrapper);
    SUITE_RESULTS.push({name: displayName, passed: _capturedPassed, failed: _capturedFailed});
  } catch(e) {
    WScript.Echo("  !! RUNTIME ERROR: " + e.message);
    SUITE_RESULTS.push({name: displayName, passed: 0, failed: -1, error: String(e.message)});
  }
}

// ─────────────────────────────────────────────────────────────────
// Base path
// ─────────────────────────────────────────────────────────────────
var BASE = "C:\\Users\\USER\\Desktop\\Civil Structural Calculation\\tests\\";

var FILES = [
  ["aci_flexural_design.test.js",    "ACI Flexural Design"],
  ["ec2_flexural_design.test.js",    "EC2 Flexural Design"],
  ["flexural_capacity_aci.test.js",  "Flexural Capacity ACI"],
  ["flexural_capacity_ec2.test.js",  "Flexural Capacity EC2"],
  ["shear_aci.test.js",              "Shear Design ACI"],
  ["shear_ec2.test.js",              "Shear Design EC2"],
  ["torsion_aci.test.js",            "Torsion ACI"],
  ["torsion_ec2.test.js",            "Torsion EC2"],
  ["column_aci.test.js",             "Column ACI"],
  ["column_ec2.test.js",             "Column EC2"],
];

for(var i=0; i<FILES.length; i++){
  runFile(BASE + FILES[i][0], FILES[i][1]);
}

// ─────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────
WScript.Echo("\n");
WScript.Echo("╔══════════════════════════════════════════════════════════════╗");
WScript.Echo("║                     TEST SUITE SUMMARY                      ║");
WScript.Echo("╠══════════════════════════════════════════════════════════════╣");

var totalP=0, totalF=0, totalFiles=0, failedFiles=[];
for(var j=0; j<SUITE_RESULTS.length; j++){
  var r = SUITE_RESULTS[j];
  totalFiles++;
  if(r.error){
    WScript.Echo("║  ERROR   " + r.name);
    WScript.Echo("║          " + r.error);
    failedFiles.push(r.name);
  } else {
    totalP += r.passed; totalF += r.failed;
    var status = r.failed===0 ? " PASS " : " FAIL ";
    var line = "║  [" + status + "]  " + r.name;
    var counts = "  (" + r.passed + " passed";
    if(r.failed>0) counts += ", " + r.failed + " FAILED";
    counts += ")";
    // pad to 63 chars
    while((line+counts).length < 63) counts += " ";
    WScript.Echo(line + counts + "║");
  }
}

WScript.Echo("╠══════════════════════════════════════════════════════════════╣");
var overall = totalF===0 ? " ALL PASS " : " FAILURES ";
WScript.Echo("║  " + overall + "  Total: " + totalP + " passed, " + totalF + " failed across " + totalFiles + " files   ║");
WScript.Echo("╚══════════════════════════════════════════════════════════════╝");
