from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Optional
from pydantic import BaseModel
from database import get_db
from schemas import *
from security import pwd_context, create_access_token, get_current_user
from utils import create_default_categories
import logging
import random
import os
from posthog import Posthog
from datetime import datetime, timedelta
from whatsapp_service import send_whatsapp_text

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)
posthog_client = Posthog(
    os.getenv("POSTHOG_API_KEY"), # type: ignore
    host='https://app.posthog.com'
)

class RegisterPayload(BaseModel):
    name: str
    contact: str
    password: str
    contact_type: str
    extra_mobile: Optional[str] = None

class VerifyOTP(BaseModel):
    contact: str
    otp: str

async def generate_and_send_otp(cursor, phone: str, name: str):
    """Generates a 4-digit OTP, saves it, and sends via WhatsApp."""
    if not phone:
        return # Safety check to satisfy Pylance
        
    otp_code = str(random.randint(1000, 9999))
    expiry = datetime.utcnow() + timedelta(minutes=10)
    
    cursor.execute("INSERT INTO otps (identifier, otp_code, expires_at) VALUES (%s, %s, %s)", (phone, otp_code, expiry))
    
    msg = f"🔐 *SideNote Verification*\n\nHi {name}, your OTP is: *{otp_code}*\n\nValid for 10 minutes."
    await send_whatsapp_text(phone, msg)

@router.post("/register")
async def register(payload: RegisterPayload):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        field = "email" if payload.contact_type == 'email' else "mobile"
        target_mobile = payload.contact if payload.contact_type == 'mobile' else payload.extra_mobile
        
        cursor.execute(f"SELECT id, email, is_verified FROM users WHERE {field} = %s", (payload.contact,))
        raw_user = cursor.fetchone()
        
        existing_user: dict[str, Any] = raw_user or {} # type: ignore

        hashed_pw = pwd_context.hash(payload.password)

        if existing_user:
            if existing_user.get('email') and existing_user.get('is_verified'):
                raise HTTPException(status_code=400, detail="User already exists. Please log in.")
            
            if field == "mobile":
                cursor.execute("""
                    UPDATE users 
                    SET name = %s, email = %s, password_hash = %s, is_verified = FALSE 
                    WHERE mobile = %s
                """, (payload.name, None, hashed_pw, payload.contact))
            else:
                 raise HTTPException(status_code=400, detail="User already exists.")
        else:
            email_val = payload.contact if payload.contact_type == 'email' else None
            mobile_val = payload.contact if payload.contact_type == 'mobile' else payload.extra_mobile
            
            query = """
                INSERT INTO users (name, email, mobile, password_hash, is_verified) 
                VALUES (%s, %s, %s, %s, FALSE)
            """
            cursor.execute(query, (payload.name, email_val, mobile_val, hashed_pw))
            
            user_id = cursor.lastrowid
            if user_id:
                create_default_categories(int(user_id), cursor)

        # Generate and Send OTP
        if target_mobile:
            await generate_and_send_otp(cursor, target_mobile, payload.name)
        
        conn.commit()

        try:
            posthog_client.capture(
                distinct_id=payload.contact, 
                event='user_signed_up',
                properties={
                    'contact_type': payload.contact_type,
                    'name': payload.name
                }
            )
        except Exception as e:
            logger.error(f"PostHog Error: {e}")
            
        return {"message": "OTP sent to your WhatsApp!"}
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Register Error: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/verify")
def verify_otp(data: VerifyOTP):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE mobile = %s", (data.contact,))
        raw_user = cursor.fetchone()
        
        if not raw_user:
             raise HTTPException(status_code=404, detail="User not found after verification")
             
        user_db: dict[str, Any] = raw_user # type: ignore
        
        token = create_access_token({"sub": str(user_db['id']), "name": user_db.get('name')})
        
        cursor.execute("UPDATE users SET is_verified = TRUE WHERE mobile = %s", (data.contact,))
        
        # Cleanup OTP
        cursor.execute("DELETE FROM otps WHERE identifier = %s", (data.contact,))
        
        conn.commit()
        
        return {
            "token": token, 
            "user": {
                "id": user_db['id'],
                "name": user_db.get('name'), 
                "email": user_db.get('email'),
                "mobile": user_db.get('mobile'),
                "picture": user_db.get('profile_pic') or "",
                "role": user_db.get('role', 'user')
            }
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/login")
def login(data: UserLogin):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        is_email = "@" in data.contact
        field = "email" if is_email else "mobile"
        
        cursor.execute(f"SELECT * FROM users WHERE {field} = %s", (data.contact,))
        user: Any = cursor.fetchone()
        
        if not user or not pwd_context.verify(data.password, user['password_hash']):
            raise HTTPException(status_code=400, detail="Invalid credentials")
            
        if not user['is_verified']:
            raise HTTPException(status_code=400, detail="Account not verified. Please register again.")

        token = create_access_token({"sub": str(user['id']), "name": user['name']})
        
        return {
            "token": token, 
            "user": {
                "id": user['id'],
                "name": user['name'], 
                "email": user['email'],
                "mobile": user['mobile'],
                "picture": user['profile_pic'] or "",
                "role": user.get('role', 'user')
            }
        }
    finally:
        conn.close()

@router.post("/google")
def google_login(data: GoogleAuth):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if user exists by email
        cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
        user: Any = cursor.fetchone()
        
        if not user:
            # Create User
            cursor.execute(
                "INSERT INTO users (name, email, profile_pic, is_verified) VALUES (%s, %s, %s, TRUE)", 
                (data.name, data.email, data.picture)
            )
            
            user_id = cursor.lastrowid
            if user_id:
                create_default_categories(int(user_id), cursor)
            
            conn.commit()
            
            # Fetch the new user to get details
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            
        token = create_access_token({"sub": str(user['id']), "name": user['name']})
        
        return {
            "token": token, 
            "user": {
                "id": user['id'],
                "name": user['name'], 
                "email": user['email'],
                "mobile": user.get('mobile'),
                "picture": user['profile_pic'],
                "role": user.get('role', 'user')
            }
        }
    except Exception as e:
        logger.error(f"Google Login Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/reset-password")
async def reset_password(data: ResetPassword):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        is_email = "@" in data.contact
        field = "email" if is_email else "mobile"
        
        cursor.execute(
            f"SELECT id, name, mobile FROM users WHERE {field} = %s AND LOWER(name) = LOWER(%s)", 
            (data.contact, data.name)
        )
        raw_user = cursor.fetchone()
        
        if not raw_user:
            raise HTTPException(status_code=400, detail="Details do not match any account.")
            
        user: dict[str, Any] = raw_user # type: ignore
        target_mobile = user.get('mobile')
        
        if not target_mobile:
             raise HTTPException(status_code=400, detail="No WhatsApp number linked to this account.")
            
        # Update Password
        new_hash = pwd_context.hash(data.new_password)
        cursor.execute(f"UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user['id']))
        
        await generate_and_send_otp(cursor, target_mobile, user['name'])
        
        conn.commit()
        return {"message": "Verification code sent to WhatsApp."}

    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Reset Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        conn.close()

# --- 1. Update Profile (Name, Icon, Email, Mobile) ---
@router.put("/profile")
def update_profile(data: UserUpdateProfile, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user: Any = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # RULE: Mobile number cannot be changed once linked
        if user['mobile'] and data.mobile and user['mobile'] != data.mobile:
            raise HTTPException(status_code=400, detail="Mobile number cannot be changed once linked.")

        # Check Uniqueness if changing Email
        if data.email and data.email != user['email']:
            cursor.execute("SELECT id FROM users WHERE email = %s", (data.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email is already in use by another account.")

        # Check Uniqueness if linking Mobile for the first time
        if data.mobile and not user['mobile']:
            cursor.execute("SELECT id FROM users WHERE mobile = %s", (data.mobile,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Mobile number is already linked to another account.")

        new_mobile = user['mobile'] if user['mobile'] else data.mobile

        # Execute Update
        cursor.execute("""
            UPDATE users 
            SET name = %s, profile_pic = %s, email = %s, mobile = %s 
            WHERE id = %s
        """, (data.name, data.profile_pic, data.email, new_mobile, user_id))
        
        conn.commit()
        return {"message": "Profile updated successfully"}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# --- 2. Change Password ---
@router.put("/password")
def change_password(data: UserChangePassword, user_id: int = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, password_hash FROM users WHERE id = %s", (user_id,))
        user: Any = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # 2. Verify Old Password
        if not pwd_context.verify(data.old_password, user['password_hash']):
            raise HTTPException(status_code=400, detail="Incorrect old password")
            
        # 3. Hash New Password & Update
        new_hash = pwd_context.hash(data.new_password)
        cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
        
        conn.commit()
        return {"message": "Password changed successfully"}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
@router.put("/complete-profile")
def complete_profile(request: ProfileCompletionRequest):
    """Upgrades a WhatsApp-only user to a full Web Dashboard user."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, email FROM users WHERE mobile = %s", (request.mobile,))
        raw_user = cursor.fetchone()

        if not raw_user:
            raise HTTPException(status_code=404, detail="Mobile number not found. Please start on WhatsApp first!")

        user: dict[str, Any] = raw_user # type: ignore

        if user.get('email'):
            return {"message": "Account already exists. Please log in.", "redirect": "login"}

        hashed_pw = pwd_context.hash(request.password)

        cursor.execute("""
            UPDATE users 
            SET name = %s, email = %s, password_hash = %s, is_verified = TRUE 
            WHERE mobile = %s
        """, (request.name, request.email, hashed_pw, request.mobile))
        
        if user.get('id'):
            create_default_categories(int(user['id']), cursor)
        
        conn.commit()
        return {"status": "success", "message": "Profile completed! You can now log in."}

    except Exception as e:
        conn.rollback()
        logger.error(f"Complete Profile Error: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        conn.close()
        
@router.put("/preferences")
def update_preferences(data: UserPreferencesUpdate, user_id: int = Depends(get_current_user)):
    if data.month_start_date < 1 or data.month_start_date > 31:
        raise HTTPException(status_code=400, detail="Start date must be between 1 and 31")

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE users 
            SET currency = %s, month_start_date = %s 
            WHERE id = %s
        """, (data.currency, data.month_start_date, user_id))
        conn.commit()
        return {"message": "Preferences updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()