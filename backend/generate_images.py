import os

BRANDS = {
    "hikvision": {"name": "HIKVISION", "color": "#1a237e", "accent": "#42a5f5"},
    "dahua": {"name": "DAHUA", "color": "#b71c1c", "accent": "#ef5350"},
    "tp-link": {"name": "TP-Link Tapo", "color": "#004d40", "accent": "#4db6ac"},
    "ezviz": {"name": "EZVIZ", "color": "#e65100", "accent": "#ff9800"},
    "imou": {"name": "IMOU", "color": "#1565c0", "accent": "#42a5f5"},
    "xiaomi": {"name": "XIAOMI", "color": "#263238", "accent": "#78909c"},
    "reolink": {"name": "REOLINK", "color": "#1b5e20", "accent": "#66bb6a"},
    "eufy": {"name": "EUFY", "color": "#4a148c", "accent": "#ab47bc"},
    "ring": {"name": "RING", "color": "#0d47a1", "accent": "#1e88e5"},
    "vta": {"name": "VTA+", "color": "#bf360c", "accent": "#ff5722"},
}

def make_hero(brand, color, accent):
    return '''<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="bg-''' + brand + '''" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:''' + color + ''';stop-opacity:1" />
      <stop offset="100%" style="stop-color:''' + color + ''';stop-opacity:0.8" />
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="12" fill="url(#bg-''' + brand + '''")/>
  <circle cx="480" cy="120" r="100" fill="''' + accent + '''" opacity="0.15"/>
  <circle cx="120" cy="320" r="80" fill="''' + accent + '''" opacity="0.1"/>
  <g transform="translate(300,160)" fill="none" stroke="white" stroke-width="2.5">
    <rect x="-60" y="-40" width="120" height="90" rx="8" stroke-width="3"/>
    <circle cx="0" cy="5" r="20" stroke-width="2.5"/>
    <circle cx="0" cy="5" r="6" fill="white" stroke="none"/>
    <rect x="-8" y="55" width="16" height="6" rx="2" fill="white" stroke="none"/>
    <rect x="-15" y="30" width="6" height="15" rx="2" fill="white" stroke="none"/>
    <rect x="9" y="30" width="6" height="15" rx="2" fill="white" stroke="none"/>
  </g>
  <g transform="translate(180,130)" fill="none" stroke="white" stroke-width="2">
    <rect x="-35" y="-25" width="70" height="55" rx="5"/>
    <circle cx="0" cy="2" r="12"/>
    <circle cx="0" cy="2" r="4" fill="white" stroke="none"/>
  </g>
  <g transform="translate(420,140)" fill="none" stroke="white" stroke-width="2">
    <rect x="-35" y="-25" width="70" height="55" rx="5"/>
    <circle cx="0" cy="2" r="12"/>
    <circle cx="0" cy="2" r="4" fill="white" stroke="none"/>
  </g>
  <text x="300" y="310" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial, sans-serif">''' + BRANDS[brand]["name"] + '''</text>
  <text x="300" y="340" text-anchor="middle" fill="white" font-size="14" font-family="Arial, sans-serif" opacity="0.8">Kit de Cámaras de Seguridad</text>
  <text x="300" y="365" text-anchor="middle" fill="''' + accent + '''" font-size="12" font-family="Arial, sans-serif" opacity="0.9">Sistema de Videovigilancia Profesional</text>
</svg>'''

def make_detail(brand, color, accent, tipo):
    title = "Camara Full HD" if tipo == "camara" else "DVR/NVR Grabador"
    icon = "📷" if tipo == "camara" else "💾"
    return '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" rx="8" fill="#f8f9fa"/>
  <rect x="0" y="0" width="400" height="8" fill="''' + color + '''"/>
  <circle cx="200" cy="180" r="70" fill="''' + color + '''" opacity="0.1"/>
  <text x="200" y="180" text-anchor="middle" font-size="60">''' + icon + '''</text>
  <text x="200" y="280" text-anchor="middle" fill="''' + color + '''" font-size="20" font-weight="bold" font-family="Arial, sans-serif">''' + BRANDS[brand]["name"] + '''</text>
  <text x="200" y="310" text-anchor="middle" fill="#555" font-size="14" font-family="Arial, sans-serif">''' + title + '''</text>
  <rect x="100" y="330" width="200" height="2" rx="1" fill="''' + accent + '''" opacity="0.5"/>
  <text x="200" y="365" text-anchor="middle" fill="#777" font-size="11" font-family="Arial, sans-serif">Detalle de producto</text>
</svg>'''

base = "frontend/public/images/brands"
for brand, info in BRANDS.items():
    d = os.path.join(base, brand)
    os.makedirs(d, exist_ok=True)

    hero = make_hero(brand, info["color"], info["accent"])
    with open(os.path.join(d, brand + "-combo-hero.svg"), "w", encoding="utf-8") as f:
        f.write(hero)

    for tipo in ["camara", "dvr"]:
        det = make_detail(brand, info["color"], info["accent"], tipo)
        with open(os.path.join(d, brand + "-" + tipo + "-detalle.svg"), "w", encoding="utf-8") as f:
            f.write(det)

    print(f"  OK {brand}: hero + {brand}-camara-detalle + {brand}-dvr-detalle.svg")

print("\nImagenes generadas correctamente")
