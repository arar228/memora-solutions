"""Fail-closed JSON storage for the single Wallet bot, with a last-good backup.

Linux writers share an advisory file lock. A loaded snapshot carries a revision,
so an older read cannot replace a newer save. Backup restoration is explicit.
"""

import copy
import hashlib
import json
import math
import os
from pathlib import Path
import tempfile
import threading
from contextlib import contextmanager

try:
    import fcntl
except ImportError:  # Local Windows tests; production uses Linux flock.
    fcntl = None


class WalletStorageError(RuntimeError):
    """An operation failed; callers must not report successful persistence."""


class Snapshot(dict):
    def __init__(self, data, revision):
        super().__init__(data)
        self.revision = revision


def _number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ValueError("Invalid numeric field")
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Non-finite numeric field")
    return result


def normalize_user_data(data):
    """Accept legacy numeric strings, preserve extra fields, reject corrupt data."""
    if not isinstance(data, dict):
        raise ValueError("Expected a user map")
    result = copy.deepcopy(data)
    for user_id, profile in result.items():
        if not isinstance(user_id, str) or not isinstance(profile, dict):
            raise ValueError("Invalid user profile")
        expenses = profile.setdefault("expenses", [])
        if not isinstance(expenses, list):
            raise ValueError("Invalid expense list")
        for expense in expenses:
            if not isinstance(expense, dict) or "amount" not in expense:
                raise ValueError("Invalid expense")
            expense["amount"] = _number(expense["amount"])
        profile["monthly_budget"] = _number(profile.get("monthly_budget", 0))
        start_day = _number(profile.get("month_start_day", 1))
        if not start_day.is_integer() or not 1 <= start_day <= 31:
            raise ValueError("Invalid month start day")
        profile["month_start_day"] = int(start_day)
        profile.setdefault("notifications_enabled", True)
        if not isinstance(profile["notifications_enabled"], bool):
            raise ValueError("Invalid notification setting")
        for key, default in {
            "notification_time": "21:30", "language": "ru",
            "currency_symbol": "руб.", "timezone": "Europe/Moscow",
        }.items():
            profile.setdefault(key, default)
            if not isinstance(profile[key], str):
                raise ValueError("Invalid text setting")
    return result


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


class UserDataStore:
    def __init__(self, path):
        self.path = Path(path)
        self.backup = self.path.with_suffix(".previous.json")
        self.marker = self.path.with_suffix(".initialized")
        self.lock_path = self.path.with_suffix(".lock")
        self._mutex = threading.RLock()

    def _sync_directory(self):
        if os.name == "posix":
            descriptor = os.open(self.path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)

    @contextmanager
    def _locked(self):
        with self._mutex:
            self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            descriptor = os.open(self.lock_path, os.O_CREAT | os.O_RDWR, 0o600)
            with os.fdopen(descriptor, "a+b") as lock:
                if fcntl is not None:
                    fcntl.flock(lock, fcntl.LOCK_EX)
                try:
                    yield
                finally:
                    if fcntl is not None:
                        fcntl.flock(lock, fcntl.LOCK_UN)

    def _read(self):
        try:
            raw = self.path.read_bytes()
        except FileNotFoundError:
            # A missing file is fresh storage only before its first successful
            # read/save. The marker survives bot restarts and accidental deletion.
            if os.path.lexists(self.path) or self.marker.exists() or self.backup.exists():
                raise WalletStorageError("Wallet data file is missing; restore required") from None
            return {}, None, None
        data = normalize_user_data(json.loads(raw, object_pairs_hook=_unique_object))
        return data, hashlib.sha256(raw).hexdigest(), raw

    def _mark_initialized(self):
        try:
            descriptor = os.open(self.marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            return
        with os.fdopen(descriptor, "wb") as marker:
            marker.write(b"initialized\n")
            marker.flush()
            os.fsync(marker.fileno())
        self._sync_directory()

    def _atomic_write(self, target, raw):
        descriptor, temporary = tempfile.mkstemp(prefix="user_data.", suffix=".tmp", dir=self.path.parent)
        try:
            with os.fdopen(descriptor, "wb") as output:
                output.write(raw)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, target)
            self._sync_directory()
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)

    def load(self):
        try:
            with self._locked():
                data, revision, raw = self._read()
                if raw is not None:
                    self._mark_initialized()
                return Snapshot(data, revision)
        except WalletStorageError:
            raise
        except (OSError, ValueError, TypeError, OverflowError):
            # Keep financial values and raw JSON out of exception messages/logs.
            raise WalletStorageError("Wallet data cannot be read or validated") from None

    def save(self, snapshot):
        if not isinstance(snapshot, Snapshot):
            raise WalletStorageError("Save requires a loaded Wallet snapshot")
        try:
            normalized = normalize_user_data(snapshot)
            raw = json.dumps(normalized, ensure_ascii=False, indent=4, allow_nan=False).encode("utf-8")
            with self._locked():
                _, revision, previous = self._read()
                if revision != snapshot.revision:
                    raise WalletStorageError("Wallet data changed; reload before saving")
                # A backup failure prevents replacement of the primary file.
                if previous is not None:
                    self._atomic_write(self.backup, previous)
                self._mark_initialized()
                self._atomic_write(self.path, raw)
                snapshot.revision = hashlib.sha256(raw).hexdigest()
        except WalletStorageError:
            raise
        except (OSError, ValueError, TypeError, OverflowError):
            raise WalletStorageError("Wallet save could not be confirmed; inspect stored data") from None
