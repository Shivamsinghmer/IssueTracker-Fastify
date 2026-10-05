from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables
from routers import auth, comments, orgs, tasks, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Issue Tracker API",
    description="Backend API for the Developer Project & Issue Tracker",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(orgs.router, prefix="/orgs", tags=["orgs"])
app.include_router(tasks.router, tags=["tasks"])
app.include_router(comments.router, tags=["comments"])


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "message": "Issue Tracker API is running"}
