from fastapi import APIRouter, HTTPException
from typing import Any
from database import get_db
import random, string
from pydantic import BaseModel

router = APIRouter(tags=["Groups & Splitting"])

class GroupUpdate(BaseModel):
    name: str

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/groups/create")
def create_group(name: str, user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        invite_code = generate_invite_code()
        
        cursor.execute("INSERT INTO expense_groups (name, invite_code) VALUES (%s, %s)", (name, invite_code))
        group_id = cursor.lastrowid
        
        # Add creator as a member
        cursor.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)", (group_id, user_id))
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
        cursor.execute("SELECT id, name FROM expense_groups WHERE invite_code = %s", (invite_code,))
        group = cursor.fetchone()
        if not group:
            raise HTTPException(status_code=404, detail="Invalid invite code")
            
        cursor.execute("INSERT IGNORE INTO group_members (group_id, user_id) VALUES (%s, %s)", (group['id'], user_id))
        conn.commit()
        return {"message": f"Joined {group['name']} successfully"}
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
            SELECT paid_by_user_id, SUM(amount) as total_paid 
            FROM group_transactions WHERE group_id = %s GROUP BY paid_by_user_id
        """, (group_id,))
        payments = cursor.fetchall()
        
        total_group_spend = sum(float(p['total_paid']) for p in payments)
        split_share = total_group_spend / len(members) if len(members) > 0 else 0
        
        balances = {}
        for m in members: balances[m['id']] = {"name": m['display_name'], "balance": -split_share}
        for p in payments: balances[p['paid_by_user_id']]['balance'] += float(p['total_paid'])
            
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
                ) as invite_code
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
            SELECT t.id, t.amount, t.description, t.date, u.name as paid_by, t.logged_by as paid_by_user_id
            FROM group_transactions t
            JOIN users u ON t.logged_by = u.id
            WHERE t.group_id = %s
            ORDER BY t.date DESC
        """, (group_id,))
        return cursor.fetchall()
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
def delete_group(group_id: int):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM expense_groups WHERE id = %s", (group_id,))
        conn.commit()
        return {"message": "Group deleted"}
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
        
        cursor.execute("""
            INSERT INTO invite_codes (group_id, code, created_by, expires_at) 
            VALUES (%s, %s, %s, DATE_ADD(NOW(), INTERVAL 30 MINUTE))
        """, (group_id, new_code, user_id))
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
        
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn['logged_by'] != user_id:
            raise HTTPException(status_code=403, detail="You can only delete transactions you logged.")
            
        cursor.execute("DELETE FROM group_transactions WHERE id = %s", (tx_id,))
        conn.commit()
        return {"message": "Transaction deleted"}
    finally:
        conn.close()