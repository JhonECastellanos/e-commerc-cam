import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import CatalogImage from './CatalogImage';
import { initialConfiguration, type Scenario } from '../../smart-home/domain';
import '../../smart-home/smart-home.css';
const SceneViewport = lazy(() => import('../../smart-home/SceneViewport'));
function embedURL(url?: string) {
  const match = url?.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match
    ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}&controls=0&rel=0`
    : null;
}
function PropertyPreview({
  scenario,
  active,
}: {
  scenario: Scenario;
  active: boolean;
}) {
  const config = useMemo(() => initialConfiguration(scenario), [scenario]);
  return (
    <div className="lab-preview">
      {active ? (
        <Suspense
          fallback={
            <div className="scene-loading">Preparando escenario 3D…</div>
          }
        >
          <SceneViewport config={config} preview />
        </Suspense>
      ) : (
        <div className="scene-loading">
          {scenario === 'casa' ? 'Casa inteligente' : 'Apartamento inteligente'}{' '}
          · Escenario 3D
        </div>
      )}
    </div>
  );
}
export default function HeroCarousel({ settings }: { settings: any }) {
  const { t } = useTranslation(),
    navigate = useNavigate();
  const [banners, setBanners] = useState<any[]>([]),
    [selected, setSelected] = useState(0),
    [paused, setPaused] = useState(false);
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: 'start' }, [
    Autoplay({
      delay: 14000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  ]);
  useEffect(() => {
    api
      .getBanners()
      .then(setBanners)
      .catch(() => {});
  }, []);
  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);
  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on('select', onSelect);
    embla.on('reInit', onSelect);
    return () => {
      embla.off('select', onSelect);
      embla.off('reInit', onSelect);
    };
  }, [embla, onSelect]);
  const media = banners.length
    ? banners
    : [
        {
          id: 'intro',
          title: t('home.hero_title'),
          subtitle:
            'Combos CCTV y soluciones de seguridad y domótica según tu inmueble.',
        },
      ];
  const slides = [
    ...media,
    { id: 'casa', scenario: 'casa', title: 'Imagina tu casa conectada' },
    {
      id: 'apartamento',
      scenario: 'apartamento',
      title: 'Diseña tu apartamento inteligente',
    },
  ];
  const togglePause = () => {
    const plugin = embla?.plugins().autoplay;
    if (paused) plugin?.play();
    else plugin?.stop();
    setPaused(!paused);
  };
  return (
    <section
      className="relative text-white overflow-hidden"
      aria-label="Soluciones y simuladores interactivos"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="relative flex-[0_0_100%] min-w-0 bg-gradient-to-br from-primary-600 to-primary-900"
            >
              {slide.scenario ? (
                <div
                  className="hero-property grid md:grid-cols-2 min-h-[580px] md:min-h-[540px]"
                  onDoubleClick={() => navigate(`/simulador/${slide.scenario}`)}
                >
                  <div className="flex flex-col justify-center px-6 md:px-12 py-10">
                    <span className="text-emerald-200 text-xs font-bold tracking-widest uppercase mb-4">
                      Laboratorio interactivo ·{' '}
                      {slide.scenario === 'casa' ? 'Casa' : 'Apartamento'}
                    </span>
                    <h2 className="text-3xl lg:text-5xl font-bold leading-tight">
                      {slide.title}
                    </h2>
                    <p className="text-primary-100 mt-5 mb-7 max-w-md">
                      Recorre las habitaciones. Ubica cámaras, sensores y luces.
                      Prueba automatizaciones y comparte tu diseño con un
                      asesor.
                    </p>
                    <Link
                      className="bg-white text-primary-700 font-bold px-6 py-3 rounded-lg w-fit"
                      to={`/simulador/${slide.scenario}`}
                    >
                      Configurar{' '}
                      {slide.scenario === 'casa' ? 'mi casa' : 'mi apartamento'}{' '}
                      en 3D →
                    </Link>
                    <span className="text-xs text-primary-100 mt-4">
                      Doble clic en el escenario o toca el botón para abrir el
                      laboratorio.
                    </span>
                  </div>
                  <PropertyPreview
                    scenario={slide.scenario as Scenario}
                    active={selected === i}
                  />
                </div>
              ) : (
                <div className="relative min-h-[540px] flex items-center py-14">
                  {embedURL(slide.video_url) ? (
                    <iframe
                      src={embedURL(slide.video_url)!}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      title={slide.title || 'Video de instalación'}
                      allow="autoplay; encrypted-media"
                    />
                  ) : slide.video_url &&
                    /^https?:\/\//.test(slide.video_url) ? (
                    <video
                      className="absolute inset-0 w-full h-full object-cover"
                      src={slide.video_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : slide.image_url ? (
                    <CatalogImage
                      src={slide.image_url}
                      alt={slide.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading={i ? 'lazy' : 'eager'}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-900/70 to-transparent" />
                  <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full">
                    <div className="max-w-3xl">
                      <span className="text-primary-200 uppercase tracking-widest text-xs font-semibold">
                        Seguridad · Videovigilancia · Domótica
                      </span>
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight my-5">
                        {slide.title || t('home.hero_title')}
                      </h1>
                      <p className="text-xl text-primary-100 mb-8">
                        {slide.subtitle || t('home.hero_subtitle')}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                          to="/asesoria"
                          className="bg-white text-primary-700 font-bold py-4 px-6 rounded-lg text-center"
                        >
                          Solicitar asesoría personalizada
                        </Link>
                        <Link
                          to={
                            slide.link_url?.startsWith('/') &&
                            !slide.link_url.startsWith('//')
                              ? slide.link_url
                              : '/catalogo'
                          }
                          className="border border-white/50 text-white font-semibold py-4 px-6 rounded-lg text-center"
                        >
                          Explorar soluciones
                        </Link>
                      </div>
                      {settings.installed_count > 0 && (
                        <p className="text-sm mt-7 text-primary-100">
                          {settings.installed_count} instalaciones registradas
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-primary-900 flex items-center justify-center gap-3 p-3 flex-wrap">
        <button
          aria-label="Diapositiva anterior"
          onClick={() => embla?.scrollPrev()}
          className="px-3 py-1"
        >
          ←
        </button>
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => embla?.scrollTo(i)}
            aria-label={
              slide.scenario
                ? `Ver ${slide.scenario} 3D en carrusel`
                : `Ver diapositiva ${i + 1}`
            }
            aria-current={selected === i ? 'true' : undefined}
            className={`text-xs px-3 py-2 rounded-full ${selected === i ? 'bg-white text-primary-800' : 'bg-white/10 text-white'}`}
          >
            {slide.scenario === 'casa'
              ? 'Casa 3D'
              : slide.scenario === 'apartamento'
                ? 'Apartamento 3D'
                : `Solución ${i + 1}`}
          </button>
        ))}
        <button
          aria-label="Diapositiva siguiente"
          onClick={() => embla?.scrollNext()}
          className="px-3 py-1"
        >
          →
        </button>
        <button
          onClick={togglePause}
          className="text-xs px-3 py-2 border border-white/30 rounded-full"
        >
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
      </div>
    </section>
  );
}
