from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.core.dependencies import get_current_active_user, get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.company import Company
from app.models.invitation import Invitation
from app.models.token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginSchema, RegisterSchema, RegisterInviteSchema, TokenResponse
from app.schemas.user import UserResponse

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def register(request: Request, user_in: RegisterSchema, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )

    company_id = None
    if user_in.role == "admin":
        company = Company(name=user_in.company_name, email=user_in.email)
        db.add(company)
        db.commit()
        db.refresh(company)
        company_id = company.id

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        company_id=company_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register-invite", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_invite(request: Request, invite_data: RegisterInviteSchema, db: Session = Depends(get_db)):
    invitation = db.query(Invitation).filter(
        Invitation.token == invite_data.token,
        Invitation.status == "pending",
    ).first()

    if not invitation or invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation invalide ou expirée")

    if invitation.email.lower() != invite_data.email.lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="L'email ne correspond pas à l'invitation")

    existing_user = db.query(User).filter(User.email == invite_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un utilisateur avec cet email existe déjà")

    user = User(
        name=invite_data.name,
        email=invite_data.email,
        password_hash=hash_password(invite_data.password),
        role=invitation.role,
        company_id=invitation.company_id,
        invited_by=invitation.invited_by_id,
    )
    invitation.status = "accepted"
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, response: Response, login_data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Ce compte est desactive, contactez votre administrateur")

    access_token = create_access_token(subject=str(user.id))
    
    token_id = str(uuid.uuid4())
    refresh_token = create_refresh_token(subject=str(user.id), token_id=token_id)
    
    expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    db_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token,
        RefreshToken.revoked == False,
    ).first()
    
    if not db_token or db_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    access_token = create_access_token(subject=str(db_token.user_id))
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        db_token = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
        if db_token:
            db_token.revoked = True
            db.commit()

    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user
