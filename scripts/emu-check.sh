#!/usr/bin/env bash
# Runs inside the Android emulator job: walks through every tab in light and dark theme,
# opens a product, favourites, login, search and the scanner; saves screenshots and errors.
set -x
mkdir -p shots
PKG=ru.kosmetichkaopt.app
adb install -r app.apk || { echo "::error::APK install failed"; exit 1; }
adb logcat -c
adb shell pm grant $PKG android.permission.CAMERA || true
adb shell screenrecord --time-limit 10 --bit-rate 6000000 /sdcard/launch.mp4 & REC=$!
sleep 1
adb shell am start -n $PKG/.MainActivity
wait $REC || true
mkdir -p shots; adb pull /sdcard/launch.mp4 shots/launch-light.mp4 || true
SIZE=$(adb shell wm size | tail -1 | awk '{print $3}' | tr -d '\r'); W=${SIZE%x*}; H=${SIZE#*x}
n=0
shot() { n=$((n+1)); adb exec-out screencap -p > "shots/$(printf %02d $n)-$1.png"; alive "$1"; }
alive() { if ! adb shell pidof $PKG >/dev/null; then echo "CRASH after: $1" | tee -a shots/problems.txt; adb shell am start -n $PKG/.MainActivity; sleep 15; fi; }
# tap an element by its text or accessibility label (content-desc)
tap() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
  xy=$(python3 - "$1" <<'PY'
import sys,re,xml.etree.ElementTree as ET
want=sys.argv[1]
try: root=ET.parse('ui.xml').getroot()
except Exception: sys.exit(0)
for el in root.iter('node'):
    if el.get('content-desc')==want or el.get('text')==want or (want.endswith('*') and (el.get('text') or el.get('content-desc') or '').startswith(want[:-1])):
        b=list(map(int,re.findall(r'\d+',el.get('bounds')))); print((b[0]+b[2])//2,(b[1]+b[3])//2); break
PY
)
  if [ -n "$xy" ]; then adb shell input tap $xy; else echo "NOT FOUND: $1" | tee -a shots/problems.txt; fi
}
back() { adb shell input keyevent 4; sleep 2; }
sleep 6;  shot home-scene-start
sleep 8;  shot home-scene-middle
sleep 12; shot home-scene-end
adb shell input swipe $((W/2)) $((H*75/100)) $((W/2)) $((H*25/100)) 600; sleep 2; shot home-scrolled
adb shell input swipe $((W/2)) $((H*25/100)) $((W/2)) $((H*85/100)) 600; sleep 2

for theme in light dark; do
  tap "Каталог"; sleep 6; shot $theme-catalog
  adb shell input tap $((W*27/100)) $((H*50/100)); sleep 6; shot $theme-product
  back
  tap "Корзина"; sleep 4; shot $theme-cart
  tap "Заказы"; sleep 4; shot $theme-orders
  tap "Профиль"; sleep 4; shot $theme-profile
  tap "Избранное"; sleep 4; shot $theme-favorites; back
  tap "Главная"; sleep 25; shot $theme-home
  if [ $theme = light ]; then tap "Тёмная тема"; sleep 4; shot dark-switched; fi
done
tap "Светлая тема"; sleep 4; shot back-to-light
tap "Поиск: название, бренд, артикул"; sleep 5; shot search; back
tap "Главная"; sleep 3
tap "Избранное"; sleep 4; shot header-favorites; back
tap "Сканировать штрихкод"; sleep 5; shot scanner; back
tap "Перейти в каталог"; sleep 5; shot cta-catalog
tap "Профиль"; sleep 3; tap "Войти*"; sleep 4; shot login; back

adb logcat -d -v brief AndroidRuntime:E ReactNativeJS:V ReactNative:W '*:S' > shots/logcat.txt || true
grep -E "FATAL|Exception|Error|ERROR|TypeError|undefined is not|Warning:|WARN" shots/logcat.txt | sort | uniq -c | sort -rn | head -60 > shots/errors.txt || true
echo "screen $W x $H" >> shots/problems.txt
msg=$(cat shots/problems.txt shots/errors.txt | sed 's/%/%25/g' | cut -c1-230 | head -50 | awk '{printf "%s%%0A", $0}')
echo "::notice title=Android check::${msg}"
