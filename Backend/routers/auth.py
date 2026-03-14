from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import get_db
from models.user import RegisterRequest, LoginRequest, UserResponse
from services.auth_service import register_user, login_user
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(req: RegisterRequest, conn: sqlite3.Connection = Depends(get_db)):
    user = register_user(conn, req.name, req.email, req.major, req.minor)
    return user

@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest, conn: sqlite3.Connection = Depends(get_db)):
    user = login_user(conn, req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(get_current_user)):
    return user
