from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models.brand import Brand
from app.models.combo import Combo
from app.models.price_change_log import PriceChangeLog
from app.models.setting import Setting
from app.models.user import User
from app.routers.admin_auth import get_current_user
from app.schemas import BrandOut, BrandUpdate, ComboOut, ComboUpdate, SettingOut, SettingUpdate, PriceChangeLogOut
from app.routers.ws import notify_clients
from app.services.uploads import store_public_image

router = APIRouter()

async def log_change(db: AsyncSession, user_id: int, entity_type: str, entity_id: int,
                     field_name: str, old_value, new_value):
    log = PriceChangeLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
    )
    db.add(log)

@router.get("/prices/brands", response_model=list[BrandOut])
async def get_brands_admin(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Brand).order_by(Brand.sort_order))
    return result.scalars().all()

@router.post("/prices/brands/{brand_id}/upload-logo")
async def upload_brand_logo(
    brand_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    brand.logo_url = await store_public_image(file, "marcas", f"brand_{brand_id}")
    await db.commit()
    return {"logo_url": brand.logo_url}

@router.put("/prices/brands/{brand_id}", response_model=BrandOut)
async def update_brand(
    brand_id: int, data: BrandUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Marca no encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        old = getattr(brand, field)
        if old != value:
            await log_change(db, user.id, "brand", brand_id, field, old, value)
            setattr(brand, field, value)

    await db.commit()
    await db.refresh(brand)
    await notify_clients()
    return brand

@router.get("/prices/combos", response_model=list[ComboOut])
async def get_combos_admin(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Combo).options(joinedload(Combo.brand)).order_by(Combo.brand_id, Combo.mode, Combo.resolution)
    )
    combos = result.unique().scalars().all()

    output = []
    for c in combos:
        from decimal import Decimal
        if c.install_fee is not None:
            fee = Decimal(str(c.install_fee))
        else:
            fee_key = "install_fee_per_camera_wireless" if c.mode == "inalambrico" else "install_fee_per_camera"
            fee_result = await db.execute(select(Setting).where(Setting.key == fee_key))
            fee_setting = fee_result.scalar_one_or_none()
            fee = Decimal(fee_setting.value) if fee_setting else (Decimal("50000") if c.mode == "inalambrico" else Decimal("75000"))
        final_price = c.equipment_price + (fee * c.cameras_count)
        output.append(ComboOut(
            id=c.id,
            brand_id=c.brand_id,
            brand_name=c.brand.name if c.brand else None,
            mode=c.mode,
            resolution=c.resolution,
            cameras_count=c.cameras_count,
            equipment_price=c.equipment_price,
            final_price=final_price,
            install_fee=fee,
            is_bestseller=c.is_bestseller,
            is_budget=c.is_budget,
            warranty_text=c.warranty_text,
            image_url=c.image_url,
            specs=c.specs,
            storage_options=c.storage_options,
            install_complexity=c.install_complexity,
            included_items=c.included_items,
            active=c.active,
        ))
    return output

@router.put("/prices/combos/{combo_id}", response_model=ComboOut)
async def update_combo(
    combo_id: int, data: ComboUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Combo).options(joinedload(Combo.brand)).where(Combo.id == combo_id)
    )
    combo = result.unique().scalar_one_or_none()
    if not combo:
        raise HTTPException(status_code=404, detail="Combo no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        old = getattr(combo, field)
        if old != value:
            await log_change(db, user.id, "combo", combo_id, field, old, value)
            setattr(combo, field, value)

    await db.commit()
    await db.refresh(combo)

    from decimal import Decimal
    if combo.install_fee is not None:
        fee = Decimal(str(combo.install_fee))
    else:
        fee_key = "install_fee_per_camera_wireless" if combo.mode == "inalambrico" else "install_fee_per_camera"
        install_result = await db.execute(select(Setting).where(Setting.key == fee_key))
        install_setting = install_result.scalar_one_or_none()
        fee = Decimal(install_setting.value) if install_setting else (Decimal("50000") if combo.mode == "inalambrico" else Decimal("75000"))
    final_price = combo.equipment_price + (fee * combo.cameras_count)

    return ComboOut(
        id=combo.id,
        brand_id=combo.brand_id,
        brand_name=combo.brand.name if combo.brand else None,
        mode=combo.mode,
        resolution=combo.resolution,
        cameras_count=combo.cameras_count,
        equipment_price=combo.equipment_price,
        final_price=final_price,
        install_fee=fee,
        is_bestseller=combo.is_bestseller,
        is_budget=combo.is_budget,
        warranty_text=combo.warranty_text,
        image_url=combo.image_url,
        specs=combo.specs,
        storage_options=combo.storage_options,
        install_complexity=combo.install_complexity,
        included_items=combo.included_items,
        active=combo.active,
    )

@router.get("/prices/settings", response_model=list[SettingOut])
async def get_settings(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Setting).order_by(Setting.key))
    return result.scalars().all()

@router.put("/prices/settings/{key}", response_model=SettingOut)
async def update_setting(
    key: str, data: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")

    old_value = setting.value
    if old_value != data.value:
        await log_change(db, user.id, "setting", setting.id, key, old_value, data.value)
        setting.value = data.value

    await db.commit()
    await db.refresh(setting)
    await notify_clients()
    return setting

@router.post("/prices/combos/{combo_id}/upload-image")
async def upload_combo_image(
    combo_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Combo).where(Combo.id == combo_id))
    combo = result.scalar_one_or_none()
    if not combo:
        raise HTTPException(status_code=404, detail="Combo no encontrado")

    image_url = await store_public_image(file, "catalog", f"combo_{combo_id}")
    combo.image_url = image_url
    await db.commit()

    return {"image_url": image_url}

@router.get("/prices/changelog", response_model=list[PriceChangeLogOut])
async def get_changelog(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(PriceChangeLog)
        .order_by(PriceChangeLog.created_at.desc())
        .limit(100)
    )
    logs = result.scalars().all()
    output = []
    for log in logs:
        user_result = await db.execute(select(User).where(User.id == log.user_id))
        u = user_result.scalar_one_or_none()
        output.append(PriceChangeLogOut(
            id=log.id,
            user_id=log.user_id,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            field_name=log.field_name,
            old_value=log.old_value,
            new_value=log.new_value,
            created_at=log.created_at,
            user_name=u.name if u else None,
        ))
    return output

@router.post("/upload-about-image")
async def upload_about_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    image_url = await store_public_image(file, "equipo", "about_tecnico")
    result = await db.execute(select(Setting).where(Setting.key == "about_image_url"))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = image_url
        await db.commit()
        await notify_clients()
    return {"image_url": image_url}
