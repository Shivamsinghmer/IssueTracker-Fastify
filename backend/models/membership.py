from sqlalchemy import Column, DateTime, ForeignKey, Integer, Table, func

from database import Base

# Association table linking users to the orgs they belong to.
memberships = Table(
    "memberships",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("org_id", Integer, ForeignKey("orgs.id"), primary_key=True),
    Column("joined_at", DateTime, server_default=func.now(), nullable=False),
)
