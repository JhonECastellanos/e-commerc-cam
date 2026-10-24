import asyncio
import hashlib
import json
import secrets
from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select

from app.models.business import Appointment, BusinessConfig

ZONE = ZoneInfo("America/Bogota")
KINDS = {"cctv_meeting": 30, "smart_home_meeting": 60}
DEFAULT_AGENDA = {"enabled": True, "opens": 8, "closes": 22, "days": list(range(7)), "lead_minutes": 60, "horizon_days": 30}
write_lock = asyncio.Lock()


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


async def config(db, lock=False):
    query = select(BusinessConfig).where(BusinessConfig.key == "agenda")
    row = (await db.execute(query.with_for_update() if lock else query)).scalar_one_or_none()
    if lock and row is None:
        raise HTTPException(503, "La agenda requiere ejecutar la migración comercial")
    return {**DEFAULT_AGENDA, **(row.payload if row else {})}


def validate_slot(start, minutes, cfg, kind, public=True):
    now = datetime.now(timezone.utc)
    start = utc(start)
    end = start + timedelta(minutes=minutes)
    local, local_end = start.astimezone(ZONE), end.astimezone(ZONE)
    if kind not in {*KINDS, "installation", "blocked"}:
        raise HTTPException(422, "Tipo de cita inválido")
    if public and (not cfg["enabled"] or kind not in KINDS):
        raise HTTPException(409, "La instalación se coordina directamente con un asesor")
    if start < now + timedelta(minutes=cfg["lead_minutes"] if public else 0) or start > now + timedelta(days=cfg["horizon_days"]):
        raise HTTPException(422, "La fecha está fuera del plazo de reserva")
    if local.weekday() not in cfg["days"] or local.date() != local_end.date() or local.hour < cfg["opens"] or local_end.time() > time(cfg["closes"]) or local.second or local.microsecond or local.minute % 30:
        raise HTTPException(422, "Selecciona un horario disponible dentro de la jornada")
    return start, end


async def slots(db, day: date, kind: str):
    if kind not in KINDS:
        raise HTTPException(422, "Selecciona una reunión CCTV o casa inteligente")
    cfg = await config(db)
    start = datetime.combine(day, time(cfg["opens"]), ZONE)
    busy = (await db.execute(select(Appointment).where(
        Appointment.status.in_(["pending", "confirmed", "blocked"]),
        Appointment.starts_at < utc(start + timedelta(days=1)), Appointment.ends_at > utc(start),
    ))).scalars().all()
    result = []
    while start.hour < cfg["closes"]:
        try:
            a, b = validate_slot(start, KINDS[kind], cfg, kind)
            if not any(a < utc(item.ends_at) and b > utc(item.starts_at) for item in busy):
                result.append({"starts_at": a.isoformat(), "ends_at": b.isoformat(), "label": start.strftime("%H:%M")})
        except HTTPException:
            pass
        start += timedelta(minutes=30)
    return {"timezone": "America/Bogota", "duration_minutes": KINDS[kind], "slots": result}


def serialize(row, private=False):
    data = {"id": row.id, "kind": row.kind, "starts_at": utc(row.starts_at).isoformat(), "ends_at": utc(row.ends_at).isoformat(), "status": row.status}
    if private:
        data.update(name=row.name, contact=row.contact, classification=row.classification, rating=row.rating, notes=row.notes, source=row.source)
    return data


async def book(db, data, key, public=True, source="web", replace_id=None):
    fingerprint = hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()
    # The persisted singleton row serializes writers across PostgreSQL workers.
    # The process lock also provides deterministic SQLite test semantics.
    async with write_lock:
        cfg = await config(db, lock=True)
        existing = (await db.execute(select(Appointment).where(Appointment.idempotency_key == key))).scalar_one_or_none()
        if existing and not replace_id:
            if existing.payload_hash != fingerprint:
                raise HTTPException(409, "La clave de envío ya se utilizó para otra solicitud")
            return serialize(existing, private=not public)
        minutes = KINDS.get(data["kind"], data.get("duration_minutes") or 0)
        if public and data["kind"] not in KINDS:
            raise HTTPException(409, "La instalación se coordina directamente con un asesor")
        if not 15 <= minutes <= 840:
            raise HTTPException(422, "Indica la duración de la instalación o bloqueo")
        a, b = validate_slot(datetime.fromisoformat(str(data["starts_at"]).replace("Z", "+00:00")), minutes, cfg, data["kind"], public)
        collision = (await db.execute(select(Appointment.id).where(
            Appointment.status.in_(["pending", "confirmed", "blocked"]), Appointment.starts_at < b, Appointment.ends_at > a,
            Appointment.id != (replace_id or ""),
        ).limit(1))).scalar_one_or_none()
        if collision:
            raise HTTPException(409, "Este horario acaba de ocuparse. Selecciona otro.")
        access = secrets.token_urlsafe(32)
        row = await db.get(Appointment, replace_id) if replace_id else Appointment(
            id=str(uuid4()), idempotency_key=key, payload_hash=fingerprint,
            access_hash=hashlib.sha256(access.encode()).hexdigest(), source=source,
        )
        if row is None:
            raise HTTPException(404, "Cita no encontrada")
        row.name, row.contact, row.kind = data["name"], data["contact"], data["kind"]
        row.starts_at, row.ends_at = a, b
        row.status = "blocked" if row.kind == "blocked" else "confirmed"
        if not replace_id:
            db.add(row)
        await db.commit()
        return {**serialize(row, private=not public), **({"access_token": access} if not replace_id else {})}
