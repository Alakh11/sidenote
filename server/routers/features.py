from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from typing import Any, Optional
from pydantic import BaseModel
from security import get_current_user
from push_service import send_push
from database import get_db
from schemas import (
    GoalCreate, GoalUpdate, LoanCreate, LoanUpdate, 
    DebtCreate, RepaymentCreate, MarkPaidRequest
)
from utils import calculate_interest
from datetime import datetime, date
from zoneinfo import ZoneInfo
import calendar
import logging

router = APIRouter(tags=["Features (Goals, Loans, Debts)"])
logger = logging.getLogger(__name__)

# ================= GOALS =================

@router.get("/goals/{user_id}")
def get_goals(user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM goals WHERE user_id = %s", (user_id,)) # SQL Update
    data: list[Any] = cursor.fetchall()
    conn.close()
    return data

@router.post("/goals")
def add_goal(goal: GoalCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO goals (user_id, name, target_amount, deadline) VALUES (%s, %s, %s, %s)", (goal.user_id, goal.name, goal.target_amount, goal.deadline))
    conn.commit()
    conn.close()
    return {"message": "Goal added"}

@router.delete("/goals/{id}")
def delete_goal(id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM goals WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"message": "Goal deleted"}

@router.put("/goals/add-money")
def add_money_to_goal(update: GoalUpdate):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM goals WHERE id = %s", (update.goal_id,))
        goal: Any = cursor.fetchone()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        cursor.execute("UPDATE goals SET current_amount = current_amount + %s WHERE id = %s", (update.amount_added, update.goal_id))
        
        is_saving = update.amount_added > 0
        tx_type = 'expense' if is_saving else 'income'
        tx_note = f"Saved for {goal['name']}" if is_saving else f"Withdrew from {goal['name']}"
        
        cursor.execute("SELECT id FROM categories WHERE name = 'Savings' AND user_id = %s", (goal['user_id'],))
        cat: Any = cursor.fetchone()
        if not cat:
            cursor.execute("INSERT INTO categories (user_id, name, color, type, icon, is_default) VALUES (%s, 'Savings', '#10B981', 'expense', '🐷', TRUE)", (goal['user_id'],))
            cat_id = cursor.lastrowid
        else:
            cat_id = cat['id']

        cursor.execute("""
            INSERT INTO transactions (user_id, amount, type, category_id, payment_mode, date, note, goal_id) 
            VALUES (%s, %s, %s, %s, 'Transfer', NOW(), %s, %s)
        """, (goal['user_id'], abs(update.amount_added), tx_type, cat_id, tx_note, update.goal_id))

        conn.commit()
        print("Money added to goal")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    return {"message": "Money added to goal"}

@router.get("/goals/{id}/history")
def get_goal_history(id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM transactions WHERE goal_id = %s ORDER BY date DESC", (id,))
        data: list[Any] = cursor.fetchall()
        return data
    finally:
        conn.close()

# ================= LOANS =================

IST = ZoneInfo("Asia/Kolkata")


def emi_due_date(start: date, k: int) -> date:
    month_index = start.month - 1 + k
    year, month = start.year + month_index // 12, month_index % 12 + 1
    return date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def loan_progress(start: date, tenure_months: int, today: date) -> dict:
    paid = sum(1 for k in range(1, tenure_months + 1) if emi_due_date(start, k) <= today)
    next_due = emi_due_date(start, paid + 1) if paid < tenure_months else None
    return {"months_paid": paid, "next_emi_date": next_due.isoformat() if next_due else None}

@router.post("/loans")
def add_loan(loan: LoanCreate):
    conn = get_db()
    cursor = conn.cursor()
    
    P = loan.total_amount
    R = (loan.interest_rate / 12) / 100
    N = loan.tenure_months
    
    emi = (P / N) if R == 0 else (P * R * pow(1 + R, N)) / (pow(1 + R, N) - 1)
    
    cursor.execute("""
        INSERT INTO loans (user_id, name, total_amount, interest_rate, tenure_months, start_date, emi_amount)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (loan.user_id, loan.name, loan.total_amount, loan.interest_rate, loan.tenure_months, loan.start_date, emi))
    
    conn.commit()
    conn.close()
    return {"message": "Loan added"}

@router.get("/loans/{user_id}")
def get_loans(user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT l.*, lu.name AS lender_name FROM loans l
        LEFT JOIN users lu ON lu.id = l.lender_user_id
        WHERE l.user_id = %s
    """, (user_id,))
    loans: list[Any] = cursor.fetchall()
    
    today = datetime.now(IST).date()
    for loan in loans:
        start = loan['start_date'] if isinstance(loan['start_date'], date) else datetime.strptime(str(loan['start_date'])[:10], '%Y-%m-%d').date()
        tenure_months = int(loan['tenure_months'])
        emi_amount = float(loan['emi_amount'])
        progress = loan_progress(start, tenure_months, today)

        loan['months_paid'] = progress['months_paid']
        loan['next_emi_date'] = progress['next_emi_date']
        loan['amount_paid'] = emi_amount * progress['months_paid']
        loan['amount_remaining'] = (emi_amount * tenure_months) - loan['amount_paid']
        loan['progress'] = (loan['amount_paid'] / (emi_amount * tenure_months)) * 100 if (emi_amount * tenure_months) > 0 else 0
        
    conn.close()
    return loans

@router.delete("/loans/{id}")
def delete_loan(id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM loans WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"message": "Loan deleted"}

@router.put("/loans/{loan_id}")
def update_loan(loan_id: int, loan: LoanUpdate):
    try:
        conn = get_db()
        cursor = conn.cursor()
        r = (loan.interest_rate / 12) / 100
        n = loan.tenure_months
        emi = (loan.total_amount / n) if r == 0 else (loan.total_amount * r * ((1 + r) ** n)) / (((1 + r) ** n) - 1)

        query = """
            UPDATE loans SET name = %s, total_amount = %s, interest_rate = %s, 
            tenure_months = %s, start_date = %s, emi_amount = %s WHERE id = %s
        """
        cursor.execute(query, (loan.name, loan.total_amount, loan.interest_rate, loan.tenure_months, loan.start_date, emi, loan_id))
        conn.commit()
        conn.close()
        return {"message": "Loan updated successfully"}
    except Exception as e:
        logger.error(f"Update Loan Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- DEBT TRACKER ENDPOINTS ---

@router.get("/debts/dashboard/{user_id}")
def get_debt_dashboard(user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT SUM(total_lent) as total_lent, SUM(total_repaid) as total_repaid, SUM(current_balance) as outstanding
        FROM borrowers WHERE user_id = %s
    """, (user_id,))
    stats: Any = cursor.fetchone()
    
    cursor.execute("""
        SELECT * FROM borrowers WHERE user_id = %s AND current_balance > 0 
        ORDER BY current_balance DESC LIMIT 3
    """, (user_id,))
    top_borrowers: list[Any] = cursor.fetchall()
    
    conn.close()
    return {"stats": stats, "top_borrowers": top_borrowers}

@router.get("/debts/borrowers/{user_id}")
def get_borrowers(user_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT b.*, lu.name AS linked_name FROM borrowers b
        LEFT JOIN users lu ON lu.id = b.linked_user_id
        WHERE b.user_id = %s ORDER BY b.last_activity DESC
    """, (user_id,))
    borrowers: list[Any] = cursor.fetchall()
    conn.close()
    return borrowers

@router.post("/debts/lend")
def lend_money(debt: DebtCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        borrower_id = debt.borrower_id
        if not borrower_id and debt.new_borrower_name:
            cursor.execute("INSERT INTO borrowers (user_id, name) VALUES (%s, %s)", (debt.user_id, debt.new_borrower_name))
            borrower_id = cursor.lastrowid
            
        if not borrower_id:
            raise HTTPException(status_code=400, detail="Borrower ID or Name required")

        cursor.execute("""
            INSERT INTO debts (borrower_id, amount, date, due_date, reason, status, interest_rate, interest_period, user_id)
            VALUES (%s, %s, %s, %s, %s, 'Pending', %s, %s, %s)
        """, (borrower_id, debt.amount, debt.date, debt.due_date, debt.reason, debt.interest_rate, debt.interest_period, debt.user_id))

        cursor.execute("""
            UPDATE borrowers SET total_lent = total_lent + %s, current_balance = current_balance + %s, last_activity = NOW()
            WHERE id = %s
        """, (debt.amount, debt.amount, borrower_id))
        
        conn.commit()
        return {"message": "Lending recorded successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/debts/repay")
def repay_money(repay: RepaymentCreate):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM debts WHERE id = %s", (repay.debt_id,))
        debt: Any = cursor.fetchone()
        if not debt:
            raise HTTPException(status_code=404, detail="Debt not found")
            
        new_repaid = float(debt['amount_repaid']) + repay.amount
        is_fully_paid = new_repaid >= float(debt['amount'])
        new_status = 'Paid' if is_fully_paid else 'Partial'
        
        cursor.execute("INSERT INTO repayments (debt_id, amount, date, mode) VALUES (%s, %s, %s, %s)", 
                       (repay.debt_id, repay.amount, repay.date, repay.mode))
        
        cursor.execute("UPDATE debts SET amount_repaid = %s, status = %s WHERE id = %s", 
                       (new_repaid, new_status, repay.debt_id))
        
        cursor.execute("""
            UPDATE borrowers SET total_repaid = total_repaid + %s, current_balance = current_balance - %s, last_activity = NOW()
            WHERE id = %s
        """, (repay.amount, repay.amount, debt['borrower_id']))
        
        conn.commit()
        return {"message": "Repayment recorded"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/debts/ledger/{borrower_id}")
def get_ledger(borrower_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM borrowers WHERE id = %s", (borrower_id,))
    borrower: Any = cursor.fetchone()
    cursor.execute("SELECT * FROM debts WHERE borrower_id = %s ORDER BY date DESC", (borrower_id,))
    debts: list[Any] = cursor.fetchall()
    
    total_interest_accrued = 0
    risk_flags = []
    
    for d in debts:
        outstanding_principal = float(d['amount']) - float(d['amount_repaid'])
        if outstanding_principal > 0 and float(d['interest_rate']) > 0:
            interest = calculate_interest(outstanding_principal, float(d['interest_rate']), str(d['interest_period']), d['date'])
            d['accrued_interest'] = interest
            d['total_due'] = outstanding_principal + interest
            total_interest_accrued += interest
        else:
            d['accrued_interest'] = 0
            d['total_due'] = outstanding_principal

        if d['status'] != 'Paid' and d['due_date']:
            due_date = datetime.strptime(str(d['due_date']), "%Y-%m-%d").date()
            if date.today() > due_date:
                d['is_overdue'] = True
                risk_flags.append(f"Overdue: {d['reason']}")
            else: d['is_overdue'] = False
        else: d['is_overdue'] = False

    cursor.execute("""
        SELECT r.*, d.reason as loan_reason FROM repayments r
        JOIN debts d ON r.debt_id = d.id WHERE d.borrower_id = %s ORDER BY r.date DESC
    """, (borrower_id,))
    repayments: list[Any] = cursor.fetchall()

    if borrower and float(borrower['current_balance']) > 10000: 
        risk_flags.append("High Outstanding Balance")
        
    conn.close()
    return {
        "borrower": borrower, "debts": debts, "repayments": repayments, 
        "total_interest": total_interest_accrued, "risks": list(set(risk_flags))
    }

@router.post("/debts/mark-paid")
def mark_fully_paid(req: MarkPaidRequest):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM debts WHERE id = %s", (req.debt_id,))
        debt: Any = cursor.fetchone()
        remaining = float(debt['amount']) - float(debt['amount_repaid'])
        if remaining <= 0: return {"message": "Already paid"}

        cursor.execute("INSERT INTO repayments (debt_id, amount, date, mode) VALUES (%s, %s, %s, 'Cash')", 
                       (req.debt_id, remaining, req.date))
        cursor.execute("UPDATE debts SET amount_repaid = amount, status = 'Paid' WHERE id = %s", (req.debt_id,))
        cursor.execute("""
            UPDATE borrowers SET total_repaid = total_repaid + %s, current_balance = current_balance - %s, last_activity = NOW()
            WHERE id = %s
        """, (remaining, remaining, debt['borrower_id']))
        conn.commit()
        return {"message": "Marked as paid"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/debts/{id}")
def delete_debt(id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM debts WHERE id = %s", (id,))
        debt: Any = cursor.fetchone()
        if not debt: raise HTTPException(status_code=404, detail="Debt not found")
            
        borrower_id = debt['borrower_id']
        amount_lent = float(debt['amount'])
        amount_repaid = float(debt['amount_repaid'])
        balance_to_reduce = amount_lent - amount_repaid
        
        cursor.execute("DELETE FROM debts WHERE id = %s", (id,))
        cursor.execute("""
            UPDATE borrowers SET total_lent = total_lent - %s, total_repaid = total_repaid - %s,
            current_balance = current_balance - %s WHERE id = %s
        """, (amount_lent, amount_repaid, balance_to_reduce, borrower_id))
        conn.commit()
        return {"message": "Debt deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/debts/borrowers/{id}")
def delete_borrower(id: int):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM borrowers WHERE id = %s", (id,))
        conn.commit()
        return {"message": "Borrower deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ================= SHARING (optional) =================
# A loan can be linked to the SideNote account of whoever lent it, and a borrower in the Debts
# tracker to the account of the person who borrowed. They then see, read-only, what has been paid
# and what is left. Only the owner of the record can link or unlink.

class LinkPersonPayload(BaseModel):
    user_id: Optional[int] = None


def _notify(user_id: int, title: str, body: str, kind: str) -> None:
    try:
        send_push(user_id, title, body, {"kind": kind})
    except Exception as e:
        logger.warning(f"Share push failed for {user_id}: {e}")


def _first_name(cursor, user_id: int) -> str:
    cursor.execute("SELECT name FROM users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    return ((row or {}).get("name") or "Someone").split()[0]


@router.put("/loans/{loan_id}/lender")
def link_loan_lender(loan_id: int, payload: LinkPersonPayload, background: BackgroundTasks, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, user_id FROM loans WHERE id = %s", (loan_id,))
        loan = cursor.fetchone()
        if not loan or loan["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="Loan not found.")
        if payload.user_id == user_id:
            raise HTTPException(status_code=400, detail="You can't share a loan with yourself.")
        cursor.execute("UPDATE loans SET lender_user_id = %s WHERE id = %s", (payload.user_id, loan_id))
        conn.commit()
        if payload.user_id:
            owner = _first_name(cursor, user_id)
            background.add_task(_notify, payload.user_id, "Loan shared with you",
                                f"{owner} added you as the lender for \"{loan['name']}\". See its repayments in Loan Tracker.", "shared_loan")
        return {"lender_user_id": payload.user_id}
    finally:
        conn.close()


@router.put("/debts/borrowers/{borrower_id}/link")
def link_borrower(borrower_id: int, payload: LinkPersonPayload, background: BackgroundTasks, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, user_id FROM borrowers WHERE id = %s", (borrower_id,))
        borrower = cursor.fetchone()
        if not borrower or borrower["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="Person not found.")
        if payload.user_id == user_id:
            raise HTTPException(status_code=400, detail="You can't link yourself.")
        cursor.execute("UPDATE borrowers SET linked_user_id = %s WHERE id = %s", (payload.user_id, borrower_id))
        conn.commit()
        if payload.user_id:
            owner = _first_name(cursor, user_id)
            background.add_task(_notify, payload.user_id, "Shared with you",
                                f"{owner} shared what you've borrowed and repaid. See it in Debts Tracker.", "shared_debt")
        return {"linked_user_id": payload.user_id}
    finally:
        conn.close()


@router.get("/me/shared/loans")
def loans_shared_with_me(user_id: int = Depends(get_current_user)):
    """Loans where the caller is the lender: the borrower's repayment progress"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT l.*, u.name AS owner_name FROM loans l JOIN users u ON u.id = l.user_id
            WHERE l.lender_user_id = %s ORDER BY l.start_date DESC
        """, (user_id,))
        loans: list[Any] = cursor.fetchall()
        today = datetime.now(IST).date()
        for loan in loans:
            start = loan['start_date'] if isinstance(loan['start_date'], date) else datetime.strptime(str(loan['start_date'])[:10], '%Y-%m-%d').date()
            tenure = int(loan['tenure_months'])
            emi = float(loan['emi_amount'])
            progress = loan_progress(start, tenure, today)
            loan.update(progress)
            loan['amount_paid'] = emi * progress['months_paid']
            loan['amount_remaining'] = emi * tenure - loan['amount_paid']
            loan['progress'] = loan['amount_paid'] / (emi * tenure) * 100 if emi * tenure > 0 else 0
            loan.pop('lender_user_id', None)
        return loans
    finally:
        conn.close()


@router.get("/me/shared/debts")
def debts_shared_with_me(user_id: int = Depends(get_current_user)):
    """What the caller borrowed from people who track it in SideNote, and what they've repaid"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT b.id, b.total_lent, b.total_repaid, b.current_balance, b.last_activity, u.name AS owner_name
            FROM borrowers b JOIN users u ON u.id = b.user_id
            WHERE b.linked_user_id = %s ORDER BY b.last_activity DESC
        """, (user_id,))
        people: list[Any] = cursor.fetchall()
        for p in people:
            cursor.execute("SELECT id, amount, amount_repaid, date, due_date, reason, status FROM debts WHERE borrower_id = %s ORDER BY date DESC", (p["id"],))
            p["debts"] = cursor.fetchall()
            cursor.execute("""
                SELECT r.amount, r.date, r.mode, d.reason FROM repayments r JOIN debts d ON d.id = r.debt_id
                WHERE d.borrower_id = %s ORDER BY r.date DESC
            """, (p["id"],))
            p["repayments"] = cursor.fetchall()
        return people
    finally:
        conn.close()
