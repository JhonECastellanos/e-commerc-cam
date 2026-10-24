"""Módulo security: rate limiter, tokens de acceso a órdenes y detección de IP."""
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app import security
from app.security import (
    FixedWindowRateLimiter,
    get_client_ip,
    new_order_access_token,
    order_access_token_from_idempotency,
    token_digest,
    verify_order_access_token,
)


def make_request(headers: dict | None = None, client_host: str = "10.0.0.9") -> Request:
    raw_headers = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    scope = {"type": "http", "headers": raw_headers, "client": (client_host, 1234)}
    return Request(scope)


class TestRateLimiter:
    async def test_permite_hasta_el_limite_y_rechaza_el_exceso(self):
        limiter = FixedWindowRateLimiter()
        for _ in range(3):
            await limiter.check("k", limit=3, window_seconds=60)
        with pytest.raises(HTTPException) as exc:
            await limiter.check("k", limit=3, window_seconds=60)
        assert exc.value.status_code == 429
        assert exc.value.headers["Retry-After"] == "60"

    async def test_las_llaves_son_independientes(self):
        limiter = FixedWindowRateLimiter()
        await limiter.check("a", limit=1, window_seconds=60)
        await limiter.check("b", limit=1, window_seconds=60)

    async def test_la_ventana_expira(self, monkeypatch):
        limiter = FixedWindowRateLimiter()
        now = [1000.0]
        monkeypatch.setattr(security.time, "monotonic", lambda: now[0])
        await limiter.check("k", limit=1, window_seconds=60)
        now[0] += 61
        await limiter.check("k", limit=1, window_seconds=60)


class TestClientIp:
    def test_prefiere_x_real_ip(self):
        req = make_request({"X-Real-IP": "1.2.3.4", "X-Forwarded-For": "8.8.8.8"})
        assert get_client_ip(req) == "1.2.3.4"

    def test_usa_el_ultimo_salto_de_x_forwarded_for(self):
        # El primer elemento lo controla el cliente: jamás debe usarse.
        req = make_request({"X-Forwarded-For": "6.6.6.6, 5.5.5.5, 7.7.7.7"})
        assert get_client_ip(req) == "7.7.7.7"

    def test_sin_cabeceras_usa_el_socket(self):
        assert get_client_ip(make_request()) == "10.0.0.9"


class TestOrderAccessTokens:
    def test_token_derivado_de_idempotency_es_determinista(self):
        a = order_access_token_from_idempotency("clave-idem-123", "secreto")
        b = order_access_token_from_idempotency("clave-idem-123", "secreto")
        c = order_access_token_from_idempotency("clave-idem-123", "otro-secreto")
        assert a == b
        assert a != c

    def test_verificacion_correcta_e_incorrecta(self):
        token = new_order_access_token()
        digest = token_digest(token)
        assert verify_order_access_token(token, digest) is True
        assert verify_order_access_token("token-falso", digest) is False
        assert verify_order_access_token(None, digest) is False
        assert verify_order_access_token(token, None) is False
