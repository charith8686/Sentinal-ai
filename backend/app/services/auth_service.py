import hashlib
import hmac
import os
import secrets
import datetime
import uuid
from typing import Optional, Dict, Any
from app.database.db import get_connection

def hash_password(password: str) -> str:
    """Hash password using salt + PBKDF2-HMAC-SHA256 (no external C-extensions required)."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )
    return f"{salt}:{key.hex()}"

def verify_password(stored_hash: str, password_attempt: str) -> bool:
    try:
        salt, key_hex = stored_hash.split(":")
        new_key = hashlib.pbkdf2_hmac(
            "sha256",
            password_attempt.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        )
        return hmac.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False

def register_company(name: str, email: str, password: str, industry: str = "Banking") -> Dict[str, Any]:
    name = name.strip()
    email = email.strip().lower()
    if not name or not email or not password:
        raise ValueError("Company name, email, and password are required.")
    
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")

    conn = get_connection()
    cursor = conn.cursor()

    # Check email uniqueness
    cursor.execute("SELECT company_id FROM companies WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise ValueError("A company account with this work email already exists.")

    company_id = f"CMP-{uuid.uuid4().hex[:8].upper()}"
    pwd_hash = hash_password(password)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO companies (company_id, name, email, password_hash, industry, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (company_id, name, email, pwd_hash, industry, now_iso))

    conn.commit()
    conn.close()

    # Automatically create session upon registration
    session = create_company_session(company_id)
    return {
        "company_id": company_id,
        "name": name,
        "email": email,
        "industry": industry,
        "token": session["token"],
        "expires_at": session["expires_at"]
    }

def login_company(email: str, password: str) -> Dict[str, Any]:
    email = email.strip().lower()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM companies WHERE email = ?", (email,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError("Invalid email or password.")

    if not verify_password(row["password_hash"], password):
        conn.close()
        raise ValueError("Invalid email or password.")

    company_id = row["company_id"]
    name = row["name"]
    industry = row["industry"]
    conn.close()

    session = create_company_session(company_id)
    return {
        "company_id": company_id,
        "name": name,
        "email": email,
        "industry": industry,
        "token": session["token"],
        "expires_at": session["expires_at"]
    }

def create_company_session(company_id: str) -> Dict[str, Any]:
    token = secrets.token_urlsafe(32)
    now = datetime.datetime.now(datetime.timezone.utc)
    expires = now + datetime.timedelta(days=7)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO company_sessions (token, company_id, created_at, expires_at)
        VALUES (?, ?, ?, ?)
    """, (token, company_id, now.isoformat(), expires.isoformat()))
    conn.commit()
    conn.close()

    return {"token": token, "expires_at": expires.isoformat()}

def get_company_by_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.company_id, c.name, c.email, c.industry, s.expires_at
        FROM company_sessions s
        JOIN companies c ON s.company_id = c.company_id
        WHERE s.token = ? AND s.expires_at > ?
    """, (token, now_iso))
    
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None

    return {
        "company_id": row["company_id"],
        "name": row["name"],
        "email": row["email"],
        "industry": row["industry"],
        "expires_at": row["expires_at"]
    }

def logout_company(token: str) -> bool:
    if not token:
        return False
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM company_sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()
    return True
