import { useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import CatalogImage, { imagePath } from './CatalogImage';
import CommercialIcon from './CommercialIcon';
import WhatsappCTA from './WhatsappCTA';
import YouTubeMedia from './YouTubeMedia';
type Banner={id:number|string;title?:string;subtitle?:string;video_url?:string;image_url?:string;link_url?:string};
// Original security footage from the V1 repository. Administrator banners override it.
export const originalSecurityVideo='https://www.youtube.com/watch?v=CJ3dAAna7jQ';
export function youtubeId(value?:string) {
  try {const url=new URL(value||'');if(url.hostname==='youtu.be')return /^[\w-]{11}$/.test(url.pathname.slice(1))?url.pathname.slice(1):undefined;if(!['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname))return;const id=url.searchParams.get('v')||url.pathname.split('/').pop();return id&&/^[\w-]{11}$/.test(id)?id:undefined;}catch{return;}
}
function safeMedia(value?:string) {if(!value)return;try{const url=new URL(value,location.origin);return ['https:','http:'].includes(url.protocol)?url.href:undefined;}catch{return;}}
function HeroMedia({banner,active,playing}:{banner:Banner;active:boolean;playing:boolean}) {
  const video=useRef<HTMLVideoElement>(null),[failed,setFailed]=useState(false);
  const source=safeMedia(banner.video_url),id=youtubeId(source);
  const poster=imagePath(banner.image_url)||'/images/cctv-diagram.svg';
  const [allowed,setAllowed]=useState(playing);
  useEffect(()=>{if(playing)setAllowed(true);if(video.current){if(playing&&active)void video.current.play().catch(()=>{});else video.current.pause();}},[playing,active]);
  useEffect(()=>setFailed(false),[source]);
  return <div className="hero-media"><CatalogImage src={poster} alt="Referencia de un sistema de cámaras y grabación" loading="eager" className="hero-poster"/>
    {active&&!failed&&source&&(id?allowed&&<YouTubeMedia id={id} playing={playing} onError={()=>setFailed(true)}/>:allowed&&<video ref={video} src={source} poster={poster} autoPlay={playing} muted loop playsInline controls preload="metadata" aria-label="Vídeo de referencia de seguridad" onError={()=>setFailed(true)}/>)}
    {failed&&source&&<a className="hero-video-fallback" href={source} target="_blank" rel="noopener noreferrer">Ver vídeo original</a>}
    <span className="hero-media-caption">Videovigilancia · vídeo de referencia</span>
  </div>;
}
export default function HeroCarousel({settings}:{settings:{installed_count?:number|string}}) {
  const [banners,setBanners]=useState<Banner[]>([]),[selected,setSelected]=useState(0),[paused,setPaused]=useState(false),[visible,setVisible]=useState(true),[hover,setHover]=useState(false);
  const reduced=useReducedMotion(),host=useRef<HTMLElement>(null),[explicitPlay,setExplicitPlay]=useState(false);
  const [emblaRef,embla]=useEmblaCarousel({loop:true},[Autoplay({delay:12000,playOnInit:false,stopOnInteraction:true,stopOnFocusIn:false})]);
  useEffect(()=>{let alive=true;api.getBanners().then(data=>{if(alive)setBanners(data)}).catch(()=>{});return()=>{alive=false}},[]);
  useEffect(()=>{if(!embla)return;const select=()=>setSelected(embla.selectedScrollSnap());embla.on('select',select);embla.on('reInit',select);select();return()=>{embla.off('select',select);embla.off('reInit',select)}},[embla]);
  useEffect(()=>{const element=host.current;if(!element)return;let inView=true;const update=()=>setVisible(inView&&!document.hidden);const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;update()});observer.observe(element);document.addEventListener('visibilitychange',update);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update)}},[]);
  const stopped=paused||(Boolean(reduced)&&!explicitPlay);
  const playing=!stopped&&visible&&!hover;
  useEffect(()=>{if(!embla)return;const sync=()=>{const plugin=embla.plugins().autoplay;if(playing&&!reduced&&embla.scrollSnapList().length>1)plugin?.play();else plugin?.stop();};sync();embla.on('reInit',sync);return()=>{embla.off('reInit',sync)}},[embla,playing,reduced,banners.length]);
  const slides:Banner[]=banners.length?banners:[{id:'security',title:'Cámaras de seguridad, con instalación a tu medida.',subtitle:'Compara combos CCTV con precio total o cuéntanos qué necesitas proteger. Te ayudamos a elegir cámaras, grabación e instalación según tu inmueble.',video_url:import.meta.env.VITE_SECURITY_VIDEO_URL||originalSecurityVideo}];
  function manual(index:number){setPaused(true);embla?.scrollTo(index)}
  useEffect(()=>{host.current?.querySelectorAll<HTMLElement>('.hero-slide').forEach((slide,index)=>{slide.inert=index!==selected;});},[selected,banners.length]);
  return <section ref={host} className="security-hero" aria-label="Soluciones de cámaras e instalación" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={e=>{if(!(e.target as HTMLElement).closest('[data-motion-control]'))setPaused(true)}}><div ref={emblaRef} className="overflow-hidden"><div className="flex">{slides.map((banner,i)=><article key={banner.id} className="hero-slide"><div className="commerce-container hero-layout"><div className="hero-copy"><p className="commerce-eyebrow">InstalaCámara · seguridad electrónica</p><h1>{banner.title||'Cámaras y combos CCTV con instalación'}</h1><p>{banner.subtitle||'Protege accesos y áreas de tu inmueble con una solución que puedas comparar y entender.'}</p><div className="commerce-actions"><WhatsappCTA message="Hola, quiero cotizar cámaras de seguridad con instalación."/><Link to={safeMedia(banner.link_url)||'/catalogo'} className="commerce-button commerce-button-light">Ver combos y precios <CommercialIcon name="arrow" className="h-5 w-5"/></Link></div><div className="hero-commitments"><span><CommercialIcon name="camera"/>Cámaras y grabación</span><span><CommercialIcon name="shield"/>Instalación según cobertura</span><span><CommercialIcon name="check"/>Asesoría para elegir</span></div>{Number(settings.installed_count)>0&&<p className="text-sm">{settings.installed_count} instalaciones registradas</p>}</div><HeroMedia banner={banner} active={selected===i} playing={playing&&selected===i}/></div></article>)}</div></div>
    <div className="commerce-container hero-controls"><div className="flex gap-2">{slides.length>1&&<button aria-label="Diapositiva anterior" onClick={()=>manual((selected-1+slides.length)%slides.length)}><CommercialIcon name="arrow" className="h-5 w-5 rotate-180"/></button>}{slides.map((slide,i)=><button key={slide.id} aria-label={`Ver diapositiva ${i+1}`} aria-current={selected===i?'true':undefined} onClick={()=>manual(i)}>Solución {i+1}</button>)}{slides.length>1&&<button aria-label="Diapositiva siguiente" onClick={()=>manual((selected+1)%slides.length)}><CommercialIcon name="arrow" className="h-5 w-5"/></button>}</div><button data-motion-control aria-label={stopped?'Reproducir vídeo y carrusel':'Pausar vídeo y carrusel'} aria-pressed={stopped} onClick={()=>{if(stopped){setPaused(false);setExplicitPlay(true);setHover(false);}else setPaused(true);}}><CommercialIcon name={stopped?'play':'pause'} className="h-4 w-4"/>{stopped?'Reproducir':'Pausar'}</button></div>
  </section>;
}
