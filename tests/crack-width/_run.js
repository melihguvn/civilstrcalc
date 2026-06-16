/* Crack Width — batch test runner
 * Usage: cscript tests/crack-width/_run.js
 */
var shell  = new ActiveXObject('WScript.Shell');
var fso    = new ActiveXObject('Scripting.FileSystemObject');

var dir    = fso.GetParentFolderName(WScript.ScriptFullName);
var files  = ['ec2.test.js', 'is456.test.js', 'aci.test.js', 'ts500.test.js'];
var totP   = 0, totF = 0;

WScript.Echo('=== Crack Width Test Suite ===\n');

for (var i = 0; i < files.length; i++) {
  var path = dir + '\\' + files[i];
  var cmd  = 'cscript //nologo "' + path + '"';
  var exec = shell.Exec(cmd);

  var out = '';
  while (!exec.StdOut.AtEndOfStream) out += exec.StdOut.ReadAll();

  // Parse summary line: "N passed, M failed  (T total)"
  var m = out.match(/(\d+)\s+passed,\s+(\d+)\s+failed/);
  if (m) { totP += parseInt(m[1], 10); totF += parseInt(m[2], 10); }

  WScript.Echo(out);
}

WScript.Echo('');
WScript.Echo('══════════════════════════════════════════════════');
WScript.Echo('  TOTAL  ' + totP + ' passed, ' + totF + ' failed  (' + (totP+totF) + ' total)');
WScript.Echo('══════════════════════════════════════════════════');
if (totF > 0) WScript.Quit(1);
