#!/bin/sh
# 시험용 실행: Remod.bat 과 같은 환경(리모드 세이브·리모드 서버)으로 게임을 켠다. 이 설정 없이 켜면 원본 게임 세이브를 쓰게 되니 꼭 이걸로
cd "$(dirname "$0")/.."
export D2S_USER_DATA="$(cygpath -w "$PWD/save")" D2S_LEADERBOARD_URL=http://127.0.0.1:8520
"game/D2S Remod.exe" --remote-debugging-port=9333 >/dev/null 2>&1 &
