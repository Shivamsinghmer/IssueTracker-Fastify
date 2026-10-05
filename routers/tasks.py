from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models.org import Org
from models.task import Task
from models.user import User
from schema.task import TaskCreate, TaskResponse, TaskStatus, TaskUpdate, _join_image_urls
from utils.deps import get_current_user, get_org_task, get_user_org

router = APIRouter()


def _check_assignee(org_id: int, assignee_id: int, db: Session) -> User:
    assignee = db.get(User, assignee_id)
    if assignee is None:
        raise HTTPException(status_code=404, detail="Assignee not found")
    # Assignee must be a member (or the owner) of the org.
    org = db.get(Org, org_id)
    is_member = org.owner_id == assignee.id or any(
        member.id == assignee.id for member in org.members
    )
    if not is_member:
        raise HTTPException(status_code=400, detail="Assignee must be a member of the org")
    return assignee


@router.post(
    "/orgs/{org_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED
)
def create_task(
    org_id: int,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_org(org_id, current_user, db)
    if payload.assignee_id is not None:
        _check_assignee(org_id, payload.assignee_id, db)
    task = Task(
        title=payload.title,
        description=payload.description,
        status=payload.status.value,
        priority=payload.priority.value,
        due_date=payload.due_date,
        assignee_id=payload.assignee_id,
        image_urls=_join_image_urls(payload.image_urls),
        org_id=org_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/orgs/{org_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    org_id: int,
    status: TaskStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_org(org_id, current_user, db)
    query = (
        db.query(Task)
        .filter(Task.org_id == org_id)
        .options(selectinload(Task.assignee))
        .order_by(Task.created_at.desc())
    )
    if status is not None:
        query = query.filter(Task.status == status.value)
    return query.all()


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_org_task(task_id, current_user, db)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_org_task(task_id, current_user, db)
    data = payload.model_dump(exclude_unset=True)

    if "status" in data and data["status"] is not None:
        task.status = data["status"].value
    if "priority" in data and data["priority"] is not None:
        task.priority = data["priority"].value
    if "title" in data and data["title"] is not None:
        task.title = data["title"]
    if "description" in data:
        task.description = data["description"]
    if "due_date" in data:
        task.due_date = data["due_date"]
    if "image_urls" in data:
        task.image_urls = _join_image_urls(data["image_urls"])
    if "assignee_id" in data:
        if data["assignee_id"] is not None:
            _check_assignee(task.org_id, data["assignee_id"], db)
        task.assignee_id = data["assignee_id"]

    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_org_task(task_id, current_user, db)
    db.delete(task)
    db.commit()
