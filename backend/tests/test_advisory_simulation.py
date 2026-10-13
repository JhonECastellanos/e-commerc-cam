import httpx
from sqlalchemy import func, select
from app.models.prospect import Prospect
from app.routers import simulation
from app.routers.admin_auth import create_token


def needs(**changes):
    answers = {
        "need": "seguridad",
        "property": "casa",
        "environment": "interior",
        "areas": 3,
        "spaces": "Entrada y sala",
        "existing": "no",
        "connectivity": "wifi",
        "goals": ["accesos", "grabacion"],
        "preference": "combo",
        "priority": "planificando",
        "installation": "asesoria",
        "infrastructure": "ninguna",
        "units": 1,
        "support": "asesoria",
    }
    answers.update(changes)
    return answers


def request_body(**changes):
    body = {
        "answers": needs(),
        "configuration": None,
        "name": "Cliente de prueba",
        "contact_method": "telefono",
        "contact": "3001234567",
        "locality": "Bogotá",
        "consent": True,
        "consent_version": "asesoria-2026-10-v1",
    }
    body.update(changes)
    return body


async def test_recommends_only_real_active_combo(client, seed):
    response = await client.post("/api/advisory/profile", json={"answers": needs()})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Combo CCTV básico"
    assert data["combo_ids"] == [seed["combo_wired_id"]]
    assert data["suggested_combo_count"] == 4


async def test_missing_combo_is_personalized_not_invented(client, seed):
    response = await client.post(
        "/api/advisory/profile", json={"answers": needs(areas=12)}
    )
    assert response.json()["category"] == "Instalación de seguridad personalizada"
    assert response.json()["combo_ids"] == []


async def test_automation_and_shared_building_profiles(client, seed):
    automation = await client.post(
        "/api/advisory/profile", json={"answers": needs(goals=["iluminacion"])}
    )
    assert automation.json()["category"] == "Seguridad con automatización y domótica"
    shared = await client.post(
        "/api/advisory/profile",
        json={"answers": needs(property="edificio", infrastructure="shared", units=50)},
    )
    assert shared.json()["category"] == "Proyecto integral avanzado"
    assert shared.json()["units"] == 50


async def test_request_is_saved_and_retry_is_idempotent(client, seed, db_session):
    headers = {"Idempotency-Key": "test-advisory-unique-2026"}
    first = await client.post(
        "/api/advisory/requests", json=request_body(), headers=headers
    )
    second = await client.post(
        "/api/advisory/requests", json=request_body(), headers=headers
    )
    assert first.status_code == second.status_code == 201
    assert first.json()["reference"] == second.json()["reference"]
    assert (await db_session.execute(select(func.count(Prospect.id)))).scalar_one() == 1
    assert "contact" not in first.json()
    conflict = await client.post(
        "/api/advisory/requests",
        json=request_body(name="Cliente cambiado"),
        headers=headers,
    )
    assert conflict.status_code == 409


async def test_consent_and_contact_are_required(client, seed):
    for changes in [
        {"consent": False},
        {"contact": "abc"},
        {"contact_method": "email", "contact": "invalid@"},
        {"website": "spam"},
    ]:
        response = await client.post(
            "/api/advisory/requests",
            json=request_body(**changes),
            headers={"Idempotency-Key": "test-contact-invalid-2026"},
        )
        assert response.status_code == 422


async def test_admin_auth_and_review(client, seed, db_session):
    from app.models.user import User

    admin = (
        await db_session.execute(select(User).where(User.email == "admin@test.com"))
    ).scalar_one()
    await client.post(
        "/api/advisory/requests",
        json=request_body(),
        headers={"Idempotency-Key": "test-review-unique-2026"},
    )
    assert (await client.get("/api/admin/advisory/requests")).status_code == 401
    headers = {
        "Authorization": "Bearer " + create_token(admin.id, admin.email, admin.role)
    }
    rows = await client.get("/api/admin/advisory/requests", headers=headers)
    assert rows.status_code == 200
    item = rows.json()[0]
    reviewed = await client.put(
        f'/api/admin/advisory/requests/{item["id"]}',
        json={
            "status": "en_revision",
            "advisor_notes": "Verificar ubicación antes de cotizar",
        },
        headers=headers,
    )
    assert reviewed.json()["status"] == "en_revision"
    adjusted = await client.put(
        f'/api/admin/advisory/requests/{item["id"]}',
        json={
            "status": "cotizado",
            "advisor_notes": "Requiere integración con la instalación existente",
            "recommendation": "Instalación de seguridad personalizada",
        },
        headers=headers,
    )
    assert adjusted.json()["profile"]["category"] == "Combo CCTV básico"
    assert (
        adjusted.json()["profile"]["advisor_recommendation"]
        == "Instalación de seguridad personalizada"
    )


def virtual_design():
    return {
        "version": 1,
        "scenario": "casa",
        "devices": [
            {
                "id": "light-1",
                "kind": "light",
                "name": "Luz cocina",
                "room": "cocina",
                "x": 3.5,
                "y": 2.5,
                "z": 3.5,
                "rotation": 0,
                "on": False,
                "range": 5,
                "angle": 80,
            }
        ],
        "rules": [],
        "infrastructure": "local",
        "unit": "Unidad virtual",
    }


async def test_valid_design_is_associated_and_invalid_rooms_rejected(
    client, seed, db_session
):
    body = request_body(configuration=virtual_design())
    response = await client.post(
        "/api/advisory/requests",
        json=body,
        headers={"Idempotency-Key": "test-design-unique-2026"},
    )
    assert response.status_code == 201
    row = (await db_session.execute(select(Prospect))).scalar_one()
    assert row.configuration["devices"][0]["id"] == "light-1"
    assert row.profile["automation"] is True
    body["configuration"]["devices"][0]["x"] = 99
    invalid = await client.post(
        "/api/advisory/profile",
        json={"answers": body["answers"], "configuration": body["configuration"]},
    )
    assert invalid.status_code == 422
    body["configuration"]["devices"][0].update(
        kind="microphone", room="bano", x=2.1, z=-4
    )
    private = await client.post(
        "/api/advisory/profile",
        json={"answers": body["answers"], "configuration": body["configuration"]},
    )
    assert private.status_code == 422


def command():
    return {
        "message": "Enciende la luz de la cocina",
        "scenario": "casa",
        "devices": [{"id": "light-1", "kind": "light", "room": "cocina"}],
        "consent": True,
    }


async def test_ai_missing_key_and_consent(client, monkeypatch):
    monkeypatch.setattr(simulation.settings, "gemini_api_key", "")
    fallback = await client.post("/api/simulation/interpret", json=command())
    assert fallback.json()["provider"] == "Motor local"
    assert fallback.json()["action"] is None
    body = command()
    body["consent"] = False
    assert (
        await client.post("/api/simulation/interpret", json=body)
    ).status_code == 422


async def test_gemini_is_schema_bounded_mocked_not_live(client, monkeypatch):
    monkeypatch.setattr(simulation.settings, "gemini_api_key", "unit-test-placeholder")
    response_action = {"ids": ["light-1"], "on": True}

    class FakeGemini:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, url, headers, json):
            assert url.startswith("https://generativelanguage.googleapis.com/")
            assert "contact" not in str(json) and "customer" not in str(json)
            return httpx.Response(
                200,
                request=httpx.Request("POST", url),
                json={
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {
                                        "text": __import__("json").dumps(
                                            {
                                                "reply": "Cambio virtual aplicado",
                                                "action": response_action,
                                            }
                                        )
                                    }
                                ]
                            }
                        }
                    ]
                },
            )

    monkeypatch.setattr(simulation.httpx, "AsyncClient", FakeGemini)
    response = await client.post("/api/simulation/interpret", json=command())
    assert response.status_code == 200
    assert response.json()["action"]["ids"] == ["light-1"]
    response_action["ids"] = ["foreign-device"]
    assert (
        await client.post("/api/simulation/interpret", json=command())
    ).status_code == 422
    body = command()
    body["message"] = "Mi correo personal es prueba@example.com"
    assert (
        await client.post("/api/simulation/interpret", json=body)
    ).status_code == 422
