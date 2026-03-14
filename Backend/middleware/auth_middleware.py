from fastapi import Depends, HTTPException, Header
from typing import Optional
import sqlite3
from database import get_db
from services.auth_service import get_user_by_token

def get_current_user(
    authorization: Optional[str] = Header(None),
    conn: sqlite3.Connection = Depends(get_db),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1]
    user = get_user_by_token(conn, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user
