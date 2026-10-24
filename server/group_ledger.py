"""Who owes whom in a split group, worked out per pair of people (the way Google Pay splits work):
each expense makes every participant owe the payer their share, and each settlement pays one
person back. Amounts are kept in whole paise so repeated sums never drift."""
import json
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional


def to_paise(value: Any) -> int:
    return int((Decimal(str(value)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def from_paise(paise: int) -> float:
    return float(Decimal(paise) / 100)


def _json(value: Any) -> dict:
    if not value:
        return {}
    return json.loads(value) if isinstance(value, (str, bytes, bytearray)) else dict(value)


def tx_shares(tx: dict, member_ids: list[int]) -> dict[int, int]:
    """Each participant's share of an expense in paise. Old equal splits stored no details and were
    split across everyone in the group."""
    details = _json(tx.get("split_details"))
    if details:
        return {int(uid): to_paise(v) for uid, v in details.items()}
    if not member_ids:
        return {}
    total = to_paise(tx["amount"])
    base, extra = divmod(total, len(member_ids))
    return {uid: base + (1 if i < extra else 0) for i, uid in enumerate(member_ids)}


def pair_debts(transactions: list[dict], member_ids: list[int]) -> dict[tuple[int, int], int]:
    """owed[(a, b)] = paise a still owes b, after netting both directions"""
    owed: dict[tuple[int, int], int] = defaultdict(int)
    for tx in transactions:
        payer = tx["logged_by"]
        if tx["split_type"] == "settlement":
            # A settlement row: the logger paid each listed person back
            for uid, paise in tx_shares(tx, member_ids).items():
                owed[(payer, uid)] -= paise
            continue
        for uid, paise in tx_shares(tx, member_ids).items():
            if uid != payer:
                owed[(uid, payer)] += paise

    net: dict[tuple[int, int], int] = {}
    for a, b in {tuple(sorted(pair)) for pair in owed}:
        diff = owed.get((a, b), 0) - owed.get((b, a), 0)
        if diff > 0:
            net[(a, b)] = diff
        elif diff < 0:
            net[(b, a)] = -diff
    return net


def load_group(cursor, group_id: int) -> tuple[list[dict], list[dict]]:
    cursor.execute("""
        SELECT u.id, u.name, u.upi_id FROM group_members gm JOIN users u ON u.id = gm.user_id
        WHERE gm.group_id = %s ORDER BY u.name
    """, (group_id,))
    members = cursor.fetchall()
    cursor.execute("""
        SELECT id, amount, description, logged_by, split_type, split_details, settled_shares, split_data, logged_at
        FROM group_transactions WHERE group_id = %s ORDER BY logged_at ASC, id ASC
    """, (group_id,))
    return members, cursor.fetchall()


def balances_for(user_id: int, members: list[dict], transactions: list[dict]) -> dict:
    """The user's standing with each other member: positive means they owe the user"""
    member_ids = [m["id"] for m in members]
    net = pair_debts(transactions, member_ids)
    rows, owe, owed = [], 0, 0
    for m in members:
        if m["id"] == user_id:
            continue
        paise = net.get((m["id"], user_id), 0) - net.get((user_id, m["id"]), 0)
        if paise > 0:
            owed += paise
        else:
            owe -= paise
        rows.append({"user_id": m["id"], "name": m["name"], "upi_id": m.get("upi_id"), "net": from_paise(paise)})
    rows.sort(key=lambda r: -abs(r["net"]))
    return {"members": rows, "you_owe": from_paise(owe), "you_are_owed": from_paise(owed)}


def owed_between(debtor: int, creditor: int, members: list[dict], transactions: list[dict]) -> int:
    return pair_debts(transactions, [m["id"] for m in members]).get((debtor, creditor), 0)


def record_settlement(cursor, group_id: int, debtor: int, creditor: int, paise: int, transactions: list[dict],
                      member_ids: list[int], payment_mode: str = "upi", recorded_by: Optional[int] = None, only_tx: Optional[int] = None) -> int:
    """Logs that debtor paid creditor, and marks the debtor's shares of the creditor's expenses as
    paid, oldest first, for as much as the payment covers. Returns the settlement row id."""
    stamp = {"at": datetime.now().isoformat(timespec="seconds"), "by": recorded_by or debtor}
    marked: list[int] = []
    remaining = paise
    for tx in transactions:
        if tx["split_type"] == "settlement" or tx["logged_by"] != creditor:
            continue
        if only_tx is not None and tx["id"] != only_tx:
            continue
        settled = _json(tx.get("settled_shares"))
        share = tx_shares(tx, member_ids).get(debtor, 0)
        if share <= 0 or str(debtor) in settled or share > remaining:
            continue
        settled[str(debtor)] = stamp
        cursor.execute("UPDATE group_transactions SET settled_shares = %s WHERE id = %s", (json.dumps(settled), tx["id"]))
        marked.append(tx["id"])
        remaining -= share

    cursor.execute("""
        INSERT INTO group_transactions (group_id, amount, description, logged_by, split_type, payment_mode, split_details, split_data)
        VALUES (%s, %s, 'Settlement', %s, 'settlement', %s, %s, %s)
    """, (group_id, from_paise(paise), debtor, payment_mode, json.dumps({str(creditor): from_paise(paise)}),
          json.dumps({"marks": marked, "recorded_by": recorded_by or debtor})))
    return cursor.lastrowid


def unmark_settlement(cursor, settlement: dict) -> None:
    """Deleting a settlement puts the shares it covered back to pending"""
    marks = _json(settlement.get("split_data")).get("marks") or []
    debtor = str(settlement["logged_by"])
    for tx_id in marks:
        cursor.execute("SELECT settled_shares FROM group_transactions WHERE id = %s", (tx_id,))
        row = cursor.fetchone()
        if not row:
            continue
        settled = _json(row["settled_shares"] if isinstance(row, dict) else row[0])
        settled.pop(debtor, None)
        cursor.execute("UPDATE group_transactions SET settled_shares = %s WHERE id = %s", (json.dumps(settled) if settled else None, tx_id))
