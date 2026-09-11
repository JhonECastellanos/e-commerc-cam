from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration only. Secrets are supplied by the deployment environment."""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://instalacam:instalacam_secret@db:5432/instalacam"
    secret_key: str = "development-only-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    frontend_origins: str = "http://localhost,http://localhost:5173"
    trusted_hosts: str = "localhost,127.0.0.1,testserver"
    log_level: str = "INFO"
    log_json: bool = True
    max_request_body_bytes: int = 1_048_576
    max_upload_bytes: int = 5_242_880
    private_files_dir: str = "/app/private_agreements"
    rate_limit_login: int = 5
    rate_limit_order: int = 10
    rate_limit_window_seconds: int = 60
    womppi_public_key: str = ""
    womppi_private_key: str = ""
    womppi_webhook_secret: str = ""
    whatsapp_provider: str = "off"
    whatsapp_number: str = ""
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    initial_admin_email: Optional[str] = None
    initial_admin_password: Optional[str] = None
    # Despliegue serverless (Vercel): sin pool persistente y sin escribir en el
    # sistema de archivos del paquete (solo /tmp es escribible).
    serverless: bool = False
    # Crear tablas y sembrar datos al arrancar. En serverless conviene hacerlo una
    # sola vez (primer despliegue) y luego apagarlo para acelerar los cold starts.
    auto_init_db: bool = True
    uploads_dir: str = ""
    # Supabase Storage: si hay credenciales, las imágenes se guardan allí en lugar
    # del disco local (obligatorio en serverless, donde el disco es efímero).
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    supabase_storage_bucket: str = "uploads"

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Los proveedores gestionados (Render, Heroku, Railway...) entregan URLs
        # "postgres://" o "postgresql://"; el motor async requiere el driver asyncpg.
        if value.startswith("postgres://"):
            value = "postgresql://" + value[len("postgres://"):]
        if value.startswith("postgresql://"):
            value = "postgresql+asyncpg://" + value[len("postgresql://"):]
        # asyncpg no acepta el parámetro sslmode de libpq (Supabase lo incluye).
        value = value.replace("?sslmode=", "?ssl=").replace("&sslmode=", "&ssl=")
        return value

    @property
    def uses_pgbouncer(self) -> bool:
        # El pooler de Supabase (puerto 6543, modo transacción) no soporta
        # prepared statements con nombre: hay que desactivar la caché de asyncpg.
        return ":6543/" in self.database_url or "pooler.supabase.com" in self.database_url

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def host_list(self) -> list[str]:
        return [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]

    def validate_runtime_configuration(self) -> None:
        if not self.is_production:
            return
        insecure = {"", "development-only-change-me", "cambiar_esta_llave_en_produccion"}
        if self.secret_key in insecure or len(self.secret_key) < 32:
            raise RuntimeError("SECRET_KEY segura (mínimo 32 caracteres) es obligatoria en producción")
        if "instalacam_secret" in self.database_url or "postgres:postgres" in self.database_url:
            raise RuntimeError("DATABASE_URL no puede usar credenciales de ejemplo en producción")
        if not self.cors_origins or any("localhost" in origin for origin in self.cors_origins):
            raise RuntimeError("FRONTEND_ORIGINS debe contener únicamente dominios de producción")
        if not self.womppi_webhook_secret:
            raise RuntimeError("WOMPPI_WEBHOOK_SECRET es obligatorio en producción")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
