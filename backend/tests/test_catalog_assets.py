from pathlib import Path
from types import SimpleNamespace
import xml.etree.ElementTree as ET
from app.services.catalog_media import catalog_image


def test_every_existing_svg_can_be_decoded_as_xml():
    images = Path(__file__).resolve().parents[2] / "frontend" / "public" / "images"
    files = list(images.rglob("*.svg"))
    assert len(files) >= 154
    for file in files:
        assert ET.parse(file).getroot().tag == "{http://www.w3.org/2000/svg}svg", file


def test_original_upload_wins_and_only_missing_images_use_original_fallback():
    combo = SimpleNamespace(
        image_url="/api/uploads/catalog/photo.jpg",
        mode="cableado",
        brand=SimpleNamespace(slug="hikvision-hilook"),
    )
    assert catalog_image(combo) == "/api/uploads/catalog/photo.jpg"
    combo.image_url = None
    assert (
        catalog_image(combo)
        == "/images/brands/hikvision/cableado/hikvision-cableado-combo-hero.svg"
    )
    combo.image_url = "uploads\\catalog\\photo.JPG"
    assert catalog_image(combo) == "/api/uploads/catalog/photo.JPG"
