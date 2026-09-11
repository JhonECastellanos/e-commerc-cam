# InstalaCámara — Ecommerce + Panel Admin

Plataforma de e-commerce para la venta e instalación profesional de cámaras de seguridad. Los clientes exploran el catálogo de combos (por marca, modo y resolución), contratan el servicio con un anticipo del 50% a través de Wompi y el equipo administrativo gestiona las órdenes, el inventario y los contenidos desde un panel.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Python + FastAPI + SQLAlchemy 2.0 (async) |
| Base de datos | PostgreSQL |
| Pagos | Wompi |
| Autenticación | JWT (python-jose + bcrypt) |
| PDF | ReportLab |
| Contenedores | Docker Compose |
| i18n | react-i18next (ES/EN) |

## Requisitos

- Docker Desktop
- Node.js 20+ (para desarrollo del frontend fuera de Docker)
- Python 3.12 (para desarrollo del backend fuera de Docker)

## Ejecución en desarrollo local

### Con Docker (recomendado)

```bash
docker compose up --build -d
```

- Frontend → http://localhost
- Backend (API) → http://localhost:8000
- Documentación de la API → http://localhost:8000/docs

### Frontend solo (hot reload)

```bash
cd frontend
npm install
npm run dev
```

### Backend solo (hot reload)

```bash
# Levanta únicamente la base de datos
docker compose up -d db

cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
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