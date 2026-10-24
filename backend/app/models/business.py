"""Additive tables: commercial scheduling, conversations and reviewed agent actions."""
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, func

from app.database import Base


class BusinessConfig(Base):
    __tablename__ = "business_config"
    key = Column(String(40), primary_key=True)
    payload = Column(JSON, nullable=False, default=dict)
    secret = Column(Text, nullable=True)


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(String(36), primary_key=True)
    name = Column(String(120), nullable=False)
    contact = Column(String(160), nullable=False)
    kind = Column(String(30), nullable=False, index=True)
    starts_at = Column(DateTime(timezone=True), nullable=False, index=True)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), nullable=False, default="confirmed", index=True)
    classification = Column(String(30), nullable=False, default="nuevo")
    rating = Column(Integer, nullable=True)
    notes = Column(Text, nullable=False, default="")
    source = Column(String(20), nullable=False, default="web")
    idempotency_key = Column(String(128), unique=True, nullable=False)
    payload_hash = Column(String(64), nullable=False)
    access_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Conversation(Base):
    __tablename__ = "business_conversations"
    id = Column(String(36), primary_key=True)
    channel = Column(String(20), nullable=False)
    contact = Column(String(160), nullable=True, unique=True)
    name = Column(String(120), nullable=False, default="Visitante")
    token_hash = Column(String(64), nullable=True)
    paused = Column(Boolean, nullable=False, default=False)
    state = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "business_messages"
    id = Column(String(80), primary_key=True)
    conversation_id = Column(String(36), ForeignKey("business_conversations.id"), index=True, nullable=False)
    role = Column(String(20), nullable=False)
    body = Column(Text, nullable=False)
    delivery = Column(String(20), nullable=False, default="local")
    attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now())


class AgentProposal(Base):
    __tablename__ = "agent_proposals"
    id = Column(String(36), primary_key=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tool = Column(String(60), nullable=False)
    arguments = Column(JSON, nullable=False)
    previous = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
