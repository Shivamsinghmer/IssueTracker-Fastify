from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models.org import Org
from models.task import Task
from models.user import User
from utils.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_exception
    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user


def get_user_org(org_id: int, current_user: User, db: Session) -> Org:
    """Return the org if the current user owns it or is a member of it."""
    org = db.get(Org, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Org not found")
    is_member = org.owner_id == current_user.id or any(
        member.id == current_user.id for member in org.members
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this org")
    return org


def require_org_owner(org: Org, current_user: User) -> Org:
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the org owner can perform this action")
    return org


def get_org_task(task_id: int, current_user: User, db: Session) -> Task:
    """Return the task if the current user belongs to the task's org."""
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    get_user_org(task.org_id, current_user, db)
    return task
