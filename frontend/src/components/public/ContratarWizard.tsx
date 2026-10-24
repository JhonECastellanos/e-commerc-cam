import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { cameraQuestions, cameraSummary, cleanCameraAnswers, recommendCameras, type CameraAnswers } from '../../utils/cameraRecommendation';
import { money, modeLabels, type Combo } from '../../utils/commercial';
import WhatsappCTA from './WhatsappCTA';
import CommercialIcon from './CommercialIcon';
type Brand={id:number;name:string;slug:string;active?:boolean};
export default function ContratarWizard({combos:provided,brands:providedBrands}:{combos?:Combo[];brands?:Brand[]}) {
  const [combos,setCombos]=useState<Combo[]>(provided||[]),[brands,setBrands]=useState<Brand[]>(providedBrands||[]);
  const [loading,setLoading]=useState(!provided),[error,setError]=useState(''),[started,setStarted]=useState(false),[step,setStep]=useState(0);
  const [answers,setAnswers]=useState<CameraAnswers>({}),[completed,setCompleted]=useState(false),[numeric,setNumeric]=useState('');
  const [customStep,setCustomStep]=useState<''|'brand'|'mode'>(''),[brand,setBrand]=useState(''),[busy,setBusy]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null),lock=useRef(false);const navigate=useNavigate();
  const questions=cameraQuestions(answers),question=questions[step],result=recommendCameras(answers,combos);
  useEffect(()=>{if(provided){setCombos(provided);setBrands(providedBrands||[]);setLoading(false);return;}let active=true;Promise.all([api.getCombos({}),api.getBrands()]).then(([c,b])=>{if(active){setCombos(c);setBrands(b)}}).catch(()=>{if(active)setError('No pudimos consultar el catálogo. Puedes solicitar asesoría o intentarlo de nuevo.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[provided,providedBrands]);
  useEffect(()=>{if(started)heading.current?.focus();const saved=answers[question?.key as keyof CameraAnswers];setNumeric(typeof saved==='number'?String(saved):'');},[step,started,completed,customStep]);
  function answer(value:string|number) {
    const finalAnswers=cleanCameraAnswers({...answers,[question.key]:value});setAnswers(finalAnswers);setError('');
    if(step+1>=cameraQuestions(finalAnswers).length)setCompleted(true);else setStep(step+1);
  }
  function saveProfile() {const finalAnswers=cleanCameraAnswers(answers);sessionStorage.setItem('instalacam:cctv-profile',JSON.stringify({version:1,answers:finalAnswers}));return finalAnswers;}
  function checkout(combo:Combo) {try {const finalAnswers=saveProfile();navigate(`/checkout/${combo.id}`,{state:{cameraAnswers:finalAnswers}})}catch{setError('No pudimos conservar las respuestas. Solicita la propuesta por WhatsApp.')}}
  async function customCheckout(mode:string) {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    const cameras=[4,8,12].find(n=>n>=Number(answers.areas||1))||12;
    try{await api.getCustomPrice({brand_slug:brand,mode,cameras_count:cameras,resolution:'2MP'});const finalAnswers=saveProfile();const query=new URLSearchParams({brand,mode,cameras:String(cameras),resolution:'2MP'});navigate(`/checkout/custom?${query}`,{state:{cameraAnswers:finalAnswers}})}catch{setError('Esta combinación no tiene precio disponible. Un asesor puede ajustar la marca, cantidad y especificaciones.')}finally{lock.current=false;setBusy(false)}
  }
  const summary=`Hola, quiero una propuesta de cámaras e instalación.\n${cameraSummary(answers)}\nRecomendación preliminar: ${result.custom?'Instalación personalizada':`Combo de ${result.compatible[0]?.cameras_count} cámaras`}.`;
  return <section id="contratar-camaras" className="commerce-section" aria-labelledby="camera-wizard-title"><div className="commerce-container"><div className="camera-wizard">
    <div className="wizard-intro"><span className="commerce-eyebrow">Una instalación que corresponda a tu espacio</span><h2 id="camera-wizard-title">Encuentra tu solución de cámaras</h2><p>Responde preguntas breves. Te mostramos una recomendación preliminar y los combos disponibles, con sus precios reales.</p></div>
    {!started?<button className="commerce-button" onClick={()=>setStarted(true)}>Encontrar mis cámaras <CommercialIcon name="arrow" className="h-5 w-5"/></button>:<>
      <div className="wizard-progress"><span>{completed?'Recomendación':`Pregunta ${step+1} de ${questions.length}`}</span><progress value={completed?questions.length:step} max={questions.length} aria-label="Progreso de selección de cámaras"/></div>
      {loading?<p role="status">Consultando combos disponibles…</p>:completed?<>
        <h3 ref={heading} tabIndex={-1}>{customStep==='brand'?'¿Qué marca quieres evaluar?':customStep==='mode'?'¿Qué modalidad quieres cotizar?':result.custom?'Tu proyecto necesita revisión personalizada':`Un combo de ${result.compatible[0]?.cameras_count} cámaras puede ser adecuado`}</h3>
        {!customStep?<><ul className="recommendation-reasons">{result.reasons.map(reason=><li key={reason}><CommercialIcon name="check" className="h-5 w-5"/>{reason}</li>)}</ul><p className="commerce-muted">La ubicación, visión nocturna, distancias, red y alimentación se revisan antes de confirmar la instalación.</p>
          {result.compatible.length>0&&<div className="wizard-compatible" aria-label="Combos compatibles">{result.compatible.map(combo=><article key={combo.id}><b>{combo.brand_name} · {combo.cameras_count} cámaras · {combo.resolution}</b><p>{modeLabels[combo.mode]} · {money(combo.final_price)}</p><button className="commerce-button" onClick={()=>checkout(combo)}>Continuar con este combo</button></article>)}</div>}
          <div className="commerce-actions"><WhatsappCTA message={summary}>Enviar mis respuestas por WhatsApp</WhatsappCTA><Link className="commerce-button commerce-button-outline" to="/asesoria" onClick={()=>{try{saveProfile()}catch{}}}>Solicitar revisión de mi proyecto</Link>
          {answers.property!=='edificio'&&Number(answers.areas)>0&&Number(answers.areas)<=12&&answers.existing!=='si'&&<button className="commerce-text-button" onClick={()=>setCustomStep('brand')}>Cotizar una combinación personalizada</button>}</div>
          <details className="wizard-summary"><summary>Revisar mis respuestas</summary><p className="whitespace-pre-line">{cameraSummary(answers)}</p></details></>:customStep==='brand'?<div className="wizard-options">{brands.filter(b=>b.active!==false).map(b=><button key={b.id} onClick={()=>{setBrand(b.slug);setCustomStep('mode')}}>{b.name}</button>)}</div>:<><p>La modalidad queda sujeta a los equipos y precios disponibles. Puedes continuar únicamente cuando exista una cotización calculable.</p><div className="wizard-options">{['cableado','inalambrico','hibrido','solar'].map(mode=><button key={mode} disabled={busy} onClick={()=>void customCheckout(mode)}>{modeLabels[mode]}</button>)}</div>{busy&&<p role="status">Calculando la combinación…</p>}</>}
      </>:<><h3 ref={heading} tabIndex={-1}>{question.title}</h3>{question.numeric?<form onSubmit={e=>{e.preventDefault();const n=Number(numeric);if(!Number.isInteger(n)||n<1||n>(question.max||500)){setError(`Introduce un número entre 1 y ${question.max||500}.`);return;}answer(n)}}><label className="commerce-label" htmlFor="camera-count">{question.key==='units'?'Número de viviendas':'Número de áreas'}</label><input id="camera-count" type="number" min={1} max={question.max} inputMode="numeric" value={numeric} onChange={e=>{setNumeric(e.target.value);setError('')}} aria-invalid={Boolean(error)} aria-describedby={error?'camera-wizard-error':undefined}/><button className="commerce-button" type="submit">Continuar</button><button className="commerce-text-button" type="button" onClick={()=>answer(0)}>Necesito asesoría para calcularlo</button></form>:<div className="wizard-options" role="group" aria-label={question.title}>{question.options?.map(([value,label])=><button key={value} aria-pressed={answers[question.key as keyof CameraAnswers]===value} onClick={()=>answer(value)}>{label}<CommercialIcon name="arrow" className="h-5 w-5"/></button>)}</div>}</>}
      {error&&<p id="camera-wizard-error" className="commerce-error" role="alert">{error}</p>}
      <div className="wizard-back"><button disabled={busy} className="commerce-text-button" onClick={()=>{setError('');if(customStep){setCustomStep(customStep==='mode'?'brand':'');return;}if(completed){setCompleted(false);setStep(questions.length-1)}else if(step>0)setStep(step-1);else setStarted(false)}}>Volver</button>{completed&&<button className="commerce-text-button" onClick={()=>{setCompleted(false);setStep(0);setCustomStep('');setError('')}}>Revisar desde el inicio</button>}</div>
    </>}
  </div></div></section>;
}
