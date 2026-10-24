"""Commercial catalogue eligibility, without deleting historical pricing rows."""
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

from app.models.setting import Setting

PRODUCT_PHOTOS = json.loads((Path(__file__).with_name("product_photos.json")).read_text(encoding="utf-8"))
COMBO_PHOTOS = json.loads((Path(__file__).with_name("combo_photos.json")).read_text(encoding="utf-8"))


def photograph(url):
    if not isinstance(url, str):
        return False
    try:
        path = urlsplit(url).path.lower()
    except ValueError:
        return False
    return url.startswith(("/", "https://", "http://")) and path.endswith((".jpg", ".jpeg", ".png", ".webp"))


def gallery(row):
    specs = row.specs or {}
    if "catalog_images" in specs:
        images = specs["catalog_images"]
        return list(dict.fromkeys(url for url in images if photograph(url))) if isinstance(images, list) else []
    if photograph(row.image_url):
        return list(dict.fromkeys([row.image_url, *PRODUCT_PHOTOS.get(row.name, [])]))
    # Exact original folder match only: never guess a camera count or another brand.
    brand = getattr(row, "brand", None)
    slug = getattr(brand, "slug", "")
    name = re.sub(r"[^a-z0-9]", "", (row.name or "").lower())
    aliases = {"8cam2mpdvr8chanelsapp": "8cam2mpdvr4chanelsapp"}
    known = COMBO_PHOTOS.get(slug, {})
    name = aliases.get(name, name)
    # Existing _v2 offer shares the photographed folder of its base offer.
    return known.get(name) or known.get(re.sub(r"v\d+$", "", name), [])


async def product_prices_visible(db):
    from sqlalchemy import select
    setting = (await db.execute(select(Setting).where(Setting.key == "show_product_prices"))).scalar_one_or_none()
    return bool(setting and setting.value == "true")
