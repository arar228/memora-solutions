# Memora Wallet Manager

Telegram-бот для учёта расходов, бюджета, периодических отчётов и ежедневных уведомлений.

## Переменные окружения

- `TELEGRAM_BOT_TOKEN` — токен `@MemoraWallet_bot`;
- `WALLET_DATA_DIR` — каталог постоянных данных, на VPS используется `/var/lib/memora-wallet-manager`.

В production бот работает как отдельный systemd-сервис. Данные сохраняются атомарно в `user_data.json`, поэтому перезапуск приложения сохраняет пользовательскую историю.
