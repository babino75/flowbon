from datetime import datetime
from typing import Generator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.company import Company
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Bypass subscription restriction checks for:
    # 1. Super Admins
    if current_user.role == "super_admin":
        return current_user

    # 2. Specific routes: /auth/me, /companies/me, /auth/logout, /companies/activate-trial
    path = request.url.path
    normalized_path = path.rstrip("/")
    if normalized_path in [
        "/auth/me",
        "/companies/me",
        "/auth/logout",
        "/companies/activate-trial",
        "/api/auth/me",
        "/api/companies/me",
        "/api/auth/logout",
        "/api/companies/activate-trial",
    ]:
        return current_user

    if current_user.company_id:
        company = db.query(Company).filter(Company.id == current_user.company_id).first()
        if company:
            # 1. Selection pending onboarding
            if company.subscription_status == "pending_selection":
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="pending_selection",
                )
            
            # 2. Subscription suspended
            if company.subscription_status == "suspended":
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="subscription_suspended",
                )

            # 3. Trial expired
            if company.subscription_status == "trial":
                if company.trial_expires_at and company.trial_expires_at < datetime.utcnow():
                    raise HTTPException(
                        status_code=status.HTTP_402_PAYMENT_REQUIRED,
                        detail="trial_expired",
                    )

    return current_user
