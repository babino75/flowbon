import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class DocumentSequence(Base):
    """
    Stocke le dernier numéro de séquence utilisé par type de document,
    par entreprise et par année. Garantit des numéros séquentiels uniques
    même en accès concurrent (via SELECT FOR UPDATE).

    Exemples de doc_type : 'EXP', 'ADV', 'PAY', 'LED'
    """
    __tablename__ = "document_sequences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    doc_type = Column(String(10), nullable=False)  # 'EXP', 'ADV', 'PAY', 'LED'
    year = Column(Integer, nullable=False)
    last_sequence = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("company_id", "doc_type", "year", name="uq_document_sequence"),
    )
