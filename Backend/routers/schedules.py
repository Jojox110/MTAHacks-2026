import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import get_db
from models.schedule import (
    SaveScheduleRequest,
    ScheduleResponse,
    OptimizeScheduleRequest,
    OptimizeScheduleResponse,
)
from services.schedule_service import save_schedule, load_schedule
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api", tags=["schedules"])
_executor = ThreadPoolExecutor(max_workers=2)


@router.get("/schedule", response_model=ScheduleResponse)
def get_schedule(
    user: dict = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    schedule = load_schedule(conn, user["id"])
    return {"schedule": schedule}


@router.post("/schedule")
def post_schedule(
    req: SaveScheduleRequest,
    user: dict = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    save_schedule(conn, user["id"], req.schedule)
    return {"success": True}


def _run_optimize(req: OptimizeScheduleRequest) -> dict:
    from alg import ScheduleOptimizer

    optimizer = ScheduleOptimizer.load()
    fill_fn = None
    try:
        from llm_elective import get_elective_recommendations
        fill_fn = lambda avail, prompt, n, sem: get_elective_recommendations(
            avail, prompt, n, sem
        )
    except ImportError:
        pass  # LLM deps not installed; optimize without elective filling
    result = optimizer.optimize(
        program_name=req.program,
        user_prompt=req.userPrompt,
        minor_name=req.minor,
        fill_electives_fn=fill_fn,
        user_choices=req.userChoices,
    )
    return result


@router.post("/schedule/optimize", response_model=OptimizeScheduleResponse)
async def optimize_schedule(
    req: OptimizeScheduleRequest,
    user: dict = Depends(get_current_user),
):
    """Optimize 4-year schedule for a program. Uses LLM to fill elective slots."""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_executor, _run_optimize, req)
        return OptimizeScheduleResponse(
            schedule=result["schedule"],
            sections=result["sections"],
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
