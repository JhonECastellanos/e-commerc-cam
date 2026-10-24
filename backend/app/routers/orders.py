import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.config import settings
from app.database import get_db
from app.logging_config import audit_log
from app.models.combo import Combo
from app.models.coverage_area import CoverageArea
from app.models.notification import Notification
from app.models.order import Order
from app.models.setting import Setting
from app.routers.public import get_install_fee, quote_custom_combo
from app.schemas import OrderCreate, OrderPublicOut
from app.security import (enforce_rate_limit, get_client_ip, order_access_token_from_idempotency,
                          token_digest, verify_order_access_token)
from app.services.pdf_generator import generar_acuerdo_reserva
from app.services.wompi import format_amount_cop, get_wompi_widget_url, verificar_webhook

router = APIRouter()


async def get_setting(db: AsyncSession, key: str, default: str = "[DEFINIR]") -> str:
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else default


async def build_order_pdf(order: Order, db: AsyncSession, paid_at: datetime | None = None) -> str:
    if order.custom_combo_data:
        custom = order.custom_combo_data
        brand_name = custom["brand_name"]
        mode = custom["mode"]
        resolution = custom["resolution"]
        cameras_count = custom["cameras_count"]
    else:
        result = await db.execute(select(Combo).options(joinedload(Combo.brand)).where(Combo.id == order.combo_id))
        combo = result.unique().scalar_one_or_none()
        if not combo:
            raise RuntimeError("El combo asociado a la orden no existe")
        brand_name = combo.brand.name if combo.brand else "Marca"
        mode, resolution, cameras_count = combo.mode, combo.resolution, combo.cameras_count

    balance_term = await get_setting(db, "balance_payment_term", "contraentrega")
    paid_text = paid_at.strftime("%d/%m/%Y %H:%M") if paid_at else "(pendiente de pago)"
    return generar_acuerdo_reserva(
        order_reference=order.reference,
        fecha=(order.created_at or datetime.now(timezone.utc)).strftime("%d/%m/%Y %H:%M"),
        cliente_nombre=order.customer_name,
        cliente_documento=order.customer_doc,
        direccion=order.address,
        municipio=order.municipality,
        telefono=order.customer_phone,
        marca=brand_name,
        modo_instalacion=mode,
        resolucion=resolution,
        numero_camaras=cameras_count,
        precio_total=order.total,
        valor_anticipo=order.deposit_50,
        fecha_pago=paid_text,
        valor_saldo=order.balance_50,
        condicion_pago_saldo="contraentrega" if balance_term == "contraentrega" else "antes de iniciar la instalación",
        terms_accepted_at=order.terms_accepted_at.strftime("%d/%m/%Y %H:%M") if order.terms_accepted_at else "",
        terms_accepted_ip=order.terms_accepted_ip or "",
        business_name=await get_setting(db, "business_name", "[COMPLETAR]"),
        business_nit=await get_setting(db, "business_nit", "[COMPLETAR]"),
        business_contact=await get_setting(db, "business_contact", "[COMPLETAR]"),
        cancellation_policy=await get_setting(db, "cancellation_policy"),
        installation_lead_days=await get_setting(db, "installation_lead_days"),
        labor_warranty_months=await get_setting(db, "labor_warranty_months"),
        output_dir=settings.private_files_dir,
    )


async def load_order_with_access(reference: str, access_token: str | None, db: AsyncSession) -> Order:
    result = await db.execute(select(Order).where(Order.reference == reference))
    order = result.scalar_one_or_none()
    if not order or not verify_order_access_token(access_token, order.access_token_hash):
        # Uniform result prevents reference enumeration.
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return order


@router.post("/orders", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_order(
    req: OrderCreate,
    request: Request,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=128),
    db: AsyncSession = Depends(get_db),
):
    await enforce_rate_limit(request, "create-order", settings.rate_limit_order, settings.rate_limit_window_seconds)
    if not req.terms_accepted:
        raise HTTPException(status_code=400, detail="Debes aceptar las condiciones comerciales")

    existing = (await db.execute(select(Order).where(Order.idempotency_key == idempotency_key))).scalar_one_or_none()
    access_token = order_access_token_from_idempotency(idempotency_key, settings.secret_key)
    if existing:
        return order_response(existing, access_token)

    coverage = (await db.execute(select(CoverageArea).where(CoverageArea.name == req.municipality, CoverageArea.active.is_(True)))).scalar_one_or_none()
    if not coverage:
        raise HTTPException(status_code=400, detail="El municipio seleccionado no cuenta con cobertura")

    storage_price, storage_choice, canonical_custom = Decimal("0"), None, None
    if req.custom_combo:
        quote = await quote_custom_combo(req.custom_combo, db)
        total, deposit, balance = quote["total"], quote["deposit_50"], quote["balance_50"]
        canonical_custom = {key: quote[key] for key in ("brand_name", "mode", "resolution", "cameras_count")}
        combo_id = None
    else:
        result = await db.execute(select(Combo).options(joinedload(Combo.brand)).where(Combo.id == req.combo_id, Combo.active.is_(True)))
        combo = result.unique().scalar_one_or_none()
        if not combo:
            raise HTTPException(status_code=404, detail="Combo no encontrado")
        combo_id = combo.id
        if req.storage_choice:
            options = combo.storage_options or {}
            if req.storage_choice not in options:
                raise HTTPException(status_code=400, detail="La opción de almacenamiento no es válida para este combo")
            storage_choice = req.storage_choice
            storage_price = Decimal(str(options[storage_choice]))
        total = combo.equipment_price + (await get_install_fee(db, combo.mode, combo) * combo.cameras_count) + storage_price
        deposit, balance = total * Decimal("0.5"), total * Decimal("0.5")

    order = Order(
        reference=f"IC-{uuid.uuid4().hex[:16].upper()}", combo_id=combo_id,
        customer_name=req.customer_name, customer_doc=req.customer_doc, customer_phone=req.customer_phone,
        customer_email=req.customer_email, address=req.address, municipality=req.municipality,
        coverage_area_id=coverage.id, total=total, deposit_50=deposit, balance_50=balance,
        storage_choice=storage_choice, storage_price=storage_price, custom_combo_data=canonical_custom,
        status="cotizacion", terms_accepted_at=datetime.now(timezone.utc), terms_accepted_ip=get_client_ip(request),
        idempotency_key=idempotency_key, access_token_hash=token_digest(access_token),
    )
    db.add(order)
    await db.flush()
    order.pdf_path = await build_order_pdf(order, db)
    await db.commit()
    audit_log("order_created", order_id=order.id, client_ip=get_client_ip(request))
    return order_response(order, access_token)


def order_response(order: Order, access_token: str) -> dict:
    frontend_url = settings.cors_origins[0] if settings.cors_origins else ""
    return {
        "reference": order.reference, "total": float(order.total), "deposit_50": float(order.deposit_50),
        "balance_50": float(order.balance_50), "order_access_token": access_token,
        "checkout_url": get_wompi_widget_url(settings.womppi_public_key, format_amount_cop(order.deposit_50), order.reference, f"{frontend_url}/confirmacion?reference={order.reference}"),
    }


@router.post("/payments/wompi/webhook")
async def wompi_webhook(payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    if not verificar_webhook(payload):
        audit_log("wompi_webhook_rejected", client_ip=get_client_ip(request))
        raise HTTPException(status_code=400, detail="Firma inválida")
    transaction = payload.get("data", {}).get("transaction", payload.get("data", {}))
    reference, transaction_id, payment_status = str(transaction.get("reference", "")), str(transaction.get("id", "")), transaction.get("status", "")
    if not reference or not transaction_id:
        raise HTTPException(status_code=400, detail="Evento de pago inválido")
    order = (await db.execute(select(Order).where(Order.reference == reference))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if payment_status == "APPROVED":
        if int(transaction.get("amount_in_cents", 0)) != format_amount_cop(order.deposit_50) or transaction.get("currency", "COP") != "COP":
            audit_log("wompi_amount_mismatch", order_id=order.id)
            raise HTTPException(status_code=400, detail="Monto de pago inválido")
        if order.wompi_transaction_id and order.wompi_transaction_id != transaction_id:
            raise HTTPException(status_code=409, detail="La orden ya tiene otro pago confirmado")
        if order.status != "reservado":
            order.status, order.wompi_transaction_id = "reservado", transaction_id
            order.pdf_path = await build_order_pdf(order, db, datetime.now(timezone.utc))
            db.add(Notification(type="payment", title="Anticipo confirmado", message=f"Anticipo confirmado para {order.reference}", order_id=order.id, read=False))
            audit_log("payment_approved", order_id=order.id)
    await db.commit()
    return {"status": "ok"}


@router.get("/orders/{reference}/pdf")
async def download_pdf(reference: str, x_order_access_token: str | None = Header(None), db: AsyncSession = Depends(get_db)):
    order = await load_order_with_access(reference, x_order_access_token, db)
    if not order.pdf_path or not os.path.isfile(order.pdf_path):
        # En entornos serverless el disco es efímero: el acuerdo se regenera
        # bajo demanda a partir de los datos persistidos de la orden.
        paid_at = order.updated_at if order.status in ("reservado", "pagado", "instalado") else None
        order.pdf_path = await build_order_pdf(order, db, paid_at)
        await db.commit()
    return FileResponse(order.pdf_path, media_type="application/pdf", filename=f"acuerdo_{reference}.pdf")


@router.get("/orders/{reference}", response_model=OrderPublicOut)
async def get_order_status(reference: str, x_order_access_token: str | None = Header(None), db: AsyncSession = Depends(get_db)):
    return await load_order_with_access(reference, x_order_access_token, db)
