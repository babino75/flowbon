from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApprovalLogResponse(BaseModel):
    id: UUID
    expense_request_id: UUID
    user_id: UUID
    action: str
    comment: Optional[str] = None
    created_at: datetime
    
    # We can also include basic user info (like name) for the timeline display
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RejectSchema(BaseModel):
    comment: str

    @field_validator("comment")
    def comment_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Un commentaire est obligatoire pour refuser un bon.")
        return v.strip()


class CommentSchema(BaseModel):
    comment: str

    @field_validator("comment")
    def comment_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Le commentaire ne peut pas être vide.")
        return v.strip()
