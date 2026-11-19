@echo off
chcp 65001 >nul
rem D2S Remod: 게임 안 리모드 설정이 바뀌었으면 다시 빌드하고, 내 서버를 켜고, 따로 설치한 게임을 따로 세이브로 실행
cd /d "%~dp0"
powershell -NoProfile -Command "if ((Test-Path remod-options.json) -and (Get-Item remod-options.json).LastWriteTime -gt (Get-Item 'game\resources\app.asar').LastWriteTime) { exit 1 }"
if errorlevel 1 (
  echo 리모드 설정이 바뀌어 다시 빌드합니다. 1~2분 걸립니다...
  node tools\build.cjs
)
start "D2S Remod Server" /min node server\server.cjs
set D2S_USER_DATA=%~dp0save
set D2S_LEADERBOARD_URL=http://127.0.0.1:8520
start "" "game\D2 Vampire Remod.exe" --remote-debugging-port=9333
