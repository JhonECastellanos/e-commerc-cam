from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import settings


def _engine_kwargs() -> dict:
    kwargs: dict = {"echo": False, "pool_pre_ping": True}
    if settings.serverless:
        # En serverless cada invocación puede ser un proceso nuevo: un pool
        # persistente solo acumula conexiones muertas contra Supabase.
        kwargs["poolclass"] = NullPool
    else:
        kwargs.update(pool_size=10, max_overflow=20, pool_timeout=30, pool_recycle=1800)
    if settings.uses_pgbouncer:
        # Receta oficial de SQLAlchemy para pgbouncer en modo transacción.
        kwargs["connect_args"] = {
            "statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
        }
    return kwargs


engine = create_async_engine(settings.database_url, **_engine_kwargs())
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        for col_spec in [
            ("combos", "level", "VARCHAR(20)"),
            ("combos", "unique_code", "VARCHAR(50)"),
            ("combos", "name", "VARCHAR(500)"),
            ("combos", "categoria", "VARCHAR(50)"),
            ("combos", "instalacion_incluida", "BOOLEAN DEFAULT TRUE"),
            ("combos", "ganancia", "NUMERIC(12,2)"),
            ("combos", "link", "VARCHAR(1000)"),
            ("banners", "video_url", "VARCHAR(500)"),
            ("products", "brand_id", "INTEGER"),
            ("products", "instalacion_price", "NUMERIC(12,2)"),
            ("products", "specs", "JSONB"),
            ("products", "ganancia", "NUMERIC(12,2)"),
            ("products", "link", "VARCHAR(1000)"),
            ("orders", "custom_combo_data", "JSONB"),
            ("orders", "access_token_hash", "VARCHAR(64)"),
            ("orders", "idempotency_key", "VARCHAR(128)"),
        ]:
            table, col, col_type = col_spec
            result = await conn.execute(
                text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{col}'")
            )
            if not result.scalar_one_or_none():
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idempotency_key ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_status_created_at ON orders (status, created_at DESC)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_coverage_area_created_at ON orders (coverage_area_id, created_at DESC)"))
