from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base

class Combo(Base):
    __tablename__ = "combos"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False, index=True)
    name = Column(String(500), nullable=True)
    unique_code = Column(String(50), nullable=True, unique=True)
    mode = Column(String(50), nullable=False)
    resolution = Column(String(20), nullable=False)
    cameras_count = Column(Integer, nullable=False)
    equipment_price = Column(Numeric(12, 2), nullable=False)
    install_fee = Column(Numeric(12, 2), nullable=True)
    is_bestseller = Column(Boolean, default=False)
    is_budget = Column(Boolean, default=False)
    level = Column(String(20), nullable=True)
    warranty_text = Column(String(255), default="Según fabricante")
    image_url = Column(String(500))
    active = Column(Boolean, default=True)
    specs = Column(JSON, default=dict)
    storage_options = Column(JSON, default=dict)
    install_complexity = Column(String(20), default="media")
    included_items = Column(JSON, default=list)
    categoria = Column(String(50), default="Combo")
    instalacion_incluida = Column(Boolean, default=True)
    ganancia = Column(Numeric(12, 2), nullable=True)
    link = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    brand = relationship("Brand", backref="combos")
