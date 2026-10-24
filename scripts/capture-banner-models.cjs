// Read-only captures of the existing WebGL demos. No orders/leads or saved scenes.
const {chromium}=require('../frontend/node_modules/@playwright/test');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const base=process.env.BANNER_CAPTURE_URL||'http://127.0.0.1:5195';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Capture the local preview only');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  try{
    for(const scenario of ['casa','apartamento']){
      const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${base}/simulador/${scenario}`);
      const canvas=page.locator('canvas');await canvas.waitFor();
      await page.waitForLoadState('networkidle');
      await page.getByRole('button',{name:'Ver de noche',exact:true}).click();
      await page.getByRole('button',{name:'Llegar a casa',exact:false}).click();
      await page.addStyleTag({content:'.lab-header,.lab-panel,.lab-toolbar,.world-caption,.room-strip{display:none!important}.lab-body,.lab-world{width:960px!important;height:540px!important;min-height:540px!important;display:block!important}.scene-viewport{position:absolute!important;inset:0!important;height:540px!important}'});
      await page.waitForTimeout(1800);
      const folder=resolve('.local/banner-captures',scenario);mkdirSync(folder,{recursive:true});
      const box=await canvas.boundingBox();
      await page.mouse.move(box.x+480,box.y+270);await page.mouse.down();
      for(let frame=0;frame<60;frame++){
        // Slow arc and return to the same angle for a five-second loop.
        const offset=30*(1-Math.cos(2*Math.PI*frame/60));
        await page.mouse.move(box.x+480+offset,box.y+270);
        await page.waitForTimeout(80);
        await canvas.screenshot({path:resolve(folder,`${String(frame).padStart(3,'0')}.png`)});
      }
      await page.mouse.up();
      if(errors.length)throw Error(errors.join('\n'));
      console.log(`${scenario}: 60 real WebGL frames, 960x540, 12 fps / 5 seconds`);
      await page.close();
    }
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
