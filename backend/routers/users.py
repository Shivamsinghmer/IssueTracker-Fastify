from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.comment import Comment
from models.org import Org
from models.task import Task
from models.user import User
from schema.auth import UserResponse, UserUpdate
from utils.auth import get_password_hash
from utils.deps import get_current_user

router = APIRouter()


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own profile")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.username is not None and payload.username != user.username:
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = payload.username
    if payload.email is not None and payload.email != user.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Email already taken")
        user.email = payload.email
    if payload.password is not None:
        user.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own account")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if db.query(Org).filter(Org.owner_id == user.id).first():
        raise HTTPException(
            status_code=400,
            detail="Delete the orgs you own before deleting your account",
        )
    # Leave every org, unassign tasks, drop own comments, then delete the user
    # so no foreign keys point at it anymore.
    user.orgs.clear()
    db.query(Task).filter(Task.assignee_id == user.id).update({Task.assignee_id: None})
    db.query(Comment).filter(Comment.user_id == user.id).delete()
    db.delete(user)
    db.commit()
