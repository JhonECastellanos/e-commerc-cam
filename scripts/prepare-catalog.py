"""Publish optimized derivatives; never modify the original CATALOGO photographs."""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

project = Path(__file__).resolve().parents[1]
source = project.parent / "CATALOGO"
target = project / "frontend/public/catalogo"
output = project / "frontend/src/data/catalog-photos.json"
previous = json.loads(output.read_text(encoding="utf-8")) if output.is_file() else []
by_digest = {item["sha256"]: item for item in previous}
entries = []
for original in sorted(source.rglob("*")):
    if original.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
        continue
    relative = original.relative_to(source).as_posix()
    digest = hashlib.sha256(original.read_bytes()).hexdigest()
    name = hashlib.sha256(relative.encode()).hexdigest()[:20] + ".webp"
    target.mkdir(parents=True, exist_ok=True)
    destination = target / name
    cached = by_digest.get(digest)
    old = project / "frontend/public" / cached["url"].lstrip("/") if cached else None
    valid = False
    if old and old.is_file():
        try:
            with Image.open(old) as image:
                image.verify()
            valid = True
        except (OSError, SyntaxError):
            pass
    if valid:
        if old != destination:
            destination.write_bytes(old.read_bytes())
        entries.append({"source": relative, "sha256": digest, "url": "/catalogo/" + name})
        continue
    temporary = destination.with_suffix(".tmp")
    with Image.open(original) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        image.convert("RGBA" if "A" in image.getbands() else "RGB").save(
            temporary, "WEBP", quality=85, method=6
        )
    temporary.replace(destination)
    entries.append({"source": relative, "sha256": digest, "url": "/catalogo/" + name})
output.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(entries)} fotografías verificadas. Originales conservados: {source}")
