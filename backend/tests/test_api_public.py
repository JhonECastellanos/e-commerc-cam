"""API pública: catálogo, precios calculados en servidor, cobertura y cabeceras."""


async def test_health_live(client):
    res = await client.get("/api/health/live")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_cabeceras_de_seguridad_presentes(client):
    res = await client.get("/api/health/live")
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'self'" in res.headers["Content-Security-Policy"]
    assert res.headers.get("X-Request-ID")


async def test_brands_lista_solo_activas(client, seed):
    res = await client.get("/api/brands")
    assert res.status_code == 200
    slugs = [b["slug"] for b in res.json()]
    assert slugs == ["hikvision"]


async def test_combos_calculan_precio_final_en_el_backend(client, seed):
    res = await client.get("/api/combos")
    assert res.status_code == 200
    combos = {c["id"]: c for c in res.json()}
    # Cableado: 1.000.000 + 75.000 * 4 cámaras = 1.300.000
    assert float(combos[seed["combo_wired_id"]]["final_price"]) == 1_300_000
    # Inalámbrico: 800.000 + 50.000 * 2 cámaras = 900.000
    assert float(combos[seed["combo_wireless_id"]]["final_price"]) == 900_000
    # El combo inactivo no aparece.
    assert seed["combo_inactive_id"] not in combos


async def test_combos_filtra_por_precio(client, seed):
    res = await client.get("/api/combos", params={"max_price": "1000000"})
    ids = [c["id"] for c in res.json()]
    assert ids == [seed["combo_wireless_id"]]


async def test_combo_inactivo_devuelve_404(client, seed):
    res = await client.get(f"/api/combos/{seed['combo_inactive_id']}")
    assert res.status_code == 404


async def test_precio_de_combo_con_almacenamiento(client, seed):
    res = await client.get(f"/api/combos/{seed['combo_wired_id']}/price", params={"storage": "1TB"})
    assert res.status_code == 200
    data = res.json()
    assert float(data["total"]) == 1_450_000
    assert float(data["deposit_50"]) == 725_000
    assert float(data["balance_50"]) == 725_000
    assert data["storage_choice"] == "1TB"


async def test_precio_de_combo_personalizado(client, seed):
    payload = {"brand_slug": "hikvision", "mode": "cableado", "cameras_count": 4, "resolution": "2MP"}
    res = await client.post("/api/custom-combo/price", json=payload)
    assert res.status_code == 200
    data = res.json()
    # Por cámara: 1.000.000 / 4 = 250.000 → equipo 1.000.000 + instalación 300.000
    assert float(data["total"]) == 1_300_000
    assert float(data["deposit_50"]) == 650_000


async def test_precio_personalizado_valida_entrada(client, seed):
    res = await client.post(
        "/api/custom-combo/price",
        json={"brand_slug": "hikvision", "mode": "cableado", "cameras_count": 0, "resolution": "2MP"},
    )
    assert res.status_code == 422
    res = await client.post(
        "/api/custom-combo/price",
        json={"brand_slug": "hikvision", "mode": "no-existe", "cameras_count": 2, "resolution": "2MP"},
    )
    assert res.status_code == 422


async def test_coverage_areas_solo_activas(client, seed):
    res = await client.get("/api/coverage-areas")
    names = [c["name"] for c in res.json()]
    assert names == ["Chía"]


async def test_settings_publicos_incluyen_contador_de_instalaciones(client, seed):
    res = await client.get("/api/settings/public")
    assert res.status_code == 200
    data = res.json()
    assert data["installed_count"] == 0
    assert "whatsapp_number" in data
