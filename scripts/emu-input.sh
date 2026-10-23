#!/usr/bin/env bash
# Typing check on Android: login, register, catalog search.
set -x
mkdir -p shots
PKG=ru.kosmetichkaopt.app
adb install -r app.apk
adb logcat -c
adb shell am start -n $PKG/.MainActivity
SIZE=$(adb shell wm size | tail -1 | awk '{print $3}' | tr -d '\r'); W=${SIZE%x*}; H=${SIZE#*x}
sleep 25
tap() {
  for try in 1 2 3; do
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
    xy=$(python3 - "$1" <<'PY'
import sys,re,xml.etree.ElementTree as ET
want=sys.argv[1]; edit=want.startswith('edit:'); want=want[5:] if edit else want
try: root=ET.parse('ui.xml').getroot()
except Exception: sys.exit(0)
for el in root.iter('node'):
    if edit and 'EditText' not in (el.get('class') or ''): continue
    t=(el.get('text') or ''); d=(el.get('content-desc') or '')
    if want in (t,d) or (want.endswith('*') and (t.startswith(want[:-1]) or d.startswith(want[:-1]))):
        b=list(map(int,re.findall(r'\d+',el.get('bounds')))); print((b[0]+b[2])//2,(b[1]+b[3])//2); break
PY
)
    [ -n "$xy" ] && { adb shell input tap $xy; return; }
    sleep 3
  done
  echo "NOT FOUND: $1" | tee -a shots/input.txt
}
typ() { adb shell input text "$1"; sleep 2; }
shot() { adb exec-out screencap -p > "shots/in-$1.png"; }
# profile → login
adb shell input tap $((W*90/100)) $((H*94/100)); sleep 4
tap "Войти"; sleep 5; shot 1-login
tap "edit:Телефон или email"; sleep 2; typ "89990001122"; shot 2-login-typed
tap "edit:Пароль"; sleep 2; typ "secret12"; shot 3-pass-typed
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
grep -o 'text="[^"]*"' ui.xml | grep -E "8999|secret|•" >> shots/input.txt || echo "login: typed text not found in UI" >> shots/input.txt
adb shell input keyevent 4; sleep 2
tap "Зарегистрироваться"; sleep 5; shot 4-register
adb shell input keyevent 4; sleep 2; adb shell input keyevent 4; sleep 2
adb shell am start -n $PKG/.MainActivity; sleep 5
# catalog search
adb shell input tap $((W*30/100)) $((H*94/100)); sleep 5
tap "edit:Название, бренд, артикул"; sleep 2; typ "krem"; sleep 3; shot 5-search-typed
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
grep -o 'text="krem[^"]*"' ui.xml >> shots/input.txt || echo "search: typed text not found" >> shots/input.txt
adb logcat -d | grep -E "ReactNativeJS|AndroidRuntime" | cut -c1-200 | tail -30 >> shots/input.txt
msg=$(sed 's/%/%25/g' shots/input.txt | awk '{printf "%s%%0A", $0}')
echo "::notice title=Android input::${msg}"
