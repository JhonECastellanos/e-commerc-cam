from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone
from app.database import get_db
from app.models.order import Order
from app.models.combo import Combo
from app.models.user import User
from app.routers.admin_auth import get_current_user
from app.schemas import DashboardOut

router = APIRouter()

@router.get("/dashboard", response_model=DashboardOut)
async def get_dashboard(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    month_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status.in_(["reservado", "pagado", "instalado"]), Order.created_at >= first_of_month)
    )
    total_sales_month = month_result.scalar()

    all_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status.in_(["reservado", "pagado", "instalado"]))
    )
    total_sales_all = all_result.scalar()

    status_counts = await db.execute(
        select(Order.status, func.count(Order.id))
        .group_by(Order.status)
    )
    orders_by_status = {row[0]: row[1] for row in status_counts.all()}

    brand_sales = await db.execute(
        select(Combo.brand_id, func.sum(Order.total))
        .join(Order, Order.combo_id == Combo.id)
        .where(Order.status.in_(["reservado", "pagado", "instalado"]))
        .group_by(Combo.brand_id)
        .order_by(func.sum(Order.total).desc())
        .limit(10)
    )
    sales_by_brand = [{"brand_id": row[0], "total": float(row[1])} for row in brand_sales.all()]

    mode_sales = await db.execute(
        select(Combo.mode, func.sum(Order.total))
        .join(Order, Order.combo_id == Combo.id)
        .where(Order.status.in_(["reservado", "pagado", "instalado"]))
        .group_by(Combo.mode)
        .order_by(func.sum(Order.total).desc())
    )
    sales_by_mode = [{"mode": row[0], "total": float(row[1])} for row in mode_sales.all()]

    top_combos_raw = await db.execute(
        select(Combo.id, Combo.cameras_count, Combo.mode, Combo.resolution, func.count(Order.id).label("total_orders"))
        .join(Order, Order.combo_id == Combo.id)
        .where(Order.status.in_(["reservado", "pagado", "instalado"]))
        .group_by(Combo.id)
        .order_by(func.count(Order.id).desc())
        .limit(10)
    )
    top_combos = []
    for row in top_combos_raw.all():
        brand_result = await db.execute(
            select(Combo).options(joinedload(Combo.brand)).where(Combo.id == row.id)
        )
        c = brand_result.unique().scalar_one_or_none()
        top_combos.append({
            "combo_id": row.id,
            "cameras_count": row.cameras_count,
            "mode": row.mode,
            "resolution": row.resolution,
            "brand_name": c.brand.name if c and c.brand else "N/A",
            "total_orders": row.total_orders,
        })

    avg_result = await db.execute(
        select(func.coalesce(func.avg(Order.total), 0))
        .where(Order.status.in_(["reservado", "pagado", "instalado"]))
    )
    avg_ticket = avg_result.scalar()

    top_muni = await db.execute(
        select(Order.municipality, func.count(Order.id))
        .group_by(Order.municipality)
        .order_by(func.count(Order.id).desc())
        .limit(10)
    )
    top_municipalities = [{"municipality": row[0], "count": row[1]} for row in top_muni.all()]

    installed_result = await db.execute(
        select(func.count(Order.id)).where(Order.status == "instalado")
    )
    installed_count = installed_result.scalar()

    return DashboardOut(
        total_sales_month=total_sales_month,
        total_sales_all=total_sales_all,
        orders_by_status=orders_by_status,
        sales_by_brand=sales_by_brand,
        sales_by_mode=sales_by_mode,
        top_combos=top_combos,
        avg_ticket=avg_ticket,
        top_municipalities=top_municipalities,
        installed_count=installed_count,
    )
