import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Scenario } from '../../smart-home/domain';
import CommercialIcon from './CommercialIcon';
const Demo = lazy(() => import('../../pages/public/SmartHomeLab').then(module => ({ default: module.Showcase })));
const offers = [
  { icon: 'screen', title: 'Software propio e IA', text: 'Coordina tus dispositivos IoT con escenas y asistencia inteligente. Asesoría, actualizaciones y soporte mensual, anual o bajo demanda, según tu plan.' },
  { icon: 'server', title: 'IA en tu servidor local', text: 'Conecta un modelo de IA al software de tu hogar para procesar órdenes y eventos localmente. Equipo, instalación y servicios externos compatibles se cotizan aparte.' },
  { icon: 'building', title: 'Proyectos de vivienda', text: 'Para constructoras e inversionistas: infraestructura compartida con datos y permisos separados por vivienda. Integración, capacidad de IA y mantenimiento por proyecto.' },
];
export default function SmartServices({ ready = true }: { ready?: boolean }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('demo');
  const [scenario, setScenario] = useState<Scenario>();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { setScenario(requested === 'casa' || requested === 'apartamento' ? requested : undefined); }, [requested]);
  // Wait for content above the panel before following a direct demo link.
  useEffect(() => { if (scenario && ready) panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }, [scenario, ready]);
  function toggle(value: Scenario) {
    const next = new URLSearchParams(params);
    if (scenario === value) next.delete('demo'); else next.set('demo', value);
    setParams(next, { replace: true, preventScrollReset: true });
  }
  return <section id="casa-inteligente" className="commerce-section smart-service-secondary" aria-labelledby="smart-home-service"><div className="commerce-container">
    <div className="smart-service-heading"><div><p className="commerce-eyebrow">IA + Internet de las cosas · bajo cotización</p><h2 id="smart-home-service">Casa inteligente, según tu vivienda</h2><p>Tu hogar responde: luces, TV, cámaras y pantallas conectadas mediante software propio. IA local para mayor control sobre el procesamiento de tus datos; asesoría e instalación según tu proyecto.</p></div><CommercialIcon name="home" className="smart-service-symbol"/></div>
    <div className="smart-service-grid">{offers.map(offer => <article key={offer.title}><CommercialIcon name={offer.icon}/><h3>{offer.title}</h3><p>{offer.text}</p></article>)}</div>
    <div className="commerce-actions"><Link className="commerce-button" to="/asesoria">Solicitar asesoría</Link>{(['casa','apartamento'] as Scenario[]).map(value => <button key={value} className="commerce-button commerce-button-outline" aria-expanded={scenario===value} aria-controls="smart-demo-panel" onClick={()=>toggle(value)}>Ver demo {value}<CommercialIcon name="arrow" className={`h-4 w-4 ${scenario===value?'-rotate-90':'rotate-90'}`}/></button>)}<Link className="commerce-text-button" to="/servicios">Servicios e infraestructura →</Link></div>
    <p className="smart-demo-note">Demostraciones virtuales. Prueba iluminación, TV y órdenes; la instalación y los modelos de IA se configuran al contratar. Los servicios externos opcionales incluyen límites y consumos acordados en la propuesta.</p>
    <div id="smart-demo-panel" ref={panel} className="smart-demo-panel" hidden={!scenario}>{scenario&&<Suspense fallback={<p className="commerce-empty" role="status">Preparando la demo de {scenario}…</p>}><Demo key={scenario} scenario={scenario} embedded/></Suspense>}</div>
  </div></section>;
}
