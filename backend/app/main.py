from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routes import auth, company, invitation, user
from app.routes.auth import limiter
from app.routes.expenses import router as expenses_router
from app.routes.dashboard import router as dashboard_router
from app.routes.exports import router as exports_router
from app.routes.categories import router as categories_router
from app.routes.notifications import router as notifications_router
from app.routes.advances import router as advances_router
from app.routes.super_admin import router as super_admin_router
from app.routes.fiscal_years import router as fiscal_years_router

app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.app_env == "local" else None,
    redoc_url="/redoc" if settings.app_env == "local" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_urls,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(company.router)
app.include_router(user.router)
app.include_router(invitation.router)
app.include_router(expenses_router)
app.include_router(dashboard_router)
app.include_router(exports_router)
app.include_router(categories_router)
app.include_router(notifications_router)
app.include_router(advances_router)
app.include_router(super_admin_router)
app.include_router(fiscal_years_router)

from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Ensure the upload directory exists
upload_dir_path = Path(settings.uploads_dir)
upload_dir_path.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")


@app.get("/")
def home():
    return {"message": "FlowBon API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name, "env": settings.app_env}
