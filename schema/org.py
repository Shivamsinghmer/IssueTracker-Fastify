from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class OrgUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None


class JoinOrgRequest(BaseModel):
    invite_code: str


class OrgResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    owner_id: int
    invite_code: str
    created_at: datetime
    updated_at: datetime
