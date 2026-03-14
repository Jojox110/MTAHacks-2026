from pydantic import BaseModel
from typing import Optional

class RegisterRequest(BaseModel):
    name: str
    email: str
    major: Optional[str] = None
    minor: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    major: Optional[str] = None
    minor: Optional[str] = None

class LoginRequest(BaseModel):
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    major: Optional[str] = None
    minor: Optional[str] = None
    token: str
