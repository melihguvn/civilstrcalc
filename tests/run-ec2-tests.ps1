param([int]$Port = 8765, [int]$Timeout = 150)

$root   = Split-Path -Parent $PSScriptRoot
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $chrome)) { Write-Error "Chrome not found."; exit 1 }

$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
           '.css'='text/css'; '.json'='application/json'; '.svg'='image/svg+xml';
           '.png'='image/png'; '.ico'='image/x-icon'; '.woff2'='font/woff2'; '.woff'='font/woff' }

Write-Host ""
Write-Host "  EC2 Punching Shear - Test Runner"
Write-Host "  ================================="
Write-Host "  Root: $root"
Write-Host "  Port: $Port"
Write-Host ""

$hl = [Net.HttpListener]::new()
$hl.Prefixes.Add("http://localhost:$($Port)/")
try { $hl.Start() } catch { Write-Error "Cannot bind port $($Port): $_"; exit 1 }
Write-Host "  HTTP listener started."

$tempProfile = "$env:TEMP\chrome-ec2-test-$(Get-Random)"
New-Item -ItemType Directory -Path $tempProfile -Force | Out-Null

$chromeArgs = @(
    "--headless=old",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--user-data-dir=$tempProfile",
    "http://localhost:$($Port)/tests/run-headless-ec2.html"
)
$proc = Start-Process $chrome -ArgumentList $chromeArgs -PassThru
Write-Host "  Chrome started (PID $($proc.Id)), waiting for results..."
Write-Host ""

$resultsJson = $null
$deadline    = [DateTime]::Now.AddSeconds($Timeout)
$reqCount    = 0

function Handle-Context($ctx) {
    $req  = $ctx.Request
    $resp = $ctx.Response
    $resp.Headers.Add("Access-Control-Allow-Origin", "*")
    $resp.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
    try {
        if ($req.HttpMethod -eq "OPTIONS") { $resp.StatusCode = 204; return $null }
        if ($req.HttpMethod -eq "POST" -and $req.Url.LocalPath -eq "/results") {
            $body = [IO.StreamReader]::new($req.InputStream, [Text.Encoding]::UTF8).ReadToEnd()
            $ok = [Text.Encoding]::UTF8.GetBytes('{"ok":true}')
            $resp.ContentType = "application/json"
            $resp.ContentLength64 = $ok.Length
            $resp.OutputStream.Write($ok, 0, $ok.Length)
            return $body
        }
        $lp = $req.Url.LocalPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        $fp = Join-Path $root $lp
        if ((Test-Path $fp) -and -not (Get-Item $fp).PSIsContainer) {
            $ext = [IO.Path]::GetExtension($fp).ToLower()
            $resp.ContentType = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
            $bytes = [IO.File]::ReadAllBytes($fp)
            $resp.ContentLength64 = $bytes.Length
            $resp.OutputStream.Write($bytes, 0, $bytes.Length)
            $script:reqCount++
        } else { $resp.StatusCode = 404 }
    } catch { try { $resp.StatusCode = 500 } catch {} }
    finally { try { $resp.Close() } catch {} }
    return $null
}

$ar = $hl.BeginGetContext($null, $null)
while ([DateTime]::Now -lt $deadline -and -not $resultsJson) {
    $got = $ar.AsyncWaitHandle.WaitOne(1000)
    if (-not $got) {
        if ($proc.HasExited) { Write-Host "  Chrome exited (code $($proc.ExitCode))."; break }
        continue
    }
    $ctx = $hl.EndGetContext($ar)
    $result = Handle-Context $ctx
    if ($result) { $resultsJson = $result; break }
    $ar = $hl.BeginGetContext($null, $null)
}

$hl.Stop()
try { if (-not $proc.HasExited) { $proc.Kill() } } catch {}
try { Remove-Item $tempProfile -Recurse -Force -ErrorAction SilentlyContinue } catch {}
Write-Host "  ($($reqCount) file requests served)"
Write-Host ""

if (-not $resultsJson) { Write-Host "  ERROR: No results within $($Timeout)s" -ForegroundColor Red; exit 1 }

$results = $resultsJson | ConvertFrom-Json
$passed  = ($results | Where-Object { $_.status -eq 'PASS' }).Count
$failed  = ($results | Where-Object { $_.status -eq 'FAIL' }).Count
$errors  = ($results | Where-Object { $_.status -eq 'ERROR' }).Count
$total   = $results.Count
$pct     = if ($total -gt 0) { [int]($passed / $total * 100) } else { 0 }

Write-Host "  =======================================================" -ForegroundColor Cyan
Write-Host "  EC2 PUNCHING SHEAR TEST RESULTS  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "  =======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  -- EC2 Tests E01-E12 ($($passed)/$($total) passed) --" -ForegroundColor $(if ($passed -eq $total) { 'Green' } else { 'Yellow' })

foreach ($r in $results) {
    $icon = if ($r.status -eq 'PASS') { '[PASS]' } elseif ($r.status -eq 'ERROR') { '[ERR ]' } else { '[FAIL]' }
    $col  = if ($r.status -eq 'PASS') { 'Green'  } elseif ($r.status -eq 'ERROR') { 'Yellow' } else { 'Red'   }
    $diffs = @($r.checks | Where-Object { $null -ne $_.diffPct } | ForEach-Object { $_.diffPct })
    $diffStr = if ($diffs.Count -gt 0) { "  [diff: $(($diffs | ForEach-Object {"$($_)%"}) -join ', ')]" } else { '' }
    Write-Host "    $icon $($r.id.PadRight(4)) $($r.name)$diffStr" -ForegroundColor $col
    if ($r.status -ne 'PASS') {
        if ($r.error) { Write-Host "           ERROR: $($r.error)" -ForegroundColor Red }
        foreach ($c in $r.checks) {
            if (-not $c.info -and -not $c.pass) {
                $exp  = if ($null -ne $c.expected) { $c.expected } else { '(null)' }
                $act  = if ($null -ne $c.actual)   { $c.actual   } else { '(null)' }
                $dpct = if ($c.diffPct) { " ($($c.diffPct)%)" } else { '' }
                Write-Host "           X $($c.label): expected=$exp  got=$act$dpct" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
$sumCol = if ($passed -eq $total) { 'Green' } elseif (($failed+$errors) -le 2) { 'Yellow' } else { 'Red' }
Write-Host "  =======================================================" -ForegroundColor Cyan
Write-Host "  TOTAL:  $($passed) / $($total)  passed  ($($pct)%)" -ForegroundColor $sumCol
if ($failed -gt 0) { Write-Host "  FAILED: $($failed) test(s)" -ForegroundColor Red }
if ($errors -gt 0) { Write-Host "  ERRORS: $($errors) test(s)" -ForegroundColor Yellow }
Write-Host "  =======================================================" -ForegroundColor Cyan
Write-Host ""

exit $(if (($failed + $errors) -gt 0) { 1 } else { 0 })
