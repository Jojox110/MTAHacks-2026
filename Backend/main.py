from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import CORS_ORIGINS
from database import init_db
from seed import seed
from routers import auth, courses, career_paths, schedules, recommendations

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed()
    yield

app = FastAPI(title="CourseForge API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(career_paths.router)
app.include_router(schedules.router)
app.include_router(recommendations.router)
