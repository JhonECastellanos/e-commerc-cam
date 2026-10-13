# InstalaCámara — Ecommerce + Panel Admin

Plataforma de e-commerce para la venta e instalación profesional de cámaras de seguridad. Los clientes exploran el catálogo de combos (por marca, modo y resolución), contratan el servicio con un anticipo del 50% a través de Wompi y el equipo administrativo gestiona las órdenes, el inventario y los contenidos desde un panel.

La rama de integración agrega dos laboratorios 3D reales (casa y apartamento), automatización virtual, asesorías con perfil comercial y diseño adjunto, y propuestas de domótica/servidores dentro de la misma plataforma. [Ejecución, alcance y pendientes de producción](docs/INTEGRACION_SMARTHOME.md). [Costes sugeridos y fuentes](docs/PROPUESTA_COMERCIAL.md).

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Python + FastAPI + SQLAlchemy 2.0 (async) |
| Base de datos | PostgreSQL |
| Pagos | Wompi |
| Autenticación | JWT (PyJWT + bcrypt) |
| Simuladores | Three.js + motor propio de automatización virtual |
| PDF | ReportLab |
| Contenedores | Docker Compose |
| i18n | react-i18next (ES/EN) |

## Requisitos

- Docker Desktop
- Node.js 22+ (para desarrollo del frontend fuera de Docker)
- Python 3.12 (para desarrollo del backend fuera de Docker)

## Ejecución en desarrollo local

### Con Docker (recomendado)

```powershell
.\iniciar.cmd
```

- Frontend → http://localhost:8094
- Backend (API) → http://localhost:8001
- Documentación de la API → http://localhost:8001/docs

El iniciador conserva `.env` si existe; si no, genera credenciales aleatorias locales. `detener.cmd` detiene únicamente la instancia integrada y conserva sus datos. Los puertos se pueden ajustar en `.env`.

### Frontend solo (hot reload)

```powershell
cd frontend
npm install
# Si se usa la API de Docker en vez del backend nativo:
$env:VITE_API_PROXY_TARGET='http://localhost:8001'
npm run dev
```

### Backend solo (hot reload)

```powershell
# Desde la raíz: crea la configuración nativa sin sobrescribir archivos existentes.
python -m venv .venv
.\.venv\Scripts\python.exe scripts/setup-local.py
docker.exe compose -p instalacam-integracion-qa -f compose.qa.yml up -d
cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### Variables de entorno

Copia `.env.example` como `.env` y define tus propios valores (claves secretas, credenciales de base de datos y proveedores de pago). No se incluyen secretos reales en el repositorio; el backend se niega a arrancar en modo `production` con valores de ejemplo.

## Pruebas

```bash
# Backend
cd backend
python -m pytest -q

# Frontend
cd frontend
npm test
```
