from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class InvitationCreateSchema(BaseModel):
    email: EmailStr
    role: str = "employee"


class InvitationResponse(BaseModel):
    id: UUID
    company_id: UUID
    email: EmailStr
    role: str
    token: str
    status: str
    expires_at: datetime
    invited_by_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
