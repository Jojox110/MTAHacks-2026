from pydantic import BaseModel
from typing import List, Optional

class Schedule(BaseModel):
    days: List[str]
    start: str
    end: str

class CourseResponse(BaseModel):
    id: str
    name: str
    dept: str
    credits: int
    prereqs: List[str]
    schedule: Schedule
    color: Optional[str] = None
