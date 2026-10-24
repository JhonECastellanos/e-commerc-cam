"""Validación de configuración: reglas de arranque seguras en producción."""
import pytest

from app.config import Settings

SECURE = dict(
    secret_key="x" * 40,
    database_url="postgresql+asyncpg://app_user:una_clave_larga_y_unica@db.example.com:5432/instalacam",
    frontend_origins="https://instalacamara.example.com",
    womppi_webhook_secret="webhook-secret-prod",
)


def make(**overrides) -> Settings:
    values = {"_env_file": None, "app_env": "production", **SECURE}
    values.update(overrides)
    return Settings(**values)


def test_development_permite_valores_por_defecto():
    Settings(_env_file=None, app_env="development").validate_runtime_configuration()


def test_produccion_valida_correctamente_con_valores_seguros():
    make().validate_runtime_configuration()


def test_produccion_rechaza_secret_key_corta_o_insegura():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        make(secret_key="corta").validate_runtime_configuration()
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        make(secret_key="development-only-change-me").validate_runtime_configuration()


def test_produccion_rechaza_credenciales_de_ejemplo_en_db():
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        make(database_url="postgresql+asyncpg://instalacam:instalacam_secret@db:5432/instalacam").validate_runtime_configuration()


def test_produccion_rechaza_origenes_localhost():
    with pytest.raises(RuntimeError, match="FRONTEND_ORIGINS"):
        make(frontend_origins="http://localhost:5173").validate_runtime_configuration()


def test_produccion_exige_webhook_secret_de_wompi():
    with pytest.raises(RuntimeError, match="WOMPPI_WEBHOOK_SECRET"):
        make(womppi_webhook_secret="").validate_runtime_configuration()


def test_cors_origins_normaliza_barras_y_espacios():
    settings = Settings(_env_file=None, frontend_origins=" https://a.com/ , https://b.com ")
    assert settings.cors_origins == ["https://a.com", "https://b.com"]


def test_database_url_normaliza_esquemas_de_proveedores_gestionados():
    # Render/Heroku entregan postgres:// — debe convertirse al driver async.
    s = Settings(_env_file=None, database_url="postgres://u:p@host:5432/db")
    assert s.database_url == "postgresql+asyncpg://u:p@host:5432/db"
    s = Settings(_env_file=None, database_url="postgresql://u:p@host:5432/db")
    assert s.database_url == "postgresql+asyncpg://u:p@host:5432/db"
    s = Settings(_env_file=None, database_url="postgresql+asyncpg://u:p@host:5432/db")
    assert s.database_url == "postgresql+asyncpg://u:p@host:5432/db"


def test_database_url_convierte_sslmode_a_ssl_para_asyncpg():
    # Supabase entrega ?sslmode=require (libpq); asyncpg usa ssl=.
    s = Settings(_env_file=None, database_url="postgresql://u:p@host:5432/db?sslmode=require")
    assert s.database_url.endswith("?ssl=require")


def test_detecta_pooler_de_supabase():
    pooler = Settings(_env_file=None, database_url="postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres")
    directo = Settings(_env_file=None, database_url="postgresql://u:p@db.example.com:5432/db")
    assert pooler.uses_pgbouncer is True
    assert directo.uses_pgbouncer is False


def test_serverless_y_auto_init_db_por_defecto():
    s = Settings(_env_file=None)
    assert s.serverless is False
    assert s.auto_init_db is True


def test_host_list_separa_por_comas():
    settings = Settings(_env_file=None, trusted_hosts="api.example.com, localhost")
    assert settings.host_list == ["api.example.com", "localhost"]
