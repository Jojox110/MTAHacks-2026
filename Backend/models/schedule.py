from pydantic import BaseModel
from typing import Dict, List, Optional

class SaveScheduleRequest(BaseModel):
    schedule: Dict[str, List[str]]  # { "Fall 2026": ["CS101", ...] }

class ScheduleResponse(BaseModel):
    schedule: Dict[str, List[str]]

class OptimizeScheduleRequest(BaseModel):
    program: str
    userPrompt: str
    minor: Optional[str] = None
    userChoices: Optional[Dict[str, List[str]]] = None  # { "Automne 2026": ["CODE1", ...] }

class PendingChoice(BaseModel):
    code: str
    name: str

class OptimizeScheduleResponse(BaseModel):
    schedule: Dict[str, List[str]]
    sections: Dict[str, dict]
    pendingChoices: Optional[Dict[str, List[PendingChoice]]] = None  # semesters needing user input
