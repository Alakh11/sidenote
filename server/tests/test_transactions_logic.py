import json
from decimal import Decimal

import pytest
from fastapi import HTTPException

import idempotency
from schemas import TransactionCreate


class FakeCursor:
    """Just enough of a MySQL cursor for the idempotency key table"""

    def __init__(self, table):
        self.table, self.rowcount, self._row = table, 0, None

    def execute(self, sql, params=()):
        sql = " ".join(sql.split())
        if sql.startswith("INSERT IGNORE"):
            key = params[0]
            self.rowcount = 0 if key in self.table else 1
            self.table.setdefault(key, {"response": None})
        elif sql.startswith("SELECT response"):
            self._row = self.table.get(params[0])
        elif sql.startswith("UPDATE idempotency_keys"):
            self.table[params[1]]["response"] = params[0]

    def fetchone(self):
        return self._row


def test_same_key_runs_once_and_replays_the_response():
    table = {}
    first = FakeCursor(table)
    assert idempotency.claim_idempotency_key(first, 7, "POST /transactions", "op-1") is None
    idempotency.save_idempotent_response(first, 7, "POST /transactions", "op-1", {"id": 42, "amount": Decimal("1.50")})
    assert idempotency.claim_idempotency_key(FakeCursor(table), 7, "POST /transactions", "op-1") == {"id": 42, "amount": 1.5}


def test_duplicate_while_first_is_in_flight_is_refused():
    table = {}
    idempotency.claim_idempotency_key(FakeCursor(table), 7, "POST /transactions", "op-2")
    with pytest.raises(HTTPException) as exc:
        idempotency.claim_idempotency_key(FakeCursor(table), 7, "POST /transactions", "op-2")
    assert exc.value.status_code == 409


def test_keys_are_scoped_per_user_and_optional():
    table = {}
    idempotency.claim_idempotency_key(FakeCursor(table), 7, "POST /transactions", "same")
    assert idempotency.claim_idempotency_key(FakeCursor(table), 8, "POST /transactions", "same") is None
    assert idempotency.claim_idempotency_key(FakeCursor(table), 7, "POST /transactions", None) is None


@pytest.mark.parametrize("given,stored", [(12.345, "12.35"), ("0.1", "0.10"), (199.995, "200.00"), (1000000, "1000000.00")])
def test_amounts_round_half_up_to_paise(given, stored):
    tx = TransactionCreate(user_id=1, amount=given, type="expense", category="Food", date="2026-10-24", payment_mode="UPI")
    assert str(tx.amount) == stored


def test_zero_or_negative_amounts_are_rejected():
    with pytest.raises(Exception):
        TransactionCreate(user_id=1, amount=0, type="expense", category="Food", date="2026-10-24", payment_mode="UPI")


def test_google_sign_in_requires_a_genuine_token_for_our_client(monkeypatch):
    import google.oauth2.id_token as gid
    import security

    monkeypatch.setattr(security, "GOOGLE_CLIENT_IDS", {"our-client"})

    def fake_verify(token, request, clock_skew_in_seconds=0):
        if token == "forged":
            raise ValueError("bad signature")
        aud = "other-site" if token == "foreign" else "our-client"
        return {"aud": aud, "email": "a@b.com", "email_verified": True}

    monkeypatch.setattr(gid, "verify_oauth2_token", fake_verify)
    assert security.verify_google_credential("good")["email"] == "a@b.com"
    for bad in ("forged", "foreign"):
        with pytest.raises(HTTPException) as exc:
            security.verify_google_credential(bad)
        assert exc.value.status_code == 401
