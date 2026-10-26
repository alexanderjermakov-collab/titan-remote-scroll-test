# Requires PowerShell 7.2+. No Android settings, app package or USB protocol changes.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:Adb = $null
$script:Device = $null
$script:Out = $null
$script:UiNumber = 0
$script:CdpPort = $null

function Initialize-Harness([string]$AdbPath, [string]$OutputDirectory) {
    $script:Adb = (Get-Command $AdbPath -ErrorAction Stop).Source
    $script:Out = [IO.Path]::GetFullPath($OutputDirectory)
    [IO.Directory]::CreateDirectory($script:Out) | Out-Null
}
function Invoke-Native([string[]]$ArgumentList, [int]$TimeoutSeconds = 25, [switch]$AllowFailure) {
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $script:Adb
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = [Text.Encoding]::UTF8
    $info.StandardErrorEncoding = [Text.Encoding]::UTF8
    foreach ($item in $ArgumentList) { $info.ArgumentList.Add($item) }
    $p = [Diagnostics.Process]::new(); $p.StartInfo = $info
    try {
        $null = $p.Start()
        $outTask = $p.StandardOutput.ReadToEndAsync(); $errTask = $p.StandardError.ReadToEndAsync()
        if (!$p.WaitForExit($TimeoutSeconds * 1000)) { $p.Kill($true); throw "ADB timeout: $($ArgumentList -join ' ')" }
        $stdout = $outTask.GetAwaiter().GetResult(); $stderr = $errTask.GetAwaiter().GetResult()
        $record = @{timeUtc=[DateTime]::UtcNow.ToString('o');args=$ArgumentList;exitCode=$p.ExitCode;stdout=$stdout;stderr=$stderr}
        ($record | ConvertTo-Json -Compress -Depth 10) | Add-Content -LiteralPath (Join-Path $script:Out 'adb.jsonl') -Encoding utf8
        if ($p.ExitCode -ne 0 -and !$AllowFailure) { throw "ADB failed ($($p.ExitCode)): $stderr $stdout" }
        return $stdout.Trim()
    } finally { $p.Dispose() }
}
function Invoke-Adb([string[]]$ArgumentList, [int]$TimeoutSeconds = 25, [switch]$AllowFailure) {
    if (!$script:Device) { throw 'ADB target not selected' }
    Invoke-Native -ArgumentList (@('-s', $script:Device) + $ArgumentList) -TimeoutSeconds $TimeoutSeconds -AllowFailure:$AllowFailure
}
function Read-ConnectedDevices {
    $lines = (Invoke-Native -ArgumentList @('devices','-l')) -split '\r?\n'
    foreach ($line in $lines) {
        if ($line -match '^(\S+)\s+device(?:\s|$)') { $Matches[1] }
    }
}
function Select-AndroidDevice([string]$Address, [string]$StatePath, [string]$ModelPattern, [string]$HardwareSerial) {
    $null = Invoke-Native -ArgumentList @('start-server')
    $saved = $null
    if (Test-Path -LiteralPath $StatePath) { $saved = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json }
    if (!$HardwareSerial -and $saved) { $HardwareSerial = $saved.hardwareSerial }
    # Connect only advertised TLS-connect services; never scan a subnet or use a pairing port.
    if ($Address) { $null = Invoke-Native -ArgumentList @('connect',$Address) -AllowFailure }
    $mdns = Invoke-Native -ArgumentList @('mdns','services') -AllowFailure
    for($retry=0;$retry -lt 3 -and $mdns -notmatch '_adb-tls-connect\._tcp';$retry++){Start-Sleep -Seconds 2;$mdns=Invoke-Native -ArgumentList @('mdns','services') -AllowFailure}
    $mdns | Set-Content -LiteralPath (Join-Path $script:Out 'mdns.txt') -Encoding utf8
    $endpoints = @($mdns -split '\r?\n' | ForEach-Object {
        if ($_ -match '^\S+\s+_adb-tls-connect\._tcp\.?\s+(\S+:\d+)') { $Matches[1] }
    } | Sort-Object -Unique)
    foreach ($endpoint in $endpoints) { $null = Invoke-Native -ArgumentList @('connect',$endpoint) -AllowFailure }
    $matchesBySerial = @{}
    foreach ($transport in @(Read-ConnectedDevices)) {
        # Wireless transports only. Every subsequent operation is explicitly addressed with -s.
        if ($transport -notmatch ':\d+$|_adb-tls-connect\._tcp\.?$') { continue }
        $script:Device = $transport
        try {
            $serial = Invoke-Adb -ArgumentList @('shell','getprop','ro.serialno')
            if (!$serial) { $serial = Invoke-Adb -ArgumentList @('shell','getprop','ro.boot.serialno') }
            $model = Invoke-Adb -ArgumentList @('shell','getprop','ro.product.model')
            $market = Invoke-Adb -ArgumentList @('shell','getprop','ro.product.marketname')
            $manufacturer = Invoke-Adb -ArgumentList @('shell','getprop','ro.product.manufacturer')
            if (!$serial) { continue }
            if ($HardwareSerial -and $serial -ne $HardwareSerial) { continue }
            if ("$model $market" -notmatch $ModelPattern -or $manufacturer -notmatch '(?i)xiaomi') { continue }
            if (!$matchesBySerial.ContainsKey($serial) -or $transport -eq $Address) {
                $matchesBySerial[$serial] = @{transport=$transport;hardwareSerial=$serial;model=$model;marketName=$market;manufacturer=$manufacturer}
            }
        } catch { Write-Warning "Cannot identify $transport`: $_" }
    }
    $script:Device = $null
    if ($matchesBySerial.Count -ne 1) { throw "Expected exactly one matching paired Xiaomi, found $($matchesBySerial.Count). Check Wireless ADB/mDNS or specify -HardwareSerial. No phone UI actions performed." }
    $identity = @($matchesBySerial.Values)[0]
    $script:Device = $identity.transport
    $identity.android = Invoke-Adb -ArgumentList @('shell','getprop','ro.build.version.release')
    $identity.chrome = Invoke-Adb -ArgumentList @('shell','dumpsys','package','com.android.chrome')
    $identity | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $script:Out 'device.json') -Encoding utf8
    # Persist stable identity, not a fixed TCP port.
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($StatePath))) | Out-Null
    @{hardwareSerial=$identity.hardwareSerial;model=$identity.model;lastAddress=$identity.transport} | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
    return $identity
}
function Save-Screenshot([string]$Name) {
    $remote = '/sdcard/Download/webusb-harness-screen.png'
    $null = Invoke-Adb -ArgumentList @('shell','screencap','-p',$remote)
    $null = Invoke-Adb -ArgumentList @('pull',$remote,(Join-Path $script:Out "$Name.png"))
    $null = Invoke-Adb -ArgumentList @('shell','rm',$remote) -AllowFailure
}
function Read-AndroidUi {
    $script:UiNumber++
    $remote = '/sdcard/Download/webusb-harness-ui.xml'
    $null = Invoke-Adb -ArgumentList @('shell','uiautomator','dump',$remote)
    $local = Join-Path $script:Out ('ui-{0:d4}.xml' -f $script:UiNumber)
    $null = Invoke-Adb -ArgumentList @('pull',$remote,$local)
    $null = Invoke-Adb -ArgumentList @('shell','rm',$remote) -AllowFailure
    return [xml](Get-Content -Raw -LiteralPath $local)
}
function Tap-UiNode($Node) {
    if ($Node.GetAttribute('bounds') -notmatch '^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$') { throw 'UI node has no usable bounds' }
    $x = [int](([int]$Matches[1]+[int]$Matches[3])/2)
    $y = [int](([int]$Matches[2]+[int]$Matches[4])/2)
    if ($Node.GetAttribute('enabled') -eq 'false') { throw 'Refusing to tap disabled UI control' }
    $null = Invoke-Adb -ArgumentList @('shell','input','tap',"$x","$y")
}
function Invoke-Swipe([switch]$Down) {
    $size = Invoke-Adb -ArgumentList @('shell','wm','size')
    $all = [regex]::Matches($size,'(\d+)x(\d+)')
    if (!$all.Count) { throw 'Cannot determine display dimensions' }
    $w=[int]$all[-1].Groups[1].Value; $h=[int]$all[-1].Groups[2].Value
    $a=[int]($h*.78);$b=[int]($h*.32);if($Down){$a=[int]($h*.32);$b=[int]($h*.78)}
    $null=Invoke-Adb -ArgumentList @('shell','input','swipe',"$([int]($w/2))","$a","$([int]($w/2))","$b",'350')
}
function Tap-PageControl([string]$Text, [switch]$SearchUp) {
    for($attempt=0;$attempt -lt 9;$attempt++) {
        $ui=Read-AndroidUi
        $nodes=@($ui.SelectNodes('//node') | Where-Object {
            ($_.GetAttribute('text') -eq $Text -or $_.GetAttribute('content-desc') -eq $Text) -and
            $_.GetAttribute('package') -eq 'com.android.chrome' -and $_.GetAttribute('enabled') -ne 'false'
        })
        if($nodes.Count -gt 1){throw "Ambiguous UI control: $Text"}
        if($nodes.Count -eq 1){Tap-UiNode $nodes[0];return}
        Invoke-Swipe -Down:$SearchUp
    }
    throw "Page control unavailable: $Text (see UI XML/screenshots); no guessed coordinates used"
}
function Confirm-UsbDialogs([string]$DeviceLabelPattern) {
    # Only ordinary USB access dialogs caused by the explicit Connect action.
    for($attempt=0;$attempt -lt 12;$attempt++) {
        Start-Sleep -Milliseconds 500
        $ui=Read-AndroidUi
        $nodes=@($ui.SelectNodes('//node'))
        $text=($nodes | ForEach-Object { $_.GetAttribute('text') }) -join ' '
        if($text -match 'waiting for IR|FE отправлена|Интерфейс открыт'){return}
        $deviceRows=@($nodes | Where-Object {
            $_.GetAttribute('package') -eq 'com.android.chrome' -and
            $_.GetAttribute('text') -match $DeviceLabelPattern -and $_.GetAttribute('class') -eq 'android.widget.TextView' -and $_.GetAttribute('text') -notmatch 'Подключить|Test|PoC|тест'
        })
        # Use fresh XML after each action; no stale-coordinate follow-up.
        $buttons=@($nodes | Where-Object {
            $_.GetAttribute('package') -match '^(com\.android\.chrome|com\.android\.permissioncontroller|com\.google\.android\.permissioncontroller|com\.android\.systemui|com\.miui\.securitycenter)$' -and
            $_.GetAttribute('enabled') -eq 'true' -and
            $_.GetAttribute('text') -match '^(Connect|Подключить|Pripojiť|Allow|Разрешить|Povoliť|OK|ОК)$'
        })
        if($text -match '(?i)(USB|IR.?Blaster|Smart.?IR)' -and $buttons.Count -eq 1){Tap-UiNode $buttons[0];continue}
        if($text -match '(?i)(USB|устройств|device|zariaden)' -and $deviceRows.Count -eq 1){Tap-UiNode $deviceRows[0]}
        # Unknown dialogs are preserved, never dismissed by blind taps.
    }
}
function Open-TestChrome([string]$Url) {
    $null=Invoke-Adb -ArgumentList @('shell','input','keyevent','KEYCODE_WAKEUP')
    $null=Invoke-Adb -ArgumentList @('shell','am','start','-W','-a','android.intent.action.VIEW','-d',$Url,'-p','com.android.chrome')
}
function Open-CdpTarget([string]$RunUrl) {
    $script:CdpPort = (Invoke-Adb -ArgumentList @('forward','tcp:0','localabstract:chrome_devtools_remote')).Trim()
    if($script:CdpPort -notmatch '^\d+$'){throw 'ADB forward returned no local port'}
    for($attempt=0;$attempt -lt 20;$attempt++) {
        try {
            $targets=Invoke-RestMethod -Uri "http://127.0.0.1:$script:CdpPort/json/list" -TimeoutSec 3
            $matching=@($targets | Where-Object {$_.type -eq 'page' -and $_.url -eq $RunUrl})
            if($matching.Count -eq 1) {
                # Never follow a debug socket URL to a remote host.
                $u=[Uri]$matching[0].webSocketDebuggerUrl
                if($u.Host -notin @('127.0.0.1','localhost') -or $u.Port -ne [int]$script:CdpPort){throw 'Unexpected CDP endpoint'}
                return $u.AbsoluteUri
            }
        } catch { if($attempt -eq 19){throw} }
        Start-Sleep -Seconds 1
    }
    throw 'Exact PoC tab not found via Chrome DevTools; onboarding/lock screen/network may be blocking'
}
function Invoke-CdpRead([string]$SocketUrl,[string]$Expression) {
    $socket=[Net.WebSockets.ClientWebSocket]::new()
    $cancel=[Threading.CancellationTokenSource]::new(15000)
    try {
        $socket.ConnectAsync([Uri]$SocketUrl,$cancel.Token).GetAwaiter().GetResult()
        $request=@{id=1;method='Runtime.evaluate';params=@{expression=$Expression;returnByValue=$true;awaitPromise=$false}} | ConvertTo-Json -Depth 10 -Compress
        $bytes=[Text.Encoding]::UTF8.GetBytes($request)
        $socket.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,$cancel.Token).GetAwaiter().GetResult()
        while($true) {
            $stream=[IO.MemoryStream]::new()
            try {
                do {
                    $chunk=[byte[]]::new(16384)
                    $r=$socket.ReceiveAsync([ArraySegment[byte]]::new($chunk),$cancel.Token).GetAwaiter().GetResult()
                    if($r.MessageType -eq [Net.WebSockets.WebSocketMessageType]::Close){throw 'CDP socket closed'}
                    $stream.Write($chunk,0,$r.Count)
                    if($stream.Length -gt 32MB){throw 'CDP response exceeds 32 MiB'}
                } while(!$r.EndOfMessage)
                $reply=[Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json -Depth 100
            } finally {$stream.Dispose()}
            if($reply.PSObject.Properties.Name -contains 'id' -and $reply.id -eq 1) {
                if($reply.PSObject.Properties.Name -contains 'error'){throw ($reply.error | ConvertTo-Json -Compress)}
                if($reply.result.PSObject.Properties.Name -contains 'exceptionDetails'){throw ($reply.result.exceptionDetails | ConvertTo-Json -Depth 10 -Compress)}
                return $reply.result.result.value
            }
        }
    } finally {$cancel.Dispose();$socket.Dispose()}
}
function Get-AppSnapshot([string]$SocketUrl,[string]$Name='snapshot') {
    # Read-only instrumentation of the existing v1 lexical variables; no protocol changes.
    $expression=@'
JSON.stringify({schema:'android-webusb-ir-log/1',environment,manualEnvironment:document.getElementById('notes').value,exportedUtc:new Date().toISOString(),evictedEvents:evicted,sessions:sessionMetadata,events,live:session?{generation:session.generation,active:session.active,ready:session.ready,failed:session.failed,stage:session.stage,frames:session.frames,parser:session.parser.snapshot()}:null})
'@
    $raw=Invoke-CdpRead -SocketUrl $SocketUrl -Expression $expression
    $raw | Set-Content -LiteralPath (Join-Path $script:Out "$Name.json") -Encoding utf8
    $snapshot=$raw | ConvertFrom-Json -Depth 100
    if($snapshot.schema -ne 'android-webusb-ir-log/1' -or $snapshot.environment.version -ne '1.0.1'){throw 'Unsupported PoC schema/version; update adapter rather than guessing'}
    return $snapshot
}
function Wait-App([string]$SocketUrl,[scriptblock]$Condition,[int]$TimeoutSeconds=15,[string]$Name='wait') {
    $deadline=[DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        $s=Get-AppSnapshot -SocketUrl $SocketUrl -Name $Name
        if(&$Condition $s){return $s}
        Start-Sleep -Milliseconds 400
    }while([DateTime]::UtcNow -lt $deadline)
    throw "App condition timed out: $Name"
}
function Get-EventValue($Event,[string]$Name,$Default=$null){
    if($Event.PSObject.Properties.Name -contains $Name){return $Event.$Name}
    return $Default
}
function Test-TransportEvidence($Snapshot,[int]$Generation) {
    $ev=@($Snapshot.events | Where-Object {$_.connectionGeneration -eq $Generation})
    $issues=[Collections.Generic.List[string]]::new()
    if($Snapshot.evictedEvents -ne 0){$issues.Add('Log eviction makes evidence incomplete')}
    foreach($operation in @('open','claimInterface')){
        if(!@($ev | Where-Object {$_.operation -eq $operation -and (Get-EventValue $_ 'status') -eq 'ok'}).Count){$issues.Add("Missing successful $operation")}
    }
    if(!@($ev | Where-Object {$_.operation -eq 'selected descriptors'}).Count){$issues.Add('Missing selected descriptors')}
    if(!@($ev | Where-Object {$_.operation -in @('requestDevice','reuse authorized device') -and (Get-EventValue $_ 'status') -eq 'ok' -and (Get-EventValue $_ 'vendorId') -eq 0x045C -and (Get-EventValue $_ 'productId') -eq 0x0195}).Count){$issues.Add('Missing target VID/PID evidence')}
    if(!@($ev | Where-Object {$_.operation -in @('selectConfiguration','configuration') -and (Get-EventValue $_ 'status') -eq 'ok'}).Count){$issues.Add('Missing selected configuration evidence')}
    foreach($hex in @('FC FC FC FC','FE FE FE FE')){
        if(!@($ev | Where-Object {$_.operation -eq 'transferOut' -and (Get-EventValue $_ 'hex') -eq $hex -and (Get-EventValue $_ 'status') -eq 'ok' -and (Get-EventValue $_ 'bytesWritten') -eq 4}).Count){$issues.Add("Missing successful TX $hex")}
    }
    $fb=@($ev | Where-Object {$_.operation -eq 'parse FB'})
    if($fb.Count -and !@($ev | Where-Object {$_.operation -eq 'transferOut' -and (Get-EventValue $_ 'hex') -eq 'FA FA FA FA' -and (Get-EventValue $_ 'status') -eq 'ok' -and (Get-EventValue $_ 'bytesWritten') -eq 4}).Count){$issues.Add('FB received without successful FA follow-up')}
    foreach($e in $ev){
        if($e.operation -eq 'transferIn' -and (Get-EventValue $e 'status') -eq 'ok'){
            $rawHex=Get-EventValue $e 'hex' ''
            $count=if($rawHex){@($rawHex -split ' ').Count}else{0}
            if(($rawHex -and $rawHex -notmatch '^[0-9A-F]{2}( [0-9A-F]{2})*$') -or $count -ne (Get-EventValue $e 'actualBytes' -1)){$issues.Add('Raw RX HEX/length mismatch')}
        }
        if((Get-EventValue $e 'status') -in @('exception','stall','babble') -or $e.operation -in @('parse incomplete-timeout','parse overflow')){$issues.Add("Error evidence at seq $($e.seq): $($e.operation)")}
    }
    return [pscustomobject]@{pass=$issues.Count -eq 0;issues=@($issues);generation=$Generation}
}
function Get-ValidFrames($Snapshot,[long]$AfterSeq=0,[int]$Generation=0) {
    $consumed=@{}
    foreach($e in $Snapshot.events){
        if($e.operation -ne 'parse FE'){continue}
        $hexString=Get-EventValue $e 'hex' ''
        if($hexString -notmatch '^FE FE FE FE(?: [0-9A-F]{2})+$'){throw "Invalid FE HEX seq=$($e.seq)"}
        $bytes=@($hexString -split ' ')
        if($bytes.Count -lt 6){throw 'FE header truncated'}
        $declared=[Convert]::ToInt32($bytes[4],16)*256+[Convert]::ToInt32($bytes[5],16)
        if($bytes.Count -ne 6+$declared -or (Get-EventValue $e 'actualBytes' -1) -ne $bytes.Count -or (Get-EventValue $e 'payloadBytes' -1) -ne $declared){throw "FE length mismatch seq=$($e.seq)"}
        # A parsed event alone is not evidence: reconstruct bytes from the raw RX stream before it.
        $raw=@($Snapshot.events | Where-Object {$_.seq -le $e.seq -and $_.connectionGeneration -eq $e.connectionGeneration -and $_.operation -eq 'transferIn' -and (Get-EventValue $_ 'status') -eq 'ok' -and (Get-EventValue $_ 'actualBytes' 0) -gt 0} | ForEach-Object {Get-EventValue $_ 'hex' ''}) -join ' '
        $key=[string]$e.connectionGeneration
        $cursor=if($consumed.ContainsKey($key)){[int]$consumed[$key]}else{0}
        $position=$raw.IndexOf($hexString,$cursor,[StringComparison]::Ordinal)
        if($position -lt 0 -or ($position -gt 0 -and $raw[$position-1] -ne ' ')){throw "FE seq=$($e.seq) not backed by unused raw RX"}
        $consumed[$key]=$position+$hexString.Length
        if($e.seq -le $AfterSeq -or ($Generation -and $e.connectionGeneration -ne $Generation)){continue}
        if($declared -eq 0){continue} # Empty payload is not proof of IR reception.
        $e
    }
}
function Receive-ExportedLog([string]$SocketUrl) {
    $before=@((Invoke-Adb -ArgumentList @('shell','ls','-1','/sdcard/Download')) -split '\r?\n')
    Tap-PageControl -Text 'Скачать журнал JSON'
    $deadline=[DateTime]::UtcNow.AddSeconds(25)
    do {
        Start-Sleep -Milliseconds 600
        $after=@((Invoke-Adb -ArgumentList @('shell','ls','-1','/sdcard/Download')) -split '\r?\n')
        $new=@($after | Where-Object {$_ -match '^webusb-ir-[a-zA-Z0-9_.() -]+\.json$' -and $_ -notin $before})
        if($new.Count -eq 1){
            # Fixed generated filename; reject spaces/metacharacters rather than shell-interpolate them.
            if($new[0] -notmatch '^webusb-ir-[a-zA-Z0-9_.-]+\.json$'){throw 'Unexpected download filename; inspect artifacts'}
            $local=Join-Path $script:Out 'downloaded-app-log.json'
            $null=Invoke-Adb -ArgumentList @('pull',"/sdcard/Download/$($new[0])",$local)
            $data=Get-Content -Raw -LiteralPath $local | ConvertFrom-Json -Depth 100
            if($data.schema -ne 'android-webusb-ir-log/1' -or $data.evictedEvents -ne 0){throw 'Invalid/incomplete downloaded log'}
            return $data
        }
        if($new.Count -gt 1){throw 'Ambiguous new JSON downloads'}
        $ui=Read-AndroidUi
        $nodes=@($ui.SelectNodes('//node'))
        $prompt=($nodes | ForEach-Object {$_.GetAttribute('text')}) -join ' '
        if($prompt -match '(?i)(download|скач|загруз|stiahnu)') {
            $confirm=@($nodes | Where-Object {$_.GetAttribute('package') -eq 'com.android.chrome' -and $_.GetAttribute('enabled') -eq 'true' -and $_.GetAttribute('text') -match '^(Download|Скачать|Stiahnuť|Allow|Разрешить|Povoliť)$'})
            if($confirm.Count -eq 1){Tap-UiNode $confirm[0]}
        }
    }while([DateTime]::UtcNow -lt $deadline)
    throw 'No new JSON in Download; Chrome download permission/notification or download path may differ'
}
function Start-Logcat {
    $info=[Diagnostics.ProcessStartInfo]::new();$info.FileName=$script:Adb;$info.UseShellExecute=$false
    $info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
    foreach($a in @('-s',$script:Device,'logcat','-v','threadtime')){$info.ArgumentList.Add($a)}
    $p=[Diagnostics.Process]::new();$p.StartInfo=$info;$null=$p.Start()
    $stdout=[IO.File]::Create((Join-Path $script:Out 'logcat.txt'));$stderr=[IO.File]::Create((Join-Path $script:Out 'logcat-stderr.txt'))
    return @{process=$p;stdout=$stdout;stderr=$stderr;outTask=$p.StandardOutput.BaseStream.CopyToAsync($stdout);errTask=$p.StandardError.BaseStream.CopyToAsync($stderr)}
}
function Stop-Logcat($Capture) {
    if(!$Capture){return}
    try {if(!$Capture.process.HasExited){$Capture.process.Kill($true)};$Capture.process.WaitForExit();$Capture.outTask.GetAwaiter().GetResult();$Capture.errTask.GetAwaiter().GetResult()}
    finally {$Capture.stdout.Dispose();$Capture.stderr.Dispose();$Capture.process.Dispose()}
}
function Save-SystemEvidence {
    foreach($name in @('usb','power','activity')) {
        try {Invoke-Adb -ArgumentList @('shell','dumpsys',$name) | Set-Content -LiteralPath (Join-Path $script:Out "dumpsys-$name.txt") -Encoding utf8}catch{Write-Warning $_}
    }
}
function Close-Harness {
    if($script:CdpPort -and $script:Device){$null=Invoke-Adb -ArgumentList @('forward','--remove',"tcp:$script:CdpPort") -AllowFailure}
}
Export-ModuleMember -Function *
