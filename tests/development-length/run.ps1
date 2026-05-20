# Development Length Test Runner
# Usage:  powershell -File tests/development-length/run.ps1

$suite = Join-Path $PSScriptRoot

$files = @(
  @{ path = Join-Path $suite 'aci-si.test.js';       name = 'ACI 318-25  SI Units    (Tests 1-9)'  },
  @{ path = Join-Path $suite 'aci-imperial.test.js';  name = 'ACI 318-25  Imperial   (Tests 10-18)' },
  @{ path = Join-Path $suite 'ec2.test.js';           name = 'Eurocode 2             (Tests 19-27)' },
  @{ path = Join-Path $suite 'is456.test.js';         name = 'IS 456:2000            (Tests 28-36)' },
  @{ path = Join-Path $suite 'ts500.test.js';         name = 'TS 500:2000            (Tests 37-45)' }
)

Write-Host ""
Write-Host "  ═══════════════════════════════════════════════════════"
Write-Host "  Development Length Calculator — Test Suite"
Write-Host "  ═══════════════════════════════════════════════════════"
Write-Host ""

$totalPassed = 0; $totalFailed = 0; $suiteFailed = 0

foreach ($f in $files) {
  Write-Host "  ── $($f.name) ──"
  $out = cscript //nologo $f.path 2>&1
  $exitCode = $LASTEXITCODE

  $out | ForEach-Object { Write-Host "  $_" }

  # Parse summary line
  if ($out -match '(\d+) passed, (\d+) failed') {
    $p = [int]$Matches[1]; $fa = [int]$Matches[2]
    $totalPassed += $p; $totalFailed += $fa
    if ($fa -gt 0) { $suiteFailed++ }
  }
  if ($exitCode -ne 0 -and $out -notmatch 'passed') {
    Write-Host "  [ERROR] Node exited with code $exitCode" -ForegroundColor Red
    $suiteFailed++
  }
  Write-Host ""
}

$total = $totalPassed + $totalFailed
$pct   = if ($total -gt 0) { [int]($totalPassed / $total * 100) } else { 0 }
$col   = if ($totalFailed -eq 0) { 'Green' } elseif ($totalFailed -le 3) { 'Yellow' } else { 'Red' }

Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TOTAL:  $totalPassed / $total  passed  ($pct%)" -ForegroundColor $col
if ($totalFailed -gt 0) {
  Write-Host "  FAILED: $totalFailed test(s)" -ForegroundColor Red
}
Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

exit $(if ($suiteFailed -gt 0) { 1 } else { 0 })
