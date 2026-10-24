import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { applyAction, interpretCommand, parseConfiguration, ROOMS, type Configuration, type Scenario } from '../../smart-home/domain';
import { demonstrateMotion, homePreset, loadShowcase, pointDescriptions } from '../../smart-home/showcase';
import { speakHome, startHomeDictation } from '../../smart-home/voice';
import type { ViewMode, ViewportHandle } from '../../smart-home/SceneViewport';
import type { StoreyView } from '../../smart-home/architecture';
import '../../smart-home/smart-home.css';
const SceneViewport = lazy(() => import('../../smart-home/SceneViewport'));
export default function SmartHomeLab() {
  const { scenario: value } = useParams();
  const scenario: Scenario = value === 'apartamento' ? 'apartamento' : 'casa';
  return <Showcase key={scenario} scenario={scenario} />;
}
function Showcase({ scenario }: { scenario: Scenario }) {
  const [config,setConfig]=useState<Configuration>(()=>{
    try { if(new URLSearchParams(location.search).has('revision')) {const raw=sessionStorage.getItem('instalacam:review-design');if(raw){const saved=parseConfiguration(JSON.parse(raw));if(saved.scenario===scenario)return saved;}} } catch { /* El diseño público conserva su distribución inicial. */ }
    return loadShowcase(scenario);
  });
  const [view,setView]=useState<ViewMode>('isometrica'),[roof,setRoof]=useState(false),[daylight,setDaylight]=useState(true);
  const [storey,setStorey]=useState<StoreyView>('all');
  const [selected,setSelected]=useState<string>(),[tab,setTab]=useState('experiencia'),[command,setCommand]=useState('');
  const [message,setMessage]=useState('Explora el hogar y prueba sus escenas.'),[busy,setBusy]=useState(false);
  const [onlineVoice,setOnlineVoice]=useState(false),[listening,setListening]=useState(false),[voiceReplies,setVoiceReplies]=useState(false),[gemini,setGemini]=useState(false);
  const [history,setHistory]=useState([{who:'Tu hogar',text:'Bienvenido. ¿Qué te gustaría hacer hoy? Puedes decir «Enciende las luces de la cocina» o «Enciende el televisor de la sala».'}]);
  const stage=useRef<ViewportHandle>(null),root=useRef<HTMLDivElement>(null),stopDictation=useRef<()=>void>();
  const navigate=useNavigate(),rooms=ROOMS[scenario],point=config.devices.find(d=>d.id===selected);
  const lights=config.devices.filter(d=>d.kind==='light'&&d.on),tv=config.devices.find(d=>d.kind==='television');
  useEffect(()=>()=>{stopDictation.current?.();if('speechSynthesis' in window)speechSynthesis.cancel();},[]);
  function reply(text:string,who='Tu hogar') {
    setHistory(h=>[...h.slice(-15),{who,text}]);setMessage(text);
    if(voiceReplies&&!speakHome(text))setMessage(text+' La voz del sistema no está disponible; la respuesta se muestra aquí.');
  }
  function preset(value:'welcome'|'cinema'|'night'|'off') {
    setConfig(c=>homePreset(c,value));if(value==='night'||value==='cinema')setDaylight(false);
    reply(value==='welcome'?'Bienvenido a casa. Encendí la iluminación de las zonas comunes. ¿Qué te gustaría hacer hoy?':value==='cinema'?'El televisor está encendido. Dejé luz de paso en el pasillo.':value==='night'?'La iluminación de acceso y paso está encendida. Cámaras y servidor permanecen activos.':'Apagué las luces y el televisor. El servidor y los puntos de seguridad permanecen activos.');
  }
  function toggle(id:string) {const device=config.devices.find(d=>d.id===id);if(!device)return;setConfig(c=>applyAction(c,{ids:[id],on:!device.on}));reply(`${device.on?'Apagué':'Encendí'} ${device.name.toLowerCase()} en ${rooms.find(r=>r.id===device.room)?.name}.`);}
  async function runCommand(text:string) {
    if(!text.trim()||busy)return;setBusy(true);setCommand('');
    setHistory(h=>[...h.slice(-15),{who:'Tú',text:text.trim()}]);
    try {
      if(/estado|como esta|cómo está|informe|que hay|qué hay/i.test(text)){reply(`Hay ${lights.length} luces encendidas. El televisor está ${tv?.on?'encendido':'apagado'}. El servidor local y los puntos de acceso están activos en esta demostración.`);return;}
      if(/hola|buenos dias|buenos días|que hacemos|qué hacemos/i.test(text)){reply('Bienvenido a casa. ¿Quieres encender la iluminación, ver televisión o revisar el estado del hogar?');return;}
      if(/servidor|camara|cámara|microfono|micrófono/i.test(text)){reply('Los puntos de seguridad y el servidor tienen ubicaciones fijas en esta presentación. Prueba una orden de iluminación o televisión.');return;}
      let result=interpretCommand(text,config);
      if(!result.action&&gemini){const response=await api.interpretSimulation({message:text,scenario,devices:config.devices.map(d=>({id:d.id,kind:d.kind,room:d.room})),consent:true});result={reply:response.reply,action:response.action||undefined};}
      if(result.action){const action=result.action;const allowed=config.devices.filter(d=>['light','television','touchscreen','speaker'].includes(d.kind)).map(d=>d.id);if(!action.ids.every(id=>allowed.includes(id)))throw Error('Esta presentación permite iluminación, televisión, pantallas y audio.');setConfig(c=>applyAction(c,action));}
      reply(result.reply);
    } catch(e){reply((e as Error).message);}finally{setBusy(false);}
  }
  function microphone() {
    if(listening){stopDictation.current?.();setListening(false);return;}
    setListening(true);stopDictation.current=startHomeDictation(onlineVoice,text=>void runCommand(text),setMessage,()=>setListening(false));
  }
  function motion() {setConfig(c=>demonstrateMotion(c));setDaylight(false);reply('Movimiento simulado en el acceso: encendí su iluminación y registré el aviso en la pantalla del hogar.');}
  function gesture() {setConfig(c=>homePreset(c,'welcome'));reply('Gesto simulado de bienvenida: encendí las luces de las zonas comunes. En una instalación física, el análisis visual del servidor puede generar este evento.');}
  function save(){try{localStorage.setItem(`instalacam:showcase:v2:${scenario}`,JSON.stringify(parseConfiguration(config)));setMessage('Escena guardada en este navegador.');}catch{setMessage('Este navegador no permite guardar la escena.');}}
  function share(){try{sessionStorage.setItem('instalacam:advisory-design',JSON.stringify(parseConfiguration(config)));navigate('/asesoria');}catch{setMessage('No fue posible adjuntar la escena en este navegador.');}}
  async function fullscreen(){if(document.fullscreenElement)await document.exitFullscreen();else await root.current?.requestFullscreen?.().catch(()=>setMessage('El navegador mantiene el escenario dentro de esta página.'));}
  const movement=(direction:string,label:string)=><button aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);stage.current?.move(direction,true);}} onPointerUp={()=>stage.current?.move(direction,false)} onPointerCancel={()=>stage.current?.move(direction,false)}>{label}</button>;
  return <div className="smart-lab smart-showcase" ref={root}>
    <header className="lab-header"><div><Link to="/" className="lab-brand">InstalaCámara <span>· Vive un hogar inteligente</span></Link><h1>{scenario==='casa'?'Casa inteligente':'Apartamento inteligente'}</h1></div><div className="lab-header-actions"><Link to={`/simulador/${scenario==='casa'?'apartamento':'casa'}`}>{scenario==='casa'?'Ver apartamento':'Ver casa'}</Link><button onClick={fullscreen}>Pantalla completa</button><Link to="/" aria-label="Cerrar laboratorio">Cerrar ×</Link></div></header>
    <main className="lab-body"><div className="lab-world">
      <div className="lab-toolbar"><div role="group" aria-label="Vistas">{(['isometrica','superior','recorrido'] as ViewMode[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);setRoof(false);}}>{v==='isometrica'?'Isométrica':v==='superior'?'Superior':'Primera persona'}</button>)}</div><div><button onClick={()=>setDaylight(!daylight)}>{daylight?'Ver de noche':'Ver de día'}</button><button onClick={()=>setRoof(!roof)}>{roof?'Ocultar techo':'Mostrar techo'}</button><button onClick={()=>stage.current?.reset()}>Centrar vista</button></div></div>
      {scenario==='casa'&&<div className="lab-toolbar" role="group" aria-label="Niveles de la casa">{(['all','ground','upper'] as StoreyView[]).map(level=><button key={level} aria-pressed={storey===level} onClick={()=>{setStorey(level);setRoof(false);}}>{level==='all'?'Casa completa':level==='ground'?'Planta baja':'Planta alta'}</button>)}</div>}
      <Suspense fallback={<div className="scene-loading">Preparando el interior y sus materiales…</div>}><SceneViewport ref={stage} config={config} view={view} roof={roof} daylight={daylight} storey={storey} selected={selected} coverage={false} onSelect={id=>{setSelected(id);if(config.devices.find(d=>d.id===id)?.kind==='server')setTab('servidor');}} onError={setMessage}/></Suspense>
      <div className="world-caption"><span>{view==='recorrido'?'Arrastra para mirar · Flechas o WASD para recorrer':'Arrastra para rotar · Pellizca para ampliar · Toca un punto inteligente'}</span><span>Distribución demostrativa · Dispositivos virtuales</span></div>
      {view==='recorrido'&&<div className="walk-pad" aria-label="Controles táctiles de recorrido">{movement('turnLeft','Girar ←')}{movement('forward','Avanzar ↑')}{movement('turnRight','Girar →')}{movement('left','Izquierda')}{movement('back','Atrás ↓')}{movement('right','Derecha')}</div>}
      <div className="room-strip" aria-label="Recorrer habitaciones">{rooms.map(r=><button key={r.id} onClick={()=>{setStorey('all');stage.current?.goToRoom(r.id);}}>{r.name}</button>)}</div>
    </div><aside className="lab-panel"><div className="lab-tabs" role="tablist" aria-label="Experiencia del hogar">{[['experiencia','Tu hogar'],['asistente','Asistente'],['servidor','Servidor local']].map(([id,title])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{title}</button>)}</div><div className="panel-content">
      {tab==='experiencia'&&<><p className="showcase-eyebrow">Tecnología que acompaña tu día</p><h2>Un hogar que responde</h2><p className="muted">Iluminación, entretenimiento y seguridad coordinados desde un servidor dentro de la vivienda.</p><div className="home-scenes"><button onClick={()=>preset('welcome')}>Llegar a casa<span>Iluminación de bienvenida</span></button><button onClick={()=>preset('cinema')}>Ver televisión<span>TV y luz de paso</span></button><button onClick={()=>preset('night')}>Noche segura<span>Acceso y pasillo iluminados</span></button><button onClick={()=>preset('off')}>Apagar luces y TV<span>Seguridad y servidor activos</span></button></div>
        <div className="home-dashboard" aria-label="Estado del hogar"><span><b>{lights.length}</b> luces encendidas</span><span><b>{tv?.on?'Encendida':'Apagada'}</b> televisión</span><span><b>Local</b> procesamiento propuesto</span></div>
        <h2>Iluminación y televisión</h2><div className="home-switches">{config.devices.filter(d=>d.kind==='television'||d.kind==='light'&&['sala','cocina'].includes(d.room)).map(d=><button key={d.id} aria-pressed={d.on} onClick={()=>toggle(d.id)}><span>{d.kind==='television'?'TV de la sala':`Luz de ${rooms.find(r=>r.id===d.room)?.name.toLowerCase()}`}</span><b>{d.on?'Encendida':'Apagada'}</b></button>)}</div>
        <details className="strategic-points"><summary>Puntos inteligentes del hogar</summary><p className="muted">Selecciona un punto para conocer su propósito y su ubicación.</p>{config.devices.filter(d=>!['light','television'].includes(d.kind)).map(d=><button key={d.id} onClick={()=>{setSelected(d.id);stage.current?.goToRoom(d.room);}}>{d.name}<small>{rooms.find(r=>r.id===d.room)?.name}</small></button>)}</details>
        {point&&<div className="point-card"><h3>{point.name} · {rooms.find(r=>r.id===point.room)?.name}</h3><p>{pointDescriptions[point.kind]}</p>{['light','television','touchscreen'].includes(point.kind)&&<button onClick={()=>toggle(point.id)}>{point.on?'Apagar':'Encender'} {point.name.toLowerCase()}</button>}</div>}
        <button className="lab-primary" onClick={()=>setTab('asistente')}>Hablar con mi hogar</button><div className="project-actions"><button onClick={save}>Guardar escena</button><button onClick={()=>{setConfig(loadShowcase(scenario));setMessage('Escena restaurada.');}}>Restaurar escena</button></div><button className="lab-primary" onClick={share}>Solicitar asesoría para mi hogar</button>
      </>}
      {tab==='asistente'&&<><p className="showcase-eyebrow">Tu hogar, en tus palabras</p><h2>¿Qué te gustaría hacer hoy?</h2><div className="chat-history" aria-live="polite">{history.map((h,i)=><div key={i}><strong>{h.who}</strong><p>{h.text}</p></div>)}</div><form className="home-command" onSubmit={e=>{e.preventDefault();void runCommand(command);}}><label className="lab-field">Orden para mi hogar<input value={command} onChange={e=>setCommand(e.target.value)} maxLength={400} placeholder="Enciende el televisor de la sala"/></label><button className="lab-primary" disabled={busy||!command.trim()}>{busy?'Interpretando…':'Enviar orden'}</button></form><div className="project-actions"><button aria-pressed={listening} onClick={microphone}>{listening?'Detener micrófono':'Usar micrófono'}</button><button onClick={()=>{const text='Bienvenido a casa. ¿Qué te gustaría hacer hoy?';if(!speakHome(text))setMessage('No hay una voz local disponible en este navegador.');}}>Escuchar bienvenida</button></div><label className="lab-check"><input type="checkbox" checked={voiceReplies} onChange={e=>setVoiceReplies(e.target.checked)}/>Responder con la voz local del sistema</label><details><summary>Opciones de voz y lenguaje</summary><label className="lab-check"><input type="checkbox" checked={onlineVoice} onChange={e=>setOnlineVoice(e.target.checked)}/>Permitir dictado del navegador. Puede procesar el audio mediante un servicio en Internet; para privacidad local se utiliza el servidor del hogar.</label><label className="lab-check"><input type="checkbox" checked={gemini} onChange={e=>setGemini(e.target.checked)}/>Usar el intérprete Gemini ya configurado para órdenes que el motor local no reconozca. Envía solo texto y dispositivos virtuales, sin datos de contacto.</label></details><h2>Eventos del hogar</h2><p className="muted">Estos botones representan eventos de una instalación con análisis visual. El navegador no está analizando imágenes de cámaras.</p><div className="project-actions"><button onClick={motion}>Simular movimiento en el acceso</button><button onClick={gesture}>Simular gesto de bienvenida</button><button onClick={()=>void runCommand('Cómo está la casa')}>Consultar estado del hogar</button></div></>}
      {tab==='servidor'&&<><p className="showcase-eyebrow">El centro de tu hogar</p><h2>Inteligencia dentro de la vivienda</h2><p className="muted">Un servidor local puede procesar voz, coordinar reglas y analizar eventos de cámaras sin depender del mismo servicio en la nube para cada acción.</p><div className="server-story"><span>1</span><div><h3>Escuchar y comprender</h3><p>Micrófonos en zonas comunes captan órdenes cuando se habilita la escucha. El procesamiento local requiere configurar los modelos y servicios correspondientes.</p></div><span>2</span><div><h3>Actuar y mantenerte informado</h3><p>Las reglas coordinan iluminación, TV, sensores y paneles. Los altavoces comunican respuestas y avisos.</p></div><span>3</span><div><h3>Cuidar los accesos</h3><p>Cámaras interiores en zonas comunes y exteriores en accesos. El reconocimiento de movimiento u objetos se implementa y valida en la instalación física.</p></div></div><button onClick={()=>{const server=config.devices.find(d=>d.kind==='server');setSelected(server?.id);stage.current?.goToRoom('pasillo');}}>Ver ubicación del servidor</button><div className="point-card"><h3>Pantallas táctiles</h3><p>Selecciona el panel del pasillo: su pantalla 3D muestra cuántas luces están encendidas y el estado de la TV. En una instalación real, la agenda y la información personal se integran con autorización del propietario.</p></div><p className="muted">La demostración funciona con un motor de automatización propio. No hay un servidor de IA ni hardware conectado actualmente; mostramos la propuesta y las acciones virtuales.</p><button className="lab-primary" onClick={share}>Diseñar mi solución local</button><Link to="/servicios">Servicios de instalación y soporte →</Link></>}
      <details className="scene-credits"><summary>Referencia visual y recursos</summary><a href={scenario==='casa'?'/smart-assets/house-reference-two-storeys.png':'/smart-assets/house-visual-reference.png'} target="_blank" rel="noreferrer">Ver referencia arquitectónica</a><p>Modelo explorable: geometría 3D propia y mobiliario/materiales CC0. <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Powered by Poly Haven</a>.</p></details>
    </div><div className="lab-status" role="status">{message}</div></aside></main>
  </div>;
}
