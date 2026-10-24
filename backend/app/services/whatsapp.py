import httpx
from app.config import settings

def generar_wa_me_link(numero: str, texto: str) -> str:
    import urllib.parse
    num_limpio = numero.replace("+", "").replace(" ", "").replace("-", "")
    texto_encoded = urllib.parse.quote(texto)
    return f"https://wa.me/{num_limpio}?text={texto_encoded}"

async def enviar_notificacion_whatsapp(destino: str, mensaje: str):
    provider = settings.whatsapp_provider
    if provider == "off":
        return {"status": "disabled", "link": generar_wa_me_link(destino, mensaje)}

    if provider == "evolution":
        if not settings.evolution_api_url:
            return {"status": "error", "message": "EVOLUTION_API_URL no configurada"}
        async with httpx.AsyncClient(timeout=10) as client:
            payload = {
                "number": destino,
                "text": mensaje,
            }
            headers = {
                "apikey": settings.evolution_api_key or "",
                "Content-Type": "application/json",
            }
            resp = await client.post(
                f"{settings.evolution_api_url}/message/sendText",
                json=payload,
                headers=headers,
            )
            return {"status": "sent" if resp.is_success else "error", "response": resp.text}

    if provider == "cloud_api":
        return {"status": "not_implemented", "message": "WhatsApp Cloud API pendiente de configuración"}

    return {"status": "unknown_provider"}
