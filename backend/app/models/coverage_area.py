from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base

class CoverageArea(Base):
    __tablename__ = "coverage_areas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
