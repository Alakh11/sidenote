from pydantic import BaseModel
from typing import Optional

# Auth Models
class UserRegister(BaseModel):
    name: str
    contact: str # Email or Mobile
    password: str
    contact_type: str # 'email' or 'mobile'

class UserLogin(BaseModel):
    contact: str
    password: str

# class VerifyOTP(BaseModel):
#     contact: str
#     otp: str
    
class GoogleAuth(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None

class ResetPassword(BaseModel):
    contact: str
    name: str
    new_password: str

class UserUpdateProfile(BaseModel):
    name: str
    profile_pic: str

class UserChangePassword(BaseModel):
    old_password: str
    new_password: str

# Admin Models
class AdminUpdateUser(BaseModel):
    name: str
    contact: str # Email or Mobile
    new_password: Optional[str] = None
    
# Transaction Models
class TransactionCreate(BaseModel):
    user_email: str
    amount: float
    type: str
    category: str
    date: str
    payment_mode: str
    note: Optional[str] = None
    is_recurring: bool = False

class CategoryCreate(BaseModel):
    user_email: str
    name: str
    color: str
    type: str # 'income' or 'expense'
    icon: str

class CategoryUpdate(BaseModel):
    name: str
    color: str
    icon: str
    type: str

class BudgetSchema(BaseModel):
    user_email: str
    category_id: int
    amount: float

# Feature Models (Goals, Loans, Debts)
class GoalCreate(BaseModel):
    user_email: str
    name: str
    target_amount: float
    deadline: Optional[str] = None

class GoalUpdate(BaseModel):
    goal_id: int
    amount_added: float

class LoanCreate(BaseModel):
    user_email: str
    name: str
    total_amount: float
    interest_rate: float
    tenure_months: int
    start_date: str

class LoanUpdate(BaseModel):
    name: str
    total_amount: float
    interest_rate: float
    tenure_months: int
    start_date: str

class BorrowerCreate(BaseModel):
    user_email: str
    name: str
    phone: Optional[str] = None

class DebtCreate(BaseModel):
    borrower_id: Optional[int] = None 
    new_borrower_name: Optional[str] = None
    user_email: str
    amount: float
    date: str
    due_date: Optional[str] = None
    reason: str
    interest_rate: Optional[float] = 0.0
    interest_period: Optional[str] = 'Monthly'

class RepaymentCreate(BaseModel):
    debt_id: int
    amount: float
    date: str
    mode: str
    
class MarkPaidRequest(BaseModel):
    debt_id: int
    date: str