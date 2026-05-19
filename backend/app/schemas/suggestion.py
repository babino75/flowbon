from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SuggestionBase(BaseModel):
    title: str
    content: str
    category: str = "suggestion"  # suggestion, bug, question, other
    is_anonymous: bool = False


class SuggestionCreate(SuggestionBase):
    pass


class SuggestionUpdate(BaseModel):
    status: Optional[str] = None  # pending, under_review, planned, completed, rejected
    admin_response: Optional[str] = None


class SuggestionResponse(SuggestionBase):
    id: UUID
    company_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    user_name: Optional[str] = None
    status: str
    admin_response: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
