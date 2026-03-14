from pydantic import BaseModel
from typing import List, Optional

class CourseResponse(BaseModel):
    id: str
    name: str
    dept: str
    credits: int
    prereqs: List[str]
    description: str = ""
    ofg: Optional[str] = None
    color: Optional[str] = None
