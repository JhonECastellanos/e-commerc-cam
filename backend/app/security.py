import asyncio
import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class FixedWindowRateLimiter:
    """Process-local safety net. Use Redis-backed limiting before multiple replicas."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        async with self._lock:
            events = self._events[key]
            while events and now - events[0] >= window_seconds:
                events.popleft()
            if len(events) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Demasiadas solicitudes. Intenta de nuevo más tarde.",
                    headers={"Retry-After": str(window_seconds)},
                )
            events.append(now)


rate_limiter = FixedWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    # The public deployment must expose only the reverse proxy. nginx sets X-Real-IP to
    # $remote_addr (not client-controlled); X-Forwarded-For is appended, so the *last* hop
    # is the one nginx observed. Never trust the first XFF element: a client can spoof it and
    # evade the login/order rate limiter, which is keyed on this value.
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()[:64]
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.rsplit(",", 1)[-1].strip()[:64]
    return request.client.host if request.client else "unknown"


async def enforce_rate_limit(request: Request, namespace: str, limit: int, window_seconds: int) -> None:
    await rate_limiter.check(f"{namespace}:{get_client_ip(request)}", limit, window_seconds)


def new_order_access_token() -> str:
    return secrets.token_urlsafe(32)


def order_access_token_from_idempotency(idempotency_key: str, secret_key: str) -> str:
    return hmac.new(secret_key.encode("utf-8"), idempotency_key.encode("utf-8"), hashlib.sha256).hexdigest()


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_order_access_token(provided: str | None, expected_digest: str | None) -> bool:
    if not provided or not expected_digest:
        return False
    return secrets.compare_digest(token_digest(provided), expected_digest)
