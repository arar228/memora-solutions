"""Offline compatibility check using the actual installed Telegram library."""
import os
import socket
import tempfile
from unittest.mock import patch


def check():
    with tempfile.TemporaryDirectory(prefix="memora-wallet-runtime-") as directory:
        with patch.dict(os.environ, {
            "WALLET_DATA_DIR": directory,
            "TELEGRAM_BOT_TOKEN": "123456789:offline-compatibility-placeholder",
        }):
            with patch.object(socket.socket, "connect", side_effect=AssertionError("Network forbidden")):
                import bot
                from telegram import Update
                from telegram.ext import Application, ConversationHandler

                with patch.object(Application, "run_polling") as polling:
                    bot.main()
                polling.assert_called_once_with(allowed_updates=Update.ALL_TYPES)
                handler = bot.application.handlers[0][0]
                assert isinstance(handler, ConversationHandler)
                assert len(handler.states) == 16
                assert handler.allow_reentry
                assert bot.application.post_init is bot.post_initialization_hook
                assert bot.error_handler in bot.application.error_handlers
                assert os.listdir(directory) == [], "Startup must preserve user data"
    print("Wallet runtime, 16 conversation states, callbacks and error handler: OK (offline)")


if __name__ == "__main__":
    check()
