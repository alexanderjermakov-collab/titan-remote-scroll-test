#requires -Version 7.2
[CmdletBinding()]
param([string]$AdbPath='adb',[string]$Address='172.25.65.11:35653',[string]$HardwareSerial='',
 [string]$UsbDeviceLabelPattern='(?i)(ELKSMART|Smart.?IR|IR.?Blaster)',
 [ValidateSet('Smoke','Protocol')][string]$Mode='Smoke',[string]$OutputRoot=(Join-Path $PSScriptRoot 'results'))
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'WebUsbHarness.psm1') -Force -DisableNameChecking
$runId=[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$out=Join-Path $OutputRoot $runId
[IO.Directory]::CreateDirectory($out)|Out-Null
$rows=[Collections.Generic.List[object]]::new();$socket=$null;$capture=$null;$identity=$null;$recovered=$false;$smoke=$false;$fatal=$null
function Result([string]$Id,[string]$Status,[string]$Evidence){$rows.Add([pscustomobject]@{id=$Id;status=$Status;evidence=$Evidence;timeUtc=[DateTime]::UtcNow.ToString('o')});Write-Host "$Id : $Status : $Evidence"}
function Require($Condition,[string]$Message){if(!$Condition){throw $Message}}
function Check-Session($Snapshot){
 $proof=Test-TransportEvidence $Snapshot $Snapshot.live.generation
 Require $proof.pass ($proof.issues -join '; ')
 $fc=@($Snapshot.events | Where-Object {$_.connectionGeneration -eq $Snapshot.live.generation -and $_.operation -eq 'parse FC'})
 Require ($fc.Count -gt 0) 'No full FC response in this generation; FB alone does not prove FC recognition'
 $ack=@($Snapshot.events | Where-Object {$_.connectionGeneration -eq $Snapshot.live.generation -and $_.operation -eq 'transferOut' -and (Get-EventValue $_ 'hex') -eq 'FA FA FA FA' -and (Get-EventValue $_ 'status') -eq 'ok' -and (Get-EventValue $_ 'bytesWritten') -eq 4})
 if(($fc[0].xy -join ',') -eq '112,1'){Require ($ack.Count -eq 1) 'FC7001 requires exactly one automatic FA in this attempt'}
 Require (@($Snapshot.events | Where-Object {$_.connectionGeneration -eq $Snapshot.live.generation -and $_.operation -eq 'reader start'}).Count -eq 1) 'Reader count is not one'
}
function Wait-Ready([string]$Name){
 $s=Wait-App $socket {param($s) $null -ne $s.live -and $s.live.ready -and !$s.live.failed -and @($s.events | Where-Object {$_.connectionGeneration -eq $s.live.generation -and $_.operation -eq 'transferOut' -and (Get-EventValue $_ 'hex') -eq 'FE FE FE FE' -and (Get-EventValue $_ 'status') -eq 'ok'}).Count -gt 0} -TimeoutSeconds 20 -Name $Name
 Check-Session $s
 return $s
}
function Operator([string]$Message){Write-Host "ИК-ОПЕРАТОР: $Message" -ForegroundColor Yellow;$null=Read-Host 'Enter — готовность; дождитесь команды НАЖМИТЕ/УДЕРЖИВАЙТЕ';foreach($n in 3..1){Write-Host "$n...";Start-Sleep -Seconds 1}}
function Press([string]$Name){
 $before=Get-AppSnapshot $socket "$Name-before";Require ($null -ne $before.live) 'No session'
 $baseline=[long](@($before.events | Sort-Object seq)[-1].seq)
 Write-Host 'НАЖМИТЕ ОДИН РАЗ' -ForegroundColor Yellow
 $s=Wait-App $socket {param($s) @((Get-ValidFrames $s -AfterSeq $baseline -Generation $before.live.generation)).Count -gt 0 -or $s.live.parser.phase -eq 'quarantine'} -TimeoutSeconds 14 -Name "$Name-after"
 Start-Sleep -Milliseconds 1300
 $s=Get-AppSnapshot $socket "$Name-final";Check-Session $s
 $frames=@(Get-ValidFrames $s -AfterSeq $baseline -Generation $before.live.generation)
 Require ($frames.Count -eq 1) "Expected one complete raw-backed FE, got $($frames.Count)"
 return $frames[0]
}
function Reconnect([string]$Name){
 $before=Get-AppSnapshot $socket "$Name-before"
 Tap-PageControl -Text 'Программно переподключить' -SearchUp
 $s=Wait-App $socket {param($s) $null -ne $s.live -and $s.live.generation -gt $before.live.generation -and $s.live.ready -and !$s.live.failed} -TimeoutSeconds 20 -Name "$Name-open"
 $s=Wait-Ready "$Name-ready"
 $old=@($s.events | Where-Object {$_.connectionGeneration -eq $before.live.generation})
 Require (@($old | Where-Object {$_.operation -eq 'close' -and (Get-EventValue $_ 'status') -eq 'ok'}).Count -gt 0) 'No successful close of old session'
 $boundary=$old | Where-Object operation -eq 'disconnect' | Select-Object -Last 1
 Require (@($old | Where-Object {$_.seq -gt $boundary.seq -and $_.operation -in @('transferIn','transferOut','reader start')}).Count -eq 0) 'Old-generation USB operations after close'
 return $before
}
try{
 Initialize-Harness $AdbPath $out
 $identity=Select-AndroidDevice $Address (Join-Path $PSScriptRoot 'device-state.json') '(?i)(Xiaomi\s*15T\b(?!\s*Pro)|25069PTEBG)' $HardwareSerial
 $capture=Start-Logcat
 $url='https://alexanderjermakov-collab.github.io/titan-remote-scroll-test/android-webusb-ir-test/v1.0.1/?adbRun='+$runId
 Open-TestChrome $url;$socket=Open-CdpTarget $url
 $before=Get-AppSnapshot $socket 'smoke-before';$seq=[long](@($before.events | Sort-Object seq)[-1].seq)
 Require ($before.environment.isSecureContext -and $before.environment.webUSB -and $before.environment.url -eq $url) 'Wrong URL / HTTPS / API'
 Tap-PageControl -Text 'Очистить журнал'
 $null=Wait-App $socket {param($s) @($s.events | Where-Object {$_.operation -eq 'log cleared' -and $_.seq -gt $seq}).Count -eq 1} -Name 'smoke-after'
 Save-Screenshot 'smoke';$smoke=$true;Result 'SMOKE' 'PASS' 'device.json; smoke-after.json; smoke.png; ADB tap confirmed'
 if($Mode -eq 'Protocol'){
  Tap-PageControl -Text 'Подключить USB IR Blaster' -SearchUp
  Confirm-UsbDialogs $UsbDeviceLabelPattern
  $null=Wait-Ready 'initial-ready';Result 'FC-HANDSHAKE' 'PASS' 'initial-ready.json'
  foreach($i in 0..10){
   $name=if($i -eq 0){'single'}else{"repeat-$i"}
   Operator "По команде нажмите кнопку один раз ($name)."
   try{$f=Press $name;Result $name 'PASS' "$name-final.json; FE seq=$($f.seq)"}
   catch{
    Result $name 'FAIL' $_.Exception.Message
    $old=Reconnect "recovery-$name"
    Operator 'После программного переподключения: одно нажатие для проверки восстановления.'
    $f=Press "recovery-$name-ir"
    $afterError=$old.live.parser.phase -eq 'quarantine'
    if($afterError){$script:recovered=$true;Result "recovery-$name" 'PASS' "Real quarantine -> successful close/open -> raw-backed FE seq=$($f.seq)"}
    else{Result "recovery-$name" 'PASS' "Transport reopened and captured FE; no assembly error was reproduced, not a timeout recovery proof"}
   }
  }
  $s=Get-AppSnapshot $socket 'continuous';Check-Session $s
  $frames=@(Get-ValidFrames $s -Generation $s.live.generation)
  Require ($frames.Count -ge 11) 'Not 11 consecutive complete captures in the current generation'
  $localEvents=@($s.events | Where-Object {$_.connectionGeneration -eq $s.live.generation})
  foreach($f in $frames){$next=@($localEvents | Where-Object {$_.seq -gt $f.seq -and $_.operation -eq 'transferOut' -and (Get-EventValue $_ 'hex') -eq 'FE FE FE FE' -and (Get-EventValue $_ 'status') -eq 'ok' -and (Get-EventValue $_ 'bytesWritten') -eq 4});Require ($next.Count -gt 0) 'Missing automatic rearm'}
  Result 'CONTINUOUS' 'PASS' 'continuous.json; >=11 FE in one generation; automatic rearm and single reader'
  Operator 'По команде удерживайте кнопку 2 секунды.'
  $b=Get-AppSnapshot $socket 'hold-before';$seq=[long](@($b.events | Sort-Object seq)[-1].seq)
  Write-Host 'УДЕРЖИВАЙТЕ';Start-Sleep -Seconds 2;Write-Host 'ОТПУСТИТЕ';Start-Sleep -Seconds 3
  $s=Get-AppSnapshot $socket 'hold-after';Check-Session $s
  Require (@(Get-ValidFrames $s -AfterSeq $seq -Generation $b.live.generation).Count -ge 2) 'Less than two complete frames in hold window'
  Result 'HOLD' 'PASS' 'hold-after.json; no repeat-code decoding claim'
  foreach($i in 1..3){$null=Reconnect "reopen-$i";Operator "Программное переподключение $i/3 — одно нажатие.";$f=Press "reopen-$i-ir";Result "REOPEN-$i" 'PASS' "reopen-$i-ir-final.json; FE seq=$($f.seq)"}
 }
 $snapshot=Get-AppSnapshot $socket 'before-export';$export=Receive-ExportedLog $socket
 Require ($export.environment.url -eq $url) 'Export from another run'
 foreach($e in $snapshot.events){$same=@($export.events | Where-Object seq -eq $e.seq);Require ($same.Count -eq 1) 'Missing exported event';Require (($same[0] | ConvertTo-Json -Compress -Depth 30) -eq ($e | ConvertTo-Json -Compress -Depth 30)) 'Changed exported event'}
 Result 'EXPORT' 'PASS' 'downloaded-app-log.json matches snapshot'
}catch{$fatal=$_.Exception.Message;Result 'RUN' 'FAIL' $fatal}
finally{
 try{if($socket){$s=Get-AppSnapshot $socket 'final';Save-Screenshot 'final';if($s.live){Tap-PageControl -Text 'Отключить' -SearchUp}}}catch{}
 try{if($identity){Save-SystemEvidence}}catch{}
 try{Stop-Logcat $capture}catch{}
 try{Close-Harness}catch{}
 if(!$recovered){Result 'RECOVERY-AFTER-ASSEMBLY-ERROR' 'BLOCKED' 'No new real assembly-error recovery established; synthetic proof is insufficient'}
 $allPassed=@($rows | Where-Object status -eq 'FAIL').Count -eq 0
 $acceptance=$Mode -eq 'Protocol' -and $allPassed -and $recovered
 @{version='1.0.1';mode=$Mode;smokePassed=$smoke;hardwareAcceptanceConfirmed=$acceptance;recoveryAfterAssemblyErrorConfirmed=$recovered;fatal=$fatal;tests=$rows.ToArray()} | ConvertTo-Json -Depth 30 | Set-Content (Join-Path $out 'report.json') -Encoding utf8
 $lines=@('# WebUSB v1.0.1 аппаратный прогон','',"Mode: $Mode", "Hardware acceptance: $acceptance",'','| Test | Status | Evidence |','|---|---|---|')
 foreach($r in $rows){$lines+="| $($r.id) | $($r.status) | $($r.evidence.Replace('|','/').Replace("`n",' ')) |"}
 $lines | Set-Content (Join-Path $out 'report.md') -Encoding utf8
 Write-Host "Результаты: $out"
}
if($fatal -or !$allPassed){exit 1}
exit 0
