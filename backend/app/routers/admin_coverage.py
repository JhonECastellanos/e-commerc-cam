from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.coverage_area import CoverageArea
from app.models.user import User
from app.routers.admin_auth import get_current_user
from app.schemas import CoverageAreaOut, CoverageAreaCreate

router = APIRouter()

@router.get("/coverage-areas", response_model=list[CoverageAreaOut])
async def get_coverage_admin(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(CoverageArea).order_by(CoverageArea.name))
    return result.scalars().all()

@router.post("/coverage-areas", response_model=CoverageAreaOut)
async def create_coverage(
    data: CoverageAreaCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.execute(select(CoverageArea).where(CoverageArea.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este municipio ya existe")

    area = CoverageArea(name=data.name, active=True)
    db.add(area)
    await db.commit()
    await db.refresh(area)
    return area

@router.put("/coverage-areas/{area_id}", response_model=CoverageAreaOut)
async def toggle_coverage(
    area_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(CoverageArea).where(CoverageArea.id == area_id))
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Municipio no encontrado")

    area.active = not area.active
    await db.commit()
    await db.refresh(area)
    return area

@router.delete("/coverage-areas/{area_id}")
async def delete_coverage(area_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(CoverageArea).where(CoverageArea.id == area_id))
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Municipio no encontrado")

    await db.delete(area)
    await db.commit()
    return {"status": "ok"}
