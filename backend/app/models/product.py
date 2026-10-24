from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime, Text, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Numeric(12, 2), nullable=True)
    instalacion_price = Column(Numeric(12, 2), nullable=True)
    image_url = Column(String(500))
    category = Column(String(100))
    specs = Column(JSON, default=dict)
    ganancia = Column(Numeric(12, 2), nullable=True)
    link = Column(String(1000), nullable=True)
    active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    brand = relationship("Brand", backref="products")
