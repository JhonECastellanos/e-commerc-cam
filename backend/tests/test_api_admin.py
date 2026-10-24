"""Panel admin: autenticación JWT, rate limit de login y endpoints protegidos."""

from app.config import settings

from .conftest import ADMIN_EMAIL, ADMIN_PASSWORD


async def login(client) -> str:
    res = await client.post("/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert res.status_code == 200
    return res.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_login_correcto_devuelve_token_y_me_funciona(client, seed):
    token = await login(client)
    me = await client.get("/api/admin/me", headers=auth(token))
    assert me.status_code == 200
    assert me.json()["email"] == ADMIN_EMAIL
    assert me.json()["role"] == "admin"


async def test_login_con_password_incorrecta_falla(client, seed):
    res = await client.post("/api/admin/login", json={"email": ADMIN_EMAIL, "password": "ClaveIncorrecta1"})
    assert res.status_code == 401


async def test_login_con_email_desconocido_falla_igual(client, seed):
    res = await client.post("/api/admin/login", json={"email": "nadie@test.com", "password": "CualquierClave1"})
    assert res.status_code == 401


async def test_rate_limit_de_login(client, seed):
    body = {"email": ADMIN_EMAIL, "password": "ClaveIncorrecta1"}
    for _ in range(settings.rate_limit_login):
        assert (await client.post("/api/admin/login", json=body)).status_code == 401
    assert (await client.post("/api/admin/login", json=body)).status_code == 429


async def test_endpoints_admin_rechazan_sin_token(client, seed):
    for path in ["/api/admin/me", "/api/admin/dashboard", "/api/admin/orders", "/api/admin/prices/settings"]:
        res = await client.get(path)
        assert res.status_code == 401, path


async def test_endpoints_admin_rechazan_token_invalido(client, seed):
    res = await client.get("/api/admin/me", headers=auth("token.falso.abc"))
    assert res.status_code == 401


async def test_dashboard_responde_con_estructura_completa(client, seed):
    token = await login(client)
    res = await client.get("/api/admin/dashboard", headers=auth(token))
    assert res.status_code == 200
    data = res.json()
    for key in ["total_sales_month", "orders_by_status", "sales_by_brand", "avg_ticket", "installed_count"]:
        assert key in data


async def test_listado_y_cambio_de_estado_de_ordenes_admin(client, seed):
    from .test_api_orders import create_order

    created = (await create_order(client, seed)).json()
    token = await login(client)

    listado = await client.get("/api/admin/orders", headers=auth(token))
    assert listado.status_code == 200
    items = listado.json()["items"]
    assert len(items) == 1
    assert items[0]["reference"] == created["reference"]
    assert items[0]["combo"]["cameras_count"] == 4

    order_id = items[0]["id"]
    updated = await client.put(f"/api/admin/orders/{order_id}/status", json={"status": "pagado"}, headers=auth(token))
    assert updated.status_code == 200
    assert updated.json()["status"] == "pagado"

    invalido = await client.put(f"/api/admin/orders/{order_id}/status", json={"status": "no-existe"}, headers=auth(token))
    assert invalido.status_code == 400


async def test_actualizar_setting_de_tarifa(client, seed):
    token = await login(client)
    res = await client.put(
        "/api/admin/prices/settings/install_fee_per_camera",
        json={"value": "80000"},
        headers=auth(token),
    )
    assert res.status_code == 200
    # La tarifa nueva se refleja en el precio público del combo cableado.
    combos = await client.get("/api/combos")
    wired = next(c for c in combos.json() if c["id"] == seed["combo_wired_id"])
    assert float(wired["final_price"]) == 1_000_000 + 80_000 * 4
