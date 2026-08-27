import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db
from app.models import User

security = HTTPBearer()

# ── Password hashing using stdlib hashlib (no compiled deps needed) ──

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 (Python stdlib, no external deps)."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations=260000,
    )
    return f"pbkdf2$sha256$260000${salt}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    if not hashed_password:
        return False
    try:
        if hashed_password.startswith("pbkdf2$"):
            # New format: pbkdf2$sha256$iterations$salt$hash
            parts = hashed_password.split("$")
            if len(parts) != 5:
                return False
            _, algo, iterations, salt, stored_hash = parts
            dk = hashlib.pbkdf2_hmac(
                algo,
                plain_password.encode('utf-8'),
                salt.encode('utf-8'),
                iterations=int(iterations),
            )
            return hmac.compare_digest(dk.hex(), stored_hash)
        elif hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            # Legacy bcrypt hash — try bcrypt if available, else reject
            try:
                import bcrypt
                return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
            except ImportError:
                return False
        return False
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: Get the current authenticated user."""
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    token_session_version = payload.get("session_version")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if user.is_suspended:
        raise HTTPException(status_code=403, detail="User account is suspended")

    db_session_version = getattr(user, "session_version", 1)
    if token_session_version is not None and token_session_version != db_session_version:
        raise HTTPException(status_code=401, detail="Session invalidated. Logged out from everywhere.")
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: Ensure the current user is an admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
