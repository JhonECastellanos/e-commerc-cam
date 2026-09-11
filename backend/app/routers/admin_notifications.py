from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.routers.admin_auth import get_current_user
from app.schemas import NotificationOut

router = APIRouter()

@router.get("/notifications", response_model=dict)
async def get_notifications(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Notification).order_by(Notification.created_at.desc()).limit(50)
    )
    notifications = result.scalars().all()

    unread_count = await db.execute(
        select(func.count(Notification.id)).where(Notification.read.is_(False))
    )

    return {
        "items": [NotificationOut.model_validate(n) for n in notifications],
        "unread_count": unread_count.scalar(),
    }

@router.put("/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if not notification:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    notification.read = True
    await db.commit()
    await db.refresh(notification)
    return notification

@router.put("/notifications/read-all")
async def mark_all_read(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await db.execute(
        Notification.__table__.update().where(Notification.read.is_(False)).values(read=True)
    )
    await db.commit()
    return {"status": "ok"}
