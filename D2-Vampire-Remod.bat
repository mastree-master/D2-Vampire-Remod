@echo off
set "D2SF=%~f0"
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$s=[IO.File]::ReadAllText($env:D2SF,[Text.Encoding]::UTF8); & ([scriptblock]::Create($s.Substring($s.IndexOf('#PS'+'START')))) '%~1'"
exit /b
#PSSTART
# D2 Vampire Remod 설치·업데이트(설치 창): Electron 실행기와 GitHub 의 최신 리모드(원작 1105.3 고정본 포함)를 받아 "D2 Vampire Remod" 로 실행한다
# 원작 D2 Survivors 가 없어도 됨(게임 그림·소리는 게임이 처음 켜질 때 디아블로 2 레저렉션에서 꺼냄). 원작 게임·세이브는 건드리지 않는다
param([string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[Net.ServicePointManager]::SecurityProtocol = 'Tls12'
$Repo = 'mastree-master/D2-Vampire-Remod'
# 최신 버전: 리모드 서버 /ver 우선(캐시 없음, 되돌리기도 바로), 못 받으면 GitHub version.txt
function Latest { try { $v = (Invoke-RestMethod 'http://150.230.3.40:8520/ver' -TimeoutSec 6).ver; if ($v) { return $v } } catch {}; (Invoke-WebRequest "https://raw.githubusercontent.com/$Repo/main/version.txt" -UseBasicParsing -TimeoutSec 8).Content.Trim() }
$Electron = '44.7.1' # 원작 1105.3 이 쓰는 실행기 버전
$Home2 = Join-Path $env:LOCALAPPDATA 'D2-Vampire-Remod'
$Src = Join-Path $Home2 'src'
$Game = Join-Path $Home2 'game'
$tmp = Join-Path $env:TEMP 'd2-vampire-remod-dl'
New-Item -ItemType Directory -Force $Home2 | Out-Null

# 설치 창: 제목·안내·진행 막대·단추
$f = New-Object Windows.Forms.Form
$f.Text = 'D2 리모드 설치'; $f.Size = New-Object Drawing.Size(520, 260); $f.StartPosition = 'CenterScreen'
$f.FormBorderStyle = 'FixedDialog'; $f.MaximizeBox = $false; $f.BackColor = [Drawing.Color]::FromArgb(16, 12, 10); $f.ForeColor = [Drawing.Color]::FromArgb(232, 216, 168)
if (Test-Path "$Home2\remod.ico") { $f.Icon = New-Object Drawing.Icon "$Home2\remod.ico" }
$title = New-Object Windows.Forms.Label; $title.Text = 'D2 VAMPIRE REMOD'; $title.Font = New-Object Drawing.Font('Georgia', 18, [Drawing.FontStyle]::Bold); $title.ForeColor = [Drawing.Color]::FromArgb(190, 30, 30); $title.SetBounds(20, 14, 470, 36)
$step = New-Object Windows.Forms.Label; $step.SetBounds(22, 62, 470, 40); $step.Font = New-Object Drawing.Font('Malgun Gothic', 10)
$step.Text = "D2 리모드 설치`n[설치]를 누르면 시작합니다."
$bar = New-Object Windows.Forms.ProgressBar; $bar.SetBounds(22, 112, 460, 22); $bar.Maximum = 100
$detail = New-Object Windows.Forms.Label; $detail.SetBounds(22, 138, 460, 20); $detail.Font = New-Object Drawing.Font('Malgun Gothic', 9); $detail.ForeColor = [Drawing.Color]::Gray
$btn = New-Object Windows.Forms.Button; $btn.Text = '설치'; $btn.SetBounds(392, 172, 90, 32); $btn.FlatStyle = 'Flat'; $btn.BackColor = [Drawing.Color]::FromArgb(60, 20, 16)
$all = New-Object Windows.Forms.Label; $all.SetBounds(22, 178, 300, 24); $all.Font = New-Object Drawing.Font('Malgun Gothic', 11, [Drawing.FontStyle]::Bold)
$tick = New-Object Windows.Forms.Timer; $tick.Interval = 200; $tick.Add_Tick({ if ($bar.Value -gt 0) { $all.Text = "전체 $($bar.Value)%" } }); $tick.Start()
$f.Controls.AddRange(@($title, $step, $bar, $detail, $all, $btn))
function Show($t, $p) { $step.Text = $t; if ($p -ne $null) { $bar.Value = [Math]::Min(100, $p) }; [Windows.Forms.Application]::DoEvents() }
function Fail($t) { [void][Windows.Forms.MessageBox]::Show($f, $t, 'D2 Vampire Remod', 'OK', 'Error'); throw 'ABORT' }
# 창 안(단추·창 뜸)에서 난 오류는 여기서 받는다. 안 받으면 윈도우의 .NET 오류 창이 뜸
$script:Run = { try { Install } catch { if ("$_" -ne 'ABORT') { [void][Windows.Forms.MessageBox]::Show($f, "설치 중 오류가 났습니다.`n$_", 'D2 Vampire Remod', 'OK', 'Error') }; $f.Close() } }
# 받기(진행률 표시). $from~$to 는 전체 막대에서 이 파일이 차지하는 구간
function Get($url, $out, $from, $to) {
    Add-Type -AssemblyName System.Net.Http
    $hc = New-Object Net.Http.HttpClient; $hc.Timeout = [TimeSpan]::FromMinutes(30)
    $res = $hc.GetAsync($url, [Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult(); [void]$res.EnsureSuccessStatusCode()
    $total = $res.Content.Headers.ContentLength; $in = $res.Content.ReadAsStreamAsync().GetAwaiter().GetResult(); $fs = [IO.File]::Create($out)
    $buf = New-Object byte[] 1MB; $got = 0; $sw = [Diagnostics.Stopwatch]::StartNew(); $shown = 0
    try {
        while (($n = $in.Read($buf, 0, $buf.Length)) -gt 0) {
            $fs.Write($buf, 0, $n); $got += $n
            if ($sw.ElapsedMilliseconds - $shown -ge 200) {
                $shown = $sw.ElapsedMilliseconds; $sec = [Math]::Max(0.1, $sw.Elapsed.TotalSeconds); $speed = $got / $sec
                $t = '{0:N1} MB' -f ($got / 1MB)
                if ($total) {
                    $pct = $got / $total; $bar.Value = [int]($from + ($to - $from) * $pct)
                    $t = '{0:N0}%  ·  {1:N1} / {2:N1} MB  ·  {3:N1} MB/s  ·  지난 시간 {4}초  ·  남은 시간 약 {5}초' -f ($pct * 100), ($got / 1MB), ($total / 1MB), ($speed / 1MB), [int]$sec, [int](($total - $got) / [Math]::Max(1, $speed))
                }
                $detail.Text = $t; [Windows.Forms.Application]::DoEvents()
            }
        }
    } finally { $fs.Close(); $in.Close(); $hc.Dispose() }
    $detail.Text = ''
}

function Install {
    $btn.Enabled = $false
    # 1. 리모드가 켜져 있으면 끝날 때까지 기다린다(업데이트 버튼은 게임을 끄고 이 파일을 부른다)
    Show '켜져 있는 리모드를 기다리는 중' 2
    for ($i = 0; $i -lt 30 -and (Get-Process 'D2 Vampire Remod' -ErrorAction SilentlyContinue); $i++) { Start-Sleep 1; [Windows.Forms.Application]::DoEvents() }
    Get-Process 'D2 Vampire Remod' -ErrorAction SilentlyContinue | Stop-Process -Force

    # 2. 최신 버전
    Show '최신 버전 확인 중' 4
    try { $script:latest = (Latest) } catch { Fail "GitHub 에 연결하지 못했습니다.`n$($_.Exception.Message)" }
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue; New-Item -ItemType Directory -Force $tmp | Out-Null

    # 3. 게임 실행기(Electron). 이미 같은 버전이 있으면 건너뜀
    if ((Get-Content "$Game\electron.version" -ErrorAction SilentlyContinue) -ne $Electron) {
        Show "게임 실행기 받는 중 (약 120MB)" 5
        try { Get "https://github.com/electron/electron/releases/download/v$Electron/electron-v$Electron-win32-x64.zip" "$tmp\electron.zip" 5 55 } catch { Fail "게임 실행기를 받지 못했습니다.`n$($_.Exception.Message)" }
        Show '게임 실행기 푸는 중' 57
        Remove-Item $Game -Recurse -Force -ErrorAction SilentlyContinue
        Expand-Archive "$tmp\electron.zip" $Game -Force
        Remove-Item "$Game\resources\default_app.asar" -Force -ErrorAction SilentlyContinue
        Move-Item "$Game\electron.exe" "$Game\D2 Survivors.exe" -Force
        Set-Content "$Game\electron.version" $Electron
    }

    # 4. 최신 리모드
    Show "리모드 v$latest 받는 중" 62
    try { Get "https://github.com/$Repo/archive/refs/heads/main.zip" "$tmp\remod.zip" 62 78 } catch { Fail "리모드를 받지 못했습니다.`n$($_.Exception.Message)" }
    Show '리모드 푸는 중' 80
    Expand-Archive "$tmp\remod.zip" $tmp -Force
    Remove-Item $Src -Recurse -Force -ErrorAction SilentlyContinue
    # 지우지 못한 파일(잠김)이 있으면 Move 가 src 안으로 한 겹 들어가 옛 파일로 빌드됨: 언제나 덮어쓰기
    $new = (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName
    New-Item -ItemType Directory -Force $Src | Out-Null; Copy-Item "$new\*" $Src -Recurse -Force; Remove-Item $new -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item "$Src\tools\D2S-MyPatch.pinned.bat" "$Src\tools\D2S-MyPatch.bat" -Force
    Copy-Item "$Src\tools\remod.ico" "$Home2\remod.ico" -Force
    New-Item -ItemType Directory -Force "$Game\resources" | Out-Null
    Copy-Item "$Src\tools\original.asar" "$Game\resources\app.asar" -Force

    # 5. 리모드 입히기: 게임 실행기를 Node 처럼 써서 빌드(따로 설치할 것 없음)
    Show '리모드 적용 중 (1~2분)' 84
    $env:ELECTRON_RUN_AS_NODE = '1'; $env:D2S_REMOD_GAME = $Game; $env:D2S_MYPATCH = "$Src\tools\D2S-MyPatch.bat"
    $log = Join-Path $Home2 'build.log'
    $p = Start-Process "$Game\D2 Survivors.exe" -ArgumentList "`"$Src\tools\build.cjs`"" -WorkingDirectory $Src -WindowStyle Hidden -PassThru -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    $null = $p.Handle # 종료 코드를 읽으려면 핸들을 잡아 둬야 함
    while (-not $p.HasExited) { if ($bar.Value -lt 97) { $bar.Value++ }; [Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 1500 }
    Remove-Item env:ELECTRON_RUN_AS_NODE
    if ($p.ExitCode -ne 0 -or -not (Test-Path "$Game\D2 Vampire Remod.exe")) { Fail "리모드 적용에 실패했습니다. 기록: $log.err" }

    # 6. 바로가기·버전·이 파일 보관(게임 안 업데이트 버튼이 부름)
    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'D2 Vampire Remod.lnk'))
    # 바탕화면 아이콘은 런처(이 파일의 launch 모드, 창 없는 PowerShell)를 띄움: 버전 확인·업데이트·실행
    $lnk.TargetPath = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'; $lnk.WindowStyle = 7
    $lnk.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$env:D2SF=''' + (Join-Path $Home2 'D2-Vampire-Remod.bat') + '''; $s=[IO.File]::ReadAllText($env:D2SF,[Text.Encoding]::UTF8); & ([scriptblock]::Create($s.Substring($s.IndexOf(''#PS''+''START'')))) launch"'
    $lnk.WorkingDirectory = $Home2; $lnk.IconLocation = "$Home2\remod.ico"; $lnk.Save()
    [IO.File]::WriteAllText("$Home2\version.txt", $latest)
    Copy-Item "$Src\D2-Vampire-Remod.bat" (Join-Path $Home2 'D2-Vampire-Remod.bat') -Force -ErrorAction SilentlyContinue
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

    Show "v$latest 설치를 마쳤습니다. 바탕화면의 'D2 Vampire Remod' 로 실행하세요." 100
    $btn.Text = '실행'; $btn.Enabled = $true
    $btn.Remove_Click($script:onInstall); $btn.Add_Click({ Start-Process "$Game\D2 Vampire Remod.exe"; $f.Close() })
    # 런처에서 '켤 때 자동 업데이트'로 받은 경우도 끝나면 바로 실행
    if ($Mode -eq 'update' -or ($chk -and $chk.Checked)) { Start-Process "$Game\D2 Vampire Remod.exe"; $f.Close() }
}

# 런처 모드(바탕화면 아이콘, 또는 설치된 PC 에서 이 bat 더블클릭): 지금·최신 버전, [업데이트] [실행], 켤 때 자동 업데이트 체크
if ($Mode -eq 'launch' -or (-not $Mode -and (Test-Path "$Game\D2 Vampire Remod.exe"))) {
    $have = if (Test-Path "$Home2\version.txt") { (Get-Content "$Home2\version.txt" -Raw).Trim().TrimStart([char]0xFEFF) } else { '' }
    $cfg = "$Home2\launcher.txt"
    $f.Text = 'D2 리모드'; $all.Visible = $false; $bar.Visible = $false
    $chk = New-Object Windows.Forms.CheckBox; $chk.Text = '켤 때 자동 업데이트'; $chk.SetBounds(22, 178, 220, 24); $chk.Font = New-Object Drawing.Font('Malgun Gothic', 10)
    $chk.Checked = (Test-Path $cfg) -and ((Get-Content $cfg -Raw).Trim() -eq 'auto')
    $chk.Add_CheckedChanged({ Set-Content $cfg $(if ($chk.Checked) { 'auto' } else { 'manual' }) })
    $up = New-Object Windows.Forms.Button; $up.Text = '업데이트'; $up.SetBounds(292, 172, 90, 32); $up.FlatStyle = 'Flat'; $up.BackColor = [Drawing.Color]::FromArgb(60, 20, 16); $up.Visible = $false
    $f.Controls.AddRange(@($chk, $up))
    $btn.Text = '실행'
    $script:onInstall = { Start-Process "$Game\D2 Vampire Remod.exe"; $f.Close() }
    $btn.Add_Click($script:onInstall)
    $up.Add_Click({ $up.Visible = $false; $chk.Visible = $false; $bar.Visible = $true; $all.Visible = $true; $btn.Enabled = $false; & $script:Run })
    $f.Add_Shown({
        Show "지금 v$have`n최신 버전 확인 중..." $null
        $new = try { (Latest) } catch { '' }
        if (-not $new) { Show "지금 v$have`n최신 버전을 확인하지 못했습니다(인터넷 연결 확인)." $null; return }
        if ($new -eq $have) { Show "지금 v$have`n최신 버전입니다." $null; return }
        Show "지금 v$have`n새 버전 v$new 이 있습니다. [업데이트]를 누르세요." $null
        $up.Visible = $true
        if ($chk.Checked) { $up.PerformClick() }
    })
    [void]$f.ShowDialog()
    exit 0
}

# 업데이트 모드: 이미 최신이면 창 없이 바로 실행, 아니면 창을 띄우고 바로 시작
if ($Mode -eq 'update') {
    $have = if (Test-Path "$Home2\version.txt") { (Get-Content "$Home2\version.txt" -Raw).Trim().TrimStart([char]0xFEFF) } else { '' }
    $latest = try { (Latest) } catch { '' }
    if ($have -and $have -eq $latest -and (Test-Path "$Game\D2 Vampire Remod.exe")) { Start-Process "$Game\D2 Vampire Remod.exe"; exit 0 }
    $f.Text = 'D2 리모드 업데이트'; $f.Add_Shown($script:Run)
}
$script:onInstall = $script:Run
$btn.Add_Click($script:onInstall)
[void]$f.ShowDialog()
