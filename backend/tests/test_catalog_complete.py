from decimal import Decimal

from app.models.brand import Brand
from app.models.combo import Combo
from .test_api_admin import auth, login


async def test_named_dahua_without_level_is_public_with_original_name_and_price(client, seed, db_session):
    brand = Brand(name="Dahua / Cooper", slug="dahua-cooper", active=True)
    db_session.add(brand)
    await db_session.flush()
    combo = Combo(brand_id=brand.id, name="3cam_2mp_dvr_4chanels_500gb_app", mode="cableado", resolution="2MP", cameras_count=3, equipment_price=Decimal("549000"), install_fee=Decimal("0"), active=True, instalacion_incluida=False)
    db_session.add(combo)
    db_session.add(Combo(brand_id=brand.id, mode="cableado", resolution="2MP", cameras_count=8, equipment_price=100000, active=True))
    await db_session.commit()
    response = await client.get("/api/combos", params={"brand": "dahua-cooper"})
    assert response.status_code == 200
    assert len(response.json()) == 1
    actual = response.json()[0]
    assert actual["name"] == combo.name
    assert actual["level"] is None
    assert actual["instalacion_incluida"] is False
    assert Decimal(actual["final_price"]) == Decimal("549000")
    assert (await client.get(f"/api/combos/{combo.id}")).json()["name"] == combo.name
    assert (await client.get("/api/combos", params={"max_price": "0"})).json() == []


async def test_admin_crud_prices_classification_and_visibility_in_isolated_database(client, seed):
    headers = auth(await login(client))
    product = await client.post("/api/admin/products-admin", headers=headers, params={"name": "Equipo QA aislado", "brand_id": seed["brand_id"], "category": "Grabadores", "price": 500000})
    assert product.status_code == 200
    product_id = product.json()["id"]
    uploaded = await client.post(f"/api/admin/products-admin/{product_id}/upload-image", headers=headers, files={"file": ("real.png", b"\x89PNG\r\n\x1a\n" + b"image-fixture", "image/png")})
    assert uploaded.status_code == 200
    assert (await client.put("/api/admin/prices/settings/show_product_prices", headers=headers, json={"value": "true"})).status_code == 200
    specs = {"Clasificacion manual": "si", "Modalidades del catalogo": "cableado,hibrido", "Funciones del catalogo": "recorder,motion"}
    updated = await client.put(f"/api/admin/products-admin/{product_id}", headers=headers, json={"price": 600000, "category": "Grabadores inteligentes", "specs": specs, "active": True})
    assert updated.status_code == 200
    public = (await client.get("/api/products")).json()
    assert public[0]["category"] == "Grabadores inteligentes"
    assert public[0]["specs"] == specs
    assert public[0]["price"] == 600000
    combo = await client.post("/api/admin/combos-admin", headers=headers, params={"name": "Combo QA", "brand_id": seed["brand_id"], "cameras_count": 4, "equipment_price": 1000000})
    assert combo.status_code == 200
    combo_id = combo.json()["id"]
    assert Decimal(combo.json()["final_price"]) == Decimal("1300000")
    assert combo.json()["install_fee"] is None
    changed = await client.put(f"/api/admin/combos-admin/{combo_id}", headers=headers, json={"equipment_price": 1100000, "install_fee": 0, "active": False})
    assert changed.status_code == 200
    assert Decimal(changed.json()["final_price"]) == Decimal("1100000")
    assert combo_id not in [c["id"] for c in (await client.get("/api/combos")).json()]
    assert any(item["entity_id"] == combo_id for item in (await client.get("/api/admin/prices/changelog", headers=headers)).json())
    assert (await client.delete(f"/api/admin/products-admin/{product_id}", headers=headers)).status_code == 200
    assert (await client.delete(f"/api/admin/combos-admin/{combo_id}", headers=headers)).status_code == 200


async def test_admin_controls_banner_video_and_builtin_slide_count(client, seed):
    headers = auth(await login(client))
    assert (await client.put("/api/admin/prices/settings/hero_demo_slides", json={"value": "house"})).status_code == 401
    invalid = await client.put("/api/admin/prices/settings/hero_demo_slides", headers=headers, json={"value": "house,unknown"})
    assert invalid.status_code == 422
    assert (await client.put("/api/admin/prices/settings/hero_demo_slides", headers=headers, json={"value": "house,apartment"})).status_code == 200
    assert (await client.get("/api/settings/public")).json()["hero_demo_slides"] == "house,apartment"
    banner = await client.post("/api/admin/banners", headers=headers, json={"title": "Banner QA", "video_url": "/banner-assets/casa-loop.mp4", "position": 1})
    assert banner.status_code == 200
    banner_id = banner.json()["id"]
    assert (await client.get("/api/banners")).json()[0]["video_url"] == "/banner-assets/casa-loop.mp4"
    assert (await client.put(f"/api/admin/banners/{banner_id}", headers=headers, json={"video_url": "/banner-assets/apartamento-loop.mp4", "active": False})).status_code == 200
    assert (await client.get("/api/banners")).json() == []
    assert (await client.delete(f"/api/admin/banners/{banner_id}", headers=headers)).status_code == 200
