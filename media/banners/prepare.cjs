// HyperFrames authoring is isolated from the application's dependencies.
// npm install --prefix .local/media-tools --ignore-scripts hyperframes@0.8.158 gsap@3.14.2
const {mkdirSync,copyFileSync,writeFileSync,readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'../..'), tools=resolve(root,'.local/media-tools');
const all=['functions','recording','casa','apartamento'];
const requested=process.argv.slice(2);
for(const id of requested.length?requested:all){
  if(!all.includes(id))throw Error('Unknown banner composition');
  const folder=resolve(root,'.local/banner-render',id);mkdirSync(resolve(folder,'assets'),{recursive:true});
  copyFileSync(resolve(tools,'node_modules/gsap/dist/gsap.min.js'),resolve(folder,'assets/gsap.min.js'));
  const isModel=['casa','apartamento'].includes(id);
  const source=isModel?resolve(root,`.local/banner-captures/${id}-source.mp4`):resolve(root,id==='functions'?'frontend/public/banner-assets/functions-ai.webp':'frontend/public/images/cctv-diagram.svg');
  copyFileSync(source,resolve(folder,`assets/source.${isModel?'mp4':id==='functions'?'webp':'svg'}`));
  const media=isModel?'<video id="model" class="clip" data-start="0" data-duration="5" data-track-index="0" src="assets/source.mp4" muted playsinline></video>':`<img id="visual" class="clip" data-start="0" data-duration="5" data-track-index="0" src="assets/source.${id==='functions'?'webp':'svg'}" alt=""/>`;
  const overlay=id==='recording'?'<svg id="flow" viewBox="0 0 800 500" aria-hidden="true"><path id="signal" d="M220 250 L320 260 L420 260 L500 230"/><circle id="point" cx="370" cy="265" r="12"/></svg>':'';
  const motion=id==='functions'?`tl.to('#visual',{scale:1.035,duration:2.5,ease:'sine.inOut'},0).to('#visual',{scale:1,duration:2.5,ease:'sine.inOut'},2.5);`:id==='recording'?`tl.fromTo('#signal',{strokeDashoffset:120},{strokeDashoffset:0,duration:5,ease:'none'},0);tl.to('#point',{opacity:0.2,scale:1.3,transformOrigin:'center',duration:1.25,yoyo:true,repeat:3,ease:'sine.inOut'},0);`:'';
  writeFileSync(resolve(folder,'index.html'),`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=1280,height=720"><title>${id} · InstalaCámara</title><script src="assets/gsap.min.js"></script><style>*{box-sizing:border-box}html,body{margin:0;overflow:hidden;background:#101d40}#root{position:relative;width:100%;height:100%;overflow:hidden}.clip{position:absolute;inset:0}img,video{width:100%;height:100%;object-fit:${isModel?'contain':'cover'}}#flow{position:absolute;inset:0;width:100%;height:100%}#signal{fill:none;stroke:#22d3ee;stroke-width:3;stroke-dasharray:12 8}#point{fill:#22d3ee;opacity:1}</style></head><body><div id="root" data-composition-id="main" data-width="1280" data-height="720" data-duration="5" data-fps="24">${media}${overlay}</div><script>const tl=gsap.timeline({paused:true});${motion}window.__timelines=window.__timelines||{};window.__timelines.main=tl;</script></body></html>`);
  writeFileSync(resolve(folder,'hyperframes.json'),JSON.stringify({paths:{assets:'assets'},media:{autoProxy:false}},null,2));
  console.log(`Prepared ${folder}`);
}
