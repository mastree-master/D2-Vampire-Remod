@echo off
set "D2SF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[IO.File]::ReadAllText($env:D2SF,[Text.Encoding]::UTF8); & ([scriptblock]::Create($s.Substring($s.IndexOf('#PS'+'START')))) '%~1'"
exit /b
#PSSTART
# D2S Remod 설치·업데이트: 원작 게임을 따로 복사하고 GitHub 의 최신 리모드를 입혀 "D2S Remod" 로 실행한다. 원작 게임·세이브는 건드리지 않는다
param([string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$Repo = 'mastree-master/D2S-Remod'
$Home2 = Join-Path $env:LOCALAPPDATA 'D2S-Remod'
$Src = Join-Path $Home2 'src'
$Game = Join-Path $Home2 'game'
function Msg($t, $icon = 'Information') { [void][Windows.Forms.MessageBox]::Show($t, 'D2S Remod', 'OK', $icon) }
function Fail($t) { Msg $t 'Error'; exit 1 }
New-Item -ItemType Directory -Force $Home2 | Out-Null

# 1. 리모드가 켜져 있으면 끝날 때까지 기다린다(업데이트 버튼은 게임을 끄고 이 파일을 부른다)
for ($i = 0; $i -lt 30 -and (Get-Process 'D2S Remod' -ErrorAction SilentlyContinue); $i++) { Start-Sleep 1 }
Get-Process 'D2S Remod' -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 최신 버전 확인. 업데이트 모드인데 이미 최신이면 바로 실행
$have = if (Test-Path "$Home2\version.txt") { (Get-Content "$Home2\version.txt" -Raw).Trim().TrimStart([char]0xFEFF) } else { '' }
try { $latest = (Invoke-WebRequest "https://raw.githubusercontent.com/$Repo/main/version.txt" -UseBasicParsing).Content.Trim() } catch { Fail "GitHub 에 연결하지 못했습니다.`n$($_.Exception.Message)" }
if ($Mode -eq 'update' -and $have -eq $latest -and (Test-Path "$Game\D2S Remod.exe")) { Start-Process "$Game\D2S Remod.exe"; exit 0 }

# 3. 원작 게임 폴더
$Orig = Join-Path $env:LOCALAPPDATA 'Programs\D2 Survivors'
if (-not (Test-Path "$Orig\resources\app.asar")) {
    $fb = New-Object Windows.Forms.FolderBrowserDialog; $fb.Description = '원작 D2 Survivors 설치 폴더를 고르세요 (D2 Survivors.exe 가 있는 폴더)'
    if ($fb.ShowDialog() -ne 'OK') { exit 0 }
    $Orig = $fb.SelectedPath
    if (-not (Test-Path "$Orig\resources\app.asar")) { Fail "app.asar 를 찾지 못했습니다: $Orig" }
}

# 4. 최신 리모드 받기
$tmp = Join-Path $env:TEMP "d2s-remod-dl"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $tmp | Out-Null
try {
    Invoke-WebRequest "https://github.com/$Repo/archive/refs/heads/main.zip" -OutFile "$tmp\remod.zip" -UseBasicParsing
    Expand-Archive "$tmp\remod.zip" $tmp -Force
    Invoke-WebRequest 'https://raw.githubusercontent.com/mastree-master/D2S-MyPatch/main/D2S-MyPatch.bat' -OutFile "$tmp\D2S-MyPatch.bat" -UseBasicParsing
} catch { Fail "리모드를 받지 못했습니다.`n$($_.Exception.Message)" }
Remove-Item $Src -Recurse -Force -ErrorAction SilentlyContinue
Move-Item (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName $Src
Copy-Item "$tmp\D2S-MyPatch.bat" "$Src\tools\D2S-MyPatch.bat" -Force

# 5. 원작 게임을 리모드 폴더로 복사(원작은 그대로). 원본 app.asar: 기존 패치가 입혀져 있으면 그 백업(.orig)
robocopy $Orig $Game /MIR /NFL /NDL /NJH /NJS /NP /XF 'app.asar.orig' | Out-Null
$origAsar = if (Test-Path "$Orig\resources\app.asar.orig") { "$Orig\resources\app.asar.orig" } else { "$Orig\resources\app.asar" }
Copy-Item $origAsar "$Src\tools\original.asar" -Force
Copy-Item $origAsar "$Game\resources\app.asar" -Force

# 6. 리모드 입히기: 게임 실행 파일을 Node 처럼 써서 빌드(따로 설치할 것 없음)
$env:ELECTRON_RUN_AS_NODE = '1'; $env:D2S_REMOD_GAME = $Game; $env:D2S_MYPATCH = "$Src\tools\D2S-MyPatch.bat"
$log = Join-Path $Home2 'build.log'
$p = Start-Process "$Game\D2 Survivors.exe" -ArgumentList "`"$Src\tools\build.cjs`"" -WorkingDirectory $Src -NoNewWindow -Wait -PassThru -RedirectStandardOutput $log -RedirectStandardError "$log.err"
Remove-Item env:ELECTRON_RUN_AS_NODE
if ($p.ExitCode -ne 0 -or -not (Test-Path "$Game\D2S Remod.exe")) { Fail "리모드 적용에 실패했습니다. 기록: $log.err" }

# 7. 바로가기·버전·이 파일 보관(게임 안 업데이트 버튼이 부름)
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'D2S Remod.lnk'))
$lnk.TargetPath = "$Game\D2S Remod.exe"; $lnk.WorkingDirectory = $Game; $lnk.Save()
[IO.File]::WriteAllText("$Home2\version.txt", $latest)
Copy-Item "$Src\D2S-Remod.bat" (Join-Path $Home2 'D2S-Remod.bat') -Force -ErrorAction SilentlyContinue

if ($Mode -ne 'update') { Msg "D2S Remod v$latest 설치를 마쳤습니다.`n바탕화면의 'D2S Remod' 로 실행하세요.`n(원작 게임·세이브와 따로 실행됩니다)" }
Start-Process "$Game\D2S Remod.exe"
