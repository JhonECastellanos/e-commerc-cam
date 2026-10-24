import { Link } from 'react-router-dom';
import type { Product } from '../../utils/commercial';
import { commercialProducts } from '../../utils/productCatalog';
import { cameraFunctions, equipmentClassification, installationBranches } from '../../utils/equipmentClassification';
import CommercialIcon from './CommercialIcon';
export default function InstallationModes({products=[]}:{products?:Product[]}) {
  const classified=commercialProducts(products).map(product=>({product,...equipmentClassification(product)}));
  return <section className="commerce-section modes-section" aria-labelledby="installation-modes"><div className="commerce-container"><div className="commerce-section-heading"><div><p className="commerce-eyebrow">Instalación → función → equipo</p><h2 id="installation-modes">Elige la modalidad que se adapta a tu espacio</h2></div><p>Un equipo puede participar en varios sistemas. La detección de movimiento no implica giro motorizado, ni una cámara IP implica Wi-Fi.</p></div><div className="installation-grid">{installationBranches.map(mode=><article key={mode.id} className="installation-card"><CommercialIcon name={mode.icon}/><h3>{mode.name}</h3><p>{mode.description}</p><details className="equipment-tree"><summary>Ver funciones y equipos</summary><ul>{cameraFunctions.map(feature=>{
    const matches=classified.filter(item=>item.modes.includes(mode.id)&&item.functions.includes(feature.id));
    if(!matches.length)return null;
    return <li key={feature.id}><Link to={`/catalogo?equipmentMode=${mode.id}&function=${feature.id}#productos`}>{feature.name} <b>{matches.length}</b></Link></li>;
  })}</ul>{!classified.some(item=>item.modes.includes(mode.id))&&<p>No hay equipos con esta conexión verificada en el catálogo actual. <Link to="/asesoria">Solicitar asesoría</Link></p>}{mode.id==='solar'&&<p>Los equipos listados son PoE. No hay alimentación solar verificada.</p>}{mode.id==='hibrido'&&<p>Integración sujeta al grabador y enlaces compatibles; no convierte el equipo en inalámbrico.</p>}<p>Audio bidireccional y sirena requieren confirmar la variante. Los DVR graban vídeo; la IA local requiere un servidor dimensionado aparte.</p></details><Link className="commerce-text-button" to={`/catalogo?equipmentMode=${mode.id}#productos`}>Explorar equipos <CommercialIcon name="arrow" className="h-4 w-4"/></Link></article>)}</div></div></section>;
}
