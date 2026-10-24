"""Corrección autorizada: el kit de 10 cámaras pertenece a HiLook, no a Dahua.

Dry-run por defecto. Solo API local, credenciales desde el entorno, sin imprimirlas.
Oculta la ficha Dahua 13cam incorrecta; conserva el registro y sus precios. Idempotente.
"""
import argparse
import json
import os
import urllib.request
from urllib.parse import urlparse


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--origin", default="http://127.0.0.1:8001")
    args = parser.parse_args()
    origin = args.origin.rstrip("/")
    parsed = urlparse(origin)
    if parsed.scheme != "http" or parsed.hostname not in {"localhost", "127.0.0.1"} or parsed.path:
        raise SystemExit("Esta corrección solo admite la API local del proyecto.")

    def request(path, data=None, method="GET", token=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(origin + "/api" + path, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)

    token = request("/admin/login", {"email": os.environ["INITIAL_ADMIN_EMAIL"], "password": os.environ["INITIAL_ADMIN_PASSWORD"]}, "POST")["access_token"]
    combos = request("/admin/combos-admin", token=token)
    hilook = [c for c in combos if c.get("name") == "10cam_2mp_dvr_16chanels_2tb_app" and c["cameras_count"] == 10 and "hilook" in (c.get("brand_name") or "").lower() and c["active"]]
    if len(hilook) != 1:
        raise SystemExit("No existe una única ficha HiLook de 10 cámaras activa; no se modificó ningún registro.")
    matches = [c for c in combos if "dahua" in (c.get("brand_name") or "").lower() and c.get("name") == "13cam_2mp_dvr_16chanels_2tb_app" and c["cameras_count"] == 13]
    if len(matches) != 1:
        raise SystemExit("No existe una única ficha Dahua incorrecta; no se modificó ningún registro.")
    before = matches[0]
    if not before["active"]:
        print("Corrección ya aplicada: HiLook 10cam activo; Dahua 13cam oculto.")
        return
    print(f"Conservar HiLook 10cam #{hilook[0]['id']}; ocultar Dahua 13cam #{before['id']}.")
    if not args.apply:
        print("Simulación. Usa --apply para guardar la corrección autorizada.")
        return
    after = request(f"/admin/combos-admin/{before['id']}", {"active": False}, "PUT", token)
    assert after["equipment_price"] == before["equipment_price"]
    assert after["install_fee"] == before["install_fee"]
    assert after["active"] is False
    print("Ficha Dahua incorrecta oculta. Registro y precios conservados. HiLook 10cam sin cambios.")



if __name__ == "__main__":
    main()
