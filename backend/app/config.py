import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BASE_DIR / "app" / ".env")
load_dotenv(BASE_DIR / ".env", override=True)


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "FlowBon")
    app_env: str = os.getenv("APP_ENV", "local")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://flowbon:flowbon123@localhost:5432/flowbon",
    )
    secret_key: str = os.getenv("SECRET_KEY", "change_me")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    frontend_urls: list[str] = field(
        default_factory=lambda: [
            url.strip()
            for url in os.getenv(
                "FRONTEND_URLS",
                "http://localhost:3000,http://127.0.0.1:3000",
            ).split(",")
            if url.strip()
        ]
    )
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    uploads_dir: str = os.getenv("UPLOADS_DIR", str(BASE_DIR / "uploads"))


settings = Settings()
