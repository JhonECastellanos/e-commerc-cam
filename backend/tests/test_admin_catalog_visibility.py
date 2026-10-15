"""Photo publishing, price privacy and media persistence on isolated SQLite."""
import json
from pathlib import Path

from app.models.combo import Combo
from app.models.product import Product
from app.services.business_agent import catalogue, catalogue_csv
from app.services.catalog_visibility import COMBO_PHOTOS, PRODUCT_PHOTOS
from .test_api_admin import auth, login


async def test_photo_required_and_gallery_removal_unpublishes_without_deleting(client, seed, db_session):
    headers = auth(await login(client))
    created = (await client.post('/api/admin/products-admin', headers=headers, params={'name': 'New camera', 'price': 123456})).json()
    ident = created['id']
    assert created['active'] is False
    assert (await client.get('/api/products')).json() == []
    assert (await client.put(f'/api/admin/products-admin/{ident}', headers=headers, json={'active': True})).status_code == 422
    photos = ['/api/uploads/test/a.webp', '/api/uploads/test/b.png']
    saved = await client.put(f'/api/admin/products-admin/{ident}', headers=headers, json={'specs': {'catalog_images': photos}, 'active': True})
    assert saved.status_code == 200
    assert (await client.get('/api/products')).json()[0]['image_url'] == photos[0]
    removed = await client.put(f'/api/admin/products-admin/{ident}', headers=headers, json={'specs': {'catalog_images': []}})
    assert removed.status_code == 200
    assert removed.json()['active'] is False
    assert (await client.get('/api/products')).json() == []
    assert await db_session.get(Product, ident) is not None
    invalid = await client.put(f'/api/admin/products-admin/{ident}', headers=headers, json={'specs': {'catalog_images': 'wrong'}})
    assert invalid.status_code == 422


async def test_price_switch_is_off_by_default_and_applies_to_public_api_chat_and_csv(client, seed, db_session):
    db_session.add(Product(name='Photo camera', price=123456, instalacion_price=65432, image_url='/api/uploads/test/a.webp', active=True))
    await db_session.commit()
    public = (await client.get('/api/products')).json()[0]
    assert public['price'] is None and public['instalacion_price'] is None
    assert (await client.get('/api/settings/public')).json()['show_product_prices'] is False
    records = await catalogue(db_session)
    equipment = next(row for row in records if row['type'] == 'product')
    assert equipment['equipment_price_cop'] is None and equipment['installation_price_cop'] is None
    assert '123456' not in await catalogue_csv(db_session)
    combo_before = (await client.get('/api/combos')).json()
    headers = auth(await login(client))
    assert (await client.get('/api/admin/products-admin', headers=headers)).json()[0]['price'] == 123456
    assert (await client.put('/api/admin/prices/settings/show_product_prices', headers=headers, json={'value': 'true'})).status_code == 200
    assert (await client.get('/api/products')).json()[0]['price'] == 123456
    assert (await client.get('/api/combos')).json() == combo_before
    assert '123456' in await catalogue_csv(db_session)
    assert (await client.put('/api/admin/prices/settings/show_product_prices', headers=headers, json={'value': 'yes'})).status_code == 422


async def test_admin_combos_excludes_internal_pricing_templates(client, seed, db_session):
    template = Combo(brand_id=seed['brand_id'], mode='cableado', resolution='2MP', cameras_count=12, equipment_price=500000, active=True)
    db_session.add(template)
    await db_session.commit()
    headers = auth(await login(client))
    rows = (await client.get('/api/admin/combos-admin', headers=headers)).json()
    assert template.id not in [r['id'] for r in rows]
    assert seed['combo_wired_id'] in [r['id'] for r in rows]
    # Retained for custom pricing, never deleted by catalogue filtering.
    assert await db_session.get(Combo, template.id) is not None


async def test_existing_dahua_variant_retains_original_folder_gallery(client, seed, db_session):
    from app.models.brand import Brand
    brand = Brand(name='Dahua / Cooper', slug='dahua-cooper', active=True)
    db_session.add(brand)
    await db_session.flush()
    variant = Combo(name='4cam_2mp_dvr_8chanels_1tb_app_v2', brand_id=brand.id, mode='cableado', resolution='2MP', cameras_count=4, equipment_price=100000, active=True)
    db_session.add(variant)
    await db_session.commit()
    public = (await client.get('/api/combos')).json()
    headers = auth(await login(client))
    admin = (await client.get('/api/admin/combos-admin', headers=headers)).json()
    assert next(row for row in public if row['id'] == variant.id)['image_url'].startswith('/catalogo/')
    assert next(row for row in admin if row['id'] == variant.id)['image_url'].startswith('/catalogo/')


async def test_combo_gallery_audit_fits_existing_postgres_columns(client, seed):
    headers = auth(await login(client))
    photos = [f'/api/uploads/catalog/original-photograph-{index}.webp' for index in range(12)]
    updated = await client.put(f"/api/admin/combos-admin/{seed['combo_wired_id']}", headers=headers, json={'specs': {'catalog_images': photos}})
    assert updated.status_code == 200
    assert updated.json()['specs']['catalog_images'] == photos
    logs = (await client.get('/api/admin/prices/changelog', headers=headers)).json()
    gallery_log = next(row for row in logs if row['field_name'] == 'specs')
    assert len(gallery_log['new_value']) <= 255
    assert gallery_log['new_value'].endswith('[resumen]')


async def test_demo_media_defaults_auth_replacement_and_persistence(client, seed):
    assert (await client.get('/api/admin/media/demos')).status_code == 401
    headers = auth(await login(client))
    media = (await client.get('/api/admin/media/demos', headers=headers)).json()
    assert set(media) == {'house', 'apartment', 'functions', 'recording'}
    assert all(row['image_url'] and row['video_url'] for row in media.values())
    payload = {'image_url': '/api/uploads/new-house.webp', 'video_url': '/api/uploads/new-house.mp4'}
    assert (await client.put('/api/admin/media/demos/house', headers=headers, json=payload)).status_code == 200
    assert (await client.get('/api/settings/public')).json()['hero_media']['house'] == payload
    assert (await client.put('/api/admin/media/demos/house', headers=headers, json={**payload, 'video_url': 'javascript:alert(1)'})).status_code == 422
    uploaded = await client.post('/api/admin/media/demos/apartment/image', headers=headers, files={'file': ('photo.png', b'\x89PNG\r\n\x1a\nfixture', 'image/png')})
    assert uploaded.status_code == 200
    assert uploaded.json()['image_url'].startswith('/api/uploads/banners/demos/')
    assert (await client.get('/api/settings/public')).json()['hero_media']['apartment']['image_url'] == uploaded.json()['image_url']
    assert (await client.get('/api/settings/public')).json()['hero_media']['apartment']['video_url'] == media['apartment']['video_url']


async def test_technician_upload_creates_missing_setting(client, seed):
    headers = auth(await login(client))
    uploaded = await client.post('/api/admin/upload-about-image', headers=headers, files={'file': ('photo.png', b'\x89PNG\r\n\x1a\nfixture', 'image/png')})
    assert uploaded.status_code == 200
    assert (await client.get('/api/settings/public')).json()['about_image_url'] == uploaded.json()['image_url']


async def test_demo_uploads_accept_files_over_general_body_limit(client, seed, monkeypatch, tmp_path):
    from app.config import settings
    monkeypatch.setattr(settings, 'uploads_dir', str(tmp_path))
    headers = auth(await login(client))
    video = b'\x00\x00\x00\x20ftyp' + bytes(2 * 1024 * 1024)
    response = await client.post('/api/admin/media/demos/house/video', headers=headers, files={'file': ('demo.mp4', video, 'video/mp4')})
    assert response.status_code == 200
    image = b'\x89PNG\r\n\x1a\n' + bytes(2 * 1024 * 1024)
    assert (await client.post('/api/admin/media/demos/house/image', headers=headers, files={'file': ('cover.png', image, 'image/png')})).status_code == 200
    assert (await client.post('/api/admin/media/demos/house/video', headers=headers, files={'file': ('bad.mp4', bytes(24), 'video/mp4')})).status_code == 422


def test_backend_photo_indexes_match_original_catalogue_and_files():
    frontend = Path(__file__).resolve().parents[2] / 'frontend'
    photos = json.loads((frontend / 'src/data/catalog-photos.json').read_text(encoding='utf-8'))
    urls = {photo['url'] for photo in photos}
    for brand in COMBO_PHOTOS.values():
        for gallery in brand.values():
            assert gallery and all(url in urls and (frontend / 'public' / url.lstrip('/')).is_file() for url in gallery)
    products = json.loads((frontend / 'src/data/catalog-products.json').read_text(encoding='utf-8'))
    assert PRODUCT_PHOTOS == {p['name']: p['gallery'] for p in products}
