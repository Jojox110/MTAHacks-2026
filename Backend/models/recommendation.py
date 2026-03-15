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

# ── Multi-turn chat advisor ──────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    studentProfile: str          # Full profile text (from first message, kept constant)
    message: str                 # Current user message
    history: List[ChatMessage] = []
    currentCourses: List[str] = []
    numToSelect: int = 2

class ChatRecommendation(BaseModel):
    class_name: str
    class_id: Optional[str] = None
    reasoning: str

class ChatResponse(BaseModel):
    message: str
    finalized: bool
    recommendations: List[ChatRecommendation]
    history: List[ChatMessage]
