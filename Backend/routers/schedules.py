from fastapi import APIRouter, Depends
import sqlite3
from database import get_db
from models.schedule import SaveScheduleRequest, ScheduleResponse
from services.schedule_service import save_schedule, load_schedule
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api", tags=["schedules"])

@router.get("/schedule", response_model=ScheduleResponse)
def get_schedule(
    user: dict = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    ids = load_schedule(conn, user["id"])
    return {"courseIds": ids}

@router.post("/schedule")
def post_schedule(
    req: SaveScheduleRequest,
    user: dict = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    save_schedule(conn, user["id"], req.courseIds)
    return {"success": True}
