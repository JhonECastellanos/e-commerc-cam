import {test,expect,type Page} from '@playwright/test';

// All writes in these UI tests are intercepted. Commercial data stays untouched.
async function adminSession(page:Page){
  await page.addInitScript(()=>sessionStorage.setItem('admin_token','qa-business-synthetic'));
  await page.route('**/api/admin/me',route=>route.fulfill({json:{id:901,name:'Administrador QA',role:'admin',email:'qa@example.invalid'}}));
}

test('public booking shows real duration choices, confirmation and no duplicate submit',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let writes=0;
  await page.route('**/api/agenda/slots?**',route=>route.fulfill({json:{timezone:'America/Bogota',duration_minutes:route.request().url().includes('smart_home')?60:30,slots:[{starts_at:'2026-10-20T15:00:00+00:00',ends_at:'2026-10-20T15:30:00+00:00',label:'10:00'}]}}));
  await page.route('**/api/agenda/book',async route=>{writes++;expect(route.request().headers()['idempotency-key']).toBeTruthy();const body=route.request().postDataJSON();await route.fulfill({status:201,json:{id:'QA-booking',kind:body.kind,starts_at:body.starts_at,ends_at:'2026-10-20T16:00:00+00:00',status:'confirmed',access_token:'synthetic-receipt'}})});
  await page.goto('/agenda');
  await page.getByLabel('¿Sobre qué quieres conversar?').selectOption('smart_home_meeting');
  await page.getByRole('button',{name:'10:00',exact:true}).click();
  await page.getByLabel('Nombre',{exact:true}).fill('Cliente QA aislado');
  await page.getByLabel('Teléfono o correo para coordinar').fill('qa@example.invalid');
  await page.getByLabel(/Autorizo el uso de mis datos/).check();
  await page.getByRole('button',{name:'Confirmar reunión',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Tu reunión está confirmada'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Casa inteligente');
  expect(writes).toBe(1);expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/${info.project.name}-agenda.png`,fullPage:true});
});

test('commercial chat preserves consent and receives manual replies while open',async({page})=>{
  let messages:any[]=[];
  await page.route('**/api/chat/sessions',route=>route.fulfill({status:201,json:{id:'qa-session',token:'qa-session-token'}}));
  await page.route('**/api/chat/sessions/qa-session',route=>{if(route.request().method()==='POST')messages=[{id:'q1',role:'user',body:route.request().postDataJSON().text},{id:'q2',role:'assistant',body:'Consulta /agenda para reservar una reunión.'}];return route.fulfill({json:messages})});
  await page.goto('/');
  await page.getByRole('button',{name:'Asistente',exact:true}).click();
  const panel=page.getByRole('region',{name:'Asistente comercial'});
  await panel.getByLabel('Tu consulta').fill('InstalaCámara quiero una reunión');
  await expect(panel.getByRole('button',{name:'Enviar',exact:true})).toBeDisabled();
  await panel.getByLabel(/Acepto el tratamiento/).check();
  await panel.getByRole('button',{name:'Enviar',exact:true}).click();
  await expect(panel.getByRole('log')).toContainText('Consulta');
  messages.push({id:'q3',role:'admin',body:'Hola, soy tu asesor. Revisemos tu instalación.'});
  await expect(panel.getByRole('log')).toContainText('soy tu asesor',{timeout:10000});
  await expect(panel.getByRole('link',{name:'Reservar reunión'}).last()).toHaveAttribute('href','/agenda');
});

test('admin agent configuration, model search and proposal review work on mobile and desktop',async({page},info)=>{
  await adminSession(page);
  const cfg:any={enabled:false,public_enabled:false,local:false,base_url:'',model:'',skill:'Responde únicamente sobre el negocio y solicita asesoría.',has_api_key:false};
  const proposals=[{id:'proposal-qa',arguments:{entity:'product',id:901,changes:{price:'150000'}},before:{price:'100000'},status:'pending'}];
  await page.route('**/api/admin/agent/**',async route=>{const path=new URL(route.request().url()).pathname;let json:any={};if(path.endsWith('/config')){if(route.request().method()==='PUT'){Object.assign(cfg,route.request().postDataJSON());delete cfg.api_key;cfg.has_api_key=true}json=cfg}else if(path.endsWith('/models'))json=['modelo-local-a','modelo-local-b'];else if(path.endsWith('/proposals'))json=proposals;else if(path.endsWith('/confirm')){proposals[0].status='applied';json={status:'applied'}}else if(path.endsWith('/whatsapp'))json={status:'disconnected',qr:null};await route.fulfill({json})});
  await page.goto('/admin/agente');
  await expect(page.getByRole('heading',{name:'Agente y WhatsApp',exact:true})).toBeVisible();
  await page.getByLabel('Configuración inicial').selectOption('6');
  await page.getByLabel('ID del modelo',{exact:true}).fill('modelo-local-a');
  await page.getByRole('button',{name:'Guardar conexión',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Configuración guardada');
  await page.getByRole('button',{name:'Consultar modelos guardados'}).click();
  await page.getByLabel('Buscar en modelos disponibles').fill('local-b');
  await page.getByLabel('Modelo disponible',{exact:true}).selectOption('modelo-local-b');
  await page.getByRole('tab',{name:'Agente y MCP',exact:true}).click();
  await expect(page.getByText('100000',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Confirmar cambio',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Cambio aplicado');
  await page.getByRole('tab',{name:'WhatsApp',exact:true}).click();
  await expect(page.getByRole('tabpanel',{name:'WhatsApp',exact:true}).getByRole('status')).toContainText('Desconectado');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/${info.project.name}-agente.png`,fullPage:true});
});

test('admin agenda persists classification and rating through the existing API screen',async({page},info)=>{
  await adminSession(page);
  let appointment={id:'appointment-qa',name:'Cliente QA aislado',contact:'qa@example.invalid',kind:'cctv_meeting',starts_at:'2026-10-20T15:00:00Z',ends_at:'2026-10-20T15:30:00Z',status:'confirmed',classification:'nuevo',rating:null as number|null,notes:'',source:'web'};
  let writes=0;
  await page.route('**/api/admin/agenda**',async route=>{const path=new URL(route.request().url()).pathname;let json:any;if(path==='/api/admin/agenda-rules')json={enabled:true,opens:8,closes:22,days:[0,1,2,3,4,5,6],lead_minutes:60,horizon_days:30};else if(route.request().method()==='PUT'){writes++;appointment={...appointment,...route.request().postDataJSON()};json=appointment}else json=[appointment];await route.fulfill({json})});
  await page.goto('/admin/agenda');
  await expect(page.getByRole('heading',{name:'Agenda y clientes',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Clasificar / calificar',exact:true}).click();
  await page.getByLabel('Clasificación').selectOption('prioritario');
  await page.getByLabel('Calificación manual').selectOption('5');
  await page.getByLabel('Notas',{exact:true}).fill('Interesado en instalación con revisión de accesos.');
  await page.getByRole('button',{name:'Guardar clasificación',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await expect(page.getByText('prioritario · 5/5 · web')).toBeVisible();
  expect(writes).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/${info.project.name}-admin-agenda.png`,fullPage:true});
});
