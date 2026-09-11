from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.order import Order
from app.models.user import User
from app.models.setting import Setting
from app.routers.admin_auth import get_current_user
from app.services.whatsapp import generar_wa_me_link, enviar_notificacion_whatsapp
from app.config import settings

router = APIRouter()

@router.post("/whatsapp/notify")
async def whatsapp_notify(
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order_ref = data.get("order_reference", "")
    message_type = data.get("type", "confirmation")

    if not order_ref:
        return {"status": "error", "message": "order_reference requerido"}

    result = await db.execute(select(Order).where(Order.reference == order_ref))
    order = result.scalar_one_or_none()
    if not order:
        return {"status": "error", "message": "Orden no encontrada"}

    numero_result = await db.execute(select(Setting).where(Setting.key == "whatsapp_number"))
    numero_setting = numero_result.scalar_one_or_none()
    business_number = numero_setting.value if numero_setting else settings.whatsapp_number

    if message_type == "confirmation":
        mensaje = (
            f"Hola {order.customer_name}, gracias por apartar tu instalación con InstalaCámara. "
            f"Referencia: {order.reference}. "
            f"Anticipo recibido por ${order.deposit_50:,.0f}. "
            f"Saldo pendiente: ${order.balance_50:,.0f}. Pronto te contactaremos para agendar la instalación."
        )
    elif message_type == "reminder":
        mensaje = (
            f"Hola {order.customer_name}, recordatorio: tu instalación está agendada. "
            f"Ref: {order.reference}. Si tienes dudas, escríbenos."
        )
    else:
        mensaje = (
            f"Hola {order.customer_name}, tu orden {order.reference} ha sido actualizada. "
            f"Estado actual: {order.status}. Escríbenos si necesitas algo."
        )

    client_phone = order.customer_phone
    wa_link = generar_wa_me_link(client_phone, mensaje)

    result_data = {
        "wa_link": wa_link,
        "client_phone": client_phone,
        "business_phone": business_number,
    }

    if settings.whatsapp_provider != "off":
        auto_result = await enviar_notificacion_whatsapp(client_phone, mensaje)
        result_data["auto_send"] = auto_result

    return result_data
