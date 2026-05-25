from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.models.project import Project, ProjectMember

router = APIRouter(prefix="/projects", tags=["Projects"])


class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = "active"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberAssign(BaseModel):
    user_ids: List[UUID]
    role: str = "member"


class ProjectMemberResponse(BaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


def _ensure_admin(current_user: User):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé — Administrateur requis")


def _ensure_company(current_user: User):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur sans entreprise")


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    q = db.query(Project).filter(Project.company_id == current_user.company_id)
    if not include_inactive:
        q = q.filter(Project.is_active == True)
    return q.order_by(Project.created_at.desc()).all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_admin(current_user)

    project = Project(
        company_id=current_user.company_id,
        name=project_in.name,
        code=project_in.code,
        description=project_in.description,
        status=project_in.status,
        start_date=project_in.start_date,
        end_date=project_in.end_date,
        created_by_id=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_admin(current_user)

    project = db.query(Project).filter(
        Project.id == UUID(project_id),
        Project.company_id == current_user.company_id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé")

    for field, value in project_in.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_admin(current_user)

    project = db.query(Project).filter(
        Project.id == UUID(project_id),
        Project.company_id == current_user.company_id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé")

    project.is_active = False
    db.commit()
    return


@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
def list_project_members(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    
    project = db.query(Project).filter(
        Project.id == UUID(project_id),
        Project.company_id == current_user.company_id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé")
        
    return db.query(ProjectMember).filter(ProjectMember.project_id == UUID(project_id)).all()


@router.put("/{project_id}/members", response_model=List[ProjectMemberResponse])
def assign_project_members(
    project_id: str,
    assignment: ProjectMemberAssign,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_admin(current_user)
    
    project = db.query(Project).filter(
        Project.id == UUID(project_id),
        Project.company_id == current_user.company_id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé")
        
    # Remove existing members with this role
    db.query(ProjectMember).filter(
        ProjectMember.project_id == UUID(project_id),
        ProjectMember.role == assignment.role
    ).delete()
    
    # Add new members
    members = []
    for uid in assignment.user_ids:
        member = ProjectMember(
            project_id=UUID(project_id),
            user_id=uid,
            role=assignment.role
        )
        db.add(member)
        members.append(member)
        
    db.commit()
    
    return db.query(ProjectMember).filter(ProjectMember.project_id == UUID(project_id)).all()
