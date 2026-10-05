from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models.comment import Comment
from models.task import Task
from models.user import User
from schema.comment import CommentCreate, CommentResponse, CommentUpdate
from utils.deps import get_current_user, get_org_task

router = APIRouter()


def _get_task_comment(comment_id: int, current_user: User, db: Session) -> Comment:
    comment = db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    get_org_task(comment.task_id, current_user, db)
    return comment


@router.post(
    "/tasks/{task_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    task_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_org_task(task_id, current_user, db)
    comment = Comment(content=payload.content, user_id=current_user.id, task_id=task.id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/tasks/{task_id}/comments", response_model=list[CommentResponse])
def list_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_org_task(task_id, current_user, db)
    return (
        db.query(Comment)
        .filter(Comment.task_id == task.id)
        .options(selectinload(Comment.author))
        .order_by(Comment.created_at)
        .all()
    )


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    payload: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = _get_task_comment(comment_id, current_user, db)
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    comment.content = payload.content
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = _get_task_comment(comment_id, current_user, db)
    task = db.get(Task, comment.task_id)
    if comment.user_id != current_user.id and task.org.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the author or the org owner can delete this comment",
        )
    db.delete(comment)
    db.commit()
