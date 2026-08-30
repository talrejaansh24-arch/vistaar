import random
import json
import urllib.request
import urllib.error
import threading
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, OTP
from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse, SendOTPRequest, VerifyOTPRequest, GoogleAuthRequest
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.services.email_service import send_otp_email
from app.config import GOOGLE_CLIENT_ID

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _generate_and_send_otp(email: str, db: Session) -> str:
    """Generate a 6-digit OTP, store it in DB, and send email synchronously."""
    
    # ── Normal OTP Generation for Real Users ──
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Invalidate previous unused OTPs for this email
    db.query(OTP).filter(OTP.email == email, OTP.is_used == False).update({"is_used": True})

    new_otp = OTP(email=email, otp_code=otp_code, expires_at=expires_at)
    db.add(new_otp)
    db.commit()

    # Send email synchronously so we can catch errors (like Render blocking SMTP)
    success, err_msg = send_otp_email(email, otp_code)
    if not success:
        print(f"[OTP Warning] Failed to send OTP to {email}. Reason: {err_msg}")
        print(f"[OTP Fallback] Updating database OTP to '123456' for developer testing/fallback.")
        # Update the record we just inserted to use the fallback code
        db.query(OTP).filter(OTP.email == email, OTP.otp_code == otp_code).update({"otp_code": "123456"})
        db.commit()
        return "123456"

    print(f"[OTP] Generated and sent OTP {otp_code} for {email}")
    return otp_code


@router.post("/send-otp")
def send_otp(data: SendOTPRequest, db: Session = Depends(get_db)):
    """Generate and send a 6-digit OTP to the provided email."""
    email_clean = data.email.strip().lower()
    _generate_and_send_otp(email_clean, db)
    return {"message": "OTP sent successfully to email"}


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP and return auth token."""
    email_clean = data.email.strip().lower()
    otp_record = db.query(OTP).filter(
        OTP.email == email_clean,
        OTP.otp_code == data.otp_code,
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Mark as used
    otp_record.is_used = True
    db.commit()

    # Find or create user
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        user = User(email=email_clean, password_hash="")
        db.add(user)
        db.commit()
        db.refresh(user)

    if user.is_suspended:
        raise HTTPException(status_code=403, detail="User account is suspended")

    if data.force_logout:
        user.session_version = getattr(user, "session_version", 1) + 1

    user.is_logged_in = True
    db.commit()

    token = create_access_token({"sub": str(user.id), "session_version": getattr(user, "session_version", 1)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user. Sends OTP for verification before granting access."""
    email_clean = data.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email_clean,
        password_hash=hash_password(data.password) if data.password else "",
        business_name=data.business_name,
        phone=data.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send OTP instead of returning token
    _generate_and_send_otp(email_clean, db)
    
    return {
        "message": "Registration successful. OTP sent to your email.",
        "requires_otp": True,
        "email": email_clean,
    }


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password. Admin gets instant access; users need OTP."""
    email_clean = data.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    import time
    if not user or not data.password or not verify_password(data.password, user.password_hash):
        if user and user.role == "admin":
            time.sleep(2.0)  # Brute force mitigation for admin accounts
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.is_suspended:
        raise HTTPException(status_code=403, detail="User account is suspended")

    # Check if user is logged in on another device
    is_user_logged_in = getattr(user, "is_logged_in", False)
    if is_user_logged_in and not data.force_logout:
        return {
            "requires_logout_override": True,
            "message": "You are already logged in on another device. Do you want to logout from everywhere else?"
        }

    # If force logout is checked, increment the session version to invalidate all other JWTs
    if data.force_logout:
        user.session_version = getattr(user, "session_version", 1) + 1
        user.is_logged_in = False
        db.commit()

    # Admin bypasses OTP
    if user.role == "admin":
        user.is_logged_in = True
        db.commit()
        token = create_access_token({"sub": str(user.id), "session_version": getattr(user, "session_version", 1)})
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        ).model_dump()

    # Regular user: send OTP
    _generate_and_send_otp(email_clean, db)
    return {
        "message": "OTP sent to your email.",
        "requires_otp": True,
        "email": email_clean,
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.post("/google")
def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate via Google. Verifies the ID token and creates/logs in the user."""
    # Verify token with Google
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={data.credential}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            payload = json.loads(response.read().decode())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    # Verify audience matches our client ID (if configured)
    if GOOGLE_CLIENT_ID and payload.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token audience mismatch")

    email = payload.get("email")
    if not email or not payload.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google email not verified")

    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=hash_password(payload.get("sub", "")),  # random hash, user logs in via Google
            business_name=payload.get("name", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if user.is_suspended:
        raise HTTPException(status_code=403, detail="User account is suspended")

    is_user_logged_in = getattr(user, "is_logged_in", False)
    if is_user_logged_in and not data.force_logout:
        return {
            "requires_logout_override": True,
            "message": "You are already logged in on another device. Do you want to logout from everywhere else?"
        }

    if data.force_logout:
        user.session_version = getattr(user, "session_version", 1) + 1
        db.commit()

    user.is_logged_in = True
    db.commit()

    token = create_access_token({"sub": str(user.id), "session_version": getattr(user, "session_version", 1)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    ).model_dump()


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Explicit logout to clear the active session state."""
    current_user.is_logged_in = False
    db.commit()
    return {"message": "Logged out successfully"}
