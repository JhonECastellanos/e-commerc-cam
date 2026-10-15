from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.business import BusinessConfig
from app.routers.admin_auth import get_current_user
from app.services.demo_media import public_demo_media
from app.services.uploads import store_banner_video, store_public_image

router = APIRouter()
Demo = Literal["house", "apartment", "functions", "recording"]


class MediaUpdate(BaseModel):
    image_url: str = Field(max_length=500)
    video_url: str = Field(max_length=500)


async def persist(db, ident, payload):
    key = "media_" + ident
    row = await db.get(BusinessConfig, key)
    if not row:
        row = BusinessConfig(key=key, payload={})
        db.add(row)
    row.payload = {**row.payload, **payload}
    await db.commit()
    return (await public_demo_media(db))[ident]


@router.get("/media/demos")
async def get_media(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return await public_demo_media(db)


@router.put("/media/demos/{ident}")
async def update_media(ident: Demo, data: MediaUpdate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    for value in (data.image_url, data.video_url):
        if value and (not value.startswith(("/banner-assets/", "/images/", "/catalogo/", "/api/uploads/", "https://")) or "\\" in value):
            raise HTTPException(422, "Usa un recurso local público o una URL HTTPS")
    return await persist(db, ident, data.model_dump())


@router.post("/media/demos/{ident}/{kind}")
async def upload_media(ident: Demo, kind: Literal["image", "video"], file: UploadFile = File(...), db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    if kind == "image":
        url = await store_public_image(file, "banners/demos", ident)
    else:
        url = await store_banner_video(file, ident)
    return await persist(db, ident, {"image_url" if kind == "image" else "video_url": url})
