#requires -Version 7.2
[CmdletBinding()]
param(
    [ValidateSet('Smoke','Suite')][string]$Mode='Smoke',
    [string]$AdbPath='adb',
    [string]$Address='172.25.65.11:35653',
    [string]$HardwareSerial='',
    [string]$ExpectedModelPattern='(?i)(Xiaomi\s*15T\b(?!\s*Pro)|25069PTEBG)',
    [string]$UsbDeviceLabelPattern='(?i)(IR.?Blaster|Smart.?IR)',
    [string]$OutputRoot=(Join-Path $PSScriptRoot 'results'),
    [string]$StatePath=(Join-Path $PSScriptRoot 'device-state.json'),
    [string]$PageUrl='https://alexanderjermakov-collab.github.io/titan-remote-scroll-test/android-webusb-ir-test/'
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'WebUsbHarness.psm1') -Force -DisableNameChecking
$runId=[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')+'-'+([guid]::NewGuid().ToString('N').Substring(0,6))
$runDirectory=Join-Path ([IO.Path]::GetFullPath($OutputRoot)) $runId
[IO.Directory]::CreateDirectory($runDirectory) | Out-Null
$results=[Collections.Generic.List[object]]::new()
$names=@('SMOKE-ADB','SMOKE-CHROME','SMOKE-UI','USB-CONNECT','IR-SINGLE','IR-REPEATED-10','IR-CONTINUOUS','IR-HOLD','USB-SESSION-RECONNECT-3','JSON-EXPORT','USB-PHYSICAL-RECONNECT')
foreach($name in $names){$results.Add([pscustomobject]@{id=$name;status='BLOCKED';reason='Not reached; prerequisite not passed';evidence=@();startUtc=$null;endUtc=$null})}
$script:socket=$null;$capture=$null;$identity=$null;$fatal=$null;$script:smokePassed=$false
function Invoke-Test([string]$Id,[scriptblock]$Body) {
    $row=$results | Where-Object id -eq $Id
    $row.startUtc=[DateTime]::UtcNow.ToString('o')
    Write-Host "`n[$Id]" -ForegroundColor Cyan
    try {
        $details=&$Body
        $row.status='PASS';$row.reason='Evidence checks passed';$row.evidence=@($details)
        Write-Host 'PASS' -ForegroundColor Green
        return $true
    } catch {
        $row.status='FAIL';$row.reason=$_.Exception.Message
        Write-Warning "$Id FAIL: $($row.reason)"
        try {Save-Screenshot -Name "$Id-failure"}catch{}
        return $false
    } finally {$row.endUtc=[DateTime]::UtcNow.ToString('o')}
}
function Assert-Test([bool]$Condition,[string]$Message){if(!$Condition){throw $Message}}
function Require-Transport($Snapshot,[int]$Generation){
    $proof=Test-TransportEvidence -Snapshot $Snapshot -Generation $Generation
    Assert-Test $proof.pass ($proof.issues -join '; ')
}
function Connect-Blaster([string]$Name){
    Tap-PageControl -Text 'Подключить USB IR Blaster' -SearchUp
    Confirm-UsbDialogs -DeviceLabelPattern $UsbDeviceLabelPattern
    $s=Wait-App -SocketUrl $script:socket -Name $Name -TimeoutSeconds 15 -Condition {
        param($s) $null -ne $s.live -and $s.live.ready -and !$s.live.failed -and
        @($s.events | Where-Object {$_.connectionGeneration -eq $s.live.generation -and $_.operation -eq 'transferOut' -and (Get-EventValue $_ 'hex') -eq 'FE FE FE FE' -and (Get-EventValue $_ 'status') -eq 'ok' -and (Get-EventValue $_ 'bytesWritten') -eq 4}).Count -gt 0
    }
    Require-Transport $s $s.live.generation
    return $s
}
function Start-OperatorWindow([string]$Instruction){
    Write-Host "`nОПЕРАТОР: $Instruction" -ForegroundColor Yellow
    $null=Read-Host 'Направьте пульт на приёмник. Enter — начать отсчёт (кнопку пульта пока не нажимать)'
    foreach($n in 3..1){Write-Host "$n...";Start-Sleep -Seconds 1}
}
function Capture-One([string]$Name){
    $before=Get-AppSnapshot -SocketUrl $script:socket -Name "$Name-before"
    Assert-Test ($null -ne $before.live -and !$before.live.failed) 'USB session not healthy'
    $lastSeq=[long](@($before.events | Sort-Object seq)[-1].seq)
    Write-Host 'НАЖМИТЕ ОДИН РАЗ' -ForegroundColor Yellow
    $s=Wait-App -SocketUrl $script:socket -Name "$Name-after" -TimeoutSeconds 9 -Condition {
        param($snapshot) @(Get-ValidFrames -Snapshot $snapshot -AfterSeq $lastSeq -Generation $before.live.generation).Count -ge 1
    }
    # Allow the rearm timer and any unintended extra captures to become observable.
    Start-Sleep -Milliseconds 1300
    $s=Get-AppSnapshot -SocketUrl $script:socket -Name "$Name-final"
    Require-Transport $s $before.live.generation
    $frames=@(Get-ValidFrames -Snapshot $s -AfterSeq $lastSeq -Generation $before.live.generation)
    Assert-Test ($frames.Count -eq 1) "Expected exactly one FE, got $($frames.Count); duplicates or extra presses are not silently accepted"
    return $frames[0]
}
try {
    $ok=Invoke-Test 'SMOKE-ADB' {
        Initialize-Harness -AdbPath $AdbPath -OutputDirectory $runDirectory
        $script:identity=Select-AndroidDevice -Address $Address -StatePath $StatePath -ModelPattern $ExpectedModelPattern -HardwareSerial $HardwareSerial
        Assert-Test ((Invoke-Adb -ArgumentList @('get-state')) -eq 'device') 'ADB state is not device'
        Save-Screenshot '01-adb'
        "device.json; adb.jsonl; selected $($script:identity.transport)"
    }
    if(!$ok){throw 'Smoke ADB failed; all hardware tests blocked'}
    $capture=Start-Logcat
    Start-Sleep -Milliseconds 300
    if($capture.process.HasExited){throw 'Logcat exited early; inspect logcat-stderr.txt'}
    $runUrl=$PageUrl+'?adbRun='+$runId
    $ok=Invoke-Test 'SMOKE-CHROME' {
        Assert-Test ($PageUrl -match '^https://[A-Za-z0-9.-]+/[A-Za-z0-9_./-]+/$') 'A clean HTTPS page URL without shell metacharacters is required'
        Open-TestChrome -Url $runUrl
        $script:socket=Open-CdpTarget -RunUrl $runUrl
        $s=Get-AppSnapshot -SocketUrl $script:socket -Name 'smoke-chrome'
        Assert-Test ($s.environment.url -eq $runUrl -and $s.environment.isSecureContext -and $s.environment.webUSB) 'Exact test page, secure context or WebUSB missing'
        $ui=Read-AndroidUi
        $ui.Save((Join-Path $runDirectory 'smoke-ui.xml'))
        Save-Screenshot '02-chrome'
        'smoke-chrome.json; smoke-ui.xml; 02-chrome.png'
    }
    if(!$ok){throw 'Smoke Chrome failed; all USB tests blocked'}
    $ok=Invoke-Test 'SMOKE-UI' {
        $before=Get-AppSnapshot -SocketUrl $script:socket -Name 'smoke-ui-before'
        $maxSeq=[long](@($before.events | Sort-Object seq)[-1].seq)
        Tap-PageControl -Text 'Очистить журнал'
        $s=Wait-App -SocketUrl $script:socket -Name 'smoke-ui-after' -Condition {
            param($s) @($s.events | Where-Object {$_.operation -eq 'log cleared' -and $_.seq -gt $maxSeq}).Count -eq 1
        }
        Assert-Test ($null -eq $s.live) 'Smoke unexpectedly opened a USB session'
        Save-Screenshot '03-ui-tap'
        'smoke-ui-before.json; smoke-ui-after.json; 03-ui-tap.png; ADB tap confirmed by log cleared event'
    }
    if(!$ok){throw 'Smoke UI failed; all USB tests blocked'}
    $script:smokePassed=$true
    if($Mode -eq 'Suite') {
        $ok=Invoke-Test 'USB-CONNECT' {
            $s=Connect-Blaster 'usb-connect'
            Save-Screenshot '04-usb'
            "usb-connect.json; generation=$($s.live.generation); open, claim, FC/FE and conditional FA verified"
        }
        if(!$ok){throw 'USB connection evidence failed'}
        $ok=Invoke-Test 'IR-SINGLE' {
            Start-OperatorWindow 'После команды на экране нажмите кнопку ИК-пульта один раз.'
            $f=Capture-One 'ir-single'
            "ir-single-final.json; FE seq=$($f.seq), generation=$($f.connectionGeneration)"
        }
        if(!$ok){throw 'Single IR capture failed'}
        $ok=Invoke-Test 'IR-REPEATED-10' {
            Start-OperatorWindow 'Сделайте десять одиночных нажатий — только по очередным командам НАЖМИТЕ ОДИН РАЗ.'
            $captured=[Collections.Generic.List[long]]::new()
            for($i=1;$i -le 10;$i++){Write-Host "Нажатие $i / 10";$f=Capture-One ('ir-repeat-{0:d2}' -f $i);$captured.Add([long]$f.seq)}
            Assert-Test (@($captured | Sort-Object -Unique).Count -eq 10) 'Not ten distinct records'
            "Ten distinct FE seq: $($captured -join ', '); see ir-repeat-*-final.json"
        }
        if(!$ok){throw 'Repeated capture failed'}
        $ok=Invoke-Test 'IR-CONTINUOUS' {
            $s=Get-AppSnapshot -SocketUrl $script:socket -Name 'continuous'
            Require-Transport $s $s.live.generation
            $ev=@($s.events | Where-Object {$_.connectionGeneration -eq $s.live.generation})
            Assert-Test (@($ev | Where-Object operation -eq 'reader start').Count -eq 1) 'Reader count is not one'
            $frames=@(Get-ValidFrames -Snapshot $s -Generation $s.live.generation)
            Assert-Test ($frames.Count -ge 11) 'Insufficient captures in a single session'
            foreach($f in $frames){
                $next=$ev | Where-Object {$_.seq -gt $f.seq -and $_.operation -eq 'transferOut' -and (Get-EventValue $_ 'hex') -eq 'FE FE FE FE' -and (Get-EventValue $_ 'status') -eq 'ok' -and (Get-EventValue $_ 'bytesWritten') -eq 4} | Select-Object -First 1
                Assert-Test ($null -ne $next) "Missing automatic FE after frame seq=$($f.seq)"
                Assert-Test (($next.elapsedMs-$f.elapsedMs) -ge 45) 'Rearm unexpectedly earlier than nominal 60ms (45ms tolerance)'
            }
            'continuous.json; >=11 raw-RX-backed records; one reader; successful rearming after every FE'
        }
        if(!$ok){throw 'Continuous receive evidence failed'}
        $ok=Invoke-Test 'IR-HOLD' {
            Start-OperatorWindow 'После команды удерживайте кнопку пульта примерно 2 секунды, затем отпустите.'
            $before=Get-AppSnapshot -SocketUrl $script:socket -Name 'hold-before'
            $lastSeq=[long](@($before.events | Sort-Object seq)[-1].seq)
            Write-Host 'УДЕРЖИВАЙТЕ 2 СЕКУНДЫ' -ForegroundColor Yellow
            Start-Sleep -Seconds 2
            Write-Host 'ОТПУСТИТЕ' -ForegroundColor Yellow
            Start-Sleep -Seconds 3
            $s=Get-AppSnapshot -SocketUrl $script:socket -Name 'hold-after'
            Require-Transport $s $before.live.generation
            $frames=@(Get-ValidFrames -Snapshot $s -AfterSeq $lastSeq -Generation $before.live.generation)
            Assert-Test ($frames.Count -ge 2) "Expected >=2 complete records during/after hold, got $($frames.Count). Not a protocol decode."
            "hold-after.json; complete captures=$($frames.Count); operator timing only"
        }
        if(!$ok){throw 'Hold capture failed'}
        $ok=Invoke-Test 'USB-SESSION-RECONNECT-3' {
            $generations=[Collections.Generic.List[int]]::new()
            for($i=1;$i -le 3;$i++) {
                $before=Get-AppSnapshot -SocketUrl $script:socket -Name "reconnect-$i-before"
                Tap-PageControl -Text 'Отключить' -SearchUp
                $null=Wait-App -SocketUrl $script:socket -Name "reconnect-$i-closed" -Condition {param($s) $null -eq $s.live}
                $s=Connect-Blaster "reconnect-$i-open"
                Assert-Test ($s.live.generation -gt $before.live.generation) 'Generation did not increase'
                $generations.Add([int]$s.live.generation)
                Start-OperatorWindow "Переподключение $i / 3. По команде нажмите кнопку пульта один раз."
                $f=Capture-One "reconnect-$i-ir"
                $check=Get-AppSnapshot -SocketUrl $script:socket -Name "reconnect-$i-evidence"
                $oldEvents=@($check.events | Where-Object {$_.connectionGeneration -eq $before.live.generation})
                $closing=$oldEvents | Where-Object {$_.operation -eq 'disconnect' -and (Get-EventValue $_ 'status') -eq 'started'} | Select-Object -Last 1
                Assert-Test ($null -ne $closing) 'Missing close boundary'
                Assert-Test (@($oldEvents | Where-Object {$_.seq -gt $closing.seq -and $_.operation -in @('transferIn','transferOut','reader start')}).Count -eq 0) 'Stale USB operations after close'
                Assert-Test (@($check.events | Where-Object {$_.connectionGeneration -eq $s.live.generation -and $_.operation -eq 'reader start'}).Count -eq 1) 'Duplicate reader after reconnect'
            }
            "Three session generations: $($generations -join ', '); reconnect-*-evidence.json"
        }
        if(!$ok){throw 'Session reconnect failed'}
    }
    $ok=Invoke-Test 'JSON-EXPORT' {
        $snapshot=Get-AppSnapshot -SocketUrl $script:socket -Name 'before-export'
        $download=Receive-ExportedLog -SocketUrl $script:socket
        Assert-Test ($download.environment.url -eq $runUrl) 'Export belongs to a different run'
        foreach($event in $snapshot.events){
            $matching=@($download.events | Where-Object {$_.seq -eq $event.seq})
            Assert-Test ($matching.Count -eq 1) "Missing/duplicate exported seq=$($event.seq)"
            Assert-Test (($matching[0] | ConvertTo-Json -Depth 30 -Compress) -eq ($event | ConvertTo-Json -Depth 30 -Compress)) "Export content mismatch seq=$($event.seq)"
        }
        $null=@(Get-ValidFrames -Snapshot $download)
        Save-Screenshot '05-export'
        'downloaded-app-log.json; before-export.json; exact snapshot event content retained'
    }
    if(!$ok){throw 'JSON export failed'}
} catch {
    $fatal=$_.Exception.Message
    Write-Warning $fatal
} finally {
    try {if($script:socket){$null=Get-AppSnapshot -SocketUrl $script:socket -Name 'final-app'}}catch{}
    try {if($identity){Save-Screenshot 'final';Save-SystemEvidence}}catch{Write-Warning $_}
    # Close only the test session via its existing UI; never force-stop Chrome/ADB globally.
    try {if($script:socket){$s=Get-AppSnapshot -SocketUrl $script:socket -Name 'pre-cleanup';if($s.live){Tap-PageControl -Text 'Отключить' -SearchUp}}}catch{Write-Warning "Session cleanup: $_"}
    try {Stop-Logcat $capture}catch{Write-Warning "Logcat cleanup: $_"}
    try {Close-Harness}catch{Write-Warning "Forward cleanup: $_"}
    foreach($row in $results){
        if($row.status -eq 'BLOCKED'){
            if($row.id -eq 'USB-PHYSICAL-RECONNECT'){$row.reason='Requires a programmable USB hub. Logical session reconnect does not prove physical re-enumeration.'}
            elseif($Mode -eq 'Smoke' -and $row.id -notmatch '^SMOKE-|JSON-EXPORT'){$row.reason='Not requested in Smoke mode'}
            elseif($fatal){$row.reason="Prerequisite failed: $fatal"}
        }
    }
    $selected=@($results | Where-Object {$_.id -ne 'USB-PHYSICAL-RECONNECT' -and ($Mode -eq 'Suite' -or $_.id -match '^SMOKE-|JSON-EXPORT')})
    $success=@($selected | Where-Object status -ne 'PASS').Count -eq 0
    $report=[ordered]@{schema='webusb-adb-test-report/1';runId=$runId;mode=$Mode;finishedUtc=[DateTime]::UtcNow.ToString('o');smokePassed=$script:smokePassed;automatedScopePassed=$success;physicalReconnectConfirmed=$false;hardwareAcceptanceConfirmed=$false;fatal=$fatal;tests=@($results);limitations=@('Operator actions are not electronically verified; IR correlation is temporal.','Session reconnect is not physical USB re-enumeration.','ADB/CDP and native dialogs require validation on Xiaomi 15T Windows environment.');artifactsDirectory=$runDirectory}
    $report | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $runDirectory 'report.json') -Encoding utf8
    $lines=@('# WebUSB ADB test report',"Run: $runId · mode: $Mode",'',"Smoke passed: $script:smokePassed", "Automated scope passed: $success",'', '| Test | Status | Evidence / reason |','|---|---|---|')
    foreach($row in $results){$detail=($row.reason+' '+($row.evidence -join '; ')).Replace('|','/').Replace("`n",' ');$lines+="| $($row.id) | $($row.status) | $detail |"}
    $lines+=@('','Physical reconnection is BLOCKED without a programmable hub. No overall hardware acceptance is claimed.','Artifacts include screenshots, UI XML, ADB command log, Logcat, app JSON snapshots and the exported JSON where successful.')
    $lines | Set-Content -LiteralPath (Join-Path $runDirectory 'report.md') -Encoding utf8
    Write-Host "`nОтчёт: $(Join-Path $runDirectory 'report.md')"
}
if(!$success){exit 1}
exit 0
