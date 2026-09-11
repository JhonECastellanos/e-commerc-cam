from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models.product import Product
from app.models.brand import Brand
from app.models.user import User
from app.routers.admin_auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from app.services.uploads import store_public_image

router = APIRouter()

class ProductAdminOut(BaseModel):
    id: int
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    instalacion_price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    specs: Optional[dict] = None
    ganancia: Optional[float] = None
    link: Optional[str] = None
    active: bool
    sort_order: int

    class Config:
        from_attributes = True

class ProductAdminUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    instalacion_price: Optional[float] = None
    category: Optional[str] = None
    specs: Optional[dict] = None
    ganancia: Optional[float] = None
    link: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None
    brand_id: Optional[int] = None

@router.get("/products-admin", response_model=list[ProductAdminOut])
async def get_products_admin(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Product).options(joinedload(Product.brand)).order_by(Product.sort_order, Product.id)
    )
    products = result.unique().scalars().all()
    return [ProductAdminOut(
        id=p.id, brand_id=p.brand_id, brand_name=p.brand.name if p.brand else None,
        name=p.name, description=p.description, price=float(p.price) if p.price else None,
        instalacion_price=float(p.instalacion_price) if p.instalacion_price else None,
        image_url=p.image_url, category=p.category, specs=p.specs,
        ganancia=float(p.ganancia) if p.ganancia else None,
        link=p.link, active=p.active, sort_order=p.sort_order,
    ) for p in products]

@router.put("/products-admin/{product_id}", response_model=ProductAdminOut)
async def update_product_admin(
    product_id: int, data: ProductAdminUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Product).options(joinedload(Product.brand)).where(Product.id == product_id))
    p = result.unique().scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    await db.commit()
    await db.refresh(p)
    return ProductAdminOut(
        id=p.id, brand_id=p.brand_id, brand_name=p.brand.name if p.brand else None,
        name=p.name, description=p.description, price=float(p.price) if p.price else None,
        instalacion_price=float(p.instalacion_price) if p.instalacion_price else None,
        image_url=p.image_url, category=p.category, specs=p.specs,
        ganancia=float(p.ganancia) if p.ganancia else None,
        link=p.link, active=p.active, sort_order=p.sort_order,
    )

@router.post("/products-admin/{product_id}/upload-image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Product).options(joinedload(Product.brand)).where(Product.id == product_id))
    p = result.unique().scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    brand_slug = p.brand.slug if p.brand else "general"
    p.image_url = await store_public_image(file, f"catalog/{brand_slug}/productos", f"product_{product_id}")
    await db.commit()
    return {"image_url": p.image_url}

@router.post("/products-admin", response_model=ProductAdminOut)
async def create_product_admin(
    name: str,
    brand_id: Optional[int] = None,
    description: Optional[str] = None,
    price: Optional[float] = None,
    instalacion_price: Optional[float] = None,
    category: Optional[str] = None,
    ganancia: Optional[float] = None,
    link: Optional[str] = None,
    sort_order: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = Product(name=name, brand_id=brand_id, description=description,
                      price=price, instalacion_price=instalacion_price,
                      category=category, ganancia=ganancia, link=link, sort_order=sort_order)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    brand = None
    if brand_id:
        br = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = br.scalar_one_or_none()
    return ProductAdminOut(
        id=product.id, brand_id=product.brand_id, brand_name=brand.name if brand else None,
        name=product.name, description=product.description,
        price=float(product.price) if product.price else None,
        instalacion_price=float(product.instalacion_price) if product.instalacion_price else None,
        image_url=product.image_url, category=product.category, specs=product.specs,
        ganancia=float(product.ganancia) if product.ganancia else None,
        link=product.link, active=product.active, sort_order=product.sort_order,
    )

@router.delete("/products-admin/{product_id}")
async def delete_product_admin(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    await db.delete(product)
    await db.commit()
    return {"ok": True}
