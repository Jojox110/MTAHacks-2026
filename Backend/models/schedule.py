from pydantic import BaseModel
from typing import Dict, List

class SaveScheduleRequest(BaseModel):
    schedule: Dict[str, List[str]]  # { "Fall 2026": ["CS101", ...] }

class ScheduleResponse(BaseModel):
    schedule: Dict[str, List[str]]
