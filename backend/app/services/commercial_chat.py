import hashlib
import re
import secrets
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, update
from app.config import settings

from app.models.business import ChatMessage, Conversation
from app.services.agenda import ZONE, book, slots, utc
from app.services.business_agent import ai_config, catalogue, completion

BUSINESS = re.compile(r"instalac[aá]mara|c[aá]mara|cctv|seguridad|dom[oó]tica|inteligente|instalaci[oó]n|cotiz|combo|videovigilancia|sensor|servidor|iluminaci[oó]n|reuni[oó]n|agenda|horario|precio|asesor|producto|vivienda|casa|apartamento|hola|buen[oa]s", re.I)
DENIED = re.compile(r"ignora.{0,30}instrucci|system prompt|prompt del sistema|contrase[nñ]a|api.?key|borra|elimina|modifica.{0,30}(precio|producto|cat[aá]logo)|sql|ejecuta|token secreto|administrador", re.I)
OPTIN = re.compile(r"instalac[aá]mara|cotiz.{0,30}(c[aá]mara|cctv|dom[oó]tica)|combo.{0,20}c[aá]mara", re.I)


async def new_conversation(db, channel="web", contact=None, name="Visitante"):
    token = secrets.token_urlsafe(32)
    row = Conversation(id=str(uuid4()), channel=channel, contact=contact, name=name[:120], token_hash=hashlib.sha256(token.encode()).hexdigest())
    db.add(row)
    await db.commit()
    return row, token


async def history(db, ident):
    rows = (await db.execute(select(ChatMessage).where(ChatMessage.conversation_id == ident).order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc()).limit(60))).scalars().all()
    return [{"id": r.id, "role": r.role, "body": r.body, "delivery": r.delivery, "created_at": utc(r.created_at).isoformat()} for r in reversed(rows)]


async def answer(db, conversation, text):
    text = text.strip()
    normalized = text.casefold()
    if normalized in {"baja", "stop", "salir"}:
        conversation.paused = True
        conversation.state = {"opted_out": True}
        await db.execute(update(ChatMessage).where(ChatMessage.conversation_id == conversation.id, ChatMessage.role == "assistant", ChatMessage.delivery == "pending").values(delivery="cancelled"))
        await db.commit()
        return "Las respuestas automáticas quedaron desactivadas. Puedes escribirnos directamente para hablar con un asesor."
    if normalized in {"asesor", "humano", "hablar con asesor"}:
        conversation.paused = True
        await db.execute(update(ChatMessage).where(ChatMessage.conversation_id == conversation.id, ChatMessage.role == "assistant", ChatMessage.delivery == "pending").values(delivery="cancelled"))
        await db.commit()
        return "Tu conversación quedó pendiente para un asesor. Puedes reservar una reunión desde la sección Agenda de nuestra página."
    if conversation.paused:
        return None
    if DENIED.search(text):
        return "Puedo orientarte sobre cámaras, domótica y reuniones. Los cambios del aplicativo se gestionan únicamente desde administración."
    state = conversation.state or {}
    if normalized == "acepto ia":
        conversation.state = {**state, "ai_consent": True, "consent_version": "commercial-chat-v1", "consent_at": datetime.now(ZONE).isoformat()}
        await db.commit()
        return "Autorización registrada. ¿Buscas cámaras con instalación o una casa inteligente? Evita enviar datos sensibles. Puedes escribir ASESOR o BAJA en cualquier momento."
    if normalized == "confirmar" and state.get("chosen"):
        chosen = state["chosen"]
        result = await book(db, {"name": conversation.name, "contact": conversation.contact or "Contacto en chat web", "kind": state["kind"], "starts_at": chosen["starts_at"], "consent": True}, "chat-" + conversation.id + "-" + chosen["starts_at"], source=conversation.channel)
        message = f"Reunión confirmada: {chosen['label']}, hora de Colombia. Referencia {result['id']}. Conserva esta conversación. Si necesitas cambiarla, escribe ASESOR."
        conversation.state = {**{key: value for key, value in state.items() if key.startswith("ai_") or key.startswith("consent_")}, "last_confirmation": message}
        await db.commit()
        return message
    if normalized == "confirmar" and state.get("last_confirmation"):
        return state["last_confirmation"]
    if text.isdigit() and state.get("offered"):
        index = int(text) - 1
        if 0 <= index < len(state["offered"]):
            chosen = state["offered"][index]
            conversation.state = {**state, "kind": state["kind"], "chosen": chosen}
            await db.commit()
            return f"Elegiste {chosen['label']}, hora de Colombia. Escribe CONFIRMAR para reservar y autorizar que usemos tu nombre y contacto para gestionar la reunión. Consulta nuestra política de datos en /privacidad."
    if "agenda" in normalized or "reuni" in normalized or "horario" in normalized:
        if conversation.channel == "web":
            return "Reserva en /agenda: reuniones CCTV de 30 minutos y casa inteligente de 1 hora, hora de Colombia. El formulario muestra los horarios vigentes y la disponibilidad real."
        kind = "smart_home_meeting" if any(x in normalized for x in ["domót", "domot", "inteligente", "servidor"]) else "cctv_meeting"
        offered = []
        for offset in range(4):
            day = datetime.now(ZONE).date() + timedelta(days=offset)
            free = (await slots(db, day, kind))["slots"]
            for slot in free[:3 - len(offered)]:
                offered.append({**slot, "label": day.strftime("%d/%m/%Y") + " " + slot["label"]})
            if len(offered) == 3:
                break
        conversation.state = {**state, "kind": kind, "offered": offered}
        await db.commit()
        if not offered:
            return "No hay horarios disponibles en los próximos días. Escribe ASESOR para coordinar."
        return "Horarios disponibles (Colombia). Responde con el número:\n" + "\n".join(f"{i+1}. {s['label']}" for i, s in enumerate(offered))
    if not BUSINESS.search(text):
        return "Te puedo ayudar con cámaras, combos CCTV, instalación y casa inteligente. ¿Qué espacio necesitas proteger?"
    try:
        cfg = await ai_config(db)
        if conversation.channel == "whatsapp" and cfg["enabled"] and cfg["public_enabled"] and not state.get("ai_consent"):
            return "Soy el asistente comercial de InstalaCámara. Puedo orientarte y reservar reuniones. Para usar IA, escribe ACEPTO IA: se enviarán tus mensajes al proveedor configurado para responder con nuestro catálogo. Evita datos sensibles. Consulta /privacidad; también puedes escribir AGENDAR REUNIÓN CCTV, AGENDAR REUNIÓN CASA INTELIGENTE o ASESOR sin activar IA."
        previous = await history(db, conversation.id)
        response = await completion(db, [{"role": "assistant" if m["role"] in {"assistant", "admin"} else "user", "content": m["body"]} for m in previous][-10:] + [{"role": "user", "content": text}])
        if response:
            return response
    except HTTPException:
        pass  # A provider outage never disables the commercial handoff.
    if any(x in normalized for x in ["precio", "combo", "catálogo", "catalogo", "producto"]):
        offers = [r for r in await catalogue(db) if r["type"] == "combo"][:5]
        return "Puedes comparar las fichas y precios vigentes en /catalogo.\n" + "\n".join(r["name"] for r in offers) + "\n¿Cuántas áreas necesitas cubrir y son interiores o exteriores? Escribe AGENDAR REUNIÓN CCTV o AGENDAR REUNIÓN CASA INTELIGENTE para consultar horarios."
    if any(x in normalized for x in ["inteligente", "domót", "domot", "servidor"]):
        return "Ofrecemos software propio para coordinar dispositivos, asesoría e IA local con servidor opcional. La instalación y el mantenimiento se cotizan según el proyecto. Puedes probar las demos en Casa inteligente. Escribe AGENDAR REUNIÓN CASA INTELIGENTE para una reunión de una hora."
    return "Hola, soy el asistente comercial de InstalaCámara. ¿Buscas cámaras con instalación o una casa inteligente? Dime el tipo de inmueble, las áreas y si ya tienes equipos. Puedes escribir AGENDAR REUNIÓN CCTV (30 minutos), AGENDAR REUNIÓN CASA INTELIGENTE (1 hora) o ASESOR."


async def receive(db, row, text, message_id):
    existing = await db.get(ChatMessage, message_id)
    if existing:
        if existing.body != text[:2000] or existing.conversation_id != row.id:
            raise HTTPException(409, "La clave de envío corresponde a otro mensaje")
        if existing.delivery != "processing":
            return await history(db, row.id)
    if not existing and row.channel == "web" and len((await db.execute(select(ChatMessage.id).where(ChatMessage.conversation_id == row.id).limit(100))).all()) >= 100:
        raise HTTPException(429, "Continúa con un asesor o abre una nueva conversación")
    incoming = existing or ChatMessage(id=message_id, conversation_id=row.id, role="user", body=text[:2000], delivery="processing")
    if not existing:
        db.add(incoming)
        await db.commit()
    try:
        response = await answer(db, row, text)
    except HTTPException as exc:
        response = str(exc.detail)
    await db.refresh(row)
    control = text.casefold().strip() in {"baja", "stop", "salir", "asesor", "humano", "hablar con asesor"}
    if row.paused and not control:
        response = None
    if response:
        if row.channel == "whatsapp":
            origin = next((url for url in settings.cors_origins if url.startswith('https://')), '')
            if origin:
                response = re.sub(r'(?<![\w:/])/(agenda|privacidad|catalogo)\b', lambda match: origin + match.group(0), response)
        delivery = "pending_control" if control else "pending"
        db.add(ChatMessage(id=hashlib.sha256((message_id+':answer').encode()).hexdigest(), conversation_id=row.id, role="assistant", body=response, delivery=delivery if row.channel == "whatsapp" else "local"))
    incoming.delivery = "processed"
    await db.commit()
    return await history(db, row.id)
