from pydantic import BaseModel
from typing import List, Optional

class RecommendRequest(BaseModel):
    prompt: str
    currentCourses: List[str] = []
    major: Optional[str] = None
    minor: Optional[str] = None

class RecommendResponse(BaseModel):
    careerPath: str
    description: str
    required: List[str]
    recommended: List[str]
