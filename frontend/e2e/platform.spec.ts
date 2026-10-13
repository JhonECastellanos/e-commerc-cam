import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function rendered(page: Page) {
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  const frame=await page.locator('canvas').screenshot();
  expect(frame.length).toBeGreaterThan(12000);
}

test('carousel contains both real interactive scenarios',async({page},info)=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Ver casa 3D en carrusel'}).click();
  await expect(page.locator('.lab-preview canvas')).toBeVisible();
  await page.getByRole('button',{name:'Ver apartamento 3D en carrusel'}).click();
  await expect(page.locator('.lab-preview canvas')).toBeVisible();
  await page.getByRole('button',{name:'Ver casa 3D en carrusel'}).click();
  if(info.project.name==='desktop')await page.locator('.lab-preview canvas').dblclick();
  else await page.getByRole('link',{name:'Configurar mi casa en 3D →',exact:true}).click();
  await expect(page).toHaveURL(/simulador\/casa/);
  await expect(page.getByRole('heading',{name:'Casa inteligente',exact:true})).toBeVisible();
});
for(const scenario of ['casa','apartamento'])test(`${scenario}: architectural presentation, lights, TV, touch panel and restoration`,async({page},info)=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/simulador/${scenario}`);await rendered(page);
  if(scenario==='casa') {
    const all=await page.locator('canvas').screenshot();
    await page.getByRole('button',{name:'Planta baja',exact:true}).click();
    await expect.poll(async()=>all.equals(await page.locator('canvas').screenshot())).toBe(false);
    await page.getByRole('button',{name:'Planta alta',exact:true}).click();
    await expect(page.getByRole('button',{name:'Planta alta',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Casa completa',exact:true}).click();
  }
  await expect(page.getByRole('button',{name:/Añadir|Retirar equipo|Colocar .*plano/})).toHaveCount(0);
  await page.getByRole('button',{name:'Ver de noche',exact:true}).click();
  const before=await page.locator('canvas').screenshot();
  await page.getByRole('button',{name:'Luz de cocina',exact:false}).click();
  await expect(page.getByRole('button',{name:'Luz de cocina',exact:false})).toHaveAttribute('aria-pressed','true');
  const lightFrame=await page.locator('canvas').screenshot();expect(before.equals(lightFrame)).toBe(false);
  await page.getByRole('tab',{name:'Asistente',exact:true}).click();
  await page.getByLabel('Orden para mi hogar').fill('Enciende el televisor de la sala');
  await page.getByRole('button',{name:'Enviar orden',exact:true}).click();
  await expect(page.locator('.chat-history')).toContainText('Encendí');
  const tvFrame=await page.locator('canvas').screenshot();expect(lightFrame.equals(tvFrame)).toBe(false);
  await page.getByRole('button',{name:'Simular movimiento en el acceso'}).click();
  await expect(page.getByRole('status')).toContainText('Movimiento simulado');
  await page.getByRole('tab',{name:'Tu hogar',exact:true}).click();
  await expect(page.getByRole('button',{name:'TV de la sala',exact:false})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Guardar escena',exact:true}).click();
  await page.reload();await rendered(page);
  await expect(page.getByRole('button',{name:'TV de la sala',exact:false})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Superior',exact:true}).click();
  await page.getByRole('button',{name:'Primera persona',exact:true}).click();
  await page.getByRole('button',{name:'Sala',exact:true}).click();
  await expect(page.getByLabel('Controles táctiles de recorrido')).toBeVisible();
  await page.getByRole('button',{name:'Isométrica',exact:true}).click();
  if(scenario==='casa')await page.getByRole('button',{name:'Planta alta',exact:true}).click();
  await page.getByRole('tab',{name:'Servidor local',exact:true}).click();
  await page.getByRole('button',{name:'Ver ubicación del servidor'}).click();
  if(scenario==='casa')await expect(page.getByRole('button',{name:'Casa completa',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Centrar vista',exact:true}).click();
  await page.screenshot({path:`test-results/${info.project.name}-${scenario}-showcase.png`,fullPage:true});
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});

test('strategic home is attached to advisory without submitting business data',async({page})=>{
  await page.goto('/simulador/apartamento');
  await page.getByRole('button',{name:'Solicitar asesoría para mi hogar',exact:true}).click();
  await expect(page).toHaveURL(/asesoria/);
  await expect(page.getByText('Adjuntar mi diseño 3D')).toBeVisible();
  const design=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('instalacam:advisory-design')||'null'));
  expect(design.devices.some((d:{kind:string})=>d.kind==='television')).toBe(true);
  expect(design.devices.some((d:{kind:string})=>d.kind==='server')).toBe(true);
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
  const catalogPage=await page.goto('/catalogo');
  expect(catalogPage?.status()).toBe(200);
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
