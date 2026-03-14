from fastapi import APIRouter, Depends
import sqlite3
from database import get_db
from models.recommendation import RecommendRequest, RecommendResponse
from services.recommendation_service import recommend
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api", tags=["recommendations"])

@router.post("/ai/recommend", response_model=RecommendResponse)
def ai_recommend(
    req: RecommendRequest,
    user: dict = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    result = recommend(conn, req.prompt, req.currentCourses, req.major or user.get("major"), req.minor or user.get("minor"))
    return result
