import asyncio
import hashlib
import json
import secrets
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.business import AgentProposal, BusinessConfig, ChatMessage, Conversation
from app.routers.admin_auth import get_current_user
from app.security import enforce_rate_limit
from app.services.agent_tools import TOOLS, call_tool, confirm
from app.services.business_agent import ai_config, catalogue_csv, checked_url, cipher, completion
from app.services.commercial_chat import OPTIN, history, new_conversation, receive
from app.services.conversation_locks import conversation_lock

router = APIRouter()
incoming_lock = asyncio.Lock()


class TextIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=2000)


class AIConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool = False
    public_enabled: bool = False
    local: bool = False
    base_url: str = Field(default="", max_length=400)
    model: str = Field(default="", max_length=200)
    skill: str = Field(min_length=20, max_length=8000)
    api_key: str | None = Field(default=None, max_length=1000)
    clear_key: bool = False


async def gateway(method, path, payload=None):
    if not settings.whatsapp_gateway_token:
        raise HTTPException(409, "La conexión de WhatsApp no está configurada")
    try:
        async with httpx.AsyncClient(timeout=45, follow_redirects=False) as client:
            response = await client.request(method, settings.whatsapp_gateway_url.rstrip("/") + path, headers={"Authorization": "Bearer " + settings.whatsapp_gateway_token}, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        code = 503 if exc.response.status_code in {403, 429, 503} else 422 if exc.response.status_code == 422 else 502
        raise HTTPException(code, "WhatsApp no está listo o el destinatario no está disponible")
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "WhatsApp no está disponible. Comprueba la conexión desde este panel.")


@router.get("/admin/agent/config", dependencies=[Depends(get_current_user)])
async def get_config(db: AsyncSession = Depends(get_db)):
    return await ai_config(db)


@router.put("/admin/agent/config", dependencies=[Depends(get_current_user)])
async def save_config(data: AIConfig, db: AsyncSession = Depends(get_db)):
    if data.base_url:
        checked_url(data.base_url, data.local)
    if data.enabled and (not data.base_url or not data.model):
        raise HTTPException(422, "Selecciona URL y modelo antes de activar")
    row = await db.get(BusinessConfig, "ai")
    if not row:
        row = BusinessConfig(key="ai", payload={})
        db.add(row)
    row.payload = data.model_dump(exclude={"api_key", "clear_key"})
    if data.clear_key:
        row.secret = None
    elif data.api_key:
        row.secret = cipher().encrypt(data.api_key.encode()).decode()
    await db.commit()
    return await ai_config(db)


@router.get("/admin/agent/models", dependencies=[Depends(get_current_user)])
async def models(db: AsyncSession = Depends(get_db)):
    from app.services.business_agent import provider_models
    return await provider_models(db)


@router.get("/admin/agent/catalog.csv", dependencies=[Depends(get_current_user)])
async def csv_export(db: AsyncSession = Depends(get_db)):
    return Response("\ufeff" + await catalogue_csv(db), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": 'attachment; filename="instalacam-catalogo.csv"'})


@router.post("/admin/agent/chat")
async def admin_chat(data: TextIn, request: Request, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await enforce_rate_limit(request, "admin-agent", 15, 60)
    response = await completion(db, [{"role": "user", "content": data.text}], public=False)
    if response is None:
        return {"text": "Configura y activa un proveedor o modelo local en Conexión IA. Mientras tanto puedes usar las herramientas del panel y MCP autenticado."}
    try:
        parsed = json.loads(response)
    except (ValueError, TypeError):
        return {"text": response}
    if isinstance(parsed, dict) and parsed.get("tool") == "propose_update":
        return {"text": "He preparado una propuesta para tu revisión.", "proposal": await call_tool(db, user.id, "propose_update", parsed.get("arguments"))}
    return {"text": response}


@router.post("/admin/agent/tools/{name}")
async def tool(name: str, arguments: dict, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await call_tool(db, user.id, name, arguments)


@router.get("/admin/agent/proposals")
async def proposals(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(AgentProposal).where(AgentProposal.admin_id == user.id).order_by(AgentProposal.created_at.desc()).limit(50))).scalars()
    return [{"id": r.id, "arguments": r.arguments, "before": r.previous, "status": r.status, "expires_at": r.expires_at.isoformat()} for r in rows]


@router.post("/admin/agent/proposals/{ident}/confirm")
async def approve(ident: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await confirm(db, user.id, ident)


@router.post("/admin/agent/proposals/{ident}/reject")
async def reject(ident: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await db.get(AgentProposal, ident, with_for_update=True)
    if not row or row.admin_id != user.id or row.status != "pending":
        raise HTTPException(409, "Propuesta no disponible")
    row.status = "rejected"
    await db.commit()
    return {"status": row.status}


@router.api_route("/admin/agent/mcp", methods=["GET", "POST"])
async def mcp(request: Request, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in settings.cors_origins:
        raise HTTPException(403, "Origen no permitido")
    if request.method == "GET":
        return Response(status_code=405, headers={"Allow": "POST"})
    await enforce_rate_limit(request, "mcp", 40, 60)
    version = request.headers.get("mcp-protocol-version", "2025-03-26")
    if version not in {"2025-03-26", "2025-06-18", "2025-11-25"}:
        raise HTTPException(400, "Versión MCP no compatible")
    try:
        payload = await request.json()
    except ValueError:
        return {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
    if not isinstance(payload, dict) or payload.get("jsonrpc") != "2.0" or not isinstance(payload.get("method"), str):
        return {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid request"}}
    ident, method = payload.get("id"), payload["method"]
    if "id" not in payload:
        return Response(status_code=202)
    result = None
    params = payload.get("params", {})
    if not isinstance(params, dict):
        return {"jsonrpc": "2.0", "id": ident, "error": {"code": -32602, "message": "Invalid params"}}
    if method == "initialize":
        requested = params.get("protocolVersion")
        result = {"protocolVersion": requested if requested in {"2025-03-26", "2025-06-18", "2025-11-25"} else "2025-11-25", "capabilities": {"tools": {"listChanged": False}}, "serverInfo": {"name": "instalacam-admin", "version": "1.0.0"}}
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": TOOLS}
    elif method == "tools/call":
        try:
            value = await call_tool(db, user.id, params.get("name"), params.get("arguments", {}))
            result = {"content": [{"type": "text", "text": json.dumps(value, ensure_ascii=False, default=str)}], "isError": False}
        except HTTPException as exc:
            result = {"content": [{"type": "text", "text": str(exc.detail)}], "isError": True}
    else:
        return {"jsonrpc": "2.0", "id": ident, "error": {"code": -32601, "message": "Method not found"}}
    return {"jsonrpc": "2.0", "id": ident, "result": result}


class ChatConsent(BaseModel):
    consent: bool


@router.post("/chat/sessions", status_code=201)
async def start(data: ChatConsent, request: Request, db: AsyncSession = Depends(get_db)):
    if data.consent is not True:
        raise HTTPException(422, "Se requiere autorización para iniciar la conversación")
    await enforce_rate_limit(request, "chat-session", 8, 60)
    row, token = await new_conversation(db)
    row.state = {"ai_consent": True, "consent_version": "commercial-chat-v1", "consent_at": datetime.now(timezone.utc).isoformat()}
    await db.commit()
    return {"id": row.id, "token": token}


async def authorize_chat(db, ident, token):
    row = await db.get(Conversation, ident)
    if not row or row.channel != "web" or not secrets.compare_digest(row.token_hash or "", hashlib.sha256(token.encode()).hexdigest()):
        raise HTTPException(404, "Conversación no disponible")
    return row


@router.get("/chat/sessions/{ident}")
async def get_chat(ident: str, x_chat_token: str = Header(default=""), db: AsyncSession = Depends(get_db)):
    await authorize_chat(db, ident, x_chat_token)
    return await history(db, ident)


@router.post("/chat/sessions/{ident}")
async def send_chat(ident: str, data: TextIn, request: Request, x_chat_token: str = Header(default=""), idempotency_key: str = Header(min_length=8, max_length=64), db: AsyncSession = Depends(get_db)):
    await enforce_rate_limit(request, "chat-message", 12, 60)
    row = await authorize_chat(db, ident, x_chat_token)
    async with conversation_lock(row.id):
        await db.refresh(row)
        return await receive(db, row, data.text, hashlib.sha256((ident + idempotency_key).encode()).hexdigest())


@router.get("/admin/agent/whatsapp", dependencies=[Depends(get_current_user)])
async def wa_status():
    return await gateway("GET", "/status")


@router.post("/admin/agent/whatsapp/connect", dependencies=[Depends(get_current_user)])
async def wa_connect():
    return await gateway("POST", "/connect", {})


@router.post("/admin/agent/whatsapp/disconnect", dependencies=[Depends(get_current_user)])
async def wa_disconnect():
    return await gateway("POST", "/disconnect", {})


class WAIncoming(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=200)
    phone: str = Field(pattern=r"^[1-9]\d{7,14}$")
    name: str = Field(default="Cliente WhatsApp", max_length=120)
    text: str = Field(min_length=1, max_length=2000)


@router.post("/internal/whatsapp/incoming", include_in_schema=False)
async def incoming(data: WAIncoming, authorization: str = Header(default=""), db: AsyncSession = Depends(get_db)):
    if not settings.whatsapp_gateway_token or not secrets.compare_digest(authorization, "Bearer " + settings.whatsapp_gateway_token):
        raise HTTPException(401, "Autenticación requerida")
    async with incoming_lock:
        row = (await db.execute(select(Conversation).where(Conversation.contact == data.phone))).scalar_one_or_none()
        if not row:
            if not OPTIN.search(data.text):
                return {"accepted": True, "ignored": True}
            row, _ = await new_conversation(db, "whatsapp", data.phone, data.name)
    async with conversation_lock(row.id):
        await db.refresh(row)
        await receive(db, row, data.text, hashlib.sha256(("wa:" + data.id).encode()).hexdigest())
    return {"accepted": True}


@router.get("/admin/agent/conversations", dependencies=[Depends(get_current_user)])
async def inbox(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Conversation).order_by(Conversation.created_at.desc()).limit(150))).scalars()
    return [{"id": r.id, "name": r.name, "channel": r.channel, "contact": r.contact, "paused": r.paused} for r in rows]


@router.get("/admin/agent/conversations/{ident}", dependencies=[Depends(get_current_user)])
async def inbox_messages(ident: str, db: AsyncSession = Depends(get_db)):
    return await history(db, ident)


class Handoff(BaseModel):
    paused: bool


@router.put("/admin/agent/conversations/{ident}", dependencies=[Depends(get_current_user)])
async def handoff(ident: str, data: Handoff, db: AsyncSession = Depends(get_db)):
    row = await db.get(Conversation, ident)
    if not row:
        raise HTTPException(404, "Conversación no encontrada")
    row.paused = data.paused
    if data.paused:
        await db.execute(update(ChatMessage).where(ChatMessage.conversation_id == ident, ChatMessage.role == "assistant", ChatMessage.delivery == "pending").values(delivery="cancelled"))
    await db.commit()
    return {"paused": row.paused}


@router.post("/admin/agent/conversations/{ident}/reply", dependencies=[Depends(get_current_user)])
async def manual_reply(ident: str, data: TextIn, idempotency_key: str = Header(min_length=8, max_length=64), db: AsyncSession = Depends(get_db)):
    row = await db.get(Conversation, ident)
    if not row:
        raise HTTPException(404, "Conversación no encontrada")
    key = hashlib.sha256(("reply:" + ident + idempotency_key).encode()).hexdigest()
    if not await db.get(ChatMessage, key):
        db.add(ChatMessage(id=key, conversation_id=ident, role="admin", body=data.text, delivery="pending" if row.channel == "whatsapp" else "local"))
        row.paused = True
        await db.execute(update(ChatMessage).where(ChatMessage.conversation_id == ident, ChatMessage.role == "assistant", ChatMessage.delivery == "pending").values(delivery="cancelled"))
        await db.commit()
    return await history(db, ident)
