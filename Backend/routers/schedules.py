import threading
import uuid
from typing import Dict

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

# ── In-memory job store ───────────────────────────────────────────────────────
# { job_id: { "status": "pending"|"done"|"error", "result": dict|None, "error": str|None } }
_jobs: Dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _run_optimize_job(job_id: str, req: OptimizeScheduleRequest):
    """Runs in a background thread. Updates _jobs when done."""
    try:
        from alg import ScheduleOptimizer
        from llm_elective import get_elective_recommendations

        optimizer = ScheduleOptimizer.load()
        result = optimizer.optimize(
            program_name=req.program,
            user_prompt=req.userPrompt,
            minor_name=req.minor,
            fill_electives_fn=get_elective_recommendations,
            user_choices=req.userChoices,
            already_completed=req.completedCourses or [],
        )
        with _jobs_lock:
            _jobs[job_id] = {"status": "done", "result": result, "error": None}
    except Exception as e:
        with _jobs_lock:
            _jobs[job_id] = {"status": "error", "result": None, "error": str(e)}


# ── Routes ────────────────────────────────────────────────────────────────────

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


@router.post("/schedule/optimize")
def optimize_schedule(
    req: OptimizeScheduleRequest,
    user: dict = Depends(get_current_user),
):
    """Start a background optimization job. Returns { job_id } immediately."""
    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _jobs[job_id] = {"status": "pending", "result": None, "error": None}

    t = threading.Thread(target=_run_optimize_job, args=(job_id, req), daemon=True)
    t.start()
    return {"job_id": job_id}


@router.get("/schedule/optimize/{job_id}")
def get_optimize_job(job_id: str, user: dict = Depends(get_current_user)):
    """Poll for optimization result. Returns status + result when done."""
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] == "error":
        raise HTTPException(status_code=500, detail=job["error"])
    if job["status"] == "pending":
        return {"status": "pending"}
    result = job["result"]
    return {
        "status": "done",
        "schedule": result["schedule"],
        "sections": result["sections"],
        "pendingChoices": result.get("pending_choices") or None,
    }
