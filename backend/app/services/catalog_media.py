import re

BRAND_FOLDERS = {
    "hikvision-hilook": "hikvision",
    "dahua-cooper": "dahua",
    "tp-link-tapo-vigi": "tp-link",
    "vta-mas": "vta",
    "ezviz": "ezviz",
    "imou": "imou",
    "xiaomi": "xiaomi",
    "reolink": "reolink",
    "eufy": "eufy",
    "ring": "ring",
}


def catalog_image(combo) -> str | None:
    """Read-time resolution only: never overwrite an original or mutate catalog records."""
    if combo.image_url:
        path = combo.image_url.strip().replace("\\", "/")
        if re.match(r"^https?://", path, re.I) or path.startswith("/api/uploads/"):
            return path
        if path.lstrip("/").startswith("uploads/"):
            return "/api/" + path.lstrip("/")
        if "public/" in path:
            path = path.split("public/", 1)[1]
        return "/" + path.lstrip("/")
    slug = combo.brand.slug if combo.brand else ""
    folder = BRAND_FOLDERS.get(slug)
    if folder and combo.mode in {"cableado", "inalambrico", "hibrido", "solar"}:
        # Original repo illustrations are the only fallback, and only for a missing original.
        return (
            f"/images/brands/{folder}/{combo.mode}/{folder}-{combo.mode}-combo-hero.svg"
        )
    return None
