import express from 'express';
import {timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import QRCode from 'qrcode';
import whatsapp from 'whatsapp-web.js';
import {Ledger} from './ledger.js';
import {recoverBrowserLocks} from './browser-locks.js';
import {installMessageCompatibility} from './beta-compat.js';

const {Client,LocalAuth}=whatsapp;
const token=process.env.WHATSAPP_GATEWAY_TOKEN||'';
if(token.length<32)throw new Error('Define WHATSAPP_GATEWAY_TOKEN de al menos 32 caracteres');
const ledger=new Ledger('/data');
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'32kb'}));
let client=null,status='disconnected',qr=null,connecting=false,delivering=false,sending=false,watchdog=null;
const businessIntent=/instalac[aá]mara|cotiz.{0,30}(c[aá]mara|cctv|dom[oó]tica)|combo.{0,20}c[aá]mara/i;
function state(){return {status,qr,pending:Object.keys(ledger.data.incoming).length};}
app.get('/health',(_,res)=>res.json({ok:true}));
app.use((req,res,next)=>{const value=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+token);if(value.length!==expected.length||!timingSafeEqual(value,expected))return res.status(401).json({error:'Unauthorized'});next();});
app.get('/status',(_,res)=>res.json(state()));
async function connect(){
  if(connecting||['ready','connecting','qr','authenticated','syncing'].includes(status))return;
  connecting=true;
  try{
    if(client)await client.destroy().catch(()=>{});
    recoverBrowserLocks('/data/auth/session');
    client=new Client({authStrategy:new LocalAuth({dataPath:'/data/auth'}),webVersionCache:{type:'local',path:'/data/webcache'},deviceName:'InstalaCámara',browserName:'Chrome',puppeteer:{headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']}});
    status='connecting';
    client.on('qr',async code=>{qr=await QRCode.toDataURL(code);status='qr'});
    client.on('authenticated',()=>{status='authenticated';qr=null});
    client.on('loading_screen',()=>{if(status!=='ready')status='syncing'});
    client.on('ready',async()=>{clearInterval(watchdog);try{await client.pupPage.evaluate(installMessageCompatibility);status='ready';qr=null}catch{status='error'}});
    client.on('auth_failure',()=>{status='auth_failed';qr=null;clearInterval(watchdog)});
    client.on('disconnected',()=>{status='disconnected';qr=null;clearInterval(watchdog)});
    client.on('message',async message=>{
      try{
        if(message.from.endsWith('@g.us')||message.from==='status@broadcast'||message.fromMe||!message.body||message.body.length>2000)return;
        const contact=await message.getContact();
        let phone=contact.number||message.from.split('@')[0];
        if(message.from.endsWith('@lid'))phone=(await client.getContactLidAndPhone([message.from]))[0]?.pn?.split('@')[0];
        if(!/^[1-9]\d{7,14}$/.test(phone||'')||(!ledger.data.business[phone]&&!businessIntent.test(message.body)))return;
        const id=message.id._serialized||String(message.id);
        if(!id||id.length>200)return;
        ledger.data.incoming[id]={id,phone,name:(contact.pushname||contact.name||'Cliente WhatsApp').slice(0,120),text:message.body};ledger.save();
      }catch{console.warn('incoming_unavailable');}
    });
    const started=Date.now();let probing=false;
    watchdog=setInterval(async()=>{if(probing||status==='ready'||!client?.pupPage)return;probing=true;try{const meta=await client.pupPage.evaluate(()=>({synced:window.require?.('WAWebSocketModel')?.Socket?.hasSynced,bridge:typeof window.WWebJS?.getChats==='function',callback:typeof window.onAppStateHasSyncedEvent==='function'}));if(meta.synced&&!meta.bridge&&meta.callback)await client.pupPage.evaluate(()=>window.onAppStateHasSyncedEvent());if(Date.now()-started>300000){clearInterval(watchdog);status='error';}}catch{clearInterval(watchdog);status='error'}finally{probing=false}},3000);watchdog.unref();
    client.initialize().catch(()=>{status='error';qr=null;clearInterval(watchdog)});
  }finally{connecting=false;}
}
app.post('/connect',async(_,res)=>{ledger.data.enabled=true;ledger.save();await connect();res.json(state());});
app.post('/disconnect',async(_,res)=>{ledger.data.enabled=false;ledger.save();clearInterval(watchdog);if(client)await client.destroy().catch(()=>{});client=null;status='disconnected';qr=null;res.json(state());});
app.post('/send',async(req,res)=>{
  const {id,phone,text}=req.body||{};
  if(typeof id!=='string'||!/^[\w-]{8,80}$/.test(id)||!/^[1-9]\d{7,14}$/.test(phone||'')||typeof text!=='string'||!text.trim()||text.length>6000)return res.status(422).json({error:'Invalid message'});
  const prior=ledger.data.outgoing[id];if(prior)return res.json({status:prior.status==='sending'?'uncertain':prior.status});
  if(status!=='ready'||!ledger.data.enabled||sending)return res.status(503).json({error:'WhatsApp not ready'});
  if(!ledger.data.business[phone])return res.status(403).json({error:'Business opt-in required'});
  sending=true;
  try{
    const recipient=await client.getNumberId(phone);if(!recipient)return res.status(422).json({error:'Recipient unavailable'});
    ledger.begin(id);
    try{await Promise.race([client.sendMessage(recipient._serialized,text),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('timeout')),30000);timer.unref()})]);ledger.finish(id,'sent');}catch{ledger.finish(id,'uncertain');}
    res.json({status:ledger.data.outgoing[id].status});
  }finally{sending=false;}
});
setInterval(async()=>{
  if(delivering||!ledger.data.enabled)return;delivering=true;
  try{const message=Object.values(ledger.data.incoming)[0];if(!message)return;const response=await fetch((process.env.BACKEND_URL||'http://backend:8000')+'/api/internal/whatsapp/incoming',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(message),signal:AbortSignal.timeout(60000)});if(response.ok){const ack=await response.json();if(!ack.ignored)ledger.data.business[message.phone]=true;delete ledger.data.incoming[message.id];ledger.save();}}catch{console.warn('backend_retry');}finally{delivering=false;}
},3000).unref();
app.use((error,req,res,next)=>{console.warn('request_failed');res.status(500).json({error:'Request unavailable'});});
app.listen(3210,'0.0.0.0',()=>console.info('InstalaCam WhatsApp gateway listening'));
if(ledger.data.enabled)void connect();
