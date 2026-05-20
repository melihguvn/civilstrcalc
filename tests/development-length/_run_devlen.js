/* Development Length — WSH batch runner
 * Usage:  cscript tests/development-length/_run_devlen.js
 */
var shell = WScript.CreateObject('WScript.Shell');
var fso   = WScript.CreateObject('Scripting.FileSystemObject');
var dir   = fso.GetParentFolderName(WScript.ScriptFullName);

var files = [
  { path: fso.BuildPath(dir, 'aci-si.test.js'),       name: 'ACI 318-25  SI Units    (Tests 1-9)'  },
  { path: fso.BuildPath(dir, 'aci-imperial.test.js'),  name: 'ACI 318-25  Imperial   (Tests 10-18)' },
  { path: fso.BuildPath(dir, 'ec2.test.js'),           name: 'Eurocode 2             (Tests 19-27)' },
  { path: fso.BuildPath(dir, 'is456.test.js'),         name: 'IS 456:2000            (Tests 28-36)' },
  { path: fso.BuildPath(dir, 'ts500.test.js'),         name: 'TS 500:2000            (Tests 37-45)' }
];

WScript.Echo('');
WScript.Echo('  ================================================================');
WScript.Echo('  Development Length Calculator -- Test Suite');
WScript.Echo('  ================================================================');
WScript.Echo('');

var totalPassed = 0, totalFailed = 0, suiteFailed = 0;

for (var i = 0; i < files.length; i++) {
  var f = files[i];
  WScript.Echo('  -- ' + f.name + ' --');

  var exec   = shell.Exec('cscript //nologo "' + f.path + '"');
  var output = exec.StdOut.ReadAll();

  var lines = output.split('\n');
  for (var j = 0; j < lines.length; j++) {
    var ln = lines[j].replace(/\r$/, '');
    WScript.Echo('  ' + ln);
  }

  var m = output.match(/(\d+) passed, (\d+) failed/);
  if (m) {
    var p  = parseInt(m[1], 10);
    var fa = parseInt(m[2], 10);
    totalPassed += p;
    totalFailed += fa;
    if (fa > 0) suiteFailed++;
  } else {
    WScript.Echo('  [ERROR] Could not parse summary for ' + f.name);
    suiteFailed++;
  }

  WScript.Echo('');
}

var total = totalPassed + totalFailed;
var pct   = total > 0 ? Math.floor(totalPassed / total * 100) : 0;

WScript.Echo('  ================================================================');
WScript.Echo('  TOTAL:  ' + totalPassed + ' / ' + total + '  passed  (' + pct + '%)');
if (totalFailed > 0) {
  WScript.Echo('  FAILED: ' + totalFailed + ' test(s)');
}
WScript.Echo('  ================================================================');
WScript.Echo('');

if (suiteFailed > 0) WScript.Quit(1);
