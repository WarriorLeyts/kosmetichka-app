#!/usr/bin/env bash
# Runs inside the Android emulator job: launches the app, scrolls the home screen and saves screenshots.
set -x
mkdir -p shots
adb install -r app.apk
adb logcat -c
adb shell am start -n ru.kosmetichkaopt.app/.MainActivity
sleep 30
adb exec-out screencap -p > shots/00-start.png
SIZE=$(adb shell wm size | tail -1 | awk '{print $3}' | tr -d '\r'); W=${SIZE%x*}; H=${SIZE#*x}
echo "screen $W x $H"
X=$((W/2)); Y1=$((H*70/100)); Y2=$((H*45/100))
for i in $(seq -w 1 14); do adb shell input swipe $X $Y1 $X $Y2 900; sleep 2; adb exec-out screencap -p > shots/$i-down.png; done
for i in 1 2 3 4; do adb shell input swipe $X $Y2 $X $Y1 900; sleep 2; adb exec-out screencap -p > shots/up-$i.png; done
adb shell input tap $((W*32/100)) $((H*95/100)); sleep 4; adb exec-out screencap -p > shots/zz-tap-catalog.png
adb logcat -d -s AndroidRuntime:E ReactNativeJS:V ReactNative:E | tail -60 > shots/logcat.txt || true
msg=$(sed 's/%/%25/g' shots/logcat.txt | cut -c1-220 | tail -30 | awk '{printf "%s%%0A", $0}')
echo "::notice title=logcat::${msg}"
