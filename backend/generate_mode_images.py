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

def make_hero(brand, color, accent, mode):
    mode_badge = {
        "cableado": "CABLEADO CCTV",
        "inalambrico": "INALÁMBRICO WiFi",
        "hibrido": "HÍBRIDO",
        "solar": "SOLAR / PoE",
    }.get(mode, mode.upper())

    mode_overlay = {
        "cableado": '<rect x="30" y="30" width="24" height="24" rx="4" fill="none" stroke="white" stroke-width="2" opacity="0.6"/><rect x="36" y="36" width="12" height="12" rx="2" fill="white" opacity="0.4"/><line x1="54" y1="42" x2="80" y2="42" stroke="white" stroke-width="1.5" opacity="0.4"/>',
        "inalambrico": '<circle cx="42" cy="42" r="14" fill="none" stroke="white" stroke-width="2" opacity="0.6"/><circle cx="42" cy="42" r="6" fill="white" opacity="0.4"/><path d="M42 10 Q 70 20 70 42" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/><path d="M42 18 Q 62 26 62 42" fill="none" stroke="white" stroke-width="1.5" opacity="0.3"/>',
        "hibrido": '<rect x="30" y="30" width="24" height="24" rx="4" fill="none" stroke="white" stroke-width="2" opacity="0.6"/><circle cx="42" cy="52" r="10" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>',
        "solar": '<rect x="28" y="28" width="28" height="28" rx="2" fill="none" stroke="white" stroke-width="2" opacity="0.6"/><line x1="42" y1="28" x2="42" y2="18" stroke="white" stroke-width="2" opacity="0.5"/><line x1="28" y1="42" x2="18" y2="42" stroke="white" stroke-width="2" opacity="0.5"/><line x1="56" y1="42" x2="66" y2="42" stroke="white" stroke-width="2" opacity="0.5"/><line x1="42" y1="56" x2="42" y2="66" stroke="white" stroke-width="2" opacity="0.5"/>',
    }.get(mode, "")

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
  ''' + mode_overlay + '''
  <text x="300" y="310" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial, sans-serif">''' + BRANDS[brand]["name"] + '''</text>
  <text x="300" y="340" text-anchor="middle" fill="white" font-size="14" font-family="Arial, sans-serif" opacity="0.8">Kit de Cámaras de Seguridad</text>
  <text x="300" y="365" text-anchor="middle" fill="''' + accent + '''" font-size="12" font-family="Arial, sans-serif" opacity="0.9">''' + mode_badge + '''</text>
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

def make_app_detail(brand, color, accent):
    return '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" rx="8" fill="#f8f9fa"/>
  <rect x="0" y="0" width="400" height="8" fill="''' + color + '''"/>
  <rect x="110" y="30" width="180" height="340" rx="20" fill="white" stroke="#ddd" stroke-width="2"/>
  <rect x="160" y="350" width="80" height="4" rx="2" fill="#ddd"/>
  <rect x="130" y="55" width="140" height="240" rx="8" fill="''' + color + '''" opacity="0.1"/>
  <circle cx="200" cy="100" r="30" fill="''' + accent + '''" opacity="0.3"/>
  <polygon points="200,80 210,100 200,95 190,100" fill="white" opacity="0.8"/>
  <text x="200" y="200" text-anchor="middle" fill="''' + color + '''" font-size="28" font-weight="bold" font-family="Arial, sans-serif">''' + BRANDS[brand]["name"] + '''</text>
  <text x="200" y="230" text-anchor="middle" fill="#555" font-size="12" font-family="Arial, sans-serif">App de Vigilancia</text>
  <rect x="145" y="260" width="110" height="20" rx="10" fill="''' + accent + '''" opacity="0.8"/>
  <text x="200" y="274" text-anchor="middle" fill="white" font-size="9" font-family="Arial, sans-serif">EN VIVO</text>
  <rect x="160" y="290" width="80" height="6" rx="3" fill="#ddd" opacity="0.5"/>
  <rect x="160" y="302" width="60" height="6" rx="3" fill="#ddd" opacity="0.3"/>
  <text x="200" y="365" text-anchor="middle" fill="#777" font-size="11" font-family="Arial, sans-serif">App móvil de monitoreo</text>
</svg>'''

def make_solar_detail(brand, color, accent):
    return '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" rx="8" fill="#f8f9fa"/>
  <rect x="0" y="0" width="400" height="8" fill="''' + color + '''"/>
  <circle cx="200" cy="180" r="70" fill="''' + color + '''" opacity="0.1"/>
  <rect x="140" y="80" width="120" height="80" rx="4" fill="none" stroke="''' + color + '''" stroke-width="2" opacity="0.4"/>
  <line x1="200" y1="80" x2="200" y2="60" stroke="''' + color + '''" stroke-width="2" opacity="0.5"/>
  <line x1="140" y1="120" x2="120" y2="120" stroke="''' + color + '''" stroke-width="2" opacity="0.5"/>
  <line x1="260" y1="120" x2="280" y2="120" stroke="''' + color + '''" stroke-width="2" opacity="0.5"/>
  <line x1="200" y1="160" x2="200" y2="180" stroke="''' + color + '''" stroke-width="2" opacity="0.5"/>
  <rect x="155" y="130" width="16" height="16" rx="1" fill="''' + accent + '''" opacity="0.6"/>
  <rect x="175" y="130" width="16" height="16" rx="1" fill="''' + accent + '''" opacity="0.6"/>
  <rect x="195" y="130" width="16" height="16" rx="1" fill="''' + accent + '''" opacity="0.6"/>
  <rect x="215" y="130" width="16" height="16" rx="1" fill="''' + accent + '''" opacity="0.6"/>
  <rect x="175" y="150" width="16" height="16" rx="1" fill="''' + accent + '''" opacity="0.5"/>
  <rect x="195" y="150" width="16" height="16" rx="1" fill="''' + accent + '''" opacity="0.5"/>
  <rect x="215" y="150" width="16" height="16" rx="1" fill="''' + accent + '''" opacity="0.5"/>
  <text x="200" y="280" text-anchor="middle" fill="''' + color + '''" font-size="20" font-weight="bold" font-family="Arial, sans-serif">''' + BRANDS[brand]["name"] + '''</text>
  <text x="200" y="310" text-anchor="middle" fill="#555" font-size="14" font-family="Arial, sans-serif">Panel Solar + Cámara</text>
  <rect x="100" y="330" width="200" height="2" rx="1" fill="''' + accent + '''" opacity="0.5"/>
  <text x="200" y="365" text-anchor="middle" fill="#777" font-size="11" font-family="Arial, sans-serif">Tecnología de energía solar</text>
</svg>'''

base = "frontend/public/images/brands"

MODES = ["cableado", "inalambrico", "hibrido", "solar"]

for brand, info in BRANDS.items():
    for mode in MODES:
        d = os.path.join(base, brand, mode)
        os.makedirs(d, exist_ok=True)

        hero = make_hero(brand, info["color"], info["accent"], mode)
        with open(os.path.join(d, f"{brand}-{mode}-combo-hero.svg"), "w", encoding="utf-8") as f:
            f.write(hero)

        cam = make_detail(brand, info["color"], info["accent"], "camara")
        with open(os.path.join(d, f"{brand}-{mode}-camara-detalle.svg"), "w", encoding="utf-8") as f:
            f.write(cam)

        if mode in ("cableado", "hibrido"):
            dvr = make_detail(brand, info["color"], info["accent"], "dvr")
            with open(os.path.join(d, f"{brand}-{mode}-dvr-detalle.svg"), "w", encoding="utf-8") as f:
                f.write(dvr)
        elif mode == "inalambrico":
            app = make_app_detail(brand, info["color"], info["accent"])
            with open(os.path.join(d, f"{brand}-{mode}-app-detalle.svg"), "w", encoding="utf-8") as f:
                f.write(app)
        elif mode == "solar":
            solar = make_solar_detail(brand, info["color"], info["accent"])
            with open(os.path.join(d, f"{brand}-{mode}-solar-detalle.svg"), "w", encoding="utf-8") as f:
                f.write(solar)

        print(f"  OK {brand}/{mode}")

print("\nMode-specific images generated successfully!")
