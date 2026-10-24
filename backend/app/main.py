import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import engine, init_db
from app.logging_config import configure_logging, request_id_ctx
from seed_data import seed_all

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_runtime_configuration()
    if settings.auto_init_db:
        await init_db()
        await seed_all()
    yield
    await engine.dispose()


app = FastAPI(
    title="InstalaCámara API",
    description="API de ecommerce y administración",
    version="2.1.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.host_list)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,  # Bearer tokens; cookies will enable this only with CSRF protection.
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Order-Access-Token", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    token = request_id_ctx.set(request_id[:128])
    started = time.perf_counter()
    try:
        content_length = request.headers.get("content-length")
        maximum = settings.max_upload_bytes if "/upload" in request.url.path else settings.max_request_body_bytes
        if content_length and int(content_length) > maximum:
            return JSONResponse(status_code=413, content={"detail": "Solicitud demasiado grande", "request_id": request_id})
        response = await call_next(request)
        return response
    finally:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response_status = locals().get("response", None)
        logger.info(
            "request_completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": getattr(response_status, "status_code", 500),
                "duration_ms": duration_ms,
                "client_ip": request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0],
            },
        )
        request_id_ctx.reset(token)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id_ctx.get()
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    if request.url.scheme == "https" or settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("validation_failed", extra={"method": request.method, "path": request.url.path, "status_code": 422})
    return JSONResponse(status_code=422, content={"detail": "Los datos enviados no son válidos", "request_id": request_id_ctx.get()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_error", extra={"method": request.method, "path": request.url.path, "status_code": 500})
    return JSONResponse(status_code=500, content={"detail": "Ocurrió un error interno. Intenta nuevamente.", "request_id": request_id_ctx.get()})


uploads_dir = settings.uploads_dir or os.path.join(os.path.dirname(__file__), "..", "uploads")
for sub in ["catalog", "agreements", "banners", "productos", "combos", "equipo", "marcas"]:
    try:
        os.makedirs(os.path.join(uploads_dir, sub), exist_ok=True)
    except OSError:
        # Sistema de archivos de solo lectura (serverless): las imágenes van a
        # Supabase Storage y este mount solo sirve los archivos empacados.
        break
class PublicUploadsStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        if path == "agreements" or path.startswith("agreements/"):
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        return await super().get_response(path, scope)


app.mount("/api/uploads", PublicUploadsStaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health/live", include_in_schema=False)
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health/ready", include_in_schema=False)
async def readiness() -> dict[str, str]:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok"}


from app.routers import admin_auth, admin_banners, admin_combos, admin_coverage, admin_dashboard, admin_notifications, admin_orders, admin_prices, admin_products, admin_social, orders, public, whatsapp, ws  # noqa: E402

app.include_router(public.router, prefix="/api", tags=["Público"])
app.include_router(orders.router, prefix="/api", tags=["Órdenes"])
app.include_router(admin_auth.router, prefix="/api/admin", tags=["Admin Auth"])
app.include_router(admin_prices.router, prefix="/api/admin", tags=["Admin Precios"])
app.include_router(admin_orders.router, prefix="/api/admin", tags=["Admin Órdenes"])
app.include_router(admin_dashboard.router, prefix="/api/admin", tags=["Admin Dashboard"])
app.include_router(admin_notifications.router, prefix="/api/admin", tags=["Admin Notificaciones"])
app.include_router(admin_social.router, prefix="/api/admin", tags=["Admin Redes Sociales"])
app.include_router(admin_coverage.router, prefix="/api/admin", tags=["Admin Cobertura"])
app.include_router(admin_banners.router, prefix="/api/admin", tags=["Admin Banners"])
app.include_router(admin_products.router, prefix="/api/admin", tags=["Admin Productos"])
app.include_router(admin_combos.router, prefix="/api/admin", tags=["Admin Combos"])
app.include_router(whatsapp.router, prefix="/api", tags=["WhatsApp"])
app.include_router(ws.router, prefix="/api", tags=["Tiempo real"])
