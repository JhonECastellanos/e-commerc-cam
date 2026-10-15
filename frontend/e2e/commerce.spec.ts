import { test, expect } from '@playwright/test';

test('camera answers survive back navigation and reach WhatsApp and checkout',async({page})=>{
  await page.goto('/');
  const wizard=page.locator('#contratar-camaras');
  await wizard.getByRole('button',{name:'Encontrar mis cámaras'}).click();
  await wizard.getByRole('button',{name:'Casa',exact:true}).click();
  await wizard.getByRole('button',{name:'Interior y exterior',exact:true}).click();
  await wizard.getByRole('button',{name:'Acceso y fachada',exact:true}).click();
  await wizard.getByLabel('Número de áreas').fill('3');
  await wizard.getByRole('button',{name:'Continuar',exact:true}).click();
  await wizard.getByRole('button',{name:'Volver',exact:true}).click();
  await expect(wizard.getByLabel('Número de áreas')).toHaveValue('3');
  await wizard.getByRole('button',{name:'Continuar',exact:true}).click();
  await wizard.getByRole('button',{name:'Precio',exact:true}).click();
  await wizard.getByRole('button',{name:'Es una instalación nueva',exact:true}).click();
  await wizard.getByRole('button',{name:'Red por cable',exact:true}).click();
  await wizard.getByRole('button',{name:'Durante el próximo mes',exact:true}).click();
  await expect(wizard.getByRole('heading',{name:'Un combo de 3 cámaras puede ser adecuado'})).toBeVisible();
  const url=new URL(await wizard.getByRole('link',{name:'Enviar mis respuestas por WhatsApp'}).getAttribute('href')||'');
  expect(url.hostname).toBe('wa.me');
  expect(url.searchParams.get('text')).toContain('Áreas: 3');
  expect(url.searchParams.get('text')).toContain('Exterior: acceso');
  await wizard.getByRole('button',{name:'Continuar con este combo'}).first().click();
  await expect(page).toHaveURL(/checkout\/\d+/);
  await expect(page.getByRole('region',{name:'Perfil de cámaras para la cotización'})).toContainText('Áreas: 3');
  await page.reload();
  await expect(page.getByRole('region',{name:'Perfil de cámaras para la cotización'})).toContainText('Inmueble: Casa');
});

test('office questions are conditional; original catalogue photos, filters and details render',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  const wizard=page.locator('#contratar-camaras');
  await wizard.getByRole('button',{name:'Encontrar mis cámaras'}).click();
  await wizard.getByRole('button',{name:'Oficina',exact:true}).click();
  await wizard.getByRole('button',{name:'Interior',exact:true}).click();
  await expect(wizard.getByRole('heading',{name:'¿Cuántos accesos quieres vigilar?'})).toBeVisible();
  await expect(wizard.getByRole('button',{name:'Jardín o patio'})).toHaveCount(0);
  await page.goto('/catalogo');
  const products=page.locator('#productos');
  await expect(products.getByRole('status')).toContainText('44 equipos');
  await products.getByRole('combobox',{name:'Marca',exact:true}).selectOption('Hikvision / HiLook');
  await expect(products.getByRole('listitem').first().getByRole('img')).toBeVisible();
  await products.locator('img').first().scrollIntoViewIfNeeded();
  await expect.poll(()=>products.locator('img').first().evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await products.getByRole('button',{name:'Ver detalle',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toContainText('Código catálogo: IC-');
  await expect(page.getByRole('dialog').getByRole('link',{name:'Consultar por WhatsApp'})).toHaveAttribute('href',/^https:\/\/wa\.me\/\d+\?text=/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/');
  await page.screenshot({path:`test-results/${info.project.name}-commerce-home.png`,fullPage:true});
});

test('native security video autoplays muted in a loop without YouTube or playback buttons',async({page})=>{
  await page.goto('/');
  const video=page.locator('.hero-slide').first().locator('video');
  await expect(video).toBeVisible();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);
  expect(await video.evaluate((v:HTMLVideoElement)=>v.muted&&v.loop&&v.playsInline&&!v.controls)).toBe(true);
  await expect(page.locator('.youtube-media iframe')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Pausar vídeo|Reproducir vídeo/})).toHaveCount(0);
});

test('reduced motion keeps a static poster without loading video',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('.hero-slide').first().locator('.hero-poster')).toBeVisible();
  await expect(page.locator('.hero-slide').first().locator('video')).toHaveCount(0);
  expect(await page.evaluate(()=>Array.from(document.scripts).some(s=>s.src==='https://www.youtube.com/iframe_api'))).toBe(false);
});

test('administrative banners rotate and retain manual navigation',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();
  await page.route('**/api/banners',route=>route.fulfill({json:[
    {id:1,title:'Seguridad para tu vivienda',image_url:'/images/cctv-diagram.svg'},
    {id:2,title:'Instalación para tu negocio',image_url:'/images/cctv-diagram.svg'},
  ]}));
  await page.goto('/');
  await expect(page.locator('.hero-slide')).toHaveCount(6);
  await page.clock.runFor(14000);
  await expect(page.getByRole('button',{name:'Ver diapositiva 2'})).toHaveAttribute('aria-current','true');
  await expect(page.getByRole('heading',{name:'Instalación para tu negocio'})).toBeVisible();
  await page.getByRole('button',{name:'Ver diapositiva 1'}).click();
  await page.clock.runFor(1500);
  await expect(page.getByRole('button',{name:'Ver diapositiva 1'})).toHaveAttribute('aria-current','true');
  await expect(page.getByRole('button',{name:/Pausar vídeo|Reproducir vídeo/})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('background model clips play, pause and survive horizontal swipe',async({page},info)=>{
  await page.goto('/');
  await expect(page.locator('.hero-slide')).toHaveCount(5);
  const hero=page.locator('.hero-viewport');
  const box=(await hero.boundingBox())!;
  const y=Math.max(120,box.y+50),start=box.x+box.width-35,end=box.x+35;
  if(info.project.name==='mobile'){
    const session=await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
    for(let step=1;step<=8;step++){
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*step/8,y}]});
      await page.waitForTimeout(30);
    }
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await session.detach();
  }else{
    await page.mouse.move(start,y);await page.mouse.down();
    await page.mouse.move(end,y,{steps:12});await page.mouse.up();
  }
  await expect(page.getByRole('button',{name:'Ver diapositiva 2',exact:true})).toHaveAttribute('aria-current','true');
  const video=page.locator('.hero-slide').nth(1).locator('video');
  await expect(video).toBeVisible();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.duration)).toBe(5);
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);
  await page.locator('#contratar-camaras').scrollIntoViewIfNeeded();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
  await page.locator('.security-hero').scrollIntoViewIfNeeded();
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('installation tree filters actual products and qualifies optional capabilities',async({page})=>{
  await page.goto('/');
  const cable=page.locator('.installation-card').filter({has:page.getByRole('heading',{name:'Cableado',exact:true})});
  await cable.getByText('Ver funciones y equipos',{exact:true}).click();
  await cable.getByRole('link',{name:/Giro y zoom motorizados/}).click();
  await expect(page).toHaveURL(/equipmentMode=cableado&function=ptz#productos/);
  const products=page.locator('#productos');
  await expect(products.getByRole('status')).toContainText('10 equipos');
  await expect(products.getByRole('listitem').first()).toContainText('PTZ');
  await products.getByLabel('Función del equipo').selectOption('');
  await products.getByLabel('Conexión del equipo').selectOption('inalambrico');
  await expect(products.getByRole('status')).toContainText('0 equipos');
  await products.getByLabel('Conexión del equipo').selectOption('solar');
  await products.getByLabel('Función del equipo').selectOption('two-way');
  await expect(products.getByRole('status')).toContainText('2 equipos');
  await expect(products.getByRole('listitem').first()).toContainText('solo en la variante SX');
  await products.getByRole('button',{name:'Ver detalle',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toContainText('solo variante SX');
});

test('direct demo links stay visible after delayed catalogue loading',async({page})=>{
  await page.route('**/api/products',async route=>{
    const response=await route.fetch();
    await page.waitForTimeout(900);
    await route.fulfill({response});
  });
  await page.goto('/?demo=casa#casa-inteligente');
  await expect(page.locator('#productos').getByRole('status')).toHaveText(/\d+ equipos/);
  const panel=page.locator('#smart-demo-panel');
  await expect(panel.locator('canvas')).toBeVisible();
  await expect.poll(async()=>{
    const box=await panel.boundingBox();return box?box.y:-1;
  }).toBeGreaterThanOrEqual(60);
  expect((await panel.boundingBox())!.y).toBeLessThan(150);
});
