from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from schemas import UserRegister, UserLogin, GoogleAuth, ResetPassword, UserUpdateProfile, UserChangePassword
from security import pwd_context, create_access_token, get_current_user
from utils import create_default_categories
import logging

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

@router.post("/register")
def register(user: UserRegister):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        field = "email" if user.contact_type == 'email' else "mobile"
        
        cursor.execute(f"SELECT id FROM users WHERE {field} = %s", (user.contact,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User already exists")

        # 1. Generate OTP
        # otp = send_otp_mock(user.contact)
        # expiry = datetime.utcnow() + timedelta(minutes=10)
        
        # cursor.execute("INSERT INTO otps (identifier, otp_code, expires_at) VALUES (%s, %s, %s)", (user.contact, otp, expiry))
        
        # 2. Hash Password
        hashed_pw = pwd_context.hash(user.password)
        
        # 4. Create User (Directly Verified)
        # We set is_verified = TRUE immediately
        query = f"INSERT INTO users (name, {field}, password_hash, is_verified) VALUES (%s, %s, %s, TRUE)"
        cursor.execute(query, (user.name, user.contact, hashed_pw))
        
        create_default_categories(user.contact, cursor)
        
        conn.commit()
        return {"message": "User registered successfully."}
    except Exception as e:
        conn.rollback()
        logger.error(f"Register Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# @app.post("/auth/verify")
# def verify_otp(data: VerifyOTP):
#     conn = get_db()
#     cursor = conn.cursor(dictionary=True)
#     try:
#         # Check OTP
#         cursor.execute("SELECT * FROM otps WHERE identifier = %s AND otp_code = %s AND expires_at > NOW()", (data.contact, data.otp))
#         if not cursor.fetchone():
#             raise HTTPException(status_code=400, detail="Invalid or Expired OTP")
            
#         # Mark User Verified
#         is_email = "@" in data.contact
#         field = "email" if is_email else "mobile"
        
#         cursor.execute(f"UPDATE users SET is_verified = TRUE WHERE {field} = %s", (data.contact,))
        
#         # Get User Data for Token
#         cursor.execute(f"SELECT * FROM users WHERE {field} = %s", (data.contact,))
#         user_db = cursor.fetchone()
        
#         # Generate Token
#         token = create_access_token({"sub": user_db['email'] or user_db['mobile'], "name": user_db['name']})
        
#         # Cleanup OTP
#         cursor.execute("DELETE FROM otps WHERE identifier = %s", (data.contact,))
#         conn.commit()
        
#         return {"token": token, "user": {"name": user_db['name'], "email": user_db['email'] or user_db['mobile'], "picture": ""}}
        
#     finally:
#         conn.close()

@router.post("/login")
def login(data: UserLogin):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        is_email = "@" in data.contact
        field = "email" if is_email else "mobile"
        
        cursor.execute(f"SELECT * FROM users WHERE {field} = %s", (data.contact,))
        user = cursor.fetchone()
        
        if not user or not pwd_context.verify(data.password, user['password_hash']):
            raise HTTPException(status_code=400, detail="Invalid credentials")
            
        if not user['is_verified']:
            raise HTTPException(status_code=400, detail="Account not verified. Please register again.")

        token = create_access_token({"sub": user['email'] or user['mobile'], "name": user['name']})
        
        return {
            "token": token, 
            "user": {
                "name": user['name'], 
                "email": user['email'] or user['mobile'], 
                "picture": user['profile_pic'] or ""
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
        user = cursor.fetchone()
        
        if not user:
            # Create User
            cursor.execute(
                "INSERT INTO users (name, email, profile_pic, is_verified) VALUES (%s, %s, %s, TRUE)", 
                (data.name, data.email, data.picture)
            )
            
            # ADD DEFAULTS
            create_default_categories(data.email, cursor)
            
            conn.commit()
            
            # Fetch the new user to get details
            cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
            user = cursor.fetchone()
            
        # Generate Token
        token = create_access_token({"sub": user['email'], "name": user['name']})
        
        return {
            "token": token, 
            "user": {
                "name": user['name'], 
                "email": user['email'], 
                "picture": user['profile_pic']
            }
        }
    except Exception as e:
        logger.error(f"Google Login Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/reset-password")
def reset_password(data: ResetPassword):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        is_email = "@" in data.contact
        field = "email" if is_email else "mobile"
        
        cursor.execute(
            f"SELECT id FROM users WHERE {field} = %s AND LOWER(name) = LOWER(%s)", 
            (data.contact, data.name)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=400, detail="Details do not match any account.")
            
        # 3. Update Password
        new_hash = pwd_context.hash(data.new_password)
        cursor.execute(f"UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user['id']))
        conn.commit()
        
        return {"message": "Password reset successfully. You can now login."}

    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Reset Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        conn.close()

# --- 1. Update Profile (Name & Icon) ---
@router.put("/profile")
def update_profile(data: UserUpdateProfile, email: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET name = %s, profile_pic = %s WHERE email = %s", (data.name, data.profile_pic, email))
        conn.commit()
        return {"message": "Profile updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# --- 2. Change Password ---
@router.put("/password")
def change_password(data: UserChangePassword, email: str = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Get current password hash
        cursor.execute("SELECT password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # 2. Verify Old Password
        if not pwd_context.verify(data.old_password, user['password_hash']):
            raise HTTPException(status_code=400, detail="Incorrect old password")
            
        # 3. Hash New Password & Update
        new_hash = pwd_context.hash(data.new_password)
        cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_hash, email))
        
        conn.commit()
        return {"message": "Password changed successfully"}
    except Exception as e:
        conn.rollback()
        # Re-raise HTTP exceptions (like 400 Incorrect Password)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()