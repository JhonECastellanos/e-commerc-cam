import hashlib
import secrets
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.business import Appointment, BusinessConfig
from app.routers.admin_auth import get_current_user
from app.security import enforce_rate_limit
from app.services.agenda import book, config, serialize, slots

router = APIRouter()


class Booking(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)
    contact: str = Field(min_length=7, max_length=160)
    kind: Literal["cctv_meeting", "smart_home_meeting", "installation", "blocked"]
    starts_at: datetime
    duration_minutes: int | None = Field(default=None, ge=15, le=840)
    consent: Literal[True]

    @field_validator("name", "contact")
    @classmethod
    def clean(cls, value):
        if not value.strip() or any(ord(c) < 32 for c in value):
            raise ValueError("Dato inválido")
        return value.strip()

    @field_validator("starts_at")
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError("Indica zona horaria")
        return value


class Review(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["pending", "confirmed", "cancelled", "completed", "no_show", "blocked"]
    classification: Literal["nuevo", "calificado", "prioritario", "seguimiento"] = "nuevo"
    rating: int | None = Field(default=None, ge=1, le=5)
    notes: str = Field(default="", max_length=4000)


class AgendaRules(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool
    opens: int = Field(ge=0, le=21)
    closes: int = Field(ge=1, le=23)
    days: list[int] = Field(max_length=7)
    lead_minutes: int = Field(ge=0, le=1440)
    horizon_days: int = Field(ge=1, le=90)

    @field_validator("days")
    @classmethod
    def valid_days(cls, value):
        if not value or len(set(value)) != len(value) or any(x < 0 or x > 6 for x in value):
            raise ValueError("Días inválidos")
        return value


@router.get("/agenda/slots")
async def available(day: date, kind: str = "cctv_meeting", db: AsyncSession = Depends(get_db)):
    return await slots(db, day, kind)


@router.post("/agenda/book", status_code=201)
async def create_booking(data: Booking, request: Request, idempotency_key: str = Header(min_length=8, max_length=128), db: AsyncSession = Depends(get_db)):
    await enforce_rate_limit(request, "agenda-book", 6, 60)
    return await book(db, data.model_dump(mode="json"), idempotency_key)


@router.get("/agenda/book/{appointment_id}")
async def receipt(appointment_id: str, x_booking_token: str = Header(default=""), db: AsyncSession = Depends(get_db)):
    row = await db.get(Appointment, appointment_id)
    if not row or not secrets.compare_digest(row.access_hash, hashlib.sha256(x_booking_token.encode()).hexdigest()):
        raise HTTPException(404, "Cita no encontrada")
    return serialize(row)


@router.get("/admin/agenda", dependencies=[Depends(get_current_user)])
async def appointments(day: date | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Appointment).order_by(Appointment.starts_at.desc()).limit(250)
    if day:
        from app.services.agenda import ZONE
        start = datetime.combine(day, datetime.min.time(), ZONE)
        query = query.where(Appointment.starts_at >= start, Appointment.starts_at < start + timedelta(days=1))
    return [serialize(row, True) for row in (await db.execute(query)).scalars()]


@router.post("/admin/agenda", dependencies=[Depends(get_current_user)])
async def manual(data: Booking, idempotency_key: str = Header(min_length=8, max_length=128), db: AsyncSession = Depends(get_db)):
    return await book(db, data.model_dump(mode="json"), idempotency_key, public=False, source="admin")


@router.put("/admin/agenda/{appointment_id}/reschedule", dependencies=[Depends(get_current_user)])
async def reschedule(appointment_id: str, data: Booking, db: AsyncSession = Depends(get_db)):
    return await book(db, data.model_dump(mode="json"), "reschedule-" + appointment_id, public=False, replace_id=appointment_id)


@router.put("/admin/agenda/{appointment_id}", dependencies=[Depends(get_current_user)])
async def review(appointment_id: str, data: Review, db: AsyncSession = Depends(get_db)):
    # Only transitions out of an occupied state may be made here; reactivation
    # must use reschedule, which atomically checks capacity.
    row = await db.get(Appointment, appointment_id)
    if not row:
        raise HTTPException(404, "Cita no encontrada")
    if row.status not in ["pending", "confirmed", "blocked"] and data.status in ["pending", "confirmed", "blocked"]:
        raise HTTPException(409, "Usa Reprogramar para volver a reservar el horario")
    for key, value in data.model_dump().items():
        setattr(row, key, value)
    await db.commit()
    return serialize(row, True)


@router.get("/admin/agenda-rules", dependencies=[Depends(get_current_user)])
async def get_rules(db: AsyncSession = Depends(get_db)):
    return await config(db)


@router.put("/admin/agenda-rules", dependencies=[Depends(get_current_user)])
async def update_rules(data: AgendaRules, db: AsyncSession = Depends(get_db)):
    if data.opens >= data.closes:
        raise HTTPException(422, "El cierre debe ser posterior a la apertura")
    row = await db.get(BusinessConfig, "agenda", with_for_update=True)
    if not row:
        raise HTTPException(409, "Ejecuta la migración comercial antes de configurar la agenda")
    row.payload = data.model_dump()
    await db.commit()
    return row.payload
