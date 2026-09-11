# Estrategia de Ciberseguridad — InstalaCámara

Fecha: 2026-07-21 · Alcance: frontend (React/Vercel), backend (FastAPI/Vercel),
base de datos y storage (Supabase), pagos (Wompi), CI/CD (GitHub Actions).

Objetivo: cubrir las clases de ataque habituales de una aplicación web de
e-commerce (OWASP Top 10 y específicos de pagos), documentar el control
implementado con su ubicación en el código, y dejar una hoja de ruta para lo
que falta.

---

## 1. Matriz amenaza → control implementado

| # | Amenaza | Control implementado | Dónde | Estado |
|---|---------|----------------------|-------|--------|
| 1 | Inyección SQL | ORM SQLAlchemy con consultas parametrizadas en el 100% de los accesos; sin SQL concatenado con entrada de usuario | `backend/app/routers/*` | ✅ |
| 2 | XSS (cross-site scripting) | React escapa todo por defecto (no se usa `dangerouslySetInnerHTML`); CSP estricta `default-src 'self'`; `X-Content-Type-Options: nosniff` | `backend/app/main.py` (middleware security_headers), `frontend/vercel.json` | ✅ |
| 3 | CSRF | No se usan cookies de sesión: el token admin viaja como Bearer header desde `sessionStorage`; CORS con `allow_credentials=False` y orígenes explícitos; métodos y cabeceras permitidos en lista cerrada | `backend/app/main.py` (CORSMiddleware), `frontend/src/api/client.ts` | ✅ |
| 4 | Manipulación de precios desde el cliente | El total, anticipo 50% y saldo se calculan SIEMPRE en el backend a partir del combo/tarifas persistidos; el checkout no acepta ningún `total` del navegador | `backend/app/routers/orders.py`, `public.py` — cubierto por tests (`test_api_orders.py`, `test_api_public.py`) | ✅ |
| 5 | Falsificación del webhook de pago | Verificación HMAC-SHA256 del checksum de eventos Wompi con `hmac.compare_digest`; validación de monto exacto en centavos y moneda COP; conflicto 409 si llega una segunda transacción distinta; reintentos idempotentes | `backend/app/services/wompi.py`, `routers/orders.py` — tests dedicados | ✅ |
| 6 | IDOR / enumeración de órdenes y PDFs | Cada orden tiene un token de acceso (HMAC de la Idempotency-Key con SECRET_KEY); consultar orden o PDF exige `X-Order-Access-Token`; respuesta uniforme 404 para "no existe" y "token inválido" (no se puede enumerar referencias) | `backend/app/security.py`, `routers/orders.py` | ✅ |
| 7 | Fuerza bruta y credential stuffing en /admin | Rate limit 5 intentos/min por IP; bcrypt con verificación de hash dummy cuando el usuario no existe (tiempo de respuesta uniforme → no se pueden enumerar correos); contraseña admin inicial mínima de 14 caracteres | `backend/app/routers/admin_auth.py`, `security.py` | ✅ |
| 8 | Spoofing de IP para evadir rate limits | `get_client_ip` toma `X-Real-IP` del proxy o el ÚLTIMO salto de `X-Forwarded-For` (el primero es controlable por el atacante) | `backend/app/security.py` — test dedicado | ✅ |
| 9 | Subida de archivos maliciosos (webshell, polyglot) | Lista blanca de MIME (JPG/PNG/WebP) + verificación de firma binaria (magic bytes) + marcador WEBP + límite 5 MB + nombre UUID (no se conserva el nombre del usuario) + almacenamiento en bucket de Supabase separado del código | `backend/app/services/uploads.py` — 10 tests | ✅ |
| 10 | Acceso a documentos privados vía static files | El mount público `/api/uploads` bloquea explícitamente `agreements/`; los PDFs de acuerdos viven fuera del directorio público (`PRIVATE_FILES_DIR`) | `backend/app/main.py` (PublicUploadsStaticFiles) | ✅ |
| 11 | DoS por payloads grandes | Límite de body 1 MB (5 MB solo en rutas de upload) validado por Content-Length antes de procesar; GZip solo en respuestas; máximo 200 clientes WebSocket | `backend/app/main.py`, `routers/ws.py` | ✅ |
| 12 | Abuso de creación de órdenes (spam) | Rate limit 10 órdenes/min por IP + Idempotency-Key obligatoria (16-128 chars) con índice único → reintentos no duplican órdenes | `backend/app/routers/orders.py` | ✅ |
| 13 | Host header injection | `TrustedHostMiddleware` con lista cerrada (`TRUSTED_HOSTS`) | `backend/app/main.py` | ✅ |
| 14 | Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` | `backend/app/main.py`, `frontend/vercel.json` | ✅ |
| 15 | Downgrade a HTTP / MITM | TLS automático en Vercel y Supabase; HSTS `max-age=31536000; includeSubDomains`; conexión a Postgres con SSL (`?ssl=require` normalizado para asyncpg) | `main.py`, `config.py`, `frontend/vercel.json` | ✅ |
| 16 | Fuga de secretos | Solo variables de entorno (nunca hardcodeados); `validate_runtime_configuration()` ABORTA el arranque en producción si hay SECRET_KEY débil, credenciales de ejemplo en la DB, orígenes localhost o falta el secreto del webhook; `service_role` de Supabase solo en el backend | `backend/app/config.py` — tests dedicados | ✅ |
| 17 | Robo de token admin vía XSS persistente | Token en `sessionStorage` (expira al cerrar pestaña), JWT con expiración de 60 min, migración automática desde `localStorage` heredado; el contexto expulsa la sesión ante 401 | `frontend/src/context/AdminContext.tsx` — tests | ✅ |
| 18 | Escalada por token robado | JWT firmado HS256 con expiración; `get_current_user` revalida contra la base (usuario activo + rol admin) en cada request — un usuario desactivado pierde acceso aunque su token siga vigente | `backend/app/routers/admin_auth.py` | ✅ |
| 19 | Supply chain (dependencias comprometidas) | Versiones pineadas (`requirements.txt`, `package-lock.json`); `pip-audit` y `npm audit --audit-level=high` como pasos obligatorios del CI | `.github/workflows/ci.yml` | ✅ |
| 20 | Exposición de información en errores | Handler global: los 500 devuelven mensaje genérico + request_id (el detalle queda solo en logs); errores de validación 422 sin eco de los datos enviados; `/docs` y `/redoc` deshabilitados en producción | `backend/app/main.py` | ✅ |
| 21 | PII en logs | Logging JSON estructurado con request_id; `audit_log` registra eventos (login fallido, webhook rechazado, orden creada) sin contraseñas, tokens ni documentos completos | `backend/app/logging_config.py` | ✅ |
| 22 | Permisos de infraestructura | Contenedores corren como usuario no-root (`appuser`), `no-new-privileges` en compose; workflow de Actions con `permissions: contents: read` | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `ci.yml` | ✅ |

## 2. Amenazas aceptadas con mitigación parcial (riesgo conocido)

| Amenaza | Situación actual | Mitigación recomendada | Prioridad |
|---------|------------------|------------------------|-----------|
| Rate limiting distribuido | El limitador es por proceso; en serverless cada instancia cuenta aparte, así que un atacante distribuido puede superar el límite nominal | Upstash Redis (tiene plan gratis) como backend del limitador; Vercel además aplica mitigación DDoS de plataforma | P1 |
| DDoS volumétrico | Delegado a la capa de Vercel/Supabase (anycast, mitigación de plataforma) | Suficiente para esta escala; WAF gestionado si crece | P2 |
| 2FA para el admin | Solo contraseña (fuerte) + rate limit + timing uniforme | TOTP (pyotp) para cuentas admin | P1 |
| Backups | Supabase Free hace backups diarios con retención limitada y sin PITR | Job semanal `pg_dump` (GitHub Actions programado) a un storage privado | P1 |
| Rotación de secretos | Manual | Calendario trimestral: SECRET_KEY, service_role, llaves Wompi | P2 |
| Monitoreo de intrusiones | Logs estructurados + UptimeRobot (disponibilidad) | Sentry (plan gratis) para errores y alertas de anomalías | P1 |

## 3. Reglas operativas (para quien administre el sitio)

1. **Nunca** compartas ni subas al repositorio: `SECRET_KEY`, `SUPABASE_SERVICE_KEY`,
   `WOMPPI_PRIVATE_KEY`, `WOMPPI_WEBHOOK_SECRET`, contraseñas de base de datos.
   El `.env` local está en `.gitignore`; verifica antes de cada commit.
2. La `service_role` de Supabase equivale a acceso total a la base: si se filtra,
   regenerala de inmediato (Supabase → Settings → API → Reset).
3. Cambia `INITIAL_ADMIN_PASSWORD` después del primer login y elimina/rota el
   valor en Vercel.
4. Revisa mensualmente: pestaña Actions (auditorías de dependencias en verde),
   panel Wompi (transacciones no reconocidas), logs de Vercel (picos de 401/429),
   uso de Supabase (tamaño de base y storage).
5. Ante sospecha de compromiso: (a) rota SECRET_KEY (invalida todos los JWT),
   (b) rota service_role y llaves Wompi, (c) revisa `audit_log` en los logs de
   Vercel, (d) exporta un backup inmediato de la base.
6. Los PDFs de acuerdos contienen PII (nombre, documento, dirección): no los
   reenvíes por canales no cifrados y bórralos de descargas locales.

## 4. Validación continua

- **CI obligatorio**: 74 tests de backend + 21 de frontend incluyen los casos de
  seguridad (firma de webhook inválida, monto alterado, token de orden inválido,
  rate limits, uploads maliciosos, arranque con configuración insegura).
  Ningún despliegue a producción debe hacerse con el CI en rojo.
- **Auditoría de dependencias**: `pip-audit` + `npm audit` fallan el pipeline si
  aparece una vulnerabilidad alta.
- **Prueba manual trimestral** (30 min): intentar pagar con monto manipulado en
  el widget, pedir un PDF ajeno sin token, 6 logins fallidos seguidos (debe dar
  429), subir un .php renombrado a .png (debe dar 422).
