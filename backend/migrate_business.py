"""Additive, repeatable migration. No seeds or changes to existing commerce data."""
import asyncio

import app.models  # noqa: F401
from app.database import engine, async_session
from app.models.business import Appointment, BusinessConfig, Conversation, ChatMessage, AgentProposal
from app.services.agenda import DEFAULT_AGENDA


async def migrate():
    tables = [model.__table__ for model in [BusinessConfig, Appointment, Conversation, ChatMessage, AgentProposal]]
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync: BusinessConfig.metadata.create_all(sync, tables=tables))
    async with async_session() as db:
        if not await db.get(BusinessConfig, "agenda"):
            db.add(BusinessConfig(key="agenda", payload=DEFAULT_AGENDA.copy()))
            await db.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
