"""Editable media for the four existing hero demos; no changes to 3D behaviour."""
from app.models.business import BusinessConfig

DEMO_MEDIA = {
    "house": {"image_url": "/banner-assets/casa-poster.webp", "video_url": "/banner-assets/casa-loop.mp4"},
    "apartment": {"image_url": "/banner-assets/apartamento-poster.webp", "video_url": "/banner-assets/apartamento-loop.mp4"},
    "functions": {"image_url": "/banner-assets/functions-ai.webp", "video_url": "/banner-assets/functions-loop.mp4"},
    "recording": {"image_url": "/images/cctv-diagram.svg", "video_url": "/banner-assets/recording-loop.mp4"},
}


async def public_demo_media(db):
    result = {}
    for ident, defaults in DEMO_MEDIA.items():
        config = await db.get(BusinessConfig, "media_" + ident)
        result[ident] = {**defaults, **(config.payload if config else {})}
    return result
