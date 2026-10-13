import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROOMS, type Scenario, type Room, type VirtualDevice, type Configuration } from './domain';

export type PropertyModel = {
  group: THREE.Group; walls: THREE.Group; roof: THREE.Group; doors: THREE.Group[];
  floors: THREE.Mesh[]; labels: THREE.Sprite[]; obstacles: THREE.Box3[];
};
const cache = new Map<string, THREE.MeshStandardMaterial>();
const loader = new THREE.TextureLoader();
const assets = new Map<string, Promise<THREE.Group>>();
let invalidateTextures = new Set<() => void>();
export function watchMaterials(invalidate: () => void) { invalidateTextures.add(invalidate); return () => invalidateTextures.delete(invalidate); }
function texture(path: string, color = true) {
  const map = loader.load(path, () => invalidateTextures.forEach(f => f()));
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.anisotropy = 4;
  return map;
}
const woodMap = texture('/smart-assets/wood-Diffuse.jpg');
const woodNormal = texture('/smart-assets/wood-nor_gl.jpg', false);
const woodRough = texture('/smart-assets/wood-Rough.jpg', false);
const grassMap = texture('/smart-assets/grass-generated.png');
function material(color: string, roughness = .65, surface = '') {
  const key = `${color}:${roughness}:${surface}`;
  if (!cache.has(key)) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: roughness < .3 ? .45 : 0 });
    if (surface === 'wood') { mat.map = woodMap; mat.normalMap = woodNormal; mat.normalScale.set(.22, .22); mat.roughnessMap = woodRough; }
    cache.set(key, mat);
  }
  return cache.get(key)!;
}
const oak = () => material('#e0bd91', .65, 'wood');
const linen = () => material('#e1d8c7', .95);
const cream = () => material('#eee8dc', .87);
const metal = () => material('#282c2d', .3);
function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material = cream(), radius = 0) {
  const geometry = radius ? new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w/4,h/4,d/4)) : new THREE.BoxGeometry(w,h,d);
  const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, x: number, y: number, z: number, r: number, height: number, mat: THREE.Material, top = r) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top,r,height,20),mat); mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function ellipsoid(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,16,12),mat); mesh.position.set(x,y,z); mesh.scale.set(w/2,h/2,d/2); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function loadFurniture(parent: THREE.Object3D, path: string, width: number, angle = 0, fallback?: THREE.Object3D) {
  if (!assets.has(path)) assets.set(path, new GLTFLoader().loadAsync(path).then(g => g.scene));
  assets.get(path)!.then(original => {
    if (parent.userData.disposed) return;
    const model = original.clone(true);
    model.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.geometry = mesh.geometry.clone(); mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone(); if(path.includes('sofa')) { const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; for (const item of mats) { const mat=item as THREE.MeshStandardMaterial; mat.map=null; mat.color.set('#d8cfbc'); mat.roughness=.9; } } mesh.castShadow = mesh.receiveShadow = true; } });
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    model.scale.setScalar(width/Math.max(size.x,size.z)); model.position.set(-center.x * model.scale.x,-bounds.min.y * model.scale.y,-center.z * model.scale.z);
    const pivot = new THREE.Group(); pivot.rotation.y = angle; pivot.add(model); parent.add(pivot);
    if (fallback) { parent.remove(fallback); disposeObject(fallback); }
    invalidateTextures.forEach(f => f());
  }).catch(() => { /* La geometría local permanece visible si el recurso no está disponible. */ });
}
function plant(parent: THREE.Object3D, x: number, z: number, size = .7) {
  const root = new THREE.Group(); root.position.set(x,0,z); parent.add(root);
  const fallback = new THREE.Group(); root.add(fallback);
  cylinder(fallback,0,.22,0,.22,.43,material('#b39a7b'),.29);
  for (let i=0;i<9;i++) { const a=i*2.4; const leaf = ellipsoid(fallback,Math.cos(a)*.2,.65+i%3*.1,Math.sin(a)*.2,.22,.9,.075,material('#4f6741')); leaf.rotation.z=Math.cos(a)*.5; leaf.rotation.y=a; }
  root.scale.setScalar(size);
  loadFurniture(root,'/smart-assets/potted_plant_04/model.gltf',1.05,0,fallback);
}
function rug(parent: THREE.Object3D,x: number,z: number,w: number,d: number) {
  box(parent,x,.04,z,w,.025,d,material('#b9ad97',1),.012);
  for(let i=0;i<18;i++) box(parent,x-w*.46+i*w*.92/17,.055,z,.012,.003,d*.92,material(i%2?'#cfc2aa':'#a49984',1));
}
function foldedCloth(parent: THREE.Object3D, width: number, depth: number, y: number, z: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, 32, 36);
  const p = geometry.attributes.position;
  for (let i=0;i<p.count;i++) {
    const x=p.getX(i), v=p.getY(i);
    const drop = Math.max(0,Math.abs(x)-width*.4)*.7;
    p.setZ(i,Math.sin(x*19+v*5)*.011+Math.cos(v*18+x*8)*.012-drop);
  }
  geometry.computeVertexNormals();
  const mat = linen().clone(); mat.side=THREE.DoubleSide;
  const cloth = new THREE.Mesh(geometry, mat); cloth.rotation.x=-Math.PI/2; cloth.position.set(0,y,z);
  cloth.castShadow=cloth.receiveShadow=true; parent.add(cloth);
}
function chair(parent: THREE.Object3D,x: number,z: number,angle: number) {
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=angle; parent.add(g);
  box(g,0,.47,0,.48,.12,.48,linen(),.045);
  box(g,0,.77,.23,.52,.58,.075,oak(),.03);
  for(const dx of [-.19,.19]) for(const dz of [-.19,.19]) box(g,dx,.23,dz,.035,.46,.035,metal());
}
function vase(parent: THREE.Object3D,x: number,y: number,z: number) {
  cylinder(parent,x,y,z,.09,.22,cream(),.065);
  for(let i=0;i<3;i++) { const stem=cylinder(parent,x+i*.025,y+.19,z,.006,.25,material('#718057')); stem.rotation.z=(i-1)*.22; ellipsoid(parent,x+(i-1)*.05,y+.32,z,.13,.07,.09,material('#789068')); }
}
function furnishings(group: THREE.Group,room: Room) {
  const root=new THREE.Group(); root.position.set(room.x,0,room.z); group.add(root);
  const w=room.w,d=room.d;
  if(room.use==='living') {
    rug(root,0,0,w*.7,d*.62);
    const sofa=new THREE.Group(); sofa.position.set(w*.29,0,0); root.add(sofa);
    const fallback=new THREE.Group(); fallback.rotation.y=Math.PI; sofa.add(fallback);
    box(fallback,0,.42,0,1,.55,2.7,linen(),.13); box(fallback,-.4,.75,0,.22,.7,2.7,linen(),.08);
    for(const dz of [-.8,0,.8]) { box(fallback,.05,.72,dz,.8,.16,.77,linen(),.07); const pillow=box(fallback,-.22,1,dz,.22,.48,.52,material(dz?'#a89a7b':'#67745b'),.1); pillow.rotation.z=.18; }
    loadFurniture(sofa,'/smart-assets/sofa_02/model.gltf',2.8,-Math.PI/2,fallback);
    cylinder(root,0,.43,0,.66,.09,material('#d3c2a5'),.66); cylinder(root,0,.21,0,.14,.4,metal());
    vase(root,.12,.59,0); box(root,-.22,.51,.13,.25,.02,.35,material('#ddd9cd'));
    box(root,-w*.4,.32,0,.42,.56,2.7,oak(),.025);
    for(const dz of [-.8,0,.8]) box(root,-w*.36,.32,dz,.012,.43,.008,metal());
    plant(root,-w*.35,-d*.34,.9); plant(root,w*.35,d*.34,.7);
    cylinder(root,-w*.32,.8,d*.34,.02,1.6,metal()); cylinder(root,-w*.32,1.67,d*.34,.24,.32,linen(),.18);
  } else if(room.use==='bedroom') {
    const bw=Math.min(1.75,w*.62), bd=Math.min(2.25,d*.65);
    rug(root,0,.1,Math.min(w*.85,bw+1),Math.min(d*.85,bd+.65));
    box(root,0,.25,0,bw+.1,.4,bd+.08,oak(),.05); box(root,0,.53,0,bw,.26,bd,linen(),.095);
    foldedCloth(root,bw+.14,bd*.78,.73,.2);
    foldedCloth(root,bw+.1,.42,.765,bd*.3);
    for(const side of [-1,1]) { const pillow=box(root,side*bw*.24,.74,-bd*.29,bw*.44,.2,.47,cream(),.095); pillow.rotation.y=side*.05; }
    box(root,0,.83,-bd*.5,bw+.2,1.3,.12,oak(),.04);
    for(let i=0;i<10;i++) box(root,-bw*.48+i*bw*.96/9,1.16,-bd*.57,.065,1.35,.028,oak(),.012);
    for(const side of [-1,1]) { const x=side*(bw/2+.32); if(Math.abs(x)<w/2-.1) {box(root,x,.3,-bd*.32,.46,.55,.47,oak(),.02); cylinder(root,x,.66,-bd*.32,.09,.14,metal()); cylinder(root,x,.83,-bd*.32,.16,.21,linen(),.12);} }
    plant(root,-w*.34,d*.32,.7);
    if(w>4) { box(root,-w*.38,1.15,0,.5,2.3,Math.min(d*.45,2),oak(),.03); for(let i=-2;i<=2;i++) box(root,-w*.29,1.15,i*.36,.015,2.15,.012,metal()); }
  } else if(room.use==='kitchen') {
    const count=Math.max(3,Math.floor((w-1)/.7)), step=(w-1)/count, z=-d*.37;
    for(let i=0;i<count;i++) {const x=-w*.4+step/2+i*step; box(root,x,.49,z,step-.018,.94,.66,material('#baa98d'),.012); box(root,x,1,z,step,.065,.73,material('#ede5d6'),.014); box(root,x,.72,z+.34,.23,.018,.025,metal(),.006); box(root,x,1.95,z-.15,step-.018,.7,.36,oak(),.012);}
    box(root,-w*.4+step*1.5,1.04,z,.55,.025,.52,metal(),.02);
    for(const dx of [-.13,.13]) for(const dz of [-.13,.13]) cylinder(root,-w*.4+step*1.5+dx,1.061,z+dz,.08,.009,material('#777778',.24));
    box(root,-w*.4+step*1.5,.5,z+.36,.55,.4,.025,metal(),.01); box(root,-w*.4+step*1.5,.73,z+.4,.46,.025,.025,material('#a7aca8',.15));
    const sinkx=-w*.4+step*.5; box(root,sinkx,1.037,z,.42,.01,.38,material('#7d898a',.15),.06); cylinder(root,sinkx,1.16,z-.13,.018,.26,material('#a0a6a3',.15));
    box(root,w*.36,1.08,z+.2,.76,2.12,.73,material('#a1a4a0',.22),.055); box(root,w*.36,1.33,z+.58,.68,.018,.012,metal());
    const tz=d*.2; cylinder(root,0,.83,tz,.77,.09,oak()); cylinder(root,0,.41,tz,.12,.8,metal());
    for(const a of [0,Math.PI*.67,Math.PI*1.33]) chair(root,Math.sin(a)*1.07,tz+Math.cos(a)*1.07,a);
    vase(root,0,1,tz); plant(root,w*.35,d*.34,.6);
  } else if(room.use==='bathroom') {
    box(root,-w*.29,.52,-d*.25,.68,.9,.55,oak(),.02); ellipsoid(root,-w*.29,1,-d*.25,.6,.14,.45,cream());
    cylinder(root,-w*.29,1.11,-d*.37,.012,.23,material('#bbbcb8',.15));
    box(root,-w*.3,1.68,-d*.45,.73,.8,.025,material('#aabcc0',.12),.04);
    const x=w*.26,z=d*.26; ellipsoid(root,x,.38,z,.45,.56,.58,cream()); ellipsoid(root,x,.62,z,.47,.05,.6,cream()); box(root,x,.72,z+.25,.42,.58,.16,cream(),.04);
    if(d>2.5) {box(root,w*.2,.09,-d*.27,.95,.13,1,material('#ccc4b5'),.025); const glass=new THREE.MeshPhysicalMaterial({color:'#c8d9d6',transparent:true,opacity:.24,roughness:.1,metalness:0,depthWrite:false,side:THREE.DoubleSide}); box(root,w*.2,1.12,-d*.04,.9,2.15,.012,glass); cylinder(root,w*.42,1.55,-d*.4,.014,1.6,material('#969e9b',.2));}
    vase(root,-w*.32,1.14,-d*.2);
  } else if(room.use==='study') {
    box(root,0,.79,-d*.28,Math.min(1.8,w*.65),.09,.7,oak(),.02); for(const x of [-.65,.65]) box(root,x,.4,-d*.28,.035,.8,.58,metal());
    box(root,0,1.16,-d*.3,.75,.46,.055,metal(),.02); box(root,0,.96,-d*.3,.15,.14,.1,metal()); chair(root,0,.25,Math.PI); plant(root,w*.34,d*.33,.65);
    box(root,w*.38,1.14,-d*.1,.38,2.25,1.4,oak(),.015); for(const y of [.4,.8,1.2,1.6,2]) box(root,w*.37,y,-d*.1,.44,.025,1.42,oak());
  } else if(room.use==='closet') {
    const n=Math.floor(w/.9); for(let i=0;i<n;i++) {box(root,-w*.4+i*.9,1.1,-d*.21,.85,2.18,.45,oak(),.025); box(root,-w*.4+i*.9,1,-d*.21+.24,.013,.18,.025,metal());}
  } else if(room.use==='garden') {
    const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(.025,.11,3), material('#687946',1), 1300);
    const pose = new THREE.Object3D();
    for(let i=0;i<1300;i++) {
      const x=(Math.sin(i*73.17)*43758.5453%1)*w*.48, z=(Math.sin(i*29.91)*17345.17%1)*d*.48;
      pose.position.set(Math.abs(x)<.75 ? x+1.5 : x,.085,z); pose.rotation.y=i*2.4; pose.scale.set(1,.6+(i%7)*.1,1);pose.updateMatrix();blades.setMatrixAt(i,pose.matrix);
    }
    blades.receiveShadow=true;root.add(blades);
    for(let i=0;i<6;i++) box(root,0,.04,-d*.43+i*d*.16,1.25,.075,.75,material('#c7bda8'),.02);
    for(const x of [-w*.42,w*.42]) { box(root,x,.13,0,1.25,.2,d*.78,material('#716d59')); for(const z of [-d*.32,0,d*.32]) plant(root,x,z,.8); }
    for(const x of [-w/2,w/2]) box(root,x,.52,0,.15,1.08,d,cream());
    for(const x of [-w*.32,w*.32]) box(root,x,.65,d/2,.2,1.32,.24,cream());
    for(let i=0;i<13;i++) box(root,0,.4+i*.065,d/2,w*.62,.028,.055,metal());
  } else if(room.use==='patio') {
    rug(root,-2,0,4,3.2); cylinder(root,-2,.78,0,.8,.08,oak()); cylinder(root,-2,.38,0,.09,.75,metal());
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]) chair(root,-2+Math.sin(a)*1.1,Math.cos(a)*1.1,a);
    vase(root,-2,.95,0); for(const x of [-w*.42,w*.42]) {plant(root,x,-d*.33,1); plant(root,x,d*.33,.8);}
    for(const x of [-w*.46,w*.46]) for(const z of [-d*.4,d*.4]) box(root,x,1.4,z,.12,2.8,.12,oak());
    for(let i=0;i<8;i++) box(root,-w*.43+i*w*.86/7,2.84,0,.09,.12,d*.87,oak());
    box(root,3,.52,-1,1.4,1,.65,metal(),.06); box(root,3,1.08,-1,1.44,.12,.7,material('#9b9e96',.22),.04);
  } else if(room.use==='hall') {
    rug(root,0,0,w*.65,Math.min(d*.7,3.8));
    if(d>5) {box(root,-w*.48,.65,-.5,.035,1.3,1.12,oak()); box(root,-w*.3,.65,-1.05,.45,1.3,.035,oak()); for(const y of [.05,.88,1.35]) box(root,-w*.35,y,-.5,.5,.035,1.1,oak());}
  }
}

export function buildProperty(scenario: Scenario): PropertyModel {
  const group=new THREE.Group(),walls=new THREE.Group(),roof=new THREE.Group(); group.add(walls,roof);
  const floors:THREE.Mesh[]=[],doors:THREE.Group[]=[],obstacles:THREE.Box3[]=[];
  box(group,0,-.26,0,14.2,.44,scenario==='casa'?24.6:12.5,material('#707b7a'),.06);
  const rooms=ROOMS[scenario],inside=rooms.filter(r=>!r.outdoor);
  for(const room of rooms) {
    const mat=room.use==='garden'?material('#bac7a7',1):room.use==='bathroom'?material('#c6c0b1',.8):oak();
    if(room.use==='garden')mat.map=grassMap;
    const floor=box(group,room.x,-.035,room.z,room.w,.13,room.d,mat);
    const uv=floor.geometry.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*room.w/2.8,uv.getY(i)*room.d/2.8); uv.needsUpdate=true;
    floor.userData.roomId=room.id; floors.push(floor); furnishings(group,room);
  }
  // Particiones compartidas únicas: evita paredes superpuestas del plano por habitación.
  const xs=[...new Set(inside.flatMap(r=>[r.x-r.w/2,r.x+r.w/2]).map(x=>+x.toFixed(3)))].sort((a,b)=>a-b);
  const zs=[...new Set(inside.flatMap(r=>[r.z-r.d/2,r.z+r.d/2]).map(z=>+z.toFixed(3)))].sort((a,b)=>a-b);
  const at=(x:number,z:number)=>inside.find(r=>x>r.x-r.w/2&&x<r.x+r.w/2&&z>r.z-r.d/2&&z<r.z+r.d/2);
  function wall(x:number,z:number,len:number,alongX:boolean,a?:Room,b?:Room) {
    const exterior=!a||!b, room=a||b!;
    const g=new THREE.Group(); g.position.set(x,0,z); if(!alongX)g.rotation.y=Math.PI/2;
    g.userData.cutaway=exterior ? (x>6||z>5.7 ? .3:1):.78; walls.add(g);
    const door= !exterior || room.use==='hall'; const opening=Math.min(door? .92:2.6,len-.25);
    const h=2.7;
    if(opening<.55) { const solid=box(g,0,h/2,0,len,h,.15); obstacles.push(new THREE.Box3().setFromObject(solid)); return; }
    const side=(len-opening)/2;
    for(const s of [-1,1]) { const solid=box(g,s*(opening+side)/2,h/2,0,side,h,.15); obstacles.push(new THREE.Box3().setFromObject(solid)); box(g,s*(opening+side)/2,.09,.1,side,.16,.035,cream()); }
    box(g,0,2.54,0,opening,.32,.15);
    if(door) {
      const hinge=new THREE.Group(); hinge.position.x=-opening/2; hinge.userData.targetAngle=0; g.add(hinge); doors.push(hinge);
      box(hinge,opening/2,1.16,0,opening-.04,2.3,.06,oak(),.01); cylinder(hinge,opening-.16,1.15,.06,.025,.15,metal()).rotation.z=Math.PI/2;
      for(const s of [-1,1])box(g,s*(opening/2+.035),1.2,0,.055,2.4,.19,oak());
    } else {
      box(g,0,.24,0,opening,.48,.15);
      const glass=new THREE.MeshPhysicalMaterial({color:'#b6cdd3',roughness:.08,metalness:.1,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
      box(g,0,1.43,0,opening,1.9,.02,glass);
      for(const y of [.47,2.4])box(g,0,y,0,opening+.05,.055,.12,metal());
      for(const p of [-opening/2,0,opening/2])box(g,p,1.43,0,.045,1.98,.12,metal());
      // Cortinas plisadas de geometría real, no planos de color.
      for(const side of [-1,1]) {
        const geometry = new THREE.PlaneGeometry(.55,2.06,20,1);
        const p=geometry.attributes.position; for(let i=0;i<p.count;i++)p.setZ(i,Math.cos(p.getX(i)*70)*.035);
        geometry.computeVertexNormals(); const mat=linen().clone();mat.side=THREE.DoubleSide;
        const curtain=new THREE.Mesh(geometry,mat);curtain.position.set(side*(opening/2-.2),1.47,.19);curtain.castShadow=curtain.receiveShadow=true;g.add(curtain);
      }
      cylinder(g,0,2.57,.14,.02,opening+.5,metal()).rotation.z=Math.PI/2;
    }
  }
  for(const z of zs) {
    let start=0, lastKey='',lastA:Room|undefined,lastB:Room|undefined;
    for(let i=0;i<xs.length;i++) {
      const a=i<xs.length-1?at((xs[i]+xs[i+1])/2,z-.01):undefined,b=i<xs.length-1?at((xs[i]+xs[i+1])/2,z+.01):undefined;
      const key=a!==b&&(a||b)?`${a?.id}|${b?.id}`:'';
      if(key!==lastKey) {if(lastKey)wall((start+xs[i])/2,z,xs[i]-start,true,lastA,lastB); start=xs[i]; lastKey=key;lastA=a;lastB=b;}
    }
  }
  for(const x of xs) {
    let start=0,lastKey='',lastA:Room|undefined,lastB:Room|undefined;
    for(let i=0;i<zs.length;i++) {
      const a=i<zs.length-1?at(x-.01,(zs[i]+zs[i+1])/2):undefined,b=i<zs.length-1?at(x+.01,(zs[i]+zs[i+1])/2):undefined;
      const key=a!==b&&(a||b)?`${a?.id}|${b?.id}`:'';
      if(key!==lastKey) {if(lastKey)wall(x,(start+zs[i])/2,zs[i]-start,false,lastA,lastB);start=zs[i];lastKey=key;lastA=a;lastB=b;}
    }
  }
  box(roof,0,2.92,0,14.1,.22,12.3,material('#d7d3c8'),.03);
  return {group,walls,roof,doors,floors,labels:[],obstacles};
}
function screenTexture(device:VirtualDevice,config?:Configuration) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#142d32';ctx.fillRect(0,0,512,320);
  if(device.on){
    ctx.fillStyle='#e6d6b5';ctx.font='600 25px system-ui';ctx.fillText(device.kind==='television'?'TU HOGAR, CONECTADO':'Bienvenido a casa',28,48);
    ctx.fillStyle='#87ccb7';ctx.font='19px system-ui';ctx.fillText('Servidor local · Escenario virtual',28,86);
    const lights=config?.devices.filter(d=>d.kind==='light'&&d.on).length||0;
    ctx.fillStyle='#edf1e7';ctx.font='22px system-ui';ctx.fillText(`${lights} luces encendidas`,28,152);
    ctx.fillText(config?.devices.some(d=>d.kind==='television'&&d.on)?'TV encendida':'TV en espera',28,199);
    ctx.font='17px system-ui';ctx.fillStyle='#c3d5ca';ctx.fillText('¿Qué te gustaría hacer hoy?',28,262);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}
export function buildDevice(device:VirtualDevice,illuminate=true,config?:Configuration):THREE.Group {
  const g=new THREE.Group(),dark=metal();
  const active=new THREE.MeshStandardMaterial({color:device.on?'#e7d2a4':'#a8a797',emissive:device.on?'#ffc766':'#000000',emissiveIntensity:device.on?2.5:0,roughness:.45});
  if(['cctv','ip-camera'].includes(device.kind)) {
    cylinder(g,0,0,0,.14,.12,cream()); ellipsoid(g,0,-.07,.03,.23,.18,.24,dark); const lens=cylinder(g,0,-.08,.15,.045,.025,dark);lens.rotation.x=Math.PI/2;box(g,0,.05,-.08,.08,.15,.18,cream(),.025);
  } else if(device.kind==='light') {
    cylinder(g,0,.12,0,.07,.12,dark); cylinder(g,0,0,0,.19,.17,linen(),.12); ellipsoid(g,0,-.1,0,.29,.06,.29,active);

    if(device.on&&illuminate){const light=new THREE.PointLight('#ffce8c',16,7,2);light.position.y=-.17;g.add(light);}
  } else if(device.kind==='television'||device.kind==='touchscreen') {
    const tv=device.kind==='television',w=tv?2.1:.53,h=tv?1.18:.37;
    box(g,0,0,0,w+.07,h+.07,.08,dark,.025);
    const panel=new THREE.MeshBasicMaterial({map:screenTexture(device,config),color:device.on?'#ffffff':'#151b1e'});box(g,0,0,.045,w,h,.008,panel);
    if(tv){const glow=new THREE.PointLight('#80b8d0',device.on?7:0,3.5);glow.position.z=.2;g.add(glow);}
  } else if(device.kind==='server'||device.kind==='network'||device.kind==='rack') {
    const server=device.kind!=='network';box(g,0,0,0,server?.3:.34,server?.62:.07,.28,dark,.018);
    for(let i=0;i<8;i++)box(g,0,server?-.19+i*.05:0,.15,.24,.013,.008,material('#717978',.25));
    const led=new THREE.MeshBasicMaterial({color:device.on?'#63c5ac':'#61686a'});for(let i=0;i<3;i++)ellipsoid(g,-.08+i*.04,server?.22:.015,.152,.018,.018,.012,led);
  } else if(device.kind==='speaker'||device.kind==='microphone') {
    cylinder(g,0,0,0,device.kind==='speaker'?.105:.045,device.kind==='speaker'?.3:.045,dark);
    for(let i=0;i<6;i++) {const ring=new THREE.Mesh(new THREE.TorusGeometry(device.kind==='speaker'?.105:.045,.003,4,20),material('#666d6c'));ring.rotation.x=Math.PI/2;ring.position.y=-.1+i*.04;g.add(ring);}
  } else { box(g,0,0,0,.16,.22,.04,cream(),.025);ellipsoid(g,0,0,.03,.08,.1,.035,material('#aebcc0',.3)); }
  g.position.set(device.x,device.y,device.z);g.rotation.y=THREE.MathUtils.degToRad(device.rotation);g.traverse(o=>{o.userData.deviceId=device.id;});return g;
}
export function coverageMesh(d:VirtualDevice) {
  const mesh=new THREE.Mesh(new THREE.RingGeometry(.25,.3,40),new THREE.MeshBasicMaterial({color:'#d9b779',transparent:true,opacity:.75,side:THREE.DoubleSide,depthTest:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(d.x,.08,d.z);return mesh;
}
export function disposeObject(object:THREE.Object3D) {
  object.userData.disposed=true;
  object.traverse(o=>{o.userData.disposed=true;const mesh=o as THREE.Mesh;mesh.geometry?.dispose();const mats=Array.isArray(mesh.material)?mesh.material:mesh.material?[mesh.material]:[];for(const m of mats)if(![...cache.values()].includes(m as THREE.MeshStandardMaterial)){const map=(m as THREE.MeshBasicMaterial).map;if(map instanceof THREE.CanvasTexture)map.dispose();m.dispose();}});
}
