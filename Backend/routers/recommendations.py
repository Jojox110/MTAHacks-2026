from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import get_db
from models.recommendation import RecommendRequest, RecommendResponse, ChatRequest, ChatResponse
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


@router.post("/ai/chat", response_model=ChatResponse)
def ai_chat(
    req: ChatRequest,
    user: dict = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    try:
        from services.ai_chat_service import chat_with_advisor
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"AI chat service unavailable: {e}")

    try:
        result = chat_with_advisor(
            conn,
            student_profile=req.studentProfile,
            history=[{"role": m.role, "content": m.content} for m in req.history],
            current_message=req.message,
            current_courses=req.currentCourses,
            num_to_select=req.numToSelect,
            major=user.get("major"),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "message": result["message"],
        "finalized": result["finalized"],
        "recommendations": result["recommendations"],
        "history": [{"role": m["role"], "content": m["content"]} for m in result["history"]],
    }
