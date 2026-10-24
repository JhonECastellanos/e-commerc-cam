import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import ComboCard from './ComboCard';
import type { Combo } from '../../utils/commercial';

export default function CarruselCombos({combos}: {combos: Combo[]}) {
  const [ref, api] = useEmblaCarousel({align:'start', slidesToScroll:1, breakpoints:{'(min-width: 900px)':{slidesToScroll:3}}});
  const [index,setIndex] = useState(0), [count,setCount] = useState(1), [brand,setBrand] = useState('');
  useEffect(() => {
    if(!api)return;
    const update=()=>{setIndex(api.selectedScrollSnap());setCount(api.scrollSnapList().length);setBrand(combos[api.slidesInView()[0] ?? 0]?.brand_name || '');};
    update(); api.on('select',update).on('reInit',update).on('slidesInView',update);
    return ()=>{api.off('select',update).off('reInit',update).off('slidesInView',update);};
  },[api,combos]);
  if(!combos.length)return null;
  return <div className="featured-carousel" role="region" aria-label="Combos destacados por marca" aria-roledescription="carrusel">
    <div className="featured-carousel-controls"><p aria-live="polite">{brand}</p><div><button type="button" aria-label="Combos anteriores" onClick={()=>api?.scrollPrev()} disabled={!api?.canScrollPrev()}>‹</button><span>{index+1} / {count}</span><button type="button" aria-label="Siguientes combos" onClick={()=>api?.scrollNext()} disabled={!api?.canScrollNext()}>›</button></div></div>
    <div className="overflow-hidden" ref={ref}><div className="featured-carousel-track">{combos.map(combo=><div className="featured-carousel-slide" key={combo.id}><ComboCard combo={combo}/></div>)}</div></div>
  </div>;
}
