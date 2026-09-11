"""Servicio de cargas: validación de MIME, firma binaria y tamaño."""
from io import BytesIO

import pytest
from fastapi import HTTPException
from starlette.datastructures import Headers, UploadFile

from app.config import settings
from app.services import uploads as uploads_module
from app.services.uploads import save_image_upload, store_public_image

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
WEBP = b"RIFF" + (72).to_bytes(4, "little") + b"WEBP" + b"\x00" * 64


def upload(data: bytes, content_type: str, filename: str = "imagen.bin") -> UploadFile:
    return UploadFile(BytesIO(data), filename=filename, headers=Headers({"content-type": content_type}))


async def test_guarda_png_valido_con_nombre_uuid(tmp_path):
    filename = await save_image_upload(upload(PNG, "image/png"), tmp_path, "banner")
    assert filename.startswith("banner_")
    assert filename.endswith(".png")
    assert (tmp_path / filename).read_bytes() == PNG


async def test_guarda_jpeg_y_webp_validos(tmp_path):
    assert (await save_image_upload(upload(JPEG, "image/jpeg"), tmp_path, "p")).endswith(".jpg")
    assert (await save_image_upload(upload(WEBP, "image/webp"), tmp_path, "p")).endswith(".webp")


async def test_rechaza_mime_no_permitido(tmp_path):
    with pytest.raises(HTTPException) as exc:
        await save_image_upload(upload(b"GIF89a", "image/gif"), tmp_path, "p")
    assert exc.value.status_code == 415


async def test_rechaza_contenido_que_no_coincide_con_el_mime(tmp_path):
    # Un script renombrado como PNG debe fallar por firma binaria.
    with pytest.raises(HTTPException) as exc:
        await save_image_upload(upload(b"<?php echo 1; ?>", "image/png"), tmp_path, "p")
    assert exc.value.status_code == 422


async def test_rechaza_webp_sin_marcador_webp(tmp_path):
    fake = b"RIFF" + (72).to_bytes(4, "little") + b"XXXX" + b"\x00" * 64
    with pytest.raises(HTTPException) as exc:
        await save_image_upload(upload(fake, "image/webp"), tmp_path, "p")
    assert exc.value.status_code == 422


async def test_rechaza_archivo_demasiado_grande(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_bytes", 32)
    with pytest.raises(HTTPException) as exc:
        await save_image_upload(upload(PNG, "image/png"), tmp_path, "p")
    assert exc.value.status_code == 413


async def test_rechaza_archivo_vacio(tmp_path):
    with pytest.raises(HTTPException) as exc:
        await save_image_upload(upload(b"", "image/png"), tmp_path, "p")
    assert exc.value.status_code == 413


async def test_store_public_image_en_modo_local_devuelve_url_relativa(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "uploads_dir", str(tmp_path))
    monkeypatch.setattr(settings, "supabase_url", None)
    url = await store_public_image(upload(PNG, "image/png"), "banners", "banner")
    assert url.startswith("/api/uploads/banners/banner_")
    filename = url.rsplit("/", 1)[-1]
    assert (tmp_path / "banners" / filename).read_bytes() == PNG


async def test_store_public_image_sube_a_supabase_cuando_esta_configurado(monkeypatch):
    monkeypatch.setattr(settings, "supabase_url", "https://proyecto.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "service-key")
    monkeypatch.setattr(settings, "supabase_storage_bucket", "uploads")

    calls = {}

    class FakeResponse:
        status_code = 200

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, content=None, headers=None):
            calls["url"], calls["content"], calls["headers"] = url, content, headers
            return FakeResponse()

    monkeypatch.setattr(uploads_module.httpx, "AsyncClient", FakeClient)
    url = await store_public_image(upload(PNG, "image/png"), "banners", "banner")

    assert calls["url"].startswith("https://proyecto.supabase.co/storage/v1/object/uploads/banners/banner_")
    assert calls["content"] == PNG
    assert calls["headers"]["Authorization"] == "Bearer service-key"
    assert url.startswith("https://proyecto.supabase.co/storage/v1/object/public/uploads/banners/banner_")


async def test_store_public_image_error_de_supabase_devuelve_502(monkeypatch):
    monkeypatch.setattr(settings, "supabase_url", "https://proyecto.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "service-key")

    class FakeResponse:
        status_code = 500

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(uploads_module.httpx, "AsyncClient", FakeClient)
    with pytest.raises(HTTPException) as exc:
        await store_public_image(upload(PNG, "image/png"), "banners", "banner")
    assert exc.value.status_code == 502
