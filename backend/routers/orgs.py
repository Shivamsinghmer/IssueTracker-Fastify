import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models.org import Org
from models.user import User
from schema.org import JoinOrgRequest, OrgCreate, OrgResponse, OrgUpdate
from utils.deps import get_current_user, get_user_org, require_org_owner

router = APIRouter()


@router.post("", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
def create_org(
    payload: OrgCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(Org).filter(Org.name == payload.name).first():
        raise HTTPException(status_code=400, detail="An org with this name already exists")
    org = Org(
        name=payload.name,
        description=payload.description,
        owner_id=current_user.id,
        invite_code=secrets.token_urlsafe(16),
    )
    db.add(org)
    db.flush()
    # The owner is also a member of the org.
    org.members.append(current_user)
    db.commit()
    db.refresh(org)
    return org


@router.get("", response_model=list[OrgResponse])
def list_orgs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Org)
        .filter(
            or_(
                Org.owner_id == current_user.id,
                Org.members.any(User.id == current_user.id),
            )
        )
        .all()
    )


@router.get("/{org_id}", response_model=OrgResponse)
def read_org(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_user_org(org_id, current_user, db)


@router.patch("/{org_id}", response_model=OrgResponse)
def update_org(
    org_id: int,
    payload: OrgUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = require_org_owner(get_user_org(org_id, current_user, db), current_user)
    if payload.name is not None and payload.name != org.name:
        if db.query(Org).filter(Org.name == payload.name).first():
            raise HTTPException(status_code=400, detail="An org with this name already exists")
        org.name = payload.name
    if payload.description is not None:
        org.description = payload.description
    db.commit()
    db.refresh(org)
    return org


@router.post("/{org_id}/join", response_model=OrgResponse)
def join_org(
    org_id: int,
    payload: JoinOrgRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = db.get(Org, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Org not found")
    if not secrets.compare_digest(payload.invite_code, org.invite_code):
        raise HTTPException(status_code=403, detail="Invalid invite code")
    if not any(member.id == current_user.id for member in org.members):
        org.members.append(current_user)
        db.commit()
        db.refresh(org)
    return org


@router.post("/{org_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_org(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = get_user_org(org_id, current_user, db)
    if org.owner_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="The org owner cannot leave; delete the org instead",
        )
    member = db.get(User, current_user.id)
    org.members.remove(member)
    db.commit()


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_org(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = require_org_owner(get_user_org(org_id, current_user, db), current_user)
    # Delete tasks first (their comments cascade via the ORM relationship),
    # then drop memberships so no foreign keys point at the org anymore.
    for task in list(org.tasks):
        db.delete(task)
    org.members.clear()
    db.delete(org)
    db.commit()
