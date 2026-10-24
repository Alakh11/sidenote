import json

import pytest

import group_ledger as ledger
from whatsapp_handlers.split_parser import amount_first

A, B, C = 1, 2, 3
MEMBERS = [{"id": A, "name": "Asha"}, {"id": B, "name": "Bala"}, {"id": C, "name": "Chet"}]
IDS = [A, B, C]


def expense(tx_id, payer, amount, shares=None):
    return {"id": tx_id, "logged_by": payer, "amount": amount, "split_type": "equal",
            "split_details": json.dumps(shares) if shares else None, "settled_shares": None, "split_data": None}


def settlement(tx_id, payer, to, amount):
    return {"id": tx_id, "logged_by": payer, "amount": amount, "split_type": "settlement",
            "split_details": json.dumps({str(to): amount}), "settled_shares": None, "split_data": None}


class FakeCursor:
    def __init__(self, txs):
        self.txs = {t["id"]: t for t in txs}
        self.inserted = []
        self.lastrowid = 99

    def execute(self, sql, params):
        if sql.startswith("UPDATE group_transactions SET settled_shares"):
            self.txs[params[1]]["settled_shares"] = params[0]
        elif "INSERT INTO group_transactions" in sql:
            self.inserted.append(params)


def test_each_person_owes_the_payer_their_share():
    txs = [expense(10, A, 900, {"1": 300, "2": 300, "3": 300})]
    me = ledger.balances_for(A, MEMBERS, txs)
    assert me["you_are_owed"] == 600 and me["you_owe"] == 0
    assert {r["user_id"]: r["net"] for r in me["members"]} == {B: 300, C: 300}
    assert ledger.balances_for(B, MEMBERS, txs)["you_owe"] == 300


def test_debts_net_out_between_two_people_but_not_across_the_group():
    txs = [expense(10, A, 200, {"1": 100, "2": 100}), expense(11, B, 300, {"2": 150, "3": 150})]
    # B owes A 100; C owes B 150. Pairwise, A is never told to collect from C.
    assert {r["user_id"]: r["net"] for r in ledger.balances_for(A, MEMBERS, txs)["members"]} == {B: 100, C: 0}
    txs.append(expense(12, B, 100, {"1": 50, "2": 50}))
    assert ledger.owed_between(B, A, MEMBERS, txs) == ledger.to_paise(50)


def test_old_equal_splits_without_details_use_every_member():
    txs = [expense(10, A, 100)]
    shares = ledger.tx_shares(txs[0], IDS)
    assert sum(shares.values()) == 10000 and sorted(shares.values()) == [3333, 3333, 3334]


def test_settlements_reduce_what_is_owed():
    txs = [expense(10, A, 900, {"1": 300, "2": 300, "3": 300}), settlement(11, B, A, 300)]
    assert {r["user_id"]: r["net"] for r in ledger.balances_for(A, MEMBERS, txs)["members"]} == {B: 0, C: 300}


def test_paying_a_person_marks_their_shares_paid_oldest_first():
    txs = [expense(10, A, 200, {"1": 100, "2": 100}), expense(11, A, 400, {"1": 200, "2": 200})]
    cursor = FakeCursor(txs)
    ledger.record_settlement(cursor, 5, B, A, ledger.to_paise(150), txs, IDS)
    # 150 covers the 100 share but not the 200 one
    assert json.loads(cursor.txs[10]["settled_shares"]).keys() == {"2"}
    assert cursor.txs[11]["settled_shares"] is None
    group_id, amount, debtor, mode, details, data = cursor.inserted[0]
    assert (amount, debtor, json.loads(details), json.loads(data)["marks"]) == (1.5e2, B, {"1": 150.0}, [10])


@pytest.mark.parametrize("text,expected", [
    ("chai 500", "500 chai"),
    ("dinner ₹1,200 @ravi", "1200 dinner @ravi"),
    ("cab 900 60% @ravi 40% @me", "900 cab 60% @ravi 40% @me"),
    ("total", None),
    ("chai @ravi 500", None),
])
def test_group_messages_accept_the_amount_after_the_description(text, expected):
    assert amount_first(text) == expected
