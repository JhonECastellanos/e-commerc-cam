# Manual de despliegue - InstalaCámara

## Requisitos del servidor

- Docker y Docker Compose
- Git
- Mínimo 2 GB RAM, 20 GB disco
- Puerto 80/443 libre (o configura otro puerto)

---

## 1. Clonar el repositorio

```bash
git clone <url-del-repositorio> instalacam
cd instalacam
```

---

## 2. Variables de entorno (archivo `.env`)

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales:

```env
# --- Base de datos ---
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/instalacam

# --- JWT (seguridad del panel admin) ---
SECRET_KEY=genera_un_secreto_seguro_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# --- Wompi (pasarela de pagos) — https://wompi.co ---
WOMPI_PUBLIC_KEY=pub_prod_xxxxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxxxxxxxxxx
WOMPI_WEBHOOK_SECRET=sec_prod_xxxxxxxxxxxx

# --- URLs ---
FRONTEND_URL=http://midominio.com

# --- Admin inicial (seed) ---
INITIAL_ADMIN_EMAIL=admin@tudominio.com
INITIAL_ADMIN_PASSWORD=una_contraseña_muy_segura_de_al_menos_14_caracteres

# --- WhatsApp ---
WHATSAPP_NUMBER=573001234567
```

### Dónde obtener las credenciales

| Servicio | Cómo obtenerlo |
|----------|----------------|
| **SECRET_KEY** | Genérala con: `python -c "import secrets; print(secrets.token_hex(32))"` |
| **Wompi** | Regístrate en [wompi.co](https://wompi.co), ve a Configuración > Llaves. Usa las de producción (`pub_prod_*`, `prv_prod_*`). El webhook secret está en la misma sección. |
| **INITIAL_ADMIN_PASSWORD** | Debe tener mínimo 14 caracteres. Usa un gestor de contraseñas. |

---

## 3. Desplegar con Docker Compose

```bash
# Construir e iniciar todos los servicios
docker compose up --build -d

# Verificar que los 3 contenedores estén corriendo
docker compose ps

# Ver logs
docker compose logs -f
```

Esto inicia:
- `db` - PostgreSQL 15 (puerto 5432)
- `backend` - FastAPI (puerto 8000)
- `frontend` - Nginx sirviendo React (puerto 80)

### Acceder al sitio

- Sitio web: `http://localhost` (o `http://midominio.com`)
- Panel admin: `http://localhost/admin`
- API docs: `http://localhost:8000/docs`

---

## 4. Sembrar datos iniciales

```bash
docker compose exec backend python seed_data.py
```

Esto crea:
- Usuario admin (según INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD)
- 10 marcas de cámaras
- 480 combos (4 modos x 4 resoluciones x 3 cantidades x 10 marcas)
- 22 municipios con cobertura
- Redes sociales (WhatsApp, Facebook, Instagram) - debes completar las URLs
- Configuraciones del sistema (tarifas, textos, etc.)
- 8 productos individuales

---

## 5. Configuración post-despliegue

Después del primer inicio y seed, ingresa al panel admin:

1. **Completa datos del negocio** en `/admin/precios` > pestaña `Configuración`:
   - Nombre del negocio
   - NIT
   - Teléfono de contacto
   - Política de cancelación
   - Plazo de instalación
   - Garantía en meses

2. **Completa redes sociales** en `/admin/redes`:
   - URL de WhatsApp (ej: `https://wa.me/573001234567`)
   - URL de Facebook
   - URL de Instagram

3. **Sube imágenes** en `/admin/multimedia`:
   - 3 banners para el carrusel
   - Logos de marcas
   - Foto del técnico para sección Conócenos

4. **Configura Wompi**:
   - Asegúrate de que las llaves de Wompi en `.env` sean correctas
   - Configura el webhook en Wompi: `https://tudominio.com/api/payments/wompi/webhook`

---

## 6. Opciones gratuitas de despliegue (cloud)

### Opción recomendada: Render.com (gratis por 1 mes+)

Render.com ofrece PostgreSQL gratuito (1 GB) y alojamiento web con plan gratuito.

**Paso a paso:**

1. Crea cuenta en https://render.com (usa GitHub para login)
2. Crea una **base de datos PostgreSQL**:
   - Dashboard > New > PostgreSQL
   - Name: `instalacam-db`
   - Plan: Free
   - Anota la **Internal Database URL** (ej: `postgresql://user:pass@host:5432/db`)
3. Crea un **Web Service** para el backend:
   - New > Web Service
   - Connect your GitHub repo
   - Name: `instalacam-backend`
   - Root Directory: `backend`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
   - Plan: Free
4. En Environment Variables del Web Service agrega:
   ```
   DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<host>:5432/<db>
   SECRET_KEY=<genera_una_llave>
   INITIAL_ADMIN_EMAIL=admin@tudominio.com
   INITIAL_ADMIN_PASSWORD=contraseña_muy_segura_18chars
   FRONTEND_URL=https://instalacam-frontend.onrender.com
   APP_ENV=production
   ```
5. Crea un **Static Site** para el frontend:
   - New > Static Site
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Plan: Free
6. Configura el Static Site para que el `/api` apunte al backend:
   - En Redirects/Rules, agrega:
     - Source: `/api/*`
     - Destination: `https://instalacam-backend.onrender.com/api/$1`
     - Action: Proxy (solo disponible en plan Pro)
   - Alternativa: usa `vite.config.ts` con proxy o configura un Nginx

### Otras opciones gratuitas

| Servicio | PostgreSQL gratis | Web gratis | Límite |
|----------|:---:|:---:|--------|
| **Render.com** | ✅ (1 GB) | ✅ | Web duerme a los 15 min inactividad |
| **Railway.app** | ✅ ($5 crédito) | ✅ | Requiere tarjeta |
| **Fly.io** | ✅ (3 GB) | ✅ ($5 crédito/mes) | Requiere tarjeta |
| **Koyeb** | ✅ (1 GB) | ✅ | Web duerme tras inactividad |

### Sobre "Anaconda" como entorno local

Si prefieres usar **Anaconda/Miniconda** como gestor de entornos Python en lugar de Docker para desarrollo local:

```bash
# Crear entorno con conda
conda create -n instalacam python=3.12
conda activate instalacam

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

> **Nota**: Anaconda Cloud no ofrece hosting para aplicaciones web con PostgreSQL. Para producción en la nube, usa Render.com, Railway.app o Fly.io.

---

## 7. Desarrollo local (sin Docker)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend se conecta al backend en `http://localhost:8000` (según configuración de Vite).

### Base de datos

Necesitas PostgreSQL corriendo localmente. Crea una base de datos llamada `instalacam`.

```env
# .env local
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/instalacam
```

---

## 7. Producción (con dominio real)

### Usando Docker Compose (recomendado)

1. Configura un proxy reverso (Nginx/Caddy) o Cloudflare Tunnel para SSL
2. Asegúrate de que `FRONTEND_URL` apunte a tu dominio real
3. Configura los webhooks de Wompi apuntando a tu dominio

### Para HTTPS (SSL)

Opción A - **Cloudflare Tunnel** (recomendado, más simple):
```bash
# Instala cloudflared y crea un túnel
cloudflared tunnel create instalacam
cloudflared tunnel route dns instalacam midominio.com
cloudflared tunnel run instalacam
```

Opción B - **Nginx + Certbot**:
Configura Nginx como proxy reverso con certificado SSL de Let's Encrypt.

---

## 8. Actualización

```bash
git pull
docker compose up --build -d
docker compose exec backend python seed_data.py  # si hay nuevos seeds
```

---

## 9. Backup de la base de datos

```bash
# Backup
docker compose exec db pg_dump -U postgres instalacam > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose exec -T db psql -U postgres instalacam
```

---

## 10. Resolución de problemas

### Error de conexión a la base de datos
```bash
docker compose logs db
# Verifica que PostgreSQL esté escuchando en puerto 5432
```

### Error al seedear
```bash
# Verifica que las variables de entorno INITIAL_ADMIN_EMAIL y INITIAL_ADMIN_PASSWORD estén definidas
# La contraseña debe tener al menos 14 caracteres
```

### Error de Wompi en pagos
```bash
docker compose logs backend | grep wompi
# Verifica las llaves en .env
# Asegúrate de estar en modo producción (no sandbox) para pagos reales
```

### Los banners no se muestran
```bash
docker compose exec backend python -c "
import asyncio
from app.database import async_session
from app.models.banner import Banner
from sqlalchemy import select

async def check():
    async with async_session() as db:
        result = await db.execute(select(Banner))
        banners = result.scalars().all()
        print(f'Banners: {len(banners)}')
        for b in banners:
            print(f'  - #{b.position}: {b.title} (active={b.active})')
asyncio.run(check())
"
```
