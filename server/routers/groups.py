from fastapi import APIRouter, HTTPException, Query
from typing import Any
from database import get_db
import random, string
from pydantic import BaseModel

router = APIRouter(tags=["Groups & Splitting"])

class GroupUpdate(BaseModel):
    name: str

class GroupTransactionCreate(BaseModel):
    amount: float
    description: str
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
        
        if not members: return {"settlements": []}
        
        cursor.execute("""
            SELECT logged_by, SUM(amount) as total_paid 
            FROM group_transactions WHERE group_id = %s GROUP BY logged_by
        """, (group_id,))
        payments = cursor.fetchall()
        
        total_group_spend = sum(float(p['total_paid']) for p in payments)
        split_share = total_group_spend / len(members) if len(members) > 0 else 0
        
        balances = {}
        for m in members: balances[m['id']] = {"name": m['display_name'], "balance": -split_share}
        
        for p in payments: 
            if p['logged_by'] in balances:
                balances[p['logged_by']]['balance'] += float(p['total_paid'])
            
        debtors = [{"id": k, "name": v["name"], "amount": abs(v["balance"])} for k, v in balances.items() if v["balance"] < -0.01]
        creditors = [{"id": k, "name": v["name"], "amount": v["balance"]} for k, v in balances.items() if v["balance"] > 0.01]
        
        settlements = []
        i, j = 0, 0
        while i < len(debtors) and j < len(creditors):
            debtor = debtors[i]
            creditor = creditors[j]
            
            settle_amount = min(debtor['amount'], creditor['amount'])
            settlements.append({
                "from": debtor['name'],
                "to": creditor['name'],
                "amount": round(settle_amount, 2)
            })
            
            debtor['amount'] -= settle_amount
            creditor['amount'] -= settle_amount
            
            if debtor['amount'] < 0.01: i += 1
            if creditor['amount'] < 0.01: j += 1
            
        return {"total_spend": total_group_spend, "per_person": round(split_share, 2), "settlements": settlements}
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
def get_group_transactions(group_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT t.id, t.amount, t.description, t.logged_at as date, u.name as paid_by, t.logged_by as paid_by_user_id, t.split_type
            FROM group_transactions t
            JOIN users u ON t.logged_by = u.id
            WHERE t.group_id = %s
            ORDER BY t.logged_at DESC
        """, (group_id,))
        return cursor.fetchall()
    finally:
        conn.close()

@router.post("/groups/{group_id}/transactions")
def create_group_transaction(group_id: int, payload: GroupTransactionCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO group_transactions (group_id, amount, description, logged_by, split_type)
            VALUES (%s, %s, %s, %s, 'equal')
        """, (group_id, payload.amount, payload.description, payload.user_id))
        conn.commit()
        return {"message": "Transaction logged successfully"}
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