# Компоненты и целевые границы Memora

Срез: `memora-solutions` `c8bdcee8942a62b8fa8ef7e52a8ae122881eef68`,
`bday` `ebed974580ce3cb4f4c634438bd5c47b8d12a61d`, 6 сентября 2026 года.
Канонические репозитории сохраняются на текущих адресах.

## Каталог компонентов

| Компонент | Канонический код и точка входа | Данные и внешние границы | Проверка и сборка | Выпуск |
| --- | --- | --- | --- | --- |
| Публичный сайт | `arar228/memora-solutions`; `index.html` → `src/main.jsx` → `src/App.jsx` | Статика, route-level chunks, API того же origin | `npm ci`; `npm run lint`; `npm run test:reliability`; `npm run build` | `deploy-assets.yml` публикует хешированные assets в ветку `cdn` и GitHub Pages; `deploy-vps.yml` выпускает проверенный SHA на VPS |
| Лаборатория внимания | `src/pages/AttentionLab/`; lazy route `/attention-lab` | Авторские demo-данные; выбранные ссылки в localStorage | Общая сборка сайта; `tests/attention-lab.test.mjs` | Вместе с сайтом |
| HTTP API и управление | `server.js`; хранилища и сервисы в `server/` | PostgreSQL; Basic Auth админки; Telegram и YooKassa в явно настроенных маршрутах | `node --check server.js`; `node --check server/*.js`; reliability/payment tests | systemd `memora-solutions.service` через проверенный VPS updater |
| Travel Radar | `src/pages/TravelRadar3/`; `server/travel-radar-service.js`; `scripts/fetch-*` и `scripts/parse-deals.js` | Четыре публичных feed JSON; Telegram-каналы; Travelpayouts; PostgreSQL-журнал платежей; YooKassa | `npm run test:deals`; `npm run test:payments`; `npm run validate-feeds` | Страница и API вместе с сайтом; два schedule-workflow пока обновляют feed JSON прямо в `master` |
| Kanban | `src/pages/Kanban/`, `src/shared/KanbanBoard.jsx`, `server/kanban-store.js` | PostgreSQL через `server/admin-store.js`; общий формат доски | reliability tests и общая сборка сайта | Вместе с сайтом |
| Pomodoro web | `memora-pomodoro/src/web/main.tsx` + общий `src/renderer/App.tsx` | localStorage origin сайта; CDN-сцена и локальные web-ассеты | `npm ci`; `npx tsc --noEmit`; `npm run build:web:public`; официальный `npm run build:web` | результат в `public/app/pomodoro/`, затем общий assets workflow |
| Pomodoro desktop | `memora-pomodoro/src/main/index.ts`, `src/preload/index.ts`, общий renderer | Локальная SQLite через SQL.js; Electron tray, overlay, hotkeys и системный idle | `npm run build:public`; `npx tsc --noEmit`; официальный `npm run dist:win` | ручной `release-pomodoro.yml`; связь tag/version/SHA и неизменность артефактов остаются отдельной задачей |
| Wallet Manager | `services/memora-wallet-manager/bot.py`; сохранность в `storage.py` | Отдельный каталог JSON, Telegram | `python3 -m unittest discover -s services/memora-wallet-manager/tests -v`; `py_compile` | отдельный systemd-сервис через `deploy-wallet-manager.yml` |
| BDayBot | private `arar228/bday`; `main.py`, `bot/`, `admin_panel.py`, `database/` | PostgreSQL, Telegram, AI и платежные провайдеры; схема также читается `server/bday-store.js` | Python 3.11/3.12 CI, 21 offline unit-тест, PostgreSQL smoke, container и current-tree secret scan | отдельный private runtime; выпущенный SHA `ebed974…` |

Зелёная проверка строки подтверждает только перечисленную область. Проверки автора
и CI являются внутренними; независимый аудит требует отдельного исполнителя и
зафиксированного пакета версий.

## Фактический граф и долги

- `src/main.jsx` достигает 87 JS/JSX-файлов; Madge 8.0.0 циклов в этом графе не нашёл.
- `server.js` и `server/` образуют граф из 16 JS-файлов без циклов. Два server-модуля
  импортируют `src/data/kanbanConfig.js`, поэтому нейтральный Kanban-контракт ещё
  смешан с браузерным деревом.
- Страница Radar импортирует `public/hot-deals.json` в bundle. Это связывает
  обновляемые данные со срезом приложения и требует отдельного контракта feed.
- В исходном срезе Pomodoro web было три type-only цикла: `Scene.tsx` ↔
  `FocusOrbitScene.tsx`, `FocusTreeScene.tsx`, `LightGardenScene.tsx`. Общий
  `SceneProps` вынесен в `src/shared/types.ts`; автоматическая проверка графа
  подтверждает их устранение. Desktop main сохраняет runtime-цикл `db.ts` ↔
  `overlay.ts` через динамический импорт.
- `public/app/pomodoro/` — опубликованный результат сборки, а
  `memora-pomodoro/` — исходники. Генерируемые assets остаются отделены от файлов,
  которые редактирует разработчик.
- `POMIDOR/` содержит макеты и техническое задание; статических импортов и ссылок
  из build/deploy-команд на эту папку не найдено. Папка остаётся справочным архивом
  до решения о переносе материалов и правах на них.
- Два timestamp-файла `electron.vite.config.*.mjs` не используются текущими
  скриптами. Их происхождение и внешние потребители проверяются перед удалением.
- Иконка и два звука побайтно продублированы между `assets/` и
  `src/renderer/public/assets/`. Electron и web используют разные пути доставки;
  объединение выполняется после проверки обоих build-графов.

Крупные редактируемые файлы, которые задают следующие точки декомпозиции:
`services/memora-wallet-manager/bot.py` (около 162 КБ),
`src/pages/TravelRadar3/TravelRadar3Page.jsx` (около 76 КБ),
`src/shared/ProductDevOS.jsx` (около 71 КБ),
`src/pages/Creator/CreatorPage.jsx` (около 62 КБ) и сцены сайта (до 61 КБ).
Размер указывает место для анализа ответственности; решение о разделении требует
тестов поведения и потребителей.

## Минимальная целевая структура

```text
src/
  app/                 # запуск React, router, providers, метаданные маршрутов
  pages/               # сборка страниц из функций и общих примитивов
  features/            # самостоятельные пользовательские функции
  shared/              # браузерные UI-примитивы и утилиты
shared/
  contracts/           # чистые схемы и константы для browser + server
server/
  modules/             # Kanban, Radar, payments, BDay integration
  infrastructure/      # PostgreSQL, конфигурация, внешние клиенты
  middleware/          # общие HTTP-проверки
memora-pomodoro/        # самостоятельные web/desktop исходники и сборки
services/               # самостоятельные процессы, включая Wallet
docs/                   # карта, решения, запуск и эксплуатация
```

`shared/contracts` добавлен к исходному проекту решения по фактической причине:
Kanban-формат нужен браузеру и серверу. Этот слой содержит данные без DOM, Node.js,
сетевых клиентов и side effects.

Допустимые направления: `app → pages/features/shared/contracts`,
`pages → features/shared/contracts`, `features → shared/contracts`,
`shared → contracts`; server-модули обращаются к server infrastructure/middleware
и `shared/contracts`. Pomodoro и `services/*` используют собственные внутренние
модули и явные внешние контракты. Generated output служит результатом сборки.

## Очередь точечных переносов

| Сейчас | Целевое место | Потребители | Проверка перед и после |
| --- | --- | --- | --- |
| `src/data/kanbanConfig.js` + нужная часть `mockData.js` | `shared/contracts/kanban.js` | сайт, админка, `server/admin-store.js`, `server/kanban-store.js` | Kanban UI, database recovery tests, lint/build, import-boundary test |
| запуск и router в `src/main.jsx`/`src/App.jsx` | `src/app/` | весь browser shell | route E2E, lazy-chunk recovery, metadata, build |
| самостоятельная логика страниц | `src/features/<name>/` | соответствующие pages | компонентные тесты и route E2E |
| stores и Radar service в `server/` | `server/modules/<domain>/` | `server.js` | payment/database/reliability tests и syntax check |
| DB/config/provider clients | `server/infrastructure/` | server modules | изолированные adapter tests и cold start |
| `POMIDOR/` | `docs/design/pomodoro-archive/` либо внешний архив | документация | поиск ссылок, права, размер checkout; отдельный чистый commit |

Каждый перенос сохраняет поведение и получает отдельный commit. Оптимизация
подтверждается измерением загрузки, рендера, взаимодействия или server latency.
