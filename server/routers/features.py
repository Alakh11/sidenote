from fastapi import APIRouter, HTTPException
from database import get_db
from schemas import (
    GoalCreate, GoalUpdate, LoanCreate, LoanUpdate, 
    DebtCreate, RepaymentCreate, MarkPaidRequest
)
from utils import calculate_interest
from datetime import datetime, date
import logging

router = APIRouter(tags=["Features (Goals, Loans, Debts)"])
logger = logging.getLogger(__name__)

# ================= GOALS =================

@router.get("/goals/{email}")
def get_goals(email: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM goals WHERE user_email = %s", (email,))
    data = cursor.fetchall()
    conn.close()
    return data

@router.post("/goals")
def add_goal(goal: GoalCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO goals (user_email, name, target_amount, deadline) VALUES (%s, %s, %s, %s)", (goal.user_email, goal.name, goal.target_amount, goal.deadline))
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
        goal = cursor.fetchone()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        cursor.execute("UPDATE goals SET current_amount = current_amount + %s WHERE id = %s", (update.amount_added, update.goal_id))
        
        is_saving = update.amount_added > 0
        tx_type = 'expense' if is_saving else 'income'
        tx_note = f"Saved for {goal['name']}" if is_saving else f"Withdrew from {goal['name']}"
        
        cursor.execute("SELECT id FROM categories WHERE name = 'Savings' AND user_email = %s", (goal['user_email'],))
        cat = cursor.fetchone()
        if not cat:
            cursor.execute("INSERT INTO categories (user_email, name, color, type, icon, is_default) VALUES (%s, 'Savings', '#10B981', 'expense', '🐷', TRUE)", (goal['user_email'],))
            cat_id = cursor.lastrowid
        else:
            cat_id = cat['id']

        cursor.execute("""
            INSERT INTO transactions (user_email, amount, type, category_id, payment_mode, date, note, goal_id) 
            VALUES (%s, %s, %s, %s, 'Transfer', NOW(), %s, %s)
        """, (goal['user_email'], abs(update.amount_added), tx_type, cat_id, tx_note, update.goal_id))

        conn.commit()
        return {"message": "Transaction recorded"}
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
        cursor.execute("""
            SELECT * FROM transactions 
            WHERE goal_id = %s 
            ORDER BY date DESC
        """, (id,))
        data = cursor.fetchall()
        return data
    finally:
        conn.close()

# ================= LOANS =================

@router.post("/loans")
def add_loan(loan: LoanCreate):
    conn = get_db()
    cursor = conn.cursor()
    
    # Calculate EMI (P x R x (1+R)^N) / ((1+R)^N - 1)
    # Rate is monthly (Annual / 12 / 100)
    P = loan.total_amount
    R = (loan.interest_rate / 12) / 100
    N = loan.tenure_months
    
    if R == 0:
        emi = P / N
    else:
        emi = (P * R * pow(1 + R, N)) / (pow(1 + R, N) - 1)
    
    cursor.execute("""
        INSERT INTO loans (user_email, name, total_amount, interest_rate, tenure_months, start_date, emi_amount)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (loan.user_email, loan.name, loan.total_amount, loan.interest_rate, loan.tenure_months, loan.start_date, emi))
    
    conn.commit()
    conn.close()
    return {"message": "Loan added"}

@router.get("/loans/{email}")
def get_loans(email: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM loans WHERE user_email = %s", (email,))
    loans = cursor.fetchall()
    
    # Calculate Paid vs Remaining dynamically
    for loan in loans:
        start = datetime.strptime(str(loan['start_date']), '%Y-%m-%d')
        now = datetime.now()
        months_passed = (now.year - start.year) * 12 + (now.month - start.month)
        months_passed = max(0, min(months_passed, loan['tenure_months']))
        
        loan['months_paid'] = months_passed
        loan['amount_paid'] = float(loan['emi_amount']) * months_passed
        loan['amount_remaining'] = (float(loan['emi_amount']) * loan['tenure_months']) - loan['amount_paid']
        loan['progress'] = (loan['amount_paid'] / (float(loan['emi_amount']) * loan['tenure_months'])) * 100
        
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
        
        if r == 0:
            emi = loan.total_amount / n
        else:
            emi = (loan.total_amount * r * ((1 + r) ** n)) / (((1 + r) ** n) - 1)

        query = """
            UPDATE loans 
            SET name = %s, total_amount = %s, interest_rate = %s, 
                tenure_months = %s, start_date = %s, emi_amount = %s
            WHERE id = %s
        """
        cursor.execute(query, (
            loan.name, 
            loan.total_amount, 
            loan.interest_rate, 
            loan.tenure_months, 
            loan.start_date, 
            emi, 
            loan_id
        ))
        conn.commit()
        conn.close()
        return {"message": "Loan updated successfully"}
    except Exception as e:
        logger.error(f"Update Loan Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- DEBT TRACKER ENDPOINTS ---

# 1. Get Dashboard Stats & Top Borrowers
@router.get("/debts/dashboard/{email}")
def get_debt_dashboard(email: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Summary Stats
    cursor.execute("""
        SELECT 
            SUM(total_lent) as total_lent, 
            SUM(total_repaid) as total_repaid,
            SUM(current_balance) as outstanding
        FROM borrowers WHERE user_email = %s
    """, (email,))
    stats = cursor.fetchone()
    
    # Top 3 People owing money
    cursor.execute("""
        SELECT * FROM borrowers 
        WHERE user_email = %s AND current_balance > 0 
        ORDER BY current_balance DESC LIMIT 3
    """, (email,))
    top_borrowers = cursor.fetchall()
    
    conn.close()
    return {"stats": stats, "top_borrowers": top_borrowers}

# 2. Get All Borrowers
@router.get("/debts/borrowers/{email}")
def get_borrowers(email: str):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM borrowers WHERE user_email = %s ORDER BY last_activity DESC", (email,))
    borrowers = cursor.fetchall()
    conn.close()
    return borrowers

# 3. Add New Debt (Lend Money)
@router.post("/debts/lend")
def lend_money(debt: DebtCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        borrower_id = debt.borrower_id
        if not borrower_id and debt.new_borrower_name:
            cursor.execute(
                "INSERT INTO borrowers (user_email, name) VALUES (%s, %s)",
                (debt.user_email, debt.new_borrower_name)
            )
            borrower_id = cursor.lastrowid
            
        if not borrower_id:
            raise HTTPException(status_code=400, detail="Borrower ID or Name required")

        cursor.execute("""
            INSERT INTO debts (borrower_id, amount, date, due_date, reason, status, interest_rate, interest_period)
            VALUES (%s, %s, %s, %s, %s, 'Pending', %s, %s)
        """, (borrower_id, debt.amount, debt.date, debt.due_date, debt.reason, debt.interest_rate, debt.interest_period))

        cursor.execute("""
            UPDATE borrowers 
            SET total_lent = total_lent + %s, 
                current_balance = current_balance + %s,
                last_activity = NOW()
            WHERE id = %s
        """, (debt.amount, debt.amount, borrower_id))
        
        conn.commit()
        return {"message": "Lending recorded successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# 4. Record Repayment
@router.post("/debts/repay")
def repay_money(repay: RepaymentCreate):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Step A: Get Debt Info
        cursor.execute("SELECT * FROM debts WHERE id = %s", (repay.debt_id,))
        debt = cursor.fetchone()
        if not debt:
            raise HTTPException(status_code=404, detail="Debt not found")
            
        new_repaid = float(debt['amount_repaid']) + repay.amount
        is_fully_paid = new_repaid >= float(debt['amount'])
        new_status = 'Paid' if is_fully_paid else 'Partial'
        
        # Step B: Insert Repayment Record
        cursor.execute("""
            INSERT INTO repayments (debt_id, amount, date, mode)
            VALUES (%s, %s, %s, %s)
        """, (repay.debt_id, repay.amount, repay.date, repay.mode))
        
        # Step C: Update Debt Status
        cursor.execute("""
            UPDATE debts SET amount_repaid = %s, status = %s WHERE id = %s
        """, (new_repaid, new_status, repay.debt_id))
        
        # Step D: Update Borrower Totals
        cursor.execute("""
            UPDATE borrowers 
            SET total_repaid = total_repaid + %s, 
                current_balance = current_balance - %s,
                last_activity = NOW()
            WHERE id = %s
        """, (repay.amount, repay.amount, debt['borrower_id']))
        
        conn.commit()
        return {"message": "Repayment recorded"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# 5. Get Detailed Ledger for a Borrower
@router.get("/debts/ledger/{borrower_id}")
def get_ledger(borrower_id: int):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Get Borrower Info
    cursor.execute("SELECT * FROM borrowers WHERE id = %s", (borrower_id,))
    borrower = cursor.fetchone()
    
    # Get all loans
    cursor.execute("SELECT * FROM debts WHERE borrower_id = %s ORDER BY date DESC", (borrower_id,))
    debts = cursor.fetchall()
    
    # Process Debts for Interest & Overdue Status
    total_interest_accrued = 0
    risk_flags = []
    
    for d in debts:
        # 1. Interest Calculation
        outstanding_principal = float(d['amount']) - float(d['amount_repaid'])
        if outstanding_principal > 0 and d['interest_rate'] > 0:
            interest = calculate_interest(outstanding_principal, float(d['interest_rate']), d['interest_period'], d['date'])
            d['accrued_interest'] = interest
            d['total_due'] = outstanding_principal + interest
            total_interest_accrued += interest
        else:
            d['accrued_interest'] = 0
            d['total_due'] = outstanding_principal

        # 2. Overdue Logic
        if d['status'] != 'Paid' and d['due_date']:
            due_date = datetime.strptime(str(d['due_date']), "%Y-%m-%d").date()
            if date.today() > due_date:
                d['is_overdue'] = True
                risk_flags.append(f"Overdue: {d['reason']}")
            else:
                d['is_overdue'] = False
        else:
            d['is_overdue'] = False

    # Get Repayments
    cursor.execute("""
        SELECT r.*, d.reason as loan_reason 
        FROM repayments r
        JOIN debts d ON r.debt_id = d.id
        WHERE d.borrower_id = %s
        ORDER BY r.date DESC
    """, (borrower_id,))
    repayments = cursor.fetchall()

    # Get Borrower basic info
    cursor.execute("SELECT * FROM borrowers WHERE id = %s", (borrower_id,))
    borrower = cursor.fetchone()
    
    # Add High Outstanding Risk
    if float(borrower['current_balance']) > 10000: 
        risk_flags.append("High Outstanding Balance")
        
    conn.close()
    return {
        "borrower": borrower, 
        "debts": debts, 
        "repayments": repayments, 
        "total_interest": total_interest_accrued,
        "risks": list(set(risk_flags)) # Unique risks
    }

@router.post("/debts/mark-paid")
def mark_fully_paid(req: MarkPaidRequest):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get Debt Info
        cursor.execute("SELECT * FROM debts WHERE id = %s", (req.debt_id,))
        debt = cursor.fetchone()
        remaining = float(debt['amount']) - float(debt['amount_repaid'])
        
        if remaining <= 0:
            return {"message": "Already paid"}

        # Create Repayment Entry
        cursor.execute("""
            INSERT INTO repayments (debt_id, amount, date, mode)
            VALUES (%s, %s, %s, 'Cash')
        """, (req.debt_id, remaining, req.date))
        
        # Update Debt Status
        cursor.execute("UPDATE debts SET amount_repaid = amount, status = 'Paid' WHERE id = %s", (req.debt_id,))
        
        # Update Borrower Balance
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
        # 1. Get Debt Info to update borrower totals correctly
        cursor.execute("SELECT * FROM debts WHERE id = %s", (id,))
        debt = cursor.fetchone()
        if not debt:
            raise HTTPException(status_code=404, detail="Debt not found")
            
        borrower_id = debt['borrower_id']
        amount_lent = float(debt['amount'])
        amount_repaid = float(debt['amount_repaid'])
        balance_to_reduce = amount_lent - amount_repaid
        
        # 2. Delete Debt (Cascades to repayments automatically via SQL Foreign Key)
        cursor.execute("DELETE FROM debts WHERE id = %s", (id,))
        
        # 3. Update Borrower Stats
        cursor.execute("""
            UPDATE borrowers 
            SET total_lent = total_lent - %s,
                total_repaid = total_repaid - %s,
                current_balance = current_balance - %s
            WHERE id = %s
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
        # Deleting borrower will cascade delete all debts and repayments
        cursor.execute("DELETE FROM borrowers WHERE id = %s", (id,))
        conn.commit()
        return {"message": "Borrower deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
