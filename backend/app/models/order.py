from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, nullable=False, index=True)
    combo_id = Column(Integer, ForeignKey("combos.id"), nullable=True)
    customer_name = Column(String(255), nullable=False)
    customer_doc = Column(String(50), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_email = Column(String(255))
    address = Column(String(500), nullable=False)
    municipality = Column(String(255), nullable=False)
    coverage_area_id = Column(Integer, ForeignKey("coverage_areas.id"))
    total = Column(Numeric(12, 2), nullable=False)
    deposit_50 = Column(Numeric(12, 2), nullable=False)
    balance_50 = Column(Numeric(12, 2), nullable=False)
    storage_choice = Column(String(100))
    storage_price = Column(Numeric(12, 2), default=0)
    custom_combo_data = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="cotizacion", index=True)
    wompi_transaction_id = Column(String(255))
    wompi_reference = Column(String(255))
    access_token_hash = Column(String(64), nullable=True)
    idempotency_key = Column(String(128), nullable=True, unique=True, index=True)
    terms_accepted_at = Column(DateTime(timezone=True))
    terms_accepted_ip = Column(String(50))
    pdf_path = Column(String(500))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    combo = relationship("Combo", backref="orders")
    coverage_area = relationship("CoverageArea", backref="orders")
