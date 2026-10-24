"""Derive commercial metadata from the supplied folders/Excel; never invent prices."""
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
rows = []
with zipfile.ZipFile(root.parent / "CATALOGO/Categorizacion_jo.xlsx") as archive:
    shared = []
    if "xl/sharedStrings.xml" in archive.namelist():
        shared = ["".join(item.itertext()) for item in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
    sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
    for row in sheet.findall("s:sheetData/s:row", ns):
        cells = {}
        for cell in row:
            column = re.sub(r"\d", "", cell.attrib["r"])
            value = cell.find("s:v", ns)
            text = value.text if value is not None else ""
            if cell.attrib.get("t") == "s":
                text = shared[int(text)]
            elif cell.attrib.get("t") == "inlineStr":
                text = "".join(cell.find("s:is", ns).itertext())
            cells[column] = text or ""
        rows.append(cells)
headers = rows[0]
records = [{headers[c]: value for c, value in row.items() if c in headers} for row in rows[1:]]
normalize = lambda text: re.sub(r"[^A-Z0-9]", "", text.upper())
metadata = {normalize(r.get("Modelo", "")): r for r in records if r.get("Modelo")}
photos = json.loads((root / "frontend/src/data/catalog-photos.json").read_text(encoding="utf-8"))
groups = {}
for photo in photos:
    if "/Productos_" in photo["source"]:
        folder = photo["source"].rsplit("/", 1)[0]
        groups.setdefault(folder, []).append(photo)
products = []
for folder, gallery in sorted(groups.items()):
    gallery.sort(key=lambda p: p["source"])
    model = Path(gallery[0]["source"]).stem.split("_image_")[0]
    if not re.match(r"^(IPC-|DS-|iDS-|HWD-)", model, re.I):
        model = folder.split("/")[-1].replace("_", " ")
    row = metadata.get(normalize(model), {})
    brand = row.get("Marca") or ("HiLook" if "/Productos_Hilook/" in folder else "Hikvision")
    category = row.get("Subcategoria") or next((label for token, label in [("CAM_IP", "Cámaras IP"), ("CAMARAS_PTZ", "Cámaras PTZ"), ("CAMARAS_TURBO_HD", "Cámaras analógicas"), ("/DVR/", "DVR / Grabadores")] if token in folder), "Equipos de seguridad")
    sku = "IC-" + hashlib.sha256(folder.encode()).hexdigest()[:10].upper()
    specs = {k.replace("_", " "): v for k, v in row.items() if v and k not in {"ID", "Marca", "Modelo", "Nombre", "Subcategoria"} and "link" not in k.lower() and "imagenes locales" not in k.lower() and not v.startswith("http")}
    products.append({"sku": sku, "name": f"{category} · {row.get('Modelo') or model}", "model": row.get("Modelo") or model, "brand": brand, "category": category, "source": folder, "specs": specs, "gallery": [p["url"] for p in gallery]})
target = root / "frontend/src/data/catalog-products.json"
target.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(products)} productos con código estable y fotografías. {sum(bool(p['specs']) for p in products)} fichas enlazadas al Excel. Precios: solo desde la API existente.")
