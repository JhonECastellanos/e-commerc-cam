import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import type { Combo, Product } from '../../utils/commercial';
import CarruselCombos from '../../components/public/CarruselCombos';
import { featuredCombos } from '../../utils/featuredCombos';
import HeroCarousel from '../../components/public/HeroCarousel';
import InstallationModes from '../../components/public/InstallationModes';
import ContratarWizard from '../../components/public/ContratarWizard';
import ComboCard from '../../components/public/ComboCard';
import ProductGallery from '../../components/public/ProductGallery';
import SmartServices from '../../components/public/SmartServices';
import WhatsappCTA from '../../components/public/WhatsappCTA';
import '../../commerce.css';
export default function Home() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({}), [combos, setCombos] = useState<Combo[]>([]), [products, setProducts] = useState<Product[]>([]), [brands, setBrands] = useState<any[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { let active = true; Promise.allSettled([api.getPublicSettings(), api.getCombos({}), api.getProducts(), api.getBrands()]).then(([s, c, p, b]) => { if (!active)
    return; if (s.status === 'fulfilled')
    setSettings(s.value); if (c.status === 'fulfilled')
    setCombos(c.value); if (p.status === 'fulfilled')
    setProducts(p.value); if (b.status === 'fulfilled')
    setBrands(b.value); if (c.status === 'rejected' || p.status === 'rejected')
    setError('Una parte del catálogo no está disponible. Puedes solicitar la cotización y volver a consultar.'); setLoading(false); }); return () => { active = false; }; }, []);
  const promoted = combos.filter(c => c.is_bestseller || c.is_budget), featured = featuredCombos(combos);
  return <div className="commerce-home"><HeroCarousel settings={settings}/><InstallationModes products={products}/>
  {error && <p className="commerce-container commerce-error" role="alert">{error}</p>}
  {(loading || featured.length > 0) && <section className="commerce-section featured-section" aria-labelledby="featured-combos"><div className="commerce-container"><div className="commerce-section-heading"><div><p className="commerce-eyebrow">CCTV con instalación</p><h2 id="featured-combos">{promoted.length ? 'Combos destacados y opciones económicas' : 'Combos destacados para empezar'}</h2></div><p>Compara la marca, cantidad, resolución y precio total. Confirma cobertura y alcance de instalación con un asesor.</p></div>{loading ? <p role="status">Cargando combos y precios…</p> : <CarruselCombos combos={featured}/>}</div></section>}
  {!loading && <ContratarWizard combos={combos} brands={brands}/>}
  <section className="commerce-section" aria-labelledby="home-combos"><div className="commerce-container"><div className="commerce-section-heading"><div><p className="commerce-eyebrow">Precio total, opciones claras</p><h2 id="home-combos">Combos de cámaras instalables</h2></div><Link className="commerce-text-button" to="/catalogo">Ver todo el catálogo →</Link></div>{loading ? <p role="status">Consultando catálogo…</p> : combos.length ? <div className="commerce-combo-grid">{featured.map(c => <ComboCard key={c.id} combo={c}/>)}</div> : <div className="commerce-empty"><p>Consulta un combo de 4, 8 o 12 cámaras según el alcance y disponibilidad.</p><WhatsappCTA message="Hola, necesito una propuesta CCTV con instalación para mi inmueble."/></div>}</div></section>
  {!loading && <ProductGallery products={products}/>}<SmartServices ready={!loading}/>
  <section className="commerce-section" aria-labelledby="home-faq"><div className="commerce-container faq-layout"><div><p className="commerce-eyebrow">Antes de contratar</p><h2 id="home-faq">Preguntas frecuentes</h2><p className="commerce-muted">Te ayudamos a distinguir lo incluido y lo que requiere revisar tu inmueble.</p><WhatsappCTA message="Hola, tengo dudas sobre cámaras, cobertura e instalación."/></div><div className="commerce-faq">{[1, 2, 3, 4].map(n => <details key={n}><summary>{t(`home.faq_${n}_q`)}</summary><p>{t(`home.faq_${n}_a`)}</p></details>)}<Link to="/faq" className="commerce-text-button">Ver todas las preguntas →</Link></div></div></section>
  <section className="commerce-contact"><div className="commerce-container"><div><p className="commerce-eyebrow">Tu siguiente paso</p><h2>Hablemos de las cámaras que necesitas</h2><p>Cuéntanos dónde quieres instalarlas. Revisamos equipos, cobertura y alcance antes de confirmar la propuesta.</p></div><WhatsappCTA message="Hola, quiero cotizar cámaras y su instalación. ¿Podemos revisar mi inmueble?"/></div></section>
 </div>;
}
