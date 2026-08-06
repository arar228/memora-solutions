# --- START OF MODIFIED FILE ---
# Based on input_file_0.py with requested modifications.
#

import os
import json
import tempfile
# import datetime # This is shadowed by `from datetime import datetime`
import logging
import calendar
import re
from datetime import datetime, timedelta, time, timezone # Added timezone
import asyncio

# Ensure pytz is installed: pip install pytz
import pytz # For timezone handling

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.error import BadRequest
from telegram.ext import (
    Application, CommandHandler, MessageHandler, CallbackQueryHandler,
    ConversationHandler, ContextTypes, filters
)

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO # Change to logging.DEBUG to see more details
)
logger = logging.getLogger(__name__)

# Состояния разговора
(
    MAIN_MENU, SETTINGS, EDIT_EXPENSE, SET_DATE, SET_BUDGET,
    SET_NOTIFICATION_TIME, EDIT_EXPENSE_SELECT, EDIT_EXPENSE_AMOUNT,
    EDIT_EXPENSE_CATEGORY, EDIT_EXPENSE_DELETE, DATE_RANGE_START, DATE_RANGE_END,
    SELECT_LANGUAGE, SELECT_CURRENCY, SELECT_TIMEZONE, EDIT_EXPENSE_DATE # Новое состояние
) = range(16) # Обновляем диапазон

# Файл для хранения данных пользователей
DATA_DIR = os.environ.get("WALLET_DATA_DIR", "/var/lib/memora-wallet-manager")
USER_DATA_FILE = os.path.join(DATA_DIR, "user_data.json")

# Словарь для хранения задач уведомлений
notification_tasks = {}

# --- i18n and Formatting ---

translations = {
    "ru": {
        # Bot Name
        "bot_name": "Memora Wallet Manager 💳",
        # Main Menu
        "main_menu.title": "Главное меню:",
        "main_menu.get_report": "📊 Получить отчет",
        "main_menu.detailed_month_report": "📋 Детализация за месяц",
        "main_menu.today_details": "📝 Детализация за сегодня",
        "main_menu.expenses_by_date": "🔍 Расходы по датам",
        "main_menu.instruction": "ℹ️ Инструкция",
        "main_menu.settings": "⚙️ Настройки",
        # Start Message
        "start.welcome": "👋 Добро пожаловать в {bot_name}!",
        # "start.short_help": "Я помогу вам отслеживать расходы. Нажмите 'Инструкция' ниже, чтобы узнать, как добавлять расходы.", # No longer primary help text
        # Instruction Text (Combined old help/prompts + new settings summary)
        "instruction.text": (
            "Я помогу вам отслеживать расходы и контролировать бюджет.\nИспользуйте меню ниже или просто отправьте мне ваши расходы.\n\n"
            "➡️ **Как добавить расход:**\n"
            "Просто напишите сумму и категорию.\n\n"
            "   *Примеры:*\n"
            "   `1500 продукты`\n"
            "   `такси 350`\n\n"
            "🗓️ **Расход на другую дату:**\n"
            "Укажите дату (ДД.ММ.ГГГГ) или используйте слово `вчера`.\n\n"
            "   *Примеры:*\n"
            "   `15.04.2024 500 Обед`\n"
            "   `вчера 250 кофе`\n"
            "   `1000 Квартплата 10.03.2024`\n\n"
            "{settings_summary}" # Placeholder for settings summary
        ),
        "instruction.settings_summary": (
            "✨ Всего две основных настройки:\n\n"
            "1) **Месячный бюджет** (в Настройках) - сколько вы планируете тратить за ваш расчетный месяц.\n"
            "2) **Дата начала месяца** (в Настройках) - число (1-28), с которого начинается ваш финансовый месяц (например, 1-е число или день зарплаты)."
        ),
        # Settings Menu
        "settings.title": "⚙️ Настройки:",
        "settings.month_start_day": "📅 Дата начала месяца",
        "settings.monthly_budget": "💰 Месячный бюджет",
        "settings.notification_time": "⏰ Время уведомления",
        "settings.notifications": "🔔 Уведомления",
        "settings.edit_expenses": "📝 Редактировать расходы",
        "settings.language": "🌐 Язык",
        "settings.currency": "💲 Валюта",
        "settings.timezone": "🌍 Часовой пояс",
        "settings.back_button": "⬅️ Назад",
        "settings.month_start_day_value": "{day}-е число",
        "settings.monthly_budget_value": "{value}",
        "settings.daily_target_label": "🎯 Целевая сумма в день",
        "settings.daily_target_value": "{value}",
        "settings.notification_time_value": "{value}",
        "settings.notifications_on": "Включены",
        "settings.notifications_off": "Выключены",
        "settings.timezone_value": "{value}",
        # Prompts & Confirmations
        "prompt.enter_amount": "Введите сумму расхода:",
        "prompt.enter_category": "Введите новую категорию (1-3 слова):",
        "prompt.enter_month_start_day": "Введите день начала месяца (1-28):",
        "prompt.enter_monthly_budget": "Введите месячный бюджет:",
        "prompt.enter_notification_time": "Текущее: {current_time}\nВведите новое время для ежедневного уведомления в формате ЧЧ:ММ (например, 21:00):\nЭто время будет считаться локальным для вашего часового пояса.",
        "prompt.enter_start_date": "Введите начальную дату в формате ДД.ММ.ГГГГ:",
        "prompt.enter_end_date": "Введите конечную дату в формате ДД.ММ.ГГГГ:",
        "prompt.select_language": "Выберите язык:",
        "prompt.select_currency": "Выберите символ валюты:",
        "prompt.select_timezone": "Введите ваш часовой пояс.\nПримеры: `Europe/Moscow`, `America/New_York`.\nИли: `Москва`, `New York`, `Москва +2`, `New York -1`, `+3`, `-5` (от UTC).\nПолный список TZ: [https://en.wikipedia.org/wiki/List_of_tz_database_time_zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)",
        "prompt.enter_new_date": "Введите новую дату для расхода в формате ДД.ММ.ГГГГ или 'вчера':", # NEW
        "confirm.expense_added": "✅ Расход добавлен: {amount} ({category})",
        "confirm.expense_added_with_date": "✅ Расход добавлен: {amount} ({category}) на {date}",
        "confirm.month_start_day_set": "✅ Дата начала месяца установлена: {day}-е число.\nНовая целевая сумма в день (авто): {target}",
        "confirm.budget_set": "✅ Месячный бюджет установлен: {budget}\nНовая целевая сумма в день (авто): {target}",
        "confirm.notification_time_set": "✅ Время ежедневного уведомления установлено: {time}.",
        "confirm.notifications_toggled": "🔔 Уведомления: {status}",
        "confirm.expense_deleted": "✅ Расход успешно удален.",
        "confirm.amount_changed": "✅ Сумма изменена на {amount}.",
        "confirm.category_changed": "✅ Категория изменена на '{category}'.",
        "confirm.date_changed": "✅ Дата изменена на {date}.", # NEW
        "confirm.language_set": "✅ Язык установлен на: {language_name}",
        "confirm.currency_set": "✅ Символ валюты установлен на: {symbol}",
        "confirm.timezone_set": "✅ Часовой пояс установлен: {timezone}",
        # Errors
        "error.invalid_number": "❌ Пожалуйста, введите корректное число.",
        "error.invalid_day": "❌ Пожалуйста, введите число от 1 до 28.",
        "error.non_negative_number": "❌ Пожалуйста, введите неотрицательное число.",
        "error.invalid_time": "❌ Пожалуйста, введите время в формате ЧЧ:ММ (например, 21:00).",
        "error.invalid_date_format": "❌ Пожалуйста, введите дату в формате ДД.ММ.ГГГГ.",
        "error.invalid_expense_date_format": "❌ Неверный формат даты. Используйте ДД.ММ.ГГГГ или 'вчера'. Дата не может быть в будущем.", # NEW
        "error.end_date_before_start": "❌ Конечная дата не может быть раньше начальной.",
        "error.start_date_missing": "Ошибка: Начальная дата не найдена.",
        "error.general": "Произошла внутренняя ошибка. Пожалуйста, попробуйте позже.",
        "error.parse_expense": "Не могу распознать команду или формат расхода.\nПримеры:\n  `100 Продукты`\n  `Такси 350`\n  `вчера 50 кофе`\n  `15.04.2024 200 Обед`",
        "error.category_word_count": "❌ Категория должна содержать от 1 до 3 слов.",
        "error.category_empty": "❌ Категория не может быть пустой.",
        "error.find_expense_edit": "Ошибка: Расход для редактирования не найден.",
        "error.find_expense_delete": "Ошибка: Расход для удаления не найден.",
        "error.find_expense_update": "❌ Ошибка: Не удалось найти расход для обновления.",
        "error.invalid_original_amount": "❌ Ошибка: Исходная сумма расхода некорректна.",
        "error.invalid_timezone": "❌ Неверный часовой пояс. Пожалуйста, используйте валидное имя из TZ базы данных (например, Europe/Moscow).",
        "error.invalid_timezone_format": "❌ Неверный формат. Примеры: `Москва`, `Москва +2`, `Europe/Moscow`, `+3`.",
        # Edit Expense
        "edit.select_expense": "Выберите расход для редактирования (последние 10):",
        "edit.no_expenses": "У вас пока нет расходов для редактирования.",
        "edit.expense_details": "Расход от {date}:\nКатегория: {category}\nСумма: {amount}\n\nВыберите действие:",
        "edit.change_amount": "✏️ Изменить сумму",
        "edit.change_category": "🔄 Изменить категорию",
        "edit.change_date": "📅 Изменить дату", # NEW
        "edit.delete_expense": "🗑 Удалить расход",
        "edit.confirm_delete_prompt": "Вы действительно хотите удалить расход?\n\nДата: {date}\nКатегория: {category}\nСумма: {amount}",
        "edit.confirm_delete_yes": "✅ Да, удалить",
        "edit.confirm_delete_no": "❌ Нет, отмена",
        "edit.cancel_button": "⬅️ Отмена",
        # Reports
        "report.financial_report_title": "📊 Финансовый отчет на {date}",
        "report.monthly_budget_label": "💰 Месячный бюджет",
        "report.daily_target_label": "🎯 Целевая сумма в день",
        "report.today_spent_label": "💳 Сегодня вы потратили",
        "report.today_saved_label": "✅ Сегодня вы сэкономили (отн. ср. нормы)",
        "report.today_overspent_label": "❌ Сегодня вы превысили (отн. ср. нормы)",
        "report.month_total_spent_label": "📈 Всего за месяц потрачено",
        "report.month_saved_vs_plan_label": "✅ Экономия относительно плана",
        "report.month_overspent_vs_plan_label": "❌ Превышение плана на",
        "report.today_details_label": "📋 Детализация расходов за сегодня:",
        "report.no_expenses_today": "Расходов за сегодня не было.",
        "report.detailed_month_title": "📊 Детализация расходов за {month_year}",
        "report.period_label": " ({period})",
        "report.no_expenses_period": "Расходов за этот период не найдено.",
        "report.total_spent_label": "💰 Всего потрачено",
        "report.category_breakdown_label": "📋 Расходы по категориям:",
        "report.daily_breakdown_label": "📆 Расходы по дням:",
        "report.today_details_title": "📋 Детализация расходов за сегодня ({date})",
        "report.no_expenses_today_short": "Расходов за сегодня не найдено.",
        "report.today_total_spent_label": "💰 Всего потрачено сегодня",
        "report.today_category_breakdown_label": "📈 Расходы по категориям:",
        "report.date_range_title": "📊 Детализация расходов с {start_date} по {end_date}",
        "report.no_expenses_date_range": "Расходов за этот период не найдено.",
        # Languages
        "lang.russian": "Русский 🇷🇺",
        "lang.english": "English 🇬🇧",
        # Currencies
        "curr.ruble_symbol": "руб.",
        "curr.dollar_symbol": "$",
        "curr.euro_symbol": "€",
        "curr.rub_sign": "₽",
        # Default category name
        "category.default": "Прочее",
        # Update Notification
        "update_notification.message": "Бот переехал на новый сервер! 🎉\nПожалуйста, введите команду /start 😊",
    },
    "en": {
        # Bot Name
        "bot_name": "Memora Wallet Manager 💳",
        # Main Menu
        "main_menu.title": "Main Menu:",
        "main_menu.get_report": "📊 Get Report",
        "main_menu.detailed_month_report": "📋 Monthly Details",
        "main_menu.today_details": "📝 Today's Details",
        "main_menu.expenses_by_date": "🔍 Expenses by Date",
        "main_menu.instruction": "ℹ️ Instructions",
        "main_menu.settings": "⚙️ Settings",
        # Start Message
        "start.welcome": "👋 Welcome to {bot_name}!",
        # "start.short_help": "I'll help you track expenses. Press 'Instructions' below to learn how to add expenses.",
        # Instruction Text
        "instruction.text": (
            "I'll help you track expenses and manage your budget.\nUse the menu below or just send me your expenses.\n\n"
            "➡️ **How to add an expense:**\n"
            "Just type the amount and category.\n\n"
            "   *Examples:*\n"
            "   `15 groceries`\n"
            "   `taxi 8.5`\n\n"
            "🗓️ **Expense for a different date:**\n"
            "Specify the date (DD.MM.YYYY) or use the word `yesterday`.\n\n"
            "   *Examples:*\n"
            "   `15.04.2024 20 Lunch`\n"
            "   `yesterday 5 coffee`\n"
            "   `50 Rent 10.03.2024`\n\n"
            "{settings_summary}"
        ),
        "instruction.settings_summary": (
             "✨ Just two main settings:\n\n"
             "1) **Monthly Budget** (in Settings) - how much you plan to spend during your accounting month.\n"
             "2) **Month Start Day** (in Settings) - the day (1-28) your financial month begins (e.g., the 1st or payday)."
        ),
        # Settings Menu
        "settings.title": "⚙️ Settings:",
        "settings.month_start_day": "📅 Month Start Day",
        "settings.monthly_budget": "💰 Monthly Budget",
        "settings.notification_time": "⏰ Notification Time",
        "settings.notifications": "🔔 Notifications",
        "settings.edit_expenses": "📝 Edit Expenses",
        "settings.language": "🌐 Language",
        "settings.currency": "💲 Currency",
        "settings.timezone": "🌍 Timezone",
        "settings.back_button": "⬅️ Back",
        "settings.month_start_day_value": "{day}",
        "settings.monthly_budget_value": "{value}",
        "settings.daily_target_label": "🎯 Daily Target",
        "settings.daily_target_value": "{value}",
        "settings.notification_time_value": "{value}",
        "settings.notifications_on": "Enabled",
        "settings.notifications_off": "Disabled",
        "settings.timezone_value": "{value}",
        # Prompts & Confirmations
        "prompt.enter_amount": "Enter the expense amount:",
        "prompt.enter_category": "Enter the new category (1-3 words):",
        "prompt.enter_month_start_day": "Enter the starting day of the month (1-28):",
        "prompt.enter_monthly_budget": "Enter the monthly budget:",
        "prompt.enter_notification_time": "Current: {current_time}\nEnter the time for daily notifications in HH:MM format (e.g., 21:00):\nThis time will be local to your timezone.",
        "prompt.enter_start_date": "Enter the start date in DD.MM.YYYY format:",
        "prompt.enter_end_date": "Enter the end date in DD.MM.YYYY format:",
        "prompt.select_language": "Select language:",
        "prompt.select_currency": "Select currency symbol:",
        "prompt.select_timezone": "Enter your timezone.\nExamples: `Europe/Moscow`, `America/New_York`.\nOr: `Moscow`, `New York`, `Moscow +2`, `New York -1`, `+3`, `-5` (from UTC).\nFull TZ list: [https://en.wikipedia.org/wiki/List_of_tz_database_time_zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)",
        "prompt.enter_new_date": "Enter the new date for the expense in DD.MM.YYYY format or 'yesterday':", # NEW
        "confirm.expense_added": "✅ Expense added: {amount} ({category})",
        "confirm.expense_added_with_date": "✅ Expense added: {amount} ({category}) on {date}",
        "confirm.month_start_day_set": "✅ Month start day set to: {day}.\nNew daily target (auto): {target}",
        "confirm.budget_set": "✅ Monthly budget set to: {budget}\nNew daily target (auto): {target}",
        "confirm.notification_time_set": "✅ Daily notification time set to: {time}.",
        "confirm.notifications_toggled": "🔔 Notifications: {status}",
        "confirm.expense_deleted": "✅ Expense successfully deleted.",
        "confirm.amount_changed": "✅ Amount changed to {amount}.",
        "confirm.category_changed": "✅ Category changed to '{category}'.",
        "confirm.date_changed": "✅ Date changed to {date}.", # NEW
        "confirm.language_set": "✅ Language set to: {language_name}",
        "confirm.currency_set": "✅ Currency symbol set to: {symbol}",
        "confirm.timezone_set": "✅ Timezone set to: {timezone}",
        # Errors
        "error.invalid_number": "❌ Please enter a valid number.",
        "error.invalid_day": "❌ Please enter a number between 1 and 28.",
        "error.non_negative_number": "❌ Please enter a non-negative number.",
        "error.invalid_time": "❌ Please enter the time in HH:MM format (e.g., 21:00).",
        "error.invalid_date_format": "❌ Please enter the date in DD.MM.YYYY format.",
        "error.invalid_expense_date_format": "❌ Invalid date format. Use DD.MM.YYYY or 'yesterday'. Date cannot be in the future.", # NEW
        "error.end_date_before_start": "❌ End date cannot be earlier than the start date.",
        "error.start_date_missing": "Error: Start date not found.",
        "error.general": "An internal error occurred. Please try again later.",
        "error.parse_expense": "Could not recognize command or expense format.\nExamples:\n  `100 Groceries`\n  `Taxi 8.5`\n  `yesterday 5 coffee`\n  `15.04.2024 20.5 Lunch`",
        "error.category_word_count": "❌ Category must contain 1 to 3 words.",
        "error.category_empty": "❌ Category cannot be empty.",
        "error.find_expense_edit": "Error: Expense to edit not found.",
        "error.find_expense_delete": "Error: Expense to delete not found.",
        "error.find_expense_update": "❌ Error: Could not find the expense to update.",
        "error.invalid_original_amount": "❌ Error: Original expense amount is invalid.",
        "error.invalid_timezone": "❌ Invalid timezone. Please use a valid TZ database name (e.g., Europe/London).",
        "error.invalid_timezone_format": "❌ Invalid format. Examples: `Moscow`, `Moscow +2`, `Europe/Moscow`, `+3`.",
        # Edit Expense
        "edit.select_expense": "Select an expense to edit (last 10):",
        "edit.no_expenses": "You have no expenses to edit yet.",
        "edit.expense_details": "Expense from {date}:\nCategory: {category}\nAmount: {amount}\n\nSelect action:",
        "edit.change_amount": "✏️ Change Amount",
        "edit.change_category": "🔄 Change Category",
        "edit.change_date": "📅 Change Date", # NEW
        "edit.delete_expense": "🗑 Delete Expense",
        "edit.confirm_delete_prompt": "Are you sure you want to delete this expense?\n\nDate: {date}\nCategory: {category}\nAmount: {amount}",
        "edit.confirm_delete_yes": "✅ Yes, delete",
        "edit.confirm_delete_no": "❌ No, cancel",
        "edit.cancel_button": "⬅️ Cancel",
        # Reports
        "report.financial_report_title": "📊 Financial Report for {date}",
        "report.monthly_budget_label": "💰 Monthly Budget",
        "report.daily_target_label": "🎯 Daily Target",
        "report.today_spent_label": "💳 Spent today",
        "report.today_saved_label": "✅ Saved today (vs. avg. allowance)",
        "report.today_overspent_label": "❌ Overspent today (vs. avg. allowance)",
        "report.month_total_spent_label": "📈 Total spent this month",
        "report.month_saved_vs_plan_label": "✅ Saved compared to plan",
        "report.month_overspent_vs_plan_label": "❌ Overspent compared to plan by",
        "report.today_details_label": "📋 Today's Expense Details:",
        "report.no_expenses_today": "No expenses today.",
        "report.detailed_month_title": "📊 Monthly Expense Details for {month_year}",
        "report.period_label": " ({period})",
        "report.no_expenses_period": "No expenses found for this period.",
        "report.total_spent_label": "💰 Total Spent",
        "report.category_breakdown_label": "📋 Expenses by Category:",
        "report.daily_breakdown_label": "📆 Expenses by Day:",
        "report.today_details_title": "📋 Expense Details for Today ({date})",
        "report.no_expenses_today_short": "No expenses found for today.",
        "report.today_total_spent_label": "💰 Total spent today",
        "report.today_category_breakdown_label": "📈 Expenses by Category:",
        "report.date_range_title": "📊 Expense Details from {start_date} to {end_date}",
        "report.no_expenses_date_range": "No expenses found for this period.",
        # Languages
        "lang.russian": "Русский 🇷🇺",
        "lang.english": "English 🇬🇧",
        # Currencies
        "curr.ruble_symbol": "RUB",
        "curr.dollar_symbol": "$",
        "curr.euro_symbol": "€",
        "curr.rub_sign": "₽",
        # Default category name
        "category.default": "Other",
        # Update Notification
        "update_notification.message": "The bot has been updated! 🎉\nPlease use the /start command 😊",
    }
}

def get_translation(key: str, lang: str, **kwargs) -> str:
    # Ensure settings_summary is always present in kwargs if the key expects it
    if 'settings_summary' not in kwargs and key == "instruction.text":
        kwargs['settings_summary'] = get_translation("instruction.settings_summary", lang)

    selected_lang_dict = translations.get(lang, translations["ru"])
    base_string = selected_lang_dict.get(key)
    if base_string is None:
        logger.warning(f"Translation key '{key}' not found for language '{lang}'. Falling back to 'ru'.")
        base_string = translations["ru"].get(key)
        if base_string is None:
            logger.error(f"Translation key '{key}' not found in fallback language 'ru'. Returning key.")
            return key
    try:
        return base_string.format(**kwargs)
    except KeyError as e:
        logger.error(f"Missing placeholder key {e} for translation key '{key}' in language '{lang}'. String: '{base_string}'")
        # Try to format without the missing key if possible, or return raw string
        try:
            # Create a defaultdict to return placeholder string if key is missing
            from collections import defaultdict
            formatter = defaultdict(lambda: f'{{{e.args[0]}}}') # Return {key_name} if missing
            formatter.update(kwargs)
            return base_string.format_map(formatter)
        except Exception:
            return base_string # Fallback to raw string
    except Exception as format_e:
        logger.error(f"Error formatting string for key '{key}' in lang '{lang}': {format_e}. String: '{base_string}'")
        return base_string


def format_currency(amount: float, user_data: dict) -> str:
    symbol = user_data.get("currency_symbol", "¤")
    return f"{amount:.2f}{u'\u00A0'}{symbol}"

# --- Data Handling Functions ---
def load_user_data():
    try:
        if os.path.exists(USER_DATA_FILE):
            with open(USER_DATA_FILE, 'r', encoding='utf-8') as file:
                data = json.load(file)
                for user_id, user_info in data.items():
                    if "expenses" in user_info:
                        for expense in user_info["expenses"]:
                            if isinstance(expense.get("amount"), (int, str)):
                                try: expense["amount"] = float(expense["amount"])
                                except (ValueError, TypeError): expense["amount"] = 0.0
                    user_info["monthly_budget"] = float(user_info.get("monthly_budget", 0.0))
                    user_info["month_start_day"] = int(user_info.get("month_start_day", 1))
                    user_info["notifications_enabled"] = user_info.get("notifications_enabled", True)
                    user_info["notification_time"] = user_info.get("notification_time", "21:30")
                    user_info["language"] = user_info.get("language", "ru")
                    user_info["currency_symbol"] = user_info.get("currency_symbol", "руб.")
                    user_info["timezone"] = user_info.get("timezone", "Europe/Moscow")
                return data
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Ошибка декодирования JSON: {e} в файле {USER_DATA_FILE}")
        return {}
    except Exception as e:
        logger.error(f"Ошибка загрузки данных пользователей: {e}")
        return {}

def save_user_data(data):
    try:
        for user_id, user_info in data.items():
             if "expenses" in user_info:
                 for expense in user_info["expenses"]:
                     if isinstance(expense.get("amount"), (int, str)):
                         try: expense["amount"] = float(expense["amount"])
                         except (ValueError, TypeError): expense["amount"] = 0.0
             user_info["monthly_budget"] = float(user_info.get("monthly_budget", 0.0))
             user_info["month_start_day"] = int(user_info.get("month_start_day", 1))
             user_info["notifications_enabled"] = user_info.get("notifications_enabled", True)
             user_info["notification_time"] = user_info.get("notification_time", "21:30")
             user_info["language"] = user_info.get("language", "ru")
             user_info["currency_symbol"] = user_info.get("currency_symbol", "руб.")
             user_info["timezone"] = user_info.get("timezone", "Europe/Moscow")
        os.makedirs(DATA_DIR, exist_ok=True)
        file_descriptor, temporary_path = tempfile.mkstemp(
            prefix="user_data.",
            suffix=".tmp",
            dir=DATA_DIR,
            text=True,
        )
        try:
            with os.fdopen(file_descriptor, 'w', encoding='utf-8') as file:
                json.dump(data, file, ensure_ascii=False, indent=4)
                file.flush()
                os.fsync(file.fileno())
            os.replace(temporary_path, USER_DATA_FILE)
        finally:
            if os.path.exists(temporary_path):
                os.unlink(temporary_path)
    except Exception as e:
        logger.error(f"Ошибка сохранения данных пользователей: {e}")

def init_user_data(user_id):
    user_data = {
        "month_start_day": 1,
        "monthly_budget": 0.0,
        "notification_time": "21:30",
        "notifications_enabled": True,
        "expenses": [],
        "language": "ru",
        "currency_symbol": "руб.",
        "timezone": "Europe/Moscow"
    }
    return user_data

def get_user_data(user_id):
    data = load_user_data()
    str_user_id = str(user_id)
    is_new_user = False
    if str_user_id not in data:
        data[str_user_id] = init_user_data(user_id)
        is_new_user = True
    else:
        user_info = data[str_user_id]
        default_data = init_user_data(user_id)
        for key, default_value in default_data.items():
            if key not in user_info:
                user_info[key] = default_value
                
    if is_new_user: 
        save_user_data(data)
    return data[str_user_id]


def update_user_data(user_id, user_data_to_update):
    all_data = load_user_data()
    str_user_id = str(user_id)
    
    if str_user_id not in all_data:
        all_data[str_user_id] = init_user_data(user_id)
        logger.warning(f"User {str_user_id} not found during update_user_data. Initialized.")

    base_defaults = init_user_data(user_id) 
    current_stored_data = all_data.get(str_user_id, {}) 
    
    merged_data = base_defaults.copy() 
    merged_data.update(current_stored_data) 
    merged_data.update(user_data_to_update) 
    
    all_data[str_user_id] = merged_data
    save_user_data(all_data)

# --- Timezone Parsing Helpers ---
city_to_tz_map = {
    "москва": "Europe/Moscow",
    "moscow": "Europe/Moscow",
    "new york": "America/New_York",
    "нью-йорк": "America/New_York",
    "london": "Europe/London",
    "лондон": "Europe/London",
    "paris": "Europe/Paris",
    "париж": "Europe/Paris",
    "berlin": "Europe/Berlin",
    "берлин": "Europe/Berlin",
    "tokyo": "Asia/Tokyo",
    "токио": "Asia/Tokyo",
    "utc": "UTC",
    "gmt": "GMT",
    "гринвич": "GMT"
}

city_standard_offsets_hours = {
    "Europe/Moscow": 3,
    "America/New_York": -5, # Standard time, DST (-4) handled by pytz for full names
    "Europe/London": 0,    # Standard time, DST (+1) handled by pytz
    "Asia/Tokyo": 9,
    "Europe/Paris": 1,     # Standard time, DST (+2) handled by pytz
    "Europe/Berlin": 1,    # Standard time, DST (+2) handled by pytz
    "UTC": 0,
    "GMT": 0,
}

def _get_etc_gmt_timezone(offset_hours: float) -> str:
    # Etc/GMT has inverted sign: Etc/GMT-X means UTC+X
    if offset_hours == 0:
        return "UTC" # Or Etc/GMT
    if offset_hours > 0: # For UTC+X, use Etc/GMT-X
        return f"Etc/GMT-{int(offset_hours)}"
    else: # For UTC-X, use Etc/GMT+X
        return f"Etc/GMT+{int(abs(offset_hours))}"

def parse_custom_timezone_input(tz_input: str) -> str | None:
    tz_input_lower = tz_input.lower().strip()

    # Direct match for city names (e.g., "moscow", "new york")
    if tz_input_lower in city_to_tz_map:
        return city_to_tz_map[tz_input_lower]

    # Match for "City +/- Offset" (e.g., "Moscow +2", "New York -1")
    # This pattern matches a city name, an operator (+ or -), and a number.
    match = re.fullmatch(r"^(.*?)\s*([+-])\s*(\d+)$", tz_input_lower)
    if match:
        city_part = match.group(1).strip()
        operator = match.group(2)
        offset_val_str = match.group(3)
        
        if city_part in city_to_tz_map:
            base_tz_name_for_offset_calc = city_to_tz_map[city_part]
            # We need the actual current offset of the base city, including DST if applicable
            try:
                base_tz_pytz = pytz.timezone(base_tz_name_for_offset_calc)
                # Get current offset for the base timezone
                # datetime.now(base_tz_pytz).utcoffset() returns timedelta
                base_offset_td = datetime.now(base_tz_pytz).utcoffset()
                if base_offset_td is None: # Should not happen for valid pytz timezones
                     logger.warning(f"Could not determine current offset for base city '{city_part}' (TZ: {base_tz_name_for_offset_calc}).")
                     return None
                base_offset_h = base_offset_td.total_seconds() / 3600.0

                user_offset_h = int(offset_val_str)
                if operator == '-':
                    user_offset_h = -user_offset_h
                
                # The user's offset is relative to the *current* state of the city's timezone
                final_target_offset_h = base_offset_h + user_offset_h
                return _get_etc_gmt_timezone(final_target_offset_h)
            except ValueError:
                logger.warning(f"Could not parse offset value in '{tz_input}'.")
                return None
            except pytz.UnknownTimeZoneError:
                logger.warning(f"Base city '{city_part}' mapped to unknown TZ '{base_tz_name_for_offset_calc}'.")
                return None
        else:
            # If city_part is not in city_to_tz_map, it might be a direct TZ name like "Europe/Kiev +1"
            # This case is complex as "Europe/Kiev" is a valid TZ. For now, this is not supported.
            logger.info(f"City part '{city_part}' not in known city_to_tz_map for input '{tz_input}'.")
            return None # Or try to parse city_part as a TZ name if more complex logic is desired
            
    # Match for "+/- Offset" (e.g., "+3", "-5") -> relative to UTC
    offset_only_match = re.fullmatch(r"^[+-]\s*(\d+(?:\.\d+)?)$", tz_input_lower) # Allow float for offset
    if offset_only_match:
        offset_val_str = offset_only_match.group(1)
        # Determine operator from the original string, not just the regex group
        op_match = re.search(r"[+-]", tz_input_lower) # Search for the first + or -
        if not op_match: return None # Should not happen if fullmatch passed
        operator = op_match.group(0)
        try:
            offset_hours_val = float(offset_val_str) # Use float for precision
            if operator == '-':
                offset_hours_val = -offset_hours_val
            return _get_etc_gmt_timezone(offset_hours_val)
        except ValueError:
            logger.warning(f"Could not parse offset-only value in '{tz_input}'.")
            return None

    # If no patterns matched
    logger.info(f"Input '{tz_input}' did not match any custom timezone patterns.")
    return None


# --- Calculation and Formatting Functions ---
def get_report_period_boundaries(user_data, for_date=None):
    today_ref_date = for_date if for_date else datetime.now().date() # Use server's current date as reference for period calculation
    month_start_day = user_data.get("month_start_day", 1)
    safe_month_start_day = min(month_start_day, 28) # Ensure day is valid

    # Determine the year and month for the start of the current/previous period
    if today_ref_date.day >= safe_month_start_day:
        # Current period started this month or a previous month if day < month_start_day
        # Example: today is 15th, month_start_day is 5th -> period started on 5th of current month
        # Example: today is 3rd, month_start_day is 5th -> period started on 5th of *previous* month
        try:
            period_start_dt_naive = datetime(today_ref_date.year, today_ref_date.month, safe_month_start_day)
        except ValueError: # Handles cases like setting start day to 31 for February
             _, max_days = calendar.monthrange(today_ref_date.year, today_ref_date.month)
             period_start_dt_naive = datetime(today_ref_date.year, today_ref_date.month, min(safe_month_start_day, max_days))

        # Calculate end of the period (start of next period)
        next_period_month = today_ref_date.month + 1
        next_period_year = today_ref_date.year
        if next_period_month > 12:
            next_period_month = 1
            next_period_year += 1
        
        try:
            period_end_dt_naive = datetime(next_period_year, next_period_month, safe_month_start_day)
        except ValueError:
            _, max_days = calendar.monthrange(next_period_year, next_period_month)
            period_end_dt_naive = datetime(next_period_year, next_period_month, min(safe_month_start_day, max_days))
    else:
        # Current period started last month
        # Example: today is 3rd, month_start_day is 5th. Current period is from 5th of last month to 5th of this month.
        # End of current period is month_start_day of current month
        current_period_end_month = today_ref_date.month
        current_period_end_year = today_ref_date.year
        try:
            period_end_dt_naive = datetime(current_period_end_year, current_period_end_month, safe_month_start_day)
        except ValueError:
            _, max_days = calendar.monthrange(current_period_end_year, current_period_end_month)
            period_end_dt_naive = datetime(current_period_end_year, current_period_end_month, min(safe_month_start_day, max_days))

        # Start of current period was month_start_day of previous month
        prev_period_start_month = current_period_end_month - 1
        prev_period_start_year = current_period_end_year
        if prev_period_start_month < 1:
            prev_period_start_month = 12
            prev_period_start_year -= 1
        
        try:
            period_start_dt_naive = datetime(prev_period_start_year, prev_period_start_month, safe_month_start_day)
        except ValueError:
            _, max_days = calendar.monthrange(prev_period_start_year, prev_period_start_month)
            period_start_dt_naive = datetime(prev_period_start_year, prev_period_start_month, min(safe_month_start_day, max_days))
            
    # period_end_dt_naive is exclusive (like range a to <b)
    return period_start_dt_naive, period_end_dt_naive


def calculate_daily_target(user_data):
    # This calculation uses server's date concepts for consistency in period definition.
    # User's local "today" for displaying reports might differ but the underlying period should be stable.
    today_server_date = datetime.now().date() # Server's current date
    monthly_budget = float(user_data.get("monthly_budget", 0.0))
    
    # Get period boundaries based on server's date
    period_start_naive, period_end_naive = get_report_period_boundaries(user_data, for_date=today_server_date)
    total_days_in_period = (period_end_naive - period_start_naive).days
    
    fixed_daily_allowance = 0.0
    if monthly_budget > 0 and total_days_in_period > 0:
        fixed_daily_allowance = monthly_budget / total_days_in_period

    # Convert server's "today" to a datetime object (start of day) for comparison
    today_server_datetime_start_of_day = datetime.combine(today_server_date, time.min)

    # Days left, including today. If today is the last day, days_left is 1.
    # If period_end_naive is 01.Nov 00:00 and today_server_datetime_start_of_day is 31.Oct 00:00,
    # then (01.Nov 00:00 - 31.Oct 00:00).days = 1. This is correct.
    days_left_in_period = (period_end_naive - today_server_datetime_start_of_day).days
    
    if days_left_in_period <= 0: # Period ended or invalid
        return 0.0

    # Expenses are stored in UTC. Compare them naively against naive period boundaries.
    current_period_expenses = sum(
        float(expense.get("amount", 0.0))
        for expense in user_data.get("expenses", [])
        # Convert stored ISO UTC string to naive datetime for comparison with naive period boundaries
        if period_start_naive <= datetime.fromisoformat(expense.get("date", "1970-01-01T00:00:00Z").replace("Z", "+00:00")).replace(tzinfo=None) < period_end_naive
    )
    
    budget_left = monthly_budget - current_period_expenses
    if budget_left <= 0: # No budget left or overspent
        return 0.0 # Target is 0 if already over budget for the month

    # Dynamic target based on budget left and days left
    calculated_dynamic_target = budget_left / days_left_in_period

    # The target for today should not exceed the fixed daily allowance, if one exists and is lower.
    # This prevents suggesting a very high daily spend if user saved a lot previously.
    # However, if dynamic is higher due to underspending, it should be allowed if that's the goal.
    # The original code used min(calculated_dynamic_target, fixed_daily_allowance) if fixed_daily_allowance > 0.
    # This means the target can only be *lower* than the fixed average, which might be too restrictive.
    # Let's return the dynamic target, as it reflects the actual remaining budget over remaining days.
    # If we want to cap it at the fixed daily average:
    # final_target = calculated_dynamic_target
    # if fixed_daily_allowance > 0:
    #     final_target = min(calculated_dynamic_target, fixed_daily_allowance)
    # For now, let's use the straightforward dynamic target:
    final_target = calculated_dynamic_target
        
    return round(max(0.0, final_target), 2)


def format_date(date_str):
    try:
        # Assuming date_str is ISO format from DB (potentially with Z or offset)
        date_obj = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return date_obj.strftime("%d.%m.%Y") # Format to local-like, but it's from UTC date part
    except (ValueError, TypeError):
        # Fallback for potentially already formatted dates or other issues
        try:
            # If it's already a simple date string like "DD.MM.YYYY"
            datetime.strptime(date_str, "%d.%m.%Y")
            return date_str
        except:
            return "Invalid Date"

# --- Keyboard Functions ---
def get_main_menu_keyboard(lang="ru"):
    keyboard = [
        [InlineKeyboardButton(get_translation("main_menu.get_report", lang), callback_data="get_report")],
        [InlineKeyboardButton(get_translation("main_menu.detailed_month_report", lang), callback_data="detailed_report")],
        [InlineKeyboardButton(get_translation("main_menu.today_details", lang), callback_data="today_details")],
        [InlineKeyboardButton(get_translation("main_menu.expenses_by_date", lang), callback_data="expenses_by_date")],
        [InlineKeyboardButton(get_translation("main_menu.instruction", lang), callback_data="show_instruction")],
        [InlineKeyboardButton(get_translation("main_menu.settings", lang), callback_data="settings")]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_settings_keyboard(user_data):
    lang = user_data.get("language", "ru")
    notif_status_key = "settings.notifications_on" if user_data.get("notifications_enabled", True) else "settings.notifications_off"
    keyboard = [
        [InlineKeyboardButton(get_translation("settings.month_start_day", lang), callback_data="set_date")],
        [InlineKeyboardButton(get_translation("settings.monthly_budget", lang), callback_data="set_budget")],
        [InlineKeyboardButton(get_translation("settings.notification_time", lang), callback_data="notification_time")],
        [InlineKeyboardButton(f"{get_translation('settings.notifications', lang)}: {get_translation(notif_status_key, lang)}", callback_data="toggle_notifications")],
        [InlineKeyboardButton(get_translation("settings.language", lang), callback_data="select_language")],
        [InlineKeyboardButton(get_translation("settings.currency", lang), callback_data="select_currency")],
        [InlineKeyboardButton(get_translation("settings.timezone", lang), callback_data="select_timezone")],
        [InlineKeyboardButton(get_translation("settings.edit_expenses", lang), callback_data="edit_expenses")],
        [InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_main")]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_language_keyboard(user_data):
    lang = user_data.get("language", "ru")
    keyboard = [
        [InlineKeyboardButton(get_translation("lang.russian", lang), callback_data="set_lang_ru")],
        [InlineKeyboardButton(get_translation("lang.english", lang), callback_data="set_lang_en")],
        [InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_currency_keyboard(user_data):
    lang = user_data.get("language", "ru")
    keyboard = [
        [
            InlineKeyboardButton("руб.", callback_data="set_curr_руб."),
            InlineKeyboardButton("$", callback_data="set_curr_$"),
        ],
        [
            InlineKeyboardButton("€", callback_data="set_curr_€"),
            InlineKeyboardButton("₽", callback_data="set_curr_₽"),
        ],
        [InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]
    ]
    return InlineKeyboardMarkup(keyboard)


# --- Core Bot Logic Functions ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    bot_name = get_translation("bot_name", lang)

    settings_summary = get_translation("instruction.settings_summary", lang)
    instruction_message_text = get_translation("instruction.text", lang, settings_summary=settings_summary)

    start_message = (
        f"{get_translation('start.welcome', lang, bot_name=bot_name)}\n\n"
        f"{instruction_message_text}"
    )

    await update.message.reply_text(
        start_message,
        reply_markup=get_main_menu_keyboard(lang),
        parse_mode='Markdown'
    )
    context.user_data["state"] = MAIN_MENU
    return MAIN_MENU

async def add_expense(user_id, amount, category, expense_date_obj=None):
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    final_expense_dt_for_storage = expense_date_obj # This is already localized if provided
    
    if not final_expense_dt_for_storage: # If no date provided, use user's current time
        user_timezone_str = user_data.get("timezone", "Europe/Moscow")
        try:
            user_tz = pytz.timezone(user_timezone_str)
        except pytz.UnknownTimeZoneError:
            user_tz = pytz.timezone("Europe/Moscow") # Fallback
        final_expense_dt_for_storage = datetime.now(user_tz) # Aware datetime in user's TZ

    # Ensure it's aware for astimezone to work correctly; if expense_date_obj was naive, it needs localization.
    # parse_expense_message now should provide a localized datetime object if a date was parsed.
    # If it's naive (e.g. from old data or a bug), assume it was intended for user's local time.
    if final_expense_dt_for_storage.tzinfo is None:
        logger.warning(f"add_expense received naive datetime {final_expense_dt_for_storage}. Localizing with user's timezone.")
        user_timezone_str = user_data.get("timezone", "Europe/Moscow")
        try: user_tz = pytz.timezone(user_timezone_str)
        except pytz.UnknownTimeZoneError: user_tz = pytz.timezone("Europe/Moscow")
        final_expense_dt_for_storage = user_tz.localize(final_expense_dt_for_storage, is_dst=None)


    expense_record_iso_utc = final_expense_dt_for_storage.astimezone(pytz.utc).isoformat()
    # For display, use the date part from the user's perspective
    display_date_str = final_expense_dt_for_storage.strftime('%d.%m.%Y')


    expense = {
        "date": expense_record_iso_utc, 
        "category": category,
        "amount": float(amount)
    }
    user_data["expenses"].append(expense)
    update_user_data(user_id, user_data)
    amount_str = format_currency(amount, user_data)
    
    # expense_date_obj is the original parsed date object (or None)
    # We check if a specific date was given by the user for the message
    if expense_date_obj: 
        return get_translation("confirm.expense_added_with_date", lang, amount=amount_str, category=category, date=display_date_str)
    else:
        return get_translation("confirm.expense_added", lang, amount=amount_str, category=category)


def parse_expense_message(text_input, lang, user_timezone_str="Europe/Moscow"):
    text = text_input.strip()
    original_text = text
    parsed_expense_dt_localized = None # This will be an aware datetime object or None
    default_category_lang = lang

    try:
        user_tz = pytz.timezone(user_timezone_str)
    except pytz.UnknownTimeZoneError:
        logger.warning(f"Invalid timezone '{user_timezone_str}' in parse_expense_message. Defaulting to Europe/Moscow.")
        user_tz = pytz.timezone("Europe/Moscow")

    keywords_yesterday = {
        "ru": "вчера",
        "en": "yesterday"
    }
    yesterday_keyword_to_check = keywords_yesterday.get(lang)
    date_from_keyword = False

    if yesterday_keyword_to_check:
        pattern_yesterday = r'(?i)\b' + re.escape(yesterday_keyword_to_check) + r'\b'
        match_yesterday = re.search(pattern_yesterday, text)
        if match_yesterday:
            # 'Yesterday' means yesterday in user's local timezone. Set time to noon.
            yesterday_local_naive = datetime.combine((datetime.now(user_tz) - timedelta(days=1)).date(), time(12,0))
            parsed_expense_dt_localized = user_tz.localize(yesterday_local_naive, is_dst=None)
            
            text = text[:match_yesterday.start()] + text[match_yesterday.end():]
            text = re.sub(r'\s+', ' ', text).strip()
            date_from_keyword = True
            logger.debug(f"Extracted '{yesterday_keyword_to_check}', date set to: {parsed_expense_dt_localized}, Remaining text: '{text}'")

    if not date_from_keyword:
        date_match = re.search(r'(?<!\d)(\d{1,2}\.\d{1,2}\.\d{4})(?!\d)', text)
        if date_match:
            date_str = date_match.group(1)
            try:
                parsed_dt_naive = datetime.strptime(date_str, "%d.%m.%Y")
                # Check if date is in the future (local time for user)
                # Combine with a fixed time (e.g., noon) before localizing
                parsed_dt_naive_at_noon = datetime.combine(parsed_dt_naive.date(), time(12,0))

                if parsed_dt_naive_at_noon.date() <= datetime.now(user_tz).date():
                    parsed_expense_dt_localized = user_tz.localize(parsed_dt_naive_at_noon, is_dst=None)
                    text = text.replace(date_match.group(0), '', 1).strip()
                    text = re.sub(r'\s+', ' ', text).strip()
                    logger.debug(f"Extracted date: {date_str}, set to {parsed_expense_dt_localized}, Remaining text: '{text}'")
                else:
                    logger.debug(f"Date {date_str} is in the future (user's local time). Ignoring for expense parsing.")
            except ValueError:
                logger.debug(f"Found potential date '{date_str}' but it's invalid. Ignoring.")
            except pytz.exceptions.AmbiguousTimeError: # Handle DST transition if noon is ambiguous
                logger.warning(f"Ambiguous time for date {date_str} at noon in {user_timezone_str}. Trying DST=True.")
                parsed_expense_dt_localized = user_tz.localize(parsed_dt_naive_at_noon, is_dst=True) # Or False, or handle differently
                text = text.replace(date_match.group(0), '', 1).strip()
                text = re.sub(r'\s+', ' ', text).strip()
            except pytz.exceptions.NonExistentTimeError:
                 logger.warning(f"Non-existent time for date {date_str} at noon in {user_timezone_str}. Shifting by 1 hour.")
                 parsed_expense_dt_localized = user_tz.localize(parsed_dt_naive_at_noon + timedelta(hours=1), is_dst=None)
                 text = text.replace(date_match.group(0), '', 1).strip()
                 text = re.sub(r'\s+', ' ', text).strip()


    amount = None
    # Regex: number, optional space, then text OR text, optional space, then number
    # This allows "100 food" or "food 100"
    # amount_match = re.search(r'(?:\s|^)(\d+(?:[.,]\d+)?)(?:\s|$)', text) # Original: amount surrounded by space/start/end
    
    # Try extracting amount from start or end of remaining string
    # Pattern: (amount) (category text) OR (category text) (amount)
    # 1. Check for amount at the beginning: `123.45 category text`
    amount_first_match = re.match(r'(\d+(?:[.,]\d+)?)\s+(.+)', text)
    # 2. Check for amount at the end: `category text 123.45`
    amount_last_match = re.match(r'(.+?)\s+(\d+(?:[.,]\d+)?)$', text)
    # 3. Check if the whole text is just an amount: `123.45`
    amount_only_match = re.fullmatch(r'(\d+(?:[.,]\d+)?)$', text)

    extracted_amount_str = None
    remaining_text_for_category = ""

    if amount_first_match:
        extracted_amount_str = amount_first_match.group(1)
        remaining_text_for_category = amount_first_match.group(2).strip()
    elif amount_last_match:
        extracted_amount_str = amount_last_match.group(2)
        remaining_text_for_category = amount_last_match.group(1).strip()
    elif amount_only_match:
        extracted_amount_str = amount_only_match.group(1)
        remaining_text_for_category = "" # No category if only amount
    
    if extracted_amount_str:
        amount_str_cleaned = extracted_amount_str.replace(',', '.')
        try:
            amount_val = float(amount_str_cleaned)
            if amount_val < 0: return None, None, None # Negative amounts not allowed
            amount = amount_val
            logger.debug(f"Extracted amount: {amount_val}, Remaining text for category: '{remaining_text_for_category}'")
        except ValueError:
            logger.debug(f"Could not parse extracted amount string: '{amount_str_cleaned}'")
            return None, None, None # Invalid amount format
    else:
        logger.debug(f"No valid amount found in '{text}' (from original '{original_text}')")
        return None, None, None


    category_str = remaining_text_for_category
    if not category_str:
        category = get_translation("category.default", default_category_lang)
        logger.debug("No category text found, using default.")
    else:
        words = category_str.split()
        if 1 <= len(words) <= 3:
            category = " ".join(words).title()
            logger.debug(f"Extracted category: '{category}'")
        else:
            logger.debug(f"Invalid category word count ({len(words)}) in '{category_str}'. Failing parse.")
            return None, None, None

    return amount, category, parsed_expense_dt_localized


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text.strip()
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    user_timezone_str = user_data.get("timezone", "Europe/Moscow")
    # Get state from context.user_data, set by ConversationHandler or previous handlers
    current_state = context.user_data.get("state", MAIN_MENU)

    logger.info(f"User {user_id} (lang: {lang}, tz: {user_timezone_str}) sent text '{text}' in state {current_state}")

    # Specific input states (like SET_DATE, SET_BUDGET) are handled directly by their
    # MessageHandlers defined in ConversationHandler. This function, handle_text,
    # is intended for states like MAIN_MENU or SETTINGS where users can type expenses,
    # or as a fallback.

    if current_state == MAIN_MENU or current_state == SETTINGS:
        amount, category, expense_date_obj = parse_expense_message(text, lang, user_timezone_str)
        
        if amount is not None and category is not None:
            response = await add_expense(user_id, amount, category, expense_date_obj)
            await update.message.reply_text(response, reply_markup=get_main_menu_keyboard(lang))
            context.user_data["state"] = MAIN_MENU # Ensure state is MAIN_MENU after adding expense
            return MAIN_MENU
        else:
             # Failed to parse as an expense. Show error and current menu.
             error_message_key = "error.parse_expense"
             # Determine which keyboard to show based on the current state
             reply_markup = get_settings_keyboard(user_data) if current_state == SETTINGS else get_main_menu_keyboard(lang)
             
             await update.message.reply_text(
                 get_translation(error_message_key, lang),
                 reply_markup=reply_markup,
                 parse_mode='Markdown'
             )
             logger.debug(f"Could not parse '{text}' as expense in state {current_state}.")
             # No state change, remain in current_state
             return current_state # Explicitly return current state
             
    # This part of handle_text is typically reached if it's a fallback handler
    # for a state that wasn't MAIN_MENU or SETTINGS.
    # However, with specific handlers for SET_DATE, etc., this path might indicate
    # an unhandled text input in a state that should have had a specific text handler.
    else:
        logger.warning(f"handle_text received text '{text}' in unconfigured state {current_state}. Guiding to main menu.")
        # Default behavior: show main menu
        await update.message.reply_text(get_translation("main_menu.title", lang), reply_markup=get_main_menu_keyboard(lang))
        context.user_data["state"] = MAIN_MENU
        return MAIN_MENU


async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    query_data = query.data
    bot_name = get_translation("bot_name", lang)

    logger.info(f"User {user_id} pressed button with data: {query_data}")
    # current_state_from_context = context.user_data.get("state", MAIN_MENU) # For logging if needed
    new_state = context.user_data.get("state", MAIN_MENU) # Default to MAIN_MENU, will be updated by handlers

    # --- Main Menu Callbacks ---
    if query_data == "get_report":
        report = generate_report(user_id)
        try: await query.edit_message_text(f"{bot_name}\n\n{report}", reply_markup=get_main_menu_keyboard(lang))
        except BadRequest as e:
            if "Message is not modified" in str(e): logger.debug("Report message not modified.")
            else: raise e
        new_state = MAIN_MENU

    elif query_data == "detailed_report":
        report = generate_detailed_month_report(user_id)
        try: await query.edit_message_text(f"{bot_name}\n\n{report}", reply_markup=get_main_menu_keyboard(lang))
        except BadRequest as e:
            if "Message is not modified" in str(e): logger.debug("Detailed month report message not modified.")
            else: raise e
        new_state = MAIN_MENU

    elif query_data == "today_details":
        report = generate_today_details_report(user_id)
        try: await query.edit_message_text(f"{bot_name}\n\n{report}", reply_markup=get_main_menu_keyboard(lang))
        except BadRequest as e:
            if "Message is not modified" in str(e): logger.debug("Today details report message not modified.")
            else: raise e
        new_state = MAIN_MENU

    elif query_data == "expenses_by_date":
        await query.edit_message_text(
            get_translation("prompt.enter_start_date", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_main")]])
        )
        new_state = DATE_RANGE_START

    elif query_data == "show_instruction":
        settings_summary = get_translation("instruction.settings_summary", lang)
        instruction_message = get_translation("instruction.text", lang, settings_summary=settings_summary)
        keyboard = [[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_main")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        try:
            await query.edit_message_text(instruction_message, reply_markup=reply_markup, parse_mode='Markdown')
        except BadRequest as e:
            if "Message is not modified" in str(e): logger.debug("Instruction message not modified.")
            else: raise e
        new_state = MAIN_MENU 

    elif query_data == "settings" or query_data == "back_to_settings": 
        daily_target = calculate_daily_target(user_data)
        budget_str = format_currency(user_data.get("monthly_budget", 0.0), user_data)
        target_str = format_currency(daily_target, user_data)
        notif_status_key = "settings.notifications_on" if user_data.get("notifications_enabled", True) else "settings.notifications_off"
        settings_text = (
            f"{get_translation('settings.title', lang)}\n\n"
            f"{get_translation('settings.month_start_day', lang)}: {get_translation('settings.month_start_day_value', lang, day=user_data.get('month_start_day', 1))}\n"
            f"{get_translation('settings.monthly_budget', lang)}: {budget_str}\n"
            f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}\n"
            f"{get_translation('settings.notification_time', lang)}: {get_translation('settings.notification_time_value', lang, value=user_data.get('notification_time', '21:30'))}\n"
            f"{get_translation('settings.timezone', lang)}: {get_translation('settings.timezone_value', lang, value=user_data.get('timezone', 'Europe/Moscow'))}\n" 
            f"{get_translation('settings.notifications', lang)}: {get_translation(notif_status_key, lang)}\n"
        )
        await query.edit_message_text(settings_text, reply_markup=get_settings_keyboard(user_data))
        if "editing_expense" in context.user_data: del context.user_data["editing_expense"]
        if "edit_expense_options" in context.user_data: del context.user_data["edit_expense_options"]
        new_state = SETTINGS

    elif query_data == "back_to_main":
        await query.edit_message_text(get_translation("main_menu.title", lang), reply_markup=get_main_menu_keyboard(lang))
        if "editing_expense" in context.user_data: del context.user_data["editing_expense"]
        if "edit_expense_options" in context.user_data: del context.user_data["edit_expense_options"]
        new_state = MAIN_MENU

    elif query_data == "set_date":
        await query.edit_message_text(
            get_translation("prompt.enter_month_start_day", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]])
        )
        new_state = SET_DATE

    elif query_data == "set_budget":
        await query.edit_message_text(
             get_translation("prompt.enter_monthly_budget", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]])
        )
        new_state = SET_BUDGET

    elif query_data == "notification_time":
        await query.edit_message_text(
             get_translation("prompt.enter_notification_time", lang, current_time=user_data.get('notification_time', '21:30')),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]])
        )
        new_state = SET_NOTIFICATION_TIME

    elif query_data == "select_language":
        await query.edit_message_text(
            get_translation("prompt.select_language", lang),
            reply_markup=get_language_keyboard(user_data)
        )
        new_state = SELECT_LANGUAGE

    elif query_data == "select_currency":
        await query.edit_message_text(
            get_translation("prompt.select_currency", lang),
            reply_markup=get_currency_keyboard(user_data)
        )
        new_state = SELECT_CURRENCY
        
    elif query_data == "select_timezone": 
        await query.edit_message_text(
            get_translation("prompt.select_timezone", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]]),
            parse_mode='Markdown', 
            disable_web_page_preview=True
        )
        new_state = SELECT_TIMEZONE

    elif query_data.startswith("set_lang_"):
        selected_lang = query_data.split("_")[-1]
        if selected_lang in translations:
            user_data["language"] = selected_lang
            update_user_data(user_id, user_data)
            lang = selected_lang 
            daily_target = calculate_daily_target(user_data)
            budget_str = format_currency(user_data.get("monthly_budget", 0.0), user_data)
            target_str = format_currency(daily_target, user_data)
            notif_status_key = "settings.notifications_on" if user_data.get("notifications_enabled", True) else "settings.notifications_off"
            lang_name_key = f"lang.{'russian' if selected_lang == 'ru' else 'english'}"
            lang_name = get_translation(lang_name_key, lang)
            settings_text = (
                f"{get_translation('confirm.language_set', lang, language_name=lang_name)}\n\n"
                f"{get_translation('settings.title', lang)}\n\n"
                f"{get_translation('settings.month_start_day', lang)}: {get_translation('settings.month_start_day_value', lang, day=user_data.get('month_start_day', 1))}\n"
                f"{get_translation('settings.monthly_budget', lang)}: {budget_str}\n"
                f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}\n"
                f"{get_translation('settings.notification_time', lang)}: {get_translation('settings.notification_time_value', lang, value=user_data.get('notification_time', '21:30'))}\n"
                f"{get_translation('settings.timezone', lang)}: {get_translation('settings.timezone_value', lang, value=user_data.get('timezone', 'Europe/Moscow'))}\n"
                f"{get_translation('settings.notifications', lang)}: {get_translation(notif_status_key, lang)}\n"
            )
            await query.edit_message_text(settings_text, reply_markup=get_settings_keyboard(user_data))
            new_state = SETTINGS
        else:
            logger.warning(f"Unsupported language selection: {selected_lang}")
            # Fallback to current settings view if lang selection is broken
            await query.edit_message_text(get_translation("settings.title", lang), reply_markup=get_settings_keyboard(user_data))
            new_state = SETTINGS


    elif query_data.startswith("set_curr_"):
        selected_symbol = query_data.split("set_curr_")[-1]
        user_data["currency_symbol"] = selected_symbol
        update_user_data(user_id, user_data)
        daily_target = calculate_daily_target(user_data)
        budget_str = format_currency(user_data.get("monthly_budget", 0.0), user_data) # Uses new symbol
        target_str = format_currency(daily_target, user_data)  # Uses new symbol
        notif_status_key = "settings.notifications_on" if user_data.get("notifications_enabled", True) else "settings.notifications_off"
        settings_text = (
            f"{get_translation('confirm.currency_set', lang, symbol=selected_symbol)}\n\n"
            f"{get_translation('settings.title', lang)}\n\n"
            f"{get_translation('settings.month_start_day', lang)}: {get_translation('settings.month_start_day_value', lang, day=user_data.get('month_start_day', 1))}\n"
            f"{get_translation('settings.monthly_budget', lang)}: {budget_str}\n"
            f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}\n"
            f"{get_translation('settings.notification_time', lang)}: {get_translation('settings.notification_time_value', lang, value=user_data.get('notification_time', '21:30'))}\n"
            f"{get_translation('settings.timezone', lang)}: {get_translation('settings.timezone_value', lang, value=user_data.get('timezone', 'Europe/Moscow'))}\n"
            f"{get_translation('settings.notifications', lang)}: {get_translation(notif_status_key, lang)}\n"
        )
        await query.edit_message_text(settings_text, reply_markup=get_settings_keyboard(user_data))
        new_state = SETTINGS

    elif query_data == "toggle_notifications":
        user_data["notifications_enabled"] = not user_data.get("notifications_enabled", True)
        update_user_data(user_id, user_data)
        
        try:
            if application: await schedule_or_cancel_notification_task(application.bot, user_id)
            else: logger.error("Application object not available globally for toggle_notifications.")
        except Exception as e:
            logger.error(f"Error during schedule/cancel task in toggle: {e}", exc_info=True)

        new_status_text_key = "settings.notifications_on" if user_data["notifications_enabled"] else "settings.notifications_off"
        daily_target = calculate_daily_target(user_data)
        budget_str = format_currency(user_data.get("monthly_budget", 0.0), user_data)
        target_str = format_currency(daily_target, user_data)
        settings_text = (
             f"{get_translation('confirm.notifications_toggled', lang, status=get_translation(new_status_text_key, lang).lower())}\n\n"
             f"{get_translation('settings.title', lang)}\n\n" 
             f"{get_translation('settings.month_start_day', lang)}: {get_translation('settings.month_start_day_value', lang, day=user_data.get('month_start_day', 1))}\n"
             f"{get_translation('settings.monthly_budget', lang)}: {budget_str}\n"
             f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}\n"
             f"{get_translation('settings.notification_time', lang)}: {get_translation('settings.notification_time_value', lang, value=user_data.get('notification_time', '21:30'))}\n"
             f"{get_translation('settings.timezone', lang)}: {get_translation('settings.timezone_value', lang, value=user_data.get('timezone', 'Europe/Moscow'))}\n"
             f"{get_translation('settings.notifications', lang)}: {get_translation(new_status_text_key, lang)}\n"
        )
        await query.edit_message_text(settings_text, reply_markup=get_settings_keyboard(user_data))
        new_state = SETTINGS

    elif query_data == "edit_expenses": # Navigates to list of expenses to edit
        expenses = user_data.get("expenses", [])
        if not expenses:
            await query.edit_message_text(get_translation("edit.no_expenses", lang), reply_markup=get_settings_keyboard(user_data)) # Show settings keyboard if no expenses
            new_state = SETTINGS 
        else:
            expenses.sort(key=lambda x: x.get("date", ""), reverse=True) # Sort by date, most recent first
            recent_expenses = expenses[:10] # Show last 10
            keyboard = []
            context.user_data["edit_expense_options"] = {} # Store full expense objects for selection
            for i, expense in enumerate(recent_expenses):
                date_str = format_date(expense.get("date", ""))
                category = expense.get("category", "N/A")
                amount_str = format_currency(float(expense.get("amount", 0.0)), user_data)
                callback_key = f"edit_{i}" # Unique key for callback
                context.user_data["edit_expense_options"][callback_key] = expense # Store original expense
                keyboard.append([InlineKeyboardButton(f"{date_str} | {category} | {amount_str}", callback_data=callback_key)])
            keyboard.append([InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")])
            await query.edit_message_text(get_translation("edit.select_expense", lang), reply_markup=InlineKeyboardMarkup(keyboard))
            new_state = EDIT_EXPENSE_SELECT

    # Handling selection of a specific expense from the list generated by "edit_expenses"
    elif query_data.startswith("edit_") and query_data not in ["edit_expenses", "change_amount", "change_category", "change_date", "delete_expense", "confirm_delete_yes", "confirm_delete_no"]:
        # This implies query_data is like "edit_0", "edit_1", etc.
        selected_expense_original = context.user_data.get("edit_expense_options", {}).get(query_data)
        if not selected_expense_original:
             logger.warning(f"Could not find expense for edit key {query_data} in edit_expense_options.")
             await query.edit_message_text(get_translation("error.find_expense_edit", lang), reply_markup=get_settings_keyboard(user_data))
             new_state = SETTINGS # Fallback to settings
        else:
            context.user_data["editing_expense"] = selected_expense_original.copy() # Store a copy of the selected expense for editing
            amount_str = format_currency(float(selected_expense_original.get('amount', 0.0)), user_data)
            date_str = format_date(selected_expense_original.get('date', ''))
            category_str = selected_expense_original.get('category', 'N/A')
            
            keyboard = [
                [InlineKeyboardButton(get_translation("edit.change_amount", lang), callback_data="change_amount")],
                [InlineKeyboardButton(get_translation("edit.change_category", lang), callback_data="change_category")],
                [InlineKeyboardButton(get_translation("edit.change_date", lang), callback_data="change_date")], # NEW
                [InlineKeyboardButton(get_translation("edit.delete_expense", lang), callback_data="delete_expense")],
                [InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_edit_list")] 
            ]
            await query.edit_message_text(
                get_translation("edit.expense_details", lang,
                  date=date_str,
                  category=category_str,
                  amount=amount_str
                 ),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            new_state = EDIT_EXPENSE
            
    elif query_data == "change_amount":
        # editing_expense should be set from the previous step
        expense_to_edit = context.user_data.get("editing_expense")
        if not expense_to_edit:
            await query.edit_message_text(get_translation("error.find_expense_edit", lang), reply_markup=get_settings_keyboard(user_data))
            return SETTINGS # Fallback
        await query.edit_message_text(
            get_translation("prompt.enter_amount", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]])
        )
        new_state = EDIT_EXPENSE_AMOUNT

    elif query_data == "change_category":
        expense_to_edit = context.user_data.get("editing_expense")
        if not expense_to_edit:
            await query.edit_message_text(get_translation("error.find_expense_edit", lang), reply_markup=get_settings_keyboard(user_data))
            return SETTINGS
        await query.edit_message_text(
            get_translation("prompt.enter_category", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]])
        )
        new_state = EDIT_EXPENSE_CATEGORY

    elif query_data == "change_date": # NEW callback for initiating date change
        expense_to_edit = context.user_data.get("editing_expense")
        if not expense_to_edit:
            await query.edit_message_text(get_translation("error.find_expense_edit", lang), reply_markup=get_settings_keyboard(user_data))
            return SETTINGS
        await query.edit_message_text(
            get_translation("prompt.enter_new_date", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]])
        )
        new_state = EDIT_EXPENSE_DATE

    elif query_data == "delete_expense":
        expense = context.user_data.get("editing_expense")
        if not expense:
             await query.edit_message_text(get_translation("error.find_expense_delete", lang), reply_markup=get_settings_keyboard(user_data))
             return SETTINGS
        amount_str = format_currency(float(expense.get('amount', 0.0)), user_data)
        date_str = format_date(expense.get('date',''))
        category_str = expense.get('category','N/A')
        keyboard = [
            [InlineKeyboardButton(get_translation("edit.confirm_delete_yes", lang), callback_data="confirm_delete"),
             InlineKeyboardButton(get_translation("edit.confirm_delete_no", lang), callback_data="back_to_expense_edit")]
        ]
        await query.edit_message_text(
            get_translation("edit.confirm_delete_prompt", lang,
                date=date_str,
                category=category_str,
                amount=amount_str
             ),
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        new_state = EDIT_EXPENSE_DELETE
        
    elif query_data == "confirm_delete":
        expense_to_delete = context.user_data.get("editing_expense")
        if not expense_to_delete:
             await query.edit_message_text(get_translation("error.find_expense_delete", lang), reply_markup=get_settings_keyboard(user_data)) # Or main menu
             return SETTINGS # Fallback

        found_and_deleted = False
        try:
            # Ensure amount is float for comparison, handle potential errors if not properly stored
            amount_to_delete = float(expense_to_delete.get("amount", "NaN")) 
        except ValueError:
            logger.error(f"Invalid amount in expense_to_delete for comparison: {expense_to_delete}")
            await query.edit_message_text(get_translation("error.invalid_original_amount", lang), reply_markup=get_settings_keyboard(user_data))
            return SETTINGS

        temp_expenses = []
        # These are the key identifiers for the expense from context.user_data["editing_expense"]
        original_expense_date_str = expense_to_delete.get("date") 
        original_expense_category = expense_to_delete.get("category")

        for exp_item in user_data.get("expenses", []):
            try:
                current_exp_amount = float(exp_item.get("amount", "NaN"))
            except ValueError:
                temp_expenses.append(exp_item) # Keep malformed items if any
                continue

            # Match based on all original properties of the stored expense
            if (exp_item.get("date") == original_expense_date_str and
                exp_item.get("category") == original_expense_category and
                abs(current_exp_amount - amount_to_delete) < 0.001 and # Floating point comparison
                not found_and_deleted): # Delete only the first match
                found_and_deleted = True
            else:
                temp_expenses.append(exp_item)
        
        if found_and_deleted:
            user_data["expenses"] = temp_expenses
            update_user_data(user_id, user_data)
            await query.edit_message_text(get_translation("confirm.expense_deleted", lang), reply_markup=get_main_menu_keyboard(lang)) 
            new_state = MAIN_MENU
        else:
            # This case should ideally not happen if "editing_expense" was correctly identified
            logger.error(f"Could not find exact expense to delete: {expense_to_delete} in current user_data['expenses']")
            await query.edit_message_text(get_translation("error.find_expense_delete", lang), reply_markup=get_settings_keyboard(user_data))
            new_state = SETTINGS # Back to settings as something went wrong

        # Clean up context data related to editing
        if "editing_expense" in context.user_data: del context.user_data["editing_expense"]
        if "edit_expense_options" in context.user_data: del context.user_data["edit_expense_options"]


    elif query_data == "back_to_expense_edit": 
        # This is called when cancelling an input (amount, category, date) for an expense
        expense = context.user_data.get("editing_expense") # Get the currently edited expense
        if not expense: # Should exist if we are in this flow
             await query.edit_message_text(get_translation("error.find_expense_edit", lang), reply_markup=get_settings_keyboard(user_data))
             new_state = SETTINGS # Fallback
        else:
            amount_str = format_currency(float(expense.get('amount',0.0)), user_data)
            date_str = format_date(expense.get('date',''))
            category_str = expense.get('category','N/A')
            keyboard = [ # Rebuild the keyboard for editing options
                [InlineKeyboardButton(get_translation("edit.change_amount", lang), callback_data="change_amount")],
                [InlineKeyboardButton(get_translation("edit.change_category", lang), callback_data="change_category")],
                [InlineKeyboardButton(get_translation("edit.change_date", lang), callback_data="change_date")], # NEW
                [InlineKeyboardButton(get_translation("edit.delete_expense", lang), callback_data="delete_expense")],
                [InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_edit_list")]
            ]
            await query.edit_message_text(
                 get_translation("edit.expense_details", lang,
                  date=date_str,
                  category=category_str,
                  amount=amount_str
                 ),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            new_state = EDIT_EXPENSE

    elif query_data == "back_to_edit_list": 
        # This is called to go back from a specific expense's edit options to the list of expenses
        expenses = user_data.get("expenses", [])
        if not expenses: # Should not happen if we were editing one, but as a safeguard
             await query.edit_message_text(get_translation("edit.no_expenses", lang), reply_markup=get_settings_keyboard(user_data))
             new_state = SETTINGS
        else:
            # Re-generate the list of expenses to edit (same logic as "edit_expenses" button)
            expenses.sort(key=lambda x: x.get("date", ""), reverse=True)
            recent_expenses = expenses[:10]
            keyboard_buttons = []
            context.user_data["edit_expense_options"] = {} 
            for i, expense_item in enumerate(recent_expenses):
                date_val = format_date(expense_item.get('date',''))
                category_val = expense_item.get('category','N/A')
                amount_val_str = format_currency(float(expense_item.get('amount', 0.0)), user_data)
                callback_key = f"edit_{i}"
                context.user_data["edit_expense_options"][callback_key] = expense_item
                keyboard_buttons.append([InlineKeyboardButton(f"{date_val} | {category_val} | {amount_val_str}", callback_data=callback_key)])
            keyboard_buttons.append([InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")])
            
            await query.edit_message_text(get_translation("edit.select_expense", lang), reply_markup=InlineKeyboardMarkup(keyboard_buttons))
            new_state = EDIT_EXPENSE_SELECT
            # Clear the specific expense being edited from context as we are back to the list
            if "editing_expense" in context.user_data: del context.user_data["editing_expense"]
            
    else:
        logger.warning(f"Unhandled callback data: {query_data}")
        new_state = context.user_data.get("state", MAIN_MENU) # Default to current or main menu
        if query.message:
            try: # Attempt to reset to main menu if unclear
                await query.edit_message_text(get_translation("main_menu.title", lang), reply_markup=get_main_menu_keyboard(lang))
            except BadRequest as e:
                if "Message is not modified" in str(e): logger.debug("Main menu message not modified on unhandled callback.")
                elif "MESSAGE_ID_INVALID" in str(e) or "QUERY_ID_INVALID" in str(e) : logger.warning(f"Message or query invalid for unhandled callback {query_data}: {e}")
                else: raise e # Rethrow other BadRequests
        else: # No message to edit
            logger.warning(f"Query {query_data} has no message to edit for unhandled callback.")

    # Update state in context if it has changed
    current_state_in_context = context.user_data.get("state")
    if new_state is not None and new_state != current_state_in_context:
        context.user_data["state"] = new_state
        logger.debug(f"State changed from {current_state_in_context} to {new_state} by button_callback")
    return new_state # Return the determined new state to ConversationHandler


# --- Input Handlers for Settings ---
async def set_date(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    try:
        day = int(update.message.text)
        if 1 <= day <= 28:
            user_data["month_start_day"] = day
            update_user_data(user_id, user_data)
            daily_target = calculate_daily_target(user_data)
            target_str = format_currency(daily_target, user_data)
            budget_str = format_currency(user_data.get("monthly_budget", 0.0), user_data)
            notif_status_key = "settings.notifications_on" if user_data.get("notifications_enabled", True) else "settings.notifications_off"
            settings_text = (
                f"{get_translation('confirm.month_start_day_set', lang, day=day, target=target_str)}\n\n"
                f"{get_translation('settings.title', lang)}\n\n"
                f"{get_translation('settings.month_start_day', lang)}: {get_translation('settings.month_start_day_value', lang, day=user_data.get('month_start_day', 1))}\n"
                f"{get_translation('settings.monthly_budget', lang)}: {budget_str}\n"
                f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}\n"
                f"{get_translation('settings.notification_time', lang)}: {get_translation('settings.notification_time_value', lang, value=user_data.get('notification_time', '21:30'))}\n"
                f"{get_translation('settings.timezone', lang)}: {get_translation('settings.timezone_value', lang, value=user_data.get('timezone', 'Europe/Moscow'))}\n"
                f"{get_translation('settings.notifications', lang)}: {get_translation(notif_status_key, lang)}\n"
            )
            await update.message.reply_text(settings_text, reply_markup=get_settings_keyboard(user_data))
            context.user_data["state"] = SETTINGS
            return SETTINGS
        else:
            await update.message.reply_text(get_translation("error.invalid_day", lang),
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]]))
            # context.user_data["state"] = SET_DATE # Remain in current state
            return SET_DATE # Remain in SET_DATE state
    except ValueError:
        await update.message.reply_text(get_translation("error.invalid_number", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]]))
        # context.user_data["state"] = SET_DATE
        return SET_DATE

async def set_budget(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    try:
        budget = float(update.message.text.replace(',', '.'))
        if budget >= 0:
            user_data["monthly_budget"] = budget
            update_user_data(user_id, user_data)
            daily_target = calculate_daily_target(user_data)
            budget_str = format_currency(budget, user_data) 
            target_str = format_currency(daily_target, user_data)
            notif_status_key = "settings.notifications_on" if user_data.get("notifications_enabled", True) else "settings.notifications_off"
            settings_text = (
                f"{get_translation('confirm.budget_set', lang, budget=budget_str, target=target_str)}\n\n"
                f"{get_translation('settings.title', lang)}\n\n"
                f"{get_translation('settings.month_start_day', lang)}: {get_translation('settings.month_start_day_value', lang, day=user_data.get('month_start_day', 1))}\n"
                f"{get_translation('settings.monthly_budget', lang)}: {budget_str}\n"
                f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}\n"
                f"{get_translation('settings.notification_time', lang)}: {get_translation('settings.notification_time_value', lang, value=user_data.get('notification_time', '21:30'))}\n"
                f"{get_translation('settings.timezone', lang)}: {get_translation('settings.timezone_value', lang, value=user_data.get('timezone', 'Europe/Moscow'))}\n"
                f"{get_translation('settings.notifications', lang)}: {get_translation(notif_status_key, lang)}\n"
            )
            await update.message.reply_text(settings_text, reply_markup=get_settings_keyboard(user_data))
            context.user_data["state"] = SETTINGS
            return SETTINGS
        else:
            await update.message.reply_text(get_translation("error.non_negative_number", lang),
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]]))
            # context.user_data["state"] = SET_BUDGET
            return SET_BUDGET
    except ValueError:
        await update.message.reply_text(get_translation("error.invalid_number", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]]))
        # context.user_data["state"] = SET_BUDGET
        return SET_BUDGET

async def set_notification_time(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    try:
        time_text = update.message.text
        # Validate HH:MM format
        time_obj = datetime.strptime(time_text, "%H:%M").time() 
        user_data["notification_time"] = time_obj.strftime("%H:%M")
        update_user_data(user_id, user_data)

        if application: # Reschedule task with new time
            await schedule_or_cancel_notification_task(application.bot, user_id)
        else: logger.error("Application object not available globally for set_notification_time.")
        
        daily_target = calculate_daily_target(user_data)
        budget_str = format_currency(user_data.get("monthly_budget", 0.0), user_data)
        target_str = format_currency(daily_target, user_data)
        notif_status_key = "settings.notifications_on" if user_data.get("notifications_enabled", True) else "settings.notifications_off"
        settings_text = (
             f"{get_translation('confirm.notification_time_set', lang, time=time_text)}\n\n"
             f"{get_translation('settings.title', lang)}\n\n"
             f"{get_translation('settings.month_start_day', lang)}: {get_translation('settings.month_start_day_value', lang, day=user_data.get('month_start_day', 1))}\n"
             f"{get_translation('settings.monthly_budget', lang)}: {budget_str}\n"
             f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}\n"
             f"{get_translation('settings.notification_time', lang)}: {get_translation('settings.notification_time_value', lang, value=user_data.get('notification_time', '21:30'))}\n"
             f"{get_translation('settings.timezone', lang)}: {get_translation('settings.timezone_value', lang, value=user_data.get('timezone', 'Europe/Moscow'))}\n"
             f"{get_translation('settings.notifications', lang)}: {get_translation(notif_status_key, lang)}\n"
        )
        await update.message.reply_text(settings_text, reply_markup=get_settings_keyboard(user_data))
        context.user_data["state"] = SETTINGS
        return SETTINGS
    except ValueError: # Catches strptime failure for invalid format
        await update.message.reply_text(
             get_translation("error.invalid_time", lang),
             reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]])
        )
        # context.user_data["state"] = SET_NOTIFICATION_TIME
        return SET_NOTIFICATION_TIME

async def set_timezone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    tz_input_original = update.message.text.strip()
    
    parsed_tz_name = None
    try:
        # Try to interpret as a direct pytz timezone name first
        pytz.timezone(tz_input_original)
        parsed_tz_name = tz_input_original # It's a valid direct name
        logger.info(f"User {user_id} entered valid TZ name directly: {parsed_tz_name}")
    except pytz.UnknownTimeZoneError:
        # If not a direct TZ name, try custom parsing logic
        logger.info(f"TZ name '{tz_input_original}' not direct. Trying custom parse for user {user_id}.")
        parsed_tz_name = parse_custom_timezone_input(tz_input_original)
        if parsed_tz_name:
            try: # Validate the output of custom parser
                pytz.timezone(parsed_tz_name)
                logger.info(f"User {user_id} custom input '{tz_input_original}' parsed to valid TZ: {parsed_tz_name}")
            except pytz.UnknownTimeZoneError:
                logger.warning(f"Custom parser for '{tz_input_original}' resulted in invalid TZ '{parsed_tz_name}' for user {user_id}.")
                parsed_tz_name = None # Invalidate if custom parse output is not a real TZ
        else: # Custom parsing failed
            logger.info(f"Could not parse '{tz_input_original}' using custom logic for user {user_id}.")

    if parsed_tz_name:
        user_data["timezone"] = parsed_tz_name
        update_user_data(user_id, user_data)

        if application: # Reschedule notification task with new timezone
            await schedule_or_cancel_notification_task(application.bot, user_id)
        else: logger.error("Application object not available globally for set_timezone.")

        daily_target = calculate_daily_target(user_data)
        budget_str = format_currency(user_data.get("monthly_budget", 0.0), user_data)
        target_str = format_currency(daily_target, user_data)
        notif_status_key = "settings.notifications_on" if user_data.get("notifications_enabled", True) else "settings.notifications_off"
        
        settings_text = (
             f"{get_translation('confirm.timezone_set', lang, timezone=parsed_tz_name)}\n\n"
             f"{get_translation('settings.title', lang)}\n\n"
             f"{get_translation('settings.month_start_day', lang)}: {get_translation('settings.month_start_day_value', lang, day=user_data.get('month_start_day', 1))}\n"
             f"{get_translation('settings.monthly_budget', lang)}: {budget_str}\n"
             f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}\n"
             f"{get_translation('settings.notification_time', lang)}: {get_translation('settings.notification_time_value', lang, value=user_data.get('notification_time', '21:30'))}\n"
             f"{get_translation('settings.timezone', lang)}: {get_translation('settings.timezone_value', lang, value=user_data.get('timezone', 'Europe/Moscow'))}\n" # Shows newly set timezone
             f"{get_translation('settings.notifications', lang)}: {get_translation(notif_status_key, lang)}\n"
        )
        await update.message.reply_text(settings_text, reply_markup=get_settings_keyboard(user_data))
        context.user_data["state"] = SETTINGS
        return SETTINGS
    else: # Timezone input was invalid both directly and via custom parser
        await update.message.reply_text(
            get_translation("error.invalid_timezone_format", lang), # More generic error as it could be TZ name or format
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_settings")]])
        )
        # context.user_data["state"] = SELECT_TIMEZONE
        return SELECT_TIMEZONE


# --- Input Handlers for Editing ---
async def edit_expense_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    # Get the expense being edited from context (set when user selected an expense)
    expense_to_edit_original = context.user_data.get("editing_expense") 
    if not expense_to_edit_original:
         await update.message.reply_text(get_translation("error.find_expense_edit", lang), reply_markup=get_settings_keyboard(user_data))
         context.user_data["state"] = SETTINGS
         return SETTINGS

    try:
        new_amount_float = float(update.message.text.replace(',', '.'))
        if new_amount_float >= 0:
            found_and_updated = False
            try: # Ensure original amount from context is valid float
                original_amount_float = float(expense_to_edit_original.get("amount", "NaN"))
            except ValueError:
                await update.message.reply_text(get_translation("error.invalid_original_amount", lang), reply_markup=get_settings_keyboard(user_data))
                context.user_data["state"] = SETTINGS
                return SETTINGS
            
            updated_expense_for_display = None # To hold the modified expense for display
            # Identifiers from the original expense stored in context
            original_iso_date = expense_to_edit_original.get("date")
            original_category = expense_to_edit_original.get("category")

            # Iterate through user's expenses to find and update the matching one
            for i, exp_in_list in enumerate(user_data["expenses"]):
                try: # Ensure amount in list is valid float
                    current_exp_amount_in_list = float(exp_in_list.get("amount", "NaN"))
                except ValueError: continue # Skip malformed expense in list

                # Match based on all properties of the original expense from context
                if (exp_in_list.get("date") == original_iso_date and
                    exp_in_list.get("category") == original_category and
                    abs(current_exp_amount_in_list - original_amount_float) < 0.001): # Float comparison
                    
                    user_data["expenses"][i]["amount"] = new_amount_float
                    updated_expense_for_display = user_data["expenses"][i].copy() # Get a copy for display
                    context.user_data["editing_expense"] = user_data["expenses"][i].copy() # Update context with modified expense
                    found_and_updated = True
                    break # Found and updated, exit loop
            
            if found_and_updated:
                update_user_data(user_id, user_data) 
                amount_str_new = format_currency(new_amount_float, user_data)
                daily_target = calculate_daily_target(user_data) 
                target_str = format_currency(daily_target, user_data) # For display context
                
                # Rebuild keyboard for edit options
                keyboard = [
                    [InlineKeyboardButton(get_translation("edit.change_amount", lang), callback_data="change_amount")],
                    [InlineKeyboardButton(get_translation("edit.change_category", lang), callback_data="change_category")],
                    [InlineKeyboardButton(get_translation("edit.change_date", lang), callback_data="change_date")], # NEW
                    [InlineKeyboardButton(get_translation("edit.delete_expense", lang), callback_data="delete_expense")],
                    [InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_edit_list")]
                ]
                await update.message.reply_text(
                    f"{get_translation('confirm.amount_changed', lang, amount=amount_str_new)}\n\n"
                    f"{get_translation('edit.expense_details', lang, date=format_date(updated_expense_for_display.get('date','')), category=updated_expense_for_display.get('category','N/A'), amount=amount_str_new)}\n"
                    f"{get_translation('settings.daily_target_label', lang)} (авто): {target_str}", # Optional: show daily target impact
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
                context.user_data["state"] = EDIT_EXPENSE
                return EDIT_EXPENSE # Return to the main edit options for this expense
            else: # Should not happen if "editing_expense" was correctly identified from list
                 logger.error(f"Failed to find expense to update amount: {expense_to_edit_original}")
                 await update.message.reply_text(get_translation("error.find_expense_update", lang), reply_markup=get_settings_keyboard(user_data))
                 context.user_data["state"] = SETTINGS
                 return SETTINGS
        else: # Amount is negative
            await update.message.reply_text(get_translation("error.non_negative_number", lang),
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]]))
            # context.user_data["state"] = EDIT_EXPENSE_AMOUNT
            return EDIT_EXPENSE_AMOUNT # Remain in amount input state
    except ValueError: # Input was not a valid number
        await update.message.reply_text(get_translation("error.invalid_number", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]]))
        # context.user_data["state"] = EDIT_EXPENSE_AMOUNT
        return EDIT_EXPENSE_AMOUNT

async def edit_expense_category_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    expense_to_edit_original = context.user_data.get("editing_expense")
    if not expense_to_edit_original:
        await update.message.reply_text(get_translation("error.find_expense_edit", lang), reply_markup=get_settings_keyboard(user_data))
        context.user_data["state"] = SETTINGS
        return SETTINGS

    new_category_raw = update.message.text.strip()
    new_category_raw = re.sub(r'\s+', ' ', new_category_raw) # Normalize spaces
    words = new_category_raw.split()

    if not new_category_raw: # Empty category
         await update.message.reply_text(get_translation("error.category_empty", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]]))
         # context.user_data["state"] = EDIT_EXPENSE_CATEGORY
         return EDIT_EXPENSE_CATEGORY

    if 1 <= len(words) <= 3: # Valid category length
        new_category_title = " ".join(words).title() # Title case
        found_and_updated = False
        try: # Validate original amount from context
            original_amount_float = float(expense_to_edit_original.get("amount","NaN"))
        except ValueError:
             await update.message.reply_text(get_translation("error.invalid_original_amount", lang), reply_markup=get_settings_keyboard(user_data))
             context.user_data["state"] = SETTINGS
             return SETTINGS

        updated_expense_for_display = None
        original_iso_date = expense_to_edit_original.get("date")
        original_category = expense_to_edit_original.get("category") # The category we are changing

        for i, exp_in_list in enumerate(user_data["expenses"]):
            try:
                current_exp_amount_in_list = float(exp_in_list.get("amount", "NaN"))
            except ValueError: continue

            if (exp_in_list.get("date") == original_iso_date and
                exp_in_list.get("category") == original_category and # Match old category
                abs(current_exp_amount_in_list - original_amount_float) < 0.001):
                
                user_data["expenses"][i]["category"] = new_category_title # Update to new category
                updated_expense_for_display = user_data["expenses"][i].copy()
                context.user_data["editing_expense"] = user_data["expenses"][i].copy() # Update context
                found_and_updated = True
                break
        
        if found_and_updated:
            update_user_data(user_id, user_data)
            amount_str = format_currency(float(updated_expense_for_display.get("amount", 0.0)), user_data)
            # Rebuild keyboard for edit options
            keyboard = [
                [InlineKeyboardButton(get_translation("edit.change_amount", lang), callback_data="change_amount")],
                [InlineKeyboardButton(get_translation("edit.change_category", lang), callback_data="change_category")],
                [InlineKeyboardButton(get_translation("edit.change_date", lang), callback_data="change_date")], # NEW
                [InlineKeyboardButton(get_translation("edit.delete_expense", lang), callback_data="delete_expense")],
                [InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_edit_list")]
            ]
            await update.message.reply_text(
                f"{get_translation('confirm.category_changed', lang, category=new_category_title)}\n\n"
                f"{get_translation('edit.expense_details', lang, date=format_date(updated_expense_for_display.get('date','')), category=new_category_title, amount=amount_str)}",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            context.user_data["state"] = EDIT_EXPENSE
            return EDIT_EXPENSE
        else:
            logger.error(f"Failed to find expense to update category: {expense_to_edit_original}")
            await update.message.reply_text(get_translation("error.find_expense_update", lang), reply_markup=get_settings_keyboard(user_data))
            context.user_data["state"] = SETTINGS
            return SETTINGS
    else: # Invalid word count for category
        await update.message.reply_text(get_translation("error.category_word_count", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]]))
        # context.user_data["state"] = EDIT_EXPENSE_CATEGORY
        return EDIT_EXPENSE_CATEGORY

async def edit_expense_date_text(update: Update, context: ContextTypes.DEFAULT_TYPE): # NEW FUNCTION
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    user_timezone_str = user_data.get("timezone", "Europe/Moscow")
    expense_to_edit_original = context.user_data.get("editing_expense")

    if not expense_to_edit_original:
        await update.message.reply_text(get_translation("error.find_expense_edit", lang), reply_markup=get_settings_keyboard(user_data))
        context.user_data["state"] = SETTINGS
        return SETTINGS

    date_input_text = update.message.text.strip().lower()
    new_expense_dt_localized = None # This will be user's local, aware datetime

    try:
        user_tz = pytz.timezone(user_timezone_str)
    except pytz.UnknownTimeZoneError:
        user_tz = pytz.timezone("Europe/Moscow") # Fallback

    keywords_yesterday = {"ru": "вчера", "en": "yesterday"}
    if date_input_text == keywords_yesterday.get(lang):
        yesterday_local_naive = datetime.combine((datetime.now(user_tz) - timedelta(days=1)).date(), time(12,0)) # Noon yesterday
        new_expense_dt_localized = user_tz.localize(yesterday_local_naive, is_dst=None)
    else:
        try:
            parsed_dt_naive = datetime.strptime(date_input_text, "%d.%m.%Y")
            parsed_dt_naive_at_noon = datetime.combine(parsed_dt_naive.date(), time(12,0)) # Noon on selected date

            if parsed_dt_naive_at_noon.date() > datetime.now(user_tz).date(): # Future date
                await update.message.reply_text(
                    get_translation("error.invalid_expense_date_format", lang),
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]]))
                return EDIT_EXPENSE_DATE # Remain in date input state
            
            new_expense_dt_localized = user_tz.localize(parsed_dt_naive_at_noon, is_dst=None)

        except ValueError: # Invalid DD.MM.YYYY format
            await update.message.reply_text(
                get_translation("error.invalid_expense_date_format", lang),
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]]))
            return EDIT_EXPENSE_DATE
        except (pytz.exceptions.AmbiguousTimeError, pytz.exceptions.NonExistentTimeError) as tz_e:
            logger.warning(f"Timezone localization issue for {date_input_text} at noon: {tz_e}. Adjusting slightly.")
            # Try to adjust by an hour if it's a DST crossover issue, or just use a fixed offset
            try: new_expense_dt_localized = user_tz.localize(parsed_dt_naive_at_noon + timedelta(hours=1), is_dst=None)
            except: # If still fails, error out
                 await update.message.reply_text(get_translation("error.invalid_expense_date_format", lang),
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]]))
                 return EDIT_EXPENSE_DATE


    if not new_expense_dt_localized: # Should have been caught, but safeguard
        await update.message.reply_text(
            get_translation("error.invalid_expense_date_format", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("edit.cancel_button", lang), callback_data="back_to_expense_edit")]]))
        return EDIT_EXPENSE_DATE

    new_expense_date_iso_utc = new_expense_dt_localized.astimezone(pytz.utc).isoformat()
    display_date_str = new_expense_dt_localized.strftime('%d.%m.%Y') # For confirmation message

    found_and_updated = False
    try:
        original_amount_float = float(expense_to_edit_original.get("amount", "NaN"))
    except ValueError:
        await update.message.reply_text(get_translation("error.invalid_original_amount", lang), reply_markup=get_settings_keyboard(user_data))
        context.user_data["state"] = SETTINGS
        return SETTINGS

    updated_expense_for_display = None
    original_iso_date = expense_to_edit_original.get("date") # Original date to match
    original_category = expense_to_edit_original.get("category")

    for i, exp_in_list in enumerate(user_data["expenses"]):
        try:
            current_exp_amount_in_list = float(exp_in_list.get("amount", "NaN"))
        except ValueError: continue

        if (exp_in_list.get("date") == original_iso_date and
            exp_in_list.get("category") == original_category and
            abs(current_exp_amount_in_list - original_amount_float) < 0.001):
            
            user_data["expenses"][i]["date"] = new_expense_date_iso_utc # Update date
            updated_expense_for_display = user_data["expenses"][i].copy()
            context.user_data["editing_expense"] = user_data["expenses"][i].copy() # Update context
            found_and_updated = True
            break
    
    if found_and_updated:
        update_user_data(user_id, user_data)
        amount_str = format_currency(float(updated_expense_for_display.get("amount", 0.0)), user_data)
        keyboard = [
            [InlineKeyboardButton(get_translation("edit.change_amount", lang), callback_data="change_amount")],
            [InlineKeyboardButton(get_translation("edit.change_category", lang), callback_data="change_category")],
            [InlineKeyboardButton(get_translation("edit.change_date", lang), callback_data="change_date")],
            [InlineKeyboardButton(get_translation("edit.delete_expense", lang), callback_data="delete_expense")],
            [InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_edit_list")]
        ]
        await update.message.reply_text(
            f"{get_translation('confirm.date_changed', lang, date=display_date_str)}\n\n"
            f"{get_translation('edit.expense_details', lang, date=display_date_str, category=updated_expense_for_display.get('category','N/A'), amount=amount_str)}",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        context.user_data["state"] = EDIT_EXPENSE
        return EDIT_EXPENSE
    else:
        logger.error(f"Failed to find expense to update date: {expense_to_edit_original}")
        await update.message.reply_text(get_translation("error.find_expense_update", lang), reply_markup=get_settings_keyboard(user_data))
        context.user_data["state"] = SETTINGS
        return SETTINGS

# --- Date Range Input Handlers ---
async def date_range_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_data = get_user_data(update.effective_user.id)
    lang = user_data.get("language", "ru")
    try:
        date_text = update.message.text
        # Parse as naive datetime, representing start of day
        start_date_naive = datetime.strptime(date_text, "%d.%m.%Y") 
        context.user_data["date_range_start"] = start_date_naive.isoformat() # Store as ISO string
        await update.message.reply_text(get_translation("prompt.enter_end_date", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_main")]]))
        context.user_data["state"] = DATE_RANGE_END
        return DATE_RANGE_END
    except ValueError:
        await update.message.reply_text(get_translation("error.invalid_date_format", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_main")]]))
        # context.user_data["state"] = DATE_RANGE_START # Remain in this state
        return DATE_RANGE_START

async def date_range_end(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    try:
        date_text = update.message.text
        end_date_input_naive = datetime.strptime(date_text, "%d.%m.%Y")
        # Make end_date inclusive by setting time to max for the day
        end_date_inclusive_naive = datetime.combine(end_date_input_naive.date(), time.max) 

        start_date_iso = context.user_data.get("date_range_start")
        if not start_date_iso:
            await update.message.reply_text(get_translation("error.start_date_missing", lang), reply_markup=get_main_menu_keyboard(lang))
            context.user_data["state"] = MAIN_MENU
            return MAIN_MENU
        
        start_date_naive = datetime.fromisoformat(start_date_iso) # Convert back from ISO string

        if end_date_inclusive_naive < start_date_naive: # Compare date parts essentially
            await update.message.reply_text(get_translation("error.end_date_before_start", lang),
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_main")]]))
            # Prompt again for end date
            await update.message.reply_text(get_translation("prompt.enter_end_date", lang), 
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_main")]]))
            # context.user_data["state"] = DATE_RANGE_END # Remain in this state
            return DATE_RANGE_END
        
        # Pass naive start_date and inclusive end_date to report generator
        report = generate_expenses_by_date_range(user_id, start_date_naive, end_date_inclusive_naive) 
        bot_name = get_translation("bot_name", lang)
        await update.message.reply_text(f"{bot_name}\n\n{report}", reply_markup=get_main_menu_keyboard(lang))
        
        if "date_range_start" in context.user_data: del context.user_data["date_range_start"]
        context.user_data["state"] = MAIN_MENU
        return MAIN_MENU
    except ValueError:
        await update.message.reply_text(get_translation("error.invalid_date_format", lang),
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(get_translation("settings.back_button", lang), callback_data="back_to_main")]]))
        # context.user_data["state"] = DATE_RANGE_END
        return DATE_RANGE_END


# --- Report Generation Functions ---
def generate_report(user_id):
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    
    user_timezone_str = user_data.get("timezone", "Europe/Moscow")
    try: user_tz = pytz.timezone(user_timezone_str)
    except pytz.UnknownTimeZoneError: user_tz = pytz.timezone("Europe/Moscow") # Fallback
        
    # "Today" from user's perspective
    today_user_local_date = datetime.now(user_tz).date()
    
    today_expenses_list = []
    for exp in user_data.get("expenses", []):
        try:
            # Stored date is UTC ISO string
            exp_dt_iso_utc = datetime.fromisoformat(exp.get("date", "1970-01-01T00:00:00Z").replace("Z", "+00:00"))
            # Convert to user's local timezone to get the date from their perspective
            exp_local_date = exp_dt_iso_utc.astimezone(user_tz).date()

            if exp_local_date == today_user_local_date:
                today_expenses_list.append(exp)
        except ValueError:
            logger.warning(f"Skipping invalid date format in expense for today's report: {exp}")
            continue

    today_total = sum(float(exp.get("amount", 0.0)) for exp in today_expenses_list)
    
    # For monthly calculations, use server's date to define the period consistently
    period_start_naive, period_end_naive = get_report_period_boundaries(user_data, for_date=datetime.now().date())

    month_expenses_list = []
    for exp in user_data.get("expenses", []):
        try:
            # Convert stored UTC ISO to naive datetime for comparison with naive period boundaries
            exp_dt_naive_utc_based = datetime.fromisoformat(exp.get("date","1970-01-01T00:00:00Z").replace("Z", "+00:00")).replace(tzinfo=None)
            if period_start_naive <= exp_dt_naive_utc_based < period_end_naive:
                month_expenses_list.append(exp)
        except ValueError:
            logger.warning(f"Skipping invalid date format in expense for monthly report: {exp}")

    month_total = sum(float(exp.get("amount", 0.0)) for exp in month_expenses_list)
    monthly_budget = float(user_data.get("monthly_budget", 0.0))
    daily_target_final = calculate_daily_target(user_data) # Uses server's date for period logic

    # For saved/overspent calculation, compare against fixed daily average for the period
    total_days_in_reporting_period = (period_end_naive - period_start_naive).days
    fixed_daily_average_for_period = 0.0
    if total_days_in_reporting_period > 0 and monthly_budget > 0:
        fixed_daily_average_for_period = monthly_budget / total_days_in_reporting_period

    # Server's current date and time
    server_now_datetime = datetime.now() 
    # Days passed in period, including today, up to a max of total_days_in_period
    days_passed_in_period = max(0, (datetime.combine(server_now_datetime.date(), time.min) - period_start_naive).days) + 1
    days_passed_in_period = min(days_passed_in_period, total_days_in_reporting_period)


    expected_spending_up_to_today_fixed_avg = days_passed_in_period * fixed_daily_average_for_period
    month_diff_vs_fixed_avg = expected_spending_up_to_today_fixed_avg - month_total 
    today_diff_vs_fixed_avg = fixed_daily_average_for_period - today_total 

    monthly_budget_str = format_currency(monthly_budget, user_data)
    daily_target_final_str = format_currency(daily_target_final, user_data)
    today_total_str = format_currency(today_total, user_data)
    month_total_str = format_currency(month_total, user_data)
    report_date_str = today_user_local_date.strftime('%d.%m.%Y') # Display date is user's local "today"

    report = (
        f"{get_translation('report.financial_report_title', lang, date=report_date_str)}\n\n"
        f"{get_translation('report.monthly_budget_label', lang)}: {monthly_budget_str}\n"
        f"{get_translation('report.daily_target_label', lang)}: {daily_target_final_str}\n\n"
        f"{get_translation('report.today_spent_label', lang)}: {today_total_str}\n"
    )
    if fixed_daily_average_for_period > 0: 
        if today_diff_vs_fixed_avg >= 0:
            report += f"{get_translation('report.today_saved_label', lang)}: {format_currency(today_diff_vs_fixed_avg, user_data)}\n"
        else:
            report += f"{get_translation('report.today_overspent_label', lang)}: {format_currency(abs(today_diff_vs_fixed_avg), user_data)}\n"

    report += f"\n{get_translation('report.month_total_spent_label', lang)}: {month_total_str}\n"
    if monthly_budget > 0 or month_total > 0: # Show this comparison if there's a budget or spending
        if month_diff_vs_fixed_avg >= 0: 
            report += f"{get_translation('report.month_saved_vs_plan_label', lang)}: {format_currency(month_diff_vs_fixed_avg, user_data)}\n"
        else: 
            report += f"{get_translation('report.month_overspent_vs_plan_label', lang)}: {format_currency(abs(month_diff_vs_fixed_avg), user_data)}\n"

    if today_expenses_list:
        report += f"\n{get_translation('report.today_details_label', lang)}\n"
        categories = {}
        for expense in today_expenses_list:
            category = expense.get("category", get_translation("category.default", lang))
            amount = float(expense.get("amount", 0.0))
            categories[category] = categories.get(category, 0) + amount
        sorted_categories = sorted(categories.items(), key=lambda item: item[1], reverse=True)
        for category, amount in sorted_categories:
            report += f"- {category}: {format_currency(amount, user_data)}\n"
    else:
        report += f"\n{get_translation('report.no_expenses_today', lang)}\n"
    return report

def generate_detailed_month_report(user_id):
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    
    # Use server's date for consistent period definition
    period_start_naive, period_end_naive = get_report_period_boundaries(user_data, for_date=datetime.now().date())
    
    # For display, month name comes from the start of the period
    month_name_str = period_start_naive.strftime("%B %Y") 
    # Period label is inclusive for end date display
    period_label = f"{period_start_naive.strftime('%d.%m.%Y')} - {(period_end_naive - timedelta(days=1)).strftime('%d.%m.%Y')}"


    month_expenses_list = []
    for expense in user_data.get("expenses", []):
        try:
            # Convert stored UTC ISO to naive for comparison
            exp_dt_naive_utc_based = datetime.fromisoformat(expense.get("date","1970-01-01T00:00:00Z").replace("Z", "+00:00")).replace(tzinfo=None)
            if period_start_naive <= exp_dt_naive_utc_based < period_end_naive:
                 month_expenses_list.append(expense)
        except ValueError: continue 

    report = f"{get_translation('report.detailed_month_title', lang, month_year=month_name_str)}{get_translation('report.period_label', lang, period=period_label)}\n\n"

    if not month_expenses_list:
        report += get_translation("report.no_expenses_period", lang)
        return report

    month_total = 0.0
    categories = {}
    days = {} # Keyed by date string DD.MM.YYYY (from user's perspective of when expense occurred)
    
    user_timezone_str = user_data.get("timezone", "Europe/Moscow")
    try: user_tz = pytz.timezone(user_timezone_str)
    except pytz.UnknownTimeZoneError: user_tz = pytz.timezone("Europe/Moscow")


    for expense in month_expenses_list:
        try:
             amount = float(expense.get("amount", 0.0))
             category = expense.get("category", get_translation("category.default", lang))
             
             # Convert stored UTC ISO to user's local datetime for grouping by local date
             exp_dt_iso_utc = datetime.fromisoformat(expense.get("date","1970-01-01T00:00:00Z").replace("Z", "+00:00"))
             exp_local_dt = exp_dt_iso_utc.astimezone(user_tz)
             date_str_for_grouping = exp_local_dt.strftime("%d.%m.%Y") 
             
             month_total += amount
             categories[category] = categories.get(category, 0) + amount
             days[date_str_for_grouping] = days.get(date_str_for_grouping, 0) + amount
        except (ValueError, TypeError):
             logger.warning(f"Skipping invalid expense data during detailed month report: {expense}")
             continue

    report += f"{get_translation('report.total_spent_label', lang)}: {format_currency(month_total, user_data)}\n\n"
    if categories:
        report += f"{get_translation('report.category_breakdown_label', lang)}\n"
        sorted_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        for category, amount in sorted_categories:
            percentage = (amount / month_total) * 100 if month_total > 0 else 0
            report += f"- {category}: {format_currency(amount, user_data)} ({percentage:.1f}%)\n"
    if days:
        report += f"\n{get_translation('report.daily_breakdown_label', lang)}\n"
        # Sort days chronologically
        sorted_days = sorted(days.items(), key=lambda x: datetime.strptime(x[0], "%d.%m.%Y"))
        for date_str, amount in sorted_days:
            report += f"- {date_str}: {format_currency(amount, user_data)}\n"
    return report

def generate_today_details_report(user_id):
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")

    user_timezone_str = user_data.get("timezone", "Europe/Moscow")
    try: user_tz = pytz.timezone(user_timezone_str)
    except pytz.UnknownTimeZoneError: user_tz = pytz.timezone("Europe/Moscow")
    
    today_user_local_dt = datetime.now(user_tz)
    today_user_date_str_display = today_user_local_dt.strftime('%d.%m.%Y')
    
    today_expenses_list = []
    for exp in user_data.get("expenses", []):
        try:
            exp_dt_iso_utc = datetime.fromisoformat(exp.get("date", "1970-01-01T00:00:00Z").replace("Z", "+00:00"))
            exp_local_date = exp_dt_iso_utc.astimezone(user_tz).date()

            if exp_local_date == today_user_local_dt.date(): 
                today_expenses_list.append(exp)
        except ValueError: continue

    today_total = sum(float(exp.get("amount", 0.0)) for exp in today_expenses_list)

    report = f"{get_translation('report.today_details_title', lang, date=today_user_date_str_display)}\n\n"
    if not today_expenses_list:
        report += get_translation("report.no_expenses_today_short", lang)
        return report

    report += f"{get_translation('report.today_total_spent_label', lang)}: {format_currency(today_total, user_data)}\n\n"
    report += f"{get_translation('report.today_category_breakdown_label', lang)}\n"
    categories = {}
    for expense in today_expenses_list:
        category = expense.get("category", get_translation("category.default", lang))
        amount = float(expense.get("amount", 0.0))
        categories[category] = categories.get(category, 0) + amount

    sorted_categories = sorted(categories.items(), key=lambda item: item[1], reverse=True)
    for category, amount in sorted_categories:
        percentage = (amount / today_total) * 100 if today_total > 0 else 0
        report += f"- {category}: {format_currency(amount, user_data)} ({percentage:.1f}%)\n"
    return report

def generate_expenses_by_date_range(user_id, start_date_naive, end_date_naive_inclusive):
    # Input dates are naive, representing user's local start/end of day for the range
    user_data = get_user_data(user_id)
    lang = user_data.get("language", "ru")
    
    user_timezone_str = user_data.get("timezone", "Europe/Moscow")
    try: user_tz = pytz.timezone(user_timezone_str)
    except pytz.UnknownTimeZoneError: user_tz = pytz.timezone("Europe/Moscow")

    # Convert naive range boundaries to user's local timezone, then to UTC for DB query simulation
    # Start of range: local_start_date 00:00:00
    # End of range: local_end_date 23:59:59
    try:
        range_start_local_aware = user_tz.localize(datetime.combine(start_date_naive.date(), time.min), is_dst=None)
        range_end_local_aware = user_tz.localize(datetime.combine(end_date_naive_inclusive.date(), time.max), is_dst=None)
    except (pytz.exceptions.AmbiguousTimeError, pytz.exceptions.NonExistentTimeError) as e:
        logger.error(f"Timezone error when creating date range: {e}. Using naive dates directly as fallback.")
        # Fallback: use naive dates directly if localization fails (less accurate for DST edge cases)
        range_start_utc = datetime.combine(start_date_naive.date(), time.min)
        range_end_utc = datetime.combine(end_date_naive_inclusive.date(), time.max)
    else:
        range_start_utc = range_start_local_aware.astimezone(pytz.utc)
        range_end_utc = range_end_local_aware.astimezone(pytz.utc)

    period_expenses = []
    for expense in user_data.get("expenses", []):
        try:
            exp_dt_utc = datetime.fromisoformat(expense.get("date","1970-01-01T00:00:00Z").replace("Z", "+00:00"))
            # Ensure it's aware UTC for comparison
            if exp_dt_utc.tzinfo is None: exp_dt_utc = pytz.utc.localize(exp_dt_utc)
            
            if range_start_utc <= exp_dt_utc <= range_end_utc:
                period_expenses.append(expense)
        except ValueError: continue


    start_f = start_date_naive.strftime('%d.%m.%Y')
    end_f = end_date_naive_inclusive.strftime('%d.%m.%Y')
    report = f"{get_translation('report.date_range_title', lang, start_date=start_f, end_date=end_f)}\n\n"
    
    if not period_expenses:
        report += get_translation("report.no_expenses_date_range", lang)
        return report
        
    period_total = 0.0
    categories = {}
    days = {} # Keyed by date string DD.MM.YYYY (from user's perspective)

    for expense in period_expenses:
        try:
             amount = float(expense.get("amount", 0.0))
             category = expense.get("category", get_translation("category.default", lang))
             
             exp_dt_iso_utc = datetime.fromisoformat(expense.get("date","1970-01-01T00:00:00Z").replace("Z", "+00:00"))
             exp_local_dt = exp_dt_iso_utc.astimezone(user_tz) # Convert to user's local time for grouping
             date_str_for_grouping = exp_local_dt.strftime("%d.%m.%Y")
             
             period_total += amount
             categories[category] = categories.get(category, 0) + amount
             days[date_str_for_grouping] = days.get(date_str_for_grouping, 0) + amount
        except (ValueError, TypeError):
             logger.warning(f"Skipping invalid expense data during date range report: {expense}")
             continue

    report += f"{get_translation('report.total_spent_label', lang)}: {format_currency(period_total, user_data)}\n\n"
    if categories:
        report += f"{get_translation('report.category_breakdown_label', lang)}\n"
        sorted_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        for category, amount in sorted_categories:
            percentage = (amount / period_total) * 100 if period_total > 0 else 0
            report += f"- {category}: {format_currency(amount, user_data)} ({percentage:.1f}%)\n"
    if days:
        report += f"\n{get_translation('report.daily_breakdown_label', lang)}\n"
        sorted_days = sorted(days.items(), key=lambda x: datetime.strptime(x[0], "%d.%m.%Y"))
        for date_str_key, amount in sorted_days: 
            report += f"- {date_str_key}: {format_currency(amount, user_data)}\n"
    return report


# --- Notifications ---
async def schedule_or_cancel_notification_task(bot, user_id):
    user_id_str = str(user_id)
    user_data = get_user_data(user_id) # Get fresh user data
    notifications_enabled = user_data.get("notifications_enabled", True)

    # Cancel existing task if it exists and is running
    if user_id_str in notification_tasks:
        task = notification_tasks[user_id_str]
        if not task.done(): # Check if task is still running or scheduled
            logger.info(f"Cancelling existing notification task for user {user_id_str}")
            task.cancel()
            try:
                # Wait briefly for the task to acknowledge cancellation
                await asyncio.wait_for(task, timeout=1.0) 
            except asyncio.CancelledError:
                logger.debug(f"Task for user {user_id_str} successfully cancelled.")
            except asyncio.TimeoutError:
                logger.warning(f"Timeout waiting for task {user_id_str} to cancel. It might still terminate.")
            except Exception as e_cancel: # Catch any other exceptions during await
                logger.error(f"Error during task cancellation or waiting for {user_id_str}: {e_cancel}", exc_info=True)
        # Remove from dict after cancellation attempt, regardless of outcome of wait_for
        if user_id_str in notification_tasks: # Check again as it might have been removed in an exception block
            del notification_tasks[user_id_str]

    # Schedule new task if notifications are enabled
    if notifications_enabled:
        # Ensure no task is currently in the dict, or if it is, it's truly done
        if user_id_str not in notification_tasks or notification_tasks.get(user_id_str, asyncio.Future()).done():
            logger.info(f"Scheduling new notification task for user {user_id_str}")
            new_task = asyncio.create_task(schedule_notification(bot, user_id), name=f"notif_{user_id_str}")
            notification_tasks[user_id_str] = new_task
        else:
            # This case implies a task exists and wasn't properly cancelled/removed.
            logger.warning(f"Task for user {user_id_str} may still exist and is not done after cancellation attempt. Not rescheduling immediately to avoid conflict.")
    else:
        logger.info(f"Notifications disabled for user {user_id_str}. Task not scheduled (or was cancelled).")


async def schedule_notification(bot, user_id):
    user_id_str = str(user_id)
    logger.info(f"Starting notification loop for user {user_id_str}")
    try:
        while True:
            # Get fresh user data inside the loop for up-to-date settings
            user_data = get_user_data(user_id) 
            lang = user_data.get("language", "ru")
            bot_name = get_translation("bot_name", lang) # For the notification message

            if not user_data.get("notifications_enabled", True):
                logger.info(f"Notifications disabled for {user_id_str} (loop check). Exiting scheduler for this user.")
                if user_id_str in notification_tasks and notification_tasks.get(user_id_str) is asyncio.current_task():
                     del notification_tasks[user_id_str] # Clean up task entry
                break # Exit the loop for this user

            notification_time_str = user_data.get("notification_time", "21:30")
            user_timezone_str = user_data.get("timezone", "Europe/Moscow") 

            try: # Parse HH:MM
                target_local_time = datetime.strptime(notification_time_str, "%H:%M").time()
            except ValueError:
                logger.error(f"Invalid notification time format '{notification_time_str}' for user {user_id_str}. Defaulting to 21:30.")
                target_local_time = time(21, 30) # Fallback time
            
            try: # Get user's timezone object
                user_tz = pytz.timezone(user_timezone_str) 
            except pytz.UnknownTimeZoneError:
                logger.error(f"Unknown timezone '{user_timezone_str}' for user {user_id_str}. Defaulting to Europe/Moscow.") 
                user_tz = pytz.timezone("Europe/Moscow") # Fallback timezone

            # Determine next notification datetime in user's local timezone
            now_in_user_tz = datetime.now(user_tz)
            next_notification_local_dt_naive = datetime.combine(now_in_user_tz.date(), target_local_time)
            
            # Localize the naive datetime. is_dst=None handles DST transitions correctly for most cases.
            # However, it can raise AmbiguousTimeError or NonExistentTimeError during DST fallbacks/springforwards.
            try:
                next_notification_local_dt_aware = user_tz.localize(next_notification_local_dt_naive, is_dst=None)
            except pytz.exceptions.AmbiguousTimeError: # e.g., during fall-back DST
                logger.warning(f"Ambiguous time for user {user_id_str} at {next_notification_local_dt_naive} in {user_timezone_str}. Using is_dst=True (standard time usually).")
                next_notification_local_dt_aware = user_tz.localize(next_notification_local_dt_naive, is_dst=True) # Or False, depending on desired behavior
            except pytz.exceptions.NonExistentTimeError: # e.g., during spring-forward DST
                logger.warning(f"Non-existent time for user {user_id_str} at {next_notification_local_dt_naive} in {user_timezone_str}. Shifting by 1 hour.")
                next_notification_local_dt_naive += timedelta(hours=1) # Shift into valid time
                next_notification_local_dt_aware = user_tz.localize(next_notification_local_dt_naive, is_dst=None) # Should be valid now


            # If the calculated time is in the past for today, schedule for tomorrow
            if next_notification_local_dt_aware <= now_in_user_tz:
                tomorrow_local_date = now_in_user_tz.date() + timedelta(days=1)
                next_notification_local_dt_naive = datetime.combine(tomorrow_local_date, target_local_time)
                try: # Relocalize for tomorrow
                    next_notification_local_dt_aware = user_tz.localize(next_notification_local_dt_naive, is_dst=None)
                except pytz.exceptions.AmbiguousTimeError: next_notification_local_dt_aware = user_tz.localize(next_notification_local_dt_naive, is_dst=True)
                except pytz.exceptions.NonExistentTimeError:
                    next_notification_local_dt_naive += timedelta(hours=1)
                    next_notification_local_dt_aware = user_tz.localize(next_notification_local_dt_naive, is_dst=None)


            # Convert scheduled local time to UTC for asyncio.sleep
            next_notification_utc = next_notification_local_dt_aware.astimezone(pytz.utc)
            now_utc = datetime.now(pytz.utc)
            wait_time_seconds = (next_notification_utc - now_utc).total_seconds()

            if wait_time_seconds < 0: # Should not happen if logic above is correct
                logger.warning(f"User {user_id_str}: Calculated negative wait time ({wait_time_seconds:.1f}s). This is unexpected. Scheduling for a short delay (60s) to retry.")
                wait_time_seconds = 60 
            elif wait_time_seconds < 1: # Ensure at least a minimal sleep
                wait_time_seconds = 1 
            
            logger.info(
                f"User {user_id_str} (TZ: {user_timezone_str}): " 
                f"Target local time: {target_local_time.strftime('%H:%M')}. "
                f"Next notification in user's local TZ: {next_notification_local_dt_aware.strftime('%Y-%m-%d %H:%M:%S %Z%z')}. "
                f"Next notification in UTC: {next_notification_utc.strftime('%Y-%m-%d %H:%M:%S %Z')}. "
                f"Current UTC time: {now_utc.strftime('%Y-%m-%d %H:%M:%S %Z')}. "
                f"Will wait for: {wait_time_seconds:.1f} seconds."
            )
            await asyncio.sleep(wait_time_seconds)

            # Re-check notifications_enabled after sleep, in case user disabled it
            user_data_after_sleep = get_user_data(user_id) 
            lang_after_sleep = user_data_after_sleep.get("language", "ru") # Use potentially updated lang
            bot_name_after_sleep = get_translation("bot_name", lang_after_sleep)

            if not user_data_after_sleep.get("notifications_enabled", True):
                logger.info(f"Notifications disabled for user {user_id_str} (checked after sleep). Exiting scheduler loop.")
                if user_id_str in notification_tasks and notification_tasks.get(user_id_str) is asyncio.current_task():
                    del notification_tasks[user_id_str] # Clean up task entry
                break # Exit loop

            # Verify if it's actually time to send (within a small window to account for sleep inaccuracies)
            now_utc_for_send_check = datetime.now(pytz.utc)
            # Check if current UTC is within a window (e.g., -10s to +60s) of the target UTC send time
            if now_utc_for_send_check >= next_notification_utc - timedelta(seconds=10) and \
               now_utc_for_send_check < next_notification_utc + timedelta(seconds=60): # Generous window after target
                logger.info(f"User {user_id_str}: Sending daily report notification at {now_utc_for_send_check.strftime('%Y-%m-%d %H:%M:%S %Z')} (target UTC was {next_notification_utc.strftime('%Y-%m-%d %H:%M:%S %Z')}).")
                report_content = generate_report(user_id) # Generate fresh report

                try:
                    await bot.send_message(
                        chat_id=user_id,
                        text=f"{bot_name_after_sleep}\n\n{report_content}",
                        reply_markup=get_main_menu_keyboard(lang_after_sleep) # Main menu after notification
                    )
                    logger.info(f"Sent daily report notification to user {user_id_str}")
                except BadRequest as e: # e.g., bot blocked by user
                     logger.warning(f"Failed to send daily notification to user {user_id_str} due to BadRequest: {e}")
                     if "chat not found" in str(e).lower() or "bot was blocked" in str(e).lower():
                         logger.info(f"Disabling notifications for user {user_id_str} due to chat not found/blocked.")
                         user_data_after_sleep["notifications_enabled"] = False
                         update_user_data(user_id, user_data_after_sleep)
                         if user_id_str in notification_tasks and notification_tasks.get(user_id_str) is asyncio.current_task():
                             del notification_tasks[user_id_str]
                         break # Exit loop for this user
                except Exception as e: # Other unexpected errors
                     logger.error(f"Unexpected error sending daily notification to user {user_id_str}: {e}", exc_info=True)
            else:
                # Woke up but not the right time (e.g., task was cancelled and restarted, system time changed)
                logger.info(f"User {user_id_str}: Woke up but not precisely notification time (Now UTC: {now_utc_for_send_check}, Target UTC: {next_notification_utc}). Recalculating next slot.")
            
            # Short sleep before next iteration to prevent busy-looping if calculations are very fast or problematic
            await asyncio.sleep(5) 

    except asyncio.CancelledError:
        logger.info(f"Notification task for user {user_id_str} was cancelled.")
        # Ensure task is removed from the global dict if it's this current task instance
        if user_id_str in notification_tasks and notification_tasks.get(user_id_str) is asyncio.current_task():
             if notification_tasks[user_id_str].is_cancelled(): # Double check it's actually cancelled
                del notification_tasks[user_id_str]
    except Exception as e:
        logger.error(f"Unexpected error in notification scheduling loop for user {user_id_str}: {e}", exc_info=True)
        # Clean up task entry if an unhandled exception occurs in the loop
        if user_id_str in notification_tasks and notification_tasks.get(user_id_str) is asyncio.current_task():
            del notification_tasks[user_id_str]


async def start_notification_tasks(app: Application):
    all_users_data = load_user_data()
    logger.info(f"Initializing notification tasks on application startup...")
    scheduled_count = 0
    for user_id_str, user_data_item in all_users_data.items():
        try:
            user_id_int = int(user_id_str)
            if user_data_item.get("notifications_enabled", True):
                # If a task for this user already exists (e.g., from a previous run if not cleaned up), cancel it first.
                if user_id_str in notification_tasks:
                    old_task = notification_tasks[user_id_str]
                    if not old_task.done():
                        logger.warning(f"Found an existing, unfinished notification task for user {user_id_str} on startup. Cancelling it.")
                        old_task.cancel()
                        try: await asyncio.wait_for(old_task, timeout=0.5) # Brief wait
                        except (asyncio.CancelledError, asyncio.TimeoutError): pass # Expected
                    if user_id_str in notification_tasks: del notification_tasks[user_id_str] # Remove old entry

                logger.info(f"Scheduling new notification task for user {user_id_str} (startup).")
                new_task = asyncio.create_task(schedule_notification(app.bot, user_id_int), name=f"notif_{user_id_str}_startup")
                notification_tasks[user_id_str] = new_task
                scheduled_count += 1
        except ValueError: logger.error(f"Invalid user ID '{user_id_str}' in user_data.json during startup scheduling.")
        except Exception as e: logger.error(f"Failed to start notification task for user {user_id_str} during startup: {e}", exc_info=True)
    logger.info(f"Scheduled {scheduled_count} notification tasks on startup.")

async def post_initialization_hook(app: Application):
    await start_notification_tasks(app)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    lang = "ru" # Default language for error messages if user-specific cannot be found
    user_id = None
    try:
        if update and isinstance(update, Update):
            user = update.effective_user
            if user:
                user_id = user.id
                # Try to get language from context.user_data first (might be set during conversation)
                user_specific_data = context.user_data 
                if user_specific_data and "language" in user_specific_data:
                    lang = user_specific_data["language"]
                elif user_id: # Fallback to loading from stored user data
                    lang = get_user_data(user_id).get("language", "ru")
    except Exception as lang_err:
        logger.error(f"Error getting language in error_handler (user_id: {user_id}): {lang_err}")

    # Suppress "Message is not modified" errors as they are common and not critical
    if isinstance(context.error, BadRequest) and "Message is not modified" in str(context.error):
        logger.debug(f"Suppressed BadRequest (Message not modified) for user {user_id}: {context.error}")
        return

    # Log the full error for debugging
    logger.error(f"Exception for user {user_id} (Update: {update}):", exc_info=context.error) 
    
    try:
        message_text = get_translation("error.general", lang)
        keyboard = get_main_menu_keyboard(lang) # Default to main menu keyboard

        if isinstance(update, Update):
            current_chat_id = update.effective_chat.id if update.effective_chat else None
            if not current_chat_id and update.effective_message: # For MessageHandler errors
                 current_chat_id = update.effective_message.chat_id
            elif not current_chat_id and update.callback_query: # For CallbackQueryHandler errors
                 current_chat_id = update.callback_query.message.chat_id if update.callback_query.message else None

            if current_chat_id:
                try:
                    # Try to edit message if it's from a callback query
                    if update.callback_query and update.callback_query.message:
                        await update.callback_query.edit_message_text(message_text, reply_markup=keyboard)
                    # Otherwise, send a new message
                    elif update.effective_message : # or current_chat_id if effective_message is None but chat_id known
                        await context.bot.send_message(chat_id=current_chat_id, text=message_text, reply_markup=keyboard)
                except BadRequest as send_edit_error: 
                     logger.warning(f"Failed to edit/send error message in error_handler for user {user_id} / chat {current_chat_id}: {send_edit_error}. Retrying with direct send.")
                     if current_chat_id: # Try sending a new message if edit failed or wasn't applicable
                         try: await context.bot.send_message(chat_id=current_chat_id, text=message_text, reply_markup=keyboard)
                         except Exception as final_send_err: logger.error(f"Final attempt to send error message to {current_chat_id} failed: {final_send_err}")
                except Exception as inner_e:
                     logger.error(f"Unexpected exception during error message send/edit for user {user_id} / chat {current_chat_id}: {inner_e}")

            # Reset state to MAIN_MENU in user_data to prevent getting stuck
            if context.user_data: 
                context.user_data["state"] = MAIN_MENU
                logger.info(f"Reset state to MAIN_MENU for user {user_id} after error.")
        
        # Handling errors from scheduled jobs (notifications)
        elif context.job:
            job_chat_id = context.job.chat_id
            if job_chat_id:
                try:
                    job_user_lang = get_user_data(job_chat_id).get("language", "ru")
                    job_error_message = get_translation("error.general", job_user_lang)
                    # Notifications don't usually have inline keyboards, so send without or with main menu
                    await context.bot.send_message(chat_id=job_chat_id, text=job_error_message, reply_markup=get_main_menu_keyboard(job_user_lang))
                    logger.info(f"Sent generic error message to user {job_chat_id} for a job-related error: {context.error}")
                except Exception as job_send_err:
                    logger.error(f"Failed to send error message to user {job_chat_id} for job error: {job_send_err}")
            else:
                 logger.error(f"Job-related error with no chat_id in job context: {context.error}")

        else: # Fallback if update object is not standard or context is unusual
            logger.warning("Cannot send specific error message: 'update' object is not an instance of Telegram's Update, or context is insufficient for targeted reply.")

    except Exception as e: # Exception while trying to handle the original exception
        logger.error(f"Further exception occurred while trying to send error message to user {user_id}: {e}", exc_info=True)

# --- Main Application Setup ---
application = None # Global variable for application instance

def main():
    global application
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.critical("Переменная окружения TELEGRAM_BOT_TOKEN обязательна для запуска.")
        return

    application_builder = Application.builder().token(token)
    # Schedule post_initialization_hook to run after bot starts and event loop is running
    application_builder = application_builder.post_init(post_initialization_hook)
    application = application_builder.build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            MAIN_MENU: [
                CallbackQueryHandler(button_callback), 
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text) # Handles expense input
            ],
            SETTINGS: [
                CallbackQueryHandler(button_callback),
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text) # Handles expense input from settings
            ],
            SET_DATE: [
                CallbackQueryHandler(button_callback, pattern="^back_to_settings$"), 
                MessageHandler(filters.TEXT & ~filters.COMMAND, set_date) # Specific handler
            ],
            SET_BUDGET: [
                CallbackQueryHandler(button_callback, pattern="^back_to_settings$"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, set_budget) # Specific handler
            ],
            SET_NOTIFICATION_TIME: [
                CallbackQueryHandler(button_callback, pattern="^back_to_settings$"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, set_notification_time) # Specific handler
            ],
            SELECT_TIMEZONE: [ 
                CallbackQueryHandler(button_callback, pattern="^back_to_settings$"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, set_timezone) # Specific handler
            ],
            SELECT_LANGUAGE: [ # Only button interactions expected
                 CallbackQueryHandler(button_callback) 
            ], 
            SELECT_CURRENCY: [ # Only button interactions expected
                 CallbackQueryHandler(button_callback) 
            ], 
            EDIT_EXPENSE_SELECT: [ # Handles selection of expense from list (button)
                 CallbackQueryHandler(button_callback)
            ], 
            EDIT_EXPENSE: [ # Handles buttons for amount/category/date/delete change
                 CallbackQueryHandler(button_callback)
            ],      
            EDIT_EXPENSE_AMOUNT: [ # Text input for new amount
                CallbackQueryHandler(button_callback, pattern="^back_to_expense_edit$"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, edit_expense_amount)
            ],
            EDIT_EXPENSE_CATEGORY: [ # Text input for new category
                CallbackQueryHandler(button_callback, pattern="^back_to_expense_edit$"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, edit_expense_category_text)
            ],
            EDIT_EXPENSE_DATE: [ # Text input for new date (NEW)
                CallbackQueryHandler(button_callback, pattern="^back_to_expense_edit$"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, edit_expense_date_text)
            ],
            EDIT_EXPENSE_DELETE: [ # Handles confirmation buttons for delete
                 CallbackQueryHandler(button_callback)
            ], 
            DATE_RANGE_START: [ # Text input for start date of range
                CallbackQueryHandler(button_callback, pattern="^back_to_main$"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, date_range_start)
            ],
            DATE_RANGE_END: [ # Text input for end date of range
                CallbackQueryHandler(button_callback, pattern="^back_to_main$"),
                MessageHandler(filters.TEXT & ~filters.COMMAND, date_range_end)
            ],
        },
        fallbacks=[
            # /start can be used anytime to reset to main menu
            CommandHandler("start", start), 
            # General text fallback: if text is sent in a state without a specific text handler,
            # handle_text will attempt to parse it (e.g. if user gets lost and types an expense)
            # or guide them.
            MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text),
            # General callback query fallback: if a button from an old/unexpected message is pressed.
            CallbackQueryHandler(button_callback)
        ],
        allow_reentry=True # Allows re-entering states, useful with global /start
    )

    application.add_handler(conv_handler)
    application.add_error_handler(error_handler) # Global error handler

    logger.info("Starting bot polling...")
    try:
        application.run_polling(allowed_updates=Update.ALL_TYPES)
    except Exception as e:
        logger.critical(f"Bot polling encountered a critical error: {e}", exc_info=True)
    finally:
        logger.info("Bot application stopping. Attempting to cancel active notification tasks...")
        # Create a list of tasks to cancel. Iterating over a dictionary while modifying it can be problematic.
        tasks_to_cancel = list(notification_tasks.values())
        active_tasks_for_cancellation = [task for task in tasks_to_cancel if task and not task.done()]
        
        if active_tasks_for_cancellation:
            logger.info(f"Found {len(active_tasks_for_cancellation)} active notification tasks to signal for cancellation.")
            for task in active_tasks_for_cancellation:
                task.cancel() # Signal cancellation
            
            # Define an async function to await the cancellations
            async def await_cancelled_tasks():
                logger.info(f"Awaiting cancellation of {len(active_tasks_for_cancellation)} tasks...")
                # Gather results, return_exceptions=True means gather won't stop if one task had an error during cancellation
                results = await asyncio.gather(*active_tasks_for_cancellation, return_exceptions=True)
                for i, result in enumerate(results):
                    task_name = active_tasks_for_cancellation[i].get_name() if hasattr(active_tasks_for_cancellation[i], 'get_name') else f"TaskAtIndex-{i}"
                    if isinstance(result, asyncio.CancelledError):
                        logger.info(f"Task {task_name} was successfully cancelled during shutdown.")
                    elif isinstance(result, Exception): # Other exceptions during task execution/cleanup
                        logger.error(f"Task {task_name} raised an exception during its cancellation/shutdown process: {result}", exc_info=result)
                    else: # Task completed normally (should be rare if cancelled)
                        logger.info(f"Task {task_name} completed (not cancelled) during shutdown with result: {result}")
            
            try:
                # Get the current running loop if available (e.g., if run_polling created one)
                loop = asyncio.get_event_loop_policy().get_event_loop()
                if loop.is_running():
                    # If loop is running, schedule the await_cancelled_tasks to run
                    # This is non-blocking for the finally block itself.
                    loop.create_task(await_cancelled_tasks())
                    logger.info("Scheduled final task cancellation awaiting. Shutdown will proceed.")
                else: 
                    # If loop is not running (e.g., run_polling exited cleanly or was never fully started),
                    # run await_cancelled_tasks in a new temporary loop.
                    logger.info("Main event loop stopped. Running cancellation await in a new temporary loop.")
                    asyncio.run(await_cancelled_tasks())
            except RuntimeError as e: # e.g., "Cannot run event loop while another is running" or no loop set
                 logger.warning(f"Could not explicitly await task cancellations in finally block due to RuntimeError: {e}. Tasks were signalled to cancel.")
            except Exception as e_final_await: # Catch-all for other issues during this final cleanup
                 logger.error(f"An unexpected exception occurred during final task cancellation awaiting: {e_final_await}", exc_info=True)
        else:
            logger.info("No active notification tasks found to cancel upon shutdown.")
        
        logger.info("Bot shutdown process complete.")


if __name__ == "__main__":
    main()

# --- END OF MODIFIED FILE ---
