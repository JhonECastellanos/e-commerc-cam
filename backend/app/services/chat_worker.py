"""Durable outbox; transport deduplicates every message ID across restarts."""
import asyncio
import logging

from sqlalchemy import select
from fastapi import HTTPException

from app.config import settings
from app.database import async_session
from app.models.business import ChatMessage, Conversation

logger = logging.getLogger(__name__)


async def deliver_once(db, send):
    row = (await db.execute(select(ChatMessage).where(ChatMessage.delivery.in_(["pending", "pending_control"])).order_by(ChatMessage.created_at).with_for_update(skip_locked=True).limit(1))).scalar_one_or_none()
    if row is None:
        return
    conversation = await db.get(Conversation, row.conversation_id)
    if conversation and conversation.paused and row.role == "assistant" and row.delivery == "pending":
        row.delivery = "cancelled"
    elif conversation and conversation.channel == "whatsapp" and conversation.contact:
        try:
            result = await send("POST", "/send", {"id": row.id, "phone": conversation.contact, "text": row.body})
            row.delivery = result.get("status", "uncertain") if result.get("status") in {"sent", "uncertain", "failed"} else "uncertain"
            row.attempts += 1
        except HTTPException as exc:
            if exc.status_code == 422:
                row.delivery = "failed"
    await db.commit()


async def run_outbox():
    from app.routers.business_agent import gateway
    from app.services.commercial_chat import receive
    from app.services.conversation_locks import conversation_lock
    while True:
        try:
            if settings.whatsapp_gateway_token:
                async with async_session() as db:
                    # Recover durable incoming work interrupted by a process restart.
                    pending = (await db.execute(select(ChatMessage).where(ChatMessage.delivery == "processing").order_by(ChatMessage.created_at).limit(1))).scalar_one_or_none()
                    if pending:
                        async with conversation_lock(pending.conversation_id):
                            await db.refresh(pending)
                            if pending.delivery == "processing":
                                conversation = await db.get(Conversation, pending.conversation_id)
                                await receive(db, conversation, pending.body, pending.id)
                    await deliver_once(db, gateway)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.warning("whatsapp_outbox_retry")  # Never log content, contacts or credentials.
        await asyncio.sleep(3)
