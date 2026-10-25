from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from typing import Dict, List, Optional, Any
from database import get_db
import asyncio, random, re, string, json
from datetime import datetime
from pydantic import BaseModel, Field
from security import get_current_user
from push_service import device_tokens, push_later, send_push
from whatsapp_service import send_whatsapp_text
import group_ledger
from whatsapp_handlers.bot_utils import extract_transaction_details, match_category_from_text
from whatsapp_handlers.split_parser import parse_and_compute_split, SplitError

router = APIRouter(tags=["Groups & Splitting"])

class GroupUpdate(BaseModel):
    name: str

class GroupTransactionCreate(BaseModel):
    amount: float
    description: str
    user_id: int
    category_id: Optional[int] = None
    payment_mode: str = "upi"
    split_type: str = "equal"
    split_details: Optional[Dict[str, float]] = None

class GroupTransactionUpdate(BaseModel):
    amount: float
    description: str
    category_id: Optional[int] = None
    payment_mode: str
    split_type: str
    split_details: Optional[Dict[str, float]] = None

class RemindPayload(BaseModel):
    target_user_id: int
    amount: float
    from_user_id: int
    # "app" (push) by default; "whatsapp" only when the sender chooses it after the app couldn't reach them
    channel: str = "app"

class GroupQuickAddPayload(BaseModel):
    text: str
    user_id: int

class SettlePayload(BaseModel):
    # Exactly one of these: the caller paid to_user_id, or the caller received from from_user_id
    to_user_id: Optional[int] = None
    from_user_id: Optional[int] = None
    amount: Optional[float] = Field(default=None, gt=0)
    payment_mode: str = "UPI"

class ShareSettlePayload(BaseModel):
    payment_mode: str = "UPI"

class AddMembersPayload(BaseModel):
    user_ids: List[int] = Field(min_length=1, max_length=50)

class TransferAdminPayload(BaseModel):
    new_admin_id: int

class GroupIconPayload(BaseModel):
    icon: Optional[str] = Field(default=None, max_length=32)

class UpiPayload(BaseModel):
    upi_id: Optional[str] = Field(default=None, max_length=100)

class ContactMatchPayload(BaseModel):
    # SHA-256 of each contact's last 10 digits, so raw phone numbers never leave the phone
    hashes: List[str] = Field(max_length=3000)

UPI_PATTERN = re.compile(r"^[\w.\-]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,63}$")


def _first(name: Optional[str]) -> str:
    return (name or "Someone").split()[0]


def _group_overview(cursor, group_id: int, user_id: int, group_type: str) -> dict:
    """What the group list shows: members, the caller's balance, and the latest activity"""
    members, transactions = group_ledger.load_group(cursor, group_id)
    overview: dict = {
        "member_count": len(members),
        "member_names": [m["name"] for m in members if m["id"] != user_id][:3],
        "my_balance": None,
        "last_activity": None,
    }
    if group_type == "split" and members:
        overview["my_balance"] = group_ledger.balances_for(user_id, members, transactions)
        overview["my_balance"] = overview["my_balance"]["you_are_owed"] - overview["my_balance"]["you_owe"]
    latest = next((t for t in reversed(transactions) if t["split_type"] != "settlement"), None)
    if latest:
        names = {m["id"]: m["name"] for m in members}
        overview["last_activity"] = {
            "by": "You" if latest["logged_by"] == user_id else _first(names.get(latest["logged_by"])),
            "amount": float(latest["amount"]),
            "description": latest["description"],
            "date": latest["logged_at"].isoformat() if latest.get("logged_at") else None,
        }
    return overview


def _require_member(cursor, group_id: int, user_id: int) -> None:
    cursor.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="You are not a member of this group.")


def _push_many(pushes: list[tuple[int, str, str, dict]]) -> None:
    for uid, title, body, data in pushes:
        try:
            send_push(uid, title, body, data)
        except Exception as e:
            print(f"Group push failed for {uid}: {e}")


def _expense_pushes(cursor, group_id: int, actor_id: int, amount: float, description: str, shares: Optional[dict]) -> list:
    """Tells everyone in the expense (or the whole group for unsplit groups) what they owe"""
    cursor.execute("SELECT name, type FROM expense_groups WHERE id = %s", (group_id,))
    group = cursor.fetchone()
    cursor.execute("SELECT id, name FROM users WHERE id = %s", (actor_id,))
    actor = cursor.fetchone()
    cursor.execute("SELECT user_id FROM group_members WHERE group_id = %s AND user_id != %s", (group_id, actor_id))
    others = [r["user_id"] for r in cursor.fetchall()]
    if not group or not actor:
        return []
    data = {"kind": "group_expense", "group_id": group_id}
    pushes = []
    for uid in others:
        share = (shares or {}).get(str(uid))
        if group["type"] == "split" and shares and share is None:
            continue  # not part of this split
        body = f"{_first(actor['name'])} added ₹{amount:g} for {description}"
        if share:
            body += f" · your share ₹{float(share):g}"
        pushes.append((uid, group["name"], body, data))
    return pushes

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/groups/create")
def create_group(name: str, user_id: int, type: str = "split", max_members: int = 20):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        invite_code = generate_invite_code()
        
        cursor.execute("INSERT INTO expense_groups (type, name, created_by, max_members, status) VALUES (%s, %s, %s, %s, 'pending')", (type, name, user_id, max_members))
        group_id = cursor.lastrowid
        
        cursor.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (%s, %s, 'admin')", (group_id, user_id))
        
        cursor.execute("""
            INSERT INTO invite_codes (group_id, code, created_by, expires_at) 
            VALUES (%s, %s, %s, DATE_ADD(NOW(), INTERVAL 30 MINUTE))
        """, (group_id, invite_code, user_id))
        
        conn.commit()
        return {"message": "Group created", "group_id": group_id, "invite_code": invite_code}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/groups/join")
def join_group(invite_code: str, user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT ic.*, g.name, g.max_members, 
                   (SELECT COUNT(*) FROM group_members WHERE group_id = ic.group_id) as current_members
            FROM invite_codes ic
            JOIN expense_groups g ON g.id = ic.group_id
            WHERE ic.code = %s AND ic.expires_at > NOW() AND ic.used = FALSE
        """, (invite_code,))
        invite = cursor.fetchone()
        
        if not invite:
            raise HTTPException(status_code=404, detail="Invalid, expired, or used invite code")
            
        if invite['current_members'] >= invite['max_members']:
            raise HTTPException(status_code=400, detail="Group is full")
            
        if invite['created_by'] == user_id:
            raise HTTPException(status_code=400, detail="Cannot join own group")
            
        cursor.execute("INSERT IGNORE INTO group_members (group_id, user_id, role) VALUES (%s, %s, 'member')", (invite['group_id'], user_id))
        cursor.execute("UPDATE invite_codes SET used = TRUE WHERE id = %s", (invite['id'],))
        cursor.execute("UPDATE expense_groups SET status = 'active' WHERE id = %s", (invite['group_id'],))
        conn.commit()
        
        return {"message": f"Joined {invite['name']} successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/groups/{group_id}/settlements")
def calculate_settlements(group_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT u.id, u.name, COALESCE(u.nickname, u.name) as display_name 
            FROM group_members gm JOIN users u ON gm.user_id = u.id 
            WHERE gm.group_id = %s
        """, (group_id,))
        members = cursor.fetchall()
        
        if not members: return {"total_spend": 0, "per_person": 0, "settlements": []}
        
        cursor.execute("""
            SELECT amount, logged_by, split_type, split_details 
            FROM group_transactions WHERE group_id = %s
        """, (group_id,))
        transactions = cursor.fetchall()
        
        balances = {m['id']: {'name': m['display_name'].split()[0], 'balance': 0.0} for m in members}
        total_group_spend = 0.0
        
        for tx in transactions:
            payer = tx['logged_by']
            amount = float(tx['amount'])
            
            if tx['split_type'] != 'settlement':
                total_group_spend += amount
                
            if payer in balances:
                balances[payer]['balance'] += amount
                
            if tx['split_details']:
                details = tx['split_details']
                if isinstance(details, str):
                    details = json.loads(details)
                    
                for uid, owed in details.items():
                    uid = int(uid)
                    if uid in balances:
                        balances[uid]['balance'] -= float(owed)
            elif tx['split_type'] == 'equal':
                share = amount / len(members)
                for m in members:
                    balances[m['id']]['balance'] -= share
        
        debtors = [{"id": k, "name": v["name"], "amount": abs(v["balance"])} for k, v in balances.items() if v["balance"] < -0.01]
        creditors = [{"id": k, "name": v["name"], "amount": v["balance"]} for k, v in balances.items() if v["balance"] > 0.01]
        
        settlements = []
        i, j = 0, 0
        while i < len(debtors) and j < len(creditors):
            debtor = debtors[i]
            creditor = creditors[j]
            
            settle_amount = min(debtor['amount'], creditor['amount'])
            
            settlements.append({
                "from_id": debtor['id'],
                "from_name": debtor['name'],
                "to_id": creditor['id'],
                "to_name": creditor['name'],
                "amount": round(settle_amount, 2)
            })
            
            debtor['amount'] -= settle_amount
            creditor['amount'] -= settle_amount
            
            if debtor['amount'] < 0.01: i += 1
            if creditor['amount'] < 0.01: j += 1
            
        split_share = total_group_spend / len(members) if len(members) > 0 else 0
        return {"total_spend": total_group_spend, "per_person": round(split_share, 2), "settlements": settlements}
        
    except Exception as e:
        print(f"Settlement Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/users/{user_id}/groups")
def get_user_groups(user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                g.id, 
                g.name, 
                g.created_at, 
                g.type, 
                g.max_members,
                g.icon,
                gm.archived_at IS NOT NULL AS archived,
                COALESCE(
                    (SELECT code FROM invite_codes ic 
                     WHERE ic.group_id = g.id AND ic.expires_at > NOW() 
                     ORDER BY ic.id DESC LIMIT 1),
                    'Expired'
                ) as invite_code,
                (SELECT expires_at FROM invite_codes ic 
                 WHERE ic.group_id = g.id AND ic.expires_at > NOW() 
                 ORDER BY ic.id DESC LIMIT 1) as invite_expires_at
            FROM expense_groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = %s
            ORDER BY g.created_at DESC
        """, (user_id,))
        groups = cursor.fetchall()
        for g in groups:
            try:
                g.update(_group_overview(cursor, g["id"], user_id, g["type"]))
            except Exception as e:
                print(f"Group overview failed for {g['id']}: {e}")
        return groups
    except Exception as e:
        print(f"Error fetching groups: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

@router.get("/groups/{group_id}/transactions")
def get_group_transactions(
    group_id: int, 
    page: int = Query(1, ge=1), 
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = None
):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        offset = (page - 1) * limit
        
        where_clause = "t.group_id = %s"
        params: list[Any] = [group_id]
        
        if search:
            search_term = f"%{search.lower()}%"
            where_clause += " AND (LOWER(t.description) LIKE %s OR LOWER(u.name) LIKE %s OR t.amount LIKE %s)"
            params.extend([search_term, search_term, search_term])
            
        params.extend([limit, offset])

        cursor.execute(f"""
            SELECT 
                t.id, t.amount, t.description, t.logged_at as date, 
                u.name as paid_by, t.logged_by as paid_by_user_id, 
                t.split_type, t.split_details, t.settled_shares, t.payment_mode,
                JSON_UNQUOTE(JSON_EXTRACT(t.split_data, '$.recorded_by')) as recorded_by,
                t.category_id, c.name as category, c.icon as category_icon
            FROM group_transactions t
            JOIN users u ON t.logged_by = u.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE {where_clause}
            ORDER BY t.logged_at DESC
            LIMIT %s OFFSET %s
        """, params)
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/groups/{group_id}/transactions")
def create_group_transaction(group_id: int, payload: GroupTransactionCreate, background: BackgroundTasks):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        details_json = json.dumps(payload.split_details) if payload.split_details else None
        cursor.execute("""
            INSERT INTO group_transactions (group_id, amount, description, logged_by, split_type, category_id, payment_mode, split_details)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (group_id, payload.amount, payload.description, payload.user_id, payload.split_type, payload.category_id, payload.payment_mode, details_json))
        conn.commit()
        if payload.split_type != 'settlement':
            push_later(_push_many, _expense_pushes(cursor, group_id, payload.user_id, payload.amount, payload.description, payload.split_details))
        else:
            cursor.execute("SELECT g.name AS group_name, u.name AS payer FROM expense_groups g, users u WHERE g.id = %s AND u.id = %s", (group_id, payload.user_id))
            row = cursor.fetchone()
            if row:
                push_later(_push_many, [
                    (int(uid), row["group_name"], f"{_first(row['payer'])} marked ₹{float(amt):g} as paid to you", {"kind": "group_expense", "group_id": group_id})
                    for uid, amt in (payload.split_details or {}).items() if int(uid) != payload.user_id
                ])
        return {"message": "Transaction logged successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/groups/{group_id}/transactions/quick-add")
def quick_add_group_transaction(group_id: int, payload: GroupQuickAddPayload, background: BackgroundTasks):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT u.id, u.name, u.nickname 
            FROM group_members gm JOIN users u ON u.id = gm.user_id 
            WHERE gm.group_id = %s
        """, (group_id,))
        members = cursor.fetchall()
        
        if not members:
            raise HTTPException(status_code=404, detail="Group members not found")

        amount, item_raw, explicit_inc, payment_mode = extract_transaction_details(payload.text)
        
        if not amount or amount <= 0:
            raise HTTPException(status_code=400, detail="Could not detect a valid amount. Example: '500 dinner 50% @john'")

        try:
            desc, split_type, shares = parse_and_compute_split(amount, item_raw, members, payload.user_id)
        except SplitError as e:
            raise HTTPException(status_code=400, detail=str(e))

        category_id = match_category_from_text(cursor, payload.user_id, desc, 'expense')
        
        details_json = json.dumps(shares)
        cursor.execute("""
            INSERT INTO group_transactions (group_id, amount, description, logged_by, split_type, category_id, payment_mode, split_details)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (group_id, amount, desc, payload.user_id, split_type, category_id, payment_mode, details_json))
        conn.commit()
        push_later(_push_many, _expense_pushes(cursor, group_id, payload.user_id, amount, desc, shares))
        
        return {
            "message": "Transaction logged via AI text parsing!", 
            "parsed_data": {
                "amount": amount,
                "description": desc,
                "split_type": split_type,
                "shares": shares
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/groups/{group_id}/analytics")
def get_group_analytics(group_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT c.name as category, c.icon as category_icon, SUM(gt.amount) as total
            FROM group_transactions gt
            LEFT JOIN categories c ON gt.category_id = c.id
            WHERE gt.group_id = %s AND gt.split_type != 'settlement'
            GROUP BY c.id, c.name, c.icon
            ORDER BY total DESC
        """, (group_id,))
        categories = cursor.fetchall()

        cursor.execute("""
            SELECT u.id, u.name, SUM(gt.amount) as total_paid
            FROM group_transactions gt
            JOIN users u ON gt.logged_by = u.id
            WHERE gt.group_id = %s AND gt.split_type != 'settlement'
            GROUP BY u.id, u.name
            ORDER BY total_paid DESC
        """, (group_id,))
        members = cursor.fetchall()
        
        cursor.execute("""
            SELECT DATE_FORMAT(logged_at, '%b %Y') as month, SUM(amount) as total
            FROM group_transactions
            WHERE group_id = %s AND split_type != 'settlement'
            GROUP BY YEAR(logged_at), MONTH(logged_at)
            ORDER BY YEAR(logged_at) DESC, MONTH(logged_at) DESC
            LIMIT 6
        """, (group_id,))
        trends = cursor.fetchall()

        return {
            "categories": categories,
            "members": members,
            "trends": list(reversed(trends))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/groups/transactions/{tx_id}")
def update_group_transaction(tx_id: int, payload: GroupTransactionUpdate, user_id: int = Query(...)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT logged_by, amount, split_details, settled_shares FROM group_transactions WHERE id = %s", (tx_id,))
        txn = cursor.fetchone()
        if not txn: 
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn['logged_by'] != user_id: 
            raise HTTPException(status_code=403, detail="You can only edit your own transactions.")
        if txn['settled_shares'] and json.loads(txn['settled_shares']):
            old_details = json.loads(txn['split_details']) if txn['split_details'] else None
            same_split = group_ledger.to_paise(txn['amount']) == group_ledger.to_paise(payload.amount) and (
                {k: group_ledger.to_paise(v) for k, v in (old_details or {}).items()}
                == {k: group_ledger.to_paise(v) for k, v in (payload.split_details or {}).items()})
            if not same_split:
                raise HTTPException(status_code=409, detail="Someone has already paid their share, so the amount and split can't change. You can still edit the description and category.")

        details_json = json.dumps(payload.split_details) if payload.split_details else None
        
        cursor.execute("""
            UPDATE group_transactions 
            SET amount=%s, description=%s, category_id=%s, payment_mode=%s, split_type=%s, split_details=%s
            WHERE id=%s
        """, (payload.amount, payload.description, payload.category_id, payload.payment_mode, payload.split_type, details_json, tx_id))
        
        conn.commit()
        return {"message": "Transaction updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/groups/{group_id}")
def update_group(group_id: int, payload: GroupUpdate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE expense_groups SET name = %s WHERE id = %s", (payload.name, group_id))
        conn.commit()
        return {"message": "Group updated"}
    finally:
        conn.close()

@router.delete("/groups/{group_id}")
def leave_or_delete_group(group_id: int, user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT type FROM expense_groups WHERE id = %s", (group_id,))
        group = cursor.fetchone()
        
        if group and group['type'] == 'split':
            cursor.execute("SELECT u.name FROM users u WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
            
            if user_data:

                cursor.execute("SELECT COUNT(*) as member_count FROM group_members WHERE group_id = %s", (group_id,))
                m_count = cursor.fetchone()['member_count']
                
                cursor.execute("SELECT SUM(amount) as total FROM group_transactions WHERE group_id = %s", (group_id,))
                t_spend = cursor.fetchone()['total'] or 0
                
                cursor.execute("SELECT SUM(amount) as paid FROM group_transactions WHERE group_id = %s AND logged_by = %s", (group_id, user_id))
                u_paid = cursor.fetchone()['paid'] or 0
                
                share = float(t_spend) / m_count if m_count > 0 else 0
                balance = float(u_paid) - share
                
                if abs(balance) > 0.05:
                    raise HTTPException(status_code=400, detail=f"Cannot leave group. Please settle your balance first.")

        cursor.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
        
        cursor.execute("SELECT COUNT(*) as count FROM group_members WHERE group_id = %s", (group_id,))
        remaining = cursor.fetchone()['count']
        if remaining == 0:
            cursor.execute("DELETE FROM expense_groups WHERE id = %s", (group_id,))
        else:
            # A group always keeps one admin: if the admin left, the longest-standing member takes over
            cursor.execute("SELECT 1 FROM group_members WHERE group_id = %s AND role = 'admin'", (group_id,))
            if not cursor.fetchone():
                cursor.execute("""
                    UPDATE group_members SET role = 'admin' WHERE group_id = %s
                    ORDER BY joined_at ASC, user_id ASC LIMIT 1
                """, (group_id,))
            
        conn.commit()
        return {"message": "Successfully left the group"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
@router.post("/groups/{group_id}/refresh-code")
def refresh_invite_code(group_id: int, user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Not authorized")
        new_code = generate_invite_code()
        cursor.execute("UPDATE invite_codes SET expires_at = NOW() WHERE group_id = %s", (group_id,))
        cursor.execute("INSERT INTO invite_codes (group_id, code, created_by, expires_at) VALUES (%s, %s, %s, DATE_ADD(NOW(), INTERVAL 30 MINUTE))", (group_id, new_code, user_id))
        conn.commit()
        return {"message": "Code refreshed", "code": new_code}
    finally:
        conn.close()
        
@router.delete("/groups/transactions/{tx_id}")
def delete_group_transaction(tx_id: int, user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT logged_by, split_type, split_details, settled_shares, split_data FROM group_transactions WHERE id = %s", (tx_id,))
        txn = cursor.fetchone()
        if not txn: raise HTTPException(status_code=404, detail="Transaction not found")
        recorded_by = (json.loads(txn['split_data']) if txn['split_data'] else {}).get('recorded_by')
        if txn['logged_by'] != user_id and recorded_by != user_id:
            raise HTTPException(status_code=403, detail="You can only delete transactions you logged.")
        if txn['split_type'] == 'settlement':
            group_ledger.unmark_settlement(cursor, txn)
        elif txn['settled_shares'] and json.loads(txn['settled_shares']):
            raise HTTPException(status_code=409, detail="Someone has already paid their share of this expense. Delete their payment first.")
        cursor.execute("DELETE FROM group_transactions WHERE id = %s", (tx_id,))
        conn.commit()
        return {"message": "Transaction deleted"}
    finally:
        conn.close()
        
@router.get("/groups/{group_id}/members")
def get_group_members(group_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT u.id, u.name, u.email, u.upi_id, gm.role, gm.joined_at 
            FROM group_members gm JOIN users u ON gm.user_id = u.id 
            WHERE gm.group_id = %s ORDER BY gm.role ASC, u.name ASC
        """, (group_id,))
        return cursor.fetchall()
    finally:
        conn.close()

@router.post("/groups/{group_id}/remind")
async def send_settlement_reminder(group_id: int, payload: RemindPayload):
    """A payment reminder. Normally an app notification that opens the group; if the person can't get
    one, the reply says so (code not_on_app) and the sender can choose WhatsApp or an invite instead."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT name, mobile FROM users WHERE id = %s", (payload.target_user_id,))
        target_user = cursor.fetchone()
        cursor.execute("SELECT name FROM users WHERE id = %s", (payload.from_user_id,))
        from_user = cursor.fetchone()
        cursor.execute("SELECT name FROM expense_groups WHERE id = %s", (group_id,))
        group = cursor.fetchone()
        if not target_user or not from_user or not group:
            raise HTTPException(status_code=404, detail="Member not found.")
        _require_member(cursor, group_id, payload.target_user_id)
    finally:
        conn.close()

    first_name = _first(target_user['name'])
    from_first = _first(from_user['name'])

    if payload.channel == "whatsapp":
        if not target_user['mobile']:
            raise HTTPException(status_code=400, detail=f"{first_name} has no WhatsApp number on SideNote. Invite them instead.")
        msg = (f"🔔 *Payment Reminder*\n\nHey {first_name}! {from_first} is waiting for ₹{payload.amount:g} "
               f"in *{group['name']}*.\n\nGet the SideNote app to see the details and settle up.")
        result = await send_whatsapp_text(target_user['mobile'], msg)
        if isinstance(result, dict) and result.get("status") == "error":
            raise HTTPException(status_code=502, detail="WhatsApp couldn't deliver the reminder right now. Please try again later.")
        return {"message": "Reminder sent on WhatsApp", "channel": "whatsapp"}

    sent = 0
    if device_tokens(payload.target_user_id):
        sent = await asyncio.to_thread(
            send_push, payload.target_user_id, f"Payment reminder · {group['name']}",
            f"{from_first} is waiting for ₹{payload.amount:g}. Tap to settle up.",
            {"kind": "group_expense", "group_id": group_id},
        )
    if not sent:
        # No phone signed in with notifications on (or its token went stale): let the sender pick another way
        raise HTTPException(status_code=409, detail={
            "code": "not_on_app",
            "message": f"{first_name} isn't getting SideNote app notifications yet.",
            "name": first_name,
            "can_whatsapp": bool(target_user['mobile']),
        })
    return {"message": "Reminder sent", "channel": "app"}

@router.delete("/groups/{group_id}/members/{target_user_id}")
def remove_group_member(group_id: int, target_user_id: int, user_id: int = Query(...)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
        requester = cursor.fetchone()
        if not requester or requester['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Only group admins can remove members.")
        
        if user_id == target_user_id:
            raise HTTPException(status_code=400, detail="You cannot remove yourself. Use the 'Leave Group' option instead.")

        cursor.execute("SELECT COUNT(*) as member_count FROM group_members WHERE group_id = %s", (group_id,))
        m_count = cursor.fetchone()['member_count']
        
        cursor.execute("SELECT amount, logged_by, split_type, split_details FROM group_transactions WHERE group_id = %s", (group_id,))
        transactions = cursor.fetchall()
        
        balance = 0.0
        for tx in transactions:
            payer = tx['logged_by']
            amount = float(tx['amount'])
            
            if payer == target_user_id:
                balance += amount
                
            if tx['split_details']:
                details = json.loads(tx['split_details'])
                if str(target_user_id) in details:
                    balance -= float(details[str(target_user_id)])
            elif tx['split_type'] == 'equal':
                balance -= (amount / m_count)
        
        if abs(balance) > 0.05:
            raise HTTPException(status_code=400, detail="Cannot remove this member because they still have unsettled balances in the group.")

        cursor.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, target_user_id))
        conn.commit()
        
        return {"message": "Member removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ---------- Google Pay style splits: per-person balances and per-share payments ----------

@router.get("/groups/{group_id}/balances")
def get_group_balances(group_id: int, user_id: int = Depends(get_current_user)):
    """The caller's balance with each member, pair by pair (not simplified across the group)"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _require_member(cursor, group_id, user_id)
        members, transactions = group_ledger.load_group(cursor, group_id)
        return group_ledger.balances_for(user_id, members, transactions)
    finally:
        conn.close()


@router.post("/groups/transactions/{tx_id}/shares/{debtor_id}/settle")
def settle_share(tx_id: int, debtor_id: int, payload: ShareSettlePayload, background: BackgroundTasks, user_id: int = Depends(get_current_user)):
    """Marks one person's share of one expense as paid, by that person or by whoever paid the bill"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT group_id, logged_by, description, split_type FROM group_transactions WHERE id = %s", (tx_id,))
        tx = cursor.fetchone()
        if not tx or tx["split_type"] == "settlement":
            raise HTTPException(status_code=404, detail="Expense not found.")
        creditor = tx["logged_by"]
        if user_id not in (debtor_id, creditor):
            raise HTTPException(status_code=403, detail="Only the person who owes or the person who paid can settle this share.")
        if debtor_id == creditor:
            raise HTTPException(status_code=400, detail="The payer has no share to settle.")
        _require_member(cursor, tx["group_id"], user_id)

        members, transactions = group_ledger.load_group(cursor, tx["group_id"])
        member_ids = [m["id"] for m in members]
        this_tx = next(t for t in transactions if t["id"] == tx_id)
        if str(debtor_id) in json.loads(this_tx["settled_shares"] or "{}"):
            return {"message": "Already paid", "already": True}
        share = group_ledger.tx_shares(this_tx, member_ids).get(debtor_id, 0)
        if share <= 0:
            raise HTTPException(status_code=400, detail="This person isn't part of the expense.")

        group_ledger.record_settlement(cursor, tx["group_id"], debtor_id, creditor, share, transactions, member_ids,
                                       payload.payment_mode, recorded_by=user_id, only_tx=tx_id)
        conn.commit()

        names = {m["id"]: m["name"] for m in members}
        cursor.execute("SELECT name FROM expense_groups WHERE id = %s", (tx["group_id"],))
        group_name = cursor.fetchone()["name"]
        amount = group_ledger.from_paise(share)
        other, body = (creditor, f"{_first(names.get(debtor_id))} marked ₹{amount:g} for {tx['description']} as paid to you") if user_id == debtor_id \
            else (debtor_id, f"{_first(names.get(creditor))} marked your ₹{amount:g} for {tx['description']} as paid")
        push_later(_push_many, [(other, group_name, body, {"kind": "group_expense", "group_id": tx["group_id"]})])
        return {"message": "Marked as paid", "amount": amount}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/groups/{group_id}/settle")
def settle_with_member(group_id: int, payload: SettlePayload, background: BackgroundTasks, user_id: int = Depends(get_current_user)):
    """Settles up between the caller and one member: what's owed by default, or a part of it"""
    if bool(payload.to_user_id) == bool(payload.from_user_id):
        raise HTTPException(status_code=400, detail="Choose who paid whom.")
    debtor, creditor = (user_id, payload.to_user_id) if payload.to_user_id else (payload.from_user_id, user_id)
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _require_member(cursor, group_id, user_id)
        members, transactions = group_ledger.load_group(cursor, group_id)
        member_ids = [m["id"] for m in members]
        if creditor not in member_ids or debtor not in member_ids:
            raise HTTPException(status_code=404, detail="That person isn't in this group.")
        owed = group_ledger.owed_between(debtor, creditor, members, transactions)
        if owed <= 0:
            raise HTTPException(status_code=400, detail="Nothing is owed between you two.")
        paise = group_ledger.to_paise(payload.amount) if payload.amount else owed
        if paise > owed:
            raise HTTPException(status_code=400, detail=f"Only ₹{group_ledger.from_paise(owed):g} is owed.")

        group_ledger.record_settlement(cursor, group_id, debtor, creditor, paise, transactions, member_ids,
                                       payload.payment_mode, recorded_by=user_id)
        conn.commit()

        names = {m["id"]: m["name"] for m in members}
        cursor.execute("SELECT name FROM expense_groups WHERE id = %s", (group_id,))
        group_name = cursor.fetchone()["name"]
        amount = group_ledger.from_paise(paise)
        other, body = (creditor, f"{_first(names.get(debtor))} marked ₹{amount:g} as paid to you") if user_id == debtor \
            else (debtor, f"{_first(names.get(creditor))} marked your ₹{amount:g} as paid")
        push_later(_push_many, [(other, group_name, body, {"kind": "group_expense", "group_id": group_id})])
        return {"message": "Settled", "amount": amount, "remaining": group_ledger.from_paise(owed - paise)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/groups/{group_id}/members")
def invite_group_members(group_id: int, payload: AddMembersPayload, background: BackgroundTasks, user_id: int = Depends(get_current_user)):
    """Invites SideNote users (found in the caller's contacts) to the group. They get a notification
    and see it under Invites; they join only if they accept."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _require_member(cursor, group_id, user_id)
        cursor.execute("SELECT name, max_members FROM expense_groups WHERE id = %s", (group_id,))
        group = cursor.fetchone()
        cursor.execute("SELECT user_id FROM group_members WHERE group_id = %s", (group_id,))
        existing = {r["user_id"] for r in cursor.fetchall()}
        cursor.execute("SELECT invitee_id FROM group_invites WHERE group_id = %s AND status = 'pending'", (group_id,))
        pending = {r["invitee_id"] for r in cursor.fetchall()}
        new_ids = [uid for uid in dict.fromkeys(payload.user_ids) if uid not in existing and uid not in pending and uid != user_id]
        if len(existing) + len(pending) + len(new_ids) > group["max_members"]:
            raise HTTPException(status_code=400, detail=f"This group allows {group['max_members']} members.")
        if not new_ids:
            return {"message": "Already invited or in the group", "invited": 0}
        cursor.execute(f"SELECT id FROM users WHERE id IN ({','.join(['%s'] * len(new_ids))})", tuple(new_ids))
        valid = [r["id"] for r in cursor.fetchall()]
        for uid in valid:
            cursor.execute("INSERT INTO group_invites (group_id, inviter_id, invitee_id) VALUES (%s, %s, %s)", (group_id, user_id, uid))
        conn.commit()

        cursor.execute("SELECT name FROM users WHERE id = %s", (user_id,))
        inviter = _first(cursor.fetchone()["name"])
        push_later(_push_many, [
            (uid, "Group invite", f"{inviter} invited you to join {group['name']} on SideNote", {"kind": "group_invite", "group_id": group_id})
            for uid in valid
        ])
        return {"message": "Invites sent", "invited": len(valid)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/me/group-invites")
def my_group_invites(user_id: int = Depends(get_current_user)):
    """Invites waiting for the caller to accept or decline"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT gi.id, gi.group_id, gi.created_at, g.name AS group_name, g.type, g.icon,
                   u.name AS inviter_name,
                   (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count
            FROM group_invites gi
            JOIN expense_groups g ON g.id = gi.group_id
            JOIN users u ON u.id = gi.inviter_id
            WHERE gi.invitee_id = %s AND gi.status = 'pending'
            ORDER BY gi.created_at DESC
        """, (user_id,))
        return cursor.fetchall()
    finally:
        conn.close()


@router.post("/group-invites/{invite_id}/{action}")
def respond_to_invite(invite_id: int, action: str, background: BackgroundTasks, user_id: int = Depends(get_current_user)):
    """Accept (join the group) or decline an invite"""
    if action not in ("accept", "decline"):
        raise HTTPException(status_code=404, detail="Not found")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT gi.*, g.name AS group_name, g.max_members FROM group_invites gi
            JOIN expense_groups g ON g.id = gi.group_id
            WHERE gi.id = %s AND gi.invitee_id = %s FOR UPDATE
        """, (invite_id, user_id))
        invite = cursor.fetchone()
        if not invite or invite["status"] != "pending":
            raise HTTPException(status_code=404, detail="This invite is no longer available.")
        if action == "accept":
            cursor.execute("SELECT COUNT(*) AS n FROM group_members WHERE group_id = %s", (invite["group_id"],))
            if cursor.fetchone()["n"] >= invite["max_members"]:
                raise HTTPException(status_code=400, detail="This group is full.")
            cursor.execute("INSERT IGNORE INTO group_members (group_id, user_id, role) VALUES (%s, %s, 'member')", (invite["group_id"], user_id))
            cursor.execute("UPDATE expense_groups SET status = 'active' WHERE id = %s", (invite["group_id"],))
        cursor.execute("UPDATE group_invites SET status = %s, responded_at = NOW() WHERE id = %s",
                       ("accepted" if action == "accept" else "declined", invite_id))
        conn.commit()

        if action == "accept":
            cursor.execute("SELECT name FROM users WHERE id = %s", (user_id,))
            joiner = _first(cursor.fetchone()["name"])
            push_later(_push_many, [(invite["inviter_id"], invite["group_name"],
                f"{joiner} accepted your invite and joined {invite['group_name']}", {"kind": "group_expense", "group_id": invite["group_id"]})])
        return {"message": "Joined the group" if action == "accept" else "Invite declined", "group_id": invite["group_id"]}
    except HTTPException:
        conn.rollback()
        raise
    finally:
        conn.close()


class ArchivePayload(BaseModel):
    archived: bool


@router.post("/groups/{group_id}/archive")
def archive_group(group_id: int, payload: ArchivePayload, user_id: int = Depends(get_current_user)):
    """Moves the group to (or out of) the caller's Archived tab. Only for them: others still see it."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _require_member(cursor, group_id, user_id)
        cursor.execute("UPDATE group_members SET archived_at = %s WHERE group_id = %s AND user_id = %s",
                       (datetime.now() if payload.archived else None, group_id, user_id))
        conn.commit()
        return {"archived": payload.archived}
    finally:
        conn.close()


@router.post("/groups/{group_id}/transfer-admin")
def transfer_group_admin(group_id: int, payload: TransferAdminPayload, background: BackgroundTasks, user_id: int = Depends(get_current_user)):
    """Hands the group's single admin role to another member; the current admin becomes a member"""
    if payload.new_admin_id == user_id:
        raise HTTPException(status_code=400, detail="You're already the admin.")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM group_members WHERE group_id = %s AND user_id = %s FOR UPDATE", (group_id, user_id))
        me = cursor.fetchone()
        if not me or me["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only the group admin can hand over the admin role.")
        cursor.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, payload.new_admin_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="That person isn't in this group.")
        # One admin per group: everyone else (including any leftover admins) becomes a member
        cursor.execute("UPDATE group_members SET role = 'member' WHERE group_id = %s AND user_id != %s", (group_id, payload.new_admin_id))
        cursor.execute("UPDATE group_members SET role = 'admin' WHERE group_id = %s AND user_id = %s", (group_id, payload.new_admin_id))
        conn.commit()

        cursor.execute("SELECT g.name AS group_name, u.name AS my_name FROM expense_groups g, users u WHERE g.id = %s AND u.id = %s", (group_id, user_id))
        row = cursor.fetchone()
        if row:
            push_later(_push_many, [(payload.new_admin_id, row["group_name"],
                f"{_first(row['my_name'])} made you the admin of {row['group_name']}", {"kind": "group_expense", "group_id": group_id})])
        return {"message": "Admin role transferred"}
    except HTTPException:
        conn.rollback()
        raise
    finally:
        conn.close()


@router.put("/groups/{group_id}/icon")
def set_group_icon(group_id: int, payload: GroupIconPayload, user_id: int = Depends(get_current_user)):
    """The group's emoji, chosen by a group admin (null resets to the group type's icon)"""
    icon = (payload.icon or "").strip() or None
    if icon and (any(ch.isalnum() and ch.isascii() for ch in icon) or len(icon) > 16):
        raise HTTPException(status_code=400, detail="Pick a single emoji for the group icon.")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
        member = cursor.fetchone()
        if not member:
            raise HTTPException(status_code=403, detail="You are not a member of this group.")
        if member["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only group admins can change the group icon.")
        cursor.execute("UPDATE expense_groups SET icon = %s WHERE id = %s", (icon, group_id))
        conn.commit()
        return {"icon": icon}
    finally:
        conn.close()


@router.put("/me/upi-id")
def set_upi_id(payload: UpiPayload, user_id: int = Depends(get_current_user)):
    """The UPI ID friends pay when settling up with you"""
    upi = (payload.upi_id or "").strip() or None
    if upi and not UPI_PATTERN.match(upi):
        raise HTTPException(status_code=400, detail="That doesn't look like a UPI ID (e.g. name@okaxis).")
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET upi_id = %s WHERE id = %s", (upi, user_id))
        conn.commit()
        return {"upi_id": upi}
    finally:
        conn.close()


@router.get("/me/upi-id")
def get_upi_id(user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT upi_id FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        return {"upi_id": row[0] if row else None}
    finally:
        conn.close()


@router.post("/contacts/match")
def match_contacts(payload: ContactMatchPayload, user_id: int = Depends(get_current_user)):
    """Which of the caller's contacts use SideNote. The phone sends hashes of numbers, never the numbers."""
    hashes = list({h.lower() for h in payload.hashes if re.fullmatch(r"[0-9a-fA-F]{64}", h)})
    if not hashes:
        return {"matches": []}
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        matches = []
        for i in range(0, len(hashes), 500):
            chunk = hashes[i:i + 500]
            cursor.execute(f"""
                SELECT id, name, profile_pic, SHA2(RIGHT(REGEXP_REPLACE(mobile, '[^0-9]', ''), 10), 256) AS hash
                FROM users
                WHERE mobile IS NOT NULL AND id != %s
                  AND SHA2(RIGHT(REGEXP_REPLACE(mobile, '[^0-9]', ''), 10), 256) IN ({','.join(['%s'] * len(chunk))})
            """, (user_id, *chunk))
            matches.extend({"hash": r["hash"], "user_id": r["id"], "name": r["name"], "profile_pic": r["profile_pic"]} for r in cursor.fetchall())
        return {"matches": matches}
    finally:
        conn.close()
