# Косметичка — приложения

- [`native/`](native/) — приложение для клиентов (React Native / Expo): iPhone, Android и сайт kosmetichka-opt.ru.
  Сборки: `native.yml` (APK — релиз `native-android-latest`), `web.yml` (сайт), `eas-update.yml` (обновление по воздуху).
- [`team/`](team/) — «Косметичка Team» для сотрудников: iPhone, Android и kosmetichka-opt.ru/admin.
  Сборки: `team.yml`, `team-web.yml`.
- `scripts/` — запуск команд в CI и проверки на эмуляторе (`emu-*.sh`).

Данные приложения берут с сайта (репозиторий kosmetichka-b2b). Выкладка — при каждом изменении в `main`.

Первая, гибридная версия на Capacitor удалена 01.11.2026 (аудит P2-12): её заменило приложение в `native/`.
