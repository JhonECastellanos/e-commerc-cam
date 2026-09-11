import asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session, init_db
from app.models.user import User
from app.config import settings
from app.models.brand import Brand
from app.models.combo import Combo
from app.models.coverage_area import CoverageArea
from app.models.social_link import SocialLink
from app.models.setting import Setting
from app.models.notification import Notification
from passlib.hash import bcrypt

MUNICIPIOS_SABANA = [
    "Bogotá D.C.", "Chía", "Cajicá", "Cota", "Sopó", "Tabio", "Tenjo",
    "Zipaquirá", "Cogua", "Nemocón", "Gachancipá", "Tocancipá", "Sibaté",
    "Soacha", "Mosquera", "Madrid", "Funza", "Facatativá", "El Rosal",
    "Subachoque", "Bojacá", "La Calera",
]

MARCAS = [
    {"name": "Hikvision / HiLook", "slug": "hikvision-hilook", "description": "Líder mundial en videovigilancia. Calidad profesional.", "sort_order": 1},
    {"name": "Dahua / Cooper", "slug": "dahua-cooper", "description": "Tecnología china de alto rendimiento.", "sort_order": 2},
    {"name": "TP-Link Tapo / Vigi", "slug": "tp-link-tapo-vigi", "description": "Smart home asequible y confiable.", "sort_order": 3},
    {"name": "EZVIZ", "slug": "ezviz", "description": "Submarca de Hikvision para hogar inteligente.", "sort_order": 4},
    {"name": "Imou", "slug": "imou", "description": "Submarca de Dahua para el hogar.", "sort_order": 5},
    {"name": "Xiaomi", "slug": "xiaomi", "description": "Ecosistema smart con excelente relación costo-beneficio.", "sort_order": 6},
    {"name": "Reolink", "slug": "reolink", "description": "Especialistas en cámaras PoE y solares.", "sort_order": 7},
    {"name": "Eufy", "slug": "eufy", "description": "Submarca de Anker, seguridad sin cuotas mensuales.", "sort_order": 8},
    {"name": "Ring", "slug": "ring", "description": "Submarca de Amazon, timbres y cámaras inteligentes.", "sort_order": 9},
    {"name": "VTA+", "slug": "vta-mas", "description": "Marca colombiana, la más económica del mercado.", "sort_order": 10},
]

MODOS = ["cableado", "inalambrico", "hibrido", "solar"]
RESOLUCIONES = ["2MP", "3MP", "5MP", "8MP"]

PRECIOS_BASE = {
    "hikvision-hilook": {"2MP": 380000, "3MP": 520000, "5MP": 750000, "8MP": 980000},
    "dahua-cooper": {"2MP": 350000, "3MP": 480000, "5MP": 700000, "8MP": 920000},
    "tp-link-tapo-vigi": {"2MP": 280000, "3MP": 420000, "5MP": 620000, "8MP": 850000},
    "ezviz": {"2MP": 320000, "3MP": 460000, "5MP": 680000, "8MP": 900000},
    "imou": {"2MP": 300000, "3MP": 440000, "5MP": 650000, "8MP": 880000},
    "xiaomi": {"2MP": 260000, "3MP": 400000, "5MP": 580000, "8MP": 800000},
    "reolink": {"2MP": 450000, "3MP": 600000, "5MP": 900000, "8MP": 1200000},
    "eufy": {"2MP": 380000, "3MP": 520000, "5MP": 750000, "8MP": 1000000},
    "ring": {"2MP": 420000, "3MP": 580000, "5MP": 850000, "8MP": 1100000},
    "vta-mas": {"2MP": 220000, "3MP": 350000, "5MP": 520000, "8MP": 720000},
}

MODO_MULTIPLIER = {
    "cableado": 1.0,
    "inalambrico": 0.9,
    "hibrido": 1.15,
    "solar": 1.3,
}

CAMARAS_POR_COMBO = [4, 6, 8]

STORAGE_OPTIONS = {
    "1TB HDD": 120000,
    "2TB HDD": 200000,
    "4TB HDD": 350000,
    "8TB HDD": 600000,
}

INSTALL_COMPLEXITY = {
    "cableado": "alta",
    "inalambrico": "baja",
    "hibrido": "media",
    "solar": "media",
}

INCLUDED_ITEMS_BASE = [
    "Cámaras de seguridad",
    "Fuente de poder",
    "Adaptadores de video",
    "Kit de instalación (tornillos, anclajes)",
    "Manual de usuario",
]

MODE_EXTRA_ITEMS = {
    "cableado": [
        "DVR / NVR con grabación continua",
        "Cables de video + alimentación",
        "Conectores BNC",
    ],
    "inalambrico": [
        "Receptor WiFi / estación base",
        "Antenas WiFi",
        "Guía de conexión a la App",
    ],
    "hibrido": [
        "DVR híbrido (cable + WiFi)",
        "Cables de video para cámaras cableadas",
        "Receptor WiFi",
    ],
    "solar": [
        "Panel solar con batería integrada",
        "Soporte de montaje para panel",
        "Controlador de carga",
    ],
}

SPECS_BY_RESOLUTION = {
    "2MP": {
        "Resolución": "1920 x 1080 (Full HD)",
        "Sensor": "CMOS 1/2.7\" progresivo",
        "Visión nocturna": "20 m (infrarrojo LED)",
        "Compresión": "H.265 / H.264",
        "Ángulo de visión": "80° - 100°",
    },
    "3MP": {
        "Resolución": "2304 x 1296 (3 MP)",
        "Sensor": "CMOS 1/2.8\" progresivo",
        "Visión nocturna": "25 m (infrarrojo LED)",
        "Compresión": "H.265 / H.264",
        "Ángulo de visión": "85° - 105°",
    },
    "5MP": {
        "Resolución": "2560 x 1920 (5 MP)",
        "Sensor": "CMOS 1/2.7\" progresivo",
        "Visión nocturna": "30 m (infrarrojo LED)",
        "Compresión": "H.265+ / H.265 / H.264",
        "Ángulo de visión": "90° - 110°",
    },
    "8MP": {
        "Resolución": "3840 x 2160 (4K / 8 MP)",
        "Sensor": "CMOS 1/2\" progresivo",
        "Visión nocturna": "40 m (infrarrojo LED)",
        "Compresión": "H.265+ / H.265 / H.264",
        "Ángulo de visión": "95° - 120°",
    },
}

SETTINGS_DEFAULT = {
    "install_fee_per_camera": ("75000", "Valor en COP por cámara instalada (mano de obra) — cableado, híbrido, solar"),
    "install_fee_per_camera_wireless": ("50000", "Valor en COP por cámara inalámbrica instalada (mano de obra)"),
    "vat_rate": ("19", "Porcentaje de IVA aplicable"),
    "balance_payment_term": ("contraentrega", "Momento de pago del saldo: contraentrega, antes_instalacion"),
    "business_name": ("[COMPLETAR]", "Nombre o razón social del negocio"),
    "business_nit": ("[COMPLETAR]", "NIT del negocio"),
    "business_contact": ("[COMPLETAR]", "Teléfono de contacto del negocio"),
    "cancellation_policy": ("[DEFINIR — ej: reembolsable si se cancela con X días de anticipación]", "Política de cancelación del anticipo"),
    "installation_lead_days": ("[DEFINIR]", "Plazo estimado en días para instalar tras confirmar anticipo"),
    "labor_warranty_months": ("[DEFINIR]", "Meses de garantía de mano de obra"),
    "urgency_message": ("Cupos limitados de instalación esta semana en tu zona", "Mensaje de urgencia en el banner del sitio"),
    "about_image_url": ("/images/tecnico-default.svg", "URL de la imagen del técnico en la sección Conócenos"),
}

async def seed_all():
    async with async_session() as db:
        existing = await db.execute(select(User).limit(1))
        if existing.scalar_one_or_none():
            is_new = False
        else:
            is_new = True
            if not settings.initial_admin_email or not settings.initial_admin_password:
                raise RuntimeError("Define INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD para crear la primera cuenta administrativa")
            if len(settings.initial_admin_password) < 14:
                raise RuntimeError("INITIAL_ADMIN_PASSWORD debe tener al menos 14 caracteres")
            admin = User(
                email=settings.initial_admin_email.lower(),
                password_hash=bcrypt.hash(settings.initial_admin_password),
                name="Administrador",
                role="admin",
            )
            db.add(admin)

            brands_map = {}
            for m in MARCAS:
                brand = Brand(**m)
                db.add(brand)
                await db.flush()
                brands_map[brand.slug] = brand.id

            for slug, brand_id in brands_map.items():
                prices = PRECIOS_BASE[slug]
                for resol in RESOLUCIONES:
                    base_price = prices[resol]
                    specs = dict(SPECS_BY_RESOLUTION[resol])
                    for modo in MODOS:
                        multiplier = MODO_MULTIPLIER[modo]
                        for cam_count in CAMARAS_POR_COMBO:
                            price = int(base_price * multiplier)
                            is_economica = slug in ("vta-mas", "tp-link-tapo-vigi", "xiaomi")
                            is_budget = (slug == "vta-mas" and resol == "2MP")
                            is_bestseller = (is_economica and resol in ("2MP", "3MP") and cam_count >= 6)
                            folder_map = {
                                "hikvision-hilook": "hikvision", "dahua-cooper": "dahua",
                                "tp-link-tapo-vigi": "tp-link", "ezviz": "ezviz",
                                "imou": "imou", "xiaomi": "xiaomi", "reolink": "reolink",
                                "eufy": "eufy", "ring": "ring", "vta-mas": "vta",
                            }
                            folder = folder_map.get(slug, slug)
                            image_url = f"/images/brands/{folder}/{modo}/{folder}-{modo}-combo-hero.svg"
                            included = list(INCLUDED_ITEMS_BASE) + list(MODE_EXTRA_ITEMS.get(modo, []))
                            included.append(f"{cam_count}x cámaras {resol}")
                            if modo in ("cableado", "hibrido"):
                                included.append(f"1x DVR/NVR {resol}")

                            combo = Combo(
                                brand_id=brand_id,
                                mode=modo,
                                resolution=resol,
                                cameras_count=cam_count,
                                equipment_price=price,
                                is_bestseller=is_bestseller,
                                is_budget=is_budget,
                                level=None,
                                warranty_text="1 año según fabricante",
                                image_url=image_url,
                                specs=specs,
                                storage_options=STORAGE_OPTIONS,
                                install_complexity=INSTALL_COMPLEXITY[modo],
                                included_items=included,
                                active=True,
                            )
                            db.add(combo)

            for m in MUNICIPIOS_SABANA:
                db.add(CoverageArea(name=m, active=True))

            db.add(SocialLink(platform="whatsapp", url="https://wa.me/[COMPLETAR]", label="WhatsApp", active=True, sort_order=1))
            db.add(SocialLink(platform="facebook", url="[COMPLETAR]", label="Facebook", active=True, sort_order=2))
            db.add(SocialLink(platform="instagram", url="[COMPLETAR]", label="Instagram", active=True, sort_order=3))

            for key, (value, desc) in SETTINGS_DEFAULT.items():
                db.add(Setting(key=key, value=value, description=desc))

            db.add(Notification(
                type="system",
                title="Bienvenido a InstalaCámara",
                message="Panel admin listo. Revisa y completa tus datos de negocio en la sección de configuración.",
                read=False,
            ))

        fixed_combos = [
            {"unique_code": "IC-HIK-ECO-001", "name": "4Cam_2mp_dvr_4chanels_320gb_app", "brand_slug": "hikvision-hilook", "mode": "cableado", "resolution": "2MP", "cameras_count": 4, "equipment_price": 529000, "install_fee": 90000, "level": "economico", "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-HIK-PRE-001", "name": "8Cam_2mp_dvr_8_chanels_2tb_app", "brand_slug": "hikvision-hilook", "mode": "cableado", "resolution": "2MP", "cameras_count": 8, "equipment_price": 1289900, "install_fee": 80000, "level": "premium", "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-HIK-INT-001", "name": "8Cam_2mp_dvr_8chanels_app", "brand_slug": "hikvision-hilook", "mode": "cableado", "resolution": "2MP", "cameras_count": 8, "equipment_price": 899000, "install_fee": 80000, "level": "intermedio", "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-DAH-001", "name": "8cam_2mp_dvr_8chanels_1tb_app", "brand_slug": "dahua-cooper", "mode": "cableado", "resolution": "2MP", "cameras_count": 8, "equipment_price": 1071849, "install_fee": 80000, "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-DAH-002", "name": "4cam_2mp_dvr_8chanels_1tb_app", "brand_slug": "dahua-cooper", "mode": "cableado", "resolution": "2MP", "cameras_count": 4, "equipment_price": 725000, "install_fee": 90000, "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-DAH-003", "name": "4cam_2mp_dvr_8chanels_1tb_app_v2", "brand_slug": "dahua-cooper", "mode": "cableado", "resolution": "2MP", "cameras_count": 4, "equipment_price": 769000, "install_fee": 90000, "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-DAH-004", "name": "3cam_2mp_dvr_4chanels_500gb_app", "brand_slug": "dahua-cooper", "mode": "cableado", "resolution": "2MP", "cameras_count": 3, "equipment_price": 549000, "install_fee": 90000, "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-DAH-005", "name": "6cam_2mp_dvr_8chanels_500gb_app", "brand_slug": "dahua-cooper", "mode": "cableado", "resolution": "2MP", "cameras_count": 6, "equipment_price": 849000, "install_fee": 80000, "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-DAH-006", "name": "13cam_2mp_dvr_16chanels_2tb_app", "brand_slug": "dahua-cooper", "mode": "cableado", "resolution": "2MP", "cameras_count": 13, "equipment_price": 1899900, "install_fee": 70000, "categoria": "Combo", "instalacion_incluida": True},
            {"unique_code": "IC-HIK-010", "name": "10cam_2mp_dvr_16chanels_2tb_app", "brand_slug": "hikvision-hilook", "mode": "cableado", "resolution": "2MP", "cameras_count": 10, "equipment_price": 1598000, "install_fee": 70000, "categoria": "Combo", "instalacion_incluida": True},
        ]
        for fc in fixed_combos:
            br = await db.execute(select(Brand).where(Brand.slug == fc["brand_slug"]))
            brand = br.scalar_one_or_none()
            if not brand:
                continue
            existing = await db.execute(
                text("SELECT id FROM combos WHERE name=:n AND brand_id=:b"),
                {"n": fc["name"], "b": brand.id}
            )
            existing_id = existing.scalar_one_or_none()
            if existing_id:
                await db.execute(
                    text("UPDATE combos SET unique_code=:uc WHERE id=:eid AND unique_code IS NULL"),
                    {"uc": fc["unique_code"], "eid": existing_id}
                )
                continue
            combo = Combo(
                brand_id=brand.id, name=fc["name"], unique_code=fc["unique_code"], mode=fc["mode"], resolution=fc["resolution"],
                cameras_count=fc["cameras_count"], equipment_price=fc["equipment_price"],
                install_fee=fc["install_fee"], level=fc.get("level"),
                categoria=fc.get("categoria", "Combo"), instalacion_incluida=fc.get("instalacion_incluida", True),
                warranty_text="1 año según fabricante",
                specs={"Resolución": "1920 x 1080 (Full HD)", "Sensor": "CMOS 1/2.7\" progresivo", "Visión nocturna": "20 m", "Compresión": "H.265"},
                included_items=["Cámaras de seguridad", "DVR", "Fuente de poder", "Cables", "Manual"],
                install_complexity="alta", active=True,
            )
            db.add(combo)

        for key, (value, desc) in SETTINGS_DEFAULT.items():
            existing_setting = await db.execute(
                text("SELECT id FROM settings WHERE key=:k"),
                {"k": key}
            )
            if not existing_setting.scalar_one_or_none():
                db.add(Setting(key=key, value=value, description=desc))

        from app.models.product import Product
        seed_products = [
            {"name": "Cámara Tubular 2MP", "brand_slug": "hikvision-hilook", "description": "Cámara bullet para exterior con infrarrojo nocturno.", "price": 189000, "category": "Cámaras", "sort_order": 1},
            {"name": "Cámara Domo 2MP", "brand_slug": "hikvision-hilook", "description": "Cámara domo para interior con visión nocturna.", "price": 165000, "category": "Cámaras", "sort_order": 2},
            {"name": "Cámara PTZ 5MP", "brand_slug": "dahua-cooper", "description": "Cámara motorizada con zoom óptico para exteriores.", "price": 480000, "category": "Cámaras", "sort_order": 3},
            {"name": "DVR 4 Canales 720p", "brand_slug": "hikvision-hilook", "description": "Grabador para 4 cámaras con soporte para 1TB.", "price": 210000, "category": "DVR/NVR", "sort_order": 4},
            {"name": "DVR 8 Canales 1080p", "brand_slug": "hikvision-hilook", "description": "Grabador para 8 cámaras Full HD con 2TB.", "price": 350000, "category": "DVR/NVR", "sort_order": 5},
            {"name": "Fuente de poder 12V 5A", "brand_slug": None, "description": "Fuente de alimentación para 4 cámaras.", "price": 45000, "category": "Accesorios", "sort_order": 6},
            {"name": "Cable Coaxial x 30m", "brand_slug": None, "description": "Cable de video para instalación profesional.", "price": 35000, "category": "Accesorios", "sort_order": 7},
        ]
        for sp in seed_products:
            existing_p = await db.execute(
                text("SELECT id FROM products WHERE name=:n"),
                {"n": sp["name"]}
            )
            if existing_p.scalar_one_or_none():
                continue
            bid = None
            if sp["brand_slug"]:
                br = await db.execute(select(Brand).where(Brand.slug == sp["brand_slug"]))
                b = br.scalar_one_or_none()
                if b:
                    bid = b.id
            product = Product(name=sp["name"], brand_id=bid, description=sp["description"], price=sp["price"], category=sp["category"], sort_order=sp["sort_order"])
            db.add(product)

        await db.commit()

if __name__ == "__main__":
    asyncio.run(seed_all())
