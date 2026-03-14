from pydantic import BaseModel
from typing import List

class SaveScheduleRequest(BaseModel):
    courseIds: List[str]

class ScheduleResponse(BaseModel):
    courseIds: List[str]
