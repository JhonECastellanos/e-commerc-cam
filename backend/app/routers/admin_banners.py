import os
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.banner import Banner
from app.models.user import User
from app.routers.admin_auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from app.services.uploads import store_public_image

UPLOAD_BASE = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")

router = APIRouter()

class BannerOut(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    image_url: str
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    position: int
    active: bool

    class Config:
        from_attributes = True

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    position: Optional[int] = None
    active: Optional[bool] = None

class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    image_url: str = ""
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    position: int = 1

@router.get("/banners", response_model=list[BannerOut])
async def get_banners(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Banner).order_by(Banner.position))
    return result.scalars().all()

@router.put("/banners/{banner_id}", response_model=BannerOut)
async def update_banner(
    banner_id: int, data: BannerUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(banner, field, value)
    await db.commit()
    await db.refresh(banner)
    return banner

@router.post("/banners", response_model=BannerOut)
async def create_banner(
    data: BannerCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    banner = Banner(
        title=data.title,
        subtitle=data.subtitle,
        image_url=data.image_url or "",
        video_url=data.video_url,
        link_url=data.link_url,
        position=data.position,
    )
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner

@router.post("/banners/with-image", response_model=BannerOut)
async def create_banner_with_image(
    title: str = Form(...),
    position: int = Form(...),
    subtitle: Optional[str] = Form(None),
    video_url: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    image_url = await store_public_image(file, "banners", "banner")
    banner = Banner(title=title, subtitle=subtitle, image_url=image_url, video_url=video_url, link_url=link_url, position=position)
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner

@router.post("/banners/{banner_id}/upload")
async def upload_banner_image(
    banner_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    banner.image_url = await store_public_image(file, "banners", f"banner_{banner.id}")
    await db.commit()
    return {"image_url": banner.image_url}

@router.delete("/banners/{banner_id}")
async def delete_banner(
    banner_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    await db.delete(banner)
    await db.commit()
    return {"ok": True}
