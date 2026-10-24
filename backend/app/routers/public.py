from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from decimal import Decimal
from typing import Optional
from app.database import get_db
from app.models.brand import Brand
from app.models.combo import Combo
from app.models.coverage_area import CoverageArea
from app.models.social_link import SocialLink
from app.models.order import Order
from app.models.setting import Setting
from app.models.banner import Banner
from app.models.product import Product
from app.schemas import BrandOut, ComboPublic, CoverageAreaOut, SocialLinkOut, CustomComboSelection, CustomPriceIn, CustomPriceOut, BannerOut, ProductOut

router = APIRouter()

async def get_install_fee(db: AsyncSession, mode: str = "cableado", combo: Combo = None) -> Decimal:
    if combo and combo.install_fee is not None:
        return Decimal(str(combo.install_fee))
    key = "install_fee_per_camera_wireless" if mode == "inalambrico" else "install_fee_per_camera"
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if setting:
        return Decimal(setting.value)
    return Decimal("50000") if mode == "inalambrico" else Decimal("75000")

def compute_final_price(combo: Combo, install_fee: Decimal) -> Decimal:
    return combo.equipment_price + (install_fee * combo.cameras_count)

@router.get("/brands", response_model=list[BrandOut])
async def get_brands(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Brand).where(Brand.active.is_(True)).order_by(Brand.sort_order))
    return result.scalars().all()

@router.get("/combos", response_model=list[ComboPublic])
async def get_combos(
    brand: Optional[str] = None,
    mode: Optional[str] = None,
    resolution: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Combo).options(joinedload(Combo.brand)).where(Combo.active.is_(True), Combo.level.isnot(None))
    if brand:
        query = query.join(Combo.brand).where(Brand.slug == brand)
    if mode:
        query = query.where(Combo.mode == mode)
    if resolution:
        query = query.where(Combo.resolution == resolution)

    result = await db.execute(query)
    combos = result.unique().scalars().all()

    output = []
    for c in combos:
        fee = await get_install_fee(db, c.mode, c)
        final_price = compute_final_price(c, fee)
        if min_price and final_price < min_price:
            continue
        if max_price and final_price > max_price:
            continue
        output.append(ComboPublic(
            id=c.id,
            brand_id=c.brand_id,
            brand_name=c.brand.name if c.brand else None,
            mode=c.mode,
            resolution=c.resolution,
            cameras_count=c.cameras_count,
            final_price=final_price,
            is_bestseller=c.is_bestseller,
            is_budget=c.is_budget,
            level=c.level,
            warranty_text=c.warranty_text,
            image_url=c.image_url,
            specs=c.specs,
            storage_options=c.storage_options,
            install_complexity=c.install_complexity,
            included_items=c.included_items,
            active=c.active,
        ))
    return output

@router.get("/combos/{combo_id}", response_model=ComboPublic)
async def get_combo(combo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Combo).options(joinedload(Combo.brand)).where(Combo.id == combo_id, Combo.active.is_(True))
    )
    c = result.unique().scalar_one_or_none()
    if not c:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Combo no encontrado")
    fee = await get_install_fee(db, c.mode, c)
    final_price = compute_final_price(c, fee)
    return ComboPublic(
        id=c.id,
        brand_id=c.brand_id,
        brand_name=c.brand.name if c.brand else None,
        mode=c.mode,
        resolution=c.resolution,
        cameras_count=c.cameras_count,
        final_price=final_price,
        is_bestseller=c.is_bestseller,
        is_budget=c.is_budget,
        level=c.level,
        warranty_text=c.warranty_text,
        image_url=c.image_url,
        specs=c.specs,
        storage_options=c.storage_options,
        install_complexity=c.install_complexity,
        included_items=c.included_items,
        active=c.active,
    )

@router.get("/combos/{combo_id}/price", response_model=dict)
async def get_combo_price(
    combo_id: int,
    storage: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Combo).options(joinedload(Combo.brand)).where(Combo.id == combo_id, Combo.active.is_(True))
    )
    c = result.unique().scalar_one_or_none()
    if not c:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Combo no encontrado")

    fee = await get_install_fee(db, c.mode, c)
    base_final = compute_final_price(c, fee)
    storage_price = Decimal("0")
    storage_label = None

    if storage and c.storage_options:
        for label, price in c.storage_options.items():
            if label == storage:
                storage_price = Decimal(str(price))
                storage_label = label
                break

    total = base_final + storage_price
    return {
        "base_price": base_final,
        "install_fee": fee * c.cameras_count,
        "equipment_price": c.equipment_price,
        "storage_choice": storage_label,
        "storage_price": storage_price,
        "total": total,
        "deposit_50": total * Decimal("0.5"),
        "balance_50": total * Decimal("0.5"),
    }

@router.post("/custom-combo/price", response_model=CustomPriceOut)
async def custom_combo_price(data: CustomPriceIn, db: AsyncSession = Depends(get_db)):
    quote = await quote_custom_combo(data, db)
    return CustomPriceOut(total=quote["total"], deposit_50=quote["deposit_50"], balance_50=quote["balance_50"])


async def quote_custom_combo(data: CustomComboSelection, db: AsyncSession) -> dict:
    brand_result = await db.execute(select(Brand).where(Brand.slug == data.brand_slug, Brand.active.is_(True)))
    brand = brand_result.scalar_one_or_none()
    if not brand:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Marca no encontrada")

    combo_result = await db.execute(
        select(Combo).where(
            Combo.brand_id == brand.id,
            Combo.mode == data.mode,
            Combo.resolution == data.resolution,
            Combo.active.is_(True),
            Combo.level.isnot(None),
        ).limit(1)
    )
    ref_combo = combo_result.scalar_one_or_none()
    if not ref_combo:
        combo_result = await db.execute(
            select(Combo).where(
                Combo.brand_id == brand.id,
                Combo.active.is_(True),
                Combo.level.isnot(None),
            ).limit(1)
        )
        ref_combo = combo_result.scalar_one_or_none()

    base_price = ref_combo.equipment_price if ref_combo else Decimal("300000")
    # Guard against a reference combo with cameras_count == 0 (would raise DivisionByZero → 500).
    ref_cameras = Decimal(str(ref_combo.cameras_count)) if ref_combo and ref_combo.cameras_count else Decimal("0")
    per_camera_price = base_price / ref_cameras if ref_cameras else Decimal("75000")
    equipment_price = per_camera_price * Decimal(str(data.cameras_count))

    fee = await get_install_fee(db, data.mode)
    install_total = fee * Decimal(str(data.cameras_count))
    total = equipment_price + install_total
    return {
        "brand_name": brand.name,
        "mode": data.mode,
        "resolution": data.resolution,
        "cameras_count": data.cameras_count,
        "total": total,
        "deposit_50": total * Decimal("0.5"),
        "balance_50": total * Decimal("0.5"),
    }

@router.get("/coverage-areas", response_model=list[CoverageAreaOut])
async def get_coverage_areas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CoverageArea).where(CoverageArea.active.is_(True)).order_by(CoverageArea.name))
    return result.scalars().all()

@router.get("/social-links", response_model=list[SocialLinkOut])
async def get_social_links(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SocialLink).where(SocialLink.active.is_(True)).order_by(SocialLink.sort_order))
    return result.scalars().all()

@router.get("/banners", response_model=list[BannerOut])
async def get_active_banners(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Banner).where(Banner.active.is_(True)).order_by(Banner.position))
    return result.scalars().all()

@router.get("/products", response_model=list[ProductOut])
async def get_active_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.active.is_(True)).order_by(Product.sort_order))
    return result.scalars().all()

@router.get("/settings/public", response_model=dict)
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    keys = ["urgency_message", "labor_warranty_months", "whatsapp_number", "about_image_url"]
    result = await db.execute(select(Setting).where(Setting.key.in_(keys)))
    settings = {s.key: s.value for s in result.scalars().all()}

    installed_count_result = await db.execute(
        select(func.count()).select_from(Order).where(Order.status == "instalado")
    )
    installed_count = installed_count_result.scalar_one()

    return {
        "urgency_message": settings.get("urgency_message", ""),
        "labor_warranty_months": settings.get("labor_warranty_months", "[DEFINIR]"),
        "whatsapp_number": settings.get("whatsapp_number", "[COMPLETAR]"),
        "about_image_url": settings.get("about_image_url", "/images/tecnico-default.svg"),
        "installed_count": installed_count,
    }
