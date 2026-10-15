import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { modeLabels, type Combo, type Product } from '../../utils/commercial';
import PaginatedCatalog from '../../components/public/PaginatedCatalog';
import ComboCard from '../../components/public/ComboCard';
import ProductGallery from '../../components/public/ProductGallery';
import WhatsappCTA from '../../components/public/WhatsappCTA';
import '../../commerce.css';
export default function Catalog() {
  const [combos, setCombos] = useState<Combo[]>([]), [products, setProducts] = useState<Product[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [params, setParams] = useSearchParams(), location = useLocation();
  useEffect(() => { let active = true; Promise.allSettled([api.getCombos({}), api.getProducts()]).then(([c, p]) => { if (!active)
    return; if (c.status === 'fulfilled')
    setCombos(c.value); if (p.status === 'fulfilled')
    setProducts(p.value); if (c.status === 'rejected' || p.status === 'rejected')
    setError('No pudimos cargar una parte del catálogo. Solicita asesoría o vuelve a intentarlo.'); setLoading(false); }); return () => { active = false; }; }, []);
  useEffect(() => { if (!loading && location.hash === '#productos')
    document.getElementById('productos')?.scrollIntoView(); }, [loading, location.hash]);
  const mode = params.get('mode') || '', brand = params.get('brand') || '', filtered = combos.filter(c => (!mode || c.mode === mode) && (!brand || c.brand_name === brand));
  return <div className="commerce-catalog"><section className="commerce-section"><div className="commerce-container"><p className="commerce-eyebrow">Cámaras de seguridad e instalación</p><h1>Catálogo de combos CCTV</h1><p className="commerce-lead">Marca, cámaras, resolución y precio total en cada opción. La instalación se confirma según cobertura y alcance.</p><div className="catalog-filters"><label>Modo de instalación<select value={mode} onChange={e => { const next = new URLSearchParams(params); e.target.value ? next.set('mode', e.target.value) : next.delete('mode'); setParams(next); }}><option value="">Todos los modos</option>{Object.entries(modeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Marca del combo<select value={brand} onChange={e => { const next = new URLSearchParams(params); e.target.value ? next.set('brand', e.target.value) : next.delete('brand'); setParams(next); }}><option value="">Todas las marcas</option>{[...new Set(combos.map(c => c.brand_name))].map(name => <option key={name}>{name}</option>)}</select></label><Link className="commerce-text-button" to="#productos">Ver productos individuales ↓</Link></div><h2 className="sr-only">Combos instalables disponibles</h2>{error && <p className="commerce-error" role="alert">{error}</p>}{loading ? <p role="status">Cargando precios y fotografías…</p> : filtered.length ? <PaginatedCatalog items={filtered} pageSize={6} label="combos" filterKey={`${mode}|${brand}`} className="commerce-combo-grid" render={c => <ComboCard key={c.id} combo={c}/>}/> : <div className="commerce-empty"><h2>Esta opción requiere una cotización</h2><p>No hay combos activos para los filtros seleccionados. Un asesor puede ajustar la propuesta.</p><WhatsappCTA message={`Hola, quiero cotizar cámaras con modalidad ${modeLabels[mode] || 'a definir'}${brand ? ' de ' + brand : ''}, con instalación.`}/></div>}</div></section>{!loading && <ProductGallery products={products}/>}</div>;
}
