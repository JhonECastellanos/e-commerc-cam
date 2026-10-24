import type { CatalogProduct } from './productCatalog';
export const installationBranches = [
  {id:'cableado',name:'Cableado',icon:'cable',description:'Coaxial o Ethernet: vídeo, grabación y alimentación según el equipo.'},
  {id:'inalambrico',name:'Inalámbrico',icon:'wifi',description:'Wi-Fi y enlaces de radio; requieren cobertura y alimentación verificadas.'},
  {id:'hibrido',name:'Híbrido',icon:'hybrid',description:'Equipos para combinar tecnologías mediante grabadores o enlaces compatibles.'},
  {id:'solar',name:'Solar / PoE',icon:'sun',description:'Dos ramas diferentes: solar autónomo y red/alimentación por Ethernet (PoE).'},
] as const;
export const cameraFunctions = [
  {id:'fixed',name:'Cámaras de vista fija'}, {id:'ptz',name:'Giro y zoom motorizados (PTZ)'},
  {id:'motion',name:'Detección de movimiento'}, {id:'night',name:'Visión nocturna / luz suplementaria'},
  {id:'microphone',name:'Micrófono para registrar audio'}, {id:'two-way',name:'Audio bidireccional'},
  {id:'alarm',name:'Sirena integrada'}, {id:'deterrence-light',name:'Luces de disuasión (variante SX)'}, {id:'alarm-interface',name:'Entradas y salidas para alarmas'},
  {id:'recorder',name:'Grabadores y almacenamiento'}, {id:'accessory',name:'Red y alimentación'},
  {id:'poe',name:'PoE por Ethernet'}, {id:'solar-power',name:'Alimentación solar'},
] as const;
export type InstallationBranch = typeof installationBranches[number]['id'];
export type CameraFunction = typeof cameraFunctions[number]['id'];
// Conservative evidence layer. A family name with optional suffixes is not an exact SKU.
// These official base-variant datasheets do not promise a speaker or siren for every variant.
export const verifiedIPBases = ['IPC-B120HAA','IPC-B140HAA','IPC-T240HAA','IPC-B620HAA','IPC-B420HAA','IPC-B520HAA','IPC-B440HAA','IPC-B540HAA','IPC-B640HAA','IPC-D140HAA','IPC-T220HAA'];
export function equipmentClassification(p: CatalogProduct): {modes:InstallationBranch[];functions:CameraFunction[];note?:string} {
  const specs=p.specs||{}, transmission=String(specs['Tecnologia Transmision']||'');
  if(specs['Clasificacion manual']==='si') {
    const modes=String(specs['Modalidades del catalogo']||'').split(',').filter((m):m is InstallationBranch=>installationBranches.some(b=>b.id===m));
    const functions=String(specs['Funciones del catalogo']||'').split(',').filter((f):f is CameraFunction=>cameraFunctions.some(item=>item.id===f));
    return {modes:[...new Set(modes)],functions:[...new Set(functions)],note:'Clasificación del administrador. Confirmar funciones y compatibilidad en la ficha del modelo exacto.'};
  }
  const model=p.model||'', text=`${p.name} ${p.category} ${specs['Formato Fisico']||''}`;
  const recorder=/DVR|grabador|codificador/i.test(text), ptz=/PTZ/i.test(text);
  const ip=transmission==='IP', knownIP=verifiedIPBases.some(base=>model.startsWith(base));
  const accessory=/fuente|cable coaxial/i.test(text);
  const wired=/Turbo HD/i.test(transmission)||ip||recorder||accessory;
  const functions:CameraFunction[]=[];
  if(accessory)functions.push('accessory'); else if(recorder)functions.push('recorder'); else if(ptz)functions.push('ptz'); else if(wired)functions.push('fixed');
  const sheet=String(specs['Ficha Tecnica']||'');
  if(!recorder&&/IR|ColorVu|DarkFighter|luz híbrida|Hybrid Light/i.test(sheet))functions.push('night');
  if(!recorder&&(!ip&&/micrófono incorporado/i.test(sheet)||knownIP))functions.push('microphone');
  if(knownIP)functions.push('motion','poe');
  if(/^IPC-B6[24]0HAA/.test(model))functions.push('alarm-interface');
  const optionalSX=/^IPC-(T240|D140)HAA/.test(model)&&model.includes('SX');
  if(optionalSX)functions.push('two-way','deterrence-light');
  if(recorder&&/AcuSense/i.test(String(specs['Inteligencia Artificial']||'')))functions.push('motion');
  // Hybrid describes possible system integration, never native Wi-Fi. PoC is not PoE.
  const modes:InstallationBranch[]=wired?['cableado','hibrido']:[];
  if(knownIP)modes.push('solar');
  return {modes,functions,note:optionalSX?'Audio bidireccional y luces Live Guard solo en la variante SX. Confirmar sufijo; no se promete sirena.':ip?'Funciones según variante exacta. Las fichas LU/LUF verificadas no confirman altavoz ni sirena integrados.':wired?'En sistemas híbridos se confirma grabador, resolución y compatibilidad.':undefined};
}
export function classifiedSpecs(p:CatalogProduct) {
  const visible=Object.fromEntries(Object.entries(p.specs||{}).filter(([key])=>!['Clasificacion manual','Modalidades del catalogo','Funciones del catalogo'].includes(key)));
  if(p.specs?.['Tecnologia Transmision']!=='IP')return visible;
  const classification=equipmentClassification(p), verified=classification.functions.includes('poe');
  const optionalSX=classification.functions.includes('two-way');
  return {...visible,
    'Audio Mic':optionalSX?'Micrófono; audio bidireccional solo variante SX':'Micrófono según variante; audio bidireccional por confirmar',
    'Disuasion Activa':optionalSX?'Luces Live Guard solo variante SX; sirena por confirmar':'Sirena / Live Guard: verificar variante exacta',
    'Almacenamiento Interno':'SD según variante; verificar sufijo y ficha',
    'Inteligencia Artificial':verified?'Detección de movimiento 3.0 (personas / vehículos)':'Confirmar capacidades en ficha de variante exacta',
    'Ficha Tecnica':verified?`Cámara IP con conexión Ethernet/PoE, detección de movimiento y micrófono. ${optionalSX?'Audio bidireccional y luces de disuasión solo en SX. ':''}Resolución, almacenamiento y funciones adicionales según variante exacta.`:'Cámara IP. Confirmar alimentación, audio, almacenamiento y análisis de eventos en la ficha de la variante exacta.'
  };
}
