from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from passlib.hash import bcrypt
from app.database import get_db
from app.models.user import User
from app.schemas import LoginIn, TokenOut
from app.config import settings
from app.logging_config import audit_log
from app.security import enforce_rate_limit, get_client_ip

router = APIRouter()
security = HTTPBearer(auto_error=False)

# Constant-time dummy hash: verified even when the email is unknown so login response time
# does not reveal whether an admin account exists (prevents user enumeration by timing).
_DUMMY_HASH = bcrypt.hash("invalid-user-placeholder-password")

def create_token(user_id: int, email: str, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticación requerida")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    result = await db.execute(select(User).where(User.id == user_id, User.active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")
    return user

@router.post("/login", response_model=TokenOut)
async def login(req: LoginIn, request: Request, db: AsyncSession = Depends(get_db)):
    await enforce_rate_limit(request, "admin-login", settings.rate_limit_login, settings.rate_limit_window_seconds)
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    try:
        # Always run bcrypt (against a dummy hash when the user is missing) to keep timing uniform.
        password_ok = bcrypt.verify(req.password, user.password_hash if user else _DUMMY_HASH)
    except ValueError:
        password_ok = False
    verified = bool(user) and password_ok
    if not verified:
        audit_log("admin_login_failed", client_ip=get_client_ip(request))
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.active:
        audit_log("admin_login_inactive", user_id=user.id, client_ip=get_client_ip(request))
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    token = create_token(user.id, user.email, user.role)
    audit_log("admin_login_succeeded", user_id=user.id, client_ip=get_client_ip(request))
    return TokenOut(access_token=token)

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
    }
