from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Optional, Any
from database import get_db
import random, string, json
from pydantic import BaseModel
from whatsapp_handlers.bot_utils import extract_transaction_details, match_category_from_text
from whatsapp_handlers.split_parser import parse_and_compute_split, SplitError
from whatsapp_service import send_whatsapp_text

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

class GroupQuickAddPayload(BaseModel):
    text: str
    user_id: int

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
        return cursor.fetchall()
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
                t.split_type, t.split_details, t.payment_mode,
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
def create_group_transaction(group_id: int, payload: GroupTransactionCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        details_json = json.dumps(payload.split_details) if payload.split_details else None
        cursor.execute("""
            INSERT INTO group_transactions (group_id, amount, description, logged_by, split_type, category_id, payment_mode, split_details)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (group_id, payload.amount, payload.description, payload.user_id, payload.split_type, payload.category_id, payload.payment_mode, details_json))
        conn.commit()
        return {"message": "Transaction logged successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/groups/{group_id}/transactions/quick-add")
def quick_add_group_transaction(group_id: int, payload: GroupQuickAddPayload):
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
        cursor.execute("SELECT logged_by FROM group_transactions WHERE id = %s", (tx_id,))
        txn = cursor.fetchone()
        if not txn: 
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn['logged_by'] != user_id: 
            raise HTTPException(status_code=403, detail="You can only edit your own transactions.")

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
        cursor.execute("SELECT logged_by FROM group_transactions WHERE id = %s", (tx_id,))
        txn = cursor.fetchone()
        if not txn: raise HTTPException(status_code=404, detail="Transaction not found")
        if txn['logged_by'] != user_id: raise HTTPException(status_code=403, detail="You can only delete transactions you logged.")
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
            SELECT u.id, u.name, u.email, gm.role, gm.joined_at 
            FROM group_members gm JOIN users u ON gm.user_id = u.id 
            WHERE gm.group_id = %s ORDER BY gm.role ASC, u.name ASC
        """, (group_id,))
        return cursor.fetchall()
    finally:
        conn.close()

@router.post("/groups/{group_id}/remind")
async def send_settlement_reminder(group_id: int, payload: RemindPayload):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT name, mobile FROM users WHERE id = %s", (payload.target_user_id,))
        target_user = cursor.fetchone()
        cursor.execute("SELECT name FROM users WHERE id = %s", (payload.from_user_id,))
        from_user = cursor.fetchone()
        cursor.execute("SELECT name FROM expense_groups WHERE id = %s", (group_id,))
        group = cursor.fetchone()

        if not target_user or not target_user['mobile']:
            raise HTTPException(status_code=400, detail="This user does not have a registered WhatsApp number.")

        group_alias = group['name'].split()[0].lower()
        my_alias = from_user['name'].split()[0].lower()
        first_name = target_user['name'].split()[0]

        msg = f"🔔 *Payment Reminder*\n\nHey {first_name}! Just a quick reminder to settle up ₹{payload.amount:g} with {from_user['name']} in *{group['name']}*.\n\nYou can reply here with:\n*@{group_alias} settle @{my_alias}*"

        await send_whatsapp_text(target_user['mobile'], msg)
        return {"message": "Reminder sent via WhatsApp"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
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