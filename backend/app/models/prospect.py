from sqlalchemy import Column, DateTime, Integer, JSON, String, Text, func
from app.database import Base


class Prospect(Base):
    """Advisory requests are independent of the existing catalog and payment orders."""

    __tablename__ = "prospects"
    id = Column(Integer, primary_key=True)
    reference = Column(String(40), unique=True, nullable=False, index=True)
    idempotency_key = Column(String(128), unique=True, nullable=False)
    payload_hash = Column(String(64), nullable=False)
    name = Column(String(100), nullable=False)
    contact_method = Column(String(20), nullable=False)
    contact = Column(String(254), nullable=False)
    locality = Column(String(100), nullable=False)
    answers = Column(JSON, nullable=False)
    profile = Column(JSON, nullable=False)
    configuration = Column(JSON, nullable=True)
    consent_version = Column(String(40), nullable=False)
    status = Column(String(30), default="nuevo", nullable=False)
    advisor_notes = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
