"""No Telegram, credentials or production data are used in these tests."""

import ast
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from storage import UserDataStore, WalletStorageError


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "user_data.json"
        self.store = UserDataStore(self.path)

    def seed(self):
        data = self.store.load()
        data["123"] = {"expenses": [{"amount": "12.5", "category": "demo"}], "monthly_budget": "100"}
        self.store.save(data)
        return self.path.read_bytes()

    def test_first_start_and_legacy_numeric_strings(self):
        self.seed()
        profile = self.store.load()["123"]
        self.assertEqual(profile["expenses"][0]["amount"], 12.5)
        self.assertEqual(profile["monthly_budget"], 100.0)
        self.assertEqual(profile["timezone"], "Europe/Moscow")

    def test_corrupt_json_is_preserved_and_blocks_save(self):
        self.seed()
        snapshot = self.store.load()
        raw = b'{"123": {"expenses": ['
        self.path.write_bytes(raw)
        with self.assertRaises(WalletStorageError):
            self.store.load()
        with self.assertRaises(WalletStorageError):
            self.store.save(snapshot)
        self.assertEqual(self.path.read_bytes(), raw)

    def test_invalid_schema_and_amount_are_rejected_without_zeroing(self):
        invalid = [[], None, {"123": []}, {"123": {"expenses": {}}},
                   {"123": {"expenses": [{"amount": "bad"}]}},
                   {"123": {"expenses": [{}]}}, {"123": {"monthly_budget": True}},
                   {"123": {"month_start_day": 1.5}}, {"123": {"monthly_budget": "NaN"}}]
        for data in invalid:
            with self.subTest(data=data):
                raw = json.dumps(data).encode()
                self.path.write_bytes(raw)
                with self.assertRaises(WalletStorageError):
                    self.store.load()
                self.assertEqual(self.path.read_bytes(), raw)

    def test_duplicate_keys_are_rejected(self):
        self.path.write_bytes(b'{"123": {}, "123": {}}')
        with self.assertRaises(WalletStorageError):
            self.store.load()

    def test_permission_error_is_not_an_empty_database(self):
        original = self.seed()
        with patch.object(Path, "read_bytes", side_effect=PermissionError("fixture")):
            with self.assertRaises(WalletStorageError):
                self.store.load()
        self.assertEqual(self.path.read_bytes(), original)

    def test_missing_initialized_file_stays_blocked_after_restart(self):
        self.seed()
        self.path.unlink()
        with self.assertRaises(WalletStorageError):
            UserDataStore(self.path).load()

    def test_legacy_existing_file_gets_missing_file_guard(self):
        self.path.write_text('{"123": {}}', encoding="utf-8")
        self.store.load()
        self.path.unlink()
        with self.assertRaises(WalletStorageError):
            UserDataStore(self.path).load()

    def test_stale_snapshot_cannot_erase_a_newer_user(self):
        self.seed()
        stale = self.store.load()
        current = UserDataStore(self.path).load()
        current["456"] = {"expenses": []}
        self.store.save(current)
        with self.assertRaises(WalletStorageError):
            self.store.save(stale)
        self.assertIn("456", self.store.load())

    def test_atomic_replace_failure_keeps_primary_and_last_good_backup(self):
        original = self.seed()
        snapshot = self.store.load()
        snapshot["123"]["monthly_budget"] = 200
        import storage
        actual_replace = storage.os.replace

        def fail_primary(source, target):
            if Path(target) == self.path:
                raise OSError("fixture: disk error")
            return actual_replace(source, target)

        with patch("storage.os.replace", side_effect=fail_primary):
            with self.assertRaises(WalletStorageError):
                self.store.save(snapshot)
        self.assertEqual(self.path.read_bytes(), original)
        self.assertEqual(self.store.backup.read_bytes(), original)
        self.assertEqual(list(self.path.parent.glob("*.tmp")), [])

    def test_backup_failure_prevents_primary_replacement(self):
        original = self.seed()
        snapshot = self.store.load()
        snapshot["123"]["monthly_budget"] = 200
        with patch("storage.tempfile.mkstemp", side_effect=OSError("fixture: disk full")):
            with self.assertRaises(WalletStorageError):
                self.store.save(snapshot)
        self.assertEqual(self.path.read_bytes(), original)

    def test_invalid_save_does_not_mutate_input_or_existing_file(self):
        original = self.seed()
        snapshot = self.store.load()
        snapshot["123"]["expenses"][0]["amount"] = "bad"
        with self.assertRaises(WalletStorageError):
            self.store.save(snapshot)
        self.assertEqual(snapshot["123"]["expenses"][0]["amount"], "bad")
        self.assertEqual(self.path.read_bytes(), original)

    def test_save_requires_a_read_and_preserves_backup(self):
        original = self.seed()
        with self.assertRaises(WalletStorageError):
            self.store.save({})
        snapshot = self.store.load()
        snapshot["123"]["monthly_budget"] = 250
        self.store.save(snapshot)
        self.assertEqual(self.store.backup.read_bytes(), original)
        self.assertEqual(self.store.load()["123"]["monthly_budget"], 250)

    def test_actual_bot_wrappers_propagate_storage_failures(self):
        # Execute the real functions without importing Telegram or starting a bot.
        tree = ast.parse((Path(__file__).resolve().parents[1] / "bot.py").read_text(encoding="utf-8-sig"))
        names = {"load_user_data", "save_user_data", "init_user_data", "get_user_data", "update_user_data"}
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
        namespace = {"user_data_store": self.store}
        exec(compile(ast.Module(body=functions, type_ignores=[]), "bot-storage-wrappers", "exec"), namespace)
        self.path.write_bytes(b'{"corrupt"')
        for name, args in [("get_user_data", (123,)), ("update_user_data", (123, {"monthly_budget": 100}))]:
            with self.assertRaises(WalletStorageError):
                namespace[name](*args)
        self.assertEqual(self.path.read_bytes(), b'{"corrupt"')


if __name__ == "__main__":
    unittest.main()
