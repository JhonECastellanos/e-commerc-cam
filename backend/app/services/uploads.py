from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": (".jpg", ".jpeg"),
    "image/png": (".png",),
    "image/webp": (".webp",),
}
MAGIC_BYTES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
}


def uploads_root() -> Path:
    if settings.uploads_dir:
        return Path(settings.uploads_dir)
    return Path(__file__).resolve().parents[2] / "uploads"


async def _validate_image(file: UploadFile) -> tuple[bytes, str]:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Solo se permiten imágenes JPG, PNG o WebP")
    data = await file.read(settings.max_upload_bytes + 1)
    if not data or len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="La imagen supera el tamaño permitido")
    if not any(data.startswith(signature) for signature in MAGIC_BYTES[content_type]):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="El contenido del archivo no coincide con una imagen válida")
    if content_type == "image/webp" and data[8:12] != b"WEBP":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="El contenido WebP no es válido")
    return data, ALLOWED_IMAGE_TYPES[content_type][0]


async def _upload_to_supabase(data: bytes, content_type: str, object_path: str) -> str:
    base = settings.supabase_url.rstrip("/")
    bucket = settings.supabase_storage_bucket
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{base}/storage/v1/object/{bucket}/{object_path}",
            content=data,
            headers={
                "Authorization": f"Bearer {settings.supabase_service_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            },
        )
    if response.status_code not in (200, 201):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No fue posible guardar la imagen en el almacenamiento")
    return f"{base}/storage/v1/object/public/{bucket}/{object_path}"


async def store_public_image(file: UploadFile, subpath: str, prefix: str) -> str:
    """Valida la imagen y devuelve su URL pública.

    Con Supabase Storage configurado la sube al bucket (persistente, apto para
    serverless); si no, la escribe bajo el directorio local de uploads.
    """
    data, suffix = await _validate_image(file)
    filename = f"{prefix}_{uuid4().hex}{suffix}"
    subpath = subpath.strip("/")
    if settings.supabase_url and settings.supabase_service_key:
        return await _upload_to_supabase(data, (file.content_type or "").lower(), f"{subpath}/{filename}")
    directory = uploads_root() / subpath
    directory.mkdir(parents=True, exist_ok=True)
    (directory / filename).write_bytes(data)
    return f"/api/uploads/{subpath}/{filename}"


async def save_image_upload(file: UploadFile, directory: Path, prefix: str) -> str:
    """Compatibilidad: guarda en un directorio local explícito y devuelve el nombre."""
    data, suffix = await _validate_image(file)
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"{prefix}_{uuid4().hex}{suffix}"
    (directory / filename).write_bytes(data)
    return filename
