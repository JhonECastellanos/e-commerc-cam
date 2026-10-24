import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ trace: 'off' });
test.describe('Existing administration', () => {
  // Authenticated traffic must never persist credentials/tokens in browser traces.
  test('upload routes, public images and advisor review remain functional', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(process.env.E2E_ADMIN_MUTATIONS !== '1', 'Administrative writes require an explicitly selected disposable QA environment.');
    test.skip(
      testInfo.project.name === 'mobile',
      'The existing administrative workflow is validated on desktop.',
    );
    const values = Object.fromEntries(
      readFileSync(path.resolve('../.env'), 'utf8')
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter((line) => line.includes('=') && !line.startsWith('#'))
        .map((line) => {
          const i = line.indexOf('=');
          return [line.slice(0, i), line.slice(i + 1)];
        }),
    );
    const login = await request.post('/api/admin/login', {
      data: {
        email: values.INITIAL_ADMIN_EMAIL,
        password: values.INITIAL_ADMIN_PASSWORD,
      },
    });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).access_token;
    const headers = { Authorization: `Bearer ${token}` };
    const products = await request.get('/api/admin/products-admin', {
      headers,
    });
    expect(products.ok()).toBeTruthy();
    const product = (await products.json())[0];
    // Test-only PNG for QA; does not replace or fabricate a photograph in the source catalog.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=',
      'base64',
    );
    const upload = await request.post(
      `/api/admin/products-admin/${product.id}/upload-image`,
      {
        headers,
        multipart: {
          file: { name: 'qa-image.png', mimeType: 'image/png', buffer: png },
        },
      },
    );
    expect(upload.ok()).toBeTruthy();
    const url = (await upload.json()).image_url;
    writeFileSync(testInfo.outputPath('image-restore.json'), JSON.stringify({ id: product.id, original: product.image_url || null, test_url: url }));
    expect(url).toMatch(/^\/api\/uploads\/catalog\//);
    const image = await request.get(url);
    expect(image.ok()).toBeTruthy();
    expect(image.headers()['content-type']).toMatch(/^image\/png/);
    await page.goto('/');
    const advisory = await request.post('/api/advisory/requests', { headers: { 'Idempotency-Key': `qa-review-${Date.now()}` }, data: { name: 'Prueba administración QA', contact_method: 'telefono', contact: '0000000000', locality: 'Bogotá', consent: true, consent_version: 'asesoria-2026-10-v1', answers: { need: 'seguridad', property: 'casa', environment: 'interior', areas: 3, spaces: 'Acceso virtual', existing: 'no', connectivity: 'wifi', goals: ['accesos'], preference: 'combo', priority: 'planificando', installation: 'asesoria', infrastructure: 'ninguna', units: 1, support: 'asesoria' } } });
    expect(advisory.ok()).toBeTruthy();
    await page.evaluate(
      (token) => sessionStorage.setItem('admin_token', token),
      token,
    );
    await page.goto('/admin/asesorias');
    await expect(
      page.getByRole('heading', { name: 'Solicitudes de asesoría' }),
    ).toBeVisible();
    const rows = page.locator('button').filter({ hasText: /ASE-/ });
    await expect(rows.first()).toBeVisible();
    await rows.first().click();
    await page
      .getByLabel('Estado', { exact: false })
      .selectOption('en_revision');
    await page
      .getByLabel('Ajustar recomendación')
      .selectOption('Instalación de seguridad personalizada');
    await page
      .getByLabel('Revisión del asesor')
      .fill(
        'Revisión QA: verificar red y ubicación antes de emitir la cotización.',
      );
    await page.getByRole('button', { name: 'Guardar revisión' }).click();
    await expect(rows.first()).toContainText('en_revision');
    const banners = await request.get('/api/admin/banners', { headers });
    expect(banners.ok()).toBeTruthy();
  });
});
