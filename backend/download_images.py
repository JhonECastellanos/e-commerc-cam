"""
Script para descargar imágenes de referencia de MercadoLibre Colombia
para cada marca del catálogo. Genera SVGs placeholder como fallback.

Uso: python download_images.py
"""

import asyncio
import os
import httpx

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "uploads", "catalog")
os.makedirs(OUTPUT_DIR, exist_ok=True)

BRANDS_SEARCH = {
    "hikvision": "kit camaras seguridad hikvision",
    "dahua": "kit camaras seguridad dahua",
    "tp-link": "kit camaras tp link tapo vigilancia",
    "ezviz": "kit camaras ezviz seguridad",
    "imou": "kit camaras imou seguridad",
    "xiaomi": "kit camaras xiaomi seguridad",
    "reolink": "kit camaras reolink seguridad",
    "eufy": "kit camaras eufy seguridad",
    "ring": "kit camaras ring seguridad",
    "vta": "kit camaras vta seguridad",
}

PLACEHOLDER_SVGS = {
    "hikvision": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1a237e"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">HIKVISION</text><text x="200" y="180" text-anchor="middle" fill="#90caf9" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "dahua": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#b71c1c"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">DAHUA</text><text x="200" y="180" text-anchor="middle" fill="#ef9a9a" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "tp-link": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#004d40"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">TP-Link</text><text x="200" y="180" text-anchor="middle" fill="#80cbc4" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "ezviz": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e65100"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">EZVIZ</text><text x="200" y="180" text-anchor="middle" fill="#ffcc80" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "imou": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1565c0"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">IMOU</text><text x="200" y="180" text-anchor="middle" fill="#90caf9" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "xiaomi": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#ff6f00"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">XIAOMI</text><text x="200" y="180" text-anchor="middle" fill="#ffcc80" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "reolink": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1b5e20"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">REOLINK</text><text x="200" y="180" text-anchor="middle" fill="#a5d6a7" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "eufy": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#4a148c"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">EUFY</text><text x="200" y="180" text-anchor="middle" fill="#ce93d8" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "ring": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#0d47a1"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">RING</text><text x="200" y="180" text-anchor="middle" fill="#90caf9" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
    "vta": '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#bf360c"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">VTA+</text><text x="200" y="180" text-anchor="middle" fill="#ffab91" font-size="14" font-family="Arial">Cámaras de Seguridad</text></svg>',
}

async def download_from_mercadolibre(brand_key: str, search_term: str):
    """Intenta descargar la primera imagen de MercadoLibre Colombia para el término de búsqueda."""
    filename = f"{brand_key}.jpg"
    filepath = os.path.join(OUTPUT_DIR, filename)

    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        print(f"  Ya existe: {filename}")
        return filename

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            url = f"https://api.mercadolibre.com/sites/MCO/search?q={search_term}&limit=1"
            resp = await client.get(url, headers={"User-Agent": "InstalaCamara/2.0"})

            if resp.is_success:
                data = resp.json()
                results = data.get("results", [])
                if results:
                    img_url = results[0].get("thumbnail", "")
                    if img_url:
                        img_resp = await client.get(img_url.replace("http://", "https://"))
                        if img_resp.is_success:
                            with open(filepath, "wb") as f:
                                f.write(img_resp.content)
                            print(f"  Descargado: {filename} ({len(img_resp.content)} bytes)")
                            return filename
    except Exception as e:
        print(f"  Error descargando {brand_key}: {e}")

    print(f"  Generando SVG placeholder para {brand_key}")
    svg_path = os.path.join(OUTPUT_DIR, f"{brand_key}.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(PLACEHOLDER_SVGS.get(brand_key, PLACEHOLDER_SVGS["hikvision"]))
    return f"{brand_key}.svg"

async def main():
    print("=== Descarga de imágenes del catálogo ===")
    print(f"Directorio: {OUTPUT_DIR}\n")

    tasks = []
    for brand_key, search_term in BRANDS_SEARCH.items():
        print(f"Procesando: {brand_key}...")
        tasks.append(download_from_mercadolibre(brand_key, search_term))

    results = await asyncio.gather(*tasks)
    print(f"\n=== Completado. {len(results)} imágenes procesadas ===")

if __name__ == "__main__":
    asyncio.run(main())
