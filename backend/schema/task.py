from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from schema.auth import UserResponse


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    due_date: datetime | None = None
    assignee_id: int | None = None
    image_urls: list[str] | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None
    assignee_id: int | None = None
    image_urls: list[str] | None = None


def _join_image_urls(urls: list[str] | None) -> str | None:
    if urls is None:
        return None
    cleaned = [url.strip() for url in urls if url.strip()]
    return ",".join(cleaned) if cleaned else None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    due_date: datetime | None
    image_urls: list[str] = []
    assignee_id: int | None
    assignee: UserResponse | None = None
    org_id: int
    created_at: datetime
    updated_at: datetime

    @field_validator("image_urls", mode="before")
    @classmethod
    def split_image_urls(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [url for url in value.split(",") if url]
        return value or []
