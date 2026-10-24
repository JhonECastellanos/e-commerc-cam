from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base

class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(500))
    image_url = Column(String(500), nullable=False)
    video_url = Column(String(500))
    link_url = Column(String(500))
    position = Column(Integer, nullable=False, default=1)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
