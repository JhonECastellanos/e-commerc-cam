import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

interface HeroCarouselProps {
  settings: any;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match
    ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1`
    : null;
}

export default function HeroCarousel({ settings }: HeroCarouselProps) {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<any[]>([]);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 12000, stopOnInteraction: false })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    api.getBanners().then((data) => {
      if (data.length > 0) setBanners(data);
    }).catch(() => {});
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = (index: number) => {
    emblaApi?.scrollTo(index);
  };

  const showPlaceholder = banners.length === 0;
  const slides = banners.length > 0 ? banners : [];

  const whatsappNumber = settings.whatsapp_number || '[COMPLETAR]';

  return (
    <section className="relative text-white overflow-hidden">
      <div className="relative h-[500px] md:h-[600px]">
        {showPlaceholder ? (
          <div className="h-full bg-gradient-to-br from-primary-600 to-primary-900 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="max-w-3xl">
                <div className="inline-flex items-center bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  <span className="mr-2">⚡</span>
                  {settings.urgency_message || 'Cupos limitados, agenda ahora'}
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                  {t('home.hero_title')}
                </h1>
                <p className="text-xl text-gray-200 mb-8">
                  {t('home.hero_subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/catalogo" className="bg-white text-primary-700 hover:bg-primary-50 font-bold py-4 px-8 rounded-lg text-lg text-center transition-all">
                    {t('home.hero_cta')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden h-full" ref={emblaRef}>
              <div className="flex h-full">
                {slides.map((slide: any, i) => {
                  const embedUrl = getYouTubeEmbedUrl(slide.video_url);
                  return (
                    <div key={slide.id || i} className="relative flex-[0_0_100%] min-w-0 h-full">
                      {embedUrl ? (
                        <div className="absolute inset-0 overflow-hidden">
                          <iframe
                            src={embedUrl}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] pointer-events-none"
                            style={{ filter: 'brightness(0.5) saturate(1.2)' }}
                            allow="autoplay; encrypted-media"
                            title={slide.title || 'Video banner'}
                          />
                        </div>
                      ) : slide.image_url ? (
                        <img src={slide.image_url} alt={slide.title || ''} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-900" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      <div className="relative h-full flex items-center" style={{ zIndex: 10 }}>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                          <div className="max-w-3xl">
                            {i === 0 && (
                              <div className="inline-flex items-center bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                                <span className="mr-2">⚡</span>
                                {settings.urgency_message || 'Cupos limitados, agenda ahora'}
                              </div>
                            )}
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                              {slide.title || t('home.hero_title')}
                            </h1>
                            {slide.subtitle && (
                              <p className="text-xl text-gray-200 mb-8">
                                {slide.subtitle}
                              </p>
                            )}
                            <div className="flex flex-col sm:flex-row gap-4">
                              <Link to="/catalogo" className="bg-white text-primary-700 hover:bg-primary-50 font-bold py-4 px-8 rounded-lg text-lg text-center transition-all">
                                {t('home.hero_cta')}
                              </Link>
                              <a
                                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Quiero información sobre cámaras de seguridad')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-lg text-center transition-all flex items-center justify-center space-x-2"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                <span>WhatsApp</span>
                              </a>
                            </div>
                            {i === 0 && settings.installed_count > 0 && (
                              <div className="mt-8 flex items-center space-x-2 text-gray-300">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-semibold">{settings.installed_count}</span>
                                <span>{t('home.installed_before')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3" style={{ zIndex: 20 }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === selectedIndex
                      ? 'bg-white scale-125 w-8'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`Ir a slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
