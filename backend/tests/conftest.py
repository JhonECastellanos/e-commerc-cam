"""Fixtures compartidas: app FastAPI con base SQLite en memoria y datos sembrados."""
import os
import sys
from decimal import Decimal
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("APP_ENV", "development")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from passlib.hash import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.brand import Brand
from app.models.combo import Combo
from app.models.coverage_area import CoverageArea
from app.models.setting import Setting
from app.models.user import User
from app.security import rate_limiter

ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "ClaveSegura#2026"


@pytest_asyncio.fixture
async def engine():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session_maker(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session(session_maker):
    async with session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def seed(session_maker):
    """Marca, combos, cobertura, tarifas y usuario admin mínimos para las pruebas."""
    async with session_maker() as session:
        brand = Brand(name="Hikvision", slug="hikvision", active=True, sort_order=1)
        session.add(brand)
        await session.flush()

        combo_wired = Combo(
            brand_id=brand.id, mode="cableado", resolution="2MP", cameras_count=4,
            equipment_price=Decimal("1000000"), level="basico", active=True,
            warranty_text="1 año", storage_options={"1TB": 150000}, specs={}, included_items=[],
        )
        combo_wireless = Combo(
            brand_id=brand.id, mode="inalambrico", resolution="3MP", cameras_count=2,
            equipment_price=Decimal("800000"), level="medio", active=True,
            warranty_text="1 año", storage_options={}, specs={}, included_items=[],
        )
        combo_inactive = Combo(
            brand_id=brand.id, mode="cableado", resolution="8MP", cameras_count=8,
            equipment_price=Decimal("3000000"), level="pro", active=False,
            warranty_text="1 año", storage_options={}, specs={}, included_items=[],
        )
        coverage = CoverageArea(name="Chía", active=True)
        coverage_off = CoverageArea(name="Girardot", active=False)
        admin = User(
            email=ADMIN_EMAIL, password_hash=bcrypt.hash(ADMIN_PASSWORD),
            name="Admin Test", role="admin", active=True,
        )
        session.add_all([
            combo_wired, combo_wireless, combo_inactive, coverage, coverage_off, admin,
            Setting(key="install_fee_per_camera", value="75000"),
            Setting(key="install_fee_per_camera_wireless", value="50000"),
        ])
        await session.commit()
        return {
            "brand_id": brand.id,
            "combo_wired_id": combo_wired.id,
            "combo_wireless_id": combo_wireless.id,
            "combo_inactive_id": combo_inactive.id,
        }


@pytest_asyncio.fixture
async def client(engine, session_maker, monkeypatch, tmp_path):
    async def override_get_db():
        async with session_maker() as session:
            yield session

    def fake_pdf(**kwargs):
        pdf = tmp_path / f"acuerdo_{kwargs['order_reference']}.pdf"
        pdf.write_bytes(b"%PDF-1.4 fake")
        return str(pdf)

    monkeypatch.setattr("app.routers.orders.generar_acuerdo_reserva", fake_pdf)
    app.dependency_overrides[get_db] = override_get_db
    rate_limiter._events.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http:
        yield http
    app.dependency_overrides.clear()


def order_payload(**overrides) -> dict:
    payload = {
        "customer_name": "Juan Pérez",
        "customer_doc": "1032456789",
        "customer_phone": "3001234567",
        "customer_email": "juan@test.com",
        "address": "Calle 123 # 45-67",
        "municipality": "Chía",
        "terms_accepted": True,
    }
    payload.update(overrides)
    return payload
