from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: UUID
    company_id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    link: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    count: int


class NotificationPreferencesResponse(BaseModel):
    id: UUID
    user_id: UUID
    notify_in_app: bool
    notify_email: bool
    notify_on_created: bool
    notify_on_approved: bool
    notify_on_rejected: bool
    notify_on_paid: bool

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferencesUpdate(BaseModel):
    notify_in_app: Optional[bool] = None
    notify_email: Optional[bool] = None
    notify_on_created: Optional[bool] = None
    notify_on_approved: Optional[bool] = None
    notify_on_rejected: Optional[bool] = None
    notify_on_paid: Optional[bool] = None
