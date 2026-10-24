"""Servicio Wompi: firma de webhooks, montos en centavos y URL del widget."""
import hashlib
from decimal import Decimal
from urllib.parse import parse_qs, urlparse

import pytest

from app.config import settings
from app.services.wompi import (
    format_amount_cop,
    generar_signature,
    get_wompi_widget_url,
    verificar_webhook,
)

SECRET = "test_events_secret"


@pytest.fixture(autouse=True)
def webhook_secret(monkeypatch):
    monkeypatch.setattr(settings, "womppi_webhook_secret", SECRET)


def build_payload(transaction_id="tx-1", status="APPROVED", amount=65000000, timestamp=1700000000):
    checksum = hashlib.sha256(f"{transaction_id}{status}{amount}{timestamp}{SECRET}".encode()).hexdigest()
    return {
        "event": "transaction.updated",
        "data": {"transaction": {"id": transaction_id, "status": status, "amount_in_cents": amount, "reference": "IC-TEST"}},
        "timestamp": timestamp,
        "signature": {"checksum": checksum, "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"]},
    }


def test_generar_signature_coincide_con_el_esquema_de_wompi():
    esperado = hashlib.sha256(f"tx-9APPROVED12345001700000000{SECRET}".encode()).hexdigest()
    assert generar_signature("tx-9", "APPROVED", 1234500, 1700000000) == esperado


def test_webhook_valido_es_aceptado():
    assert verificar_webhook(build_payload()) is True


def test_webhook_con_monto_alterado_es_rechazado():
    payload = build_payload()
    payload["data"]["transaction"]["amount_in_cents"] = 1
    assert verificar_webhook(payload) is False


def test_webhook_sin_firma_es_rechazado():
    payload = build_payload()
    payload["signature"] = {}
    assert verificar_webhook(payload) is False


def test_webhook_malformado_no_lanza_excepcion():
    assert verificar_webhook({"timestamp": "no-numerico", "data": None}) is False
    assert verificar_webhook({}) is False


def test_format_amount_cop_convierte_a_centavos():
    assert format_amount_cop(Decimal("650000")) == 65000000
    assert format_amount_cop(Decimal("650000.50")) == 65000050


def test_widget_url_codifica_referencia_y_redirect():
    url = get_wompi_widget_url("pub_test_123", 65000000, "IC-ABC123", "https://mi.sitio/confirmacion?reference=IC-ABC123")
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    assert parsed.netloc == "checkout.wompi.co"
    assert params["public-key"] == ["pub_test_123"]
    assert params["currency"] == ["COP"]
    assert params["amount-in-cents"] == ["65000000"]
    assert params["reference"] == ["IC-ABC123"]
    # El redirect conserva su propio query string gracias al percent-encoding.
    assert params["redirect-url"] == ["https://mi.sitio/confirmacion?reference=IC-ABC123"]
