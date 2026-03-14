import os

DB_PATH = os.environ.get("DB_PATH", "courseforge.db")

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]
