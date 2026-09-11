from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models.combo import Combo
from app.models.brand import Brand
from app.models.user import User
from app.routers.admin_auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from app.services.uploads import store_public_image

router = APIRouter()

class ComboAdminOut(BaseModel):
    id: int
    brand_id: int
    brand_name: Optional[str] = None
    name: Optional[str] = None
    mode: str
    resolution: str
    cameras_count: int
    equipment_price: Decimal
    install_fee: Optional[Decimal] = None
    final_price: Optional[Decimal] = None
    is_bestseller: bool
    is_budget: bool
    level: Optional[str] = None
    warranty_text: str
    image_url: Optional[str] = None
    active: bool
    specs: Optional[dict] = None
    storage_options: Optional[dict] = None
    install_complexity: Optional[str] = None
    included_items: Optional[list] = None
    categoria: Optional[str] = None
    instalacion_incluida: bool
    ganancia: Optional[Decimal] = None
    link: Optional[str] = None

    class Config:
        from_attributes = True

class ComboAdminUpdate(BaseModel):
    name: Optional[str] = None
    mode: Optional[str] = None
    resolution: Optional[str] = None
    cameras_count: Optional[int] = None
    equipment_price: Optional[Decimal] = None
    install_fee: Optional[Decimal] = None
    is_bestseller: Optional[bool] = None
    is_budget: Optional[bool] = None
    level: Optional[str] = None
    warranty_text: Optional[str] = None
    active: Optional[bool] = None
    specs: Optional[dict] = None
    storage_options: Optional[dict] = None
    install_complexity: Optional[str] = None
    included_items: Optional[list] = None
    categoria: Optional[str] = None
    instalacion_incluida: Optional[bool] = None
    ganancia: Optional[Decimal] = None
    link: Optional[str] = None

@router.get("/combos-admin", response_model=list[ComboAdminOut])
async def get_combos_admin(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Combo).options(joinedload(Combo.brand)).order_by(Combo.id)
    )
    combos = result.unique().scalars().all()
    output = []
    for c in combos:
        fee = c.install_fee or Decimal("0")
        final_price = c.equipment_price + (fee * c.cameras_count)
        output.append(ComboAdminOut(
            id=c.id, brand_id=c.brand_id, brand_name=c.brand.name if c.brand else None,
            name=c.name, mode=c.mode, resolution=c.resolution, cameras_count=c.cameras_count,
            equipment_price=c.equipment_price, install_fee=fee, final_price=final_price,
            is_bestseller=c.is_bestseller, is_budget=c.is_budget, level=c.level,
            warranty_text=c.warranty_text, image_url=c.image_url, active=c.active,
            specs=c.specs, storage_options=c.storage_options, install_complexity=c.install_complexity,
            included_items=c.included_items, categoria=c.categoria,
            instalacion_incluida=c.instalacion_incluida if hasattr(c, 'instalacion_incluida') else True,
            ganancia=c.ganancia, link=c.link,
        ))
    return output

@router.put("/combos-admin/{combo_id}", response_model=ComboAdminOut)
async def update_combo_admin(
    combo_id: int, data: ComboAdminUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Combo).options(joinedload(Combo.brand)).where(Combo.id == combo_id))
    c = result.unique().scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Combo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    await db.commit()
    await db.refresh(c)
    fee = c.install_fee or Decimal("0")
    final_price = c.equipment_price + (fee * c.cameras_count)
    return ComboAdminOut(
        id=c.id, brand_id=c.brand_id, brand_name=c.brand.name if c.brand else None,
        name=c.name, mode=c.mode, resolution=c.resolution, cameras_count=c.cameras_count,
        equipment_price=c.equipment_price, install_fee=fee, final_price=final_price,
        is_bestseller=c.is_bestseller, is_budget=c.is_budget, level=c.level,
        warranty_text=c.warranty_text, image_url=c.image_url, active=c.active,
        specs=c.specs, storage_options=c.storage_options, install_complexity=c.install_complexity,
        included_items=c.included_items, categoria=c.categoria,
        instalacion_incluida=c.instalacion_incluida if hasattr(c, 'instalacion_incluida') else True,
        ganancia=c.ganancia, link=c.link,
    )

@router.post("/combos-admin/{combo_id}/upload-image")
async def upload_combo_image(
    combo_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Combo).options(joinedload(Combo.brand)).where(Combo.id == combo_id))
    c = result.unique().scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Combo no encontrado")
    brand_slug = c.brand.slug if c.brand else "unknown"
    c.image_url = await store_public_image(file, f"catalog/{brand_slug}/combos", f"combo_{combo_id}")
    await db.commit()
    return {"image_url": c.image_url}

@router.post("/combos-admin", response_model=ComboAdminOut)
async def create_combo_admin(
    name: str,
    brand_id: int,
    mode: str = "cableado",
    resolution: str = "2MP",
    cameras_count: int = 4,
    equipment_price: Decimal = Decimal("0"),
    install_fee: Optional[Decimal] = None,
    level: Optional[str] = None,
    categoria: str = "Combo",
    instalacion_incluida: bool = True,
    ganancia: Optional[Decimal] = None,
    link: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    combo = Combo(
        name=name, brand_id=brand_id, mode=mode, resolution=resolution,
        cameras_count=cameras_count, equipment_price=equipment_price,
        install_fee=install_fee, level=level, categoria=categoria,
        instalacion_incluida=instalacion_incluida, ganancia=ganancia, link=link,
    )
    db.add(combo)
    await db.commit()
    await db.refresh(combo)
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    fee = combo.install_fee or Decimal("0")
    final_price = combo.equipment_price + (fee * combo.cameras_count)
    return ComboAdminOut(
        id=combo.id, brand_id=combo.brand_id, brand_name=brand.name if brand else None,
        name=combo.name, mode=combo.mode, resolution=combo.resolution,
        cameras_count=combo.cameras_count, equipment_price=combo.equipment_price,
        install_fee=fee, final_price=final_price,
        is_bestseller=combo.is_bestseller, is_budget=combo.is_budget, level=combo.level,
        warranty_text=combo.warranty_text, image_url=combo.image_url, active=combo.active,
        specs=combo.specs, storage_options=combo.storage_options,
        install_complexity=combo.install_complexity, included_items=combo.included_items,
        categoria=combo.categoria, instalacion_incluida=combo.instalacion_incluida,
        ganancia=combo.ganancia, link=combo.link,
    )

@router.delete("/combos-admin/{combo_id}")
async def delete_combo_admin(
    combo_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Combo).where(Combo.id == combo_id))
    combo = result.scalar_one_or_none()
    if not combo:
        raise HTTPException(status_code=404, detail="Combo no encontrado")
    await db.delete(combo)
    await db.commit()
    return {"ok": True}
