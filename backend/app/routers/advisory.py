import hashlib
import json
import uuid
from typing import Literal
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import settings
from app.logging_config import audit_log
from app.models.notification import Notification
from app.models.prospect import Prospect
from app.models.user import User
from app.models.setting import Setting
from app.routers.admin_auth import get_current_user
from app.schemas.advisory import ProfileIn, ProspectIn, StrictModel
from app.security import enforce_rate_limit
from app.services.profiling import build_profile

router = APIRouter()


async def privacy_configuration(db: AsyncSession) -> dict:
    keys = ["business_name", "business_contact", "advisory_retention_days"]
    rows = (
        (await db.execute(select(Setting).where(Setting.key.in_(keys)))).scalars().all()
    )
    values = {r.key: r.value for r in rows if r.value and "[" not in r.value}
    retention = values.get("advisory_retention_days", "")
    if not retention.isdigit() or not 1 <= int(retention) <= 3650:
        values.pop("advisory_retention_days", None)
    return {
        "responsible": values.get("business_name"),
        "contact": values.get("business_contact"),
        "retention": values.get("advisory_retention_days"),
        "version": "asesoria-2026-10-v1",
    }


@router.get("/advisory/privacy")
async def privacy(db: AsyncSession = Depends(get_db)):
    return await privacy_configuration(db)


@router.post("/advisory/profile")
async def profile(
    data: ProfileIn, request: Request, db: AsyncSession = Depends(get_db)
):
    await enforce_rate_limit(request, "advisory-profile", 30, 60)
    return await build_profile(data, db)


@router.post("/advisory/requests", status_code=201)
async def submit(
    data: ProspectIn,
    request: Request,
    idempotency_key: str = Header(
        alias="Idempotency-Key", min_length=12, max_length=128
    ),
    db: AsyncSession = Depends(get_db),
):
    await enforce_rate_limit(request, "advisory-request", settings.rate_limit_order, 60)
    if data.website:
        raise HTTPException(status_code=422, detail="Solicitud inválida")
    policy = await privacy_configuration(db)
    if settings.is_production and not all(
        policy.get(k) for k in ["responsible", "contact", "retention"]
    ):
        raise HTTPException(
            status_code=503,
            detail="El canal de asesoría está pendiente de habilitación por el responsable.",
        )
    payload = data.model_dump(mode="json")
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
    key = hashlib.sha256(idempotency_key.encode()).hexdigest()

    def receipt(row):
        if row.payload_hash != digest:
            raise HTTPException(
                status_code=409,
                detail="La solicitud cambió. Genera una nueva referencia de envío.",
            )
        return {
            "reference": row.reference,
            "profile": row.profile,
            "message": "Solicitud recibida para revisión por un asesor",
        }

    existing = (
        await db.execute(select(Prospect).where(Prospect.idempotency_key == key))
    ).scalar_one_or_none()
    if existing:
        return receipt(existing)
    recommended = await build_profile(data, db)
    row = Prospect(
        reference="ASE-" + uuid.uuid4().hex[:12].upper(),
        idempotency_key=key,
        payload_hash=digest,
        name=data.name,
        contact_method=data.contact_method,
        contact=data.contact,
        locality=data.locality,
        answers=data.answers.model_dump(mode="json"),
        profile=recommended,
        configuration=data.configuration.model_dump(mode="json")
        if data.configuration
        else None,
        consent_version=data.consent_version,
    )
    db.add(row)
    db.add(
        Notification(
            type="asesoria",
            title=f"Nueva asesoría {row.reference}",
            message=f'{row.reference} · {recommended["category"]} · Revisar en Solicitudes',
        )
    )
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        duplicate = (
            await db.execute(select(Prospect).where(Prospect.idempotency_key == key))
        ).scalar_one_or_none()
        if not duplicate:
            raise
        return receipt(duplicate)
    audit_log("advisory_created", entity_id=row.id)
    return receipt(row)


@router.get("/admin/advisory/requests")
async def requests(
    page: int = 1,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not 1 <= page <= 10000:
        raise HTTPException(status_code=422, detail="Página inválida")
    rows = (
        (
            await db.execute(
                select(Prospect)
                .order_by(Prospect.created_at.desc())
                .offset((page - 1) * 50)
                .limit(50)
            )
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": r.id,
            "reference": r.reference,
            "name": r.name,
            "contact_method": r.contact_method,
            "contact": r.contact,
            "locality": r.locality,
            "answers": r.answers,
            "profile": r.profile,
            "configuration": r.configuration,
            "consent_version": r.consent_version,
            "status": r.status,
            "advisor_notes": r.advisor_notes,
            "created_at": r.created_at,
        }
        for r in rows
    ]


class ReviewIn(StrictModel):
    status: Literal["nuevo", "en_revision", "contactado", "cotizado", "cerrado"]
    advisor_notes: str = Field(default="", max_length=4000)
    recommendation: (
        Literal[
            "Combo CCTV básico",
            "Combo CCTV ampliado",
            "Instalación de seguridad personalizada",
            "Seguridad con automatización y domótica",
            "Proyecto integral avanzado",
        ]
        | None
    ) = None


@router.put("/admin/advisory/requests/{prospect_id}")
async def review(
    prospect_id: int,
    data: ReviewIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = await db.get(Prospect, prospect_id)
    if not row:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    row.status, row.advisor_notes = data.status, data.advisor_notes
    if data.recommendation:
        if len(data.advisor_notes.strip()) < 10:
            raise HTTPException(
                status_code=422,
                detail="Explica brevemente el ajuste de la recomendación",
            )
        row.profile = {**row.profile, "advisor_recommendation": data.recommendation}
    await db.commit()
    audit_log("advisory_reviewed", user_id=user.id, entity_id=row.id)
    return {
        "status": row.status,
        "advisor_notes": row.advisor_notes,
        "profile": row.profile,
    }
