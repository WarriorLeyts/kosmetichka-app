#!/usr/bin/env bash
# Quick freeze check: start the app, wait, tap the tabs, and record whether Android reported
# «isn't responding» (ANR). Variant name comes from $VARIANT.
set -x
mkdir -p shots
PKG=ru.kosmetichkaopt.app
adb install -r app.apk
adb logcat -c
adb shell am start -n $PKG/.MainActivity
SIZE=$(adb shell wm size | tail -1 | awk '{print $3}' | tr -d '\r'); W=${SIZE%x*}; H=${SIZE#*x}
sleep 10; adb exec-out screencap -p > shots/$VARIANT-1-10s.png
sleep 20; adb exec-out screencap -p > shots/$VARIANT-2-30s.png
tabs() { for x in 30 50 70 90 10; do adb shell input tap $((W*x/100)) $((H*94/100)); sleep 5; adb exec-out screencap -p > shots/$VARIANT-$1-tab$x.png; done; }
tabs light
# product page from the catalog, then back
adb shell input tap $((W*30/100)) $((H*94/100)); sleep 5
adb shell input tap $((W*27/100)) $((H*30/100)); sleep 6; adb exec-out screencap -p > shots/$VARIANT-light-product.png
adb shell input keyevent 4; sleep 3
adb shell input tap $((W*10/100)) $((H*94/100)); sleep 4
# dark theme (moon button in the home header)
adb shell input tap $((W*85/1000)) $((H*925/10000)); sleep 8; adb exec-out screencap -p > shots/$VARIANT-dark-home.png
tabs dark
adb shell input tap $((W*30/100)) $((H*94/100)); sleep 5
adb shell input tap $((W*27/100)) $((H*30/100)); sleep 6; adb exec-out screencap -p > shots/$VARIANT-dark-product.png
adb shell input keyevent 4; sleep 3
adb shell input tap $((W*90/100)) $((H*94/100)); sleep 4
adb shell input tap $((W*50/100)) $((H*30/100)); sleep 5; adb exec-out screencap -p > shots/$VARIANT-dark-profile-item.png
adb logcat -d | grep -E "ANR in|not responding|Input dispatching timed out|FATAL|AndroidRuntime: |ReactNativeJS" | cut -c1-250 | head -40 > shots/$VARIANT-anr.txt
echo "frames:" >> shots/$VARIANT-anr.txt
adb shell dumpsys gfxinfo $PKG | grep -E "Total frames|Janky|50th|90th|99th" >> shots/$VARIANT-anr.txt
echo "variant=$VARIANT" >> shots/$VARIANT-anr.txt
msg=$(sed 's/%/%25/g' shots/$VARIANT-anr.txt | awk '{printf "%s%%0A", $0}')
echo "::notice title=ANR check $VARIANT::${msg}"
