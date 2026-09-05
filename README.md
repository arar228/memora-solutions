# Memora Solutions

Рабочая платформа веб-продуктов и Telegram-инструментов: управление вниманием, планирование, путешествия и учёт расходов.

[Сайт](https://memorasolutions.ru) · [Продукты](https://memorasolutions.ru/products) · [Pomodoro](https://memorasolutions.ru/pomodoro) · [Travel Radar](https://memorasolutions.ru/travel-radar)

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
- [Обновление VPS](deploy/vps/memora-update.sh) — получение изменений, сборка, проверка сервиса и возврат предыдущей статической сборки при сбое.

## Локальный запуск сайта

Требуется Node.js 20.19+ в версии, поддерживаемой Vite; CI использует Node.js 20.

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
npm run lint
npm run build
```

[CI](.github/workflows/ci.yml) также проверяет зависимости, синтаксис серверных модулей, типы и сборки Pomodoro.

## Сборка Pomodoro

У приложения отдельные зависимости и команды. Для сборки renderer нужен `MEMORA_SCENE_KEY`, соответствующий зашифрованной сцене; он передаётся через окружение сборки. Корневая сборка сайта использует готовые файлы из `public/app/pomodoro`.

Подробности — в разделе [Pomodoro builds](docs/operations.md#pomodoro-builds).

## Публикация и лицензия

Это публичный рабочий репозиторий. Общая лицензия для всего проекта пока не определена: в [package.json Pomodoro](memora-pomodoro/package.json) указана MIT, а [пользовательское соглашение](memora-pomodoro/resources/license.txt) содержит ограничения на изменение и распространение. Эти условия требуют согласования владельцем перед переиспользованием и объявлением единой open-source лицензии.

Храните пароли, токены, ключи развёртывания, пользовательские базы и резервные копии вне Git. Правила настройки и проверки публикации — в [руководстве по эксплуатации](docs/operations.md#configuration-and-access).
