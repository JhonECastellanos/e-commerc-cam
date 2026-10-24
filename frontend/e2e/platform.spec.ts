import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function verifyRenderedProperty(page: Page) {
  const scene = page.locator('canvas');
  await scene.scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const frame = await scene.screenshot();
    return page.evaluate(async (base64: string) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const surface = document.createElement('canvas');
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const context = surface.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
      const colors = new Set<string>();
      for (let y = 0; y < surface.height; y += 12)
        for (let x = 0; x < surface.width; x += 12) {
          const i = (y * surface.width + x) * 4;
          colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
        }
      return colors.size;
    }, frame.toString('base64'));
  }, { message: 'El canvas debe dibujar el inmueble, incluso al volver desde el panel móvil' }).toBeGreaterThan(20);
}

test('carousel contains both real interactive scenarios', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Nuestros productos/ })).toBeAttached();
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBeTruthy();
  await page.getByRole('button', { name: 'Ver casa 3D en carrusel' }).click();
  await expect(page.locator('.lab-preview canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Ver apartamento 3D en carrusel' }).click();
  await expect(page.locator('.lab-preview canvas')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Configurar mi apartamento en 3D →', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver casa 3D en carrusel' }).click();
  if (testInfo.project.name === 'desktop') await page.locator('.lab-preview canvas').dblclick();
  else await page.getByRole('link', { name: 'Configurar mi casa en 3D →', exact: true }).click();
  await expect(page).toHaveURL(/simulador\/casa/);
  await expect(
    page.getByRole('heading', { name: 'Casa inteligente', exact: true }),
  ).toBeVisible();
});

for (const scenario of ['casa', 'apartamento'])
  test(`${scenario}: devices, state, movement, views, save and restore`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/simulador/${scenario}`);
    await expect(page.locator('canvas')).toBeVisible();
    await verifyRenderedProperty(page);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Pantalla completa', exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBeTruthy();
    await page
      .getByRole('button', { name: 'Pantalla completa', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Añadir Micrófono', exact: true })
      .click();
    await page.getByLabel('Mover a').selectOption('pasillo');
    await page.getByLabel('Rotación').focus();
    await page.getByLabel('Rotación').press('ArrowRight');
    await expect(page.getByLabel('Rotación')).toHaveValue('15');
    await page.getByRole('button', { name: 'Encender', exact: true }).click();
    await expect(page.locator('.device-list .selected')).toContainText(
      'Pasillo · Activo',
    );
    await page.getByRole('tab', { name: 'Chat y reglas' }).click();
    await page
      .getByLabel('Orden de texto')
      .fill('Enciende las luces de la cocina');
    await page.getByRole('button', { name: 'Probar orden' }).click();
    await expect(page.locator('.chat-history')).toContainText(
      'Encendí 1 dispositivo',
    );
    await page.getByRole('tab', { name: 'Equipos', exact: true }).click();
    await expect(page.locator('.device-list')).toContainText('Cocina · Activo');
    await page.getByRole('button', { name: 'Superior', exact: true }).click();
    await page.getByRole('button', { name: 'Ocultar paredes' }).click();
    await page.getByRole('button', { name: 'Mostrar techo' }).click();
    await page.getByRole('button', { name: 'Ocultar techo' }).click();
    await page.getByRole('button', { name: 'Abrir / cerrar puertas' }).click();
    await page
      .getByRole('button', { name: 'Primera persona', exact: true })
      .click();
    await page.getByRole('button', { name: 'Sala', exact: true }).click();
    await expect(
      page.getByLabel('Controles táctiles de recorrido'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Isométrica', exact: true }).click();
    await page.getByRole('tab', { name: 'Mi proyecto' }).click();
    await page
      .getByRole('button', { name: 'Guardar cambios', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('guardada');
    await page.reload();
    await expect(page.locator('.device-list')).toContainText('Micrófono');
    await page
      .locator('.device-list button')
      .filter({ hasText: 'Micrófono' })
      .click();
    await page.getByRole('button', { name: 'Retirar equipo' }).click();
    await expect(page.locator('.device-list')).not.toContainText('Micrófono');
    await page.getByRole('tab', { name: 'Mi proyecto' }).click();
    await page.getByRole('button', { name: 'Restaurar guardado' }).click();
    await page.getByRole('tab', { name: 'Equipos', exact: true }).click();
    await expect(page.locator('.device-list')).toContainText('Micrófono');
    await verifyRenderedProperty(page);
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-${scenario}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

test('design is submitted with a server-generated profile and one receipt', async ({
  page,
}) => {
  await page.goto('/simulador/apartamento');
  await page.getByRole('tab', { name: 'Mi proyecto' }).click();
  await page
    .getByRole('button', { name: 'Solicitar asesoría con este diseño' })
    .click();
  await expect(page.getByText('Adjuntar mi diseño 3D')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Número aproximado de áreas').fill('4');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(
    page.getByText('Seguridad con automatización y domótica', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Nombre', { exact: true }).fill('Cliente E2E virtual');
  await page.getByLabel('Localidad / municipio').fill('Bogotá');
  await page.getByLabel('Número de contacto').fill('3001234567');
  await page.getByRole('checkbox', { name: /Autorizo usar/ }).check();
  await page
    .getByRole('button', { name: 'Solicitar cotización y revisión del asesor' })
    .click();
  await expect(
    page.getByText('Solicitud recibida', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('strong').filter({ hasText: /ASE-/ }),
  ).toBeVisible();
});

test('all catalog image URLs respond and decoded images render', async ({
  page,
  request,
}) => {
  const response = await request.get('/api/combos');
  expect(response.ok()).toBeTruthy();
  const combos = await response.json();
  const urls = [
    ...new Set<string>([
      ...combos.map((c: any) => c.image_url).filter(Boolean),
      ...JSON.parse(readFileSync('src/data/image-manifest.json', 'utf8')),
    ]),
  ];
  expect(urls.length).toBeGreaterThan(0);
  for (const url of urls) {
    const image = await request.get(url);
    expect(image.ok(), url).toBeTruthy();
    expect(image.headers()['content-type']).toMatch(/^image\//);
  }
  await page.goto('/catalogo');
  const decoded = await page.evaluate(async (sources: string[]) =>
    Promise.all(sources.map(async (src) => {
      const image = new Image();
      image.src = src;
      try {
        await image.decode();
        return { src, valid: image.naturalWidth > 0 && image.naturalHeight > 0 };
      } catch { return { src, valid: false }; }
    })), urls);
  expect(decoded.filter(image => !image.valid)).toEqual([]);
  await expect(page.locator('img').first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('img')
        .first()
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBeTruthy();
});

test('raycasting, snapping, sensor automation and portable configuration', async ({
  page,
}) => {
  await page.goto('/simulador/casa');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Superior', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Colocar Tomacorriente inteligente en el plano',
      exact: true,
    })
    .click();
  const bounds = (await page.locator('canvas').boundingBox())!;
  const x = bounds.width / 2 + (3.6 * bounds.height) / 28;
  const y = bounds.height / 2 + (3.5 * bounds.height) / 28;
  await page.locator('canvas').click({ position: { x, y } });
  await expect(page.locator('.device-list .selected')).toContainText(
    'Tomacorriente inteligente',
  );
  const coord = Number(
    await page.getByLabel('X (m)', { exact: true }).inputValue(),
  );
  expect(coord * 4).toBe(Math.round(coord * 4));
  await page
    .locator('.device-list button')
    .filter({ hasText: 'Sensor de movimiento' })
    .click();
  await page.getByRole('button', { name: 'Simular evento' }).click();
  await expect(
    page
      .locator('.device-list button')
      .filter({ hasText: 'Luz inteligente' })
      .filter({ hasText: 'Cocina' }),
  ).toContainText('Activo');
  await page.getByRole('tab', { name: 'Mi proyecto' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('instalacam-casa.json');
  const file = (await download.path())!;
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('status')).toContainText('importada');
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"version":999}'),
    });
  await expect(page.getByRole('status')).toContainText('inválido');
  await page
    .getByRole('button', { name: 'Primera persona', exact: true })
    .click();
  const forward = page.getByRole('button', { name: 'Avanzar ↑', exact: true });
  await forward.scrollIntoViewIfNeeded();
  const before = await page.locator('canvas').screenshot();
  const control = (await forward.boundingBox())!;
  await page.mouse.move(
    control.x + control.width / 2,
    control.y + control.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(350); // A real held navigation input needs elapsed animation frames.
  await page.mouse.up();
  const after = await page.locator('canvas').screenshot();
  expect(before.equals(after)).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBeTruthy();
});
