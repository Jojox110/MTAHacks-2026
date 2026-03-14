from fastapi import APIRouter, Depends
import sqlite3
from database import get_db
from services.course_service import get_career_paths

router = APIRouter(prefix="/api", tags=["career_paths"])

@router.get("/career-paths")
def career_paths(conn: sqlite3.Connection = Depends(get_db)):
    return get_career_paths(conn)
