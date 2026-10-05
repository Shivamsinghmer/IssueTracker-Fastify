from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship

from database import Base
from models.membership import memberships


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Orgs this user owns vs. orgs this user is a member of.
    owned_orgs = relationship("Org", back_populates="owner")
    orgs = relationship("Org", secondary=memberships, back_populates="members")

    # Tasks assigned to this user and comments written by this user.
    tasks = relationship("Task", back_populates="assignee")
    comments = relationship("Comment", back_populates="author")
