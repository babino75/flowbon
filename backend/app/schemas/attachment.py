from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class AttachmentResponse(BaseModel):
    id: UUID
    company_id: UUID
    expense_request_id: UUID
    file_url: str
    file_name: str
    file_size: int
    file_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
