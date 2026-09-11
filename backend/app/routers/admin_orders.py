from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models.combo import Combo
from app.models.order import Order
from app.models.user import User
from app.models.notification import Notification
from app.routers.admin_auth import get_current_user
from app.schemas import OrderOut, OrderStatusUpdate

router = APIRouter()

@router.get("/orders", response_model=dict)
async def get_orders(
    status: str = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Order).options(joinedload(Order.combo).joinedload(Combo.brand))
    if status:
        query = query.where(Order.status == status)
    query = query.order_by(Order.created_at.desc())

    count_query = select(func.count()).select_from(Order)
    if status:
        count_query = count_query.where(Order.status == status)
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    orders = result.unique().scalars().all()

    return {
        "items": [OrderOut.model_validate(o) for o in orders],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if total else 0,
    }

@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(joinedload(Order.combo).joinedload(Combo.brand)).where(Order.id == order_id)
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return order

@router.put("/orders/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: int, data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order).options(joinedload(Order.combo).joinedload(Combo.brand)).where(Order.id == order_id)
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    valid_statuses = ["cotizacion", "reservado", "pagado", "instalado", "cancelado"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Válidos: {', '.join(valid_statuses)}")

    if data.status == "instalado" and order.status != "instalado":
        notification = Notification(
            type="system",
            title="Instalación completada",
            message=f"Instalación completada para orden {order.reference}",
            order_id=order.id,
            read=False,
        )
        db.add(notification)

    order.status = data.status
    await db.commit()
    await db.refresh(order)

    result2 = await db.execute(
        select(Order).options(joinedload(Order.combo).joinedload(Combo.brand)).where(Order.id == order.id)
    )
    order = result2.unique().scalar_one_or_none()
    return order
