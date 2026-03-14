from fastapi import APIRouter, Depends
import sqlite3
from database import get_db
from services.course_service import get_all_courses, get_departments

router = APIRouter(prefix="/api", tags=["courses"])

@router.get("/courses")
def courses(conn: sqlite3.Connection = Depends(get_db)):
    return get_all_courses(conn)

@router.get("/departments")
def departments(conn: sqlite3.Connection = Depends(get_db)):
    return get_departments(conn)
