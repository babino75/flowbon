import os
import uuid
from pathlib import Path
from typing import List

from fastapi import HTTPException, UploadFile

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_ATTACHMENTS_PER_EXPENSE = 5


def validate_upload(file: UploadFile) -> int:
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Format non accepte. Utilisez PDF, JPG ou PNG.")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non accepte.")

    size = 0
    while chunk := file.file.read(1024 * 1024):
        size += len(chunk)
        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 10 MB.")
    file.file.seek(0)
    return size


def ensure_upload_dir(path: str) -> Path:
    upload_dir = Path(path)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def save_upload(file: UploadFile, upload_dir: Path) -> str:
    suffix = file.filename.rsplit(".", 1)[-1].lower()
    safe_name = f"{uuid.uuid4().hex}.{suffix}"
    target_path = upload_dir / safe_name

    with target_path.open("wb") as buffer:
        while chunk := file.file.read(1024 * 1024):
            buffer.write(chunk)
    file.file.seek(0)
    return safe_name
