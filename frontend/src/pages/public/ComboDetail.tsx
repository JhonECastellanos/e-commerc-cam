import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

const MODE_IMAGES: Record<string, string[]> = {
  cableado: ['combo-hero', 'camara-detalle', 'dvr-detalle'],
  inalambrico: ['combo-hero', 'camara-detalle', 'app-detalle'],
  hibrido: ['combo-hero', 'camara-detalle', 'dvr-detalle'],
  solar: ['combo-hero', 'camara-detalle', 'solar-detalle'],
};

const COMPLEXITY_LABELS: Record<string, string> = {
  baja: 'Baja - Instalación sencilla, sin necesidad de cableado',
  media: 'Media - Requiere configuración técnica básica',
  alta: 'Alta - Requiere cableado y montaje profesional',
};

export default function ComboDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [combo, setCombo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<any>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    api.getCombo(Number(id))
      .then(setCombo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (combo) {
      api.getComboPrice(Number(id), selectedStorage || undefined)
        .then(setPriceData)
        .catch(console.error);
    }
  }, [combo, id, selectedStorage]);

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO') + ' COP';

  const modeLabels: Record<string, string> = {
    cableado: t('catalog.mode_wired'),
    inalambrico: t('catalog.mode_wireless'),
    hibrido: t('catalog.mode_hybrid'),
    solar: t('catalog.mode_solar'),
  };

  const getBrandFolder = (brandName: string): string => {
    const map: Record<string, string> = {
      'Hikvision / HiLook': 'hikvision',
      'Dahua / Cooper': 'dahua',
      'TP-Link Tapo / Vigi': 'tp-link',
      EZVIZ: 'ezviz',
      Imou: 'imou',
      Xiaomi: 'xiaomi',
      Reolink: 'reolink',
      Eufy: 'eufy',
      Ring: 'ring',
      'VTA+': 'vta',
    };
    return map[brandName] || brandName.toLowerCase().replace(/\s+/g, '-');
  };

  const getGalleryImages = (): string[] => {
    if (!combo) return [];
    const folder = getBrandFolder(combo.brand_name);
    const mode = combo.mode;
    const suffixes = MODE_IMAGES[mode] || MODE_IMAGES.cableado;
    return suffixes.map(
      (s) => `/images/brands/${folder}/${mode}/${folder}-${mode}-${s}.svg`
    );
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const nextImage = useCallback(() => {
    const images = getGalleryImages();
    setLightboxIndex((prev) => (prev + 1) % images.length);
  }, [combo]);

  const prevImage = useCallback(() => {
    const images = getGalleryImages();
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [combo]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, nextImage, prevImage]);

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  if (!combo) return <div className="text-center py-12 text-gray-500">{t('common.error')}</div>;

  const galleryImages = getGalleryImages();
  const storageOptions: Record<string, number> = combo.storage_options || {};

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/catalogo" className="text-primary-500 hover:text-primary-600 mb-6 inline-flex items-center space-x-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        <span>Volver al catálogo</span>
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div
            className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden cursor-pointer group h-80 md:h-96"
            onClick={() => openLightbox(0)}
          >
            <img
              src={galleryImages[0]}
              alt={`${combo.brand_name} - ${modeLabels[combo.mode]}`}
              className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 bg-white/80 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-opacity">
                Click para ampliar
              </span>
            </div>
          </div>
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {galleryImages.slice(1).map((img, idx) => (
                <div
                  key={idx}
                  className="bg-gray-100 rounded-lg overflow-hidden cursor-pointer h-24 hover:ring-2 hover:ring-primary-400 transition-all"
                  onClick={() => openLightbox(idx + 1)}
                >
                  <img
                    src={img}
                    alt={`${combo.brand_name} vista ${idx + 2}`}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-2 flex-wrap gap-2">
            {combo.is_bestseller && <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">{t('catalog.bestseller')}</span>}
            {combo.is_budget && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">{t('catalog.budget')}</span>}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              combo.install_complexity === 'baja' ? 'bg-green-100 text-green-700' :
              combo.install_complexity === 'media' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              Instalación: {combo.install_complexity === 'baja' ? 'Sencilla' : combo.install_complexity === 'media' ? 'Moderada' : 'Profesional'}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">{combo.brand_name}</h1>
          <p className="text-lg text-gray-500 mb-2">
            {combo.cameras_count} {t('catalog.cameras')} - {combo.resolution}
          </p>
          <p className="text-primary-600 font-medium mb-4">{modeLabels[combo.mode]}</p>

          {priceData && (
            <div className="border-t border-b border-gray-200 py-4 space-y-2 mb-4">
              {selectedStorage && priceData.storage_price > 0 && (
                <div className="flex justify-between text-lg">
                  <span className="text-gray-500">Almacenamiento ({selectedStorage}):</span>
                  <span className="font-semibold">{formatPrice(priceData.storage_price)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold">
                <span>{t('catalog.total')}:</span>
                <span className="text-primary-600">{formatPrice(priceData.total)}</span>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-4 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span>{t('catalog.guarantee')}: {combo.warranty_text}</span>
          </p>

          {Object.keys(storageOptions).length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Disco duro / Almacenamiento
              </label>
              <select
                className="input-field w-full"
                value={selectedStorage || ''}
                onChange={(e) => setSelectedStorage(e.target.value || null)}
              >
                <option value="">Sin almacenamiento adicional</option>
                {Object.entries(storageOptions).map(([label, price]) => (
                  <option key={label} value={label}>
                    {label} - {formatPrice(price as number)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/checkout/${combo.id}${selectedStorage ? `?storage=${encodeURIComponent(selectedStorage)}` : ''}`}
              className="btn-primary w-full text-center block"
            >
              {t('catalog.reserve')}
            </Link>
            <a
              href={`https://wa.me/[COMPLETAR]?text=${encodeURIComponent(`Hola, quiero información sobre: ${combo.brand_name} - ${combo.cameras_count} cámaras ${combo.resolution} - ${modeLabels[combo.mode]}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline w-full text-center block"
            >
              {t('catalog.consult_whatsapp')}
            </a>
          </div>
        </div>
      </div>

      {combo.specs && Object.keys(combo.specs).length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ficha técnica</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(combo.specs).map(([key, value]) => (
                    <tr key={key}>
                      <td className="py-3 pr-4 text-gray-500 font-medium w-1/3">{key}</td>
                      <td className="py-3 text-gray-900">{value as string}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 pr-4 text-gray-500 font-medium">Modo de instalación</td>
                    <td className="py-3 text-gray-900">{modeLabels[combo.mode]}</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-gray-500 font-medium">Complejidad de instalación</td>
                    <td className="py-3 text-gray-900">{COMPLEXITY_LABELS[combo.install_complexity] || combo.install_complexity}</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-gray-500 font-medium">Cantidad de cámaras</td>
                    <td className="py-3 text-gray-900">{combo.cameras_count}</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-gray-500 font-medium">Garantía</td>
                    <td className="py-3 text-gray-900">{combo.warranty_text}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div className="card mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Incluye</h3>
                <ul className="space-y-2">
                  {(combo.included_items || []).map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Información de instalación</span>
                </h4>
                <p className="text-sm text-blue-700">
                  {combo.mode === 'cableado' && 'Este combo requiere cableado desde el DVR hasta cada cámara. Nuestros técnicos realizarán el tendido de cables, montaje de cámaras y configuración del sistema.'}
                  {combo.mode === 'inalambrico' && 'Las cámaras se conectan vía WiFi al receptor incluido. La instalación es rápida y no requiere perforaciones para cableado de video.'}
                  {combo.mode === 'hibrido' && 'Combina cámaras cableadas e inalámbricas. Ideal para propiedades que necesitan flexibilidad en ciertas áreas.'}
                  {combo.mode === 'solar' && 'Cámaras con panel solar integrado. No requieren cableado eléctrico ni de datos. Instalación en puntos estratégicos con exposición solar.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10"
          >
            &times;
          </button>
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 text-white text-4xl hover:text-gray-300 z-10"
              >
                &#8249;
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 text-white text-4xl hover:text-gray-300 z-10"
              >
                &#8250;
              </button>
            </>
          )}
          <img
            src={galleryImages[lightboxIndex]}
            alt={`Vista ampliada ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 text-white text-sm">
            {lightboxIndex + 1} / {galleryImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
