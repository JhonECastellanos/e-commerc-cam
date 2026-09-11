from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.social_link import SocialLink
from app.models.user import User
from app.routers.admin_auth import get_current_user
from app.schemas import SocialLinkOut, SocialLinkUpdate, SocialLinkCreate

router = APIRouter()

@router.get("/social-links", response_model=list[SocialLinkOut])
async def get_social_links_admin(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(SocialLink).order_by(SocialLink.sort_order))
    return result.scalars().all()

@router.post("/social-links", response_model=SocialLinkOut)
async def create_social_link(
    data: SocialLinkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    link = SocialLink(**data.model_dump())
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link

@router.put("/social-links/{link_id}", response_model=SocialLinkOut)
async def update_social_link(
    link_id: int, data: SocialLinkUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(SocialLink).where(SocialLink.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Enlace no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(link, field, value)

    await db.commit()
    await db.refresh(link)
    return link

@router.delete("/social-links/{link_id}")
async def delete_social_link(link_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(SocialLink).where(SocialLink.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Enlace no encontrado")

    await db.delete(link)
    await db.commit()
    return {"status": "ok"}
