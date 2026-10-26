#requires -Version 7.2
# Offline regression tests; no ADB connection, Android settings or phone required.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$failures=0;$passed=0
function Check([string]$Name,[scriptblock]$Body){try{&$Body;$script:passed++;Write-Host "PASS $Name"}catch{$script:failures++;Write-Host "FAIL $Name : $_" -ForegroundColor Red}}
function Assert([bool]$Condition,[string]$Message='assertion failed'){if(!$Condition){throw $Message}}
function Must-Throw([scriptblock]$Body){$thrown=$false;try{&$Body | Out-Null}catch{$thrown=$true};Assert $thrown 'Expected rejection'}
Check 'All PowerShell sources parse' {
    foreach($file in Get-ChildItem $PSScriptRoot -File | Where-Object Extension -in @('.ps1','.psm1')){
        $tokens=$null;$errorsFound=$null
        $null=[Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$errorsFound)
        Assert (@($errorsFound).Count -eq 0) ($errorsFound -join '; ')
    }
}
Import-Module (Join-Path $PSScriptRoot 'WebUsbHarness.psm1') -Force -DisableNameChecking
function E([long]$Seq,[string]$Operation,[hashtable]$Fields=@{}){
    $e=@{seq=$Seq;operation=$Operation;connectionGeneration=1};foreach($k in $Fields.Keys){$e[$k]=$Fields[$k]};[pscustomobject]$e
}
function Snapshot($Events){[pscustomobject]@{evictedEvents=0;events=@($Events)}}
$base=@((E -1 'requestDevice' @{status='ok';vendorId=1116;productId=405}),(E 0 'configuration' @{status='ok'}),(E 1 'open' @{status='ok'}),(E 2 'claimInterface' @{status='ok'}),(E 3 'selected descriptors'),(E 4 'transferOut' @{hex='FC FC FC FC';status='ok';bytesWritten=4}),(E 5 'transferOut' @{hex='FE FE FE FE';status='ok';bytesWritten=4}))
Check 'Transport rejects empty evidence' {Assert (!(Test-TransportEvidence (Snapshot @()) 1).pass)}
Check 'Transport accepts open claim and successful FC FE' {Assert (Test-TransportEvidence (Snapshot $base) 1).pass}
Check 'TX started is not successful TX' {
    $e=@($base | Where-Object seq -ne 5)+(E 5 'transferOut' @{hex='FE FE FE FE';status='started';bytesWritten=0})
    Assert (!(Test-TransportEvidence (Snapshot $e) 1).pass)
}
Check 'Short write status=ok still fails' {
    $e=@($base | Where-Object seq -ne 5)+(E 5 'transferOut' @{hex='FE FE FE FE';status='ok';bytesWritten=2})
    Assert (!(Test-TransportEvidence (Snapshot $e) 1).pass)
}
Check 'FB requires successful FA' {Assert (!(Test-TransportEvidence (Snapshot ($base+(E 6 'parse FB'))) 1).pass)}
Check 'FA follow-up evidence' {
    $e=$base+(E 6 'parse FB')+(E 7 'transferOut' @{hex='FA FA FA FA';status='ok';bytesWritten=4})
    Assert (Test-TransportEvidence (Snapshot $e) 1).pass
}
Check 'Evicted log fails acceptance' {$s=Snapshot $base;$s.evictedEvents=1;Assert (!(Test-TransportEvidence $s 1).pass)}
Check 'Old generation cannot satisfy new connection' {Assert (!(Test-TransportEvidence (Snapshot $base) 2).pass)}
foreach($status in @('exception','stall','babble')){
    Check "Reject USB status $status" {Assert (!(Test-TransportEvidence (Snapshot ($base+(E 6 'transferIn' @{status=$status}))) 1).pass)}
}
$raw1=E 10 'transferIn' @{status='ok';actualBytes=5;hex='FE FE FE FE 00'}
$raw2=E 11 'transferIn' @{status='ok';actualBytes=3;hex='02 11 22'}
$frame=E 12 'parse FE' @{actualBytes=8;payloadBytes=2;hex='FE FE FE FE 00 02 11 22'}
Check 'Split raw RX proves one FE' {Assert (@(Get-ValidFrames (Snapshot @($raw1,$raw2,$frame))).Count -eq 1)}
Check 'Parser event without raw RX is rejected' {Must-Throw {Get-ValidFrames (Snapshot @($frame))}}
Check 'Wrong declared FE length is rejected' {
    $bad=E 12 'parse FE' @{actualBytes=8;payloadBytes=3;hex='FE FE FE FE 00 03 11 22'}
    Must-Throw {Get-ValidFrames (Snapshot @($raw1,$raw2,$bad))}
}
Check 'One RX record cannot prove two identical frames' {
    $duplicate=E 13 'parse FE' @{actualBytes=8;payloadBytes=2;hex='FE FE FE FE 00 02 11 22'}
    Must-Throw {Get-ValidFrames (Snapshot @($raw1,$raw2,$frame,$duplicate))}
}
Check 'Two identical raw frames are distinct captures' {
    $raw=E 13 'transferIn' @{status='ok';actualBytes=8;hex='FE FE FE FE 00 02 11 22'}
    $second=E 14 'parse FE' @{actualBytes=8;payloadBytes=2;hex='FE FE FE FE 00 02 11 22'}
    Assert (@(Get-ValidFrames (Snapshot @($raw1,$raw2,$frame,$raw,$second))).Count -eq 2)
    Assert (@(Get-ValidFrames (Snapshot @($raw1,$raw2,$frame,$raw,$second)) -AfterSeq 12).Count -eq 1)
}
Check 'Empty FE is not IR evidence' {
    $raw=E 10 'transferIn' @{status='ok';actualBytes=6;hex='FE FE FE FE 00 00'}
    $empty=E 11 'parse FE' @{actualBytes=6;payloadBytes=0;hex='FE FE FE FE 00 00'}
    Assert (@(Get-ValidFrames (Snapshot @($raw,$empty))).Count -eq 0)
}
Check 'Native process wrapper captures output and failure' {
    $temp=Join-Path ([IO.Path]::GetTempPath()) ('ir-harness-'+[guid]::NewGuid().ToString('N'))
    try{
        Initialize-Harness -AdbPath (Join-Path $PSHOME $(if($IsWindows){'pwsh.exe'}else{'pwsh'})) -OutputDirectory $temp
        $out=Invoke-Native -ArgumentList @('-NoProfile','-Command','[Console]::WriteLine("hello native")')
        Assert ($out -eq 'hello native')
        Must-Throw {Invoke-Native -ArgumentList @('-NoProfile','-Command','exit 7')}
        Must-Throw {Invoke-Native -ArgumentList @('-NoProfile','-Command','Start-Sleep -Seconds 5') -TimeoutSeconds 1}
    }finally{if(Test-Path $temp){Remove-Item -LiteralPath $temp -Recurse -Force}}
}
Check 'Wireless discovery uses TLS connect, caches identity and refuses ambiguity' {
    $temp=Join-Path ([IO.Path]::GetTempPath()) ('ir-discovery-'+[guid]::NewGuid().ToString('N'))
    try {
        Initialize-Harness -AdbPath (Join-Path $PSHOME $(if($IsWindows){'pwsh.exe'}else{'pwsh'})) -OutputDirectory $temp
        $module=Get-Module WebUsbHarness
        & $module {
            $script:MockTransports=@('172.25.65.11:40001')
            $script:MockCalls=[Collections.Generic.List[string]]::new()
            function script:Invoke-Native([string[]]$ArgumentList,[int]$TimeoutSeconds=25,[switch]$AllowFailure){
                $cmd=$ArgumentList -join ' ';$script:MockCalls.Add($cmd)
                if($cmd -eq 'devices -l'){return "List of devices attached`n"+(($script:MockTransports | ForEach-Object {"$_ device model:25069PTEBG"}) -join "`n")}
                if($cmd -eq 'mdns services'){return "adb-fixture _adb-tls-connect._tcp 172.25.65.11:40001`nadb-fixture _adb-tls-pairing._tcp 172.25.65.11:49999"}
                if($cmd -match 'getprop ro.serialno$'){if($ArgumentList[1] -eq '172.25.65.12:40002'){return 'OTHER-SERIAL'};return 'TEST-SERIAL'}
                if($cmd -match 'getprop ro.product.model$'){return '25069PTEBG'}
                if($cmd -match 'getprop ro.product.marketname$'){return 'Xiaomi 15T'}
                if($cmd -match 'getprop ro.product.manufacturer$'){return 'Xiaomi'}
                if($cmd -match 'getprop ro.build.version.release$'){return '15'}
                return ''
            }
        }
        $state=Join-Path $temp 'state.json'
        $id=Select-AndroidDevice -Address '172.25.65.11:35653' -StatePath $state -ModelPattern '25069PTEBG' -HardwareSerial ''
        Assert ($id.transport -eq '172.25.65.11:40001' -and $id.hardwareSerial -eq 'TEST-SERIAL')
        $calls=& $module { $script:MockCalls.ToArray() }
        Assert (@($calls | Where-Object {$_ -eq 'connect 172.25.65.11:40001'}).Count -eq 1)
        Assert (@($calls | Where-Object {$_ -eq 'connect 172.25.65.11:49999'}).Count -eq 0)
        & $module { $script:MockTransports=@('172.25.65.11:40001','172.25.65.12:40002') }
        $id=Select-AndroidDevice -Address '' -StatePath $state -ModelPattern '25069PTEBG' -HardwareSerial ''
        Assert ($id.hardwareSerial -eq 'TEST-SERIAL')
        Must-Throw {Select-AndroidDevice -Address '' -StatePath (Join-Path $temp 'no-state.json') -ModelPattern '25069PTEBG' -HardwareSerial ''}
    } finally {
        Import-Module (Join-Path $PSScriptRoot 'WebUsbHarness.psm1') -Force -DisableNameChecking
        if(Test-Path $temp){Remove-Item -LiteralPath $temp -Recurse -Force}
    }
}
Check 'Runner Smoke failure writes report and blocks USB tests' {
    $temp=Join-Path ([IO.Path]::GetTempPath()) ('ir-harness-failure-'+[guid]::NewGuid().ToString('N'))
    try{
        $null=& (Join-Path $PSHOME $(if($IsWindows){'pwsh.exe'}else{'pwsh'})) -NoProfile -File (Join-Path $PSScriptRoot 'Run-WebUsbTests.ps1') -Mode Smoke -AdbPath 'intentionally-nonexistent-adb-executable' -OutputRoot $temp 2>&1
        Assert ($LASTEXITCODE -eq 1) 'Expected exit code 1'
        $file=Get-ChildItem $temp -Filter report.json -Recurse | Select-Object -First 1
        $r=Get-Content -Raw $file.FullName | ConvertFrom-Json
        Assert (!$r.smokePassed -and !$r.automatedScopePassed)
        Assert (@($r.tests | Where-Object {$_.id -like 'USB-*' -and $_.status -eq 'PASS'}).Count -eq 0)
        Assert (@($r.tests | Where-Object {$_.id -eq 'SMOKE-ADB' -and $_.status -eq 'FAIL'}).Count -eq 1)
    }finally{if(Test-Path $temp){Remove-Item -LiteralPath $temp -Recurse -Force}}
}
Write-Host "`n$passed passed; $failures failed"
if($failures){exit 1}
exit 0
