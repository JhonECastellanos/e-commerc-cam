import { Link } from 'react-router-dom';
import CatalogImage from './CatalogImage';
import { comboPhotos } from '../../utils/catalogPhotos';
import { installationLabel, modeLabels, money, type Combo } from '../../utils/commercial';
import WhatsappCTA from './WhatsappCTA';
export default function ComboCard({ combo }: {
  combo: Combo;
}) {
  const photos = comboPhotos(combo);
  return <article className="combo-commerce-card">
<Link className="combo-commerce-photo" to={`/catalogo/${combo.id}`} aria-label={`Ver detalle de ${combo.brand_name}, ${combo.cameras_count} cámaras`}>
<CatalogImage src={photos[0] || combo.image_url || undefined} alt={`${combo.brand_name} · ${combo.cameras_count} cámaras`} title={photos.length ? 'Fotografía de kit de referencia. Componentes sujetos a confirmación.' : undefined} className="w-full h-full object-contain"/>{combo.is_budget && <span className="combo-badge">Opción económica</span>}{combo.is_bestseller && !combo.is_budget && <span className="combo-badge">Destacado</span>}</Link>
<div className="combo-commerce-body">
<p className="commerce-eyebrow">{combo.brand_name}</p>
<h3>{combo.cameras_count} cámaras · {combo.resolution}</h3>
<p>{modeLabels[combo.mode] || combo.mode}</p>
<p className="combo-price">{money(combo.final_price)}</p>
<p className="commerce-muted">Precio total · {installationLabel(combo)}</p>
<WhatsappCTA message={`Hola, quiero cotizar el combo ${combo.id}: ${combo.brand_name}, ${combo.cameras_count} cámaras, ${combo.resolution}, ${modeLabels[combo.mode] || combo.mode}. Precio publicado: ${money(combo.final_price)}. ${installationLabel(combo)}. ¿Podemos revisar la cobertura y el alcance?`}/>
<div className="combo-card-links">
<Link to={`/catalogo/${combo.id}`}>Ver detalle</Link>
<Link to={`/checkout/${combo.id}`}>Reservar instalación</Link>
</div>
</div>
</article>;
}
