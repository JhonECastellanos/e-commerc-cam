import { test, expect, type Page } from '@playwright/test';

test('all active combos, Dahua photographs and discreet filtered pagination',async({page,request},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const response=await request.get('/api/combos');expect(response.ok()).toBeTruthy();
  const combos=await response.json();expect(combos.length).toBeGreaterThan(3);
  expect(combos.some((c:any)=>c.name==='3cam_2mp_dvr_4chanels_500gb_app')).toBe(true);
  await page.goto('/catalogo');
  await page.getByLabel('Marca del combo').selectOption('Dahua / Cooper');
  const nav=page.getByRole('navigation',{name:'Paginación de combos'});
  await expect(nav).toBeVisible();
  await expect(page.locator('.commerce-combo-grid .combo-commerce-card')).toHaveCount(6);
  await expect(page.locator('.commerce-combo-grid')).toContainText('3 cámaras · 2 MP · DVR 4 canales · 500 GB');
  for(const image of await page.locator('.commerce-combo-grid img').all()){
    await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  }
  await page.getByRole('button',{name:'Página siguiente de combos',exact:true}).click();
  await expect(nav.getByRole('button',{name:'Página 2 de combos',exact:true})).toHaveAttribute('aria-current','page');
  await page.getByLabel('Modo de instalación').selectOption('inalambrico');
  await expect(nav.getByRole('button',{name:'Página 1 de combos',exact:true})).toHaveAttribute('aria-current','page');
  await page.screenshot({path:`test-results/${info.project.name}-catalog-combos.png`,fullPage:true});
});

test('featured carousel retains cards and product pages support horizontal gestures',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const carousel=page.getByRole('region',{name:'Combos destacados por marca'});
  await expect(carousel.locator('.combo-commerce-card')).toHaveCount(6);
  if(info.project.name==='desktop'){
    await carousel.getByRole('button',{name:'Siguientes combos'}).click();
    await expect(carousel.locator('.featured-carousel-controls')).toContainText('Dahua / Cooper');
  }
  await page.goto('/catalogo#productos');
  const products=page.locator('#productos'),grid=products.getByRole('list',{name:'equipos'});
  await expect(products.getByRole('button',{name:'Página 1 de equipos',exact:true})).toHaveAttribute('aria-current','page');
  await grid.evaluate(node=>window.scrollTo(0,node.getBoundingClientRect().top+window.scrollY-120));
  await page.waitForTimeout(400);
  const box=(await grid.boundingBox())!,y=Math.max(140,box.y+60),x=box.x+box.width-30;
  if(info.project.name==='mobile'){
    const session=await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=8;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-(box.width-60)*step/8,y}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(box.x+30,y,{steps:8});await page.mouse.up();}
  await expect(products.getByRole('button',{name:'Página 2 de equipos',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page).toHaveURL(/catalogo/);
  await expect(products.getByRole('button',{name:/Ver los \d+ equipos|Ver más|Mostrar menos equipos/})).toHaveCount(0);
  await products.getByRole('combobox',{name:'Marca',exact:true}).selectOption('Hikvision / HiLook');
  await expect(products.getByRole('button',{name:'Página 1 de equipos',exact:true})).toHaveAttribute('aria-current','page');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

// Browser writes are mocked. Real CRUD roundtrips run separately against SQLite
// fixtures; these tests never send mutations to the commercial database.
async function mockAdministration(page:Page){
  const state={products:[{id:901,name:'Equipo QA aislado',brand_id:1,brand_name:'HiLook',category:'Cámaras',price:100000,active:true,specs:{},sort_order:0}],banners:[{id:901,title:'Banner QA aislado',position:1,active:true,image_url:'/images/cctv-diagram.svg',video_url:''}],settings:[{key:'hero_demo_slides',value:'house,apartment,functions,recording'}],writes:[] as string[]};
  await page.addInitScript(()=>sessionStorage.setItem('admin_token','synthetic-qa-token'));
  await page.route('**/api/admin/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
    if(method!=='GET')state.writes.push(`${method} ${path}`);
    let json:any;
    if(path==='/api/admin/me')json={id:901,name:'Administrador QA',role:'admin',email:'qa@example.invalid'};
    else if(path==='/api/admin/prices/brands')json=[{id:1,name:'HiLook'}];
    else if(path==='/api/admin/prices/settings')json=state.settings;
    else if(path.startsWith('/api/admin/prices/settings/')&&method==='PUT'){state.settings=[{key:'hero_demo_slides',value:request.postDataJSON().value}];json=state.settings[0];}
    else if(path==='/api/admin/products-admin'&&method==='GET')json=state.products;
    else if(path==='/api/admin/products-admin'&&method==='POST'){const row={...Object.fromEntries(url.searchParams),id:902,active:true,brand_name:'HiLook',specs:{}} as any;state.products.push(row);json=row;}
    else if(path.startsWith('/api/admin/products-admin/')&&method==='PUT'){const id=Number(path.split('/').pop());state.products=state.products.map(row=>row.id===id?{...row,...request.postDataJSON()}:row);json=state.products.find(row=>row.id===id);}
    else if(path.startsWith('/api/admin/products-admin/')&&method==='DELETE'){state.products=state.products.filter(row=>row.id!==Number(path.split('/').pop()));json={ok:true};}
    else if(path==='/api/admin/banners'&&method==='GET')json=state.banners;
    else if(path.startsWith('/api/admin/banners/')&&method==='PUT'){state.banners=state.banners.map(row=>({...row,...request.postDataJSON()}));json=state.banners[0];}
    else {await route.fulfill({status:404,json:{detail:`Unexpected QA route: ${method} ${path}`}});return;}
    await route.fulfill({json});
  });
  return state;
}

test('responsive administrator creates, edits, classifies and removes products without live writes',async({page},info)=>{
  const state=await mockAdministration(page);
  await page.goto('/admin/productos');
  await expect(page.getByRole('heading',{name:'Administrar Productos'})).toBeVisible();
  if(info.project.name==='mobile'){await page.getByRole('button',{name:'Administrar',exact:true}).click();await expect(page.getByRole('navigation',{name:'Administración'})).toBeVisible();await page.getByRole('button',{name:'Cerrar menú'}).click();}
  await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Precio del equipo (COP; vacío: a cotizar)',{exact:true}).fill('125000');
  await page.getByLabel('Categoría',{exact:true}).fill('Grabadores');
  await page.getByText('Clasificar conexiones y funciones del equipo',{exact:true}).click();
  await page.getByLabel('Usar clasificación personalizada').check();
  await page.getByLabel('Híbrido',{exact:true}).check();await page.getByLabel('Grabadores y almacenamiento',{exact:true}).check();
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  expect(state.products[0].price).toBe(125000);expect((state.products[0].specs as any)['Modalidades del catalogo']).toBe('hibrido');
  await page.getByRole('button',{name:'Nuevo producto',exact:true}).click();
  await page.getByLabel('Nombre',{exact:true}).fill('Nuevo equipo QA');await page.getByRole('combobox',{name:'Marca',exact:true}).selectOption('1');
  await page.getByRole('button',{name:'Crear registro'}).click();
  await expect(page.getByRole('heading',{name:'Nuevo equipo QA',exact:true})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.admin-record').filter({has:page.getByRole('heading',{name:'Nuevo equipo QA',exact:true})}).getByRole('button',{name:'Eliminar'}).click();
  await expect(page.getByRole('heading',{name:'Nuevo equipo QA',exact:true})).toHaveCount(0);
  expect(state.writes.filter(write=>write==='POST /api/admin/products-admin')).toHaveLength(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/${info.project.name}-admin-products.png`,fullPage:true});
});

test('administrator replaces banner videos, hides banners and selects built-in demos',async({page},info)=>{
  const state=await mockAdministration(page);await page.goto('/admin/multimedia');
  await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('URL de vídeo del banner').fill('/banner-assets/casa-loop.mp4');
  await page.getByLabel('Visible en el carrusel').uncheck();
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await expect(page.locator('video')).toBeVisible();expect(state.banners[0].active).toBe(false);
  await page.getByText('Demostraciones incluidas en el carrusel',{exact:true}).click();
  await page.getByLabel('Funciones de cámaras',{exact:true}).uncheck();
  await page.getByRole('button',{name:'Guardar selección de demos'}).click();
  await expect.poll(()=>state.settings[0].value).toBe('house,apartment,recording');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/${info.project.name}-admin-media.png`,fullPage:true});
});
