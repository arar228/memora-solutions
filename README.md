# Memora Solutions

[![CI](https://github.com/arar228/memora-solutions/actions/workflows/ci.yml/badge.svg)](https://github.com/arar228/memora-solutions/actions/workflows/ci.yml)

Рабочая платформа веб-продуктов и Telegram-инструментов: управление вниманием, планирование, путешествия и учёт расходов.

[Сайт](https://memorasolutions.ru) · [Продукты](https://memorasolutions.ru/products) · [Pomodoro](https://memorasolutions.ru/pomodoro) · [Travel Radar](https://memorasolutions.ru/travel-radar)

[Архитектура и границы аудита](docs/architecture.md) · [Участие](CONTRIBUTING.md) · [Безопасность](SECURITY.md) · [Релизы](https://github.com/arar228/memora-solutions/releases)

## Что находится в репозитории

| Компонент | Задача | Исходники |
| --- | --- | --- |
| Сайт и портфолио | Страницы продуктов, интерактивные сцены, русский и английский интерфейсы | [src](src/) |
| Pomodoro | Фокус-сессии, анимированные сцены, статистика; общий интерфейс для desktop и web | [memora-pomodoro](memora-pomodoro/) |
| Travel Radar | Сбор и фильтрация предложений, Telegram-уведомления и подписки | [scripts](scripts/), [travel-radar-service.js](server/travel-radar-service.js) |
| Kanban и управление | Задачи, сообщения и настройки продуктов через защищённый API | [server](server/), [src/admin](src/admin/) |
| Wallet Manager | Telegram-бот для расходов, бюджетов и отчётов | [сервис и инструкция](services/memora-wallet-manager/) |

Страница BDayBot и его интеграция в панель управления также находятся здесь. Сам сервис BDayBot развёртывается из отдельного репозитория.

## Технологии

- **Интерфейс:** React 19, Vite, React Router, Tailwind CSS, i18next.
- **Графика и анимация:** Three.js, GSAP, Framer Motion.
- **Сервер и интеграции:** Node.js, PostgreSQL, Telegram Bot API, YooKassa.
- **Pomodoro:** Electron, React, TypeScript, SQL.js.
- **Wallet Manager:** Python.
- **Доставка:** GitHub Actions, Caddy и systemd; статические сборки для резервных источников загрузки.

## Что посмотреть в коде

- [Загрузка сайта с резервными источниками](build/resilientBootPlugin.js) — восстановление загрузки статических ресурсов.
- [Парсер предложений](scripts/parse-deals.js) и [его проверки](scripts/test-parse-deals.js) — извлечение и нормализация данных.
- [Travel Radar](server/travel-radar-service.js) и [проверки платежной логики](scripts/test-travel-payments.js) — подписки, уведомления и обработка событий оплаты.
- [HTTP-сервер](server.js) — маршрутизация, API, авторизация управления и endpoint `/health`.
- [Общий renderer Pomodoro](memora-pomodoro/src/renderer/) — интерфейс web- и desktop-версий.
- [Обновление VPS](deploy/vps/memora-update.sh) — выпуск проверенного SHA с восстановлением всего предыдущего приложения, зависимостей и настроек при сбое; рабочая база сохраняется.

## Локальный запуск сайта

Для локальной проверки используйте Node.js 24 LTS и npm. Минимальное ограничение зависимостей — Node.js 20.19+; production и CI пока используют Node.js 20, переход на поддерживаемый LTS остаётся открытой задачей.

```bash
git clone https://github.com/arar228/memora-solutions.git
cd memora-solutions
npm ci
npm run dev
```

Vite запускает интерфейс разработки. Серверные интеграции настраиваются отдельно.

Проверка статической production-сборки:

```bash
npm run build
npm run preview
```

Для запуска Node.js-сервера скопируйте [.env.example](.env.example) в `.env`, укажите настройки своего окружения и выполните:

```bash
npm run build
node --env-file=.env server.js
```

По умолчанию сервер доступен на `http://127.0.0.1:3000`, проверка состояния — `http://127.0.0.1:3000/health`. Значение `ADMIN_PASSWORD` включает доступ к управлению; при пустом значении сервер возвращает HTTP 401.

PostgreSQL и внешние сервисы нужны соответствующим функциям. Переменные интеграций и production-запуск описаны в [руководстве по эксплуатации](docs/operations.md).

## Проверки

```bash
npm run test:deals
npm run test:payments
npm run test:reliability
npm run lint
npm run build
python3 -m unittest discover -s services/memora-wallet-manager/tests -v
```

[CI](.github/workflows/ci.yml) также проверяет зависимости, синтаксис серверных модулей, типы и сборки Pomodoro. Тесты надёжности воспроизводят сбои загрузки, хранилища и платёжных уведомлений с подменёнными внешними сервисами.

Для работы с проектом: [CONTRIBUTING](CONTRIBUTING.md). Для приватного сообщения об уязвимости: [SECURITY](SECURITY.md).

## Сборка Pomodoro

Публичная сборка запускается без секретов сервисов и ключа художественной сцены:

```bash
cd memora-pomodoro
npm ci
npm run build:public
npm run build:web:public
cd ..
npm run build
```

В этом режиме Ninja заменяется процедурной «Орбитой»; таймер, настройки, статистика
и остальные сцены используют общий код. Для просмотра локальной web-сборки:

```bash
node server.js
```

Откройте `http://127.0.0.1:3000/app/pomodoro/index.html?assetSource=origin` — параметр
выбирает локальные файлы. Для desktop запустите `npm run preview:public` в каталоге
`memora-pomodoro` после `build:public`.

Официальная графика требует соответствующий `MEMORA_SCENE_KEY` и обычные команды
`build` / `build:web`. Production workflows сохраняют этот режим. Публичный режим
сборки сам по себе не меняет условий лицензии.

Подробности — в разделе [Pomodoro builds](docs/operations.md#pomodoro-builds).

## Публикация и лицензия

Это публичный рабочий репозиторий. Общая лицензия для всего проекта пока не определена: в [package.json Pomodoro](memora-pomodoro/package.json) указана MIT, а [пользовательское соглашение](memora-pomodoro/resources/license.txt) содержит ограничения на изменение и распространение. Эти условия требуют согласования владельцем перед переиспользованием и объявлением единой open-source лицензии.

Храните пароли, токены, ключи развёртывания, пользовательские базы и резервные копии вне Git. Правила настройки и проверки публикации — в [руководстве по эксплуатации](docs/operations.md#configuration-and-access).
