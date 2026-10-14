"""Preview/import owner-supplied photographs through existing LOCAL admin endpoints.

No automatic startup/migration, schema changes, new prices or embedded credentials.
"""
import argparse
import datetime
import json
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply explicitly approved catalog additions")
    parser.add_argument("--base-url", default="http://127.0.0.1:8001", help="Local application origin")
    args = parser.parse_args()
    items = json.loads((ROOT / "frontend/src/data/catalog-products.json").read_text(encoding="utf-8"))
    print(f"{len(items)} fichas reales; precios nuevos: a cotizar; fotos originales optimizadas.")
    if not args.apply:
        print("Vista previa. Para aplicar, autoriza el alcance y ejecuta con --apply.")
        return

    origin = urllib.parse.urlparse(args.base_url)
    if origin.hostname not in {"localhost", "127.0.0.1", "::1"} or origin.scheme not in {"http", "https"} or origin.username or origin.password:
        raise ValueError("Solo se admiten destinos locales para proteger las credenciales.")
    public = (ROOT / "frontend/public").resolve()
    for item in items:
        path = (public / item["gallery"][0].lstrip("/")).resolve()
        if not path.is_relative_to(public) or not path.is_file():
            raise ValueError(f"Fotografía original no disponible: {item['sku']}")

    values = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            if key in {"INITIAL_ADMIN_EMAIL", "INITIAL_ADMIN_PASSWORD"}:
                values[key] = value.strip().strip('"').strip("'")
    if not all(values.get(key) for key in ("INITIAL_ADMIN_EMAIL", "INITIAL_ADMIN_PASSWORD")):
        raise ValueError("Configura las credenciales administrativas locales en .env; no las publiques.")
    base = args.base_url.rstrip("/") + "/api"
    token = None

    def request(path, method="GET", data=None, raw=None, content="application/json"):
        headers = {"Content-Type": content}
        if token:
            headers["Authorization"] = "Bearer " + token
        body = raw if raw is not None else json.dumps(data).encode() if data is not None else None
        try:
            with urllib.request.urlopen(urllib.request.Request(base + path, data=body, headers=headers, method=method), timeout=40) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"API local: HTTP {error.code} en {path.split('?')[0]}") from None

    token = request("/admin/login", "POST", {"email": values["INITIAL_ADMIN_EMAIL"], "password": values["INITIAL_ADMIN_PASSWORD"]})["access_token"]
    before = request("/admin/products-admin")
    backup = ROOT / ".local"
    backup.mkdir(exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    (backup / f"catalog-before-{stamp}.json").write_text(json.dumps(before, ensure_ascii=False, indent=2), encoding="utf-8")
    brands = request("/brands")
    brand_id = next(brand["id"] for brand in brands if brand["slug"] == "hikvision-hilook")
    existing = {product["name"]: product for product in before}
    created = uploaded = 0
    for item in items:
        current = existing.get(item["name"])
        if current is None:
            params = {"name": item["name"], "brand_id": brand_id, "category": item["category"], "sort_order": 100 + created,
                      "description": f"Código catálogo: {item['sku']}. Modelo: {item['model']}. Clasificación según el catálogo proporcionado; confirmar alcance y disponibilidad al cotizar."}
            current = request("/admin/products-admin?" + urllib.parse.urlencode(params), "POST")
            existing[item["name"]] = current
            created += 1
        if not current.get("specs"):
            request(f"/admin/products-admin/{current['id']}", "PUT", {"specs": {**item["specs"], "Código catálogo": item["sku"], "Modelo": item["model"]}})
        if not current.get("image_url"):
            image = (public / item["gallery"][0].lstrip("/")).read_bytes()
            boundary = "catalog-" + uuid.uuid4().hex
            payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{item["sku"]}.webp"\r\nContent-Type: image/webp\r\n\r\n').encode() + image + f"\r\n--{boundary}--\r\n".encode()
            request(f"/admin/products-admin/{current['id']}/upload-image", "POST", raw=payload, content="multipart/form-data; boundary=" + boundary)
            uploaded += 1
    print(json.dumps({"nuevas_fichas": created, "fotos_asignadas": uploaded, "productos": len(request('/admin/products-admin'))}, ensure_ascii=False))


if __name__ == "__main__":
    main()
