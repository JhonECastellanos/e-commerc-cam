"""Flujo de órdenes y pagos: creación, idempotencia, webhook Wompi y PDF protegido."""
import hashlib
import uuid

import pytest
from sqlalchemy import func, select

from app.config import settings
from app.models.notification import Notification
from app.models.order import Order

from .conftest import order_payload

WEBHOOK_SECRET = "test_events_secret"


@pytest.fixture(autouse=True)
def wompi_secret(monkeypatch):
    monkeypatch.setattr(settings, "womppi_webhook_secret", WEBHOOK_SECRET)


def idem_key() -> str:
    return f"idem-{uuid.uuid4().hex}"


def webhook_payload(reference: str, amount_cents: int, transaction_id="tx-100", status="APPROVED", checksum=None):
    timestamp = 1700000000
    raw = f"{transaction_id}{status}{amount_cents}{timestamp}{WEBHOOK_SECRET}"
    return {
        "event": "transaction.updated",
        "data": {"transaction": {
            "id": transaction_id, "status": status, "amount_in_cents": amount_cents,
            "reference": reference, "currency": "COP",
        }},
        "timestamp": timestamp,
        "signature": {"checksum": checksum or hashlib.sha256(raw.encode()).hexdigest()},
    }


async def create_order(client, seed, **overrides):
    payload = order_payload(combo_id=seed["combo_wired_id"], **overrides)
    res = await client.post("/api/orders", json=payload, headers={"Idempotency-Key": idem_key()})
    return res


async def test_crear_orden_calcula_totales_en_el_servidor(client, seed):
    res = await create_order(client, seed)
    assert res.status_code == 201
    data = res.json()
    assert data["total"] == 1_300_000
    assert data["deposit_50"] == 650_000
    assert data["balance_50"] == 650_000
    assert data["reference"].startswith("IC-")
    assert data["order_access_token"]
    assert "amount-in-cents=65000000" in data["checkout_url"]


async def test_orden_con_almacenamiento_suma_el_precio(client, seed):
    res = await create_order(client, seed, storage_choice="1TB")
    assert res.status_code == 201
    assert res.json()["total"] == 1_450_000


async def test_orden_con_almacenamiento_invalido_es_rechazada(client, seed):
    res = await create_order(client, seed, storage_choice="9TB")
    assert res.status_code == 400


async def test_idempotencia_no_duplica_ordenes(client, seed, db_session):
    key = idem_key()
    payload = order_payload(combo_id=seed["combo_wired_id"])
    first = await client.post("/api/orders", json=payload, headers={"Idempotency-Key": key})
    second = await client.post("/api/orders", json=payload, headers={"Idempotency-Key": key})
    assert first.status_code == 201
    assert second.json()["reference"] == first.json()["reference"]
    count = (await db_session.execute(select(func.count()).select_from(Order))).scalar_one()
    assert count == 1


async def test_orden_sin_aceptar_terminos_es_rechazada(client, seed):
    res = await create_order(client, seed, terms_accepted=False)
    assert res.status_code == 400


async def test_orden_en_municipio_sin_cobertura_es_rechazada(client, seed):
    res = await create_order(client, seed, municipality="Girardot")
    assert res.status_code == 400


async def test_orden_exige_exactamente_una_seleccion(client, seed):
    payload = order_payload(
        combo_id=seed["combo_wired_id"],
        custom_combo={"brand_slug": "hikvision", "mode": "cableado", "cameras_count": 2, "resolution": "2MP"},
    )
    res = await client.post("/api/orders", json=payload, headers={"Idempotency-Key": idem_key()})
    assert res.status_code == 422


async def test_orden_con_combo_personalizado(client, seed):
    payload = order_payload(
        custom_combo={"brand_slug": "hikvision", "mode": "inalambrico", "cameras_count": 3, "resolution": "3MP"},
    )
    res = await client.post("/api/orders", json=payload, headers={"Idempotency-Key": idem_key()})
    assert res.status_code == 201
    # Referencia inalámbrica: 800.000 / 2 = 400.000 por cámara → 1.200.000 + 3 * 50.000
    assert res.json()["total"] == 1_350_000


async def test_consulta_de_orden_requiere_token_de_acceso(client, seed):
    created = (await create_order(client, seed)).json()
    ref, token = created["reference"], created["order_access_token"]

    ok = await client.get(f"/api/orders/{ref}", headers={"X-Order-Access-Token": token})
    assert ok.status_code == 200
    assert ok.json()["status"] == "cotizacion"

    assert (await client.get(f"/api/orders/{ref}")).status_code == 404
    wrong = await client.get(f"/api/orders/{ref}", headers={"X-Order-Access-Token": "token-invalido"})
    assert wrong.status_code == 404


async def test_descarga_de_pdf_protegida_por_token(client, seed):
    created = (await create_order(client, seed)).json()
    ref, token = created["reference"], created["order_access_token"]

    ok = await client.get(f"/api/orders/{ref}/pdf", headers={"X-Order-Access-Token": token})
    assert ok.status_code == 200
    assert ok.headers["content-type"] == "application/pdf"

    assert (await client.get(f"/api/orders/{ref}/pdf")).status_code == 404


async def test_pdf_se_regenera_si_el_disco_es_efimero(client, seed, tmp_path):
    created = (await create_order(client, seed)).json()
    ref, token = created["reference"], created["order_access_token"]

    first = await client.get(f"/api/orders/{ref}/pdf", headers={"X-Order-Access-Token": token})
    assert first.status_code == 200

    # Simula un cold start serverless: el archivo generado ya no existe.
    pdf_file = tmp_path / f"acuerdo_{ref}.pdf"
    assert pdf_file.is_file()
    pdf_file.unlink()

    second = await client.get(f"/api/orders/{ref}/pdf", headers={"X-Order-Access-Token": token})
    assert second.status_code == 200
    assert second.headers["content-type"] == "application/pdf"
    assert pdf_file.is_file()


async def test_webhook_con_firma_invalida_es_rechazado(client, seed):
    created = (await create_order(client, seed)).json()
    payload = webhook_payload(created["reference"], 65000000, checksum="0" * 64)
    res = await client.post("/api/payments/wompi/webhook", json=payload)
    assert res.status_code == 400


async def test_webhook_aprobado_reserva_la_orden(client, seed, db_session):
    created = (await create_order(client, seed)).json()
    res = await client.post("/api/payments/wompi/webhook", json=webhook_payload(created["reference"], 65000000))
    assert res.status_code == 200

    status = await client.get(
        f"/api/orders/{created['reference']}", headers={"X-Order-Access-Token": created["order_access_token"]}
    )
    assert status.json()["status"] == "reservado"

    notif_count = (await db_session.execute(select(func.count()).select_from(Notification))).scalar_one()
    assert notif_count == 1


async def test_webhook_con_monto_incorrecto_es_rechazado(client, seed):
    created = (await create_order(client, seed)).json()
    # Firma válida pero por un monto distinto al anticipo del 50%.
    res = await client.post("/api/payments/wompi/webhook", json=webhook_payload(created["reference"], 100))
    assert res.status_code == 400


async def test_webhook_repetido_es_idempotente_y_conflicto_con_otro_pago(client, seed):
    created = (await create_order(client, seed)).json()
    ref = created["reference"]
    first = await client.post("/api/payments/wompi/webhook", json=webhook_payload(ref, 65000000, transaction_id="tx-1"))
    assert first.status_code == 200
    # Reintento del mismo evento: sigue siendo 200 sin duplicar nada.
    retry = await client.post("/api/payments/wompi/webhook", json=webhook_payload(ref, 65000000, transaction_id="tx-1"))
    assert retry.status_code == 200
    # Un segundo pago con otra transacción entra en conflicto.
    other = await client.post("/api/payments/wompi/webhook", json=webhook_payload(ref, 65000000, transaction_id="tx-2"))
    assert other.status_code == 409


async def test_webhook_para_orden_inexistente_devuelve_404(client, seed):
    res = await client.post("/api/payments/wompi/webhook", json=webhook_payload("IC-NOEXISTE", 65000000))
    assert res.status_code == 404


async def test_rate_limit_de_creacion_de_ordenes(client, seed):
    payload = order_payload(combo_id=seed["combo_wired_id"], terms_accepted=False)
    for _ in range(settings.rate_limit_order):
        res = await client.post("/api/orders", json=payload, headers={"Idempotency-Key": idem_key()})
        assert res.status_code == 400
    res = await client.post("/api/orders", json=payload, headers={"Idempotency-Key": idem_key()})
    assert res.status_code == 429
