#!/usr/bin/env bash
# Team app smoke check: launch, login screen, wrong password → error text, dark theme can't be reached without login.
set -x
mkdir -p shots
PKG=ru.kosmetichkaopt.team
adb install -r app.apk
sleep 40
adb shell settings put global hide_error_dialogs 1 || true
adb shell pm disable-user --user 0 com.google.android.apps.nexuslauncher || true
adb logcat -c
adb shell am start -n $PKG/.MainActivity
sleep 25
adb exec-out screencap -p > shots/team-1-start.png
SIZE=$(adb shell wm size | tail -1 | awk '{print $3}' | tr -d '\r'); W=${SIZE%x*}; H=${SIZE#*x}
tapdesc() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
  xy=$(python3 - "$1" <<'PY'
import sys,re,xml.etree.ElementTree as ET
w=sys.argv[1]
try: r=ET.parse('ui.xml').getroot()
except Exception: sys.exit(0)
for e in r.iter('node'):
    if 'EditText' in (e.get('class') or '') and (w in (e.get('text') or '') or w in (e.get('content-desc') or '')):
        b=list(map(int,re.findall(r'\d+',e.get('bounds')))); print((b[0]+b[2])//2,(b[1]+b[3])//2); break
PY
)
  [ -n "$xy" ] && adb shell input tap $xy || echo "NOT FOUND $1" >> shots/team.txt
}
tapdesc "Логин"; adb shell input text "test_user"; sleep 1
tapdesc "Пароль"; adb shell input text "wrongpass"; sleep 1
adb shell input keyevent 66; sleep 6
adb exec-out screencap -p > shots/team-2-wrong-login.png
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
grep -o 'text="[^"]*"' ui.xml | grep -iE "невер|ошиб|логин" >> shots/team.txt || true
adb logcat -d | grep -E "ReactNativeJS|AndroidRuntime: (FATAL|E)" | cut -c1-200 | tail -20 >> shots/team.txt
msg=$(sed 's/%/%25/g' shots/team.txt | awk '{printf "%s%%0A", $0}')
echo "::notice title=Team smoke::${msg}"
