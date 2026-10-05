from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from schema.auth import UserResponse


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    user_id: int
    author: UserResponse | None = None
    task_id: int
    created_at: datetime
    updated_at: datetime
